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
import type { PermissionState } from "../signals/port";
import type { DaySignals } from "../signals/types";
import type { CountHint, DayPreview, PhotoAccess } from "./state";

/**
 * OS 사진 권한 상태를 화면이 받는 세 갈래로 옮긴다 (053 PRM2).
 *
 * `denied`·`undetermined`는 앱이 다시 물을 수 있고, `blocked`는 설정에서만 바꿀 수 있다. `granted`·
 * `limited`는 「권한이 없어요」가 아니다(`limited`는 셀 수 없음으로 「모름」에 남는다).
 */
export function photoAccessOf(state: PermissionState): PhotoAccess {
  switch (state) {
    case "denied":
    case "undetermined":
      return "denied";
    case "blocked":
      return "blocked";
    case "granted":
    case "limited":
      return "ok";
  }
}

export function toDayPreview(
  day: DayDate,
  signals: DaySignals | null,
  photoAccess: PhotoAccess,
): DayPreview {
  if (signals === null) {
    return { day, photos: { kind: "unknown" }, places: { kind: "unknown" }, photoAccess };
  }

  const photos: CountHint =
    signals.photos.kind === "known"
      ? { kind: "known", count: signals.photos.value.photos.length }
      : { kind: signals.photos.kind };

  // **사진이 관측된 0장이면 장소도 0곳이다**(053, 실기기 관측). 장소 수는 사진의 좌표에서 나오므로 사진이
  // 없으면 좌표를 가진 사진도 없다 — 이것은 관측된 사실이다. 그런데 신호 수집은 사진이 `none`일 때도 장소를
  // `unknown`(「사진을 보지 못해 좌표를 물을 수 없다」)으로 돌려주므로, 그대로 두면 사진 0장인 하루가 「장소
  // 모름」으로 보여 보드 `2e`(0장·0곳)와 어긋난다. **사진이 `unknown`이면 이 승격을 하지 않는다** —
  // 못 본 것은 여전히 못 본 것이다(원칙 V).
  const places: CountHint =
    signals.places.kind === "known"
      ? { kind: "known", count: signals.places.value.trace.visitCount }
      : signals.places.kind === "unknown" && signals.photos.kind === "none"
        ? { kind: "none" }
        : { kind: signals.places.kind };

  return { day, photos, places, photoAccess };
}
