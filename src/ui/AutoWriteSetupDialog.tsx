/**
 * 131 — 자동 쓰기 설정 창 (안내 규칙 D2·D5·U1).
 *
 * 새 설치의 첫 실행이 끝난 뒤 한 번, 홈 위에서 「자동으로 쓰기」·쓰는 시각·(안드로이드) 배터리 제한 풀기를 한 번에 정한다.
 * 값·저장은 `AppFrame`이 쥐고(`src/app/auto-write-setup.ts`), 이 부품은 그리기만 한다. 행 모양은 설정 화면의 행을 그대로 쓴다.
 */

import { View } from "react-native";

import type { AppPlatform } from "../app/platform";
import { AppText } from "./components/Text";
import { ConfirmDialog, DialogActionButton, DialogCancelButton } from "./components/Dialog";
import { AUTO_WRITE_SETUP_TEXT } from "./home-text";
import { Row, Toggle, Value } from "./SettingsScreen";

export type AutoWriteSetupDialogProps = {
  platform: AppPlatform;
  /** 창 안의 토글 값(처음 켬) */
  enabled: boolean;
  /** 「오후 10시쯤」 같은 지금 고른 시각 */
  targetHourText: string;
  /** 배터리 예외 꼬리표. 읽지 못했으면 없다 */
  batteryTag?: "allowed" | "denied";
  onToggle: (next: boolean) => void;
  onPickHour: () => void;
  onOpenBattery: () => void;
  onConfirm: () => void;
  onLater: () => void;
};

export function AutoWriteSetupDialog({
  platform,
  enabled,
  targetHourText,
  batteryTag,
  onToggle,
  onPickHour,
  onOpenBattery,
  onConfirm,
  onLater,
}: AutoWriteSetupDialogProps) {
  const T = AUTO_WRITE_SETUP_TEXT;
  return (
    <ConfirmDialog
      actions={
        <>
          <DialogActionButton onPress={onConfirm} testID="auto-write-setup-confirm">
            {T.confirm}
          </DialogActionButton>
          <DialogCancelButton onPress={onLater} testID="auto-write-setup-later">
            {T.later}
          </DialogCancelButton>
        </>
      }
      onCancel={onLater}
      open
      testID="auto-write-setup"
      title={T.title}
    >
      <View>
        <Row
          label={T.rowAuto}
          trailing={<Toggle on={enabled} onChange={onToggle} testID="auto-write-setup-toggle" />}
        />
        <Row
          label={T.rowHour}
          onPress={onPickHour}
          testID="auto-write-setup-hour"
          trailing={<Value chevron text={targetHourText} />}
        />
        {platform === "android" && (
          <Row
            label={T.rowBattery}
            onPress={onOpenBattery}
            testID="auto-write-setup-battery"
            trailing={
              <Value
                chevron
                text={
                  batteryTag === "allowed" ? T.allowed : batteryTag === "denied" ? T.denied : ""
                }
              />
            }
          />
        )}
        <AppText variant="caption" style={{ marginTop: 10 }} testID="auto-write-setup-condition">
          {platform === "ios" ? T.conditionIos : T.conditionAndroid}
        </AppText>
      </View>
    </ConfirmDialog>
  );
}
