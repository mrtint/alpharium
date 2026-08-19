# Phase 1: Data Model — 손에 쥐는 첫 빌드

**Feature**: 006-first-diary-app | **Date**: 2026-08-18

**이 기능은 저장 형식을 바꾸지 않는다.** `DiaryEntry`(002)와 파일 배치(날짜별 JSON)는
그대로다. 새로 생기는 것은 **화면이 다루는 값**뿐이다.

---

## 1. `DiaryListItem` — 목록의 한 줄

목록을 그리는 데 필요한 최소한. **전문을 담지 않는다** — 목록에서 전부 읽으면 일기가
늘수록 느려지고, 읽지도 않을 글을 전부 역직렬화한다.

```
DiaryListItem =
  | { day: DayDate; readable: true }
  | { day: DayDate; readable: false }
```

**왜 두 갈래인가 (FR-017a, SC-012a)**:

`fileStore.load()`는 읽을 수 없는 파일에 `null`을 준다. 그 날짜를 목록에서 **조용히
빼면 「그날 일기가 없다」와 구분이 사라진다** — 사용자는 일기를 쓴 기억과 화면이
어긋나는 것을 설명할 방법이 없다. 원칙 V가 값에서 지킨 구분(`unknown` ≠ `none`)을
목록에서도 지킨다.

**날짜는 파일 이름에서 온다.** `listDays()`가 파일명을 파싱하므로 **내용이 깨져도 어느
날인지는 안다.** 이것이 `readable: false`를 만들 수 있는 이유다.

**불변식**:

1. `listDays()`가 준 날짜는 **전부** 목록에 나타난다. 읽기 실패로 사라지지 않는다.
2. 날짜순으로 정렬된다.
3. 한 날짜는 한 번만 나타난다(002 FR-023 — 하루에 일기 하나).

---

## 2. `AppScreen` — 사용자가 어디에 있는가

**005의 `PipelineStage`와 다르다.** 그것은 생성 *안쪽*의 단계이고 이것은 사용자가 보는
화면이다. 둘을 섞으면 생성 내부 사정이 화면 구조로 새어 나온다.

```
AppScreen =
  | { kind: 'build-error'; }                          // FR-035b
  | { kind: 'list'; items: DiaryListItem[] }
  | { kind: 'detail'; day: DayDate; entry: DiaryEntry }
  | { kind: 'unreadable'; day: DayDate }              // FR-017a
  | { kind: 'writing' }                               // FR-021 — 진행률 없음
  | { kind: 'written'; entry: DiaryEntry; saved: boolean }   // FR-012a
  | { kind: 'failed'; message: string }               // FR-029
```

**각 갈래가 존재하는 이유**:

| 갈래 | 근거 | 왜 합칠 수 없는가 |
| --- | --- | --- |
| `build-error` | FR-035a·b·c | 환경 판정 실패는 사용자가 고칠 수 없다. `failed`와 합치면 「다시 시도하라」로 읽힌다 |
| `list` | FR-017 | — |
| `detail` | FR-019 | — |
| `unreadable` | FR-017a | 「없다」와 다른 상태(원칙 V) |
| `writing` | FR-021 | **불리언성 상태다. 진행률·남은 시간을 담을 자리가 없다**(원칙 IV) |
| `written` | FR-012a·b | `saved: false`면 저장 실패를 함께 알린다 |
| `failed` | FR-029 | 문구는 「할 수 있는 것」. **거부된 글을 담지 않는다**(FR-030) |

**⚠️ 타입이 곧 방어다.** `writing`에 필드가 없는 것이 원칙 IV의 방어이고,
`failed`에 `text` 필드가 없는 것이 FR-030·SC-014의 방어다. **자리가 없으면 담을 수
없다** — 005의 `RunResult`가 `{text, ending}` 둘뿐인 것과 같은 구조.

**불변식**:

1. `failed`에 생성된 글이 담기지 않는다(SC-014).
2. `writing`에 진행률·시간·토큰 수가 담기지 않는다(SC-020).
3. `build-error`에 환경 변수 이름·값이 담기지 않는다(원칙 III — 개발자 정보 노출 방지).
4. `written`은 **생성이 성공했을 때만** 만들어진다. 저장 실패는 `saved: false`이지
   `failed`가 아니다.

---

## 3. 상태 전이

```
                    ┌──────────────┐
   환경 판정 실패 ──▶│ build-error  │  (막다른 길 — FR-035a)
                    └──────────────┘

   시작 ──▶ list ──(항목 누름, readable)──▶ detail ──(뒤로)──▶ list
             │
             ├──(항목 누름, unreadable)──▶ unreadable ──(뒤로)──▶ list
             │
             └──(일기 쓰기)──▶ writing ──┬─(성공)──▶ written ──(뒤로)──▶ list
                                         └─(실패)──▶ failed  ──(뒤로)──▶ list
```

**전이 규칙**:

1. **`build-error`에서 나가는 길이 없다**(FR-035a). 일기 기능이 막힌다.
2. **`writing`은 사용자 조작으로 벗어날 수 없다.** 생성이 끝나야 전이한다 — 취소 버튼을
   두지 않는다(005 FR-014b가 앱이 앞을 벗어날 때만 끊는다고 정했다).
3. **`written`에서 `list`로 돌아가면 목록이 새로 읽힌다**(FR-022) — 방금 쓴 일기가
   보여야 한다.
4. **`failed`에서 `list`로 돌아가도 기존 일기가 그대로다**(FR-031, SC-013).
5. **`list`에서 「일기 쓰기」와 「항목 읽기」는 서로 다른 동작이다**(원칙 I).
   저장된 일기가 있다고 해서 쓰기가 그것을 보여주지 않는다.

**⚠️ 원칙 I이 이 다이어그램에서 가장 위험한 자리**: `list --(일기 쓰기)--> writing`
화살표가 **저장 여부를 보지 않는다.** 「이미 있으면 detail로」라는 지름길을 만들면
그 순간 저장된 것이 생성을 대신한다(FR-045 위반).

---

## 4. `GeneratedButUnsaved` — 저장 실패를 동반한 성공

명확화에서 정해진 상태(FR-012a·b). **`AppScreen`의 `written`이 `saved: boolean`으로
표현한다** — 별도 타입을 만들지 않는다.

**왜 별도 타입이 아닌가**: 사용자가 보는 것은 같은 화면(일기 전문)이고, 다른 것은
「이것이 남는가」 하나뿐이다. 타입을 가르면 화면이 둘이 되고, 그러면 같은 글을 두 곳에서
그리게 된다.

**표시 규칙**:

| `saved` | 화면 |
| --- | --- |
| `true` | 일기 전문. 「덮어썼다」면 그 사실도(FR-034) |
| `false` | 일기 전문 + **「저장하지 못했다」 + 「앱을 나가면 사라진다」**(FR-012b) |

**불변식**: `saved: false`인 일기는 **목록에 나타나지 않는다.** 저장되지 않았으므로
`listDays()`가 모른다 — 이것이 사용자에게 「나가면 사라진다」를 반드시 알려야 하는
이유다.

---

## 5. 기존 타입 — 바뀌지 않는 것

**이 기능은 아래를 건드리지 않는다.** 목록으로 남기는 이유는 「바꾸고 싶어지면 그것이
범위 이탈 신호」이기 때문이다.

| 타입 | 어디 | 이 기능에서 |
| --- | --- | --- |
| `DiaryEntry` | `src/diary/types.ts` | 그대로 저장·조회 |
| `SignalValue<T>` | `src/signals/types.ts` | 그대로. 왕복에서 보존(FR-013) |
| `PipelineResult`·`PipelineStage` | `src/diary/pipeline.ts` | 그대로. 화면이 `AppScreen`으로 옮긴다 |
| `GenerationResult` | `src/inference/types.ts` | 그대로 |
| `ModelReadiness` | `src/models/types.ts` | 그대로(003 재사용) |
| `DiaryStore`·`SaveResult` | `src/diary/store.ts` | 그대로 |

**`PipelineStage` → `AppScreen` 옮기기**:

| `PipelineStage` | 화면 | 문구 방향 |
| --- | --- | --- |
| `day-not-closed` | `failed` | 「아직 이르다」(FR-033) |
| `already-running` | (전이 없음) | 이미 `writing`이다 |
| `signals` | `failed` | 「신호를 가져오지 못했다」 |
| `request-build` | `failed` | 「캐릭터를 먼저 골라야 한다」 |
| `model-not-ready` | `failed` | 「캐릭터를 먼저 준비해야 한다」(FR-028) |
| `generation` | `failed` | `describeFailure()` 재사용(005) |
| `storage` | **`written`, `saved: false`** | **`failed`가 아니다** — 글이 있다(FR-012a) |

**⚠️ 마지막 줄이 이 기능의 새 판단이다.** 002·005는 `storage`를 실패로만 다뤘다.
명확화가 「보여준다」로 정했으므로 **화면 계층에서 갈린다** — 파이프라인은 그대로
`ok: false, stage: 'storage'`를 준다.

**그런데 `PipelineResult`의 실패 갈래에는 `entry`가 없다**(002 FR-012 — 실패가 텍스트를
반환하지 않는다). 따라서 **저장 실패 시 글을 화면에 올리려면 파이프라인이 그것을
돌려줘야 한다.**

**이 문제는 `contracts/persistence.md` §4에서 다룬다** — 002의 불변식을 깨지 않으면서
FR-012a를 만족시키는 방법이 필요하다.
