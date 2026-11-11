/**
 * 115 — 하단 바의 색이 아래 안전 영역(홈 표시줄·내비게이션 바 자리)까지 닿는다 (보드 밖 초안).
 *
 * 계약: specs/115-bottom-bar-fill/contracts/bottom-bar.md B2·B3·B4·S2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 인셋 값은 기기에서 온다 — jest는 `SafeAreaInsetsContext`에 값을 주어 렌더한다. 모양(맨 아래 픽셀 행의 색)은 시뮬레이터
 * 스크린샷이 본다. ⚠️ RNTL 14의 `render`·`fireEvent`·`rerender`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { weekCellsFor, writePromptFor, type DiaryListItem } from "../../src/app/state";
import type { DiaryEntry } from "../../src/diary/types";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";
import { StackLayer } from "../../src/ui/StackLayer";
import {
  COLORS,
  MATERIAL_GRID,
  SIMULATION,
  TOAST,
  WRITING,
  WRITTEN_DAY,
} from "../../src/ui/theme/tokens";
import { reachPaperEnd } from "./paper-end";

jest.setTimeout(30000);

const NOW = new Date("2026-09-28T16:15:00");
const TODAY = "2026-09-28";
const PAST = "2026-09-27";

const withInset = (bottom: number, node: ReactElement) => (
  <SafeAreaInsetsContext.Provider value={{ top: 0, bottom, left: 0, right: 0 }}>
    {node}
  </SafeAreaInsetsContext.Provider>
);

const written = (day: string): DiaryListItem =>
  ({ day, readable: true, photos: { kind: "none" } }) as DiaryListItem;

const entry = (day: string): DiaryEntry =>
  ({
    date: day,
    title: "비 온 뒤 산책",
    text: "첫 문단이다.\n\n둘째 문단이다.",
    character: "quiet",
    signalsUsed: {},
    createdAt: new Date(`${day}T14:00:00`),
  }) as unknown as DiaryEntry;

function props(
  chosen: string,
  items: DiaryListItem[],
  over: Partial<DiaryListScreenProps> = {},
): DiaryListScreenProps {
  const write = writePromptFor(items, NOW, chosen);
  return {
    items,
    write,
    cells: weekCellsFor(items, write, NOW),
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    ...over,
  };
}

/** 안 쓴 날(오늘, 일기 없음) */
const unwrittenProps = (over: Partial<DiaryListScreenProps> = {}) => props(TODAY, [], over);

/** 쓴 날(어제) */
const writtenProps = (over: Partial<DiaryListScreenProps> = {}) =>
  props(PAST, [written(PAST)], {
    paper: { kind: "readable", entry: entry(PAST), madeUp: false },
    ...over,
  });

const flat = (testID: string, opts?: { includeHiddenElements?: boolean }) =>
  StyleSheet.flatten(screen.getByTestId(testID, opts).props.style) ?? {};

/** 호스트 노드에서 위로 올라가며 처음 만나는 `bottom` 스타일 값 */
function bottomOf(start: unknown): number | undefined {
  let node = start as { props: { style?: unknown }; parent: unknown } | null;
  while (node !== null && node !== undefined) {
    const style = StyleSheet.flatten(node.props.style as never) as { bottom?: number } | undefined;
    if (style?.bottom !== undefined) return style.bottom;
    node = node.parent as typeof node;
  }
  return undefined;
}

describe("115 B2 — 바 세 가지의 면이 아래 인셋만큼 내려간다", () => {
  it("안 쓴 날 「일기 쓰기」: 최소 높이 98·아래 여백 44, 빨강, 위쪽 반경 6", async () => {
    await render(withInset(34, <DiaryListScreen {...unwrittenProps()} />));
    const style = flat("write-button");
    expect(style).toMatchObject({
      minHeight: 98,
      paddingBottom: 44,
      backgroundColor: COLORS.accent,
      borderTopLeftRadius: WRITTEN_DAY.bar.radius,
      borderTopRightRadius: WRITTEN_DAY.bar.radius,
    });
  });

  it("쓰는 중 「그만두기」: 최소 높이 98·아래 여백 44, 검정", async () => {
    await render(
      withInset(
        34,
        <DiaryListScreen {...unwrittenProps({ writing: { line: "쓰는 중…", name: "금동이" } })} />,
      ),
    );
    expect(flat("stop-button")).toMatchObject({
      minHeight: 98,
      paddingBottom: 44,
      backgroundColor: COLORS.text,
    });
  });

  it("쓴 날 「다시 쓰기」: 최소 높이 98·아래 여백 44, 연회색", async () => {
    await render(withInset(34, <DiaryListScreen {...writtenProps()} />));
    await reachPaperEnd();
    expect(flat("write-button")).toMatchObject({
      minHeight: 98,
      paddingBottom: 44,
      backgroundColor: WRITTEN_DAY.rewriteBar,
    });
  });

  it("상태 흉내: 「일기 쓰기」·「다시 쓰기」는 회색 면이 같이 내려가고, 「그만두기」는 흉내에서도 검정이다", async () => {
    const simulation = { onOpenDeveloper: jest.fn() };
    const view = await render(
      withInset(34, <DiaryListScreen {...unwrittenProps({ simulation })} />),
    );
    expect(flat("write-button")).toMatchObject({
      minHeight: 98,
      backgroundColor: SIMULATION.barFill,
    });
    await view.unmount();

    const rewrite = await render(
      withInset(34, <DiaryListScreen {...writtenProps({ simulation })} />),
    );
    await reachPaperEnd();
    expect(flat("write-button")).toMatchObject({
      paddingBottom: 44,
      backgroundColor: SIMULATION.barFill,
    });
    await rewrite.unmount();

    await render(
      withInset(
        34,
        <DiaryListScreen
          {...unwrittenProps({ simulation, writing: { line: "쓰는 중…", name: "금동이" } })}
        />,
      ),
    );
    expect(flat("stop-button")).toMatchObject({ backgroundColor: COLORS.text, minHeight: 98 });
  });

  it("인셋 0이면 종전(64·10)이고, 인셋이 바뀌면(회전 등) 바 치수가 따라온다", async () => {
    const view = await render(withInset(0, <DiaryListScreen {...unwrittenProps()} />));
    expect(flat("write-button")).toMatchObject({ minHeight: 64, paddingBottom: 10 });
    await view.rerender(withInset(34, <DiaryListScreen {...unwrittenProps()} />));
    expect(flat("write-button")).toMatchObject({ minHeight: 98, paddingBottom: 44 });
    await view.rerender(withInset(0, <DiaryListScreen {...unwrittenProps()} />));
    expect(flat("write-button")).toMatchObject({ minHeight: 64, paddingBottom: 10 });
  });

  it("제공자 없이도 던지지 않고 0이다", async () => {
    await render(<DiaryListScreen {...unwrittenProps()} />);
    expect(flat("write-button")).toMatchObject({ minHeight: 64, paddingBottom: 10 });
  });
});

describe("115 B3·B4 — 바에 기대는 것이 따라온다", () => {
  it("B3 — 토스트 바닥은 잰 바 높이(인셋 포함) + 12, 인셋 값을 따로 더하지 않는다", async () => {
    await render(
      withInset(34, <DiaryListScreen {...unwrittenProps({ toast: { id: 1, text: "실패" } })} />),
    );
    await fireEvent(screen.getByTestId("write-bar"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 98 } },
    });
    expect(bottomOf(screen.getByText("실패"))).toBe(98 + TOAST.gapAboveBar);
  });

  it("B3 — 제약 띠 바닥은 잰 바 높이다", async () => {
    await render(
      withInset(
        34,
        <DiaryListScreen
          {...unwrittenProps({
            constraint: { text: "사진 권한이 없어요", action: "권한 허용", onAction: jest.fn() },
          })}
        />,
      ),
    );
    await fireEvent(screen.getByTestId("write-bar"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 98 } },
    });
    expect(bottomOf(screen.getByTestId("constraint-band"))).toBe(98);
  });

  it("B4 — 안 쓴 날 재료 지면 아래 여백은 120 + 인셋이다(띠 없음)", async () => {
    await render(withInset(34, <DiaryListScreen {...unwrittenProps()} />));
    expect(flat("material-paper").paddingBottom).toBe(MATERIAL_GRID.paperPadding.bottom + 34);
  });

  it("B4 — 쓴 날 지면 아래 여백은 띠 높이(없으면 0) + 인셋이다", async () => {
    await render(withInset(34, <DiaryListScreen {...writtenProps()} />));
    const content = StyleSheet.flatten(
      screen.getByTestId("written-paper").props.contentContainerStyle,
    );
    expect(content.paddingBottom).toBe(34);
  });

  it("B4 — 쓰는 중 지면 아래 여백도 120 + 인셋이다(바가 인셋만큼 커졌으니 혼잣말이 바에 붙지 않는다)", async () => {
    const writing = { line: "쓰는 중…", name: "금동이" };
    const view = await render(withInset(34, <DiaryListScreen {...unwrittenProps({ writing })} />));
    expect(flat("writing-paper").paddingBottom).toBe(WRITING.paperPadding.bottom + 34);
    await view.unmount();
    await render(withInset(0, <DiaryListScreen {...unwrittenProps({ writing })} />));
    expect(flat("writing-paper").paddingBottom).toBe(WRITING.paperPadding.bottom);
  });

  it("B3 — 재기 전 첫 프레임의 토스트 바닥도 최소 높이 + 인셋 + 12다", async () => {
    await render(
      withInset(34, <DiaryListScreen {...unwrittenProps({ toast: { id: 1, text: "실패" } })} />),
    );
    expect(bottomOf(screen.getByText("실패"))).toBe(64 + 34 + TOAST.gapAboveBar);
  });

  it("B4 — 인셋 0이면 쓴 날 지면 아래 여백은 0, 안 쓴 날은 120이다(종전)", async () => {
    const view = await render(withInset(0, <DiaryListScreen {...writtenProps()} />));
    const content = StyleSheet.flatten(
      screen.getByTestId("written-paper").props.contentContainerStyle,
    );
    expect(content.paddingBottom).toBe(0);
    await view.unmount();
    await render(withInset(0, <DiaryListScreen {...unwrittenProps()} />));
    expect(flat("material-paper").paddingBottom).toBe(MATERIAL_GRID.paperPadding.bottom);
  });
});

describe("115 S2 — 겹(StackLayer)이 아래 인셋을 비킨다", () => {
  it("열린 겹의 안쪽 여백 아래가 인셋이다", async () => {
    await render(
      withInset(
        34,
        <StackLayer onClose={() => {}} open>
          <Text testID="layer-child">설정</Text>
        </StackLayer>,
      ),
    );
    const layer = screen.getByTestId("layer-child").parent as { props: { style?: unknown } };
    expect(StyleSheet.flatten(layer.props.style as never)).toMatchObject({ paddingBottom: 34 });
  });

  it("중첩된 겹(설정 안의 이름 바꾸기)은 각자 한 번만 비킨다 — 34씩, 68이 아니다", async () => {
    await render(
      withInset(
        34,
        <StackLayer onClose={() => {}} open>
          <Text testID="outer-child">설정</Text>
          <StackLayer onClose={() => {}} open>
            <Text testID="inner-child">이름</Text>
          </StackLayer>
        </StackLayer>,
      ),
    );
    for (const id of ["outer-child", "inner-child"]) {
      const layer = screen.getByTestId(id).parent as { props: { style?: unknown } };
      expect(StyleSheet.flatten(layer.props.style as never)).toMatchObject({ paddingBottom: 34 });
    }
  });

  it("인셋 0이면 0이다", async () => {
    await render(
      withInset(
        0,
        <StackLayer onClose={() => {}} open>
          <Text testID="layer-child">설정</Text>
        </StackLayer>,
      ),
    );
    const layer = screen.getByTestId("layer-child").parent as { props: { style?: unknown } };
    expect(StyleSheet.flatten(layer.props.style as never)).toMatchObject({ paddingBottom: 0 });
  });
});

describe("115 T017 — 재기 전 첫 프레임에도 내려간 바가 비치지 않는다", () => {
  // jest의 reanimated 목은 공유값을 그대로 돌려줘 움직임을 보지 못한다 — 초기값은 소스로 잠근다(실제 모양은 시뮬레이터).
  const source = readFileSync(join(__dirname, "../../src/ui/DiaryListScreen.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("`RewriteBar`의 내려가는 거리 공유값은 최소 높이 + 인셋으로 시작한다", () => {
    expect(source).toMatch(/useSharedValue<number>\(WRITTEN_DAY\.bar\.minHeight \+ inset\)/);
  });
});
