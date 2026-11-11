/**
 * 하단 바 치수 (115, 보드 밖 초안) — 순수 함수라 RN 없이 logic 테스트가 본다. 인셋을 읽는 훅은 `safe-bottom.ts`다.
 */

import { WRITTEN_DAY } from "./theme/tokens";

/** 바 위·아래 기본 여백 — 종전 `paddingVertical: 10` 그대로(사람이 정한 값, 보드 `1d`·`2c`) */
const BAR_PADDING = 10;

/** 쓸 수 있는 인셋이 아니면(음수·NaN·무한대) 0이다 */
export function usableInset(inset: number): number {
  return Number.isFinite(inset) && inset > 0 ? inset : 0;
}

/**
 * 하단 바 치수 — 최소 높이 64 + 인셋, 아래 여백 10 + 인셋. 글은 `justifyContent: center`로 위 64(내용 상자 44) 안에 그대로
 * 서고, 늘어난 자리는 바 색 면만 채운다.
 */
export function barMetrics(inset: number): { minHeight: number; paddingBottom: number } {
  const extra = usableInset(inset);
  return {
    minHeight: WRITTEN_DAY.bar.minHeight + extra,
    paddingBottom: BAR_PADDING + extra,
  };
}
