/**
 * 일기 홈 — 아직 쓸 수 없는 오늘, 전환, 신호 미리보기 (048).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md T1~T5, G7·G8, N6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **012가 「실기기 미확인」으로 남긴 정오 경계 전환을 기기 없이 닫는 자리다.** 기기 시각을
 * 바꿀 수 없어 실기기로는 실제 정오 전후 세션이 필요하다 — 가짜 타이머와 주입된 `now`로
 * 같은 갈래를 결정적으로 돌린다.
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

describe("048 T — 아직 쓸 수 없는 오늘과 전환", () => {
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

  it("T1 — 정오 전 오늘을 고르면 쓰기 버튼 대신 안내가 보인다", async () => {
    const c = clock("2026-09-24T11:59:00");
    await renderAt(c);

    await fireEvent.press(screen.getByTestId("day-2026-09-24"));
    expect(screen.queryByTestId("write-button")).toBeNull();
    expect(screen.getByTestId("write-unavailable")).toHaveTextContent(
      "오늘 일기는 오후 12시부터 쓸 수 있어요",
    );
  });

  it("★ T2 — 그 화면에 머문 채 정오가 되면 조작 없이 쓰기 버튼이 나타난다", async () => {
    const c = clock("2026-09-24T11:59:00");
    await renderAt(c);
    await fireEvent.press(screen.getByTestId("day-2026-09-24"));
    expect(screen.queryByTestId("write-button")).toBeNull();

    c.set("2026-09-24T12:00:01");
    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    expect(screen.getByTestId("write-button")).toBeTruthy();
    expect(screen.getByTestId("signal-window")).toHaveTextContent("지금");
  });

  it("T3 — 다른 날로 바꾸면 걸린 타이머가 지워진다", async () => {
    const c = clock("2026-09-24T11:00:00");
    await renderAt(c);

    const set = jest.spyOn(global, "setTimeout");
    const clear = jest.spyOn(global, "clearTimeout");
    await fireEvent.press(screen.getByTestId("day-2026-09-24"));
    // 정오(+1초 여유)까지 남은 시간으로 한 번 걸렸다.
    const armed = set.mock.calls.filter(([, ms]) => ms === 60 * 60 * 1000 + 1000);
    expect(armed).toHaveLength(1);

    const clearsBefore = clear.mock.calls.length;
    await fireEvent.press(screen.getByTestId("day-2026-09-23"));
    expect(clear.mock.calls.length).toBeGreaterThan(clearsBefore);

    // 지워졌으므로 정오가 지나도 쓸 수 없는 날이 아닌 그 날(23일) 화면이 그대로다.
    set.mockRestore();
    clear.mockRestore();
  });

  it("T4 — 앱으로 돌아오면(active) 곧바로 다시 판정한다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");

    const c = clock("2026-09-24T11:00:00");
    await renderAt(c);
    await fireEvent.press(screen.getByTestId("day-2026-09-24"));
    expect(screen.queryByTestId("write-button")).toBeNull();

    // 잠든 사이 정오가 지났다 — 타이머는 아직 안 울렸다.
    c.set("2026-09-24T12:30:00");
    const handlers = spy.mock.calls
      .filter(([event]) => event === "change")
      .map(([, fn]) => fn as (s: string) => void);
    await act(async () => {
      for (const fn of handlers) fn("active");
    });

    expect(screen.getByTestId("write-button")).toBeTruthy();
    // 복원하지 않는다 — jest-expo의 AppState 목은 복원하면 구독 반환값을 잃는다(diary-home.test와 같다).
  });

  it("★ T5 — 쓸 수 없는 날에는 미리 준비(prepare·captionDay)를 시작하지 않는다", async () => {
    const prepare = jest.fn(async () => {});
    const c = clock("2026-09-24T10:00:00");
    await renderAt(c, { prepare, chosenDay: "2026-09-24", onChooseDay: () => {} });

    expect(prepare).not.toHaveBeenCalled();

    const captionDay = jest.fn(async () => ({ kind: "no-photos" as const }));
    await render(
      <DiaryHomeScreen
        captionDay={captionDay as never}
        chosenDay="2026-09-24"
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

  it("T5 — 쓸 수 있는 날로 바꾸면 기존대로 준비가 시작된다", async () => {
    const prepare = jest.fn(async () => {});
    const c = clock("2026-09-24T10:00:00");
    await renderAt(c, { prepare });

    // 기본 선택은 어제(쓸 수 있음) — 준비가 시작된다.
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
