/**
 * 054 — 제자리 쓰기: 그만두면 쓰기 전 상태로 돌아간다 (US2).
 *
 * 계약: specs/054-in-place-writing/contracts/writing-in-place.md W11~W13·W16
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 처음 쓰던 날이면 안 쓴 날(쓸 재료·「일기 쓰기」), 다시 쓰던 날이면 기존 일기(쓴 날 지면). **쓰던 새 글은
 * 남지 않고 토스트도 없다.** 그만두기가 뒤늦게 온 생성 결과보다 우선한다(007 FR-014a).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { reachPaperEnd, scrollPaper } from "./paper-end";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T16:15:00");
const TODAY = "2026-09-28";
const PAST = "2026-09-27";

const signals = (day: string): DaySignals => ({
  date: day,
  photos: {
    kind: "known",
    value: { photos: [{ id: "p0", takenAt: new Date(`${day}T10:00:00`) }], complete: true },
  },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "안드로이드가 기간 걸음 수를 주지 않는다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
});

const entryFor = (day: string): DiaryEntry => ({
  date: day,
  title: "비 온 뒤 산책",
  text: "첫 문단이다.\n\n둘째 문단이다.",
  character: "quiet",
  signalsUsed: signals(day),
  createdAt: new Date(`${day}T14:00:00`),
});

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

function hangingPipeline(): Pipeline & { finish: (result: PipelineResult) => void } {
  let release: (result: PipelineResult) => void = () => {};
  return {
    run: () =>
      new Promise<PipelineResult>((resolve) => {
        release = resolve;
      }),
    finish: (result) => release(result),
  };
}

const backHandlers: Parameters<typeof BackHandler.addEventListener>[1][] = [];

beforeEach(() => {
  backHandlers.length = 0;
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_e, handler) => {
    backHandlers.push(handler);
    return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
  });
});

async function renderHome(store: DiaryStore, pipeline: Pipeline, stop = jest.fn(async () => {})) {
  await renderWithPortal(
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      stop={stop}
      store={store}
    />,
  );
  return stop;
}

/** 안 쓴 날(오늘)에서 쓰기를 시작한다 */
async function startFresh() {
  await userEvent.press(await screen.findByTestId("write-button"));
  await screen.findByTestId("stop-button");
}

/** 쓴 날(어제)을 골라 「다시 쓰기」 → 덮어쓰기 확인 → 쓰는 중으로 간다 */
async function startRewrite() {
  await userEvent.press(await screen.findByTestId(`day-${PAST}`));
  await screen.findByTestId("written-body");
  await reachPaperEnd();
  await userEvent.press(screen.getByTestId("write-button"));
  await userEvent.press(await screen.findByTestId("overwrite-confirm"));
  await screen.findByTestId("stop-button");
}

describe("W12 — 그만두기", () => {
  it("★ 처음 쓰던 날: stop()이 불리고 안 쓴 날로 돌아온다 — 파일이 생기지 않는다", async () => {
    const store = memoryStore();
    const save = jest.spyOn(store, "save");
    const stop = await renderHome(store, hangingPipeline());
    await startFresh();

    await userEvent.press(screen.getByTestId("stop-button"));

    await waitFor(() => expect(screen.getByTestId("write-button")).toBeTruthy());
    expect(stop).toHaveBeenCalled();
    expect(screen.queryByTestId("stop-button")).toBeNull();
    expect(await screen.findByTestId("material-paper")).toBeTruthy();
    expect(screen.getByText("일기 쓰기")).toBeTruthy();
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("28");
    expect(save).not.toHaveBeenCalled();
    expect(await store.load(TODAY)).toBeNull();
  });

  it("★ 다시 쓰던 날: 기존 일기가 그대로 돌아온다 — 내용이 바뀌지 않는다", async () => {
    const store = memoryStore();
    const original = entryFor(PAST);
    await store.save(original);
    await renderHome(store, hangingPipeline());
    await startRewrite();

    await userEvent.press(screen.getByTestId("stop-button"));

    expect(await screen.findByTestId("written-body")).toHaveTextContent(/첫 문단이다\./);
    expect(screen.getByTestId("home-day-title")).toHaveTextContent("비 온 뒤 산책");
    expect(screen.queryByTestId("stop-button")).toBeNull();
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("27");
    expect(await store.load(PAST)).toEqual(original);
  });

  it("그만둔 뒤에는 실패 토스트가 뜨지 않는다 (FR-011)", async () => {
    const store = memoryStore();
    await renderHome(store, hangingPipeline());
    await startFresh();

    await userEvent.press(screen.getByTestId("stop-button"));
    await screen.findByTestId("material-paper");

    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });
});

describe("W11 — 다시 쓰다 그만두고 돌아오면 접힘·바 상태가 새로 시작한다", () => {
  it("스트립은 펼쳐져 있고 「다시 쓰기」 바는 내려가 있다", async () => {
    const store = memoryStore();
    await store.save(entryFor(PAST));
    await renderHome(store, hangingPipeline());
    // 스트립을 접어 둔 채 다시 쓰기로 간다 — 돌아왔을 때 접힘이 남아 있으면 안 된다(research R2).
    await userEvent.press(await screen.findByTestId(`day-${PAST}`));
    await screen.findByTestId("written-body");
    await scrollPaper(30);
    expect(
      screen.getByTestId("home-strip-fold", { includeHiddenElements: true }).props.pointerEvents,
    ).toBe("none");
    await reachPaperEnd();
    await userEvent.press(screen.getByTestId("write-button"));
    await userEvent.press(await screen.findByTestId("overwrite-confirm"));
    await screen.findByTestId("stop-button");

    await userEvent.press(screen.getByTestId("stop-button"));
    await screen.findByTestId("written-body");

    const fold = screen.getByTestId("home-strip-fold", { includeHiddenElements: true });
    expect(fold.props.pointerEvents).not.toBe("none");
    const bar = screen.getByTestId("rewrite-bar", { includeHiddenElements: true });
    expect(bar.props.pointerEvents).toBe("none");
  });
});

describe("W13 — 안드로이드 뒤로 가기", () => {
  it("쓰는 중 뒤로 가기는 「그만두기」와 같다", async () => {
    const store = memoryStore();
    const stop = await renderHome(store, hangingPipeline());
    await startFresh();

    await act(async () => {
      backHandlers.at(-1)?.({} as never);
    });

    await waitFor(() => expect(screen.getByTestId("write-button")).toBeTruthy());
    expect(stop).toHaveBeenCalled();
    expect(screen.queryByTestId("stop-button")).toBeNull();
  });

  it("쓰는 중이 아니면 뒤로 가기를 가로채지 않는다", async () => {
    const store = memoryStore();
    await renderHome(store, hangingPipeline());
    await screen.findByTestId("write-button");

    // 홈에서는 이 화면이 뒤로 가기를 등록하지 않는다(OS가 처리).
    expect(backHandlers).toHaveLength(0);
  });
});

describe("W16 — 그만둔 뒤 늦게 끝난 생성", () => {
  it("실패로 끝나도 토스트도 화면 전환도 없다", async () => {
    const store = memoryStore();
    const pipeline = hangingPipeline();
    await renderHome(store, pipeline);
    await startFresh();
    await userEvent.press(screen.getByTestId("stop-button"));
    await screen.findByTestId("material-paper");

    await act(async () => {
      pipeline.finish({ ok: false, stage: "generation", reason: "rejected: echo" });
    });

    expect(screen.queryByTestId("failure-toast")).toBeNull();
    expect(screen.getByTestId("material-paper")).toBeTruthy();
  });

  it("성공으로 끝나도 새 일기로 넘어가지 않는다 — 그만둔 것이 우선이다", async () => {
    const store = memoryStore();
    const pipeline = hangingPipeline();
    await renderHome(store, pipeline);
    await startFresh();
    await userEvent.press(screen.getByTestId("stop-button"));
    await screen.findByTestId("material-paper");

    await act(async () => {
      pipeline.finish({ ok: true, entry: entryFor(TODAY), overwrote: false });
    });

    expect(screen.getByTestId("material-paper")).toBeTruthy();
    expect(screen.queryByTestId("stop-button")).toBeNull();
  });
});
