import {
  jpegSize,
  looksLikeThumbnail,
  originalApiUrl,
  parseOriginal,
  titleOf,
} from "../../scripts/e2e-sample/commons";
import { tinyJpeg } from "./jpeg-fixture";

/**
 * 084 — Commons 원본 조회와 썸네일 모양 판정 (contracts/photo-identity.md O-1~O-5). 순수 함수만 본다 — 네트워크 없음.
 */

const SHA1 = "0123456789abcdef0123456789abcdef01234567";

function apiResponse(info: Record<string, unknown> | null, extra: Record<string, unknown> = {}) {
  return {
    batchcomplete: "",
    query: {
      pages: {
        "12345": {
          pageid: 12345,
          ns: 6,
          title: "File:A.jpg",
          ...extra,
          ...(info === null ? {} : { imageinfo: [info] }),
        },
      },
    },
  };
}

describe("titleOf (O-1)", () => {
  it("출처 페이지의 /wiki/ 뒤를 디코드한 File: 제목을 준다", () => {
    expect(titleOf("https://commons.wikimedia.org/wiki/File:Living_room_(Unsplash).jpg")).toBe(
      "File:Living_room_(Unsplash).jpg",
    );
    expect(
      titleOf(
        "https://commons.wikimedia.org/wiki/File:Sz%C3%A9chenyi_Chain_Bridge_in_Budapest_at_night.jpg",
      ),
    ).toBe("File:Széchenyi_Chain_Bridge_in_Budapest_at_night.jpg");
  });

  it("File: 제목이 아니거나 /wiki/가 없으면 null", () => {
    expect(titleOf("https://commons.wikimedia.org/wiki/Category:Cats")).toBeNull();
    expect(titleOf("https://commons.wikimedia.org/w/index.php?title=File:A.jpg")).toBeNull();
    expect(titleOf("https://commons.wikimedia.org/wiki/File:%E0%A4%A")).toBeNull();
  });
});

describe("originalApiUrl (O-2)", () => {
  it("imageinfo의 sha1·size·timestamp를 묻는다", () => {
    const url = new URL(originalApiUrl("File:Széchenyi_Chain_Bridge.jpg"));
    expect(url.origin + url.pathname).toBe("https://commons.wikimedia.org/w/api.php");
    expect(url.searchParams.get("action")).toBe("query");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("prop")).toBe("imageinfo");
    expect(url.searchParams.get("iiprop")).toBe("sha1|size|timestamp");
    expect(url.searchParams.get("titles")).toBe("File:Széchenyi_Chain_Bridge.jpg");
  });
});

describe("parseOriginal (O-3)", () => {
  it("정상 응답에서 sha1·크기·올린 시각을 읽는다", () => {
    expect(
      parseOriginal(
        apiResponse({
          sha1: SHA1,
          width: 4288,
          height: 2848,
          timestamp: "2016-06-03T19:08:01Z",
          size: 6_700_000,
        }),
      ),
    ).toEqual({
      ok: true,
      sha1: SHA1,
      width: 4288,
      height: 2848,
      timestamp: "2016-06-03T19:08:01Z",
    });
  });

  it("페이지 없음·imageinfo 없음·모양 이상은 ok: false이고 던지지 않는다", () => {
    expect(parseOriginal(apiResponse(null, { missing: "" })).ok).toBe(false);
    expect(parseOriginal(apiResponse(null)).ok).toBe(false);
    expect(
      parseOriginal(
        apiResponse({ sha1: "xyz", width: 1, height: 1, timestamp: "2016-01-01T00:00:00Z" }),
      ).ok,
    ).toBe(false);
    expect(
      parseOriginal(
        apiResponse({
          sha1: SHA1.toUpperCase(),
          width: 1,
          height: 1,
          timestamp: "2016-01-01T00:00:00Z",
        }),
      ).ok,
    ).toBe(false);
    expect(
      parseOriginal(
        apiResponse({ sha1: SHA1, width: 0, height: 10, timestamp: "2016-01-01T00:00:00Z" }),
      ).ok,
    ).toBe(false);
    expect(parseOriginal(apiResponse({ sha1: SHA1, width: 10, height: 10 })).ok).toBe(false);
    expect(parseOriginal(null).ok).toBe(false);
    expect(parseOriginal("not json").ok).toBe(false);
    expect(parseOriginal({ query: {} }).ok).toBe(false);
  });
});

describe("jpegSize (O-4)", () => {
  it("SOF 세그먼트에서 폭·높이를 읽는다", () => {
    expect(jpegSize(tinyJpeg(960, 638))).toEqual({ width: 960, height: 638 });
  });

  it("JPEG가 아니거나 SOF가 없으면 null", () => {
    expect(jpegSize(Buffer.from("<html>error</html>"))).toBeNull();
    expect(jpegSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(jpegSize(Buffer.alloc(0))).toBeNull();
  });
});

describe("looksLikeThumbnail (O-5)", () => {
  // 실측 street-06: 원본 4288×2848 → 960폭이면 637.6 → 638
  const original = { width: 4288, height: 2848 };

  it("폭이 같고 높이가 원본 비율 ±1이면 참", () => {
    expect(looksLikeThumbnail(tinyJpeg(960, 638), 960, original)).toBe(true);
    expect(looksLikeThumbnail(tinyJpeg(960, 637), 960, original)).toBe(true);
    expect(looksLikeThumbnail(tinyJpeg(960, 639), 960, original)).toBe(true);
  });

  it("폭이 다르거나 높이가 2px 넘게 다르거나 JPEG가 아니면 거짓", () => {
    expect(looksLikeThumbnail(tinyJpeg(800, 531), 960, original)).toBe(false);
    expect(looksLikeThumbnail(tinyJpeg(960, 636), 960, original)).toBe(false);
    expect(looksLikeThumbnail(tinyJpeg(960, 640), 960, original)).toBe(false);
    expect(looksLikeThumbnail(Buffer.from("<html>error</html>"), 960, original)).toBe(false);
  });
});
