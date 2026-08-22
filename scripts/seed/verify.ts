/**
 * 심은 것을 되읽어 확인한다 (FR-018d).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md 「5단계」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 이 기능의 핵심 방어선이다.**
 *
 * research.md §1의 실측: `adb push`가 성공하고 MediaStore에 행이 생겨도 `datetaken`이
 * NULL이면 **앱은 그 사진을 어느 하루에서도 보지 못한다** — 앱의 질의가
 * `CREATION_TIME`의 범위를 보기 때문이다(`expo-port.ts`의 `photosBetween`).
 *
 * 「push 성공 = 심겼다」가 **거짓임을 실측했다.** 이 확인이 없으면 006의
 * `GenerationProbe`·007의 끊긴 배선·008의 버려진 반환값·009의 `day:` 한 줄과 **같은
 * 종류의 조용한 실패**가 하나 더 생긴다 — 오류는 나지 않고 아무 일도 일어나지 않을 뿐.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **순수 함수다.** 기기에서 읽어 온 행을 받아 판정만 하므로 기기 없이 검증된다 —
 * 004가 `collect.ts`를 `expo-port.ts`에서 떼어 낸 것과 같은 구조다.
 */

import { dayBounds, dayOf, type DayDate } from "../../src/config/day-boundary.ts";
import type { MediaRow } from "./device.ts";
import type { FailureReason } from "./plan.ts";

export type VerifyResult = { ok: true } | { ok: false; reason: FailureReason; detail: string };

/**
 * 되읽은 행들이 「그 하루에 그만큼」인지 본다.
 *
 * **순서가 계약이다**: 색인 실패를 시간대 어긋남보다 **먼저** 본다. `datetaken`이
 * NULL인 것과 「엉뚱한 하루에 걸렸다」는 다른 문제이고 에이전트가 다르게 대응해야
 * 하므로, NULL을 「구간 밖」으로 뭉개면 원인이 흐려진다.
 */
export function verifySeeded(rows: MediaRow[], day: DayDate, expectedCount: number): VerifyResult {
  const { startMs, endMs } = dayBounds(day);

  // ① 색인이 됐는가 — datetaken이 있는 행만 센다
  const indexed = rows.filter((r) => r.datetakenMs !== null);

  if (indexed.length < expectedCount) {
    return {
      ok: false,
      reason: "index-failed",
      detail:
        `${expectedCount}장을 심었는데 색인된 것은 ${indexed.length}장이다. ` +
        `파일은 기기에 있어도 datetaken이 없으면 앱이 보지 못한다`,
    };
  }

  // ② 0장을 기대했는데 그 하루의 행이 있으면 앞선 실행이 남긴 것이다
  const inDay = indexed.filter((r) => r.datetakenMs! >= startMs && r.datetakenMs! < endMs);

  if (expectedCount === 0) {
    if (inDay.length === 0) return { ok: true };
    return {
      ok: false,
      reason: "verify-mismatch",
      detail: `사진 0장인 하루를 만들려 했는데 ${day}에 ${inDay.length}장이 이미 있다`,
    };
  }

  // ③ 그 하루가 맞는가 — 시간대 어긋남을 여기서 잡는다(research.md §8)
  if (inDay.length < expectedCount) {
    const strays = indexed
      .filter((r) => r.datetakenMs! < startMs || r.datetakenMs! >= endMs)
      .map((r) => dayOf(new Date(r.datetakenMs!)));
    const uniqueStrays = [...new Set(strays)];

    return {
      ok: false,
      reason: "verify-mismatch",
      detail:
        `${day}에 심으려 했는데 ${uniqueStrays.join(", ")}로 잡혔다. ` +
        `개발 기계와 기기의 시간대가 다를 수 있다`,
    };
  }

  return { ok: true };
}
