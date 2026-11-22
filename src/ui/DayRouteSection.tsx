/**
 * 쓴 날 지면의 「하루 동선」 칸 (125, 보드 밖 초안).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DU1~DU7
 *
 * ─────────────────────────────────────────────────
 * **이 부품은 `DayRoute`만 안다**(DU1). 자리의 좌표·신호는 모른다 — `app/day-route.ts`가 0~1 상대 위치로 바꿔
 * 넘기고(FR-004), 여기서는 그 위치에 잰 폭·높이를 곱해 그리기만 한다. 판정(도식을 그릴까, 목록만 보일까)도 하지 않는다 —
 * `diagram`이 말한다.
 *
 * **그리는 법**(research R4): `react-native-svg`를 쓰지 않는다 — 네이티브 의존성이라 prebuild·재설치가 필요하다. 점은
 * 번호가 든 정사각 `View`, 선은 두 점의 중점에 두고 `atan2` 각도로 회전한 얇은 `View`다. 곡선·그림자·그라데이션·모서리
 * 반경이 없다(`design/DESIGN.md` 「하지 않는 것」, Modernist 제로 라디우스).
 *
 * **선은 GPS 궤적이 아니다**(원칙 V). 설명 한 줄이 「사진이 찍힌 자리를 시간순으로 이은 거예요」라고 말한다. 점 옆에는
 * 글자를 두지 않고 번호만 둔다 — 이름·때는 아래 범례 목록에 있어 겹침을 풀 필요가 없고 화면 낭독이 순서대로 읽는다(DU5).
 *
 * **점의 번호는 글꼴 배율에 커지지 않는다**(점이 고정 크기). 범례 줄은 말줄임 없이 줄바꿈된다.
 * ─────────────────────────────────────────────────
 */

import { useState } from "react";
import { useWindowDimensions, View, type TextStyle, type ViewStyle } from "react-native";

import { ROUTE_ASPECT, type DayRoute, type RouteItem } from "../app/day-route";
import { AppText } from "./components/Text";
import { ROUTE_TEXT } from "./home-text";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

/**
 * 도식 치수. **사람이 정한 값이다**(보드 밖 초안, 헌법 원칙 V) — 실기기에서 보고 고친다.
 * `aspect`는 높이/폭이고 **`app/day-route.ts`의 `ROUTE_ASPECT`가 정본이다** — 투영(`buildDayRoute`)과 이 그림이 같은 값을
 * 써야 가로세로 비율이 유지된다(DR7, 한 쪽만 고치면 세로가 눌린다). `dot`은 점(정사각)의 한 변, `lineWidth`는 선 굵기(dp),
 * `merged`는 겹친 점이 번호를 하나 더 이어 적을 때마다 넓어지는 폭(dp, DU8).
 */
export const ROUTE_DIAGRAM = { aspect: ROUTE_ASPECT, dot: 22, lineWidth: 1.5, merged: 8 } as const;

/** 점 안 번호 — 배지(11/700)와 같은 크기 */
const DOT_NUMBER_SIZE = 11;

export type DayRouteSectionProps = {
  route: DayRoute;
};

export function DayRouteSection({ route }: DayRouteSectionProps) {
  return (
    <View style={SECTION} testID="day-route">
      <AppText variant="sectionTitle">{ROUTE_TEXT.title}</AppText>
      {route.diagram && <Diagram items={route.items} />}
      {route.diagram && (
        <AppText testID="day-route-note" variant="caption">
          {ROUTE_TEXT.note}
        </AppText>
      )}
      <View style={LEGEND} testID="day-route-legend">
        {route.items.map((item) => (
          <AppText key={item.n} testID={`day-route-legend-${item.n}`}>
            {ROUTE_TEXT.line(
              item.n,
              ROUTE_TEXT.period[item.period],
              item.label ?? ROUTE_TEXT.unknownPlace,
            )}
          </AppText>
        ))}
        {route.more > 0 && (
          <AppText testID="day-route-more" variant="caption">
            {ROUTE_TEXT.more(route.more)}
          </AppText>
        )}
      </View>
    </View>
  );
}

/** 도식 상자 — 잰 폭을 채우고 높이는 폭에 비례한다(DU7). 재기 전 첫 프레임은 창 폭에서 본문 좌우 여백을 뺀 값이다 */
function Diagram({ items }: { items: readonly RouteItem[] }) {
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState<number | undefined>(undefined);
  const width = measured ?? window.width - WRITTEN_DAY.body.paddingH * 2;
  const height = width * ROUTE_DIAGRAM.aspect;
  const { dot, lineWidth, merged } = ROUTE_DIAGRAM;

  // 항목은 도식일 때만 오고 그때는 모두 x·y가 있다(DayRoute 계약, data-model) — 없으면 그리지 않는다
  const centers = items.flatMap((item) =>
    item.x === undefined || item.y === undefined
      ? []
      : [{ n: item.n, cx: item.x * width, cy: item.y * height }],
  );

  const markers = markersOf(centers, dot);

  return (
    <View
      // DU5 — 도식은 하나의 낭독 요소다. 점·선(캔버스)은 낭독에서 숨기고 범례가 순서대로 읽힌다
      accessibilityLabel={ROUTE_TEXT.diagramA11y(centers.length)}
      accessibilityRole="image"
      accessible
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={[FRAME, { height }]}
      testID="day-route-diagram"
    >
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
        {markers.map(({ numbers, cx, cy }) => {
          const first = numbers.includes(1);
          const width = dot + (numbers.length - 1) * merged;
          return (
            <View
              key={numbers[0]}
              style={[
                DOT,
                {
                  left: cx - width / 2,
                  top: cy - dot / 2,
                  width,
                  backgroundColor: first ? COLORS.accent : COLORS.text,
                },
              ]}
              testID={`day-route-dot-${numbers[0]}`}
            >
              <AppText
                allowFontScaling={false}
                style={[DOT_NUMBER, { color: first ? COLORS.accentForeground : COLORS.bg }]}
              >
                {numbers.join("·")}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 점 하나(정지점 하나가 아니다) — 겹친 정지점들의 번호와 그 점의 중심 */
type Marker = { numbers: number[]; cx: number; cy: number };

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

/* ═══════════════════════════════ 치수 (보드 밖 초안 — 사람이 정한 값) ═══════════════════════════════ */

/** 본문 문단 간격(14)과 같은 결로 위아래를 띄운다 */
const SECTION: ViewStyle = { gap: 12, paddingTop: 12 };

/** 폭은 부모가 채우고 높이는 렌더에서 폭에 비례해 준다 */
const FRAME: ViewStyle = { alignSelf: "stretch", backgroundColor: COLORS.surface };

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

const LEGEND: ViewStyle = { gap: 6 };
