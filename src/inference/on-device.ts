/**
 * 온디바이스 추론 어댑터.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/inference.md (isAvailable)
 *       specs/005-diary-generation/contracts/engine.md (generate)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **005에서 `generate()`가 채워졌다.** 002가 `not-implemented`를 반환하도록 둔 자리에
 * 실제 흐름이 들어왔고, 그 결과 파이프라인이 처음으로 `generation`을 지난다.
 *
 * 흐름은 이렇다(data-model.md 「생성 한 번의 흐름」):
 *
 *   시각 설정 검사 → buildPrompt → engine.load → engine.run → judge → unload
 *
 * **`unload()`가 흐름 바깥(finally)에 있는 것이 중요하다**(engine.md E2). 성공 경로에만
 * 두면 실패에서 새고, 새면 다음 요청이 메모리 부족으로 죽는다.
 *
 * **판정이 이 안에 있는 것도 의도적이다**(research.md §5). 파이프라인에 두면 거부될
 * 텍스트를 담은 `DiaryDraft`가 존재하는 순간이 생기고, 존재하면 언젠가 누가 그것을 쓴다.
 * 여기서 판정하면 **`DiaryDraft`는 통과한 글만 담는 타입**이 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { judge } from "../diary/acceptance";
import { buildPrompt, instructionLines } from "../diary/prompt";
import type { DiaryRequest } from "../diary/types";
import type { GenerationEngine, RunResult } from "./engine-port";
import { llamaEngine } from "./llama-port";
import { GENERATION_TIMEOUT_MS } from "./sampling";
import type { GenerationResult, InferenceBackend, ModuleStatus } from "./types";

/** 네이티브 백엔드 장치 정보를 조회하는 함수. 테스트에서 주입한다. */
export type BackendProbe = () => Promise<unknown>;

/**
 * 끊을 수 있는 어댑터.
 *
 * **002의 `InferenceBackend`를 넓히지 않는다**(FR-025). 데스크톱 경로에는 끊을 것이
 * 없고, 파이프라인도 이것을 알 필요가 없다 — 화면만 쓴다(FR-021b).
 */
export type StoppableBackend = InferenceBackend & { stop(): Promise<void> };

/**
 * 네이티브 모듈 부재를 나타내는 오류인지 판정한다.
 *
 * 시뮬레이터에는 네이티브 모듈이 없다. 이것은 결함이 아니라 local 환경의 전제이므로
 * failed가 아니라 unavailable로 다룬다(User Story 2 시나리오 3).
 */
function isModuleMissing(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("native module") ||
    normalized.includes("not available") ||
    normalized.includes("is null") ||
    normalized.includes("undefined is not an object")
  );
}

/**
 * 시간 한도 안에서 생성한다 (FR-021).
 *
 * 한도를 넘으면 `stop()`을 부르고 `timeout`으로 끝낸다. 네이티브가 시간 한도를 주지
 * 않으므로 어댑터가 잰다(engine.md 「시간 한도」).
 *
 * **재는 것과 기록하는 것은 다르다**(FR-011). 한도를 위해 시간을 보는 것은 필요하고,
 * 그 값을 결과에 담거나 저장하는 것이 금지다 — 그래서 여기서 잰 시간은 어디에도 남지
 * 않고 버려진다.
 */
async function runWithTimeout(
  engine: GenerationEngine,
  prompt: string,
  timeoutMs: number,
): Promise<{ timedOut: false; run: RunResult } | { timedOut: true }> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => {
      // 결과를 기다리지 않는다 — stop()이 듣지 않을 수도 있고(research §2), 그때도
      // 사용자를 붙잡아 두지 않는 것이 낫다.
      void engine.stop().catch(() => {});
      resolve({ timedOut: true });
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      engine.run(prompt, { timeoutMs }).then((run) => ({ timedOut: false as const, run })),
      timeout,
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * 온디바이스 어댑터를 만든다.
 *
 * `probe`와 `engine`을 주입받아 테스트에서 기기 없이 검증할 수 있게 한다 — 001이
 * `probe`를 주입받은 것과 같은 구조이며, 005가 `engine`을 같은 방식으로 더했다.
 *
 * **`engine`이 없으면 생성을 시도하지 않는다.** 시뮬레이터·웹에서 네이티브 모듈이 없는
 * 경우이며, 그때는 `backend-unavailable`이 정직한 답이다(원칙 I — 없는 것을 없다고
 * 말한다).
 */
export function createOnDeviceBackend(
  probe: BackendProbe,
  engine?: GenerationEngine,
  timeoutMs: number = GENERATION_TIMEOUT_MS,
): StoppableBackend {
  return {
    location: "on-device",

    /**
     * 도는 생성을 끊는다 (FR-021b).
     *
     * **`InferenceBackend`에 없는 것을 더한 것이다.** 002의 계약을 넓히지 않기 위해
     * 별도 타입(`StoppableBackend`)으로 두었고, 화면은 있는 경우에만 부른다.
     *
     * 끊김은 예외가 아니라 `interrupted: true`인 값으로 돌아오며(research §2), 판정이
     * `unfinished`로 거부한다. 그래서 여기서는 신호만 보내면 된다.
     */
    async stop(): Promise<void> {
      await engine?.stop().catch(() => {});
    },

    async isAvailable(): Promise<ModuleStatus> {
      try {
        await probe();
        return { kind: "loaded" };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        // 예외를 삼키지 않는다(FR-007). 실패는 값으로 표현되어 진단에 실린다.
        return isModuleMissing(reason)
          ? { kind: "unavailable", reason }
          : { kind: "failed", reason };
      }
    },

    /**
     * 일기를 생성한다.
     *
     * **어느 실패 갈래에도 `text`가 없다**(002 FR-016). 거부된 글도, 끊긴 부분 출력도
     * 밖으로 나가지 않는다(FR-017c, FR-021c).
     */
    async generate(request: DiaryRequest): Promise<GenerationResult> {
      // 0. 시각 설정 — 사진을 보겠다고 했는데 보지 않은 일기를 주지 않는다(FR-022).
      //
      // **`none`으로 조용히 낮추지 않는다.** 낮추는 한 줄이 들어가면 다음 기능까지 남아
      // 「본다고 했는데 안 보는」 버그가 된다(001 FR-009c·003 FR-008a와 같은 판단).
      if (request.vision !== "none") {
        return { kind: "not-implemented" };
      }

      if (engine === undefined) {
        return {
          kind: "backend-unavailable",
          reason: "네이티브 추론 모듈이 없어 생성을 시도하지 않았다",
        };
      }

      // 1. 프롬프트를 만든다. 순수 함수이며 기기를 모른다.
      const prompt = buildPrompt(request);

      // 2. 모델을 연다. 실패하면 **다른 캐릭터로 대신하지 않는다**(FR-010).
      const loaded = await engine.load(request.character);
      if (!loaded.ok) {
        return { kind: "model-load-failed", reason: loaded.reason };
      }

      try {
        // 3. 생성한다. 시간 한도를 감시한다(FR-021).
        const run = await runWithTimeout(engine, prompt, timeoutMs);
        if (run.timedOut) {
          return { kind: "timed-out" };
        }

        // 4. 판정한다. **여기가 원칙 I의 마지막 방어선이다.**
        const verdict = judge(
          run.run.text,
          run.run.ending,
          request.character,
          instructionLines(request),
        );

        if (!verdict.ok) {
          // 끊긴 것은 별도 갈래로 말한다 — 사용자가 할 일이 다르다(FR-017d).
          // 앱을 떠나서 끊긴 것이지 모델이 이상한 글을 쓴 것이 아니다.
          if (run.run.ending.kind === "interrupted") return { kind: "interrupted" };
          return { kind: "rejected", why: verdict.why };
        }

        return { text: run.run.text };
      } catch (error) {
        // 예외를 던지지 않는다(engine.md E5). 실패는 값이어야 파이프라인이 어느
        // 단계에서 멈췄는지 말할 수 있다(002 FR-019).
        const reason = error instanceof Error ? error.message : String(error);
        return { kind: "generation-failed", reason };
      } finally {
        // **성공·실패·예외 어느 경로로도 정리된다**(E2). 정리되지 않으면 다음 요청이
        // 메모리 부족으로 죽는다 — 실패 경로에서 잊기 가장 쉬운 자리다.
        await engine.unload().catch(() => {});
      }
    },
  };
}

/**
 * 실제 llama.rn을 쓰는 어댑터.
 *
 * 모듈 해석 자체가 실패할 수 있으므로(시뮬레이터·웹) 지연 import 한다.
 */
export function onDeviceBackend(): StoppableBackend {
  return createOnDeviceBackend(
    async () => {
      const llama = await import("llama.rn");
      return llama.getBackendDevicesInfo();
    },
    // 005가 더한 것. `llamaEngine()` 자체는 지연 import를 안에서 하므로 여기서
    // 만들어도 시뮬레이터에서 모듈 해석이 터지지 않는다.
    llamaEngine(),
  );
}
