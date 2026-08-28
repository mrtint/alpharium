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
import { createPipeline, type LockHandle, type Pipeline } from "../diary/pipeline";
import { expoFileSystemPort, fileStore, type DiaryStore } from "../diary/store";
import type { Character, VisionSetting } from "../diary/types";
import { selectBackend, selectLocation } from "../inference/select";
import type { InferenceLocation, SelectionFailure } from "../inference/types";
import { acquireLock as acquireLockRecord, releaseLock, type LockPort } from "../schedule/lock";
import { expoLockPort } from "../schedule/lock-port";
import { collectDaySignals } from "../signals/collect";
import { expoPhotoPort } from "../signals/expo-port";
import { expoGeocodingPort } from "../signals/geocoding-port";
import type { DaySignals } from "../signals/types";
import type { VisionOutcome } from "../vision/types";

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
  | {
      ok: true;
      pipeline: Pipeline;
      location: InferenceLocation;
      /**
       * 생성을 끊는 통로 (005 FR-014b, 007 FR-013).
       *
       * ─────────────────────────────────────────────────────────────────────
       * **★ 007이 잇는 끊긴 배선이다.**
       *
       * 006까지 이 자리가 없어 `App.tsx`가 화면에 넘길 것이 없었고, 그래서
       * **005의 끊김 기능이 실기기에서 한 번도 돈 적이 없다.** 「30초라 확인하지
       * 못했다」가 아니라 배선이 없어 확인할 수 없었던 것이다.
       *
       * **옵셔널인 것은 의도다** — 데스크톱 경로에는 끊을 것이 없다(005 FR-025).
       * 다만 옵셔널이 이 결함을 숨긴 원인이기도 하므로, **온디바이스면 반드시
       * 있다는 것을 테스트가 검사한다**(007 contracts/selection.md §3).
       * ─────────────────────────────────────────────────────────────────────
       */
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
      /**
       * 이 파이프라인이 쓰는 일기 저장소 (020).
       *
       * 백그라운드 자동 생성(`src/schedule/task.ts`)이 "지금 어느 하루를
       * 써야 하는가"를 판정하려면 이미 저장된 일기 날짜를 알아야 한다
       * (contracts/background-generation.md B2-2). 파이프라인을 만드는
       * 자리가 여기 하나뿐이므로(001~006이 세운 경계), store도 여기서
       * 함께 내보낸다 — task.ts가 `fileStore()`를 따로 만들면 store를
       * 만드는 자리가 둘이 된다.
       */
      store: DiaryStore;
    }
  | {
      ok: false;
      reason: SelectionFailure;
      detail: string;
      pipeline?: undefined;
      stop?: undefined;
      prepare?: undefined;
      release?: undefined;
      captionDay?: undefined;
      store?: undefined;
    };

/** 조립에 필요한 통로. 테스트가 기기 없이 갈아끼운다 */
export type WiringDeps = {
  store?: DiaryStore;
  loadSignals?: (day: DayDate) => Promise<DaySignals | null>;
  isModelReady?: (character: Character) => Promise<boolean>;
  /** 장소명 설정이 켜져 있는가 (017, FR-004). 주지 않으면 꺼짐으로 다룬다 */
  geocodingEnabled?: boolean;
  /**
   * 이 파이프라인을 누가 조립하는가 (020, contracts/generation-lock.md L5).
   *
   * `"screen"`이면 화면 수동 생성, `"background"`면 자동 생성 태스크.
   * 이 값으로 owner-bound `acquireLock` 클로저를 만든다. 주지 않으면
   * `"screen"`(기존 유일 호출자).
   */
  lockOwner?: "screen" | "background";
  /**
   * 경합 잠금 파일 통로 (020). 테스트가 기기 없이 갈아끼운다. 주지 않으면
   * `expoLockPort()`.
   */
  lockPort?: LockPort;
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
  // 018 2단계 — captionDay()가 신호를 읽을 수 있도록 같은 loadSignals를 넘긴다.
  const selection = selectBackend(
    resolution,
    undefined,
    desktopInferenceUrl(),
    deps.loadSignals ?? deviceSignals,
  );
  if (!selection.ok) {
    return { ok: false, reason: selection.reason, detail: selection.detail };
  }

  // 위치는 같은 규칙으로 다시 물어 얻는다 — selectBackend가 성공했으므로 이것도 성공한다.
  const located = selectLocation(resolution);
  /* c8 ignore next */
  if (!located.ok) {
    return { ok: false, reason: located.reason, detail: "추론 위치를 고르지 못했다" };
  }

  const store = deps.store ?? deviceStore();

  // 020 — 경합 잠금. owner를 여기서 bind한다(L5) — `PipelineInput`은
  // 화면·태스크가 공유하는 데이터라 owner 개념이 안 어울린다. `Date.now()`를
  // 여기서 부르는 것은 허용된다(L5) — 잠금 취득 시각은 테스트가 경계값을
  // 볼 필요 없는 벽시계 사실이다. 순수 `decideAcquire`는 `nowMs`를 인자로
  // 받으므로 그쪽이 테스트 대상이다.
  const owner = deps.lockOwner ?? "screen";
  const lockPort = deps.lockPort ?? expoLockPort();
  const acquireLock = async (): Promise<LockHandle | null> => {
    const record = await acquireLockRecord(lockPort, owner, Date.now());
    if (record === null) return null;
    return { release: () => releaseLock(lockPort, record) };
  };

  const pipeline = createPipeline({
    backend: selection.backend,
    store,
    loadSignals: deps.loadSignals ?? deviceSignals,
    isModelReady: deps.isModelReady,
    // 017 — 설정이 켜져 있을 때만 지오코딩 포트를 만든다. `expoGeocodingPort()`가
    // 스스로 지연 import하므로 여기서 만드는 것 자체는 비용이 없다(011의
    // `expoModelPorts()`와 같은 판단).
    geocoding: expoGeocodingPort(),
    geocodingEnabled: deps.geocodingEnabled,
    acquireLock,
  });

  // **backend를 버리지 않는다**(007 §3). 006까지 여기서 버려서 화면이 끊을 길이 없었다.
  // 데스크톱에는 `stop`이 없으므로 그대로 undefined가 실린다 — 넓히지 않는다(005 FR-025).
  const stop = selection.backend.stop?.bind(selection.backend);
  // 018 — 같은 방식으로 prepare/release/captionDay를 넘긴다. 데스크톱에는
  // 없으므로 undefined.
  const prepare = selection.backend.prepare?.bind(selection.backend);
  const release = selection.backend.release?.bind(selection.backend);
  const captionDay = selection.backend.captionDay?.bind(selection.backend);

  return {
    ok: true,
    pipeline,
    location: located.location,
    stop,
    prepare,
    release,
    captionDay,
    store,
  };
}
