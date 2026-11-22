/**
 * 125 — 쓴 날 지면의 「하루 동선」 칸 (화면 부품 `DayRouteSection`).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DU1~DU7
 *
 * **이 부품은 `DayRoute`(0~1 상대 위치)만 안다** — 좌표·신호는 모른다. 점은 정사각 `View`, 선은 중점에 두고 회전한 얇은
 * `View`다(새 네이티브 의존성 없음). 색은 토큰만. 위치 값은 실제 `View` 스타일을 읽어 단언한다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 */

import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { DayRoute, RouteItem } from "../../src/app/day-route";
import { DayRouteSection, ROUTE_DIAGRAM } from "../../src/ui/DayRouteSection";
import { COLORS } from "../../src/ui/theme/tokens";

const WIDTH = 300;
const HEIGHT = WIDTH * ROUTE_DIAGRAM.aspect;

const item = (n: number, x: number, y: number, label: string | null = `자리${n}`): RouteItem => ({
  n,
  period: n === 1 ? "morning" : n === 2 ? "afternoon" : "evening",
  label,
  x,
  y,
});

const THREE: DayRoute = {
  items: [item(1, 0.2, 0.8, "시청"), item(2, 0.8, 0.6, "잠실"), item(3, 0.5, 0.2, null)],
  more: 0,
  diagram: true,
};

/**
 * 점·선은 접근성에서 숨겨져 있다(DU5 — `no-hide-descendants`). RNTL 쿼리는 숨긴 요소를 기본으로 빼므로 이 시험은 숨김
 * 요소를 포함해 조회한다 — 숨겨진 채로 그려져 있는지가 시험 대상이다.
 */
const HIDDEN = { includeHiddenElements: true } as const;
const byId = (testID: string) => screen.getByTestId(testID, HIDDEN);
const maybeId = (testID: string) => screen.queryByTestId(testID, HIDDEN);

const flat = (testID: string) =>
  StyleSheet.flatten(byId(testID).props.style) as Record<string, unknown>;

async function renderMeasured(route: DayRoute) {
  await render(<DayRouteSection route={route} />);
  if (route.diagram) {
    await fireEvent(byId("day-route-diagram"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 0 } },
    });
  }
}

describe("DU2 — 번호 점과 직선", () => {
  it("점은 번호 순서대로 n개, 선은 이웃끼리 n−1개", async () => {
    await renderMeasured(THREE);
    for (const n of [1, 2, 3]) expect(byId(`day-route-dot-${n}`)).toBeTruthy();
    expect(maybeId("day-route-dot-4")).toBeNull();
    for (const n of [1, 2]) expect(byId(`day-route-line-${n}`)).toBeTruthy();
    expect(maybeId("day-route-line-3")).toBeNull();
  });

  it("점의 가운데가 상대 위치(x·y)를 잰 폭·높이에 곱한 곳이다", async () => {
    await renderMeasured(THREE);
    const half = ROUTE_DIAGRAM.dot / 2;
    const dot = flat("day-route-dot-2");
    expect(dot.left as number).toBeCloseTo(0.8 * WIDTH - half, 5);
    expect(dot.top as number).toBeCloseTo(0.6 * HEIGHT - half, 5);
    expect(dot.width).toBe(ROUTE_DIAGRAM.dot);
    expect(dot.height).toBe(ROUTE_DIAGRAM.dot);
  });

  it("점에는 번호가 있고 글꼴 배율에 커지지 않는다(점은 고정 크기)", async () => {
    await renderMeasured(THREE);
    const label = within(byId("day-route-dot-3")).getByText("3", HIDDEN);
    expect(label.props.allowFontScaling).toBe(false);
  });

  it("선은 두 점의 중심을 잇는다 — 길이·각도·중점이 맞다", async () => {
    await renderMeasured(THREE);
    const p1 = { x: 0.2 * WIDTH, y: 0.8 * HEIGHT };
    const p2 = { x: 0.8 * WIDTH, y: 0.6 * HEIGHT };
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const line = flat("day-route-line-1");
    expect(line.width as number).toBeCloseTo(length, 5);
    expect(line.height).toBe(ROUTE_DIAGRAM.lineWidth);
    expect(line.left as number).toBeCloseTo((p1.x + p2.x) / 2 - length / 2, 5);
    expect(line.top as number).toBeCloseTo((p1.y + p2.y) / 2 - ROUTE_DIAGRAM.lineWidth / 2, 5);
    const rotate = (line.transform as { rotate: string }[])[0]!.rotate;
    expect(parseFloat(rotate)).toBeCloseTo(angle, 5);
    expect(rotate.endsWith("rad")).toBe(true);
  });

  it("첫 점만 강조 색(accent), 나머지는 글자색이다 — 토큰만 쓴다", async () => {
    await renderMeasured(THREE);
    expect(flat("day-route-dot-1").backgroundColor).toBe(COLORS.accent);
    expect(flat("day-route-dot-2").backgroundColor).toBe(COLORS.text);
    expect(flat("day-route-dot-3").backgroundColor).toBe(COLORS.text);
  });

  it("곡선·그림자·그라데이션이 없다 — 점·선 스타일에 반경·그림자 키가 없다", async () => {
    await renderMeasured(THREE);
    for (const id of ["day-route-dot-1", "day-route-line-1"]) {
      const style = flat(id);
      for (const key of ["borderRadius", "shadowColor", "shadowOpacity", "elevation"]) {
        expect(style[key]).toBeUndefined();
      }
    }
  });
});

describe("DU7 — 폭을 채우고 높이는 폭에 비례한다", () => {
  it("잰 폭에 고정 비를 곱한 높이", async () => {
    await renderMeasured(THREE);
    expect(flat("day-route-diagram").height as number).toBeCloseTo(HEIGHT, 5);
  });
});

describe("DU3 — 범례 목록", () => {
  it("「번호 · 때 · 이름」 순서이고 이름을 모르는 자리는 「이름을 모르는 곳」이다(지어내지 않는다)", async () => {
    await renderMeasured(THREE);
    expect(screen.getByText("1 · 오전 · 시청")).toBeTruthy();
    expect(screen.getByText("2 · 오후 · 잠실")).toBeTruthy();
    expect(screen.getByText("3 · 저녁 · 이름을 모르는 곳")).toBeTruthy();
  });

  it("범례 줄은 줄바꿈된다 — 글꼴을 키워도 잘리지 않는다(말줄임 없음)", async () => {
    await renderMeasured(THREE);
    for (const line of ["1 · 오전 · 시청", "2 · 오후 · 잠실"]) {
      expect(screen.getByText(line).props.numberOfLines).toBeUndefined();
    }
  });

  it("more가 있으면 「외 N곳」 한 줄, 없으면 줄이 없다", async () => {
    await renderMeasured({ ...THREE, more: 2 });
    expect(screen.getByText("외 2곳")).toBeTruthy();
    await screen.unmount();
    await renderMeasured(THREE);
    expect(screen.queryByText(/^외 /)).toBeNull();
  });
});

describe("DU4 — 설명 한 줄은 도식일 때만", () => {
  it("diagram true: 「사진이 찍힌 자리를 시간순으로 이은 거예요」", async () => {
    await renderMeasured(THREE);
    expect(screen.getByText("사진이 찍힌 자리를 시간순으로 이은 거예요")).toBeTruthy();
  });

  it("칸 제목은 「하루 동선」", async () => {
    await renderMeasured(THREE);
    expect(screen.getByText("하루 동선")).toBeTruthy();
  });
});

describe("DU5 — 화면 낭독", () => {
  it("도식은 하나의 요소이고 설명 문장을 말한다 — 점·선은 낭독에서 숨긴다", async () => {
    await renderMeasured(THREE);
    const frame = byId("day-route-diagram");
    expect(frame.props.accessible).toBe(true);
    expect(frame.props.accessibilityLabel).toBe("사진이 찍힌 자리 3곳을 시간순으로 이은 도식");
    const canvas = byId("day-route-canvas");
    expect(canvas.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(canvas.props.accessibilityElementsHidden).toBe(true);
  });
});

describe("DU8 — 같은 자리로 돌아와 겹친 점은 한 점에 번호를 이어 적는다 (실기기 11-16에서 발견)", () => {
  /** 집 → 카페 → 집: 1번과 3번이 같은 위치다 */
  const LOOP: DayRoute = {
    items: [item(1, 0.2, 0.8, "집"), item(2, 0.8, 0.2, "카페"), item(3, 0.2, 0.8, "집")],
    more: 0,
    diagram: true,
  };

  it("★ 점 1과 3이 겹치면 점 하나에 「1·3」을 적고 점 3은 따로 그리지 않는다 — 시작점이 가려지지 않는다", async () => {
    await renderMeasured(LOOP);
    expect(within(byId("day-route-dot-1")).getByText("1·3", HIDDEN)).toBeTruthy();
    expect(byId("day-route-dot-2")).toBeTruthy();
    expect(maybeId("day-route-dot-3")).toBeNull();
  });

  it("겹친 점은 이어 적은 번호만큼 넓어지고 가운데는 그대로다", async () => {
    await renderMeasured(LOOP);
    const width = ROUTE_DIAGRAM.dot + ROUTE_DIAGRAM.merged;
    const dot = flat("day-route-dot-1");
    expect(dot.width).toBe(width);
    expect(dot.height).toBe(ROUTE_DIAGRAM.dot);
    expect(dot.left as number).toBeCloseTo(0.2 * WIDTH - width / 2, 5);
    expect(dot.top as number).toBeCloseTo(0.8 * HEIGHT - ROUTE_DIAGRAM.dot / 2, 5);
  });

  it("처음 점을 품은 겹친 점은 강조 색(accent)이다", async () => {
    await renderMeasured(LOOP);
    expect(flat("day-route-dot-1").backgroundColor).toBe(COLORS.accent);
    expect(flat("day-route-dot-2").backgroundColor).toBe(COLORS.text);
  });

  it("선은 겹친 점의 중심으로 이어진다 — 1→2와 2→3 두 줄", async () => {
    await renderMeasured(LOOP);
    expect(byId("day-route-line-1")).toBeTruthy();
    expect(byId("day-route-line-2")).toBeTruthy();
    // 2→3은 점 2에서 겹친 점(1·3)의 중심으로 간다 — 1→2와 길이가 같다
    expect(flat("day-route-line-2").width as number).toBeCloseTo(
      flat("day-route-line-1").width as number,
      5,
    );
  });

  it("이웃한 두 정지점이 겹치면 길이 0인 선은 그리지 않는다", async () => {
    await renderMeasured({
      items: [item(1, 0.2, 0.8, "a"), item(2, 0.2, 0.8, "b"), item(3, 0.8, 0.2, "c")],
      more: 0,
      diagram: true,
    });
    expect(within(byId("day-route-dot-1")).getByText("1·2", HIDDEN)).toBeTruthy();
    expect(maybeId("day-route-line-1")).toBeNull(); // 1→2: 같은 점
    expect(byId("day-route-line-2")).toBeTruthy(); // 2→3
  });

  it("점 크기 안으로 가까우면(완전히 같지 않아도) 한 점으로 합친다", async () => {
    // 폭 300 기준 x 차이 0.03 = 9px < 22px
    await renderMeasured({
      items: [item(1, 0.2, 0.8, "a"), item(2, 0.23, 0.8, "b"), item(3, 0.8, 0.2, "c")],
      more: 0,
      diagram: true,
    });
    expect(maybeId("day-route-dot-2")).toBeNull();
    expect(within(byId("day-route-dot-1")).getByText("1·2", HIDDEN)).toBeTruthy();
  });

  it("화면 낭독은 점 수가 아니라 정지점 수를 말한다", async () => {
    await renderMeasured(LOOP);
    expect(byId("day-route-diagram").props.accessibilityLabel).toBe(
      "사진이 찍힌 자리 3곳을 시간순으로 이은 도식",
    );
  });

  it("겹치지 않으면 종전처럼 점마다 하나다", async () => {
    await renderMeasured(THREE);
    for (const n of [1, 2, 3]) expect(byId(`day-route-dot-${n}`)).toBeTruthy();
    expect(flat("day-route-dot-1").width).toBe(ROUTE_DIAGRAM.dot);
  });
});

describe("diagram false — 범례 목록만(US2)", () => {
  const LIST: DayRoute = {
    items: [
      { n: 1, period: "morning", label: "시청" },
      { n: 2, period: "night", label: null },
    ],
    more: 0,
    diagram: false,
  };

  it("도식·점·선·설명 줄이 없고 범례와 제목만 있다", async () => {
    await renderMeasured(LIST);
    expect(maybeId("day-route-diagram")).toBeNull();
    expect(maybeId("day-route-dot-1")).toBeNull();
    expect(maybeId("day-route-line-1")).toBeNull();
    expect(screen.queryByText("사진이 찍힌 자리를 시간순으로 이은 거예요")).toBeNull();
    expect(screen.getByText("하루 동선")).toBeTruthy();
    expect(screen.getByText("1 · 오전 · 시청")).toBeTruthy();
    expect(screen.getByText("2 · 밤 · 이름을 모르는 곳")).toBeTruthy();
  });

  it("자리 1곳은 한 줄만이다", async () => {
    await renderMeasured({
      items: [{ n: 1, period: "evening", label: "집 근처" }],
      more: 0,
      diagram: false,
    });
    expect(screen.getByText("1 · 저녁 · 집 근처")).toBeTruthy();
    expect(maybeId("day-route-diagram")).toBeNull();
  });
});
