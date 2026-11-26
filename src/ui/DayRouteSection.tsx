/**
 * 쓴 날 지면의 「하루 동선」 칸 (125·126, 보드 밖 초안).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DU1~DU7(126이 DU3·DU4를 바꾼다),
 *       specs/126-route-map-illustration/contracts/day-map.md DM9~DM12
 *
 * ─────────────────────────────────────────────────
 * **이 부품은 `DayRoute`만 안다**(DU1) — 126부터 `route.map`(상자 안 정수 경로 문자열)도 안다. 자리의 좌표·신호·지도 파일은 모른다 — `app/day-route.ts`가 0~1 상대 위치로 바꿔
 * 넘기고(FR-004), 여기서는 그 위치에 잰 폭·높이를 곱해 그리기만 한다. 판정(도식을 그릴까, 목록만 보일까)도 하지 않는다 —
 * `diagram`이 말한다.
 *
 * **그리는 법**(research R4): `react-native-svg`를 쓰지 않는다 — 네이티브 의존성이라 prebuild·재설치가 필요하다. 점은
 * 번호가 든 정사각 `View`, 선은 두 점의 중점에 두고 `atan2` 각도로 회전한 얇은 `View`다. 곡선·그림자·그라데이션·모서리
 * 반경이 없다(`design/DESIGN.md` 「하지 않는 것」, Modernist 제로 라디우스).
 *
 * **선은 GPS 궤적이 아니다**(원칙 V). 설명 한 줄이 「사진이 찍힌 자리를 시간순으로 이은 거예요」라고 말한다. 점 옆에는
 * 글자를 두지 않고 번호만 둔다 — 이름·때는 아래 범례 목록에 있어 겹침을 풀 필요가 없고 화면 낭독이 순서대로 읽는다(DU5).
 * **126: 지도(`route.map`)가 있으면 지도 위에서 점만으로 어느 곳인지 짚기 어려워 점 옆에 이름 라벨을 단다**(`labelPlacement`가 겹치지 않는
 * 자리를 고르고 못 찾으면 그 라벨만 생략한다). 라벨은 낭독에서 숨은 캔버스 안에 있고 범례가 정확한 이름을 읽는다. 이름이 없는 자리는 라벨도
 * 범례 이름 칸도 비운다(FR-015). 지도가 없으면 125 모양 그대로다(라벨 없음).
 *
 * **점의 번호는 글꼴 배율에 커지지 않는다**(점이 고정 크기). 범례 줄은 말줄임 없이 줄바꿈된다.
 * ─────────────────────────────────────────────────
 */

import { useState } from "react";
import { Pressable, useWindowDimensions, View, type TextStyle, type ViewStyle } from "react-native";

import { legendSummary, type DayRoute, type RouteItem, type RouteMap } from "../app/day-route";
import { AppText } from "./components/Text";
import { ROUTE_TEXT } from "./home-text";
import { ROUTE_DIAGRAM, RouteCanvas } from "./RouteCanvas";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

/** 도식 치수의 정본은 `RouteCanvas.tsx`다(135가 그리기를 옮겼다) — 옛 import 자리를 위해 다시 내보낸다 */
export { ROUTE_DIAGRAM };

export type DayRouteSectionProps = {
  route: DayRoute;
};

export function DayRouteSection({ route }: DayRouteSectionProps) {
  return (
    <View style={SECTION} testID="day-route">
      <AppText variant="sectionTitle">{ROUTE_TEXT.title}</AppText>
      {route.diagram && <Diagram items={route.items} map={route.map} />}
      {/* 126 FR-016 — 자리가 1곳이면 이은 선이 없어 설명 줄이 어색하다 */}
      {route.diagram && route.items.length + route.more > 1 && (
        <AppText testID="day-route-note" variant="caption">
          {ROUTE_TEXT.note}
        </AppText>
      )}
      <Legend route={route} />
    </View>
  );
}

/**
 * 133 — 범례 목록은 기본 접힘이다(소유자, 2026-11-26). 접히면 대표 자리의 **이름만**(번호·때 없음) 한 줄과 「외 N곳 펼치기」,
 * 펼치면 125·126 목록 그대로와 「접기」. 펼침은 저장하지 않고 다른 날의 동선이 오면 접힌다.
 */
function Legend({ route }: { route: DayRoute }) {
  // 다른 날이면 접힌다 — 부르는 쪽(`WrittenDayPaper`)이 날짜를 `key`로 준다. route 객체는 렌더마다 새로 만들어질 수 있어
  // 그 정체성으로 되돌리지 않는다(같은 날 다시 그려도 펼침이 유지돼야 한다)
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);
  const { lead, hidden } = legendSummary(route);

  // 줄 목록
  const lines: { key: string; text: string; caption?: boolean }[] = expanded
    ? [
        ...route.items.map((item) => ({
          key: `day-route-legend-${item.n}`,
          text:
            item.label === null
              ? ROUTE_TEXT.lineNoName(item.n, ROUTE_TEXT.period[item.period])
              : ROUTE_TEXT.line(item.n, ROUTE_TEXT.period[item.period], item.label),
        })),
        ...(route.more > 0
          ? [{ key: "day-route-more", text: ROUTE_TEXT.more(route.more), caption: true }]
          : []),
      ]
    : [
        {
          key: "day-route-lead",
          text:
            lead === null
              ? ROUTE_TEXT.count(hidden)
              : hidden > 0
                ? ROUTE_TEXT.summary(lead, hidden)
                : lead,
        },
      ];
  // 접힌 줄에는 「펼치기」가 줄 끝에 붙고, 펼친 목록의 「접기」는 마지막 줄 다음에 따로 한 줄이다(소유자, 2026-11-26)
  const action = hidden === 0 || expanded ? null : ROUTE_TEXT.expand;

  return (
    <View style={LEGEND} testID="day-route-legend">
      {lines.map((line, i) => {
        const variant = line.caption ? "caption" : "body";
        if (action === null || i !== lines.length - 1) {
          return (
            <AppText key={line.key} testID={line.key} variant={variant}>
              {line.text}
            </AppText>
          );
        }
        const label = `${line.text} ${action}`;
        return (
          // 줄 전체를 누른다 — 누르는 자리가 강조 글자보다 넓다. 색은 버튼 글자에만
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            key={line.key}
            hitSlop={TOGGLE_HIT}
            onPress={toggle}
            style={TOGGLE_LINE}
            testID="day-route-toggle"
          >
            <AppText testID={line.key} variant={variant}>
              {line.text}{" "}
              <AppText style={TOGGLE_TEXT} variant={variant}>
                {action}
              </AppText>
            </AppText>
          </Pressable>
        );
      })}
      {expanded && hidden > 0 && (
        <Pressable
          accessibilityLabel={ROUTE_TEXT.collapse}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={TOGGLE_HIT}
          onPress={toggle}
          style={TOGGLE_LINE}
          testID="day-route-toggle"
        >
          <AppText style={TOGGLE_TEXT}>{ROUTE_TEXT.collapse}</AppText>
        </Pressable>
      )}
    </View>
  );
}

/** 도식 상자 — 잰 폭을 채우고 높이는 폭에 비례한다(DU7). 재기 전 첫 프레임은 창 폭에서 본문 좌우 여백을 뺀 값이다 */
function Diagram({ items, map }: { items: readonly RouteItem[]; map: RouteMap | undefined }) {
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState<number | undefined>(undefined);
  const width = measured ?? window.width - WRITTEN_DAY.body.paddingH * 2;
  const height = width * ROUTE_DIAGRAM.aspect;
  const count = items.filter((it) => it.x !== undefined && it.y !== undefined).length;

  return (
    <View
      // DU5 — 도식은 하나의 낭독 요소다. 점·선(캔버스)은 낭독에서 숨기고 범례가 순서대로 읽힌다
      accessibilityLabel={ROUTE_TEXT.diagramA11y(count)}
      accessibilityRole="image"
      accessible
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={[FRAME, { height }]}
      testID="day-route-diagram"
    >
      <RouteCanvas height={height} items={items} map={map} width={width} />
    </View>
  );
}

/* ═══════════════════════════════ 치수 (보드 밖 초안 — 사람이 정한 값) ═══════════════════════════════ */

/** 본문 문단 간격(14)과 같은 결로 위아래를 띄운다 */
const SECTION: ViewStyle = { gap: 12, paddingTop: 12 };

/** 폭은 부모가 채우고 높이는 렌더에서 폭에 비례해 준다 */
const FRAME: ViewStyle = { alignSelf: "stretch", backgroundColor: COLORS.surface };

const LEGEND: ViewStyle = { gap: 6 };

/** 133 — 펼치기·접기가 붙은 줄. 밝은 지면 위 작은 강조 글자는 `danger`(088·089) */
const TOGGLE_LINE: ViewStyle = { alignSelf: "flex-start" };

/** 줄 간격은 다른 줄과 같게 두고 누르는 자리만 위아래로 넓힌다(줄 높이 약 24 + 10·10) */
const TOGGLE_HIT = { top: 10, bottom: 10, left: 8, right: 8 } as const;

/** 펼치기·접기 글자만 강조한다 */
const TOGGLE_TEXT: TextStyle = { color: COLORS.danger, fontWeight: "600" };
