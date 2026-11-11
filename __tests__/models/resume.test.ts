/**
 * 재개 기록 ↔ 파일 정합 판정 (113, FR-006).
 *
 * 순수 함수이므로 기기 없이 돈다. 이 판정은 「구간 데이터가 실제로 파일에 있는가」를 보장하지
 * 않는다 — 크기로 볼 수 있는 어긋남만 잡고, 마지막 안전망은 최종 지문 검증이다.
 */

import { isResumeConsistent } from "../../src/models/resume";
import { MIN_SEGMENT_BYTES, SEGMENT_COUNT, planSegments } from "../../src/models/segmented/plan";
import type { SegmentedResume } from "../../src/models/segmented/types";

const TOTAL = MIN_SEGMENT_BYTES * 16;
const PLAN = planSegments(TOTAL);
const endOf = (i: number) => PLAN.segments[i].end;

const resume = (doneIndices: number[], over: Partial<SegmentedResume> = {}): SegmentedResume => ({
  assetKey: "a1",
  totalBytes: TOTAL,
  segmentCount: SEGMENT_COUNT,
  doneIndices,
  ...over,
});

const file = (bytes: number | null, exists = true) => ({ exists, bytes });

describe("isResumeConsistent", () => {
  it("정상: 크기가 가장 뒤 끝난 구간의 끝까지 닿고 전체를 넘지 않는다", () => {
    expect(isResumeConsistent(resume([0, 1]), file(endOf(1) + 1), TOTAL)).toBe(true);
    expect(isResumeConsistent(resume([0, 7]), file(TOTAL), TOTAL)).toBe(true);
  });

  it("모든 구간이 끝났고 크기가 전체면 정합", () => {
    const all = PLAN.segments.map((s) => s.index);
    expect(isResumeConsistent(resume(all), file(TOTAL), TOTAL)).toBe(true);
  });

  it("파일이 없으면 어긋남", () => {
    expect(isResumeConsistent(resume([0]), file(null, false), TOTAL)).toBe(false);
  });

  it("크기를 모르면(null) 어긋남", () => {
    expect(isResumeConsistent(resume([0]), file(null), TOTAL)).toBe(false);
  });

  it("크기가 가장 뒤 끝난 구간의 끝에 못 미치면 어긋남", () => {
    expect(isResumeConsistent(resume([0, 3]), file(endOf(3)), TOTAL)).toBe(false);
  });

  it("크기가 전체를 넘으면 어긋남", () => {
    expect(isResumeConsistent(resume([0]), file(TOTAL + 1), TOTAL)).toBe(false);
  });

  it("기준 크기가 있는데 기록의 전체 크기와 다르면 어긋남", () => {
    expect(isResumeConsistent(resume([0]), file(endOf(0) + 1), TOTAL + 1)).toBe(false);
  });

  it("기준 크기가 없으면(0) 그 비교를 건너뛴다 — 없는 기준으로 판정하지 않는다", () => {
    expect(isResumeConsistent(resume([0]), file(endOf(0) + 1), 0)).toBe(true);
  });

  it("구간 수가 계획과 다르면 어긋남", () => {
    expect(
      isResumeConsistent(resume([0], { segmentCount: SEGMENT_COUNT / 2 }), file(TOTAL), TOTAL),
    ).toBe(false);
  });

  it("끝난 구간이 없으면 파일 크기 하한이 없다 (빈 파일도 정합)", () => {
    expect(isResumeConsistent(resume([]), file(0), TOTAL)).toBe(true);
  });

  it("범위 밖 번호가 섞여 있으면 어긋남", () => {
    expect(isResumeConsistent(resume([SEGMENT_COUNT]), file(TOTAL), TOTAL)).toBe(false);
  });
});
