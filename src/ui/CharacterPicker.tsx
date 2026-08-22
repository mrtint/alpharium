/**
 * 캐릭터를 고르는 자리.
 *
 * 계약: specs/007-diary-ui-refinement/contracts/selection.md §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 헌법 원칙 III이 요구하는 「고르는 행위」가 여기서 화면에 생긴다.**
 *
 * 006까지 `App.tsx`가 준비된 것 중 **먼저 나오는 하나를 말없이 집었다.** 다섯을 다
 * 준비해 두어도 사용자는 누가 자기 일기를 썼는지 모르고 바꿀 수도 없었다.
 * 006 실측에서 `quiet`은 지어낸 것 0건, `imaginative`는 2건이었다 — **그 차이를
 * 사용자가 통제할 수 있어야 한다.**
 *
 * **이 파일은 `roster.ts`도 `ModelAsset`도 import 하지 않는다.** 자산키·주소·크기·
 * 지문에 닿는 경로가 아예 없으므로 **조심해서 안 쓰는 것이 아니라 쓸 수 없다**
 * (003의 `CharacterListScreen`과 같은 방어, FR-007).
 *
 * **★ 014 — 이름과 소개는 `persona.ts`에서 온다.** `persona.ts`도 `roster.ts`를
 * import하지 않으므로(계약 P2) 이 파일이 persona를 거쳐도 모델 자산에는 여전히
 * 닿지 않는다. 소개 문구는 지어낸 것이 아니라 로드맵 문서가 005~012의 실측을
 * 사람 말로 옮겨 이미 확정해 둔 값이다(원칙 III).
 *
 * **추천하거나 미리 고르지 않는다**(FR-008). 다섯이 같은 자격으로 보인다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

import { personaOf } from "../diary/persona";
import type { Character } from "../diary/types";

export type CharacterPickerProps = {
  /**
   * 다섯 자리와 각각이 쓸 수 있는지.
   *
   * **받는 것이 이것뿐이다** — 바이트·주소·지문·모델 식별자를 받지 않는다.
   * 003의 목록은 저장 공간 관리를 위해 `usage`를 받았지만 **고르는 자리에는 그
   * 목적이 없다.**
   */
  characters: readonly { character: Character; ready: boolean }[];
  /** 지금 고른 것. 고른 적이 없으면 null (FR-008) */
  selected: Character | null;
  onSelect: (character: Character) => void;
};

/**
 * 헌법 로스터가 고지를 MUST로 요구한 캐릭터.
 *
 * **이것은 지어낸 성격 설명이 아니다**(FR-009 예외). 헌법 「로스터」가
 * "이 캐릭터는 상상을 섞는다는 것을 사용자에게 알린다(MUST)"고 적었고,
 * 006 실기기 실측이 그것을 뒷받침한다.
 */
const IMAGINATIVE_NOTICE = "상상을 섞어 씁니다";

export function CharacterPicker({ characters, selected, onSelect }: CharacterPickerProps) {
  const anyReady = characters.some((entry) => entry.ready);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>누가 쓸까</Text>

      {/* **준비된 것이 없으면 고를 수 없다**(FR-006). 006 FR-028의 안내와 같은 말이다 */}
      {!anyReady && (
        <Text style={styles.notice}>캐릭터를 먼저 준비해야 한다. 캐릭터 탭에서 받는다.</Text>
      )}

      {/* 다섯 자리가 **처음부터 전부** 보인다(003 FR-005a). 고를 대상이 보이지 않으면 고를 수 없다 */}
      {characters.map(({ character, ready }) => {
        const isSelected = ready && selected === character;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready, selected: isSelected }}
            disabled={!ready}
            key={character}
            onPress={() => onSelect(character)}
            style={[styles.row, isSelected && styles.rowSelected, !ready && styles.rowDisabled]}
          >
            <View style={styles.info}>
              {/* 014 — persona.ts의 이름·소개로 보인다(FR-001·004) */}
              <Text style={styles.name}>{personaOf(character).name}</Text>
              <Text style={styles.hint}>{personaOf(character).tagline}</Text>

              {/*
                **헌법 로스터가 MUST로 요구한 고지**. 소개 문구와는 별개다 — 소개는
                강점의 언어로 쓴 사람이 지은 문구이고, 이 고지는 헌법 본문이 MUST로
                요구한 사실 전달이다(둘을 하나로 합치면 고지가 소개에 묻혀 사라질
                위험이 있다). 나머지 넷에는 이 줄이 붙지 않는다.
              */}
              {character === "imaginative" && <Text style={styles.hint}>{IMAGINATIVE_NOTICE}</Text>}

              {/* **「받아야 함」이지 「3.2GB를 받아야 함」이 아니다** — 크기는 모델 규모를 드러낸다 */}
              {!ready && <Text style={styles.hint}>아직 준비되지 않았다</Text>}
            </View>

            {isSelected && <Text style={styles.mark}>고름</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { fontSize: 15, fontWeight: "600" },
  notice: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 6,
  },
  rowSelected: { borderWidth: 2, borderColor: "#333" },
  rowDisabled: { opacity: 0.4 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15 },
  hint: { fontSize: 12, opacity: 0.7 },
  mark: { fontSize: 12, opacity: 0.7 },
});
