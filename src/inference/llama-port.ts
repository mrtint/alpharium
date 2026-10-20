/**
 * `llama.rn`을 쓰는 생성 엔진.
 *
 * 계약: specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **기기에 닿는 유일한 자리다**(FR-023). 004의 `signals/expo-port.ts`, 003의
 * `models/expo-port.ts`와 같은 역할이며, 나머지는 대역으로 기기 없이 검증된다.
 *
 * **여기가 원칙 IV의 경계다.** `completion()`이 요청하지 않은 지표를 결과에 담아 보낸다
 * (research.md §1의 실측):
 *
 *   tokens_predicted, tokens_evaluated, draft_tokens, draft_tokens_accepted,
 *   tokens_cached, timings { prompt_ms, predicted_per_second, ... }
 *
 * **이 파일이 그것을 버린다.** 버리지 않으면 어댑터를 지나 위로 새고, 그 순간 저장소가
 * 다시 「측정하는 제품」이 된다 — 이전 작업을 되돌리게 한 그 상태다.
 *
 * **동시에 원칙 III의 경계이기도 하다.** `LlamaContext`는 `model`·`systemInfo`·`devices`를
 * 들고 있으며, 그것이 밖으로 나가면 캐릭터 뒤의 모델이 드러난다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { pauseAfter, rest, systemClock, systemSleep, type Clock, type Sleep } from "./pacing";
import type { Character } from "../diary/types";
import { assetFor } from "../models/roster";
import { modelFilePath } from "../models/expo-port";
import type { Ending, GenerationEngine, LoadResult, RunLimits, RunResult } from "./engine-port";
import { ROMAN_LETTER_BLOCK_GRAMMAR, SAMPLING } from "./sampling";

/**
 * 모델을 여는 값.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`n_ctx`와 `n_gpu_layers`는 짐작이며 실측이 아니다**(헌법 원칙 V).
 *
 * - `n_ctx` 2048 — 프롬프트와 일기가 들어갈 만하고 1.5~2.4B 모델의 KV 캐시가 감당할
 *   만하다는 짐작. **작으면 `context_full`로 거부가 잦아지고 크면 메모리를 먹어 기기가
 *   죽는다** — 둘이 맞물린 값이다
 * - `n_gpu_layers` 0 — 안드로이드 GPU 오프로드는 기기마다 다르고 실패가 조용하다.
 *   0이 가장 안전한 시작점이라는 짐작
 *
 * **`n_threads`는 화면이 조립한 쓰기에는 주지 않는다**(라이브러리 기본값). 백그라운드가 조립한
 * 쓰기에만 `assembly.ts`가 정한 값을 싣는다(079) — 기본 4스레드가 백그라운드 cpuset의 코어
 * 3개를 나눠 써 한 편에 26분이 걸렸다(2026-10-13 SM-S901N 실측, 값과 근거는 `assembly.ts`).
 * 주지 않을 때는 키 자체를 싣지 않는다.
 *
 * **실기기에서 재면 근거가 실측으로 바뀐다**(quickstart D1·D4). 004의
 * `DEFAULT_PHOTO_LIMIT`(200)와 같은 성격의 값이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const CONTEXT_SIZE = 2048;
const GPU_LAYERS = 0;

/**
 * `initLlama`에 넘길 값 (079, contracts/assembly.md A4·A5).
 *
 * `threads`가 없으면 **`n_threads` 키를 만들지 않는다** — 화면 조립의 인자는 079 이전과 같다.
 */
export function contextParams(modelPath: string, threads?: number, resident?: boolean) {
  return {
    model: modelPath,
    n_ctx: CONTEXT_SIZE,
    n_gpu_layers: GPU_LAYERS,
    ...(threads === undefined ? {} : { n_threads: threads }),
    // 092 — 모델을 파일 매핑이 아니라 메모리에 읽어 올린다(`EnginePacing.residentModel`). 주지 않으면 키가 없다(종전 인자).
    ...(resident === true ? { use_mmap: false } : {}),
  };
}

/** `llama.rn`의 `LlamaContext`에서 우리가 쓰는 부분만. 전체를 들고 다니지 않는다 */
type LlamaLike = {
  completion(params: Record<string, unknown>): Promise<NativeResult>;
  stopCompletion(): Promise<void>;
  release(): Promise<void>;
  /**
   * 091 — 대화를 모델의 채팅 템플릿으로 두른 프롬프트 문자열(`getFormattedChat(…, { jinja: true })`의 `prompt`). 느린 쓰기의 조각 생성이
   * 그 뒤에 지금까지 쓴 글을 이어 붙인다. 없으면 조각 생성을 하지 않는다(종전 경로).
   */
  formatChat?(messages: ChatMessage[]): Promise<FormattedChat>;
  /**
   * 092 — `completion()`과 같되 토큰 하나가 생성될 때마다 `tick()`을 부른다. **토큰 데이터는 이 경계에서 버린다** — `tick`은 인자가
   * 없다(005 FR-028b의 취지: 판정 전의 글이 경계 밖으로 나가지 않는다). iOS 이어 하기의 진행 보고를 고르게 하려고만 쓴다.
   */
  completionTicking?(params: Record<string, unknown>, tick: () => void): Promise<NativeResult>;
};

/**
 * 091 — 채팅 템플릿으로 두른 프롬프트와, 그 템플릿이 차례의 끝으로 쓰는 멈춤 문자열(`getFormattedChat`의 `additional_stops`).
 * `messages` 경로에서는 llama.rn이 이 멈춤을 스스로 싣는다 — 조각 생성은 직접 실어야 차례를 넘어 쓰지 않는다(코드 리뷰).
 */
export type FormattedChat = { prompt: string; stops: string[] };

/**
 * 091 — 느린 쓰기(`assembly.ts`의 `Pacing` 중 이 파일이 쓰는 둘). 주면 `run()`·`ask()`가 조각 생성 + 쉼으로 돈다(PC3).
 */
export type EnginePacing = {
  readonly pauseRatio: number;
  readonly chunkTokens: number;
  /**
   * 092 — 주면 첫 조각 전에 서식 프롬프트를 이 글자 수씩 늘려 미리 읽는다(`n_predict: 1`, 018 미리 준비와 같은 방식 — 앞부분 KV가
   * 이어진다). 토막 하나가 끝날 때마다 박동한다 — 프롬프트 읽기도 실제 일이다. iOS 이어 하기는 진행이 멈춘 작업을 끝내는데(BGTask.h),
   * 앱 밖에서 느려진 첫 조각(프롬프트 전체 읽기)이 진행 없이 40초를 넘겨 만료됐다(2026-10-21 실측). 주지 않으면 종전대로(091 배터리 값).
   */
  readonly prefillChars?: number;
  /**
   * 092 — 앱이 앞에 있을 때의 토막 길이(`EngineOptions.isActive`가 참일 때). 작은 토막은 토큰당 비용이 커서 앞에서 쓰는 시간을 크게
   * 늘렸다(2026-10-21 run K: 24자 토막으로 프롬프트 읽기 120초 — 생성은 26초). 토막을 읽을 때마다 앱 상태를 다시 본다. 없으면 `prefillChars`.
   */
  readonly prefillCharsActive?: number;
  /** 092 — 참이면 모델을 메모리에 읽어 올린다(`contextParams`의 `use_mmap: false`). 앱 밖 iOS에서 매핑된 쪽이 밀려나 생성이 매우 느렸다 */
  readonly residentModel?: boolean;
};

export type EngineOptions = {
  pacing?: EnginePacing;
  /**
   * 092 CW7 — 조각 생성에서 조각 하나가 끝날 때마다 부른다(인자 없음 — 글·시간·토큰 수를 싣지 않는다, FR-004). 조립부가
   * `heartbeat.beat("chunk")`를 넘긴다. 던져도 생성은 이어진다. 종전 경로(`pacing` 없음)는 부르지 않는다.
   */
  onChunk?: () => void;
  /**
   * 092 — 조각 생성에서 토큰 하나가 생성될 때마다 부른다(인자 없음). 조립부가 `heartbeat.beat("token")`을 넘긴다. 네이티브가
   * `completionTicking`을 줄 때만 돈다. 던져도 생성은 이어진다.
   */
  onToken?: () => void;
  /**
   * 092 — 지금 앱이 앞에 있는가. 미리 읽기 토막의 길이를 고른다(`EnginePacing.prefillCharsActive`). 없거나 던지면 앞이 아닌 것으로
   * 본다 — 큰 토막을 앱 밖에서 읽으면 진행 없는 공백이 길어져 이어 하기가 만료된다.
   */
  isActive?: () => boolean;
  /** 쉼 계산의 시계·잠자기 — 테스트가 갈아 끼운다 */
  clock?: Clock;
  sleep?: Sleep;
};

/**
 * `NativeCompletionResult`에서 **우리가 보는 부분만**.
 *
 * 나머지 필드(`timings`·`tokens_*`)는 타입에 적지도 않는다 — **이름을 적어 두면 언젠가
 * 누가 쓴다.** 003이 안쪽 값과 바깥쪽 값을 타입으로 가른 것과 같은 판단이다.
 */
type NativeResult = {
  text?: string;
  /** 걸러낸 본문. 평문 프롬프트에서는 이쪽에만 값이 있을 수 있다 */
  content?: string;
  stopped_eos?: boolean;
  stopped_limit?: number | boolean;
  truncated?: boolean;
  context_full?: boolean;
  interrupted?: boolean;
  /** 091 — 멈춤 문자열(`stop`)에서 멈췄으면 그 문자열. 조각 생성에서는 차례의 끝이다 */
  stopped_word?: string;
};

/**
 * 네이티브 결과를 `Ending` 하나로 접는다 (engine.md 「Ending 매핑」).
 *
 * **순서가 있다.** 여러 플래그가 동시에 설 수 있고, 그때 무엇으로 볼지는 정해져 있어야
 * 같은 입력에 같은 답이 나온다.
 *
 * **마지막 줄이 원칙 V다**: 어느 갈래에도 안 맞으면 「끝났다」가 아니라 「끝나지
 * 않았다」로 본다. **모르는 것을 정상으로 처리하면 잘린 글이 일기가 된다.**
 */
export function endingOf(result: NativeResult): Ending {
  if (result.interrupted === true) return { kind: "interrupted" };
  if (result.context_full === true) return { kind: "context" };
  if (result.truncated === true) return { kind: "context" };
  if (
    result.stopped_limit === true ||
    (typeof result.stopped_limit === "number" && result.stopped_limit > 0)
  ) {
    return { kind: "length" };
  }
  if (result.stopped_eos === true) return { kind: "eos" };

  // 모르면 정상이 아닌 쪽으로.
  return { kind: "length" };
}

/** 네이티브 모듈을 여는 함수. 테스트에서 주입한다 */
export type LlamaLoader = (modelPath: string) => Promise<LlamaLike>;

/**
 * 엔진을 만든다.
 *
 * `loader`를 주입받아 기기 없이도 규칙(E1·E2)을 검증할 수 있게 한다 — 001의 `probe`,
 * 003·004의 포트 주입과 같은 구조다.
 */
export function createLlamaEngine(
  loader: LlamaLoader,
  resolvePath: (character: Character) => Promise<string> = defaultPathFor,
  options: EngineOptions = {},
): GenerationEngine {
  /**
   * 091 — 조각 생성에서 멈춤이 왔는가. `stop()`이 세우고 **`load()`가 비운다**(쓰기 하나의 시작) — 조각 생성은 이것을 조각 경계·쉼마다
   * 보고 다음 조각·쉼을 시작하지 않는다(FR-004). 종전 경로는 이 값을 보지 않는다.
   *
   * 092 FR-010 — 091은 `run()`·`ask()`가 시작할 때 비워, 본문과 제목 사이에 온 멈춤을 제목 호출이 지우고 제목을 끝까지 썼다(091 리뷰).
   */
  let stopRequested = false;

  /** 대화 하나를 보낸다 — 조각 생성(pacing이 있을 때), 아니면 종전 `complete()` */
  function send(open: LlamaLike, messages: ChatMessage[]): Promise<RunResult> {
    const pacing = options.pacing;
    if (pacing === undefined || open.formatChat === undefined) return complete(open, messages);
    return completePaced(
      open,
      messages,
      pacing,
      () => stopRequested,
      options.clock,
      options.sleep,
      options.onChunk,
      options.onToken,
      options.isActive,
    );
  }

  /** 지금 열려 있는 것. **하나뿐이다**(E1) */
  let context: LlamaLike | null = null;
  let openFor: Character | null = null;

  /**
   * 지금 네이티브에서 도는 호출들 (079, contracts/assembly.md U1). 비어 있으면 도는 것이 없다.
   *
   * `unload()`가 이것들이 모두 끝나기를 기다린다 — **계산 중인 컨텍스트를 놓으면 앱이 죽는다.**
   * 2026-10-13 iOS 시뮬레이터 SIGSEGV: 시간 한도에 걸린 생성은 멈춤 신호만 받고 아직
   * `llama_decode` 중이었는데 부른 쪽의 `finally`가 컨텍스트를 놓았다(한 스레드는 행렬 곱,
   * 다른 스레드는 같은 백엔드를 해제하는 중이었다). `stopCompletion()`은 플래그만 세우므로
   * 생성이 실제로 끝났는지는 이 Promise들만 안다.
   *
   * 네이티브 해제도 도는 작업을 기다리지만 **5초까지만**이다(`llama.rn` 0.12
   * `cpp/jsi/JSITaskManager.cpp`의 `TASK_WAIT_TIMEOUT`) — 그 뒤에는 그대로 지운다. 시뮬레이터에서
   * 「돌아온 지 5초 만에」 죽은 것이 그것이다. 라이브러리를 올릴 때 이 값이 바뀌는지 본다.
   *
   * **한 칸이 아니라 집합이다.** 홈은 미리 준비(`prewarm`)를 기다리지 않고 부르므로(018) 그것이
   * 도는 중에 본문 호출이 올 수 있다. 네이티브는 그 호출을 「Context is busy」로 곧바로 거부한다 —
   * 한 칸만 들면 거부된 호출이 칸을 비워 아직 도는 미리 준비를 잊는다.
   */
  const inFlight = new Set<Promise<void>>();

  /** 호출 하나를 「도는 생성」으로 든다. 끝나면(성공·거부) 뺀다 */
  function tracked<T>(call: Promise<T>): Promise<T> {
    const settled = call.then(
      () => undefined,
      () => undefined,
    );
    inFlight.add(settled);
    void settled.then(() => inFlight.delete(settled));
    return call;
  }

  /**
   * 아직 끝나지 않은 정리 (079, U6). 없으면 null.
   *
   * 정리는 도는 생성을 기다리느라 오래 걸릴 수 있다. 그 사이의 `load()`가 새 컨텍스트를 열면
   * 앞 것과 **함께 열린다**(E1 위반 — GB 단위 모델 둘) — `load()`가 이것을 먼저 기다린다.
   */
  let releasing: Promise<void> | null = null;

  return {
    async load(character: Character): Promise<LoadResult> {
      // 092 FR-010 — 쓰기 하나가 여기서 시작한다. 지난 쓰기의 멈춤을 비운다(조각 생성만 본다).
      stopRequested = false;
      // 같은 캐릭터가 이미 열려 있으면 재사용한다. 닫았다 여는 것은 느리고, 같은 것이
      // 열려 있는 것은 E1을 어기지 않는다.
      //
      // 016 — 이 분기가 "핫 스타트"의 정확한 정의다: loader()(네이티브 적재, 비용이
      // 드는 호출)를 아예 부르지 않는다(research.md §1). warm은 새로 재는 값이 아니라
      // 이 판정을 반환값에 실을 뿐이다.
      if (context !== null && openFor === character) return { ok: true, warm: true };

      // **다른 것이 열려 있으면 먼저 닫는다**(E1). 두 모델이 동시에 열리면 GB 둘이
      // 되어 기기가 죽는다.
      if (context !== null) await this.unload();
      // 079 — 다른 호출이 시작한 정리가 아직 도는 생성을 기다리는 중이면 그것도 기다린다(U6).
      // 앞 컨텍스트가 놓이기 전에 새로 열지 않는다.
      if (releasing !== null) await releasing;

      let path: string;
      try {
        path = await resolvePath(character);
      } catch {
        return { ok: false, reason: "not-found" };
      }

      try {
        context = await loader(path);
        openFor = character;
        return { ok: true, warm: false };
      } catch (error) {
        context = null;
        openFor = null;

        // 파일이 없는 것과 있는데 못 여는 것을 가른다 — 사용자가 할 일이 다르다
        // (FR-017d). **오류 문구를 밖으로 내보내지 않는다** — 경로가 들어 있고,
        // 경로에는 자산키가 들어 있다(원칙 III).
        const message = error instanceof Error ? error.message : String(error);
        const missing = /no such file|not found|enoent|does not exist/i.test(message);
        return { ok: false, reason: missing ? "not-found" : "load-failed" };
      }
    },

    /**
     * 고정 접두사를 미리 프리필한다 (018,
     * specs/018-prompt-prefix-prewarm/contracts/prewarm-engine.md).
     *
     * `run()`과 같은 모양(`messages`+`jinja`)으로 보낸다(E7) — 평문으로
     * 보내면 채팅 템플릿이 다르게 둘러져 접두사 토큰 열이 달라지고, KV
     * 캐시가 빗나간다. **`n_predict: 1`**로 생성 자체는 하지 않는다(E8).
     * 결과는 어디에도 담지 않는다(E11, 원칙 IV).
     *
     * **035 — 접두사를 인자로 받는다**(N18). 018에서는 여기서
     * `promptPrefix(character)`를 직접 불렀으나, 사용자 지정 이름이 접두사에
     * 들어가면서 포트가 이름까지 알아야 하는 문제가 생겼다. 문자열 하나만
     * 받으면 이 파일이 `diary/prompt`를 import하지 않아도 된다.
     */
    async prewarm(character: Character, prefix: string): Promise<void> {
      // load()를 건너뛴 채 부른 것이거나 다른 캐릭터가 열려 있다. 던지지
      // 않는다(E5) — 순서는 호출자 책임이다(E9).
      if (context === null || openFor !== character) return;

      try {
        await tracked(
          context.completion({
            messages: [{ role: "user", content: prefix }],
            jinja: true,
            temperature: SAMPLING.temperature,
            top_p: SAMPLING.top_p,
            top_k: SAMPLING.top_k,
            n_predict: 1,
          }),
        );
      } catch {
        // 프리워밍 실패는 알릴 것이 없다(E10) — 다음 run()이 그냥 느릴
        // 뿐 틀리지 않는다(FR-007).
      }
    },

    async run(prompt: string, _limits: RunLimits): Promise<RunResult> {
      if (context === null) {
        // 부르는 쪽이 load()를 건너뛴 것이다. 던지지 않는다(E5).
        return { text: "", ending: { kind: "length" } };
      }

      // **토큰 콜백(두 번째 인자)을 넘기지 않는다**(E3, FR-028b). 넘기지 않으면
      // 생성 중인 글이 화면에 닿을 경로가 코드에 존재하지 않는다 — 조심해서 안 쓰는
      // 것보다 못 쓰게 하는 쪽이 낫다.
      //
      // ─────────────────────────────────────────────────────────────────────
      // **`messages` + jinja를 쓴다** (실기기에서 정한 것, 2026-08-17).
      //
      // research.md §4는 평문 `prompt`를 골랐고 그 대가로 「지시 준수가 떨어질 수 있다,
      // 거부가 잦으면 그때 다시 본다」를 적어 두었다. **실기기에서 다시 볼 일이 실제로
      // 생겼다** — 평문으로는 모델이 **빈 글만 냈다**(`rejected: empty`, 두 번 확인).
      // 튜닝의 문제가 아니라 방식이 안 되는 것이었다.
      //
      // **프롬프트 내용은 그대로다.** `buildPrompt()`가 만든 문자열을 사용자 메시지
      // 하나로 감싸는 것뿐이며, 모델의 채팅 템플릿이 그것을 자기 형식으로 두른다.
      //
      // **FR-005·FR-014는 여전히 성립한다**: 로스터의 캐릭터가 같은 문자열을 받고, 데스크톱도
      // 같은 문자열을 보낸다. 모델마다 템플릿이 다르지만 **우리가 넣는 것은 하나**이며,
      // 그 동일성이 테스트로 검증된다.
      // ─────────────────────────────────────────────────────────────────────
      return tracked(send(context, [{ role: "user", content: prompt }]));
    },

    /**
     * 본문에 이어 한 번 더 묻는다 (061, contracts/title-ask.md TA1).
     *
     * `run()`과 **같은 경로**(`complete()`)로 보낸다 — 샘플링·`jinja`·지표를 버리는 경계가
     * 한 곳이다. 메시지가 셋일 뿐이다: 본문 프롬프트 → 모델이 쓴 본문 → 질문. 본문까지의
     * 토큰 열이 첫 호출과 같아 KV 캐시가 그대로 이어진다(짐작, 실기기에서 본다).
     */
    async ask(
      prompt: string,
      body: string,
      question: string,
      _limits: RunLimits,
    ): Promise<RunResult> {
      if (context === null) return { text: "", ending: { kind: "length" } };
      return tracked(
        send(context, [
          { role: "user", content: prompt },
          { role: "assistant", content: body },
          { role: "user", content: question },
        ]),
      );
    },

    async stop(): Promise<void> {
      // **조용히 실패해도 된다**(E5). 이미 끝난 생성을 멈추려는 것은 정상이며 알릴
      // 것이 없다.
      // 091 — 느린 쓰기는 다음 조각·쉼을 시작하지 않는다.
      stopRequested = true;
      try {
        await context?.stopCompletion();
      } catch {
        /* 무시한다 */
      }
    },

    async unload(): Promise<void> {
      const open = context;
      // 지금 도는 호출들. 이 뒤로는 `context`가 비어 새 호출이 이 컨텍스트에 닿지 않는다.
      const running = [...inFlight];
      // 먼저 지운다 — release()가 실패해도 다음 load()가 새로 열 수 있어야 한다.
      context = null;
      openFor = null;
      if (open === null) {
        // 열린 것이 없다. 다만 다른 호출이 시작한 정리가 아직 돌고 있으면 그것이 끝나야 「정리됐다」.
        if (releasing !== null) await releasing;
        return;
      }

      // ★ 079 — **도는 생성이 끝난 뒤에만 놓는다**(contracts/assembly.md U2·U3). 멈춤을 보내고
      // 그 호출들이 실제로 끝나기를 기다린다. **기다림에 한도를 두지 않는다** — 한도가 찬 순간
      // 계산 중인 컨텍스트를 놓게 되고, 그것이 고치려는 결함이다.
      //
      // **그래서 `unload()`를 기다리는 쪽도 함께 기다린다** — 시간 한도에 걸린 `generate()`·
      // `checkLiveness()`는 생성이 실제로 멈춘 뒤에야 돌아온다(U8). 멈춤은 보통 다음 토큰에서
      // 듣지만 보장은 아니다: 호출이 막 시작하는 구간에 보낸 멈춤은 네이티브가 지울 수 있고, 그때는
      // 생성이 제 길이(`n_predict`)까지 간 뒤에 끝난다.
      const done = (async () => {
        if (running.length > 0) {
          try {
            await open.stopCompletion();
          } catch {
            /* 멈춤이 실패해도 기다림은 이어진다(U5) */
          }
          await Promise.all(running);
        }

        try {
          await open.release();
        } catch {
          /* 무시한다 */
        }
      })();

      releasing = done;
      await done;
      if (releasing === done) releasing = null;
    },
  };
}

/** `completion()`에 넘기는 대화 한 줄 */
type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * 대화를 보내고 `{ text, ending }`만 꺼낸다 — `run()`·`ask()`가 함께 쓴다(061).
 *
 * **토큰 콜백(두 번째 인자)을 넘기지 않는다**(E3, FR-028b).
 */
async function complete(context: LlamaLike, messages: ChatMessage[]): Promise<RunResult> {
  const result = await context.completion({
    messages,
    jinja: true,
    temperature: SAMPLING.temperature,
    top_p: SAMPLING.top_p,
    top_k: SAMPLING.top_k,
    n_predict: SAMPLING.n_predict,
    // 077 — 본문·제목 모두 로마자를 내지 못한다. jinja 서식 결과가 문법을 줄 때만(도구·
    // `response_format`) llama.rn이 이 값을 덮어쓴다 — 우리 호출은 둘 다 안 쓴다.
    grammar: ROMAN_LETTER_BLOCK_GRAMMAR,
  });

  // ★ **여기가 원칙 IV의 경계다.** `text`와 `ending`만 꺼내고 나머지를 버린다.
  // `timings`·`tokens_predicted`는 이 줄을 넘지 못한다.
  // ─────────────────────────────────────────────────────────────────────
  // **`content`를 먼저 본다** (실기기에서 찾은 것, 2026-08-17).
  //
  // `NativeCompletionResult`는 `text`와 `content`를 따로 준다:
  //   text    — 원문 (reasoning_content·tool_calls를 걸러내지 않은 것)
  //   content — 걸러낸 본문
  //
  // **처음에 `text`만 봤더니 실기기에서 빈 글이 나왔다**(`rejected: empty`).
  // 채팅 템플릿 없이 평문을 넣으면 파서가 원문을 `text`에 채우지 않는 경우가 있다.
  // 둘 중 **내용이 있는 쪽**을 쓰되, 없으면 빈 문자열이고 그때는 판정이 거부한다 —
  // **없는 것을 지어내지 않는다**(원칙 I).
  // ─────────────────────────────────────────────────────────────────────
  const produced = (result.content ?? "").trim() || (result.text ?? "").trim();

  return { text: produced, ending: endingOf(result) };
}

/**
 * 091 — 느린 쓰기의 조각 생성 (contracts/ios-bg-battery.md PC3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * iOS 배터리 요청은 CPU 감시(60초 동안 CPU 48초) 아래에서 돈다. 한 번의 생성 호출은 중간에 쉴 수 없으므로 짧게 자른다: 대화를 채팅
 * 템플릿으로 두른 프롬프트 `P`(`messages`+jinja와 같은 문자열)에 지금까지 쓴 글 `G`를 이어 `P + G`로 `chunkTokens`씩 생성하고, 조각
 * 사이에 그 조각 시간 × 비율만큼 쉰다. 같은 컨텍스트에서 앞 프롬프트와 공통 접두사의 KV가 재사용되므로(018의 원리) 조각마다 새로
 * 읽는 것은 직전 조각뿐이다.
 *
 * - 끝: 조각이 `eos`면 `eos`. 조각이 길이로 끝나면 이어 가고, 조각 수 × `chunkTokens`가 `SAMPLING.n_predict`에 닿으면 `length`.
 *   `interrupted`·`context`는 그대로 돌려준다. 빈 조각은 `length`로 끝낸다(무한히 돌지 않는다).
 * - 멈춤: 조각 경계에서 `stopped()`를 본다 — 서 있으면 다음 조각·쉼 없이 `interrupted`(도는 조각은 `stop()`의 `stopCompletion`이 끊는다).
 * - 텍스트는 조각 원문(`text`)을 잇는다 — 다음 조각의 프롬프트가 되므로 걸러낸 `content`가 아니라 원문이어야 한다.
 * - 토큰 콜백은 `completionTicking`으로만 넘기고 데이터를 거기서 버린다(092 — 인자 없는 박동, FR-028b의 취지), 지표는 `{ text, ending }` 밖으로 나가지 않는다(원칙 IV).
 * - 위험: 조각마다 샘플링이 다시 시작된다 — 한 번에 생성한 글과 같지 않을 수 있다(판정을 그대로 지난다).
 * - **호출 한 번의 CPU 상한**: 쉼은 호출 사이에만 있다 — 호출 하나가 그 자체로 60초 창의 CPU 48초를 넘으면 막지 못한다. 스레드 1의
 *   실측(091, iPhone 14): 생성 약 7.5토큰/초라 32토큰 조각은 약 4초, 첫 조각은 프롬프트 전체(약 900토큰)를 약 62토큰/초로 읽어 약 15초다.
 *   프롬프트가 3,000토큰을 넘으면 첫 조각이 48초에 닿는다 — 그때는 프롬프트 읽기도 나눠야 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function completePaced(
  context: LlamaLike,
  messages: ChatMessage[],
  pacing: EnginePacing,
  stopped: () => boolean,
  clock?: Clock,
  sleep?: Sleep,
  onChunk?: () => void,
  onToken?: () => void,
  isActive?: () => boolean,
): Promise<RunResult> {
  const formatted = await (context.formatChat as NonNullable<LlamaLike["formatChat"]>)(messages);
  // 서식 프롬프트를 못 얻었으면 빈 프롬프트로 생성하지 않고 종전 경로로(코드 리뷰)
  if (formatted.prompt === "") return complete(context, messages);
  const base = formatted.prompt;
  const maxChunks = Math.max(1, Math.ceil(SAMPLING.n_predict / pacing.chunkTokens));
  let written = "";
  const now = clock ?? systemClock;
  // 092 CW8 — 앞 조각 뒤의 쉼. 다음 조각을 부르기 **직전**에 쉰다 — 마지막 조각 뒤에는 쉬지 않는다(091은 조각마다 끝나고 쉬어 마지막 쉼이
  // 쓰기를 그만큼 늦췄다, 091 리뷰).
  let pending = 0;
  // 092 — 프롬프트를 토막씩 미리 읽는다(위 `prefillChars`). 마지막 토막(프롬프트 전체)은 첫 조각이 읽는다.
  if (pacing.prefillChars !== undefined && pacing.prefillChars > 0) {
    const small = pacing.prefillChars;
    const step = () => {
      let active = false;
      try {
        active = isActive?.() === true;
      } catch {
        // 모르면 앞이 아니다
      }
      return active ? Math.max(small, pacing.prefillCharsActive ?? small) : small;
    };
    for (let end = step(); end < base.length; end += step()) {
      // 서로게이트 쌍 한가운데서 자르지 않는다 — 외톨이 반쪽이 네이티브로 간다(이름의 이모지, 코드 리뷰)
      const code = base.charCodeAt(end - 1);
      if (code >= 0xd800 && code <= 0xdbff) end += 1;
      if (end >= base.length) break;
      if (stopped()) return { text: "", ending: { kind: "interrupted" } };
      await context.completion({
        prompt: base.slice(0, end),
        temperature: SAMPLING.temperature,
        top_p: SAMPLING.top_p,
        top_k: SAMPLING.top_k,
        n_predict: 1,
      });
      try {
        onChunk?.();
      } catch {
        // 삼킨다
      }
    }
  }
  for (let chunk = 0; chunk < maxChunks; chunk += 1) {
    if (pending > 0) await rest(pending, stopped, sleep ?? systemSleep);
    if (stopped()) return { text: written.trim(), ending: { kind: "interrupted" } };
    const start = now();
    const params = {
      prompt: base + written,
      temperature: SAMPLING.temperature,
      top_p: SAMPLING.top_p,
      top_k: SAMPLING.top_k,
      n_predict: pacing.chunkTokens,
      grammar: ROMAN_LETTER_BLOCK_GRAMMAR,
      ...(formatted.stops.length > 0 ? { stop: formatted.stops } : {}),
    };
    // 092 — 토큰마다 박동(데이터 없음). 듣는 쪽의 실패가 생성을 무너뜨리지 않는다.
    const tick = () => {
      try {
        onToken?.();
      } catch {
        // 삼킨다
      }
    };
    const result =
      onToken !== undefined && context.completionTicking !== undefined
        ? await context.completionTicking(params, tick)
        : await context.completion(params);
    pending = pauseAfter(now() - start, pacing.pauseRatio);
    // 092 CW7 — 실제 일 하나(조각)가 끝났다. 이어 하기의 막대가 이것으로만 움직인다. 듣는 쪽의 실패가 생성을 무너뜨리지 않는다.
    try {
      onChunk?.();
    } catch {
      // 삼킨다
    }
    // ★ 원칙 IV — 원문과 끝 갈래만 꺼낸다. `timings`·`tokens_*`는 이 줄을 넘지 못한다.
    // 원문이 비면 걸러낸 쪽(`complete()`와 같은 이유 — 빈 문자열은 `??`로 넘어가지 않는다)
    const raw = result.text || result.content || "";
    // 템플릿의 멈춤 문자열에서 멈췄으면 차례가 끝난 것이다 — `endingOf`는 그것을 길이로 보지만 조각 생성은 여기서 끝낸다(코드 리뷰)
    const ending: Ending =
      typeof result.stopped_word === "string" && result.stopped_word !== ""
        ? { kind: "eos" }
        : endingOf(result);
    // ★ 길이로 끊긴 조각은 한글 음절 한가운데서 끝날 수 있다 — llama.rn이 끝의 불완전한 UTF-8을 U+FFFD로 바꾼다. 그것을 이으면 다음
    // 조각의 프롬프트와 저장된 일기에 「�」가 남는다(판정은 한글만 보므로 못 잡는다, 코드 리뷰). 끝의 U+FFFD를 떼고 다음 조각이 그 음절을
    // 처음부터 다시 쓰게 한다.
    const piece = ending.kind === "length" ? raw.replace(/\uFFFD+$/u, "") : raw;
    written += piece;
    if (ending.kind !== "length") return { text: written.trim(), ending };
    if (stopped()) return { text: written.trim(), ending: { kind: "interrupted" } };
    if (piece === "") break;
  }
  return { text: written.trim(), ending: { kind: "length" } };
}

/**
 * 캐릭터의 모델 파일 경로.
 *
 * **003의 매핑을 통해서만 안다**(FR-007a). 이 기능이 캐릭터→모델 매핑을 새로 만들지
 * 않으며, `roster.ts` 하나만 그 연결을 안다.
 */
async function defaultPathFor(character: Character): Promise<string> {
  return modelFilePath(assetFor(character).key);
}

/**
 * 실제 `llama.rn`을 쓰는 엔진.
 *
 * 모듈 해석 자체가 실패할 수 있으므로(시뮬레이터·웹) 지연 import 한다 — 001의
 * `onDeviceBackend()`가 이미 쓰는 방식이다.
 *
 * `threads`는 조립 주체가 정한 스레드 수다(079 — `assembly.ts`). 화면 조립은 주지 않는다.
 */
export function llamaEngine(
  threads?: number,
  pacing?: EnginePacing,
  onChunk?: () => void,
  onToken?: () => void,
  isActive?: () => boolean,
): GenerationEngine {
  return createLlamaEngine(
    async (modelPath) => {
      const llama = await import("llama.rn");
      const context = await llama.initLlama(
        contextParams(modelPath, threads, pacing?.residentModel),
      );

      // **`LlamaContext`를 그대로 돌려주지 않는다**(원칙 III). `model`·`systemInfo`·
      // `devices`가 딸려 오며, 그것이 밖으로 나가면 캐릭터 뒤의 모델이 드러난다.
      // 쓰는 세 함수만 묶어 내보낸다.
      return {
        completion: (params) =>
          context.completion(params as Parameters<typeof context.completion>[0]),
        // 092 — 토큰 데이터는 여기서 버린다(`tick`은 인자 없음, `LlamaLike.completionTicking`)
        completionTicking: (params, tick) =>
          context.completion(params as Parameters<typeof context.completion>[0], () => tick()),
        stopCompletion: () => context.stopCompletion(),
        release: () => context.release(),
        // 091 — 느린 쓰기만 쓴다. `messages`+jinja 경로와 같은 템플릿 문자열이다.
        formatChat: async (messages) => {
          const formatted = await context.getFormattedChat(messages, null, { jinja: true });
          if (typeof formatted === "string") return { prompt: formatted, stops: [] };
          const stops = (formatted as { additional_stops?: unknown }).additional_stops;
          return {
            prompt: formatted.prompt ?? "",
            stops: Array.isArray(stops)
              ? stops.filter((s): s is string => typeof s === "string")
              : [],
          };
        },
      };
    },
    defaultPathFor,
    {
      ...(pacing === undefined ? {} : { pacing }),
      ...(onChunk === undefined ? {} : { onChunk }),
      ...(onToken === undefined ? {} : { onToken }),
      ...(isActive === undefined ? {} : { isActive }),
    },
  );
}
