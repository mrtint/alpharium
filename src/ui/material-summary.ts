/**
 * T054 — 재료 요약 파생 (004 FR-303·FR-304, 006 FR-511~FR-513·FR-516)
 *
 * **저장하지 않는다.** 표시 시점에 짝이 되는 집계에서 계산한다 (004 FR-304, 005 FR-473).
 *
 * - **시스템이 계산한다** — 모델의 출력에서 수량을 읽지 않는다 (004 FR-303)
 * - **관측된 항목만 센다** — 미관측을 0으로 표시하지 않는다 (004 FR-305, 006 FR-512)
 * - **셀 대상이 하나도 없으면 0을 나열하지 않는다** (006 FR-513) — 빈 목록을 돌려준다
 *
 * **세는 항목의 선택은 열려 있다** (006 FR-516이 성질만 정하고 선택을 구현에 넘겼다).
 */
import { isObserved } from "../signals/observation";
import type { DailyDigest } from "../signals/digest";

export interface MaterialCount {
  readonly label: string;
  readonly count: number;
}

/**
 * 짝이 되는 집계에서 재료 요약을 파생한다.
 *
 * 미관측 항목은 셈에 **등장하지 않는다** — 0으로 적히지 않는다. 셀 대상이 하나도
 * 없으면 빈 목록이며, 화면은 이것을 「0개」로 늘어놓지 않는다 (006 FR-513).
 */
export function deriveMaterialSummary(digest: DailyDigest): readonly MaterialCount[] {
  const counts: MaterialCount[] = [];

  // 관측된 것만 센다. 미관측이면 이 자리를 건너뛴다 (006 FR-512).
  if (isObserved(digest.stays)) {
    counts.push({ label: "머문 곳", count: digest.stays.value.length });
  }
  if (isObserved(digest.photos)) {
    counts.push({ label: "사진", count: digest.photos.value.length });
  }
  if (isObserved(digest.events)) {
    counts.push({ label: "일정", count: digest.events.value.length });
  }
  if (isObserved(digest.activePeriods)) {
    counts.push({ label: "움직인 시간대", count: digest.activePeriods.value.length });
  }

  return counts;
}

/** 셀 대상이 하나도 없는가 — 참이면 화면은 셈을 늘어놓지 않는다 (006 FR-513). */
export function hasNothingToCount(summary: readonly MaterialCount[]): boolean {
  return summary.length === 0;
}
