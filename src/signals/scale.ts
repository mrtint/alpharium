/**
 * T026 — 규모 판정 (003 FR-271~FR-275)
 *
 * **세는 대상은 여섯 항목**(걸음 수·활동 시간대·머문 장소·이동 여부·사진 목록·일정
 * 목록)뿐이다. 항상 존재하는 셋(날짜·관측 시점·판정)과 파생 항목(사진 총 개수)은
 * 세지 않는다 (003 FR-272).
 *
 * 판정은 **개수만으로** 결정된다 — 내용·값의 크기·서술의 풍부함은 관여하지 않는다
 * (003 FR-271). 같은 입력에 항상 같은 결과다 (003 FR-275).
 *
 * **임계값은 매개변수로 두고 값을 비운다** — T059가 「적음」 확인의 발생 빈도를 관측해
 * 2~6 범위에서 정한다 (003 FR-274). 003 FR-257이 실측 없이 정한 값을 최종값으로 남기지
 * 말 것을 요구하므로, 아래 기본값은 **잠정값이며 실측 근거가 아니다**.
 */
import { isObserved, type Observation } from "./observation";

export enum ScaleVerdict {
  /** 세어진 개수 = 0 (003 FR-273). 추론을 시도하지 않는다 (001 FR-013). */
  Empty = "empty",
  /** 0 < 개수 < 임계값 (003 FR-274). 사용자 확인에만 쓰인다 (003 FR-276). */
  Modest = "modest",
  /** 개수 ≥ 임계값 (003 FR-274). */
  Normal = "normal",
}

/**
 * 규모 판정이 세는 **여섯 항목** (003 FR-272). 집계 항목의 부분집합이며, 항상 존재하는
 * 셋(날짜·관측 시점·판정)과 파생 항목(사진 총 개수)은 여기 없다.
 */
export const COUNTED_FIELDS = [
  "steps",
  "activePeriods",
  "stays",
  "moved",
  "photos",
  "events",
] as const;

/** 003 FR-274가 정한 임계값의 범위. 이 밖의 값은 계약 위반이다. */
export const SCALE_THRESHOLD_MIN = 2;
export const SCALE_THRESHOLD_MAX = 6;

export interface ScaleParams {
  /** 「적음」과 「보통」을 가르는 개수. 2 이상 6 이하 (003 FR-274). */
  readonly threshold: number;
}

/**
 * **실측으로 채울 자리** (T059, 003 FR-274).
 *
 * 값이 비어도 US1은 돈다 — 판정은 여전히 결정적이고 정확히 하나다. 다만 이 값은
 * 관측 근거가 없는 **잠정값**이므로, T059가 관측 결과를 근거로 확정하기 전까지
 * 최종값으로 다루지 않는다.
 */
export const DEFAULT_SCALE_PARAMS: ScaleParams = Object.freeze({ threshold: 3 });

/** 여섯 항목의 관측 여부만 보는 입력. 값의 타입은 판정에 관여하지 않는다. */
export type CountableDigest = Readonly<
  Record<(typeof COUNTED_FIELDS)[number], Observation<unknown>>
>;

export function judgeScale(digest: CountableDigest, params: ScaleParams): ScaleVerdict {
  const { threshold } = params;
  if (
    !Number.isInteger(threshold) ||
    threshold < SCALE_THRESHOLD_MIN ||
    threshold > SCALE_THRESHOLD_MAX
  ) {
    throw new Error(
      `규모 판정 임계값은 ${SCALE_THRESHOLD_MIN} 이상 ${SCALE_THRESHOLD_MAX} 이하여야 한다: ${threshold}`,
    );
  }

  // 관측 여부만 센다 — 값을 들여다보지 않으므로 내용이 판정에 관여할 수 없다.
  const count = COUNTED_FIELDS.filter((f) => isObserved(digest[f])).length;

  if (count === 0) return ScaleVerdict.Empty;
  return count < threshold ? ScaleVerdict.Modest : ScaleVerdict.Normal;
}
