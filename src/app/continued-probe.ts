/**
 * 118 — 이어 하기 완성 알림 관찰(개발 빌드 전용 진단).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 「이어 하기 도중 화면을 잠그면 완성 알림이 오지 않았다」(103 3회차)의 원인을 가르려는 **관찰**이다 — 저장·만료 순간의 앱 상태 원값과
 * 갈래를 날짜별 장부(`attempt-ledger/`, 경로 `continued`)에 한 줄씩 남긴다. 판정을 바꾸지 않는다. 측정·채점이 아니라 진단 기록이다(원칙 IV).
 *
 * **판정에 성공한 개발 환경(local·dev)에서만 쓴다**(`probeAllowed`) — 배포 빌드·환경 판정 실패는 통로를 부르지도 않는다. 앱 상태는 원값이다:
 * `launch-state-port.ts`는 `inactive`를 `undefined`로 접어 버려 이 진단에는 쓸 수 없다. 기록 실패는 삼킨다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { EnvironmentResolution } from "../config/types";
import {
  recordContinuedProbe,
  type AutoWriteAttemptPort,
  type ContinuedProbeEvent,
} from "./auto-write-attempts";

export function probeAllowed(resolution: EnvironmentResolution): boolean {
  return resolution.ok && resolution.environment !== "prod";
}

export type ContinuedProbe = (event: ContinuedProbeEvent) => void;

export function createContinuedProbe({
  allowed,
  port,
  now,
  readAppState,
}: {
  allowed: boolean;
  port: AutoWriteAttemptPort;
  now: () => Date;
  readAppState: () => string | undefined;
}): ContinuedProbe {
  return (event) => {
    if (!allowed) return;
    let state: string | undefined;
    try {
      state = readAppState();
    } catch {
      state = undefined;
    }
    void recordContinuedProbe(port, now(), event, state).catch(() => {});
  };
}
