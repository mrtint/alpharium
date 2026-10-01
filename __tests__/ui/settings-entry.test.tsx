/**
 * 055 — 홈의 설정 진입점 (보드 `6a`).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md E1~E6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 048의 월 라벨 줄 오른쪽 「일기」 글자가 점 세 개 설정 버튼이 된다. **홈 헤더가 그려지는 모든 상태에서 같은 자리**다 —
 * 안 쓴 날·쓴 날·쓴 날의 스트립이 접힌 때·쓰는 중(FR-002). 쓰기 시작 전 실패 안내는 홈 헤더가 없는 별도 화면이다(E6).
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import { weekCellsFor, writePromptFor, type DiaryListItem } from "../../src/app/state";
import type { PaperState } from "../../src/app/written-day";
import type { EnvironmentResolution } from "../../src/config/types";
import type { DiaryEntry } from "../../src/diary/types";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";
import { COLORS } from "../../src/ui/theme/tokens";
import { scrollPaper } from "./paper-end";

jest.setTimeout(30000);

const NOW = new Date("2026-09-28T16:15:00");
const DAY = "2026-09-27";

const item = (day: string) => ({ day, readable: true, photos: { kind: "none" } }) as DiaryListItem;
const entry = {
  date: DAY,
  title: "비 온 뒤 산책",
  text: "첫 문단이다.\n\n둘째 문단이다.",
  character: "quiet",
  signalsUsed: {},
  createdAt: new Date(`${DAY}T14:00:00`),
} as unknown as DiaryEntry;
const readable: PaperState = { kind: "readable", entry, madeUp: false };

function props(
  over: Partial<DiaryListScreenProps> & { chosen?: string } = {},
): DiaryListScreenProps {
  const items = [item(DAY)];
  const write = writePromptFor(items, NOW, over.chosen ?? null);
  return {
    items,
    write,
    cells: weekCellsFor(items, write, NOW),
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    ...over,
  };
}

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

describe("055 E1·E3·E4 — 월 라벨 줄 오른쪽의 설정 버튼", () => {
  it("★ E1 — 「일기」 글자 대신 home-settings 버튼이 있다", async () => {
    await render(<DiaryListScreen {...props()} />);
    expect(screen.getByTestId("home-settings")).toBeTruthy();
    expect(screen.queryByTestId("home-kicker")).toBeNull();
    // 월 라벨 줄에는 「일기」라는 글자가 없다(점 셋뿐)
    expect(screen.getByTestId("home-settings")).not.toHaveTextContent(/일기/);
  });

  it("E3 — 스크린리더 라벨 「설정」, 역할 button", async () => {
    await render(<DiaryListScreen {...props()} />);
    const button = screen.getByRole("button", { name: "설정" });
    expect(button.props.testID).toBe("home-settings");
  });

  it("E4 — 점 셋 5×5·본문 글자 색·간격 4, 누름 44×44, 보드 음수 여백 -14 -12 -14", async () => {
    await render(<DiaryListScreen {...props()} />);
    const button = screen.getByTestId("home-settings");
    const box = flat(button);
    expect(box.width).toBe(44);
    expect(box.height).toBe(44);
    expect(box.marginTop).toBe(-14);
    expect(box.marginRight).toBe(-12);
    expect(box.marginBottom).toBe(-14);

    const row = screen.getByTestId("home-settings-dots");
    expect(flat(row).gap).toBe(4);
    const dots = row.children as unknown as { props: { style?: unknown } }[];
    expect(dots).toHaveLength(3);
    for (const dot of dots) {
      const style = flat(dot);
      expect(style.width).toBe(5);
      expect(style.height).toBe(5);
      expect(style.backgroundColor).toBe(COLORS.text);
    }
  });

  it("★ E5 — 누르면 onOpenSettings가 한 번 불린다", async () => {
    const onOpenSettings = jest.fn();
    await render(<DiaryListScreen {...props({ onOpenSettings })} />);
    await fireEvent.press(screen.getByTestId("home-settings"));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

describe("★ 055 E2 — 홈 헤더의 모든 상태에서 같은 자리에 있다", () => {
  it("안 쓴 날", async () => {
    await render(<DiaryListScreen {...props({ chosen: "2026-09-26" })} />);
    expect(screen.getByTestId("home-settings")).toBeTruthy();
  });

  it("쓴 날", async () => {
    await render(<DiaryListScreen {...props({ chosen: DAY, paper: readable })} />);
    expect(screen.getByTestId("home-settings")).toBeTruthy();
  });

  it("★ 쓴 날의 스트립이 접힌 때 — 버튼은 접히지 않고 누를 수 있다", async () => {
    const onOpenSettings = jest.fn();
    await render(<DiaryListScreen {...props({ chosen: DAY, paper: readable, onOpenSettings })} />);
    await scrollPaper(40);
    // 접혔다 — 스트립은 접근성에서 빠졌다
    expect(screen.queryByTestId("day-strip")).toBeNull();
    // 설정 버튼은 그대로다
    await fireEvent.press(screen.getByTestId("home-settings"));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("★ 쓰는 중 — 버튼은 잠기지 않는다(쓰는 중에도 설정을 열 수 있다)", async () => {
    const onOpenSettings = jest.fn();
    await render(
      <DiaryListScreen {...props({ writing: { line: "쓰고 있다" }, onOpenSettings })} />,
    );
    await fireEvent.press(screen.getByTestId("home-settings"));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

describe("055 E2·E6 — DiaryHomeScreen을 거쳐", () => {
  const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
  const resolveQuiet = (day: string): ResolveOutcome => ({
    kind: "resolved",
    params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
  });

  it("홈이 onOpenSettings를 헤더까지 흘린다", async () => {
    const onOpenSettings = jest.fn();
    await render(
      <DiaryHomeScreen
        now={() => NOW}
        onOpenSettings={onOpenSettings}
        resolution={resolved}
        resolve={resolveQuiet}
        store={memoryStore()}
      />,
    );
    await fireEvent.press(await screen.findByTestId("home-settings"));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("E6 — 쓰기 시작 전 실패 안내 화면에는 설정 버튼이 없다", async () => {
    await render(
      <DiaryHomeScreen
        now={() => NOW}
        pipeline={{ run: jest.fn() }}
        resolution={resolved}
        resolve={() => ({ kind: "no-ready-character" })}
        store={memoryStore()}
      />,
    );
    await userEvent.press(await screen.findByTestId("write-button"));
    await screen.findByText(/준비/);
    expect(screen.queryByTestId("home-settings")).toBeNull();
  });
});
