/**
 * 상태 흉내 — `AppFrame`이 드는 상태 (064, research R2).
 *
 * 계약: specs/064-state-simulation/contracts/simulation.md AF2·AF5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **개발 환경에서만 읽고 쓴다**(S7). 배포 환경은 기기에 기록이 남아 있어도 읽지 않고 늘 꺼짐이다 — 흉내는 표시에도 쓰기에도 닿지 않는다
 * (FR-005). 개발 환경은 마운트 때 한 번 읽고(읽기 전·실패는 꺼짐, 원칙 V), 바꾸면 상태를 즉시 바꾸고 파일에 쓴다 — 쓰기가 실패해도 그
 * 실행의 상태는 사용자가 한 대로 둔다(059 FR-009와 같다). 개발자 겹은 닫히면 언마운트되므로 상태는 `AppFrame`이 든다(056·059).
 *
 * `use-developer-menu.ts`(059)와 같은 모양 — 환경은 인자다(`process.env`·`currentEnvironment()`를 여기서 부르지 않는다, FR-009a).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";

import { OFF, type SimulationState } from "../app/simulation";
import {
  clearSimulation,
  loadSimulation,
  saveSimulation,
  type SimulationStorePort,
} from "../app/simulation-store";

export type Simulation = {
  state: SimulationState;
  /**
   * 기록을 읽었는가. 앱을 열 때의 자동 쓰기(057)는 이것이 참일 때만 시작을 판정한다 — 흉내가 켜진 채 저장돼 있는데 읽기 전에 쓰기가 시작되면
   * 안 된다(S8). 배포 환경은 읽지 않으므로 처음부터 참이다.
   */
  loaded: boolean;
  set: (next: SimulationState) => void;
  clear: () => void;
};

export function useSimulation({
  devEnvironment,
  port,
  onLoaded,
}: {
  devEnvironment: boolean;
  /** 기록을 읽은 뒤 한 번(개발 환경). 조립부가 저장된 날짜 흉내를 홈의 고른 날로 삼는다 — 안정된 참조여야 한다 */
  onLoaded?: (state: SimulationState) => void;
  /** 안정된 참조여야 한다(호출부가 `useMemo`) */
  port: SimulationStorePort;
}): Simulation {
  const [state, setState] = useState<SimulationState>(OFF);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!devEnvironment) return;
    let alive = true;
    void loadSimulation(port).then((read) => {
      if (!alive) return;
      setState(read);
      setLoaded(true);
      onLoaded?.(read);
    });
    return () => {
      alive = false;
    };
  }, [devEnvironment, port, onLoaded]);

  const set = useCallback(
    (next: SimulationState) => {
      if (!devEnvironment) return;
      setState(next);
      void saveSimulation(port, next).catch(() => {});
    },
    [devEnvironment, port],
  );

  const clear = useCallback(() => {
    setState(OFF);
    if (!devEnvironment) return;
    void clearSimulation(port).catch(() => {});
  }, [devEnvironment, port]);

  return {
    state: devEnvironment ? state : OFF,
    loaded: devEnvironment ? loaded : true,
    set,
    clear,
  };
}
