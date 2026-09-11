# Data Model: 완성된 일기 첫 표시를 타자기 연출로

**Feature**: 038-typewriter-diary-reveal | **Date**: 2026-09-11

이 기능은 **저장 데이터를 만들지 않는다**(FR-013, SC-006). 아래는 화면 계층의
일시 상태와 컴포넌트 인터페이스뿐이다.

---

## 1. 소비되는 기존 엔티티 (읽기 전용)

### `DiaryEntry` (`src/diary/types.ts`) — 무변경

이 기능이 읽는 필드:

| 필드 | 용도 | 비고 |
|---|---|---|
| `title?: string` | 타자기로 흘릴 제목 | 없으면(014 미추출) 제목 줄 자체 없음 → 본문부터 |
| `text: string` | 타자기로 흘릴 본문 | 판정 통과·저장 완료된 문자열. 자르는 순서만 정하고 내용 불변 |
| `photos?: PhotoRef[]` | 하단 슬라이더 (완료 후) | 없으면 슬라이더 영역 없음(025 기존 동작) |
| `signalsUsed`, `placeName`, `timing` | "이 일기가 본 것" 절 (완료 후) | 017 기존 동작 |
| `date` | 날짜 캡션 | 타자기 대상 아님 — 항상 즉시 |

**변경 없음.** `serializeEntry`·파이프라인·판정 무관.

### 화면 상태 `{ kind: "written" } | { kind: "detail" }` (`src/app/state.ts`) — 무변경

| 상태 | 발생 | 이 기능의 처리 |
|---|---|---|
| `{ kind: "written"; entry; saved; overwrote }` | 생성·판정·저장 직후 (state.ts:346·352) | `DiaryHomeScreen`이 `reveal` 켜서 전달 |
| `{ kind: "detail"; day; entry }` | 목록에서 열기 (state.ts:261) / 알림 라우팅 (state.ts:237) | `reveal` 안 켬 → 지금과 동일 |

**변경 없음.** 이미 있는 구분을 소비만 한다.

---

## 2. 신규 — 화면 로컬 일시 상태

파일에 저장하지 않는다(009 "고른 하루를 파일에 남기지 않는다", 025 갤러리 상태와
같은 성격).

### `DiaryDetailScreen`의 `revealDone` (로컬 `useState<boolean>`)

- **의미**: 타자기 연출(제목+본문)이 끝났거나 사용자가 탭으로 건너뛰었는가.
- **초기값**: `reveal === true`이면 `false`, 아니면 `true`(연출 없음 = 처음부터 완료).
- **전이**:
  | 현재 | 이벤트 | 다음 |
  |---|---|---|
  | `false` | 본문 `TypewriterText`의 `onDone` | `true` |
  | `false` | 화면 탭(`reveal && !revealDone`) | `true` (+ `skipToEnd` 전달) |
  | `true` | 어떤 이벤트든 | `true` (되돌아가지 않음) |
- **파생 렌더**:
  - `revealDone === false` → "이 일기가 본 것" 절·`PhotoSlider`·`PhotoGalleryModal` **미렌더**
  - `revealDone === true` → 지금과 동일(전체 렌더)
- **생명주기**: 화면 언마운트 시 소멸. 뒤로 갔다 목록에서 다시 열면 새
  `{ kind: "detail" }` → `reveal` 없음 → `revealDone` 초기값 `true`(FR-008).

### `DiaryDetailScreen`의 제목 단계 관리 (로컬)

- 제목이 있으면 **제목 먼저** 타자기 → 제목 `onDone` 후 본문 타자기 시작.
- 제목이 없으면 본문부터(`titleDone` 초기값 `true`).
- 표현: `titleDone: boolean` 하나. 제목 있고 `reveal` 참이면 초기 `false`,
  그 외엔 `true`.

### skip 시 두 상태 동시 설정 (U1 — analyze 지적)

- 화면 탭(C8) 또는 어떤 이유로든 `revealDone`을 참으로 만들 때, **같은 이벤트
  핸들러에서 `setTitleDone(true)`와 `setRevealDone(true)`를 함께 호출한다.**
- 그래야 제목이 아직 안 끝난 시점에 탭해도, 다음 렌더에서 본문 `TypewriterText`가
  `skipToEnd={true}`로 **첫 마운트**되어 `TypewriterText` C7(즉시 전체 + `onDone`
  1회)로 이어진다 — "탭했는데 본문이 한 박자 뒤에 채워짐"이 없다.
- 자연 완료 경로(제목 `onDone` → 본문 렌더 → 본문 `onDone`)는 그대로.

### 최상위 탭 래핑 위치 (U2 — analyze 지적)

- `DiaryDetailScreen`의 루트는 `ScrollView`다(`:435`). 이걸 `Pressable`로 감싸면
  스크롤 제스처와 탭이 충돌한다.
- **결정**: `reveal === true && !revealDone`일 때만, `ScrollView`의
  `contentContainer` 최상단에 **화면을 덮는 투명 `Pressable` 오버레이**
  (`StyleSheet.absoluteFill` 상당)를 얹는다. `onPress`가 skip 핸들러(위).
  `revealDone === true`가 되면 이 오버레이를 렌더하지 않는다 → 슬라이더·갤러리
  탭이 정상 도달(FR-006, C16).
- reveal 중에는 본문이 짧아 스크롤이 거의 없으므로 오버레이가 스크롤을 막아도
  체감 문제 없음. 구현 세부는 contracts C8에서 고정.

---

## 3. 신규 컴포넌트 인터페이스

### `TypewriterText` (`src/ui/components/TypewriterText.tsx`)

순수 표시 컴포넌트. 모델·도메인 import 0.

```
props:
  text: string            완성 문자열 (판정 통과·저장 완료분)
  charMs: number           글자당 노출 간격 (ms). 호출부가 REVEAL.charMs를 넘긴다
  skipToEnd: boolean        참이 되는 순간 즉시 전체 노출 + onDone 1회
  onDone: () => void        전체 노출이 끝났을 때(자연 완료 또는 skip) 정확히 1회
  variant?: TextVariant     AppText variant 위임 ("title" | "body" 등, 기본 "body")
  style?: TextStyle         AppText style 오버라이드 (본문의 fontSize:16/lineHeight:26 등)
  testID?: string
```

**타이포 일치 규칙 (I1 — analyze 지적)**: 현재 `DiaryDetailScreen`은 제목을
`variant="title"`(`:443`), 본문을 `variant="body" style={{fontSize:16, lineHeight:26}}`
(`:452`)로 렌더한다. `TypewriterText`로 바꿔도 **같은 타이포가 나와야** 목록
재진입 경로(회귀, SC-004)와 첫 표시 경로의 글자 크기가 일치한다. 따라서
`DiaryDetailScreen`이 `TypewriterText`를 쓸 때:
- 제목: `<TypewriterText variant="title" ... />`
- 본문: `<TypewriterText variant="body" style={{ fontSize: 16, lineHeight: 26 }} ... />`
`variant` 타입은 `AppText`의 `TextVariant` 전체를 받는다(`"title" | "body"`로
좁히지 않는다 — 현재 화면이 쓰는 값을 그대로 통과시켜야 한다).

**행동 계약** (상세는 `contracts/typewriter-text.md`):

| # | 규칙 |
|---|---|
| T-1 | 마운트 시 노출 글자 수 0에서 시작, `charMs`마다 1 증가 |
| T-2 | 노출 문자열은 `graphemeSlice(text, n)` — 코드포인트 경계에서만 자른다(FR-009) |
| T-3 | 노출 글자 수가 `Array.from(text).length`에 도달하면 `onDone` 1회 호출, 타이머 정지 |
| T-4 | `skipToEnd`가 `false→true`로 바뀌면 즉시 전체 노출 + `onDone` 1회(아직 안 불렀으면). 이미 완료면 재호출 안 함 |
| T-5 | `text` prop이 바뀌면 노출 글자 수 0으로 리셋, `onDone` 재무장 |
| T-6 | 언마운트 시 타이머 정리(FR-014) |
| T-7 | `text === ""`이면 즉시 `onDone` 1회, 타이머 안 만듦 |

### `graphemeSlice` (`src/ui/text/grapheme-slice.ts`)

순수 함수. RN 런타임 의존 0(`test:logic`에서 돈다).

```
graphemeUnits(text: string): string[]
  Array.from(text) — 코드포인트 배열. 서로게이트 쌍(대부분의 이모지)을 안 쪼갠다.

graphemeSlice(text: string, count: number): string
  graphemeUnits(text).slice(0, max(0, count)).join("")
  count가 배열 길이 이상이면 text 전체.

graphemeLength(text: string): number
  graphemeUnits(text).length
```

**계약** (상세는 별도 없음 — 유틸이라 `grapheme-slice.test.ts`가 직접 잠근다):

| # | 규칙 |
|---|---|
| G-1 | `graphemeSlice("가나다", 2) === "가나"` (한글 NFC) |
| G-2 | `graphemeSlice("a👍b", 2) === "a👍"` — 이모지(서로게이트 쌍)를 반으로 안 자른다 |
| G-3 | `graphemeSlice(t, 0) === ""`, `graphemeSlice(t, -1) === ""` |
| G-4 | `graphemeSlice(t, 9999) === t` |
| G-5 | `graphemeLength("a👍b") === 3` (문자열 `.length`는 4) |

---

## 4. 신규 상수

### `REVEAL` (`src/ui/theme/tokens.ts`) — 033의 `PRESS` 옆

```
export const REVEAL = {
  /** 타자기 노출: 글자당 간격 (ms). 빠른 편 — "기다림"보다 "드러남". */
  charMs: 15,
} as const;
```

- **근거**: 스펙 Assumptions("글자당 약 15ms"). **사람이 정한 값**이며 코드가
  재서 정하지 않는다(012 `USER_VISIBLE_SIGNAL_AXES`·021 `PERMISSION_REQUIREMENTS`·
  033 `PRESS` 선례).
- **노출 금지**: 이 값은 화면에 렌더되지 않는다(원칙 IV). `TypewriterText`가
  prop으로만 받는다.
- FR-010: "한 곳의 상수로 관리, 나중에 조정 가능" 충족.

---

## 5. 변경 요약

| 파일 | 변경 | 종류 |
|---|---|---|
| `src/ui/components/TypewriterText.tsx` | 신규 | 컴포넌트 |
| `src/ui/text/grapheme-slice.ts` | 신규 | 순수 유틸 |
| `src/ui/theme/tokens.ts` | `REVEAL` 상수 추가 | 상수 |
| `src/ui/DiaryDetailScreen.tsx` | `reveal?` prop, `revealDone`·`titleDone` 상태, 제목/본문 조건부 `TypewriterText`(현재 타이포 유지), 하단 절 지연, reveal 중 투명 `Pressable` 오버레이 | 화면 |
| `src/ui/DiaryHomeScreen.tsx` | `case "written"`에서만 `reveal` 전달 | 화면 |
| `src/diary/**`, `src/inference/**`, `src/vision/**`, `src/app/state.ts` | **0줄** | — |
