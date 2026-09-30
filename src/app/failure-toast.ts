/**
 * 쓰기 실패를 토스트 갈래로 옮긴다 (054, 보드 `2i`).
 *
 * 계약: specs/054-in-place-writing/contracts/failure-toast.md T1~T7, research.md R5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이것은 사람이 못 박은 표다**(012 `USER_VISIBLE_SIGNAL_AXES`·021 `PERMISSION_REQUIREMENTS` 선례,
 * 원칙 V) — 코드가 실패의 문구를 재서 갈래를 정하지 않는다. 파이프라인은 `generation`·`vision` 단계에
 * `` `${kind}: ${detail}` `` 꼴로 이유를 담아 오므로(`failure-text.ts`의 `describeGenerationReason`이 같은
 * 규칙을 쓴다) **앞 토큰(kind)과 `vision-failed`의 detail만** 본다. 문구 전체를 비교하면 문구를 고칠 때 조용히
 * 깨진다(053 `photoAccess`의 교훈).
 *
 * **갈래는 「다시 눌러 보면 되는가 / 무엇을 준비해야 하는가」다.** 사용자가 무언가를 해야 풀리는 실패에
 * 「다시 써 볼 수 있어요」라고 하면 거짓이 되고 막다른 길이 된다(SC-006). 이유·모델·오류 코드는 어떤 갈래의
 * 문구에도 없다(원칙 III, FR-016).
 *
 * **쓰기 시작 전 `no-ready-character`는 여기 오지 않는다** — 쓰는 중에 들어가기 전의 막힘이고, 지금 설정으로
 * 가는 유일한 길(「설정에서 작성자 준비하기」)을 그대로 둔다(FR-024).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PipelineResult } from "../diary/pipeline";

/** 실패한 파이프라인 결과 */
export type PipelineFailure = Extract<PipelineResult, { ok: false }>;

export type ToastKind =
  /** 다시 쓰면 풀릴 수 있다 (판정 거부·시간 초과·중단·생성 중 문제) */
  | "retry"
  /** 캐릭터 준비가 필요하다 (모델 파일 없음·손상) */
  | "prepare-character"
  /** 사진을 보는 데 필요한 것의 준비가 필요하다 */
  | "prepare-vision"
  /** 이 기기에서 쓸 수 없다 — 이유도 다시 쓰라는 말도 없이 */
  | "plain"
  /** 글은 나왔으나 저장하지 못했다 */
  | "save";

/** 모든 갈래가 지금 쓰는 한 줄 (저장소 소유자 결정, 2026-09-30) */
const FAILED = "일기를 쓰지 못했어요.";

/**
 * 갈래 → 문구. **정본은 이 상수 하나다.** 지금은 저장소 소유자가 다섯 갈래를 한 줄로 통일했다(2026-09-30) —
 * 준비를 요청해도 쓰는 중 화면에서 설정으로 갈 길이 아직 없고, 「다시 써 볼 수 있어요」는 조치가 필요한 실패에
 * 거짓이 될 수 있어서다. 갈래 판정(`toastKindFor`)은 그대로 두어, 설정 진입점이 생기면 문구만 다시 가른다.
 */
export const TOAST_TEXT: Readonly<Record<ToastKind, string>> = {
  retry: FAILED,
  "prepare-character": FAILED,
  "prepare-vision": FAILED,
  plain: FAILED,
  save: FAILED,
};

/**
 * `generation`·`vision` 단계의 `reason`(`` `${kind}: ${detail}` ``)을 갈래로 옮긴다. 모르는 것은 `retry` —
 * 지금의 「다시 시도해 볼 만하다」 폴백과 같은 방향이다.
 */
function kindFromReason(reason: string): ToastKind {
  const [kind, ...rest] = reason.split(":");
  const detail = rest.join(":").trim();

  switch (kind?.trim()) {
    case "not-implemented":
    case "backend-unavailable":
      return "plain";
    case "model-load-failed":
      return "prepare-character";
    case "vision-failed":
      return detail === "not-ready" ? "prepare-vision" : "retry";
    default:
      // rejected · timed-out · interrupted · generation-failed · 모르는 것
      return "retry";
  }
}

/** 실패 하나를 갈래로 옮긴다. 던지지 않는다. */
export function toastKindFor(result: PipelineFailure): ToastKind {
  switch (result.stage) {
    case "storage":
      return "save";
    case "request-build":
    case "model-not-ready":
      return "prepare-character";
    case "vision":
    case "generation":
      return kindFromReason(result.reason);
    default:
      // day-not-closed · already-running · signals · 모르는 단계 — 다시 써 보면 된다
      return "retry";
  }
}

/**
 * 토스트를 쓸어 닫는 문턱 (보드 `2i` — 「아래로 밀어 바로 닫기」). **사람이 정한 값이다**(원칙 V) — 코드가
 * 손가락 움직임을 재서 정하지 않는다. 화면 토큰(`tokens.ts`)이 아니라 이 순수 모듈이 정본이다.
 */
export const TOAST_SWIPE = { distance: 24, velocity: 500 } as const;

/** 손을 뗐을 때 토스트를 닫는가 — 아래로 충분히 끌었거나 아래로 빠르게 쓸었을 때 */
export function shouldDismissToast(translationY: number, velocityY: number): boolean {
  return translationY >= TOAST_SWIPE.distance || velocityY >= TOAST_SWIPE.velocity;
}
