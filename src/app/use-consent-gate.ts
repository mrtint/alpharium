/**
 * 첫 실행 다운로드 동의 게이트의 상태 (074).
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG5~CG10, data-model.md 「ConsentGateView」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 훅은 `download-consent` 단계에서만 마운트된다 — 모델이 준비됐거나 이미 동의한 사용자는 이 훅을 거치지 않으므로 연결 종류를 읽지도 않는다(FR-009).
 *
 * 마운트하면 연결을 한 번 읽는다(`reading`). `cellular`로 **확인되면** 그 뒤에 받을 양을 읽고 `cellular`, 그 밖(읽지 못함·한도 초과 포함)은 `standard`다. 표준에서는
 * 받을 양을 읽지 않는다(045 FR-003 — 표준 동의에는 용량을 노출하지 않는다).
 *
 * **「나중에 받기」(`defer`)는 이 훅 안의 세션 상태뿐이다** — 저장 통로를 받지 않는다. 앱을 다시 열면 처음부터 읽는다. `deferred`에서만 `recheck()`와
 * 전경 복귀(`AppState` `change → active`)가 다시 읽는다 — 눈앞에 떠 있는 대화상자(`cellular`·`standard`)는 전경 복귀에 바뀌지 않는다. `AppState`는 「다시 판정할 때」의
 * 신호일 뿐 입력이 아니다(`currentState`를 읽지 않는다).
 *
 * 읽기 결과는 시작한 읽기 라운드의 것일 때만 받아들인다(effect 정리) — `recheck()` 뒤 늦게 도착한 옛 결과가 새 판정을 덮지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { consentViewOf, READ_LIMIT_MS, withTimeout, type ConsentView } from "./consent-gate";
import type { Connection } from "./network-port";

export type ConsentGateDeps = {
  /** 059 `readConnection` — 못 읽으면 `"unknown"`을 준다 */
  readConnection: () => Promise<Connection>;
  /** 받을 양을 「2.0GB」꼴 문자열로. 못 읽으면 `null`이거나 거부한다 */
  readSizeLabel: () => Promise<string | null>;
};

type GateState = { view: ConsentView; sizeLabel: string | null };

export type ConsentGate = GateState & {
  /** 「나중에 받기」 — 세션 상태만 바꾼다 */
  defer: () => void;
  /** 대기 화면의 「다시 확인하기」 — 처음부터 다시 읽는다 */
  recheck: () => void;
};

export function useConsentGate(deps: ConsentGateDeps): ConsentGate {
  const [state, setState] = useState<GateState>({ view: "reading", sizeLabel: null });
  const [round, setRound] = useState(0);

  // 통로 참조가 렌더마다 바뀌어도 읽기를 다시 시작하지 않는다 — 최신 것을 커밋 직후에 옮겨 둔다.
  const latest = useRef(deps);
  useLayoutEffect(() => {
    latest.current = deps;
  });

  useEffect(() => {
    let live = true;
    void (async () => {
      const connection = await withTimeout<Connection>(
        latest.current.readConnection(),
        READ_LIMIT_MS,
        "unknown",
      );
      if (!live) return;
      if (consentViewOf(connection) === "standard") {
        setState({ view: "standard", sizeLabel: null });
        return;
      }
      const sizeLabel = await withTimeout<string | null>(
        latest.current.readSizeLabel(),
        READ_LIMIT_MS,
        null,
      );
      if (!live) return;
      setState({ view: "cellular", sizeLabel });
    })();
    return () => {
      live = false;
    };
  }, [round]);

  const defer = useCallback(() => setState({ view: "deferred", sizeLabel: null }), []);
  const recheck = useCallback(() => {
    setState({ view: "reading", sizeLabel: null });
    setRound((r) => r + 1);
  }, []);

  const deferred = state.view === "deferred";
  useEffect(() => {
    if (!deferred) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") recheck();
    });
    return () => sub.remove();
  }, [deferred, recheck]);

  return { ...state, defer, recheck };
}
