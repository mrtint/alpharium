/**
 * 빠른 주기 리셋 (106, 개발 빌드 전용) — 주기가 바뀌면 오늘의 일기와 딸린 기록을 지워 매 주기를 새 하루처럼 시작한다.
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/cycle-reset.md CR1~CR9 · research R4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정 자리 둘이 판정 직전에 부른다** — 백그라운드 `task.ts`(일기 목록을 읽기 전)와 앱 열기 판정 훅(`resolveAutoWrite` 앞, 조립부가
 * `createFastCycleResetter`로 만든 클로저로). 셋째 경로가 따로 지우지 않는다(헌법 검사 FL3).
 *
 * **지우는 것은 오늘 하나와 그 날의 기록뿐이다**: 일기 파일, 완성 알림 확인 기록의 오늘 항목(남기면 다음 쓰기의 완성 알림이 「이미 확인한
 * 날」로 빠진다 — 020), 건너뜀·창 밖 따라잡기 기록(오늘이면), 트레이의 그 알림. 다른 날의 일기와 사진 리사이즈 사본(`vision-cache`)에는
 * 닿지 않는다 — 그래서 이 파일의 의존에는 사진 통로가 없다.
 *
 * **쓰기를 끊지 않는다**(`wipe-diaries.ts`와 다른 점 — 그것은 사용자 명령이다). 등록부의 칸을 `beginWipe`로 차지하지 못하면(쓰기·지우기가
 * 살아 있다) 이번에는 리셋하지 않는다 — 다음 판정이 다시 시도한다. 칸을 쥐고 있는 동안 새 쓰기가 끼어들지 못한다. 칸이 차고 비는 신호를 홈이
 * 듣고 목록을 다시 읽는다(080 H12 — 리셋 뒤 홈은 오늘을 「안 쓴 날」로 읽는다, FR-009b).
 *
 * **`resetCycle`은 일기 삭제가 성공한 뒤에만 갱신한다.** 중간에 죽거나 삭제가 던지면 다음 판정이 다시 리셋해 같은 결과로 수렴한다. 어떤
 * 통로가 던져도 밖으로 던지지 않는다.
 *
 * **개발 환경에서만 효력이 있다**: `devEnvironment`가 거짓이면 기록 통로를 부르지도 않고 `{ reset: false }`다(`timing-source`의 가드).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf } from "../config/day-boundary";
import type { LiveWrites } from "../diary/live-write";
import type { DiaryStore } from "../diary/store";
import { clearCatchUpDay, loadCatchUpDay, type CatchUpStorePort } from "../schedule/catch-up-store";
import { expoFastCyclePort, saveFastCycle, type FastCyclePort } from "../schedule/fast-cycle-store";
import {
  loadNotifiedState,
  saveNotifiedState,
  type NotifiedStorePort,
} from "../schedule/notified-store";
import { clearSkippedDay, loadSkippedDay, type SkipStorePort } from "../schedule/skip-store";
import { loadFastCycleRecord } from "../schedule/timing-source";
import { cycleOf, fastCycleTiming } from "../schedule/timing";

export type FastCycleResetBase = {
  /** 호출부가 `showsOnScreen(resolution)`으로 구해 넘긴다 — 거짓이면 아무것도 읽거나 지우지 않는다 */
  devEnvironment: boolean;
  /** 주지 않으면 기기 통로 */
  fastCyclePort?: FastCyclePort | undefined;
  store: Pick<DiaryStore, "removeDay">;
  notifiedPort: NotifiedStorePort;
  skipPort: SkipStorePort;
  catchUpPort: CatchUpStorePort;
  /** 트레이의 알림 하나를 거둔다 */
  dismiss: (notificationId: string) => Promise<void>;
  /** 살아 있는 쓰기 등록부(080) — 앱의 그 하나 */
  liveWrites: Pick<LiveWrites, "beginWipe">;
};

export type FastCycleResetDeps = FastCycleResetBase & { now: Date };

export type FastCycleResetResult = { reset: boolean };

/** 주기가 바뀌었으면 오늘을 리셋한다. 던지지 않는다. */
export async function resetFastCycleIfDue(deps: FastCycleResetDeps): Promise<FastCycleResetResult> {
  try {
    return await resetOnce(deps);
  } catch {
    return { reset: false };
  }
}

async function resetOnce(deps: FastCycleResetDeps): Promise<FastCycleResetResult> {
  const record = await loadFastCycleRecord({
    devEnvironment: deps.devEnvironment,
    port: deps.fastCyclePort,
  });
  if (record === null) return { reset: false }; // CR1

  const cycle = fastCycleTiming(record.periodMinutes).cycle(deps.now);
  if (cycle.id === record.resetCycle) return { reset: false }; // CR2

  const slot = deps.liveWrites.beginWipe();
  if (slot === null) return { reset: false }; // CR3 — 쓰기·지우기가 살아 있다. 끊지 않는다.

  try {
    // 코드 리뷰 I3·I4 — 칸을 쥔 뒤 기록을 다시 읽는다. 위에서 읽은 뒤 다른 판정이 이 주기를 이미 리셋했거나(그 사이 새로 쓴 일기를 또 지우지 않게),
    // 모드가 꺼졌거나 주기가 바뀌었으면 아무것도 지우지 않는다.
    const current = await loadFastCycleRecord({
      devEnvironment: deps.devEnvironment,
      port: deps.fastCyclePort,
    });
    if (current === null || current.periodMinutes !== record.periodMinutes) return { reset: false };
    if (current.resetCycle === cycle.id) return { reset: false };

    // CR6 — 일기 삭제가 실패하면 나머지 기록은 비우되 resetCycle은 갱신하지 않는다
    if (!(await wipeToday(deps))) return { reset: false };

    // 지우는 동안 모드가 꺼졌거나 주기가 바뀌었으면 옛 기록으로 되살리거나 덮지 않는다(저장 직전에 다시 읽는다).
    const latest = await loadFastCycleRecord({
      devEnvironment: deps.devEnvironment,
      port: deps.fastCyclePort,
    });
    if (latest === null || latest.periodMinutes !== record.periodMinutes) return { reset: false };
    try {
      await saveFastCycle(deps.fastCyclePort ?? expoFastCyclePort(), {
        periodMinutes: record.periodMinutes,
        resetCycle: cycle.id,
      });
    } catch {
      return { reset: false };
    }
    return { reset: true };
  } finally {
    slot.end(); // CR4
  }
}

/** 오늘의 일기를 지우고 딸린 기록을 비운다. 일기 삭제가 성공했는가를 돌려준다(던지지 않는다) */
async function wipeToday(deps: FastCycleResetDeps): Promise<boolean> {
  const today = dayOf(deps.now);
  let removed = true;
  try {
    await deps.store.removeDay(today);
  } catch {
    removed = false;
  }
  await clearTodayRecords(deps, today);
  return removed;
}

/** 오늘의 완성 알림 확인 기록·건너뜀·따라잡기와 트레이 알림. 하나가 실패해도 나머지를 시도한다 */
async function clearTodayRecords(deps: FastCycleResetDeps, today: string): Promise<void> {
  try {
    const notified = await loadNotifiedState(deps.notifiedPort);
    const entry = notified[today];
    if (entry !== undefined) {
      const { [today]: _gone, ...rest } = notified;
      await saveNotifiedState(deps.notifiedPort, rest);
      await deps.dismiss(entry.notificationId).catch(() => {});
    }
  } catch {
    /* 확인 기록을 못 비워도 나머지를 이어 간다 */
  }
  try {
    if ((await loadSkippedDay(deps.skipPort)) === today) await clearSkippedDay(deps.skipPort);
  } catch {
    /* 이어 간다 */
  }
  try {
    if ((await loadCatchUpDay(deps.catchUpPort)) === today) {
      await clearCatchUpDay(deps.catchUpPort);
    }
  } catch {
    /* 이어 간다 */
  }
}

/**
 * 빠른 주기를 켠다 (CR10) — 오늘의 일기와 딸린 기록을 지우고 기록을 `{ periodMinutes, resetCycle: 켠 순간의 주기 }`로 쓴다(FR-009a: 켠 직후
 * 같은 주기에서 다시 지우지 않는다). 부르는 쪽이 오늘 일기가 있으면 먼저 확인을 받는다. 개발 환경이 아니거나 쓰기·지우기가 칸을 쥐고 있으면
 * 아무것도 하지 않고 `{ ok: false }`다. 던지지 않는다.
 */
export async function startFastCycle(
  deps: FastCycleResetDeps & { periodMinutes: number },
): Promise<{ ok: boolean }> {
  if (!deps.devEnvironment) return { ok: false };
  try {
    const slot = deps.liveWrites.beginWipe();
    if (slot === null) return { ok: false };
    try {
      if (!(await wipeToday(deps))) return { ok: false };
      await saveFastCycle(deps.fastCyclePort ?? expoFastCyclePort(), {
        periodMinutes: deps.periodMinutes,
        resetCycle: cycleOf(deps.periodMinutes, deps.now).id,
      });
      return { ok: true };
    } finally {
      slot.end();
    }
  } catch {
    return { ok: false };
  }
}

/**
 * 훅에 주는 클로저 (CR8) — 의존을 한 번 묶어 `now`만 받는다. 앱 열기 판정 훅은 저장소·포트를 모른다.
 * 조립부(`App.tsx`)만 부른다(FL3).
 */
export function createFastCycleResetter(
  base: FastCycleResetBase,
): (now: Date) => Promise<FastCycleResetResult> {
  return (now) => resetFastCycleIfDue({ ...base, now });
}
