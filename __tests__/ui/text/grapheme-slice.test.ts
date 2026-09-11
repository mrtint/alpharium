/**
 * 038 — 글자 경계 안전 분할 계약 (contracts/typewriter-text.md G1~G7).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * jest `logic` 프로젝트(node 환경). 순수 함수라 RN 런타임이 필요 없다 —
 * `TypewriterText.tsx`를 import하지 않는다(plan.md Structure Decision).
 *
 * `string.slice(0, n)`은 UTF-16 코드 유닛 단위라 서로게이트 쌍(대부분의
 * 이모지)을 쪼갤 수 있다. `Array.from()`은 코드포인트 단위로 순회하므로
 * 안전하다 — 이 계약이 그 경계를 잠근다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { graphemeLength, graphemeSlice, graphemeUnits } from "../../../src/ui/text/grapheme-slice";

describe("G1 — 한글 NFC 완성형", () => {
  it("graphemeSlice('가나다라', 2) === '가나'", () => {
    expect(graphemeSlice("가나다라", 2)).toBe("가나");
  });
});

describe("G2 — 이모지(서로게이트 쌍)를 반으로 안 자른다", () => {
  it("graphemeSlice('a👍b', 2) === 'a👍'", () => {
    expect(graphemeSlice("a👍b", 2)).toBe("a👍");
  });

  it("문자열 코드 유닛 슬라이스와 대비된다 — '\"a👍b\"[1]'은 반쪽이다", () => {
    // 이 테스트는 위반(코드 유닛 분할) 시 무엇이 깨지는지 문서화한다.
    expect("a👍b".slice(0, 2)).not.toBe("a👍");
  });
});

describe("G3 — 경계값(0, 음수)", () => {
  it("graphemeSlice(text, 0) === ''", () => {
    expect(graphemeSlice("가나다", 0)).toBe("");
  });

  it("graphemeSlice(text, -5) === '' (음수는 0으로 clamp)", () => {
    expect(graphemeSlice("가나다", -5)).toBe("");
  });
});

describe("G4 — count가 길이 이상이면 전체", () => {
  it("graphemeSlice(text, 99999) === text", () => {
    expect(graphemeSlice("가나다", 99999)).toBe("가나다");
  });
});

describe("G5 — graphemeLength", () => {
  it("graphemeLength('a👍b') === 3 (문자열 .length는 4)", () => {
    expect(graphemeLength("a👍b")).toBe(3);
    expect("a👍b".length).toBe(4);
  });
});

describe("G6 — 빈 문자열", () => {
  it("graphemeSlice('', n) === '' for any n", () => {
    expect(graphemeSlice("", 0)).toBe("");
    expect(graphemeSlice("", 5)).toBe("");
    expect(graphemeSlice("", -1)).toBe("");
  });
});

describe("G7 — round-trip", () => {
  it("graphemeUnits를 이어 붙이면 원문과 같다 (한국어+이모지 혼합)", () => {
    const samples = ["가나다라마바사", "a👍b🎉c", "오늘 하루도 수고했다.", "👨‍👩‍👧 가족"];
    for (const text of samples) {
      expect(graphemeUnits(text).join("")).toBe(text);
    }
  });
});
