/**
 * 106 — 앞 상태 앱에서 주기 리셋이 오늘 일기를 지우면 홈이 목록을 다시 읽고 오늘을 이어 쓴다 (FR-009b, contracts/cycle-reset.md CR13).
 *
 * 리셋은 등록부의 칸을 `beginWipe`로 차지했다 놓는다. 080 H12 장치(홈이 시작하지 않은 쓰기·지우기가 드나들면 목록을 낡음으로 표시하고,
 * 칸이 빈 뒤 다시 읽는다)가 이 신호를 받는다 — 새 신호를 만들지 않는다. 이 테스트가 그 연쇄를 잠근다: 실제 홈 + 실제 등록부 + 실제 리셋 +
 * 메모리 저장소. 057 효과는 목록을 다시 읽은 뒤 「안 쓴 날」인 오늘을 판정대로 시작한다.
 */

import { act, screen, waitFor } from "@testing-library/react-native";

import { resetFastCycleIfDue } from "../../src/app/fast-cycle-reset";
import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import { createLiveWrites } from "../../src/diary/live-write";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { serializeFastCycle } from "../../src/schedule/fast-cycle-store";
import { emptyDay } from "../../src/signals/fake";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date(2026, 9, 26, 10, 35); // 30분 주기 순번 21 (10:30~11:00)
const TODAY = "2026-10-26";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

const todayEntry: DiaryEntry = {
  date: TODAY,
  title: "지난 주기의 일기",
  text: "지난 주기에 쓴 본문이다.",
  character: "quiet",
  signalsUsed: emptyDay(TODAY),
  createdAt: new Date(2026, 9, 26, 10, 10),
};

function memoryFile(initial: string | null) {
  const f = { content: initial };
  return {
    read: async () => f.content,
    write: async (s: string) => {
      f.content = s;
    },
    remove: async () => {
      f.content = null;
    },
  };
}

describe("CR13 — 리셋 뒤 홈은 오늘을 안 쓴 날로 다시 읽고 이어 쓴다", () => {
  it("오늘이 쓴 날로 보이던 홈이, 리셋이 일기를 지운 뒤 057 자동 쓰기로 오늘을 다시 쓴다", async () => {
    const store = memoryStore();
    await store.save(todayEntry);
    const registry = createLiveWrites();
    const run = jest.fn(
      (): Promise<PipelineResult> => new Promise<PipelineResult>(() => {}), // 쓰는 중으로 남는다
    );
    const claim = jest.fn(() => true);

    await renderWithPortal(
      <DiaryHomeScreen
        now={() => NOW}
        pipeline={{ run } as Pipeline}
        resolution={resolved}
        resolve={resolveQuiet}
        store={store}
        previewDay={async (day) => ({
          day,
          photos: { kind: "known" as const, count: 3 },
          places: { kind: "unknown" as const },
          photoAccess: "ok" as const,
        })}
        liveWrites={registry}
        autoWriteDay={TODAY}
        claimAutoWrite={claim}
        barLockMs={0}
        chosenDay={TODAY}
      />,
    );

    // 오늘이 이미 쓴 날이라 자동 쓰기는 시작하지 않는다 (「한 번」도 소모하지 않는다)
    await waitFor(() => expect(screen.queryByTestId("writing-paper")).toBeNull());
    expect(run).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();

    // 주기가 바뀌었다 — 리셋이 칸을 차지해 오늘의 일기를 지운다
    const result = await act(() =>
      resetFastCycleIfDue({
        devEnvironment: true,
        fastCyclePort: memoryFile(
          serializeFastCycle({ periodMinutes: 30, resetCycle: "2026-10-26#20" }),
        ),
        now: NOW,
        store,
        notifiedPort: memoryFile(null),
        skipPort: memoryFile(null),
        catchUpPort: memoryFile(null),
        dismiss: async () => {},
        liveWrites: registry,
      }),
    );
    expect(result).toEqual({ reset: true });
    expect(await store.has(TODAY)).toBe(false);

    // 홈이 목록을 다시 읽어 오늘을 안 쓴 날로 보고, 057 효과가 오늘을 시작한다
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(claim).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("writing-paper")).toBeTruthy();
  });
});
