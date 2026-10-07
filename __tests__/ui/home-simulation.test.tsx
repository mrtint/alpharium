/**
 * 064 — 상태 흉내가 켜진 홈 (contracts/simulation.md HM1~HM8, 보드 `6i`).
 *
 * 홈은 판정하지 않는다 — 조립부가 `writeBlocked`·`simulation`·`simulatedFailToast`·`now`·`previewDay`를 갈아 넘긴다. 여기서는 홈이 그것을
 * 받아 다섯 쓰기 진입점 중 홈의 셋(쓰기 바·057 자동 시작·060 쓰기 요청)을 막는지, DEV 표시·회색 바·실패 토스트를 그리는지 본다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다. 대역은 즉시 끝나도 무한히 다시 시작하지 않게 한 번만 참이게 쓴다(057 교훈).
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { DayPreview } from "../../src/app/state";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { SIMULATION } from "../../src/ui/theme/tokens";
import { reachPaperEnd } from "./paper-end";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";

const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

function pendingPipeline() {
  const run = jest.fn((): Promise<PipelineResult> => new Promise<PipelineResult>(() => {}));
  return { pipeline: { run } as Pipeline, run };
}

async function saved(store: DiaryStore, day: string, createdAt: Date) {
  await store.save({
    date: day,
    title: "이미 쓴 날",
    text: "이미 쓴 본문이다.",
    character: "quiet",
    signalsUsed: {
      date: day,
      photos: { kind: "none" },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "x" },
      battery: { kind: "unknown", reason: "x" },
      connectivity: { kind: "unknown", reason: "x" },
    },
    createdAt,
  });
}

const somePhotos = async (day: string): Promise<DayPreview> => ({
  day,
  photos: { kind: "known", count: 3 },
  places: { kind: "known", count: 2 },
  photoAccess: "ok",
});

type Over = {
  pipeline: Pipeline;
  store?: DiaryStore;
  resolve?: jest.Mock;
  writeBlocked?: boolean;
  onWriteBlocked?: () => void;
  simulation?: { onOpenDeveloper: () => void };
  simulatedFailToast?: boolean;
  covered?: boolean;
  now?: Date;
  chosenDay?: string;
  autoWriteDay?: string | null;
  claimAutoWrite?: () => boolean;
  writeRequest?: { id: number; day: string } | null;
  onWriteRequestHandled?: (id: number) => void;
  previewDay?: (day: string) => Promise<DayPreview>;
};

function element(o: Over) {
  const now = o.now ?? NOW;
  return (
    <DiaryHomeScreen
      now={() => now}
      pipeline={o.pipeline}
      resolution={resolved}
      resolve={
        o.resolve ??
        ((day: string): ResolveOutcome => ({
          kind: "resolved",
          params: {
            character: "quiet",
            day: day as never,
            hasPhotos: true,
            geocodingEnabled: false,
          },
        }))
      }
      store={o.store ?? memoryStore()}
      previewDay={o.previewDay ?? somePhotos}
      chosenDay={o.chosenDay ?? TODAY}
      covered={o.covered}
      writeBlocked={o.writeBlocked}
      onWriteBlocked={o.onWriteBlocked}
      simulation={o.simulation}
      simulatedFailToast={o.simulatedFailToast}
      autoWriteDay={o.autoWriteDay as never}
      claimAutoWrite={o.claimAutoWrite}
      writeRequest={o.writeRequest as never}
      onWriteRequestHandled={o.onWriteRequestHandled}
    />
  );
}

describe("HM1 — 막혀 있으면 쓰기 바는 알리기만 한다", () => {
  it("안 쓴 날: onWriteBlocked만, run·resolve·확인 없음", async () => {
    const { pipeline, run } = pendingPipeline();
    const resolve = jest.fn((day: string): ResolveOutcome => ({
      kind: "resolved",
      params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
    }));
    const blocked = jest.fn();
    await renderWithPortal(
      element({ pipeline, resolve, writeBlocked: true, onWriteBlocked: blocked }),
    );
    const bar = await screen.findByTestId("write-button");
    // 018 미리 준비(모델 미리 열기)는 쓰기가 아니라 흉내와 무관하다 — 누름이 부른 것만 센다
    const before = resolve.mock.calls.length;
    await fireEvent.press(bar);
    expect(blocked).toHaveBeenCalledTimes(1);
    expect(resolve.mock.calls.length).toBe(before);
    expect(run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
    expect(screen.queryByTestId("material-confirm")).toBeNull();
  });

  it("쓴 날의 「다시 쓰기」: 덮어쓰기 확인도 뜨지 않는다", async () => {
    const store = memoryStore();
    await saved(store, TODAY, new Date("2026-09-28T21:00:00"));
    const { pipeline, run } = pendingPipeline();
    const blocked = jest.fn();
    await renderWithPortal(
      element({ pipeline, store, writeBlocked: true, onWriteBlocked: blocked }),
    );
    await screen.findByText("이미 쓴 본문이다.");
    await reachPaperEnd();
    await fireEvent.press(screen.getByTestId("write-button"));
    expect(blocked).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("overwrite-confirm")).toBeNull();
  });
});

describe("HM2 — 자동 시작·쓰기 요청도 막힌다", () => {
  it("autoWriteDay가 있어도 시작하지 않는다", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => true);
    await renderWithPortal(
      element({ pipeline, writeBlocked: true, autoWriteDay: TODAY, claimAutoWrite: claim }),
    );
    await screen.findByTestId("write-button");
    await act(async () => {
      await Promise.resolve();
    });
    expect(run).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
  });

  it("쓰기 요청은 시작하지 않고 비운다", async () => {
    const { pipeline, run } = pendingPipeline();
    const handled = jest.fn();
    await renderWithPortal(
      element({
        pipeline,
        writeBlocked: true,
        writeRequest: { id: 4, day: TODAY },
        onWriteRequestHandled: handled,
      }),
    );
    await waitFor(() => expect(handled).toHaveBeenCalledWith(4));
    expect(run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
  });
});

describe("HM3 — DEV 꼬리표", () => {
  it("simulation이 있으면 월 라벨 옆에 있고 누르면 개발자 화면", async () => {
    const onOpenDeveloper = jest.fn();
    await renderWithPortal(
      element({
        pipeline: pendingPipeline().pipeline,
        writeBlocked: true,
        simulation: { onOpenDeveloper },
      }),
    );
    const badge = await screen.findByTestId("home-dev-badge");
    expect(badge).toHaveTextContent("DEV");
    await fireEvent.press(badge);
    expect(onOpenDeveloper).toHaveBeenCalledTimes(1);
  });

  it("없으면 꼬리표가 없다", async () => {
    await renderWithPortal(element({ pipeline: pendingPipeline().pipeline }));
    await screen.findByTestId("write-button");
    expect(screen.queryByTestId("home-dev-badge")).toBeNull();
  });
});

describe("HM4 — 회색 쓰기 바 + DEV", () => {
  it("simulation이 있으면 면이 SIMULATION.barFill이고 DEV 꼬리표가 있다", async () => {
    await renderWithPortal(
      element({
        pipeline: pendingPipeline().pipeline,
        writeBlocked: true,
        simulation: { onOpenDeveloper: jest.fn() },
      }),
    );
    const bar = await screen.findByTestId("write-button");
    expect(flat(bar).backgroundColor).toBe(SIMULATION.barFill);
    expect(screen.getByTestId("write-button-dev")).toHaveTextContent("DEV");
  });

  it("없으면 054 빨간 면 그대로이고 꼬리표가 없다", async () => {
    await renderWithPortal(element({ pipeline: pendingPipeline().pipeline }));
    const bar = await screen.findByTestId("write-button");
    expect(flat(bar).backgroundColor).not.toBe(SIMULATION.barFill);
    expect(screen.queryByTestId("write-button-dev")).toBeNull();
  });
});

describe("HM5 — 실패 토스트 보기", () => {
  it("켜져 있으면 마운트 때 한 번 뜬다", async () => {
    await renderWithPortal(
      element({ pipeline: pendingPipeline().pipeline, simulatedFailToast: true }),
    );
    expect(await screen.findByText("일기를 쓰지 못했어요.")).toBeTruthy();
  });

  it("덮였다가 걷히면 다시 뜬다", async () => {
    const pipeline = pendingPipeline().pipeline;
    const store = memoryStore();
    const view = await renderWithPortal(
      element({ pipeline, store, simulatedFailToast: true, covered: true }),
    );
    await screen.findByTestId("write-button", { includeHiddenElements: true });
    expect(screen.queryByText("일기를 쓰지 못했어요.", { includeHiddenElements: true })).toBeNull();
    await view.rerender(element({ pipeline, store, simulatedFailToast: true, covered: false }));
    expect(await screen.findByText("일기를 쓰지 못했어요.")).toBeTruthy();
  });

  it("꺼져 있으면 뜨지 않는다", async () => {
    await renderWithPortal(element({ pipeline: pendingPipeline().pipeline }));
    await screen.findByTestId("write-button");
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("일기를 쓰지 못했어요.")).toBeNull();
  });
});

describe("HM6 — 주입된 지금이 흉내 날이면 홈의 오늘이 그 날이다", () => {
  it("큰 숫자·오늘 칸·작성 시각", async () => {
    const store = memoryStore();
    await saved(store, "2026-09-13", new Date("2026-09-13T12:00:00"));
    await renderWithPortal(
      element({
        pipeline: pendingPipeline().pipeline,
        store,
        now: new Date("2026-09-13T14:30:00"),
        chosenDay: "2026-09-13",
      }),
    );
    expect(await screen.findByTestId("home-day-number")).toHaveTextContent("13");
    expect(
      screen.getByTestId("day-today-2026-09-13", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      await screen.findByTestId("written-at", { includeHiddenElements: true }),
    ).toHaveTextContent(/2시간 30분/);
  });
});

describe("HM7 — 쓴 날의 지면은 미리보기 흉내와 무관하다", () => {
  it("권한 없음 미리보기여도 제목·본문 그대로", async () => {
    const store = memoryStore();
    await saved(store, TODAY, new Date("2026-09-28T21:00:00"));
    await renderWithPortal(
      element({
        pipeline: pendingPipeline().pipeline,
        store,
        previewDay: async (day) => ({
          day,
          photos: { kind: "unknown" },
          places: { kind: "unknown" },
          photoAccess: "denied",
        }),
      }),
    );
    expect(await screen.findByText("이미 쓴 본문이다.")).toBeTruthy();
    expect(screen.getByTestId("home-day-title")).toHaveTextContent("이미 쓴 날");
  });
});

describe("HM8 — 쓰는 중에 막혀도 진행 중인 쓰기는 끝까지 간다", () => {
  it("writeBlocked가 참이 되어도 결과가 저장된 쓴 날로 끝난다", async () => {
    let finish: (r: PipelineResult) => void = () => {};
    const run = jest.fn(
      () =>
        new Promise<PipelineResult>((resolve) => {
          finish = resolve;
        }),
    );
    const pipeline = { run } as unknown as Pipeline;
    const store = memoryStore();
    const view = await renderWithPortal(element({ pipeline, store }));
    await fireEvent.press(await screen.findByTestId("write-button"));
    // 재료가 있는 날이라 확인 없이 바로 쓴다
    await screen.findByTestId("writing-paper");
    await view.rerender(element({ pipeline, store, writeBlocked: true }));
    expect(screen.getByTestId("writing-paper")).toBeTruthy();
    await act(async () => {
      await saved(store, TODAY, new Date("2026-09-28T22:15:00"));
      finish({ ok: true, entry: (await store.load(TODAY))! } as PipelineResult);
    });
    expect(await screen.findByText("이미 쓴 본문이다.")).toBeTruthy();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
