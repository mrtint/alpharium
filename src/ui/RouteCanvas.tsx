/**
 * 하루 동선 그림 — 지도층·선·점·이름 라벨 (125·126, 135가 `DayRouteSection`의 `Diagram`에서 떼어 냈다).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DU5·DU8, specs/126-route-map-illustration/contracts/day-map.md,
 *       specs/135-diary-route-views/contracts/written-route.md WR7
 *
 * ─────────────────────────────────────────────────
 * **크기는 부르는 쪽이 정한다**(`width`·`height`). 아래 칸(`DayRouteSection`)은 잰 폭에 비례한 높이를, 135 지도 면(`RouteFace`)은
 * 캐러셀 자리 안에 `ROUTE_ASPECT`로 맞춘 상자를 준다. 점 합치기(`markersOf`, DU8)와 라벨 배치(`labelPlacement`)는 여기 하나다 —
 * 두 곳이 같은 규칙을 쓴다.
 *
 * **`onPressMarker`가 없으면 그림은 낭독에서 숨는다**(DU5 — 아래 칸은 범례가 읽힌다). 있으면(135 지도 면) 점이 버튼이 되고
 * 「N번 자리, 이름, 때」로 읽힌다. 누를 자리는 `hitSlop`으로 44pt 이상이다. `selected`가 있으면 그 점만 강조색이고 나머지는 모두
 * 글자색이다(시작점 강조를 잠시 내린다 — 강조가 둘이면 어느 것을 골랐는지 흐려진다).
 * ─────────────────────────────────────────────────
 */

import { Pressable, View, type TextStyle, type ViewStyle } from "react-native";

import { ROUTE_ASPECT, type RouteItem, type RouteMap } from "../app/day-route";
import { AppText } from "./components/Text";
import { ROUTE_TEXT } from "./home-text";
import { labelPlacement, LABEL_STYLE, type LabelMarker } from "./label-placement";
import { RouteMapLayer } from "./RouteMapLayer";
import { COLORS, MAP_COLORS } from "./theme/tokens";

/**
 * 도식 치수. **사람이 정한 값이다**(보드 밖 초안, 헌법 원칙 V) — 실기기에서 보고 고친다.
 * `aspect`는 높이/폭이고 **`app/day-route.ts`의 `ROUTE_ASPECT`가 정본이다** — 투영(`buildDayRoute`)과 이 그림이 같은 값을
 * 써야 가로세로 비율이 유지된다(DR7, 한 쪽만 고치면 세로가 눌린다). `dot`은 점(정사각)의 한 변, `lineWidth`는 선 굵기(dp),
 * `merged`는 겹친 점이 번호를 하나 더 이어 적을 때마다 넓어지는 폭(dp, DU8).
 */
export const ROUTE_DIAGRAM = { aspect: ROUTE_ASPECT, dot: 22, lineWidth: 1.5, merged: 8 } as const;

/** 점 안 번호 — 배지(11/700)와 같은 크기 */
const DOT_NUMBER_SIZE = 11;

/** 135 — 점 22를 44pt 누름 자리로 넓힌다(사방 11) */
const MARKER_HIT = (44 - ROUTE_DIAGRAM.dot) / 2;

/** 점 하나(정지점 하나가 아니다) — 겹친 정지점들의 번호와 그 점의 중심 */
export type Marker = { numbers: number[]; cx: number; cy: number };

export type RouteCanvasProps = {
  items: readonly RouteItem[];
  map: RouteMap | undefined;
  width: number;
  height: number;
  /** 135 — 고른 점의 번호들. 그 점만 강조한다 */
  selected?: readonly number[];
  /** 135 — 있으면 점이 버튼이다 */
  onPressMarker?: (marker: Marker) => void;
  /** 135 — 첫 진입 애니메이션 동안 이 번호까지의 자리만 그린다(점·선·라벨). 없으면 전부 */
  visibleUpTo?: number;
};

/** 그림 안의 점 중심들 — 지도 면이 카드 자리를 고를 때도 쓴다 */
export function markersFor(
  items: readonly RouteItem[],
  width: number,
  height: number,
  visibleUpTo?: number,
): Marker[] {
  const centers = shown(items, visibleUpTo).flatMap((item) =>
    item.x === undefined || item.y === undefined
      ? []
      : [{ n: item.n, cx: item.x * width, cy: item.y * height }],
  );
  return markersOf(centers, ROUTE_DIAGRAM.dot);
}

/** 점의 폭 — 합친 점은 번호 하나마다 `merged`만큼 넓다 */
export function markerWidth(marker: Marker): number {
  return ROUTE_DIAGRAM.dot + (marker.numbers.length - 1) * ROUTE_DIAGRAM.merged;
}

export function RouteCanvas({
  items,
  map,
  width,
  height,
  selected,
  onPressMarker,
  visibleUpTo,
}: RouteCanvasProps) {
  const { dot, lineWidth } = ROUTE_DIAGRAM;
  const centers = shown(items, visibleUpTo).flatMap((item) =>
    item.x === undefined || item.y === undefined
      ? []
      : [{ n: item.n, cx: item.x * width, cy: item.y * height }],
  );
  const markers = markersOf(centers, dot);
  // 지도가 있을 때만 점 옆에 이름 라벨을 단다. 합친 점의 이름은 번호가 가장 작은 이름 있는 항목의 것이다
  const labelMarkers: LabelMarker[] = markers.map((m) => ({
    id: m.numbers[0]!,
    cx: m.cx,
    cy: m.cy,
    halfW: markerWidth(m) / 2,
    label: labelOf(items, m),
  }));
  const labels = map === undefined ? [] : labelPlacement(labelMarkers, width, height);
  const interactive = onPressMarker !== undefined;
  const isSelected = (m: Marker) => selected !== undefined && m.numbers[0] === selected[0];

  const dots = markers.map((m) => {
    const { numbers, cx, cy } = m;
    const w = markerWidth(m);
    const strong = selected === undefined ? numbers.includes(1) : isSelected(m);
    const face = (
      <AppText
        allowFontScaling={false}
        style={[DOT_NUMBER, { color: strong ? COLORS.accentForeground : COLORS.bg }]}
      >
        {numbers.join("·")}
      </AppText>
    );
    const box: ViewStyle = {
      left: cx - w / 2,
      top: cy - dot / 2,
      width: w,
      backgroundColor: strong ? COLORS.accent : COLORS.text,
    };
    if (!interactive) {
      return (
        <View key={numbers[0]} style={[DOT, box]} testID={`day-route-dot-${numbers[0]}`}>
          {face}
        </View>
      );
    }
    const item = items.find((it) => it.n === numbers[0]);
    return (
      <Pressable
        accessibilityLabel={ROUTE_TEXT.markerA11y(
          numbers.join("·"),
          item === undefined ? "" : ROUTE_TEXT.period[item.period],
          labelOf(items, m),
        )}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected(m) }}
        hitSlop={MARKER_HIT}
        key={numbers[0]}
        onPress={() => onPressMarker(m)}
        style={[DOT, box]}
        testID={`route-marker-${numbers[0]}`}
      >
        {face}
      </Pressable>
    );
  });

  return (
    <View style={{ width, height }}>
      {map !== undefined && <RouteMapLayer map={map} />}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={CANVAS}
        testID="day-route-canvas"
      >
        {centers.slice(1).map((to, i) => {
          const from = centers[i]!;
          // 선은 겹친 점의 중심으로 이어진다. 같은 점 안의 이웃(1→2가 한 점)은 길이 0이라 그리지 않는다
          const a = markers.find((m) => m.numbers.includes(from.n))!;
          const b = markers.find((m) => m.numbers.includes(to.n))!;
          if (a === b) return null;
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const length = Math.hypot(dx, dy);
          return (
            <View
              key={from.n}
              style={{
                position: "absolute",
                left: (a.cx + b.cx) / 2 - length / 2,
                top: (a.cy + b.cy) / 2 - lineWidth / 2,
                width: length,
                height: lineWidth,
                backgroundColor: COLORS.textMuted,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
              }}
              testID={`day-route-line-${from.n}`}
            />
          );
        })}
        {labels.map((l) => (
          <View
            key={`label-${l.id}`}
            style={[LABEL, { left: l.left, top: l.top, width: l.width, height: l.height }]}
            testID={`day-route-label-${l.id}`}
          >
            <AppText allowFontScaling={false} numberOfLines={1} style={LABEL_TEXT}>
              {l.label}
            </AppText>
          </View>
        ))}
        {!interactive && dots}
      </View>
      {interactive && dots}
    </View>
  );
}

/** 자리 번호는 시간순으로 늘어난다(`buildDayRoute`) — 그래서 「이 번호까지」가 「이 순번까지」와 같다 */
function shown(items: readonly RouteItem[], visibleUpTo: number | undefined): readonly RouteItem[] {
  return visibleUpTo === undefined ? items : items.filter((it) => it.n <= visibleUpTo);
}

function labelOf(items: readonly RouteItem[], m: Marker): string | null {
  return items.find((it) => m.numbers.includes(it.n) && it.label !== null)?.label ?? null;
}

/**
 * 중심이 점 크기 안으로 가까운 정지점은 **한 점**으로 합친다(DU8). 집을 나갔다 돌아오는 하루처럼 처음 자리로 되돌아오면
 * 마지막 점이 처음 점 위에 쌓여 시작점(강조 색)을 가리는 것을 실기기에서 보았다 — 합친 점에 번호를 이어 적는다(「1·4」).
 * 번호 순서대로 훑어 먼저 온 점이 중심을 정한다. 정지점 수와 낭독은 그대로다(점이 아니라 자리의 수).
 */
function markersOf(
  centers: readonly { n: number; cx: number; cy: number }[],
  dot: number,
): Marker[] {
  const markers: Marker[] = [];
  for (const c of centers) {
    const hit = markers.find((m) => Math.hypot(m.cx - c.cx, m.cy - c.cy) < dot);
    if (hit !== undefined) hit.numbers.push(c.n);
    else markers.push({ numbers: [c.n], cx: c.cx, cy: c.cy });
  }
  return markers;
}

const CANVAS: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };

const DOT: ViewStyle = {
  position: "absolute",
  width: ROUTE_DIAGRAM.dot,
  height: ROUTE_DIAGRAM.dot,
  alignItems: "center",
  justifyContent: "center",
};

const DOT_NUMBER: TextStyle = {
  fontSize: DOT_NUMBER_SIZE,
  fontWeight: "700",
  lineHeight: DOT_NUMBER_SIZE + 3,
};

/** 점 옆 이름 라벨 — 지도 바탕색의 평평한 판(반경·그림자 없음)에 글자. 판 치수는 `LABEL_STYLE`(사람이 정한 값)이다 */
const LABEL: ViewStyle = {
  position: "absolute",
  backgroundColor: MAP_COLORS.mapLand,
  paddingHorizontal: LABEL_STYLE.padH,
  justifyContent: "center",
};

const LABEL_TEXT: TextStyle = {
  fontSize: LABEL_STYLE.fontSize,
  fontWeight: "600",
  lineHeight: LABEL_STYLE.fontSize + 3,
  color: COLORS.text,
};
