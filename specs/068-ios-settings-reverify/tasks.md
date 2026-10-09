# Tasks: iOS 설정·개발자·진단 화면 재검증과 고장 수정

**Input**: `specs/068-ios-settings-reverify/` (spec.md, plan.md, research.md, data-model.md, contracts/ios-settings.md, quickstart.md)

**Tests**: 이 저장소는 계약·테스트를 먼저 쓴다(헌법 「개발 방식」). 각 스토리에서 테스트 태스크가 구현 태스크보다 앞선다. 새 규칙은 위반 주입으로 검증한다(AGENTS).

**형식**: `- [ ] T### [P?] [US?] 설명 (파일 경로)`. [P] = 다른 파일·선행 의존 없음.

## Phase 1: Setup (훑기 환경)

- [X] T001 Maestro·openjdk가 있는지 확인한다: `export JAVA_HOME=/opt/homebrew/opt/openjdk PATH=$JAVA_HOME/bin:$PATH; maestro --version`. 없으면 `brew install openjdk mobile-dev-inc/tap/maestro`(2026-10-09 이 맥에는 설치됨; quickstart 준비 1번)
- [X] T002 현재 `app.json` 기준으로 iOS 프로젝트를 다시 만든다: `NETRC=<빈 디렉터리> npx expo prebuild --platform ios --clean` (결과 `ios/Pocketlog.*`, `com.a810labs.pocketlog` 확인 — `grep -n "PRODUCT_BUNDLE_IDENTIFIER" ios/*.xcodeproj/project.pbxproj`)
- [X] T003 T002의 프로젝트를 시뮬레이터 dev 빌드한다(`EXPO_PUBLIC_APP_ENV=dev npx expo run:ios --device <UDID> --no-bundler`)하고 Metro를 dev 환경으로 띄운 뒤 번들이 `dev`인지 `curl`로 확인한다(`.env.development.local` — AGENTS 「도구 사용법 1」)
- [X] T004 새 앱으로 첫 실행 흐름(권한 → 동의 → 내려받기 → 작명)을 지나 홈에 도달한다(liveness 실패 화면은 「그냥 시작하기」). 모델 내려받기 약 2GB. 시뮬레이터에서 합성 클릭이 안 먹으므로 Maestro로 조작한다(`.maestro/ios/first-run-to-home.yml` — 신규, 머리 주석에 「FLOWS 미등록, 등록하지 않은 흐름은 아무것도 검증하지 않는다」)

## Phase 2: Foundational (모든 스토리가 기대는 것)

- [X] T005 [P] 소스 계약 테스트 `__tests__/onboarding/no-react-native-dynamic-import.test.ts`를 쓴다: `src/` 전체를 주석 걷고 읽어 `await import("react-native")`가 0건임을 단언하고, `os-settings-port.ts`·`battery-exception-port.ts`는 `require("react-native")`를 호출 시점(함수 안)에서만 쓰는지 단언한다(contracts C3)
- [X] T006 T005 위반 주입: `os-settings-port.ts`에 `await import("react-native")` 한 줄을 되살려 테스트가 실패하는지 확인하고(치환이 적용됐는지 먼저 단언) 되돌린다

## Phase 3: User Story 1 - 설정의 모든 행을 눌러도 앱이 튕기지 않는다 (Priority: P1)

**Goal**: 설정 모든 행이 iOS에서 오류·종료 없이 동작한다(FR-001·FR-002).

**Independent Test**: 시뮬레이터에서 설정 행을 모두 눌러 Metro `ERROR` 0건, 권한 행은 iOS 설정 앱이 열린다.

- [X] T007 [US1] 설정 훑기 흐름 `.maestro/ios/settings-sweep.yml`을 쓴다: 홈 → `home-settings` → `settings-name`(이름 바꾸기 열고 닫기) · `auto-diary-toggle` · `settings-target-hour`·`settings-place-names` 대화상자 · `settings-perm-photos`·`-location`·`-notifications`·`-battery`(각각 누른 뒤 `launchApp: stopApp: false` → `settings-screen` 확인) · `settings-device-modules`·`settings-wipe`(대화상자 열고 취소) · `settings-version`. 머리 주석에 FLOWS 미등록 사유를 적는다
- [X] T008 [US1] T007 흐름을 시뮬레이터에서 돌리고 Metro `ERROR`·`simctl log show`의 오류, 각 행의 화면을 `specs/068-ios-settings-reverify/quickstart.md`의 「기록 칸」 표(화면·행 / iOS 관측 / 조치 / 확인 환경)에 채운다
- [X] T009 [US1] 권한 행 세 개를 누른 직후 iOS 설정 앱이 열렸다가 앱으로 돌아와 꼬리표가 다시 읽히는지(`AppState → active`) 확인한다. 이어서 `xcrun simctl privacy <UDID> grant|revoke photos`(와 `location`)로 사진을 「허용」/「거부」로 바꿔 꼬리표를 읽고, 시뮬레이터가 지원하는 만큼 「일부만 허용」(`limited`) 꼬리표와 위치 꼬리표(`photoLocationProbe`)도 본다. 지원하지 않는 상태는 「시뮬레이터에서 만들 수 없음」으로 기록 칸에 적는다(FR-002, Edge Cases)
- [X] T010 [US1] T008에서 걸린 결함마다 (1) 재현하는 기기 없는 테스트를 먼저 쓰고 (2) 고치고 (3) 고친 것을 되돌려 그 테스트가 실패하는지 확인한 뒤 복원한다(위반 주입, SC-004). 판정이 필요한 것(플랫폼에 기능이 없는 행)은 고치지 않고 소유자에게 묻는다(FR-008). 걸린 것이 없으면 「걸린 것 없음」으로 기록 칸에 적고 이 태스크를 닫는다
- [X] T011 [US1] 세 화면 밖의 iOS 결함(홈·온보딩·일기 쓰기)을 발견하면 고치지 않고 `docs/roadmap/README.md`에 증상·재현 방법을 한 줄로 적는다. 앱이 종료되는 결함만 이 과제에서 고친다(FR-008a)

## Phase 4: User Story 2 - iOS에 없는 것을 있는 것처럼 보이지 않는다 (Priority: P2)

**Goal**: 설정 「배터리」 행이 iOS에서 「저전력 모드를 끄면 제때 써요」를 보이고 앱 설정을 연다. 안드로이드는 무변경(FR-003).

**Independent Test**: `batteryRowHint` 단위 테스트와 `SettingsScreen` 화면 테스트, iOS 시뮬레이터·안드로이드 dev 실기기 확인.

- [X] T012 [P] [US2] `__tests__/app/battery-row.test.ts`를 쓴다(실패 상태로 시작): `batteryRowHint("ios") === "저전력 모드를 끄면 제때 써요"`, `batteryRowHint("android")`는 `SETTINGS_TEXT.permBatteryHint`와 **바이트 동일**(contracts C1)
- [X] T013 [P] [US2] `__tests__/ui/settings-battery-row.test.tsx`를 쓴다(실패 상태로 시작): `batteryHint` prop 문자열이 행에 그려지고, `testID="settings-perm-battery"` 행이 누르면 `onOpenAppSettings`를 부른다(C2). 소스 계약: `SettingsScreen.tsx`에 `Platform.select`·`Platform.OS`로 배터리 문구를 고르는 코드가 없다
- [X] T014 [US2] 카탈로그에 새 영역 `settingsPlatform`(`permBatteryHintIos: "저전력 모드를 끄면 제때 써요"`)을 더한다 — 새 모듈 `src/i18n/catalogs/ko/settings-platform.ts`를 만들고 `src/i18n/catalogs/ko/index.ts`에 영역 `settingsPlatform`으로 등록한다. 062 골든(G1/G2)은 옛 상수 영역만 잠그므로 별도 영역으로 둔다(research R4); `__tests__/i18n/ko-golden.test.ts`가 계속 통과하는지 확인
- [X] T015 [US2] `src/app/battery-row.ts`에 순수 함수 `batteryRowHint(platform: "android" | "ios"): string`을 구현한다(T012 통과). `Platform`·`now`를 읽지 않는다
- [X] T016 [US2] `src/ui/SettingsScreen.tsx`의 배터리 행 `hint`를 새 prop `batteryHint: string`으로 받게 바꾸고(`SettingsScreenProps`에 추가) `permBatteryHint` 직접 사용을 지운다(T013 통과)
- [X] T017 [US2] `App.tsx`에서 이미 만드는 `platform`(`Platform.OS === "ios" ? "ios" : "android"`)으로 `batteryRowHint(platform)`을 계산해 `SettingsScreen`에 `batteryHint`로 넘긴다(조립부는 `App.tsx`에서 `<SettingsScreen`을 렌더하는 곳이고 `platform`은 777행 근처에서 이미 만든다 — 같은 컴포넌트 범위에 없으면 `platform`을 그 범위까지 전달한다). `tsc` 0
- [X] T018 [US2] 온보딩 무변경 계약을 잠그는 테스트를 새로 쓴다 — `__tests__/onboarding/requirements.test.ts`(108행 「android를 포함한다」)·`decision.test.ts`에 iOS에서 `battery-exception`이 빠진다는 단언이 없음을 확인했다(2026-10-09). `__tests__/onboarding/battery-ios.test.ts`: `planOnboardingSteps({ platform: "ios", … })`에 `battery-exception`이 없고 `PERMISSION_REQUIREMENTS`의 `battery-exception`이 `platforms: ["android"]`다(contracts C4)
- [X] T019 [US2] 위반 주입: (a) `batteryRowHint`가 항상 안드로이드 문구를 돌려주게 하고 (b) `SettingsScreen`에 `Platform.select`를 되살려 각각 T012·T013가 실패하는지 확인한 뒤 되돌린다(치환 적용 여부를 먼저 단언)

## Phase 5: User Story 3 - 개발자·진단 화면의 모든 버튼이 iOS에서 동작한다 (Priority: P3)

**Goal**: 개발자 메뉴·진단의 모든 버튼이 iOS 개발 빌드에서 오류 없이 동작하거나 의도적으로 감춰져 있다(FR-005).

**Independent Test**: iOS 시뮬레이터 dev 빌드에서 `developer-*`·진단 버튼 훑기.

- [X] T020 [US3] 개발자·진단 훑기 흐름 `.maestro/ios/developer-diagnostics-sweep.yml`을 쓴다: 설정 `settings-developer` → 개발자 겹(모듈 상태·`모듈 다시 받기`(이미 준비됨 토스트)·`온보딩부터 다시`·`끄기`) → 진단 겹(일곱 묶음 펼침·`한 번 써 보기`·`자동 쓰기 지금 실행`) → 상태 흉내 날짜 대화상자(열고 닫기). 각 겹을 닫는 수단(`back-to-home` 등)이 iOS에서 눌리는지 포함한다(research R7). FLOWS 미등록 사유를 머리 주석에
- [X] T021 [US3] T020를 시뮬레이터에서 돌리고 오류·문구 어긋남·닫을 수 없는 겹을 기록 칸에 채운다
- [X] T022 [US3] T021에서 걸린 결함마다 테스트를 먼저 쓰고 고치고 위반 주입(고친 것을 되돌려 테스트 실패 확인 후 복원)까지 한다(SC-004). 「`BackHandler` 없이 닫을 수단이 없는 겹」·「모듈 다시 받기의 셀룰러 문구」·「사진의 위치 정보 꼬리표」는 소유자에게 판정을 묻는다(FR-008). 걸린 것이 없으면 기록 칸에 「걸린 것 없음」

## Phase 6: Polish & 완료 확인

- [X] T023 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 돌려 통과를 확인한다. 새 `src/app/battery-row.ts`가 헌법 검사의 경계(`src/ui/` import 금지 등)를 어기지 않는지 본다
- [X] T024 수정 후 코드로 T007·T020 흐름을 iOS 시뮬레이터에서 다시 돌려 오류 0건을 확인하고 기록 칸을 최종본으로 적는다. 「실제 iPhone 미확인」과 「iOS BGTask 시각 미확인」(FR-004)을 기록 칸 아래 한계에 적는다(SC-005)
- [ ] T025 (**이 세션에서 못 함 — 이 맥에 `adb`가 없다. 소유자 확인으로 남긴다**) 안드로이드 dev 실기기에서 설정 「배터리」 행 문구가 「배터리 사용 · 제한 없음으로 두면 제때 써요」 그대로이고 누르면 앱 설정이 열리는지 확인한다(SC-003, 원칙 V — 건너뛴 실기기 테스트는 통과가 아니다)
- [X] T026 AGENTS.md를 정리한다: 「iOS 시뮬레이터」 절·066 항목에 (1) 시뮬레이터 합성 클릭이 안 먹고 Maestro가 되며 `launchApp`이 앱을 종료한다는 것(`stopApp: false`), (2) `ios/`를 현재 `app.json`으로 다시 만들어야 한다는 것, (3) 배터리 행 iOS 문구를 한 줄씩 적는다. 뒤집힌 서술은 덧대지 않고 고친다
- [X] T027 `specs/068-ios-settings-reverify/quickstart.md` 끝에 훑기 결과·확인 환경·미확인 잔여를 정리한다

## Dependencies & Execution Order

- Phase 1 → Phase 2 → 스토리. **US2(T012~T019)는 시뮬레이터가 필요 없다** — Phase 1과 병행하거나 먼저 해도 된다.
- US1·US3의 훑기(T007~T009, T020~T021)는 Phase 1(T002~T004) 뒤. 수정(T010·T022)은 훑기 기록 뒤.
- T023~T027은 모든 스토리 뒤.

## Parallel Opportunities

- T005 ∥ T012 ∥ T013 (서로 다른 테스트 파일).
- US2(코드·테스트)와 Phase 1(빌드·내려받기 대기)은 동시에 진행할 수 있다.

## Implementation Strategy

- **MVP = US1**(훑기로 튕김 0건 확인 + 계약 테스트). 이미 고쳐진 결함을 잠그는 것이라 코드 변경은 T005 테스트뿐이다.
- 그다음 US2(작고 독립적인 코드 변경) → US3(개발자·진단 훑기). 각 스토리 끝에 시뮬레이터에서 실제 경로를 한 번 본다(원칙 V).


## Phase 7: Convergence

- [X] T028 iOS 시뮬레이터에서 개발자 「끄기」(`developer-off`)와 「온보딩부터 다시」(`developer-replay-onboarding`)를 눌러 오류 로그가 없고 동작이 안드로이드와 같은지 확인한다(끄기는 개발 환경에서 그 실행 동안만 꺼짐, 온보딩 다시는 모델 파일을 지우지 않는다). 결과를 `specs/068-ios-settings-reverify/quickstart.md` 기록 칸에 더하고 `.maestro/ios/developer-diagnostics-sweep.yml` 끝에 상태를 되돌리는 단계와 함께 반영한다 per FR-005 (partial)
- [X] T029 iOS 시뮬레이터에서 진단의 「지금 한 번 써 보기」(`diagnostics-try-once`)·「저장 점검」(`diagnostics-storage`)·「다시 읽기」(`diagnostics-probe-refresh`)·입력 프롬프트 프리셋 탭 둘을 눌러 Metro `ERROR`가 없는지 확인하고 `.maestro/ios/developer-diagnostics-sweep.yml`과 기록 칸에 반영한다 per FR-005 (partial)
- [X] T030 iOS 시뮬레이터에서 상태 흉내의 `sim-fail`·`sim-empty`·`sim-nophoto` 토글을 각각 켜고 끄며 홈 표시가 바뀌고 오류가 없는지 확인한다(끝에 모두 끈다) — 흐름 파일과 기록 칸에 반영한다 per FR-005 (partial)
- [X] T031 plan.md·research.md의 구조·결정에 구현에서 더해진 것을 반영한다: `src/app/platform.ts`(`appPlatform`), `.maestro/ios/_dismiss-open-prompt.yml`(개발 클라이언트 「열겠습니까?」 닫기), 진단 「기기」 줄의 `os: { platform, version }` 변경(`src/app/diagnostics-view.ts`·`App.tsx`) per plan: Source Code (unrequested)


## Phase 8: Convergence

- [X] T032 `specs/068-ios-settings-reverify/quickstart.md` 기록 칸의 「진단 › 지금 한 번 써 보기(`diagnostics-try-once`)」 줄을 실측대로 고친다: 누르면 설정·개발자·진단이 닫히고 홈에서 쓰기가 시작되지만 **끝에 「일기를 쓰지 못했어요.」 토스트로 실패**하고 `preferences/write-failures.json`에 `unwritten`이 쌓인다(2026-10-10 실측 3건: 첫 실행 자동 첫 일기·안티그랩 실행·직접 실행). 「정상」으로 읽히는 문구를 지우고 조치 칸에 로드맵 과제 이름을 적는다 per FR-005 · Constitution V (contradicts)
- [X] T033 `.maestro/ios/developer-diagnostics-sweep.yml`에 「온보딩부터 다시」(`developer-replay-onboarding`: 누른 뒤 로고 → 홈 복귀를 기다림)와 「지금 한 번 써 보기」(`diagnostics-try-once`: 누른 뒤 `stop-button`이 사라지길 기다림 — 실패 토스트가 정상 결과가 아님을 주석으로 적는다)를 넣고, 두 단계는 다른 단계의 상태를 바꾸므로 흐름 맨 끝에 둔다. 새 흐름을 시뮬레이터에서 끝까지 돌려 통과를 확인하고 Metro `ERROR`를 읽는다 per FR-005 (partial)
- [X] T034 `docs/roadmap/README.md`의 「iOS 시뮬레이터에서 「정상 동작 확인」(liveness)이 실패하는 원인 찾기」 과제를 갱신한다: 새 `ios/` 빌드에서 liveness는 통과했지만 **일기 생성이 3회 연속 `unwritten`으로 실패**(진단 「지금 한 번 써 보기」·자동 첫 일기)한다는 것을 배경에 적고 과제 제목을 일기 생성 실패까지 포함하게 바꾼다. `AGENTS.md`의 068 항목에도 「시뮬레이터에서 일기 생성은 실패한다(미해결)」를 한 줄 더한다 per FR-008a (missing)
