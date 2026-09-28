/**
 * 일기 홈 — 자정 전환, 미리 준비의 범위, 신호 미리보기 (049·048).
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md HS2·HS3
 *       specs/048-diary-home-modernist/contracts/home-screen.md G7·G8, N6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **049 — 정오 전환이 사라지고 자정 전환이 생겼다.** 기기 시각을 바꿀 수 없어 실기기로는 그
 * 시각에 기기 앞에 있어야 한다 — 가짜 타이머와 주입된 `now`로 같은 갈래를 결정적으로 돌린다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { DayPreview } from "../../src/app/state";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

const resolveQuiet =
  (hasPhotos = false) =>
  (day: string): ResolveOutcome => ({
    kind: "resolved",
    params: { character: "quiet", day: day as never, hasPhotos, geocodingEnabled: false },
  });

function neverPipeline(): Pipeline & { calls: number } {
  const self = {
    calls: 0,
    run: () => {
      self.calls += 1;
      return new Promise<PipelineResult>(() => {});
    },
  };
  return self;
}

/** 옮길 수 있는 시계 */
function clock(iso: string) {
  let current = new Date(iso);
  return {
    now: () => current,
    set: (next: string) => {
      current = new Date(next);
    },
  };
}

describe("049 HS — 자정 전환과 미리 준비의 범위", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function renderAt(c: ReturnType<typeof clock>, extra: Record<string, unknown> = {}) {
    await render(
      <DiaryHomeScreen
        now={c.now}
        pipeline={neverPipeline()}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
        {...extra}
      />,
    );
    await screen.findByTestId("day-strip");
  }

  it("★ 정오 전 오늘이 골라져 있고 쓰기 버튼이 있다 (049 FR-010a·FR-018b)", async () => {
    await renderAt(clock("2026-09-24T09:00:00"));

    expect(screen.getByTestId("home-day-number")).toHaveTextContent("24");
    expect(screen.getByTestId("write-button")).toBeTruthy();
    expect(screen.queryByTestId("write-unavailable")).toBeNull();
  });

  it("★ HS2 — 켜 둔 채 자정이 지나면 고른 날은 그대로, 밑줄만 새 오늘로 (FR-019)", async () => {
    const c = clock("2026-09-25T23:59:30");
    await renderAt(c);
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("25");
    expect(screen.getByTestId("day-today-2026-09-25")).toBeTruthy();

    c.set("2026-09-26T00:00:01");
    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });

    expect(screen.getByTestId("home-day-number")).toHaveTextContent("25");
    expect(screen.getByTestId("day-today-2026-09-26")).toBeTruthy();
    expect(screen.queryByTestId("day-today-2025-09-25")).toBeNull();
    expect(screen.queryByTestId("day-today-2026-09-25")).toBeNull();
  });

  it("HS2 — 토요일 밤을 넘기면 새 오늘은 다음 주 — 선택은 그대로(보던 주가 남는다)", async () => {
    const c = clock("2026-09-26T23:59:30");
    await renderAt(c);
    c.set("2026-09-27T00:00:01");
    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });

    expect(screen.getByTestId("home-day-number")).toHaveTextContent("26");
    expect(screen.getByTestId("day-2026-09-20")).toBeTruthy();
    // 새 오늘(27일)은 이 주에 없다 — 밑줄이 보이지 않는다.
    expect(screen.queryByTestId(/^day-today-/)).toBeNull();
  });

  it("앱으로 돌아오면(active) 곧바로 다시 판정한다 — 잠든 사이 자정이 지났어도", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");

    const c = clock("2026-09-25T23:00:00");
    await renderAt(c);
    c.set("2026-09-26T07:00:00");
    const handlers = spy.mock.calls
      .filter(([event]) => event === "change")
      .map(([, fn]) => fn as (s: string) => void);
    await act(async () => {
      for (const fn of handlers) fn("active");
    });

    expect(screen.getByTestId("day-today-2026-09-26")).toBeTruthy();
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("25");
    // 복원하지 않는다 — jest-expo의 AppState 목은 복원하면 구독 반환값을 잃는다(diary-home.test와 같다).
  });

  it("★ HS3 — 사흘 밖의 날(canPrepare 거짓)에서는 미리 준비하지 않고 놓아준다 (FR-020a)", async () => {
    const prepare = jest.fn(async () => {});
    const release = jest.fn(async () => {});
    const captionDay = jest.fn(async () => ({ kind: "no-photos" as const }));
    const c = clock("2026-09-24T09:00:00");
    const canPrepare = (day: string) => day >= "2026-09-22";

    await renderAt(c, { prepare, release, canPrepare });
    await waitFor(() => expect(prepare).toHaveBeenCalledWith("quiet"));

    // 사흘 밖의 날로 옮긴다 — 준비해 둔 것을 놓아주고 다시 준비하지 않는다.
    prepare.mockClear();
    await fireEvent.press(screen.getByTestId("day-2026-09-20"));
    await waitFor(() => expect(release).toHaveBeenCalled());
    expect(prepare).not.toHaveBeenCalled();

    // 사진이 있다고 판정되는 경로에서도 사진을 미리 읽지 않는다.
    await render(
      <DiaryHomeScreen
        canPrepare={canPrepare}
        captionDay={captionDay as never}
        chosenDay="2026-09-20"
        now={c.now}
        onChooseDay={() => {}}
        pipeline={neverPipeline()}
        resolution={resolved}
        resolve={resolveQuiet(true)}
        store={memoryStore()}
      />,
    );
    await screen.findByTestId("day-strip");
    expect(captionDay).not.toHaveBeenCalled();
  });

  it("HS3 — canPrepare가 참인 날에서는 기존대로 준비가 시작된다", async () => {
    const prepare = jest.fn(async () => {});
    await renderAt(clock("2026-09-24T09:00:00"), { prepare, canPrepare: () => true });
    await waitFor(() => expect(prepare).toHaveBeenCalledWith("quiet"));
  });
});

describe("048 G7·G8 — 신호 미리보기", () => {
  it("★ G7 — 늦게 도착한 이전 날의 결과는 버린다", async () => {
    const pending: Record<string, (p: DayPreview) => void> = {};
    const previewDay = jest.fn(
      (day: string) =>
        new Promise<DayPreview>((resolve) => {
          pending[day] = resolve;
        }),
    );

    await render(
      <DiaryHomeScreen
        now={() => new Date("2026-09-24T13:00:00")}
        pipeline={neverPipeline()}
        previewDay={previewDay}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
      />,
    );
    await screen.findByTestId("day-strip");
    await waitFor(() => expect(previewDay).toHaveBeenCalledWith("2026-09-24"));
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("…");

    // 다른 날로 바꾼다 — 그 날의 결과가 먼저 온다.
    await fireEvent.press(screen.getByTestId("day-2026-09-22"));
    await waitFor(() => expect(previewDay).toHaveBeenCalledWith("2026-09-22"));
    await act(async () => {
      pending["2026-09-22"]({
        day: "2026-09-22",
        photos: { kind: "known", count: 2 },
        places: { kind: "none" },
      });
    });
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("2");

    // 앞 날(24일)의 결과가 늦게 온다 — 덮이지 않는다.
    await act(async () => {
      pending["2026-09-24"]({
        day: "2026-09-24",
        photos: { kind: "known", count: 9 },
        places: { kind: "known", count: 4 },
      });
    });
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("2");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("없음");
  });

  it("G8 — 읽기가 실패하면 두 칸 모두 「모름」", async () => {
    const previewDay = jest.fn(async () => {
      throw new Error("권한 없음");
    });

    await render(
      <DiaryHomeScreen
        now={() => new Date("2026-09-24T13:00:00")}
        pipeline={neverPipeline()}
        previewDay={previewDay}
        resolution={resolved}
        resolve={resolveQuiet()}
        store={memoryStore()}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("signal-photos")).toHaveTextContent("모름"));
    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
  });
});

describe("048 N6 — 고른 날을 밖에서 들고 있으면 다시 마운트해도 남는다 (Q4)", () => {
  it("chosenDay를 주면 그 날이 골라져 있고, 고르면 onChooseDay로 알린다", async () => {
    const onChooseDay = jest.fn();
    const props = {
      now: () => new Date("2026-09-24T13:00:00"),
      pipeline: neverPipeline(),
      resolution: resolved,
      resolve: resolveQuiet(),
      store: memoryStore(),
      onChooseDay,
    };

    const first = await render(<DiaryHomeScreen {...props} chosenDay="2026-09-22" />);
    await screen.findByTestId("day-strip");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("22");

    await fireEvent.press(screen.getByTestId("day-2026-09-23"));
    expect(onChooseDay).toHaveBeenCalledWith("2026-09-23");

    // 설정에 다녀온 것처럼 언마운트했다 다시 그린다 — 부모가 들고 있던 값이 그대로 온다.
    await first.unmount();
    await render(<DiaryHomeScreen {...props} chosenDay="2026-09-23" />);
    await screen.findByTestId("day-strip");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("23");
  });
});
