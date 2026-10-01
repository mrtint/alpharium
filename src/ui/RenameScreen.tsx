/**
 * 설정의 이름 바꾸기 (055 FR-017, Clarification — 보드 `6c` ② 「이름 짓기(1a)와 같은 입력 화면」).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md R1~R3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 설정 겹 위에 한 겹 더 쌓이는 화면이다(`StackLayer`). 머리는 「‹ 설정」(보드의 하위 화면 뒤로 어휘) + 큰 제목 「이름」, 그
 * 아래 1a와 같은 입력줄(`NameField`)과 오른쪽 아래 「저장」이다. 1a의 표지·얼굴·인사는 첫 만남 연출이라 옮기지 않는다.
 *
 * **빈 이름이면 「저장」이 흐리고 눌리지 않는다**(보드 `6c` ② — 047의 1a 규칙 「흐리지 않는다」와 다르다, Clarification).
 * 앞뒤 공백을 자르고 12자 상한을 지키는 검증은 조립부의 `validateCharacterName`(035 W18) 한 곳이다 — 화면은 버튼을 잠글 뿐이다.
 * 뒤로(「‹ 설정」·시스템 뒤로)는 바꾸지 않고 닫는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { KeyboardAvoidingView, View } from "react-native";

import { Button } from "./components/Button";
import { NameField } from "./components/NameField";
import { SettingsFrame } from "./SettingsFrame";
import { SETTINGS_TEXT } from "./settings-text";

/** `WelcomeScreen`의 `NAME_INPUT_MAX_LENGTH`와 같다(화면은 `src/welcome/`을 import하지 않는다, W14). */
const NAME_INPUT_MAX_LENGTH = 12;

/** 047 실측 — edge-to-edge에서 키보드 높이가 하단 내비게이션 바(48dp)를 빼고 온다(AGENTS ★) */
const KEYBOARD_OFFSET = 48;

export function RenameScreen({
  initialName,
  onSave,
  onClose,
}: {
  /** 지금 부르는 이름 — 입력이 이것으로 채워져 열린다 */
  initialName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initialName);
  const empty = draft.trim() === "";
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={KEYBOARD_OFFSET}
      style={{ flex: 1 }}
    >
      <SettingsFrame
        backLabel={SETTINGS_TEXT.backToSettings}
        backTestID="rename-back"
        onBack={onClose}
        title={SETTINGS_TEXT.name}
      >
        <View style={{ gap: 24 }}>
          <NameField
            autoFocus
            counterTestID="rename-counter"
            inputTestID="rename-input"
            maxLength={NAME_INPUT_MAX_LENGTH}
            onChangeText={setDraft}
            placeholder={SETTINGS_TEXT.name}
            value={draft}
          />
          <View style={{ alignSelf: "flex-end" }}>
            <Button disabled={empty} onPress={() => onSave(draft)} testID="rename-save">
              {SETTINGS_TEXT.save}
            </Button>
          </View>
        </View>
      </SettingsFrame>
    </KeyboardAvoidingView>
  );
}
