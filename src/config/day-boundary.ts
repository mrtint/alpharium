/**
 * 하루의 경계.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/signals.md 「하루 경계」
 *
 * **04:00이라는 값은 이 파일에만 존재한다(FR-021a).** 여기가 유일한 정의처다.
 * 신호 수집(다음 기능)과 일기 생성이 서로 다른 하루를 보면 일기의 근거가 어긋나므로,
 * 001에서 policy.ts를 헌법 원칙 I의 방어선으로 삼은 것과 같은 구조를 쓴다.
 *
 * 새벽 활동은 전날 일기에 붙는다. 00:30은 전날이고 04:00은 당일이다 — 이것이 자정
 * 기준과 다른 지점이며, 이 규칙의 전부다.
 *
 * **"지금"을 인자로 받는다.** 함수 안에서 new Date()를 부르면 03:59와 04:00 경계를
 * 테스트할 수 없다(research.md §4).
 */

/**
 * 04:00 경계로 잘린 하루의 식별자. `YYYY-MM-DD` 형식이다.
 *
 * 문자열인 이유: 저장 시 파일명이 곧 이 값이 되고(contracts/storage.md), 직렬화 왕복에서
 * 모양이 변하지 않는다. Date로 두면 시분초가 딸려와 "어느 하루인가"가 흐려진다.
 */
export type DayDate = string;

/**
 * 하루가 시작되는 시각(시). 기기의 현재 시간대를 따른다.
 *
 * **이 상수를 다른 파일로 복제하지 않는다(FR-021a).** 하루 경계가 필요하면 아래 두 함수를
 * 쓴다. 시간대가 바뀐 하루는 이 기능에서 정하지 않는다(FR-021b).
 */
const DAY_STARTS_AT_HOUR = 4;

/** Date를 기기 시간대 기준 `YYYY-MM-DD`로 만든다. UTC로 바꾸지 않는다. */
function formatDay(date: Date): DayDate {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 어떤 시각이 속한 하루를 구한다.
 *
 * 04:00 이전이면 전날에 속한다. 월·연 경계를 넘어가는 되돌림은 Date가 처리한다.
 */
export function dayOf(instant: Date): DayDate {
  const shifted = new Date(instant.getTime());
  shifted.setHours(shifted.getHours() - DAY_STARTS_AT_HOUR);
  return formatDay(shifted);
}

/**
 * 하루가 걸치는 시각의 구간을 구한다. `[start, end)` — 끝은 포함하지 않는다.
 *
 * 004에서 더했다. 사진을 「이 하루의 것」으로 고르려면 미디어 라이브러리에 시각 구간을
 * 넘겨야 하는데, **그 구간을 부르는 쪽에서 계산하면 04:00이 이 파일 밖으로 새어 나간다**
 * (FR-021a, 004 FR-002). 경계를 아는 자리는 여기 하나여야 한다.
 *
 * `dayOf(start)`와 `dayOf(end)`가 각각 그 하루와 다음 하루가 되는 것이 이 함수의 계약이다.
 */
export function dayBounds(day: DayDate): { startMs: number; endMs: number } {
  const [year, month, date] = day.split("-").map(Number);

  // 기기 시간대 기준으로 만든다. UTC로 바꾸면 하루가 어긋난다.
  const start = new Date(year, month - 1, date, DAY_STARTS_AT_HOUR, 0, 0, 0);
  const end = new Date(year, month - 1, date + 1, DAY_STARTS_AT_HOUR, 0, 0, 0);

  return { startMs: start.getTime(), endMs: end.getTime() };
}

/**
 * 어떤 하루가 닫혔는지 판정한다.
 *
 * 하루는 다음 날 04:00에 닫힌다. 아직 닫히지 않은 하루는 일기를 만들 수 없다(FR-018c) —
 * 하루가 끝나기 전에 쓰는 일기는 그 하루를 다 보지 못한 것이기 때문이다.
 */
export function isDayClosed(day: DayDate, now: Date): boolean {
  return dayOf(now) > day;
}

/**
 * 지금 시점에서 **일기를 쓸 수 있는 가장 최근의 하루**를 구한다 (006 FR-030).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`dayOf(now)`는 오늘이며 오늘은 정의상 닫히지 않았다.** 그래서 그것을 그대로
 * 파이프라인에 넘기면 언제나 `day-not-closed`로 멈춘다.
 *
 * **이 계산이 여기 있어야 하는 이유**: 「하루 전」을 부르는 쪽에서 빼면 04:00 경계가
 * 이 파일 밖으로 새어 나간다(FR-021a). 004가 `dayBounds`를 여기 둔 것과 같은 판단이며,
 * 새는 순간 신호 수집과 일기 생성이 서로 다른 하루를 보게 된다.
 *
 * 새벽 02:00에 부르면 그저께가 아니라 **어제**가 나온다 — 02:00은 아직 어제이므로
 * 그 앞의 하루가 마지막으로 닫힌 하루다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function latestClosedDay(now: Date): DayDate {
  const shifted = new Date(now.getTime());
  shifted.setHours(shifted.getHours() - DAY_STARTS_AT_HOUR);
  shifted.setDate(shifted.getDate() - 1);
  return formatDay(shifted);
}
