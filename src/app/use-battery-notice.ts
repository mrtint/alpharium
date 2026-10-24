/**
 * 홈 배터리 안내 (104, 계약 home-notice.md UB1~UB7).
 *
 * 앱 열기 자동 쓰기(057·085 알림 누름)가 **저장된 뒤** 홈이 `onAutoWriteSaved()`를 부르면, 안드로이드에서 예외가 없고(`restricted`) 7일 안에
 * 닫지 않았을 때 안내를 보인다(`shouldShowBatteryNotice`). 판정 규칙은 갖지 않는다 — 순수 함수와 두 통로(상태 읽기·닫은 시각 기록)에
 * 맡긴다. 이 훅은 `expo-*`를 모른다(조립부 `App.tsx`가 통로를 넘긴다). 값은 메모리에만 있다 — 앱을 껐다 켜면 다음 자동 쓰기가 저장될
 * 때까지 보이지 않는다.
 *
 * 떠 있는 동안 앱이 앞으로 돌아오면(설정 목록에서 예외를 주고 돌아온 경우) 상태를 다시 읽어 `restricted`가 아니면 숨긴다. 따로 토스트를
 * 띄우지 않는다. 다시 읽다 던지면 그대로 둔다 — 읽지 못한 것으로 지우지 않는다. `AppState`는 「언제 다시 읽나」만 고른다(AGENTS).
 *
 * 닫기는 지금 시각을 기록하고 숨긴다(기록이 실패해도 숨긴다). `onAutoWriteSaved`의 정체는 바뀌지 않는다 — 홈의 `generate` 의존성에
 * 들어가므로 렌더마다 바뀌면 쓰기 콜백이 흔들린다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type {
  BatteryExceptionPort,
  BatteryExceptionStatus,
} from "../schedule/battery-exception-port";

import { BATTERY_NOTICE_HIDE_MS, shouldShowBatteryNotice } from "./battery-notice";
import {
  loadDismissedAt,
  saveDismissedAt,
  type BatteryNoticeStorePort,
} from "./battery-notice-store";
import type { AppPlatform } from "./platform";

export type BatteryNoticeDeps = {
  platform: AppPlatform;
  /** 예외 상태 읽기(던져도 된다 — `unknown`으로 본다)와 배터리 예외 설정 목록 열기 */
  port: Pick<BatteryExceptionPort, "readStatus" | "openSettingsList">;
  /** 닫은 시각 기록 통로. 없으면(아직 조립 전) 안내하지 않는다 */
  store: BatteryNoticeStorePort | undefined;
  /** 「지금」 — 테스트가 갈아 끼운다 */
  now?: () => Date;
};

/** 화면이 그리는 안내. 없으면 `null` */
export type BatteryNotice = {
  onOpenSettings: () => void;
  onDismiss: () => void;
};

export type BatteryNoticeApi = {
  notice: BatteryNotice | null;
  /** 앱 열기 자동 쓰기가 저장된 직후 홈이 부른다 */
  onAutoWriteSaved: () => void;
};

const systemNow = () => new Date();
const unknownStatus = (): BatteryExceptionStatus => "unknown";

export function useBatteryNotice(deps: BatteryNoticeDeps): BatteryNoticeApi {
  const [shown, setShown] = useState(false);
  const latest = useRef(deps);
  useEffect(() => {
    latest.current = deps;
  });
  /** 이 훅이 본 가장 최근 닫기(epoch ms). 저장 신호의 비동기 읽기가 끝나기 전에 닫았으면 안내를 다시 세우지 않는다 */
  const dismissedAtRef = useRef<number | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const onAutoWriteSaved = useCallback(() => {
    const { platform, port, store, now = systemNow } = latest.current;
    if (platform !== "android" || store === undefined) return;
    const startedAt = now().getTime();
    void (async () => {
      const status = await port.readStatus().catch(unknownStatus);
      const dismissedAt = await loadDismissedAt(store);
      if (!alive.current) return;
      // 읽는 동안 사용자가 (앞 안내를) 닫았으면 그 닫음이 이긴다 — 기록 파일에는 아직 안 들어갔을 수 있다
      if (
        dismissedAtRef.current !== null &&
        startedAt - dismissedAtRef.current < BATTERY_NOTICE_HIDE_MS
      )
        return;
      if (shouldShowBatteryNotice({ platform, status, dismissedAt, now: now() })) setShown(true);
    })();
  }, []);

  // 떠 있는 동안 앞으로 돌아오면 다시 읽는다
  useEffect(() => {
    if (!shown) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void latest.current.port
        .readStatus()
        .then((status) => {
          if (alive.current && status !== "restricted") setShown(false);
        })
        .catch(() => {});
    });
    return () => subscription.remove();
  }, [shown]);

  const onDismiss = useCallback(() => {
    const { store, now = systemNow } = latest.current;
    const at = now().getTime();
    dismissedAtRef.current = at;
    setShown(false);
    if (store !== undefined) void saveDismissedAt(store, at).catch(() => {});
  }, []);

  const onOpenSettings = useCallback(() => {
    void latest.current.port.openSettingsList().catch(() => {});
  }, []);

  const notice = shown ? { onOpenSettings, onDismiss } : null;
  return { notice, onAutoWriteSaved };
}
