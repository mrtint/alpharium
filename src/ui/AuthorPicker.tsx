/**
 * 설정 탭 "일기 작성자" 섹션 — 준비된 캐릭터 중 하나를 작성자로 고정한다 (029).
 *
 * 계약: specs/029-writing-flow-simplification/contracts/settings-sections.md S1
 *       (SS1·SS2)
 *       specs/034-enduser-nativewind-migration/contracts/enduser-screen-migration.md
 *       ES1·ES3·ES4·ES9·ES10
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
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS, RADIUS } from "./theme/tokens";

export type AuthorOption = {
  /** persona 이름 (014). 모델 식별자가 아니다. */
  name: string;
  /** persona 소개 (014). */
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
};

export function AuthorPicker({ options, onSelect }: AuthorPickerProps) {
  return (
    <View className="gap-2" style={{ gap: 8 }} testID="author-picker">
      <AppText variant="sectionTitle">일기 작성자</AppText>
      {options.map((opt, index) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: opt.selected, disabled: !opt.ready }}
          className={`flex-row items-center justify-between py-3 px-3 rounded-card border ${
            opt.selected ? "border-accent" : "border-border"
          } ${!opt.ready ? "opacity-50" : ""}`}
          disabled={!opt.ready}
          key={opt.name}
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
