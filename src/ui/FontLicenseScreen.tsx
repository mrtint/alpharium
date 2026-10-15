/**
 * 083 — 서체 라이선스 화면(설정 「정보」 → 「서체 라이선스」 위에 쌓이는 겹의 본문).
 *
 * 계약: specs/083-pretendard-font/contracts/font-license-screen.md L3·L4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OFL 1.1은 서체를 배포할 때 저작권 고지와 라이선스 전문을 함께 두라고 요구한다 — 이 화면이 그 자리다(FR-013). 보드에 없는
 * 화면이라 설정 틀(`SettingsFrame`)을 그대로 쓰고 본문만 둔다: 안내 한 문단 → 서체 이름 → 라이선스 이름 → 전문.
 *
 * - **전문은 한 글자 부품에 통째로 둔다** — 자르거나 줄을 나누지 않는다(`numberOfLines` 없음).
 * - **스크롤 상자를 두지 않는다** — 스크롤은 `SettingsFrame`의 지면 하나다(060 「지면 안의 작은 스크롤 상자를 두지 않는다」).
 * - 문구는 카탈로그(`fontLicense`), 서체 이름은 `FONT.family`, 라이선스 이름·전문은 원문 모듈에서 온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { View } from "react-native";

import { AppText } from "./components/Text";
import { PRETENDARD_LICENSE_NAME, PRETENDARD_LICENSE_TEXT } from "./pretendard-license";
import { FONT_LICENSE_TEXT } from "./settings-text";
import { COLORS, FONT } from "./theme/tokens";

export function FontLicenseScreen() {
  return (
    <View style={{ gap: 16 }} testID="font-license-screen">
      <AppText>{FONT_LICENSE_TEXT.intro}</AppText>
      <View style={{ gap: 2 }}>
        <AppText variant="bodyStrong">{FONT.family}</AppText>
        <AppText variant="caption">{PRETENDARD_LICENSE_NAME}</AppText>
      </View>
      <AppText style={{ color: COLORS.text }} testID="font-license-text" variant="caption">
        {PRETENDARD_LICENSE_TEXT}
      </AppText>
    </View>
  );
}
