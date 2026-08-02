/**
 * T006 ⚖️ 원칙 IV — 관측 여부 표현 스키마 검증
 *
 * 001 FR-010 / 003 FR-242: 「관측되지 않았음」은 「값이 없음」과 구별되어야 한다.
 * 「걸음 수 0」과 「걸음 수 미관측」은 휴대폰에게 다른 사실이다.
 *
 * 엔티티 전체의 형태는 T011a(entity-schema.test.ts)가 맡는다. 이 파일은
 * 관측 여부 표현 그 자체만 검사한다.
 */
import {
  observed,
  unobserved,
  isObserved,
  isUnobserved,
  valueOrUndefined,
  mapObserved,
  type Observation,
} from "../../src/signals/observation";

describe("관측 여부 표현", () => {
  describe("미관측과 값-없음의 구별", () => {
    it("「걸음 수 0」과 「걸음 수 미관측」은 서로 다른 상태다", () => {
      const zeroSteps: Observation<number> = observed(0);
      const noSteps: Observation<number> = unobserved();

      expect(isObserved(zeroSteps)).toBe(true);
      expect(isUnobserved(noSteps)).toBe(true);
      expect(zeroSteps).not.toEqual(noSteps);
    });

    it("빈 목록 관측과 목록 미관측은 서로 다른 상태다", () => {
      const emptyList: Observation<string[]> = observed([]);
      const noList: Observation<string[]> = unobserved();

      expect(isObserved(emptyList)).toBe(true);
      expect(isUnobserved(noList)).toBe(true);
      expect(emptyList).not.toEqual(noList);
    });

    it("거짓을 관측한 것과 미관측은 서로 다른 상태다", () => {
      // 이동 여부(003 FR-251) — 「이동하지 않음」과 「이동 여부 미관측」
      const didNotMove: Observation<boolean> = observed(false);
      const unknownMove: Observation<boolean> = unobserved();

      expect(isObserved(didNotMove)).toBe(true);
      expect(isUnobserved(unknownMove)).toBe(true);
      expect(didNotMove).not.toEqual(unknownMove);
    });
  });

  describe("값 자리를 비우는 것으로 대신하지 않는다", () => {
    it("관측된 값이 null이나 undefined여도 관측 상태는 유지된다", () => {
      // 값 자리의 비어 있음이 미관측을 뜻하지 않는다.
      const observedNothing = observed(null as unknown as string);
      expect(isObserved(observedNothing)).toBe(true);
      expect(isUnobserved(observedNothing)).toBe(false);
    });

    it("미관측은 값을 꺼낼 수 없다", () => {
      expect(valueOrUndefined(unobserved<number>())).toBeUndefined();
      expect(valueOrUndefined(observed(0))).toBe(0);
    });
  });

  describe("판별은 서로 배타적이다", () => {
    const cases: Observation<number>[] = [observed(0), observed(42), unobserved()];

    it.each(cases)("어떤 관측이든 관측됨과 미관측 중 정확히 하나다", (o) => {
      expect(isObserved(o) !== isUnobserved(o)).toBe(true);
    });
  });

  describe("변환은 미관측을 관측으로 만들지 않는다", () => {
    it("관측된 값에만 변환이 적용된다", () => {
      expect(mapObserved(observed(2), (n) => n * 10)).toEqual(observed(20));
    });

    it("미관측을 변환해도 미관측으로 남는다 — 기본값이 생기지 않는다", () => {
      const result = mapObserved(unobserved<number>(), (n) => n * 10);
      expect(isUnobserved(result)).toBe(true);
    });
  });
});
