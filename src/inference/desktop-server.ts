/**
 * 데스크톱 추론 서버 어댑터.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/inference.md
 *
 * 헌법 원칙 I이 개발·튜닝 단계에 MAY로 허용한 경로다. 다만 제약이 붙는다:
 *
 *   "온디바이스와 동일한 GGUF, 동일한 프롬프트, 동일한 샘플링 파라미터를 쓴다(MUST).
 *    실행 위치만 다르고 그 외에 다른 것은 허용하지 않는다.
 *    데스크톱이라는 이유로 더 큰 모델을 쓰지 않는다(MUST NOT)."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **005가 그 제약을 구조로 만들었다**(FR-005·005a).
 *
 * 001은 "강제할 대상이 아직 없다"고 적어 두었다. 이제 있다 — 프롬프트와 샘플링과 판정이
 * 생겼고, **이 어댑터가 그것들을 온디바이스와 같은 자리에서 가져온다.**
 *
 *   프롬프트 → `diary/prompt.ts`     (양쪽이 같은 함수를 부른다)
 *   샘플링   → `inference/sampling.ts` (양쪽이 같은 상수를 읽는다)
 *   판정     → `diary/acceptance.ts`   (양쪽이 같은 함수를 부른다)
 *
 * **각자 만들 자리가 없으므로 어긋날 수 없다.** 한쪽을 고치고 다른 쪽을 잊는 실패가
 * 구조적으로 불가능해진 것이며, 그것이 원칙 I의 「동일한 프롬프트·샘플링」이 요구한
 * 바다.
 *
 * **서버 프로토콜 자체는 005의 범위가 아니다**(research.md §8). 헌법이 요구한 것은
 * 「동일한 GGUF·프롬프트·샘플링」이지 특정 프로토콜이 아니므로, **무엇을 보낼지는
 * 확정하고 어떻게 보낼지는 미룬다.**
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **대체 응답을 반환하지 않는다(FR-016).** 서버에 닿지 못하면 닿지 못했다는 사실이
 * 결과다. 조용히 그럴듯한 답을 만들어 주는 순간 헌법 원칙 I이 깨진다.
 */

import { judge } from "../diary/acceptance";
import { buildPrompt, instructionLines } from "../diary/prompt";
import type { DiaryRequest } from "../diary/types";
import type { Ending } from "./engine-port";
import { SAMPLING } from "./sampling";
import type { GenerationResult, InferenceBackend, ModuleStatus } from "./types";

/**
 * 서버에 보낼 것.
 *
 * **온디바이스가 네이티브에 넘기는 것과 같은 값이어야 한다**(FR-005). 이 타입이 그
 * 대응을 눈에 보이게 한다 — `llama-port.ts`의 `completion()` 인자와 나란히 놓고 읽으면
 * 어긋남이 드러난다.
 */
export type ServerRequest = {
  prompt: string;
  temperature: number;
  top_p: number;
  top_k: number;
  n_predict: number;
};

/**
 * 서버에 보낼 것을 만든다.
 *
 * **온디바이스와 같은 프롬프트·같은 샘플링이다**(FR-005a). 이 함수가 두 경로가 만나는
 * 지점이며, 여기를 거치지 않고 서버 요청을 만들면 원칙 I이 조용히 깨진다.
 *
 * 내보내는 이유는 **테스트가 양쪽의 동일성을 검사할 수 있게** 하기 위해서다.
 */
export function serverRequestFor(request: DiaryRequest): ServerRequest {
  return {
    prompt: buildPrompt(request),
    temperature: SAMPLING.temperature,
    top_p: SAMPLING.top_p,
    top_k: SAMPLING.top_k,
    n_predict: SAMPLING.n_predict,
  };
}

/**
 * 서버가 돌려준 글을 판정한다.
 *
 * **온디바이스와 같은 판정이다**(FR-005a). 데스크톱이라고 느슨하게 보면 그쪽에서만
 * 통과하는 글이 생기고, 그러면 실기기에서 본 것과 다른 것을 보게 된다.
 */
export function judgeServerOutput(
  request: DiaryRequest,
  text: string,
  ending: Ending,
): GenerationResult {
  const verdict = judge(text, ending, request.character, instructionLines(request));

  if (!verdict.ok) {
    if (ending.kind === "interrupted") return { kind: "interrupted" };
    return { kind: "rejected", why: verdict.why };
  }

  return { text };
}

/** 서버가 살아 있는지 확인하는 함수. 테스트에서 주입한다. */
export type ServerProbe = (baseUrl: string) => Promise<boolean>;

/**
 * 데스크톱 서버 어댑터를 만든다.
 *
 * 주소가 없으면 실패다 — 조용히 어딘가 기본 주소로 접속하지 않는다.
 */
export function createDesktopServerBackend(
  baseUrl: string | undefined,
  probe: ServerProbe,
): InferenceBackend {
  return {
    location: "desktop-server",

    async isAvailable(): Promise<ModuleStatus> {
      if (!baseUrl) {
        return { kind: "failed", reason: "데스크톱 추론 서버 주소가 설정되지 않았다" };
      }

      try {
        const reachable = await probe(baseUrl);
        return reachable
          ? { kind: "loaded" }
          : { kind: "failed", reason: `서버가 정상 응답하지 않았다: ${baseUrl}` };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return { kind: "failed", reason };
      }
    },

    /**
     * 전송 경로가 아직 없다.
     *
     * **005가 「무엇을 보낼지」는 확정했다** — `serverRequestFor()`와
     * `judgeServerOutput()`이 온디바이스와 같은 프롬프트·샘플링·판정을 쓴다(FR-005a).
     * 남은 것은 「어떻게 보낼지」이며, 서버 프로토콜은 005의 범위가 아니다
     * (research.md §8).
     *
     * **그럴듯한 텍스트를 만들지 않는다**(FR-016). 전송 경로가 없다는 것이 결과이며,
     * 없는 것을 없다고 말하는 것은 원칙 I이 금지한 「미리 만들어 둔 응답」의 반대다.
     *
     * ⚠️ **여기에 fetch를 붙이는 사람에게**: `serverRequestFor()`를 거치지 않고 요청을
     * 만들면 원칙 I의 「동일한 프롬프트·샘플링」이 조용히 깨진다. 응답도 반드시
     * `judgeServerOutput()`을 지나야 한다.
     */
    async generate(): Promise<GenerationResult> {
      return { kind: "not-implemented" };
    },
  };
}

/** HTTP로 서버에 닿는지 확인한다. */
export const httpProbe: ServerProbe = async (baseUrl) => {
  const response = await fetch(`${baseUrl}/models`);
  return response.ok;
};
