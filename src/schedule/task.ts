/**
 * 백그라운드 자동 일기 생성 태스크 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/background-generation.md
 *       B1·B2·B3·B6·B7
 *       specs/020-scheduled-diary-notification/contracts/notification.md N4·N7
 *       spec.md FR-003·FR-004·FR-005·FR-011·FR-013
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **019의 `src/spike/background-diary-task.ts`를 제품 코드로 옮긴 것이다.**
 * 베끼지 않고 이 계약을 따른다.
 *
 * **019와 다른 점**:
 *  - 무조건 `pipeline.run()`을 부르지 않는다 — `decideSchedule`이 "지금
 *    돌려야 하는가 + 어느 하루를"을 먼저 판정한다(B2-3).
 *  - 성공하면 로컬 알림을 쏜다(B2-8, notification.md N4).
 *  - 검증 전용 로그(`verification-log`)를 남기지 않는다 — 019 하네스와 함께
 *    제거됐다(원칙 IV).
 *
 * **`wiring.ts` 재사용**: `createAppPipeline()` → `pipeline.run()`만 부른다.
 * `acceptance.ts`·`backend.generate()`·`prompt.ts`를 직접 부르지 않는다
 * (B3, `checkScheduleFile` 헌법 검사가 이를 확인).
 *
 * **의존을 주입받는다**: 기기 통로 전부에 기본값을 두되, 테스트가 갈아끼울
 * 수 있게 옵셔널 인자로 받는다. 007~019가 순수 함수를 밖에서 테스트한 것과
 * 같은 구조를 이 조합 함수에도 적용한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { selectableDays, type DayDate } from "../config/day-boundary";
import { currentEnvironment } from "../config/environment";
import type { EnvironmentResolution } from "../config/types";
import { createAppPipeline } from "../app/wiring";
import { loadSelection, expoSelectionPort } from "../app/selection-store";
import { loadVisionSetting, expoVisionSettingPort } from "../app/vision-setting-store";
import type { Character, VisionSetting } from "../diary/types";
import { decideSchedule } from "./decision";
import { decideNotify } from "./notify";
import {
  expoNotifiedStorePort,
  loadNotifiedState,
  pruneNotified,
  saveNotifiedState,
  type NotifiedStorePort,
} from "./notified-store";
import { expoNotificationPort, type NotificationPort } from "./notification-port";
import {
  expoAutoDiarySettingsPort,
  loadAutoDiarySettings,
  type AutoDiarySettingsPort,
} from "./settings";

/** `TaskManager.defineTask()`에 등록하는 이름. `background-port.ts`도 이 값을 쓴다. */
export const AUTO_DIARY_TASK_NAME = "alpharium-auto-diary";

/** 태스크 결과. `"skipped"`도 `Success`로 매핑된다(B6). */
export type AutoDiaryTaskResult = "ran" | "skipped" | "failed";

/** 조합 함수가 주입받는 것. 주지 않으면 기기 통로를 쓴다. */
export type AutoDiaryTaskDeps = {
  now?: Date;
  resolution?: EnvironmentResolution;
  settingsPort?: AutoDiarySettingsPort;
  notifiedPort?: NotifiedStorePort;
  notificationPort?: NotificationPort;
  /** 저장된 일기 날짜들. 주지 않으면 `createAppPipeline`의 store에서 읽는다 */
  listDiaryDays?: () => Promise<readonly DayDate[]>;
  loadCharacter?: () => Promise<Character | null>;
  loadVision?: () => Promise<VisionSetting | null>;
  /** 파이프라인 조립. 주지 않으면 `createAppPipeline(resolution)` */
  makePipeline?: typeof createAppPipeline;
};

/**
 * 백그라운드 트리거의 실제 본체.
 *
 * `TaskManager.defineTask()`의 콜백과 개발자 탭의 "지금 자동 생성 트리거"
 * 버튼이 이 함수를 그대로 호출한다(로직 중복 없음).
 *
 * **최상위 `try/catch`로 전체를 감싼다** — 예상 못 한 예외가 로그 없이
 * 조용히 사라지지 않게 한다(019 H4).
 */
export async function runAutoDiaryTask(deps: AutoDiaryTaskDeps = {}): Promise<AutoDiaryTaskResult> {
  // B7 — now를 한 번만 만든다. 콜백이 도는 도중 시각이 넘어가 판정과 생성이
  // 다른 하루를 보는 것을 막는다.
  const now = deps.now ?? new Date();

  try {
    const settingsPort = deps.settingsPort ?? expoAutoDiarySettingsPort();
    const settings = await loadAutoDiarySettings(settingsPort);

    const resolution = deps.resolution ?? currentEnvironment();
    const makePipeline = deps.makePipeline ?? createAppPipeline;
    // 020 L5 — 백그라운드 owner로 조립한다. wiring.ts가 owner-bound
    // acquireLock을 만들어 pipeline.run()이 프로세스 경계 잠금을 취득한다.
    // 취득 실패로 인한 already-running 결과는 아래에서 "skipped"로 매핑한다.
    const app = makePipeline(resolution, { lockOwner: "background" });
    if (!app.ok) {
      return "failed";
    }

    // 저장된 일기 날짜. 주입이 없으면 pipeline이 쓰는 store에서 읽는다
    // (wiring.ts가 store를 함께 내보낸다 — store를 만드는 자리는 여기 하나).
    const existingDiaryDays = deps.listDiaryDays
      ? await deps.listDiaryDays()
      : await app.store.listDays();

    // B2-3 — 지금 돌려야 하는가.
    const decision = decideSchedule({
      settings,
      now,
      selectableDays: selectableDays(now),
      existingDiaryDays,
    });
    if (!decision.act) {
      return "skipped";
    }

    // 007이 저장한 캐릭터를 읽기만 한다(제품 상태를 쓰지 않는다).
    const character = deps.loadCharacter
      ? await deps.loadCharacter()
      : await loadSelection(expoSelectionPort());
    if (!character) {
      // 고른 캐릭터 없이 자동 생성하지 않는다.
      return "skipped";
    }

    const vision =
      (deps.loadVision
        ? await deps.loadVision()
        : await loadVisionSetting(expoVisionSettingPort())) ?? "none";

    // B2-7 — 잠금은 pipeline.run() 안에서 취득한다(wiring.ts가 "background"
    // owner로 배선). 취득 실패로 인한 already-running 결과는 "skipped"로
    // 매핑한다(다음 콜백 재시도, FR-013 경로와 합류).
    const result = await app.pipeline.run({ day: decision.day, now, character, vision });

    if (result.ok) {
      await sendCompletionNotification(decision.day, deps);
      return "ran";
    }

    // B2-9 — 잠금 외 사유로 실패했으면 알림을 보내지 않는다(FR-005, SC-006).
    if (result.stage === "already-running") {
      return "skipped";
    }
    return "failed";
  } catch {
    return "failed";
  }
}

/**
 * 성공한 생성의 완료 알림을 쏜다 (B2-8, notification.md N4).
 *
 * `decideNotify`가 "보낼지/어떻게"를 정하고, 어댑터가 고정 문구를 쓴다.
 * 알림 자체가 실패해도 예외를 밖으로 던지지 않는다 — 생성은 이미 저장됐고
 * 알림 실패가 그걸 되돌리지 않는다(notification.md N8).
 */
async function sendCompletionNotification(day: DayDate, deps: AutoDiaryTaskDeps): Promise<void> {
  try {
    const notifiedPort = deps.notifiedPort ?? expoNotifiedStorePort();
    const notificationPort = deps.notificationPort ?? expoNotificationPort();

    const state = await loadNotifiedState(notifiedPort);
    const decision = decideNotify({
      day,
      generationSucceeded: true,
      notified: state[day] ?? null,
    });
    if (!decision.send) return;

    if (decision.mode === "replace") {
      await notificationPort.dismiss(decision.dismissId);
    }
    const notificationId = await notificationPort.present(day);

    const next = pruneNotified(
      {
        ...state,
        [day]: { sentAt: new Date().toISOString(), acknowledged: false, notificationId },
      },
      oldestToKeep(day),
    );
    await saveNotifiedState(notifiedPort, next);
  } catch {
    // 알림 실패가 생성을 되돌리지 않는다(N8).
  }
}

/**
 * `notified.json`이 무한히 커지지 않게, 이 날짜보다 30일 이상 오래된 엔트리는
 * 자른다(auto-diary-settings.md S5 — 날짜 문자열 비교만).
 */
function oldestToKeep(day: DayDate): DayDate {
  const [y, m, d] = day.split("-").map(Number);
  const cutoff = new Date(y, m - 1, d - 30);
  const yy = String(cutoff.getFullYear()).padStart(4, "0");
  const mm = String(cutoff.getMonth() + 1).padStart(2, "0");
  const dd = String(cutoff.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * 전역 스코프에서 태스크를 정의한다(019 research.md §1 — 전역 스코프 요건).
 *
 * `TaskManager.defineTask()`는 모듈 최상단에서 호출해야 백그라운드 런타임이
 * JS 번들을 다시 읽어 태스크를 찾을 수 있다. `App.tsx`가 이 모듈을 부수
 * 효과로 import한다.
 *
 * **테스트 환경에서는 `expo-task-manager`가 없으므로 지연 import로 감싸
 * 최상단 실행을 피한다** — 019 하네스는 정적 import였으나, 이 저장소의
 * `.ts` 테스트는 node 환경이라 네이티브 모듈 해석이 실패한다.
 */
async function defineAutoDiaryTask(): Promise<void> {
  const TaskManager = await import("expo-task-manager");
  const BackgroundTask = await import("expo-background-task");

  if (TaskManager.isTaskDefined(AUTO_DIARY_TASK_NAME)) return;

  TaskManager.defineTask(AUTO_DIARY_TASK_NAME, async () => {
    const result = await runAutoDiaryTask();
    // B6 — "skipped"도 "ran"도 Success. Failed는 실제로 뭔가 깨졌을 때만.
    return result === "failed"
      ? BackgroundTask.BackgroundTaskResult.Failed
      : BackgroundTask.BackgroundTaskResult.Success;
  });
}

/**
 * `App.tsx`가 마운트 시 1회 부른다 — 전역 태스크를 등록한다.
 *
 * 019는 모듈 로드 시점에 `defineTask`를 불렀지만, 그 방식은 이 저장소의
 * 테스트(node 환경)에서 네이티브 모듈 해석 실패를 일으킨다. `App.tsx`에서
 * 명시적으로 부르되, 실패해도 앱이 죽지 않게 감싼다(느릴 뿐).
 */
export function ensureAutoDiaryTaskDefined(): void {
  void defineAutoDiaryTask().catch(() => {});
}
