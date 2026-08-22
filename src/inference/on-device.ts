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
import { captionAll, type PhotoPathResolver } from "../vision/caption";
import { selectForVision } from "../vision/select";
import type { PhotoVision, VisionDepth, VisionOutcome } from "../vision/types";
import { createVisionEngine, type VisionEngine } from "../vision/vision-port";
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
 * 사진을 읽는 데 필요한 것 (011).
 *
 * **`InferenceBackend`를 넓히지 않는다** — 007이 `StoppableBackend`를 따로 둔 것과 같은
 * 방식이며, 데스크톱 경로에는 이것이 없다.
 *
 * `resolvePath`가 밖에서 오는 까닭: 004의 `Photo.id`는 미디어 라이브러리 id일 수도
 * 파일 경로일 수도 있고, 네이티브가 읽으려면 실제 경로가 필요하다.
 */
export type VisionSupport = {
  engine: VisionEngine;
  resolvePath: PhotoPathResolver;
};

/**
 * 사진을 읽는다. **연 것을 반드시 닫는다**(E2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`finally`가 이 함수의 핵심이다.**
 *
 * 005의 E2보다 결과가 나쁘다: 그때는 **다음 요청**이 메모리 부족으로 죽었고, 여기서는
 * **같은 요청 안에서** 캐릭터 모델을 열다 죽는다. 정리를 잊으면 사진을 본 일기가 한
 * 번도 나오지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function readPhotos(
  vision: VisionSupport,
  request: DiaryRequest,
  cancel: { cancelled: boolean },
): Promise<VisionOutcome> {
  // 004가 사진을 못 봤으면(`none`·`unknown`) 읽을 것이 없다.
  //
  // **004의 두 갈래를 뭉개지 않는다** — 프롬프트는 `photos` 신호를 여전히 그대로 적으며
  // (「없었다」 / 「모른다」), 이 값은 「그래서 캡션 단계를 돌지 않았다」는 뜻일 뿐이다.
  const photos = request.signals.photos;
  if (photos.kind !== "known" || photos.value.photos.length === 0) {
    return { kind: "no-photos" };
  }

  // 깊이는 설정에서 온다. `none`은 위에서 걸러졌다.
  const depth: VisionDepth = request.vision === "detailed" ? "detailed" : "quick";

  const loaded = await vision.engine.load(depth);
  if (!loaded.ok) {
    // **없는 것을 없다고 말한다**(원칙 I). 대신 쓸 모델을 찾지 않는다.
    return loaded.reason === "not-found"
      ? { kind: "not-ready", reason: "사진을 보는 데 필요한 것이 아직 준비되지 않았다" }
      : { kind: "failed", reason: "사진을 보는 것을 시작하지 못했다" };
  }

  try {
    const selected = selectForVision(photos.value.photos);
    const result = await captionAll(
      vision.engine,
      selected,
      photos.value.photos.length,
      vision.resolvePath,
      cancel,
    );

    // `null`은 그만둔 것이다 — 거기까지 읽은 것을 버린다(FR-009).
    return result === null ? { kind: "cancelled" } : { kind: "seen", vision: result };
  } catch (error) {
    return { kind: "failed", reason: error instanceof Error ? error.message : String(error) };
  } finally {
    // ★ **성공·실패·예외 어느 경로로도 닫는다.** 닫지 않으면 바로 아래에서 캐릭터
    // 모델을 열 때 메모리가 모자라 죽는다.
    await vision.engine.unload().catch(() => {});
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
  vision?: VisionSupport,
): StoppableBackend {
  /**
   * 그만두라는 신호. **캡션 단계와 생성 단계가 함께 본다.**
   *
   * 007이 생성에 만든 「그만두기」가 사진을 읽는 동안에도 들어야 한다 — 캡션이 약 10초
   * 걸리므로(research §6) **사용자가 기다리는 시간의 대부분이 이 단계다.**
   */
  let cancel = { cancelled: false };

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
      // 011 — **캡션 단계도 끊는다.** 사용자가 기다리는 시간의 대부분이 그 단계이고,
      // 여기서 신호를 세우지 않으면 「그만두기」를 눌러도 사진 다섯 장을 다 읽는다.
      cancel.cancelled = true;
      await vision?.engine.stop().catch(() => {});
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
      //
      // **011이 이 자리를 채웠다.** 사진 읽기를 붙일 수단이 없으면 여전히 거부한다 —
      // 시뮬레이터·웹에서 네이티브가 없는 경우이며, 그때는 못 한다고 말하는 것이 정직하다.
      if (request.vision !== "none" && vision === undefined) {
        return { kind: "not-implemented" };
      }

      // 새 요청이 시작되므로 지난 요청의 그만두기 신호를 물려받지 않는다.
      cancel = { cancelled: false };

      if (engine === undefined) {
        return {
          kind: "backend-unavailable",
          reason: "네이티브 추론 모듈이 없어 생성을 시도하지 않았다",
        };
      }

      // ─────────────────────────────────────────────────────────────────────
      // 0b. 사진을 읽는다 (011).
      //
      // **★ E1 — 캐릭터 모델을 열기 전에 끝내고 완전히 닫는다.**
      //
      // `engine-port.ts`의 E1이 「한 번에 하나만 열린다」를 요구한다. 두 엔진이 서로를
      // 모르므로 **호출자인 이 자리가 순서를 지킨다** — 여기서 어기면 GB 단위 모델 둘이
      // 동시에 열려 **기기가 죽는다.**
      //
      // **캐릭터 모델을 여는 것보다 먼저인 까닭**은 위 순서 그 자체이고, **모델 준비
      // 검사(파이프라인 4b)보다 나중인 까닭**은 캐릭터가 없는데 10초를 쓰지 않기
      // 위해서다.
      // ─────────────────────────────────────────────────────────────────────
      let seen: PhotoVision | undefined;
      if (request.vision !== "none" && vision !== undefined) {
        const outcome = await readPhotos(vision, request, cancel);

        // **「보지 않음」으로 낮추지 않는다**(FR-021). 실패는 실패로 돌려준다.
        if (outcome.kind === "not-ready") return { kind: "vision-failed", reason: "not-ready" };
        if (outcome.kind === "failed") return { kind: "vision-failed", reason: "failed" };
        if (outcome.kind === "cancelled") return { kind: "vision-failed", reason: "cancelled" };

        // `skipped`·`no-photos`는 실패가 아니다 — 볼 것이 없었을 뿐이며 일기는 나온다.
        if (outcome.kind === "seen") seen = outcome.vision;
      }

      // 1. 프롬프트를 만든다. 순수 함수이며 기기를 모른다.
      const prompt = buildPrompt(request, seen);

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
          // **`buildPrompt`에 넘긴 것과 같은 `seen`을 넘긴다**(005 P-7의 성질).
          // 어긋나면 프롬프트에 든 한계 줄이 판정에서 빠져 되뱉기를 놓친다.
          instructionLines(request, seen),
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
    GENERATION_TIMEOUT_MS,
    // ★ 011 — 사진을 읽는 수단. **이것을 넘기지 않으면 `quick`/`detailed`가 영영
    // `not-implemented`로 거부된다** — 006의 `GenerationProbe`, 007의 끊긴 `stop`
    // 배선과 같은 종류의 조용한 실패가 나는 자리다.
    visionSupport(),
  );
}

/**
 * 실제 사진 읽기 수단 (011).
 *
 * `llamaEngine()`과 같은 방식으로 지연 import 한다 — 시뮬레이터·웹에서 네이티브 모듈
 * 해석이 터지지 않게 하기 위해서다.
 */
function visionSupport(): VisionSupport {
  return {
    engine: createVisionEngine(async (path: string) => {
      const llama = await import("llama.rn");
      return (await llama.initLlama({
        model: path,
        n_ctx: VISION_CONTEXT_SIZE,
        n_gpu_layers: 0,
      })) as never;
    }),
    // 004의 `Photo.id`가 곧 경로인 경우를 기본으로 둔다. 미디어 라이브러리 id를
    // 경로로 바꾸는 일은 기기에서 확인하며 정한다(quickstart D2).
    resolvePath: async (photo) => photo.id,
  };
}

/**
 * 사진을 읽을 때 여는 컨텍스트 크기.
 *
 * **일기 생성의 `n_ctx`(2048)와 별개다** — 캡션은 짧은 문장 하나이고 사진 토큰이 함께
 * 들어가므로 요구가 다르다. **짐작이며 실측이 아니다**(원칙 V, quickstart D1).
 */
const VISION_CONTEXT_SIZE = 4096;
