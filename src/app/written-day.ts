/**
 * 쓴 날의 지면 판정 (051, 보드 `2c`·`2k`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md PAP1~PAP6, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **홈이 곧 상세다.** 051 전에는 목록 카드를 눌러 별도 상세 화면(`detail`)으로 갔다. 이제 쓴 날은
 * 화면 상태가 아니라 **홈이 고른 날로 그리는 지면 상태**다.
 *
 * **쓴 날인가는 `kind !== "unwritten"`이다 — 읽기를 기다리지 않는다**(FR-001). 목록 요약이 먼저
 * 정하므로 하단 바(「일기 쓰기」/「다시 쓰기」)가 파일을 읽는 동안 깜빡이지 않는다. 읽기 결과는
 * 본문만 채운다.
 *
 * **늦게 온 결과는 셋째 갈래로 버려진다**(FR-016) — `loaded.day`가 고른 날과 다르면 `loading`이다.
 * 「읽는 중」을 상태로 저장하지 않는다(048 신호 줄과 같은 방식).
 *
 * **빈 일기를 지어내지 않는다**(원칙 I·V, 006 FR-017a) — 목록은 읽을 수 있었는데 고른 순간
 * 읽기가 실패하면(`entry === null`) `unreadable`이다. 「일기가 없다」와 다른 상태다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import type { DiaryEntry } from "../diary/types";
import type { DiaryListItem } from "./state";

export type PaperState =
  | { kind: "unwritten" }
  | { kind: "loading" }
  | { kind: "readable"; entry: DiaryEntry }
  | { kind: "unreadable" };

/** 마지막으로 도착한 읽기 결과. `entry`가 `null`이면 읽지 못했다 */
export type LoadedEntry = { day: DayDate; entry: DiaryEntry | null };

export function paperFor(
  day: DayDate,
  items: readonly DiaryListItem[],
  loaded: LoadedEntry | undefined,
): PaperState {
  const item = items.find((i) => i.day === day);
  if (item === undefined) return { kind: "unwritten" };
  if (!item.readable) return { kind: "unreadable" };
  if (loaded === undefined || loaded.day !== day) return { kind: "loading" };
  if (loaded.entry === null) return { kind: "unreadable" };
  return { kind: "readable", entry: loaded.entry };
}

/**
 * 끝에 닿았다고 보는 여유 (보드 `5b` — 「본문 맨 끝(4px 이내)」). 사람이 정한 값이다.
 */
export const END_SLACK = 4;

/**
 * 지면을 끝까지 내렸는가 — 쓴 날의 「다시 쓰기」 바가 올라오는 조건(보드 `2c` ④·`2k`, 051 수정).
 *
 * `y + 보이는 높이 ≥ 전체 높이 − 4`. 본문이 화면보다 짧으면 처음부터 참이다(`2k`). 아직 재지 못했으면
 * (높이 0) 거짓 — 긴 본문에서 바가 한 번 올라왔다 내려가지 않게 한다.
 */
export function reachedEnd(
  offsetY: number,
  viewportHeight: number,
  contentHeight: number,
): boolean {
  if (viewportHeight <= 0 || contentHeight <= 0) return false;
  return offsetY + viewportHeight >= contentHeight - END_SLACK;
}
