/**
 * 일기 홈 — 쓸 수 없는 날의 쓰기 방어 둘째 겹 (048 B6, FR-034).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 첫째 겹(화면이 쓰기 버튼을 그리지 않는다)은 `diary-list.test.tsx` B4·B5가 본다. 여기서는
 * **화면을 건너뛰고** `DiaryHomeScreen`이 넘긴 `onWrite`를 직접 불러, 쓸 수 없는 날이면
 * 파이프라인에 닿지 않는다는 것을 잠근다 — 화면만 막고 아래가 뚫린 것이 이 저장소가 여러 번
 * 겪은 결함이다(006·009·012).
 *
 * `DiaryListScreen`을 대역으로 바꿔 받은 props를 기록한다. 셋째 겹(파이프라인의
 * `isDayWritable` 게이트)은 `__tests__/diary/pipeline.test.ts`의 012 테스트가 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, render, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryListScreenProps } from "../../src/ui/DiaryListScreen";

const seen: DiaryListScreenProps[] = [];

jest.mock("../../src/ui/DiaryListScreen", () => ({
  DiaryListScreen: (props: DiaryListScreenProps) => {
    seen.push(props);
    return null;
  },
}));

// 대역을 등록한 뒤에 가져온다.
// eslint-disable-next-line import/first
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

describe("★ 048 B6 — 쓸 수 없는 날의 쓰기는 파이프라인에 닿지 않는다", () => {
  beforeEach(() => {
    seen.length = 0;
  });

  it("정오 전 오늘을 고른 상태에서 onWrite를 직접 불러도 생성이 시작되지 않는다", async () => {
    const run = jest.fn(() =>
      Promise.resolve<PipelineResult>({ ok: false, stage: "day-not-closed", reason: "" }),
    );
    const pipeline: Pipeline = { run };

    await render(
      <DiaryHomeScreen
        now={() => new Date("2026-09-24T10:00:00")}
        pipeline={pipeline}
        resolution={resolved}
        resolve={resolveQuiet}
        store={memoryStore()}
      />,
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));

    // 대역을 통해 아직 쓸 수 없는 오늘을 고른다.
    await act(async () => {
      seen[seen.length - 1].onSelectDay?.("2026-09-24");
    });
    const latest = seen[seen.length - 1];
    expect(latest.write?.day).toBe("2026-09-24");
    expect(latest.write?.writable).toBe(false);

    // 화면을 건너뛰고 쓰기를 직접 부른다.
    const rendersBefore = seen.length;
    await act(async () => {
      latest.onWrite();
    });

    expect(run).not.toHaveBeenCalled();
    // 쓰는 중·덮어쓰기 확인으로 가지 않았다 — 목록 화면(대역)이 여전히 그려진다.
    expect(seen.length).toBeGreaterThanOrEqual(rendersBefore);
    expect(seen[seen.length - 1].write?.day).toBe("2026-09-24");
  });

  it("대조 — 쓸 수 있는 날이면 같은 경로로 생성이 시작된다", async () => {
    const run = jest.fn(() => new Promise<PipelineResult>(() => {}));

    await render(
      <DiaryHomeScreen
        now={() => new Date("2026-09-24T10:00:00")}
        pipeline={{ run }}
        resolution={resolved}
        resolve={resolveQuiet}
        store={memoryStore()}
      />,
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));

    await act(async () => {
      seen[seen.length - 1].onWrite();
    });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
