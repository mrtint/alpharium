/**
 * 장소명 설정을 켜고 끄는 자리.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L1·L8
 *       specs/032-nativewind-ui-system/contracts/screen-migration.md SM5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`VisionPicker.tsx`와 같은 자리에 놓인다**(research.md §6) — 둘 다 「쓰기 전에
 * 고르는 것」이라는 같은 범주다.
 *
 * **켤 때 고지 문구가 그 자리에서 뜬다**(FR-006) — 좌표를 기기의 지도 서비스에
 * 물어본다는 사실을 그대로 알린다. 기본값은 "auto"다(029 FR-025).
 *
 * **032 — `SelectRow` 재사용으로 이관.** 옵션별 `testID`(`geocoding-<x>`)는
 * `optionTestID`로 유지. 고지 문구는 `SelectRow` 아래에 그대로 둔다(SM5).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { View } from "react-native";

import { AppText } from "./components/Text";
import { SelectRow } from "./components/SelectRow";
import type { GeocodingPreference } from "../app/geocoding-setting-store";

/** 029 — 3-상태. "자동"이 기본. */
const OPTIONS: readonly { mode: GeocodingPreference; name: string; hint: string }[] = [
  { mode: "auto", name: "자동", hint: "위치 권한이 있으면 이름으로, 없으면 비워 둔다" },
  { mode: "on", name: "켬", hint: "다닌 자리를 숫자 대신 이름으로 보여준다" },
  { mode: "off", name: "끔", hint: "장소 이름을 옮기지 않는다" },
];

export type GeocodingSettingToggleProps = {
  /** 지금 설정. **기본값은 "auto"다**(029 FR-025) */
  mode: GeocodingPreference;
  onSelect: (mode: GeocodingPreference) => void;
};

export function GeocodingSettingToggle({ mode, onSelect }: GeocodingSettingToggleProps) {
  return (
    <View style={{ gap: 6 }}>
      <SelectRow
        label="장소 이름으로 보기"
        options={OPTIONS.map((o) => ({ label: o.name, hint: o.hint }))}
        selectedIndex={OPTIONS.findIndex((o) => o.mode === mode)}
        onSelect={(index) => onSelect(OPTIONS[index].mode)}
        optionTestID={(index) => `geocoding-${OPTIONS[index].mode}`}
      />

      {/* L8, FR-006 — 켤 때(또는 자동일 때) 고지 문구. */}
      {mode !== "off" && (
        <AppText variant="caption" style={{ paddingHorizontal: 4 }}>
          좌표를 기기의 지도 서비스에 물어봅니다.
        </AppText>
      )}
    </View>
  );
}
