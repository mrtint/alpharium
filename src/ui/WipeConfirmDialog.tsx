/**
 * 일기 모두 지우기 확인 대화상자 (058, 보드 `6c` ⑥ — `2d`와 같은 틀).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md UI5, spec FR-009~FR-011
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 편수는 부르는 쪽이 여는 순간 센 값이다(FR-010). 확인 대화상자라 덮개를 눌러도 닫히지 않고, 안드로이드 뒤로
 * 가기는 「취소」와 같다(050). 「지우기」는 빨간 면이다(`tone="danger"`, research R8).
 *
 * props에 일기·모델 정보가 없다 — 무엇이 남는지는 본문 한 줄(「이름과 설정은 남아요.」)이 말한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ConfirmDialog, DialogActionButton, DialogCancelButton } from "./components/Dialog";
import { SETTINGS_TEXT, wipeTitle } from "./settings-text";

export type WipeConfirmDialogProps = {
  /** 여는 순간 센 일기 파일 수(≥1) */
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function WipeConfirmDialog({ count, onCancel, onConfirm }: WipeConfirmDialogProps) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onConfirm} testID="wipe-confirm" tone="danger">
            {SETTINGS_TEXT.wipeConfirm}
          </DialogActionButton>
          <DialogCancelButton onPress={onCancel} testID="wipe-cancel">
            {SETTINGS_TEXT.wipeCancel}
          </DialogCancelButton>
        </>
      }
      description={SETTINGS_TEXT.wipeBody}
      onCancel={onCancel}
      open
      testID="wipe-dialog"
      title={wipeTitle(count)}
    />
  );
}
