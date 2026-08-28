# Contract: 백그라운드 태스크가 파이프라인을 부르는 방식 (`src/schedule/task.ts`, `src/schedule/background-port.ts`)

019의 `src/spike/background-diary-task.ts`가 검증한 구조를 제품 코드로
옮긴다. **베끼지 않고 이 계약을 따른다.** 관련: FR-003, FR-003a,
FR-011, SC-002, SC-003, 헌법 원칙 I·IV.

## B1 — 전역 스코프 `defineTask`

```ts
// src/schedule/task.ts — 모듈 최상단(React 컴포넌트 밖)
export const AUTO_DIARY_TASK_NAME = "alpharium-auto-diary";

TaskManager.defineTask(AUTO_DIARY_TASK_NAME, async () => {
  const result = await runAutoDiaryTask();
  return result === "ran" || result === "skipped"
    ? BackgroundTask.BackgroundTaskResult.Success
    : BackgroundTask.BackgroundTaskResult.Failed;
});
```

- 019 research.md §1: `defineTask`는 전역 스코프여야 백그라운드 런타임이
  번들을 다시 읽어 태스크를 찾는다.
- `App.tsx`가 이 모듈을 **부수 효과로 import**한다(`import
  "./src/schedule/task"`) — 019가 `App.tsx`에서 하네스 모듈을 import한
  것과 같은 방식.

## B2 — `runAutoDiaryTask` 본체

```ts
export async function runAutoDiaryTask(): Promise<"ran" | "skipped" | "failed">;
```

순서(고정):

1. `loadAutoDiarySettings(port)` — 설정을 읽는다.
2. `selectableDays(new Date())`, `store.listDays()` — 판정 재료.
   `now`는 여기서 한 번 `new Date()`로 만들어 아래 전부에 넘긴다(B7).
3. `decideSchedule({ settings, now, selectableDays, existingDiaryDays })`
   (contracts/schedule-decision.md).
   - `act: false` → `"skipped"` 반환. 아무것도 안 한다.
4. `act: true`면 `createAppPipeline(currentEnvironment())` (wiring.ts) —
   **어댑터를 직접 만들지 않는다**(FR-011, 006의 실패 계승).
   - `ok: false`면 `"failed"`.
5. `loadSelection(expoSelectionPort())` — 007이 저장한 캐릭터.
   `null`이면 `"skipped"`(고른 캐릭터 없이 자동 생성하지 않는다).
6. `loadVisionSetting(...)` — 사진 설정. 없으면 `"none"`.
7. `pipeline.run({ day: decision.day, now, character, vision })`.
   - 잠금은 `pipeline.run()` 안에서 취득한다(generation-lock.md). 태스크는
     잠금을 직접 다루지 않는다.
   - 취득 실패로 인한 `already-running`류 결과 → `"skipped"`(다음 콜백
     재시도, FR-013 경로와 합류).
8. `result.ok === true`:
   - `notify.ts`의 `decideNotify` → 어댑터로 알림 발송(notification.md).
   - `"ran"` 반환.
9. `result.ok === false`(잠금 외 사유):
   - 알림 **보내지 않는다**(FR-005, SC-006).
   - `"failed"` 반환.
10. 최상위 `try/catch`로 전체를 감싼다 — 예상 못 한 예외가 조용히
    사라지지 않게(019 H4). `catch`는 `"failed"`.

## B3 — `wiring.ts` 재사용 (경계)

- `createAppPipeline()` → `pipeline.run()`만 부른다.
- `acceptance.ts`(판정)·`backend.generate()`·`prompt.ts`를 직접 부르지
  않는다 — 019의 `checkSpikeFile`이 하네스에 걸었던 규칙과 같은 정신.
  `src/schedule/`에도 같은 소스 검사를 걸지 tasks에서 판단(research.md §9).
- 자동 생성으로 저장된 일기는 화면 수동 생성과 **동일한 판정 4갈래·저장
  경로**를 거친다(FR-011) — `pipeline.run()`이 그것을 보장하므로 태스크가
  따로 할 일이 없다.

## B4 — 등록/취소 (`src/schedule/background-port.ts`)

```ts
export interface BackgroundSchedulePort {
  /** minimumInterval: 15로 등록. 이미 등록돼 있으면 갱신(idempotent). */
  register(): Promise<void>;
  /** 등록 취소. 등록 안 돼 있어도 예외를 던지지 않는다. */
  unregister(): Promise<void>;
  /** unregister → register 순서. 목표 시각 변경·재적용에 쓴다(FR-003a). */
  reschedule(): Promise<void>;
}
```

- `minimumInterval` 값은 이 파일 상수(`MINIMUM_INTERVAL_MINUTES = 15`).
  019가 `MINIMUM_INTERVAL_MINUTES`를 하네스에 둔 것과 같은 자리.
- `register()`는 **목표 시각을 파라미터로 넣지 않는다** — 콜백이 매번
  설정에서 읽는다(research.md §3). 재등록의 실질 효과는 주기 리셋.
- 지연 import: `expo-background-task`·`expo-task-manager`를 메서드 안에서
  `await import`. 모듈 로드만으로 해석되면 웹·테스트에서 무너진다(007
  `expo-port.ts` 패턴).

## B5 — 설정 변경과 등록의 배선

`settings.ts`의 save 성공 후:

| 변경 | 호출 |
|---|---|
| `enabled: false → true` | 알림 권한 요청 → (prompted 아니면) 배터리 예외 인텐트 → `port.register()` |
| `enabled: true → false` | `port.unregister()` |
| `targetHour` 변경 (enabled 유지) | `port.reschedule()` |
| `enabled: true`인 채 앱 재시작 | `App.tsx`가 마운트 시 `port.register()` (idempotent, 재부팅 후 재등록 — 019가 `adb reverse`처럼 재부팅으로 사라지는 것을 언급한 것과 같은 방어) |

## B6 — `"skipped"`도 `Success`다

WorkManager에 `Failed`를 반환하면 재시도 백오프가 걸린다. "지금은 조건이
아님"(`skipped`)은 실패가 아니므로 `Success`를 반환해 다음 정상 주기를
기다린다. `Failed`는 **실제로 뭔가 깨졌을 때만**(파이프라인 조립 실패,
예외).

## B7 — `now`를 한 번만 만든다

`runAutoDiaryTask` 진입에서 `const now = new Date()` 한 번. 이후
`decideSchedule`·`selectableDays`·`pipeline.run`에 같은 값을 넘긴다 —
콜백이 도는 도중 시각이 넘어가 판정과 생성이 다른 하루를 보는 것을
막는다(019 하네스가 `latestClosedDay(new Date())`를 한 번 부른 것과 같은
정신).

## B8 — 위반 주입 (계약 테스트)

| 주입 | 기대 |
|---|---|
| 콜백이 `decideSchedule` 없이 항상 `pipeline.run()` | B2-3 위반 — 소스에 `decideSchedule` 호출이 있어야 함 |
| `backend.generate()`를 직접 부른다 | B3 위반 — 소스 검사(006 `DIRECT_GENERATE` 패턴) |
| `result.ok === false`인데 알림 발송 | B2-9 위반 (FR-005) |
| `Failed`를 `skipped`에서 반환 | B6 위반 — 재시도 폭주 |
| `register()`가 `targetHour`를 인자로 받는다 | B4 위반 — 목표 시각은 콜백이 읽는다 |
