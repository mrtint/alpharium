/**
 * 057 — 목표 시각이 지난 뒤 앱을 열면 홈이 쓰는 중으로 시작한다 (US3, 보드 `6c` ③).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md OP2~OP5, spec FR-014~FR-019
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 판정(`resolveAutoWrite`)은 조립부가 하고 홈은 「자동으로 쓸 날」(`autoWriteDay`)만 받는다 — 화면은 판정하지 않는다.
 * 홈은 그 날을 054의 제자리 쓰기로 쓴다(053 재료 확인 없이 — 재료가 있다고 이미 판정됐다). 시작하는 순간에만
 * `claimAutoWrite()`를 불러 「한 실행에 한 번」을 지킨다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { screen, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore, type DiaryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";
const YESTERDAY = "2026-09-27";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

/** 조립부의 claim과 같다 — 한 실행에 한 번만 참 */
function once() {
  let claimed = false;
  return jest.fn(() => {
    if (claimed) return false;
    claimed = true;
    return true;
  });
}

function pendingPipeline() {
  const run = jest.fn((): Promise<PipelineResult> => new Promise<PipelineResult>(() => {}));
  return { pipeline: { run } as Pipeline, run };
}

function resultPipeline(result: PipelineResult) {
  const run = jest.fn(() => Promise.resolve(result));
  return { pipeline: { run } as Pipeline, run };
}

async function renderHome(over: {
  pipeline: Pipeline;
  autoWriteDay?: string | null;
  claimAutoWrite?: () => boolean;
  covered?: boolean;
  resolve?: (day: string) => ResolveOutcome;
  onChooseDay?: (day: string) => void;
  store?: DiaryStore;
}) {
  const previewDay = jest.fn(async (day: string) => ({
    day,
    photos: { kind: "known" as const, count: 3 },
    places: { kind: "unknown" as const },
    photoAccess: "ok" as const,
  }));
  await renderWithPortal(
    <DiaryHomeScreen
      now={() => NOW}
      pipeline={over.pipeline}
      resolution={resolved}
      resolve={over.resolve ?? resolveQuiet}
      store={over.store ?? memoryStore()}
      previewDay={previewDay}
      autoWriteDay={over.autoWriteDay ?? null}
      claimAutoWrite={over.claimAutoWrite}
      covered={over.covered}
      onChooseDay={over.onChooseDay}
      chosenDay={TODAY}
    />,
  );
}

describe("OP2 — 자동으로 쓸 날을 받으면 그 날을 고르고 쓰는 중으로 들어간다", () => {
  it("claim 한 번 → 그 날을 고르고 쓰는 중, 재료 확인 없음, 그 날로 run", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => true);
    const onChooseDay = jest.fn();
    await renderHome({ pipeline, autoWriteDay: YESTERDAY, claimAutoWrite: claim, onChooseDay });

    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    expect(screen.getByTestId("stop-button")).toBeTruthy();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(onChooseDay).toHaveBeenCalledWith(YESTERDAY);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ day: YESTERDAY }),
      expect.anything(),
    );
    expect(screen.queryByTestId("material-confirm")).toBeNull();
  });
});

describe("OP3·OP4 — 시작하지 않는 경우", () => {
  it("덮여 있으면 claim도 하지 않는다", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => true);
    await renderHome({ pipeline, autoWriteDay: TODAY, claimAutoWrite: claim, covered: true });
    await screen.findByTestId("write-button", { includeHiddenElements: true });
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
  });

  it("claim이 거짓이면(이번 실행에서 이미 시작) 쓰지 않는다", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => false);
    await renderHome({ pipeline, autoWriteDay: TODAY, claimAutoWrite: claim });
    await waitFor(() => expect(claim).toHaveBeenCalled());
    expect(run).not.toHaveBeenCalled();
    expect(screen.queryByTestId("writing-paper")).toBeNull();
  });

  it("쓸 캐릭터가 준비되지 않았으면 claim하지 않고 안내 화면도 띄우지 않는다", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => true);
    await renderHome({
      pipeline,
      autoWriteDay: TODAY,
      claimAutoWrite: claim,
      resolve: () => ({ kind: "no-ready-character" }),
    });
    await screen.findByTestId("write-button");
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("그 날이 이미 써져 있으면 claim하지 않는다 (판정 뒤에 써졌을 수 있다 — 덮어쓰지 않는다)", async () => {
    const store = memoryStore();
    await store.save({
      date: TODAY,
      title: "이미 쓴 날",
      text: "이미 쓴 본문이다.",
      character: "quiet",
      signalsUsed: {
        date: TODAY,
        photos: { kind: "none" },
        places: { kind: "none" },
        steps: { kind: "unknown", reason: "x" },
        battery: { kind: "unknown", reason: "x" },
        connectivity: { kind: "unknown", reason: "x" },
      },
      createdAt: new Date("2026-09-28T21:00:00"),
    });
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => true);
    await renderHome({ pipeline, autoWriteDay: TODAY, claimAutoWrite: claim, store });
    // 목록을 읽어 그 날이 쓴 날로 보인 뒤에 본다(읽기 전에는 애초에 시작하지 않는다).
    expect(await screen.findByText("이미 쓴 날", {}, { timeout: 10000 })).toBeTruthy();
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("자동으로 쓸 날이 없으면 아무것도 하지 않는다", async () => {
    const { pipeline, run } = pendingPipeline();
    const claim = jest.fn(() => true);
    await renderHome({ pipeline, autoWriteDay: null, claimAutoWrite: claim });
    await screen.findByTestId("write-button");
    expect(claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("OP5 — 백그라운드가 쥐고 있으면 조용히", () => {
  it("already-running이면 실패 토스트가 없다", async () => {
    const { pipeline, run } = resultPipeline({
      ok: false,
      stage: "already-running",
      reason: "다른 곳에서 생성 중이다",
    });
    await renderHome({ pipeline, autoWriteDay: TODAY, claimAutoWrite: once() });
    await waitFor(() => expect(run).toHaveBeenCalled());
    await screen.findByTestId("write-button");
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });

  it("다른 실패는 054 토스트 그대로", async () => {
    const { pipeline } = resultPipeline({
      ok: false,
      stage: "generation",
      reason: "rejected: echo",
    });
    await renderHome({ pipeline, autoWriteDay: TODAY, claimAutoWrite: once() });
    expect(await screen.findByTestId("failure-toast")).toBeTruthy();
  });
});
