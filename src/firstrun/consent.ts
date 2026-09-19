/**
 * 다운로드 진행 슬라이드 단계 판정 — **순수 함수** (045).
 *
 * 계약: specs/045-onboarding-download-consent/data-model.md `SlideStage`
 *       specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C6·C7
 *       specs/045-onboarding-download-consent/research.md R3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **다운로드의 바이트 진행률(`essentialDownloadFraction()`, 029)을 인자로
 * 받지 않는다**(원칙 IV, C6) — 받으면 슬라이드 전환 타이밍이 진행률의 간접
 * 노출이 된다. 이 함수가 보는 것은 경과 시간(`elapsedMs`)과 완료 여부
 * (`downloadReady`)뿐이다.
 *
 * **저장하지 않는다** — `App.tsx`가 `"downloading"` 단계에 진입한 시각을
 * 세션 로컬 상태로만 들고, 재시작하면 그 시각도 다시 잡혀 슬라이드는 항상
 * 1번부터 시작한다(045 Clarifications, C7).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 슬라이드 전환 간격 — 사람이 정한 고정 값(045 Clarifications, 원칙 V). */
export const SLIDE_INTERVAL_MS = 4000;

/** 마지막 슬라이드 인덱스 — 4장이므로 0~3, 3에서 멈춘다(C7). */
const LAST_SLIDE_INDEX = 3;

export type SlideStage = { kind: "slide"; index: 0 | 1 | 2 | 3 } | { kind: "complete" };

/**
 * 지금 보여줄 슬라이드 단계 (C6·C7).
 *
 * `downloadReady`가 참이면 `elapsedMs`와 무관하게 즉시 완료 화면이다.
 * 그 외에는 `elapsedMs`를 `SLIDE_INTERVAL_MS`로 나눈 값을 `LAST_SLIDE_INDEX`로
 * 클램프한다 — 다운로드가 안 끝나면 4번째 슬라이드에서 계속 머무른다.
 */
export function resolveSlideStage(input: {
  downloadReady: boolean;
  elapsedMs: number;
}): SlideStage {
  if (input.downloadReady) return { kind: "complete" };

  const raw = Math.floor(input.elapsedMs / SLIDE_INTERVAL_MS);
  const index = (raw < 0 ? 0 : raw > LAST_SLIDE_INDEX ? LAST_SLIDE_INDEX : raw) as 0 | 1 | 2 | 3;
  return { kind: "slide", index };
}
