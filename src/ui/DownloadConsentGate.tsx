/**
 * 첫 실행 다운로드 동의 단계의 조립 (074).
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG11~CG17
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `download-consent` 단계에서만 마운트된다(`App.tsx`) — 모델이 준비됐거나 이미 동의한 사용자는 이 화면을 거치지 않으므로 연결 종류를 읽지도 않는다.
 * 연결 종류가 모바일 데이터로 **확인될 때만** 모바일 동의를 보이고, 그 밖(Wi-Fi·모름·한도 초과)은 045의 표준 동의 그대로다. 「나중에 받기」는 대기 화면으로 가고
 * **저장하지 않는다** — 이 컴포넌트는 저장 통로를 모른다(`onConfirm`뿐). 앱을 다시 열면 처음부터 읽는다.
 *
 * 통로(`readConnection`·`readSizeLabel`)는 조립부가 주입한다 — 이 화면은 `network-port`·모듈 자산에 닿지 않는다.
 * 읽는 동안(`reading`)은 아무것도 그리지 않는다(빈 배경, 한도 3초).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ConsentGateDeps } from "../app/use-consent-gate";
import { useConsentGate } from "../app/use-consent-gate";
import { CellularConsentDialog } from "./CellularConsentDialog";
import { DownloadConsentDialog } from "./DownloadConsentDialog";
import { DownloadDeferredScreen } from "./DownloadDeferredScreen";

export type DownloadConsentGateProps = ConsentGateDeps & {
  /** 동의 저장 → 내려받기 시작(`App.tsx`의 `onConfirmDownloadConsent`). 표준·모바일 동의가 같은 콜백을 쓴다 */
  onConfirm: () => void;
};

export function DownloadConsentGate({
  onConfirm,
  readConnection,
  readSizeLabel,
}: DownloadConsentGateProps) {
  const gate = useConsentGate({ readConnection, readSizeLabel });

  if (gate.view === "standard") return <DownloadConsentDialog onConfirm={onConfirm} visible />;
  if (gate.view === "cellular") {
    return (
      <CellularConsentDialog
        onConfirm={onConfirm}
        onDefer={gate.defer}
        sizeLabel={gate.sizeLabel}
        visible
      />
    );
  }
  if (gate.view === "deferred") return <DownloadDeferredScreen onRecheck={gate.recheck} />;
  return null;
}
