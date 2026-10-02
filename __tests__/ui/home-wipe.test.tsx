/**
 * 058 — 일기 모두 지우기 요청에 홈이 응답한다 (US2 — 쓰는 중이면 먼저 멈춘다).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md HS1~HS5, research R1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 설정(겹)에서 「지우기」를 확정하면 조립부가 `wipeRequest`를 올린다. 홈은 쓰는 중이면 054 그만두기처럼 멈추고 **도는
 * `pipeline.run`이 끝난 뒤에** `onWipeReady(token)`을 부른다 — 그래야 멈춘 쓰기가 지우기 뒤에 저장되지 않는다.
 * 쓰는 중으로 들어가는 길은 057 앱 열기 자동 쓰기(`autoWriteDay`)를 빌린다(가장 짧은 경로).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`·`rerender`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, render, screen, waitFor } from "@testing-library/react-native";

import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { withPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-09-28T22:15:00");
const TODAY = "2026-09-28";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

function once() {
  let claimed = false;
  return () => {
    if (claimed) return false;
    claimed = true;
    return true;
  };
}

/** 손으로 끝내는 파이프라인 — 멈춤과 run의 끝 사이를 본다 */
function heldPipeline() {
  let finish: (result: PipelineResult) => void = () => {};
  const run = jest.fn(
    () =>
      new Promise<PipelineResult>((resolve) => {
        finish = resolve;
      }),
  );
  return { pipeline: { run } as Pipeline, run, finish: (r: PipelineResult) => finish(r) };
}

const previewDay = async (day: string) => ({
  day,
  photos: { kind: "known" as const, count: 3 },
  places: { kind: "unknown" as const },
  photoAccess: "ok" as const,
});

function Home(props: {
  pipeline: Pipeline;
  stop?: () => Promise<void>;
  wipeRequest?: number;
  onWipeReady?: (token: number) => void;
  autoWriteDay?: string | null;
  claimAutoWrite?: () => boolean;
  covered?: boolean;
}) {
  return withPortal(
    <DiaryHomeScreen
      autoWriteDay={props.autoWriteDay ?? null}
      chosenDay={TODAY}
      claimAutoWrite={props.claimAutoWrite}
      covered={props.covered}
      now={() => NOW}
      onWipeReady={props.onWipeReady}
      pipeline={props.pipeline}
      previewDay={previewDay}
      resolution={resolved}
      resolve={resolveQuiet}
      stop={props.stop}
      store={memoryStore()}
      wipeRequest={props.wipeRequest}
    />,
  );
}

describe("★ HS1·HS2 — 쓰는 중이면 멈추고, run이 끝난 뒤에 응답한다", () => {
  it("stop → (run이 끝나기 전엔 응답 없음) → run 끝 → onWipeReady(1), 토스트 없음", async () => {
    const held = heldPipeline();
    const stop = jest.fn(async () => {});
    const onWipeReady = jest.fn();
    const claim = once();
    const { rerender } = await render(
      <Home
        autoWriteDay={TODAY}
        claimAutoWrite={claim}
        onWipeReady={onWipeReady}
        pipeline={held.pipeline}
        stop={stop}
        wipeRequest={0}
      />,
    );
    await screen.findByTestId("writing-paper");
    expect(held.run).toHaveBeenCalledTimes(1);

    await rerender(
      <Home
        autoWriteDay={TODAY}
        claimAutoWrite={claim}
        onWipeReady={onWipeReady}
        pipeline={held.pipeline}
        stop={stop}
        wipeRequest={1}
      />,
    );
    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
    expect(onWipeReady).not.toHaveBeenCalled();

    await act(async () => {
      held.finish({ ok: false, stage: "generation", reason: "interrupted" } as PipelineResult);
    });
    await waitFor(() => expect(onWipeReady).toHaveBeenCalledWith(1));
    expect(onWipeReady).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("failure-toast")).toBeNull();
  });
});

describe("HS3·HS4·HS5 — 쓰는 중이 아닐 때", () => {
  it("HS3 — 곧바로 응답한다", async () => {
    const { pipeline } = heldPipeline();
    const onWipeReady = jest.fn();
    const { rerender } = await render(
      <Home onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={0} />,
    );
    await screen.findByTestId("write-button");
    await rerender(<Home onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={2} />);
    await waitFor(() => expect(onWipeReady).toHaveBeenCalledWith(2));
  });

  it("HS4 — 같은 값으로 다시 그려도 한 번, 마운트 때의 값에는 응답하지 않는다", async () => {
    const { pipeline } = heldPipeline();
    const onWipeReady = jest.fn();
    const { rerender } = await render(
      <Home onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={3} />,
    );
    await screen.findByTestId("write-button");
    await rerender(<Home onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={3} />);
    expect(onWipeReady).not.toHaveBeenCalled();

    await rerender(<Home onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={4} />);
    await rerender(<Home onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={4} />);
    await waitFor(() => expect(onWipeReady).toHaveBeenCalledWith(4));
    expect(onWipeReady).toHaveBeenCalledTimes(1);
  });

  it("HS5 — 덮여 있어도 응답한다", async () => {
    const { pipeline } = heldPipeline();
    const onWipeReady = jest.fn();
    const { rerender } = await render(
      <Home covered onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={0} />,
    );
    await screen.findByTestId("write-button", { includeHiddenElements: true });
    await rerender(<Home covered onWipeReady={onWipeReady} pipeline={pipeline} wipeRequest={1} />);
    await waitFor(() => expect(onWipeReady).toHaveBeenCalledWith(1));
  });
});
