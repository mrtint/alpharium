/**
 * 모듈 다시 받기 확인 대화상자 (059, 보드 `6e` ① — `2d`와 같은 틀).
 *
 * 계약: specs/059-developer-menu/spec.md FR-017·FR-020, contracts/developer-menu.md TX
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 용량은 부르는 쪽이 문자열로 준다(`planRedownload` — 모바일이 확인될 때만, 아니면 `null`) — 이 화면은 모듈 키·크기에 닿지 않는다
 * (원칙 III). 본문은 무엇을 하는지(빠진 모듈을 받고 이미 받은 것은 그대로 둔다)만 말한다. 확인 대화상자라 덮개를 눌러도 닫히지 않고, 뒤로 가기는
 * 「취소」와 같다(050).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ConfirmDialog, DialogActionButton, DialogCancelButton } from "./components/Dialog";
import { DEVELOPER_TEXT } from "./developer-text";

export type RedownloadConfirmDialogProps = {
  /** 모바일 데이터로 받을 양(예: 「1.2GB」). 모바일이 확인되지 않았으면 `null` */
  cellularSize: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RedownloadConfirmDialog({
  cellularSize,
  onCancel,
  onConfirm,
}: RedownloadConfirmDialogProps) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onConfirm} testID="redownload-confirm">
            {DEVELOPER_TEXT.redownloadConfirm}
          </DialogActionButton>
          <DialogCancelButton onPress={onCancel} testID="redownload-cancel">
            {DEVELOPER_TEXT.redownloadCancel}
          </DialogCancelButton>
        </>
      }
      description={
        cellularSize === null
          ? DEVELOPER_TEXT.redownloadBody
          : DEVELOPER_TEXT.redownloadCellular(cellularSize)
      }
      onCancel={onCancel}
      open
      testID="redownload-dialog"
      title={DEVELOPER_TEXT.redownloadTitle}
    />
  );
}
