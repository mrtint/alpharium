---
description: "Task list for One UI 8.5+ 다크 모드 dimmed + 온보딩 photo-location 무반응 수정"
---

# Tasks: One UI 8.5+ 다크 모드 dimmed + 온보딩 photo-location 무반응 수정

**Input**: `specs/031-oneui85-fixes/` (plan.md, spec.md, research.md, data-model.md, contracts/dark-mode.md, contracts/onboarding-steps.md, quickstart.md)

**Branch**: `031-oneui85-darkmode-photolocation`

**Tests**: 이 저장소는 "계약을 먼저 정하고 테스트를 먼저 쓴다"(헌법 개발 방식). 계약 테스트는 소스를 `readFileSync`로 읽거나 순수 함수를 검증한다(007·021 관례). 테스트 태스크 포함.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 선행 의존 없음 → 병렬 가능
- **[Story]**: US1(다크 모드) / US2(photo-location 제거)
- 모든 태스크에 정확한 파일 경로

---

## Phase 1: Setup

**Purpose**: 새 의존성·plugin 뼈대. US1의 선행.

- [X] T001 `npx expo install expo-system-ui` 실행 — `package.json` `dependencies`에 `expo-system-ui` 추가(버전은 `expo install`이 SDK 57에 맞게 해석, `npm view` 금지). `npx expo install --check`로 검증. (contracts/dark-mode.md DM1g, research R1)
- [X] T002 [P] `plugins/with-force-light-theme.js` 생성 — `plugins/with-battery-exception.js`를 뼈대로. `@expo/config-plugins`의 `withAndroidStyles`를 쓰고, 순수 함수 `addForceLightItem(styles)`를 함께 `module.exports`로 내보낸다(기기·prebuild 없이 jest 검증용). 함수는 `AppTheme` `<style>`에 `<item name="android:forceDarkAllowed">false</item>`를 더하되, 이미 있으면 중복 추가하지 않고, `AppTheme` 외 다른 `<style>`은 건드리지 않는다. 상단 주석에 "왜 `android/`를 직접 안 고치는가"(with-battery-exception와 동일 근거) + "왜 `expo-system-ui`만으로 부족한가"(One UI 8.5 force-dark, research R1) 기록. (contracts/dark-mode.md DM1a~d)
- [X] T003 `app.json`의 `plugins` 배열에 `"./plugins/with-force-light-theme"` 추가(`"./plugins/with-battery-exception"` 다음 줄). `userInterfaceStyle: "light"`는 **그대로 둔다**(이미 존재, 회귀 방지). (contracts/dark-mode.md DM1e·DM1f)

---

## Phase 2: Foundational

**Purpose**: 두 스토리가 공유하는 것 — 없음. 두 버그는 독립적이라 Foundational 단계가 비어 있다. US1(설정/빌드)과 US2(소스/상수)는 파일이 겹치지 않아 병렬 가능.

*(이 기능에는 Foundational 태스크가 없다 — US1·US2가 서로 독립.)*

---

## Phase 3: User Story 1 - 밤에 앱을 열어도 화면이 정상으로 보인다 (Priority: P1) 🎯

**Goal**: 시스템 다크 모드와 무관하게 앱이 항상 라이트로 그려진다.

**Independent Test**: One UI 8.5 기기에서 `adb shell "cmd uimode night yes"` 후 앱 6개 화면군을 열어 배경이 밝고 글자 대비가 충분한지 확인. 어제 22시대 스크린샷과 대조.

### 계약 테스트 (먼저)

- [X] T004 [P] [US1] `__tests__/plugins/force-light-theme.test.ts` 작성 — `plugins/with-battery-exception` 테스트 패턴. DM1a~d: `addForceLightItem` export 존재 / `AppTheme`에 `forceDarkAllowed=false` item 추가 / 중복 미추가 / 다른 `<style>` 무변경. 최소 styles 객체 fixture로 순수 함수 검증. (contracts/dark-mode.md)
- [X] T005 [P] [US1] `__tests__/plugins/force-light-theme.test.ts`에 소스 검사 추가(같은 파일 또는 `__tests__/config/`) — DM1e: `app.json` `plugins`에 `./plugins/with-force-light-theme` 존재 / DM1f: `app.json` `userInterfaceStyle === "light"` / DM1g: `package.json` `dependencies`에 `expo-system-ui` 존재. `readFileSync`로 `app.json`·`package.json` 읽어 검사. (T004와 같은 파일이면 순차, 별 파일이면 [P])
- [X] T006 [P] [US1] `__tests__/ui/dark-mode-no-scheme.test.ts` 작성 — DM2: `src/ui/**/*.tsx`를 `readFileSync`로 훑어 `useColorScheme`·`Appearance.` 참조가 **없음**을 단언(이 스펙은 "라이트 고정"이지 "다크 대응"이 아님, 11번 범위 보호). 위반 주입: 아무 `.tsx`에 `import { useColorScheme } from "react-native"` 넣으면 FAIL.

### 구현

- [X] T007 [US1] `npx expo prebuild --platform android --clean` 실행 → `cp ~/.alpharium-signing/alpharium.jks android/app/` (★ prebuild가 키를 지움, AGENTS.md) → `android/app/src/main/res/values/styles.xml`에 `AppTheme`의 `android:forceDarkAllowed` = `false` item이 생성됐는지, `expo-system-ui`가 `userInterfaceStyle` 관련 네이티브 설정을 넣었는지 눈으로 확인. (prebuild 산출물이므로 커밋 대상 아님 — `android/`는 gitignore)
  - **완료 확인(2026-09-03)**: `styles.xml`에 `AppTheme`·`Theme.App.SplashScreen` 둘 다 `<item name="android:forceDarkAllowed">false</item>` 생성됨(★ `MainActivity` 매니페스트 theme가 `Theme.App.SplashScreen`이라 SplashScreen에도 필요 — 실기기 T021 1차에서 `AppTheme`만으로는 배경이 `rgb(48,48,48)`로 반전되는 것 관측, plugin에 SplashScreen 분기 추가). `strings.xml`에 `expo_system_ui_user_interface_style` = `light`.

**Checkpoint**: 기기 없는 테스트(`npm test`) + lint 통과. 실기기 검증은 Phase 5.

---

## Phase 4: User Story 2 - 온보딩이 "사진 위치" 단계에서 막히지 않는다 (Priority: P1) 🎯

**Goal**: `photo-location` 단계·항목을 온보딩·설정 양쪽에서 제거. 사진 허용 후 온보딩이 곧바로 "위치" 단계로 진행.

**Independent Test**: 앱을 완전히 새로 설치하고 온보딩 진행 → 사진 "모두 허용" → 다음 화면이 "위치"(`onboarding-step-location`)인지, `onboarding-step-photo-location`이 없는지 확인. 4단계 통과.

### 계약 테스트 (먼저)

- [X] T008 [P] [US2] `__tests__/onboarding/requirements.test.ts` 갱신 — **파일 전체를 읽고** `photo-location`·숫자 5를 하드코딩한 케이스를 전부 고친다. 구체적으로: line ~25 `"order가 [1,2,3,4,5]와 정확히 일치"` → `[1,2,3,4]`, 제목도 갱신 / line ~36 `"PermissionKey 유니온에 정확히 5개 멤버"` → 4개, 배열에서 `"photo-location"` 제거, 제목 `"4개"`로 / line ~48 `"고정 순서가 사진 → 사진 좌표 → 알림 → 배터리 예외다"` → 제목·배열에서 "사진 좌표"/`"photo-location"` 제거, 순서 `["photos","location","notifications","battery-exception"]` / line ~91 `"battery-exception·notifications·photos·photo-location은 android를 포함한다"` → 제목·루프 배열에서 `photo-location` 제거 / line ~100 `readonly` 소스 regex 유지 / **신규 R2-f**: 소스에 `"photo-location"` 문자열이 `PermissionKey` union·`PERMISSION_REQUIREMENTS` 정의 안에 없음(`readFileSync`). (contracts/onboarding-steps.md OB1)
- [X] T009 [P] [US2] `__tests__/onboarding/decision.test.ts` 갱신 — `photo-location`을 `states`/`skippedThisSession`에 쓰던 케이스(line ~175·179·186·199·215)를 `location`/`notifications`로 대체. **신규 케이스**: `planOnboardingSteps({requirements: PERMISSION_REQUIREMENTS, states: {photos:"granted"}, batteryNoticeShown:false, skippedThisSession:[]})` → 반환 steps에 `photo-location` key 없음, `nextStep(steps)?.requirement.key === "location"`(무한 루프 부재, SC-002). (contracts/onboarding-steps.md OB2)
- [X] T010 [P] [US2] `__tests__/ui/onboarding-screen.test.tsx` 갱신 — `photoLocation` prop / mock override(line ~26·42·62·208·257) 제거. **line 138** (`describe("S1")` → `it("[허용]을 누르면 ... 다음 단계로 넘어간다")`)와 **line 150** (`describe("S1.3")` → `it("건너뛰면 ... 다음 단계로")`)의 `onboarding-step-photo-location` 단언을 `onboarding-step-location`으로 바꾼다 — 이 두 케이스는 "photos 다음 단계"라는 사실을 검증에 쓰고 있고, 제거 후 다음 단계가 `location`이다. "허용→진행"·"건너뛰기→진행" 검증 의도는 그대로. **신규**: 같은 파일에 `queryByTestId("onboarding-step-photo-location")`이 null인 케이스 하나 추가(사진 허용 후). (contracts/onboarding-steps.md OB3)
- [X] T011 [P] [US2] `__tests__/ui/denied-guidance.test.tsx` 갱신 — `photo-location`의 `ifDenied` 단언(line ~54) 제거. `photos`·`location` 거부 안내는 유지 확인. (contracts/onboarding-steps.md OB5)
- [X] T012 [P] [US2] `__tests__/ui/permissions-section.test.tsx` 확인·갱신 — 설정 "권한" 섹션 렌더 시 `permission-row-photo-location` testID가 `queryByTestId`로 null(SC-005). `photoLocation` mock(있으면) 정리. (contracts/onboarding-steps.md OB4)
- [X] T013 [P] [US2] `__tests__/config/app-json.test.ts`(신규 또는 기존 위치) — OB6: `app.json` `android.permissions`에 `"android.permission.ACCESS_MEDIA_LOCATION"` 존재 / `expo-media-library` plugin 설정에 `isAccessMediaLocationEnabled: true` 존재(FR-011 회귀 방지, 단계는 빼도 권한 선언은 유지).

### 구현

- [X] T014 [US2] `src/onboarding/requirements.ts` — `PermissionKey` 타입에서 `"photo-location"` 제거(4갈래). `PERMISSION_REQUIREMENTS`에서 `photo-location` 항목(line ~66-73) 통째 제거. `location`·`notifications`·`battery-exception`의 `order`를 2·3·4로 재배치. 상단 주석의 `PermissionKey` 설명에서 `photo-location` 줄 제거하고 "`ACCESS_MEDIA_LOCATION`은 `getLocation()` 호출 시 사진 권한에 종속해 시스템이 처리하므로 온보딩에서 별도로 묻지 않는다(021 FR-013a, `collect.ts`)"를 명시. (data-model.md, contracts/onboarding-steps.md OB1)
- [X] T015 [US2] `src/ui/OnboardingScreen.tsx` — (a) `OnboardingPorts.photo` 타입에서 `locationPermission`·`requestLocationPermission` 제거(온보딩·설정 어디도 안 씀 확인됨; `PermissionPanel`은 `signals/port.ts`의 `PhotoPort`를 직접 쓰므로 무관). (b) `readStates()`의 `Promise.all`에서 `ports.photo.locationPermission()` 줄과 `"photo-location": photoLocation` 키 제거(line ~75·81). (c) `allow()` switch에서 `case "photo-location":` 삭제(line ~172-174). `tsc` exhaustiveness가 나머지를 강제. (contracts/onboarding-steps.md OB3)
- [X] T016 [US2] `src/ui/PermissionsSection.tsx` — `readStates()`의 `Promise.all`에서 `ports.photo.locationPermission()` 줄과 `"photo-location": photoLocation` 키 제거(line ~42·44·50). `requestFor()` switch에서 `case "photo-location":` 삭제(line ~107-109). `describe()`·렌더는 `requirements` 순회라 자동 반영. (contracts/onboarding-steps.md OB4)
- [X] T017 [US2] `App.tsx` — `deniedNotices` 계산(line ~326-343)에서 **`photoLoc` 조회 전체와 `req("photo-location")` 블록을 제거**한다. 실측 확인(2026-09-03): 현재 코드는 `photoLoc = locationPermission()`을 읽고 `req("photo-location")?.ifDenied`만 push하며, `location`(FINE_LOCATION) 거부 안내는 **어디에도 push하지 않는다**(`locReq` 변수는 `photo-location` 안내의 게이트로만 쓰임). 따라서: `Promise.all`에서 `onboardingPorts.photo.locationPermission()` 줄 삭제 → `photo`(photoPermission 결과)만 남김 → `if (isDenied(photo)) notices.push(req("photos")?.ifDenied ?? "")`만 유지 → `locReq`·`photoLoc` 관련 3줄(line ~338-340) 삭제. **`location` 거부 안내를 새로 추가하지 않는다** — 이 스펙 범위 밖(현재도 없음, 필요하면 별도 항목). `onboardingPorts.photo`가 이제 `locationPermission`을 노출 안 하므로 `tsc`가 남은 호출을 잡는다. (contracts/onboarding-steps.md OB5)
- [X] T018 [US2] `src/onboarding/decision.ts` — **변경 없음 확인**. `statusOf`·`planOnboardingSteps`·`nextStep` 무변경. `PermissionKey` 축소가 `decision.ts`의 타입 참조를 깨지 않는지 `tsc`로만 확인(이 태스크는 "안 고침"을 검증하는 자리). (contracts/onboarding-steps.md OB2)
- [X] T019 [P] [US2] `src/signals/expo-port.ts` — `PhotoPort.locationPermission()`·`requestLocationPermission()`은 **남긴다**(`PermissionPanel` 진단 화면이 `signals/port.ts`의 `PhotoPort`로 직접 씀). `expo-port.ts:95-97` 주석에 "온보딩에서는 이 권한을 단계로 묻지 않는다(031) — `collect.ts`가 실제 좌표 읽기로 처리" 한 줄 추가. `collect.ts`가 `locationPermission`을 안 부르는 것 확인(OB7). 함수 시그니처·본문 무변경. (contracts/onboarding-steps.md OB7)
- [X] T020 [US2] `.maestro/unified-permission-onboarding.yml` 갱신 — `photo-location` 단계를 밟던 스텝 제거. `id: "onboarding-step-.*"` skip-all 루프는 유지(021). 사진 "허용"/"제한된 액세스 허용" 후 **다음이 `onboarding-step-location`**인지 assert 추가. 진행률 "N / 4" 반영. `FLOWS`에 이미 등록됨 — 재등록 불필요. (contracts/onboarding-steps.md OB8)

**Checkpoint**: `npm test`(logic+ui) + `npm run lint`(eslint·**tsc**·check:constitution 위반 0·prettier) 통과. `tsc`가 `PermissionKey` 축소를 두 화면 switch에서 강제하는지 확인.

---

## Phase 5: 실기기 검증 & 마무리 (Cross-cutting)

**Purpose**: 헌법 원칙 V — "건너뛴 실기기 테스트는 통과가 아니다". quickstart.md의 시나리오 수행.

- [ ] T021 [US1] **① debug 실기기 (SM-S928N, One UI 8.5)** — dev 빌드 설치 → `adb shell "cmd uimode night yes"` → 앱 재실행 → 6개 화면군(온보딩·목록·상세·설정·생성중·개발자) 스크린샷, 전부 밝은 배경 + 대비 충분 확인. 어제 `Screenshot_20260902_220340_alpharium.jpg`·`_222822_alpharium.jpg`와 대조. **끝나면 `adb shell "cmd uimode night auto"` 복원**. (quickstart ①, SC-001)
- [ ] T022 [US2] **② debug 실기기 (SM-S928N, 완전 새 설치)** — `adb uninstall` → `adb install`(또는 `expo run:android`) → 온보딩 진행: 사진 "모두 허용" → `uiautomator dump`로 **다음이 `onboarding-step-location`** 확인, `onboarding-step-photo-location` 부재 → 위치·알림·배터리 예외 통과(4단계) → 에셋 다운로드 단계 도달. 설정 탭 "권한" 섹션 행 4개, `permission-row-photo-location` 부재. (quickstart ②, SC-002·003·005)
- [ ] T023 [US2] **② 신호 수집 회귀 (SM-S928N)** — 사진 좌표 있는 하루(seed 또는 실촬) 생성 → 위치 권한 허용 시 지명, `adb pm revoke ... ACCESS_FINE_LOCATION` 후 지명 없음. 수정 전과 동일 확인. (quickstart, SC-006, OB7)
- [ ] T024 [P] **Maestro 회귀 (SM-S928N 또는 S901N)** — `node scripts/run-device-tests.mjs`로 `unified-permission-onboarding.yml`(갱신본, 4단계) + 온보딩 거치는 회귀 흐름(`scheduled-diary-notification.yml`, `diary-photo-gallery.yml` 등) PASS. (quickstart Maestro)
- [ ] T025 [US1] **① release 재확인 (SM-S928N)** — `npx expo prebuild --platform android --clean` → `cp ~/.alpharium-signing/alpharium.jks android/app/` → `cd android && NODE_ENV=production ./gradlew assembleRelease` → `apksigner verify --print-certs`(CN=alpharium) → S928N 새 설치 → `cmd uimode night yes` → 온보딩·목록·상세 3화면 밝은 배경 확인(`expo-system-ui`가 minify 생존). `auto` 복원. (quickstart ① release, research R3)
- [ ] T026 [P] **S22 회귀 (SM-S901N, One UI 8 이하)** — 라이트 모드 평시 6개 화면군이 수정 전과 동일(SC-004). 새 설치 온보딩 4단계 흐름 정상, 갇힘 없음. (quickstart S22)
- [ ] T027 로드맵 20번 항목에 "✅ 031에서 수정 (2026-09-03)" 결과 문단 추가 — 무엇을 어떻게 고쳤는지(expo-system-ui + forceDarkAllowed plugin / photo-location 단계·항목 제거), 실기기 관측값(6화면 밝은 배경, 온보딩 4단계, release 재확인 결과), 미확인 잔여. `docs/roadmap/README.md`.
- [ ] T028 `specs/031-oneui85-fixes/quickstart.md` "완료 기준" 체크박스에 실측 결과 채우기.

---

## Dependencies & Execution Order

- **Phase 1 (T001-T003)**: US1의 선행. T001 → T003(app.json에 plugin 추가하려면 plugin 파일이 있어야 하므로 T002 → T003), T001·T002 병렬 가능.
- **Phase 3 (US1)**: T004-T006 [P] 계약 테스트 먼저 → T007 prebuild 확인. Phase 1 완료 후 시작.
- **Phase 4 (US2)**: T008-T013 [P] 계약 테스트 먼저 → T014(상수) → T015·T016·T017(화면·App, T014의 타입 축소에 의존) → T018(decision.ts 무변경 확인) → T019 [P] → T020 Maestro. **Phase 1과 무관 — US1과 병렬 가능**.
- **Phase 5**: US1·US2 구현 + 기기 없는 테스트 통과 후. T021·T022·T023 순차(같은 기기), T024·T026 [P], T025(release)는 T021·T022 통과 후, T027·T028 마지막.

## Parallel Opportunities

- **US1 ∥ US2**: 파일이 안 겹친다(US1 = `app.json`·`package.json`·`plugins/`·`__tests__/plugins,config,ui/dark-mode`; US2 = `src/onboarding/`·`src/ui/Onboarding*,Permissions*`·`App.tsx`·`__tests__/onboarding,ui/`). 두 스토리를 동시에 진행 가능.
- **계약 테스트**: T004·T005·T006(US1) / T008·T009·T010·T011·T012·T013(US2) 전부 [P].
- **구현 내부**: T015·T016은 다른 파일이지만 T017(App.tsx)이 둘의 타입 변화에 의존하므로 T015·T016 → T017.

## MVP

**US2(photo-location 제거)가 최소 MVP** — 새 설치 사용자가 온보딩에서 갇히는 것을 푸는 것이 가장 급하다. US1(다크 모드)은 그다음 P1이지만 `expo-system-ui` 설치·release 재확인이 붙어 사이클이 길다. 둘 다 P1이므로 한 브랜치에서 함께 머지하되, 급하면 US2만 먼저 뽑아낼 수 있다.

---

## Phase 6: Convergence

**작성일**: 2026-09-03 (`/speckit-converge`)

**전제**: T001~T020 + SplashScreen 수정(커밋 `03bb3e1`)까지 기기 없는 구현은 전부 완료·초록불(2168개 통과, lint·헌법 검사·prettier 클린). `styles.xml`에 `AppTheme`·`Theme.App.SplashScreen` 둘 다 `forceDarkAllowed=false` 생성 확인, `strings.xml`에 `expo_system_ui_user_interface_style=light` 확인. `decision.ts` 무변경 확인. `collect.ts`가 `locationPermission` 미호출 확인. `src/ui/`에 `useColorScheme`·`Appearance.` 참조 0건 확인.

**남은 것은 전부 실기기 확인 공백이다 — 코드 공백이 아니다.** T021 1차 시도(SplashScreen 수정 전 APK)에서 S24U 배경이 `rgb(48,48,48)`로 반전되는 것을 관측 → plugin에 SplashScreen 분기 추가 → 재빌드까지 마쳤으나, 재빌드 도중 S24U(SM-S928N)가 연결이 끊겨 재빌드 APK를 설치·검증하지 못했다. 기존 T021~T028이 이 작업을 이미 담고 있으므로, 이 단계는 그 상태를 명시하고 SplashScreen 수정분에 대한 재검증을 못 박는다.

- [ ] T029 [US1] SM-S928N(One UI 8.5) 재연결 후 **재빌드된 debug APK**(`android/app/build/outputs/apk/debug/app-debug.apk`, SplashScreen `forceDarkAllowed=false` 포함, 2026-09-03 재빌드)를 `adb install -r`로 설치하고 T021을 수행한다 — `cmd uimode night yes` → 6개 화면군 전부 밝은 배경 + 대비 확인, 특히 **배경이 `rgb(48,48,48)`이 아님**을 픽셀로 확인(1차 시도의 실패 지점), 2026-09-02 22:03·22:28 스크린샷과 대조, 끝나면 `cmd uimode night auto` 복원. per FR-001·SC-001, tasks T021 (partial — 기기 미확인)
- [ ] T030 [US2] SM-S928N에서 T022를 수행한다 — 완전 새 설치 온보딩에서 사진 "모두 허용" 후 **다음 단계가 `onboarding-step-location`**(`onboarding-step-photo-location` 부재), 4단계 통과 후 에셋 다운로드 도달, 설정 "권한" 섹션 행 4개(`permission-row-photo-location` 부재). per FR-006·007·009·SC-002·003·005, tasks T022 (partial — 기기 미확인)
- [ ] T031 [US2] SM-S928N에서 T023을 수행한다 — 사진 좌표 있는 하루 생성 → 위치 권한 허용 시 지명, `adb pm revoke ... ACCESS_FINE_LOCATION` 후 지명 없음, 031 수정 전과 동일. per FR-010·SC-006·OB7, tasks T023 (missing — 기기 미확인)
- [ ] T032 연결된 기기에서 `node scripts/run-device-tests.mjs`로 T024를 수행한다 — `unified-permission-onboarding.yml`(4단계 갱신본) + 온보딩 거치는 회귀 흐름(`scheduled-diary-notification.yml`·`diary-photo-gallery.yml` 등) PASS. per FR-012·quickstart Maestro, tasks T024 (missing — 기기 미확인)
- [ ] T033 [US1] SM-S928N에서 T025(release 재확인)를 수행한다 — `npx expo prebuild --platform android --clean` → 키 복사 → `NODE_ENV=production ./gradlew assembleRelease` → `apksigner verify --print-certs`(CN=alpharium) → 새 설치 → `cmd uimode night yes` → 온보딩·목록·상세 3화면 밝은 배경(`expo-system-ui`가 minify 생존) → `auto` 복원. per FR-001·spec Assumptions(release 재확인)·research R3, tasks T025 (missing — 기기 미확인)
- [ ] T034 [P] SM-S901N(One UI 8 이하) 연결 시 T026(S22 회귀)을 수행한다 — 라이트 모드 6개 화면군이 031 전과 동일, 새 설치 온보딩 4단계 흐름 정상. per FR-013·SC-004, tasks T026 (missing — 기기 미연결)
- [ ] T035 [US2] `.maestro/unified-permission-onboarding.yml`에 **사진 단계를 통과한 직후 `onboarding-step-location`이 보인다**는 긍정 assert를 추가하거나(현재는 `assertNotVisible: onboarding-step-photo-location`만 있음), 첫 단계가 기기 권한 상태에 따라 달라진다는 이유로 생략을 흐름 주석에 명시한다. per tasks T020(부분 미충족), (partial)
- [ ] T036 T029~T034의 실기기 관측이 끝나면 `docs/roadmap/README.md`의 로드맵 20번에 "✅ 031에서 수정 (2026-09-03)" 결과 문단(무엇을 어떻게 고쳤는지 + 6화면 밝은 배경·온보딩 4단계·release 재확인 관측값 + 미확인 잔여)을 추가하고(T027), `specs/031-oneui85-fixes/quickstart.md` "완료 기준" 체크박스를 실측으로 채운다(T028). per tasks T027·T028 (partial — 실측 대기)
