/**
 * 저장된 일기를 다시 읽어 점검한다 (060, 보드 `6h` ② 「저장 점검」).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md DI1~DI3, research R6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **읽기만 한다 — 고치지 않는다.** 인자 타입이 `listDays`·`load` 둘뿐이라 `save`·`removeAll`을 부를 수 없다(DI3). 날짜 목록에 있는데
 * `load`가 던지거나 `null`이면 읽기 실패 하나로 센다. 목록 자체를 못 읽으면 0편·정상으로 적지 않고 `unavailable`이다(원칙 V — 점검하지
 * 못한 것을 통과로 적지 않는다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DiaryStore } from "../diary/store";

export type DiaryInspection =
  { kind: "done"; total: number; unreadable: number } | { kind: "unavailable" };

export async function inspectDiaries(
  store: Pick<DiaryStore, "listDays" | "load">,
): Promise<DiaryInspection> {
  let days: readonly string[];
  try {
    days = await store.listDays();
  } catch {
    return { kind: "unavailable" };
  }

  let unreadable = 0;
  for (const day of days) {
    try {
      if ((await store.load(day)) === null) unreadable += 1;
    } catch {
      unreadable += 1;
    }
  }
  return { kind: "done", total: days.length, unreadable };
}
