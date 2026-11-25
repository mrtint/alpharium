/**
 * 131 — 자동 쓰기 설정 창 훅 (안내 규칙 G4).
 *
 * 조립부(`App.tsx`)가 넘긴 사실로 창을 띄울지 정하고(`shouldShowAutoWriteSetup`), 창 안의 값(토글·시각)과 배터리 꼬리표를 쥔다.
 * 쓰는 중인지는 살아 있는 쓰기 등록부(`diary/live-write.ts`)를 듣는다 — 쓰기가 시작되면 창이 내려가고 끝나면 다시 뜬다(R8).
 * 배터리 상태는 안드로이드에서 창이 보일 때와 앱이 앞으로 돌아올 때 읽는다(설정 목록에서 예외를 주고 돌아온 경우, 104·108과 같다).
 * 이 훅은 `expo-*`를 모른다 — 통로·저장은 조립부가 넘긴다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type { LiveWrites } from "../diary/live-write";
import type { BatteryExceptionPort } from "../schedule/battery-exception-port";
import type { AutoDiarySettings } from "../schedule/settings";

import {
  confirmAutoWriteSetup,
  shouldShowAutoWriteSetup,
  type AutoWriteSetupDeps,
  type AutoWriteSetupInput,
} from "./auto-write-setup";
import type { AppPlatform } from "./platform";

export type UseAutoWriteSetupDeps = Omit<AutoWriteSetupInput, "writing"> & {
  platform: AppPlatform;
  liveWrites: Pick<LiveWrites, "current" | "onChange">;
  batteryPort: Pick<BatteryExceptionPort, "readStatus" | "openSettingsList">;
  /** 지금 저장된 자동 쓰기 설정. 아직 못 읽었으면 `null`(창을 띄우지 않는다) */
  settings: AutoDiarySettings | null;
  effects: Omit<AutoWriteSetupDeps, "clearPending">;
  /** 대기 비트를 지운다 — 「켜기」·「나중에」 모두 */
  clearPending: () => Promise<void>;
  /** 「켜기」로 저장된 새 설정을 화면 상태에 올린다 */
  onSettingsChange: (next: AutoDiarySettings) => void;
};

export type AutoWriteSetupApi = {
  visible: boolean;
  enabled: boolean;
  targetHour: number;
  batteryTag: "allowed" | "denied" | undefined;
  /** 시각 선택 대화상자가 열려 있다(그동안 창은 그 뒤에 숨는다) */
  pickingHour: boolean;
  setEnabled: (next: boolean) => void;
  openHourPicker: () => void;
  closeHourPicker: () => void;
  selectHour: (hour: number) => void;
  openBattery: () => void;
  confirm: () => void;
  later: () => void;
};

export function useAutoWriteSetup(deps: UseAutoWriteSetupDeps): AutoWriteSetupApi {
  const latest = useRef(deps);
  useEffect(() => {
    latest.current = deps;
  });

  const [writing, setWriting] = useState(() => deps.liveWrites.current() !== null);
  const [pickingHour, setPickingHour] = useState(false);
  useEffect(() => {
    const sync = () => {
      const now = latest.current.liveWrites.current() !== null;
      setWriting(now);
      // 시각을 고르던 중 쓰기가 시작되면 고르기를 접는다 — 쓰기가 끝나 다시 뜰 때 창으로 돌아온다(시각 대화상자가 홀로 되살아나지 않게)
      if (now) setPickingHour(false);
    };
    sync();
    return deps.liveWrites.onChange(sync);
  }, [deps.liveWrites]);

  // 닫은 뒤 같은 실행에서 다시 띄우지 않는다 — 플래그 저장이 늦거나 실패해도
  const [closed, setClosed] = useState(false);
  const visible =
    !closed &&
    deps.settings !== null &&
    shouldShowAutoWriteSetup({
      homeReady: deps.homeReady,
      flagLoaded: deps.flagLoaded,
      pending: deps.pending,
      firstDiaryEntered: deps.firstDiaryEntered,
      firstDiaryDone: deps.firstDiaryDone,
      writing,
      otherDialogOpen: deps.otherDialogOpen,
    });

  // 창 안의 값. 시각은 고르기 전까지 저장된 시각(`null`)이고, 토글은 켬에서 시작한다(창 제목이 「써 드릴까요?」)
  const [enabled, setEnabled] = useState(true);
  const [targetHour, setTargetHour] = useState<number | null>(null);

  const [battery, setBattery] = useState<"allowed" | "denied" | undefined>(undefined);
  const readSeq = useRef(0);
  const readBattery = useCallback(() => {
    if (latest.current.platform !== "android") return;
    const seq = ++readSeq.current;
    void latest.current.batteryPort
      .readStatus()
      .then((status) => {
        if (seq !== readSeq.current) return;
        setBattery(
          status === "exempt" ? "allowed" : status === "restricted" ? "denied" : undefined,
        );
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!visible) return;
    readBattery();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") readBattery();
    });
    return () => subscription.remove();
  }, [visible, readBattery]);

  const finish = useCallback(() => {
    setClosed(true);
    setPickingHour(false);
  }, []);

  const confirm = useCallback(() => {
    const d = latest.current;
    finish();
    if (d.settings === null) return;
    const choice = { enabled, targetHour: targetHour ?? d.settings.targetHour };
    void confirmAutoWriteSetup(choice, d.settings, { ...d.effects, clearPending: d.clearPending })
      .then((next) => latest.current.onSettingsChange(next))
      .catch(() => {});
  }, [enabled, targetHour, finish]);

  const later = useCallback(() => {
    finish();
    void latest.current.clearPending().catch(() => {});
  }, [finish]);

  return {
    visible,
    enabled,
    targetHour: targetHour ?? deps.settings?.targetHour ?? 0,
    batteryTag: battery,
    pickingHour,
    setEnabled,
    openHourPicker: useCallback(() => setPickingHour(true), []),
    closeHourPicker: useCallback(() => setPickingHour(false), []),
    selectHour: useCallback((hour: number) => {
      setTargetHour(hour);
      setPickingHour(false);
    }, []),
    openBattery: useCallback(() => {
      void latest.current.batteryPort.openSettingsList().catch(() => {});
    }, []),
    confirm,
    later,
  };
}
