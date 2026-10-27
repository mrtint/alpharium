/**
 * 쓸 차례 알림 맞추기 (085).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RC1~RC7
 *       spec.md FR-008·FR-010·FR-012, research R7·R16~R18
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 그 순간의 설정·일기 목록·이름으로 계획(`planReminders`)을 만들고, 걸린 예약과의 **차이만** 고친다 — 같은 `id`·`at`·`title`이면
 * 그대로 둔다(15분마다 도는 태스크에서 알람을 매번 다시 걸지 않는다, R16). 트레이에 떠 있는 우리 알림 중 쓴 날·사흘 밖·날을 모르는
 * 것은 거두고, 꺼졌으면 모두 거둔다.
 *
 * **설정이나 일기 목록을 읽지 못하면 아무것도 바꾸지 않는다**(RC6, 원칙 V) — 모르는 것을 「꺼짐」·「안 쓴 날」로 단정하면 일시적
 * 실패 한 번에 예약을 모두 지운다. 어떤 통로가 던져도 밖으로 던지지 않는다(RC3, 020 N8 — 알림 실패가 쓰기를 되돌리지 않는다).
 *
 * **지우는 규칙은 하나다**(104에서도 같다) — 그 날 일기 파일이 생긴 날(`writtenDays`)의 예약만 계획에서 빠져 거둬진다. 쓰기 시작·도중에는
 * 거두지 않는다: 쓰기가 실패하거나 프로세스가 죽거나 얼어도 예약(OS 알람)은 남아 뜬다. 배터리 예외가 있으면 울릴 시각만 뒤로 간다.
 *
 * **프로세스의 첫 맞추기는 계획 전부를 다시 건다**(107) — 앱은 OS 알람이 살아 있는지 읽지 못한다. 안드로이드 강제 중지는 알람을 지우고 expo의
 * 예약 저장은 남겨 위 비교가 「이미 걸림」으로 본다(최대 7일 끊김). 강제 중지·재부팅·앱 업데이트는 모두 새 프로세스를 만들므로, 프로세스 안의
 * 첫 맞추기(`RearmGate`)를 보수적 신호로 쓴다. 같은 `id`의 `schedule`은 바꿔 끼므로 중복이 없고, 그 뒤 같은 프로세스의 맞추기는 차이만 고친다(R16).
 * 설정을 못 읽은 맞추기(RC6)·꺼짐·빈 계획·`schedule` 실패는 첫 맞추기를 소비하지 않는다 — 확인하지 못한 것을 한 것으로 치지 않는다.
 *
 * **한 줄로 선다**(RC4) — 앱의 훅·태스크·등록부의 끝이 거의 함께 부를 수 있다. 모듈 하나의 순서 줄이 앞 맞추기가 끝난 뒤
 * 다음을 시작한다(078 시도 기록의 `inOrder`와 같은 꼴). 이 파일은 `AppState`·`../app/`을 모른다(OP7) — 기본 조립은
 * `reminder-deps.ts`다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, selectableDays, type DayDate } from "../config/day-boundary";
import type { BatteryExceptionStatus } from "./battery-exception-port";
import {
  planReminders,
  REMINDER_DELAY_MINUTES,
  REMINDER_ID_PREFIX,
  reminderDelayFor,
  type ReminderPlanEntry,
} from "./reminder-plan";
import type { ReminderPort, ScheduledReminder } from "./reminder-port";
import type { AutoDiarySettings } from "./settings";
import { productionTiming, type ScheduleTiming } from "./timing";

/** 107 — 「이 프로세스에서 아직 다시 걸지 않았다」를 들고 있는 칸. 기본 조립(`reminder-deps.ts`)이 프로세스당 하나를 둔다 */
export type RearmGate = {
  pending(): boolean;
  done(): void;
};

export function createRearmGate(): RearmGate {
  let pending = true;
  return {
    pending: () => pending,
    done: () => {
      pending = false;
    },
  };
}

export type ReminderDeps = {
  port: ReminderPort;
  now: () => Date;
  /** 알림 채널 보장 — 앱을 열기 전 헤드리스 실행에서도 기본 채널로 가지 않게(R17) */
  prepare: () => Promise<void>;
  /** 읽지 못하면 던진다(파일 없음은 기본값) */
  loadSettings: () => Promise<AutoDiarySettings>;
  /** 읽지 못하면 던진다 */
  listDiaryDays: () => Promise<readonly DayDate[]>;
  /**
   * 쓸 차례 알림에 부를 이름. 기본 조립(`reminder-deps.ts`)은 홈과 같이 고른 캐릭터가 없으면 첫 실행 기본 캐릭터의 이름을 준다
   * (research R8) — `null`은 순수 계획의 방어(RP8)로만 남는다. 던지면 아무것도 바꾸지 않는다(RC6).
   */
  loadName: () => Promise<string | null>;
  /**
   * 배터리 예외 상태 (104). 예외가 확인된 때만 알림을 늦춘다(`reminderDelayFor`). 던지면 `unknown`(정각)으로 보고 맞추기를 이어 간다 —
   * 상태는 정보이지 판단의 근거가 아니라서, 설정·일기 목록을 못 읽을 때(RC6)처럼 멈추지 않는다.
   */
  loadBatteryStatus: () => Promise<BatteryExceptionStatus>;
  /**
   * 106 — 시간 규칙(빠른 주기는 개발 환경에서만, `timing-source`). 없거나 던지면 배포 규칙이다 — 알림 계획이 시간 규칙을 읽지 못한다고 멈추지
   * 않는다(배포 7일치가 안전한 쪽).
   */
  loadTiming?: (settings: AutoDiarySettings) => Promise<ScheduleTiming>;
  /** 107 — 프로세스의 첫 맞추기에서 계획 전부를 다시 건다. 없으면 다시 걸지 않는다(종전 동작) */
  rearm?: RearmGate;
};

let tail: Promise<void> = Promise.resolve();

/** 맞춘다. 던지지 않는다 */
export function reconcileReminders(deps: ReminderDeps): Promise<void> {
  const run = tail.then(() => reconcileOnce(deps));
  tail = run.catch(() => {});
  return tail;
}

/** 우리 예약이 있을 수 있는 날의 id — 발화 7번(오늘 또는 내일부터)이 겨냥하는 날은 어제 ~ 8일 뒤 안이다 */
function reachableIds(now: Date): { id: string; day: DayDate }[] {
  const [year, month, date] = dayOf(now).split("-").map(Number);
  const ids: { id: string; day: DayDate }[] = [];
  for (let k = -1; k <= 8; k += 1) {
    const day = dayOf(new Date(year, month - 1, date + k));
    ids.push({ id: `${REMINDER_ID_PREFIX}${day}`, day });
  }
  return ids;
}

const same = (entry: ReminderPlanEntry, scheduled: ScheduledReminder) =>
  scheduled.id === entry.id && scheduled.at === entry.at && scheduled.title === entry.title;

/** 던지지 않는다 — 읽지 못하면 `unknown`이다(104) */
async function readBatteryStatus(deps: ReminderDeps): Promise<BatteryExceptionStatus> {
  try {
    return await deps.loadBatteryStatus();
  } catch {
    return "unknown";
  }
}

/** 던지지 않는다 — 읽지 못하면 배포 규칙이다(106) */
async function readTiming(
  deps: ReminderDeps,
  settings: AutoDiarySettings,
): Promise<ScheduleTiming> {
  if (deps.loadTiming === undefined) return productionTiming(settings);
  try {
    return await deps.loadTiming(settings);
  } catch {
    return productionTiming(settings);
  }
}

async function reconcileOnce(deps: ReminderDeps): Promise<void> {
  let settings: AutoDiarySettings;
  let writtenDays: readonly DayDate[];
  let name: string | null;
  try {
    settings = await deps.loadSettings();
    writtenDays = await deps.listDiaryDays();
    name = settings.enabled ? await deps.loadName() : null;
  } catch {
    return; // RC6 — 모르면 바꾸지 않는다(이름을 읽지 못한 것도 「캐릭터 없음」으로 단정하지 않는다)
  }

  const now = deps.now();
  const batteryStatus = settings.enabled ? await readBatteryStatus(deps) : "unknown";
  const timing = await readTiming(deps, settings);
  // 106 — 지연은 시간 규칙의 상한을 넘지 않는다(배포 30분 = 종전, 빠른 주기는 창 분).
  const plan = planReminders({
    now,
    settings,
    writtenDays,
    name,
    delayMinutes: Math.min(reminderDelayFor(batteryStatus), timing.reminderDelayCap),
    timing,
  });
  const written = new Set(writtenDays);
  // 106 — 자동 쓰기가 다룰 날(배포는 사흘, 빠른 주기는 오늘 하나 — 오전에도 오늘이 든다)
  const window = new Set(timing.candidateDays(selectableDays(now), dayOf(now)));
  /**
   * RC8 — 시각이 지났지만 아직 전달되지 않았을 수 있는 그 날의 예약을 둔다. 부정확 알람(최대 +1시간)·삼성 얼림 동안은 목표 시각이 지나도
   * 예약이 남아 있고, 계획에는 그 발화가 없다(지난 시각은 다시 걸 수 없다). 켜져 있고 그 날을 아직 안 썼고 자동 쓰기가 다룰 사흘 안이면 —
   * 085 실기기(2026-10-15): 17:01:53 백그라운드 잡의 맞추기가 아직 안 뜬 17:00 예약을 취소했다.
   */
  const stillDue = (day: DayDate | null) =>
    settings.enabled && day !== null && !written.has(day) && window.has(day);
  /**
   * 104 — 정각은 지났지만 정각+지연이 아직 오지 않은 때, 지금 상태가 `exempt`가 아니면(상태가 바뀌었거나 헤드리스에서 못 읽었다) 계획은 그 날의
   * 발화를 정각 기준으로 보고 건너뛴다. 그러면 `exempt`일 때 걸어 둔 지연 예약이 「계획에 없는 예약」으로 취소돼, 일기가 없는데도 그 날 알림이
   * 사라진다(안전장치 위반). 그 날 몫의 **지연 예약**(= `exempt` 계획의 같은 id·같은 시각)은 아직 울릴 차례이므로 거두지 않는다. 상태가 정말
   * `restricted`였다면 알림이 정각 뒤 30분에 뜰 뿐 잃지 않는다. 목표 시각을 바꾼 옛 예약은 이 계획과 시각이 달라 그대로 거둔다.
   */
  const delayedPlan = planReminders({
    now,
    settings,
    writtenDays,
    name,
    delayMinutes: Math.min(REMINDER_DELAY_MINUTES, timing.reminderDelayCap),
    timing,
  });
  const keepDelayed = (s: ScheduledReminder) =>
    s.at !== null &&
    s.at > now.getTime() &&
    stillDue(s.day) &&
    !plan.some((entry) => entry.id === s.id) &&
    delayedPlan.some((entry) => entry.id === s.id && entry.at === s.at);

  await deps.prepare().catch(() => {});

  let scheduled: ScheduledReminder[] | null;
  try {
    scheduled = await deps.port.scheduled();
  } catch {
    scheduled = null; // 걸린 것을 모른다 — 취소하지 않고 계획 전부를 건다(같은 id는 바꿔 낀다)
  }

  if (scheduled !== null) {
    for (const s of scheduled) {
      if (plan.some((entry) => same(entry, s))) continue;
      const passed = s.at !== null && s.at <= now.getTime();
      if (passed && stillDue(s.day)) continue; // RC8
      if (keepDelayed(s)) continue; // 104
      await deps.port.cancel(s.id).catch(() => {});
    }
  } else {
    // 걸린 것을 모른다 — 우리 예약이 있을 수 있는 날(어제 ~ 8일 뒤)의 id 중 계획에 없는 것을 취소한다(꺼졌는데 남는 일이 없게).
    // 켜져 있으면 쓴 날의 것만 — 아직 전달 전인 지난 예약일 수 있다(RC8).
    for (const { id, day } of reachableIds(now)) {
      if (plan.some((entry) => entry.id === id)) continue;
      if (settings.enabled && !written.has(day)) continue;
      await deps.port.cancel(id).catch(() => {});
    }
  }
  // 107 — 이 프로세스에서 아직 다시 걸지 않았고 걸 것이 있으면 이미 걸린 것도 믿지 않고 다시 건다.
  const rearm = plan.length > 0 && deps.rearm?.pending() === true;
  let scheduleFailed = false;
  for (const entry of plan) {
    if (!rearm && scheduled !== null && scheduled.some((s) => same(entry, s))) continue;
    await deps.port.schedule(entry).catch(() => {
      scheduleFailed = true;
    });
  }
  if (rearm && !scheduleFailed) deps.rearm?.done();

  let presented;
  try {
    presented = await deps.port.presented();
  } catch {
    return;
  }
  for (const notification of presented) {
    const stale =
      !settings.enabled ||
      notification.day === null ||
      written.has(notification.day) ||
      !window.has(notification.day);
    if (stale) await deps.port.dismiss(notification.id).catch(() => {});
  }
}
