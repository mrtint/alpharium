/**
 * 홈 화면(일기 목록) 테스트 — 048, 보드 `1d`.
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md H1~H8 (헤더), HS5
 *       specs/048-diary-home-modernist/contracts/home-screen.md B·G, US5 카드
 *       (이전: specs/006-first-diary-app/contracts/screens.md §2 — S1·S7·FR-017a는 그대로 산다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **무엇이 보이고 무엇이 보이지 않는가**를 본다. 미감은 실기기 육안이 맡는다.
 *
 * 006부터 이어지는 방어는 그대로다: `onWrite`는 인자가 없고(S1), 빈 화면을 보이지 않으며(S7),
 * 읽을 수 없는 일기는 사라지지 않고(FR-017a), 「사진 없음」과 「사진 모름」은 다른 말이다(원칙 V).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";

import {
  weekCellsFor,
  writePromptFor,
  type DayPreview,
  type DiaryListItem,
  type PhotoHint,
  type WritePrompt,
} from "../../src/app/state";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";
import { COLORS } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const readable = (day: string, photos: PhotoHint = { kind: "none" }, title?: string) =>
  ({ day, readable: true, photos, ...(title !== undefined ? { title } : {}) }) as DiaryListItem;

/** 2026-09-24(목) 10:00 — 정오 전. 049부터 기본 선택은 오늘(09-24) */
const MORNING = new Date("2026-09-24T10:00:00");
/** 2026-09-13(일) 15:00 — 정오 후. 기본 선택은 09-13(오늘) */
const SUNDAY_AFTERNOON = new Date("2026-09-13T15:00:00");

async function renderHome(
  opts: {
    items?: DiaryListItem[];
    now?: Date;
    chosen?: string | null;
    write?: WritePrompt;
  } & Partial<DiaryListScreenProps> = {},
) {
  const items = opts.items ?? [];
  const now = opts.now ?? MORNING;
  const write = opts.write ?? writePromptFor(items, now, opts.chosen ?? null);
  const props: DiaryListScreenProps = {
    items,
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    write,
    cells: weekCellsFor(items, write, now),
    ...opts,
  };
  await render(<DiaryListScreen {...props} />);
  return props;
}

/** 호스트 노드가 스크롤 컨테이너 안에 있는가 */
function insideScrollView(node: { parent: unknown; type: unknown } | null): boolean {
  let cur = node?.parent as { parent: unknown; type: unknown } | null;
  while (cur) {
    if (cur.type === "RCTScrollView") return true;
    cur = cur.parent as { parent: unknown; type: unknown } | null;
  }
  return false;
}

describe("048 H — 1d 구조와 헤더", () => {
  it("★ H1 — 헤더·스트립·신호 줄이 스크롤 안에, 하단 바는 스크롤 밖에 (051 — 목록 머리 없음)", async () => {
    await renderHome({ items: [readable("2026-09-20")] });

    for (const id of [
      "home-month",
      "home-kicker",
      "home-day-number",
      "home-weekday",
      "home-day-state",
      "day-strip",
      "signal-row",
    ]) {
      expect(insideScrollView(screen.getByTestId(id) as never)).toBe(true);
    }
    expect(insideScrollView(screen.getByTestId("write-button") as never)).toBe(false);
    expect(screen.getByTestId("home-kicker")).toHaveTextContent("일기");
    expect(screen.queryByTestId("home-recent")).toBeNull();
  });

  it("H3·H4 — 고른 날의 큰 날짜·요일, 오늘이면 「오늘 일기를 쓸 수 있어요」", async () => {
    await renderHome({ now: SUNDAY_AFTERNOON });

    expect(screen.getByTestId("home-day-number")).toHaveTextContent("13");
    expect(screen.getByTestId("home-weekday")).toHaveTextContent("일요일");
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("오늘 일기를 쓸 수 있어요");
  });

  it("★ H4 — 정오 전 오늘도 같은 문장이다 (049 FR-018b)", async () => {
    await renderHome();
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("24");
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("오늘 일기를 쓸 수 있어요");
  });

  it("H4 — 지난 날은 「이 날 일기를 쓸 수 있어요」", async () => {
    await renderHome({ chosen: "2026-09-22" });
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("이 날 일기를 쓸 수 있어요");
  });

  it("H4 — 쓴 날은 제목, 제목이 없으면 「이 날 일기를 썼어요」", async () => {
    await renderHome({
      items: [readable("2026-09-23", { kind: "none" }, "비 오는 수요일")],
      chosen: "2026-09-23",
    });
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("비 오는 수요일");
    await renderHome({ items: [readable("2026-09-23")], chosen: "2026-09-23" });
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("이 날 일기를 썼어요");
  });

  it("★ H6 — 날짜 표시(월 라벨·숫자·요일)에 「오늘」 글자가 없다", async () => {
    await renderHome();
    for (const id of ["home-month", "home-kicker", "home-day-number", "home-weekday"]) {
      expect(screen.getByTestId(id)).not.toHaveTextContent(/오늘/);
    }
  });

  /**
   * ★ 050 CAL1 — 049 H7(「헤더의 날짜 묶음에는 누름 처리가 없다」)을 대체한다. 050이 큰 숫자·요일 영역에
   * 「날짜로 이동」 달력을 여는 누름을 붙였다(spec FR-012). **월 라벨·상태 줄은 여전히 누를 수 없다.**
   */
  it("★ CAL1 — 큰 숫자·요일만 누를 수 있고 누르면 onPressDate 1회", async () => {
    const onPressDate = jest.fn();
    await renderHome({ onPressDate });

    await fireEvent.press(screen.getByTestId("home-date-button"));
    expect(onPressDate).toHaveBeenCalledTimes(1);
    // 051 수정 — 요일은 상태 줄과 같은 세로 묶음으로 옮겨 따로 감쌌다. 같은 동작이다.
    await fireEvent.press(screen.getByTestId("home-date-weekday"));
    expect(onPressDate).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("home-date-button")).toHaveProp("accessibilityLabel", "날짜로 이동");
  });

  it("★ CAL1 — 월 라벨·「일기」 표지·상태 줄을 눌러도 달력이 열리지 않는다", async () => {
    const onPressDate = jest.fn();
    await renderHome({ onPressDate });

    for (const id of ["home-month", "home-kicker", "home-day-state"]) {
      await fireEvent.press(screen.getByTestId(id));
    }
    expect(onPressDate).not.toHaveBeenCalled();
  });

  it("CAL1 — 크로스페이드 겹(DayHeading·DayFace) 자체에는 누름이 없다 — 누름은 감싸는 한 곳뿐", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/DiaryListScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const heading = code.slice(
      code.indexOf("function DayHeading"),
      code.indexOf("function DayFace"),
    );
    const face = code.slice(code.indexOf("function DayFace"), code.indexOf("function Notices"));
    for (const part of [heading, face]) {
      expect(part).not.toContain("Pressable");
      expect(part).not.toContain("onPress");
    }
    const header = code.slice(code.indexOf("function Header"), code.indexOf("function DayHeading"));
    expect(header.match(/home-date-button/g) ?? []).toHaveLength(1);
  });

  it("H8 — 날이 바뀌면 이전 날이 잠시 함께 그려진다 (크로스페이드 배선, C9)", async () => {
    const items: DiaryListItem[] = [];
    const first = writePromptFor(items, MORNING, "2026-09-24");
    const second = writePromptFor(items, MORNING, "2026-09-21");
    const base = { items, onOpen: jest.fn(), onWrite: jest.fn(), onSelectDay: jest.fn() };
    await render(
      <DiaryListScreen {...base} cells={weekCellsFor(items, first, MORNING)} write={first} />,
    );
    expect(screen.queryByTestId("home-day-fade-out")).toBeNull();

    await act(async () => {
      screen.rerender(
        <DiaryListScreen {...base} cells={weekCellsFor(items, second, MORNING)} write={second} />,
      );
    });
    expect(screen.getByTestId("home-day-fade-out")).toHaveTextContent(/24/);
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("21");
  });

  // 실기기(2026-09-28): 한 공유값을 effect에서 0으로 되돌리니, effect가 첫 프레임 뒤에 돌아
  // 새 날 → 이전 날 → 새 날로 숫자가 빠르게 여러 번 바뀌어 보였다. 겹마다 새로 마운트하고
  // 시작 투명도를 마운트 값으로 준다.
  it("★ H9 — 크로스페이드 시작값을 effect에서 되돌리지 않는다 (겹은 날마다 새로 마운트)", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/DiaryListScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const fade = code.slice(code.indexOf("function DayHeading"), code.indexOf("function DayFace"));
    expect(fade).not.toMatch(/\.value\s*=\s*[01]\s*;/);
    expect(fade).toContain("useSharedValue(from)");
    expect(fade).toMatch(/key=\{`in-\$\{shown\.day\}`\}/);
    expect(fade).toMatch(/key=\{`out-\$\{shown\.previous\}-\$\{shown\.day\}`\}/);
  });

  // 실기기(2026-09-28, 사용자 요청): 「6」과 「30」 사이를 넘기면 큰 숫자 폭이 달라 요일이 옆으로
  // 밀렸다. 숫자 칸은 언제나 두 자리 폭이다.
  it("★ H10 — 큰 날짜 칸은 두 자리 폭을 잡는다 (한 자리 날에도 요일이 밀리지 않는다)", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/DiaryListScreen.tsx"), "utf8");
    expect(code).toMatch(/const DAY_NUMBER_WIDTH = "00";/);
    const face = code.slice(code.indexOf("function DayFace"), code.indexOf("function Notices"));
    expect(face).toContain("{DAY_NUMBER_WIDTH}");
    expect(face).toMatch(/importantForAccessibility="no-hide-descendants"/);
    expect(face).toMatch(/position: "absolute", left: 0/);
  });

  it("★ H4 — 월 표시는 고른 날의 달이다 (Clarification Q2)", async () => {
    const now = new Date("2026-09-02T15:00:00");
    await renderHome({ now, chosen: "2026-08-31" });

    expect(screen.getByTestId("home-month")).toHaveTextContent("2026년 8월");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("31");
  });

  it("★ HS5 — 사흘 밖의 날을 골라도 되돌림 안내가 없다 (049 FR-022a)", async () => {
    await renderHome({ chosen: "2026-09-10" });

    expect(screen.getByTestId("home-day-number")).toHaveTextContent("10");
    expect(screen.queryByText(/바꿨어요/)).toBeNull();
  });

  it("H5 — 캐릭터 옮김 안내는 부모가 준 문장을 그대로 보인다", async () => {
    await renderHome({ movedNotice: "루이을(를) 쓸 수 없어 금동이(으)로 바꿨어요" });

    expect(screen.getByText("루이을(를) 쓸 수 없어 금동이(으)로 바꿨어요")).toBeTruthy();
  });

  it("H6 — 거부 권한 안내가 보인다", async () => {
    await renderHome({ deniedNotices: ["사진을 볼 수 없어서 일기는 사진 없이 써요."] });

    expect(screen.getByTestId("denied-notices")).toBeTruthy();
    expect(screen.getByText("사진을 볼 수 없어서 일기는 사진 없이 써요.")).toBeTruthy();
  });

  it("옛 쓰기 자리 문구가 없다", async () => {
    await renderHome({ items: [readable("2026-09-20")] });

    expect(screen.queryByText("언제를 쓸까")).toBeNull();
    expect(screen.queryByText(/를 쓴다$/)).toBeNull();
    expect(screen.queryByText("아직 일기가 없다")).toBeNull();
  });

  it("스트립에서 고르면 부모에 알린다", async () => {
    const props = await renderHome();

    await fireEvent.press(screen.getByTestId("day-2026-09-22"));
    expect(props.onSelectDay).toHaveBeenCalledWith("2026-09-22");
  });
});

describe("048 B — 하단 바와 쓰기", () => {
  /**
   * 051 수정 — 보드 `1d`의 바는 화면 폭 전체의 빨강 블록 「일기 쓰기」 하나다. 048의 「n일」 조각과 `⋯` 메뉴는
   * 보드에 없어 걷어냈다(메뉴는 저장소 소유자 지시). B3(날짜 조각은 누를 수 없다)은 조각이 없어져 함께 지웠다.
   */
  it("★ B1 — 안 쓴 날의 바는 전폭 빨강 블록 「일기 쓰기」 하나, 날짜 조각·메뉴 없음 (보드 1d)", async () => {
    await renderHome({ now: SUNDAY_AFTERNOON });

    const button = screen.getByTestId("write-button");
    expect(button).toHaveTextContent("일기 쓰기");
    expect(button).toHaveStyle({
      backgroundColor: COLORS.accent,
      minHeight: 64,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    });
    expect(screen.getByText("일기 쓰기")).toHaveStyle({ fontSize: 17, fontWeight: "800" });
    expect(screen.queryByTestId("write-day-label")).toBeNull();
    expect(screen.queryByTestId("home-menu-button")).toBeNull();
  });

  it("★ B2 — 쓰기를 누르면 인자 없이 한 번 알린다 (006 S1)", async () => {
    const props = await renderHome();

    await fireEvent.press(screen.getByTestId("write-button"));
    expect(props.onWrite).toHaveBeenCalledTimes(1);
    expect(props.onWrite).toHaveBeenCalledWith();
  });

  it("★ B4 — 정오 전 오늘도 쓰기 버튼이 있다 (049 FR-018b)", async () => {
    await renderHome();

    expect(screen.getByTestId("write-button")).toBeTruthy();
    expect(screen.queryByTestId("write-unavailable")).toBeNull();
  });
});

/**
 * 053 — 신호 줄이 「쓸 재료」 두 칸이 됐다(보드 `1d` ④). 세 칸(「쓸 수 있는 때」 포함)은 없다. 두 칸의
 * 상세 계약은 material-grid.test.tsx GRID1~8이 잠근다 — 여기는 홈 화면에 배선됐는지만 본다.
 */
describe("048 G → 053 — 쓸 재료 두 칸", () => {
  const preview = (photos: DayPreview["photos"], places: DayPreview["places"]): DayPreview => ({
    day: "2026-09-23",
    photos,
    places,
    photoAccess: "ok",
  });

  it("G1 — 읽는 중이면 「…」", async () => {
    await renderHome({ preview: { kind: "loading", day: "2026-09-23" } });

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("…");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("…");
  });

  it("G2 — 알면 숫자와 단위", async () => {
    await renderHome({
      preview: preview({ kind: "known", count: 3 }, { kind: "known", count: 2 }),
    });

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("3장");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("2곳");
  });

  it("★ G3 — 관측된 0과 「모름」은 서로 다른 글자다 (원칙 V)", async () => {
    await renderHome({ preview: preview({ kind: "none" }, { kind: "unknown" }) });

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("0장");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
    expect(screen.getByTestId("signal-places")).not.toHaveTextContent(/0/);
  });

  it("미리보기가 없으면(통로 없음) 두 칸 모두 「모름」", async () => {
    await renderHome();

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("모름");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
  });

  it("G4 — 「쓸 수 있는 때」 칸이 없다 (049로 정오 제한이 없어졌다)", async () => {
    await renderHome();

    expect(screen.queryByTestId("signal-window")).toBeNull();
    expect(screen.queryByText("쓸 수 있는 때")).toBeNull();
  });

  it("G5 — 새벽에도 두 칸은 그대로다", async () => {
    await renderHome({ now: new Date("2026-09-25T01:00:00") });
    expect(screen.getByTestId("signal-row")).toBeTruthy();
    expect(screen.queryByTestId("signal-window")).toBeNull();
  });
});

/**
 * ★ 051 — 「최근 · n편」 목록과 카드가 사라졌다(홈이 곧 상세). 옛 일기에는 스트립(049)·달력(050)으로
 * 닿는다 — contracts/written-day.md REACH. 카드가 지키던 「사진 없음/모름」·「읽을 수 없어요」 구분은
 * 쓴 날의 헤더·지면이 이어받았다(written-day-home.test.tsx HOME4·HOME9).
 */
describe("051 — 목록이 없다", () => {
  it("일기가 여럿이어도 목록·카드를 그리지 않는다", async () => {
    await renderHome({ items: [readable("2026-09-23"), readable("2025-12-31")] });

    expect(screen.queryByTestId("home-recent")).toBeNull();
    expect(screen.queryByTestId("home-count")).toBeNull();
    expect(screen.queryByTestId("diary-card-2026-09-23")).toBeNull();
  });

  it("★ 일기가 하나도 없어도 빈 화면이 아니다 — 고를 날과 쓰기가 있다 (006 S7)", async () => {
    await renderHome({ items: [] });

    expect(screen.getByTestId("day-strip")).toBeTruthy();
    expect(screen.getByTestId("write-button")).toHaveTextContent("일기 쓰기");
  });

  it("실제 사진 썸네일을 쓰지 않는다", async () => {
    // 목록 항목은 사진 경로를 갖지 않는다 — 소스에 이미지 컴포넌트 자체가 없다.
    const code = readFileSync(join(__dirname, "../../src/ui/DiaryListScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/Image/);
    expect(code).not.toContain("DiaryPhoto");
  });
});

describe("★ 화면에 없어야 하는 것 (006 SC-019·020 유지)", () => {
  it("모델 식별자·생성 시간·토큰 수가 없다", async () => {
    await renderHome({ items: [readable("2026-09-12", { kind: "known", count: 3 })] });

    for (const banned of [/gguf/i, /kanana/i, /Q4_K/i, /토큰/, /tokens?/i, /초 걸렸/]) {
      expect(screen.queryByText(banned)).toBeNull();
    }
  });
});
