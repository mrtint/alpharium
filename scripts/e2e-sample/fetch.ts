/**
 * 070 — 무료 사진 내려받기 (순차·간격·해시 대조). 084 — 처음 보는 썸네일 변형은 Commons 원본을 확인한 뒤 받아들인다.
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md F-1·F-3,
 *       specs/084-sample-photo-identity/contracts/photo-identity.md V-1~V-7 (070의 F-2·F-5를 대체)
 *
 * **외부 서비스(Wikimedia Commons)를 부른다** — 썸네일과, 처음 보는 썸네일일 때의 원본 조회. 목록을 소유자에게 보여 주고 승인받은 뒤에만 처음 돌린다
 * (FR-010, 작업 절차 — 070 tasks T013). 받은 파일은 gitignore된 캐시에만 둔다. 네트워크는 주입된 `fetchBytes`·`lookupJson`으로만 나간다(테스트 대역).
 *
 * **조용히 다른 사진을 쓰지 않는다**: 사진의 정체는 원본 sha1(`originalSha1`)이다. 받은 썸네일의 해시가 받아들인 해시(`sha256[]`)에 없으면
 * 원본을 조회해, 원본 sha1이 같고 바이트가 그 원본의 썸네일 모양일 때만 받아들여 목록에 덧붙인다. 원본이 다르거나 확인하지 못하면 파일을 남기지 않고
 * 실패한다. 부분 캐시를 성공으로 보지 않는다. 목록 파일을 쓰는 것은 진입점(`sample-fetch.mts`)이 성공한 실행에서만 한다.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CatalogPhoto } from "./catalog.ts";
import {
  looksLikeThumbnail,
  originalApiUrl,
  parseOriginal,
  titleOf,
  USER_AGENT,
  type LookupJson,
  type OriginalInfo,
} from "./commons.ts";

export { USER_AGENT, type LookupJson };

export type FetchBytes = (url: string) => Promise<{ status: number; bytes: Buffer }>;

export type FetchResult =
  | {
      ok: true;
      photos: CatalogPhoto[];
      downloaded: number;
      cached: number;
      /** 새 썸네일 변형을 받아들인 사진 파일 (V-3) */
      accepted: string[];
      /** 목록이 바뀌었는가 — 덧붙인 해시·채운 원본 sha1 (V-7) */
      changed: boolean;
    }
  | { ok: false; reason: string };

/** 요청 사이 간격(ms) — 속도 제한(429)을 피한다. 썸네일·원본 조회 모두 */
export const REQUEST_INTERVAL_MS = 1100;
/** 429 뒤 기다림(ms) — 시도마다 두 배 */
export const BACKOFF_BASE_MS = 3000;
export const MAX_RETRIES = 3;

const sha256Of = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

export type FetchOptions = {
  catalog: readonly CatalogPhoto[];
  cacheDir: string;
  fetchBytes: FetchBytes;
  /** Commons 원본 조회 (084) */
  lookupJson: LookupJson;
  sleep: (ms: number) => Promise<void>;
  /** `--record-hashes` — 비어 있는 정체 필드(원본 sha1·썸네일 해시)만 채운다 (V-5) */
  recordHashes: boolean;
};

/** 한 사진에서 실패하면 던지고 `fetchCatalog`가 값으로 바꾼다 — 이 파일 밖으로는 던지지 않는다 */
class Stop extends Error {}

/** 목록의 사진을 캐시에 받는다. 성공하면 (해시가 덧붙거나 원본 sha1이 채워졌을 수 있는) 목록을 돌려준다. 던지지 않는다 */
export async function fetchCatalog(options: FetchOptions): Promise<FetchResult> {
  const { cacheDir, fetchBytes, lookupJson, sleep, recordHashes } = options;
  mkdirSync(cacheDir, { recursive: true });

  let firstRequest = true;
  /** 요청 사이 간격 (첫 요청 앞에는 두지 않는다) */
  const pace = async () => {
    if (!firstRequest) await sleep(REQUEST_INTERVAL_MS);
    firstRequest = false;
  };

  /** 429면 백오프하며 다시 시도한다. 마지막 응답을 돌려준다 */
  async function withRetry<T extends { status: number }>(label: string, request: () => Promise<T>): Promise<T> {
    let response: T | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        response = await request();
      } catch (error) {
        throw new Stop(`${label}: ${String(error)}`);
      }
      if (response.status !== 429 || attempt === MAX_RETRIES) break;
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
    return response!;
  }

  async function lookupOriginal(photo: CatalogPhoto): Promise<OriginalInfo> {
    const title = titleOf(photo.sourcePage);
    if (title === null) throw new Stop(`${photo.file}: 출처 페이지가 File: 제목이 아니다 (${photo.sourcePage})`);
    await pace();
    const response = await withRetry(`${photo.file}: 원본을 조회하지 못했다`, () => lookupJson(originalApiUrl(title)));
    if (response.status !== 200) throw new Stop(`${photo.file}: 원본 조회가 HTTP ${response.status}`);
    const parsed = parseOriginal(response.json);
    if (!parsed.ok) throw new Stop(`${photo.file}: 원본을 확인하지 못했다 — ${parsed.reason}`);
    return parsed;
  }

  const photos: CatalogPhoto[] = [];
  const accepted: string[] = [];
  let downloaded = 0;
  let cached = 0;
  let changed = false;

  try {
    for (const listed of options.catalog) {
      if (!/^[A-Za-z0-9._-]+$/.test(listed.file) || listed.file.includes("..")) {
        throw new Stop(`${listed.file}: 파일 이름이 안전하지 않다`);
      }
      const path = join(cacheDir, listed.file);
      const photo: CatalogPhoto = { ...listed, sha256: [...listed.sha256] };
      /** 한 실행 안에서 이 사진의 원본 조회는 한 번만 (V-5) */
      let original: OriginalInfo | null = null;

      if (photo.originalSha1 === "") {
        if (!recordHashes) {
          throw new Stop(`${photo.file}: 목록에 원본 sha1이 비어 있다 — 처음 한 번 --record-hashes로 채운다`);
        }
        original = await lookupOriginal(photo);
        // 확인 일자 뒤에 다시 올라온 원본은 목록 작성자가 본 사진이 아닐 수 있다
        if (original.timestamp.slice(0, 10) > photo.checkedOn) {
          throw new Stop(
            `${photo.file}: 원본이 확인 일자(${photo.checkedOn}) 뒤인 ${original.timestamp}에 다시 올라왔다 — 사람이 그 사진을 다시 본다`,
          );
        }
        photo.originalSha1 = original.sha1;
        changed = true;
      }

      // 이미 받은 파일 — 받아들인 해시면 건너뛰고, 아니면 지우고 다시 받는다 (V-1·V-2)
      if (existsSync(path)) {
        if (photo.sha256.includes(sha256Of(readFileSync(path)))) {
          photos.push(photo);
          cached += 1;
          continue;
        }
        rmSync(path, { force: true });
      }

      await pace();
      const response = await withRetry(`${photo.file}: 내려받지 못했다`, () => fetchBytes(photo.url));
      if (response.status !== 200) throw new Stop(`${photo.file}: HTTP ${response.status} (${photo.url})`);

      const got = sha256Of(response.bytes);
      if (!photo.sha256.includes(got)) {
        // 처음 보는 썸네일 바이트 — 원본이 같고 그 원본의 썸네일 모양일 때만 받아들인다 (V-3·V-4)
        original ??= await lookupOriginal(photo);
        if (original.sha1 !== photo.originalSha1) {
          throw new Stop(
            `${photo.file}: 원본이 목록과 다르다 (목록 ${photo.originalSha1.slice(0, 12)}…, Commons ${original.sha1.slice(0, 12)}…) — 다른 사진을 쓰지 않는다`,
          );
        }
        if (!looksLikeThumbnail(response.bytes, photo.widthPx, original)) {
          throw new Stop(
            `${photo.file}: 받은 바이트가 그 원본(${original.width}×${original.height})의 ${photo.widthPx}폭 썸네일 모양이 아니다 — 다른 사진을 쓰지 않는다`,
          );
        }
        photo.sha256.push(got);
        accepted.push(photo.file);
        changed = true;
      }

      // 검증을 통과한 뒤에만 캐시에 둔다 (임시 파일 → 이름 바꾸기)
      const temp = `${path}.part`;
      writeFileSync(temp, response.bytes);
      renameSync(temp, path);
      photos.push(photo);
      downloaded += 1;
    }
  } catch (error) {
    if (error instanceof Stop) return { ok: false, reason: error.message };
    return { ok: false, reason: String(error) };
  }

  return { ok: true, photos, downloaded, cached, accepted, changed };
}

/** 실제 네트워크 — Node의 전역 fetch. 식별 가능한 User-Agent를 싣는다 */
export const realFetchBytes: FetchBytes = async (url) => {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
};
