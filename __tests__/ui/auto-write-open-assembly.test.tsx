/**
 * 082 — 앱 열기 자동 쓰기의 조립: 판정 → 넘겨 둔 날 → 「한 번」 → 홈 → 파이프라인 → 등록부.
 *
 * 계약: specs/082-auto-write-claim-handoff/contracts/auto-write-open.md AS1~AS11
 *       spec.md US1·US2·US3, FR-001~FR-009·FR-013·FR-014
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 두 결함(설정에서 켰다 끄고 닫아도 쓴다 · 일기를 모두 지운 직후 다시 쓴다)은 부품 하나의 결함이 아니라 **맞물림**의 결함이다.
 * 그래서 전부 진짜를 묶는다: 판정은 `resolveAutoWrite`(훅 안), 홈은 `DiaryHomeScreen`, 쓰기는 `createPipeline()`, 살아 있는 쓰기는
 * `createLiveWrites()`. 대역은 기기에 닿는 것뿐이다 — 백엔드(글을 돌려준다)·일기 저장(메모리)·미리보기·기록 통로.
 *
 * 하니스는 `App.tsx`의 배치 그대로다: 바깥(`AppFrame`)이 「한 번」을 들고, `key`로 다시 마운트되는 안쪽(`DiarySection`)이 넘겨 둔
 * 날과 홈을 갖는다. 「지우기」는 `requestWipe`의 순서(일기를 지운다 → 한 번을 소모한다 → 안쪽을 다시 마운트한다)다 — 그 순서
 * 자체는 `app-auto-write-source.test.ts` WP1이 `App.tsx`에서 잠근다.
 *
 * **「쓰지 않았다」는 마지막 화면이 아니라 쓰기가 시작된 횟수로 센다**(FR-014) — 등록부 `beginWrite`와 백엔드 `generate`.
 *
 * ⚠️ RNTL 14의 `render`·`rerender`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { AppState, Pressable } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { DayPreview } from "../../src/app/state";
import { useAutoWriteClaim } from "../../src/app/use-auto-write-claim";
import { useAutoWriteHandoff } from "../../src/app/use-auto-write-handoff";
import type { EnvironmentResolution } from "../../src/config/types";
import { createLiveWrites, type LiveWrites } from "../../src/diary/live-write";
import { createPipeline, type Pipeline } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { AutoDiarySettings } from "../../src/schedule/settings";
import { partiallyUnknownDay } from "../../src/signals/fake";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal, withPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
// 목표 22시·실제 오전 — 어제는 차례가 지난 날이라 시도 창 밖에서도 쓴다(078). 실기기 재현(2026-10-14)과 같은 조건이다.
const NOW = new Date("2026-09-28T09:40:00");
const TODAY = "2026-09-28";
const YESTERDAY = "2026-09-27";

const ON: AutoDiarySettings = { enabled: true, targetHour: 22 };
const OFF: AutoDiarySettings = { enabled: false, targetHour: 22 };

/**
 * 살아 있는 `AppState` 구독만 부른다 — 다시 마운트로 걷힌 옛 구독이 불리면 판정이 한 번 더 돌아 횟수가 어긋난다.
 * 스파이는 복원하지 않는다(jest-expo의 목은 복원하면 구독 반환값을 잃는다).
 */
const liveHandlers = new Set<(state: string) => void>();
beforeAll(() => {
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    event: string,
    handler: (state: string) => void,
  ) => {
    if (event === "change") liveHandlers.add(handler);
    return { remove: () => liveHandlers.delete(handler) };
  }) as never);
});
beforeEach(() => liveHandlers.clear());

async function comeBack() {
  await act(async () => {
    [...liveHandlers].forEach((handler) => handler("active"));
  });
}

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

function entryFor(day: string): DiaryEntry {
  return {
    date: day,
    title: "이미 쓴 날",
    text: "먼저 써 둔 본문이다.",
    character: "quiet",
    signalsUsed: {
      date: day,
      photos: { kind: "none" },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "x" },
      battery: { kind: "unknown", reason: "x" },
      connectivity: { kind: "unknown", reason: "x" },
    },
    createdAt: new Date("2026-09-27T22:10:00"),
  };
}

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

/** 손으로 여는 문 */
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

type World = {
  store: DiaryStore;
  registry: LiveWrites;
  pipeline: Pipeline;
  generate: jest.Mock;
  beginWrite: jest.SpyInstance;
  attemptPort: ReturnType<typeof memoryPort>;
  skipPort: ReturnType<typeof memoryPort>;
  /** 040 — 첫 실행의 자동 첫 일기를 시도한 실행인가 */
  firstRunTried: { current: boolean };
  /** 어제에 재료가 있는가 — 테스트가 도중에 바꾼다 */
  material: { yesterday: boolean };
  /** 판정의 일기 목록 읽기를 막는 문 */
  listDoor: ReturnType<typeof gate>;
  /** 백엔드의 글쓰기를 막는 문 */
  writeDoor: ReturnType<typeof gate>;
  previewForAuto: (day: string) => Promise<DayPreview>;
  listDiaryDays: () => Promise<readonly string[]>;
};

function world(): World {
  const store = memoryStore();
  const registry = createLiveWrites();
  const beginWrite = jest.spyOn(registry, "beginWrite");
  const listDoor = gate();
  const writeDoor = gate();
  const material = { yesterday: true };
  const generate = jest.fn(async () => {
    await writeDoor.pass();
    return { text: "홈이 쓴 날\n\n오늘은 조용한 하루였다." };
  });
  const pipeline = createPipeline({
    backend: {
      location: "on-device",
      async isAvailable() {
        return { kind: "loaded" };
      },
      generate,
    },
    store,
    loadSignals: async (day) => partiallyUnknownDay(day),
    beginWrite: (day) => registry.beginWrite({ day, owner: "screen" }),
  });
  return {
    store,
    registry,
    pipeline,
    generate,
    beginWrite,
    attemptPort: memoryPort(),
    skipPort: memoryPort(),
    firstRunTried: { current: false },
    material,
    listDoor,
    writeDoor,
    // 어제에만 재료가 있다 — 다른 날은 「재료 없음」으로 건너뛴다(실기기 재현의 그저께와 같다).
    previewForAuto: async (day) =>
      day === YESTERDAY && material.yesterday
        ? {
            day,
            photos: { kind: "known", count: 3 },
            places: { kind: "unknown" },
            photoAccess: "ok",
          }
        : { day, photos: { kind: "none" }, places: { kind: "none" }, photoAccess: "ok" },
    listDiaryDays: async () => {
      await listDoor.pass();
      return store.listDays();
    },
  };
}

const now = () => NOW;
// 홈의 신호 줄 — 어느 날이든 재료가 있어 쓰기 버튼이 확인 없이 쓴다.
const homePreview = async (day: string): Promise<DayPreview> => ({
  day,
  photos: { kind: "known", count: 3 },
  places: { kind: "unknown" },
  photoAccess: "ok",
});

type Shown = { settings: AutoDiarySettings; covered: boolean };

/** `DiarySection` — 넘겨 둔 날과 홈 */
function Section({
  w,
  settings,
  covered,
  claimAutoWrite,
}: Shown & { w: World; claimAutoWrite: () => boolean }) {
  const autoWriteDay = useAutoWriteHandoff({
    settings,
    previewDay: w.previewForAuto,
    skipPort: w.skipPort,
    listDiaryDays: w.listDiaryDays,
    attemptPort: w.attemptPort,
    now,
  });
  return (
    <DiaryHomeScreen
      autoWriteDay={autoWriteDay}
      barLockMs={0}
      chosenDay={TODAY}
      claimAutoWrite={claimAutoWrite}
      covered={covered}
      liveWrites={w.registry}
      now={now}
      pipeline={w.pipeline}
      previewDay={homePreview}
      resolution={resolved}
      resolve={resolveQuiet}
      store={w.store}
    />
  );
}

/** `AppFrame` — 「한 번」과 지우기 */
function Frame({ w, settings, covered }: Shown & { w: World }) {
  const claim = useAutoWriteClaim({
    simulationLoaded: true,
    writeBlocked: false,
    firstRunTried: w.firstRunTried,
  });
  const [diaryKey, setDiaryKey] = useState(0);
  // `requestWipe`의 순서: 지운다 → 한 번을 소모한다 → 홈을 다시 마운트한다.
  const wipe = async () => {
    await w.store.removeAll();
    claim.spendAutoWrite();
    setDiaryKey((k) => k + 1);
  };
  return (
    <>
      <Section
        claimAutoWrite={claim.claimAutoWrite}
        covered={covered}
        key={diaryKey}
        settings={settings}
        w={w}
      />
      <Pressable onPress={() => void wipe()} testID="harness-wipe" />
    </>
  );
}

const frame = (w: World, shown: Shown) => withPortal(<Frame w={w} {...shown} />);
const mount = (w: World, shown: Shown) => renderWithPortal(<Frame w={w} {...shown} />);

/** 판정이 n번 끝났다 — 시도 기록이 n번 쓰였다(판정마다 한 번) */
async function decided(w: World, n: number) {
  await waitFor(() => expect(w.attemptPort.write).toHaveBeenCalledTimes(n));
  await act(async () => {});
}

const lastOutcome = (w: World) => {
  const calls = w.attemptPort.write.mock.calls;
  const items = (
    JSON.parse(calls[calls.length - 1]![0] as string) as { items: { outcome: string }[] }
  ).items;
  return items[0]!.outcome;
};

/** 홈이 목록을 읽어 쓰기 전 상태로 서 있다(덮여 있어도 그려져 있다) */
const homeReady = () => screen.findByTestId("write-button", { includeHiddenElements: true });

/** 시작했다면 이미 시작했을 만큼 기다린다 — 홈은 시작을 다음 차례로 미룬다 */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

const started = (w: World) => ({
  begun: w.beginWrite.mock.calls.length,
  generated: w.generate.mock.calls.length,
});

describe("US1 — 끈 것은 쓰지 않는다", () => {
  it("★ AS1 — 켰다 끄고 닫으면 쓰지 않는다", async () => {
    const w = world();
    const view = await mount(w, { settings: OFF, covered: true });
    await homeReady();
    await decided(w, 1);

    await view.rerender(frame(w, { settings: ON, covered: true }));
    await decided(w, 2);
    expect(lastOutcome(w)).toBe("write");

    await view.rerender(frame(w, { settings: OFF, covered: true }));
    await decided(w, 3);
    expect(lastOutcome(w)).toBe("disabled");

    await view.rerender(frame(w, { settings: OFF, covered: false }));
    await settle();

    expect(started(w)).toEqual({ begun: 0, generated: 0 });
    expect(await w.store.load(YESTERDAY)).toBeNull();
  });

  it("★ AS2 — 끄고 곧바로 닫아도(꺼짐 판정이 끝나기 전) 쓰지 않는다", async () => {
    const w = world();
    const view = await mount(w, { settings: ON, covered: true });
    await homeReady();
    await decided(w, 1);
    expect(lastOutcome(w)).toBe("write");

    w.listDoor.close();
    await view.rerender(frame(w, { settings: OFF, covered: true }));
    await view.rerender(frame(w, { settings: OFF, covered: false }));
    await settle();
    // 꺼짐 판정은 아직 문 앞이다.
    expect(w.attemptPort.write).toHaveBeenCalledTimes(1);
    expect(started(w)).toEqual({ begun: 0, generated: 0 });

    await act(async () => w.listDoor.open());
    await decided(w, 2);
    await settle();
    expect(started(w)).toEqual({ begun: 0, generated: 0 });
  });

  it("AS3 — 켠 채 닫으면 그 날을 쓴다 (의도)", async () => {
    const w = world();
    const view = await mount(w, { settings: OFF, covered: true });
    await homeReady();
    await decided(w, 1);

    await view.rerender(frame(w, { settings: ON, covered: true }));
    await decided(w, 2);
    await settle();
    expect(started(w)).toEqual({ begun: 0, generated: 0 });

    await view.rerender(frame(w, { settings: ON, covered: false }));

    await waitFor(async () => expect(await w.store.load(YESTERDAY)).not.toBeNull());
    expect(started(w)).toEqual({ begun: 1, generated: 1 });
    expect(w.beginWrite).toHaveBeenCalledWith({ day: YESTERDAY, owner: "screen" });
  });

  it("★ AS11 — 설정은 그대로인데 그 날의 재료가 사라졌으면 쓰지 않는다", async () => {
    const w = world();
    const view = await mount(w, { settings: ON, covered: true });
    await homeReady();
    await decided(w, 1);
    expect(lastOutcome(w)).toBe("write");

    w.material.yesterday = false;
    await comeBack();
    await decided(w, 2);
    expect(lastOutcome(w)).toBe("no-material");

    await view.rerender(frame(w, { settings: ON, covered: false }));
    await settle();

    expect(started(w)).toEqual({ begun: 0, generated: 0 });
  });
});

describe("US2 — 지운 직후에 다시 쓰지 않는다", () => {
  /** 자동 쓰기 켜짐·어제가 써 있는 채 열었다 — 이 실행의 「한 번」은 아직 남아 있다 */
  async function openedWithYesterdayWritten() {
    const w = world();
    await w.store.save(entryFor(YESTERDAY));
    const view = await mount(w, { settings: ON, covered: false });
    await homeReady();
    await decided(w, 1);
    // 어제는 써 있고 그저께에는 재료가 없다.
    expect(lastOutcome(w)).toBe("no-material");
    await settle();
    expect(started(w)).toEqual({ begun: 0, generated: 0 });
    return { w, view };
  }

  async function wipe(w: World) {
    await fireEvent.press(screen.getByTestId("harness-wipe"));
    await waitFor(async () => expect(await w.store.listDays()).toEqual([]));
  }

  it("★ AS4 — 지운 뒤 다시 마운트된 홈이 어제를 쓰기 시작하지 않는다", async () => {
    const { w } = await openedWithYesterdayWritten();

    await wipe(w);
    await decided(w, 2);
    // 판정은 종전대로 「쓴다」다 — 막는 것은 소모된 「한 번」이다.
    expect(lastOutcome(w)).toBe("write");
    await homeReady();
    await settle();

    expect(started(w)).toEqual({ begun: 0, generated: 0 });
    expect(await w.store.listDays()).toEqual([]);
  });

  it("★ AS5 — 지운 뒤 앱을 내렸다 올려도 쓰지 않는다", async () => {
    const { w } = await openedWithYesterdayWritten();
    await wipe(w);
    await decided(w, 2);
    await homeReady();

    await comeBack();
    await decided(w, 3);
    await settle();

    expect(started(w)).toEqual({ begun: 0, generated: 0 });
  });

  it("★ AS6 — 한 번이 소모된 실행에서는 자동 쓰기를 새로 켜고 닫아도 쓰지 않는다", async () => {
    const w = world();
    const view = await mount(w, { settings: OFF, covered: false });
    await homeReady();
    await decided(w, 1);
    await fireEvent.press(screen.getByTestId("harness-wipe"));
    await decided(w, 2);
    await homeReady();

    await view.rerender(frame(w, { settings: ON, covered: true }));
    await decided(w, 3);
    expect(lastOutcome(w)).toBe("write");
    await view.rerender(frame(w, { settings: ON, covered: false }));
    await settle();

    expect(started(w)).toEqual({ begun: 0, generated: 0 });
  });

  it("AS8 — 앱을 새로 열면(새 실행) 종전대로 쓴다", async () => {
    const { w, view } = await openedWithYesterdayWritten();
    await wipe(w);
    await decided(w, 2);
    await settle();
    expect(started(w)).toEqual({ begun: 0, generated: 0 });

    await view.unmount();
    await mount(w, { settings: ON, covered: false });

    await waitFor(async () => expect(await w.store.load(YESTERDAY)).not.toBeNull());
    expect(started(w)).toEqual({ begun: 1, generated: 1 });
  });

  it("AS9 — 지운 뒤에도 쓰기 버튼은 쓴다", async () => {
    const { w } = await openedWithYesterdayWritten();
    await wipe(w);
    await decided(w, 2);
    await settle();

    await fireEvent.press(await screen.findByTestId("write-button"));

    await waitFor(async () => expect(await w.store.load(TODAY)).not.toBeNull());
    expect(w.beginWrite).toHaveBeenCalledTimes(1);
    expect(w.beginWrite).toHaveBeenCalledWith({ day: TODAY, owner: "screen" });
  });
});

describe("US3 — 평소의 앱 열기 자동 쓰기는 그대로다", () => {
  it("AS7 — 켜진 채 열면 어제를 한 번 쓰고, 돌아와도 두 번째는 없다", async () => {
    const w = world();
    await mount(w, { settings: ON, covered: false });

    await waitFor(async () => expect(await w.store.load(YESTERDAY)).not.toBeNull());
    expect(started(w)).toEqual({ begun: 1, generated: 1 });
    await waitFor(() => expect(w.registry.current()).toBeNull());

    const before = w.attemptPort.write.mock.calls.length;
    await comeBack();
    await decided(w, before + 1);
    // 어제는 써졌고 그저께에는 재료가 없다 — 넘겨 둔 날이 비워진다.
    expect(lastOutcome(w)).toBe("no-material");
    await settle();

    expect(started(w)).toEqual({ begun: 1, generated: 1 });
  });

  it("AS7 — 사용자가 그만둔 뒤에는 돌아와도 저절로 다시 시작하지 않는다 (한 실행에 한 번)", async () => {
    const w = world();
    w.writeDoor.close();
    await mount(w, { settings: ON, covered: false });
    await waitFor(() => expect(w.generate).toHaveBeenCalledTimes(1));

    await fireEvent.press(await screen.findByTestId("stop-button"));
    await act(async () => w.writeDoor.open());
    await waitFor(() => expect(w.registry.current()).toBeNull());
    expect(await w.store.load(YESTERDAY)).toBeNull();

    const before = w.attemptPort.write.mock.calls.length;
    await comeBack();
    await decided(w, before + 1);
    // 판정은 여전히 그 날을 넘긴다 — 막는 것은 소모된 「한 번」이다.
    expect(lastOutcome(w)).toBe("write");
    await settle();

    expect(started(w)).toEqual({ begun: 1, generated: 1 });
  });

  it("★ AS10 — 넘겨 둔 날이 없어져도 이미 시작한 쓰기는 멈추지 않는다 (FR-005)", async () => {
    const w = world();
    w.writeDoor.close();
    const view = await mount(w, { settings: ON, covered: false });
    await waitFor(() => expect(w.generate).toHaveBeenCalledTimes(1));
    const live = w.registry.current();
    expect(live?.kind).toBe("write");

    // 설정이 덮고(쓰는 중인 홈 위에 겹이 쌓인다) 자동 쓰기를 끈다.
    const before = w.attemptPort.write.mock.calls.length;
    await view.rerender(frame(w, { settings: OFF, covered: true }));
    await decided(w, before + 1);
    expect(lastOutcome(w)).toBe("disabled");
    await settle();

    // 같은 쓰기가 그대로 칸을 쥐고 있다 — 끊기지 않았다.
    expect(w.registry.current()).toBe(live);

    await act(async () => w.writeDoor.open());
    await waitFor(async () => expect(await w.store.load(YESTERDAY)).not.toBeNull());
    expect(started(w)).toEqual({ begun: 1, generated: 1 });
  });
});
