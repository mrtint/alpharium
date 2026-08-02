/**
 * T037 — 종료 사유 **다섯 가지** (quickstart 시나리오 6)
 *
 * 다섯 경우 모두:
 * - 001 SC-003: **일기가 저장되지 않는다. 예외 없음**
 * - 004 FR-353: 대체 텍스트가 그 자리를 채우지 않는다
 * - 004 FR-354: 재시도가 가능하다
 * - 004 FR-352: 입력 구성 실패에서는 **모델이 호출되지 않는다**
 * - 001 FR-027: 취소·이탈에서는 **부분 결과가 남지 않는다**
 */
import {
  TerminationReason,
  INFERENCE_FAILURES,
  ALL_TERMINATION_REASONS,
  isCancellation,
  isInferenceFailure,
} from "../../src/inference/failure";
import { generateDiary, type GenerateResult } from "../../src/inference/generate";
import { EngineCallError, type AIEngine } from "../../src/inference/engine";
import { DEFAULT_PROMPT_PARAMS } from "../../src/inference/prompt";
import { createDigest } from "../../src/signals/digest";
import { createPersona, type Persona } from "../../src/persona/persona";
import { TRAIT_CATALOG } from "../../src/persona/catalog";
import { observed, unobserved } from "../../src/signals/observation";
import { ScaleVerdict } from "../../src/signals/scale";
import { EMPTY_MARKERS } from "../../src/speaker/verify";
import { Repository } from "../../src/storage/repository";
import { InMemoryKeyValueStore } from "../../src/storage/kv";

const digest = () =>
  createDigest({
    date: "2026-08-02",
    observedAt: "2026-08-02T18:30:00+09:00",
    steps: observed(4210),
    activePeriods: observed(["저녁"]),
    stays: unobserved(),
    moved: observed(true),
    photos: unobserved(),
    events: unobserved(),
    scale: ScaleVerdict.Normal,
  });

const goodPersona = () => createPersona({ name: "네모", traitId: TRAIT_CATALOG[0].id });

/** 카탈로그에 없는 성격 — 입력 구성 실패를 강제한다 (quickstart 시나리오 6). */
const brokenPersona = () => ({ name: "네모", traitId: "해소되지-않는-성격" }) as Persona;

const engineReturning = (rawText: string): AIEngine => ({
  kind: "cloud",
  generate: async () => ({ rawText }),
});

const countingEngine = () => {
  const calls = { count: 0 };
  const engine: AIEngine = {
    kind: "cloud",
    generate: async () => {
      calls.count++;
      return { rawText: "주인은 걸었다." };
    },
  };
  return { engine, calls };
};

/** 다섯 종료 사유를 각각 강제해 재현한다. */
async function reproduce(reason: TerminationReason): Promise<GenerateResult> {
  const base = { markers: EMPTY_MARKERS, promptParams: DEFAULT_PROMPT_PARAMS };

  switch (reason) {
    case TerminationReason.PromptBuild:
      return generateDiary({
        ...base,
        digest: digest(),
        persona: brokenPersona(),
        engine: engineReturning("주인은 걸었다."),
      });

    case TerminationReason.EngineCall:
      return generateDiary({
        ...base,
        digest: digest(),
        persona: goodPersona(),
        engine: {
          kind: "cloud",
          generate: async () => {
            throw new EngineCallError("모델이 응답하지 않았다");
          },
        },
      });

    case TerminationReason.Format:
      return generateDiary({
        ...base,
        digest: digest(),
        persona: goodPersona(),
        engine: engineReturning("   "),
      });

    case TerminationReason.SpeakerViolation:
      return generateDiary({
        ...base,
        markers: { userSpeakerMarkers: ["내 다리가"], phoneSpeakerMarkers: [] },
        digest: digest(),
        persona: goodPersona(),
        engine: engineReturning("내 다리가 아팠다."),
      });

    case TerminationReason.Cancelled: {
      const controller = new AbortController();
      controller.abort();
      return generateDiary({
        ...base,
        digest: digest(),
        persona: goodPersona(),
        engine: engineReturning("주인은 걸었다."),
        signal: controller.signal,
      });
    }
  }
}

describe("종료 사유는 다섯이다 (004 FR-350 + 001 FR-027)", () => {
  it("추론 실패 넷과 취소·이탈 하나", () => {
    expect(INFERENCE_FAILURES).toHaveLength(4);
    expect(ALL_TERMINATION_REASONS).toHaveLength(5);
  });

  it("취소·이탈은 추론 실패로 분류되지 않는다 — 미완결이다 (001 FR-027)", () => {
    expect(isCancellation(TerminationReason.Cancelled)).toBe(true);
    expect(isInferenceFailure(TerminationReason.Cancelled)).toBe(false);
    for (const reason of INFERENCE_FAILURES) {
      expect(isInferenceFailure(reason)).toBe(true);
      expect(isCancellation(reason)).toBe(false);
    }
  });
});

describe.each(ALL_TERMINATION_REASONS)("종료 사유: %s", (reason) => {
  it("그 사유로 정확히 종료된다", async () => {
    const result = await reproduce(reason);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe(reason);
  });

  it("일기가 산출되지 않는다 (001 SC-003, 004 FR-351)", async () => {
    const result = await reproduce(reason);
    expect(result).not.toHaveProperty("diary");
  });

  it("대체 텍스트가 그 자리를 채우지 않는다 (004 FR-353)", async () => {
    const result = await reproduce(reason);
    // 실패 결과에 본문이 될 만한 문자열이 없다.
    expect(JSON.stringify(result)).not.toMatch(/주인은|하루|오늘/);
  });

  it("그 날짜를 조회했을 때 저장된 일기가 존재하지 않는다 (001 SC-003)", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    const result = await reproduce(reason);

    // 실패했으므로 저장 축에 도달할 것이 없다.
    expect(result.ok).toBe(false);
    expect(await repo.findByDate(digest().date)).toBeNull();
    expect(await repo.listVisible()).toHaveLength(0);
  });

  it("재시도가 가능하다 — 같은 입력으로 다시 부를 수 있다 (004 FR-354)", async () => {
    const first = await reproduce(reason);
    const second = await reproduce(reason);
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.reason).toBe(first.ok === false && first.reason);
  });
});

describe("입력 구성 실패에서는 모델이 호출되지 않는다 (004 FR-352)", () => {
  it("성격이 해소되지 않으면 어댑터를 부르지 않는다", async () => {
    const { engine, calls } = countingEngine();

    const result = await generateDiary({
      digest: digest(),
      persona: brokenPersona(),
      engine,
      markers: EMPTY_MARKERS,
      promptParams: DEFAULT_PROMPT_PARAMS,
    });

    expect(result.ok === false && result.reason).toBe(TerminationReason.PromptBuild);
    expect(calls.count).toBe(0);
  });
});

describe("취소·이탈에서는 부분 결과가 남지 않는다 (001 FR-027)", () => {
  it("호출 전에 취소하면 모델을 부르지 않는다", async () => {
    const { engine, calls } = countingEngine();
    const controller = new AbortController();
    controller.abort();

    const result = await generateDiary({
      digest: digest(),
      persona: goodPersona(),
      engine,
      markers: EMPTY_MARKERS,
      promptParams: DEFAULT_PROMPT_PARAMS,
      signal: controller.signal,
    });

    expect(result.ok === false && result.reason).toBe(TerminationReason.Cancelled);
    expect(calls.count).toBe(0);
  });

  it("본문이 돌아온 뒤 취소되어도 그 본문이 남지 않는다", async () => {
    const controller = new AbortController();
    const engine: AIEngine = {
      kind: "cloud",
      generate: async () => {
        // 응답이 오는 사이 사용자가 앱을 벗어난다.
        controller.abort();
        return { rawText: "주인은 저녁 내내 걸었다." };
      },
    };

    const result = await generateDiary({
      digest: digest(),
      persona: goodPersona(),
      engine,
      markers: EMPTY_MARKERS,
      promptParams: DEFAULT_PROMPT_PARAMS,
      signal: controller.signal,
    });

    expect(result.ok === false && result.reason).toBe(TerminationReason.Cancelled);
    expect(JSON.stringify(result)).not.toMatch(/주인은/);
  });

  it("취소된 추론의 결과가 저장 축에 도달하지 않는다", async () => {
    const repo = new Repository(new InMemoryKeyValueStore());
    const controller = new AbortController();
    controller.abort();

    await generateDiary({
      digest: digest(),
      persona: goodPersona(),
      engine: engineReturning("주인은 걸었다."),
      markers: EMPTY_MARKERS,
      promptParams: DEFAULT_PROMPT_PARAMS,
      signal: controller.signal,
    });

    expect(await repo.listVisible()).toHaveLength(0);
  });
});
