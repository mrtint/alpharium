/**
 * 071 — 그만두고 곧바로 다시 쓰기: 앞 쓰기가 아직 풀리는 중이어도 새 쓰기가 앞 쓰기의 상태를 덮지 않는다 (SE-1·SE-2).
 *
 * 실기기 관측(2026-10-10, SM-G986N): 「그만두기」를 누르면 화면은 곧바로 홈으로 돌아오지만 앞 생성은 모델 적재를 못 끊어 5~12초 더
 * 쓰기 잠금을 쥔다(SE-1). 그 사이 다시 쓰기를 누르면 새 쓰기가 `already-running`으로 거절돼 토스트가 뜨고, 앞 쓰기가 풀릴 때는 새 쓰기가
 * `cancelled`를 되돌려 둔 탓에 앞 쓰기의 중단 결과가 실패로 기록됐다(SE-2, `write-failures.json`에 `unwritten`, 4/4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 고침: 쓰기 시도마다 번호를 붙여 취소·정리를 시도별로 한다(`cancelled` 하나가 아니다). 앞 시도가 아직 풀리는 중이면 새 시도는 그것이
 * 끝나기를 기다린 뒤 시작한다 — 새 쓰기가 거절돼 토스트가 뜨지 않는다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다. 타이머 없이 `act(async)`로 Promise를 흘린다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineInput, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal, withPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T16:15:00");
const TODAY = "2026-09-28";

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

/** 호출마다 따로 풀 수 있는 파이프라인 — 앞 시도와 새 시도를 테스트가 쥔다 */
function queuedPipeline() {
  const runs: { input: PipelineInput; finish: (result: PipelineResult) => void }[] = [];
  const pipeline: Pipeline = {
    run: (input) =>
      new Promise<PipelineResult>((resolve) => {
        runs.push({ input, finish: resolve });
      }),
  };
  return { pipeline, runs };
}

const interrupted: PipelineResult = {
  ok: false,
  stage: "generation",
  reason: "interrupted: 그만두기",
};

async function renderHome(
  pipeline: Pipeline,
  recordFailure = jest.fn(),
  store: DiaryStore = memoryStore(),
) {
  const stop = jest.fn(async () => {});
  await renderWithPortal(
    <DiaryHomeScreen
      barLockMs={0}
      now={() => NOW}
      pipeline={pipeline}
      recordFailure={recordFailure}
      resolution={resolved}
      resolve={resolveQuiet}
      stop={stop}
      store={store}
    />,
  );
  return { stop, recordFailure };
}

async function startWriting() {
  await userEvent.press(await screen.findByTestId("write-button"));
  await screen.findByTestId("stop-button");
}

async function stopWriting() {
  await userEvent.press(screen.getByTestId("stop-button"));
  await screen.findByTestId("write-button");
}

describe("R1 — 그만둔 직후 다시 쓰기는 앞 쓰기가 풀린 뒤에 시작한다 (SE-1)", () => {
  it("★ 앞 시도가 아직 풀리는 중이면 새 시도의 파이프라인은 시작되지 않고, 풀린 뒤에 시작한다", async () => {
    const { pipeline, runs } = queuedPipeline();
    await renderHome(pipeline);
    await startWriting();
    expect(runs).toHaveLength(1);

    await stopWriting();
    // 앞 쓰기는 아직 안 풀렸다(모델 적재를 끊지 못해 잠금을 쥐고 있다) — 사용자가 다시 쓰기를 누른다.
    await startWriting();

    // 화면은 쓰는 중이지만 새 파이프라인은 아직 부르지 않았다 — 부르면 잠금에 막혀 `already-running`이다.
    expect(runs).toHaveLength(1);

    await act(async () => {
      runs[0].finish(interrupted);
    });

    await waitFor(() => expect(runs).toHaveLength(2));
    expect(screen.getByTestId("stop-button")).toBeTruthy();
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });

  it("★ 기다리는 동안 다시 그만두면 새 시도는 시작하지 않는다", async () => {
    const { pipeline, runs } = queuedPipeline();
    await renderHome(pipeline);
    await startWriting();
    await stopWriting();
    await startWriting();
    expect(runs).toHaveLength(1);

    await stopWriting();
    await act(async () => {
      runs[0].finish(interrupted);
    });

    expect(runs).toHaveLength(1);
    expect(screen.getByTestId("write-button")).toBeTruthy();
    expect(screen.queryByTestId("stop-button")).toBeNull();
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });
});

describe("R2 — 그만둔 쓰기의 늦은 결과는 새 시도가 있어도 기록되지 않는다 (SE-2)", () => {
  it("★ 실패 기록도 토스트도 없다 — 새 시도의 상태도 건드리지 않는다", async () => {
    const { pipeline, runs } = queuedPipeline();
    const store = memoryStore();
    const { recordFailure } = await renderHome(pipeline, jest.fn(), store);
    recordFailure.mockClear();
    await startWriting();
    await stopWriting();
    await startWriting();

    await act(async () => {
      runs[0].finish(interrupted); // 앞 쓰기가 새 시도가 선 뒤에 풀린다
    });
    await waitFor(() => expect(runs).toHaveLength(2));

    expect(recordFailure).not.toHaveBeenCalled();
    expect(screen.queryByTestId("failure-toast")).toBeNull();
    // 새 시도는 여전히 쓰는 중이다 — 앞 시도의 `finally`가 새 시도의 「쓰는 중」을 끄지 않았다.
    expect(screen.getByTestId("stop-button")).toBeTruthy();

    await store.save(entryFor(TODAY)); // 새 시도의 파이프라인이 저장한 것
    await act(async () => {
      runs[1].finish({ ok: true, entry: entryFor(TODAY), overwrote: false });
    });
    expect(await screen.findByTestId("written-body")).toBeTruthy();
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("그만두지 않은 실패는 지금처럼 기록된다 — 방어가 진짜 실패를 삼키지 않는다", async () => {
    const { pipeline, runs } = queuedPipeline();
    const { recordFailure } = await renderHome(pipeline);
    await startWriting();

    await act(async () => {
      runs[0].finish({ ok: false, stage: "generation", reason: "rejected: echo" });
    });

    await waitFor(() => expect(recordFailure).toHaveBeenCalledTimes(1));
  });
});

describe("R3 — 파이프라인이 받는 취소 판정은 시도별이다 (SE-3)", () => {
  it("그만두면 그 시도의 판정만 참이 된다 — 새 시도는 거짓에서 시작한다", async () => {
    const { pipeline, runs } = queuedPipeline();
    await renderHome(pipeline);
    await startWriting();
    const first = runs[0].input.isCancelled;
    expect(first).toBeDefined();
    expect(first?.()).toBe(false);

    await stopWriting();
    expect(first?.()).toBe(true);

    await startWriting();
    await act(async () => {
      runs[0].finish(interrupted);
    });
    await waitFor(() => expect(runs).toHaveLength(2));
    const second = runs[1].input.isCancelled;
    expect(second?.()).toBe(false);
    // 새 시도가 선 뒤에도 앞 시도의 판정은 참으로 남는다(되돌려지지 않는다).
    expect(first?.()).toBe(true);
  });
});

describe("R4 — 앞 시도가 풀려도 새 시도의 「쓰는 중」은 꺼지지 않는다 (058 지우기와 맞물림)", () => {
  it("★ 새 시도가 도는 중 지우기 요청이 오면 그 시도를 멈추고, 끝난 뒤에 응답한다", async () => {
    const { pipeline, runs } = queuedPipeline();
    const stop = jest.fn(async () => {});
    const onWipeReady = jest.fn();
    const home = (wipeRequest: number) =>
      withPortal(
        <DiaryHomeScreen
          barLockMs={0}
          now={() => NOW}
          onWipeReady={onWipeReady}
          pipeline={pipeline}
          resolution={resolved}
          resolve={resolveQuiet}
          stop={stop}
          store={memoryStore()}
          wipeRequest={wipeRequest}
        />,
      );
    const { rerender } = await render(home(0));
    await startWriting();
    await stopWriting();
    await startWriting();
    await act(async () => {
      runs[0].finish(interrupted); // 앞 시도가 풀린다 — 새 시도의 상태를 끄면 안 된다
    });
    await waitFor(() => expect(runs).toHaveLength(2));
    stop.mockClear();

    await rerender(home(1));

    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
    expect(onWipeReady).not.toHaveBeenCalled();
    await act(async () => {
      runs[1].finish(interrupted);
    });
    await waitFor(() => expect(onWipeReady).toHaveBeenCalledWith(1));
  });
});
