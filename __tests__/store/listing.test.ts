/**
 * 102 — 스토어 등록 설명문(`store/ko/*.txt`). 계약: specs/102-app-icon-store-assets/contracts/store-assets.md (S2·S3·S8)
 *
 * 한도는 두 콘솔의 값이다(짐작 — 제출 시점에 콘솔 도움말과 대조해 `device-check.md`에 적는다, S9).
 * 모델 식별자 금지는 헌법 원칙 III이 앱 화면에서 금하는 것과 같은 목록을 스토어 글에도 적용한 것이다.
 * 2026-11-28: 121 뒤 거짓이 된 「좌표를 지도 서비스에 보낸다」류의 주장과 App Store 키워드의 바이트 한도·
 * 앱 이름 중복을 잠근다(Apple 「Platform version information」 도움말).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const DIR = join(ROOT, "store", "ko");

const LIMITS = {
  "title.txt": 30,
  "subtitle.txt": 30,
  "short.txt": 80,
  "full.txt": 4000,
  "keywords.txt": 100,
} as const;
type ListingFile = keyof typeof LIMITS;
const FILES = Object.keys(LIMITS) as ListingFile[];

/** 모델 이름·파라미터 수·양자화 표기 — 스토어 글과 스크린샷 파일명에 쓰지 않는다(원칙 III) */
const MODEL_IDENTIFIER = new RegExp(
  [
    "kanana",
    "카나나",
    "\\blfm",
    "liquid",
    "llama",
    "ggml",
    "gguf",
    "mmproj",
    "qwen",
    "gemma",
    "파라미터",
    "양자화",
    "quantiz",
    "\\d\\s?[bB]\\b", // 2.1B 같은 파라미터 수
  ].join("|"),
  "i",
);

const read = (file: ListingFile) => readFileSync(join(DIR, file), "utf8");
/** 121에서 걷은 동작 — 좌표는 휴대폰 밖으로 나가지 않고 장소 이름은 앱에 든 지도 자료에서 찾는다 */
const STALE_PLACE_CLAIM =
  /지도\s?서비스|지오코(딩|더)|좌표[^.\n]{0,30}(보낼|보내요|보냅니다|전송해|전송합)/;
/** App Store 키워드 — 도움말은 「up to 100 bytes」(제품 페이지 문서는 100 characters). 더 좁은 쪽을 지킨다 */
const KEYWORD_BYTE_LIMIT = 100;
const APP_NAME = "포켓로그";
const bytes = (text: string) => Buffer.byteLength(text.replace(/\n$/, ""), "utf8");

/** 끝 개행만 뺀 글자 수(유니코드 코드 포인트) */
const length = (text: string) => [...text.replace(/\n$/, "")].length;

describe("102 스토어 설명문", () => {
  it("S2: 다섯 파일이 모두 있고 비어 있지 않다", () => {
    for (const file of FILES) {
      expect({ file, exists: existsSync(join(DIR, file)) }).toEqual({ file, exists: true });
      expect(read(file).trim().length).toBeGreaterThan(0);
    }
  });

  it("S2: 글자 수 한도 — 제목 30·부제 30·짧은 설명 80·긴 설명 4000·키워드 100", () => {
    for (const file of FILES) {
      expect({ file, ok: length(read(file)) <= LIMITS[file] }).toEqual({ file, ok: true });
    }
  });

  it("App Store 키워드는 UTF-8 100바이트 안이고 앱 이름을 되풀이하지 않는다", () => {
    expect(bytes(read("keywords.txt"))).toBeLessThanOrEqual(KEYWORD_BYTE_LIMIT);
    expect(read("keywords.txt")).not.toContain(APP_NAME);
  });

  it("좌표를 지도 서비스에 보낸다는 낡은 주장이 없다(121)", () => {
    for (const file of FILES) {
      expect({ file, hit: STALE_PLACE_CLAIM.exec(read(file))?.[0] ?? null }).toEqual({
        file,
        hit: null,
      });
    }
  });

  it("한 줄이어야 하는 파일(제목·부제·짧은 설명·키워드)은 줄바꿈이 없고 LF로 끝난다", () => {
    for (const file of ["title.txt", "subtitle.txt", "short.txt", "keywords.txt"] as const) {
      const text = read(file);
      expect({ file, lines: text.replace(/\n$/, "").split("\n").length }).toEqual({
        file,
        lines: 1,
      });
      expect(text).not.toContain("\r");
    }
  });

  it("S3: 모델 식별자가 없다(원칙 III)", () => {
    for (const file of FILES) {
      expect({ file, hit: MODEL_IDENTIFIER.exec(read(file))?.[0] ?? null }).toEqual({
        file,
        hit: null,
      });
    }
  });

  it("출시 국가·언어에 맞게 한국어이고 앱 이름 「포켓로그」를 쓴다(D8)", () => {
    expect(read("title.txt")).toContain("포켓로그");
    expect(read("full.txt")).toMatch(/[가-힣]/);
  });

  it("방침·지원 페이지와 어긋나는 단언을 하지 않는다 — 서버·계정·완전 오프라인을 장담하지 않는다", () => {
    const all = FILES.map(read).join("\n");
    expect(all).not.toMatch(
      /인터넷 없이|오프라인으로 (모든|항상)|아무것도 (밖으로|전송)|전송하지 않/,
    );
  });
});

describe("102 스토어 설명문 — 위반 주입 (S8)", () => {
  it("31자 제목은 한도 검사가 잡는다", () => {
    const long = "가".repeat(31);
    expect(length(long)).toBeGreaterThan(LIMITS["title.txt"]);
    expect(length("가".repeat(30) + "\n")).toBeLessThanOrEqual(LIMITS["title.txt"]);
  });

  it("글자 한도 안이어도 100바이트를 넘는 키워드는 바이트 검사가 잡는다", () => {
    const long = "가".repeat(34); // 34자 · 102바이트
    expect(length(long)).toBeLessThanOrEqual(LIMITS["keywords.txt"]);
    expect(bytes(long)).toBeGreaterThan(KEYWORD_BYTE_LIMIT);
    expect(bytes("가".repeat(33) + "a\n")).toBe(KEYWORD_BYTE_LIMIT);
  });

  it("낡은 장소 문장은 잡고 지금 문장은 통과시킨다", () => {
    for (const bad of [
      "장소 이름을 얻으려고 사진의 좌표 하나를 휴대폰의 지도 서비스에 보낼 수 있어요.",
      "사진의 좌표를 서버로 보냅니다.",
      "좌표 하나를 전송해 이름을 찾아요.",
      "기기의 지오코딩을 써요.",
    ]) {
      expect({ bad, hit: STALE_PLACE_CLAIM.test(bad) }).toEqual({ bad, hit: true });
    }
    for (const ok of [
      "장소 이름은 앱에 함께 든 지도 자료에서 찾아서, 사진의 좌표를 휴대폰 밖으로 보내지 않아요.",
      "좌표를 휴대폰 밖으로 보내지 않습니다.",
    ]) {
      expect({ ok, hit: STALE_PLACE_CLAIM.test(ok) }).toEqual({ ok, hit: false });
    }
  });

  it("모델 이름·파라미터 수·양자화 표기는 식별자 검사가 잡는다", () => {
    for (const bad of [
      "Kanana 모델",
      "lfm2.5",
      "Llama",
      "2.1B 모델",
      "gguf 파일",
      "파라미터 수",
      "카나나",
      "int4 quantized",
    ]) {
      expect({ bad, hit: MODEL_IDENTIFIER.test(bad) }).toEqual({ bad, hit: true });
    }
    for (const ok of ["약 2GB를 받습니다", "휴대폰이 쓰는 일기", "2025년 10월"]) {
      expect({ ok, hit: MODEL_IDENTIFIER.test(ok) }).toEqual({ ok, hit: false });
    }
  });
});
