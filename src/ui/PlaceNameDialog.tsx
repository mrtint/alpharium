/**
 * 장소 이름으로 보기 대화상자 (056, 보드 `6l`).
 *
 * 계약: specs/056-settings-time-place/contracts/settings-time-place.md PD1~PD3, spec FR-021~FR-027
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **칸을 누르면 바로 적용한다**(보드 `6l` ②) — 지금과 다른 칸이면 그 값을 한 번 올리고, 같은 칸이면 닫기만 한다. 저장과
 * 「켬」의 위치 권한 요청은 조립부가 한다(FR-024·FR-025) — 이 부품은 기기·저장에 닿지 않는다.
 *
 * 지도 고지는 017 FR-006(「좌표를 기기의 지도 서비스에 물어봅니다.」)을 해요체로 옮겨 칸 목록 아래에 늘 둔다(056 FR-026).
 * 029의 3상태 값(`GeocodingPreference`)은 그대로다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef } from "react";
import { Pressable, View, type TextStyle } from "react-native";

import type { GeocodingPreference } from "../app/geocoding-setting-store";
import { DialogCancelButton, DismissibleDialog } from "./components/Dialog";
import { AppText } from "./components/Text";
import { SETTINGS_TEXT } from "./settings-text";
import { COLORS, SETTINGS } from "./theme/tokens";

const P = SETTINGS.placeDialog;

/** 보드 `6l`의 칸 순서와 문구 */
const OPTIONS: readonly { mode: GeocodingPreference; name: string; desc: string }[] = [
  { mode: "auto", name: SETTINGS_TEXT.placeAuto, desc: SETTINGS_TEXT.placeAutoDesc },
  { mode: "on", name: SETTINGS_TEXT.placeOn, desc: SETTINGS_TEXT.placeOnDesc },
  { mode: "off", name: SETTINGS_TEXT.placeOff, desc: SETTINGS_TEXT.placeOffDesc },
];

export type PlaceNameDialogProps = {
  open: boolean;
  value: GeocodingPreference;
  /** 지금과 다른 칸을 눌렀을 때 한 번 */
  onSelect: (mode: GeocodingPreference) => void;
  onClose: () => void;
};

export function PlaceNameDialog({ open, value, onSelect, onClose }: PlaceNameDialogProps) {
  const done = useRef(false);

  const press = (mode: GeocodingPreference) => {
    if (done.current) return;
    done.current = true;
    if (mode === value) onClose();
    else onSelect(mode);
  };

  return (
    <DismissibleDialog
      onClose={onClose}
      open={open}
      testID="place-name-dialog"
      title={SETTINGS_TEXT.placeTitle}
    >
      <View style={{ gap: P.optionGap }}>
        {OPTIONS.map(({ mode, name, desc }) => {
          const selected = mode === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={mode}
              onPress={() => press(mode)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: P.markGap,
                paddingVertical: P.optionPaddingV,
                paddingHorizontal: P.optionPaddingH,
                // 보드 — 선택 칸 2px, 아닌 칸 1px + 바깥 1 여백으로 크기를 맞춘다.
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? COLORS.text : COLORS.border,
                margin: selected ? 0 : 1,
              }}
              testID={`place-name-${mode}`}
            >
              <View
                style={{
                  width: P.markSize,
                  height: P.markSize,
                  marginTop: P.markTop,
                  ...(selected
                    ? { backgroundColor: COLORS.accent }
                    : { borderWidth: 1, borderColor: SETTINGS.chevron }),
                }}
                testID={`place-name-${mode}-mark`}
              />
              <View style={{ flexShrink: 1, gap: P.descGap }}>
                <AppText
                  style={{
                    fontSize: P.nameSize,
                    lineHeight: P.nameSize * SETTINGS.boardLineHeightRatio,
                    fontWeight: selected ? "800" : "600",
                  }}
                >
                  {name}
                </AppText>
                <AppText style={DESC}>{desc}</AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <AppText style={NOTICE} testID="place-name-notice">
        {SETTINGS_TEXT.placeNotice}
      </AppText>

      <DialogCancelButton onPress={onClose} testID="place-name-cancel">
        {SETTINGS_TEXT.placeCancel}
      </DialogCancelButton>
    </DismissibleDialog>
  );
}

const DESC: TextStyle = {
  fontSize: P.descSize,
  lineHeight: P.descSize * P.descLineHeightRatio,
  color: COLORS.textMuted,
};

const NOTICE: TextStyle = {
  fontSize: P.noticeSize,
  lineHeight: P.noticeSize * SETTINGS.boardLineHeightRatio,
  color: COLORS.textMuted,
};
