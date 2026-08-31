/**
 * 세그먼트 병렬 계획 — 순수 함수 (026, C1~C8·C14·C15).
 *
 * 계약: specs/026-parallel-model-download/contracts/segmented-transfer.md 「순수 함수」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **전부 순수 함수이므로 기기 없이 돈다.** `Date`·난수·파일을 안 쓴다.
 *
 * C14·C15는 `SEGMENT_COUNT`·`MIN_SEGMENT_BYTES`가 사람이 못박은 `readonly` 리터럴임을
 * `readFileSync`로 소스를 직접 읽어 잠근다 (007·009·012 관례, FR-030) — 값을 바꾸면
 * 테스트가 실패한다 (SC-011).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MIN_SEGMENT_BYTES,
  SEGMENT_COUNT,
  isComplete,
  mergeProgress,
  planSegments,
  remainingCapacity,
  remainingSegments,
} from "../../src/models/segmented/plan";
import type { SegmentedResume } from "../../src/models/segmented/types";

/* ───────────────────── C1 — planSegments 경계 불변식 ───────────────────── */

describe("planSegments — 경계 불변식 (C1)", () => {
  const CASES = [2_000_000_000, 1_644_918_272, 1_000_000_001, MIN_SEGMENT_BYTES * 8];

  for (const totalBytes of CASES) {
    it(`${totalBytes} 바이트: 빈틈·겹침 없이 [0, totalBytes-1]을 덮는다`, () => {
      const plan = planSegments(totalBytes);
      expect(plan.totalBytes).toBe(totalBytes);
      expect(plan.segments[0].start).toBe(0);
      expect(plan.segments[plan.segments.length - 1].end).toBe(totalBytes - 1);
      for (let i = 0; i < plan.segments.length - 1; i++) {
        expect(plan.segments[i].end + 1).toBe(plan.segments[i + 1].start);
      }
      // 각 구간 크기 합 = 전체
      const sum = plan.segments.reduce((n, s) => n + (s.end - s.start + 1), 0);
      expect(sum).toBe(totalBytes);
    });
  }

  it("큰 파일은 SEGMENT_COUNT개 구간이다", () => {
    expect(planSegments(2_000_000_000).segments).toHaveLength(SEGMENT_COUNT);
  });

  it("index가 0부터 순서대로", () => {
    const plan = planSegments(2_000_000_000);
    plan.segments.forEach((s, i) => expect(s.index).toBe(i));
  });
});

/* ───────────────────── C2 — 작은 파일 → count = 1 ───────────────────── */

describe("planSegments — 작은 파일 (C2)", () => {
  it("MIN_SEGMENT_BYTES * 2 미만이면 단일 구간", () => {
    const plan = planSegments(MIN_SEGMENT_BYTES);
    expect(plan.segments).toHaveLength(1);
    expect(plan.segments[0]).toEqual({ index: 0, start: 0, end: MIN_SEGMENT_BYTES - 1 });
  });

  it("정확히 MIN_SEGMENT_BYTES * 2면 쪼갠다", () => {
    expect(planSegments(MIN_SEGMENT_BYTES * 2).segments.length).toBeGreaterThan(1);
  });

  it("totalBytes <= 0이면 빈 구간 (호출자가 폴백)", () => {
    expect(planSegments(0).segments).toEqual([]);
    expect(planSegments(-5).segments).toEqual([]);
  });
});

/* ───────────────────── C3 — 나머지 바이트가 마지막 구간에 ───────────────────── */

describe("planSegments — 나머지 바이트 (C3)", () => {
  it("SEGMENT_COUNT로 나누어떨어지지 않으면 마지막 구간이 더 크다", () => {
    // SEGMENT_COUNT=4 기준, 4로 나눈 나머지가 3
    const totalBytes = MIN_SEGMENT_BYTES * 8 + 3;
    const plan = planSegments(totalBytes);
    const sizes = plan.segments.map((s) => s.end - s.start + 1);
    const last = sizes[sizes.length - 1];
    // 마지막이 앞 구간들보다 크거나 같고, 차이는 나머지만큼
    expect(last).toBeGreaterThanOrEqual(sizes[0]);
    expect(plan.segments[plan.segments.length - 1].end).toBe(totalBytes - 1);
  });
});

/* ───────────────────── C4·C5 — remainingSegments ───────────────────── */

describe("remainingSegments (C4·C5)", () => {
  const totalBytes = MIN_SEGMENT_BYTES * 8; // 4구간, 구간당 MIN_SEGMENT_BYTES * 2
  const segmentSize = MIN_SEGMENT_BYTES * 2;

  it("C4 — 완료 구간은 제외된다", () => {
    const resume: SegmentedResume = {
      assetKey: "a1",
      totalBytes,
      segmentCount: 4,
      receivedBytes: [segmentSize, segmentSize, 0, 0],
    };
    const remaining = remainingSegments(resume);
    expect(remaining.map((s) => s.index)).toEqual([2, 3]);
  });

  it("C5 — 부분 구간의 start가 receivedBytes만큼 밀린다", () => {
    const half = segmentSize / 2;
    const resume: SegmentedResume = {
      assetKey: "a1",
      totalBytes,
      segmentCount: 4,
      receivedBytes: [segmentSize, half, 0, 0],
    };
    const remaining = remainingSegments(resume);
    // 구간 0은 완료 → 제외. 구간 1은 half만큼 밀림.
    expect(remaining[0].index).toBe(1);
    expect(remaining[0].start).toBe(segmentSize + half);
    expect(remaining[0].end).toBe(segmentSize * 2 - 1);
  });

  it("전부 완료면 빈 배열", () => {
    const resume: SegmentedResume = {
      assetKey: "a1",
      totalBytes,
      segmentCount: 4,
      receivedBytes: [segmentSize, segmentSize, segmentSize, segmentSize],
    };
    expect(remainingSegments(resume)).toEqual([]);
  });
});

/* ───────────────────── C6·C7 — mergeProgress ───────────────────── */

describe("mergeProgress (C6·C7)", () => {
  it("C6 — totalBytes <= 0이면 null (모름을 지어내지 않는다)", () => {
    expect(mergeProgress([1, 2, 3], 0)).toBeNull();
    expect(mergeProgress([1], -1)).toBeNull();
  });

  it("정상 합산", () => {
    expect(mergeProgress([250, 250, 250, 250], 1000)).toBe(1);
    expect(mergeProgress([100, 100], 1000)).toBeCloseTo(0.2);
  });

  it("C7 — sum > totalBytes면 1로 클램프", () => {
    expect(mergeProgress([600, 600], 1000)).toBe(1);
  });
});

/* ───────────────────── C8 — isComplete ───────────────────── */

describe("isComplete (C8)", () => {
  const plan = planSegments(MIN_SEGMENT_BYTES * 8);
  const sizes = plan.segments.map((s) => s.end - s.start + 1);

  it("모든 구간이 자기 크기만큼 받아야 true", () => {
    expect(isComplete(sizes, plan)).toBe(true);
  });

  it("한 구간만 부족해도 false", () => {
    const partial = [...sizes];
    partial[1] -= 1;
    expect(isComplete(partial, plan)).toBe(false);
  });

  it("초과분도 완료로 본다 (>= 비교)", () => {
    const over = sizes.map((n) => n + 10);
    expect(isComplete(over, plan)).toBe(true);
  });
});

/* ───────────────────── remainingCapacity ───────────────────── */

describe("remainingCapacity", () => {
  it("expectedBytes - receivedSoFar, 음수는 0", () => {
    expect(remainingCapacity(1000, 300)).toBe(700);
    expect(remainingCapacity(1000, 1200)).toBe(0);
    expect(remainingCapacity(1000, 1000)).toBe(0);
  });
});

/* ───────────────────── C14·C15 — 상수가 readonly 리터럴 ───────────────────── */

describe("상수는 사람이 못박은 readonly 리터럴이다 (C14·C15, FR-030·SC-011)", () => {
  const source = readFileSync(
    join(__dirname, "../../src/models/segmented/plan.ts"),
    "utf8",
  );

  it("C14 — SEGMENT_COUNT가 리터럴로 선언된다", () => {
    expect(source).toMatch(/export const SEGMENT_COUNT\s*=\s*4\b/);
  });

  it("C14 — MIN_SEGMENT_BYTES가 리터럴로 선언된다", () => {
    // 8 * 1024 * 1024 또는 8388608 — 8MiB
    expect(source).toMatch(
      /export const MIN_SEGMENT_BYTES\s*=\s*(?:8\s*\*\s*1024\s*\*\s*1024|8_?388_?608)\b/,
    );
  });

  it("C15 — 런타임 값이 소스 리터럴과 일치한다 (값 변경 시 실패)", () => {
    expect(SEGMENT_COUNT).toBe(4);
    expect(MIN_SEGMENT_BYTES).toBe(8 * 1024 * 1024);
  });

  it("계산으로 구간 수를 정하지 않는다 — 파일 크기·네트워크로 SEGMENT_COUNT를 만들지 않는다", () => {
    // planSegments의 count 인자 기본값이 SEGMENT_COUNT 상수여야 한다 (원칙 V, FR-012).
    expect(source).toMatch(/count\s*:\s*number\s*=\s*SEGMENT_COUNT/);
    // 구간 "수"를 파일 크기에서 도출하는 표현이 없어야 한다 — count 자리에
    // totalBytes를 나누는 계산이 오면 위반. (구간 "크기"를 totalBytes/count로 구하는
    // 것은 정상이다 — 그건 균등 분할이지 개수 산정이 아니다.)
    expect(source).not.toMatch(
      /(?:const|let)\s+\w*[Cc]ount\w*\s*=\s*Math\.(?:ceil|round|floor)\s*\(\s*totalBytes/,
    );
    expect(source).not.toMatch(/segmentCount\s*=\s*Math\./);
  });
});
