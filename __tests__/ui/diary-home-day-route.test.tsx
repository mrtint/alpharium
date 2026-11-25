/**
 * 125 — 홈이 쓴 날 지면에 「하루 동선」을 붙인다 (`routeDay`).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DF2~DF5, spec FR-006·FR-009·FR-015
 *
 * ─────────────────────────────────────────────
 * 날짜 기준: 지금 = 2026-09-28(월) 16:15. 스트립은 9/22~9/28이다. 쓴 날은 9/27(일)·9/26(토).
 *
 * `routeDay`는 **쓴 날 + 저장된 자리 1곳 이상**일 때만 부른다(126 DM14 — 125는 2곳 이상이었다). 읽는 동안에는 저장된 목록이 먼저 보이고(DF4) 지면이
 * 막히지 않는다. 늦게 도착한 이전 날의 결과는 버린다(DF3). 캐시가 없다 — 날을 다시 열면 다시 읽는다(FR-015).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — 반드시 await한다.
 * ⚠️ jest-expo의 `AppState.addEventListener` 스파이는 `mockRestore`하지 않는다(diary-home.test와 같다).
 * ─────────────────────────────────────────────
 */

import { act, screen, userEvent } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import type { DayRoute } from "../../src/app/day-route";
import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { SavedPlace } from "../../src/diary/place-lines";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";
import { reachPaperEnd } from "./paper-end";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T16:15:00");
const SUN = "2026-09-27";
const SAT = "2026-09-26";

const signals = (day: string): DaySignals => ({
  date: day,
  photos: {
    kind: "known",
    value: { photos: [{ id: "p0", takenAt: new Date(`${day}T10:00:00`) }], complete: true },
  },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "-" },
  battery: { kind: "unknown", reason: "-" },
  connectivity: { kind: "unknown", reason: "-" },
});

const place = (label: string, hour: number): SavedPlace => ({
  label,
  category: null,
  firstSeenAt: new Date(`2026-09-27T${String(hour).padStart(2, "0")}:00:00`).toISOString(),
  lastSeenAt: new Date(`2026-09-27T${String(hour).padStart(2, "0")}:30:00`).toISOString(),
  photoCount: 1,
});

const entryFor = (day: string, over: Partial<DiaryEntry> = {}): DiaryEntry => ({
  date: day,
  title: "비 온 뒤 산책",
  text: "첫 문단이다.\n\n둘째 문단이다.",
  character: "quiet",
  signalsUsed: signals(day),
  createdAt: new Date(`${day}T14:00:00`),
  ...over,
});

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, placeNamesEnabled: false },
});

/** 도식 모델 — 저장된 이름 대신 읽은 결과임을 알아보게 표식을 붙인 이름을 쓴다 */
const diagramOf = (names: string[]): DayRoute => ({
  items: names.map((label, i) => ({
    n: i + 1,
    period: "morning" as const,
    photos: 1,
    label,
    x: 0.2 + i * 0.3,
    y: 0.5,
  })),
  more: 0,
  diagram: true,
});

const SAVED_SUN = [place("일요일-가", 9), place("일요일-나", 13)];

beforeEach(() => {
  jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation(
      () => ({ remove: () => {} }) as ReturnType<typeof BackHandler.addEventListener>,
    );
});

type RouteDay = NonNullable<React.ComponentProps<typeof DiaryHomeScreen>["routeDay"]>;

async function renderHome(store: DiaryStore, routeDay: RouteDay | undefined, pipeline?: Pipeline) {
  await renderWithPortal(
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      routeDay={routeDay}
      store={store}
    />,
  );
}

const selectDay = async (day: string) => userEvent.press(await screen.findByTestId(`day-${day}`));

/** 풀 수 있는 약속 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("DF2·US1 — 쓴 날 + 저장된 자리 2곳 이상이면 읽어 도식을 붙인다", () => {
  it("routeDay를 (그 날, 저장된 자리)로 한 번 부르고 결과의 도식을 보인다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    const routeDay = jest.fn<ReturnType<RouteDay>, Parameters<RouteDay>>(async () =>
      diagramOf(["읽은-가", "읽은-나"]),
    );
    await renderHome(store, routeDay);
    await selectDay(SUN);

    expect(await screen.findByTestId("day-route-diagram")).toBeTruthy();
    expect(routeDay).toHaveBeenCalledTimes(1);
    expect(routeDay.mock.calls[0]![0]).toBe(SUN);
    expect(routeDay.mock.calls[0]![1]).toEqual(SAVED_SUN);
    expect(screen.getByText(/^읽은-가( |$)/)).toBeTruthy();
  });

  it("안 쓴 날(오늘)에는 부르지 않고 칸이 없다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    const routeDay = jest.fn<ReturnType<RouteDay>, Parameters<RouteDay>>(async () => null);
    await renderHome(store, routeDay);
    await screen.findByTestId("signal-row");

    expect(routeDay).not.toHaveBeenCalled();
    expect(screen.queryByTestId("day-route")).toBeNull();
  });

  it("entry.places가 없는 일기(121 이전)는 칸이 없고 부르지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN));
    const routeDay = jest.fn<ReturnType<RouteDay>, Parameters<RouteDay>>(async () => null);
    await renderHome(store, routeDay);
    await selectDay(SUN);
    await screen.findByTestId("written-body");

    expect(routeDay).not.toHaveBeenCalled();
    expect(screen.queryByTestId("day-route")).toBeNull();
  });

  it("126 DM14 — 자리 1곳도 routeDay를 부르고 먼저 저장된 한 줄이 보인다(좌표 없는 옛 일기는 못 읽으면 한 줄로 남는다)", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: [place("집 근처", 21)] }));
    const routeDay = jest.fn<ReturnType<RouteDay>, Parameters<RouteDay>>(async () => null);
    await renderHome(store, routeDay);
    await selectDay(SUN);

    expect(await screen.findByText(/^집 근처( |$)/)).toBeTruthy();
    expect(routeDay).toHaveBeenCalledTimes(1);
    expect(routeDay.mock.calls[0]![1]).toHaveLength(1);
    expect(screen.queryByTestId("day-route-diagram")).toBeNull();
  });

  it("126 — 좌표가 저장된 새 일기는 routeDay를 기다리지 않고 도식이 먼저 보인다", async () => {
    const store = memoryStore();
    await store.save(
      entryFor(SUN, { places: [{ ...place("집 근처", 21), latE5: 3_750_000, lonE5: 12_700_000 }] }),
    );
    const pending = deferred<DayRoute | null>();
    const routeDay: RouteDay = jest.fn(() => pending.promise);
    await renderHome(store, routeDay);
    await selectDay(SUN);

    expect(await screen.findByTestId("day-route-diagram")).toBeTruthy();
  });

  it("routeDay가 없으면(통로 없음) 저장된 목록만 보인다 — 도식을 지어내지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    await renderHome(store, undefined);
    await selectDay(SUN);

    expect(await screen.findByText(/^일요일-가( |$)/)).toBeTruthy();
    expect(screen.queryByTestId("day-route-diagram")).toBeNull();
  });
});

describe("DF4 — 읽는 동안 지면은 막히지 않고 저장된 목록이 먼저 보인다", () => {
  it("대기 중에는 목록(도식 없음), 풀리면 도식으로 바뀐다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    const pending = deferred<DayRoute | null>();
    const routeDay: RouteDay = jest.fn(() => pending.promise);
    await renderHome(store, routeDay);
    await selectDay(SUN);

    // 본문과 저장된 이름이 이미 보이고 지면이 막히지 않았다
    expect(await screen.findByTestId("written-body")).toHaveTextContent(/첫 문단이다\./);
    expect(await screen.findByText(/^일요일-가( |$)/)).toBeTruthy();
    expect(screen.queryByTestId("day-route-diagram")).toBeNull();

    await userEvent.press(await screen.findByTestId(`day-${SAT}`)); // 지면이 반응한다
    await userEvent.press(await screen.findByTestId(`day-${SUN}`));
    pending.resolve(diagramOf(["읽은-가", "읽은-나"]));
    expect(await screen.findByTestId("day-route-diagram")).toBeTruthy();
  });
});

describe("DF5 — routeDay가 던져도 저장된 목록으로 남는다", () => {
  it("거부(reject)되면 도식 없이 목록, 화면은 멀쩡하다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    const routeDay: RouteDay = jest.fn(async () => {
      throw new Error("사진 서비스 막힘");
    });
    await renderHome(store, routeDay);
    await selectDay(SUN);

    expect(await screen.findByText(/^일요일-가( |$)/)).toBeTruthy();
    expect(screen.getByTestId("written-body")).toHaveTextContent(/첫 문단이다\./);
    expect(screen.queryByTestId("day-route-diagram")).toBeNull();
  });

  it("null을 돌려줘도(칸 판정 없음) 저장된 목록으로 남는다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    const routeDay: RouteDay = jest.fn(async () => null);
    await renderHome(store, routeDay);
    await selectDay(SUN);

    expect(await screen.findByText(/^일요일-가( |$)/)).toBeTruthy();
    expect(screen.queryByTestId("day-route-diagram")).toBeNull();
  });
});

describe("DF3·FR-015 — 늦은 결과는 버리고 캐시가 없다", () => {
  const SAVED_SAT = [place("토요일-가", 8), place("토요일-나", 12)];

  it("★ 일요일 읽기가 늦게 도착해도 토요일 지면에 그려지지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    await store.save(entryFor(SAT, { places: SAVED_SAT }));
    const sunPending = deferred<DayRoute | null>();
    const routeDay: RouteDay = jest.fn((day) =>
      day === SUN
        ? sunPending.promise
        : Promise.resolve(diagramOf(["토요일-읽음-가", "토요일-읽음-나"])),
    );
    await renderHome(store, routeDay);

    await selectDay(SUN); // 일요일 읽기가 멈춘다
    await screen.findByTestId("written-body");
    await userEvent.press(await screen.findByTestId(`day-${SAT}`));
    expect(await screen.findByText(/토요일-읽음-가/)).toBeTruthy();

    // 늦은 응답이 도착하고 상태 갱신이 반영될 때까지 흘려보낸 뒤 본다 — `act` 없이 바로 보면 반영 전이라 시험이 비어 버린다
    await act(async () => {
      sunPending.resolve(diagramOf(["일요일-늦은-가", "일요일-늦은-나"]));
    });
    expect(screen.queryByText(/일요일-늦은/)).toBeNull();
    expect(screen.getByText(/토요일-읽음-가/)).toBeTruthy();
  });

  it("★ 126 FR-009 — 일요일의 늦은 응답에 지도가 붙어 있어도 토요일 지면에는 지도가 그려지지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    await store.save(entryFor(SAT, { places: SAVED_SAT }));
    const sunPending = deferred<DayRoute | null>();
    const routeDay: RouteDay = jest.fn((day) =>
      day === SUN
        ? sunPending.promise
        : Promise.resolve(diagramOf(["토요일-읽음-가", "토요일-읽음-나"])),
    );
    await renderHome(store, routeDay);

    await selectDay(SUN);
    await screen.findByTestId("written-body");
    await userEvent.press(await screen.findByTestId(`day-${SAT}`));
    expect(await screen.findByText(/토요일-읽음-가/)).toBeTruthy();

    await act(async () => {
      sunPending.resolve({
        ...diagramOf(["일요일-늦은-가", "일요일-늦은-나"]),
        map: {
          box: { w: 1000, h: 620 },
          water: "",
          park: "",
          rail: "",
          river: "",
          roadMajor: "M0 0L9 9",
          roadMid: "",
          roadMinor: "",
          roadWidth: 16,
        },
      });
    });
    expect(screen.queryByText(/일요일-늦은/)).toBeNull();
    expect(screen.queryByTestId("day-route-map", { includeHiddenElements: true })).toBeNull();
  });

  it("★ 같은 날을 다시 열면 다시 읽는다 — 결과를 저장·재사용하지 않는다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    await store.save(entryFor(SAT, { places: SAVED_SAT }));
    const routeDay = jest.fn<ReturnType<RouteDay>, Parameters<RouteDay>>(async () =>
      diagramOf(["읽은-가", "읽은-나"]),
    );
    await renderHome(store, routeDay);

    await selectDay(SUN);
    await screen.findByTestId("day-route-diagram");
    expect(routeDay.mock.calls.filter(([day]) => day === SUN)).toHaveLength(1);

    await userEvent.press(await screen.findByTestId(`day-${SAT}`));
    await screen.findByText(/^토요일-가( |$)|읽은-가/);
    await selectDay(SUN);
    await screen.findByTestId("day-route-diagram");
    expect(routeDay.mock.calls.filter(([day]) => day === SUN)).toHaveLength(2);
  });
});

describe("FR-015 — 다시 써서 같은 날의 일기가 바뀌면 옛 도식이 새 일기에 남지 않는다", () => {
  it("★ 새 일기의 읽기가 끝나기 전에는 옛 도식이 아니라 새 저장 목록이 보인다", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    const NEW_SAVED = [place("새-가", 8), place("새-나", 12), place("새-다", 18)];
    const pending = deferred<DayRoute | null>();
    let calls = 0;
    const routeDay: RouteDay = jest.fn(() =>
      ++calls === 1 ? Promise.resolve(diagramOf(["옛-읽음-가", "옛-읽음-나"])) : pending.promise,
    );
    const pipeline = {
      run: jest.fn(async (input: { day: string }) => {
        const fresh = entryFor(input.day, {
          text: "새로 쓴 본문",
          title: "새 제목",
          places: NEW_SAVED,
        });
        await store.save(fresh);
        return { ok: true, entry: fresh, overwrote: true } as PipelineResult;
      }),
    } as unknown as Pipeline;
    await renderHome(store, routeDay, pipeline);
    await selectDay(SUN);
    expect(await screen.findByText(/옛-읽음-가/)).toBeTruthy();

    await reachPaperEnd();
    await userEvent.press(screen.getByTestId("write-button"));
    await userEvent.press(await screen.findByTestId("overwrite-confirm"));
    expect(await screen.findByText("새로 쓴 본문")).toBeTruthy();

    // 새 일기를 다시 읽는 중이다(대기) — 옛 일기의 읽은 결과가 새 일기 위에 남아 있으면 안 된다
    expect(screen.queryByText(/옛-읽음/)).toBeNull();
    expect(screen.queryByTestId("day-route-diagram")).toBeNull();
    expect(await screen.findByText(/^새-가( |$)/)).toBeTruthy();

    // 읽기가 끝나면 새 일기의 도식이 된다
    await act(async () => {
      pending.resolve(diagramOf(["새-읽음-가", "새-읽음-나", "새-읽음-다"]));
    });
    expect(await screen.findByText(/새-읽음-가/)).toBeTruthy();
  });
});

describe("DF2 — 쓰는 중에는 읽지 않는다", () => {
  it("다시 쓰는 중에는 routeDay가 더 불리지 않고 칸이 없다(쓰는 화면)", async () => {
    const store = memoryStore();
    await store.save(entryFor(SUN, { places: SAVED_SUN }));
    const routeDay = jest.fn<ReturnType<RouteDay>, Parameters<RouteDay>>(async () =>
      diagramOf(["읽은-가", "읽은-나"]),
    );
    const hanging: Pipeline = { run: () => new Promise<PipelineResult>(() => {}) } as Pipeline;
    await renderHome(store, routeDay, hanging);
    await selectDay(SUN);
    await screen.findByTestId("day-route-diagram");
    const callsBefore = routeDay.mock.calls.length;

    await reachPaperEnd();
    await userEvent.press(screen.getByTestId("write-button"));
    await userEvent.press(await screen.findByTestId("overwrite-confirm"));
    await screen.findByTestId("stop-button");

    expect(screen.queryByTestId("day-route")).toBeNull();
    expect(routeDay.mock.calls.length).toBe(callsBefore);
  });
});
