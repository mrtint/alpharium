/**
 * 111 — 홈의 첫 일기 쓰기 요청 (HR1~HR4).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md 「홈 쓰기 요청」
 *
 * 진단 요청(060)은 `diary-home-write-request.test.tsx`가 잠근다. 이 파일은 `firstDiary`가 있을 때 달라지는 것만 본다.
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import type { PipelineFailure } from "../../src/app/failure-toast";
import type { FirstWriteSettled } from "../../src/app/first-diary-material";
import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal, withPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

const FAILED: PipelineResult = { ok: false, stage: "generation", reason: "rejected: echo" };
const INTERRUPTED: PipelineResult = {
  ok: false,
  stage: "generation",
  reason: "interrupted: 앞을 벗어남",
};

function run(result: PipelineResult) {
  return { run: jest.fn(() => Promise.resolve(result)) } as unknown as Pipeline;
}

type Over = {
  pipeline: Pipeline | undefined;
  silences?: boolean;
  noFirstDiary?: boolean;
  settled?: (id: number, s: FirstWriteSettled) => void;
  recordFailure?: (r: PipelineFailure) => void;
  writeBlocked?: boolean;
  resolve?: (day: string) => ResolveOutcome;
  continuedStart?: jest.Mock;
  stop?: () => Promise<void>;
  store?: DiaryStore;
  covered?: boolean;
};

const sharedStore = memoryStore();

function element(over: Over) {
  return (
    <DiaryHomeScreen
      barLockMs={0}
      now={() => NOW}
      pipeline={over.pipeline}
      resolution={resolved}
      resolve={over.resolve ?? resolveQuiet}
      store={over.store ?? sharedStore}
      previewDay={async (day: string) => ({
        day,
        photos: { kind: "none" as const },
        places: { kind: "none" as const },
        photoAccess: "ok" as const,
      })}
      writeRequest={
        {
          id: 7,
          day: TODAY,
          ...(over.noFirstDiary === true
            ? {}
            : { firstDiary: { silencesFailure: () => over.silences === true } }),
        } as never
      }
      onWriteRequestSettled={over.settled as never}
      recordFailure={over.recordFailure}
      writeBlocked={over.writeBlocked}
      covered={over.covered}
      chosenDay={TODAY}
      {...(over.continuedStart !== undefined
        ? { continuedWrite: { start: over.continuedStart } as never }
        : {})}
      {...(over.stop !== undefined ? { stop: over.stop } : {})}
    />
  );
}

describe("HR2 — 끝나면 한 번 알린다", () => {
  it("저장: finished", async () => {
    const settled = jest.fn();
    const result = { ok: true, entry: {} } as unknown as PipelineResult;
    await renderWithPortal(element({ pipeline: run(result), settled }));
    await waitFor(() => expect(settled).toHaveBeenCalledTimes(1));
    expect(settled).toHaveBeenCalledWith(7, { kind: "finished", result });
  });

  it("흉내로 막힘: refused, 쓰지 않는다", async () => {
    const settled = jest.fn();
    const pipeline = run(FAILED);
    await renderWithPortal(element({ pipeline, settled, writeBlocked: true }));
    await waitFor(() => expect(settled).toHaveBeenCalledWith(7, { kind: "refused" }));
    expect((pipeline as unknown as { run: jest.Mock }).run).not.toHaveBeenCalled();
  });

  it("캐릭터 없음: refused", async () => {
    const settled = jest.fn();
    await renderWithPortal(
      element({
        pipeline: run(FAILED),
        settled,
        resolve: () => ({ kind: "no-ready-character" }),
      }),
    );
    await waitFor(() => expect(settled).toHaveBeenCalledWith(7, { kind: "refused" }));
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it("조립 실패(파이프라인 없음): refused", async () => {
    const settled = jest.fn();
    await renderWithPortal(element({ pipeline: undefined, settled }));
    await waitFor(() => expect(settled).toHaveBeenCalledWith(7, { kind: "refused" }));
  });

  it("쓰기가 던짐: threw, 쓰는 중에 남지 않고 토스트가 있다", async () => {
    const settled = jest.fn();
    const pipeline = { run: jest.fn(() => Promise.reject(new Error("x"))) } as unknown as Pipeline;
    await renderWithPortal(element({ pipeline, settled }));
    await waitFor(() => expect(settled).toHaveBeenCalledWith(7, { kind: "threw" }));
    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    expect(await screen.findByTestId("failure-toast")).toBeTruthy();
  });

  it("그만두기: stopped, 토스트가 없다", async () => {
    const settled = jest.fn();
    let finish: (r: PipelineResult) => void = () => {};
    const pipeline = {
      run: jest.fn(
        () =>
          new Promise<PipelineResult>((resolve) => {
            finish = resolve;
          }),
      ),
    } as unknown as Pipeline;
    await renderWithPortal(element({ pipeline, settled, stop: async () => {} }));
    await fireEvent.press(await screen.findByTestId("stop-button"));
    await act(async () => finish(INTERRUPTED));
    await waitFor(() => expect(settled).toHaveBeenCalledWith(7, { kind: "stopped" }));
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });
});

describe("홈이 요청을 받는 때", () => {
  it("그 날 일기가 생겼으면 덮어쓰지 않고 refused", async () => {
    const settled = jest.fn();
    const store = memoryStore();
    await store.save({
      date: TODAY,
      title: "백그라운드가 쓴 날",
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
    const pipeline = run(FAILED);
    await renderWithPortal(element({ pipeline, settled, store }));
    await waitFor(() => expect(settled).toHaveBeenCalledWith(7, { kind: "refused" }));
    expect((pipeline as unknown as { run: jest.Mock }).run).not.toHaveBeenCalled();
  });

  it("덮여 있는 동안은 기다리고 걷히면 시작한다", async () => {
    const settled = jest.fn();
    const pipeline = run(FAILED);
    const view = await renderWithPortal(element({ pipeline, settled, covered: true }));
    await act(async () => {});
    expect(settled).not.toHaveBeenCalled();
    expect((pipeline as unknown as { run: jest.Mock }).run).not.toHaveBeenCalled();
    await view.rerender(withPortal(element({ pipeline, settled, covered: false })));
    await waitFor(() => expect(settled).toHaveBeenCalledTimes(1));
    expect((pipeline as unknown as { run: jest.Mock }).run).toHaveBeenCalledTimes(1);
  });
});

describe("HR3 — 조용한 실패", () => {
  it("토스트만 끄고 실패 기록은 남긴다", async () => {
    const settled = jest.fn();
    const recordFailure = jest.fn();
    await renderWithPortal(
      element({ pipeline: run(FAILED), settled, recordFailure, silences: true }),
    );
    await waitFor(() => expect(settled).toHaveBeenCalledTimes(1));
    expect(recordFailure).toHaveBeenCalledWith(FAILED);
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });

  it("끄지 않은 실패는 토스트가 있다", async () => {
    const settled = jest.fn();
    await renderWithPortal(element({ pipeline: run(INTERRUPTED), settled, silences: false }));
    expect(await screen.findByTestId("failure-toast")).toBeTruthy();
    expect(settled).toHaveBeenCalledWith(7, { kind: "finished", result: INTERRUPTED });
  });
});

describe("HR1·HR4 — 이어 하기와 진단 요청", () => {
  const start = () =>
    jest.fn(async () => ({ accepted: false, progress: () => {}, finish: () => {} }));

  it("HR1 첫 일기 요청은 이어 하기를 신청한다", async () => {
    const continuedStart = start();
    const settled = jest.fn();
    await renderWithPortal(element({ pipeline: run(FAILED), continuedStart, settled }));
    await waitFor(() => expect(settled).toHaveBeenCalled());
    expect(continuedStart).toHaveBeenCalledTimes(1);
  });

  it("HR4 firstDiary가 없으면 콜백·이어 하기가 없고 토스트가 있다", async () => {
    const continuedStart = start();
    const settled = jest.fn();
    await renderWithPortal(
      element({ pipeline: run(FAILED), continuedStart, settled, noFirstDiary: true }),
    );
    expect(await screen.findByTestId("failure-toast")).toBeTruthy();
    expect(continuedStart).not.toHaveBeenCalled();
    expect(settled).not.toHaveBeenCalled();
  });
});
