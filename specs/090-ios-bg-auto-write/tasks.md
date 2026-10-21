# Tasks: iOS 백그라운드 자동 쓰기 — 원인 가르기와 「밤 충전 중 완주」

**Input**: `specs/090-ios-bg-auto-write/` (spec·plan·research·data-model·contracts·quickstart)
**Tests**: TDD 필수(CLAUDE.md) — 각 구현 앞에 실패하는 테스트.

## Phase 1: Setup

- [X] T001 고치기 전 실기기 재현을 시작한다 — iPhone 컨테이너 백업, 안 쓴 지난 날 준비, 충전·Wi-Fi로 OS 깨움 대기(quickstart 2절). 결과는 `specs/090-ios-bg-auto-write/quickstart.md` 「실측」에 적는다(구현과 나란히 진행)

## Phase 2: Foundational — 시도 기록 확장 (US1·US2 공통)

- [X] T002 [P] 실패 테스트: `expired` 갈래·`launch` 옵셔널 필드(값은 `"active" | "background"`만, 밖이면 필드 없이 읽음)·끝남이 `launch` 보존·`recordAttemptExpired` 새 줄 in `__tests__/app/auto-write-attempts.test.ts` (AT11~AT14)
- [X] T003 구현: `AttemptOutcome`에 `"expired"`, `AutoWriteAttempt.launch?`, `recordAttemptStart(port, path, at, launch?)`, `recordAttemptExpired(port, at)` in `src/app/auto-write-attempts.ts`
- [X] T004 [P] 실패 테스트 + 구현: 통로 `readLaunchState()`(호출 시점 `require("react-native")`, `active`/`background` 밖·예외 → `undefined`) in `src/app/launch-state-port.ts`, 테스트 `__tests__/app/launch-state-port.test.ts`, 066 동적 import 금지 계약(`__tests__/onboarding/no-react-native-dynamic-import.test.ts`) 대상에 파일 추가 (LS1)

## Phase 3: US1 — 밤 충전 중 놓친 날을 쓴다 (P1)

**Independent test**: 같은 날 앞 판정이 「재료 없음」이어도 뒤 판정이 쓴다; iOS·background 마운트에서 홈이 판정하지 않는다.

- [X] T005 [P] [US1] 실패 테스트: 창 밖 `no-material`·`no-photo-access`·`all-written`·`no-character`는 몫을 쓰지 않고 같은 날 두 번째 실행이 다시 판정, `write` + 캐릭터 있음만 몫을 씀, 몫이 오늘이면 신호를 읽지 않고 `catch-up-spent`(FR-002) in `__tests__/schedule/task-catch-up.test.ts`(기존 078 몫 테스트가 있으면 그 파일에) (CU1~CU5, FR-002)
- [X] T006 [US1] 구현: 몫 저장을 캐릭터를 읽은 뒤·`pipeline.run` 직전으로 옮김 in `src/schedule/task.ts`
- [X] T007 [P] [US1] 실패 테스트: `platform: "ios"` + `AppState.currentState === "background"` 마운트 → 판정 0회·기록 0, `change → active` → 1회; android·ios active → 즉시 1회 in `__tests__/ui/auto-write-handoff-launch.test.tsx` (HO13·HO14)
- [X] T008 [US1] 구현: `AutoWriteHandoffDeps.platform?: AppPlatform`, iOS·`background` 마운트면 첫 `check()` 보류 in `src/app/use-auto-write-handoff.ts`; `App.tsx`가 `appPlatform(Platform.OS)`를 넘김(HO15) — 082 소스 계약(`__tests__/ui/auto-write-open-assembly.test.tsx` 등) 확인

## Phase 4: US2 — 왜 안 썼는지 보인다 (P2)

- [X] T009 [P] [US2] 실패 테스트: 백그라운드 실행 중에만 만료 구독, 만료 1회 → `recordAttemptExpired` 1회(여러 번 와도 1회), 끝나면 해제, 수동은 구독 안 함, 시작 줄에 주입한 `launch` in `__tests__/schedule/task-expiry.test.ts` (EX1~EX3, AT12)
- [X] T010 [US2] 구현: 통로 `subscribeBackgroundExpiry(listener): () => void`(`requireOptionalNativeModule("PocketlogBgExpiry")`, 없으면 no-op) in `src/app/bg-expiry-port.ts`; `AutoDiaryTaskDeps`에 `subscribeExpiry?`·`launchState?` 주입, `runAutoDiaryTask`가 사용 in `src/schedule/task.ts` (`src/schedule/` 소스에 `AppState` 낱말 없음 — LS2)
- [X] T011 [US2] 네이티브: 로컬 Expo 모듈 `modules/pocketlog-bg-expiry/`(`expo-module.config.json` 플랫폼 apple, `ios/PocketlogBgExpiryModule.swift` — `Notification.Name("onTasksExpired")` 관찰 → 이벤트 `onExpired`, `ios/PocketlogBgExpiry.podspec`, `package.json`)
- [X] T012 [P] [US2] 소스 계약: Swift의 알림 이름이 `node_modules/expo-background-task/ios/BackgroundTaskModule.swift`의 이름과 같고 JS 모듈 이름이 Swift `Name(...)`과 같음 in `__tests__/config/bg-expiry-module.test.ts` (EX4)
- [X] T013 [US2] 화면: `expired` 문구 「시간 예산이 끝남」·`launch` 꼬리 「· 앞에서」/「· 뒤에서」 in `src/i18n/catalogs/ko/attempts.ts`, `src/ui/AttemptsGroup.tsx`(+ 진단·개발자 화면 공유) — 테스트 `__tests__/ui/attempts-group.test.tsx` (TX2); 새 문구를 `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`(078 `attempts` 줄 옆)에 추가

## Phase 5: US3 — 같은 기대 (P3)

- [X] T014 [US3] `permBatteryHintIos` = 「충전 중이고 저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」 in `src/i18n/catalogs/ko/settings-platform.ts`, `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`(085가 그 표에서 값을 바꾼 자리 — 골든 밖 문구), 배터리 행 테스트 갱신(`__tests__/app/battery-row.test.ts` 등) (TX1)

## Phase 5b: 구현 중 실기기에서 드러난 것 (FR-010)

- [X] T020 [US1] `patch-package` 개발 의존성·`postinstall`, `patches/expo-background-task+57.0.14.patch`(`requiresExternalPower = true`·`requiresNetworkConnectivity = false`), 설치된 파일을 읽는 계약 `__tests__/config/bg-task-request-patch.test.ts` (FR-010, R7)

## Phase 6: Polish

- [X] T015 `npm test` 전체 · `npm run lint` 통과(가드 표 B6·B3·069 G-1 등 새 파일 등록)
- [X] T016 iOS 재빌드·설치(quickstart 3절, 패치 포함 — 빌드된 앱에서 요청 조건 확인은 실측으로) — `ios/Pods`에 로컬 모듈 링크 확인, 앱 실행·시도 기록에 `launch` 기록 확인
- [X] T017 하룻밤 실측(quickstart 4절) + dasd 로그(소유자 `sudo`) → `quickstart.md` 「실측」; 백그라운드 깨움 시각대에 `앱 열기 · 홈에 넘김` 줄이 없는지 확인(SC-003)
- [X] T018 AGENTS.md에 090 절(결론·남은 위험), 078 「읽는 법」에 `expired`·`launch` 추가
- [X] T019 안드로이드 회귀 확인(quickstart 5절) 또는 미확인 기록 — 이 맥에 안드로이드 기기·adb가 없어 미확인으로 기록(AGENTS 090 미확인, quickstart 5절)

## Dependencies

T002→T003 → (T005·T006, T009·T010). T004 → T010. T007→T008. T011 → T012·T016. T013은 T003 뒤. US3 독립. T015 → T016 → T017.

## Parallel

T002·T004·T005·T007·T012는 서로 다른 파일. MVP = US1(T005~T008).

> 코드 리뷰 뒤 메모: 테스트는 계획한 새 파일 대신 기존 파일에 들어갔다 — T005·T009는 `__tests__/schedule/background-generation.test.ts`, T007은 `__tests__/app/use-auto-write-handoff.test.tsx`, T013은 `__tests__/app/diagnostics-view.test.ts`(DV9·DV10 — 꼬리는 문자열 단계라 `AttemptsGroup`은 바뀌지 않았다). 리뷰 Important 둘(만료 시각을 네이티브에서 잼, `expo-background-task` 버전 고정·`--error-on-fail`)은 반영했다.
