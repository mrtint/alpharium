/**
 * 060 — 진단 「지금 한 번 써 보기」가 홈에 올리는 쓰기 요청 (US3, 보드 `6k`).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md HR1~HR9
 *
 * 홈은 요청(번호표 + 누른 순간의 오늘)을 받아 054 제자리 쓰기로 시작한다. 덮어쓰기 확인(050)·재료 확인(053)을 거치지 않고,
 * 이미 쓰는 중이면 시작하지 않고 요청만 비운다. 057 앱 열기 자동 쓰기(`claimAutoWrite`)와 독립이다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다. 대역은 즉시 끝나도 무한히 다시 시작하지 않게 한 번만 참이게 쓴다(057 교훈).
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { PipelineFailure } from "../../src/app/failure-toast";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

function pendingPipeline() {
  const run = jest.fn((): Promise<PipelineResult> => new Promise<PipelineResult>(() => {}));
  return { pipeline: { run } as Pipeline, run };
}

function resultPipeline(result: PipelineResult) {
  const run = jest.fn(() => Promise.resolve(result));
  return { pipeline: { run } as Pipeline, run };
}

async function savedToday(store: DiaryStore) {
  await store.save({
    date: TODAY,
    title: "이미 쓴 날",
    text: "이미 쓴 본문이다.",
    character: "quiet",
    signalsUsed: {
      date: TODAY,
      photos: { kind: "none" },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "x" },
      battery: { kind: "unknown", reason: "x" },
      connectivity: { kind: "unknown", reason: "x" },
    },
    createdAt: new Date("2026-09-28T21:00:00"),
  });
}

type Over = {
  pipeline: Pipeline;
  writeRequest?: { id: number; day: string } | null;
  onWriteRequestHandled?: (id: number) => void;
  recordFailure?: (result: PipelineFailure) => void;
  covered?: boolean;
  resolve?: (day: string) => ResolveOutcome;
  claimAutoWrite?: () => boolean;
  store?: DiaryStore;
};

/** 같은 파이프라인 대역이면 같은 저장소 — 리렌더마다 새 저장소를 주면 홈이 목록을 처음부터 다시 읽는다 */
const defaultStores = new WeakMap<object, DiaryStore>();
function storeFor(pipeline: Pipeline): DiaryStore {
  let store = defaultStores.get(pipeline);
  if (store === undefined) {
    store = memoryStore();
    defaultStores.set(pipeline, store);
  }
  return store;
}

function element(over: Over) {
  const previewDay = jest.fn(async (day: string) => ({
    day,
    // 재료 확인(053)이 뜨게 하는 하루 — 사진도 장소도 관측된 0. 요청은 이 확인을 거치지 않아야 한다.
    photos: { kind: "none" as const },
    places: { kind: "none" as const },
    photoAccess: "ok" as const,
  }));
  return (
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={over.pipeline}
      resolution={resolved}
      resolve={over.resolve ?? resolveQuiet}
      store={over.store ?? storeFor(over.pipeline)}
      previewDay={previewDay}
      writeRequest={over.writeRequest as never}
      onWriteRequestHandled={over.onWriteRequestHandled}
      recordFailure={over.recordFailure}
      covered={over.covered}
      claimAutoWrite={over.claimAutoWrite}
      chosenDay={TODAY}
    />
  );
}

describe("HR1 — 요청을 받으면 그 날을 쓰는 중으로 시작한다", () => {
  it("run이 그 날로 불리고 요청이 한 번 비워진다", async () => {
    const { pipeline, run } = pendingPipeline();
    const handled = jest.fn();
    await renderWithPortal(
      element({ pipeline, writeRequest: { id: 1, day: TODAY }, onWriteRequestHandled: handled }),
    );

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ day: TODAY }), expect.anything());
    expect(handled).toHaveBeenCalledTimes(1);
    expect(handled).toHaveBeenCalledWith(1);
  });
});

describe("HR2 — 오늘 일기가 있어도 확인 없이 덮어쓴다", () => {
  it("덮어쓰기 확인·재료 확인이 뜨지 않는다", async () => {
    const store = memoryStore();
    await savedToday(store);
    const { pipeline, run } = pendingPipeline();
    await renderWithPortal(element({ pipeline, store, writeRequest: { id: 1, day: TODAY } }));

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("overwrite-confirm")).toBeNull();
    expect(screen.queryByTestId("material-confirm")).toBeNull();
  });
});

describe("HR3 — 이미 쓰는 중이면 시작하지 않고 요청만 비운다", () => {
  it("두 번째 요청은 run을 더 부르지 않고 handled만 부른다", async () => {
    const { pipeline, run } = pendingPipeline();
    const handled = jest.fn();
    const view = await renderWithPortal(
      element({ pipeline, writeRequest: { id: 1, day: TODAY }, onWriteRequestHandled: handled }),
    );
    await screen.findByTestId("writing-paper");
    expect(run).toHaveBeenCalledTimes(1);

    await view.rerender(
      element({ pipeline, writeRequest: { id: 2, day: TODAY }, onWriteRequestHandled: handled }),
    );
    await waitFor(() => expect(handled).toHaveBeenCalledWith(2));
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("HR4 — 덮여 있으면 기다렸다가 풀리면 시작한다", () => {
  it("covered 동안 run이 없고 풀리면 시작한다", async () => {
    const { pipeline, run } = pendingPipeline();
    const handled = jest.fn();
    const request = { id: 1, day: TODAY };
    // 저장소는 한 번만 만든다 — 리렌더마다 새 저장소를 주면 홈이 목록을 처음부터 다시 읽는다
    const store = memoryStore();
    const view = await renderWithPortal(
      element({
        pipeline,
        store,
        writeRequest: request,
        onWriteRequestHandled: handled,
        covered: true,
      }),
    );
    await screen.findByTestId("write-button", { includeHiddenElements: true });
    expect(run).not.toHaveBeenCalled();
    expect(handled).not.toHaveBeenCalled();

    await view.rerender(
      element({
        pipeline,
        store,
        writeRequest: request,
        onWriteRequestHandled: handled,
        covered: false,
      }),
    );
    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("HR5 — 같은 번호는 한 번만", () => {
  it("리렌더해도 같은 id로는 다시 시작하지 않는다", async () => {
    const { pipeline, run } = resultPipeline({
      ok: false,
      stage: "generation",
      reason: "timed-out",
    });
    const request = { id: 7, day: TODAY };
    const view = await renderWithPortal(element({ pipeline, writeRequest: request }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    await screen.findByTestId("write-button");

    await view.rerender(element({ pipeline, writeRequest: request }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("HR6 — 쓸 캐릭터가 없으면 막힘 화면으로 가고 요청은 비워진다", () => {
  it("run 없이 handled만", async () => {
    const { pipeline, run } = pendingPipeline();
    const handled = jest.fn();
    await renderWithPortal(
      element({
        pipeline,
        writeRequest: { id: 3, day: TODAY },
        onWriteRequestHandled: handled,
        resolve: () => ({ kind: "no-ready-character" }),
      }),
    );
    await waitFor(() => expect(handled).toHaveBeenCalledWith(3));
    expect(run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
  });
});

describe("HR8 — 자동 쓰기 claim과 독립이다", () => {
  it("claim이 이미 거짓이어도 요청은 시작된다", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => false);
    await renderWithPortal(
      element({ pipeline, writeRequest: { id: 1, day: TODAY }, claimAutoWrite: claim }),
    );
    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(run).toHaveBeenCalledTimes(1);
    expect(claim).not.toHaveBeenCalled();
  });
});

describe("HR9 — 쓰기 실패는 기록 콜백으로, 그만두기·성공은 아니다", () => {
  it("실패 결과가 그대로 recordFailure에 한 번 간다", async () => {
    const failure: PipelineResult = {
      ok: false,
      stage: "storage",
      reason: "disk",
      entry: undefined as never,
    };
    const { pipeline } = resultPipeline(failure);
    const record = jest.fn();
    await renderWithPortal(
      element({ pipeline, writeRequest: { id: 1, day: TODAY }, recordFailure: record }),
    );
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    expect(record).toHaveBeenCalledWith(failure);
  });

  it("성공이면 부르지 않는다", async () => {
    const { pipeline, run } = resultPipeline({
      ok: true,
      entry: { date: TODAY, text: "본문", character: "quiet" } as never,
      overwrote: false,
    });
    const record = jest.fn();
    await renderWithPortal(
      element({ pipeline, writeRequest: { id: 1, day: TODAY }, recordFailure: record }),
    );
    await waitFor(() => expect(run).toHaveBeenCalled());
    await screen.findByTestId("write-button");
    expect(record).not.toHaveBeenCalled();
  });

  it("쓰는 중 그만두기로 끝나면 부르지 않는다", async () => {
    let finish: (r: PipelineResult) => void = () => {};
    const run = jest.fn(
      (): Promise<PipelineResult> =>
        new Promise<PipelineResult>((resolve) => {
          finish = resolve;
        }),
    );
    const pipeline = { run } as Pipeline;
    const record = jest.fn();
    await renderWithPortal(
      element({ pipeline, writeRequest: { id: 1, day: TODAY }, recordFailure: record }),
    );
    await screen.findByTestId("writing-paper");

    await fireEvent.press(screen.getByTestId("stop-button"));
    await act(async () => {
      finish({ ok: false, stage: "generation", reason: "interrupted" });
      await Promise.resolve();
    });
    await screen.findByTestId("write-button");
    expect(record).not.toHaveBeenCalled();
  });
});
