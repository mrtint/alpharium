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
import { captionAll, type PhotoPathResolver, type ResizedPhotoCleaner } from "../vision/caption";
import type { ResizeExecutor } from "../vision/resize";
import { selectForVision } from "../vision/select";
import type { PhotoVision, VisionDepth, VisionOutcome } from "../vision/types";
import { createVisionEngine, type VisionEngine } from "../vision/vision-port";
import type { GenerationEngine, RunResult } from "./engine-port";
import { llamaEngine } from "./llama-port";
import { GENERATION_TIMEOUT_MS } from "./sampling";
import type {
  GenerationResult,
  InferenceBackend,
  ModuleStatus,
  MonologueBranch,
  ProgressStage,
} from "./types";

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
  /**
   * 캡션 전에 사진을 줄인다(013). **옵셔널이다** — 없으면 `captionAll`이 리사이즈를
   * 건너뛰고 원본 경로를 그대로 쓴다(013 이전과 같은 동작). 실기기 어댑터
   * (`visionSupport()`)는 항상 채운다
   */
  resize?: ResizeExecutor;
  /** 리사이즈 사본을 지운다(013). `resize`가 없으면 쓰이지 않는다 */
  cleanupResized?: ResizedPhotoCleaner;
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
  onStage?: (stage: ProgressStage, branch?: MonologueBranch) => void,
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
    // 015 — 사진 전환 신호. `"vision"`이 나가는 유일한 자리다(C1, contracts/
    // photo-advance.md) — 이 함수를 부르기 전에는 `onStage("vision")`을 별도로
    // 보내지 않는다(generate()의 주석 참조).
    const onPhotoStart = onStage === undefined ? undefined : () => onStage("vision");
    const result = await captionAll(
      vision.engine,
      selected,
      photos.value.photos.length,
      vision.resolvePath,
      cancel,
      vision.resize,
      vision.cleanupResized,
      onPhotoStart,
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
    async generate(
      request: DiaryRequest,
      onStage?: (stage: ProgressStage, branch?: MonologueBranch) => void,
    ): Promise<GenerationResult> {
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
        const outcome = await readPhotos(vision, request, cancel, onStage);

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
      //
      // 016 — 로드 신호 두 단계 (contracts/load-signal.md). 로드 시작 시점에는
      // 아직 콜드/핫을 모르므로 branch 없이 보내고, 완료되면 warm 값으로 확정
      // 신호를 보낸다. 실패하면 확정 신호를 보내지 않는다.
      onStage?.("load");
      const loaded = await engine.load(request.character);
      if (!loaded.ok) {
        return { kind: "model-load-failed", reason: loaded.reason };
      }

      // 016 FR-013 — 로드 자체는 중단할 수 없다(research.md §7, llama.rn에
      // 로드 취소 API가 없다). 로드가 끝난 이 시점에 취소 상태를 재확인해
      // 결과를 버린다 — 011의 captionAll()이 루프 종료 후 cancel을 다시
      // 확인하는 것과 같은 패턴이다.
      if (cancel.cancelled) {
        await engine.unload().catch(() => {});
        return { kind: "interrupted" };
      }

      onStage?.("load", loaded.warm ? "hot" : "cold");

      try {
        // 015 — 글쓰기 진행 신호 (contracts/progress-signal.md).
        // **`readPhotos()` 호출부에는 별도로 "vision"을 보내지 않는다** — 그러면
        // T007이 만드는 `onPhotoStart`와 이중 발화한다(C1, contracts/photo-advance.md).
        onStage?.("generation");

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
    /**
     * ★ **사진 id를 실제 파일 경로로 바꾼다** (2026-08-22 실기기에서 고쳤다).
     *
     * 처음에는 `photo.id`를 그대로 넘기며 「기기에서 확인하며 정한다」고 적었다.
     * **그 확인이 quickstart D2였고, 틀렸다** — 안드로이드에서 id는
     * `content://media/external/images/media/…` 꼴이라 네이티브가 파일로 열지 못한다.
     *
     * **조용히 실패했다**: 오류도 크래시도 없이 다섯 장이 92밀리초에 「처리」되고
     * 일기는 멀쩡히 나왔다. 로그의 `has_media=0`을 봐야 드러났다.
     */
    resolvePath: async (photo) => {
      const { expoPhotoPort } = await import("../signals/expo-port");
      return expoPhotoPort().filePathOf(photo.id);
    },
    resize: resizeExecutor,
    cleanupResized: cleanupResizedPhoto,
  };
}

/**
 * 리사이즈 사본이 놓이는 앱 전용 디렉터리 (013 FR-007).
 *
 * **`Paths.cache`가 아니라 `Paths.document`다** — clarify에서 "OS가 앱이 모르는
 * 사이에 지울 수 있는 자리도 아니다"로 정했다(spec 013 Clarifications). 003의
 * `models/expo-port.ts`가 같은 이유로 이미 내린 결정과 같다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **⚠️ `expo-image-manipulator`의 `ImageRef.saveAsync()`는 캐시 디렉터리에만
 * 저장한다**(공식 문서, `ImageRef.d.ts` 주석 확인 — research.md R2). 그래서
 * `resizeExecutor`가 저장 직후 `moveSync()`로 이 디렉터리로 옮긴다. 새 의존을
 * 늘리지 않고 두 요구사항(리사이즈는 image-manipulator, "OS가 안 건드리는
 * 자리"는 file-system)을 함께 만족시킨다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const VISION_CACHE_DIRECTORY = "vision-cache";

async function openVisionCacheDirectory() {
  const { Directory, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, VISION_CACHE_DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, Directory, Paths };
}

/**
 * 사진 id에서 결정론적으로 파일명을 만든다(013 research.md R3).
 *
 * **결정론이 곧 정리 실패 방어다.** 앱이 예기치 않게 끝나 지우지 못한 사본이
 * 남아도, 같은 사진을 다음에 또 읽으면 **같은 이름을 덮어쓰므로** 파일이
 * 누적되지 않는다(FR-009) — 008에서 받다 만 모델 셋이 쌓인 것과 같은 함정을
 * 새 임의 이름을 안 쓰는 것만으로 피한다.
 *
 * `photo.id`가 안드로이드에서 `content://media/external/images/media/123` 꼴이므로
 * 파일 시스템에 못 쓰는 문자(`/`·`:`)를 치환한다.
 */
export function resizedFileNameFor(sourcePath: string): string {
  const safe = sourcePath.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.endsWith(".jpg") ? safe : `${safe}.jpg`;
}

/**
 * 실제 리사이즈 구현 (013 T009~T011).
 *
 * contracts/resize.md C1 — **원본이 이미 목표보다 작으면 리사이즈를 건너뛰고
 * 원본 경로를 그대로 돌려준다.** `ImageManipulator.manipulate(uri).renderAsync()`가
 * (resize 액션 없이) 이미 원본 치수를 주므로, 그 값으로 판정한 뒤에만 `resize()`를
 * 부른다 — 작은 사진을 굳이 다시 인코드하는 비용을 피한다.
 */
const resizeExecutor: ResizeExecutor = async (sourcePath, target) => {
  const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
  const { File } = await import("expo-file-system");

  // ★ `sourcePath`는 011의 `filePathOf()`가 `file://`를 떼어낸 순수 파일 경로다
  // (llama.rn의 `completion()`이 그것을 요구했기 때문, 005 실측). 그런데
  // `expo-image-manipulator`의 `manipulate(source)`는 **URI**를 요구한다(공식
  // 예제가 `Asset.uri`를 그대로 넘긴다) — 두 경계가 정반대 계약이다
  // (2026-08-23 실기기 실측으로 확인, D2가 처음 이 어긋남을 잡았다).
  const sourceUri = sourcePath.startsWith("file://") ? sourcePath : `file://${sourcePath}`;
  const context = ImageManipulator.manipulate(sourceUri);
  const original = await context.renderAsync();

  const longEdge = Math.max(original.width, original.height);
  if (longEdge <= target.maxLongEdge) {
    // C1 — 이미 작다. 그대로 쓴다.
    return { ok: true, path: sourcePath };
  }

  // 긴 변에만 목표를 준다 — 짧은 변은 `resize()`가 원본 비율로 자동 계산한다
  // (공식 문서 확인, research.md R1). FR-004(비율 유지)를 라이브러리가 지킨다.
  const isWidthLonger = original.width >= original.height;
  const resized = isWidthLonger
    ? context.resize({ width: target.maxLongEdge })
    : context.resize({ height: target.maxLongEdge });

  const rendered = await resized.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });

  // 캐시에 저장된 것을 앱 전용 문서 디렉터리로, 결정론적 이름으로 옮긴다
  // (위 VISION_CACHE_DIRECTORY·resizedFileNameFor 주석). `move()`가 `File`
  // 인스턴스를 목적지로 받으므로 이름까지 한 번에 정해진다.
  const { dir } = await openVisionCacheDirectory();
  const cached = new File(saved.uri);
  const destination = new File(dir, resizedFileNameFor(sourcePath));
  if (destination.exists) destination.delete();
  cached.moveSync(destination);

  // ★ 결과에서도 `file://`를 뗀다 — `resolvePath()`(011)와 같은 규칙이다.
  // `vision-port.ts`의 `media_paths`가 받는 것은 파일 경로이지 URI가 아니다
  // (005·011 실측). 앞에서는 `manipulate()`가 URI를 요구해 붙였지만, 캡션
  // 엔진에 넘길 때는 다시 떼야 한다 — 입출력 경계가 반대 방향의 계약이다
  // (2026-08-23 실측: 이 줄이 없으면 다섯 장이 조용히 실패했다).
  const resultPath = destination.uri.startsWith("file://")
    ? destination.uri.slice("file://".length)
    : destination.uri;

  return { ok: true, path: resultPath };
};

/**
 * 리사이즈 사본을 지운다 (013 T020, FR-008).
 *
 * `caption.ts`의 `captionAll()`이 그 장의 캡션이 끝나면(성공/실패 무관) 부른다.
 * **원본과 같은 경로(C1)면 `caption.ts`가 애초에 이 함수를 부르지 않는다** —
 * FR-006(원본 보호)의 방어가 호출자 쪽에 있다.
 */
const cleanupResizedPhoto: ResizedPhotoCleaner = async (path) => {
  const { File } = await import("expo-file-system");
  const file = new File(path);
  if (file.exists) file.delete();
};

/**
 * 사진을 읽을 때 여는 컨텍스트 크기.
 *
 * **일기 생성의 `n_ctx`(2048)와 별개다** — 캡션은 짧은 문장 하나이고 사진 토큰이 함께
 * 들어가므로 요구가 다르다. **짐작이며 실측이 아니다**(원칙 V, quickstart D1).
 */
const VISION_CONTEXT_SIZE = 4096;
