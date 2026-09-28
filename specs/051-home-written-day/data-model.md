# Data Model: 쓴 날 읽기 — 홈이 곧 상세

**Feature**: [spec.md](spec.md) · **Research**: [research.md](research.md)

**저장 형식은 바뀌지 않는다.** `DiaryEntry`·일기 파일·`notified.json`·설정 파일 어디에도 필드를 더하거나 빼지 않는다. 이 조각이 바꾸는
것은 화면 상태(`AppScreen`)와 그것을 그리는 순수 판정뿐이다.

---

## 1. 읽기 전용으로 쓰는 저장 값 (`src/diary/types.ts`, 무변경)

| 필드 | 쓰는 곳 | 비고 |
| --- | --- | --- |
| `date` | 지면·결과 화면 | 고른 날과 같다 |
| `title?` | 헤더 제목(FR-005), 결과 화면(FR-024a) | 없으면 FR-007 |
| `text` | 지면 본문(FR-014), 결과 화면 | 전문, 잘림 없음 |
| `photos?: { photoId, takenAt, resizedPath }[]` | 캐러셀(FR-009~FR-012) | 없거나 0장 → 캐러셀 없음. 순서는 배열 순서(023 시각순) |
| `createdAt: Date` | 상대 작성 시각(FR-019) | 오늘의 일기에만 |
| `signalsUsed`·`timing`·`authorName`·`placeName` | **쓰지 않는다**(FR-016a) | 지우지 않는다 |

`DiaryListItem`(`src/app/state.ts`, 무변경): `day`·`readable`·`photos`(PhotoHint)·`title?`. 목록 화면은 없어지지만 스트립 점(049 `cellFor`)·
쓴 날 판정·헤더 제목에 계속 쓰인다.

---

## 2. 지면 상태 `PaperState` (새, `src/app/written-day.ts`)

```ts
type PaperState =
  | { kind: "unwritten" }                 // 목록에 그 날이 없다
  | { kind: "loading" }                   // 목록엔 있고(readable) 아직 이 날의 읽기가 도착하지 않았다
  | { kind: "readable"; entry: DiaryEntry }
  | { kind: "unreadable" };               // 목록이 readable:false, 또는 load()가 null

function paperFor(
  day: DayDate,
  items: readonly DiaryListItem[],
  loaded: { day: DayDate; entry: DiaryEntry | null } | undefined,
): PaperState;
```

**판정표** (`item = items.find(i => i.day === day)`):

| item | item.readable | loaded | 결과 |
| --- | --- | --- | --- |
| 없음 | — | 무엇이든 | `unwritten` |
| 있음 | false | 무엇이든 | `unreadable` |
| 있음 | true | 없음 또는 `loaded.day !== day` | `loading` |
| 있음 | true | `loaded.day === day`, `entry === null` | `unreadable` |
| 있음 | true | `loaded.day === day`, `entry !== null` | `readable` |

- **「쓴 날인가」는 `kind !== "unwritten"`이다** — 하단 바(「일기 쓰기」/「다시 쓰기」)와 신호 줄/지면 선택은 이것만 본다. 읽기를 기다리지 않는다.
- **늦게 온 결과**는 표의 셋째 줄로 버려진다(FR-016). 「읽는 중」을 상태로 저장하지 않는다(048 R — `set-state-in-effect`).
- 순수 함수다. `new Date()`·파일을 부르지 않는다.

---

## 3. 화면 상태 `AppScreen` (`src/app/state.ts`, 변경)

```ts
type AppScreen =
  | { kind: "build-error" }
  | { kind: "list"; items: DiaryListItem[] }                        // 홈 (쓴 날·안 쓴 날 모두)
  | { kind: "confirm-overwrite"; day: DayDate; items: DiaryListItem[] }  // 050 그대로
  | { kind: "writing"; stage?; branch?; line? }                      // 그대로
  | { kind: "unsaved"; entry: DiaryEntry }                           // 새 — FR-024a
  | { kind: "failed"; message: string };                             // 그대로
```

**없어지는 갈래**: `detail`, `unreadable`, `written`. **없어지는 함수**: `toDetail`. `initialScreen`의 `opts.initialDay`/`entry` 인자와
`detail` 갈래(알림 라우팅은 §5로 옮긴다).

**`afterGeneration` (변경)**:

```ts
type AfterGeneration =
  | { kind: "home" }                      // result.ok — 화면이 목록을 다시 읽고 list로 간다
  | { kind: "unsaved"; entry: DiaryEntry } // 저장 실패, 글 있음 (006 FR-012a)
  | { kind: "failed"; message: string };  // 그 밖 (describeStage 그대로)
```

- `overwrote`는 더 이상 화면으로 가지 않는다(Clarifications — `2d`에서 확인했다). 파이프라인 결과 타입(`PipelineResult.overwrote`)은 그대로 둔다.
- **`toWriting()`은 여전히 인자가 없다**(006 S1). `startWriting(prompt, items)`도 050 그대로 — 쓴 날의 「다시 쓰기」와 안 쓴 날의 「일기 쓰기」가 같은 함수를 탄다(FR-021).

**전이**:

```
list ──(일기 쓰기 / 다시 쓰기, overwrites=false)──▶ writing
list ──(다시 쓰기, overwrites=true)──▶ confirm-overwrite ──(취소)──▶ list
                                                     └─(다시 쓰기)──▶ writing
writing ──(그만두기)──▶ list(다시 읽음)
writing ──(성공)──▶ [home] ──▶ list(다시 읽음, 고른 날 = 쓴 날)
writing ──(저장 실패)──▶ unsaved ──(← 일기)──▶ list(다시 읽음)
writing ──(실패)──▶ failed ──(← 일기)──▶ list(다시 읽음)
```

고른 날은 어느 전이에서도 바뀌지 않는다(쓰기는 고른 날을 쓴다 — 미래를 고를 수 없으므로 `writePromptFor`의 오늘 떨어뜨림은 도달하지 않는다).

---

## 4. 상대 작성 시각 (새, `src/ui/home-text.ts`)

```ts
function writtenAtText(createdAt: Date, now: Date): string;
```

| 경과 `d = now − createdAt` | 결과 |
| --- | --- |
| `d < 60초` (음수 포함) | `방금 작성` |
| `60초 ≤ d < 60분` | `{floor(d/분)}분 전에 작성` |
| `d ≥ 60분` | `{floor(d/시)}시간 {floor(d/분) % 60}분 전에 작성` |

- 표시 조건(화면): `paper.kind === "readable"` 이고 `cellFor(day, items, day, now).isToday`. 판정을 복제하지 않는다(FR-019a).
- 그 날이 오늘이므로 `d`는 하루를 넘지 않는 것이 정상이다. 넘더라도(기기 시각 조작) 시간 수를 그대로 보인다 — 잘라 내지 않는다.

---

## 5. 알림 라우팅 (변경)

| 값 | 지금 | 051 |
| --- | --- | --- |
| `pendingRoute: { day }` (App) | 상세 첫 화면 → 확인 시 비움 | 홈이 그 날을 **고르면** 비움(`onInitialDayApplied`) |
| `DiaryHomeScreen.initialDay` | `initialScreen(..., { initialDay, entry })` | 마운트·변경 시 `setChosenDay(initialDay)` + `onInitialDayApplied()` |
| `onAcknowledge(day)` | 상세에 들어갈 때(알림·목록 모두) | 고른 날의 `paperFor(...).kind === "readable"`이 된 순간, 그 날마다 한 번 |

- 확인 기록은 읽을 수 있는 일기가 실제로 보였을 때만(020 FR-007 (2)). 없거나 읽을 수 없으면 부르지 않는다.
- 같은 날에 대해 한 번 부르면 다시 부르지 않는다(렌더마다 파일을 쓰지 않도록 화면 로컬 표식). 부르더라도 `acknowledgeNotified`는 멱등이다.

---

## 6. 캐러셀 표시 (새, `src/ui/PhotoCarousel.tsx`)

입력: `photos: readonly PhotoRef[]`, `width`(스트립 폭). 화면 로컬 상태: `index`(현재 장, 0부터).

| 사진 수 | 그리는 것 |
| --- | --- |
| 0 또는 `photos` 없음 | 아무것도 그리지 않는다(`null`) |
| 1 | 사진 하나(흑백·cover·높이 210). 배지·인디케이터·제스처 없음 |
| ≥ 2 | `Carousel`(`loop`, `onConfigurePanGesture` activeOffsetX ±10, `onSnapToItem` → `index`). 배지 `{index+1} / {n}`, 인디케이터 n칸(현재 칸 긴 막대) |

- 날이 바뀌면 `key={day}`로 새로 마운트 → `index = 0`.
- 사본을 못 불러온 슬라이드는 「이 사진은 이제 없어요」(FR-012). 배지의 `n`은 저장된 사진 수 그대로.

---

## 7. 토큰 (새, `src/ui/theme/tokens.ts`)

```ts
export const WRITTEN_DAY = {
  paper: "#f8f4f4",          // 보드 neutral-100
  rewriteBar: "#eae7e7",     // 보드 neutral-200
  indicatorIdle: "#bab6b6",  // 보드 neutral-400
  photoHeight: 210,
  // 나머지 치수는 contracts WD-VIS 표 그대로
} as const;
```

`COLORS`(아홉 역할)는 바꾸지 않는다(research R7).
