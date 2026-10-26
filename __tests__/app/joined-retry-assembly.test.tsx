/**
 * 106 — 합류한 쓰기가 실패하면 「한 번」을 이미 소모한 실행에서도 한 번 이어 쓴다 (contracts/joined-retry.md JR4~JR6, 080 잔여 ④).
 *
 * 실제 `useAutoWriteClaim`(「한 번」의 세대)·실제 등록부·실제 홈을 묶는다: 조립부가 `onJoinedWriteFailed`를 `rearmAutoWrite`에 잇는다.
 * 프로세스가 오래 사는 iOS는 「한 번」을 일찍 소모한 채 남의 쓰기에 합류한다 — 그 쓰기가 실패해도 종전에는 홈이 이어 쓰지 않았다.
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 */

import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import { useEffect, useMemo, useRef } from "react";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import { useAutoWriteClaim } from "../../src/app/use-auto-write-claim";
import type { EnvironmentResolution } from "../../src/config/types";
import { createLiveWrites } from "../../src/diary/live-write";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "../ui/render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

const previewDay = async (day: string) => ({
  day,
  photos: { kind: "known" as const, count: 3 },
  places: { kind: "unknown" as const },
  photoAccess: "ok" as const,
});

const FAILED: PipelineResult = { ok: false, stage: "generation", reason: "x" } as PipelineResult;

function Harness({
  registry,
  pipeline,
  spendFirst,
}: {
  registry: ReturnType<typeof createLiveWrites>;
  pipeline: Pipeline;
  spendFirst: boolean;
}) {
  const firstRunTried = useMemo(() => ({ current: false }), []);
  const store = useMemo(() => memoryStore(), []);
  const { claimAutoWrite, spendAutoWrite, rearmAutoWrite } = useAutoWriteClaim({
    simulationLoaded: true,
    writeBlocked: false,
    firstRunTried,
  });
  // 이 실행의 「한 번」을 이미 소모했다 (오래 사는 프로세스) — 마운트 때 한 번만. 세대가 오를 때마다 다시 소모하면 다시 연 것을 지운다.
  const spendOnce = useRef(spendAutoWrite);
  useEffect(() => {
    if (spendFirst) spendOnce.current();
  }, [spendFirst]);
  return (
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={store}
      previewDay={previewDay}
      liveWrites={registry}
      autoWriteDay={TODAY}
      claimAutoWrite={claimAutoWrite}
      onJoinedWriteFailed={rearmAutoWrite}
      barLockMs={0}
      chosenDay={TODAY}
    />
  );
}

describe("JR4·JR6 — 「한 번」을 소모한 실행에서 합류한 쓰기가 실패하면 이어서 한 번 쓴다", () => {
  it("이어 쓰기 시작 1회 → 그 쓰기도 실패 → 더 시작하지 않는다", async () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: TODAY, owner: "background" });
    const run = jest.fn(async (): Promise<PipelineResult> => FAILED);
    await renderWithPortal(
      <Harness pipeline={{ run } as unknown as Pipeline} registry={registry} spendFirst />,
    );
    await screen.findByTestId("writing-paper"); // 합류
    expect(run).not.toHaveBeenCalled();

    // 합류한 쓰기가 실패로 끝난다 → 「한 번」이 한 번 다시 열려 057 판정이 이어서 쓴다
    await act(async () => {
      handle?.end({ ok: false });
    });
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));

    // 이어 쓴 쓰기도 실패했다 — 더 이어 쓰지 않는다
    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("종전에는(콜백이 없으면) 소모한 실행에서 이어 쓰지 않는다 — 이 결함의 재현", async () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: TODAY, owner: "background" });
    const run = jest.fn(async (): Promise<PipelineResult> => FAILED);
    function NoRearm() {
      const firstRunTried = useMemo(() => ({ current: false }), []);
      const store = useMemo(() => memoryStore(), []);
      const { claimAutoWrite, spendAutoWrite } = useAutoWriteClaim({
        simulationLoaded: true,
        writeBlocked: false,
        firstRunTried,
      });
      const spendOnce = useRef(spendAutoWrite);
      useEffect(() => {
        spendOnce.current();
      }, []);
      return (
        <DiaryHomeScreen
          now={() => NOW}
          pipeline={{ run } as unknown as Pipeline}
          resolution={resolved}
          resolve={resolveQuiet}
          store={store}
          previewDay={previewDay}
          liveWrites={registry}
          autoWriteDay={TODAY}
          claimAutoWrite={claimAutoWrite}
          barLockMs={0}
          chosenDay={TODAY}
        />
      );
    }
    await renderWithPortal(<NoRearm />);
    await screen.findByTestId("writing-paper");
    await act(async () => {
      handle?.end({ ok: false });
    });
    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(run).not.toHaveBeenCalled();
  });
});

describe("JR2 — 사용자가 그만둔 합류 쓰기 뒤에는 이어 쓰지 않는다", () => {
  it("「그만두기」로 끊은 쓰기가 ok:false로 끝나도 이어 쓰기를 열지 않는다", async () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: TODAY, owner: "background" });
    const run = jest.fn(async (): Promise<PipelineResult> => FAILED);
    await renderWithPortal(
      <Harness pipeline={{ run } as unknown as Pipeline} registry={registry} spendFirst={false} />,
    );
    await screen.findByTestId("writing-paper");
    await userEvent.press(screen.getByTestId("stop-button"));
    await act(async () => {
      handle?.end({ ok: false });
    });
    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(run).not.toHaveBeenCalled();
  });
});
