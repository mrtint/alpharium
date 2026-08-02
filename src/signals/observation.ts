/**
 * T005 — 관측 여부 표현 (001 FR-010, 003 FR-242)
 *
 * 「관측되지 않았음」은 「값이 없음」과 다른 사실이다. 휴대폰에게 「걸음 수 0」과
 * 「걸음 수 미관측」은 구별되는 상태이며, 값 자리를 비우는 것(null·undefined)으로
 * 대신할 수 없다 — 비어 있음과 미관측이 구별되지 않으면 001 FR-010이 깨진다.
 *
 * 이 표현이 나머지 전부의 전제다. 집계(T010)와 기록 묶음(T012)이 이 위에 선다.
 */

/** 관측된 값. 값 자체가 null이어도 「관측했다」는 사실은 유지된다. */
export interface Observed<T> {
  readonly status: "observed";
  readonly value: T;
}

/** 관측되지 않음. 값을 담는 자리가 존재하지 않는다. */
export interface Unobserved {
  readonly status: "unobserved";
}

/** 항목 하나의 관측 여부. 관측 여부는 소스가 아니라 **항목 단위**로 기록한다. */
export type Observation<T> = Observed<T> | Unobserved;

const UNOBSERVED: Unobserved = Object.freeze({ status: "unobserved" });

/** 관측된 값을 만든다. */
export function observed<T>(value: T): Observed<T> {
  return { status: "observed", value };
}

/** 미관측을 만든다. 값을 받지 않는다 — 담을 자리 자체가 없다. */
export function unobserved<T = never>(): Observation<T> {
  return UNOBSERVED;
}

export function isObserved<T>(o: Observation<T>): o is Observed<T> {
  return o.status === "observed";
}

export function isUnobserved<T>(o: Observation<T>): o is Unobserved {
  return o.status === "unobserved";
}

/**
 * 관측된 값만 꺼낸다. 미관측은 `undefined`가 되므로 **표시·저장 경로에서는 쓰지 않는다**
 * — 미관측을 값-없음으로 뭉개면 001 FR-010이 깨진다. 셈·집계 등 관측된 것만 다루는
 * 자리에서만 쓴다.
 */
export function valueOrUndefined<T>(o: Observation<T>): T | undefined {
  return isObserved(o) ? o.value : undefined;
}

/** 관측된 값에만 변환을 적용한다. 미관측은 미관측으로 남는다 — 기본값이 생기지 않는다. */
export function mapObserved<T, U>(o: Observation<T>, f: (value: T) => U): Observation<U> {
  return isObserved(o) ? observed(f(o.value)) : UNOBSERVED;
}
