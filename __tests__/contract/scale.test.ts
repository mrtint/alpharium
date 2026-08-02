/**
 * T027 ⚖️ 원칙 IV — 규모 판정
 *
 * - 003 FR-271: 내용·값의 크기가 판정에 관여하지 않는다. **개수만으로** 결정된다
 * - 003 FR-272: 세는 대상은 **여섯 항목**. 항상 존재하는 셋과 파생은 세지 않는다
 * - 003 FR-273·FR-274: 0 → 비어 있음, 0 < n < 임계값 → 적음, n ≥ 임계값 → 보통
 * - 003 FR-275: 같은 입력에 항상 같은 결과. 전 조합에서 판정이 정확히 하나
 */
import {
  ScaleVerdict,
  judgeScale,
  DEFAULT_SCALE_PARAMS,
  SCALE_THRESHOLD_MIN,
  SCALE_THRESHOLD_MAX,
  type ScaleParams,
} from "../../src/signals/scale";
import { COUNTED_FIELDS } from "../../src/signals/digest";
import { observed, unobserved, type Observation } from "../../src/signals/observation";

type Counted = (typeof COUNTED_FIELDS)[number];

/** 여섯 항목의 관측 여부만 담은 입력. 값은 판정에 관여하지 않는다. */
const withObserved = (
  present: readonly Counted[],
  values: Partial<Record<Counted, unknown>> = {},
) =>
  Object.fromEntries(
    COUNTED_FIELDS.map((f) => [
      f,
      present.includes(f) ? observed(values[f] ?? 1) : unobserved(),
    ]),
  ) as Record<Counted, Observation<unknown>>;

/** 여섯 항목의 관측 여부 전 조합 (2^6 = 64). */
const allCombinations = (): Counted[][] =>
  Array.from({ length: 1 << COUNTED_FIELDS.length }, (_, mask) =>
    COUNTED_FIELDS.filter((_f, i) => (mask & (1 << i)) !== 0),
  );

const threshold3: ScaleParams = { threshold: 3 };

describe("세는 대상은 여섯 항목이다 (003 FR-272)", () => {
  it("걸음 수·활동 시간대·머문 장소·이동 여부·사진 목록·일정 목록", () => {
    expect([...COUNTED_FIELDS].sort()).toEqual(
      ["activePeriods", "events", "moved", "photos", "stays", "steps"].sort(),
    );
    expect(COUNTED_FIELDS).toHaveLength(6);
  });

  it("항상 존재하는 셋과 파생 항목은 세지 않는다", () => {
    for (const notCounted of ["date", "observedAt", "scale", "photoCount"]) {
      expect(COUNTED_FIELDS).not.toContain(notCounted);
    }
  });
});

describe("판정은 개수만으로 결정된다 (003 FR-271)", () => {
  it("같은 개수면 어느 항목이 관측되었든 같은 판정이다", () => {
    const combos = allCombinations().filter((c) => c.length === 2);
    const verdicts = new Set(combos.map((c) => judgeScale(withObserved(c), threshold3)));
    expect(verdicts.size).toBe(1);
  });

  it("값의 크기가 판정을 바꾸지 않는다", () => {
    const small = withObserved(["steps"], { steps: 1 });
    const huge = withObserved(["steps"], { steps: 999_999 });
    expect(judgeScale(small, threshold3)).toBe(judgeScale(huge, threshold3));
  });

  it("목록의 길이가 판정을 바꾸지 않는다 — 빈 목록도 관측이다", () => {
    const emptyList = withObserved(["photos"], { photos: [] });
    const longList = withObserved(["photos"], { photos: [1, 2, 3, 4, 5] });
    expect(judgeScale(emptyList, threshold3)).toBe(judgeScale(longList, threshold3));
  });

  it("거짓을 관측한 것도 관측으로 센다", () => {
    const didNotMove = withObserved(["moved"], { moved: false });
    expect(judgeScale(didNotMove, threshold3)).toBe(ScaleVerdict.Modest);
  });
});

describe("전 조합에서 판정이 정확히 하나다 (003 FR-275)", () => {
  const combos = allCombinations();

  it("64개 조합 전부가 세 판정 중 하나를 받는다", () => {
    for (const combo of combos) {
      expect(Object.values(ScaleVerdict)).toContain(judgeScale(withObserved(combo), threshold3));
    }
    expect(combos).toHaveLength(64);
  });

  it("같은 입력에 반복 판정하면 항상 같은 결과다", () => {
    for (const combo of combos) {
      const input = withObserved(combo);
      const results = Array.from({ length: 5 }, () => judgeScale(input, threshold3));
      expect(new Set(results).size).toBe(1);
    }
  });
});

describe("경계 (003 FR-273·FR-274)", () => {
  it("개수 0은 비어 있음이다", () => {
    expect(judgeScale(withObserved([]), threshold3)).toBe(ScaleVerdict.Empty);
  });

  it("0보다 크고 임계값 미만이면 적음이다", () => {
    expect(judgeScale(withObserved(["steps"]), threshold3)).toBe(ScaleVerdict.Modest);
    expect(judgeScale(withObserved(["steps", "moved"]), threshold3)).toBe(ScaleVerdict.Modest);
  });

  it("임계값 이상이면 보통이다", () => {
    expect(judgeScale(withObserved(["steps", "moved", "photos"]), threshold3)).toBe(
      ScaleVerdict.Normal,
    );
    expect(judgeScale(withObserved([...COUNTED_FIELDS]), threshold3)).toBe(ScaleVerdict.Normal);
  });
});

describe("임계값은 매개변수다 (003 FR-274 — T059가 실측으로 채운다)", () => {
  it("임계값은 2 이상 6 이하다", () => {
    expect(SCALE_THRESHOLD_MIN).toBe(2);
    expect(SCALE_THRESHOLD_MAX).toBe(6);
    expect(DEFAULT_SCALE_PARAMS.threshold).toBeGreaterThanOrEqual(SCALE_THRESHOLD_MIN);
    expect(DEFAULT_SCALE_PARAMS.threshold).toBeLessThanOrEqual(SCALE_THRESHOLD_MAX);
  });

  it("범위 밖의 임계값을 거부한다", () => {
    expect(() => judgeScale(withObserved(["steps"]), { threshold: 1 })).toThrow();
    expect(() => judgeScale(withObserved(["steps"]), { threshold: 7 })).toThrow();
  });

  it("임계값이 달라지면 같은 개수가 다른 판정을 받을 수 있다", () => {
    const two = withObserved(["steps", "moved"]);
    expect(judgeScale(two, { threshold: 2 })).toBe(ScaleVerdict.Normal);
    expect(judgeScale(two, { threshold: 4 })).toBe(ScaleVerdict.Modest);
  });

  it("임계값과 무관하게 개수 0은 언제나 비어 있음이다", () => {
    for (let t = SCALE_THRESHOLD_MIN; t <= SCALE_THRESHOLD_MAX; t++) {
      expect(judgeScale(withObserved([]), { threshold: t })).toBe(ScaleVerdict.Empty);
    }
  });
});
