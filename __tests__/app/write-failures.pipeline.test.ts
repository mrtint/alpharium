/**
 * 쓰기 실패의 갈래가 **진짜 파이프라인을 거쳐** 선다 (081, contracts/write-failure-reasons.md F8).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일은 이유 문자열을 손으로 쓰지 않는다.** 060의 `empty` 갈래는 081 전까지 앱에서 한 번도 서지 않았다 — 파이프라인이
 * 판정 거부의 까닭(`why`)을 이유에 싣지 않았는데, 갈래 테스트들은 `"rejected: empty"`를 손으로 써 넣어 전부 초록이었다.
 * 두 부품이 같은 값을 나눠 쓰면 그 값을 실제로 나눠 쓰는 조립으로 한 번은 테스트한다(080의 교훈).
 *
 * 여기서 쓰는 것은 어댑터가 돌려주는 실패 값(`GenerationFailure`)뿐이고, 그것이 `createPipeline()`을 지나 나온 결과를 그대로
 * `writeFailureReasonFor()`·`recordWriteFailure()`에 넣는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  loadWriteFailures,
  recordWriteFailure,
  writeFailureReasonFor,
  type WriteFailurePort,
  type WriteFailureReason,
} from "../../src/app/write-failures";
import type { DayDate } from "../../src/config/day-boundary";
import { REJECT_REASONS } from "../../src/diary/acceptance";
import { createPipeline } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { Character, VisionSetting } from "../../src/diary/types";
import type { GenerationFailure, InferenceBackend } from "../../src/inference/types";
import { partiallyUnknownDay } from "../../src/signals/fake";

const AFTER_CLOSE = new Date("2026-08-13T06:00:00");
const DAY: DayDate = "2026-08-12";

function backendFailing(failure: GenerationFailure): InferenceBackend {
  return {
    location: "on-device",
    async isAvailable() {
      return { kind: "loaded" };
    },
    async generate() {
      return failure;
    },
  };
}

/** 실패하는 백엔드로 진짜 파이프라인을 한 번 돌린다. 실패가 아니면 테스트가 틀린 것이다. */
async function runFailing(failure: GenerationFailure) {
  const pipeline = createPipeline({
    backend: backendFailing(failure),
    store: memoryStore(),
    loadSignals: async (day) => partiallyUnknownDay(day),
  });
  const result = await pipeline.run({
    day: DAY,
    now: AFTER_CLOSE,
    character: "quiet" as Character,
    vision: "quick" as VisionSetting,
  });
  if (result.ok) throw new Error("실패하는 백엔드인데 쓰기가 성공했다");
  return result;
}

const CASES: [GenerationFailure, WriteFailureReason][] = [
  [{ kind: "rejected", why: "empty" }, "empty"],
  [{ kind: "rejected", why: "echo" }, "echo"],
  [{ kind: "rejected", why: "language" }, "language"],
  [{ kind: "rejected", why: "unfinished" }, "unfinished"],
  [{ kind: "timed-out" }, "timed-out"],
  [{ kind: "interrupted" }, "interrupted"],
  [{ kind: "generation-failed", reason: "Context is busy: rejected: echo" }, "error"],
  [{ kind: "vision-failed", reason: "cancelled" }, "interrupted"],
  [{ kind: "vision-failed", reason: "failed" }, "vision"],
  [{ kind: "vision-failed", reason: "not-ready" }, "module"],
  [{ kind: "model-load-failed", reason: "not-found" }, "module"],
  [{ kind: "model-load-failed", reason: "load-failed" }, "module"],
  [{ kind: "not-implemented" }, "unwritten"],
  [{ kind: "backend-unavailable", reason: "네이티브 추론 모듈이 없다" }, "unwritten"],
];

describe("081 F8 — 어댑터의 실패가 파이프라인을 지나 갈래로 선다", () => {
  it.each(CASES)("%j → %s", async (failure, expected) => {
    const result = await runFailing(failure);

    expect(writeFailureReasonFor(result)).toBe(expected);
  });

  it("110 — 신호를 못 가져온 쓰기(`loadSignals`가 null)는 `signals`로 선다(사진 캡션 실패 `vision`과 다르다)", async () => {
    const pipeline = createPipeline({
      backend: backendFailing({ kind: "timed-out" }),
      store: memoryStore(),
      loadSignals: async () => null,
    });
    const result = await pipeline.run({
      day: DAY,
      now: AFTER_CLOSE,
      character: "quiet" as Character,
      vision: "quick" as VisionSetting,
    });
    if (result.ok) throw new Error("신호가 없는데 쓰기가 성공했다");

    expect(writeFailureReasonFor(result)).toBe("signals");
  });

  it("판정의 갈래 넷이 빠짐없이 각자의 기록 갈래로 선다", async () => {
    const reasons: WriteFailureReason[] = [];
    for (const why of REJECT_REASONS) {
      reasons.push(writeFailureReasonFor(await runFailing({ kind: "rejected", why })));
    }
    expect(reasons).toEqual([...REJECT_REASONS]);
  });

  it("파이프라인의 결과를 그대로 기록하면 그 갈래가 파일에 남는다", async () => {
    let content: string | null = null;
    const port: WriteFailurePort = {
      async read() {
        return content;
      },
      async write(serialized) {
        content = serialized;
      },
    };

    await recordWriteFailure(
      port,
      await runFailing({ kind: "rejected", why: "echo" }),
      AFTER_CLOSE,
    );
    await recordWriteFailure(port, await runFailing({ kind: "timed-out" }), AFTER_CLOSE);

    expect((await loadWriteFailures(port)).map((item) => item.reason)).toEqual([
      "timed-out",
      "echo",
    ]);
  });
});
