# Data Model: 일기 홈을 디자인 보드 1d로 (048)

저장 계층 변경 없음. 새 파일도, 저장 필드도 없다 — 바뀌는 것은 **화면이 받는 값의 모양**과 **앱이 켜져 있는
동안의 상태**뿐이다.

## 1. `config/day-boundary.ts` — 더해지는 것

| 이름 | 모양 | 뜻 |
| --- | --- | --- |
| `STRIP_DAY_COUNT` | `7` (상수, export) | 홈 스트립의 칸 수. 사람이 정한 값 |
| `stripDays(now)` | `(Date) => readonly DayDate[]` | `dayOf(now)`로 끝나는 7일, **오래된 것이 먼저** |
| `writableAt(day, now)` | `(DayDate, Date) => Date \| null` | 지금 쓸 수 있으면 `null`. 오늘이고 아직 못 쓰면 쓸 수 있게 되는 시각 |

`writableAt` 규칙(R1):

| 조건 | 결과 |
| --- | --- |
| `isDayWritable(day, now)` | `null` |
| `day === dayOf(now)`이고 지금 달력 시각이 04:00 전(자정~04:00) | `new Date(dayBounds(day).endMs)` — 다음 달력일 04:00 |
| `day === dayOf(now)`이고 04:00~12:00 | 그 하루의 12:00 |
| 그 밖(미래의 날) | `null`이 아니라 호출되지 않는 갈래 — 계약상 `day ≤ dayOf(now)`만 넘긴다. 방어로 `null` |

`WRITABLE_FROM_HOUR`·`DAY_STARTS_AT_HOUR`는 여전히 export하지 않는다.

## 2. `app/state.ts` — 바뀌는 타입

```ts
export type SelectableDay = {
  day: DayDate;
  hasDiary: boolean;
  /** 048 — 지금 쓸 수 있는가. 009의 셋은 true, 아직 쓸 수 없는 오늘은 false */
  writable: boolean;
};

export type WritePrompt = {
  day: DayDate;               // I1: selectable 안에 있다 (변함없음)
  overwrites: boolean;
  selectable: readonly SelectableDay[];
  revertedFrom?: DayDate;
  /** 048 — 고른 날의 쓸 수 있음 (selectable에서 그 날의 writable) */
  writable: boolean;
  /** 048 — writable이 false일 때만. day-boundary.writableAt()의 값 */
  writableAt?: Date;
};

/** 048 — 화면이 받는 개수 요약. SignalValue 셋과 일대일, 기본값 없음 */
export type CountHint = { kind: "known"; count: number } | { kind: "none" } | { kind: "unknown" };

/** 048 — 신호 줄. 화면은 이것만 받는다 (DaySignals를 모른다) */
export type DayPreview = { day: DayDate; photos: CountHint; places: CountHint };

/** 048 — 날짜 조각. 표기 조립은 ui/home-text.ts */
export function dayParts(day: DayDate): { year: number; month: number; date: number; weekday: number };

/** 048 — 스트립 칸. writePromptFor 결과 + 목록에서 만든다 */
export type StripCell = {
  day: DayDate;
  hasDiary: boolean;      // 7칸 전부 — 읽기 전용 점
  selectable: boolean;    // prompt.selectable에 있는가
  selected: boolean;      // prompt.day와 같은가
};
export function stripCellsFor(items: readonly DiaryListItem[], prompt: WritePrompt, now: Date): StripCell[];
```

`DayPreview`에 `day`를 싣는 이유: 화면이 「요청한 날 ≠ 도착한 날」이면 결과를 버린다(FR-019). `PhotoHint`
(007, 목록 카드용)와 `CountHint`는 모양이 같지만 뜻이 다르다 — 앞은 **그 일기가 본 것**, 뒤는 **지금 쓰면
볼 것**. 하나로 합치지 않는다(설계 §2 「줄의 뜻이 하나로 유지된다」).

### `writePromptFor(items, now, chosenDay?)` 규칙 (확장)

1. `days = selectableDays(now)` (009, 전부 `writable: true`).
2. `today = dayOf(now)`. `!isDayWritable(today, now)`이면 `today`를 `writable: false`로 **맨 앞에** 더한다.
   (정오 이후면 이미 `days[0]`이므로 더하지 않는다.)
3. `chosenDay`가 `selectable` 안에 있으면 그 날, 아니면 `days[0]`(쓸 수 있는 첫 날 — D9). 벗어났으면
   `revertedFrom`(009 그대로).
4. `writable` = 고른 날 칸의 `writable`. 거짓이면 `writableAt = writableAt(day, now)`.
5. `overwrites`는 그대로 고른 날의 `hasDiary`.

불변식: I1(`day ∈ selectable`), I2(기본 선택은 언제나 `writable: true`), I3(`writable === false` ⇔
`writableAt !== undefined`), I4(`writable: false`인 칸은 최대 1개이고 그것은 오늘).

## 3. `app/day-preview.ts` — 새 파일

```ts
export function toDayPreview(day: DayDate, signals: DaySignals | null): DayPreview;
```

| `signals.photos` | `photos` | `signals.places` | `places` |
| --- | --- | --- | --- |
| `known` | `{known, count: value.photos.length}` | `known` | `{known, count: value.trace.visitCount}` |
| `none` | `{none}` | `none` | `{none}` |
| `unknown` | `{unknown}` | `unknown` | `{unknown}` |
| `signals === null` | `{unknown}` | — | `{unknown}` |

`count`가 0인 `known`은 그대로 0이다(004의 `collect`는 0장을 `none`으로 주므로 실제로는 나오지 않는다 —
만들어 내지도, 바꾸지도 않는다).

## 4. `app/wiring.ts` — `AppPipelineResult` 성공 갈래에 더함

```ts
previewDay: (day: DayDate) => Promise<DayPreview>;
```

`deps.loadSignals ?? deviceSignals`를 부르고 `toDayPreview(day, 결과)`. 던지면 `toDayPreview(day, null)`.
실패 갈래(`ok: false`)에는 `previewDay?: undefined`.

## 5. 앱 상태 (`App.tsx` `AppFrame`, 파일에 남지 않음)

| 상태 | 모양 | 수명 |
| --- | --- | --- |
| `route` | `"home" \| "settings" \| "developer"` | 앱 실행 중. `tab`을 대체. `developer`는 `showsDiagnostics`일 때만 들어갈 수 있다 |
| `chosenDay` | `DayDate \| null` | 앱 실행 중. `DiaryHomeScreen`의 로컬 상태에서 끌어올림(Q4). 앱 재시작 시 `null` |

## 6. 화면 로컬 상태 (`DiaryHomeScreen`)

| 상태 | 모양 | 뜻 |
| --- | --- | --- |
| `preview` | `{ kind: "loading"; day } \| DayPreview` | 신호 줄. 날이 바뀌면 `loading`, 도착한 결과의 `day`가 지금 고른 날과 같을 때만 반영 |
| `tick` | `number` | 전환 타이머·`AppState active`가 올리는 재판정 트리거 |

## 7. 상태 전이 — 고른 날의 쓸 수 있음

```
[쓸 수 있는 날 선택] ──스트립에서 오늘(아직 못 씀) 누름──▶ [쓸 수 없음: 안내 문구, 타이머 걸림]
[쓸 수 없음] ──writableAt 도달(타이머) 또는 AppState active 재판정──▶ [쓸 수 있음: CTA 나타남]
[쓸 수 없음] ──다른 날 누름──▶ [쓸 수 있는 날 선택] (타이머 해제)
[쓸 수 없음] ──설정으로 이동──▶ (DiarySection 언마운트, 타이머 해제) ──복귀──▶ 재판정
```
