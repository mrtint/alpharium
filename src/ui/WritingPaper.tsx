/**
 * 쓰는 중 홈의 지면 — 머리말·캐릭터 혼잣말·안내 줄 (054, 보드 `2b`).
 *
 * 계약: specs/054-in-place-writing/contracts/writing-in-place.md W2·W6·W7·W9·W10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 어떤 줄을 보일지는 부르는 쪽(`DiaryHomeScreen`)이 `pickMonologue`로 정해 `line`으로
 * 넘긴다 — 이 부품은 문자열만 받는다(진행률·시간·글 조각이 들어올 자리가 없다, 원칙 IV·FR-007).
 *
 * **혼잣말은 페이드로 교체된다**(타자기 없음 — 039를 대체). 줄이 바뀌면 이전 줄이 나가는 겹(절대 배치, 1 → 0)으로 남고
 * 새 줄이 들어오는 겹(0 → 1)이다. 겹마다 `key`로 새로 마운트하고 시작 투명도를 마운트 값으로 준다(`FadeLayer` — effect로
 * 되돌리면 첫 프레임이 샌다, 049 실기기). 높이는 새 줄 하나가 잡는다. **jest는 배선만 본다**(C9) — 실제로 겹치는지는
 * 실기기 녹화(quickstart D3).
 *
 * 지면 배경은 **연회색이 아니라 배경색**이다(보드 `2b` 마크업 — 쓴 날의 지면과 다르다). 안쪽 여백 32/20/120:
 * 아래 120은 하단 「그만두기」 바가 덮는 자리다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { View } from "react-native";

import { FadeLayer } from "./components/FadeLayer";
import { AppText } from "./components/Text";
import { WRITING_TEXT } from "./home-text";
import { COLORS, WRITING } from "./theme/tokens";

const MONOLOGUE_STYLE = {
  color: COLORS.text,
  fontSize: WRITING.monologue.fontSize,
  fontWeight: WRITING.monologue.fontWeight,
  lineHeight: WRITING.monologue.lineHeight,
  letterSpacing: WRITING.monologue.letterSpacing,
} as const;

export function WritingPaper({ line, name }: { line?: string; name?: string }) {
  const text = line ?? WRITING_TEXT.fallback;

  // 렌더 중 이전 값 기억(049 `DayHeading`과 같은 방식) — effect 안 동기 `setState`는 lint가 막는다.
  const [shown, setShown] = useState<{ text: string; previous: string | null }>({
    text,
    previous: null,
  });
  if (shown.text !== text) setShown({ text, previous: shown.text });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingTop: WRITING.paperPadding.top,
        paddingHorizontal: WRITING.paperPadding.horizontal,
        paddingBottom: WRITING.paperPadding.bottom,
        gap: WRITING.gap,
      }}
      testID="writing-paper"
    >
      <AppText
        style={{
          color: COLORS.accent,
          fontSize: WRITING.kicker.fontSize,
          fontWeight: WRITING.kicker.fontWeight,
          letterSpacing: WRITING.kicker.letterSpacing,
        }}
        testID="writing-kicker"
      >
        {WRITING_TEXT.kicker}
      </AppText>

      <View testID="writing-monologue">
        {shown.previous !== null && (
          <FadeLayer
            durationMs={WRITING.fadeMs}
            from={1}
            key={`out-${shown.previous}-${shown.text}`}
            style={{ position: "absolute", top: 0, left: 0, right: 0 }}
            testID="writing-monologue-fade-out"
            to={0}
          >
            <AppText style={MONOLOGUE_STYLE}>{shown.previous}</AppText>
          </FadeLayer>
        )}
        {/* 처음 나타날 때(이전 줄 없음)는 나타나는 효과 없이 바로 보인다 */}
        <FadeLayer
          durationMs={WRITING.fadeMs}
          from={shown.previous === null ? 1 : 0}
          key={`in-${shown.text}`}
          to={1}
        >
          <AppText style={MONOLOGUE_STYLE} testID="writing-monologue-text">
            {shown.text}
          </AppText>
        </FadeLayer>
      </View>

      {name !== undefined && (
        <AppText
          style={{
            color: COLORS.textMuted,
            fontSize: WRITING.byline.fontSize,
            lineHeight: WRITING.byline.lineHeight,
          }}
          testID="writing-byline"
        >
          {WRITING_TEXT.byline(name)}
        </AppText>
      )}
    </View>
  );
}
