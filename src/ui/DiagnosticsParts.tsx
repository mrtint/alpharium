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
import { Platform, Pressable, ScrollView, View, type TextStyle } from "react-native";

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
  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 }}
      testID="diagnostics-probe-grid"
    >
      {AXES.map((axis) => {
        const cell = cells?.find((c) => c.axis === axis);
        const unknown = cell === undefined || cell.kind === "unknown";
        return (
          <View
            key={axis}
            style={{
              minWidth: 96,
              flexGrow: 1,
              flexBasis: 96,
              gap: 2,
              paddingVertical: 8,
              paddingHorizontal: 10,
              // 모름 칸 = 회색 면 + 회색 글자(보드 `6h` ④), 숫자 칸 = 면 없이 테두리
              ...(unknown
                ? { backgroundColor: SETTINGS.tagFill }
                : { borderWidth: 1, borderColor: COLORS.border }),
            }}
            testID={`diagnostics-probe-${axis}`}
          >
            <AppText style={LABEL}>{AXIS_LABEL[axis]}</AppText>
            {/* 값은 본문 글꼴이다 — 고정폭이 아니라 숫자와 「모름」이 같은 글꼴로 구분되는 것은 면 색뿐이다 */}
            <AppText
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
    <View style={{ gap: 8, paddingVertical: 8 }} testID="diagnostics-prompt-box">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PRESETS.map((preset) => {
          const on = preset.id === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              key={preset.id}
              onPress={() => setSelected(preset.id)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: on ? COLORS.text : COLORS.border,
                backgroundColor: on ? COLORS.text : "transparent",
              }}
              testID={`diagnostics-preset-${preset.id}`}
            >
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
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
            {`${preview.approxChars}자 (${T.sizeNote})`}
          </AppText>
          {/* 상자 안에서 따로 스크롤된다 — 화면 전체 스크롤과 다투지 않는다. 글자는 선택만 된다 */}
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 240, borderWidth: 1, borderColor: COLORS.border, padding: 10 }}
            testID="diagnostics-prompt-scroll"
          >
            <AppText selectable style={PROMPT} testID="diagnostics-prompt-text">
              {preview.text}
            </AppText>
          </ScrollView>
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

const LABEL: TextStyle = { fontSize: 12, color: COLORS.textMuted };
const VALUE_KNOWN: TextStyle = { fontSize: 15, fontWeight: "600", color: COLORS.text };
const VALUE_UNKNOWN: TextStyle = { fontSize: 15, color: COLORS.textMuted };
const PROMPT: TextStyle = {
  fontSize: 12,
  lineHeight: 18,
  color: COLORS.text,
  fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
};
