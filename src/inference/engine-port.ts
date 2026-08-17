/**
 * 생성 엔진 계약.
 *
 * 계약: specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 IV의 방어선이다.**
 *
 * 001~004에서 원칙 IV는 "우리가 측정 코드를 쓰지 않는다"로 지켜졌다. 여기서는 다르다 —
 * `llama.rn`의 `completion()`이 **요청하지 않은 지표를 결과에 담아 보낸다**:
 *
 *   tokens_predicted, tokens_evaluated, draft_tokens, draft_tokens_accepted,
 *   timings { prompt_ms, predicted_per_second, predicted_per_token_ms, ... }
 *
 * 그래서 방어가 「안 쓴다」가 아니라 **「경계에서 버린다」**여야 한다. 이 계약이 그
 * 경계이며, `RunResult`에 자리를 둘만 둔 것이 방어 그 자체다 — **자리가 없으면 담을 수
 * 없다.**
 *
 * 002가 `DiaryDraft`를 `{ text: string }` 하나로 둔 것과 같은 구조이고, 그 판단이 이
 * 기능에서 값을 했다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Character } from "../diary/types";

/**
 * 생성이 **어떻게 끝났는가**.
 *
 * `llama.rn`이 주는 사실을 옮긴 것이지 우리가 판단한 것이 아니다.
 *
 * **`eos` 하나만 정상이다.** 나머지 넷은 전부 「글이 끝나지 않았다」이며 FR-016d·FR-021c가
 * 거부를 요구한다.
 *
 * **왜 불리언 다섯이 아니라 갈래 하나인가**: 네이티브는 `stopped_eos`·`truncated`·
 * `context_full`·`interrupted`·`stopped_limit`를 따로 준다. 그대로 올려보내면 해석이
 * 부르는 쪽마다 생기고, **두 해석이 어긋나면 잘린 글이 통과한다.** 하나로 접으면 해석이
 * 포트에만 있다.
 *
 * **왜 값을 갖지 않는가**: `{ kind: "length", tokens: 512 }` 같은 형태를 두면 그것이
 * 지표다(원칙 IV). 갈래만 있으면 담을 자리가 없다.
 *
 * **`timeout`만 우리가 만든다.** 나머지 넷은 네이티브의 사실이고, 시간 한도는 어댑터가
 * 재서 붙인다(FR-021).
 */
export type Ending =
  | { kind: "eos" } // 모델이 스스로 끝냈다 — 유일한 정상
  | { kind: "length" } // 길이 한도에 걸렸다
  | { kind: "context" } // 컨텍스트가 모자랐다
  | { kind: "interrupted" } // 끊겼다 (앱이 앞을 벗어남)
  | { kind: "timeout" }; // 시간 한도를 넘었다

/**
 * 생성 한 번의 결과.
 *
 * **자리가 둘뿐인 것이 계약이다**(engine.md E4). `timings`·`tokens_*`를 담을 자리가
 * 없으므로 구현이 그것을 올려보낼 방법이 없다.
 *
 * **금지**: 소요 시간·토큰 수·속도 필드를 더하지 않는다(FR-011, 원칙 IV).
 */
export type RunResult = {
  /** 생성된 글. **아직 판정을 통과하지 않았다** — 판정은 어댑터가 한다 */
  text: string;
  /** 어떻게 끝났는가. `eos`가 아니면 글이 끝나지 않은 것이다 */
  ending: Ending;
};

/**
 * 모델을 여는 데 성공했는가.
 *
 * **모델 정보를 담지 않는다**(FR-010, 원칙 III). `LlamaContext`의 `model`·`systemInfo`·
 * `devices`·`gpu`가 밖으로 나가지 않는다 — 그 안에 모델 메타데이터가 들어 있다.
 *
 * **`reason`이 둘인 이유**: 파일이 없는 것과 있는데 못 여는 것은 사용자가 할 일이
 * 다르다(FR-017d). 003이 `ModelReadiness`를 넷으로 가른 것과 같은 판단이다.
 */
export type LoadResult = { ok: true } | { ok: false; reason: "not-found" | "load-failed" };

/** 생성에 걸리는 한도. **둘 다 짐작이며 실측이 아니다**(sampling.ts 참고) */
export type RunLimits = {
  /** 이 시간을 넘으면 끊고 `timeout`으로 끝낸다 (FR-021) */
  timeoutMs: number;
};

/**
 * 생성 엔진.
 *
 * **`Character`를 받고 경로를 받지 않는다.** 경로는 003의 `assetFor()`와 저장 자리만
 * 아는 값이며, 포트가 경로를 인자로 받으면 부르는 쪽이 경로를 알아야 하고 그것이 원칙
 * III의 누출 경로다.
 *
 * **불변식**:
 *  1. **한 번에 하나만 열린다**(E1). `load()`가 이미 열린 것이 있으면 먼저 닫는다 —
 *     GB 단위 모델 둘이면 기기가 죽는다. 같은 캐릭터면 재사용해도 된다
 *  2. **어떻게 끝나든 정리된다**(E2). 성공·실패·끊김·예외 어느 경로로도 `unload()`가
 *     불린다. 정리되지 않으면 다음 요청이 메모리 부족으로 죽는다
 *  3. **예외를 던지지 않는다**(E5). 실패는 값이어야 파이프라인이 어느 단계에서 멈췄는지
 *     말할 수 있다(002 FR-019). 001의 `ModuleStatus`와 같다
 *
 * **`stop()`은 예외적으로 조용히 실패해도 된다** — 이미 끝난 생성을 멈추려는 것은
 * 정상이며, 그때의 오류는 알릴 것이 없다.
 */
export interface GenerationEngine {
  load(character: Character): Promise<LoadResult>;
  run(prompt: string, limits: RunLimits): Promise<RunResult>;
  stop(): Promise<void>;
  unload(): Promise<void>;
}
