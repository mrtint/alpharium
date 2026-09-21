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

/** 4분할 프로그레스 바의 구간 수 — 사람이 정한 고정 값(046, 원칙 V). */
const SEGMENT_COUNT = 4;

/**
 * 합산 다운로드 진행률(0~1 연속값, `essentialDownloadFraction()` 029)을
 * 4개 구간의 채움 비율로 펼친다 (046).
 *
 * 계약: specs/046-download-progress-carousel/contracts/download-progress-carousel.md
 *       D1·D2·D3
 *
 * **순수 함수다** — `Date.now()`·난수·파일·네트워크를 쓰지 않는다. 같은
 * `fraction`을 넣으면 항상 같은 결과(D1). `fraction`이 `[0, 1]` 밖이어도
 * 결과 각 원소는 항상 `[0, 1]`로 clamp된다(D3).
 *
 * `essentialDownloadFraction()`을 여기서 직접 호출하지 않는다 — 그 값을
 * 계산하는 것은 호출자(화면)의 책임이고, 이 함수는 숫자 하나만 받는다
 * (원칙 IV 경계 — 자산 개수·식별자를 몰라야 한다).
 */
export function progressSegments(fraction: number): readonly [number, number, number, number] {
  const clamped = fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
  const segments: number[] = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const raw = (clamped - i / SEGMENT_COUNT) * SEGMENT_COUNT;
    segments.push(raw < 0 ? 0 : raw > 1 ? 1 : raw);
  }
  return segments as unknown as readonly [number, number, number, number];
}
