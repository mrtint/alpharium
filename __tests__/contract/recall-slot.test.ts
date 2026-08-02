/**
 * T031 — 회상 슬롯 (001 FR-015·SC-006, quickstart 시나리오 7)
 *
 * 추론 입력에 **자리는 존재하되 US1에서 항상 비어 있다.** 비어 있지 않은 상태는
 * 계약 위반이다 (001 Edge Cases). **모든** 추론 요청에서 검사한다 — 예외 없음.
 */
import {
  buildPromptInput,
  composePrompt,
  emptyRecallSlot,
  isRecallSlotEmpty,
  DEFAULT_PROMPT_PARAMS,
} from "../../src/inference/prompt";
import { createDigest, emptyDigestFor } from "../../src/signals/digest";
import { createPersona } from "../../src/persona/persona";
import { TRAIT_CATALOG } from "../../src/persona/catalog";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";

const persona = () => createPersona({ name: "네모", traitId: TRAIT_CATALOG[0].id });

const digests = () => [
  emptyDigestFor("2026-08-02", "2026-08-02T09:00:00+09:00"),
  createDigest({
    date: "2026-08-02",
    observedAt: "2026-08-02T18:30:00+09:00",
    steps: observed(4210),
    activePeriods: observed(["저녁"]),
    stays: unobserved(),
    moved: observed(true),
    photos: unobserved(),
    events: unobserved(),
    scale: ScaleVerdict.Modest,
  }),
  createDigest({
    date: "2026-08-02",
    observedAt: "2026-08-02T22:00:00+09:00",
    steps: observed(0),
    activePeriods: observed(["새벽", "아침", "낮", "저녁", "밤"]),
    stays: observed([{ place: "집", period: observed("밤") }]),
    moved: observed(false),
    photos: observed([{ period: observed("낮"), place: unobserved(), caption: observed("창밖") }]),
    events: observed([{ title: "치과", period: observed("낮") }]),
    scale: ScaleVerdict.Normal,
  }),
];

describe("회상 슬롯의 자리는 존재한다 (001 FR-015)", () => {
  it("추론 입력에 슬롯 자리가 있다", () => {
    const input = buildPromptInput(digests()[1], persona(), DEFAULT_PROMPT_PARAMS);
    expect(input).toHaveProperty("recallSlot");
  });

  it("빈 슬롯은 값을 넣을 수 있는 형태다 — 자리가 없는 것이 아니다", () => {
    expect(Array.isArray(emptyRecallSlot())).toBe(true);
    expect(emptyRecallSlot()).toHaveLength(0);
  });
});

describe("모든 추론 요청에서 슬롯이 비어 있다 (001 SC-006) — 예외 없음", () => {
  it.each(digests())("어떤 집계로 만든 입력이든 슬롯이 비어 있다", (digest) => {
    const input = buildPromptInput(digest, persona(), DEFAULT_PROMPT_PARAMS);
    expect(input.recallSlot).toHaveLength(0);
    expect(isRecallSlotEmpty(input)).toBe(true);
  });

  it.each(TRAIT_CATALOG)("어떤 성격이든 슬롯이 비어 있다: $id", (trait) => {
    const input = buildPromptInput(
      digests()[2],
      createPersona({ name: "네모", traitId: trait.id }),
      DEFAULT_PROMPT_PARAMS,
    );
    expect(isRecallSlotEmpty(input)).toBe(true);
  });

  it("과거 일기를 넘기려 해도 슬롯이 채워지지 않는다", () => {
    const input = buildPromptInput(digests()[1], persona(), DEFAULT_PROMPT_PARAMS, {
      ...({ recallSlot: ["어제 주인은 걸었다."] } as Record<string, unknown>),
    });
    expect(input.recallSlot).toHaveLength(0);
  });

  it("완성된 프롬프트에 과거 일기가 실리지 않는다", () => {
    const prompt = composePrompt(
      buildPromptInput(digests()[2], persona(), DEFAULT_PROMPT_PARAMS),
    );
    expect(prompt).not.toMatch(/어제|지난|과거 일기|이전 일기/);
  });
});
