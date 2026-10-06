/**
 * 필수 자산 다운로드 동의 안내 (045).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C9
 *       spec.md FR-001~FR-003·FR-002a
 *       specs/050-dialog-foundation/contracts/dialogs.md MIG1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **[확인/시작] 하나만 있다**(FR-002a) — 거부·건너뛰기 조작을 두지 않는다.
 * 필수 자산이라 앱이 동작하려면 결국 받아야 하므로, 040 `WaitingForDownload
 * Screen`이 "그만두기 경로가 없다"고 정한 것과 같은 논리를 여기 적용한다
 * (research.md R1, Clarifications 2026-09-19).
 *
 * **모델 식별자·자산 키·바이트 크기를 노출하지 않는다**(FR-003, C9) —
 * `essential-assets.ts`의 `ESSENTIAL_ASSET_KEYS`를 import하지 않는다. 화면이
 * 아는 것은 "사진을 읽는 모델"·"글을 쓰는 모델"이라는 역할 이름뿐이다(원칙 III).
 *
 * **050 — 공용 확인 대화상자(`ConfirmDialog`)로 옮겼다**(Clarifications Q4). 045는 「새 Dialog
 * 라이브러리를 추가하지 않는다」며 RN 코어 `Modal`을 썼는데, 050이 대화상자 기반(RNR)을 들이며 그
 * 전제를 바꿨다. 동작·문구·testID는 그대로다 — 확인 대화상자라 덮개를 눌러도 닫히지 않고, 닫는 콜백을
 * 주지 않으므로 뒤로 가기도 아무것도 바꾸지 않는다(앱도 닫지 않는다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { lazyText } from "../i18n/current";
import { ConfirmDialog, DialogActionButton } from "./components/Dialog";

export type DownloadConsentDialogProps = {
  visible: boolean;
  /** 사용자가 [확인/시작]을 눌렀다 — 거부 콜백은 없다(FR-002a). */
  onConfirm: () => void;
};

/** 문구는 전부 사람이 쓴 고정 상수다(FR-003, 원칙 II). 062 — 원문은 한국어 카탈로그(`src/i18n/catalogs/ko/download.ts`)에 있다 */
const TEXT = lazyText((c) => c.download.consent);

export function DownloadConsentDialog({ visible, onConfirm }: DownloadConsentDialogProps) {
  return (
    <ConfirmDialog
      // [확인/시작] 하나뿐이다 — 거부·건너뛰기 버튼을 두지 않는다(FR-002a).
      actions={
        <DialogActionButton onPress={onConfirm} testID="download-consent-confirm">
          {TEXT.confirm}
        </DialogActionButton>
      }
      description={TEXT.body}
      open={visible}
      testID="download-consent-dialog"
      title={TEXT.title}
    />
  );
}
