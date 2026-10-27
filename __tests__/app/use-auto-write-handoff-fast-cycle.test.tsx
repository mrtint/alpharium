import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import type { DayPreview } from "../../src/app/state";
import {
  useAutoWriteHandoff,
  type AutoWriteHandoffDeps,
} from "../../src/app/use-auto-write-handoff";
import type { AutoDiarySettings } from "../../src/schedule/settings";
import { fastCycleTiming } from "../../src/schedule/timing";

/**
 * 106 — 앱 열기 판정 훅의 빠른 주기 (contracts/cycle-reset.md CR8·CR9).
 *
 * 훅은 저장소·포트·환경을 모른다 — 조립부가 준 `resetFastCycle(now)`·`loadTiming(settings, now)`·`onCycleReset()` 셋만 부른다.
 * 리셋은 판정 직전이다. 판정은 진짜(`resolveAutoWrite`)다.
 */

/** 30분 주기 순번 20(10:00~10:30)의 창 안 */
const NOW = new Date(2026, 8, 28, 10, 5);
const TODAY = "2026-09-28";

const ON: AutoDiarySettings = { enabled: true, targetHour: 22 };
const OFF: AutoDiarySettings = { enabled: false, targetHour: 22 };

const withPhotos = (day: string): DayPreview => ({
  day,
  photos: { kind: "known", count: 3 },
  places: { kind: "unknown" },
  photoAccess: "ok",
});

function memoryPort() {
  let stored: string | null = null;
  return {
    read: jest.fn(async () => stored),
    write: jest.fn(async (s: string) => {
      stored = s;
    }),
    remove: jest.fn(async () => {
      stored = null;
    }),
  };
}

function Harness(props: AutoWriteHandoffDeps) {
  const day = useAutoWriteHandoff(props);
  return <Text testID="day">{day ?? "없음"}</Text>;
}
const handed = () => screen.getByTestId("day").props.children as string;

function setup(over: Partial<AutoWriteHandoffDeps> = {}) {
  const log: string[] = [];
  const props: AutoWriteHandoffDeps = {
    settings: ON,
    previewDay: async (day) => withPhotos(day),
    skipPort: memoryPort(),
    listDiaryDays: async () => {
      log.push("listDiaryDays");
      return [];
    },
    now: () => NOW,
    ...over,
  };
  return { props, log };
}

describe("CR8 — 판정 직전에 리셋하고, 리셋했으면 onCycleReset", () => {
  it("리셋 → 시간 규칙 읽기 → 일기 목록 읽기 순서이고, 빠른 주기 창 안이면 오늘을 넘긴다", async () => {
    const { props, log } = setup();
    const resetFastCycle = jest.fn(async () => {
      log.push("reset");
      return { reset: true };
    });
    const loadTiming = jest.fn(async () => {
      log.push("timing");
      return fastCycleTiming(30);
    });
    const onCycleReset = jest.fn();
    await render(
      <Harness
        {...props}
        resetFastCycle={resetFastCycle}
        loadTiming={loadTiming}
        onCycleReset={onCycleReset}
      />,
    );
    await waitFor(() => expect(handed()).toBe(TODAY));
    expect(log.slice(0, 3)).toEqual(["reset", "timing", "listDiaryDays"]);
    expect(onCycleReset).toHaveBeenCalledTimes(1);
  });

  it("리셋이 {reset:false}면(배포의 클로저가 그렇게 돌려준다) onCycleReset을 부르지 않는다", async () => {
    const { props } = setup();
    const onCycleReset = jest.fn();
    await render(
      <Harness
        {...props}
        resetFastCycle={async () => ({ reset: false })}
        loadTiming={async () => fastCycleTiming(30)}
        onCycleReset={onCycleReset}
      />,
    );
    await waitFor(() => expect(handed()).toBe(TODAY));
    expect(onCycleReset).not.toHaveBeenCalled();
  });

  it("자동 쓰기가 꺼져 있으면 리셋하지 않는다", async () => {
    const { props } = setup({ settings: OFF });
    const resetFastCycle = jest.fn(async () => ({ reset: true }));
    await render(<Harness {...props} resetFastCycle={resetFastCycle} />);
    await waitFor(() => expect(props.skipPort).toBeDefined());
    // 판정이 한 번 돈 뒤에도 부르지 않았다
    await waitFor(() => expect(handed()).toBe("없음"));
    expect(resetFastCycle).not.toHaveBeenCalled();
  });

  it("리셋이 던져도 판정은 이어진다 (CR7 — 리셋 실패가 쓰기를 막지 않는다)", async () => {
    const { props } = setup();
    await render(
      <Harness
        {...props}
        resetFastCycle={async () => {
          throw new Error("io");
        }}
        loadTiming={async () => fastCycleTiming(30)}
      />,
    );
    await waitFor(() => expect(handed()).toBe(TODAY));
  });

  it("시간 규칙 읽기가 던지면 배포 규칙으로 판정한다", async () => {
    // 배포 규칙(목표 22시): 10:05는 창 밖이고 오전이라 오늘은 후보가 아니다 → 어제(차례 지난 날)가 넘어간다
    const { props } = setup();
    await render(
      <Harness
        {...props}
        resetFastCycle={async () => ({ reset: false })}
        loadTiming={async () => {
          throw new Error("io");
        }}
      />,
    );
    await waitFor(() => expect(handed()).not.toBe("없음"));
    expect(handed()).not.toBe(TODAY);
  });

  it("주입이 없으면 종전과 같다 — 배포 규칙", async () => {
    const { props } = setup();
    await render(<Harness {...props} />);
    await waitFor(() => expect(handed()).not.toBe("없음"));
    expect(handed()).not.toBe(TODAY);
  });
});
