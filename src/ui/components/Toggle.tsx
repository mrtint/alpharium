/**
 * 032 — 토글/스위치 (contracts/ui-components.md UC6).
 *
 * RN 코어 `Switch` 래퍼. `trackColor`/`thumbColor`를 토큰(accent/surface)으로
 * 맞춘다. (옛 `GeocodingSettingToggle`은 056이 걷었다 — 장소명은 설정의 행 + 대화상자다.)
 *
 * controlled — `value`를 prop으로 받고 `onValueChange`만 호출한다(상태를 소유하지
 * 않음).
 */

import { Switch } from "react-native";

import { COLORS } from "../theme/tokens";

export type ToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
};

export function Toggle({ value, onValueChange, disabled = false, testID }: ToggleProps) {
  return (
    <Switch
      disabled={disabled}
      onValueChange={onValueChange}
      testID={testID}
      thumbColor={COLORS.surface}
      trackColor={{ false: COLORS.border, true: COLORS.accent }}
      value={value}
    />
  );
}
