/**
 * 하루 신호를 화면이 받는 개수 요약으로 좁힌다 (048 US3).
 *
 * 계약: specs/048-diary-home-modernist/contracts/write-prompt.md DP1~DP6, data-model.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면은 `DaySignals`를 모른다**(009 이후 경계). 홈의 신호 줄이 필요한 것은 사진 장수와
 * 다닌 자리 수뿐이므로 그 둘만 옮긴다 — 좌표·시각·사진 id는 여기서 멈춘다(DP6).
 *
 * **세 갈래를 그대로 옮긴다**(원칙 V). `none`을 0으로, `unknown`을 `none`으로 바꾸지 않는다.
 * 신호를 만들지 못했으면(`null`) 둘 다 「모른다」다 — 「없다」가 아니다.
 *
 * **사진 수는 그날 전체 장수다**(Clarification Q3) — 캡션 선별(023 `vision/select`)을 부르지
 * 않는다. 일기 프롬프트의 「사진: n장」과 같은 수다.
 *
 * 이 파일이 신호 계층을 import하는 유일한 `app/` 자리로 따로 있는 이유: `state.ts`는 화면이
 * import하므로, 거기 신호 타입을 들이면 화면이 `state.ts`를 거쳐 신호에 닿는 길이 생긴다(DP8).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import type { DaySignals } from "../signals/types";
import type { CountHint, DayPreview } from "./state";

export function toDayPreview(day: DayDate, signals: DaySignals | null): DayPreview {
  if (signals === null) {
    return { day, photos: { kind: "unknown" }, places: { kind: "unknown" } };
  }

  const photos: CountHint =
    signals.photos.kind === "known"
      ? { kind: "known", count: signals.photos.value.photos.length }
      : { kind: signals.photos.kind };

  const places: CountHint =
    signals.places.kind === "known"
      ? { kind: "known", count: signals.places.value.trace.visitCount }
      : { kind: signals.places.kind };

  return { day, photos, places };
}
