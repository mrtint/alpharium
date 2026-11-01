/**
 * 085 — 쓸 차례 알림을 누르면 「한 번」이 다시 열린다 (조립).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RA6·RA7
 *       spec.md FR-023
 *
 * 082의 조립 하니스(`auto-write-open-assembly.test.tsx`)를 그대로 따른다 — 판정은 `resolveAutoWrite`(훅 안), 홈은 `DiaryHomeScreen`,
 * 쓰기는 `createPipeline()`, 살아 있는 쓰기는 `createLiveWrites()`. 바깥(`AppFrame`)의 알림 응답 처리는 `App.tsx`와 같은 모양이다:
 * 응답이 쓸 차례 알림이면(`isWriteReminderResponse`) `rearmAutoWrite()`, 그리고 앱이 앞으로 온다(`AppState` → `active`).
 * 그 배선 자체는 `app-auto-write-source.test.ts`가 `App.tsx`에서 잠근다.
 *
 * **「쓰지 않았다」는 마지막 화면이 아니라 쓰기가 시작된 횟수로 센다** — 등록부 `beginWrite`와 백엔드 `generate`.
 * ⚠️ RNTL 14의 `render`·`rerender`·`fireEvent`는 Promise다 — await한다.
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { NotificationResponse } from "expo-notifications";
import { AppState, Pressable } from "react-native";

import { isWriteReminderResponse } from "../../src/app/notification-behavior";
import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { DayPreview } from "../../src/app/state";
import { useAutoWriteClaim } from "../../src/app/use-auto-write-claim";
import { useAutoWriteHandoff } from "../../src/app/use-auto-write-handoff";
import type { EnvironmentResolution } from "../../src/config/types";
import { createLiveWrites, type LiveWrites } from "../../src/diary/live-write";
import { createPipeline, type Pipeline } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import type { AutoDiarySettings } from "../../src/schedule/settings";
import { partiallyUnknownDay } from "../../src/signals/fake";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";
import { ledgerPort } from "../schedule/attempt-ledger-fixture";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
// 목표 22시·실제 오전 — 어제는 차례가 지난 날이라 시도 창 밖에서도 쓴다(078). 실기기 재현(2026-10-14)과 같은 조건이다.
const NOW = new Date("2026-09-28T09:40:00");
const TODAY = "2026-09-28";
const YESTERDAY = "2026-09-27";

const ON: AutoDiarySettings = { enabled: true, targetHour: 22 };

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
  attemptPort: ReturnType<typeof ledgerPort>;
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
    attemptPort: ledgerPort(),
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

/** `AppFrame` — 「한 번」과 알림 응답(`App.tsx`의 `onResponse`와 같은 모양) */
function Frame({ w, settings, covered }: Shown & { w: World }) {
  const claim = useAutoWriteClaim({
    simulationLoaded: true,
    writeBlocked: false,
    firstRunTried: w.firstRunTried,
  });
  const respond = (response: NotificationResponse) => {
    if (isWriteReminderResponse(response)) claim.rearmAutoWrite();
  };
  return (
    <>
      <Section claimAutoWrite={claim.claimAutoWrite} covered={covered} settings={settings} w={w} />
      <Pressable onPress={() => claim.spendAutoWrite()} testID="harness-spend" />
      <Pressable
        onPress={() => respond(responseOf("write-reminder"))}
        testID="harness-tap-reminder"
      />
      <Pressable onPress={() => respond(responseOf(undefined))} testID="harness-tap-completion" />
    </>
  );
}

const responseOf = (kind: string | undefined) =>
  ({
    notification: { request: { content: { data: { day: YESTERDAY, ...(kind ? { kind } : {}) } } } },
  }) as unknown as NotificationResponse;

const mount = (w: World, shown: Shown) => renderWithPortal(<Frame w={w} {...shown} />);

async function decided(w: World, n: number) {
  await waitFor(() => expect(w.attemptPort.write).toHaveBeenCalledTimes(n));
  await act(async () => {});
}

const homeReady = () => screen.findByTestId("write-button", { includeHiddenElements: true });

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

const started = (w: World) => ({
  begun: w.beginWrite.mock.calls.length,
  generated: w.generate.mock.calls.length,
});

describe("RA7 — 쓸 차례 알림을 누르면 한 번 더", () => {
  it("★ 소모된 실행에서 쓸 차례 알림 응답 → 그 날을 쓰기 시작한다", async () => {
    const w = world();
    w.listDoor.close();
    await mount(w, { settings: ON, covered: false });
    await homeReady();
    await fireEvent.press(screen.getByTestId("harness-spend"));
    await act(async () => w.listDoor.open());
    await decided(w, 1);
    await settle();
    expect(started(w)).toEqual({ begun: 0, generated: 0 });

    await fireEvent.press(screen.getByTestId("harness-tap-reminder"));
    await comeBack();

    await waitFor(async () => expect(await w.store.load(YESTERDAY)).not.toBeNull());
    expect(started(w)).toEqual({ begun: 1, generated: 1 });
  });

  it("완성 알림 응답으로는 다시 열리지 않는다", async () => {
    const w = world();
    w.listDoor.close();
    await mount(w, { settings: ON, covered: false });
    await homeReady();
    await fireEvent.press(screen.getByTestId("harness-spend"));
    await act(async () => w.listDoor.open());
    await decided(w, 1);
    await settle();

    await fireEvent.press(screen.getByTestId("harness-tap-completion"));
    await comeBack();
    await decided(w, 2);
    await settle();

    expect(started(w)).toEqual({ begun: 0, generated: 0 });
  });
});
