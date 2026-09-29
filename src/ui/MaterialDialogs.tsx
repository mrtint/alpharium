/**
 * 쓸 재료의 두 확인 대화상자 (053, 보드 `2f`·`2m`) — 050 확인 대화상자 부품으로 그린다.
 *
 * 계약: specs/053-writing-material/contracts/material.md DLG2~DLG5, REQ2·REQ3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 열지 말지는 `DiaryHomeScreen`이 정한다 — 재료 판정(`decideMaterial`)도 권한 상태도
 * 이 파일은 모른다. 제목 하나만 이유(`because`)로 가른다.
 *
 * **둘 다 확인 대화상자다**(050) — 덮개를 눌러도 닫히지 않고, 안드로이드 뒤로 가기는 「취소」와 같다.
 * 새 모달을 만들지 않는다(DLG5).
 *
 * - `MaterialConfirmDialog`(`2f`) — 셀 수 있는 재료가 없을 때 쓰기 전에 한 번 더 묻는다. 제목은 이유에 따라
 *   「아무 기록도 없어요」(관측된 0)와 「기록을 볼 수 없어요」(전부 권한 없음)로 갈린다 — 기록이 없는지
 *   모르는 상태를 「없다」로 단정하지 않는다(원칙 V).
 * - `SettingsPromptDialog`(`2m` 이미 거부한 경우) — 앱이 다시 물을 수 없을 때 설정으로 안내한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MaterialDecision } from "../app/material";
import { ConfirmDialog, DialogActionButton, DialogCancelButton } from "./components/Dialog";
import { MATERIAL_TEXT } from "./home-text";

export type MaterialConfirmDialogProps = {
  because: Extract<MaterialDecision, { kind: "confirm" }>["because"];
  onConfirm: () => void;
  onCancel: () => void;
};

export function MaterialConfirmDialog({
  because,
  onConfirm,
  onCancel,
}: MaterialConfirmDialogProps) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onConfirm} testID="material-confirm-yes">
            {MATERIAL_TEXT.confirmYes}
          </DialogActionButton>
          <DialogCancelButton onPress={onCancel} testID="material-confirm-no">
            {MATERIAL_TEXT.confirmNo}
          </DialogCancelButton>
        </>
      }
      description={MATERIAL_TEXT.confirmBody}
      onCancel={onCancel}
      open
      testID="material-confirm"
      title={because === "zero" ? MATERIAL_TEXT.confirmTitleZero : MATERIAL_TEXT.confirmTitleUnseen}
    />
  );
}

export type SettingsPromptDialogProps = {
  onOpenSettings: () => void;
  onCancel: () => void;
};

export function SettingsPromptDialog({ onOpenSettings, onCancel }: SettingsPromptDialogProps) {
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onOpenSettings} testID="settings-prompt-open">
            {MATERIAL_TEXT.settingsOpen}
          </DialogActionButton>
          <DialogCancelButton onPress={onCancel} testID="settings-prompt-cancel">
            {MATERIAL_TEXT.settingsCancel}
          </DialogCancelButton>
        </>
      }
      onCancel={onCancel}
      open
      testID="settings-prompt"
      title={MATERIAL_TEXT.settingsTitle}
    />
  );
}
