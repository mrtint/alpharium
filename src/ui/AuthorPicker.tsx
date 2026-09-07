/**
 * 설정 탭 "일기 작성자" 섹션 — 준비된 캐릭터 중 하나를 작성자로 고정한다 (029).
 *
 * 계약: specs/029-writing-flow-simplification/contracts/settings-sections.md S1
 *       (SS1·SS2)
 *       specs/034-enduser-nativewind-migration/contracts/enduser-screen-migration.md
 *       ES1·ES3·ES4·ES9·ES10
 *       specs/035-model-ready-welcome-naming/contracts/welcome-gate.md W17~W20
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면은 모델을 모른다**(원칙 III, `checkSourceFile` `UI_TOUCHES_MODEL`). persona
 * 이름·소개와 준비 여부만 props로 받는다 — 007 `CharacterPicker` 선례.
 *
 * 미준비 캐릭터의 다운로드 관리(멈춤·삭제·재개)는 이 섹션 아래의
 * `CharacterListScreen`이 그대로 맡는다(SS4). 여기서는 "작성자로 선택"만.
 *
 * 034 — `SelectRow`로 바꾸지 않는다: `SelectRow`는 선택 표식을 `"선택"`으로
 * 하드코딩하고 미준비 사유 캡션 슬롯이 없어, `author-picker.test.tsx`가 잠근
 * `"작성자"` 표식·`"아직 준비되지 않음"` 캡션을 낼 수 없다(research R2). 033
 * `DayPicker`와 같은 방식 — `AppText` + 토큰 + className 병행 + 모듈 상수.
 *
 * **035 — 준비된 캐릭터의 이름을 여기서 바꾼다**(FR-022). 헌법 1.4.0이 이름만
 * 사용자에게 열었다 — **소개(tagline)는 코드 안 고정값 그대로이며 편집 대상이
 * 아니다**(원칙 III). 미준비 캐릭터는 이름을 바꿀 수 없다(W17) — 먼저 받아야
 * 한다. 검증(빈 문자열·글자 수)은 조립부가 하고, 이 화면은 입력과 콜백만 맡는다
 * (W18 — 첫 만남과 같은 규칙을 공유하기 위해).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS, RADIUS } from "./theme/tokens";

export type AuthorOption = {
  /** persona 이름 (014) 또는 사용자가 지은 이름 (035). 모델 식별자가 아니다. */
  name: string;
  /** persona 소개 (014). **사용자가 바꿀 수 없다**(헌법 1.4.0). */
  tagline: string;
  /** 이 캐릭터를 지금 작성자로 고를 수 있는가 (003 readiness). */
  ready: boolean;
  /** 지금 작성자로 고정돼 있는가. */
  selected: boolean;
};

export type AuthorPickerProps = {
  /** CHARACTERS 순서대로. `App.tsx`(조립)가 persona·readiness를 계산해 넘긴다. */
  options: readonly AuthorOption[];
  /** index로 고른다 — 화면은 Character 심볼을 모른다. */
  onSelect: (index: number) => void;
  /**
   * 035 — 이름을 바꾼다 (FR-022·FR-025).
   *
   * **index로 넘긴다** — `onSelect`와 같은 이유로 화면은 `Character` 심볼을
   * 모른다. 빈 문자열을 넘기면 조립부가 기본 이름으로 되돌린다(W19).
   * 주지 않으면 편집 진입점이 나타나지 않는다.
   */
  onRename?: (index: number, name: string) => void;
  /** 035 — 입력 글자 수 상한 (FR-013). `naming.ts`의 값과 같아야 한다. */
  nameMaxLength?: number;
};

/**
 * 이름 입력 상한 (FR-013).
 *
 * `src/welcome/naming.ts`의 `NAME_MAX_LENGTH`와 같은 값이어야 하지만, 화면이 그
 * 모듈을 import할 수 없으므로(W14) 기본값으로 둔다. 어긋나면 계약 테스트가 잡는다.
 */
const DEFAULT_NAME_MAX_LENGTH = 12;

export function AuthorPicker({
  options,
  onSelect,
  onRename,
  nameMaxLength = DEFAULT_NAME_MAX_LENGTH,
}: AuthorPickerProps) {
  /** 지금 이름을 고치고 있는 줄. **파일에 저장하지 않는다** — 화면 로컬 상태다. */
  const [editing, setEditing] = useState<{ index: number; draft: string } | null>(null);

  return (
    <View className="gap-2" style={{ gap: 8 }} testID="author-picker">
      <AppText variant="sectionTitle">일기 작성자</AppText>
      {options.map((opt, index) => (
        <View key={opt.name} style={{ gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: opt.selected, disabled: !opt.ready }}
            className={`flex-row items-center justify-between py-3 px-3 rounded-card border ${
              opt.selected ? "border-accent" : "border-border"
            } ${!opt.ready ? "opacity-50" : ""}`}
            disabled={!opt.ready}
            onPress={() => onSelect(index)}
            style={[ROW, opt.selected ? ROW_SELECTED : null, !opt.ready ? ROW_DISABLED : null]}
            testID={`author-option-${index}`}
          >
            <View className="flex-1 gap-0.5" style={INFO}>
              <AppText variant="body">{opt.name}</AppText>
              <AppText variant="caption">{opt.tagline}</AppText>
              {!opt.ready && (
                <AppText variant="caption">아직 준비되지 않음 — 아래에서 내려받으세요</AppText>
              )}
            </View>
            {opt.selected && (
              <AppText variant="caption" style={{ color: COLORS.accent, fontWeight: "600" }}>
                작성자
              </AppText>
            )}
          </Pressable>

          {/*
            035 — **준비된 캐릭터만 이름을 바꿀 수 있다**(W17). 미준비 줄에는
            편집 진입점 자체가 없다 — 먼저 받아야 한다.
          */}
          {onRename !== undefined && opt.ready && editing?.index !== index && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditing({ index, draft: opt.name })}
              style={RENAME_BUTTON}
              testID={`author-rename-${index}`}
            >
              <AppText variant="caption" style={{ color: COLORS.accent }}>
                이름 바꾸기
              </AppText>
            </Pressable>
          )}

          {onRename !== undefined && opt.ready && editing?.index === index && (
            <View style={{ gap: 6 }} testID={`author-rename-editor-${index}`}>
              <TextInput
                accessibilityLabel="이름을 입력하세요"
                autoFocus
                className="border rounded-card px-3 py-2"
                maxLength={nameMaxLength}
                onChangeText={(draft) => setEditing({ index, draft })}
                placeholder="이름을 입력하세요"
                placeholderTextColor={COLORS.textMuted}
                style={INPUT}
                testID={`author-rename-input-${index}`}
                value={editing.draft}
              />
              <AppText variant="caption">비워 두면 원래 이름으로 돌아가요.</AppText>
              <View className="flex-row gap-2" style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onRename(index, editing.draft);
                    setEditing(null);
                  }}
                  style={RENAME_BUTTON}
                  testID={`author-rename-save-${index}`}
                >
                  <AppText variant="caption" style={{ color: COLORS.accent }}>
                    저장
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setEditing(null)}
                  style={RENAME_BUTTON}
                  testID={`author-rename-cancel-${index}`}
                >
                  <AppText variant="caption">취소</AppText>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * 034 — 색·모서리를 토큰에서 가져온다(032 패턴). NativeWind 변환은 Metro
 * 시점이라 jest에 없으므로 인라인 `style`을 함께 준다. 숫자는 레이아웃
 * 관용값만, 색은 반드시 `COLORS.*`다.
 *
 * **선택 행 테두리 굵기는 현행 `borderWidth: 1` 유지**(FR-009) — 033 `DayPicker`는
 * `border-2`로 굵혔으나 `AuthorPicker`의 현행값은 1이고, 굵기를 바꾸면 미세
 * 레이아웃 변화가 생긴다.
 */
const ROW = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: RADIUS.card,
} as const;

/** 고른 줄 — 테두리가 강조색이다(굵기는 1 그대로). */
const ROW_SELECTED = { borderColor: COLORS.accent, borderWidth: 1 } as const;

const ROW_DISABLED = { opacity: 0.5 } as const;

const INFO = { flex: 1, gap: 2 } as const;

/** 035 — 이름 편집 진입점·저장·취소. 행 자체보다 작고 조용하다. */
const RENAME_BUTTON = { paddingVertical: 6, paddingHorizontal: 12 } as const;

const INPUT = {
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: RADIUS.card,
  paddingHorizontal: 12,
  paddingVertical: 8,
  color: COLORS.text,
  backgroundColor: COLORS.surface,
} as const;
