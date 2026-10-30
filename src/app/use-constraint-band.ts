/**
 * 홈 제약 띠 훅 (108, 계약 constraint-band.md UB1~UB4).
 *
 * 사진 권한(조립부가 읽어 넘긴다)과 배터리 예외 상태(이 훅이 읽는다)로 `constraintBandFor`를 돌려 띠의 종류를 준다. 배터리 상태는
 * 안드로이드에서 마운트할 때와 앱이 앞으로 돌아올 때마다 읽는다 — 설정 목록에서 예외를 주고 돌아오면 띠가 사라진다. 읽다가 던지면
 * 마지막 값을 지우지 않는다(읽지 못한 것으로 숨기지 않는다). 처음부터 못 읽었으면 `unknown`이라 띠가 없다(원칙 V).
 *
 * **기록을 남기지 않는다** — 띠는 닫을 수 없고 조건이 풀리면 사라지므로 닫은 시각이 없다. 이 훅은 `expo-*`를 모른다(조립부 `App.tsx`가
 * 통로를 넘긴다). 판정 규칙은 갖지 않는다 — 순수 함수에 맡긴다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type {
  BatteryExceptionPort,
  BatteryExceptionStatus,
} from "../schedule/battery-exception-port";

import { constraintBandFor, type ConstraintKind } from "./constraint-band";
import type { AppPlatform } from "./platform";

export type ConstraintBandDeps = {
  platform: AppPlatform;
  /** 예외 상태 읽기(던져도 된다)와 배터리 예외 설정 목록 열기 */
  port: Pick<BatteryExceptionPort, "readStatus" | "openSettingsList">;
  /** 사진 권한이 `denied`·`blocked`인가. 아직 못 읽었으면 `undefined` */
  photoDenied: boolean | undefined;
  /** 자동 쓰기가 켜져 있는가. 설정을 아직 못 읽었으면 `undefined` */
  autoWriteEnabled: boolean | undefined;
};

export type ConstraintBandApi = {
  kind: ConstraintKind | null;
  /** 배터리 띠의 버튼 — 배터리 예외 설정 목록을 연다. 던지지 않는다 */
  onOpenBattery: () => void;
};

export function useConstraintBand(deps: ConstraintBandDeps): ConstraintBandApi {
  const [battery, setBattery] = useState<BatteryExceptionStatus>("unknown");
  const latest = useRef(deps);
  useEffect(() => {
    latest.current = deps;
  });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** 읽기 요청 번호 — 마운트 읽기와 복귀 읽기가 겹쳐도 가장 나중에 시작한 읽기의 결과만 쓴다 */
  const readSeq = useRef(0);
  const read = useCallback(() => {
    if (latest.current.platform !== "android") return;
    const seq = ++readSeq.current;
    void latest.current.port
      .readStatus()
      .then((status) => {
        if (alive.current && seq === readSeq.current) setBattery(status);
      })
      .catch(() => {});
  }, []);

  // 마운트에서 한 번, 그리고 앞으로 돌아올 때마다(설정 목록에서 예외를 주고 돌아온 경우)
  useEffect(() => {
    read();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => subscription.remove();
  }, [read]);

  const onOpenBattery = useCallback(() => {
    void latest.current.port.openSettingsList().catch(() => {});
  }, []);

  const kind = constraintBandFor({
    photoDenied: deps.photoDenied,
    platform: deps.platform,
    autoWriteEnabled: deps.autoWriteEnabled,
    battery,
  });
  return { kind, onOpenBattery };
}
