# Data Model: 대화상자 기반 (050)

저장 형식은 바뀌지 않는다 — `DiaryEntry`·`preferences/*.json` 무변경. 아래는 화면 상태와 순수 함수의 모양이다.

## 1. 한 날 칸 판정 — `cellFor` (FR-017, research R9)

`src/app/state.ts`

```ts
export function cellFor(
  day: DayDate,
  items: readonly DiaryListItem[],
  selectedDay: DayDate,
  now: Date,
): StripCell; // { day, hasDiary, isToday, selectable, selected }
```

- `hasDiary = items.some(i => i.day === day)` (읽을 수 없는 일기도 날을 차지한다 — 006 FR-017a)
- `isToday = day === dayOf(now)`, `selectable = isDayWritable(day, now)`(= 미래가 아니다, 049), `selected = day === selectedDay`
- **`weekCellsFor(items, prompt, now)`는 `weekOf(prompt.day).map(d => cellFor(d, items, prompt.day, now))`로 바뀐다** — 결과는 049와 같다
  (049 계약 테스트가 그대로 통과해야 한다).
- 달력의 `Day` 렌더와 `disabledDates`는 `cellFor`만 부른다. 달력 쪽에 `dayOf`·`isDayWritable`·`items.some` 호출이 새로 생기지 않는다(계약 C-CAL5).

## 2. 보이는 달 — `src/app/calendar.ts` (순수, 새 파일)

```ts
export type CalendarMonth = { year: number; month: number }; // month 1–12
export type CalendarView = "day" | "month" | "year";

monthOf(day: DayDate): CalendarMonth
shiftMonth(m: CalendarMonth, delta: number): CalendarMonth           // 연 경계 넘김
isLatestMonth(m: CalendarMonth, now: Date): boolean                  // m이 dayOf(now)의 달 → ›·다음 달 비활성
isFutureMonth(m: CalendarMonth, now: Date): boolean                  // 월 목록 비활성
yearPageOf(year: number, now: Date): readonly number[]               // 12년 한 쪽, 오늘이 든 해로 끝나는 쪽 기준
isLatestYearPage(page: readonly number[], now: Date): boolean        // 연 목록 › 비활성
dayDateFromPicker(value: string | Date): DayDate                     // 'YYYY-MM-DD HH:mm' → 앞 10글자, Date → dayOf(value)
latestPickableDay(now: Date): DayDate                                // = dayOf(now). datepicker maxDate용 — 달력 화면이 dayOf를 직접 부르지 않게(CAL5)
```

- 「오늘」은 전부 `dayOf(now)`에서 온다 — 달력 계산이 하루 경계를 따로 셈하지 않는다(049 DB11 유지).
- 과거 한계 없음(Q2): `shiftMonth`·연 목록 ‹는 끝없이 앞으로 간다.

### 달력 대화상자 로컬 상태 (파일에 남기지 않는다 — FR-020)

| 값 | 처음 | 바뀌는 때 |
| --- | --- | --- |
| `shown: CalendarMonth` | 열 때 `monthOf(selectedDay)` | ‹ ›, 월 목록·연 목록 선택 |
| `view: CalendarView` | `"day"` | 월 표시 탭 → `"month"`, 연 표시 탭 → `"year"`, 목록에서 고르면 `"day"` |
| `yearPage` | `yearPageOf(shown.year, now)` | 연 보기 ‹ › |

닫을 때 버린다. 다시 열면 처음 값으로 시작한다. datepicker는 `view === "day"`일 때만 그리며 `key={`${year}-${month}`}`로 다시 마운트해 보이는
달을 바꾼다(research R5).

## 3. 덮어쓰기 확인 상태 (FR-006·FR-009)

`AppScreen`의 `confirm-overwrite` 갈래에 **`items`를 더한다**:

```ts
| { kind: "confirm-overwrite"; day: DayDate; items: DiaryListItem[] }
```

- 이유: 대화상자는 홈 **위에** 뜬다(FR-001). 뒤에 그릴 홈(스트립·헤더·목록)에 목록이 필요하다. 012가 「필드가 `day` 하나뿐」으로 막은 것은
  **일기 본문·미리보기**였다(X1, 원칙 I). `DiaryListItem`은 이미 목록 화면이 보이는 요약(날짜·제목·읽을 수 있는가·사진 요약)이라 그 방어를
  깨지 않는다. `DiaryEntry`는 여전히 싣지 않는다.
- `startWriting(prompt, items)`: `prompt.overwrites`면 `{ kind: "confirm-overwrite", day: prompt.day, items }`.
- `cancelOverwrite(items)` → `toList(items)` (변함없음). 화면은 **목록을 다시 읽지 않고** 들고 있던 `items`로 돌아간다 — 취소는 아무것도 바꾸지
  않았기 때문이다.
- `confirmOverwrite()` → `toWriting()` (변함없음, 인자 없음 — 012 C3).
- 오늘 안내(FR-007a) 여부는 상태에 싣지 않는다 — 화면이 `cellFor(day, items, day, now).isToday`로 가른다(판정 하나).

## 4. 대화상자 부품 계약 (props)

스펙 용어 대응: 「확인 대화상자」 = `ConfirmDialog`(RNR AlertDialog), 「일반 대화상자」 = `DismissibleDialog`(RNR Dialog).

| 부품 | 파일 | props | 닫힘 |
| --- | --- | --- | --- |
| `ConfirmDialog` | `src/ui/components/Dialog.tsx` | `open`, `onCancel?`, `title`, `description?`, `children?`, `actions` | 덮개 ✗. 뒤로 가기 → `onCancel`(없으면 아무 일도 없음) |
| `DismissibleDialog` | 같은 파일 | `open`, `onClose`, `title`, `children` | 덮개·뒤로 가기 → `onClose` |
| `OverwriteConfirmDialog` | `src/ui/OverwriteConfirmDialog.tsx` | `isToday`, `onCancel`, `onConfirm` (구현 중 `day`를 뺐다 — 보드 `2d`는 날짜를 보이지 않는다) | `ConfirmDialog` |
| `DateJumpDialog` | `src/ui/DateJumpDialog.tsx` | `open`, `items`, `selectedDay`, `now`, `onPick(day)`, `onClose` | `DismissibleDialog` |
| `DownloadConsentDialog` | 기존 파일 교체 | 기존 props 그대로(`visible`, `onConfirm`) | `ConfirmDialog`(`onCancel` 없음) |
| `HomeMenu` | 기존 파일 교체 | 기존 props 그대로(`items`) | RNR `DropdownMenu` |

- `onCancel`·`onClose`는 프리미티브의 BackHandler가 **마운트 시점에 붙잡는다**(research R3). 부품은 `onOpenChange={(open) => { if (!open) latest.current?.() }}`
  처럼 **ref로 최신 콜백을 읽는다**.
- 면 모양(FR-003)·버튼 모양(FR-008)은 `Dialog.tsx` 한 곳이 준다. 이후 조각(`2f`·`2m`)이 `ConfirmDialog`를 그대로 쓴다(FR-004).

## 5. 홈 화면 배선

- `DiaryListScreen`에 `onPressDate?: () => void` prop — 헤더의 큰 숫자·요일 영역을 `Pressable`(testID `home-date-button`)로 감싼다. 월 라벨·상태 줄은
  감싸지 않는다(FR-012).
- `DiaryHomeScreen`이 `calendarOpen` 로컬 상태를 쥔다. `onPick(day)` → 닫기 → 기존 `onSelectDay(day)`(049 `setChosenDay`) — 스트립 주·헤더·
  크로스페이드는 049가 이미 고른 날에서 계산한다. **새 주 계산을 만들지 않는다**(FR-018).
- `confirm-overwrite`일 때 `DiaryListScreen`을 `screen.items`로 그리고 그 위에 `OverwriteConfirmDialog`를 그린다.

## 6. 문구 (FR-021, `src/ui/home-text.ts`)

```ts
export const OVERWRITE_CONFIRM = {
  title: "일기를 다시 쓸까요?",
  body: "다 쓰면 지금 일기가 새 글로 바뀌어요.",
  todayNote: "지금까지의 하루로 써요.", // Q5 — 사람이 정한 문장(보드 2g 메모에서)
  confirm: "다시 쓰기",
  cancel: "취소",
} as const;
export const DATE_JUMP = { title: "날짜로 이동", cancel: "취소" } as const;
export const CALENDAR_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
calendarMonthText(m: CalendarMonth): string // "9월"
calendarYearText(year: number): string       // "2026년"
```

## 7. 토큰 (FR-022, research R6)

`src/ui/theme/tokens.ts`

- `RADIUS.control = 6` (버튼). tailwind `borderRadius.control`.
- `RNR_COLOR_ALIASES` — 값은 전부 `COLORS.*` 참조(새 hex 0개): `background→bg`, `foreground→text`, `muted-foreground→textMuted`,
  `primary→accent`, `primary-foreground→accentForeground`, `input→text`, `popover→bg`, `popover-foreground→text`.
- `OVERLAY = { scrim: "rgba(0,0,0,0.5)", faceShadow: "0px 10px 30px rgba(0,0,0,0.18)" }` — 면 그림자는 RN `boxShadow` 문자열 하나로 둔다(구현 중 정정).
- `DIALOG = { padding: 24, gap: 16, inset: 20, borderWidth: 2, buttonHeight: 48, buttonGap: 8 }`,
  `CALENDAR = { navSize: 40, cellHeight: 40, dot: 4, underlineOffset: 3, disabledOpacity: 0.3 }` — 사람이 정한 값(보드 §3.1).
