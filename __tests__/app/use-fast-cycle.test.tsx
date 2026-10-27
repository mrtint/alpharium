import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { useFastCycle, type FastCycleControls } from "../../src/app/use-fast-cycle";
import { serializeFastCycle, type FastCyclePort } from "../../src/schedule/fast-cycle-store";

/**
 * 106 — 빠른 주기 켜기·끄기 상태 (spec US3·US5, contracts/cycle-reset.md CR9~CR11).
 *
 * `use-simulation.ts`(064)와 같은 모양: 개발 환경에서만 읽고 쓴다. 켜기는 오늘 일기가 있으면 확인을 거치고, 끄기는 기록을 지운다.
 * 켜기·끄기·주기 변경은 `onChanged`를 부른다(조립부가 잡 재등록·알림 맞추기·「한 번」 다시 열기를 묶어 연결 — FR-014).
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 */

const NOW = new Date(2026, 9, 26, 10, 20);
const CYCLE_20 = "2026-10-26#20";

function memoryPort(initial: string | null) {
  const state = { content: initial, writes: 0, reads: 0 };
  const port: FastCyclePort = {
    async read() {
      state.reads += 1;
      return state.content;
    },
    async write(serialized) {
      state.writes += 1;
      state.content = serialized;
    },
    async remove() {
      state.content = null;
    },
  };
  return { port, state };
}

function setup(
  over: {
    initial?: string | null;
    devEnvironment?: boolean;
    hasTodayDiary?: boolean;
    start?: jest.Mock;
  } = {},
) {
  const mem = memoryPort(over.initial ?? null);
  const start =
    over.start ??
    jest.fn(async ({ periodMinutes }: { periodMinutes: number }) => {
      mem.state.content = serializeFastCycle({ periodMinutes, resetCycle: CYCLE_20 });
      return { ok: true };
    });
  const onChanged = jest.fn();
  let latest: FastCycleControls | null = null;
  function Harness() {
    latest = useFastCycle({
      devEnvironment: over.devEnvironment ?? true,
      port: mem.port,
      now: () => NOW,
      hasTodayDiary: async () => over.hasTodayDiary ?? false,
      start,
      onChanged,
    });
    return <Text testID="loaded">{latest.loaded ? "읽음" : "읽기 전"}</Text>;
  }
  return { mem, start, onChanged, Harness, controls: () => latest as unknown as FastCycleControls };
}

const ON = serializeFastCycle({ periodMinutes: 30, resetCycle: CYCLE_20 });

describe("읽기", () => {
  it("개발 환경이면 마운트 때 기록을 한 번 읽는다 — 읽기 전은 loaded=false", async () => {
    const h = setup({ initial: ON });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    expect(h.controls().record).toEqual({ periodMinutes: 30, resetCycle: CYCLE_20 });
    expect(h.mem.state.reads).toBe(1);
  });

  it("개발 환경이 아니면 기록이 켜져 있어도 읽지 않고 꺼짐이며 loaded=true다", async () => {
    const h = setup({ initial: ON, devEnvironment: false });
    await render(<h.Harness />);
    expect(h.controls().loaded).toBe(true);
    expect(h.controls().record).toBeNull();
    expect(h.mem.state.reads).toBe(0);
  });

  it("깨진 기록은 꺼짐이다", async () => {
    const h = setup({ initial: "{" });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    expect(h.controls().record).toBeNull();
  });
});

describe("켜기 (FR-009·FR-009a·US3 AS4)", () => {
  it("오늘 일기가 없으면 확인 없이 start를 부르고 켜진다 — onChanged 한 번", async () => {
    const h = setup();
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().enable(30);
    });
    expect(h.start).toHaveBeenCalledWith(expect.objectContaining({ periodMinutes: 30 }));
    expect(h.controls().pendingEnable).toBeNull();
    expect(h.controls().record).toEqual({ periodMinutes: 30, resetCycle: CYCLE_20 });
    expect(h.onChanged).toHaveBeenCalledTimes(1);
  });

  it("오늘 일기가 있으면 needsConfirm(pendingEnable)이 서고 확인 전에는 아무것도 저장·삭제하지 않는다", async () => {
    const h = setup({ hasTodayDiary: true });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().enable(10);
    });
    expect(h.controls().pendingEnable).toEqual({ periodMinutes: 10 });
    expect(h.start).not.toHaveBeenCalled();
    expect(h.mem.state.writes).toBe(0);
    expect(h.controls().record).toBeNull();
    expect(h.onChanged).not.toHaveBeenCalled();
  });

  it("확인하면 start를 부르고 켜진다", async () => {
    const h = setup({ hasTodayDiary: true });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().enable(10);
    });
    await act(async () => {
      await h.controls().confirmEnable();
    });
    expect(h.start).toHaveBeenCalledTimes(1);
    expect(h.controls().pendingEnable).toBeNull();
    expect(h.controls().record?.periodMinutes).toBe(10);
    expect(h.onChanged).toHaveBeenCalledTimes(1);
  });

  it("거절하면 켜지지 않는다 (US3 AS4)", async () => {
    const h = setup({ hasTodayDiary: true });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().enable(10);
    });
    await act(async () => {
      h.controls().cancelEnable();
    });
    expect(h.controls().pendingEnable).toBeNull();
    expect(h.controls().record).toBeNull();
    expect(h.start).not.toHaveBeenCalled();
    expect(h.onChanged).not.toHaveBeenCalled();
  });

  it("start가 실패({ok:false})하면 켜지지 않는다 (쓰기가 칸을 쥔 경우 등)", async () => {
    const h = setup({ start: jest.fn(async () => ({ ok: false })) });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().enable(30);
    });
    expect(h.controls().record).toBeNull();
    expect(h.controls().startFailed).toBe(true);
    expect(h.onChanged).not.toHaveBeenCalled();
  });

  it("범위 밖 주기는 거부한다 — start도 부르지 않는다", async () => {
    const h = setup();
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().enable(4);
      await h.controls().enable(181);
      await h.controls().enable(30.5);
    });
    expect(h.start).not.toHaveBeenCalled();
  });

  it("개발 환경이 아니면 켜기를 무시한다", async () => {
    const h = setup({ devEnvironment: false });
    await render(<h.Harness />);
    await act(async () => {
      await h.controls().enable(30);
    });
    expect(h.start).not.toHaveBeenCalled();
    expect(h.controls().record).toBeNull();
  });
});

describe("주기 변경·끄기 (FR-013a·FR-014)", () => {
  it("주기 값 변경은 새 주기로 다시 시작한다 — 켜기와 같은 길(start) · onChanged (스펙 Edge Cases)", async () => {
    const h = setup({ initial: ON });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().setPeriod(10);
    });
    expect(h.start).toHaveBeenCalledWith(expect.objectContaining({ periodMinutes: 10 }));
    expect(h.controls().record).toEqual({ periodMinutes: 10, resetCycle: CYCLE_20 });
    expect(h.onChanged).toHaveBeenCalledTimes(1);
  });

  it("같은 값을 다시 고르면 아무 일도 없다 — 오늘 일기를 지우지 않는다 (코드 리뷰 I2)", async () => {
    const h = setup({ initial: ON, hasTodayDiary: true });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().setPeriod(30);
    });
    expect(h.start).not.toHaveBeenCalled();
    expect(h.controls().pendingEnable).toBeNull();
    expect(h.onChanged).not.toHaveBeenCalled();
  });

  it("오늘 일기가 있으면 주기 변경도 확인을 거친다 — 거절하면 옛 주기가 그대로다", async () => {
    const h = setup({ initial: ON, hasTodayDiary: true });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().setPeriod(10);
    });
    expect(h.controls().pendingEnable).toEqual({ periodMinutes: 10 });
    expect(h.start).not.toHaveBeenCalled();
    await act(async () => {
      h.controls().cancelEnable();
    });
    expect(h.controls().record?.periodMinutes).toBe(30);
    expect(h.start).not.toHaveBeenCalled();
  });

  it("꺼져 있을 때의 주기 변경은 무시한다", async () => {
    const h = setup();
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().setPeriod(10);
    });
    expect(h.mem.state.writes).toBe(0);
    expect(h.onChanged).not.toHaveBeenCalled();
  });

  it("끄기는 기록을 지운다 — onChanged", async () => {
    const h = setup({ initial: ON });
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().disable();
    });
    expect(h.mem.state.content).toBeNull();
    expect(h.controls().record).toBeNull();
    expect(h.onChanged).toHaveBeenCalledTimes(1);
  });

  it("개발 환경이 아니면 끄기도 아무것도 하지 않는다 (배포 기록을 건드리지 않는다)", async () => {
    const h = setup({ initial: ON, devEnvironment: false });
    await render(<h.Harness />);
    await act(async () => {
      await h.controls().disable();
    });
    expect(h.mem.state.content).toBe(ON);
    expect(h.onChanged).not.toHaveBeenCalled();
  });

  it("끌 때는 기록이 없어도 던지지 않는다", async () => {
    const h = setup();
    await render(<h.Harness />);
    await waitFor(() => expect(h.controls().loaded).toBe(true));
    await act(async () => {
      await h.controls().disable();
    });
    expect(h.controls().record).toBeNull();
  });
});
