/**
 * 집계 산출의 매개변수 (003 FR-257 — **실측으로 채울 자리**)
 *
 * 003 FR-257이 항목별 상한과 시간대 세분도를 구현 단계의 실측에 넘겼다. 여기서
 * 만드는 것은 **자리**뿐이며, 값은 T060이 집계를 키우며 추론 품질 변화를 관측해
 * 정한다.
 *
 * **실측 없이 정한 값을 최종값으로 남기지 않는다** (003 FR-257) — 아래 기본값은
 * 잠정값이며 관측 근거가 없다. 값이 비어도(상한 없음) US1은 돈다.
 */

export interface DigestParams {
  /** 머문 장소의 상한. `null`이면 상한 없음. */
  readonly maxStays: number | null;
  /** 사진 항목의 상한. `null`이면 상한 없음. */
  readonly maxPhotos: number | null;
  /** 일정 항목의 상한. `null`이면 상한 없음. */
  readonly maxEvents: number | null;
  /** 활동 시간대의 상한. `null`이면 상한 없음. */
  readonly maxActivePeriods: number | null;
}

export const DIGEST_PARAM_KEYS = [
  "maxStays",
  "maxPhotos",
  "maxEvents",
  "maxActivePeriods",
] as const;

/**
 * **값을 비운 기본값** — 상한을 두지 않는다.
 *
 * T060이 실측으로 채우기 전까지 임의의 수를 박아 넣지 않는다. 근거 없는 상한은
 * 003 FR-257이 금지한 「실측 없이 정한 최종값」이 된다.
 */
export const DEFAULT_DIGEST_PARAMS: DigestParams = Object.freeze({
  maxStays: null,
  maxPhotos: null,
  maxEvents: null,
  maxActivePeriods: null,
});

/** 상한이 있으면 잘라 낸다. `null`이면 그대로 둔다. */
export function applyLimit<T>(items: readonly T[], limit: number | null): readonly T[] {
  return limit === null ? items : items.slice(0, limit);
}
