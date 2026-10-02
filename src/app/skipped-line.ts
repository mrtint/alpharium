/**
 * 설정 사진 행의 건너뜀 보조 줄 — 「어제/M월 d일 자동 쓰기를 건너뛰었어요」 (057, 보드 `6g`).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md SL1, spec FR-010·FR-026, Clarification Q5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **「어제」는 건너뛴 날(일기의 날) 기준이다** — 보는 순간의 오늘과 비교한다. 목표 시각이 자정을 넘는 날에는 건너뛴 시각과
 * 일기의 날이 어긋나지만, 사용자가 홈에서 고를 것은 일기의 날이다. 그 밖(오늘 포함)은 「{M}월 {d}일」이다 — 「오늘」 문구는
 * 보드에 없어 두지 않는다.
 *
 * **하루 경계를 다시 계산하지 않는다**(049 DB11) — 「어제」는 `latestClosedDay(now)`가 준다. 날짜는 문자열을 나눠 앞 0만 뗀다.
 *
 * 문장 틀(보드 `perm.photos.skippedYesterday`·`perm.photos.skippedOn` 원문)은 여기 둔다 — `src/app/`이 `src/ui/`를 import하지
 * 않는다(056 `target-hour.ts` 관례). `settings-text.ts`가 이 값을 가리킨다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { latestClosedDay, type DayDate } from "../config/day-boundary";

export const SKIPPED_LINE = {
  yesterday: "어제 자동 쓰기를 건너뛰었어요",
  on: "{M}월 {d}일 자동 쓰기를 건너뛰었어요",
} as const;

export function skippedLineText(day: DayDate, now: Date): string {
  if (day === latestClosedDay(now)) return SKIPPED_LINE.yesterday;
  const [, month, date] = day.split("-").map(Number);
  return SKIPPED_LINE.on.replace("{M}", String(month)).replace("{d}", String(date));
}
