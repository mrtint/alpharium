/**
 * 필수 자산 다운로드 동의 안내 (045).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C9
 *       spec.md FR-001~FR-003·FR-002a
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **[확인/시작] 하나만 있다**(FR-002a) — 거부·건너뛰기 조작을 두지 않는다.
 * 필수 자산이라 앱이 동작하려면 결국 받아야 하므로, 040 `WaitingForDownload
 * Screen`이 "그만두기 경로가 없다"고 정한 것과 같은 논리를 여기 적용한다
 * (research.md R1, Clarifications 2026-09-19).
 *
 * **모델 식별자·자산 키·바이트 크기를 노출하지 않는다**(FR-003, C9) —
 * `essential-assets.ts`의 `ESSENTIAL_ASSET_KEYS`를 import하지 않는다. 화면이
 * 아는 것은 "사진을 읽는 모델"·"글을 쓰는 모델"이라는 역할 이름뿐이다(원칙 III).
 *
 * **RN 코어 `Modal`만 쓴다** — 새 Dialog 라이브러리를 추가하지 않는다
 * (research.md R5, 043·044 관례 계승).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Modal, View } from "react-native";

import { Button } from "./components/Button";
import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export type DownloadConsentDialogProps = {
  visible: boolean;
  /** 사용자가 [확인/시작]을 눌렀다 — 거부 콜백은 없다(FR-002a). */
  onConfirm: () => void;
};

/** 문구는 전부 사람이 쓴 고정 상수다(FR-003, 원칙 II). */
const TEXT = {
  title: "받을 것이 있어요",
  body: "일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.",
  confirm: "받을게요",
} as const;

export function DownloadConsentDialog({ visible, onConfirm }: DownloadConsentDialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={() => {}} transparent visible={visible}>
      <View style={BACKDROP}>
        <View style={CARD} testID="download-consent-dialog">
          <AppText variant="title">{TEXT.title}</AppText>
          <AppText variant="body">{TEXT.body}</AppText>

          {/* [확인/시작] 하나뿐이다 — 거부·건너뛰기 버튼을 두지 않는다(FR-002a). */}
          <Button onPress={onConfirm} testID="download-consent-confirm">
            {TEXT.confirm}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

/*
 * 032/043 — 색을 토큰에서 가져온다. 인라인 `style`은 jest에 NativeWind 변환이
 * 없어서다(043·044 관례).
 */
const BACKDROP = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(32,30,29,0.6)",
  paddingHorizontal: 24,
} as const;

const CARD = {
  width: "100%",
  maxWidth: 360,
  gap: 16,
  padding: 24,
  backgroundColor: COLORS.bg,
} as const;
