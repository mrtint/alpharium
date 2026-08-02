/**
 * T036 — 생성 파이프라인 (004 FR-345·FR-349·FR-351~FR-354)
 *
 * 순서: 집계+퍼소나 → **프롬프트 구성** → **어댑터** → **형식 검사** → **화자 판정**.
 *
 * 프롬프트 구성·형식 검사·화자 판정이 모두 어댑터 **밖**에 있다 (헌법 원칙 III) —
 * 어댑터를 교체해도 같은 규칙이 적용된다.
 *
 * **판정을 통과하지 못한 본문은 저장 축에 도달하지 않는다** (004 FR-345·FR-349).
 * 어느 실패에서도 부분 결과를 돌려주지 않으며, 대체 문장으로 메우지 않는다.
 */
import { createDiaryEntry, type DiaryEntry } from "./diary";
import { buildPromptInput, composePrompt, PromptBuildError, type PromptParams } from "./prompt";
import { parseDiaryBody } from "./parse";
import { TerminationReason } from "./failure";
import type { AIEngine } from "./engine";
import type { DailyDigest } from "../signals/digest";
import type { Persona } from "../persona/persona";
import { verifySpeaker, type SpeakerMarkers } from "../speaker/verify";
import { log } from "../logging";

export interface GenerateInput {
  readonly digest: DailyDigest;
  readonly persona: Persona;
  readonly engine: AIEngine;
  /** 화자 판정의 표지 목록. T058이 실측으로 채운다. */
  readonly markers: SpeakerMarkers;
  readonly promptParams: PromptParams;
  /** 취소·이탈 신호 (001 FR-027). */
  readonly signal?: AbortSignal;
}

export interface GenerateSuccess {
  readonly ok: true;
  readonly diary: DiaryEntry;
}

export interface GenerateTermination {
  readonly ok: false;
  readonly reason: TerminationReason;
  /** 화자 위반에서 걸린 표지. 고치는 데 쓰지 않는다 — 알리는 데만 쓴다 (004 FR-349). */
  readonly violatingMarkers?: readonly string[];
}

export type GenerateResult = GenerateSuccess | GenerateTermination;

const terminated = (
  reason: TerminationReason,
  violatingMarkers?: readonly string[],
): GenerateTermination => ({ ok: false, reason, violatingMarkers });

export async function generateDiary(input: GenerateInput): Promise<GenerateResult> {
  const { digest, persona, engine, markers, promptParams, signal } = input;

  if (signal?.aborted) return terminated(TerminationReason.Cancelled);

  // 1. 프롬프트 구성. 실패하면 **모델을 호출하지 않는다** (004 FR-352).
  let prompt: string;
  try {
    prompt = composePrompt(buildPromptInput(digest, persona, promptParams));
  } catch (error) {
    log.warn("입력 구성 실패 — 모델을 호출하지 않는다", {
      date: digest.date,
      error: error instanceof PromptBuildError ? error.name : "unknown",
    });
    return terminated(TerminationReason.PromptBuild);
  }

  // 2. 어댑터 호출. 어댑터가 하는 일은 이것뿐이다 (헌법 원칙 III).
  let rawText: string;
  try {
    rawText = (await engine.generate({ prompt, signal })).rawText;
  } catch (error) {
    // 취소·이탈은 추론 실패가 아니라 미완결이다 (001 FR-027).
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      return terminated(TerminationReason.Cancelled);
    }
    log.warn("모델 응답 실패", { date: digest.date });
    return terminated(TerminationReason.EngineCall);
  }

  if (signal?.aborted) return terminated(TerminationReason.Cancelled);

  // 3. 형식 검사 (004 FR-340).
  const parsed = parseDiaryBody(rawText);
  if (!parsed.ok) {
    log.warn("형식 실패 — 본문을 식별할 수 없다", { date: digest.date });
    return terminated(TerminationReason.Format);
  }

  // 4. 화자 판정 — 추론 축의 마지막 관문 (004 FR-345).
  const verdict = verifySpeaker(parsed.body, markers);
  if (!verdict.isPhoneSpeaker) {
    // 고쳐서 저장하지 않는다 (004 FR-349). 본문은 여기서 버려진다.
    log.warn("화자 위반 — 저장하지 않는다", { date: digest.date });
    return terminated(TerminationReason.SpeakerViolation, verdict.violatingMarkers);
  }

  return {
    ok: true,
    diary: createDiaryEntry({ date: digest.date, personaName: persona.name, body: parsed.body }),
  };
}
