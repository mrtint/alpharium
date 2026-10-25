# Contract: 홈 안내

테스트 위치: `__tests__/app/battery-notice.test.ts`, `battery-notice-store.test.ts`, `__tests__/ui/use-battery-notice.test.tsx`, `diary-list-screen`·`diary-home-screen` 테스트, `__tests__/i18n/ko-golden.test.ts`(추가 목록).

## BN — 판정 (`src/app/battery-notice.ts`, 순수)

- **BN1**: `BATTERY_NOTICE_HIDE_MS = 7 × 24 × 60 × 60 × 1000`.
- **BN2**: `shouldShowBatteryNotice({ platform, status, dismissedAt, now })` — 안드로이드 && `restricted` && (`dismissedAt === null` || `now − dismissedAt ≥ BN1`) 일 때만 참. `dismissedAt`이 `now`보다 미래이면(`now − dismissedAt < 0`) 거짓. `dismissedAt === "unreadable"`이면 거짓.
- **BN3**: iOS·`exempt`·`unknown`은 언제나 거짓.
- **BN4**: 하루 경계(자정)를 쓰지 않는다. `getHours()` 등을 쓰지 않는다 — 시각은 `now`로 받는다.

## BS — 기록 (`src/app/battery-notice-store.ts`)

- **BS1**: `BatteryNoticeStorePort { read(): Promise<string|null>; write(s): Promise<void> }`. 기기 통로 `expoBatteryNoticeStorePort()`는 `preferences/battery-notice-dismissed.json`, 임시 파일 뒤 교체(`skip-store`와 같은 방식), `File`의 동기 메서드(`textSync()` 등)만 쓴다(AGENTS ★).
- **BS2**: `loadDismissedAt(port)` — 없음·깨짐·모양 다름 → `null`, 통로 예외 → `"unreadable"`. `saveDismissedAt(port, at)` — `{ at }`로 덮는다.
- **BS3**: `scripts/layer1/baseline.ts` 표에 이 파일이 있다(G-1 가드 테스트 통과).

## UB — 훅 (`src/app/use-battery-notice.ts`)

- **UB1**: 입력 `{ platform, readStatus, store, now, openSettingsList }`. 출력 `{ notice: null | { onOpenSettings, onDismiss }, onAutoWriteSaved }`.
- **UB2**: `onAutoWriteSaved()`는 상태와 닫은 시각을 읽어 `shouldShowBatteryNotice`가 참이면 안내를 보이게 한다. 읽기 실패는 안내 없음.
- **UB3**: 안내가 떠 있는 동안 `AppState → active`마다 상태를 다시 읽고 `restricted`가 아니면 숨긴다(기록 없음, 토스트 없음).
- **UB4**: `onDismiss()`는 `now`를 기록하고 숨긴다. 기록 실패는 숨김만 한다(삼키고 던지지 않는다).
- **UB5**: `onOpenSettings()`는 `openSettingsList()`를 부른다. 안내는 그대로 두고(돌아온 뒤 UB3이 판단), 던지지 않는다.
- **UB6**: 이미 떠 있는 동안 또 `onAutoWriteSaved()`가 와도 상태가 그대로다.
- **UB7**: iOS에서는 어떤 읽기도 하지 않는다.
- 훅은 `expo-*`를 모른다 — 통로는 조립부(`App.tsx`)가 넘긴다. `AppState`는 「언제 다시 읽나」만 고른다.

## HS — 화면

- **HS1**: `DiaryHomeScreen`은 `generate(..., { auto: true })`가 `result.ok`로 끝났을 때만 `onAutoWriteSaved?.(day)`를 부른다. 실패·그만두기·`already-running`·`auto` 아님에는 부르지 않는다.
- **HS2**: `DiaryListScreen`은 `batteryNotice`가 있고 쓰는 중이 아닐 때 `Notices` 아래에 한 줄 + [설정 열기]·[닫기]를 그린다. 쓰는 중에는 그리지 않는다. testID: `home-battery-notice`, `home-battery-notice-open`, `home-battery-notice-dismiss`.
- **HS3**: 문구 — 안내: 「배터리 사용 제한을 풀어 두면 화면이 꺼진 채로도 일기를 써드릴 수 있어요」. 버튼: [설정 열기]·[닫기]. 모두 `src/i18n/catalogs/ko/home.ts`(또는 같은 도메인 카탈로그)에 두고 골든의 `ADDED_AFTER_GOLDEN`에 올린다. 화면 컴포넌트에 한글 리터럴을 두지 않는다(062).
- **HS4**: 접근성 — 버튼은 `accessibilityRole="button"`과 라벨을 가지고, 누름 영역은 `design/DESIGN.md`의 최소 규칙을 따른다(구현 때 먼저 읽는다).
