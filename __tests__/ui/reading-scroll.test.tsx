/**
 * 052 — 읽기 스크롤: 쓴 날의 스트립 접힘·펼침 배선.
 *
 * 계약: specs/052-reading-scroll/contracts/reading-scroll.md PAPER·RS·TAP·SRC
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * reanimated 목의 `useAnimatedStyle`은 `{}`를 준다 — 높이·불투명도 값은 검사하지 못한다(C9). 접힘의
 * 증거는 `pointerEvents`, 접근성 숨김, 누름 갈래다. 움직임은 실기기 녹화로 본다.
 *
 * **접힘 표시(▾)도, 접힌 날짜 줄을 눌러 펴는 길도 없다**(저장소 소유자). 펼침의 유일한 길은 지면을 맨 위까지
 * 올리는 것이다.
 *
 * 날짜 기준: 지금 = 2026-09-28(월) 16:15. 쓴 날은 9/27·9/26.
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
import type { PaperState } from "../../src/app/written-day";
import type { DiaryEntry } from "../../src/diary/types";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";
import { DATE_JUMP } from "../../src/ui/home-text";
import { READING_SCROLL as TOKENS } from "../../src/ui/theme/tokens";
import { reachPaperEnd, scrollPaper } from "./paper-end";

jest.setTimeout(30000);

const NOW = new Date("2026-09-28T16:15:00");
const DAY = "2026-09-27";
const OTHER = "2026-09-26";

const code = (file: string) =>
  readFileSync(join(__dirname, "../..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const item = (day: string) => ({ day, readable: true, photos: { kind: "none" } }) as DiaryListItem;

const entry = (day: string): DiaryEntry =>
  ({
    date: day,
    title: "비 온 뒤 산책",
    text: "첫 문단이다.\n\n둘째 문단이다.",
    character: "quiet",
    signalsUsed: {},
    createdAt: new Date(`${day}T14:00:00`),
  }) as unknown as DiaryEntry;

const readable = (day: string): PaperState => ({
  kind: "readable",
  entry: entry(day),
  madeUp: false,
});

function props(day: string, over: Partial<DiaryListScreenProps> = {}): DiaryListScreenProps {
  const items = [item(DAY), item(OTHER)];
  const write: WritePrompt = writePromptFor(items, NOW, day);
  return {
    items,
    write,
    cells: weekCellsFor(items, write, NOW),
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    onPressDate: jest.fn(),
    paper: readable(day),
    ...over,
  };
}

const folded = () =>
  screen.getByTestId("home-strip-fold", { includeHiddenElements: true }).props.pointerEvents ===
  "none";

describe("052 RS — 접힘 배선", () => {
  it("RS1 — 아래로 20px 스크롤하면 스트립이 접힌다(누름·접근성에서 빠짐)", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    expect(screen.getByTestId("day-strip")).toBeTruthy();

    await scrollPaper(20);

    expect(folded()).toBe(true);
    expect(screen.queryByTestId("day-strip")).toBeNull();
  });

  it("RS2 — 펼친 상태에서는 스트립이 보인다", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    expect(screen.getByTestId("day-strip")).toBeTruthy();
    expect(folded()).toBe(false);
  });

  it("RS3 — 접힌 뒤 맨 위(y=1)로 올라오면 펼쳐진다", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(30);
    expect(folded()).toBe(true);
    await scrollPaper(1);
    expect(folded()).toBe(false);
    expect(screen.getByTestId("day-strip")).toBeTruthy();
  });

  it("RS3b — 접힌 채 위로 스크롤하지만 맨 위가 아니면(y=30→10) 접힌 채다", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(30);
    await scrollPaper(10);
    expect(folded()).toBe(true);
  });

  it("RS4 — 안내 캡션(거부 권한·캐릭터 옮김)이 접힘 판 안에 있어 함께 접힌다(FR-017)", async () => {
    await render(
      <DiaryListScreen
        {...props(DAY, { deniedNotices: ["사진 권한이 없어요."], movedNotice: "옮겼어요." })}
      />,
    );
    expect(screen.getByTestId("denied-notices")).toBeTruthy();
    expect(screen.getByText("옮겼어요.")).toBeTruthy();

    await scrollPaper(20);

    expect(screen.queryByTestId("denied-notices")).toBeNull();
    expect(screen.queryByText("옮겼어요.")).toBeNull();
  });

  it("RS5 — 접힌 채 다른 쓴 날로 바뀌면 펼친 상태, 같은 날 리렌더면 접힌 채다(FR-015)", async () => {
    const { rerender } = await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(20);
    expect(folded()).toBe(true);

    await rerender(<DiaryListScreen {...props(DAY)} />);
    expect(folded()).toBe(true);

    await rerender(<DiaryListScreen {...props(OTHER)} />);
    expect(folded()).toBe(false);
    expect(screen.getByTestId("day-strip")).toBeTruthy();
  });

  it("RS6 — 안 쓴 날에는 접힘 판이 없고 신호 줄이 그대로다(FR-016)", async () => {
    await render(<DiaryListScreen {...props(DAY, { paper: { kind: "unwritten" } })} />);
    expect(screen.queryByTestId("home-strip-fold", { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId("signal-row")).toBeTruthy();
  });

  it("RS7 — 접혀도 날짜·요일·제목은 그대로 그려지고 크기가 같다(FR-003)", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    const sizes = () =>
      ["home-day-number", "home-weekday", "home-day-title"].map((id) => {
        const node = screen.getByTestId(id);
        const flat = Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
        return [id, flat.fontSize];
      });
    const before = sizes();

    await scrollPaper(20);
    expect(folded()).toBe(true);

    expect(sizes()).toEqual(before);
  });

  it("RS8 — 접혀도 큰 숫자의 정렬이 바뀌지 않는다: 위쪽 정렬 래퍼가 없다", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(20);
    expect(folded()).toBe(true);

    // 큰 숫자에서 위로 올라가며(날짜 줄 안) 만나는 스타일에 위쪽 정렬이 없어야 한다.
    let node = screen.getByTestId("home-day-number").parent;
    const aligned: unknown[] = [];
    for (let depth = 0; node && depth < 6; depth += 1) {
      const flat = Object.assign({}, ...[node.props?.style].flat(Infinity).filter(Boolean));
      if (flat.alignSelf !== undefined) aligned.push(flat.alignSelf);
      node = node.parent;
    }
    expect(aligned).not.toContain("flex-start");
  });

  it("RS9 — 제목은 한 줄 말줄임이다(줄이 바뀌면 날짜 영역이 넓어져 UI를 해친다)", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    const title = screen.getByTestId("home-day-title");
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.ellipsizeMode).toBe("tail");
  });

  it("RS10 — 지면 프레임은 접힘으로 움직이지 않는다: 스트립은 프레임 위에 덮는 판이고 프레임에 marginTop이 없다", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    const fold = screen.getByTestId("home-strip-fold", { includeHiddenElements: true });
    const flat = (n: { props: { style?: unknown } }) =>
      Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
    expect(flat(fold)).toMatchObject({ position: "absolute", top: 0 });

    const paper = screen.getByTestId("written-paper");
    expect(flat(paper).marginTop).toBeUndefined();
    expect(screen.getByTestId("home-fold-spacer", { includeHiddenElements: true })).toBeTruthy();
  });

  it("RS11 — 소스: 지면 프레임에 marginTop이 없고 접힘은 판·스페이서가 같은 움직임 값을 본다", () => {
    const paperSrc = code("src/ui/WrittenDayPaper.tsx");
    expect(paperSrc).not.toMatch(/marginTop/);
    const screenSrc = code("src/ui/DiaryListScreen.tsx");
    expect(screenSrc).toMatch(/useFoldMotion\(/);
    expect(screenSrc).toMatch(/<FoldSpacer motion=\{motion\}/);
    expect(screenSrc).toMatch(/<StripOverlay/);
  });
});

describe("052 PAPER — 지면 알림", () => {
  it("PAPER1 — previousY는 직전 사건의 y다: 30 다음 2는 위로 가는 중이라 펼친다", async () => {
    // previousY를 늘 0으로 쓰면 2 ≥ 0이라 「아래」가 되어 접힌 채로 남는다.
    await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(30);
    await scrollPaper(2);
    expect(folded()).toBe(false);
  });

  it("PAPER2 — 끝에 닿아 바가 올라온 뒤 보이는 높이만 줄어도 바는 그대로다(FR-010)", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(1200); // 2000 − 800 = 1200 → 끝
    expect(screen.getByTestId("rewrite-bar")).toBeTruthy();

    const paper = screen.getByTestId("written-paper");
    await fireEvent(paper, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 500 } },
    });
    expect(screen.getByTestId("rewrite-bar")).toBeTruthy();
  });

  it("PAPER3 — 짧은 본문이면 처음부터 바가 보인다(051 회귀)", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    await reachPaperEnd();
    expect(screen.getByTestId("rewrite-bar")).toBeTruthy();
  });

  it("PAPER4 — 위치가 그대로인 스크롤 사건은 접힘도 끝 판정도 다시 돌리지 않는다(레이아웃 변화)", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(1200);
    expect(folded()).toBe(true);
    expect(screen.getByTestId("rewrite-bar")).toBeTruthy();

    // 지면 높이가 바뀌면 안드로이드가 같은 위치로 사건을 다시 낸다.
    const paper = screen.getByTestId("written-paper");
    await fireEvent(paper, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
    });
    await fireEvent.scroll(paper, { nativeEvent: { contentOffset: { y: 1200 } } });

    expect(folded()).toBe(true); // 펴지지 않는다
    expect(screen.getByTestId("rewrite-bar")).toBeTruthy(); // 바가 내려가지 않는다
  });

  it("PAPER5 — 내용 크기가 1px 미만으로 흔들려 다시 와도 끝 판정을 다시 돌리지 않는다(부동소수 오차)", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    await scrollPaper(1200);
    expect(screen.getByTestId("rewrite-bar")).toBeTruthy();

    const paper = screen.getByTestId("written-paper");
    await fireEvent(paper, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
    });
    await fireEvent(paper, "contentSizeChange", 400, 1999.9999);
    await fireEvent(paper, "contentSizeChange", 400, 2000.0001);

    expect(screen.getByTestId("rewrite-bar")).toBeTruthy();
  });
});

describe("052 TAP — 날짜 누름 (접힘 표시·펴는 누름 없음)", () => {
  it("TAP1 — 접힌 동안에도 큰 숫자 누름은 050 그대로 달력이다", async () => {
    const p = props(DAY);
    await render(<DiaryListScreen {...p} />);
    await scrollPaper(20);
    expect(folded()).toBe(true);

    await fireEvent.press(screen.getByTestId("home-date-button"));

    expect(p.onPressDate).toHaveBeenCalledTimes(1);
    expect(folded()).toBe(true); // 누름으로는 펴지지 않는다
  });

  it.each([
    ["쓴 날", readable(DAY)],
    ["안 쓴 날", { kind: "unwritten" } as PaperState],
  ])("TAP2 — 펼친 %s의 큰 숫자 누름은 달력이다(050 CAL1)", async (_name, paper) => {
    const p = props(DAY, { paper });
    await render(<DiaryListScreen {...p} />);
    expect(screen.getByTestId("home-date-button").props.accessibilityLabel).toBe(DATE_JUMP.title);
    await fireEvent.press(screen.getByTestId("home-date-button"));
    expect(p.onPressDate).toHaveBeenCalledTimes(1);
  });

  it("TAP3 — 접힘 표시(▾)와 접힌 날짜 줄 누름은 어느 상태에도 없다", async () => {
    await render(<DiaryListScreen {...props(DAY)} />);
    for (const y of [0, 20]) {
      if (y > 0) await scrollPaper(y);
      expect(screen.queryByTestId("home-fold-caret", { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByTestId("home-date-row", { includeHiddenElements: true })).toBeNull();
    }
  });

  it("TAP4 — 소스: 접힘 표시·펼치기 문구·날짜 줄 누름이 코드에 없다", () => {
    for (const file of ["src/ui/DiaryListScreen.tsx", "src/ui/home-text.ts"]) {
      const src = code(file);
      expect(src).not.toContain("▾");
      expect(src).not.toMatch(/home-fold-caret|home-date-row|expandLabel|FoldCaret/);
    }
  });
});

describe("052 SRC — 토큰", () => {
  it("SRC2 — 접힘 시간 토큰이 보드 `5b` 값이다", () => {
    expect(TOKENS.foldMs).toBe(240);
    expect(TOKENS.fadeMs).toBe(180);
  });
});
