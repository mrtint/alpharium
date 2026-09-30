/**
 * 051 — 쓴 날 읽기: 홈이 곧 상세 (보드 `2c`·`2k`·`2g`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md HOME1~HOME13, BAR1~BAR7, GEN1~GEN6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 날짜 기준: 지금 = 2026-09-28(월) 16:15. 스트립은 9/27(일)~10/3(토) 주다. 「지난 날」은 스트립에
 * 이미 보이는 9/27을 누르고, 「오늘」은 기본 선택(049 — 앱을 열면 오늘)을 쓴다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — 반드시 await한다(AGENTS).
 * ⚠️ jest-expo의 `AppState.addEventListener` 스파이는 `mockRestore`하지 않는다(diary-home.test와 같다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { AppState, BackHandler } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { COLORS, WRITTEN_DAY } from "../../src/ui/theme/tokens";
import { renderWithPortal } from "./render-with-portal";
import { reachPaperEnd } from "./paper-end";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T16:15:00");
const TODAY = "2026-09-28";
const PAST = "2026-09-27";

const signals = (day: string): DaySignals => ({
  date: day,
  // 053 — 재료가 있던 하루로 둔다: 「지어낸 하루」 한 줄이 본문 텍스트에 섞이지 않게(그 표식은
  // made-up-day.test.tsx가 본다).
  photos: {
    kind: "known",
    value: { photos: [{ id: "p0", takenAt: new Date(`${day}T10:00:00`) }], complete: true },
  },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "안드로이드가 기간 걸음 수를 주지 않는다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
});

const entryFor = (day: string, over: Partial<DiaryEntry> = {}): DiaryEntry => ({
  date: day,
  title: "비 온 뒤 산책",
  text: "첫 문단이다.\n\n둘째 문단이다.",
  character: "quiet",
  signalsUsed: signals(day),
  createdAt: new Date(`${day}T14:00:00`),
  ...over,
});

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

const code = (file: string) =>
  readFileSync(join(__dirname, "../..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

beforeEach(() => {
  jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation(
      () => ({ remove: () => {} }) as ReturnType<typeof BackHandler.addEventListener>,
    );
});

async function renderHome(
  store: DiaryStore,
  opts: {
    pipeline?: Pipeline;
    now?: () => Date;
  } = {},
) {
  await renderWithPortal(
    <DiaryHomeScreen
      now={opts.now ?? (() => NOW)}
      pipeline={opts.pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={store}
    />,
  );
}

async function selectPast() {
  await userEvent.press(await screen.findByTestId(`day-${PAST}`));
}

/* ═══════════════════════════════ HOME ═══════════════════════════════ */

describe("051 HOME — 쓴 날을 고르면 홈에서 읽는다 (US1)", () => {
  it("HOME1 — 「최근」 목록과 카드가 없다 (화면·소스)", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();
    await screen.findByTestId("written-body");

    expect(screen.queryByTestId("home-recent")).toBeNull();
    expect(screen.queryByTestId("home-count")).toBeNull();
    expect(screen.queryByTestId(`diary-card-${PAST}`)).toBeNull();

    const list = code("src/ui/DiaryListScreen.tsx");
    expect(list).not.toMatch(/\bonOpen\b/);
    expect(list).not.toMatch(/home-recent|diary-card/);
  });

  it("★ HOME2 — 쓴 날을 누르면 화면 전환 없이 제목·본문이 홈에 보인다", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();

    expect(await screen.findByTestId("home-day-title")).toHaveTextContent("비 온 뒤 산책");
    expect(screen.getByTestId("written-body")).toHaveTextContent(/첫 문단이다\./);
    expect(screen.getByTestId("written-body")).toHaveTextContent(/둘째 문단이다\./);
    // 홈이 그대로다 — 상세 화면으로 가지 않았다.
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("27");
    expect(screen.queryByText("← 목록")).toBeNull();
  });

  it("HOME3 — 제목: 한 줄 말줄임(052 — 줄이 바뀌면 날짜 영역이 넓어진다), 15/700 본문색, 누름 없음", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();

    const title = await screen.findByTestId("home-day-title");
    expect(title).toHaveProp("numberOfLines", 1);
    expect(title).toHaveProp("ellipsizeMode", "tail");
    expect(title).toHaveStyle({ fontSize: 15, fontWeight: "700", color: COLORS.text });
    expect(title.props.onPress).toBeUndefined();
    expect(title.props.accessibilityRole).not.toBe("button");
  });

  it("HOME4 — 제목 없는 일기는 「이 날 일기를 썼어요」, 13 보조색", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST, { title: undefined }));
    await renderHome(store);
    await selectPast();
    await screen.findByTestId("written-body");

    const state = screen.getByTestId("home-day-state");
    expect(state).toHaveTextContent("이 날 일기를 썼어요");
    expect(state).toHaveStyle({ fontSize: 13, color: COLORS.textMuted });
    expect(screen.queryByTestId("home-day-title")).toBeNull();
  });

  it("HOME5·HOME6 — 쓴 날엔 신호 줄이 없고, 안 쓴 날은 048~050 그대로다", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);

    // 오늘(안 쓴 날)
    expect(await screen.findByTestId("signal-row")).toBeTruthy();
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("오늘 일기를 쓸 수 있어요");
    expect(screen.getByTestId("write-button")).toHaveTextContent("일기 쓰기");
    expect(screen.queryByTestId("written-paper")).toBeNull();

    await selectPast();
    await screen.findByTestId("written-body");
    expect(screen.queryByTestId("signal-row")).toBeNull();
  });

  it("★ HOME7 — 늦게 도착한 이전 날의 읽기는 버린다", async () => {
    const base = memoryStore();
    await base.save(entryFor(PAST, { text: "일요일 본문" }));
    await base.save(entryFor(TODAY, { text: "월요일 본문", title: "월요일" }));
    const pending: Record<string, (() => void)[]> = {};
    let slow = false;
    const store: DiaryStore = {
      ...base,
      load: (day) =>
        slow && day === PAST
          ? new Promise((resolve) => {
              (pending[day] ??= []).push(() => void base.load(day).then(resolve));
            })
          : base.load(day),
    };
    await renderHome(store);
    await screen.findByText("월요일 본문");

    slow = true;
    await selectPast(); // 일요일 읽기가 멈춘다
    await userEvent.press(screen.getByTestId(`day-${TODAY}`));
    await screen.findByText("월요일 본문");

    await act(async () => {
      for (const release of pending[PAST] ?? []) release();
    });
    expect(screen.getByTestId("written-body")).toHaveTextContent("월요일 본문");
    expect(screen.queryByText("일요일 본문")).toBeNull();
  });

  it("HOME8 — 읽는 중에는 지면만 있고 본문·신호 줄·회전 표시가 없다", async () => {
    const base = memoryStore();
    await base.save(entryFor(PAST));
    let hold = false;
    const store: DiaryStore = {
      ...base,
      load: (day) => (hold && day === PAST ? new Promise(() => {}) : base.load(day)),
    };
    await renderHome(store);
    await screen.findByTestId("signal-row");
    hold = true;
    await selectPast();

    expect(await screen.findByTestId("written-paper")).toBeTruthy();
    expect(screen.queryByTestId("written-body")).toBeNull();
    expect(screen.queryByTestId("signal-row")).toBeNull();
    expect(code("src/ui/WrittenDayPaper.tsx")).not.toMatch(/ActivityIndicator/);
  });

  it("HOME10 — 지면 배경·본문 치수 (보드 2c)", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();

    const paper = await screen.findByTestId("written-paper");
    expect(paper).toHaveStyle({ backgroundColor: WRITTEN_DAY.paper });
    const body = screen.getByTestId("written-body");
    expect(body).toHaveStyle({
      paddingTop: 20, // 사진이 없는 일기 — 본문이 지면 맨 위 20부터(보드 `2k`),
      paddingHorizontal: 20,
      paddingBottom: 104,
      gap: 14,
    });
    const paragraph = screen.getByText("첫 문단이다.");
    expect(paragraph).toHaveStyle({ fontSize: 15, lineHeight: 15 * 1.65 });
  });

  it("HOME11 — 이 일기가 본 것·소요 시간·장소·작성자·덮어썼다가 없다", async () => {
    const store = memoryStore();
    await store.save(
      entryFor(PAST, {
        timing: { writingMs: 30000 },
        placeName: { kind: "known", value: "강남구" },
        authorName: "금동이",
      }),
    );
    await renderHome(store);
    await selectPast();
    await screen.findByTestId("written-body");

    expect(
      screen.queryByText(/이 일기가 본 것|걸렸어요|대표 장소|이렇게 일기를 작성했어요|덮어썼다/),
    ).toBeNull();
  });

  it("HOME12 — 오늘의 쓴 날에도 헤더에 「오늘」 글자가 없다 (FR-007a)", async () => {
    const store = memoryStore();
    await store.save(entryFor(TODAY));
    await renderHome(store);
    await screen.findByTestId("written-body");

    expect(screen.queryByText(/오늘/)).toBeNull();
  });

  it("★ HOME13 — 앱이 앞으로 돌아오면 목록과 그 날의 일기를 다시 읽는다 (FR-016c)", async () => {
    const listeners: ((s: string) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
      listeners.push(handler as (s: string) => void);
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    const store = memoryStore();
    await renderHome(store);
    await screen.findByTestId("signal-row");

    // 백그라운드 동안 자동 생성이 오늘을 썼다.
    await store.save(entryFor(TODAY, { text: "자동으로 쓴 본문" }));
    await act(async () => {
      for (const l of listeners) l("background");
      for (const l of listeners) l("active");
    });

    expect(await screen.findByText("자동으로 쓴 본문")).toBeTruthy();
  });
});

/* ═══════════════════════════════ HOME9 ═══════════════════════════════ */

describe("051 HOME9 — 읽을 수 없는 일기 (US5)", () => {
  it.each([
    ["목록부터 읽을 수 없다", "always"],
    ["목록은 읽었는데 고른 순간 깨졌다", "later"],
  ] as const)("%s → 「읽을 수 없어요」 + 지면 두 줄, 캐러셀 없음", async (_name, mode) => {
    const base = memoryStore();
    await base.save(entryFor(PAST));
    let listed = false;
    let loadsAfterList = 0;
    const store: DiaryStore = {
      ...base,
      listDays: async () => {
        const days = await base.listDays();
        listed = true;
        return days;
      },
      load: async (day) => {
        if (day !== PAST) return base.load(day);
        if (mode === "always") return null;
        // 목록을 만들 때는 읽히고, 그 뒤(지면)에는 깨져 있다.
        return listed && loadsAfterList++ > 0 ? null : base.load(day);
      },
    };
    await renderHome(store);
    await selectPast();

    const unreadable = await screen.findByTestId("written-unreadable");
    expect(unreadable).toHaveTextContent(/이 날의 일기 파일이 손상됐어요\./);
    expect(unreadable).toHaveTextContent(/다시 쓰면 새로 남아요\./);
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("읽을 수 없어요");
    expect(screen.queryByTestId("photo-carousel")).toBeNull();
    expect(screen.queryByTestId("written-body")).toBeNull();
  });
});

/* ═══════════════════════════════ BAR ═══════════════════════════════ */

describe("051 BAR — 「다시 쓰기」 바와 작성 시각 (US3)", () => {
  /**
   * ★ 051 수정 — 보드 `2c` ④: 「다시 쓰기」는 평소엔 내려가 있고 지면 맨 끝(4px 이내)에 닿으면 올라온다.
   * 처음 구현은 늘 보였다(보드와 어긋남, 저장소 소유자 지적). 움직임(240ms)은 실기기에서 본다(C9).
   */
  it("★ BAR8 — 긴 본문은 끝에 닿아야 「다시 쓰기」가 올라오고, 벗어나면 내려간다", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();
    const paper = await screen.findByTestId("written-paper");
    const scrollTo = (y: number) =>
      fireEvent.scroll(paper, {
        nativeEvent: {
          contentOffset: { x: 0, y },
          contentSize: { width: 400, height: 2000 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });

    await fireEvent(paper, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
    await fireEvent(paper, "contentSizeChange", 400, 2000);
    expect(screen.queryByTestId("write-button")).toBeNull();
    expect(screen.getByTestId("rewrite-bar", { includeHiddenElements: true })).toHaveProp(
      "pointerEvents",
      "none",
    );

    await scrollTo(1196); // 1196 + 800 ≥ 2000 − 4
    expect(screen.getByTestId("write-button")).toHaveTextContent("다시 쓰기");

    await scrollTo(600);
    expect(screen.queryByTestId("write-button")).toBeNull();
  });

  it("★ BAR9 — 짧은 본문은 처음부터 끝이라 바가 처음부터 보인다 (보드 2k)", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();
    await reachPaperEnd(); // 보이는 800, 내용 500 — 스크롤 없이 끝
    expect(screen.getByTestId("write-button")).toHaveTextContent("다시 쓰기");
  });

  it("★ BAR10 — 쓴 날은 헤더·스트립이 지면 스크롤 밖에 고정되고, 바에 ⋯이 없다 (보드 2c)", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();
    const paper = await screen.findByTestId("written-paper");

    expect(within(paper).queryByTestId("day-strip")).toBeNull();
    expect(within(paper).queryByTestId("home-day-number")).toBeNull();
    expect(screen.getByTestId("day-strip")).toBeTruthy();
    expect(within(paper).getByTestId("written-body")).toBeTruthy();
    expect(screen.queryByTestId("home-menu-button")).toBeNull();
  });

  it("★ BAR1 — 쓴 날의 하단 바: write-button 「다시 쓰기」, 연회색, 날짜 조각 없음", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store);
    await selectPast();
    await screen.findByTestId("written-body");

    await reachPaperEnd();
    const button = screen.getByTestId("write-button");
    expect(button).toHaveTextContent("다시 쓰기");
    expect(button).toHaveStyle({ backgroundColor: WRITTEN_DAY.rewriteBar });
    expect(screen.getByText("다시 쓰기")).toHaveStyle({
      fontSize: 17,
      fontWeight: "800",
      color: COLORS.text,
    });
    expect(screen.queryByTestId("write-day-label")).toBeNull();
  });

  it("BAR1 — 읽는 중·읽을 수 없음에도 이미 「다시 쓰기」다 (빨강이 깜빡이지 않는다)", async () => {
    const base = memoryStore();
    await base.save(entryFor(PAST));
    let hold = false;
    const store: DiaryStore = {
      ...base,
      load: (day) => (hold && day === PAST ? new Promise(() => {}) : base.load(day)),
    };
    await renderHome(store);
    await screen.findByTestId("signal-row");
    hold = true;
    await selectPast();
    await screen.findByTestId("written-paper");

    await reachPaperEnd();
    expect(screen.getByTestId("write-button")).toHaveTextContent("다시 쓰기");
  });

  it("★ BAR2 — 「다시 쓰기」 → 050 확인 대화상자, 취소 → 지면 그대로, 생성 0회", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    const run = jest.fn();
    await renderHome(store, { pipeline: { run } });
    await selectPast();
    await screen.findByTestId("written-body");

    await reachPaperEnd();
    await userEvent.press(screen.getByTestId("write-button"));
    await screen.findByTestId("overwrite-dialog");
    await userEvent.press(screen.getByTestId("overwrite-cancel"));

    await waitFor(() => expect(screen.queryByTestId("overwrite-dialog")).toBeNull());
    expect(screen.getByTestId("written-body")).toHaveTextContent(/첫 문단이다/);
    expect(run).not.toHaveBeenCalled();
  });

  it("★ BAR3 — 오늘의 일기엔 상대 작성 시각 (11/500 보조색)", async () => {
    const store = memoryStore();
    await store.save(entryFor(TODAY)); // 14:00에 썼고 지금 16:15
    await renderHome(store);

    await reachPaperEnd();
    const at = await screen.findByTestId("written-at");
    expect(at).toHaveTextContent("2시간 15분 전에 작성");
    expect(at).toHaveStyle({ fontSize: 11, fontWeight: "500", color: COLORS.textMuted });
  });

  it("BAR4 — 지난 날의 일기에는 작성 시각이 없다 (오늘 다시 썼어도)", async () => {
    const store = memoryStore();
    // 지난 날을 오늘 13:00에 다시 썼다 — 작성은 오늘이지만 하루는 오늘이 아니다(Clarifications).
    await store.save(entryFor(PAST, { createdAt: new Date(`${TODAY}T13:00:00`) }));
    await renderHome(store);
    await selectPast();
    await screen.findByTestId("written-body");

    await reachPaperEnd();
    expect(screen.queryByTestId("written-at")).toBeNull();
  });

  it("BAR4 — 오늘이 읽을 수 없으면 작성 시각이 없다", async () => {
    const base = memoryStore();
    await base.save(entryFor(TODAY));
    const store: DiaryStore = { ...base, load: async () => null };
    await renderHome(store);
    await screen.findByTestId("written-unreadable");

    await reachPaperEnd();
    expect(screen.queryByTestId("written-at")).toBeNull();
  });

  it("★ BAR5 — 오늘을 보는 동안 1분마다 다시 그린다, 지난 날엔 그 타이머가 없다", async () => {
    jest.useFakeTimers();
    try {
      let clock = new Date(`${TODAY}T14:00:30`);
      const store = memoryStore();
      await store.save(entryFor(TODAY));
      await store.save(entryFor(PAST));
      await renderHome(store, { now: () => clock });

      await reachPaperEnd();
      expect(await screen.findByTestId("written-at")).toHaveTextContent("방금 작성");
      const withMinuteTimer = jest.getTimerCount();

      clock = new Date(`${TODAY}T14:01:30`);
      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });
      expect(screen.getByTestId("written-at")).toHaveTextContent("1분 전에 작성");

      // 지난 날로 옮기면 1분 타이머가 풀린다 — 자정 타이머 등은 그대로다.
      await fireEvent.press(screen.getByTestId(`day-${PAST}`));
      await screen.findByText("첫 문단이다.");
      await reachPaperEnd();
      expect(screen.queryByTestId("written-at")).toBeNull();
      expect(jest.getTimerCount()).toBe(withMinuteTimer - 1);
    } finally {
      jest.useRealTimers();
    }
  });

  /** 051 수정 — 보드 `1d`·`2c`의 하단 바에는 메뉴가 없다. `⋯`는 저장소 소유자 지시로 홈에서 없앴다 */
  it("BAR6 — 홈에 ⋯ 메뉴가 없다 (안 쓴 날·쓴 날 모두)", async () => {
    expect(code("src/ui/DiaryListScreen.tsx")).not.toMatch(/HomeMenu|menuItems|home-menu/);
    expect(code("src/ui/DiaryHomeScreen.tsx")).not.toMatch(/HomeMenu|menuItems/);
    expect(code("App.tsx")).not.toMatch(/HomeMenu|menuItems/);
  });

  it("BAR7 — 오늘 판정은 cellFor에서 온다 — 화면이 dayOf로 따로 판정하지 않는다", () => {
    for (const file of [
      "src/ui/DiaryListScreen.tsx",
      "src/ui/WrittenDayPaper.tsx",
      "src/ui/PhotoCarousel.tsx",
    ]) {
      expect(code(file)).not.toMatch(/dayOf\(/);
    }
    // 051 전 `DiaryHomeScreen.tsx`의 `dayOf(`는 1곳(로컬 고른 날의 초기값)이었다.
    expect(code("src/ui/DiaryHomeScreen.tsx").match(/dayOf\(/g) ?? []).toHaveLength(1);
  });
});

/* ═══════════════════════════════ GEN ═══════════════════════════════ */

/** 부르면 저장소에 새 일기를 쓰고 결과를 돌려주는 파이프라인 대역 */
function writingPipeline(store: DiaryStore, result: (entry: DiaryEntry) => PipelineResult) {
  return {
    run: jest.fn(async (input: { day: string }) => {
      const fresh = entryFor(input.day, { text: "새로 쓴 본문", title: "새 제목" });
      const out = result(fresh);
      if (out.ok) await store.save(fresh);
      return out;
    }),
  } as unknown as Pipeline;
}

describe("051 GEN — 쓰기 뒤 (US3)", () => {
  it("★ GEN1 — 다시 쓰기 → 확인 → 성공 → 홈의 그 날에 새 본문, 타자기·결과 화면 없음", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    const pipeline = writingPipeline(store, (entry) => ({ ok: true, entry, overwrote: true }));
    await renderHome(store, { pipeline });
    await selectPast();
    await screen.findByTestId("written-body");

    await reachPaperEnd();
    await userEvent.press(screen.getByTestId("write-button"));
    await userEvent.press(await screen.findByTestId("overwrite-confirm"));

    expect(await screen.findByText("새로 쓴 본문")).toBeTruthy();
    expect(screen.getByTestId("home-day-title")).toHaveTextContent("새 제목");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("27");
    expect(screen.queryByTestId("diary-reveal-skip")).toBeNull();
    expect(screen.queryByText(/덮어썼/)).toBeNull();
  });

  it("GEN2 — 안 쓴 날에 쓰면 그 날이 쓴 날이 된다", async () => {
    const store = memoryStore();
    const pipeline = writingPipeline(store, (entry) => ({ ok: true, entry, overwrote: false }));
    await renderHome(store, { pipeline });
    await userEvent.press(await screen.findByTestId("write-button"));

    expect(await screen.findByTestId("home-day-title")).toHaveTextContent("새 제목");
    expect(screen.getByTestId("written-body")).toHaveTextContent("새로 쓴 본문");
  });

  it("★ GEN3·GEN4 — 저장 실패면 결과 화면 없이 쓰기 전 상태의 홈 + 토스트, 나온 글은 버려진다 (054)", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    const pipeline = writingPipeline(store, (entry) => ({
      ok: false,
      stage: "storage",
      reason: "저장 공간이 없다",
      entry,
    }));
    await renderHome(store, { pipeline });
    await selectPast();
    await screen.findByTestId("written-body");
    await reachPaperEnd();
    await userEvent.press(screen.getByTestId("write-button"));
    await userEvent.press(await screen.findByTestId("overwrite-confirm"));

    expect(await screen.findByTestId("failure-toast")).toHaveTextContent("일기를 쓰지 못했어요.");
    // 054 — 임시 결과 화면이 없다. 글(새 제목·본문)은 어디에도 보이지 않고 기존 일기가 그대로다.
    expect(screen.queryByTestId("unsaved-screen")).toBeNull();
    expect(screen.queryByText("← 일기")).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain("새로 쓴 본문");
    expect(await screen.findByTestId("written-body")).toHaveTextContent(/첫 문단이다/);
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("27");
  });

  it("GEN4 — 쓰기 시작 전 막힘 화면에서 안드로이드 뒤로 가기도 홈으로 (054 — 임시 결과 화면은 없다)", async () => {
    const handlers: Parameters<typeof BackHandler.addEventListener>[1][] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_e, handler) => {
      handlers.push(handler);
      return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
    });
    const store = memoryStore();
    await renderWithPortal(
      <DiaryHomeScreen
        now={() => NOW}
        pipeline={{ run: async () => ({ ok: true }) } as unknown as Pipeline}
        resolution={resolved}
        resolve={() => ({ kind: "no-ready-character" })}
        store={store}
      />,
    );
    await userEvent.press(await screen.findByTestId("write-button"));
    await screen.findByText("← 일기");

    await act(async () => {
      handlers.at(-1)?.({} as never);
    });
    expect(await screen.findByTestId("material-paper")).toBeTruthy();
  });

  it("GEN5 — 앱 어디에도 「← 목록」이 없다 (소스)", () => {
    for (const file of ["src/ui/DiaryHomeScreen.tsx", "src/ui/home-text.ts", "App.tsx"]) {
      expect(code(file)).not.toContain("← 목록");
    }
  });
});
