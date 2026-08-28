# Contract: 스케줄 판정 (`src/schedule/decision.ts`, `src/schedule/retry.ts`)

백그라운드 콜백이 매 실행마다 "지금 자동 생성을 돌려야 하는가, 돌린다면
어느 하루를"을 정하는 순수 판정. 관련: FR-001, FR-003, FR-013, spec
Clarifications(재시도 대상, 목표 시각 변경).

## D1 — `decideSchedule` 시그니처

```ts
export function decideSchedule(input: {
  settings: AutoDiarySettings;
  now: Date;
  selectableDays: readonly DayDate[];   // 009의 selectableDays(now)
  existingDiaryDays: readonly DayDate[]; // store.listDays()
}): ScheduleDecision;

export type ScheduleDecision =
  | { act: false; reason: "disabled" | "not-near-target" | "all-written" }
  | { act: true; day: DayDate };
```

## D2 — 판정 순서 (고정)

1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
2. `now`의 **현지 시(hour)** 가 `[targetHour, targetHour + WINDOW_HOURS)`
   구간에 없으면 → `{ act: false, reason: "not-near-target" }`.
   - `targetHour + WINDOW_HOURS > 24`이면 자정을 넘겨 wrap한다
     (예: `targetHour=23, WINDOW_HOURS=3` → 23·0·1시가 근방).
3. `pickRetryDay(selectableDays, existingDiaryDays)`가 `null`이면 →
   `{ act: false, reason: "all-written" }`.
4. 그 외 → `{ act: true, day: <그 값> }`.

## D3 — `WINDOW_HOURS` 상수

- `src/schedule/decision.ts`에만 존재. 밖으로 export하지 않는다.
- 값 3. 근거는 data-model.md §4 — 근사치(FR-002)이므로 넉넉히 잡되,
  SC-002/SC-003은 이 창이 아니라 "시도 하한"을 재므로 창 크기는 판정
  자격 구간일 뿐이다.
- **부르는 쪽이 이 값을 알 방법이 없어야 한다** — 테스트도 `decideSchedule`
  결과로만 검증한다(009의 `SELECTABLE_DAY_COUNT`가 밖으로 안 나가는 것과
  같은 방식).

## D4 — `now`는 인자다

`decideSchedule`도 `pickRetryDay`도 안에서 `new Date()`를 부르지 않는다.
`day-boundary.ts`의 모든 함수와 같은 규칙 — 경계 시각(`targetHour`
직전/직후, 자정 wrap)을 테스트하려면 "지금"이 주입돼야 한다.

## D5 — `pickRetryDay` 시그니처와 규칙

```ts
export function pickRetryDay(
  selectableDays: readonly DayDate[],
  existingDiaryDays: readonly DayDate[],
): DayDate | null;
```

- `selectableDays` 중 `existingDiaryDays`에 **없는** 날짜만 후보.
- 후보가 있으면 그중 **가장 최근**(사전순 최대, `YYYY-MM-DD`는 사전순이
  곧 시간순) 1개를 돌려준다.
- 후보가 없으면 `null`.
- **009 범위 밖은 자동으로 제외된다** — `selectableDays`가 애초에 마지막
  닫힌 하루 + 그 앞 둘(또는 정오 이후엔 오늘 포함 셋)만 주므로, 이
  함수가 그 배열만 보면 그그제보다 오래된 날은 후보가 될 수 없다.
  **이 함수는 04:00·3일을 다시 계산하지 않는다**(FR-021a).

## D6 — 위반 주입 (계약 테스트가 확인)

| 주입 | 기대 |
|---|---|
| `pickRetryDay`가 `selectableDays` 밖 날짜를 돌려준다 | 계약 위반 — 결과는 항상 입력 배열의 원소이거나 `null` |
| `decideSchedule`가 `settings.targetHour`를 무시하고 항상 `act: true` | D2-2 위반 — 목표 시각 근방이 아니면 `not-near-target` |
| `WINDOW_HOURS`를 export한다 | 소스 검사 위반 (D3, 009 `SELECTABLE_DAY_COUNT` 패턴) |
| `decideSchedule`가 `new Date()`를 안에서 부른다 | D4 위반 — 소스 문자열에 `new Date()` 없음(주석 제외) |
| `settings.enabled === false`인데 `act: true` | D2-1 위반 |

## D7 — 이 판정이 하지 않는 것

- 파이프라인을 부르지 않는다(순수 함수). 부르는 것은 `task.ts`.
- 알림을 보내지 않는다.
- 잠금을 취득하지 않는다(그건 `pipeline.run()` 안, generation-lock.md).
- 목표 시각을 저장하지 않는다(그건 `settings.ts`).
