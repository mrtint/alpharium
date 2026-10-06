/**
 * 쓸 재료 — 안 쓴 날의 두 칸 (053, 보드 `1d` ④·`2l`·`2e`).
 *
 * 계약: specs/053-writing-material/contracts/material.md GRID1~GRID8, SRC1·SRC3·SRC4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **제목 없이 숫자 두 칸만**, 칸 사이 구분선 없이 아래에만 1px. 읽기 전용이다(권한 없음 칸만 누를 수 있다).
 *
 * **세 갈래는 서로 다른 글자다**(원칙 V):
 * - 관측된 수 — 숫자 + 단위.
 * - 관측된 0 — 회색 `0` + 단위(숫자만 회색, 단위는 본색).
 * - 셀 수 없음 — 「모름」(0이 아니다). 사진 권한이 없어서일 때는 빨간 「권한이 없어요 ›」(아래).
 *
 * **화면은 `DaySignals`를 모른다**(009 이후 경계) — 개수로 좁혀진 `DayPreview`만 받는다. 문구 글자는
 * `home-text.ts`에서만 온다(C4). 색은 토큰만 쓴다(C5).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, View, type TextStyle, type ViewStyle } from "react-native";

import { allZero, fromCountHint } from "../app/material";
import type { CountHint, DayPreview } from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { useFontScale } from "./font-scale";
import { AppText } from "./components/Text";
import { MATERIAL_TEXT } from "./home-text";
import { COLORS, MATERIAL_GRID } from "./theme/tokens";

/** 신호 칸의 사진·장소 — 읽는 중이거나, 다 읽었거나 */
export type PreviewState = { kind: "loading"; day: DayDate } | DayPreview;

export type MaterialGridProps = {
  /** 없으면(통로 없음) 두 칸 「모름」 */
  preview?: PreviewState;
  /**
   * 「권한이 없어요 ›」를 눌렀다 — **요청하는 것은 사진 권한 하나다**(장소 수가 사진 좌표에서 나와 어느
   * 칸을 눌러도 같다, FR-011). 없으면 누름 처리를 두지 않는다.
   */
  onRequestPhoto?: () => void;
};

export function MaterialGrid({ preview, onRequestPhoto }: MaterialGridProps) {
  const loaded = preview !== undefined && "photos" in preview ? preview : undefined;
  // 사진 권한이 없으면 두 칸 모두 「권한이 없어요」다 — 장소 수가 사진 좌표에서 나오므로 사진을 못 보면
  // 장소도 못 센다. **권한이 있는데 못 읽은 것은 「모름」이다**(권한이 아니므로 누를 수 없다).
  const noPermission = loaded !== undefined && loaded.photoAccess !== "ok";
  const hint = (pick: (p: DayPreview) => CountHint): Display => {
    if (preview === undefined) return { kind: "unseen" };
    if (loaded === undefined) return { kind: "loading" };
    if (noPermission) return { kind: "no-permission" };
    return displayOf(pick(loaded));
  };

  const photos = hint((p) => p.photos);
  const places = hint((p) => p.places);

  // 권한 없음이 하나라도 있으면 안내 한 줄은 없다(FR-014) — 값이 남아 있어도(권한 조회와 신호 읽기 사이에
  // 권한이 바뀐 경우) 두 칸이 「권한이 없어요」로 보이는데 「기록 대신…」이 붙으면 앞뒤가 어긋난다.
  const showNote =
    loaded !== undefined &&
    !noPermission &&
    allZero(fromCountHint(loaded.photos), fromCountHint(loaded.places));

  return (
    <View style={COLUMN}>
      <View style={GRID} testID="signal-row">
        <Cell
          display={photos}
          label={MATERIAL_TEXT.photos}
          onRequest={onRequestPhoto}
          testID="signal-photos"
          unit={MATERIAL_TEXT.unitPhoto}
        />
        <Cell
          display={places}
          label={MATERIAL_TEXT.places}
          onRequest={onRequestPhoto}
          second
          testID="signal-places"
          unit={MATERIAL_TEXT.unitPlace}
        />
      </View>
      {showNote && (
        <AppText style={NOTE} testID="material-empty-note">
          {MATERIAL_TEXT.emptyNote}
        </AppText>
      )}
    </View>
  );
}

type Display =
  | { kind: "count"; count: number }
  | { kind: "zero" }
  | { kind: "no-permission" }
  | { kind: "unseen" }
  | { kind: "loading" };

function displayOf(hint: CountHint): Display {
  switch (hint.kind) {
    case "known":
      return hint.count >= 1 ? { kind: "count", count: hint.count } : { kind: "zero" };
    case "none":
      return { kind: "zero" };
    case "unknown":
      return { kind: "unseen" };
  }
}

function Cell({
  display,
  label,
  unit,
  testID,
  second,
  onRequest,
}: {
  display: Display;
  label: string;
  unit: string;
  testID: string;
  second?: boolean;
  onRequest?: () => void;
}) {
  const scale = useFontScale();
  return (
    <View
      style={[CELL, second ? { paddingLeft: MATERIAL_GRID.secondCellPaddingLeft } : null]}
      testID={`${testID}-cell`}
    >
      <AppText style={LABEL} testID={`${testID}-label`}>
        {label}
      </AppText>
      {/* testID는 값에 둔다 — 라벨과 값을 한 노드로 맞추면 「사진…」처럼 섞여 읽힌다 */}
      <View
        style={[VALUE_ROW, { minHeight: MATERIAL_GRID.number.lineHeight * scale }]}
        testID={testID}
      >
        {display.kind === "count" || display.kind === "zero" ? (
          <>
            <AppText
              allowFontScaling={false}
              style={[
                NUMBER,
                scaledNumeral(scale),
                display.kind === "zero" ? { color: COLORS.textMuted } : null,
              ]}
              testID={`${testID}-number`}
            >
              {display.kind === "count" ? String(display.count) : "0"}
            </AppText>
            <AppText style={UNIT} testID={`${testID}-unit`}>
              {unit}
            </AppText>
          </>
        ) : display.kind === "no-permission" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onRequest?.()}
            style={PERMISSION}
            testID={`${testID}-permission`}
          >
            <AppText style={PERMISSION_LABEL} testID={`${testID}-permission-label`}>
              {MATERIAL_TEXT.noPermission}
            </AppText>
            <AppText style={PERMISSION_CARET}>{MATERIAL_TEXT.caret}</AppText>
          </Pressable>
        ) : (
          <AppText style={UNSEEN} testID={`${testID}-unseen`}>
            {display.kind === "loading" ? MATERIAL_TEXT.loading : MATERIAL_TEXT.unknown}
          </AppText>
        )}
      </View>
    </View>
  );
}

/* ═══════════════════════════════ 치수 ═══════════════════════════════ */
/* 보드 `1d` ④ 마크업의 인라인 스타일을 옮긴 값이다(`MATERIAL_GRID`). 색은 `COLORS.*`만. */

const COLUMN: ViewStyle = { gap: MATERIAL_GRID.columnGap };

const GRID: ViewStyle = {
  flexDirection: "row",
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
};

const CELL: ViewStyle = {
  flex: 1,
  minWidth: 0,
  gap: MATERIAL_GRID.cellGap,
  paddingVertical: MATERIAL_GRID.cellPaddingVertical,
};

const LABEL: TextStyle = {
  fontSize: MATERIAL_GRID.labelSize,
  fontWeight: "600",
  color: COLORS.textMuted,
};

const VALUE_ROW: ViewStyle = {
  flexDirection: "row",
  alignItems: "baseline",
  gap: 4,
  minHeight: MATERIAL_GRID.number.lineHeight,
};

/** 큰 숫자에 글꼴 배율을 곱한다(선형 — `font-scale.ts`) */
const scaledNumeral = (scale: number): TextStyle => ({
  fontSize: MATERIAL_GRID.number.fontSize * scale,
  lineHeight: MATERIAL_GRID.number.lineHeight * scale,
  letterSpacing: MATERIAL_GRID.number.letterSpacing * scale,
});

const NUMBER: TextStyle = {
  fontSize: MATERIAL_GRID.number.fontSize,
  lineHeight: MATERIAL_GRID.number.lineHeight,
  letterSpacing: MATERIAL_GRID.number.letterSpacing,
  fontWeight: "800",
  color: COLORS.text,
  fontVariant: ["tabular-nums"],
};

const UNIT: TextStyle = {
  fontSize: MATERIAL_GRID.unitSize,
  fontWeight: "700",
  color: COLORS.text,
};

/** 「모름」·「…」 — 숫자 자리에 놓이는 글자. 0이 아니라는 것이 보이도록 숫자보다 조용하다 */
const UNSEEN: TextStyle = {
  fontSize: MATERIAL_GRID.permission.fontSize,
  fontWeight: "700",
  color: COLORS.textMuted,
};

const NOTE: TextStyle = {
  marginTop: MATERIAL_GRID.noteMarginTop,
  fontSize: MATERIAL_GRID.note.fontSize,
  lineHeight: MATERIAL_GRID.note.lineHeight,
  color: COLORS.textMuted,
};

/** 「권한이 없어요 ›」 — 가운데 정렬, 간격 6, 누를 수 있는 영역 최소 높이 44. 진한 위험색(C5, 대비 AA) */
const PERMISSION: ViewStyle = {
  flexDirection: "row",
  // 큰 글꼴(2.0배)에서 칸 폭을 넘으면 「›」가 옆 칸·여백으로 새므로 넘치면 아래로 내린다
  flexWrap: "wrap",
  alignItems: "center",
  gap: MATERIAL_GRID.permission.gap,
  minHeight: MATERIAL_GRID.permissionMinHeight,
};

const PERMISSION_LABEL: TextStyle = {
  flexShrink: 1,
  fontSize: MATERIAL_GRID.permission.fontSize,
  fontWeight: "700",
  color: COLORS.danger,
};

const PERMISSION_CARET: TextStyle = {
  fontSize: MATERIAL_GRID.permission.caretSize,
  fontWeight: "700",
  color: COLORS.danger,
};
