/**
 * T030 — 프롬프트 구성 (004 FR-318·FR-331, 001 FR-015)
 *
 * **어댑터 밖에 있다** (헌법 원칙 III) — 어댑터는 완성된 문자열만 받는다.
 *
 * **미관측 항목은 아예 뺀다.** 미관측이라고 알리지도 않는다 (001 FR-015) — 「걸음 수는
 * 알 수 없었다」를 넣으면 온디바이스 소형 모델의 입력이 커지고, 휴대폰이 관측하지 못한
 * 것을 화제로 삼게 된다.
 *
 * **회상 슬롯의 자리를 두되 항상 비운다** (001 FR-015, SC-006).
 *
 * **입력 구성 규칙과 추측의 강도는 매개변수로 두고 값을 비운다** — T061이 실측으로
 * 채운다 (004 FR-318·FR-331).
 */
import { isObserved, type Observation } from "../signals/observation";
import type { DailyDigest } from "../signals/digest";
import { resolveTrait } from "../persona/catalog";
import type { Persona } from "../persona/persona";

/** 추측의 강도 (004 FR-331 — T061이 실측으로 정한다). */
export type SpeculationStrength = "unset" | "reserved" | "bold";

export interface PromptParams {
  /**
   * 입력 구성 규칙 (004 FR-318). 실측 전에는 `unset`이며, 그래도 US1은 돈다 —
   * 관측된 항목만 싣는다는 골격은 매개변수와 무관하게 성립한다.
   */
  readonly composition: "unset" | "compact" | "verbose";
  /** 추측의 강도 (004 FR-331). 실측 전에는 `unset`이다. */
  readonly speculation: SpeculationStrength;
}

/**
 * **값을 비운 기본값** (004 FR-318·FR-331). T061이 채우기 전까지 근거 없는 값을
 * 최종값으로 남기지 않는다.
 */
export const DEFAULT_PROMPT_PARAMS: PromptParams = Object.freeze({
  composition: "unset",
  speculation: "unset",
});

/** 회상 슬롯 — 자리는 있고 US1에서 항상 비어 있다 (001 FR-015). */
export type RecallSlot = readonly string[];

export function emptyRecallSlot(): RecallSlot {
  return [];
}

export interface PromptInput {
  readonly personaName: string;
  readonly traitLabel: string;
  readonly traitDescription: string;
  readonly date: string;
  /** 관측된 항목만. 미관측은 여기 없다 (001 FR-015). */
  readonly observations: readonly string[];
  /** **US1에서 항상 비어 있다** (001 SC-006). */
  readonly recallSlot: RecallSlot;
  readonly params: PromptParams;
}

export function isRecallSlotEmpty(input: PromptInput): boolean {
  return input.recallSlot.length === 0;
}

/** 입력 구성 실패 (004 FR-350·FR-352). 이 경우 **모델을 호출하지 않는다**. */
export class PromptBuildError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PromptBuildError";
  }
}

/** 관측된 것만 문장으로 옮긴다. 미관측이면 아무것도 내놓지 않는다. */
function line<T>(label: string, o: Observation<T>, render: (v: T) => string): string | null {
  return isObserved(o) ? `${label}: ${render(o.value)}` : null;
}

const periodOf = (p: Observation<string>) => (isObserved(p) ? p.value : "");

function observationsOf(digest: DailyDigest): readonly string[] {
  return [
    line("걸음 수", digest.steps, (n) => `${n}`),
    line("움직인 시간대", digest.activePeriods, (ps) => ps.join(", ")),
    line("머문 곳", digest.stays, (ss) =>
      ss.map((s) => `${periodOf(s.period)} ${s.place}`.trim()).join(", "),
    ),
    line("이동", digest.moved, (m) => (m ? "있었다" : "없었다")),
    line("사진", digest.photos, (ps) =>
      ps
        .map((p) =>
          [periodOf(p.period), isObserved(p.place) ? p.place.value : "", isObserved(p.caption) ? p.caption.value : ""]
            .filter(Boolean)
            .join(" "),
        )
        .filter(Boolean)
        .join(" / "),
    ),
    line("일정", digest.events, (es) =>
      es.map((e) => `${periodOf(e.period)} ${e.title}`.trim()).join(", "),
    ),
  ].filter((l): l is string => l !== null);
}

/**
 * 집계와 퍼소나로 추론 입력을 만든다. 성격 참조가 해소되지 않으면 **입력 구성 실패**이며
 * 모델은 호출되지 않는다 (004 FR-352).
 *
 * 네 번째 인자를 받아도 회상 슬롯은 채워지지 않는다 — 자리는 있으나 US1에서 비어 있다.
 */
export function buildPromptInput(
  digest: DailyDigest,
  persona: Persona,
  params: PromptParams,
  _ignored?: Record<string, unknown>,
): PromptInput {
  let trait;
  try {
    trait = resolveTrait(persona.traitId);
  } catch (error) {
    throw new PromptBuildError("성격 참조가 해소되지 않는다", { cause: error });
  }

  return {
    personaName: persona.name,
    traitLabel: trait.label,
    traitDescription: trait.description,
    date: digest.date,
    observations: observationsOf(digest),
    // 자리는 있고 언제나 비어 있다 (001 SC-006). 넘어온 값을 쓰지 않는다.
    recallSlot: emptyRecallSlot(),
    params,
  };
}

/** 추측의 강도를 문장으로 옮긴다. `unset`이면 아무 지시도 덧붙이지 않는다. */
function speculationLine(strength: SpeculationStrength): string | null {
  if (strength === "reserved") return "본 것에서 크게 벗어나지 않게 짐작한다.";
  if (strength === "bold") return "본 것을 실마리로 마음껏 짐작한다.";
  return null;
}

/** 어댑터에 넘길 **완성된** 문자열을 만든다. 어댑터는 이것을 조립하지 않는다. */
export function composePrompt(input: PromptInput): string {
  if (input.recallSlot.length !== 0) {
    throw new PromptBuildError("US1에서 회상 슬롯은 비어 있어야 한다 (001 SC-006)");
  }

  return [
    `너는 주인의 휴대폰이다. 이름은 ${input.personaName}이고 ${input.traitLabel} 성격이다.`,
    input.traitDescription,
    "",
    `${input.date}에 네가 관측한 것은 아래가 전부다.`,
    ...input.observations,
    "",
    "관측한 것만으로 주인의 하루를 짐작해 일기를 쓴다.",
    "화자는 너다. 주인이 아니다. 주인은 3인칭으로 부른다.",
    speculationLine(input.params.speculation),
    "본문만 쓴다. 제목·태그·기분을 붙이지 않는다.",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}
