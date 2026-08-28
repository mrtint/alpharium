# Contract: 자동 생성 설정 영속화 (`src/schedule/settings.ts`, `src/schedule/notified-store.ts`)

관련: FR-001, FR-009, FR-010, spec Assumptions(기존 설정 저장 경로
재사용, 새 저장 계층 없음). 007의 `selection-store.ts` 패턴을 따른다.

## S1 — `AutoDiarySettings` 모양

data-model.md §1 참조:

```ts
export type AutoDiarySettings = {
  enabled: boolean;          // 기본 false
  targetHour: number;        // 0–23 정수, 기본 7
  batteryExceptionPrompted: boolean;  // 기본 false
};

export const DEFAULT_AUTO_DIARY_SETTINGS: AutoDiarySettings = {
  enabled: false,
  targetHour: 7,
  batteryExceptionPrompted: false,
};
```

## S2 — `SettingsPort`

```ts
export interface AutoDiarySettingsPort {
  read(): Promise<string | null>;   // 007 SelectionPort와 같은 모양
  write(serialized: string): Promise<void>;
}
```

## S3 — `loadAutoDiarySettings` / `saveAutoDiarySettings`

```ts
export function loadAutoDiarySettings(
  port: AutoDiarySettingsPort,
): Promise<AutoDiarySettings>;

export function saveAutoDiarySettings(
  port: AutoDiarySettingsPort,
  settings: AutoDiarySettings,
): Promise<void>;
```

- **load는 항상 `AutoDiarySettings`를 돌려준다**(never null) — 007의
  `loadSelection()`이 "모르면 null"인 것과 다르다. geocoding 설정처럼
  "명시적 기본값"이 있는 설정이다.
- 파일 없음 / JSON 깨짐 / 통로 예외 → `DEFAULT_AUTO_DIARY_SETTINGS`.
- **부분 손상에 관대**: `targetHour`가 0–23 정수가 아니면 그 필드만 7로,
  나머지는 살린다. `enabled`가 boolean이 아니면 `false`.
  `batteryExceptionPrompted`가 boolean이 아니면 `false`.
- `save`: `JSON.stringify(settings)`. 007처럼 `.writing` 임시 파일 +
  `moveSync`.

## S4 — 기기 통로 (`expoAutoDiarySettingsPort`)

- 파일: `Paths.document/preferences/auto-diary.json`. 007의
  `selected-character.json`과 **같은 디렉터리**(`preferences/`) — spec
  Assumptions "기존 설정 저장 경로 재사용".
- 지연 import `expo-file-system`.
- `preferences/` 디렉터리 생성 로직은 007과 동일(`intermediates: true`).

## S5 — `NotifiedState` 저장 (`src/schedule/notified-store.ts`)

data-model.md §2:

```ts
export type NotifiedEntry = {
  sentAt: string;          // ISO 8601
  acknowledged: boolean;
  notificationId: string;
};
export type NotifiedState = { [day: DayDate]: NotifiedEntry };

export function loadNotifiedState(port): Promise<NotifiedState>;  // 없으면 {}
export function saveNotifiedState(port, state): Promise<void>;
export function pruneNotified(state: NotifiedState, keepFrom: DayDate): NotifiedState;
```

- `pruneNotified`: **순수 함수**. `keepFrom`보다 사전순으로 작은
  날짜(= 더 오래된) 엔트리를 잘라낸다. `keepFrom`은 호출부가
  `selectableDays(now)`의 가장 오래된 값에서 며칠 더 뺀 여유값을
  넘긴다(맵이 무한히 안 커지게). **날짜 문자열 비교만** — 값이나 시간을
  안 본다(원칙 IV 경계).
- `loadNotifiedState`가 load 시 `pruneNotified`를 적용해도 되고(자동
  정리), 명시적으로만 불러도 된다 — tasks에서 결정. 어느 쪽이든 정리
  판정은 이 순수 함수 하나.
- 손상된 엔트리(모양 안 맞음)는 무시 — 그 날짜는 "알린 적 없음".
- 파일: `Paths.document/preferences/notified.json`.

## S6 — 설정 변경 → 부수 효과 배선 (화면 쪽, `App.tsx` / `AutoDiarySettingsScreen`)

`saveAutoDiarySettings` 자체는 **순수하게 파일만 쓴다** — 등록/알림
권한/배터리 인텐트 같은 부수 효과는 호출부가 한다(007의
`saveSelection`이 파일만 쓰고 화면이 나머지를 하는 것과 같다).

호출부 순서(background-generation.md B5와 일치):

```text
사용자가 "자동 생성" 토글을 켠다:
  1. notificationPort.requestPermission()
  2. next = { ...settings, enabled: true }
  3. if (!settings.batteryExceptionPrompted):
        batteryExceptionPort.requestException()   // battery-exception.md
        next.batteryExceptionPrompted = true
  4. saveAutoDiarySettings(port, next)
  5. backgroundPort.register()

사용자가 토글을 끈다:
  1. saveAutoDiarySettings(port, { ...settings, enabled: false })
  2. backgroundPort.unregister()

사용자가 목표 시각을 바꾼다 (enabled 유지):
  1. saveAutoDiarySettings(port, { ...settings, targetHour: chosen })
  2. backgroundPort.reschedule()
```

## S7 — 경계

- 이 파일에 **캐릭터·모델·시각 인코더 정보 없음**(원칙 III). 목표 시각·
  on/off·prompted 플래그만.
- `notified.json`은 **`DiaryEntry`와 분리**(research.md §6, 원칙 III·IV
  경계) — 일기 파일을 건드리지 않는다.
- `AutoDiarySettings`에 "마지막 실행 시각" 같은 필드를 넣지 않는다 —
  그게 실행 이력 로그로 자라는 자리(원칙 IV). 스케줄 판정은 매번
  `store.listDays()`(일기 존재 여부)로 충분하다.

## S8 — 위반 주입 (계약 테스트)

| 주입 | 기대 |
|---|---|
| `loadAutoDiarySettings`가 파일 없을 때 예외를 던진다 | S3 위반 — 항상 기본값 반환 |
| `targetHour: 25`를 저장했다 load하면 25가 나온다 | S3 위반 — 0–23 밖이면 7로 대체 |
| `AutoDiarySettings`에 `lastRunAt` 필드가 있다 | S7 위반 — 실행 이력 금지 |
| `notified.json`을 `diary/` 디렉터리에 쓴다 | S5 위반 — `preferences/`에만 |
| `pruneNotified`가 엔트리 값(sentAt)을 보고 자른다 | S5 위반 — 날짜 문자열 비교만 |
| `saveAutoDiarySettings`가 안에서 `backgroundPort.register()`를 부른다 | S6 위반 — 파일만 쓴다, 부수 효과는 호출부 |
