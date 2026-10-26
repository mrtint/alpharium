/**
 * 080 — 홈은 자기가 시작하지 않은 살아 있는 쓰기에 합류한다.
 *
 * 계약: specs/080-live-write-registry/contracts/live-write.md H1~H12
 *       spec.md US1·US3·US4, FR-006~FR-014a
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 백그라운드가 쓰는 중에 앱을 열면 홈은 그 날의 「쓰는 중」이 된다 — 두 번째 쓰기를 시작하지 않고, 모델을 미리 열지도 않는다.
 * 합류는 관찰이다: 앞을 벗어나도 끊지 않고, 「그만두기」만 그 쓰기를 끊는다.
 *
 * 등록부는 진짜를 쓴다(`createLiveWrites()`). 테스트가 「남의 쓰기」를 넣고(`beginWrite`) 손잡이로 단계를 싣고 끝낸다 —
 * 파이프라인이 하는 일 그대로다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`·`rerender`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import { AppState, BackHandler } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import { createLiveWrites, type LiveWrites } from "../../src/diary/live-write";
import { createPipeline, type Pipeline, type PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { text } from "../../src/i18n/current";
import { partiallyUnknownDay } from "../../src/signals/fake";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal, withPortal } from "./render-with-portal";

jest.setTimeout(30000);

/**
 * 토스트가 **한 번이라도 그려졌는가**를 센다. 합류로 곧바로 덮이는 토스트는 마지막 화면에 남지 않아 쿼리로는 보이지
 * 않지만, 기기에서는 한두 프레임 올라왔다 사라진다 — 그려진 사실 자체를 본다. 진짜 부품을 그대로 그린다.
 */
const mockToastRenders: string[] = [];
jest.mock("../../src/ui/FailureToast", () => {
  const actual = jest.requireActual("../../src/ui/FailureToast");
  const React = jest.requireActual("react");
  return {
    ...actual,
    FailureToast: (props: { text: string }) => {
      mockToastRenders.push(props.text);
      return React.createElement(actual.FailureToast, props);
    },
  };
});
beforeEach(() => {
  mockToastRenders.length = 0;
});

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";
const YESTERDAY = "2026-09-27";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

function entryFor(day: string, title: string): DiaryEntry {
  return {
    date: day,
    title,
    text: "백그라운드가 쓴 본문이다.",
    character: "quiet",
    signalsUsed: {
      date: day,
      photos: { kind: "none" },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "x" },
      battery: { kind: "unknown", reason: "x" },
      connectivity: { kind: "unknown", reason: "x" },
    },
    createdAt: new Date("2026-09-28T22:10:00"),
  };
}

function pendingPipeline() {
  const run = jest.fn((): Promise<PipelineResult> => new Promise<PipelineResult>(() => {}));
  return { pipeline: { run } as Pipeline, run };
}

function resultPipeline(result: PipelineResult) {
  const run = jest.fn(() => Promise.resolve(result));
  return { pipeline: { run } as Pipeline, run };
}

/** 조립부의 claim과 같다 — 한 실행에 한 번만 참 */
function once() {
  let claimed = false;
  return jest.fn(() => {
    if (claimed) return false;
    claimed = true;
    return true;
  });
}

type Over = {
  pipeline?: Pipeline;
  liveWrites?: LiveWrites;
  autoWriteDay?: string | null;
  claimAutoWrite?: () => boolean;
  covered?: boolean;
  onChooseDay?: (day: string) => void;
  store?: DiaryStore;
  stop?: () => Promise<void>;
  recordFailure?: jest.Mock;
  writeBlocked?: boolean;
  resolve?: (day: string) => ResolveOutcome;
  writeRequest?: { id: number; day: string } | null;
  onWriteRequestHandled?: (id: number) => void;
};

function home(over: Over) {
  const previewDay = async (day: string) => ({
    day,
    photos: { kind: "known" as const, count: 3 },
    places: { kind: "unknown" as const },
    photoAccess: "ok" as const,
  });
  return (
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={over.pipeline ?? pendingPipeline().pipeline}
      resolution={resolved}
      resolve={over.resolve ?? resolveQuiet}
      store={over.store ?? memoryStore()}
      writeRequest={over.writeRequest}
      onWriteRequestHandled={over.onWriteRequestHandled}
      previewDay={previewDay}
      liveWrites={over.liveWrites}
      autoWriteDay={over.autoWriteDay ?? null}
      claimAutoWrite={over.claimAutoWrite}
      covered={over.covered}
      onChooseDay={over.onChooseDay}
      stop={over.stop}
      recordFailure={over.recordFailure}
      writeBlocked={over.writeBlocked}
      barLockMs={0}
      chosenDay={TODAY}
    />
  );
}

const renderHome = (over: Over) => renderWithPortal(home(over));

/** 남의 쓰기를 칸에 넣는다 — 파이프라인이 `beginWrite`로 하는 일 그대로 */
function foreignWrite(
  registry: LiveWrites,
  over: { day?: string; owner?: "screen" | "background"; stop?: () => unknown } = {},
) {
  const handle = registry.beginWrite({
    day: over.day ?? TODAY,
    owner: over.owner ?? "background",
    ...(over.stop !== undefined ? { stop: over.stop } : {}),
  });
  if (handle === null) throw new Error("칸이 이미 차 있다");
  return handle;
}

describe("H1·H2 — 남의 쓰기가 살아 있으면 그 날의 쓰는 중이 된다", () => {
  it("★ 백그라운드 쓰기에 합류한다 — 그 날을 고르고, 쓰는 중이고, 새 쓰기를 시작하지 않는다", async () => {
    const registry = createLiveWrites();
    foreignWrite(registry, { day: YESTERDAY });
    const { pipeline, run } = pendingPipeline();
    const onChooseDay = jest.fn();

    await renderHome({ pipeline, liveWrites: registry, onChooseDay });

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(screen.getByTestId("stop-button")).toBeTruthy();
    expect(onChooseDay).toHaveBeenCalledWith(YESTERDAY);
    expect(run).not.toHaveBeenCalled();
  });

  it("그 쓰기가 이미 지나온 단계의 혼잣말로 시작하고, 단계가 바뀌면 따라간다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    handle.publish("vision", "many");

    await renderHome({ liveWrites: registry });

    await screen.findByTestId("writing-paper");
    const visionLine = (await screen.findByTestId("writing-monologue-text")).props
      .children as string;
    expect(text().monologue.visionMany).toContain(visionLine);

    await act(async () => {
      handle.publish("generation");
    });

    await waitFor(() => {
      const line = screen.getByTestId("writing-monologue-text").props.children as string;
      expect(text().monologue.generation).toContain(line);
    });
  });

  it("화면이 조립한 남의 쓰기(첫 실행 자동 첫 일기)에도 합류한다 — 주체를 묻지 않는다", async () => {
    const registry = createLiveWrites();
    foreignWrite(registry, { owner: "screen" });

    await renderHome({ liveWrites: registry });

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
  });

  it("홈이 그려진 뒤에 칸이 차도 합류한다", async () => {
    const registry = createLiveWrites();
    await renderHome({ liveWrites: registry });
    await screen.findByTestId("write-button");

    await act(async () => {
      foreignWrite(registry);
    });

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
  });

  it("지우기가 든 칸에는 합류하지 않는다", async () => {
    const registry = createLiveWrites();
    registry.beginWipe();

    await renderHome({ liveWrites: registry });

    await screen.findByTestId("write-button");
    expect(screen.queryByTestId("writing-paper")).toBeNull();
  });

  it("덮여 있는 동안에는 합류하지 않고, 덮개가 걷히면 합류한다", async () => {
    const registry = createLiveWrites();
    foreignWrite(registry);
    // 다시 그릴 때 같은 저장소·파이프라인을 넘긴다 — 새 객체면 홈이 목록을 처음부터 다시 읽어 화면을 되돌린다(055의 교훈).
    const stable = {
      liveWrites: registry,
      store: memoryStore(),
      pipeline: pendingPipeline().pipeline,
    };
    const view = await renderHome({ ...stable, covered: true });
    await screen.findByTestId("write-button", { includeHiddenElements: true });
    expect(screen.queryByTestId("writing-paper", { includeHiddenElements: true })).toBeNull();

    await view.rerender(withPortal(home({ ...stable, covered: false })));

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
  });
});

describe("H5 — 합류한 쓰기가 저장까지 끝나면 그 날의 쓴 날 홈이다", () => {
  it("목록을 다시 읽어 그 날의 일기를 보이고 토스트가 없다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const store = memoryStore();
    await renderHome({ liveWrites: registry, store });
    await screen.findByTestId("writing-paper");

    // 백그라운드가 저장하고 칸을 비운다.
    await store.save(entryFor(TODAY, "백그라운드가 쓴 날"));
    await act(async () => {
      handle.end({ ok: true });
    });

    expect(await screen.findByText("백그라운드가 쓴 날", {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });
});

describe("H8 — 남의 쓰기가 사는 동안 홈은 쓰기를 시작하지 않는다", () => {
  it("★ 자동 쓰기의 「한 번」을 소모하지 않는다", async () => {
    const registry = createLiveWrites();
    foreignWrite(registry);
    const claim = jest.fn(() => true);
    const { pipeline, run } = pendingPipeline();

    await renderHome({
      pipeline,
      liveWrites: registry,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    });
    await screen.findByTestId("writing-paper");

    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  // 코드 리뷰에서 잡힘 — 진단 「지금 한 번 써 보기」(060)의 요청이 남의 쓰기와 겹치면, 합류한 직후 요청의 쓰기가 막혀 돌아오며
  // 화면을 목록으로 되돌렸다(합류는 이미 한 것으로 남아 다시 들어가지 않는다).
  it("남의 쓰기가 사는 동안 온 쓰기 요청(060)은 시작하지 않고 비운다 — 합류한 채로 남는다", async () => {
    const registry = createLiveWrites();
    foreignWrite(registry);
    const { pipeline, run } = pendingPipeline();
    const onWriteRequestHandled = jest.fn();

    await renderHome({
      pipeline,
      liveWrites: registry,
      writeRequest: { id: 7, day: TODAY },
      onWriteRequestHandled,
    });

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    await waitFor(() => expect(onWriteRequestHandled).toHaveBeenCalledWith(7));
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByTestId("stop-button")).toBeTruthy();
  });
});

describe("H10 — 언마운트된 뒤의 끝은 버린다", () => {
  it("합류한 채 사라진 홈은 구독을 끊고, 늦게 온 끝에 아무 일도 하지 않는다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const store = memoryStore();
    const listDays = jest.spyOn(store, "listDays");
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    const view = await renderHome({ liveWrites: registry, store });
    await screen.findByTestId("writing-paper");
    const readsBefore = listDays.mock.calls.length;

    await view.unmount();
    await act(async () => {
      handle.publish("generation");
      handle.end({ ok: true });
      await Promise.resolve();
    });

    expect(listDays.mock.calls.length).toBe(readsBefore);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe("H11 — 등록부를 주지 않으면 종전과 같다", () => {
  it("자동 쓰기가 claim을 얻어 시작한다", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = once();

    await renderHome({ pipeline, autoWriteDay: TODAY, claimAutoWrite: claim });

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

/**
 * `AppState`는 네이티브 이벤트 이미터라 jest에서 이벤트를 낼 수 없다(diary-home.test와 같다) — 등록된 핸들러를 꺼내 직접 부른다.
 * 스파이를 복원하지 않는다: jest-expo의 목은 복원하면 구독 반환값을 잃는다(AGENTS).
 */
async function leaveForeground(spy: jest.SpyInstance) {
  const handlers = spy.mock.calls
    .filter(([event]) => event === "change")
    .map(([, handler]) => handler as (state: string) => void);
  expect(handlers.length).toBeGreaterThan(0);
  await act(async () => {
    for (const handler of handlers) handler("background");
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("H3 — 합류한 쓰기는 앞을 벗어나도 끊지 않는다", () => {
  it("★ 앱이 뒤로 가도 홈의 멈춤도 그 쓰기의 끊기도 불리지 않는다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const registry = createLiveWrites();
    const stopForeign = jest.fn();
    foreignWrite(registry, { stop: stopForeign });
    const stopHome = jest.fn(async () => {});
    await renderHome({ liveWrites: registry, stop: stopHome });
    await screen.findByTestId("writing-paper");

    await leaveForeground(spy);

    expect(stopHome).not.toHaveBeenCalled();
    expect(stopForeign).not.toHaveBeenCalled();
    expect(screen.getByTestId("writing-paper")).toBeTruthy();
  });

  it("대조 — 홈이 시작한 쓰기는 종전대로 끊는다 (005 FR-014b)", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const stopHome = jest.fn(async () => {});
    const { pipeline } = pendingPipeline();
    await renderHome({
      pipeline,
      liveWrites: createLiveWrites(),
      autoWriteDay: TODAY,
      claimAutoWrite: once(),
      stop: stopHome,
    });
    await screen.findByTestId("writing-paper");

    await leaveForeground(spy);

    expect(stopHome).toHaveBeenCalledTimes(1);
  });
});

describe("H9 — 「쓰기」가 남의 쓰기에 막히면 실패가 아니라 합류다", () => {
  it("★ already-running이고 칸에 쓰기가 있으면 토스트 없이 그 쓰기의 쓰는 중이 된다", async () => {
    const registry = createLiveWrites();
    // 홈이 칸을 보기 직전에 남의 쓰기가 섰다 — 홈의 쓰기는 already-running으로 돌아온다.
    const run = jest.fn(async (): Promise<PipelineResult> => {
      foreignWrite(registry);
      return { ok: false, stage: "already-running", reason: "다른 곳에서 생성 중이다" };
    });
    const recordFailure = jest.fn();
    await renderHome({ pipeline: { run } as Pipeline, liveWrites: registry, recordFailure });

    await userEvent.press(await screen.findByTestId("write-button"));

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(screen.queryByTestId("failure-toast")).toBeNull();
    // 잠깐 올라왔다 합류에 덮인 것도 아니다 — 한 번도 그려지지 않았다.
    expect(mockToastRenders).toEqual([]);
    // 합류한 뒤에도 그 쓰기는 살아 있다 — 홈은 두 번째 쓰기를 시작하지 않았다.
    expect(run).toHaveBeenCalledTimes(1);
    expect(registry.current()?.kind).toBe("write");
  });

  it("대조 — already-running인데 칸에 쓰기가 없으면 종전대로 토스트다", async () => {
    const registry = createLiveWrites();
    const { pipeline } = resultPipeline({
      ok: false,
      stage: "already-running",
      reason: "다른 곳에서 생성 중이다",
    });
    await renderHome({ pipeline, liveWrites: registry });

    await userEvent.press(await screen.findByTestId("write-button"));

    expect(await screen.findByTestId("failure-toast")).toBeTruthy();
  });
});

describe("H6 — 합류한 쓰기가 실패로 끝나면 토스트 없이 057 판정이 이어서 쓴다", () => {
  it("토스트도 없고 홈이 실패를 기록하지도 않는다 — 넘겨 둔 날이 없으면 쓰기 전 상태로 남는다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const recordFailure = jest.fn();
    const { pipeline, run } = pendingPipeline();
    await renderHome({ pipeline, liveWrites: registry, recordFailure });
    await screen.findByTestId("writing-paper");

    await act(async () => {
      handle.end({ ok: false });
    });

    expect(await screen.findByTestId("write-button")).toBeTruthy();
    expect(mockToastRenders).toEqual([]);
    expect(recordFailure).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("★ 넘겨 둔 쓸 날이 있으면 그 쓰기가 끝난 뒤에 한 번 새로 쓴다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const order: string[] = [];
    const run = jest.fn((): Promise<PipelineResult> => {
      order.push("run");
      return new Promise<PipelineResult>(() => {});
    });
    const claim = once();
    await renderHome({
      pipeline: { run } as Pipeline,
      liveWrites: registry,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    });
    await screen.findByTestId("writing-paper");
    expect(claim).not.toHaveBeenCalled();

    await act(async () => {
      order.push("end");
      handle.end({ ok: false });
    });

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(order).toEqual(["end", "run"]);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ day: TODAY }), expect.anything());
    expect(claim).toHaveBeenCalledTimes(1);
    expect(mockToastRenders).toEqual([]);
    // 홈이 시작한 쓰기의 쓰는 중이다.
    expect(screen.getByTestId("writing-paper")).toBeTruthy();
  });

  it("그 실행의 「한 번」이 이미 쓰였으면 이어 쓰지 않고 조용히 쓰기 전 상태다 (FR-012)", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const claim = jest.fn(() => false);
    const { pipeline, run } = pendingPipeline();
    await renderHome({
      pipeline,
      liveWrites: registry,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    });
    await screen.findByTestId("writing-paper");

    await act(async () => {
      handle.end({ ok: false });
    });

    expect(await screen.findByTestId("write-button")).toBeTruthy();
    await waitFor(() => expect(claim).toHaveBeenCalled());
    expect(run).not.toHaveBeenCalled();
    expect(mockToastRenders).toEqual([]);
  });

  it("흉내 중(064)이면 합류는 하되 끝난 뒤 이어 쓰지 않는다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const claim = jest.fn(() => true);
    const { pipeline, run } = pendingPipeline();
    await renderHome({
      pipeline,
      liveWrites: registry,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
      writeBlocked: true,
    });
    expect(await screen.findByTestId("writing-paper")).toBeTruthy();

    await act(async () => {
      handle.end({ ok: false });
    });

    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("H12 — 남의 쓰기를 본 뒤에는 목록을 다시 읽기 전에 자동 쓰기를 시작하지 않는다", () => {
  /** 첫 읽기(마운트)는 그대로 두고, 그 뒤의 읽기는 테스트가 풀어 줄 때까지 붙잡는 저장소 */
  function gatedStore() {
    const store = memoryStore();
    const listDays = store.listDays.bind(store);
    let reads = 0;
    let open: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const gated: DiaryStore = {
      ...store,
      async listDays() {
        reads += 1;
        if (reads > 1) await gate;
        return listDays();
      },
    };
    return { store: gated, save: store.save.bind(store), open, reads: () => reads };
  }

  it("★ 합류하지 못한 채 끝난 쓰기가 쓴 날을 낡은 목록으로 다시 쓰지 않는다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const gated = gatedStore();
    const claim = jest.fn(() => true);
    const { pipeline, run } = pendingPipeline();
    const stable = {
      pipeline,
      liveWrites: registry,
      store: gated.store,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    };
    // 설정이 덮고 있어 합류하지 못했다.
    const view = await renderHome({ ...stable, covered: true });
    await screen.findByTestId("write-button", { includeHiddenElements: true });

    // 그 사이 백그라운드가 오늘을 쓰고 끝났다.
    await gated.save(entryFor(TODAY, "백그라운드가 쓴 날"));
    await act(async () => {
      handle.end({ ok: true });
    });
    // 덮개가 걷혔다 — 목록은 아직 다시 읽는 중이다.
    await view.rerender(withPortal(home({ ...stable, covered: false })));
    await act(async () => {
      await Promise.resolve();
    });

    expect(gated.reads()).toBeGreaterThan(1);
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();

    await act(async () => {
      gated.open();
    });

    expect(await screen.findByText("백그라운드가 쓴 날", {}, { timeout: 10000 })).toBeTruthy();
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("다시 읽은 목록에 그 날이 없으면(그 쓰기가 실패했다) 그 뒤에 자동 쓰기를 시작한다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const gated = gatedStore();
    const claim = once();
    const { pipeline, run } = pendingPipeline();
    const stable = {
      pipeline,
      liveWrites: registry,
      store: gated.store,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    };
    const view = await renderHome({ ...stable, covered: true });
    await screen.findByTestId("write-button", { includeHiddenElements: true });

    await act(async () => {
      handle.end({ ok: false });
    });
    await view.rerender(withPortal(home({ ...stable, covered: false })));
    await act(async () => {
      await Promise.resolve();
    });
    expect(claim).not.toHaveBeenCalled();

    await act(async () => {
      gated.open();
    });

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it("첫 목록 읽기가 끝나기 전에 그 쓰기가 끝나도, 낡은 첫 목록으로 판정하지 않고 다시 읽는다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const store = memoryStore();
    const listDays = store.listDays.bind(store);
    let reads = 0;
    let open: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    // 첫 읽기는 **읽은 뒤에** 붙잡힌다 — 그 쓰기가 저장하기 전의 목록을 들고 늦게 돌아온다.
    const slowFirst: DiaryStore = {
      ...store,
      async listDays() {
        reads += 1;
        const days = await listDays();
        if (reads === 1) await gate;
        return days;
      },
    };
    const claim = jest.fn(() => true);
    const { pipeline, run } = pendingPipeline();
    await renderHome({
      pipeline,
      liveWrites: registry,
      store: slowFirst,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    });

    await store.save(entryFor(TODAY, "백그라운드가 쓴 날"));
    await act(async () => {
      handle.end({ ok: true });
    });
    await act(async () => {
      open();
    });

    expect(await screen.findByText("백그라운드가 쓴 날", {}, { timeout: 10000 })).toBeTruthy();
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("H4 — 합류한 쓰는 중의 그만두기는 그 쓰기를 끊는다", () => {
  it("★ 그 쓰기의 멈춤을 부르고, 끝난 뒤에야 쓰기 전 홈으로 돌아오며, 저절로 다시 쓰지 않는다", async () => {
    const registry = createLiveWrites();
    const stopForeign = jest.fn();
    const handle = foreignWrite(registry, { stop: stopForeign });
    const stopHome = jest.fn(async () => {});
    const claim = once();
    const { pipeline, run } = pendingPipeline();
    await renderHome({
      pipeline,
      liveWrites: registry,
      stop: stopHome,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    });

    await userEvent.press(await screen.findByTestId("stop-button"));

    await waitFor(() => expect(stopForeign).toHaveBeenCalledTimes(1));
    expect(stopHome).not.toHaveBeenCalled();
    expect(handle.isCancelled()).toBe(true);
    // 그 쓰기가 실제로 멈출 때까지는 쓰는 중이다 — 모델 정리가 끝나야 칸이 빈다(079).
    expect(screen.getByTestId("writing-paper")).toBeTruthy();

    await act(async () => {
      handle.end({ ok: false });
    });

    expect(await screen.findByTestId("write-button")).toBeTruthy();
    expect(mockToastRenders).toEqual([]);
    // 057의 「한 번」을 합류의 끝 처리가 소모했다(첫 호출이 참) — 뒤따라 판정한 057은 거짓을 받아 시작하지 않는다.
    expect(claim.mock.results[0]?.value).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it("안드로이드 뒤로 가기도 같다", async () => {
    const handlers: (() => unknown)[] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
      if (event === "hardwareBackPress") handlers.push(handler as () => unknown);
      return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
    });
    const registry = createLiveWrites();
    const stopForeign = jest.fn();
    const handle = foreignWrite(registry, { stop: stopForeign });
    await renderHome({ liveWrites: registry });
    await screen.findByTestId("writing-paper");

    await act(async () => {
      handlers.at(-1)?.();
    });

    await waitFor(() => expect(stopForeign).toHaveBeenCalledTimes(1));
    await act(async () => {
      handle.end({ ok: false });
    });
    expect(await screen.findByTestId("write-button")).toBeTruthy();
    jest.restoreAllMocks();
  });

  it("그만두기를 눌렀지만 저장이 이미 시작됐으면 일기가 남고 그 날이 쓴 날로 보인다 (071)", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const store = memoryStore();
    await renderHome({ liveWrites: registry, store });

    await userEvent.press(await screen.findByTestId("stop-button"));
    await store.save(entryFor(TODAY, "끊기 전에 저장된 날"));
    await act(async () => {
      handle.end({ ok: true });
    });

    expect(await screen.findByText("끊기 전에 저장된 날", {}, { timeout: 10000 })).toBeTruthy();
  });
});

describe("H7 — 홈이 그만두지 않았는데 끊긴 쓰기(지우기가 멈췄다)", () => {
  it("토스트 없이 쓰기 전 상태이고 이어 쓰지 않는다", async () => {
    const registry = createLiveWrites();
    const handle = foreignWrite(registry);
    const claim = once();
    const { pipeline, run } = pendingPipeline();
    await renderHome({
      pipeline,
      liveWrites: registry,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
    });
    await screen.findByTestId("writing-paper");

    // 「일기 모두 지우기」가 칸에서 받은 쓰기를 끊었다.
    await act(async () => {
      const slot = registry.current();
      if (slot?.kind === "write") slot.cancel();
      handle.end({ ok: false });
    });

    expect(await screen.findByTestId("write-button")).toBeTruthy();
    expect(mockToastRenders).toEqual([]);
    expect(claim.mock.results[0]?.value).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });
});

/**
 * 앱이 조립하는 모양 그대로 — **진짜 파이프라인이 홈과 같은 등록부의 칸을 차지한다** (코드 리뷰에서 잡힘).
 *
 * 위 테스트들의 가짜 파이프라인은 등록부를 건드리지 않는다. 그래서 「홈이 시작한 쓰기는 합류의 대상이 아니다」를 지키는 단 하나의
 * 확인(`foreignWrite()`의 `running`)을 지워도 전부 통과했다 — 앱에서는 홈이 자기가 그만둔 쓰기에 합류해, 그 쓰기가 풀릴 때까지
 * 쓰기 바가 돌아오지 않는다(FR-013).
 */
describe("FR-013 — 홈이 시작한 쓰기는 합류의 대상이 아니다 (진짜 파이프라인 + 같은 등록부)", () => {
  function shipped(registry: LiveWrites) {
    const store = memoryStore();
    let open: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const generate = jest.fn(async () => {
      await gate;
      return { text: "홈이 쓴 날\n\n오늘은 조용한 하루였다." };
    });
    const pipeline = createPipeline({
      backend: {
        location: "on-device",
        async isAvailable() {
          return { kind: "loaded" };
        },
        generate,
      },
      store,
      loadSignals: async (day) => partiallyUnknownDay(day),
      beginWrite: (day) => registry.beginWrite({ day, owner: "screen" }),
    });
    return { pipeline, store, generate, open };
  }

  it("★ 그만둔 자기 쓰기가 아직 풀리는 중이어도 합류하지 않는다 — 쓰기 바가 곧바로 돌아온다", async () => {
    const registry = createLiveWrites();
    const made = shipped(registry);
    await renderHome({ pipeline: made.pipeline, store: made.store, liveWrites: registry });

    await userEvent.press(await screen.findByTestId("write-button"));
    await screen.findByTestId("writing-paper");
    await waitFor(() => expect(made.generate).toHaveBeenCalledTimes(1));
    expect(registry.current()?.kind).toBe("write");

    await userEvent.press(screen.getByTestId("stop-button"));

    // 화면은 곧바로 쓰기 전 홈이다 — 그 쓰기는 아직 칸을 쥐고 있다(모델을 못 끊어 몇 초 더 돈다, 071 SE-1).
    expect(await screen.findByTestId("write-button")).toBeTruthy();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
    expect(registry.current()?.kind).toBe("write");

    await act(async () => {
      made.open();
    });

    await waitFor(() => expect(registry.current()).toBeNull());
    expect(screen.getByTestId("write-button")).toBeTruthy();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
    expect(mockToastRenders).toEqual([]);
    expect(made.generate).toHaveBeenCalledTimes(1);
    // 그만둔 쓰기는 저장되지 않았다.
    expect(await made.store.load(TODAY)).toBeNull();
  });

  it("자기 쓰기가 끝나면 쓴 날 홈이고, 목록을 낡았다고 보아 한 번 더 읽지 않는다", async () => {
    const registry = createLiveWrites();
    const made = shipped(registry);
    const listDays = jest.spyOn(made.store, "listDays");
    await renderHome({ pipeline: made.pipeline, store: made.store, liveWrites: registry });

    await userEvent.press(await screen.findByTestId("write-button"));
    await waitFor(() => expect(made.generate).toHaveBeenCalledTimes(1));
    const readsBefore = listDays.mock.calls.length;
    await act(async () => {
      made.open();
    });

    expect(await screen.findByText("홈이 쓴 날", {}, { timeout: 10000 })).toBeTruthy();
    expect(registry.current()).toBeNull();
    expect(made.generate).toHaveBeenCalledTimes(1);
    // 끝난 뒤의 읽기는 `generate()`의 한 번뿐이다 — 자기 쓰기의 차지·비움은 목록을 낡게 하지 않는다(H12).
    expect(listDays.mock.calls.length).toBe(readsBefore + 1);
  });
});
