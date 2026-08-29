/**
 * 입력 프롬프트 미리보기 (022).
 *
 * 계약: specs/022-prompt-token-diagnostics/contracts/prompt-preview.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **개발자가 프롬프트를 줄이려면 지금 조립되는 최종 문자열을 봐야 한다.** 이 파일이
 * `buildRequest()` → `buildPrompt()`(실제 생성 경로가 부르는 바로 그 함수)를 사람이
 * 못 박은 대표 신호 조합으로 불러, 결과 문자열을 진단 리포트에 싣는다.
 *
 * **미리보기용 조립 로직을 만들지 않는다**(FR-006, 원칙 II). `buildPrompt()` 하나가
 * 프롬프트의 유일한 통과 지점이며(005 FR-013b), 여기서 그것을 부르므로 "화면에 보이는
 * 것 == 모델에 가는 것"이 정의상 보장된다. `prompt.ts` 내부 심볼(`SPEAKER_RULES` 등)을
 * import하거나 재정의하지 않는다(PP2).
 *
 * **네이티브 추론을 부르지 않는다**(PP5) — `initLlama`·`completion`·엔진·백엔드에 닿지
 * 않는다. 순수 문자열 조립뿐이고, 담는 크기 값은 `text.length`(조립 시점 근사치, 실측
 * 토큰 아님 — FR-011).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildRequest } from "../diary/request";
import { buildPrompt } from "../diary/prompt";
import { CHARACTERS, type Character } from "../diary/types";
import type { DaySignals } from "../signals/types";
import type { PromptPreview, PromptPreviewSet } from "./types";

/**
 * 미리보기가 쓰는 고정 하루.
 *
 * 과거로 고정한다 — `buildRequest`의 `now`는 `dayStillOpen` 계산에만 쓰이고, 날짜가
 * 오늘이 아니면 `dayStillOpen: false`로 결정된다. 미리보기는 날짜 자체를 검증 대상으로
 * 삼지 않는다(data-model.md §5).
 */
const PREVIEW_DATE = "2026-01-15";
const PREVIEW_NOW = new Date("2026-06-01T12:00:00");

/**
 * 대표 신호 조합 하나.
 *
 * **사람이 정한다.** 코드가 신호 값을 보고 어떤 조합을 보여줄지 판정하지 않는다
 * (원칙 V, 012의 `USER_VISIBLE_SIGNAL_AXES`가 선례). `signals`는 아래에서 리터럴로
 * 직접 쓴다 — `fake.ts`·`collect.ts`에서 가져오지 않는다(경계 혼동 방지, research.md R2).
 */
export type SignalPreset = {
  /** 화면·테스트가 참조하는 안정적 식별자 */
  id: string;
  /** 화면에 보일 한국어 이름 */
  label: string;
  /** `buildRequest`에 그대로 들어가는 하루치 신호 */
  signals: DaySignals;
};

/**
 * 프롬프트가 신호 유무에 따라 어떻게 달라지는지 보여주는 최소 조합.
 *
 * `steps`·`battery`·`connectivity`는 `USER_VISIBLE_SIGNAL_AXES`에서 전부 꺼져 있어
 * 프롬프트에 어차피 안 나온다 — `unknown`으로 둔다. 축이 다시 켜지면 이 상수도 그때
 * 손본다(원칙 V — "통로가 생기면 상수를 고친다").
 */
export const SIGNAL_PRESETS: readonly SignalPreset[] = [
  {
    id: "empty",
    label: "신호 없음",
    signals: {
      date: PREVIEW_DATE,
      photos: { kind: "none" },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "걸음 수를 되짚는 통로가 없다" },
      battery: { kind: "unknown", reason: "배터리 기록을 되짚지 못했다" },
      connectivity: { kind: "unknown", reason: "연결 기록을 되짚지 못했다" },
    },
  },
  {
    id: "photos",
    label: "사진 있음",
    signals: {
      date: PREVIEW_DATE,
      photos: {
        kind: "known",
        value: {
          photos: [
            { id: "preview-photo-1", takenAt: new Date(`${PREVIEW_DATE}T10:20:00`) },
            { id: "preview-photo-2", takenAt: new Date(`${PREVIEW_DATE}T18:45:00`) },
          ],
          complete: true,
        },
      },
      places: {
        kind: "known",
        value: {
          trace: { visitCount: 2, approximateDistanceMeters: 3400 },
          source: "photo-exif",
          photosWithLocation: 2,
          photosConsidered: 2,
        },
      },
      steps: { kind: "unknown", reason: "걸음 수를 되짚는 통로가 없다" },
      battery: { kind: "unknown", reason: "배터리 기록을 되짚지 못했다" },
      connectivity: { kind: "unknown", reason: "연결 기록을 되짚지 못했다" },
    },
  },
];

/**
 * 캐릭터 + 프리셋 하나에 대한 미리보기.
 *
 * `buildRequest`가 `no-character`를 반환하면 사유를 담아 정직하게 실패로 돌린다
 * (FR-009, PP8) — `text` 필드 없이. 실사용에서는 `character`를 항상 채워 부르므로
 * 발생하지 않으나, 003·017처럼 "계약을 넓히되 방어를 남긴다".
 */
export function buildPreview(
  character: Character | undefined,
  preset: SignalPreset,
): PromptPreview {
  const request = buildRequest(preset.signals, character, "none", preset.signals.date, PREVIEW_NOW);

  if (!request.ok) {
    return { ok: false, reason: `요청을 만들 수 없다 (${request.reason})` };
  }

  const text = buildPrompt(request.request);
  return { ok: true, text, approxChars: text.length };
}

/** 프리셋 id → 화면 라벨. 화면이 `SignalPreset` 전체를 알 필요 없이 이것만 받는다. */
export const PRESET_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  SIGNAL_PRESETS.map((preset) => [preset.id, preset.label]),
);

/** 다섯 캐릭터 × 모든 프리셋의 미리보기 (022 FR-005·FR-007, PP4). */
export function collectPromptPreviews(): Readonly<Record<Character, PromptPreviewSet>> {
  return Object.fromEntries(
    CHARACTERS.map((character) => [
      character,
      Object.fromEntries(
        SIGNAL_PRESETS.map((preset) => [preset.id, buildPreview(character, preset)]),
      ),
    ]),
  ) as Readonly<Record<Character, PromptPreviewSet>>;
}
