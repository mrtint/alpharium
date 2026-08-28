/**
 * 백그라운드 자동 일기 생성 검증 하네스.
 *
 * 계약: specs/019-background-diary-feasibility/contracts/background-harness.md
 *       (H1~H5), research.md §1·§3·§4·§5·§6a
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일은 제품 코드가 아니다.** 019 기술 검증(스파이크)이 끝나면
 * `src/spike/` 디렉터리 전체와 함께 지워질 수 있다.
 *
 * **H1·H2를 지키는 방법**: 제품 파이프라인(`wiring.ts`의 `createAppPipeline()`
 * → `pipeline.run()`)을 그대로 호출한다. 판정 로직(`acceptance.ts`)이나
 * 백엔드(`backend.generate()`)를 직접 부르지 않는다 — `__tests__/spike/
 * harness-boundary.test.ts`가 소스 문자열로 이를 확인한다.
 *
 * **콜백 본체를 `runBackgroundDiaryTask()`로 뽑아 export하는 이유**:
 * `TaskManager.defineTask()`와 진단 패널의 "지금 즉시 트리거" 버튼이 같은
 * 로직을 100% 재사용해야 한다(tasks.md T012) — 로직을 복제하면 두 실행
 * 경로가 조용히 어긋날 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AppState } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";

import { createAppPipeline } from "../app/wiring";
import { loadSelection, expoSelectionPort } from "../app/selection-store";
import { loadVisionSetting, expoVisionSettingPort } from "../app/vision-setting-store";
import { latestClosedDay } from "../config/day-boundary";
import { currentEnvironment } from "../config/environment";
import type { Character } from "../diary/types";
import { expoPhotoPort } from "../signals/expo-port";
import { appendVerificationEvent, expoVerificationLogPort } from "./verification-log";

/** `TaskManager.defineTask()`에 등록하는 이름. 진단 패널도 같은 값을 쓴다. */
export const BACKGROUND_DIARY_TASK_NAME = "alpharium-background-diary-verification";

/**
 * 콜백 진입 시점의 `AppState.currentState`를 안전하게 읽는다(research.md §6a).
 *
 * 읽기 자체가 실패할 이론적 가능성에도 예외를 던지지 않는다 — 이 값은
 * 근사치 관측이지, 실행 성패를 좌우해서는 안 된다(H3와 같은 이유).
 */
function readAppState(): "active" | "background" | "inactive" | "unknown" {
  try {
    const state = AppState.currentState;
    if (state === "active" || state === "background" || state === "inactive") return state;
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * 사진·위치 권한이 지금도 유효한지 확인해 로그에 남긴다(FR-010).
 *
 * `expo-media-library`의 `PhotoPort`(004가 이미 확립한, 예외를 던지지
 * 않는 계약)를 그대로 재사용한다 — 새 권한 조회 로직을 만들지 않는다.
 */
async function recordPermissionState(port: ReturnType<typeof expoVerificationLogPort>) {
  const photos = expoPhotoPort();
  const at = new Date().toISOString();

  const photoState = await photos.photoPermission();
  await appendVerificationEvent(
    { kind: "permission-checked", at, axis: "photos", valid: photoState === "granted" },
    port,
  );

  const locationState = await photos.locationPermission();
  await appendVerificationEvent(
    {
      kind: "permission-checked",
      at: new Date().toISOString(),
      axis: "location",
      valid: locationState === "granted",
    },
    port,
  );
}

/**
 * 백그라운드 트리거의 실제 본체.
 *
 * `TaskManager.defineTask()`의 콜백과 진단 패널의 디버그 버튼이 이
 * 함수를 그대로 호출한다(로직 중복 없음, tasks.md T012).
 *
 * **최상위 `try/catch`로 전체를 감싼다(H4)** — 경합이나 예상 못 한
 * 실패가 로그 없이 조용히 사라지지 않게 한다.
 */
export async function runBackgroundDiaryTask(
  options: { forceCharacter?: Character } = {},
): Promise<"Success" | "Failed"> {
  const logPort = expoVerificationLogPort();
  const day = latestClosedDay(new Date());

  await appendVerificationEvent(
    { kind: "task-entered", at: new Date().toISOString(), day, appState: readAppState() },
    logPort,
  );

  try {
    await recordPermissionState(logPort);

    const resolution = currentEnvironment();
    const app = createAppPipeline(resolution);
    if (!app.ok) {
      await appendVerificationEvent(
        {
          kind: "task-completed",
          at: new Date().toISOString(),
          outcome: "pipeline-failed",
          reason: app.reason,
        },
        logPort,
      );
      await appendVerificationEvent(
        { kind: "task-result", at: new Date().toISOString(), result: "Failed" },
        logPort,
      );
      return "Failed";
    }

    // 새 사용자 설정 화면을 만들지 않는다(plan.md Project Type) — 이미
    // 사용자가 화면에서 골라 영속화해 둔 마지막 선택을 읽기만 한다
    // (제품 상태를 쓰지 않고 읽기만 하므로 H1이 금지하는 "제품 계층 수정"에
    // 해당하지 않는다).
    // quickstart.md 2단계(가장 느린 캐릭터로 강제) — 진단 패널의 "지금 즉시
    // 트리거"에서만 쓰인다. 자연 발생 실행(WorkManager)은 옵션 없이 불려
    // 항상 마지막 사용자 선택을 그대로 따른다.
    const character = options.forceCharacter ?? (await loadSelection(expoSelectionPort()));
    const vision = (await loadVisionSetting(expoVisionSettingPort())) ?? "none";

    if (!character) {
      await appendVerificationEvent(
        {
          kind: "task-completed",
          at: new Date().toISOString(),
          outcome: "pipeline-failed",
          reason: "고른 캐릭터 없음",
        },
        logPort,
      );
      await appendVerificationEvent(
        { kind: "task-result", at: new Date().toISOString(), result: "Failed" },
        logPort,
      );
      return "Failed";
    }

    const result = await app.pipeline.run({ day, now: new Date(), character, vision }, (stage) => {
      void appendVerificationEvent(
        { kind: "pipeline-stage", at: new Date().toISOString(), stage },
        logPort,
      );
    });

    if (result.ok) {
      await appendVerificationEvent(
        { kind: "task-completed", at: new Date().toISOString(), outcome: "ok" },
        logPort,
      );
      await appendVerificationEvent(
        { kind: "task-result", at: new Date().toISOString(), result: "Success" },
        logPort,
      );
      return "Success";
    }

    await appendVerificationEvent(
      {
        kind: "task-completed",
        at: new Date().toISOString(),
        outcome: "pipeline-failed",
        reason: `${result.stage}: ${result.reason}`,
      },
      logPort,
    );
    await appendVerificationEvent(
      { kind: "task-result", at: new Date().toISOString(), result: "Failed" },
      logPort,
    );
    return "Failed";
  } catch (error) {
    await appendVerificationEvent(
      {
        kind: "task-completed",
        at: new Date().toISOString(),
        outcome: "threw",
        reason: error instanceof Error ? error.message : String(error),
      },
      logPort,
    );
    await appendVerificationEvent(
      { kind: "task-result", at: new Date().toISOString(), result: "Failed" },
      logPort,
    );
    return "Failed";
  }
}

/**
 * 전역 스코프에서 태스크를 정의한다(research.md §1 — 전역 스코프 요건).
 *
 * `TaskManager.defineTask()`는 모듈 최상단에서 호출해야 백그라운드
 * 런타임이 JS 번들을 다시 읽어 태스크를 찾을 수 있다.
 */
TaskManager.defineTask(BACKGROUND_DIARY_TASK_NAME, async () => {
  const result = await runBackgroundDiaryTask();
  return result === "Success"
    ? BackgroundTask.BackgroundTaskResult.Success
    : BackgroundTask.BackgroundTaskResult.Failed;
});

/**
 * 등록 시 쓰는 최소 반복 간격(분). WorkManager가 허용하는 최솟값이다
 * (`node_modules/expo-background-task`의 `BackgroundTaskOptions.
 * minimumInterval` 타입 정의로 확인, 단위는 분).
 *
 * **이 값을 낮춰도 "24시간 이상 방치"라는 관측 조건 자체는 바뀌지
 * 않는다**(spec.md FR-008, research.md §7) — 간격을 좁히는 것은 그
 * 24시간 동안 시도 횟수를 늘려 표본을 확보하려는 것이지, 방치 시간을
 * 줄여도 된다는 뜻이 아니다. Doze·앱 대기 버킷 같은 배터리 최적화
 * 조건은 기기를 실제로 오래 안 건드려야 걸리므로, 간격만 좁히고
 * 확인하려고 도중에 화면을 켜면 그 순간 관측 조건이 깨진다.
 */
const MINIMUM_INTERVAL_MINUTES = 15;

/**
 * 진단 패널이 등록할 때 부른다.
 *
 * `minimumInterval`을 WorkManager 최솟값(15분)으로 고정한다 —
 * 기본값(12시간)으로는 24시간 관측 안에 실행 시도가 1~2회뿐이라
 * 표본이 너무 적다. 간격을 좁히는 것과 방치 시간을 지키는 것은
 * 별개의 축이다(위 상수 설명 참고).
 */
export function registerBackgroundDiaryTask(): Promise<void> {
  return BackgroundTask.registerTaskAsync(BACKGROUND_DIARY_TASK_NAME, {
    minimumInterval: MINIMUM_INTERVAL_MINUTES,
  });
}

/** 진단 패널이 등록 취소할 때 부른다. */
export function unregisterBackgroundDiaryTask(): Promise<void> {
  return BackgroundTask.unregisterTaskAsync(BACKGROUND_DIARY_TASK_NAME);
}
