import { act, render, screen, waitFor } from "@testing-library/react-native";
import { AppState, Text } from "react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DayPreview } from "../../src/app/state";
import {
  useAutoWriteHandoff,
  type AutoWriteHandoffDeps,
} from "../../src/app/use-auto-write-handoff";
import type { AutoDiarySettings } from "../../src/schedule/settings";

/**
 * 082 — 앱 열기 자동 쓰기 판정이 홈에 넘겨 두는 날.
 *
 * 계약: specs/082-auto-write-claim-handoff/contracts/auto-write-open.md HO1~HO12
 *
 * 판정은 진짜다(`resolveAutoWrite` — 훅 안). 통로만 대역이다: 메모리 일기 목록, 날마다 정한 미리보기, 메모리 건너뜀·시도 기록.
 * 「지금」은 목표 22시·실제 오전 — 어제는 차례가 지난 날이라 창 밖에서도 쓴다(078).
 *
 * `AppState.addEventListener`의 스파이는 복원하지 않는다 — jest-expo의 목은 복원하면 구독 반환값을 잃는다.
 * ⚠️ RNTL 14의 `render`·`rerender`는 Promise다 — await한다.
 */

const NOW = new Date("2026-09-28T09:40:00");
const YESTERDAY = "2026-09-27";
const TWO_AGO = "2026-09-26";
const THREE_AGO = "2026-09-25";

const ON: AutoDiarySettings = { enabled: true, targetHour: 22 };
const OFF: AutoDiarySettings = { enabled: false, targetHour: 22 };

const withPhotos = (day: string): DayPreview => ({
  day,
  photos: { kind: "known", count: 3 },
  places: { kind: "unknown" },
  photoAccess: "ok",
});
const noMaterial = (day: string): DayPreview => ({
  day,
  photos: { kind: "none" },
  places: { kind: "none" },
  photoAccess: "ok",
});
const noAccess = (day: string): DayPreview => ({
  day,
  photos: { kind: "unknown" },
  places: { kind: "unknown" },
  photoAccess: "denied",
});

/** 어제에만 재료가 있다 — 다른 날은 「재료 없음」으로 건너뛴다 */
const onlyYesterday = async (day: string) =>
  day === YESTERDAY ? withPhotos(day) : noMaterial(day);

function memoryPort() {
  let stored: string | null = null;
  return {
    read: jest.fn(async () => stored),
    write: jest.fn(async (serialized: string) => {
      stored = serialized;
    }),
    remove: jest.fn(async () => {
      stored = null;
    }),
  };
}

/** 손으로 여는 문 — 닫혀 있는 동안 지나가려는 호출이 기다린다 */
function gate() {
  let waiters: (() => void)[] = [];
  let closed = false;
  return {
    close() {
      closed = true;
    },
    open() {
      closed = false;
      const run = waiters;
      waiters = [];
      run.forEach((go) => go());
    },
    pass: () => (closed ? new Promise<void>((resolve) => waiters.push(resolve)) : undefined),
  };
}

type Props = AutoWriteHandoffDeps;

function Harness(props: Props) {
  const day = useAutoWriteHandoff(props);
  return <Text testID="day">{day ?? "없음"}</Text>;
}

const handed = () => screen.getByTestId("day").props.children as string;

function setup(over: Partial<Props> = {}) {
  const written: string[] = [];
  const attemptPort = memoryPort();
  const props: Props = {
    settings: ON,
    previewDay: onlyYesterday,
    skipPort: memoryPort(),
    listDiaryDays: async () => written,
    attemptPort,
    now: () => NOW,
    ...over,
  };
  return { props, written, attemptPort };
}

/** 판정이 n번 끝났다 — 시도 기록이 n번 쓰였다(판정마다 한 번, HO8) */
async function decided(port: { write: jest.Mock }, n: number) {
  await waitFor(() => expect(port.write).toHaveBeenCalledTimes(n));
  await act(async () => {});
}

const lastOutcome = (port: { write: jest.Mock }) => {
  const calls = port.write.mock.calls;
  const items = (JSON.parse(calls[calls.length - 1]![0] as string) as { items: unknown[] }).items;
  return (items[0] as { outcome: string; path: string; at: string }) ?? null;
};

async function fireActive(spy: jest.SpyInstance) {
  const handlers = spy.mock.calls
    .filter(([event]) => event === "change")
    .map(([, fn]) => fn as (s: string) => void);
  await act(async () => {
    handlers[handlers.length - 1]?.("active");
  });
}

describe("HO1 — 통로가 없으면 판정하지 않는다", () => {
  it.each([
    ["설정", { settings: null }],
    ["미리보기 통로", { previewDay: undefined }],
    ["건너뜀 통로", { skipPort: undefined }],
  ])("%s이 없으면 판정하지 않고 없음이다", async (_name, over) => {
    const listDiaryDays = jest.fn(async () => []);
    const { props, attemptPort } = setup({ ...over, listDiaryDays });
    await render(<Harness {...props} />);
    await act(async () => {});
    expect(handed()).toBe("없음");
    expect(listDiaryDays).not.toHaveBeenCalled();
    expect(attemptPort.write).not.toHaveBeenCalled();
  });
});

describe("HO2·HO3 — 같은 판정으로, 마운트와 전경 복귀 때", () => {
  it("판정이 「쓴다」면 그 날을 준다", async () => {
    const { props, attemptPort } = setup();
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(handed()).toBe(YESTERDAY);
    expect(lastOutcome(attemptPort).outcome).toBe("write");
  });

  it("꺼져 있으면 없음이다", async () => {
    const { props, attemptPort } = setup({ settings: OFF });
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(handed()).toBe("없음");
    expect(lastOutcome(attemptPort).outcome).toBe("disabled");
  });

  it("앱이 앞으로 돌아오면 다시 판정한다 — active일 때만", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const listDiaryDays = jest.fn(async () => []);
    const { props, attemptPort } = setup({ listDiaryDays });
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);

    await fireActive(spy);
    await decided(attemptPort, 2);
    expect(listDiaryDays).toHaveBeenCalledTimes(2);

    const handlers = spy.mock.calls.filter(([e]) => e === "change").map(([, fn]) => fn);
    await act(async () => {
      (handlers[handlers.length - 1] as (s: string) => void)("background");
    });
    expect(listDiaryDays).toHaveBeenCalledTimes(2);
  });

  it("훅은 판정 규칙을 갖지 않는다 — resolveAutoWrite 하나만 부른다 (소스)", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src/app/use-auto-write-handoff.ts"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source.match(/resolveAutoWrite\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/decideSchedule|selectableDays|decideAutoWrite|currentState/);
  });
});

describe("HO6 — 살아 있지 않은 판정은 반영하지 않는다", () => {
  it("언마운트 뒤 끝난 판정은 던지지 않고, 기록은 남는다 (HO8)", async () => {
    const door = gate();
    door.close();
    const { props, attemptPort } = setup({
      listDiaryDays: async () => {
        await door.pass();
        return [];
      },
    });
    const view = await render(<Harness {...props} />);
    await view.unmount();
    await act(async () => door.open());
    await waitFor(() => expect(attemptPort.write).toHaveBeenCalledTimes(1));
    expect(lastOutcome(attemptPort).outcome).toBe("write");
  });

  it("★ 설정이 바뀐 뒤 늦게 끝난 옛 설정의 판정이 새 설정의 결과를 덮지 않는다", async () => {
    // 꺼짐 판정이 문에 막힌 사이 켜진다. 켬 판정이 먼저 끝나 날이 서고, 늦게 끝난 꺼짐 판정이 그것을 지우면 안 된다.
    const door = gate();
    let calls = 0;
    const { props, attemptPort } = setup({
      settings: OFF,
      listDiaryDays: async () => {
        calls += 1;
        if (calls === 1) await door.pass();
        return [];
      },
    });
    door.close();
    const view = await render(<Harness {...props} />);
    await view.rerender(<Harness {...props} settings={ON} />);
    await decided(attemptPort, 1);
    expect(handed()).toBe(YESTERDAY);

    await act(async () => door.open());
    await decided(attemptPort, 2);
    expect(handed()).toBe(YESTERDAY);
  });
});

describe("HO8·HO11 — 시도 기록", () => {
  it("판정마다 앱 열기 한 줄, 판정에 쓴 「지금」과 같은 시각이다", async () => {
    const { props, attemptPort } = setup();
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(lastOutcome(attemptPort)).toEqual({
      at: NOW.toISOString(),
      path: "app-open",
      outcome: "write",
    });
  });

  it("「지금」을 판정 한 번에 한 번만 읽는다", async () => {
    const now = jest.fn(() => NOW);
    const { props, attemptPort } = setup({ now });
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it("기록 통로가 없어도 판정은 반영된다", async () => {
    const { props } = setup({ attemptPort: undefined });
    await render(<Harness {...props} />);
    await waitFor(() => expect(handed()).toBe(YESTERDAY));
  });
});

describe("HO9 — 사진 권한 건너뜀을 알린다", () => {
  it("그 날로 onSkipped를 부르고 넘겨 두지 않는다", async () => {
    const onSkipped = jest.fn();
    const { props, attemptPort } = setup({ previewDay: async (day) => noAccess(day), onSkipped });
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(onSkipped).toHaveBeenCalledWith(YESTERDAY);
    expect(handed()).toBe("없음");
  });

  it("재료 없음은 알리지 않는다", async () => {
    const onSkipped = jest.fn();
    const { props, attemptPort } = setup({
      previewDay: async (day) => noMaterial(day),
      onSkipped,
    });
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(onSkipped).not.toHaveBeenCalled();
  });
});

describe("HO10 — 판정이 던져도 화면은 멀쩡하다", () => {
  it("일기 목록을 못 읽으면 없음이고 기록하지 않는다", async () => {
    const listDiaryDays = jest.fn(async () => {
      throw new Error("읽지 못함");
    });
    const { props, attemptPort } = setup({ listDiaryDays });
    await render(<Harness {...props} />);
    await waitFor(() => expect(listDiaryDays).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(handed()).toBe("없음");
    expect(attemptPort.write).not.toHaveBeenCalled();
  });
});

describe("HO12 — 받은 미리보기 통로를 그대로 쓴다", () => {
  it("판정이 고른 날로 한 번 부른다", async () => {
    const previewDay = jest.fn(onlyYesterday);
    const { props, attemptPort } = setup({ previewDay });
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(previewDay.mock.calls).toEqual([[YESTERDAY]]);
  });
});

/* ─────────────── 082 — 넘겨 둔 날은 지금 설정의 가장 최근 판정을 따른다 ─────────────── */

describe("HO4 — 「쓰지 않는다」 판정이 앞의 「쓴다」를 지운다", () => {
  it("★ 같은 설정에서 다시 판정해 재료 없음이면 없음이다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const { props, written, attemptPort } = setup();
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(handed()).toBe(YESTERDAY);

    // 어제가 써졌다 — 다음 후보인 그저께에는 재료가 없다.
    written.push(YESTERDAY);
    await fireActive(spy);
    await decided(attemptPort, 2);
    expect(lastOutcome(attemptPort).outcome).toBe("no-material");
    expect(handed()).toBe("없음");
  });

  it("★ 모두 써 있으면 없음이다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const { props, written, attemptPort } = setup();
    await render(<Harness {...props} />);
    await decided(attemptPort, 1);

    written.push(YESTERDAY, TWO_AGO, THREE_AGO);
    await fireActive(spy);
    await decided(attemptPort, 2);
    expect(lastOutcome(attemptPort).outcome).toBe("all-written");
    expect(handed()).toBe("없음");
  });
});

describe("HO5 — 옛 설정의 결과는 새 판정을 기다리지 않고 버려진다", () => {
  it("★ 끈 그 렌더부터 없음이다 — 꺼짐 판정이 끝나기 전에도, 끝난 뒤에도", async () => {
    const door = gate();
    const { props, attemptPort } = setup({
      listDiaryDays: async () => {
        await door.pass();
        return [];
      },
    });
    const view = await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(handed()).toBe(YESTERDAY);

    door.close();
    await view.rerender(<Harness {...props} settings={OFF} />);
    // 꺼짐 판정은 문에 막혀 있다 — 그래도 옛 설정의 날은 이미 없다.
    expect(attemptPort.write).toHaveBeenCalledTimes(1);
    expect(handed()).toBe("없음");

    await act(async () => door.open());
    await decided(attemptPort, 2);
    expect(lastOutcome(attemptPort).outcome).toBe("disabled");
    expect(handed()).toBe("없음");
  });

  it("★ 시각을 바꿔 어제가 아직 차례가 아니게 되면 없음이다 (US1-3)", async () => {
    const { props, attemptPort } = setup();
    const view = await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    expect(handed()).toBe(YESTERDAY);

    // 오전 11시 목표 — 지금(09:40)은 그 전이라 어제는 기다린다(078).
    await view.rerender(<Harness {...props} settings={{ enabled: true, targetHour: 11 }} />);
    expect(handed()).toBe("없음");
    await decided(attemptPort, 2);
    expect(handed()).toBe("없음");
  });

  it("다시 켜면 새 판정의 날이 선다", async () => {
    const { props, attemptPort } = setup();
    const view = await render(<Harness {...props} />);
    await decided(attemptPort, 1);
    await view.rerender(<Harness {...props} settings={OFF} />);
    await decided(attemptPort, 2);
    await view.rerender(<Harness {...props} settings={{ enabled: true, targetHour: 22 }} />);
    await decided(attemptPort, 3);
    expect(handed()).toBe(YESTERDAY);
  });
});

describe("HO7 — 겹친 판정은 늦게 시작한 것만 반영한다", () => {
  it("★ 먼저 시작한 「쓴다」가 늦게 끝나도 나중 판정의 「모두 써 있음」을 덮지 않는다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const door = gate();
    let calls = 0;
    const written: string[] = [];
    const { props, attemptPort } = setup({
      listDiaryDays: async () => {
        calls += 1;
        // 첫째 판정은 어제가 안 쓴 날일 때의 목록을 들고 문 앞에서 기다린다.
        if (calls === 1) {
          const seen = [...written];
          await door.pass();
          return seen;
        }
        return written;
      },
    });
    door.close();
    await render(<Harness {...props} />);

    written.push(YESTERDAY, TWO_AGO, THREE_AGO);
    await fireActive(spy);
    await decided(attemptPort, 1);
    expect(lastOutcome(attemptPort).outcome).toBe("all-written");
    expect(handed()).toBe("없음");

    await act(async () => door.open());
    await decided(attemptPort, 2);
    // 첫째의 결과(「쓴다」)는 기록에는 남고(HO8) 넘겨 둔 날에는 반영되지 않는다.
    expect(lastOutcome(attemptPort).outcome).toBe("write");
    expect(handed()).toBe("없음");
  });
});
