/**
 * 사용자 경로 조립.
 *
 * 계약: specs/006-first-diary-app/contracts/persistence.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **파이프라인을 만드는 자리는 저장소에 여기 하나뿐이다.**
 *
 * 001의 `policy.ts`가 원칙 I의 규칙을, 003의 `roster.ts`가 캐릭터→모델 매핑을,
 * 005의 `prompt.ts`가 화자 규칙을 한 곳에 모은 것과 같은 구조다.
 *
 * **왜 이 자리가 생겼는가**: 006 이전에는 조립할 자리가 없어 `GenerationProbe`가
 * 어댑터를 직접 불렀고, 그래서 **파이프라인을 건너뛰어 `store.save()`가 기기에서 한
 * 번도 실행되지 않았다.** 일기가 하나도 남지 않은 원인이며, 그 배선을 여기서 잇는다.
 *
 * **여기서 지키는 것**:
 *  1. 어댑터는 **`selectBackend()`에서만** 온다(FR-026, SC-024). 직접 만들지 않는다 —
 *     만드는 순간 dev·prod의 온디바이스 강제를 한 지점에서 검증할 수 없다
 *  2. 저장소는 **제품 경로의 `fileStore`**다. `memoryStore`는 테스트 전용이며 앱이
 *     죽으면 사라진다
 *  3. 환경을 모르면 **아무것도 만들지 않는다**(FR-035). `prod`로 간주하고 진행하는 것이
 *     001이 거부한 「기본값으로 떨어지기」다
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import { desktopInferenceUrl } from "../config/environment";
import type { EnvironmentResolution } from "../config/types";
import { createPipeline, type Pipeline } from "../diary/pipeline";
import { expoFileSystemPort, fileStore, type DiaryStore } from "../diary/store";
import type { Character } from "../diary/types";
import { selectBackend, selectLocation } from "../inference/select";
import type { InferenceLocation, SelectionFailure } from "../inference/types";
import { collectDaySignals } from "../signals/collect";
import { expoPhotoPort } from "../signals/expo-port";
import type { DaySignals } from "../signals/types";

/**
 * 조립 결과.
 *
 * **실패 갈래에 `pipeline` 자리가 없다.** 001의 `SelectionFailure`, 002의
 * `PipelineResult`와 같은 방식이다 — **자리가 없으면 채울 수 없다.** 있으면 언젠가
 * "실패했지만 일단 하나 만들어 두자"가 되고, 그것이 원칙 I의 방어선을 뚫는 길이다.
 *
 * `location`을 함께 주는 이유: 어디서 도는지를 호출자가 알아야 하는 것이 아니라,
 * **조립이 `select.ts`를 거쳤다는 것을 테스트가 확인할 수 있어야 하기 때문**이다.
 * 화면에 표시하지 않는다(원칙 III — 사용자는 추론 위치를 알 필요가 없다).
 */
export type AppPipelineResult =
  | { ok: true; pipeline: Pipeline; location: InferenceLocation }
  | { ok: false; reason: SelectionFailure; detail: string; pipeline?: undefined };

/** 조립에 필요한 통로. 테스트가 기기 없이 갈아끼운다 */
export type WiringDeps = {
  store?: DiaryStore;
  loadSignals?: (day: DayDate) => Promise<DaySignals | null>;
  isModelReady?: (character: Character) => Promise<boolean>;
};

/**
 * 기기에 닿는 통로를 만든다.
 *
 * **지연 생성이다.** 모듈을 읽는 것만으로 `expo-file-system`·`expo-media-library`가
 * 해석되면 웹·테스트 환경에서 무너진다 — 001의 on-device 어댑터가 지연 import를 쓰는
 * 것과 같은 판단이다.
 */
function deviceStore(): DiaryStore {
  return fileStore(expoFileSystemPort("diary"));
}

/** 그 하루의 실제 신호. 004의 수집을 그대로 쓴다 */
function deviceSignals(day: DayDate): Promise<DaySignals> {
  return collectDaySignals(expoPhotoPort(), day);
}

/**
 * 사용자 경로의 파이프라인을 만든다.
 *
 * **환경 판정 결과를 인자로 받는다.** 안에서 `currentEnvironment()`를 부르지 않는다 —
 * 부르면 테스트가 전역 상태를 건드려야 하고, `process.env`를 읽는 자리가
 * `config/environment.ts` 하나뿐이라는 001 FR-009a가 흐려진다.
 */
export function createAppPipeline(
  resolution: EnvironmentResolution,
  deps: WiringDeps = {},
): AppPipelineResult {
  // **여기서 규칙을 다시 판단하지 않는다.** select.ts가 policy.ts에 물어 정한다.
  const selection = selectBackend(resolution, undefined, desktopInferenceUrl());
  if (!selection.ok) {
    return { ok: false, reason: selection.reason, detail: selection.detail };
  }

  // 위치는 같은 규칙으로 다시 물어 얻는다 — selectBackend가 성공했으므로 이것도 성공한다.
  const located = selectLocation(resolution);
  /* c8 ignore next */
  if (!located.ok) {
    return { ok: false, reason: located.reason, detail: "추론 위치를 고르지 못했다" };
  }

  const pipeline = createPipeline({
    backend: selection.backend,
    store: deps.store ?? deviceStore(),
    loadSignals: deps.loadSignals ?? deviceSignals,
    isModelReady: deps.isModelReady,
  });

  return { ok: true, pipeline, location: located.location };
}
