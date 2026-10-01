/**
 * 매일 쓰는 시각 대화상자 (056, 보드 `6f`).
 *
 * 계약: specs/056-settings-time-place/contracts/settings-time-place.md TD1~TD6, spec FR-007~FR-017
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않는다** — 칸 목록·칸 ↔ 시·미리보기 문장은 `src/app/target-hour.ts`가 주고, 시간대 줄은 조립부가 만든 문자열을
 * 받는다(FR-037). 기기에도 저장에도 닿지 않는다.
 *
 * **칸을 누르면 바로 적용한다**(056 Clarification Q4 — 보드 `6f` ⑤의 「저장」을 뒤집었다). 오전/오후 칸은 선택만 바꾸고,
 * 시 칸을 누르면 그 시를 올린다(같은 시면 닫기만). 그래서 「저장」 버튼이 없고 「취소」 하나다. 첫 누름 뒤에는 잠가 연타를
 * 한 번으로 만든다(TD6).
 *
 * 오전/오후는 이 부품의 로컬 state이고 저장된 시에서 시작한다. 조립부가 열려 있을 때만 이 부품을 그리므로 열 때마다 새로
 * 마운트되어 바꾸다 만 오전/오후가 남지 않는다(FR-017).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState } from "react";
import { Pressable, View, type TextStyle, type ViewStyle } from "react-native";

import {
  cellOf,
  hourCells,
  hourOfCell,
  meridiemOf,
  previewSentence,
  type HourFormat,
  type Meridiem,
} from "../app/target-hour";
import { DialogCancelButton, DismissibleDialog } from "./components/Dialog";
import { AppText } from "./components/Text";
import { SETTINGS_TEXT } from "./settings-text";
import { COLORS, SETTINGS } from "./theme/tokens";

const T = SETTINGS.timeDialog;

export type TargetHourDialogProps = {
  open: boolean;
  /** 저장된 시(0–23) */
  hour: number;
  format: HourFormat;
  /** 「이 휴대폰의 시간대 · 서울 (GMT+9)」. 못 읽었으면 `null` — 줄을 그리지 않는다 */
  timeZoneLine: string | null;
  /** 저장된 시와 다른 칸을 눌렀을 때 그 시로 한 번 */
  onSelect: (hour: number) => void;
  onClose: () => void;
};

export function TargetHourDialog({
  open,
  hour,
  format,
  timeZoneLine,
  onSelect,
  onClose,
}: TargetHourDialogProps) {
  const [meridiem, setMeridiem] = useState<Meridiem>(() => meridiemOf(hour));
  const done = useRef(false);

  /** 지금 선택 상태가 가리키는 시 — 12시간은 저장된 칸 + 지금 오전/오후(FR-010), 24시간은 저장된 시 */
  const shownHour = format === "h12" ? hourOfCell(cellOf(hour), meridiem) : hour;
  const hourOf = (cell: number) => (format === "h12" ? hourOfCell(cell, meridiem) : cell);

  const pressCell = (cell: number) => {
    if (done.current) return;
    done.current = true;
    const picked = hourOf(cell);
    if (picked === hour) onClose();
    else onSelect(picked);
  };

  const columns = format === "h12" ? T.columns12 : T.columns24;

  return (
    <DismissibleDialog
      onClose={onClose}
      open={open}
      subtitle={timeZoneLine ?? undefined}
      subtitleTestID="target-hour-tz"
      testID="target-hour-dialog"
      title={SETTINGS_TEXT.timeTitle}
    >
      {format === "h12" && (
        <View style={MERIDIEM_ROW}>
          {(["am", "pm"] as const).map((m) => {
            const selected = m === meridiem;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={m}
                onPress={() => setMeridiem(m)}
                style={[MERIDIEM_CELL, selected && { backgroundColor: COLORS.text }]}
                testID={`target-hour-${m}`}
              >
                <AppText
                  style={{
                    fontSize: T.meridiemSize,
                    lineHeight: T.meridiemSize * SETTINGS.boardLineHeightRatio,
                    fontWeight: selected ? "800" : "600",
                    color: selected ? COLORS.bg : COLORS.text,
                  }}
                >
                  {m === "am" ? SETTINGS_TEXT.timeAm : SETTINGS_TEXT.timePm}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={GRID} testID="target-hour-grid">
        {hourCells(format).map((cell) => {
          const cellHour = hourOf(cell);
          const selected = cellHour === shownHour;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={cell}
              onPress={() => pressCell(cell)}
              style={[
                CELL,
                { width: `${100 / columns}%` },
                selected && { backgroundColor: COLORS.accent },
              ]}
              testID={`target-hour-cell-${cellHour}`}
            >
              <AppText
                style={{
                  fontSize: T.cellSize,
                  lineHeight: T.cellSize * SETTINGS.boardLineHeightRatio,
                  fontWeight: selected ? "800" : "600",
                  fontVariant: ["tabular-nums"],
                  color: selected ? COLORS.accentForeground : COLORS.text,
                }}
              >
                {String(cell)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText style={PREVIEW} testID="target-hour-preview">
        {previewSentence(shownHour, format)}
      </AppText>

      <DialogCancelButton onPress={onClose} testID="target-hour-cancel">
        {SETTINGS_TEXT.timeCancel}
      </DialogCancelButton>
    </DismissibleDialog>
  );
}

const MERIDIEM_ROW: ViewStyle = {
  flexDirection: "row",
  borderWidth: 2,
  borderColor: COLORS.text,
};

const MERIDIEM_CELL: ViewStyle = {
  flex: 1,
  height: T.meridiemHeight,
  alignItems: "center",
  justifyContent: "center",
};

/** 보드 — 격자는 위·왼쪽 1px 구분선, 칸은 오른쪽·아래 1px 구분선 */
const GRID: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderColor: COLORS.border,
};

const CELL: ViewStyle = {
  height: T.cellHeight,
  alignItems: "center",
  justifyContent: "center",
  borderRightWidth: 1,
  borderBottomWidth: 1,
  borderColor: COLORS.border,
};

const PREVIEW: TextStyle = {
  fontSize: T.previewSize,
  lineHeight: T.previewSize * T.previewLineHeightRatio,
  color: COLORS.textMuted,
};
