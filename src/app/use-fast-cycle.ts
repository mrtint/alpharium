/**
 * 빠른 주기 켜기·끄기 상태 (106, 개발 빌드 전용) — `AppFrame`이 드는 상태.
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/cycle-reset.md CR9~CR11 · spec US3·US5, FR-009·FR-009a·FR-013a·FR-014
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **개발 환경에서만 읽고 쓴다.** 배포 환경은 기록이 있어도 읽지 않고(`loadFastCycleRecord`의 가드) 켜기·주기 변경·끄기를 무시한다 — 배포 기록을
 * 건드리지도 않는다. 개발 환경은 마운트 때 한 번 읽는다(읽기 전·실패·깨짐은 꺼짐, 원칙 V).
 *
 * **켜기**: 오늘 일기가 있으면 곧바로 켜지 않고 `pendingEnable`을 세워 조립부가 확인창을 그리게 한다(FR-009) — 확인하면 `start`(오늘 일기·
 * 기록 지우기와 기록 쓰기, `fast-cycle-reset.ts`의 `startFastCycle`)를 부르고, 거절하면 아무것도 하지 않는다. 오늘 일기가 없으면 확인 없이 켠다.
 * `start`가 `{ ok: false }`면(쓰기가 칸을 쥐었다 등) 켜지지 않고 `startFailed`가 선다.
 * **주기 변경**은 새 주기로 다시 시작하는 것이라 켜기와 같은 길을 탄다(같은 값이면 아무 일도 없다 — 오늘 일기가 있으면 확인 → `start`).
 * **끄기**는 기록을 지운다. 켜기·끄기·주기 변경 뒤 `onChanged`를 부른다 — 조립부가 잡 재등록·알림 맞추기·「한 번」 다시 열기를 묶어 연결한다(FR-014).
 *
 * `use-simulation.ts`(064)와 같은 모양 — 환경은 인자다(`process.env`를 여기서 읽지 않는다, FR-009a).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";

import {
  clearFastCycle,
  type FastCyclePort,
  type FastCycleRecord,
} from "../schedule/fast-cycle-store";
import { MAX_PERIOD_MINUTES, MIN_PERIOD_MINUTES } from "../schedule/timing";
import { loadFastCycleRecord } from "../schedule/timing-source";

export type FastCycleControls = {
  /** 기록을 읽었는가. 배포 환경은 읽지 않으므로 처음부터 참이다 */
  loaded: boolean;
  /** 켜져 있으면 기록, 아니면 `null` (배포 환경은 늘 `null`) */
  record: FastCycleRecord | null;
  /** 오늘 일기가 있어 확인을 기다리는 켜기 */
  pendingEnable: { periodMinutes: number } | null;
  /** 켜기를 시도했으나 `start`가 실패했다(쓰기·지우기가 칸을 쥐고 있었다 등) — 다시 켜면 내려간다 */
  startFailed: boolean;
  enable: (periodMinutes: number) => Promise<void>;
  confirmEnable: () => Promise<void>;
  cancelEnable: () => void;
  setPeriod: (periodMinutes: number) => Promise<void>;
  disable: () => Promise<void>;
};

const validMinutes = (value: number) =>
  Number.isInteger(value) && value >= MIN_PERIOD_MINUTES && value <= MAX_PERIOD_MINUTES;

export function useFastCycle({
  devEnvironment,
  port,
  now,
  hasTodayDiary,
  start,
  onChanged,
}: {
  /** 호출부가 `allowsFastCycle(resolution)`으로 구해 넘긴다 */
  devEnvironment: boolean;
  /** 안정된 참조여야 한다(호출부가 `useMemo`) */
  port: FastCyclePort;
  now: () => Date;
  /** 오늘 일기가 있는가 — 읽지 못하면 던진다(켜지 않는다: 지울지 모르는 채 지우지 않는다) */
  hasTodayDiary: () => Promise<boolean>;
  /** 오늘 일기·기록을 지우고 기록을 쓴다(`startFastCycle`을 조립부가 묶은 것) */
  start: (args: { periodMinutes: number; now: Date }) => Promise<{ ok: boolean }>;
  /** 켜기·끄기·주기 변경 뒤. 조립부가 `reschedule()`·알림 맞추기·「한 번」 다시 열기를 묶는다 */
  onChanged?: () => void;
}): FastCycleControls {
  const [record, setRecord] = useState<FastCycleRecord | null>(null);
  const [loaded, setLoaded] = useState(!devEnvironment);
  const [pendingEnable, setPendingEnable] = useState<{ periodMinutes: number } | null>(null);
  const [startFailed, setStartFailed] = useState(false);

  useEffect(() => {
    if (!devEnvironment) return;
    let alive = true;
    void loadFastCycleRecord({ devEnvironment, port }).then((read) => {
      if (!alive) return;
      setRecord(read);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [devEnvironment, port]);

  const commitEnable = useCallback(
    async (periodMinutes: number) => {
      setStartFailed(false);
      const result = await start({ periodMinutes, now: now() }).catch(() => ({ ok: false }));
      if (!result.ok) {
        setStartFailed(true);
        return;
      }
      setRecord(await loadFastCycleRecord({ devEnvironment, port }));
      onChanged?.();
    },
    [devEnvironment, now, onChanged, port, start],
  );

  const enable = useCallback(
    async (periodMinutes: number) => {
      if (!devEnvironment || !validMinutes(periodMinutes)) return;
      let diary: boolean;
      try {
        diary = await hasTodayDiary();
      } catch {
        setStartFailed(true); // 지울지 모르는 채 켜지 않는다(원칙 V)
        return;
      }
      if (diary) {
        setPendingEnable({ periodMinutes });
        return;
      }
      await commitEnable(periodMinutes);
    },
    [commitEnable, devEnvironment, hasTodayDiary],
  );

  const confirmEnable = useCallback(async () => {
    const pending = pendingEnable;
    setPendingEnable(null);
    if (pending !== null) await commitEnable(pending.periodMinutes);
  }, [commitEnable, pendingEnable]);

  const cancelEnable = useCallback(() => setPendingEnable(null), []);

  const setPeriod = useCallback(
    async (periodMinutes: number) => {
      if (!devEnvironment || record === null || !validMinutes(periodMinutes)) return;
      // 같은 값을 다시 고르는 것은 아무 일도 아니다 — 오늘 일기를 지우지 않는다(코드 리뷰 I2).
      if (periodMinutes === record.periodMinutes) return;
      // 주기를 바꾸는 것은 새 주기로 다시 시작하는 것이다: 켜기와 같은 길(오늘 일기가 있으면 확인 → `start`가 오늘 일기·기록을 지우고 새 주기 번호로
      // 기록을 쓴다). 격자가 달라 옛 `resetCycle`이 새 주기와 같은 id가 될 수 있는 틈도 이 길이 닫는다(스펙 Edge Cases 「주기를 바꾼다」).
      await enable(periodMinutes);
    },
    [devEnvironment, enable, record],
  );

  const disable = useCallback(async () => {
    if (!devEnvironment) return;
    setPendingEnable(null);
    setStartFailed(false);
    setRecord(null);
    await clearFastCycle(port).catch(() => {});
    onChanged?.();
  }, [devEnvironment, onChanged, port]);

  return {
    loaded,
    record: devEnvironment ? record : null,
    pendingEnable,
    startFailed,
    enable,
    confirmEnable,
    cancelEnable,
    setPeriod,
    disable,
  };
}
