/**
 * 「나중에 받기」 뒤의 대기 화면 (074).
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG13·CG14, spec FR-006~FR-008
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 아무것도 받지 않은 채 기다리는 화면이다. 막다른 길이 아니다 — 「다시 확인하기」가 연결을 처음부터 다시 읽게 한다(Wi-Fi가 되었으면 표준 동의, 아직 모바일이면 모바일 동의).
 * 이 화면은 뒤로 가기를 가로채지 않고 앱을 스스로 닫지도 않는다(iOS에는 공식 방법이 없고, 두 플랫폼의 동작을 같게 둔다).
 * 진행률·바이트·모델 어휘가 없다 — 받는 중이 아니다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { View } from "react-native";

import { lazyText } from "../i18n/current";
import { Button } from "./components/Button";
import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export type DownloadDeferredScreenProps = {
  onRecheck: () => void;
};

const TEXT = lazyText((c) => c.consentGate.deferred);

export function DownloadDeferredScreen({ onRecheck }: DownloadDeferredScreenProps) {
  return (
    <View style={CONTAINER} testID="download-deferred">
      <AppText variant="title">{TEXT.title}</AppText>
      <AppText variant="body">{TEXT.body}</AppText>
      <Button onPress={onRecheck} testID="download-deferred-recheck">
        {TEXT.recheck}
      </Button>
    </View>
  );
}

/** 진행 화면(046)과 같은 바깥 여백 — 같은 첫 실행 흐름의 화면이다 */
const CONTAINER = {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 70,
  paddingBottom: 44,
  gap: 16,
  backgroundColor: COLORS.bg,
} as const;
