import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTERS, type Character } from "../diary/types";
import type { PromptPreviewSet } from "../diagnostics/types";

/**
 * 입력 프롬프트 미리보기 패널 (022, local·dev 전용).
 *
 * **화면은 진단 리포트의 문자열만 받는다.** `diary/prompt`도 `signals`도 import하지
 * 않는다 — `report.promptPreviews`가 이미 `buildPrompt()`의 출력을 담아 왔다(FR-008,
 * 헌법 검사가 이 경계를 잠근다). 이 컴포넌트가 하는 일은 캐릭터를 골라 프리셋별
 * 프롬프트 원본과 근사 크기를 그리는 것뿐이다.
 *
 * **원칙 IV** — 크기 값은 문자 수이며 "조립 시점 근사치, 실측 토큰 아님"이라고 라벨을
 * 붙인다(FR-011). 여러 실행을 비교하거나 순위를 매기지 않는다.
 */
export function PromptPreviewPanel({
  previews,
  presetLabels,
}: {
  previews: Readonly<Record<Character, PromptPreviewSet>>;
  /** 프리셋 id → 화면 라벨. 진단 계층의 `SIGNAL_PRESETS`에서 온다 */
  presetLabels: Readonly<Record<string, string>>;
}) {
  const [selected, setSelected] = useState<Character>(CHARACTERS[0]);
  const set = previews[selected];
  const presetIds = Object.keys(set);

  return (
    <View style={styles.container} testID="prompt-preview-panel">
      <Text style={styles.title}>입력 프롬프트 미리보기</Text>

      <View style={styles.characterRow}>
        {CHARACTERS.map((character) => (
          <Pressable
            key={character}
            testID={`prompt-preview-character-${character}`}
            onPress={() => setSelected(character)}
            style={[styles.chip, character === selected && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{character}</Text>
          </Pressable>
        ))}
      </View>

      {presetIds.map((presetId) => {
        const preview = set[presetId];
        const label = presetLabels[presetId] ?? presetId;
        return (
          <View key={presetId} style={styles.preset}>
            <Text style={styles.presetLabel}>{label}</Text>
            {preview.ok ? (
              <>
                <Text style={styles.size} testID={`prompt-preview-size-${selected}-${presetId}`}>
                  {preview.approxChars}자 (조립 시점 근사치, 실측 토큰 아님)
                </Text>
                <Text
                  selectable
                  style={styles.prompt}
                  testID={`prompt-preview-${selected}-${presetId}`}
                >
                  {preview.text}
                </Text>
              </>
            ) : (
              <Text style={styles.failure} testID={`prompt-preview-${selected}-${presetId}`}>
                조립할 수 없음: {preview.reason}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginTop: 8 },
  title: { fontSize: 12, opacity: 0.6 },
  characterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  chipSelected: { backgroundColor: "rgba(0,0,0,0.08)" },
  chipText: { fontSize: 12 },
  preset: { gap: 2, marginTop: 4 },
  presetLabel: { fontSize: 13, fontWeight: "600" },
  size: { fontSize: 11, opacity: 0.6 },
  prompt: { fontSize: 12, fontFamily: "monospace" },
  failure: { fontSize: 13 },
});
