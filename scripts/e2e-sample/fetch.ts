/**
 * 070 — 무료 사진 내려받기 (순차·간격·해시 대조).
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md F-1~F-5
 *
 * **외부 서비스(Wikimedia Commons)를 부른다.** 목록을 소유자에게 보여 주고 승인받은 뒤에만 처음 돌린다(FR-010, 작업 절차 — tasks T013).
 * 받은 파일은 gitignore된 캐시에만 둔다. 네트워크는 주입된 `fetchBytes`로만 나간다(테스트 대역).
 *
 * **조용히 다른 사진을 쓰지 않는다**: 받은 바이트의 sha256이 목록과 다르면 파일을 남기지 않고 실패한다. 부분 캐시를 성공으로 보지 않는다.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CatalogPhoto } from "./catalog.ts";

export type FetchBytes = (url: string) => Promise<{ status: number; bytes: Buffer }>;

export type FetchResult =
  | { ok: true; photos: CatalogPhoto[]; downloaded: number; cached: number }
  | { ok: false; reason: string };

/** Wikimedia 정책: 식별 가능한 User-Agent. 이메일 같은 개인 정보는 싣지 않는다 */
export const USER_AGENT = "Pocketlog-e2e-sample/1.0 (https://github.com/mrtint/alpharium; dev tool)";

/** 요청 사이 간격(ms) — 속도 제한(429)을 피한다 */
export const REQUEST_INTERVAL_MS = 1100;
/** 429 뒤 기다림(ms) — 시도마다 두 배 */
export const BACKOFF_BASE_MS = 3000;
export const MAX_RETRIES = 3;

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

export type FetchOptions = {
  catalog: readonly CatalogPhoto[];
  cacheDir: string;
  fetchBytes: FetchBytes;
  sleep: (ms: number) => Promise<void>;
  /** `--record-hashes` — 목록에서 비어 있는 sha256만 채운다 (F-5) */
  recordHashes: boolean;
};

/** 목록의 사진을 캐시에 받는다. 성공하면 (해시가 채워졌을 수 있는) 목록을 돌려준다. 던지지 않는다 */
export async function fetchCatalog(options: FetchOptions): Promise<FetchResult> {
  const { cacheDir, fetchBytes, sleep, recordHashes } = options;
  mkdirSync(cacheDir, { recursive: true });

  const photos: CatalogPhoto[] = [];
  let downloaded = 0;
  let cached = 0;
  let firstRequest = true;

  for (const photo of options.catalog) {
    if (!/^[A-Za-z0-9._-]+$/.test(photo.file) || photo.file.includes("..")) {
      return { ok: false, reason: `${photo.file}: 파일 이름이 안전하지 않다` };
    }
    const path = join(cacheDir, photo.file);

    // 이미 받은 파일 — 해시가 맞으면 건너뛰고, 깨졌으면 지우고 다시 받는다
    if (existsSync(path)) {
      const have = sha256(readFileSync(path));
      if (photo.sha256 === "" && recordHashes) {
        photos.push({ ...photo, sha256: have });
        cached += 1;
        continue;
      }
      if (photo.sha256 !== "" && have === photo.sha256) {
        photos.push(photo);
        cached += 1;
        continue;
      }
      rmSync(path, { force: true });
    }

    // 요청 사이 간격 (첫 요청 앞에는 두지 않는다)
    if (!firstRequest) await sleep(REQUEST_INTERVAL_MS);
    firstRequest = false;

    let response: { status: number; bytes: Buffer } | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        response = await fetchBytes(photo.url);
      } catch (error) {
        return { ok: false, reason: `${photo.file}: 내려받지 못했다 — ${String(error)}` };
      }
      if (response.status !== 429) break;
      if (attempt === MAX_RETRIES) break;
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
    if (response === null || response.status !== 200) {
      return { ok: false, reason: `${photo.file}: HTTP ${response?.status ?? "?"} (${photo.url})` };
    }

    const got = sha256(response.bytes);
    if (photo.sha256 === "") {
      if (!recordHashes) {
        return {
          ok: false,
          reason: `${photo.file}: 목록에 sha256이 비어 있다 — 처음 한 번 --record-hashes로 채운다`,
        };
      }
    } else if (got !== photo.sha256) {
      return {
        ok: false,
        reason: `${photo.file}: sha256이 목록과 다르다 (목록 ${photo.sha256.slice(0, 12)}…, 받은 것 ${got.slice(0, 12)}…) — 다른 사진을 쓰지 않는다`,
      };
    }

    // 검증을 통과한 뒤에만 캐시에 둔다 (임시 파일 → 이름 바꾸기)
    const temp = `${path}.part`;
    writeFileSync(temp, response.bytes);
    renameSync(temp, path);
    photos.push(photo.sha256 === "" ? { ...photo, sha256: got } : photo);
    downloaded += 1;
  }

  return { ok: true, photos, downloaded, cached };
}

/** 실제 네트워크 — Node의 전역 fetch. 식별 가능한 User-Agent를 싣는다 */
export const realFetchBytes: FetchBytes = async (url) => {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
};
