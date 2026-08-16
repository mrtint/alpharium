/**
 * 일기 생성 요청 만들기.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md 「DiaryRequest」
 *
 * 신호 + 캐릭터 + 시각 설정을 추론 어댑터가 받을 하나의 입력으로 묶는다.
 */

import type { DaySignals } from "../signals/types";
import type { Character, DiaryRequest, VisionSetting } from "./types";

/**
 * 요청을 만든 결과.
 *
 * 실패를 예외가 아니라 값으로 표현한다 — 001의 ModuleStatus·EnvironmentResolution과 같다.
 * 예외는 삼켜지기 쉽고, 삼켜지면 파이프라인이 어느 단계에서 멈췄는지 말할 수 없다(FR-019).
 */
export type RequestResult =
  { ok: true; request: DiaryRequest } | { ok: false; reason: "no-character" };

/**
 * 요청을 만든다.
 *
 * **신호의 양으로 거부하지 않는다(FR-005a).** 신호가 전부 `none`이거나 `unknown`인 하루도
 * 요청이 된다(FR-005b) — 휴대폰이 아무것도 보지 못한 것 자체가 일기의 내용이기 때문이다
 * (헌법 원칙 II). 조용한 하루에 일기를 안 만들면 제품의 설정을 배신한다.
 *
 * 거부하는 경우는 하나뿐이다: **캐릭터가 없을 때**(FR-007). 누가 쓰는지 모르면 쓸 수 없다.
 * 이때 임의의 캐릭터를 골라 채우지 않는다 — 사용자가 고르지 않은 성격으로 쓴 일기는
 * 사용자의 일기가 아니다.
 */
export function buildRequest(
  signals: DaySignals,
  character: Character | undefined,
  vision: VisionSetting,
): RequestResult {
  if (character === undefined) {
    return { ok: false, reason: "no-character" };
  }

  return { ok: true, request: { signals, character, vision } };
}
