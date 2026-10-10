/**
 * 모바일 데이터 다운로드 동의 안내 (074).
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG12·CG14
 *       spec.md FR-003·FR-004·FR-005·FR-006·FR-008
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 연결이 모바일 데이터로 **확인된** 첫 실행에서만 뜬다 — 선택지가 둘이다: 「모바일 데이터로 받기」(표준 동의의 [받을게요]와 같은 효과)와 「나중에 받기」(아무것도 받지 않고
 * 대기 화면으로). 표준 동의(`DownloadConsentDialog`, 045)는 건드리지 않았다 — 그 [받을게요] 하나뿐이라는 계약이 Wi-Fi·모를 때의 모양이다.
 *
 * 덮개를 눌러도 닫히지 않고, 닫는 콜백을 주지 않으므로 뒤로 가기도 아무것도 바꾸지 않는다(앱도 닫지 않는다) — 반드시 둘 중 하나를 고른다.
 *
 * **받을 양은 prop으로만 온다**(`sizeLabel`). 이 화면은 연결 조회·모듈 자산에 닿지 않는다 — 조립부가 문자열을 만들어 넘긴다. 읽지 못했으면 `null`이고 양 없이 같은
 * 안내를 보인다(양을 지어내지 않는다, 원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { lazyText } from "../i18n/current";
import { ConfirmDialog, DialogActionButton, DialogCancelButton } from "./components/Dialog";

export type CellularConsentDialogProps = {
  visible: boolean;
  /** 「2.0GB」꼴. 못 읽었으면 `null` */
  sizeLabel: string | null;
  /** 「모바일 데이터로 받기」 — 표준 동의의 확인과 같은 효과 */
  onConfirm: () => void;
  /** 「나중에 받기」 — 아무것도 받지 않는다 */
  onDefer: () => void;
};

const TEXT = lazyText((c) => c.consentGate.cellular);

export function CellularConsentDialog({
  visible,
  sizeLabel,
  onConfirm,
  onDefer,
}: CellularConsentDialogProps) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onConfirm} testID="download-consent-cellular-confirm">
            {TEXT.confirm}
          </DialogActionButton>
          <DialogCancelButton onPress={onDefer} testID="download-consent-defer">
            {TEXT.defer}
          </DialogCancelButton>
        </>
      }
      description={TEXT.body(sizeLabel)}
      open={visible}
      testID="cellular-consent-dialog"
      title={TEXT.title}
    />
  );
}
