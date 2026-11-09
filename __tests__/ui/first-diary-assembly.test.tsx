/**
 * 111 — 실제 홈과 첫 일기 흐름 훅을 묶은 조립 시험 (HK4).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md
 *
 * 상태·결과를 공유하는 두 부품(훅의 조용한 실패 판정, 홈의 토스트·기록)은 실제로 묶어 돌린다. `App.tsx`는 jest에서 그릴 수 없어
 * 조립을 작은 틀로 옮겼다 — `AppFrame.first-diary.test.tsx`가 App이 같은 모양으로 잇는지 소스로 잠근다.
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { useCallback, useRef, useState } from "react";

import type { PipelineFailure } from "../../src/app/failure-toast";
import type { ResolveOutcome } from "../../src/app/resolve-generation";
import {
  useFirstDiaryFlow,
  type FirstDiaryFlow,
  type FirstDiaryRequestMark,
} from "../../src/app/use-first-diary-flow";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { FirstDiaryConfirmDialog } from "../../src/ui/MaterialDialogs";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";
const FAILED: PipelineResult = { ok: false, stage: "generation", reason: "rejected: echo" };

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

type Harness = { flow: FirstDiaryFlow; onRollBack: jest.Mock; recordFailure: jest.Mock };

/** 되돌리면 App처럼 홈을 내린다(확인 화면이 그 자리다) */
function setup(results: readonly (PipelineResult | "pending")[]) {
  const finishers: ((r: PipelineResult) => void)[] = [];
  let call = 0;
  const pipeline = {
    run: jest.fn(() => {
      const next = results[call++] ?? FAILED;
      if (next !== "pending") return Promise.resolve(next);
      return new Promise<PipelineResult>((resolve) => finishers.push(resolve));
    }),
  } as unknown as Pipeline;
  const store = memoryStore();
  const harness = {} as Harness;
  harness.onRollBack = jest.fn();
  harness.recordFailure = jest.fn((_: PipelineFailure) => {});

  function Frame() {
    const [request, setRequest] = useState<{
      id: number;
      day: string;
      firstDiary: FirstDiaryRequestMark;
    } | null>(null);
    const ids = useRef(0);
    const requestWrite = useCallback((day: string, firstDiary: FirstDiaryRequestMark) => {
      ids.current += 1;
      setRequest({ id: ids.current, day, firstDiary });
      return ids.current;
    }, []);
    const readMaterial = useCallback(async () => ({ day: TODAY, canAsk: true }), []);
    const onRollBack = harness.onRollBack;
    const flow = useFirstDiaryFlow({ readMaterial, requestWrite, onRollBack });
    harness.flow = flow;
    if (flow.step === "before" || flow.step === "reading") return null;
    return (
      <>
        <DiaryHomeScreen
          barLockMs={0}
          now={() => NOW}
          pipeline={pipeline}
          resolution={resolved}
          resolve={resolveQuiet}
          store={store}
          writeRequest={request as never}
          onWriteRequestHandled={(id) => setRequest((r) => (r?.id === id ? null : r))}
          onWriteRequestSettled={flow.onWriteSettled}
          recordFailure={harness.recordFailure}
          stop={async () => {}}
          chosenDay={TODAY}
        />
        {flow.step === "asking" && (
          <FirstDiaryConfirmDialog onConfirm={flow.confirm} onLater={flow.later} />
        )}
      </>
    );
  }
  return { harness, pipeline, finishers, element: <Frame /> };
}

async function reachDialog(harness: Harness) {
  await act(async () => harness.flow.livenessPassed());
  expect(await screen.findByTestId("first-diary-confirm-yes")).toBeTruthy();
}

describe("HK4 — 실패와 되돌림", () => {
  it("첫 실패: 토스트 없음·되돌림, 실패 기록은 남는다. 되돌린 뒤의 실패: 토스트·done", async () => {
    const { harness, element } = setup([FAILED, FAILED]);
    await renderWithPortal(element);

    await reachDialog(harness);
    await fireEvent.press(screen.getByTestId("first-diary-confirm-yes"));
    await waitFor(() => expect(harness.onRollBack).toHaveBeenCalledTimes(1));
    expect(harness.flow.step).toBe("before");
    expect(screen.queryByTestId("failure-toast")).toBeNull();
    expect(harness.recordFailure).toHaveBeenCalledTimes(1);

    await reachDialog(harness);
    await fireEvent.press(screen.getByTestId("first-diary-confirm-yes"));
    await waitFor(() => expect(harness.flow.step).toBe("done"));
    expect(await screen.findByTestId("failure-toast")).toBeTruthy();
    expect(harness.onRollBack).toHaveBeenCalledTimes(1);
    expect(harness.recordFailure).toHaveBeenCalledTimes(2);
  });

  it("그만두기: 토스트 없음·done·되돌리지 않음", async () => {
    const { harness, element, finishers } = setup(["pending"]);
    await renderWithPortal(element);
    await reachDialog(harness);
    await fireEvent.press(screen.getByTestId("first-diary-confirm-yes"));
    await fireEvent.press(await screen.findByTestId("stop-button"));
    await act(async () =>
      finishers[0]?.({ ok: false, stage: "generation", reason: "interrupted: x" }),
    );
    await waitFor(() => expect(harness.flow.step).toBe("done"));
    expect(screen.queryByTestId("failure-toast")).toBeNull();
    expect(harness.onRollBack).not.toHaveBeenCalled();
    expect(harness.recordFailure).not.toHaveBeenCalled();
  });

  it("앱을 나가 끊김: 토스트·done·되돌리지 않음", async () => {
    const { harness, element } = setup([
      { ok: false, stage: "generation", reason: "interrupted: 앞을 벗어남" },
    ]);
    await renderWithPortal(element);
    await reachDialog(harness);
    await fireEvent.press(screen.getByTestId("first-diary-confirm-yes"));
    await waitFor(() => expect(harness.flow.step).toBe("done"));
    expect(await screen.findByTestId("failure-toast")).toBeTruthy();
    expect(harness.onRollBack).not.toHaveBeenCalled();
  });

  it("저장: done·토스트 없음", async () => {
    const { harness, element } = setup([{ ok: true, entry: {}, overwrote: false } as never]);
    await renderWithPortal(element);
    await reachDialog(harness);
    await fireEvent.press(screen.getByTestId("first-diary-confirm-yes"));
    await waitFor(() => expect(harness.flow.step).toBe("done"));
    expect(screen.queryByTestId("failure-toast")).toBeNull();
    expect(harness.onRollBack).not.toHaveBeenCalled();
  });

  it("나중에: 쓰지 않고 done", async () => {
    const { harness, element, pipeline } = setup([FAILED]);
    await renderWithPortal(element);
    await reachDialog(harness);
    await fireEvent.press(screen.getByTestId("first-diary-confirm-later"));
    expect(harness.flow.step).toBe("done");
    expect((pipeline as unknown as { run: jest.Mock }).run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("first-diary-confirm-yes")).toBeNull();
  });
});
