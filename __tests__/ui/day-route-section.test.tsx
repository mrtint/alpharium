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

import type { DayRoute, RouteItem, RouteMap } from "../../src/app/day-route";
import { DayRouteSection, ROUTE_DIAGRAM } from "../../src/ui/DayRouteSection";
import { COLORS } from "../../src/ui/theme/tokens";

const WIDTH = 300;
const HEIGHT = WIDTH * ROUTE_DIAGRAM.aspect;

const item = (n: number, x: number, y: number, label: string | null = `자리${n}`): RouteItem => ({
  n,
  period: n === 1 ? "morning" : n === 2 ? "afternoon" : "evening",
  label,
  photos: 1,
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

async function expand() {
  await fireEvent.press(screen.getByTestId("day-route-toggle"));
}

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
  it("「번호 · 때 · 이름」 순서이고 이름을 모르는 자리는 이름 칸을 비운다(지어내지 않는다, 126 FR-015)", async () => {
    await renderMeasured(THREE);
    await expand();
    expect(screen.getByText("1 · 오전 · 시청")).toBeTruthy();
    expect(screen.getByText("2 · 오후 · 잠실")).toBeTruthy();
    expect(screen.getByTestId("day-route-legend-3")).toHaveTextContent("3 · 저녁", {
      exact: true,
    }); // 「접기」는 이 줄에 붙지 않는다
    expect(screen.queryByText(/이름을 모르는 곳/)).toBeNull();
  });

  it("범례 줄은 줄바꿈된다 — 글꼴을 키워도 잘리지 않는다(말줄임 없음)", async () => {
    await renderMeasured(THREE);
    await expand();
    for (const line of ["1 · 오전 · 시청", "2 · 오후 · 잠실"]) {
      expect(screen.getByText(line).props.numberOfLines).toBeUndefined();
    }
  });

  it("more가 있으면 「외 N곳」 한 줄, 없으면 줄이 없다", async () => {
    await renderMeasured({ ...THREE, more: 2 });
    await expand();
    expect(screen.getByTestId("day-route-more")).toHaveTextContent("외 2곳", {
      exact: true,
    }); // 「접기」는 이 줄에 붙지 않는다
    await screen.unmount();
    await renderMeasured(THREE);
    await expand();
    expect(screen.queryByText(/^외 \d+곳$/)).toBeNull();
  });
});

describe("DU4 — 설명 한 줄은 도식일 때만", () => {
  it("diagram true: 「사진이 찍힌 자리를 시간순으로 이은 거예요」", async () => {
    await renderMeasured(THREE);
    expect(screen.getByText("사진이 찍힌 자리를 시간순으로 이은 거예요")).toBeTruthy();
  });

  it("126 FR-016 — 자리가 1곳인 도식에는 설명 줄이 없다(이은 선이 없다)", async () => {
    await renderMeasured({ items: [item(1, 0.5, 0.5, "집 근처")], more: 0, diagram: true });
    expect(screen.queryByText("사진이 찍힌 자리를 시간순으로 이은 거예요")).toBeNull();
    expect(byId("day-route-dot-1")).toBeTruthy();
    expect(maybeId("day-route-line-1")).toBeNull();
  });

  it("126 — 자리가 1곳이고 외 N곳이 있으면(12곳 밖은 불가능하지만) 설명 줄은 이어진 선이 있을 때만이다", async () => {
    await renderMeasured({ ...THREE, more: 2 });
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
      { n: 1, period: "morning", label: "시청", photos: 1 },
      { n: 2, period: "night", label: null, photos: 1 },
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
    await expand();
    expect(screen.getByText("1 · 오전 · 시청")).toBeTruthy();
    expect(screen.getByTestId("day-route-legend-2")).toHaveTextContent("2 · 밤", {
      exact: true,
    }); // 「접기」는 이 줄에 붙지 않는다
    expect(screen.queryByText(/이름을 모르는 곳/)).toBeNull();
  });

  it("자리 1곳은 한 줄만이다 — 133부터 이름만, 펼칠 것이 없어 버튼도 없다", async () => {
    await renderMeasured({
      items: [{ n: 1, period: "evening", label: "집 근처", photos: 1 }],
      more: 0,
      diagram: false,
    });
    expect(screen.getByText("집 근처")).toBeTruthy();
    expect(screen.queryByTestId("day-route-toggle")).toBeNull();
    expect(maybeId("day-route-diagram")).toBeNull();
  });
});

/* ═══════════════════════════════ 126 — 지도와 이름 라벨 ═══════════════════════════════ */

const MAP: RouteMap = {
  box: { w: 1000, h: 620 },
  water: "M0 0L500 0L500 300L0 0Z",
  park: "",
  rail: "",
  river: "",
  roadMajor: "M0 620L1000 0",
  roadMid: "",
  roadMinor: "",
  roadWidth: 16,
};

describe("126 DM9 — 지도 층이 점·선 뒤에 깔린다", () => {
  it("route.map이 있으면 도식 상자 안에 지도 층(Svg)이 있다", async () => {
    await renderMeasured({ ...THREE, map: MAP });
    expect(byId("day-route-map")).toBeTruthy();
    expect(within(byId("day-route-diagram")).getByTestId("day-route-map", HIDDEN)).toBeTruthy();
  });

  it("지도 층은 점·선 캔버스보다 먼저(뒤에) 그려진다", async () => {
    await renderMeasured({ ...THREE, map: MAP });
    const ids: string[] = [];
    const walk = (node: unknown): void => {
      if (node === null || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      const n = node as { props?: { testID?: string }; children?: unknown };
      if (n.props?.testID !== undefined) ids.push(n.props.testID);
      walk(n.children);
    };
    walk(screen.toJSON());
    expect(ids.indexOf("day-route-map")).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf("day-route-map")).toBeLessThan(ids.indexOf("day-route-canvas"));
  });

  it("route.map이 없으면 지도 층도 이름 라벨도 없다 — 125 모양 그대로", async () => {
    await renderMeasured(THREE);
    expect(maybeId("day-route-map")).toBeNull();
    expect(maybeId("day-route-label-1")).toBeNull();
    expect(maybeId("day-route-label-2")).toBeNull();
  });

  it("★ DM15 — 지도가 더해져도 도식 상자 높이는 그대로다(지면 높이·끝 판정이 흔들리지 않는다)", async () => {
    await renderMeasured(THREE);
    const without = flat("day-route-diagram").height as number;
    await screen.unmount();
    await renderMeasured({ ...THREE, map: MAP });
    expect(flat("day-route-diagram").height as number).toBe(without);
  });

  it("점·번호·선은 지도가 있어도 125와 같다", async () => {
    await renderMeasured({ ...THREE, map: MAP });
    for (const n of [1, 2, 3]) expect(byId(`day-route-dot-${n}`)).toBeTruthy();
    expect(byId("day-route-line-1")).toBeTruthy();
    expect(byId("day-route-line-2")).toBeTruthy();
  });

  it("지도는 도식의 낭독을 바꾸지 않는다(DU5) — 한 요소, 같은 문장", async () => {
    await renderMeasured({ ...THREE, map: MAP });
    const diagram = byId("day-route-diagram");
    expect(diagram.props.accessibilityLabel).toBe("사진이 찍힌 자리 3곳을 시간순으로 이은 도식");
    expect(diagram.props.accessible).toBe(true);
  });
});

describe("126 DM11 — 점 옆 이름 라벨", () => {
  it("지도가 있으면 이름 있는 점마다 라벨이 있고, 이름 없는 점은 없다", async () => {
    await renderMeasured({ ...THREE, map: MAP });
    expect(byId("day-route-label-1")).toBeTruthy();
    expect(byId("day-route-label-2")).toBeTruthy();
    expect(maybeId("day-route-label-3")).toBeNull(); // label null
  });

  it("라벨 글자는 이름이고 글꼴 배율에 커지지 않는다", async () => {
    await renderMeasured({ ...THREE, map: MAP });
    const label = byId("day-route-label-1");
    expect(within(label).getByText("시청", HIDDEN).props.allowFontScaling).toBe(false);
  });

  it("라벨은 낭독에서 숨겨진 캔버스 안에 있다(범례가 이름을 읽는다)", async () => {
    await renderMeasured({ ...THREE, map: MAP });
    expect(within(byId("day-route-canvas")).getByTestId("day-route-label-1", HIDDEN)).toBeTruthy();
  });

  it("겹쳐서 놓을 자리가 없는 라벨은 그 라벨만 생략된다 — 앞 라벨은 남는다", async () => {
    // 상자 폭보다 긴 이름은 어디에도 들어가지 않아 그 라벨만 빠진다. 앞 라벨은 남는다.
    const crowded: DayRoute = {
      items: [
        item(1, 0.3, 0.5, "서울함공원"),
        item(2, 0.6, 0.55, "이름이 상자 폭보다 길어서 어디에도 들어가지 않는 라벨입니다 정말로"),
      ],
      more: 0,
      diagram: true,
      map: MAP,
    };
    await renderMeasured(crowded);
    expect(byId("day-route-label-1")).toBeTruthy();
    expect(maybeId("day-route-label-2")).toBeNull();
    // 범례에는 이름이 그대로 있다
    await expand();
    expect(screen.getByText(/^2 · .* · 이름이 상자 폭보다/)).toBeTruthy();
  });
});

describe("133 — 범례 목록 접기", () => {
  const withPhotos = (
    photos: number[],
    labels: (string | null)[] = photos.map((_, i) => `자리${i + 1}`),
  ) =>
    photos.map((p, i) => ({
      ...item(i + 1, (i % 4) * 0.3 + 0.05, Math.floor(i / 4) * 0.3 + 0.1, labels[i]!),
      photos: p,
    }));

  it("기본 접힘: 사진이 가장 많은 자리 이름만(번호·때 없이)과 「외 N곳 펼치기」", async () => {
    await renderMeasured({
      items: withPhotos([1, 5, 2, 1], ["성수역", "서울숲", null, "뚝섬"]),
      more: 0,
      diagram: true,
    });
    expect(screen.getByTestId("day-route-lead")).toHaveTextContent("서울숲 외 3곳 펼치기", {
      exact: true,
    });
    // 강조색은 「펼치기」 글자에만
    expect(StyleSheet.flatten(screen.getByText("펼치기").props.style).color).toBe(COLORS.danger);
    expect(StyleSheet.flatten(screen.getByTestId("day-route-lead").props.style).color).not.toBe(
      COLORS.danger,
    );
    expect(screen.queryByText("1 · 오전 · 성수역")).toBeNull();
  });

  it("펼치면 전체 목록과 「접기」, 접으면 대표 한 줄로 돌아온다", async () => {
    await renderMeasured({ items: withPhotos([1, 5, 2]), more: 0, diagram: true });
    await expand();
    expect(screen.getByText("1 · 오전 · 자리1")).toBeTruthy();
    expect(screen.getByTestId("day-route-legend-3")).toHaveTextContent("3 · 저녁 · 자리3", {
      exact: true,
    }); // 「접기」는 이 줄에 붙지 않는다
    expect(screen.queryByTestId("day-route-lead")).toBeNull();
    const toggle = screen.getByTestId("day-route-toggle");
    expect(toggle.props.accessibilityRole).toBe("button");
    expect(screen.getByText("접기")).toBeTruthy();
    await expand();
    expect(screen.getByTestId("day-route-lead")).toHaveTextContent("자리2 외 2곳 펼치기", {
      exact: true,
    });
    expect(screen.queryByText("1 · 오전 · 자리1")).toBeNull();
  });

  it("동률이면 번호가 작은 자리, 이름 없는 자리는 대표가 되지 않는다", async () => {
    await renderMeasured({
      items: withPhotos([9, 3, 3], [null, "잠실", "시청"]),
      more: 0,
      diagram: false,
    });
    expect(screen.getByTestId("day-route-lead")).toHaveTextContent("잠실 외 2곳 펼치기", {
      exact: true,
    });
  });

  it("이름 있는 자리가 없으면 대표 이름 없이 「N곳 펼치기」", async () => {
    await renderMeasured({ items: withPhotos([2, 1], [null, null]), more: 0, diagram: false });
    expect(screen.getByTestId("day-route-lead")).toHaveTextContent("2곳 펼치기", { exact: true });
  });

  it("이름 있는 1곳뿐이면 그 이름 한 줄이고 버튼이 없다", async () => {
    await renderMeasured({ items: withPhotos([3], ["성수역"]), more: 0, diagram: false });
    expect(screen.getByTestId("day-route-lead")).toHaveTextContent("성수역", { exact: true });
    expect(screen.queryByTestId("day-route-toggle")).toBeNull();
  });

  it("12곳을 넘으면 N은 상한 밖까지 센다 — 펼치면 끝에 「외 N곳」과 「접기」", async () => {
    await renderMeasured({
      items: withPhotos([1, 1, 1, 1, 7, 1, 1, 1, 1, 1, 1, 1]),
      more: 3,
      diagram: false,
    });
    expect(screen.getByTestId("day-route-lead")).toHaveTextContent("자리5 외 14곳 펼치기", {
      exact: true,
    });
    await expand();
    expect(screen.getByText("12 · 저녁 · 자리12")).toBeTruthy();
    // 「접기」는 마지막 줄(「외 3곳」) 다음에 따로 한 줄이다
    expect(screen.getByTestId("day-route-more")).toHaveTextContent("외 3곳", { exact: true });
    expect(screen.getByTestId("day-route-toggle")).toHaveTextContent("접기", { exact: true });
  });

  it("같은 날을 새 route 객체로 다시 그려도 펼침이 유지된다(부모는 렌더마다 새로 만들 수 있다)", async () => {
    const a: DayRoute = { items: withPhotos([1, 2]), more: 0, diagram: false };
    await renderMeasured(a);
    await expand();
    await screen.rerender(<DayRouteSection route={{ ...a, items: [...a.items] }} />);
    expect(screen.queryByTestId("day-route-lead")).toBeNull();
    expect(screen.getByText("접기")).toBeTruthy();
  });

  it("다른 날(key가 바뀌면) 다시 접힌다", async () => {
    const a: DayRoute = { items: withPhotos([1, 2]), more: 0, diagram: false };
    const b: DayRoute = { items: withPhotos([4, 1]), more: 0, diagram: false };
    await render(<DayRouteSection key="2026-11-15" route={a} />);
    await expand();
    expect(screen.queryByTestId("day-route-lead")).toBeNull();
    await screen.rerender(<DayRouteSection key="2026-11-16" route={b} />);
    expect(screen.getByTestId("day-route-lead")).toHaveTextContent("자리1 외 1곳 펼치기", {
      exact: true,
    });
  });

  it("버튼은 펼침 상태를 낭독에 알린다", async () => {
    await renderMeasured({ items: withPhotos([1, 2]), more: 0, diagram: false });
    expect(screen.getByTestId("day-route-toggle").props.accessibilityState).toEqual({
      expanded: false,
    });
    await expand();
    expect(screen.getByTestId("day-route-toggle").props.accessibilityState).toEqual({
      expanded: true,
    });
  });

  it("지도·도식은 접힘과 상관없이 모든 점을 그린다", async () => {
    await renderMeasured({ items: withPhotos([1, 5, 2]), more: 0, diagram: true });
    for (const n of [1, 2, 3]) expect(byId(`day-route-dot-${n}`)).toBeTruthy();
  });
});
