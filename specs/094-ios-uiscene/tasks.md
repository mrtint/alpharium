# Tasks: Xcode 27 UIScene 대응

**Input**: [spec.md](spec.md), [plan.md](plan.md), [contracts/config-contract.md](contracts/config-contract.md)
**Tests**: TDD — 계약 테스트를 구현보다 먼저 쓰고 실패를 본다.

## Phase 1: Setup

- [ ] T001 현재 `package.json`의 expo 계열과 `npx expo install --check` 출력을 기준선으로 확인한다(`package.json`)

## Phase 2: 계약 테스트 먼저 (US1·US2 공통)

- [ ] T002 [US1] `__tests__/config/ios-scene-support.test.ts`에 계약 C1~C7을 쓰고 실패를 확인한다(expo ≥ 57.0.23 · `expo-build-properties` 의존성 · `app.json` 플러그인 항목 하나·`enableSceneSupport: true`·android 속성 없음 · `expo-background-task` 57.0.14과 패치 일치 · `ios-release.yml` Xcode 26 점검 유지 · AGENTS.md에 UIScene 우회 경고 없음(C6) · 빌드 번호 13 유지(C7))

## Phase 3: US1 — 새 SDK로 빌드한 앱이 열린다 (P1)

- [ ] T003 [US1] `npx expo install expo@~57.0.30 expo-build-properties`로 올리고 `npx expo install --check`를 통과시킨다. `expo-background-task` 고정은 유지(`package.json`, `package-lock.json`)
- [ ] T004 [US1] `app.json` plugins에 `["expo-build-properties", {"ios": {"enableSceneSupport": true}}]`를 넣어 T002의 C1~C5·C7을 통과시킨다. C6은 T012까지 붉어도 된다(`app.json`)
- [ ] T005 [US1] 위반 주입 3종(false로, 항목 삭제, expo 57.0.22)으로 T002가 각각 실패하는지 확인하고 되돌린다(`__tests__/config/ios-scene-support.test.ts`)
- [ ] T006 [US1] `npx expo prebuild --platform ios --clean`으로 `ios/Pocketlog/Info.plist`의 `UIApplicationSceneManifest`·`AppDelegate.swift`의 `ExpoReactNativeFactoryProvider`·`BGTaskSchedulerPermittedIdentifiers`(090~092)·entitlements를 확인한다
- [ ] T007 [US1] Xcode 27 Release(`EXPO_PUBLIC_APP_ENV=dev`, 수동 서명)를 빌드해 iPhone 14에 설치·실행하고 크래시 없이 홈이 뜨는지 본다(quickstart 4)

## Phase 4: US2 — 기존 동작 유지 (P1)

- [ ] T008 [US2] 실기기: 홈으로 나갔다 돌아오기(AppState)와 `--console` 로그를 본다
- [ ] T009 [US2] 실기기: 「쓰기」 → 앱 나감 → `[continued-write]` submitted·report·close → 저장·완성 알림(092)
- [ ] T010 [US2] 실기기: 쓸 차례 알림(085) 누름 — 웜·콜드. 사람이 누르는 항목을 구체적으로 요청한다
- [ ] T011 [US2] BGTask 처리기(090·091) 등록 로그와 `expo-background-task` 패치 적용을 확인한다

## Phase 5: Polish

- [ ] T012 문서: AGENTS.md의 「Xcode 27 UIScene」 경고·`specs/092-ios-continued-write/quickstart.md` 「빌드 함정」·로드맵 절을 고친다(우회 설명 삭제, 완료 이력으로 이동 — 로드맵 이동은 완료 처리 단계). 이로써 T002의 C6이 통과한다
- [ ] T013 `npm test`, `npm run lint`, `npx tsc --noEmit` 통과를 확인한다
- [ ] T014 push 후 PR의 CI(iOS 빌드 Xcode 26.6 포함)가 통과하는지 확인한다(FR-007)

## 의존성

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008~T011 → T012 → T013 → T014
