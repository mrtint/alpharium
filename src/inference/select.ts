/**
 * 추론 위치와 어댑터 선택.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/environment.md, contracts/inference.md
 *
 * **추론 위치를 고르는 유일한 지점이다(FR-025).**
 * 다른 어떤 모듈도 자기 판단으로 추론 위치를 정하지 않으며, 이 함수를 거치지 않고
 * 어댑터를 직접 만들어 쓰지 않는다. 그래야 일기 생성 코드가 자신이 어디서 도는지
 * 모른 채로 남는다.
 */

import type { DayDate } from "../config/day-boundary";
import { defaultLocationFor, isLocationAllowed } from "../config/policy";
import type { Environment, EnvironmentResolution } from "../config/types";
import type { Character, VisionSetting } from "../diary/types";
import type { DaySignals } from "../signals/types";
import type { VisionOutcome } from "../vision/types";
import { createDesktopServerBackend, httpProbe } from "./desktop-server";
import { onDeviceBackend } from "./on-device";
import type { InferenceBackend, InferenceLocation, SelectionFailure } from "./types";

export type LocationSelection =
  | { ok: true; location: InferenceLocation }
  | {
      ok: false;
      reason: SelectionFailure;
      requested?: InferenceLocation;
      environment?: Environment;
    };

/**
 * 환경 판정 결과와 요청으로 추론 위치를 고른다.
 *
 * 규칙 판단은 config/policy.ts에 있고 여기서 다시 판단하지 않는다.
 *
 * 차단된 요청을 조용히 다른 값으로 바꿔치기하지 않는다(FR-009c). 요청과 다른 것을
 * 조용히 하면 호출자가 무엇이 일어났는지 모른다. 차단됐다는 사실이 결과다.
 */
export function selectLocation(
  resolution: EnvironmentResolution,
  requested?: InferenceLocation,
): LocationSelection {
  // 환경을 모르면 요청이 허용되는지 판단할 근거가 없다. 요청을 무시한다(FR-009b).
  if (!resolution.ok) {
    return { ok: false, reason: "environment-unresolved" };
  }

  const env = resolution.environment;
  const location = requested ?? defaultLocationFor(env);

  if (!isLocationAllowed(env, location)) {
    return {
      ok: false,
      reason: "location-forbidden",
      requested: location,
      environment: env,
    };
  }

  return { ok: true, location };
}

/**
 * 고른 어댑터. **`stop`을 좁혀 버리지 않는다**(007 contracts/selection.md §3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 여기가 005 FR-014b를 죽여 두었던 자리다.**
 *
 * `on-device.ts`는 `StoppableBackend`(= `InferenceBackend & { stop() }`)를 만들고,
 * `DiaryHomeScreen`은 `stop?`을 받아 쓴다. 그런데 **그 사이의 이 타입이
 * `InferenceBackend`로 좁혀 `stop`을 타입에서 지웠다.** 값은 런타임에 멀쩡히 있었지만
 * 호출자가 닿을 수 없었고, 그래서 `App.tsx`가 화면에 넘길 것이 없었다.
 *
 * **조용히 통과한 이유**: 화면 쪽 `stop?`이 옵셔널이라 넘기지 않아도 타입 검사가
 * 통과했고, 화면 테스트는 prop을 직접 주입하므로 초록불이었다. 실기기에서도 오류가
 * 나는 것이 아니라 **아무 일이 일어나지 않을 뿐**이었다.
 *
 * **`stop`을 옵셔널로 두는 것은 의도다**(005 FR-025). 데스크톱 경로에는 끊을 것이
 * 없으므로 `InferenceBackend`를 넓히지 않는다 — 파이프라인은 여전히 이것을 모른다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type SelectedBackend = InferenceBackend & {
  stop?: () => Promise<void>;
  /**
   * 화면이 미리 준비를 부르는 통로 (018). `stop`과 같은 이유로 옵셔널이다 —
   * 데스크톱 경로에는 준비할 것이 없다.
   */
  prepare?: (character: Character) => Promise<void>;
  release?: () => Promise<void>;
  /** 사진만 미리 읽는 통로 (018 2단계). 데스크톱 경로에는 없다 */
  captionDay?: (
    day: DayDate,
    character: Character,
    vision: VisionSetting,
  ) => Promise<VisionOutcome>;
};

export type BackendSelection =
  { ok: true; backend: SelectedBackend } | { ok: false; reason: SelectionFailure; detail: string };

/**
 * 추론 어댑터를 고른다.
 *
 * selectLocation()의 결과에 따라 구현체를 반환한다. 규칙을 여기서 다시 판단하지 않는다.
 *
 * 불변식:
 *  1. dev·prod에서 데스크톱 서버 어댑터를 반환하는 경우는 없다(FR-012).
 *  2. 환경 판정 실패 시 어떤 어댑터도 반환하지 않는다(FR-009b).
 *
 * 1번은 selectLocation()이 이미 막는다 — 여기서 규칙을 복제하면 두 곳이 어긋날 수 있다.
 */
export function selectBackend(
  resolution: EnvironmentResolution,
  requested?: InferenceLocation,
  serverBaseUrl?: string,
  /** 018 2단계 — 온디바이스 어댑터의 `captionDay()`가 쓴다. 데스크톱 경로는 무시한다 */
  loadSignals?: (day: DayDate) => Promise<DaySignals | null>,
): BackendSelection {
  const selection = selectLocation(resolution, requested);

  if (!selection.ok) {
    const detail =
      selection.reason === "environment-unresolved"
        ? "환경을 판정하지 못해 추론 위치를 고르지 않았다"
        : `${selection.environment} 환경에서 ${selection.requested}는 허용되지 않는다`;

    return { ok: false, reason: selection.reason, detail };
  }

  const backend =
    selection.location === "on-device"
      ? onDeviceBackend(loadSignals)
      : createDesktopServerBackend(serverBaseUrl, httpProbe);

  return { ok: true, backend };
}
