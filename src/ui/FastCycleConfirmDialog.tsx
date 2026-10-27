/**
 * 빠른 주기 켜기 확인 대화상자 (106, 개발 빌드 전용) — 오늘 일기가 이미 있을 때만 뜬다.
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/cycle-reset.md CR10 · spec FR-009
 *
 * **그리기만 한다.** 켜면 오늘 일기를 지운다는 사실을 말하고, 확인하면 켜고 거절하면 켜지 않는다. 확인 대화상자라 덮개를 눌러도 닫히지 않고
 * 안드로이드 뒤로 가기는 「취소」와 같다(050). 「지우고 켜기」는 빨간 면이다(`tone="danger"`) — 일기를 지운다.
 */

import { ConfirmDialog, DialogActionButton, DialogCancelButton } from "./components/Dialog";
import { FAST_CYCLE_TEXT } from "./developer-text";

export type FastCycleConfirmDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export function FastCycleConfirmDialog({ onCancel, onConfirm }: FastCycleConfirmDialogProps) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onConfirm} testID="fast-cycle-confirm" tone="danger">
            {FAST_CYCLE_TEXT.confirmYes}
          </DialogActionButton>
          <DialogCancelButton onPress={onCancel} testID="fast-cycle-cancel">
            {FAST_CYCLE_TEXT.confirmNo}
          </DialogCancelButton>
        </>
      }
      description={FAST_CYCLE_TEXT.confirmBody}
      onCancel={onCancel}
      open
      testID="fast-cycle-dialog"
      title={FAST_CYCLE_TEXT.confirmTitle}
    />
  );
}
