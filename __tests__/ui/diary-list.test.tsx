/**
 * 홈 화면(일기 목록) 테스트 — 048, 보드 `1d`.
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md H·B·G, US5 카드
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

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  stripCellsFor,
  writePromptFor,
  type DayPreview,
  type DiaryListItem,
  type PhotoHint,
  type WritePrompt,
} from "../../src/app/state";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";

jest.setTimeout(30000);

const readable = (day: string, photos: PhotoHint = { kind: "none" }, title?: string) =>
  ({ day, readable: true, photos, ...(title !== undefined ? { title } : {}) }) as DiaryListItem;
const unreadable = (day: string): DiaryListItem => ({
  day,
  readable: false,
  photos: { kind: "unknown" },
});

/** 2026-09-24(목) 10:00 — 정오 전. 기본 선택은 09-23 */
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
    onOpen: jest.fn(),
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    write,
    cells: stripCellsFor(items, write, now),
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
  it("★ H1 — 헤더·스트립·신호 줄·목록 머리가 스크롤 안에, 하단 바는 스크롤 밖에", async () => {
    await renderHome({ items: [readable("2026-09-20")] });

    for (const id of [
      "home-month",
      "home-kicker",
      "home-day-number",
      "home-weekday",
      "home-day-state",
      "day-strip",
      "signal-row",
      "home-recent",
      "home-count",
    ]) {
      expect(insideScrollView(screen.getByTestId(id) as never)).toBe(true);
    }
    expect(insideScrollView(screen.getByTestId("home-bottom-bar") as never)).toBe(false);
    expect(screen.getByTestId("home-kicker")).toHaveTextContent("일기");
    expect(screen.getByTestId("home-recent")).toHaveTextContent("최근");
  });

  it("H2 — 고른 날의 큰 날짜·요일·「아직 쓰지 않았어요」", async () => {
    await renderHome({ now: SUNDAY_AFTERNOON });

    expect(screen.getByTestId("home-day-number")).toHaveTextContent("13");
    expect(screen.getByTestId("home-weekday")).toHaveTextContent("일요일");
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("아직 쓰지 않았어요");
  });

  it("H3 — 이미 쓴 날은 덮어쓴다고 미리 알린다 (012 사전 고지)", async () => {
    await renderHome({ items: [readable("2026-09-23")] });

    expect(screen.getByTestId("home-day-state")).toHaveTextContent(
      "이미 썼어요 · 다시 쓰면 덮어써요",
    );
  });

  it("★ H4 — 월 표시는 고른 날의 달이다 (Clarification Q2)", async () => {
    const now = new Date("2026-09-02T15:00:00");
    await renderHome({ now, chosen: "2026-08-31" });

    expect(screen.getByTestId("home-month")).toHaveTextContent("2026년 8월");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("31");
  });

  it("H5 — 되돌림 안내는 해요체다", async () => {
    await renderHome({ chosen: "2026-09-10" });

    expect(screen.getByText("9월 10일은 이제 쓸 수 없어 9월 23일로 바꿨어요")).toBeTruthy();
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
  it("B1 — 쓸 수 있는 날은 [일기 쓰기 │ n일]", async () => {
    await renderHome({ now: SUNDAY_AFTERNOON });

    expect(screen.getByTestId("write-button")).toHaveTextContent("일기 쓰기");
    expect(screen.getByTestId("write-day-label")).toHaveTextContent("13일");
  });

  it("★ B2 — 쓰기를 누르면 인자 없이 한 번 알린다 (006 S1)", async () => {
    const props = await renderHome();

    await fireEvent.press(screen.getByTestId("write-button"));
    expect(props.onWrite).toHaveBeenCalledTimes(1);
    expect(props.onWrite).toHaveBeenCalledWith();
  });

  it("★ B3 — 날짜 조각은 누를 수 없는 글자다 (D7, SC-002)", async () => {
    const props = await renderHome();

    const label = screen.getByTestId("write-day-label");
    expect(label.props.onPress).toBeUndefined();
    await fireEvent.press(label);
    expect(props.onWrite).not.toHaveBeenCalled();
    expect(label).not.toHaveTextContent(/[▾›→⌄]/);
    // 쓰기 버튼의 자손이 아니다
    let cur = label.parent;
    while (cur) {
      expect(cur.props.testID).not.toBe("write-button");
      cur = cur.parent;
    }
  });

  it("★ B4 — 아직 쓸 수 없는 오늘은 쓰기 버튼 대신 언제 쓸 수 있는지 말한다", async () => {
    await renderHome({ chosen: "2026-09-24" });

    expect(screen.queryByTestId("write-button")).toBeNull();
    expect(screen.getByTestId("write-unavailable")).toHaveTextContent(
      "오늘 일기는 오후 12시부터 쓸 수 있어요",
    );
    expect(screen.getByTestId("write-unavailable").props.numberOfLines).toBeUndefined();
  });

  it("B4 — 새벽의 오늘은 「오전 4시부터」다 (Clarification Q1)", async () => {
    await renderHome({ now: new Date("2026-09-25T01:00:00"), chosen: "2026-09-24" });

    expect(screen.getByTestId("write-unavailable")).toHaveTextContent(
      "오늘 일기는 오전 4시부터 쓸 수 있어요",
    );
  });

  it("★ B5 — 쓸 수 없는 날에는 화면의 무엇을 눌러도 쓰기에 닿지 않는다", async () => {
    const props = await renderHome({
      items: [readable("2026-09-20"), readable("2026-09-23")],
      chosen: "2026-09-24",
      menuItems: [{ key: "settings", label: "설정", onPress: jest.fn() }],
    });

    // 누를 수 있는 것은 전부 button 역할이다(스트립 칸·카드·메뉴). 하나씩 다 눌러 본다.
    const pressables = screen.queryAllByRole("button");
    expect(pressables.length).toBeGreaterThan(0);
    for (const node of pressables) await fireEvent.press(node);
    expect(props.onWrite).not.toHaveBeenCalled();
  });
});

describe("048 G — 신호 줄", () => {
  const preview = (photos: DayPreview["photos"], places: DayPreview["places"]): DayPreview => ({
    day: "2026-09-23",
    photos,
    places,
  });

  it("G1 — 읽는 중이면 「…」", async () => {
    await renderHome({ preview: { kind: "loading", day: "2026-09-23" } });

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("…");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("…");
  });

  it("G2 — 알면 숫자", async () => {
    await renderHome({
      preview: preview({ kind: "known", count: 3 }, { kind: "known", count: 2 }),
    });

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("3");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("2");
  });

  it("★ G3 — 「없음」과 「모름」은 서로 다른 글자다 (원칙 V)", async () => {
    await renderHome({ preview: preview({ kind: "none" }, { kind: "unknown" }) });

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("없음");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
    expect(screen.getByTestId("signal-photos")).not.toHaveTextContent(/0/);
  });

  it("미리보기가 없으면(통로 없음) 두 칸 모두 「모름」", async () => {
    await renderHome();

    expect(screen.getByTestId("signal-photos")).toHaveTextContent("모름");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
  });

  it("G4 — 쓸 수 있으면 「지금」", async () => {
    await renderHome();

    expect(screen.getByTestId("signal-window")).toHaveTextContent("지금");
  });

  it("G5·G6 — 쓸 수 없으면 쓸 수 있게 되는 시각", async () => {
    await renderHome({ chosen: "2026-09-24" });
    expect(screen.getByTestId("signal-window")).toHaveTextContent("오후 12시부터");
  });

  it("G6 — 새벽이면 「오전 4시부터」", async () => {
    await renderHome({ now: new Date("2026-09-25T01:00:00"), chosen: "2026-09-24" });
    expect(screen.getByTestId("signal-window")).toHaveTextContent("오전 4시부터");
  });
});

describe("048 목록 — 모든 일기, 카드", () => {
  it("「n편」이 일기 수이고 7일 밖 일기도 카드로 나온다", async () => {
    const items = [readable("2026-09-23"), readable("2026-08-01"), readable("2025-12-31")];
    await renderHome({ items });

    expect(screen.getByTestId("home-count")).toHaveTextContent("3편");
    for (const item of items) expect(screen.getByTestId(`diary-card-${item.day}`)).toBeTruthy();
  });

  it("카드를 누르면 그 항목이 전달된다", async () => {
    const item = readable("2026-09-20");
    const props = await renderHome({ items: [item] });

    await fireEvent.press(screen.getByTestId("diary-card-2026-09-20"));
    expect(props.onOpen).toHaveBeenCalledWith(item);
  });

  it("카드 날짜는 「YYYY · MM · DD · 요일」", async () => {
    await renderHome({ items: [readable("2026-09-12")] });

    expect(screen.getByText(/2026 · 09 · 12 · 토/)).toBeTruthy();
  });

  it("제목이 있으면 보이고, 없으면 날짜만 있다 (014)", async () => {
    await renderHome({
      items: [readable("2026-09-12", { kind: "none" }, "비 온 뒤 산책"), readable("2026-09-11")],
    });

    expect(screen.getByText("비 온 뒤 산책")).toBeTruthy();
    expect(screen.getByTestId("diary-card-2026-09-11")).not.toHaveTextContent("비 온 뒤 산책");
  });
});

describe("048 US5 — 카드가 「없음」과 「모름」을 잃지 않는다", () => {
  it("사진을 본 일기는 장수 배지가 있다", async () => {
    await renderHome({ items: [readable("2026-09-12", { kind: "known", count: 3 })] });

    expect(screen.getByTestId("diary-card-badge-2026-09-12")).toHaveTextContent("3");
  });

  it("★ 사진이 없던 일기와 모르는 일기는 서로 다른 말이다 (007 FR-018·019, 원칙 V)", async () => {
    await renderHome({
      items: [
        readable("2026-09-12", { kind: "none" }),
        readable("2026-09-11", { kind: "unknown" }),
      ],
    });

    expect(screen.getByTestId("diary-card-2026-09-12")).toHaveTextContent(/사진 없음/);
    expect(screen.getByTestId("diary-card-2026-09-11")).toHaveTextContent(/사진 모름/);
    expect(screen.queryByTestId("diary-card-badge-2026-09-12")).toBeNull();
    expect(screen.queryByTestId("diary-card-badge-2026-09-11")).toBeNull();
  });

  it("★ 읽을 수 없는 일기는 사라지지 않고 그렇다고 말한다 (FR-017a)", async () => {
    await renderHome({ items: [unreadable("2026-09-12")] });

    expect(screen.getByTestId("diary-card-2026-09-12")).toHaveTextContent(/읽을 수 없어요/);
  });

  it("★ 빈 목록은 무엇을 하면 생기는지 말한다 (006 S7)", async () => {
    await renderHome({ items: [] });

    expect(screen.getByText("아직 일기가 없어요")).toBeTruthy();
    expect(
      screen.getByText(
        "위에서 하루를 고르고 「일기 쓰기」를 누르면 휴대폰이 그 하루를 일기로 써요",
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("home-count")).toHaveTextContent("0편");
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
