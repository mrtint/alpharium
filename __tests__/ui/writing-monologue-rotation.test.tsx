/**
 * 054 — 쓰는 중 혼잣말: 몇 초마다 페이드로 교체된다 (US4, 039의 타자기를 대체).
 *
 * 계약: specs/054-in-place-writing/contracts/writing-in-place.md W9·W10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **jest는 줄이 바뀌는 배선만 본다** — 타이머가 도는지·단계가 바뀌면 즉시 새 풀에서 고르는지·줄마다 `key`로 새로
 * 마운트되는지·소스에 타자기와 「effect로 시작값 되돌리기」가 없는지. 페이드가 실제로 겹치는지는 실기기 녹화로
 * 본다(C9, quickstart D3).
 *
 * `pickMonologue`는 `Math.random`을 쓴다 — 결정적으로 만들려고 0을 돌려준다(직전 줄을 뺀 나머지의 첫 줄).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, screen, userEvent } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { WRITING } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = () => new Date("2026-09-28T16:15:00");

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: false, geocodingEnabled: false },
});

const code = (file: string) =>
  readFileSync(join(__dirname, "../..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

/** `onProgress`를 밖에서 부를 수 있는 파이프라인 대역 */
function progressPipeline(): Pipeline & {
  progress: (stage: string, branch?: string) => void;
  finish: (result: PipelineResult) => void;
} {
  let release: (result: PipelineResult) => void = () => {};
  let send: (stage: string, branch?: string) => void = () => {};
  return {
    run: (_input, onProgress) =>
      new Promise<PipelineResult>((resolve) => {
        release = resolve;
        send = (stage, branch) =>
          (onProgress as unknown as (s: string, b?: string) => void)?.(stage, branch);
      }),
    progress: (stage, branch) => send(stage, branch),
    finish: (result) => release(result),
  };
}

// 결정적인 첫 줄들 (monologue.ts 각 풀의 앞쪽)
const SIGNALS_1 = "그날의 기록을 확인하는 중…";
const SIGNALS_2 = "하루를 되짚어보는 중…";
const VISION_1 = "오늘 찍은 사진들을 살펴보는 중…";

async function startWriting(pipeline: Pipeline) {
  await render(
    <DiaryHomeScreen
      barLockMs={0}
      now={NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={memoryStore()}
    />,
  );
  await userEvent.press(await screen.findByTestId("write-button"));
  await screen.findByTestId("stop-button");
}

const line = () => screen.getByTestId("writing-monologue-text");

describe("W9 — 간격 교체", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("★ 첫 진행 신호 전에는 「쓰고 있다」이고 시간이 지나도 바뀌지 않는다", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);
    jest.useFakeTimers();

    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs * 3);
    });

    expect(line()).toHaveTextContent("쓰고 있다");
  });

  it("★ 신호가 오면 그 단계 풀의 줄이 나오고, 간격마다 다음 줄로 바뀐다 (직전 줄 제외)", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);
    jest.useFakeTimers();

    await act(async () => pipeline.progress("signals"));
    expect(line()).toHaveTextContent(SIGNALS_1);

    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs - 1);
    });
    expect(line()).toHaveTextContent(SIGNALS_1);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(line()).toHaveTextContent(SIGNALS_2);

    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs);
    });
    expect(line()).toHaveTextContent(SIGNALS_1); // 직전(SIGNALS_2)을 뺀 나머지의 첫 줄
  });

  it("★ 단계가 바뀌면 즉시 새 단계의 줄이 나오고 간격을 다시 센다 — 낡은 단계의 말이 남지 않는다", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);
    jest.useFakeTimers();

    await act(async () => pipeline.progress("signals"));
    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs - 1000);
    });

    await act(async () => pipeline.progress("vision"));
    expect(line()).toHaveTextContent(VISION_1);

    // 방금 단계가 바뀌었으므로 간격은 그때부터 다시 센다 — 남은 1초가 아니라 온전한 간격을 기다린다.
    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs - 1);
    });
    expect(line()).toHaveTextContent(VISION_1);
  });

  it("쓰는 중이 끝나면(그만두기) 타이머가 정리된다 — 늦게 울려도 화면이 바뀌지 않는다", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);
    jest.useFakeTimers();
    await act(async () => pipeline.progress("signals"));

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    jest.useRealTimers();
    await userEvent.press(screen.getByTestId("stop-button"));
    await screen.findByTestId("material-paper");
    jest.useFakeTimers();

    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs * 3);
    });
    expect(screen.queryByTestId("writing-monologue-text")).toBeNull();
  });
});

describe("W10 — 페이드 겹", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("줄이 바뀌면 이전 줄이 나가는 겹으로 남고 새 줄이 들어오는 겹이다", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);
    jest.useFakeTimers();
    await act(async () => pipeline.progress("signals"));

    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs);
    });

    expect(line()).toHaveTextContent(SIGNALS_2);
    expect(screen.getByTestId("writing-monologue-fade-out")).toHaveTextContent(SIGNALS_1);
  });

  it("★ 소스에 타자기가 없다 — TypewriterText·REVEAL·skipToEnd", () => {
    for (const file of ["src/ui/DiaryHomeScreen.tsx", "src/ui/WritingPaper.tsx"]) {
      const body = code(file);
      expect(body).not.toMatch(/TypewriterText|REVEAL|skipToEnd/);
    }
  });

  it("★ 페이드 시작값을 effect에서 되돌리지 않는다 — 겹은 줄마다 새로 마운트한다 (049 교훈)", () => {
    const paper = code("src/ui/WritingPaper.tsx");
    expect(paper).toMatch(/FadeLayer/);
    expect(paper).not.toMatch(/\.value\s*=\s*[01]\s*;/);
    expect(paper).toMatch(/key=\{`in-\$\{/);
    expect(paper).toMatch(/key=\{`out-\$\{/);
  });
});

describe("FR-007 — 교체 중에도 진행률이 없다", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("어느 줄이든 숫자·%·경과 표현이 화면에 없다", async () => {
    const pipeline = progressPipeline();
    await startWriting(pipeline);
    await act(async () => pipeline.progress("signals"));

    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toMatch(/\d+\s*%/);
    expect(rendered).not.toMatch(/\d+\s*(초|분)\s*(남|경과)/);
  });
});
