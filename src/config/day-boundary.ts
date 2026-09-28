/**
 * 하루의 경계.
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md DB1~DB13
 *       (이전: specs/002-diary-pipeline-contracts/contracts/signals.md 「하루 경계」 — 04:00)
 *
 * **하루는 기기 로컬 시간의 자정(00:00)에 바뀐다**(049 Clarification Q2). 002부터 048까지는
 * 04:00이었다(새벽 활동을 전날에 붙이던 규칙) — 049에서 사용자가 기기 달력 그대로를 택했다.
 *
 * **경계를 아는 자리는 이 파일 하나다(002 FR-021a).** 값이 바뀌어도 이 원칙은 그대로다 —
 * 신호 수집(`dayBounds`)과 일기 날짜(`dayOf`)가 서로 다른 하루를 보면 일기의 근거가 어긋난다.
 * 049가 경계를 옮기며 `vision/select.ts`에 04:00이 복제돼 있던 것을 찾아 걷어냈다 —
 * `__tests__/config/day-boundary-source.test.ts` DB11이 재발을 막는다.
 *
 * **"지금"을 인자로 받는다.** 함수 안에서 new Date()를 부르면 자정 경계를 테스트할 수 없다.
 */

/**
 * 하루의 식별자. `YYYY-MM-DD` 형식이며 기기 시간대의 달력 날짜다.
 *
 * 문자열인 이유: 저장 시 파일명이 곧 이 값이 되고(contracts/storage.md), 직렬화 왕복에서
 * 모양이 변하지 않는다. Date로 두면 시분초가 딸려와 "어느 하루인가"가 흐려진다.
 */
export type DayDate = string;

/**
 * 고를 수 있는 하루의 개수 (009 FR-003) — **049 이후 화면은 이것을 쓰지 않는다.**
 *
 * 백그라운드 재시도(`schedule/task.ts`)·알림 기록 정리·018 미리 준비(`App.tsx`의 사진 있는 날
 * 탐색·`canPrepare`)가 보는 「사흘」이다(049 FR-020 — 뜻을 보존한다). 화면은 지난 날 전부를
 * 고를 수 있다(049 FR-010).
 *
 * 밖으로 내보내지 않는다 — 부르는 쪽이 3을 알면 값이 두 곳에 생긴다.
 */
const SELECTABLE_DAY_COUNT = 3;

/**
 * 「사흘」 범위에 오늘이 들어오는 시각(시) — **`selectableDays()`의 구성 규칙에서만 쓴다.**
 *
 * 012에서는 「오늘을 쓸 수 있게 되는 시각」이었다. 049가 정오 제한을 없앴으므로(Q1) 오늘은
 * 언제든 쓸 수 있지만, 백그라운드가 보는 사흘의 구성은 바꾸지 않았다(Q4 — 자동 생성은 이
 * 조각에서 제외). **이 값을 `isDayWritable`에 되살리지 않는다.**
 */
const WRITABLE_FROM_HOUR = 12;

/** Date를 기기 시간대 기준 `YYYY-MM-DD`로 만든다. UTC로 바꾸지 않는다. */
function formatDay(date: Date): DayDate {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD`에서 `offset`일 떨어진 날. 월·연 되돌림은 Date가 처리한다. */
function addDays(day: DayDate, offset: number): DayDate {
  const [year, month, date] = day.split("-").map(Number);
  // **원본에서 매번 더한다** — 누적하면 서머타임 등으로 오차가 쌓인다. 정오에 두는 것도
  // 같은 이유다(자정에 두면 서머타임 전환일에 전날로 밀릴 수 있다).
  return formatDay(new Date(year, month - 1, date + offset, 12, 0, 0, 0));
}

/** 어떤 시각이 속한 하루 — 기기 시간대의 달력 날짜 */
export function dayOf(instant: Date): DayDate {
  return formatDay(instant);
}

/**
 * 하루가 걸치는 시각의 구간. `[start, end)` — 끝은 포함하지 않는다.
 *
 * 004에서 더했다. 사진을 「이 하루의 것」으로 고르려면 미디어 라이브러리에 시각 구간을
 * 넘겨야 하는데, **그 구간을 부르는 쪽에서 계산하면 경계가 이 파일 밖으로 새어 나간다.**
 *
 * `dayOf(start)`와 `dayOf(end)`가 각각 그 하루와 다음 하루가 되는 것이 이 함수의 계약이다.
 */
export function dayBounds(day: DayDate): { startMs: number; endMs: number } {
  const [year, month, date] = day.split("-").map(Number);

  // 기기 시간대 기준으로 만든다. UTC로 바꾸면 하루가 어긋난다.
  const start = new Date(year, month - 1, date, 0, 0, 0, 0);
  const end = new Date(year, month - 1, date + 1, 0, 0, 0, 0);

  return { startMs: start.getTime(), endMs: end.getTime() };
}

/**
 * 어떤 하루가 닫혔는지 — 다음 날 자정이 지났는가.
 *
 * 쓰기를 막는 판정이 아니다(049부터 오늘도 쓸 수 있다). 프롬프트의 「오늘은 아직 끝나지
 * 않았다」(012 `dayStillOpen`, `diary/request.ts`)가 이것을 본다.
 */
export function isDayClosed(day: DayDate, now: Date): boolean {
  return dayOf(now) > day;
}

/**
 * 이 하루를 지금 쓸 수 있는가 — **미래가 아니면 쓸 수 있다**(049 FR-018b).
 *
 * 012는 「닫혔거나, 오늘이면서 정오를 지났으면」이었다. 049가 정오 제한을 없앴다.
 * `pipeline.ts`의 게이트, 화면의 쓰기 예고, 040 첫 실행 자동 생성이 전부 이 함수 하나만 부른다.
 * 정상 경로로는 미래 날이 들어오지 않지만 게이트는 남긴다(048 FR-034의 세 겹).
 */
export function isDayWritable(day: DayDate, now: Date): boolean {
  return day <= dayOf(now);
}

/**
 * 어제 — 지금 시점에서 **닫힌 가장 최근의 하루** (006 FR-030).
 *
 * 개발자 탭의 생성 패널(`GenerationProbe`)이 쓴다. 하루를 빼는 계산이 여기 있어야 경계가
 * 밖으로 새지 않는다.
 */
export function latestClosedDay(now: Date): DayDate {
  return addDays(dayOf(now), -1);
}

/**
 * 「사흘」 — 백그라운드·알림·018 미리 준비의 범위 (009 FR-001, 012 FR-001a, 049 FR-020).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **언제나 정확히 셋이다.** 정오 이전에는 어제·그제·그그제, 정오 이후에는 오늘·어제·그제다.
 *
 * **★ 049 — 정오를 여기서 직접 본다.** 012까지는 `isDayWritable(today)`로 간접 판정했는데,
 * 049가 그 함수를 「미래가 아니면 참」으로 바꿨다. 그대로 두면 **정오 전에도 오늘이 들어와
 * 백그라운드가 아침에 오늘을 쓰기 시작한다**(research R4) — 오류 없이 조용히. 그래서 이 함수는
 * `isDayWritable`을 부르지 않는다(DB6·위반 주입 V1이 잠근다).
 *
 * **화면은 이것을 부르지 않는다**(049 FR-010·DB13) — 화면은 지난 날 전부를 고른다.
 *
 * **범위 크기를 인자로 받지 않는다**(009 FR-003). 받으면 부르는 쪽이 3을 알게 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function selectableDays(now: Date): readonly DayDate[] {
  const today = dayOf(now);
  const includesToday = now.getHours() >= WRITABLE_FROM_HOUR;
  const first = includesToday ? 0 : 1;

  const days: DayDate[] = [];
  for (let back = first; back < first + SELECTABLE_DAY_COUNT; back += 1) {
    days.push(addDays(today, -back));
  }
  return days;
}

/**
 * 그 날이 든 주 — **일요일부터 토요일까지 7일**, 오래된 것이 먼저 (049 DB8, 보드 `1d` 스트립).
 *
 * 주 시작(일요일)은 보드가 정한 값이다. 요일은 `Date.getDay()`(0 = 일요일)를 따른다.
 */
export function weekOf(day: DayDate): readonly DayDate[] {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(year, month - 1, date, 12, 0, 0, 0).getDay();
  return Array.from({ length: 7 }, (_, i) => addDays(day, i - weekday));
}

/** 같은 요일로 `weeks`주 떨어진 날 (049 DB8 W4) */
export function shiftWeek(day: DayDate, weeks: number): DayDate {
  return addDays(day, weeks * 7);
}

/**
 * 다음 하루가 시작되는 시각 — 다음 자정 (049 DB9).
 *
 * 홈이 켜진 채 자정을 넘길 때 오늘 밑줄을 옮기는 타이머가 쓴다(FR-019). 경계 시각을 화면이
 * 계산하지 않게 여기서 준다.
 */
export function nextDayStartAt(now: Date): Date {
  return new Date(dayBounds(dayOf(now)).endMs);
}
