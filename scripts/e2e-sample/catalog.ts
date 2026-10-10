/**
 * 070 — 사진 목록(photos.json) 읽기·검증.
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-manifest.md C-1~C-6
 *
 * 저장소에는 사진 파일이 아니라 이 목록(출처·라이선스·URL·sha256)만 있다. 받은 파일은 gitignore된 캐시에 둔다.
 * 순수 검증 + 파일 읽기 한 줄만 있다 — 네트워크는 `fetch.ts`의 몫이다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PHOTO_TAGS, type PhotoTag } from "./manifest.ts";

/** 허용 라이선스 — 이 상수가 저장소에서 한 곳이다(C-2). CC0 또는 퍼블릭 도메인 표시가 명확한 것만 */
export const ALLOWED_LICENSES = ["CC0", "PD"] as const;
export type License = (typeof ALLOWED_LICENSES)[number];

export const IMAGE_URL_PREFIX = "https://upload.wikimedia.org/";
export const SOURCE_PAGE_PREFIX = "https://commons.wikimedia.org/";

export type CatalogPhoto = {
  /** 캐시에 둘 파일 이름 (예: `commons-cafe-01.jpg`) */
  file: string;
  url: string;
  /** 소문자 hex 64자. 비어 있으면 `--record-hashes`가 채울 자리(그 전에는 검증이 실패한다) */
  sha256: string;
  license: License;
  /** 라이선스를 확인한 Commons 파일 페이지 */
  sourcePage: string;
  /** 라이선스 표시를 확인한 날 (YYYY-MM-DD) */
  checkedOn: string;
  tags: PhotoTag[];
  widthPx: number;
};

export type CatalogResult =
  | { ok: true; photos: CatalogPhoto[] }
  | { ok: false; problems: string[] };

export const CATALOG_PATH = () => join(process.cwd(), "scripts", "e2e-sample", "photos.json");

/** 서로 다른 파일 수의 범위 (C-5) */
export const MIN_PHOTOS = 200;
export const MAX_PHOTOS = 260;
/** 태그마다 최소 장수 (C-4) */
export const MIN_PER_TAG = 20;

/**
 * 목록을 검사한다. `allowEmptyHashes`는 `--record-hashes`(최초 1회)에서만 켠다 — 그 밖에서는 빈 해시도 위반이다.
 */
export function validateCatalog(raw: unknown, options: { allowEmptyHashes?: boolean } = {}): CatalogResult {
  const problems: string[] = [];
  if (!Array.isArray(raw)) return { ok: false, problems: ["목록이 배열이 아니다"] };

  const photos: CatalogPhoto[] = [];
  raw.forEach((item, i) => {
    const at = `#${i}`;
    if (typeof item !== "object" || item === null) {
      problems.push(`${at}: 객체가 아니다`);
      return;
    }
    const p = item as Record<string, unknown>;
    const str = (key: string): string => {
      const v = p[key];
      if (typeof v !== "string") {
        problems.push(`${at}: ${key}가 문자열이 아니다`);
        return "";
      }
      return v;
    };

    const file = str("file");
    const label = file === "" ? at : file;
    const url = str("url");
    const sha256 = str("sha256");
    const license = str("license");
    const sourcePage = str("sourcePage");
    const checkedOn = str("checkedOn");

    if (file !== "" && !/^[A-Za-z0-9._-]+\.jpe?g$/i.test(file)) problems.push(`${label}: file 이름이 안전하지 않다`);
    if (!url.startsWith(IMAGE_URL_PREFIX)) problems.push(`${label}: url이 ${IMAGE_URL_PREFIX}로 시작하지 않는다`);
    if (!sourcePage.startsWith(SOURCE_PAGE_PREFIX)) {
      problems.push(`${label}: sourcePage가 ${SOURCE_PAGE_PREFIX}로 시작하지 않는다`);
    }
    if (!(ALLOWED_LICENSES as readonly string[]).includes(license)) {
      problems.push(`${label}: 허용되지 않는 라이선스 「${license}」 (${ALLOWED_LICENSES.join("·")}만)`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedOn)) problems.push(`${label}: checkedOn이 YYYY-MM-DD가 아니다`);
    if (!/^[0-9a-f]{64}$/.test(sha256) && !(options.allowEmptyHashes === true && sha256 === "")) {
      problems.push(`${label}: sha256이 소문자 hex 64자가 아니다`);
    }

    const tags = Array.isArray(p.tags) ? (p.tags as unknown[]) : [];
    if (tags.length === 0) problems.push(`${label}: tags가 비었다`);
    for (const t of tags) {
      if (!(PHOTO_TAGS as readonly unknown[]).includes(t)) problems.push(`${label}: 알 수 없는 태그 ${String(t)}`);
    }
    const widthPx = p.widthPx;
    if (typeof widthPx !== "number" || !Number.isFinite(widthPx) || widthPx <= 0) {
      problems.push(`${label}: widthPx가 양수가 아니다`);
    }

    photos.push({
      file,
      url,
      sha256,
      license: license as License,
      sourcePage,
      checkedOn,
      tags: tags as PhotoTag[],
      widthPx: typeof widthPx === "number" ? widthPx : 0,
    });
  });

  const files = photos.map((x) => x.file);
  if (new Set(files).size !== files.length) problems.push("file 이름이 겹친다");
  if (photos.length < MIN_PHOTOS || photos.length > MAX_PHOTOS) {
    problems.push(`서로 다른 사진이 ${photos.length}장이다 (${MIN_PHOTOS}~${MAX_PHOTOS}장이어야 한다)`);
  }
  for (const tag of PHOTO_TAGS) {
    const n = photos.filter((x) => x.tags.includes(tag)).length;
    if (n < MIN_PER_TAG) problems.push(`태그 ${tag}가 ${n}장이다 (최소 ${MIN_PER_TAG}장)`);
  }

  return problems.length === 0 ? { ok: true, photos } : { ok: false, problems };
}

/** photos.json을 읽어 검증한다. 읽기·파싱 실패도 값으로 돌려준다 */
export function loadCatalog(options: { allowEmptyHashes?: boolean; path?: string } = {}): CatalogResult {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(options.path ?? CATALOG_PATH(), "utf8"));
  } catch (error) {
    return { ok: false, problems: [`photos.json을 읽지 못했다: ${String(error)}`] };
  }
  return validateCatalog(raw, options);
}
