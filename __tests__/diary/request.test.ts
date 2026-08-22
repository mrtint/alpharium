/**
 * DiaryRequest 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md 「DiaryRequest 검증 표」
 *
 * 두 가지를 지킨다:
 *  - **신호가 비어도 요청은 만들어진다**(FR-005a, FR-005b)
 *  - **요청 어디에도 모델 식별자가 없다**(FR-008, 원칙 III)
 */

import { isDayClosed } from "../../src/config/day-boundary";
import { CHARACTERS, VISION_SETTINGS } from "../../src/diary/types";
import { buildRequest } from "../../src/diary/request";
import { emptyDay, partiallyUnknownDay, richDay, unknownDay } from "../../src/signals/fake";

describe("buildRequest — 요청을 만든다", () => {
  // contracts/diary.md 「검증 표」 4행
  it("신호·캐릭터·시각설정이 모두 있음 → ok (FR-006)", () => {
    const result = buildRequest(richDay("2026-08-12"), "quiet", "quick");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.character).toBe("quiet");
      expect(result.request.vision).toBe("quick");
      expect(result.request.signals.date).toBe("2026-08-12");
    }
  });

  it("캐릭터가 undefined → ok: false, reason: no-character (FR-007)", () => {
    const result = buildRequest(richDay("2026-08-12"), undefined, "quick");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no-character");
    }
  });

  it("신호가 전부 unknown → ok (FR-005b)", () => {
    const result = buildRequest(unknownDay("2026-08-12"), "narrative", "none");

    expect(result.ok).toBe(true);
  });

  it("신호가 전부 none → ok (FR-005b)", () => {
    const result = buildRequest(emptyDay("2026-08-12"), "narrative", "none");

    expect(result.ok).toBe(true);
  });
});

describe("신호의 양으로 거부하지 않는다 (FR-005a)", () => {
  /**
   * 헌법이 "휴대폰은 세상을 조금밖에 보지 못한다"를 제품의 설정으로 삼았다.
   * 조용한 하루에 일기를 안 만들면 그 설정을 배신하는 것이다.
   */
  it("네 가지 신호 모양 모두 요청이 만들어진다", () => {
    for (const make of [richDay, emptyDay, unknownDay, partiallyUnknownDay]) {
      const result = buildRequest(make("2026-08-12"), "quiet", "none");
      expect(result.ok).toBe(true);
    }
  });

  it("캐릭터 다섯과 시각설정 셋의 모든 조합에서 요청이 만들어진다", () => {
    for (const character of CHARACTERS) {
      for (const vision of VISION_SETTINGS) {
        const result = buildRequest(emptyDay("2026-08-12"), character, vision);
        expect(result.ok).toBe(true);
      }
    }
  });
});

/**
 * 012 — "하루가 아직 열려 있는가"를 요청에 싣는다.
 *
 * research.md §8 — `dayStillOpen`의 유일한 출처는 `isDayClosed()`다. `buildRequest()`가
 * `now`를 받아 채운다.
 */
describe("012 — buildRequest가 dayStillOpen을 채운다 (research.md §8)", () => {
  it("어제(닫힌 하루) → dayStillOpen: false", () => {
    const result = buildRequest(
      richDay("2026-08-20"),
      "quiet",
      "none",
      "2026-08-20",
      new Date("2026-08-21T09:00:00"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.dayStillOpen).toBe(false);
  });

  it("오늘(정오 이후, 아직 열림) → dayStillOpen: true", () => {
    const result = buildRequest(
      richDay("2026-08-21"),
      "quiet",
      "none",
      "2026-08-21",
      new Date("2026-08-21T12:00:00"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.dayStillOpen).toBe(true);
  });

  it("isDayClosed()의 결과를 그대로 반영한다 — 새 계산을 만들지 않는다", () => {
    const now = new Date("2026-08-21T12:00:00");
    const day = "2026-08-21";
    const expected = !isDayClosed(day, now);

    const result = buildRequest(richDay(day), "quiet", "none", day, now);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.dayStillOpen).toBe(expected);
  });
});

describe("요청에 모델 식별자가 없다 (FR-008, SC-005, 원칙 III)", () => {
  /**
   * 객체를 문자열로 만들어 모델 이름이 나오지 않는지 본다(contracts/diary.md).
   * 캐릭터는 사용자가 고른 성격이지 모델이 아니다.
   */
  const FORBIDDEN = [
    "kanana",
    "exaone",
    "hyperclovax",
    "qwen",
    "gemma",
    "llama",
    "gguf",
    "q4_k",
    "1.7b",
    "2.4b",
    "quantiz",
  ];

  it("요청을 직렬화해도 모델 이름이 나오지 않는다", () => {
    for (const character of CHARACTERS) {
      const result = buildRequest(richDay("2026-08-12"), character, "detailed");
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const serialized = JSON.stringify(result.request).toLowerCase();
      for (const forbidden of FORBIDDEN) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it("요청의 필드는 signals·character·vision 셋뿐이다", () => {
    const result = buildRequest(richDay("2026-08-12"), "quiet", "quick");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 모델 경로·파라미터 수·양자화 같은 필드가 끼어들 자리가 없다.
    // 012 — dayStillOpen이 새로 더해졌다(research.md §8).
    expect(Object.keys(result.request).sort()).toEqual([
      "character",
      "dayStillOpen",
      "signals",
      "vision",
    ]);
  });

  it("캐릭터 식별자 자체가 모델 이름이 아니다", () => {
    for (const character of CHARACTERS) {
      const lowered = character.toLowerCase();
      for (const forbidden of FORBIDDEN) {
        expect(lowered).not.toContain(forbidden);
      }
    }
  });
});
