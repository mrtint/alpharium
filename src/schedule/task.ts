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
 *    돌려야 하는가 + 어느 하루를"을 먼저 판정한다(B2-3). 057부터는 그 위에
 *    재료·사진 권한 판정(`resolveAutoWrite`)이 얹힌다.
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

import { dayOf, type DayDate } from "../config/day-boundary";
import { liveWrites as appLiveWrites, type LiveWrites } from "../diary/live-write";
import { currentEnvironment } from "../config/environment";
import type { EnvironmentResolution } from "../config/types";
import { effectiveSimulation, simulationBlocksWriting } from "../app/simulation";
import {
  expoSimulationStorePort,
  loadSimulation,
  type SimulationStorePort,
} from "../app/simulation-store";
import {
  attemptOutcomeOf,
  expoAutoWriteAttemptPort,
  recordAttemptEnd,
  recordAttemptExpired,
  recordAttemptStart,
  type AttemptOutcome,
  type AttemptPath,
  type AutoWriteAttemptPort,
  type LaunchState,
  type WakeKind,
} from "../app/auto-write-attempts";
import { readWakeKind, subscribeBackgroundExpiry } from "../app/bg-expiry-port";
import { readLaunchState } from "../app/launch-state-port";
import { resetFastCycleIfDue } from "../app/fast-cycle-reset";
import { createAppPipeline } from "../app/wiring";
import { showsOnScreen } from "../diagnostics/sink";
import {
  expoWriteFailurePort,
  recordWriteFailure,
  type WriteFailurePort,
} from "../app/write-failures";
import { characterToWrite, loadSelection, expoSelectionPort } from "../app/selection-store";
import { displayNameOf } from "../diary/character-name";
import type { Character, CustomNames } from "../diary/types";
import { expoCharacterNamesPort, loadCustomNames } from "../welcome/names-port";
import { resolveAutoWrite } from "./auto-write";
import {
  expoCatchUpStorePort,
  loadCatchUpDay,
  saveCatchUpDay,
  type CatchUpStorePort,
} from "./catch-up-store";
import { manualSettings } from "./manual";
import { decideNotify } from "./notify";
import {
  expoNotifiedStorePort,
  loadNotifiedState,
  pruneNotified,
  saveNotifiedState,
  type NotifiedStorePort,
} from "./notified-store";
import { expoNotificationPort, type NotificationPort } from "./notification-port";
import { autoWriteDoneText } from "./notification-text";
import { expoReminderDeps } from "./reminder-deps";
import { reconcileReminders } from "./reminders";
import {
  expoAutoDiarySettingsPort,
  loadAutoDiarySettings,
  type AutoDiarySettingsPort,
} from "./settings";
import { expoSkipStorePort, type SkipStorePort } from "./skip-store";
import type { FastCyclePort } from "./fast-cycle-store";
import { productionTiming } from "./timing";
import { allowsFastCycle, loadScheduleTiming } from "./timing-source";

/** `TaskManager.defineTask()`에 등록하는 이름. `background-port.ts`도 이 값을 쓴다. */
export const AUTO_DIARY_TASK_NAME = "pocketlog-auto-diary";

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
  /** 로스터. 주지 않으면 지금의 `CHARACTERS` — 고른 것이 없을 때 하나뿐이면 그 캐릭터로 쓴다(`characterToWrite`) */
  roster?: readonly Character[];
  /** 057 — 사용자가 지은 이름(035). 주지 않으면 `preferences/`의 이름 파일에서 읽는다 */
  loadNames?: () => Promise<CustomNames>;
  /** 파이프라인 조립. 주지 않으면 `createAppPipeline(resolution)` */
  makePipeline?: typeof createAppPipeline;
  /** 057 — 사진 권한 건너뜀 기록 통로. 주지 않으면 `preferences/auto-write-skipped.json` */
  skipPort?: SkipStorePort;
  /**
   * 060 — 진단의 「자동 쓰기 지금 실행」. **설정 입력 둘만 덮는다**(켜짐 → 참, 목표 시각 → 지금 시) — 시도 창과 「자동으로 쓰기」 토글을
   * 무시하고 언제 눌러도 동작한다. 판정(`decideSchedule`·`resolveAutoWrite`·`selectableDays`)은 한 줄도 건드리지 않는다 — 이미 쓴 날·
   * 재료 없음·사진 권한 없음·정오 규칙(049)은 그대로 따른다. 백그라운드 경로 옆에 우회로를 만들지 않으려고 입력만 바꾼다.
   */
  manual?: boolean;
  /** 060 — 쓰기 실패 기록 통로. 주지 않으면 `preferences/write-failures.json` */
  failurePort?: WriteFailurePort;
  /** 064 — 상태 흉내 기록 통로. 주지 않으면 `preferences/simulation.json` */
  simulationPort?: SimulationStorePort;
  /** 078 — 자동 쓰기 시도 기록 통로. 주지 않으면 `preferences/auto-write-attempts.json` */
  attemptPort?: AutoWriteAttemptPort;
  /** 078 — 창 밖 따라잡기 기록 통로. 주지 않으면 `preferences/auto-write-catch-up.json` */
  catchUpPort?: CatchUpStorePort;
  /** 106 — 빠른 주기 기록 통로(개발 환경에서만 읽는다). 주지 않으면 `preferences/dev-fast-cycle.json` */
  fastCyclePort?: FastCyclePort;
  /** 106 — 주기 리셋이 차지하는 쓰기 등록부(080). 주지 않으면 앱의 그 하나 */
  liveWrites?: Pick<LiveWrites, "beginWipe">;
  /**
   * 085 — 쓸 차례 알림 맞추기. 주지 않으면 기기 통로(`reconcileReminders(expoReminderDeps())`). 태스크가 **끝날 때마다** 한 번
   * 부른다 — 저장에 성공했으면 완성 알림 **전에**(그 날의 「쓸 차례」를 거둔 뒤 「다 썼어요」가 선다, FR-011), 그 밖이면 끝에서
   * (건너뛰기만 하는 실행도 7번 창을 이어 걸고 오래된 알림을 거둔다, FR-009·research R7). 실패는 결과를 바꾸지 않는다.
   */
  reconcileReminders?: () => Promise<void>;
  /**
   * 090 — 시작 순간 앱이 앞에 있었는가(기록 값 — 판정에 쓰지 않는다). 주지 않으면 `launch-state-port`. lldb 강제 깨우기·수동은 앞,
   * OS가 깨운 실행은 뒤로 남아 시도 기록으로 둘을 가른다.
   */
  launchState?: () => LaunchState | undefined;
  /**
   * 090 — iOS 백그라운드 실행의 시간 예산 만료를 듣는다. 주지 않으면 `bg-expiry-port`(모듈이 없으면 아무것도 안 한다). 백그라운드 경로의
   * 한 실행 동안만 구독하고, 만료가 오면 따로 선 `expired` 줄을 한 번 남긴다(EX1·EX2).
   */
  subscribeExpiry?: (listener: (at: Date) => void) => () => void;
  /**
   * 091 — 이 백그라운드 실행을 깨운 iOS 요청(`power` 충전 · `battery` 배터리). 주지 않으면 `bg-expiry-port`. 백그라운드 경로만 읽는다 —
   * 시작 줄에 남기고, 배터리면 조립이 느린 쓰기를 고른다.
   */
  wakeKind?: () => WakeKind | undefined;
};

/** 078 — 본체가 돌려주는 것: 태스크 결과와 시도 기록의 갈래 */
type BodyOutcome = { result: AutoDiaryTaskResult; outcome: AttemptOutcome; day?: DayDate };
const skipped = (outcome: AttemptOutcome): BodyOutcome => ({ result: "skipped", outcome });
const FAILED: BodyOutcome = { result: "failed", outcome: "failed" };

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
  // 다른 하루를 보는 것을 막는다. 078 — 시도 기록의 시작·끝도 이 값으로 짝을 맞춘다.
  const now = deps.now ?? new Date();
  const attemptPort = deps.attemptPort ?? expoAutoWriteAttemptPort();
  const path: AttemptPath = deps.manual === true ? "manual" : "background";

  // ★ 078 — 시작을 먼저 쓴다. 끝이 영영 안 오면(iOS 시간 예산 만료·메모리, 안드로이드 kill) `started`가 남고 그것이
  // 「깼지만 완주하지 못했다」의 유일한 증거다. 기록 실패는 안에서 삼킨다 — 기록이 자동 쓰기를 막지 않는다.
  // 090 — 깨운 순간의 앱 상태를 시작 줄에 싣는다. 통로가 던지면 모름이다.
  const launch = safely(deps.launchState ?? readLaunchState);
  // 091 — 깬 요청은 백그라운드 실행에만 있다(수동 실행은 요청이 깨운 것이 아니다)
  const wake = path === "background" ? safely(deps.wakeKind ?? readWakeKind) : undefined;
  await recordAttemptStart(attemptPort, path, now, launch, wake);
  const stopListening = path === "background" ? listenForExpiry(deps, attemptPort) : () => {};
  let ended: BodyOutcome;
  try {
    ended = await runBody(deps, now, wake);
  } finally {
    stopListening();
  }
  const { result, outcome, day } = ended;
  await recordAttemptEnd(attemptPort, path, now, outcome, day);
  // 085 — 성공이면 본체가 완성 알림 전에 이미 맞췄다(한 번만).
  if (result !== "ran") await reconcileAfterTask(deps);
  return result;
}

function safely<T>(read: () => T | undefined): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/**
 * 090 — 이 실행 동안 시간 예산 만료를 듣는다. 만료는 그 시각의 따로 선 줄 하나다(여러 번 와도 한 번) — 시작 줄은 그대로 두어,
 * 멈췄다 이어서 끝나면 끝남 갈래로 바뀐다. 구독이 던지면 듣지 않는다(기록이 자동 쓰기를 막지 않는다).
 */
function listenForExpiry(deps: AutoDiaryTaskDeps, attemptPort: AutoWriteAttemptPort): () => void {
  let heard = false;
  try {
    return (deps.subscribeExpiry ?? subscribeBackgroundExpiry)((at) => {
      if (heard) return;
      heard = true;
      // 시각은 네이티브가 만료 순간에 잰 값이다 — 이 콜백은 앱이 다시 깨어날 때에야 돌 수 있다(늦게, 또는 프로세스가 죽으면 영영 안 돈다)
      void recordAttemptExpired(attemptPort, at);
    });
  } catch {
    return () => {};
  }
}

/** 085 — 쓸 차례 알림 맞추기. 던지지 않는다(TK2) */
async function reconcileAfterTask(deps: AutoDiaryTaskDeps): Promise<void> {
  const reconcile = deps.reconcileReminders ?? (() => reconcileReminders(expoReminderDeps()));
  await reconcile().catch(() => {});
}

/** 본체. 결과와 기록 갈래를 함께 돌려준다 — 기록은 `runAutoDiaryTask`가 한다. */
async function runBody(
  deps: AutoDiaryTaskDeps,
  now: Date,
  wake: WakeKind | undefined,
): Promise<BodyOutcome> {
  // 105 — 쓰기로 정해진 날. 그 뒤의 끝(썼음·실패·그만둠·진행 중·캐릭터 없음)은 시도 기록에 이 날을 싣는다.
  let chosen: DayDate | undefined;
  const withDay = (outcome: BodyOutcome): BodyOutcome =>
    chosen === undefined ? outcome : { ...outcome, day: chosen };
  try {
    const settingsPort = deps.settingsPort ?? expoAutoDiarySettingsPort();
    const loaded = await loadAutoDiarySettings(settingsPort);
    const settings = deps.manual === true ? manualSettings(loaded, now) : loaded;

    const resolution = deps.resolution ?? currentEnvironment();

    // ★ 064 — 상태 흉내가 하나라도 켜져 있으면 쓰지 않는다(S8, BG1). 헤드리스에는 화면이 없으므로 기록을 직접 읽는다. 파이프라인을 만들기 전에
    // 끝내므로 모델도 알림도 실패 기록도 없다(`"skipped"`는 060이 기록하지 않는 갈래). 흉내는 개발 환경에서만 효력이 있고(BG2), 못 읽으면
    // 꺼짐이다(BG3). **여기 닿는 것은 「막는가」 하나뿐이다** — 흉내 날짜·미리보기는 이 판정에 들어오지 않는다(헌법 검사 LK3).
    const simulation = effectiveSimulation(
      await loadSimulation(deps.simulationPort ?? expoSimulationStorePort()),
      showsOnScreen(resolution),
    );
    if (simulationBlocksWriting(simulation)) {
      return skipped("simulation");
    }
    const makePipeline = deps.makePipeline ?? createAppPipeline;
    // 020 L5 — 백그라운드 owner로 조립한다. wiring.ts가 그 주체를 묶어 pipeline.run()이
    // 살아 있는 쓰기 등록부의 칸을 차지한다(080). 다른 쓰기가 살아 있어 못 차지한
    // already-running 결과는 아래에서 "skipped"로 매핑한다.
    // 091 — 깬 요청을 함께 넘긴다: 배터리 요청이면 조립이 느린 쓰기(CPU 감시 밑)를 고른다
    const app = makePipeline(resolution, {
      lockOwner: "background",
      ...(wake === undefined ? {} : { wake }),
    });
    if (!app.ok) {
      return FAILED;
    }

    // ★ 106 — 빠른 주기(개발 빌드 전용). 수동 실행(진단 「지금 실행」)은 설정 입력만 덮는 평소 동작이라 빠른 주기를 읽지도 리셋하지도
    // 않는다(FR-009d). 자동 쓰기가 꺼져 있으면 리셋하지 않는다 — 다시 쓰지 않을 일기를 지우지 않는다. 리셋은 일기 목록을 읽기 **전**이다.
    // 배포 환경이면 `devEnvironment`가 거짓이라 기록 통로를 부르지도 않고 `timing`은 배포 규칙이다.
    const devEnvironment = allowsFastCycle(resolution);
    const fastCyclePort = deps.fastCyclePort;
    let timing = productionTiming(settings);
    if (deps.manual !== true) {
      if (settings.enabled) {
        await resetFastCycleIfDue({
          devEnvironment,
          fastCyclePort,
          now,
          store: app.store,
          notifiedPort: deps.notifiedPort ?? expoNotifiedStorePort(),
          skipPort: deps.skipPort ?? expoSkipStorePort(),
          catchUpPort: deps.catchUpPort ?? expoCatchUpStorePort(),
          dismiss: (id) => (deps.notificationPort ?? expoNotificationPort()).dismiss(id),
          liveWrites: deps.liveWrites ?? appLiveWrites,
        });
      }
      timing = (await loadScheduleTiming({ settings, devEnvironment, port: fastCyclePort })).timing;
    }

    // 저장된 일기 날짜. 주입이 없으면 pipeline이 쓰는 store에서 읽는다
    // (wiring.ts가 store를 함께 내보낸다 — store를 만드는 자리는 여기 하나).
    const existingDiaryDays = deps.listDiaryDays
      ? await deps.listDiaryDays()
      : await app.store.listDays();

    // B2-3 — 지금 돌려야 하는가. 057 — 020 판정을 통과한 날도 재료가 없거나 사진 권한이 없으면 쓰지 않는다
    // (FR-007~FR-009). 앱을 열 때의 자동 쓰기와 **같은 판정**이다(`resolveAutoWrite`, R1·R2). 건너뛰면 파이프라인을
    // 부르지 않으므로 사진 모델도 쓰는 모델도 열리지 않고 알림도 없다. 사진 권한 건너뜀은 그 안에서 기록된다.
    // ★ 078 — 창 밖의 따라잡기는 하루에 한 번만 판정한다. 시도 창은 재시도의 유일한 상한이었는데(하루 3시간), 지난 날을 창
    // 밖에서도 쓰게 하면서 그 상한이 사라졌다 — 계속 실패하는 지난 날을 15분마다 온종일 다시 돌리지 않게 한다(헤드리스 한 번이
    // 18분 걸리는 기기도 있다). 오늘 몫을 이미 썼으면 신호도 읽지 않는다. 창 안은 종전대로이고, 수동 실행은 목표 시각이 지금이라
    // 늘 창 안이다. 못 읽으면 「쓴 적 없음」이다(막지 않는 쪽).
    const catchingUp = settings.enabled && !timing.inWindow(now);
    const catchUpPort = deps.catchUpPort ?? expoCatchUpStorePort();
    const today = dayOf(now);
    if (catchingUp && (await loadCatchUpDay(catchUpPort)) === today) {
      return skipped("catch-up-spent");
    }

    const decision = await resolveAutoWrite({
      settings,
      now,
      listDiaryDays: async () => existingDiaryDays,
      previewDay: app.previewDay,
      skipPort: deps.skipPort ?? expoSkipStorePort(),
      timing,
    });
    if (decision.kind !== "write") {
      return skipped(attemptOutcomeOf(decision));
    }
    chosen = decision.day;

    // 007이 저장한 캐릭터를 읽기만 한다(제품 상태를 쓰지 않는다).
    const saved = deps.loadCharacter
      ? await deps.loadCharacter()
      : await loadSelection(expoSelectionPort());
    const character = characterToWrite(saved, deps.roster);
    if (!character) {
      // 고른 것이 없고 로스터가 둘 이상이면 하나를 지어내 자동 생성하지 않는다(`characterToWrite`).
      return withDay(skipped("no-character"));
    }

    // ★ 042 — **백그라운드도 사진을 본다.**
    //
    // 029가 여기서 "auto"·설정 없음을 전부 "none"으로 떨궜다. 그래서 **기본 설정으로
    // 자동 생성을 쓰는 사용자의 일기는 사진이 아무리 많아도 한 장도 보지 않았다.**
    // 근거는 "백그라운드는 그 날 신호를 미리 읽지 않는다"였는데, 그것은 **미리 읽을
    // 필요가 없다**는 011의 사실로 이미 해소돼 있었다 — 파이프라인이 신호를 읽어
    // 0장이면 캡션 단계를 스스로 건너뛴다.
    //
    // 헌법 v1.7.0: 「사진 접근이 허용되어 있으면 그 하루의 사진은 반드시 본다(MUST).」
    // 화면 경로와 **같은 판정**이어야 하므로 분기 자체가 없다.

    // ★ 090 — 오늘 몫은 **파이프라인을 부르기 직전에만** 쓴다. 078은 건너뛴 판정(재료 없음·사진 권한 없음)에도 썼고, 087 실기기에서
    // 낮의 첫 깨움이 몫을 쓰자 밤 충전 중 15분마다 온 깨움 스물이 전부 「이미 한 번 시도함」으로 끝났다(2026-10-18). 몫이 막던 비용은
    // 모델을 여는 이 실행이고, 건너뜀은 미리보기 읽기뿐이다 — 캐릭터 없음도 몫을 쓰지 않는다.
    if (catchingUp) {
      await saveCatchUpDay(catchUpPort, today).catch(() => {});
    }

    // B2-7 — 등록부의 칸은 pipeline.run() 안에서 차지한다(wiring.ts가 "background"
    // owner로 배선). 못 차지한 already-running 결과는 "skipped"로
    // 매핑한다(다음 콜백 재시도, FR-013 경로와 합류).
    const result = await app.pipeline.run({
      day: decision.day,
      now,
      character,
      vision: "quick",
    });

    if (result.ok) {
      // 085 FR-011 — 저장 → 맞추기(그 날의 쓸 차례 알림을 거둠) → 완성 알림.
      await reconcileAfterTask(deps);
      await sendCompletionNotification(decision.day, character, deps);
      return withDay({ result: "ran", outcome: "ran" });
    }

    // ★ 080 T2 — **사용자가 그만둔 쓰기는 실패가 아니다.** 앱을 연 홈이 이 쓰기에 합류해 「그만두기」를 눌렀거나 「일기 모두
    // 지우기」가 멈췄다(등록부의 칸에 그만둠이 선 채 끝났다). 쓰기 실패 기록도 완성 알림도 남기지 않고, 시도 기록에는 그
    // 사실을 적는다 — 갈래가 없으면 그 줄이 「시작한 뒤 끝나지 않음」으로 남아 「프로세스가 죽었다」로 읽힌다. 문구가 아니라
    // 값으로 가른다.
    if (result.cancelled === true) {
      return withDay(skipped("cancelled"));
    }

    // 060 — 쓰기 실패를 기록한다(진단 「최근 실패」). `already-running`은 기록하지 않는다(다른 쪽이 쓰는 중이다) —
    // 그 판정은 `recordWriteFailure` 안에 있고, 기록 실패는 삼킨다. 아래 매핑보다 **앞에서** 부른다.
    await recordWriteFailure(deps.failurePort ?? expoWriteFailurePort(), result, now);

    // B2-9 — 그 밖의 사유로 실패했으면 알림을 보내지 않는다(FR-005, SC-006).
    if (result.stage === "already-running") {
      return withDay(skipped("already-running"));
    }
    return withDay(FAILED);
  } catch {
    // 060 — 예상 못 한 예외도 쓰기 실패다(`unwritten`). 던지지 않는다.
    await recordWriteFailure(
      deps.failurePort ?? expoWriteFailurePort(),
      { ok: false, stage: "unexpected", reason: "" },
      now,
    );
    return withDay(FAILED);
  }
}

/**
 * 성공한 생성의 완료 알림을 쏜다 (B2-8, notification.md N4).
 *
 * `decideNotify`가 "보낼지/어떻게"를 정하고, 어댑터가 고정 문구를 쓴다.
 * 알림 자체가 실패해도 예외를 밖으로 던지지 않는다 — 생성은 이미 저장됐고
 * 알림 실패가 그걸 되돌리지 않는다(notification.md N8).
 *
 * 092 — iPhone 이어 쓰기가 앱 밖에서 저장했을 때 `App.tsx`도 이것을 부른다(FR-008 — 같은 문구·채널·확인 기록).
 */
export async function sendCompletionNotification(
  day: DayDate,
  character: Character,
  deps: AutoDiaryTaskDeps = {},
): Promise<void> {
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
    // 085 R17 — 앱을 열기 전 헤드리스 실행이면 채널이 없을 수 있다(없으면 기본 채널로 간다). 실패는 삼킨다.
    await notificationPort.ensureChannel().catch(() => {});
    // 057 — 「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」. 이름을 읽지 못하면 기본 이름이다(035 N3 — 빈 이름은 없다).
    const names = await (
      deps.loadNames ?? (() => loadCustomNames(expoCharacterNamesPort()))
    )().catch((): CustomNames => ({}));
    const notificationId = await notificationPort.present(
      day,
      autoWriteDoneText(displayNameOf(character, names), day),
    );

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
 * 태스크 콜백 본체. `defineTask`가 이것을 감싼다.
 *
 * `runAutoDiaryTask()`의 반환을 `BackgroundTaskResult`로 옮긴다(B6 —
 * "skipped"·"ran" 둘 다 Success, Failed는 실제로 뭔가 깨졌을 때만).
 * `BackgroundTask` 모듈을 인자로 받아 테스트가 대역을 넣을 수 있게 한다.
 */
async function autoDiaryTaskCallback(BackgroundTask: {
  BackgroundTaskResult: { Failed: unknown; Success: unknown };
}): Promise<unknown> {
  const result = await runAutoDiaryTask();
  return result === "failed"
    ? BackgroundTask.BackgroundTaskResult.Failed
    : BackgroundTask.BackgroundTaskResult.Success;
}

/**
 * ★ 024 — `defineTask`를 **모듈 최상단 부수 효과**로 등록한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 최상단이어야 하는가**: WorkManager가 화면 꺼진 채 태스크를 깨우면 RN
 * 헤드리스 런타임이 번들을 로드하지만 `App.tsx`의 컴포넌트 트리는 렌더되지
 * 않는다 — `useEffect`가 안 돈다. 020은 `defineTask` 호출을 `App.tsx`의
 * `useEffect`(`ensureAutoDiaryTaskDefined`)에 뒀고, 그래서 헤드리스 배경
 * 실행에서 "No task registered for key expo-task-manager" → `expo-task-manager`가
 * 태스크를 **자동 해제**했다(2026-08-30 실기기 SM-S901N 확인, spec 024).
 * 019 스파이크는 `TaskManager.defineTask()`를 모듈 최상단에서 불렀고
 * (`src/spike/background-diary-task.ts:209`), 그래서 모듈을 import하는 어떤 JS
 * 컨텍스트(헤드리스 포함)에서도 등록됐다.
 *
 * **왜 `require`를 try/catch로 감싸는가**: `logic` jest 프로젝트의
 * `transformIgnorePatterns`가 `expo-task-manager`를 변환 대상에서 빼므로
 * (`node_modules/(?!(expo|expo-modules-core|@expo)/)` — 이름이 `expo-task-manager`),
 * 최상단 정적 `import`나 변환 안 된 `require`는 `SyntaxError`를 던진다.
 * 프로덕션 RN(Metro가 전부 변환)에서는 `require`가 실제 모듈을 주고
 * `defineTask`가 부수 효과로 등록된다. 테스트에서는 `require`가 던지고 →
 * catch → 등록 생략(테스트는 `runAutoDiaryTask`를 주입 의존으로 직접 부른다).
 * ─────────────────────────────────────────────────────────────────────────────
 */
function registerAutoDiaryTask(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require("expo-task-manager");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundTask = require("expo-background-task");
    if (typeof TaskManager?.defineTask !== "function") return false;
    if (TaskManager.isTaskDefined?.(AUTO_DIARY_TASK_NAME)) return true;
    TaskManager.defineTask(AUTO_DIARY_TASK_NAME, () => autoDiaryTaskCallback(BackgroundTask));
    return true;
  } catch {
    // 테스트(node 환경) 또는 네이티브 모듈 부재 — 등록을 건너뛴다.
    return false;
  }
}

// 모듈 부수 효과: 이 파일을 import하는 어떤 JS 컨텍스트에서도(헤드리스 배경
// 실행 포함) 태스크가 등록된다. `App.tsx`가 이 모듈을 import하므로 포그라운드
// 시작에서도 자동으로 걸린다.
const AUTO_DIARY_TASK_REGISTERED = registerAutoDiaryTask();

/**
 * `App.tsx`가 마운트 시 1회 부른다 — 최상단 등록이 이미 됐으면 no-op,
 * 안 됐으면(첫 import보다 네이티브 모듈이 늦게 준비된 드문 경우) 다시 시도한다.
 *
 * **더 이상 유일한 등록 경로가 아니다**(024) — 최상단 부수 효과가 주 경로이고,
 * 이것은 포그라운드에서의 재확인일 뿐이다.
 */
export function ensureAutoDiaryTaskDefined(): void {
  if (AUTO_DIARY_TASK_REGISTERED) return;
  registerAutoDiaryTask();
}
