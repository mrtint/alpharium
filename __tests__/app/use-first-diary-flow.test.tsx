/**
 * 111 — 첫 일기 흐름 훅 (HK1~HK3).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md
 * 실제 홈과 묶은 조립(HK4)은 `__tests__/ui/first-diary-assembly.test.tsx`.
 */

import { act, renderHook } from "@testing-library/react-native";

import type { FirstDiaryMaterial } from "../../src/app/first-diary-material";
import {
  useFirstDiaryFlow,
  type FirstDiaryFlowDeps,
  type FirstDiaryRequestMark,
} from "../../src/app/use-first-diary-flow";
import type { PipelineResult } from "../../src/diary/pipeline";

const DAY = "2026-11-04";
const FAILED: PipelineResult = { ok: false, stage: "generation", reason: "rejected: echo" };
const INTERRUPTED: PipelineResult = { ok: false, stage: "generation", reason: "interrupted: x" };

async function mount(over: Omit<Partial<FirstDiaryFlowDeps>, "requestWrite"> = {}) {
  const deps = {
    readMaterial: jest.fn(async (): Promise<FirstDiaryMaterial> => ({ day: DAY, canAsk: true })),
    requestWrite: jest.fn((_day: string, _mark: FirstDiaryRequestMark) => 7),
    onRollBack: jest.fn(),
    ...over,
  };
  const hook = await renderHook(() => useFirstDiaryFlow(deps));
  return { deps, hook, flow: () => hook.result.current };
}

async function toAsking(flow: () => ReturnType<typeof useFirstDiaryFlow>) {
  await act(async () => flow().livenessPassed());
  expect(flow().step).toBe("asking");
}

describe("HK1 — reading에서 재료를 한 번 읽는다", () => {
  it("물을 수 있으면 asking, entered가 선다", async () => {
    const { deps, flow } = await mount();
    expect(flow().step).toBe("before");
    expect(flow().entered.current).toBe(false);
    await toAsking(flow);
    expect(deps.readMaterial).toHaveBeenCalledTimes(1);
    expect(flow().entered.current).toBe(true);
  });

  it.each([
    ["못 물음", async () => ({ day: DAY, canAsk: false })],
    ["던짐", () => Promise.reject(new Error("x"))],
  ])("%s이면 done", async (_label, readMaterial) => {
    const { flow } = await mount({ readMaterial: readMaterial as never });
    await act(async () => flow().livenessPassed());
    expect(flow().step).toBe("done");
  });

  it("언마운트 뒤의 결과는 버린다", async () => {
    let finish: (m: FirstDiaryMaterial) => void = () => {};
    const { flow, hook } = await mount({
      readMaterial: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    await act(async () => flow().livenessPassed());
    expect(flow().step).toBe("reading");
    await hook.unmount();
    await act(async () => finish({ day: DAY, canAsk: true }));
    expect(flow().step).toBe("reading");
  });

  it("건너뛰면 재료를 읽지 않고 done이고 entered가 서지 않는다", async () => {
    const { deps, flow } = await mount();
    await act(async () => flow().livenessSkipped());
    expect(flow().step).toBe("done");
    expect(deps.readMaterial).not.toHaveBeenCalled();
    expect(flow().entered.current).toBe(false);
  });
});

describe("HK2 — 확인창의 두 답", () => {
  it("confirm은 읽은 날로 요청을 낸다", async () => {
    const { deps, flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().confirm());
    expect(flow().step).toBe("writing");
    expect(deps.requestWrite).toHaveBeenCalledTimes(1);
    expect(deps.requestWrite.mock.calls[0]?.[0]).toBe(DAY);
  });

  it("later는 요청 없이 done", async () => {
    const { deps, flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().later());
    expect(flow().step).toBe("done");
    expect(deps.requestWrite).not.toHaveBeenCalled();
  });

  it("silencesFailure는 되돌릴 실패에만 참이다", async () => {
    const { deps, flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().confirm());
    const mark = deps.requestWrite.mock.calls[0]?.[1];
    expect(mark?.silencesFailure(FAILED)).toBe(true);
    expect(mark?.silencesFailure(INTERRUPTED)).toBe(false);
    expect(mark?.silencesFailure({ ok: false, stage: "already-running", reason: "" })).toBe(false);

    await act(async () => flow().onWriteSettled(7, { kind: "finished", result: FAILED }));
    await toAsking(flow);
    await act(async () => flow().confirm());
    expect(deps.requestWrite.mock.calls[1]?.[1].silencesFailure(FAILED)).toBe(false);
  });
});

describe("HK3 — 되돌림", () => {
  it("첫 실패에 onRollBack을 한 번 부르고 before다", async () => {
    const { deps, flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().confirm());
    await act(async () => flow().onWriteSettled(7, { kind: "finished", result: FAILED }));
    expect(flow().step).toBe("before");
    expect(deps.onRollBack).toHaveBeenCalledTimes(1);
  });

  it("같은 번호표를 두 번 알려도 한 번만 처리한다", async () => {
    const { deps, flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().confirm());
    await act(async () => flow().onWriteSettled(7, { kind: "finished", result: FAILED }));
    await act(async () => flow().onWriteSettled(7, { kind: "finished", result: FAILED }));
    expect(deps.onRollBack).toHaveBeenCalledTimes(1);
  });

  it("다른 번호표(진단 요청)는 보지 않는다", async () => {
    const { flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().confirm());
    await act(async () => flow().onWriteSettled(99, { kind: "refused" }));
    expect(flow().step).toBe("writing");
  });

  it("되돌린 뒤에는 재료를 다시 읽고, 두 번째 실패는 되돌리지 않고 done이다", async () => {
    const { deps, flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().confirm());
    await act(async () => flow().onWriteSettled(7, { kind: "finished", result: FAILED }));
    await toAsking(flow);
    expect(deps.readMaterial).toHaveBeenCalledTimes(2);
    await act(async () => flow().confirm());
    await act(async () => flow().onWriteSettled(7, { kind: "threw" }));
    expect(flow().step).toBe("done");
    expect(deps.onRollBack).toHaveBeenCalledTimes(1);
  });

  it("그만두기·끊김은 되돌리지 않는다", async () => {
    const { deps, flow } = await mount();
    await toAsking(flow);
    await act(async () => flow().confirm());
    await act(async () => flow().onWriteSettled(7, { kind: "stopped" }));
    expect(flow().step).toBe("done");
    expect(deps.onRollBack).not.toHaveBeenCalled();
  });
});
