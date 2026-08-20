/**
 * 실패를 **사용자가 할 수 있는 것**으로 옮긴다.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md S8, FR-028·029
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 자리가 원칙 III의 방어선이다.**
 *
 * 「되뱉었다」·「언어가 다르다」는 캐릭터 뒤의 모델이 어떻게 실패했는지를 드러내는 말이며
 * 사용자는 모델을 모른다. 대신 **무엇을 할 수 있는가**를 말한다 — 003이
 * `ModelReadiness`를 넷으로 가른 이유가 "사용자에게 무엇을 하라고 말할 수 있어야 한다"
 * 였고 같은 판단이다.
 *
 * **왜 `src/ui/`가 아니라 여기 있는가**: 005는 이것을 `GenerationProbe.tsx` 안에 두었다.
 * 006이 사용자 경로를 내면서 `src/app/state.ts`도 같은 말을 해야 했는데, **순수 함수인
 * 상태 모듈이 화면 컴포넌트를 import 하는 것은 방향이 거꾸로다.** 문구를 양쪽에 복제하면
 * 한쪽만 고쳐져 방어가 조용히 갈라진다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PipelineStage } from "../diary/pipeline";
import type { GenerationResult } from "../inference/types";
import { isGenerationFailure } from "../inference/types";

/**
 * 생성 실패 하나를 사람의 말로 옮긴다 (005 FR-017d·e).
 *
 * **네 거부 갈래가 하나의 말로 합쳐진다** — 사용자에게 필요한 것은 「무엇이 잘못됐나」가
 * 아니라 「무엇을 할 수 있나」다.
 */
export function describeFailure(result: GenerationResult): string {
  if (!isGenerationFailure(result)) return "";

  switch (result.kind) {
    case "not-implemented":
      // 시각 설정이 none이 아닐 때다(005 FR-022).
      return "이 설정으로는 아직 일기를 쓸 수 없다";
    case "backend-unavailable":
      return "이 기기에서 일기를 쓸 수 없다";
    case "model-load-failed":
      return result.reason === "not-found"
        ? "고른 캐릭터를 먼저 준비해야 한다"
        : "고른 캐릭터를 준비하는 데 문제가 있다. 다시 받아야 할 수 있다";
    case "rejected":
      // **네 갈래를 하나로 옮긴다.** 무엇이 잘못됐는지가 아니라 무엇을 할 수 있는지다.
      return "일기가 제대로 나오지 않았다. 다시 시도해 볼 만하다";
    case "timed-out":
      return "시간이 너무 오래 걸려 멈췄다. 다시 시도해 볼 만하다";
    case "interrupted":
      return "앱을 떠나 있는 동안 멈췄다. 다시 시도할 수 있다";
    case "generation-failed":
      return "일기를 쓰는 중에 문제가 생겼다. 다시 시도해 볼 만하다";
  }
}

/**
 * 파이프라인이 `generation` 단계에 담아 온 `reason`을 사용자 문구로 옮긴다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 파이프라인은 `` `${kind}: ${detail}` `` 꼴로 담는다(`pipeline.ts` 167행).
 * **그것을 버리고 한 문장으로 뭉개면 「캐릭터를 받아야 하는가」와 「다시 눌러 보면
 * 되는가」를 구분할 수 없다**(006 FR-028).
 *
 * **문자열을 다시 갈래로 되돌린 뒤 `describeFailure()`에 넘긴다** — 문구를 여기서 새로
 * 쓰면 원칙 III의 방어가 둘로 갈라진다.
 *
 * **모르는 갈래는 일반 문구로 떨어진다.** 새 실패가 생겨도 화면이 무너지지 않으며,
 * 조용히 틀린 안내를 하지도 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function describeGenerationReason(reason: string): string {
  const [kind, ...rest] = reason.split(":");
  const detail = rest.join(":").trim();

  switch (kind?.trim()) {
    case "not-implemented":
      return describeFailure({ kind: "not-implemented" });
    case "backend-unavailable":
      return describeFailure({ kind: "backend-unavailable", reason: detail });
    case "model-load-failed":
      // **detail을 그대로 살린다.** `not-found`와 `load-failed`는 사용자가 할 일이
      // 다르다 — 전자는 받으면 되고 후자는 다시 받아야 할 수 있다.
      return describeFailure({
        kind: "model-load-failed",
        reason: detail === "not-found" ? "not-found" : "load-failed",
      });
    case "rejected":
      // 네 갈래(`empty`/`echo`/`language`/`unfinished`)가 어차피 한 말로 합쳐지므로
      // 어느 것이든 결과가 같다.
      return describeFailure({ kind: "rejected", why: "empty" });
    case "timed-out":
      return describeFailure({ kind: "timed-out" });
    case "interrupted":
      return describeFailure({ kind: "interrupted" });
    case "generation-failed":
      return describeFailure({ kind: "generation-failed", reason: detail });
    default:
      return "일기를 쓰는 중에 문제가 생겼다. 다시 시도해 볼 만하다";
  }
}

/**
 * 파이프라인 단계를 사용자가 할 수 있는 말로 옮긴다 (006 FR-029, S8).
 *
 * **`generation`은 `describeGenerationReason()`에 맡긴다** — 그 안이 다시
 * `describeFailure()`로 가므로 문구의 출처가 하나다.
 */
export function describeStage(stage: PipelineStage, reason: string): string {
  switch (stage) {
    case "day-not-closed":
      return "아직 이르다. 하루가 끝나야 그날의 일기를 쓸 수 있다";
    case "already-running":
      return "이미 쓰고 있다";
    case "signals":
      return "그 하루의 기록을 가져오지 못했다. 다시 시도해 볼 만하다";
    case "request-build":
      return "캐릭터를 먼저 골라야 한다";
    case "model-not-ready":
      return "고른 캐릭터를 먼저 준비해야 한다";
    case "storage":
      // **글이 있으면 여기 오지 않는다**(FR-012a) — 화면이 `written{saved:false}`로
      // 갈린다. 이 문구는 글 없이 저장만 실패한 경우의 대비책이다.
      return "일기를 저장하지 못했다. 다시 시도해 볼 만하다";
    case "generation":
      return describeGenerationReason(reason);
  }
}
