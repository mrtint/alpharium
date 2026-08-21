# Data Model: 지난 하루를 골라 쓴다

**Date**: 2026-08-21 | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

**타입이 곧 방어다.** 006이 `writing`에 필드를 두지 않아 진행률을 담을 자리를 없앴고,
005가 `RunResult`를 `{ text, ending }` 둘로 막았으며, 007이 `toWriting()`에서 인자를
없앴다. **자리가 없으면 담을 수 없다** — 이 문서는 그 자리들을 정한다.

---

## §1. `SelectableDay` — 고를 수 있는 하루 하나

```ts
type SelectableDay = {
  /** 그 하루 (`YYYY-MM-DD`) */
  day: DayDate;
  /** 그 하루에 일기가 이미 있는가 — 고르면 덮어쓴다(FR-011) */
  hasDiary: boolean;
};
```

**필드가 둘뿐인 것이 FR-011a의 방어다.**

사진 갈래(`PhotoHint`)를 넣지 않는다 — **아직 쓰지 않은 하루의 그 값은 지금 알 수
없고**, 넣으려면 고르는 화면이 세 하루의 신호를 미리 수집해야 하는데 그것은 범위 밖의
기록 계층을 여는 일이다(spec Out of Scope).

**`readable`도 넣지 않는다.** 목록의 `DiaryListItem`에는 있지만 여기서는 「일기가
있는가」만 필요하다 — 깨진 파일도 덮어쓸 대상이라는 점에서는 같다.

| 금지된 필드 | 왜 |
| --- | --- |
| `photos: PhotoHint` | 알 수 없다(FR-011a). 알려면 범위 밖 계층이 필요하다 |
| `label: "어제" \| "그저께"` | 04:00 경계 때문에 달력의 어제와 어긋나는 순간이 있다(research §4) |
| `signalsPreview`, `estimatedSize` | 원칙 IV — 잴 것을 화면에 올리는 첫걸음 |

---

## §2. `WritePrompt` — 「무엇을 하게 되는가」 (007에서 넓힌다)

```ts
type WritePrompt = {
  /** 쓰게 될 하루. **`selectable` 안에 반드시 있다**(불변식 I1) */
  day: DayDate;
  /** 그 하루에 일기가 이미 있는가 — 누르면 덮어쓴다(FR-012) */
  overwrites: boolean;
  /** 고를 수 있는 하루들. 최근이 먼저, 정확히 셋(FR-001) */
  selectable: readonly SelectableDay[];
  /**
   * 되돌려졌으면 **사용자가 원래 고른 하루**(FR-009).
   *
   * 없으면 되돌림이 없었다는 뜻이다. **별도 갈래가 아니라 사실이다**(FR-009d) —
   * 007의 `movedFrom`과 같은 모양이며 같은 이유다.
   */
  revertedFrom?: DayDate;
};
```

### 왜 이 모양인가

**`revertedFrom`이 옵셔널 필드인 것이 FR-009c·009d의 방어다.**

- 값이 **판정에서 나오므로**(FR-009d) 화면이 스스로 이전 값과 비교하지 않는다 —
  비교하면 같은 규칙이 두 곳에 생긴다.
- 판정이 **매번 다시 도므로**(FR-009a) 「알림을 지우는 시점」을 관리할 필요가 없다.
  고른 하루가 범위 밖인 동안 계속 실려 나오고, **사용자가 다시 고르면 그 순간
  사라진다**(FR-009c) — 지우는 코드가 없는데 사라진다.

**`overwrites`는 `selectable`에서 골라낼 수 있는데도 남긴다.** 화면이 골라내게 하면
같은 규칙이 두 곳에 생긴다 — 판정이 답을 주고 화면은 그린다.

### 금지된 필드 (테스트가 선언을 직접 읽어 검사한다)

| 금지 | 원칙 |
| --- | --- |
| `elapsedMs`, `progress`, `tokens`, `stage` | IV — 담을 자리가 없어야 담기지 않는다 |
| `character`, `modelPath`, `assetSize` | III — 하루를 고르는 자리는 날짜만 다룬다 |
| `entry`, `text`, `preview` | I — 저장된 글이 이 자리를 통해 화면에 오를 길을 막는다 |

**★ 007이 겪은 것**: `AppScreen`에 `stage: string`을 주입했더니 **jest 38개가 전부
통과했다** — 타입은 지워지므로. 잡은 것은 `tsc`뿐이었다. 그래서 `state.test.ts`가
**선언을 `readFileSync`로 직접 읽어** 검사하도록 고쳤고, **이 기능도 같은 방식을 쓴다.**

---

## §3. 고른 하루 — 화면의 상태

```ts
// DiaryHomeScreen 안
const [chosenDay, setChosenDay] = useState<DayDate | null>(null);
```

**`null`이 「고른 적 없다」이며 그때 기본값(마지막으로 닫힌 하루)을 쓴다**(FR-007).

**이것은 판정이 아니라 사용자의 입력이다.** 007의 캐릭터 선택과 달리 **파일에
남기지 않는다**(FR-010) — 하루는 시간이 지나면 범위를 벗어나 저장된 값이 오히려
틀린 값이 된다.

**「범위 밖이라 되돌려졌음」은 여기 없다.** 그것은 상태가 아니라 **판정의 결과**이며
`writePromptFor()`가 매번 다시 계산한다(spec Key Entities).

---

## §4. 전이표

`chosenDay`와 「지금」이 `WritePrompt`를 만든다. **화면을 그릴 때마다 다시 계산된다**
(FR-009a).

지금이 2026-08-21 14:00 → `selectable`은 `[08-20, 08-19, 08-18]`이라 하자.

| # | `chosenDay` | 저장된 일기 | `day` | `overwrites` | `revertedFrom` | FR |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `null` | 없음 | `08-20` | `false` | 없음 | FR-007 |
| 2 | `null` | `08-20` | `08-20` | **`true`** | 없음 | FR-012 |
| 3 | `08-18` | 없음 | **`08-18`** | `false` | 없음 | FR-006 |
| 4 | `08-18` | `08-18` | `08-18` | **`true`** | 없음 | FR-012 |
| 5 | `08-18` | `08-20` | `08-18` | **`false`** | 없음 | FR-012 |
| 6 | **`08-17`** | 없음 | **`08-20`** | `false` | **`08-17`** | FR-009 |
| 7 | **`08-17`** | `08-20` | `08-20` | **`true`** | **`08-17`** | FR-009+012 |
| 8 | **`08-21`** (오늘) | 없음 | `08-20` | `false` | **`08-21`** | FR-002·009 |

**★ 6번이 이 표의 핵심이다.** 쓰기 자리를 열어 둔 채 04:00을 넘겨 `08-17`이 범위를
벗어난 상황이다 — **말없이 `08-20`을 쓰지 않고 되돌렸다는 것을 실어 보낸다.**

**★ 5번은 덮어쓰기가 「고른 하루」를 따른다는 것이다.** 다른 하루에 일기가 있어도
고른 하루에 없으면 `false`다 — 007의 `items.some(...)`이 하루 하나를 볼 때 성립하던
것이 셋에서도 성립해야 한다.

**★ 8번**: 오늘은 `selectable`에 없으므로(FR-002) 범위 밖과 같이 다뤄진다.
**화면에서 고를 수 없지만 판정은 그것에 기대지 않는다.**

---

## §5. 불변식 (테스트가 직접 센다)

| # | 불변식 | 지키는 것 |
| --- | --- | --- |
| **I1** | `prompt.day`는 **언제나** `prompt.selectable`의 원소다 | FR-017 — 범위 밖 하루가 생성으로 갈 통로가 없다 |
| **I2** | `selectable.length === 3`이며 그 3은 `day-boundary.ts`의 상수에서 온다 | FR-003 — 범위 크기가 한 자리에만 있다 |
| **I3** | `selectable`의 모든 `day`에 대해 `isDayClosed(day, now) === true` | FR-002 — 오늘이 섞이지 않는다 |
| **I4** | `revertedFrom`이 있으면 `revertedFrom !== day`이고 `revertedFrom`은 `selectable`에 **없다** | FR-009 — 되돌리지 않았는데 「되돌렸다」고 알리지 않는다 |
| **I5** | `overwrites === selectable.find(d => d.day === prompt.day)?.hasDiary` | 같은 답이 두 곳에서 갈리지 않는다 |
| **I6** | `WritePrompt`의 필드는 정확히 넷이다 (`day`·`overwrites`·`selectable`·`revertedFrom`) | 원칙 IV — 선언을 직접 읽어 센다 |
| **I7** | `toWriting()`은 여전히 인자를 받지 않는다 (`toWriting.length === 0`) | 원칙 I — 007이 세운 방어가 유지된다 |

**★ I4가 007의 교훈을 옮긴 것이다.** `resolveSelection()`에서 `movedFrom`이 옮기지
않았는데 붙으면 **바뀌지 않았는데 「바뀌었다」고 알리게 된다.** 여기서도 같다.

**★ I7이 이 기능의 가장 중요한 방어다.** 고를 수 있는 하루가 셋이 되면 「이미 있으면
그것을 보여주자」의 유혹도 셋이 된다. `toWriting()`이 저장 상태를 **볼 수 없으므로**
그것으로 갈릴 수 없다(FR-013).

---

## §6. 하루 경계 — `day-boundary.ts`가 더하는 것

```ts
/** 고를 수 있는 하루의 개수. **이 값은 여기에만 있다**(FR-003) */
const SELECTABLE_DAY_COUNT = 3;

/**
 * 지금 시점에서 고를 수 있는 하루들. 최근이 먼저다(FR-001).
 *
 * `latestClosedDay(now)`에서 시작해 하루씩 거슬러 셋을 만든다.
 * **「지금」을 인자로 받는다**(FR-005).
 */
function selectableDays(now: Date): readonly DayDate[];
```

**`latestClosedDay()`를 지우지 않는다** — 006·007이 쓰고 있고, `selectableDays()[0]`과
같은 값이라는 것이 테스트로 못 박힌다.

**범위 크기를 인자로 받지 않는다.** 받으면 부르는 쪽이 3을 알게 되고 **그 순간 값이
두 곳에 생긴다**(FR-003). 004가 `dayBounds()`에 04:00을 넘기지 않는 것과 같다.

---

## §7. 무엇이 바뀌지 않는가

| 계층 | 상태 |
| --- | --- |
| `src/diary/pipeline.ts` | **그대로.** `PipelineInput.day`가 이미 임의의 하루를 받는다 |
| `src/signals/collect.ts` | **그대로.** `collectDaySignals(port, day)`가 이미 하루를 받는다 |
| `src/diary/store.ts` | **그대로.** 파일명이 곧 날짜다 |
| `src/diary/prompt.ts` | **그대로.** 007이 남긴 원칙 II 위반은 범위 밖이다 |
| `src/app/selection.ts` | **그대로.** 캐릭터 선택은 이 기능과 무관하다 |
| `AppScreen` | **그대로.** 「어디에 있는가」는 하루가 셋이 되어도 같다 |

**이 기능이 넓히는 것은 `WritePrompt`와 `day-boundary.ts` 둘뿐이다.**
