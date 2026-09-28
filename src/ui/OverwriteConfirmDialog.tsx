/**
 * 덮어쓰기 확인 대화상자 (050, 보드 `2d`) — 012의 전체 화면 확인을 대체한다.
 *
 * 계약: specs/050-dialog-foundation/contracts/dialogs.md OW1~OW7
 *       (012 contracts/overwrite-confirm.md X1~X3 계승)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 이미 있는가는 `state.ts`의 `startWriting()`이, 오늘인가는 `cellFor()`가 정하고
 * 부르는 쪽이 `isToday`로 넘긴다. 이 파일은 하루 경계를 모른다.
 *
 * **확인 대화상자다** — 덮개를 눌러도 닫히지 않고, 안드로이드 뒤로 가기는 「취소」와 같다(보드 `2d`).
 * 「다시 쓰기」를 누르면 쓰기가 시작되고, 기존 일기는 새 일기가 판정을 통과해 저장되는 순간에만 바뀐다
 * (파이프라인이 이미 그렇다 — OW8).
 *
 * **props에 일기가 없다**(012 X1, 원칙 I) — 담으면 확인이 「미리 보기」로 미끄러진다. 진행률·경과 시간
 * (X2, 원칙 IV)·모델 이름(X3, 원칙 III)도 없다.
 *
 * **오늘 안내 한 줄**(Clarifications Q5, FR-007a) — 오늘을 다시 쓸 때만 「지금까지의 하루로 써요.」를
 * 더한다. 오전에 다시 쓰면 그때까지의 기록만 재료가 된다는 사실을 알린다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  ConfirmDialog,
  DialogActionButton,
  DialogCancelButton,
  DialogNote,
} from "./components/Dialog";
import { OVERWRITE_CONFIRM } from "./home-text";

export type OverwriteConfirmDialogProps = {
  /** 다시 쓰려는 날이 오늘인가 — 부르는 쪽이 `cellFor().isToday`로 정한다 */
  isToday: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OverwriteConfirmDialog({
  isToday,
  onCancel,
  onConfirm,
}: OverwriteConfirmDialogProps) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onConfirm} testID="overwrite-confirm">
            {OVERWRITE_CONFIRM.confirm}
          </DialogActionButton>
          <DialogCancelButton onPress={onCancel} testID="overwrite-cancel">
            {OVERWRITE_CONFIRM.cancel}
          </DialogCancelButton>
        </>
      }
      description={OVERWRITE_CONFIRM.body}
      onCancel={onCancel}
      open
      testID="overwrite-dialog"
      title={OVERWRITE_CONFIRM.title}
    >
      {isToday && (
        <DialogNote testID="overwrite-today-note">{OVERWRITE_CONFIRM.todayNote}</DialogNote>
      )}
    </ConfirmDialog>
  );
}
