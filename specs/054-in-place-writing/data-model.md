# Data Model: 제자리 쓰기

저장되는 데이터는 없다. 화면 상태와 순수 판정의 입출력만 있다(FR-012 — 파일에 남기지 않는다).

## 1. `AppScreen` 변경 (`src/app/state.ts`)

| 갈래 | 변경 |
| --- | --- |
| `writing` | `{ kind: "writing"; items: DiaryListItem[]; stage?: ProgressStage; branch?: MonologueBranch; line?: string }` — **`items`가 더해졌다**(R1). 타입이 진행률·시간을 막는 성질은 그대로(`stage`·`branch`는 문자열 리터럴, `line`은 `string`뿐) |
| `unsaved` | **제거**(R8, clarify Q3) |
| `failed` | **유지** — 쓰기 시작 전 `no-ready-character` 막힘 전용(FR-024). `afterGeneration`은 더 이상 만들지 않는다 |
| 나머지 | 무변경 |

### 전이

```
list ── 일기 쓰기(053 판정 통과 · 050 확인 통과) ──▶ writing{items}
writing ── 그만두기 · 뒤로 가기 ──▶ list (refresh, 토스트 없음)
writing ── 성공 ──▶ list (refresh, 그 날의 쓴 날 — 연출 없음)
writing ── 실패(retry · prepare-* · plain) ──▶ list (refresh) + toast
writing ── 저장 실패(글 있음) ──▶ list (refresh) + toast(save)   ※ 글은 버린다
list ── 일기 쓰기(no-ready-character) ──▶ failed   ※ 이 조각 밖, 무변경
```

- `toWriting(items)`는 **저장 상태로 분기하지 않는다**(S1 정신 유지) — `items`는 목록 요약이며 본문이 아니다.
- `afterGeneration(result)`: `{ kind: "home" } | { kind: "toast"; toast: ToastKind }`. `result.ok`면 `home`. 실패면 `toastKindFor(result)`.
- `startWriting(prompt, items)`·`confirmOverwrite()`는 `items`를 함께 받아 넘긴다(050의 `confirm-overwrite`가 이미 `items`를 들고 있으므로 새 정보 아님).

## 2. 토스트 (`src/app/failure-toast.ts`)

```ts
export type ToastKind = "retry" | "prepare-character" | "prepare-vision" | "plain" | "save";

/** 실패 하나 → 갈래. 이유 문자열 전체를 비교하지 않고 앞 토큰(kind)만 본다. 모르면 `retry`. */
export function toastKindFor(result: PipelineFailure): ToastKind;

/** 갈래 → 문구. 정본은 이 상수 하나(사람이 정한 값 — 원칙 V). */
export const TOAST_TEXT: Readonly<Record<ToastKind, string>>;

/** 손을 뗐을 때 토스트를 닫는가. 문턱은 사람이 정한 상수(`TOAST_SWIPE`). */
export function shouldDismissToast(translationY: number, velocityY: number): boolean;
```

화면 로컬 상태(`DiaryHomeScreen`): `toast: { id: number; kind: ToastKind } | null`. `id`는 실패마다 올라 같은 갈래가 연달아 나도 새 토스트로 그려진다(`key`).

## 3. 화면 props 변경 (`DiaryListScreen`)

| prop | 뜻 |
| --- | --- |
| `writing?: { line?: string; name?: string }` | 있으면 쓰는 중 모드. `line`은 지금 혼잣말, `name`은 안내 줄의 이름. 진행률·시간 필드를 두지 않는다 |
| `onStop?: () => void` | 「그만두기」 |
| `toast?: { id: number; text: string }` | 문자열만 받는다 — 화면은 갈래·실패 종류를 모른다 |
| `onDismissToast?: () => void` | 토스트가 스스로 사라졌거나 쓸어 닫혔다 |

`writing`이 있으면: `onPressDate`·`onSelectDay`·`onSwipe`를 넘겨도 쓰지 않는다(잠금은 화면이 스스로 건다 — 부르는 쪽이 깜빡 넘기는 사고를 막는다).

## 4. 혼잣말 (`monologue.ts` 무변경)

`pickMonologue(stage, branch, previous)`는 그대로 순수 함수다. 간격 타이머와 「직전 줄」은 `DiaryHomeScreen`이 든다(지금처럼 화면이 `previous`를 들고 넘긴다). 새 상수 `MONOLOGUE_ROTATE_MS`는 `tokens.ts`의 `WRITING`에 둔다(화면 상수이지 문안 풀이 아니다).

## 5. 치수 상수 (`tokens.ts`)

`WRITING`: 스트립 잠금 불투명도 .35, 지면 안쪽 여백 32/20/120, 간격 14, 머리말 11/600 자간 1.1, 혼잣말 24/700 줄높이 32.4 자간 −.24, 안내 줄 13(줄높이 19.5), 교체 간격 4000ms, 페이드 250ms.
`TOAST`: 좌우 12, 바 위 간격 12, 최소 높이 48, 안쪽 여백 12/16, 14/600(줄높이 19.6), 마커 6×6·간격 10, 그림자 `0 8 24 .18`, 수명 3000ms, 페이드 아웃 200ms, 슬라이드 인 240ms. **쓸어 닫기 문턱(`distance 24`·`velocity 500`)은 여기가 아니라 `failure-toast.ts`의 `TOAST_SWIPE`가 정본이다**(`src/app`이 `src/ui`를 import하지 않게).
색은 `COLORS.*`만(배경 `text`, 글자 `bg`, 마커 `accent`). 하단 바 검정 = `COLORS.text`, 글자 `COLORS.bg`.
