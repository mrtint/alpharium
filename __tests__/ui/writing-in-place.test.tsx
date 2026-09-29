/**
 * 054 — 제자리 쓰기: 쓰는 중 홈 화면의 배선.
 *
 * 계약: specs/054-in-place-writing/contracts/writing-in-place.md W2~W8 (W1은 `__tests__/app/state.test.ts`)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **문구는 보드 `2b` KO 원문과 글자 단위로 같아야 한다**(W2 — 047 A3 방식: 참조했다는 「같다」가 아니다).
 *
 * reanimated 목의 `useAnimatedStyle`은 `{}`를 준다 — 실제 움직임(페이드)은 검사하지 못한다(C9).
 * 스트립이 잠겼다는 증거는 `pointerEvents`·접근성 숨김·불투명도 prop이다. 움직임은 실기기 녹화로 본다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  weekCellsFor,
  writePromptFor,
  type DiaryListItem,
  type WritePrompt,
} from "../../src/app/state";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";
import { COLORS, WRITING } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const NOW = new Date("2026-09-28T16:15:00");
const DAY = "2026-09-28";
const OTHER = "2026-09-27";

const code = (file: string) =>
  readFileSync(join(__dirname, "../..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const item = (day: string) => ({ day, readable: true, photos: { kind: "none" } }) as DiaryListItem;

function props(over: Partial<DiaryListScreenProps> = {}): DiaryListScreenProps {
  const items = [item(OTHER)];
  const write: WritePrompt = writePromptFor(items, NOW, DAY);
  return {
    items,
    write,
    cells: weekCellsFor(items, write, NOW),
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    onSwipe: jest.fn(),
    onPressDate: jest.fn(),
    onStop: jest.fn(),
    writing: { line: "사진 속에 뭐가 담겼는지 찬찬히 보는 중…", name: "금동이" },
    ...over,
  };
}

describe("W2 — KO 원문 (보드 2b)", () => {
  it("헤더 상태 줄·머리말·안내 줄·하단 바 문구가 글자 단위로 같다", async () => {
    await render(<DiaryListScreen {...props()} />);

    expect(screen.getByTestId("home-day-state")).toHaveTextContent(/^쓰는 중$/);
    expect(screen.getAllByText("쓰는 중")).toHaveLength(2); // 헤더 상태 줄 + 머리말
    expect(screen.getByTestId("writing-byline")).toHaveTextContent(
      /^금동이가 쓰고 있어요\. 진행률은 세지 않아요\.$/,
    );
    expect(screen.getByTestId("stop-button")).toHaveTextContent(/^그만두기$/);
  });

  it("조사가 이름의 받침을 따른다 — 받침 있으면 「이」, 없으면 「가」", async () => {
    const { rerender } = await render(
      <DiaryListScreen {...props({ writing: { line: "줄", name: "루이" } })} />,
    );
    expect(screen.getByTestId("writing-byline")).toHaveTextContent(
      /^루이가 쓰고 있어요\. 진행률은 세지 않아요\.$/,
    );

    await rerender(<DiaryListScreen {...props({ writing: { line: "줄", name: "밤" } })} />);
    expect(screen.getByTestId("writing-byline")).toHaveTextContent(
      /^밤이 쓰고 있어요\. 진행률은 세지 않아요\.$/,
    );
  });

  it("이름이 없으면 안내 줄을 그리지 않는다", async () => {
    await render(<DiaryListScreen {...props({ writing: { line: "줄" } })} />);
    expect(screen.queryByTestId("writing-byline")).toBeNull();
  });

  it("혼잣말 줄이 그대로 보이고, 첫 신호 전에는 「쓰고 있다」다", async () => {
    const { rerender } = await render(<DiaryListScreen {...props()} />);
    expect(screen.getByTestId("writing-monologue-text")).toHaveTextContent(
      "사진 속에 뭐가 담겼는지 찬찬히 보는 중…",
    );

    await rerender(<DiaryListScreen {...props({ writing: { name: "금동이" } })} />);
    expect(screen.getByTestId("writing-monologue-text")).toHaveTextContent("쓰고 있다");
  });
});

describe("W3 — 헤더", () => {
  it("상태 줄이 accent 13/600 「쓰는 중」이고 제목·dayStateText가 없다", async () => {
    await render(<DiaryListScreen {...props()} />);
    const state = screen.getByTestId("home-day-state");
    expect(state).toHaveStyle({ color: COLORS.accent, fontSize: 13, fontWeight: "600" });
    expect(screen.queryByTestId("home-day-title")).toBeNull();
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("28");
  });
});

describe("W4 — 스트립 잠금", () => {
  it("불투명도 .35·pointerEvents none·접근성 숨김이다", async () => {
    await render(<DiaryListScreen {...props()} />);
    const lock = screen.getByTestId("home-strip-lock", { includeHiddenElements: true });
    expect(lock).toHaveStyle({ opacity: WRITING.stripLockedOpacity });
    expect(lock.props.pointerEvents).toBe("none");
    expect(lock.props.accessibilityElementsHidden).toBe(true);
    expect(lock.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("칸을 눌러도 onSelectDay가 불리지 않는다(스트립을 스와이프로 넘기는 통로도 없다)", async () => {
    const p = props();
    await render(<DiaryListScreen {...p} />);
    const cell = screen.getByTestId(`day-${OTHER}`, { includeHiddenElements: true });
    await fireEvent.press(cell);
    expect(p.onSelectDay).not.toHaveBeenCalled();
    expect(p.onSwipe).not.toHaveBeenCalled();
  });

  it("writing이 없으면 스트립은 잠기지 않는다 (053 그대로)", async () => {
    await render(<DiaryListScreen {...props({ writing: undefined })} />);
    expect(screen.queryByTestId("home-strip-lock", { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId("day-strip")).toBeTruthy();
  });
});

describe("W5 — 헤더 날짜 잠금", () => {
  it("쓰는 중에는 큰 숫자·요일이 누를 수 없다", async () => {
    const p = props();
    await render(<DiaryListScreen {...p} />);
    expect(screen.queryByTestId("home-date-button")).toBeNull();
    expect(screen.queryByTestId("home-date-weekday")).toBeNull();
    expect(p.onPressDate).not.toHaveBeenCalled();
  });

  it("writing이 없으면 050 그대로 누르면 달력을 연다", async () => {
    const p = props({ writing: undefined });
    await render(<DiaryListScreen {...p} />);
    await fireEvent.press(screen.getByTestId("home-date-button"));
    expect(p.onPressDate).toHaveBeenCalledTimes(1);
  });
});

describe("W6 — 지면", () => {
  it("배경색 위, 안쪽 여백 32/20/120, 간격 14", async () => {
    await render(<DiaryListScreen {...props()} />);
    expect(screen.getByTestId("writing-paper")).toHaveStyle({
      backgroundColor: COLORS.bg,
      paddingTop: 32,
      paddingHorizontal: 20,
      paddingBottom: 120,
      gap: 14,
    });
  });

  it("머리말 → 혼잣말 → 안내 줄 순서다", async () => {
    await render(<DiaryListScreen {...props()} />);
    const order = screen
      .getByTestId("writing-paper")
      .children.map((child) =>
        typeof child === "object" && "props" in child ? (child.props.testID ?? "") : "",
      )
      .filter((id) => id !== "");
    expect(order).toEqual(["writing-kicker", "writing-monologue", "writing-byline"]);
  });

  it("혼잣말 24/700, 안내 줄 13이다", async () => {
    await render(<DiaryListScreen {...props()} />);
    expect(screen.getByTestId("writing-monologue-text")).toHaveStyle({
      fontSize: WRITING.monologue.fontSize,
      fontWeight: WRITING.monologue.fontWeight,
      lineHeight: WRITING.monologue.lineHeight,
    });
    expect(screen.getByTestId("writing-byline")).toHaveStyle({
      fontSize: WRITING.byline.fontSize,
      color: COLORS.textMuted,
    });
  });
});

describe("W7 — 진행률이 없다 (원칙 IV·FR-007)", () => {
  it("화면 글자 어디에도 %·경과 시간 표현이 없다", async () => {
    await render(<DiaryListScreen {...props()} />);
    const text = JSON.stringify(screen.toJSON());
    expect(text).not.toMatch(/\d+\s*%/);
    expect(text).not.toMatch(/\d+\s*(초|분)\s*(남|경과)/);
  });

  it("쓰는 중 화면 소스에 ActivityIndicator·TypewriterText가 없다", () => {
    for (const file of [
      "src/ui/DiaryHomeScreen.tsx",
      "src/ui/DiaryListScreen.tsx",
      "src/ui/WritingPaper.tsx",
    ]) {
      const body = code(file);
      expect(body).not.toMatch(/ActivityIndicator/);
      expect(body).not.toMatch(/TypewriterText/);
    }
  });
});

describe("W8 — 하단 바", () => {
  it("검정 전폭 「그만두기」이고 「일기 쓰기」·「다시 쓰기」 바가 없다", async () => {
    const p = props();
    await render(<DiaryListScreen {...p} />);
    const stop = screen.getByTestId("stop-button");
    expect(stop).toHaveStyle({ backgroundColor: COLORS.text, minHeight: 64 });
    expect(screen.getByText("그만두기")).toHaveStyle({ color: COLORS.bg });
    expect(screen.queryByTestId("write-button")).toBeNull();

    await fireEvent.press(stop);
    expect(p.onStop).toHaveBeenCalledTimes(1);
  });

  it("쓴 날을 다시 쓰는 중이어도 같은 그림이다(쓴 날 지면·다시 쓰기 바가 없다)", async () => {
    const items = [item(DAY)];
    const write = writePromptFor(items, NOW, DAY);
    await render(
      <DiaryListScreen
        {...props({
          items,
          write,
          cells: weekCellsFor(items, write, NOW),
          paper: {
            kind: "readable",
            madeUp: false,
            entry: {
              date: DAY,
              title: "제목",
              text: "본문",
              character: "quiet",
              signalsUsed: {},
              createdAt: new Date(`${DAY}T09:00:00`),
            } as never,
          },
        })}
      />,
    );
    expect(screen.getByTestId("writing-paper")).toBeTruthy();
    expect(screen.queryByTestId("written-paper")).toBeNull();
    expect(screen.queryByTestId("rewrite-bar", { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId("stop-button")).toBeTruthy();
    // 제목이 있는 쓴 날이어도 상태 줄은 「쓰는 중」이다.
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("쓰는 중");
    expect(screen.queryByTestId("home-day-title")).toBeNull();
  });
});
