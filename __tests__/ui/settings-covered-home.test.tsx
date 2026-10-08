/**
 * 055 — 설정이 홈 위에 겹친 동안의 홈 (`DiaryHomeScreen`의 `covered`).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md S3·S4·S5·S9, spec FR-006~FR-009
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **가장 위험한 자리다.** 쓰는 중의 홈은 뒤로 가기를 「그만두기」로 가로챈다(054). 안드로이드 `BackHandler`는 나중에
 * 등록한 것부터 부르므로, 설정이 열린 뒤 홈의 effect가 다시 돌면 홈 핸들러가 앞에 서서 **설정의 뒤로 가기가 쓰기를
 * 멈춘다** — 오류 없는 조용한 결함(research R2). 그래서 `covered`인 동안 홈은 아예 등록하지 않는다. 이 파일이
 * 그것을 잠근다.
 *
 * 홈이 계속 살아 있어야 하는 것(쓰기·혼잣말)도 함께 본다 — 덮였다고 멈추면 「쓰는 중에도 열 수 있고 쓰기는 멈추지
 * 않음」(보드 `6a`)이 깨진다. ⚠️ RNTL 14의 `render`·`rerender`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineInput, PipelineResult } from "../../src/diary/pipeline";
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
const resolveNoReady = (): ResolveOutcome => ({ kind: "no-ready-character" });

type BackListener = () => boolean | null | undefined;

/** 살아 있는 `hardwareBackPress` 구독. `mockRestore`하지 않는다(AGENTS). */
function captureBackHandlers() {
  const live = new Set<BackListener>();
  jest.spyOn(BackHandler, "addEventListener").mockImplementation(((
    event: string,
    fn: BackListener,
  ) => {
    if (event === "hardwareBackPress") live.add(fn);
    return { remove: () => live.delete(fn) };
  }) as never);
  return live;
}

/** 입력을 모으고, 밖에서 끝내고, 진행 신호를 쏠 수 있는 파이프라인 대역 */
function recordingPipeline() {
  const inputs: PipelineInput[] = [];
  let release: (result: PipelineResult) => void = () => {};
  let send: (stage: string) => void = () => {};
  const pipeline: Pipeline = {
    run: jest.fn((input: PipelineInput, onProgress?: unknown) => {
      inputs.push(input);
      return new Promise<PipelineResult>((resolve) => {
        release = resolve;
        send = (stage) => (onProgress as ((s: string) => void) | undefined)?.(stage);
      });
    }) as unknown as Pipeline["run"],
  };
  return {
    pipeline,
    inputs,
    finish: (result: PipelineResult) => release(result),
    progress: (stage: string) => send(stage),
  };
}

type Props = {
  pipeline?: Pipeline;
  covered?: boolean;
  names?: Readonly<Partial<Record<"quiet", string>>>;
  stop?: () => Promise<void>;
  resolve?: (day: string) => ResolveOutcome;
};

const store = memoryStore();

function home({ pipeline, covered, names, stop, resolve }: Props) {
  return (
    <DiaryHomeScreen
      barLockMs={0}
      characterNames={names}
      covered={covered}
      now={NOW}
      pipeline={pipeline}
      resolution={resolved}
      resolve={resolve ?? resolveQuiet}
      stop={stop}
      store={store}
    />
  );
}

async function startWriting(props: Props) {
  const view = await render(home(props));
  await userEvent.press(await screen.findByTestId("write-button"));
  await screen.findByTestId("stop-button");
  return view;
}

describe("★ 055 S3 — 덮인 동안 홈은 뒤로 가기를 등록하지 않는다", () => {
  it("★ 쓰는 중에 덮이면 그만두기 핸들러가 빠지고, 걷히면 돌아온다", async () => {
    const live = captureBackHandlers();
    const { pipeline } = recordingPipeline();
    const view = await startWriting({ pipeline });
    expect(live.size).toBe(1);

    await view.rerender(home({ pipeline, covered: true }));
    expect(live.size).toBe(0);

    await view.rerender(home({ pipeline, covered: false }));
    expect(live.size).toBe(1);
  });

  it("쓰는 중에 처음부터 덮여 있어도 등록하지 않는다(effect가 다시 돌아도 앞에 서지 않는다)", async () => {
    const live = captureBackHandlers();
    const { pipeline } = recordingPipeline();
    const view = await startWriting({ pipeline });
    await view.rerender(home({ pipeline, covered: true }));
    // 다른 prop이 바뀌어 effect가 다시 돌 만한 리렌더 — 이름을 바꾼다.
    await view.rerender(home({ pipeline, covered: true, names: { quiet: "동이" } }));
    expect(live.size).toBe(0);
  });

  it("실패 안내 화면(쓰기 시작 전 막힘)도 덮이면 등록하지 않는다", async () => {
    const live = captureBackHandlers();
    const view = await render(
      home({ pipeline: recordingPipeline().pipeline, resolve: resolveNoReady }),
    );
    await userEvent.press(await screen.findByTestId("write-button"));
    await waitFor(() => expect(live.size).toBe(1));

    await view.rerender(
      home({ pipeline: recordingPipeline().pipeline, resolve: resolveNoReady, covered: true }),
    );
    expect(live.size).toBe(0);
  });
});

describe("★ 055 S4 — 덮인 동안 홈은 스크린리더·누름에서 빠진다", () => {
  it("covered면 홈 요소가 기본 쿼리에서 숨고, includeHiddenElements로는 남아 있다", async () => {
    captureBackHandlers();
    const view = await render(home({ pipeline: recordingPipeline().pipeline }));
    await screen.findByTestId("write-button");

    await view.rerender(home({ pipeline: recordingPipeline().pipeline, covered: true }));
    expect(screen.queryByTestId("write-button")).toBeNull();
    expect(screen.getByTestId("write-button", { includeHiddenElements: true })).toBeTruthy();

    const root = screen.getByTestId("diary-home-root", { includeHiddenElements: true });
    expect(root.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.pointerEvents).toBe("none");
  });

  it("covered가 아니면 평소와 같다", async () => {
    captureBackHandlers();
    await render(home({ pipeline: recordingPipeline().pipeline }));
    const root = await screen.findByTestId("diary-home-root");
    expect(root.props.importantForAccessibility).toBe("auto");
    expect(root.props.pointerEvents).toBe("auto");
  });
});

describe("★ 055 S5·FR-008 — 덮였다 걷혀도 쓰기는 이어진다", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("★ 덮고 걷어도 run은 한 번, stop은 0번이고 끝나면 홈이 결과를 반영한다", async () => {
    captureBackHandlers();
    const stop = jest.fn(async () => {});
    const rec = recordingPipeline();
    const view = await startWriting({ pipeline: rec.pipeline, stop });

    await view.rerender(home({ pipeline: rec.pipeline, stop, covered: true }));
    await view.rerender(home({ pipeline: rec.pipeline, stop, covered: false }));

    expect(rec.pipeline.run).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
    expect(screen.getByTestId("stop-button")).toBeTruthy();

    // 덮인 채로 끝나도(설정을 연 채) 홈은 쓰기 전 화면으로 돌아와 있다.
    await view.rerender(home({ pipeline: rec.pipeline, stop, covered: true }));
    await act(async () => rec.finish({ ok: false, reason: "generation-failed: x" } as never));
    await view.rerender(home({ pipeline: rec.pipeline, stop, covered: false }));
    await waitFor(() => expect(screen.queryByTestId("stop-button")).toBeNull());
    expect(stop).not.toHaveBeenCalled();
  });

  it("★ FR-008 — 덮인 동안에도 혼잣말이 간격마다 바뀐다", async () => {
    captureBackHandlers();
    jest.spyOn(Math, "random").mockReturnValue(0);
    const rec = recordingPipeline();
    const view = await startWriting({ pipeline: rec.pipeline });
    jest.useFakeTimers();
    await act(async () => rec.progress("signals"));
    await view.rerender(home({ pipeline: rec.pipeline, covered: true }));

    const line = () =>
      screen.getByTestId("writing-monologue-text", { includeHiddenElements: true });
    const before = line().props.children;
    await act(async () => {
      jest.advanceTimersByTime(WRITING.rotateMs);
    });
    expect(line().props.children).not.toEqual(before);
  });
});

describe("★ 055 S9·FR-009 — 쓰는 중에 바꾼 이름은 다음 일기부터", () => {
  it("진행 중인 run의 authorName은 그대로, 다음 run은 새 이름이다", async () => {
    captureBackHandlers();
    const rec = recordingPipeline();
    const view = await startWriting({ pipeline: rec.pipeline, names: { quiet: "금동이" } });
    expect(rec.inputs[0]?.authorName).toBe("금동이");

    await view.rerender(home({ pipeline: rec.pipeline, names: { quiet: "동이" }, covered: true }));
    expect(rec.inputs).toHaveLength(1);
    expect(rec.inputs[0]?.authorName).toBe("금동이");

    await act(async () => rec.finish({ ok: false, reason: "generation-failed: x" } as never));
    await view.rerender(home({ pipeline: rec.pipeline, names: { quiet: "동이" } }));
    await userEvent.press(await screen.findByTestId("write-button"));
    await waitFor(() => expect(rec.inputs).toHaveLength(2));
    expect(rec.inputs[1]?.authorName).toBe("동이");
  });
});
