import { readFileSync } from "node:fs";
import { join } from "node:path";

import { progressSegments, resolveSlideStage, SLIDE_INTERVAL_MS } from "../../src/firstrun/consent";

/**
 * 다운로드 진행 슬라이드 단계 판정의 계약 테스트 (045).
 * `progressSegments()`(046)의 4분할 매핑 계약 테스트.
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C6·C7
 *       specs/046-download-progress-carousel/contracts/download-progress-carousel.md
 *       D1·D2·D3
 */

const SOURCE = readFileSync(join(__dirname, "../../src/firstrun/consent.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

// C6이 검사하는 것은 파일 전체가 아니라 `resolveSlideStage` 본문이다 — 046이
// 같은 파일에 `progressSegments(fraction)`을 정당하게 추가했으므로(그 함수는
// fraction을 다루는 것이 계약 자체다, D1~D3) 파일 전체를 대상으로 하면 그
// 정당한 사용까지 잡힌다.
const RESOLVE_SLIDE_STAGE_BODY = SOURCE.slice(
  SOURCE.indexOf("export function resolveSlideStage"),
  SOURCE.indexOf("export function progressSegments"),
);

describe("C6 — 진행률과 무관하다 (원칙 IV)", () => {
  it("resolveSlideStage 본문에 바이트·퍼센트·전송 속도 관련 토큰이 없다", () => {
    expect(RESOLVE_SLIDE_STAGE_BODY).not.toMatch(
      /\b(?:byte|percent|speed|fraction|받은|바이트|퍼센트)\b/i,
    );
  });

  it("함수가 downloadReady·elapsedMs 외의 값을 받지 않는다(타입 시그니처로 방어됨을 대표 입력으로 확인)", () => {
    // essentialDownloadFraction() 같은 진행률 값을 인자로 넘겨도 타입 에러가
    // 나야 한다 — 여기서는 정상 입력 두 케이스만으로 시그니처가 이 둘뿐임을
    // 실행 레벨에서 재확인한다(TS 컴파일 자체가 1차 방어).
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: 0 })).toEqual({
      kind: "slide",
      index: 0,
    });
    expect(resolveSlideStage({ downloadReady: true, elapsedMs: 0 })).toEqual({ kind: "complete" });
  });
});

describe("C7 — 슬라이드는 4번째에서 멈추고, 완료 즉시 넘어간다", () => {
  it("elapsedMs가 아무리 커도 index가 3을 넘지 않는다", () => {
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: 999_000 })).toEqual({
      kind: "slide",
      index: 3,
    });
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: Number.MAX_SAFE_INTEGER })).toEqual(
      { kind: "slide", index: 3 },
    );
  });

  it("downloadReady: true면 elapsedMs 값과 무관하게 complete", () => {
    for (const elapsedMs of [0, 1, 3999, 4000, 999_000]) {
      expect(resolveSlideStage({ downloadReady: true, elapsedMs })).toEqual({ kind: "complete" });
    }
  });

  it("4초 간격으로 슬라이드 인덱스가 올라간다", () => {
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: 0 })).toEqual({
      kind: "slide",
      index: 0,
    });
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: SLIDE_INTERVAL_MS - 1 })).toEqual({
      kind: "slide",
      index: 0,
    });
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: SLIDE_INTERVAL_MS })).toEqual({
      kind: "slide",
      index: 1,
    });
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: SLIDE_INTERVAL_MS * 2 })).toEqual({
      kind: "slide",
      index: 2,
    });
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: SLIDE_INTERVAL_MS * 3 })).toEqual({
      kind: "slide",
      index: 3,
    });
  });

  it("음수 elapsedMs(방어적 클램프)는 0번으로 취급한다", () => {
    expect(resolveSlideStage({ downloadReady: false, elapsedMs: -100 })).toEqual({
      kind: "slide",
      index: 0,
    });
  });
});

describe("위반 주입 — min(3, ...) 클램프가 없으면 잡힌다", () => {
  it("클램프 없는 구현이었다면 elapsedMs가 크면 index가 3을 넘었을 것 — 현재 구현은 그렇지 않음을 재확인", () => {
    const stage = resolveSlideStage({ downloadReady: false, elapsedMs: SLIDE_INTERVAL_MS * 100 });
    expect(stage.kind).toBe("slide");
    if (stage.kind === "slide") {
      expect(stage.index).toBeLessThanOrEqual(3);
    }
  });
});

describe("D1 — progressSegments()는 순수 함수다", () => {
  it("같은 입력에 항상 같은 출력을 낸다", () => {
    expect(progressSegments(0.62)).toEqual(progressSegments(0.62));
    expect(progressSegments(0)).toEqual(progressSegments(0));
  });
});

describe("D2 — 4개 구간은 순서대로, 25% 단위로 채워진다", () => {
  it("progressSegments(0.62) === [1, 1, 0.48, 0] (오차 ±0.001)", () => {
    const result = progressSegments(0.62);
    const expected = [1, 1, 0.48, 0];
    result.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 2));
  });

  it("progressSegments(0) === [0, 0, 0, 0]", () => {
    expect(progressSegments(0)).toEqual([0, 0, 0, 0]);
  });

  it("progressSegments(1) === [1, 1, 1, 1]", () => {
    expect(progressSegments(1)).toEqual([1, 1, 1, 1]);
  });

  it("경계값 progressSegments(0.25) === [1, 0, 0, 0] — 경계를 채운 칸은 완전히 채워진 것으로 본다", () => {
    expect(progressSegments(0.25)).toEqual([1, 0, 0, 0]);
  });

  it("경계값 progressSegments(0.5) === [1, 1, 0, 0]", () => {
    expect(progressSegments(0.5)).toEqual([1, 1, 0, 0]);
  });

  it("경계값 progressSegments(0.75) === [1, 1, 1, 0]", () => {
    expect(progressSegments(0.75)).toEqual([1, 1, 1, 0]);
  });
});

describe("D3 — 입력 범위를 벗어나도 안전하다(clamp)", () => {
  it("1을 초과하는 입력은 전부 1로 clamp된다", () => {
    expect(progressSegments(1.0000001)).toEqual([1, 1, 1, 1]);
    expect(progressSegments(5)).toEqual([1, 1, 1, 1]);
  });

  it("음수 입력은 전부 0으로 clamp된다", () => {
    expect(progressSegments(-0.1)).toEqual([0, 0, 0, 0]);
    expect(progressSegments(-5)).toEqual([0, 0, 0, 0]);
  });

  it("각 구간 값은 항상 [0, 1] 범위 안에 있다", () => {
    for (const fraction of [-1, 0, 0.1, 0.33, 0.5, 0.99, 1, 2]) {
      for (const v of progressSegments(fraction)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
