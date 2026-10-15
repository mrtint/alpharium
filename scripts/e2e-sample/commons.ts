/**
 * 084 — Commons 원본 조회와 썸네일 모양 판정.
 *
 * 계약: specs/084-sample-photo-identity/contracts/photo-identity.md O-1~O-6
 *
 * 같은 썸네일 URL이 데이터센터마다 다른 바이트를 준다(2026-10-15 실측: codfw = 목록 작성 때 값, eqiad = 다름). 그래서 사진의 정체는 썸네일 해시가
 * 아니라 Commons 원본 파일의 sha1이다. 처음 보는 썸네일 바이트는 (1) 원본 sha1이 목록과 같고 (2) 바이트가 그 원본의 썸네일 모양일 때만 받아들인다 —
 * 원본 sha1은 「원본이 그대로인가」만 말하고 받은 바이트가 그 원본에서 나왔는지는 말하지 않기 때문이다(200으로 온 오류 페이지를 막는다).
 *
 * 실제 네트워크는 `realLookupJson` 하나뿐이고 나머지는 순수 함수다(던지지 않는다).
 */

/** Wikimedia 정책: 식별 가능한 User-Agent. 이메일 같은 개인 정보는 싣지 않는다. 썸네일·원본 조회가 같은 값을 쓴다 */
export const USER_AGENT = "Pocketlog-e2e-sample/1.0 (https://github.com/mrtint/alpharium; dev tool)";

export type OriginalInfo = { sha1: string; width: number; height: number; timestamp: string };
export type OriginalLookup = ({ ok: true } & OriginalInfo) | { ok: false; reason: string };

/** 원본 조회 통로 — 응답 JSON(못 읽으면 null)과 상태 코드 */
export type LookupJson = (url: string) => Promise<{ status: number; json: unknown }>;

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/** 출처 페이지(`…/wiki/File:…`)의 파일 제목. File: 제목이 아니면 null */
export function titleOf(sourcePage: string): string | null {
  const at = sourcePage.indexOf("/wiki/");
  if (at < 0) return null;
  let title: string;
  try {
    title = decodeURIComponent(sourcePage.slice(at + "/wiki/".length));
  } catch {
    return null;
  }
  return title.startsWith("File:") ? title : null;
}

/** 원본의 sha1·크기·최신 판이 올라온 시각을 묻는 주소 */
export function originalApiUrl(title: string): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "sha1|size|timestamp",
    titles: title,
  });
  return `${COMMONS_API}?${params.toString()}`;
}

const isPositiveInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

/** API 응답에서 첫 페이지의 원본 정보를 읽는다. 모양이 어긋나면 `ok: false` */
export function parseOriginal(json: unknown): OriginalLookup {
  const pages = (json as { query?: { pages?: unknown } } | null)?.query?.pages;
  if (typeof pages !== "object" || pages === null) return { ok: false, reason: "응답에 query.pages가 없다" };
  const page = Object.values(pages as Record<string, unknown>)[0] as Record<string, unknown> | undefined;
  if (page === undefined) return { ok: false, reason: "응답에 페이지가 없다" };
  if ("missing" in page) return { ok: false, reason: "Commons에 그 파일이 없다" };
  const info = Array.isArray(page.imageinfo) ? (page.imageinfo[0] as Record<string, unknown> | undefined) : undefined;
  if (info === undefined) return { ok: false, reason: "응답에 imageinfo가 없다" };
  const { sha1, width, height, timestamp } = info;
  if (typeof sha1 !== "string" || !/^[0-9a-f]{40}$/.test(sha1)) return { ok: false, reason: "원본 sha1의 모양이 이상하다" };
  if (!isPositiveInt(width) || !isPositiveInt(height)) return { ok: false, reason: "원본 크기의 모양이 이상하다" };
  if (typeof timestamp !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(timestamp)) {
    return { ok: false, reason: "원본을 올린 시각의 모양이 이상하다" };
  }
  return { ok: true, sha1, width, height, timestamp };
}

/** JPEG의 SOF 세그먼트에서 폭·높이를 읽는다. JPEG가 아니거나 SOF가 없으면 null */
export function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xd9 || marker === 0xda) return null; // EOI·이미지 데이터 시작 전에 SOF가 없었다
    const length = bytes.readUInt16BE(i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (i + 9 > bytes.length) return null;
      return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

/** 받은 바이트가 그 원본을 `widthPx` 폭으로 줄인 썸네일 모양인가 — 폭이 같고 높이가 원본 비율 ±1px */
export function looksLikeThumbnail(
  bytes: Buffer,
  widthPx: number,
  original: { width: number; height: number },
): boolean {
  const size = jpegSize(bytes);
  if (size === null || size.width !== widthPx) return false;
  const expected = Math.round((original.height / original.width) * widthPx);
  return Math.abs(size.height - expected) <= 1;
}

/** 실제 원본 조회 — Node 전역 fetch, 썸네일과 같은 User-Agent. 본문이 JSON이 아니면 json: null */
export const realLookupJson: LookupJson = async (url) => {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, json };
};
