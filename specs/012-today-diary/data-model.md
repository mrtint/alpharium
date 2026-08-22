# Data Model: 오늘의 일기

**Date**: 2026-08-22 | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

**타입이 곧 방어다.** 009가 `WritePrompt`에 필드 넷만 두어 진행률·시간이 담길 자리를
없앴고, 이 기능도 같은 규율을 따른다. 다섯 관심사(정오 열기·하루 셋 재구성·축
제외·덮어쓰기 확인·사진 상한 제거)가 각각 어디에 자리를 얻는지 이 문서가 정한다.

---

## §1. `day-boundary.ts`가 더하는 것

```ts
/** 오늘을 쓸 수 있게 되는 시각(시). **이 값은 여기에만 있다**(FR-002) */
const WRITABLE_FROM_HOUR = 12;

/**
 * 이 하루를 지금 쓸 수 있는가.
 *
 * 닫혔거나(지난 하루), 오늘이면서 정오를 지났으면 쓸 수 있다. **새 판정 방식이
 * 아니라 `isDayClosed()`를 감싼 것이다** — `pipeline.ts`의 게이트가 이미
 * `isDayClosed()`를 부르고 있었고(research.md §9), 이 함수가 그 자리를 대신한다.
 */
function isDayWritable(day: DayDate, now: Date): boolean {
  return isDayClosed(day, now) || (day === dayOf(now) && now.getHours() >= WRITABLE_FROM_HOUR);
}

/**
 * 지금 시점에서 고를 수 있는 하루들. 최근이 먼저이며 **언제나 정확히 셋이다**(FR-001a).
 *
 * 정오 이전: `[어제, 그제, 그그제]` — 지금과 같다.
 * 정오 이후: `[오늘, 어제, 그제]` — 그그제가 빠지고 오늘이 맨 앞에 온다.
 *
 * **`SELECTABLE_DAY_COUNT`는 그대로 3이다** — 오늘이 넷째로 더해지는 것이 아니라
 * 셋을 구성하는 규칙이 조건부로 바뀐다(사용자 결정, spec Clarifications).
 */
function selectableDays(now: Date): readonly DayDate[];
```

**`WRITABLE_FROM_HOUR`가 `DAY_STARTS_AT_HOUR`·`SELECTABLE_DAY_COUNT`와 나란히
있어야 하는 이유는 그 둘과 같다** — 부르는 쪽에서 `now.getHours() >= 12`를 직접
계산하면 화면·파이프라인·프롬프트가 서로 다른 정오를 볼 수 있다.

**`isDayWritable()`이 `pipeline.ts`·`selectableDays()`·화면 안내(FR-002)가 공유하는
단일 판정처다.** 세 곳이 각자 "정오가 지났는가"를 계산하면 006~011이 반복한
조용한 배선 끊김과 같은 위험이 생긴다.

### §1a. 화면 안내 — `DayPicker.tsx`가 더하는 것 (헌법 원칙 II MUST — 화면에도 드러난다)

**결정** (`/speckit-analyze`에서 드러난 갭을 해소): 헌법 원칙 II "하루의 끝" 조항이
"아직 쓸 수 없는 하루는 왜 아직인지와 언제부터 쓸 수 있는지를 함께 알린다(MUST)"고
명시한다. `SelectableDay`에는 아직 쓸 수 없는 하루(오늘, 정오 이전)가 애초에
들어오지 않으므로(FR-002), 이 안내는 **`SelectableDay` 목록과 별개의 자리**가
필요하다.

```ts
export type DayPickerProps = {
  days: readonly SelectableDay[];
  selected: DayDate;
  revertedFrom?: DayDate;
  /**
   * 정오 전이라 오늘을 아직 쓸 수 없다는 안내 (012, 헌법 원칙 II MUST).
   *
   * **문자열이 아니라 `true | undefined`다.** 문구("정오부터 오늘을 쓸 수 있다")는
   * 화면이 스스로 짓는다 — `WRITABLE_FROM_HOUR`(12)를 문자열로 바꾸는 판정을
   * 화면 밖(`day-boundary.ts`)에 둘 필요가 없다. 값 자체("정오"라는 시각)는
   * 이미 상수 하나뿐이므로 문자열로 조립해도 값이 두 곳에 생기지 않는다.
   */
  todayNotYetWritable?: boolean;
  onSelect: (day: DayDate) => void;
};
```

**어디서 계산하는가**: `DiaryHomeScreen.tsx`가 `!isDayWritable(dayOf(now()), now())`로
계산해 넘긴다 — `isDayWritable()`을 새로 계산하지 않고 재사용한다(§1의 단일
판정처 원칙 그대로). `write.selectable`에 오늘이 없고(FR-002) 지금이 정오
이전이면 `true`다.

**왜 `WritePrompt`에 넣지 않는가**: `WritePrompt.day`는 "지금 쓰게 될 하루"에 대한
것이고, 이 안내는 "아직 선택지에 없는 하루(오늘)"에 대한 것이라 대상이 다르다.
섞으면 `WritePrompt`가 "쓸 것"과 "아직 못 쓰는 것"을 함께 지고, 007이 `WritePrompt`
필드를 최소로 유지한 이유(원칙 IV 방어)가 흐려진다.

---

## §2. `DaySignals` 축 제외 — `signals/types.ts`가 더하는 것

```ts
/**
 * 이 축을 일기 프롬프트·사용자 화면에 실을 것인가.
 *
 * **코드가 판정하지 않는다**(헌법 원칙 V MUST NOT, FR-010) — 값을 보고 "계속
 * unknown이니 빼자"로 정하면 그것이 임계값이다. 사람이 여기 적고, 통로가 생기면
 * 사람이 고친다.
 */
const USER_VISIBLE_SIGNAL_AXES = {
  photos: true, // 실제로 수집한다(004)
  places: true, // 사진 좌표에서 온다(004)
  steps: false, // 안드로이드가 기간 걸음 수를 주지 않는다 — 영영 막혔다(FR-006)
  battery: false, // 기록 계층이 없다 — 생기면 되살린다(FR-007)
  connectivity: false, // 기록 계층이 없다 — 생기면 되살린다(FR-007)
} as const satisfies Record<keyof DaySignals extends "date" ? never : keyof DaySignals, boolean>;
```

**`DaySignals`의 필드는 지우지 않는다**(FR-009). 값은 그대로 수집·저장되고
진단 경로(`SignalProbe.tsx`)는 이 상수를 보지 않고 다섯 축을 전부 그린다 —
`USER_VISIBLE_SIGNAL_AXES`는 **프롬프트(`prompt.ts`)와 사용자 화면
(`DiaryDetailScreen.tsx`)만** 본다.

**정확한 타입 모양(`Record` vs 개별 `export const boolean`)은 tasks 단계에서
`signals/types.ts`의 기존 스타일에 맞춰 확정한다** — 위는 의도를 보이는 초안이다.

### 금지된 것

| 금지 | 원칙 |
| --- | --- |
| `signals.steps.kind === "unknown"`을 보고 프롬프트에서 빼는 코드 | V — 코드가 판정하면 임계값이 된다(MUST NOT) |
| `DaySignals`에서 `steps`·`battery`·`connectivity` 필드 삭제 | V — 값 자체는 사라지지 않는다(FR-009) |
| `valueOr(signal, 기본값)` 같은 편의 함수 | V — 002부터 있던 금지, 이 기능도 새로 만들지 않는다 |

---

## §3. `DiaryRequest` — "하루가 아직 열려 있는가"

```ts
export type DiaryRequest = {
  signals: DaySignals;
  character: Character;
  vision: VisionSetting;
  /**
   * 이 하루가 아직 끝나지 않았는가 (012, 헌법 원칙 II "하루의 끝").
   *
   * **`buildRequest()`가 `pipeline.ts`의 `isDayClosed(day, now)`를 재사용해 채운다**
   * (research.md §8) — `buildPrompt()`는 여전히 `now`를 읽지 않고 결정적이다(P6
   * 유지). 오늘인지 여부는 이미 계산된 값으로 전달받을 뿐이다.
   */
  dayStillOpen: boolean;
};
```

**필드 이름·정확한 위치는 tasks 단계에서 `buildRequest()`의 시그니처와 함께
확정한다.** 핵심 불변식은: ① `buildPrompt()`가 `Date`를 직접 읽지 않는다(P6),
② 이 값의 유일한 출처는 `isDayClosed()`이며 새 계산을 만들지 않는다(research.md §9).

---

## §4. `prompt.ts`가 더하는 것 — "하루의 끝" 문장

```ts
/** 아직 끝나지 않은 하루에 붙는 문장 (FR-003·004). 사진 축과 무관하게 붙는다 */
const DAY_STILL_OPEN =
  "오늘은 아직 끝나지 않았다. 이 기록 뒤에 무슨 일이 더 있었는지는 알 수 없다.";
```

**`SPEAKER_RULES`처럼 신호 값을 담지 않는 고정 문구다** — `instructionLines()`의
되뱉기 판정 비교 대상에 들어간다(005 FR-016b-1 패턴을 그대로 따른다). `request.vision`이
없으면 005~011과 바이트 단위로 같은 문자열이 나오는 것처럼(P-1), **`dayStillOpen`이
`false`이면(지난 하루) 이 문장은 붙지 않고 기존 프롬프트와 바이트 단위로 같다.**

### 어디에 붙는가

사진 축(`TRUNCATED_WARNING`)과 다른 자리다 — `signalLines()` 안이 아니라
`buildPrompt()`의 최상단, `SPEAKER_RULES` 다음이다. **사진 권한 유무와 무관하게
전달되어야 하므로**(FR-004, spec Clarifications) 신호 목록의 일부가 아니라 하루
자체에 대한 진술로 둔다(로드맵 결정 (c) 계승).

---

## §5. `AppScreen` — 덮어쓰기 확인 갈래

```ts
export type AppScreen =
  | { kind: "build-error" }
  | { kind: "list"; items: DiaryListItem[] }
  | { kind: "detail"; day: DayDate; entry: DiaryEntry }
  | { kind: "unreadable"; day: DayDate }
  /**
   * 이미 있는 하루를 다시 쓰려 한다 (012 US3, FR-011~013).
   *
   * **필드가 `day` 하나뿐이다** — 007의 `toWriting()`이 인자를 받지 않는 것과
   * 같은 방어다. 기존 일기의 본문·글자 수·미리보기를 담지 않는다 — 담으면 이
   * 화면이 "확인 대신 미리 보기"로 미끄러질 수 있다(원칙 I).
   */
  | { kind: "confirm-overwrite"; day: DayDate }
  | { kind: "writing" }
  | { kind: "written"; entry: DiaryEntry; saved: boolean; overwrote: boolean }
  | { kind: "failed"; message: string };
```

### 전이

```
list --[일기 쓰기 + 그 하루에 일기 있음]--> confirm-overwrite --[확인]--> writing
                                                    |
                                                    +--[취소]--> list
list --[일기 쓰기 + 그 하루에 일기 없음]-----------------------------> writing
```

**`toWriting()`은 여전히 인자를 받지 않는다**(불변식, 아래 §6 I7 계승). `confirm-overwrite`
갈래가 들고 있던 `day`를 그대로 파이프라인에 넘길 뿐이며, "이미 있는 일기를 보여주는"
지름길이 생기지 않는다.

### 금지된 필드

| 금지 | 원칙 |
| --- | --- |
| `confirm-overwrite`에 `existingEntry`, `preview` | I — 확인 화면이 저장된 글을 볼 수 있으면 그것이 곧 위반이다 |
| `confirm-overwrite`에 `progress`, `elapsedMs` | IV — 이 화면은 아직 생성을 시작하지 않은 상태다 |

---

## §6. 불변식 (테스트가 직접 센다)

| # | 불변식 | 지키는 것 |
| --- | --- | --- |
| **I1** | `selectableDays(now).length === 3`은 정오 전후 어느 시각에도 성립한다 | FR-001a |
| **I2** | 정오 이후 `selectableDays(now)[0] === dayOf(now)`이고 그그제(`latestClosedDay` 기준 셋째)는 배열에 없다 | FR-001a — 오늘이 그그제를 밀어낸다 |
| **I3** | 정오 이전 `selectableDays(now)`의 모든 원소에 대해 `isDayClosed(day, now) === true` | FR-002 — 오늘이 섞이지 않는다 |
| **I4** | `isDayWritable(day, now)`가 `true`인 하루만 파이프라인의 1단계 게이트를 통과한다 | research.md §9 — 화면과 파이프라인이 같은 판정을 본다 |
| **I5** | `dayStillOpen: true`인 요청으로 만든 프롬프트에 `DAY_STILL_OPEN` 문장이 있고, `false`이면 없다 | FR-003 |
| **I6** | `dayStillOpen`과 무관하게, `signals.photos`가 `unknown`(권한 없음)인 요청의 프롬프트에도 `DAY_STILL_OPEN` 문장이 붙는다(`dayStillOpen: true`일 때) | FR-004 — 사진 권한에 의존하지 않는다 |
| **I7** | `toWriting()`은 여전히 인자를 받지 않는다(`toWriting.length === 0`) | 원칙 I — 007이 세운 방어가 유지된다 |
| **I8** | `confirm-overwrite`의 필드는 정확히 `kind`·`day` 둘뿐이다 | 원칙 I — 선언을 직접 읽어 센다 |
| **I9** | `USER_VISIBLE_SIGNAL_AXES`가 `false`인 축은 `DiaryDetailScreen`이 그리지 않지만, 같은 `DaySignals`를 받은 `SignalProbe`(진단)는 그린다 | FR-009 — 값은 안 사라지고 노출만 갈린다 |
| **I10** | `collect.ts`의 사진 조회가 실패하면(예외) `photos`는 `unknown`이며, 부분 결과가 `known`으로 오지 않는다 | FR-016 |
| **I11** | 정오 이전에는 `DayPicker`가 `todayNotYetWritable: true`로 그려지고, 정오 이후에는 `undefined`(또는 미전달)로 그려진다 | **FR-002, 헌법 원칙 II MUST("화면 양쪽에 드러난다")** |

**★ I4가 이 기능의 가장 중요한 방어다**(research.md §9). `pipeline.ts`의 1단계
게이트를 고치지 않으면 화면이 아무리 잘 만들어져도 정오 이후의 "오늘"이 조용히
막힌다 — 006의 `GenerationProbe`, 009의 `latestClosedDay(at)` 한 줄과 같은 종류의
실패다.

**★ I6이 spec FR-004의 방어다.** 사진 축에 얹지 않고 하루에 대한 독립된 문장으로
둔 이유가 바로 이것 — 사진 권한이 없어 `signals.photos`가 `unknown`이어도
"아직 끝나지 않았다"는 전달돼야 한다.

---

## §7. 무엇이 바뀌지 않는가

| 계층 | 상태 |
| --- | --- |
| `src/diary/store.ts` | **그대로.** 파일명이 곧 날짜이며, 오늘 날짜로 저장하는 것도 같은 경로다 |
| `src/app/selection.ts` | **그대로.** 캐릭터 선택은 이 기능과 무관하다 |
| `src/vision/` | **그대로.** 011의 사진 캡션 선택(`selectForVision`)은 004/012의 상한 제거와 무관한 별개 계층이다(research.md §5) |
| `src/models/` | **그대로.** |
| `DiaryListItem`, `PhotoHint` | **그대로.** 목록 줄의 사진 갈래 표시는 이 기능이 건드리지 않는다 |

**이 기능이 넓히는 것**: `day-boundary.ts`(§1), `signals/types.ts`(§2),
`diary/types.ts`·`diary/request.ts`·`diary/pipeline.ts`·`diary/prompt.ts`(§3·4·9의
파이프라인 게이트), `app/state.ts`(§5), `signals/collect.ts`·`port.ts`·`expo-port.ts`
(사진 상한 제거, research.md §3), `ui/DiaryDetailScreen.tsx`(축 제외 반영),
`ui/DayPicker.tsx`(§1a — 정오 이전 안내, 헌법 원칙 II MUST), `ui/DiaryHomeScreen.tsx`
(안내 값을 계산해 `DayPicker`에 넘기는 배선).
