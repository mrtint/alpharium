/**
 * 102 — 스토어 등록 설명문(`store/ko/*.txt`). 계약: specs/102-app-icon-store-assets/contracts/store-assets.md (S2·S3·S8)
 *
 * 한도는 두 콘솔의 값이다(짐작 — 제출 시점에 콘솔 도움말과 대조해 `device-check.md`에 적는다, S9).
 * 모델 식별자 금지는 헌법 원칙 III이 앱 화면에서 금하는 것과 같은 목록을 스토어 글에도 적용한 것이다.
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
