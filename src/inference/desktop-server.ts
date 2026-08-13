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
 * 이 기능은 추론을 수행하지 않으므로 강제할 대상이 아직 없다. 일기 생성 기능에서
 * 프롬프트와 샘플링이 생길 때 이 제약을 실제로 강제해야 한다(FR-013).
 *
 * **대체 응답을 반환하지 않는다(FR-016).** 서버에 닿지 못하면 닿지 못했다는 사실이
 * 결과다. 조용히 그럴듯한 답을 만들어 주는 순간 헌법 원칙 I이 깨진다.
 */

import type { GenerationResult, InferenceBackend, ModuleStatus } from "./types";

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
     * 아직 구현되지 않았다(FR-015).
     *
     * **서버에 요청을 보내지 않는다.** 이 어댑터에 생성이 붙는 시점에는 헌법 원칙 I의
     * 제약(동일 GGUF·동일 프롬프트·동일 샘플링)을 강제할 수단이 함께 있어야 한다.
     * 강제 수단 없이 서버 생성을 먼저 붙이면 데스크톱이 온디바이스보다 좋은 답을 내는
     * 경로가 생기고, 그것이 원칙 I이 막으려는 상태다.
     *
     * 대체 응답도 만들지 않는다(FR-016). 닿지 못하면 닿지 못했다는 사실이 결과다.
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
