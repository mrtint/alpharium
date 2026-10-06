/**
 * 홈 화면(048, 보드 `1d`)의 문구 조립.
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md H4·H5
 *       specs/048-diary-home-modernist/contracts/home-screen.md G10, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않는다.** 날짜 조각은 `dayParts()`(state.ts)에서, 오늘인가는 스트립 칸
 * (`weekCellsFor()`의 `isToday`)에서 온다.
 * 여기는 그것을 사람의 말로 옮길 뿐이다.
 *
 * **049 — 시각 문구가 사라졌다.** 정오 제한이 없어져 「오후 12시부터」·「오전 4시부터」를 말할
 * 일이 없다(`hourText` 삭제). 되돌림도 없어졌다(`revertedText` 삭제). 시각 숫자를 문구로 적지
 * 않는 규칙(G10)은 그대로다 — 적는 순간 화면이 하루 경계를 따로 판정하게 된다.
 *
 * **문구는 보드 `1d` KO 원문이다**(C4) — `home-text.test.ts`가 글자 단위로 잠근다.
 * **해요체다**(FR-037) — 홈의 새 문구는 전부 이 파일에서 조립된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CalendarMonth } from "../app/calendar";
import { dayParts, type DiaryListItem } from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { lazyList, lazyText, text } from "../i18n/current";

/*
 * 062 — 문구는 한국어 카탈로그(`src/i18n/catalogs/ko/calendar.ts`·`home.ts`)로 옮겼다. 이 파일은 판정(어느 문구를 고르는가)과
 * 옛 이름(`OVERWRITE_CONFIRM` 등)을 그대로 두는 얇은 층이다 — 화면·테스트는 이름을 바꾸지 않고 카탈로그의 말을 읽는다.
 */

export function weekdayLong(weekday: number): string {
  return text().calendar.weekdayLong[weekday] ?? "";
}

export function weekdayShort(weekday: number): string {
  return text().calendar.weekdayShort[weekday] ?? "";
}

/** 헤더의 월 표시 — **고른 날의 달**(Clarification Q2). 예: 「2026년 9월」 */
export function monthText(day: DayDate): string {
  const { year, month } = dayParts(day);
  return text().calendar.monthText(year, month);
}

/** 하단 바의 날짜 조각 — 누를 수 없는 글자(D7). 예: 「13일」 */
export function dayOfMonthText(day: DayDate): string {
  return text().calendar.dayOfMonthText(dayParts(day).date);
}

/**
 * 헤더 상태 줄 (049 H4, 보드 `1d` ②).
 *
 * | 상황 | 문구 |
 * | --- | --- |
 * | 일기 없음, 오늘 | 오늘 일기를 쓸 수 있어요 (보드 `t.dayState`) |
 * | 일기 없음, 지난 날 | 이 날 일기를 쓸 수 있어요 (보드 `m.dayStatePast`) |
 * | 일기 있음, 제목 있음 | 그 제목 |
 * | 일기 있음, 제목 없음 | 이 날 일기를 썼어요 (사람이 정한 값 — 014 `title: undefined`) |
 * | 읽을 수 없음 | 읽을 수 없어요 (006 FR-017a, 목록 카드와 같은 말) |
 *
 * 「오늘 일기를 썼어요」로 나누지 않는다 — 헤더의 날짜 표시에 「오늘」 글자를 두지 않는 규칙
 * (FR-015)의 예외는 보드가 정한 첫 문장 하나뿐이다.
 */
export function dayStateText(item: DiaryListItem | undefined, isToday: boolean): string {
  const T = text().home.dayState;
  if (item === undefined) return isToday ? T.today : T.past;
  if (!item.readable) return T.unreadable;
  return item.title ?? T.writtenNoTitle;
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * 050 — 대화상자 문구 (보드 `2d`·`2j` KO 원문, contracts/dialogs.md TXT1·TXT2).
 *
 * 화면 소스에 문구 리터럴을 두지 않고 여기서만 가져간다(TXT3). `todayNote`만 보드 문구표에 없는
 * **사람이 정한 문장**이다 — Clarifications Q5, 보드 `2g` 메모 「그 시점까지의 하루로 새로 씀」에서
 * 옮겼다. 오전에 쓴 오늘 일기가 저녁까지 지어내는 문제(049 관측, 원칙 II)를 고치지는 않고, 오늘을
 * 다시 쓸 때 사실만 알린다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 덮어쓰기 확인 (`2d`, 보드 `h2.confirm*`) */
export const OVERWRITE_CONFIRM = lazyText((c) => c.home.overwriteConfirm);

/** 날짜로 이동 (`2j`, 보드 `cal.title`·`cal.cancel`) */
export const DATE_JUMP = lazyText((c) => c.home.dateJump);

/** 달력 요일 머리 — 일요일 시작 (보드 `cal.dows`) */
export const CALENDAR_WEEKDAYS = lazyList((c) => c.calendar.weekdayShort);

/** 달력 머리의 월. 예: 「9월」 (보드 `cal.month`) */
export function calendarMonthText(m: CalendarMonth): string {
  return text().calendar.calendarMonthText(m.month);
}

/** 달력 머리·연 목록의 해. 예: 「2026년」 (보드 `cal.year`) */
export function calendarYearText(year: number): string {
  return text().calendar.calendarYearText(year);
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * 051 — 쓴 날 읽기 문구 (보드 `2c`·`2g`, contracts/written-day.md TXT1~TXT3·TIME1~TIME4).
 *
 * `rewrite`와 `writtenAtText()`의 틀(「2시간 15분 전에 작성」)은 보드 원문(`h2.rewrite`·
 * `m.writtenAt13`)이다. 나머지는 Clarifications에서 정한 **사람이 쓴 문장**이다 — 006·017의 해라체
 * (「이 날의 일기를 읽을 수 없다」·「이 사진은 이제 없다」·「저장하지 못했다…」)를 해요체로 옮겼다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const WRITTEN_DAY_TEXT = lazyText((c) => c.home.writtenDay);

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * 054 — 쓰는 중 문구 (보드 `2b` KO 원문: `t.writingKicker`·`t.writingBy`·`t.stop`).
 *
 * `byline()`의 조사는 035 `particleFor()`가 고른다(받침 있으면 「이」, 없으면 「가」). `fallback`은 첫 진행
 * 신호가 오기 전의 자리 문구로 지금까지의 값을 그대로 둔다(039). 문구는 `home-text.test.ts`·
 * `writing-in-place.test.tsx`가 글자 단위로 잠근다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const WRITING_TEXT = lazyText((c) => c.home.writing);

const MINUTE_MS = 60 * 1000;

/**
 * 오늘의 일기 작성 시각을 상대 시각으로 (보드 `2g`, data-model §4).
 *
 * **밀리초 차이만 센다** — 하루 경계가 아니다(049 DB11). 내림이다(더 정밀해 보이지 않게, 017
 * `formatDuration`과 같은 방향). 미래(기기 시각을 되돌림)는 「방금」으로 떨어진다 — 음수 시각을
 * 보이지 않는다. 표시 여부(그 일기의 하루가 오늘인가)는 부르는 쪽이 `cellFor`로 정한다.
 */
export function writtenAtText(createdAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - createdAt.getTime()) / MINUTE_MS);
  const T = text().home.writtenAt;
  if (minutes < 1) return T.justNow;
  if (minutes < 60) return T.minutesAgo(minutes);
  return T.hoursAgo(Math.floor(minutes / 60), minutes % 60);
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * 053 — 쓸 재료 문구 (보드 `1d` ④·`2l`·`2m`·`2e`·`2f` KO 원문, contracts/material.md SRC3).
 *
 * 보드 원문은 `m.*`(photos·places·unitP·unitL·noPerm·emptyNote·fabTitle·fabBody·fabYes·fabNo)와 `2m` 메모의
 * 설정 안내다. **사람이 정한 두 줄**은 보드에 없다 — `confirmTitleUnseen`(기록이 있는지 모르는 상태에서
 * 「아무 기록도 없어요」라 단정하지 않는다, 원칙 V)과 `madeUpDay`(사용자 표현 그대로).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const MATERIAL_TEXT = lazyText((c) => c.home.material);
