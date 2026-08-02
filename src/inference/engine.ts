/**
 * T014 — `AIEngine` 인터페이스 (헌법 원칙 III)
 *
 * 모든 추론 접근이 이 경계를 통과한다. **어댑터의 책임은 호출뿐이다**(MUST):
 * 인터페이스가 받는 것은 **완성된 입력**이고 돌려주는 것은 **원시 출력**이다.
 *
 * 따라서 프롬프트 구성(`src/inference/prompt.ts`)·출력 해석(`src/inference/parse.ts`)·
 * 화자 판정(`src/speaker/verify.ts`)이 구현체 안으로 들어갈 수 없다 — 어댑터는
 * 집계도 퍼소나도 받지 않으므로 프롬프트를 구성할 재료가 없고, 돌려주는 것이
 * 해석되지 않은 문자열이므로 해석·판정을 대신할 수 없다.
 *
 * _근거:_ 프롬프트·해석·판정을 어댑터 안에 두면 어댑터 수만큼 복제되어 이식 표면이
 * 커지고, 어댑터마다 판정이 갈린다 — 원칙 0의 화자 규범과 원칙 II의 실패 판정이
 * 어느 어댑터를 쓰느냐에 따라 달라지는 것은 허용되지 않는다.
 */

/** 어댑터에 넘기는 **완성된** 입력. 구성은 이미 끝났다. */
export interface EngineRequest {
  /** 모델에 그대로 넘어가는 문자열. 어댑터는 이것을 조립하지 않는다. */
  readonly prompt: string;
  /** 취소·이탈 신호 (001 FR-027). */
  readonly signal?: AbortSignal;
}

/** 어댑터가 돌려주는 **원시** 출력. 해석되지 않았다. */
export interface EngineResponse {
  /** 모델이 내놓은 문자열 그대로. 어댑터가 손대지 않는다. */
  readonly rawText: string;
}

export interface AIEngine {
  /** 어댑터 식별. 클라우드 모드 표시(006 FR-590)가 이것을 쓴다. */
  readonly kind: "cloud" | "on-device";
  /**
   * 완성된 입력을 모델에 넘기고 원시 출력을 돌려준다. **그것이 전부다.**
   * 실패는 던진다 — 대체 문장으로 메우지 않는다 (헌법 원칙 II).
   */
  generate(request: EngineRequest): Promise<EngineResponse>;
}

/** 모델이 응답하지 않았음. 종료 사유 분류(T035)가 이것을 받는다. */
export class EngineCallError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EngineCallError";
  }
}
