/**
 * 진단 화면 전용 부품 (060, 보드 `6h`) — 신호 칸·프리셋 전환·프롬프트 상자.
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md DS4·DS5·DS8·DS10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 원칙 IV — 이 화면이 원칙을 어기기 가장 쉬운 자리다.** 추론 속도·출력 점수·모델 비교를 여기에 넣지 않는다. 상태를 보일 뿐
 * 품질을 재지 않는다. **원칙 III** — 모델 이름·파라미터 수·양자화 표기를 두지 않는다.
 *
 * 이 파일은 신호·권한·파이프라인에 닿지 않는다 — 값은 `src/app/diagnostics-view.ts`가 옮긴 문자열·태그로만 받는다
 * (헌법 검사 `UI_TOUCHES_PROMPT`·`DIAGNOSTICS_HIDES_AXES`, 화면 소스 계약 DS8). 신호 칸은 **다섯 축을 다 그린다**(012 FR-009).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Platform, Pressable, View, type TextStyle } from "react-native";

import { DIAGNOSTICS_TEXT as T } from "../app/diagnostics-text";
import type { ProbeAxis, ProbeCell } from "../app/diagnostics-view";
import type { PromptPreview } from "../diagnostics/types";
import { AppText } from "./components/Text";
import { COLORS, SETTINGS } from "./theme/tokens";

const AXIS_LABEL: Readonly<Record<ProbeAxis, string>> = {
  photos: T.probePhotos,
  places: T.probePlaces,
  steps: T.probeSteps,
  battery: T.probeBattery,
  network: T.probeNetwork,
};

/** 다섯 칸 — 읽기 전에는 값이 빈 모름 모양이다(아직 읽지 않았다는 사실을 「모름」이라고 말하지 않는다) */
const AXES: readonly ProbeAxis[] = ["photos", "places", "steps", "battery", "network"];

export function ProbeGrid({ cells }: { cells: readonly ProbeCell[] | null }) {
  // 보드 `6h` ④ — 다섯 칸이 한 줄이다: 위 2px 선·아래 1px 선, 칸마다 왼쪽 1px 선, 모름 칸은 회색 면
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 2,
        borderTopColor: COLORS.text,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
      testID="diagnostics-probe-grid"
    >
      {AXES.map((axis, index) => {
        const cell = cells?.find((c) => c.axis === axis);
        const unknown = cell === undefined || cell.kind === "unknown";
        return (
          <View
            key={axis}
            style={{
              flex: 1,
              minWidth: 0,
              gap: 6,
              paddingTop: 10,
              paddingBottom: 12,
              paddingLeft: 8,
              ...(index > 0 ? { borderLeftWidth: 1, borderLeftColor: COLORS.border } : {}),
              // 모름 칸 = 회색 면 + 회색 글자, 숫자 칸 = 면 없음
              ...(unknown ? { backgroundColor: SETTINGS.tagFill } : {}),
            }}
            testID={`diagnostics-probe-${axis}`}
          >
            {/* 한 줄에 다섯 칸이라 글꼴 2.0배에서는 「배터리」가 낱글자로 갈라진다 — 칸 안의 글자만 1.4배까지 키운다 */}
            <AppText maxFontSizeMultiplier={1.4} style={LABEL}>
              {AXIS_LABEL[axis]}
            </AppText>
            <AppText
              maxFontSizeMultiplier={1.4}
              style={unknown ? VALUE_UNKNOWN : VALUE_KNOWN}
              testID={`diagnostics-probe-${axis}-value`}
            >
              {cell?.text ?? ""}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/** 프리셋 id — 진단 계층 `SIGNAL_PRESETS`의 `empty`·`photos`와 같다(테스트가 맞춰 잠근다) */
export type PresetId = "empty" | "photos";

const PRESETS: readonly { id: PresetId; label: string }[] = [
  { id: "empty", label: T.preset1 },
  { id: "photos", label: T.preset2 },
];

export function PromptPreviewBox({
  previews,
}: {
  previews: Readonly<Record<string, PromptPreview>> | null;
}) {
  const [selected, setSelected] = useState<PresetId>("empty");
  const preview = previews?.[selected];

  return (
    <View style={{ gap: 8 }} testID="diagnostics-prompt-box">
      {/* 보드 `6h` ⑤ — 두 칸이 한 덩어리인 전환 막대: 2px 테두리, 높이 34, 고른 칸은 검정 면 */}
      <View style={{ flexDirection: "row", borderWidth: 2, borderColor: COLORS.text }}>
        {PRESETS.map((preset) => {
          const on = preset.id === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              key={preset.id}
              onPress={() => setSelected(preset.id)}
              style={{
                flex: 1,
                minHeight: 34,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
                backgroundColor: on ? COLORS.text : "transparent",
              }}
              testID={`diagnostics-preset-${preset.id}`}
            >
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: on ? "800" : "600",
                  textAlign: "center",
                  color: on ? COLORS.bg : COLORS.text,
                }}
              >
                {preset.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {preview === undefined ? null : preview.ok ? (
        <>
          <AppText style={LABEL} testID="diagnostics-prompt-size">
            {T.approxChars(preview.approxChars, T.sizeNote)}
          </AppText>
          {/* 상자 안에서 따로 스크롤하지 않는다 — 지면 안의 작은 스크롤 상자는 끝에 닿은 손가락을 바깥 지면으로 넘겨(안드로이드 중첩 스크롤)
              읽다가 화면 전체가 흐르고 마지막 줄이 잘렸다. 본문을 다 펼치고 지면 하나로만 스크롤한다. 글자는 선택만 된다 */}
          <View
            style={{
              backgroundColor: COLORS.bg,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 12,
            }}
            testID="diagnostics-prompt-box-body"
          >
            <AppText selectable style={PROMPT} testID="diagnostics-prompt-text">
              {preview.text}
            </AppText>
          </View>
        </>
      ) : (
        // 조립하지 못했으면 이유만 — 본문 자리를 비운다
        <AppText style={VALUE_KNOWN} testID="diagnostics-prompt-text">
          {T.previewFailed(preview.reason)}
        </AppText>
      )}
    </View>
  );
}

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });
/** 보드 `6h` ④ — 칸 라벨 11/600, 숫자는 고정폭 15/700, 모름은 14/600 회색 */
const LABEL: TextStyle = { fontSize: 11, fontWeight: "600", color: COLORS.textMuted };
const VALUE_KNOWN: TextStyle = {
  fontSize: 15,
  fontWeight: "700",
  fontFamily: MONO,
  color: COLORS.text,
};
const VALUE_UNKNOWN: TextStyle = { fontSize: 14, fontWeight: "600", color: COLORS.textMuted };
const PROMPT: TextStyle = {
  fontSize: 12,
  lineHeight: 18,
  color: COLORS.text,
  fontFamily: MONO,
};
