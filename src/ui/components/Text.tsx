/**
 * 032 — 알파리움 텍스트 스타일 세트 (contracts/ui-components.md UC5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RN 코어 `Text`에 타이포 토큰(`TYPE`)과 색 토큰을 얹은 래퍼. `variant`로
 * 제목·본문·강조·캡션을 고른다 — 화면이 `fontSize: 15` 같은 매직 숫자를 직접
 * 쓰지 않게 한다.
 *
 * **`className` + 인라인 style 둘 다 준다**: NativeWind className이 Metro에서
 * style로 컴파일되지만, jest·초기 렌더에서 확실히 크기가 잡히도록 `TYPE`
 * 상수를 style로도 직접 넣는다(둘은 같은 값 — `tokens.ts` 단일 출처). 색은
 * className(`text-text`/`text-textMuted`)으로.
 *
 * 색 스킴을 감지하지 않는다 — 031 계약(라이트 고정)을 컴포넌트 계층까지 지킨다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Text as RNText, type TextProps } from "react-native";

import { COLORS, TYPE } from "../theme/tokens";

export type TextVariant = "title" | "sectionTitle" | "body" | "bodyStrong" | "caption";

export type AppTextProps = TextProps & {
  variant?: TextVariant;
};

const COLOR_CLASS: Record<TextVariant, string> = {
  title: "text-text",
  sectionTitle: "text-text",
  body: "text-text",
  bodyStrong: "text-text",
  caption: "text-textMuted",
};

const COLOR_VALUE: Record<TextVariant, string> = {
  title: COLORS.text,
  sectionTitle: COLORS.text,
  body: COLORS.text,
  bodyStrong: COLORS.text,
  caption: COLORS.textMuted,
};

export function AppText({ variant = "body", style, className, ...rest }: AppTextProps) {
  const type = TYPE[variant];
  return (
    <RNText
      className={[COLOR_CLASS[variant], className].filter(Boolean).join(" ")}
      style={[
        {
          fontSize: type.fontSize,
          fontWeight: type.fontWeight,
          lineHeight: type.lineHeight,
          color: COLOR_VALUE[variant],
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** 편의 별칭 — `<Title>제목</Title>` 꼴. */
export const Title = (p: Omit<AppTextProps, "variant">) => <AppText variant="title" {...p} />;
export const Body = (p: Omit<AppTextProps, "variant">) => <AppText variant="body" {...p} />;
export const Caption = (p: Omit<AppTextProps, "variant">) => <AppText variant="caption" {...p} />;
