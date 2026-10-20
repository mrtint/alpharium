/**
 * 092 CW4·CW5 — 홈의 쓰기와 iPhone 이어 쓰기 세션.
 *
 * 계약: specs/092-ios-continued-write/contracts/continued-write.md CW4·CW5, spec FR-001·FR-006·FR-007·FR-008
 *
 * 홈은 네이티브를 모른다 — 조립부(`App.tsx`)가 iOS에서만 세션(`continuedWrite`)을 준다. 홈이 시작한 쓰기는 시작할 때 신청하고, 진행
 * 단계를 넘기고, 끝나면 성패로 닫는다. **받아들여진 쓰기는 앞을 벗어나도 끊지 않는다**(005 FR-014b의 예외). 만료면 끊고(기록 「도중에
 * 끊김」), 그만두기·지우기는 실패로 닫는다. 진단의 수동 실행(060)은 신청하지 않는다.
 *
 * ⚠️ `AppState`는 jest에서 이벤트를 낼 수 없다 — 등록된 핸들러를 꺼내 부른다(diary-home.test.tsx와 같은 방식, 스파이는 되돌리지 않는다).
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import type { ContinuedSession, ContinuedWrite } from "../../src/app/continued-write";
import type { PipelineFailure } from "../../src/app/failure-toast";
import type { ResolveOutcome } from "../../src/app/resolve-generation";
import type { EnvironmentResolution } from "../../src/config/types";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { ProgressStage } from "../../src/inference/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const NOW = new Date("2026-10-20T22:15:00");
const DAY = "2026-10-19";

const resolveQuiet = (day: string): ResolveOutcome => ({
  kind: "resolved",
  params: { character: "quiet", day: day as never, hasPhotos: true, geocodingEnabled: false },
});

const entry: DiaryEntry = {
  date: DAY,
  title: "제목",
  text: "본문이다.",
  character: "quiet",
  signalsUsed: {
    date: DAY,
    photos: { kind: "none" },
    places: { kind: "none" },
    steps: { kind: "unknown", reason: "x" },
    battery: { kind: "unknown", reason: "x" },
    connectivity: { kind: "unknown", reason: "x" },
  },
  createdAt: NOW,
};

const INTERRUPTED: PipelineResult = {
  ok: false,
  stage: "generation",
  reason: "interrupted: 생성이 끊겼다",
};

/** 끝을 손으로 정하는 파이프라인 — 진행 콜백을 잡아 둔다 */
function controlledPipeline() {
  let finish: (result: PipelineResult) => void = () => {};
  let progress: ((stage: ProgressStage) => void) | undefined;
  const run = jest.fn(
    (_input: unknown, onProgress?: (stage: ProgressStage) => void) =>
      new Promise<PipelineResult>((resolve) => {
        progress = onProgress;
        finish = resolve;
      }),
  );
  return {
    pipeline: { run } as unknown as Pipeline,
    run,
    progress: (stage: ProgressStage) => progress?.(stage),
    finish: async (result: PipelineResult) => {
      await act(async () => {
        finish(result);
      });
    },
  };
}

/** 세션 대역 — 무엇이 불렸는지 차례대로 적는다 */
function fakeContinued(accepted = true) {
  const log: unknown[][] = [];
  let expire: () => void = () => {};
  const continued: ContinuedWrite = {
    start: jest.fn(async (write: { name: string; day: string }, onExpired: () => void) => {
      log.push(["start", write.name, write.day]);
      expire = onExpired;
      const session: ContinuedSession = {
        accepted,
        progress: (stage) => log.push(["progress", stage]),
        finish: (ok) => log.push(["finish", ok]),
      };
      return session;
    }) as ContinuedWrite["start"],
  };
  return {
    continued,
    log,
    expire: async () => {
      await act(async () => {
        expire();
      });
    },
  };
}

async function background() {
  const handler = (AppState.addEventListener as jest.Mock).mock.calls
    .filter(([event]) => event === "change")
    .at(-1)?.[1] as (state: string) => void;
  expect(handler).toBeDefined();
  await act(async () => {
    handler("background");
    await Promise.resolve();
    await Promise.resolve();
  });
}

type Over = {
  pipeline: Pipeline;
  continued?: ContinuedWrite;
  stop?: () => Promise<void>;
  recordFailure?: (result: PipelineFailure) => void;
  onContinuedSaved?: (day: string, character: string) => Promise<void>;
  writeRequest?: { id: number; day: string } | null;
  wipeRequest?: number;
  onWipeReady?: (token: number) => void;
};

function element(over: Over, store = memoryStore()) {
  return (
    <DiaryHomeScreen
      barLockMs={0}
      now={() => NOW}
      pipeline={over.pipeline}
      resolution={resolved}
      resolve={resolveQuiet}
      store={store}
      chosenDay={DAY}
      characterNames={{ quiet: "금동이" }}
      stop={over.stop}
      recordFailure={over.recordFailure}
      continuedWrite={over.continued}
      onContinuedSaved={over.onContinuedSaved as never}
      writeRequest={over.writeRequest as never}
      wipeRequest={over.wipeRequest}
      onWipeReady={over.onWipeReady}
    />
  );
}

async function startWriting() {
  fireEvent.press(await screen.findByTestId("write-button"));
  expect(await screen.findByTestId("writing-paper")).toBeTruthy();
}

beforeAll(() => {
  jest.spyOn(AppState, "addEventListener");
});

describe("092 CW4 — 시작·단계·닫기", () => {
  it("시작할 때 이름·날로 신청하고, 단계를 넘기고, 성공이면 참으로 닫는다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued();
    await renderWithPortal(element({ pipeline: p.pipeline, continued: c.continued }));
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalledTimes(1));
    expect(c.log[0]).toEqual(["start", "금동이", DAY]);

    await act(async () => {
      p.progress("signals");
      p.progress("vision");
    });
    await p.finish({ ok: true, entry, overwrote: false });
    await waitFor(() => expect(c.log.at(-1)).toEqual(["finish", true]));
    expect(c.log).toEqual([
      ["start", "금동이", DAY],
      ["progress", "signals"],
      ["progress", "vision"],
      ["finish", true],
    ]);
  });

  it("실패면 거짓으로 닫는다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued();
    await renderWithPortal(element({ pipeline: p.pipeline, continued: c.continued }));
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await p.finish({ ok: false, stage: "generation", reason: "echo" });
    await waitFor(() => expect(c.log.at(-1)).toEqual(["finish", false]));
  });

  it("세션 신청이 끝나기 전에는 파이프라인을 부르지 않는다(신청 → 쓰기)", async () => {
    const p = controlledPipeline();
    let release: () => void = () => {};
    const continued: ContinuedWrite = {
      start: jest.fn(
        () =>
          new Promise<ContinuedSession>((resolve) => {
            release = () => resolve({ accepted: true, progress: () => {}, finish: () => {} });
          }),
      ),
    };
    await renderWithPortal(element({ pipeline: p.pipeline, continued }));
    await startWriting();
    expect(p.run).not.toHaveBeenCalled();
    await act(async () => release());
    await waitFor(() => expect(p.run).toHaveBeenCalledTimes(1));
  });
});

describe("092 CW4 — 앞을 벗어날 때 (005 FR-014b의 예외)", () => {
  it("받아들여진 쓰기는 앞을 벗어나도 stop()하지 않는다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const stop = jest.fn(async () => {});
    await renderWithPortal(element({ pipeline: p.pipeline, continued: c.continued, stop }));
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await background();
    expect(stop).not.toHaveBeenCalled();
  });

  it("거절된 쓰기는 종전대로 stop()한다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(false);
    const stop = jest.fn(async () => {});
    await renderWithPortal(element({ pipeline: p.pipeline, continued: c.continued, stop }));
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await background();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("세션이 없으면(안드로이드) 종전대로 stop()한다", async () => {
    const p = controlledPipeline();
    const stop = jest.fn(async () => {});
    await renderWithPortal(element({ pipeline: p.pipeline, stop }));
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await background();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("쓰기가 끝난 뒤의 앞 벗어남은 다음 쓰기에 이어지지 않는다 — 다음 거절된 쓰기는 다시 끊긴다", async () => {
    const p = controlledPipeline();
    let accepted = true;
    const continued: ContinuedWrite = {
      start: jest.fn(async () => ({ accepted, progress: () => {}, finish: () => {} })),
    };
    const stop = jest.fn(async () => {});
    await renderWithPortal(element({ pipeline: p.pipeline, continued, stop }));
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalledTimes(1));
    await p.finish({ ok: true, entry, overwrote: false });
    accepted = false;
    // 대역 파이프라인은 저장하지 않는다 — 그 날은 아직 안 쓴 날이라 덮어쓰기 확인 없이 다시 쓴다.
    fireEvent.press(await screen.findByTestId("write-button"));
    await waitFor(() => expect(p.run).toHaveBeenCalledTimes(2));
    await background();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});

describe("092 FR-006 — 만료·그만두기·지우기", () => {
  // jest의 AppState 대역은 `currentState`를 값이 아닌 것으로 둔다 — 값으로 덮었다가 되돌린다.
  const original = Object.getOwnPropertyDescriptor(AppState, "currentState");
  const appStateNow = (value: string) =>
    Object.defineProperty(AppState, "currentState", { value, configurable: true, writable: true });
  afterEach(() => {
    if (original !== undefined) Object.defineProperty(AppState, "currentState", original);
  });

  it("앞에 있을 때의 만료는 끊지 않는다 — 이어 하기만 잃어, 그 뒤 앞을 벗어나면 종전대로 끊긴다(코드 리뷰)", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const stop = jest.fn(async () => {});
    appStateNow("active");
    await renderWithPortal(element({ pipeline: p.pipeline, continued: c.continued, stop }));
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await c.expire();
    expect(stop).not.toHaveBeenCalled();
    await background();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("만료로 잃은 쓰기가 저장돼도 onContinuedSaved를 부르지 않는다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const onContinuedSaved = jest.fn(async () => {});
    appStateNow("active");
    await renderWithPortal(
      element({ pipeline: p.pipeline, continued: c.continued, onContinuedSaved }),
    );
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await c.expire();
    await p.finish({ ok: true, entry, overwrote: false });
    await waitFor(() => expect(c.log.at(-1)).toEqual(["finish", true]));
    expect(onContinuedSaved).not.toHaveBeenCalled();
  });

  it("뒤에 있을 때 만료면 stop()하고, 끊긴 결과를 쓰기 실패로 기록한다(그만두기가 아니다)", async () => {
    appStateNow("background");
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const recordFailure = jest.fn();
    const stop = jest.fn(async () => {
      await p.finish(INTERRUPTED);
    });
    await renderWithPortal(
      element({ pipeline: p.pipeline, continued: c.continued, stop, recordFailure }),
    );
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await c.expire();
    await waitFor(() => expect(recordFailure).toHaveBeenCalledWith(INTERRUPTED));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(c.log.at(-1)).toEqual(["finish", false]);
  });

  it("그만두기는 기록하지 않고 거짓으로 닫는다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const recordFailure = jest.fn();
    const stop = jest.fn(async () => {
      await p.finish(INTERRUPTED);
    });
    await renderWithPortal(
      element({ pipeline: p.pipeline, continued: c.continued, stop, recordFailure }),
    );
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    fireEvent.press(await screen.findByText("그만두기"));
    await waitFor(() => expect(c.log.at(-1)).toEqual(["finish", false]));
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("지우기 요청은 멈추고 거짓으로 닫은 뒤 응답한다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const stop = jest.fn(async () => {
      await p.finish(INTERRUPTED);
    });
    const onWipeReady = jest.fn();
    const store = memoryStore();
    const view = await renderWithPortal(
      element({ pipeline: p.pipeline, continued: c.continued, stop, onWipeReady }, store),
    );
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await view.rerender(
      element(
        { pipeline: p.pipeline, continued: c.continued, stop, onWipeReady, wipeRequest: 1 },
        store,
      ),
    );
    await waitFor(() => expect(onWipeReady).toHaveBeenCalledWith(1));
    expect(c.log.at(-1)).toEqual(["finish", false]);
  });
});

describe("092 — 진단 수동 실행은 신청하지 않는다", () => {
  it("writeRequest의 쓰기는 start를 부르지 않고 앞을 벗어나면 끊긴다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const stop = jest.fn(async () => {});
    await renderWithPortal(
      element({
        pipeline: p.pipeline,
        continued: c.continued,
        stop,
        writeRequest: { id: 1, day: DAY },
      }),
    );
    expect(await screen.findByTestId("writing-paper")).toBeTruthy();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    expect(c.continued.start).not.toHaveBeenCalled();
    await background();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});

describe("092 CW5 — 받아들여진 쓰기의 저장", () => {
  it("성공이면 닫기 전에 onContinuedSaved(날, 캐릭터)를 기다린다", async () => {
    const p = controlledPipeline();
    const c = fakeContinued(true);
    const onContinuedSaved = jest.fn(async (day: string, character: string) => {
      c.log.push(["saved", day, character]);
    });
    await renderWithPortal(
      element({ pipeline: p.pipeline, continued: c.continued, onContinuedSaved }),
    );
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await p.finish({ ok: true, entry, overwrote: false });
    await waitFor(() => expect(c.log.at(-1)).toEqual(["finish", true]));
    expect(c.log.slice(-2)).toEqual([
      ["saved", DAY, "quiet"],
      ["finish", true],
    ]);
  });

  it.each([
    ["거절된 쓰기", false, { ok: true, entry, overwrote: false } as PipelineResult],
    ["실패", true, { ok: false, stage: "generation", reason: "echo" } as PipelineResult],
  ])("%s면 부르지 않는다", async (_label, accepted, result) => {
    const p = controlledPipeline();
    const c = fakeContinued(accepted);
    const onContinuedSaved = jest.fn(async () => {});
    await renderWithPortal(
      element({ pipeline: p.pipeline, continued: c.continued, onContinuedSaved }),
    );
    await startWriting();
    await waitFor(() => expect(p.run).toHaveBeenCalled());
    await p.finish(result);
    await waitFor(() => expect(c.log.at(-1)?.[0]).toBe("finish"));
    expect(onContinuedSaved).not.toHaveBeenCalled();
  });
});
