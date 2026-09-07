/**
 * 이 빌드가 잘못 만들어졌다 (006 FR-035b).
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *       specs/034-enduser-nativewind-migration/contracts/enduser-screen-migration.md
 *       ES1·ES6·ES12
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 환경 판정이 실패하면 추론 위치를 고를 수 없으므로 일기를 쓸 수 없다.
 *
 * **`prod`로 간주하고 진행하지 않는다** — 001이 거부한 「기본값으로 떨어지기」이며
 * 헌법 원칙 V 위반이다. 그렇다고 앱을 죽이지도 않는다(FR-035c): 시작 시점에 죽으면
 * 사용자도 개발자도 원인을 알 길이 없다.
 *
 * **여기서 지키는 것**:
 *  - **「다시 시도하라」로 말하지 않는다**(S10). 사용자가 고칠 수 있는 문제가 아니다 —
 *    그렇게 말하면 사용자가 고칠 수 있다고 오해하고 같은 일을 반복한다
 *  - **환경 변수 이름·값을 보이지 않는다**(원칙 III). 그것은 개발자 정보이며, 화면에
 *    올리면 사용자에게 뜻 없는 문자열을 떠넘기는 것이다
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { View } from "react-native";

import { AppText } from "./components/Text";

export function BuildErrorScreen() {
  return (
    <View className="flex-1 items-center justify-center" style={PAGE}>
      <AppText variant="title" style={{ textAlign: "center" }}>
        이 빌드는 잘못 만들어졌다
      </AppText>
      <AppText variant="body" style={{ textAlign: "center", opacity: 0.8 }}>
        앱이 어떤 환경으로 만들어졌는지 알 수 없어 일기를 쓸 수 없다. 이 앱을 만든 사람에게 알려야
        고쳐진다.
      </AppText>
    </View>
  );
}

/**
 * 034 — 레이아웃 관용값만(색·타이포는 `AppText`가 토큰에서 가져온다). NativeWind
 * 변환은 Metro 시점이라 jest에 없으므로 인라인 `style`을 함께 준다.
 */
const PAGE = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  gap: 12,
} as const;
