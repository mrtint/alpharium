/**
 * 일기 홈 — 주 넘기기와 고른 날의 쓰기 (049).
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md HS1·HS4, WP1~WP3
 *       (이전 파일: diary-home-write-gate.test.tsx — 048 B6 「쓸 수 없는 날의 쓰기」)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `DiaryListScreen`을 대역으로 바꿔 받은 props를 기록한다 — 스트립을 끌지 않고 `onSwipe`를
 * 직접 부른다. gesture-handler의 jest 레지스트리는 테스트 사이에 핸들러가 남는 것을 실측했다
 * (`day-picker.test.tsx` 참조) — 배선은 그 파일이, 넘긴 뒤 어느 날이 되는지는 여기서 본다.
 *
 * **048 B6은 이제 성립하지 않는다.** 정오 제한이 사라져 쓸 수 없는 오늘이 없고, 미래 날은
 * `writePromptFor`가 오늘로 떨어뜨린다. 대신 「미래를 골라도 오늘이 쓰인다」를 잠근다. 미래 날의
 * 마지막 방어는 파이프라인의 `isDayWritable` 게이트(`pipeline.test.ts`)다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineInput, PipelineResult } from "../../src/diary/pipeline";
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

const latest = () => seen[seen.length - 1];

/** 2026-09-24(목) 09:00 — 정오 전 */
const NOW = () => new Date("2026-09-24T09:00:00");

async function renderHome(extra: Record<string, unknown> = {}) {
  const run = jest.fn((input: PipelineInput) => {
    void input;
    return new Promise<PipelineResult>(() => {});
  });
  const pipeline: Pipeline = { run };
  await render(
    <DiaryHomeScreen
      now={NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={memoryStore()}
      {...extra}
    />,
  );
  await waitFor(() => expect(seen.length).toBeGreaterThan(0));
  return run;
}

describe("049 HS1 — 주 넘기기", () => {
  beforeEach(() => {
    seen.length = 0;
  });

  it("★ HS1 — 오늘이 든 주에서 다음 주로 넘기면 아무 것도 바뀌지 않는다 (튕김)", async () => {
    const onChooseDay = jest.fn();
    await renderHome({ chosenDay: "2026-09-24", onChooseDay });

    expect(latest().canSwipeNext).toBe(false);
    await act(async () => {
      latest().onSwipe?.("next");
    });
    expect(onChooseDay).not.toHaveBeenCalled();
  });

  it("HS1 — 이전 주로 넘기면 같은 요일 7일 전을 고른다", async () => {
    const onChooseDay = jest.fn();
    await renderHome({ chosenDay: "2026-09-24", onChooseDay });

    await act(async () => {
      latest().onSwipe?.("previous");
    });
    expect(onChooseDay).toHaveBeenCalledWith("2026-09-17");
  });

  it("HS1 — 지난 주에서 다음 주로 넘기면 오늘 이후 요일은 오늘로 맞춘다", async () => {
    const onChooseDay = jest.fn();
    await renderHome({ chosenDay: "2026-09-19", onChooseDay });

    expect(latest().canSwipeNext).toBe(true);
    await act(async () => {
      latest().onSwipe?.("next");
    });
    expect(onChooseDay).toHaveBeenCalledWith("2026-09-24");
  });

  it("로컬 상태로도 넘어간다 (부모가 들고 있지 않을 때)", async () => {
    await renderHome();
    expect(latest().write?.day).toBe("2026-09-24");

    await act(async () => {
      latest().onSwipe?.("previous");
    });
    expect(latest().write?.day).toBe("2026-09-17");
    expect(latest().cells?.[0].day).toBe("2026-09-13");
  });
});

describe("049 — 고른 날의 쓰기", () => {
  beforeEach(() => {
    seen.length = 0;
  });

  it("★ 정오 전에도 오늘을 쓴다 — 파이프라인에 오늘이 간다 (FR-018b)", async () => {
    const run = await renderHome();
    await act(async () => {
      latest().onWrite();
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].day).toBe("2026-09-24");
  });

  it("★ 사흘 밖의 날도 그 날로 쓴다 (FR-010)", async () => {
    const run = await renderHome({ chosenDay: "2026-08-12", onChooseDay: () => {} });
    await act(async () => {
      latest().onWrite();
    });
    expect(run.mock.calls[0][0].day).toBe("2026-08-12");
  });

  it("미래를 골라 둬도 오늘로 떨어져 오늘이 쓰인다 (WP3)", async () => {
    const run = await renderHome({ chosenDay: "2026-09-30", onChooseDay: () => {} });
    expect(latest().write?.day).toBe("2026-09-24");
    await act(async () => {
      latest().onWrite();
    });
    expect(run.mock.calls[0][0].day).toBe("2026-09-24");
  });
});

describe("★ HS4 — 048의 정오 전환 흔적이 없다", () => {
  it("DiaryHomeScreen 소스에 writableAt·WRITABLE_TIMER_SLACK_MS·write-unavailable이 없다", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/DiaryHomeScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toContain("writableAt");
    expect(code).not.toContain("WRITABLE_TIMER_SLACK_MS");
    expect(code).not.toContain("write-unavailable");
  });

  it("DiaryListScreen 소스에 write-unavailable·revertedText가 없다", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/DiaryListScreen.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toContain("write-unavailable");
    expect(code).not.toContain("revertedText");
  });
});
