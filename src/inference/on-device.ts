/**
 * 온디바이스 추론 어댑터.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/inference.md
 *
 * 모델 파일을 적재하지 않는다(FR-008). initLlama()·loadLlamaModelInfo()는 모델 경로를
 * 요구하므로 부르지 않는다. getBackendDevicesInfo()는 모델 인자를 받지 않으므로
 * "네이티브 모듈이 붙어 호출 가능한가"만 확인할 수 있다 — FR-006이 요구하는 전부다.
 */

import type { GenerationResult, InferenceBackend, ModuleStatus } from "./types";

/** 네이티브 백엔드 장치 정보를 조회하는 함수. 테스트에서 주입한다. */
export type BackendProbe = () => Promise<unknown>;

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
 * 온디바이스 어댑터를 만든다.
 *
 * `probe`를 주입받아 테스트에서 기기 없이 세 상태를 모두 검증할 수 있게 한다.
 */
export function createOnDeviceBackend(probe: BackendProbe): InferenceBackend {
  return {
    location: "on-device",

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
     * 아직 구현되지 않았다(FR-015).
     *
     * **요청을 보고 그럴듯한 텍스트를 만들지 않는다.** 모델 파일 적재도 프롬프트도 없는
     * 상태에서 무언가 문자열을 돌려주면 그것이 가짜 일기다(헌법 원칙 I). 없는 것을
     * 없다고 말하는 편이 정직하며, 계약이 그것을 요구한다.
     *
     * 실제 생성은 다음 기능이다. 그때 이 자리에 initLlama()와 프롬프트가 들어온다.
     */
    async generate(): Promise<GenerationResult> {
      return { kind: "not-implemented" };
    },
  };
}

/**
 * 실제 llama.rn을 쓰는 어댑터.
 *
 * 모듈 해석 자체가 실패할 수 있으므로(시뮬레이터·웹) 지연 import 한다.
 */
export function onDeviceBackend(): InferenceBackend {
  return createOnDeviceBackend(async () => {
    const llama = await import("llama.rn");
    return llama.getBackendDevicesInfo();
  });
}
