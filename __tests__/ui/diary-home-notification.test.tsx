import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";

/**
 * 일기 홈 화면 — 알림을 눌러 열렸을 때 (020 → 051).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md NR1~NR4
 *       specs/020-scheduled-diary-notification/contracts/notification.md N6 (이력)
 *
 * **051 — 상세 화면이 사라졌다.** 020은 `initialDay`가 오면 첫 화면을 그 하루의 상세로 만들었다.
 * 이제 그 하루가 **홈의 고른 날**이 되고, 제목·지면이 홈에 보인다(FR-027). 「적용했다」
 * (`onInitialDayApplied`)와 「확인했다」(`onAcknowledge` — 읽을 수 있는 일기가 실제로 보였을 때만,
 * FR-028)를 가른다(research R6).
 */

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T16:00:00");
const DAY = "2026-09-27"; // 스트립(9/27~10/3)에 보이는 지난 날
const OTHER = "2026-09-29";

const signals: DaySignals = {
  date: DAY,
  photos: { kind: "unknown", reason: "권한이 없다" },
  places: { kind: "unknown", reason: "위치 권한이 없다" },
  steps: { kind: "unknown", reason: "안드로이드가 기간 걸음 수를 주지 않는다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
};

const entryFor = (day: string): DiaryEntry => ({
  date: day,
  text: "조용한 하루였다.",
  title: "조용한 하루",
  character: "quiet",
  signalsUsed: { ...signals, date: day },
  createdAt: new Date(`${day}T15:00:00`),
});

const resolveStub = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

function home(
  store: DiaryStore,
  opts: {
    initialDay?: string | null;
    onAcknowledge?: (day: string) => void;
    onInitialDayApplied?: () => void;
  },
) {
  return (
    <DiaryHomeScreen
      initialDay={opts.initialDay ?? null}
      now={() => NOW}
      onAcknowledge={opts.onAcknowledge}
      onInitialDayApplied={opts.onInitialDayApplied}
      pipeline={undefined}
      resolution={resolved}
      resolve={resolveStub}
      store={store}
    />
  );
}

describe("051 NR — 알림의 날은 홈의 고른 날이다", () => {
  it("★ NR1 — 쓴 날로 열리면 그 날이 골라지고 제목·지면이 보인다, 적용·확인 각 1회", async () => {
    const store = memoryStore();
    await store.save(entryFor(DAY));
    const onAcknowledge = jest.fn();
    const onInitialDayApplied = jest.fn();
    await render(home(store, { initialDay: DAY, onAcknowledge, onInitialDayApplied }));

    expect(await screen.findByTestId("home-day-title")).toHaveTextContent("조용한 하루");
    expect(screen.getByTestId("written-body")).toHaveTextContent("조용한 하루였다.");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("27");
    expect(screen.queryByText("← 목록")).toBeNull();
    await waitFor(() => expect(onAcknowledge).toHaveBeenCalledTimes(1));
    expect(onAcknowledge).toHaveBeenCalledWith(DAY);
    expect(onInitialDayApplied).toHaveBeenCalledTimes(1);
  });

  it("★ NR2 — 그 날의 일기가 없으면 그 날을 고르되 확인하지 않는다", async () => {
    const onAcknowledge = jest.fn();
    const onInitialDayApplied = jest.fn();
    await render(home(memoryStore(), { initialDay: DAY, onAcknowledge, onInitialDayApplied }));

    await waitFor(() => expect(screen.getByTestId("home-day-number")).toHaveTextContent("27"));
    expect(screen.getByTestId("home-day-state")).toHaveTextContent("이 날 일기를 쓸 수 있어요");
    expect(onInitialDayApplied).toHaveBeenCalledTimes(1);
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it("NR2 — 그 날의 일기를 읽을 수 없으면 확인하지 않는다", async () => {
    const base = memoryStore();
    await base.save(entryFor(DAY));
    const store: DiaryStore = { ...base, load: async () => null };
    const onAcknowledge = jest.fn();
    await render(home(store, { initialDay: DAY, onAcknowledge }));

    await screen.findByTestId("written-unreadable");
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it("NR3 — 앱이 켜진 채 다른 날의 알림이 오면(웜) 고른 날이 바뀐다", async () => {
    const store = memoryStore();
    await store.save(entryFor(DAY));
    const { rerender } = await render(home(store, { initialDay: null }));
    await waitFor(() => expect(screen.getByTestId("home-day-number")).toHaveTextContent("28"));

    await rerender(home(store, { initialDay: DAY }));
    expect(await screen.findByTestId("home-day-title")).toHaveTextContent("조용한 하루");
    expect(screen.getByTestId("home-day-number")).toHaveTextContent("27");
  });

  it("★ NR4 — 스스로 고른 쓴 날도 한 번 확인한다 — 같은 날을 다시 그려도 더 부르지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor(DAY));
    const onAcknowledge = jest.fn();
    const { rerender } = await render(home(store, { onAcknowledge }));
    await screen.findByTestId("signal-row");
    expect(onAcknowledge).not.toHaveBeenCalled();

    await userEvent.press(screen.getByTestId(`day-${DAY}`));
    await screen.findByTestId("written-body");
    await waitFor(() => expect(onAcknowledge).toHaveBeenCalledWith(DAY));

    await rerender(home(store, { onAcknowledge }));
    await screen.findByTestId("written-body");
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it("initialDay가 없으면 오늘을 고르고 적용·확인을 부르지 않는다 (회귀 없음)", async () => {
    const onAcknowledge = jest.fn();
    const onInitialDayApplied = jest.fn();
    await render(home(memoryStore(), { onAcknowledge, onInitialDayApplied }));

    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
    expect(onInitialDayApplied).not.toHaveBeenCalled();
    expect(onAcknowledge).not.toHaveBeenCalled();
    expect(screen.queryByTestId(`day-${OTHER}`)).toBeTruthy();
  });
});
