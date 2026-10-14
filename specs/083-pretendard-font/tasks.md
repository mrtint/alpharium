# Tasks: 두 플랫폼 모두 Pretendard로

**Input**: Design documents from `/specs/083-pretendard-font/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약 먼저·테스트 먼저(MUST). 각 이야기의 테스트 태스크는 구현 태스크보다 먼저이고, 쓴 뒤 **실패를 확인**한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일·앞 태스크에 기대지 않아 함께 할 수 있다
- **[Story]**: US1(같은 서체로 본다) · US2(서체 라이선스 화면) · US3(규칙이 조용히 무너지지 않는다)

---

## Phase 1: Setup (서체 파일과 출처)

- [X] T001 v1.3.9 릴리스 zip(`https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip`)을 받아 zip sha256이 `04be351a74d6bf7d60c480a3087e51d185485d35a52023142af1df19eb8c428a`인지 확인하고, `public/static/Pretendard-{Regular,Medium,SemiBold,Bold,ExtraBold}.otf`와 `LICENSE.txt`를 바이트 그대로 `assets/fonts/pretendard/`에 둔다(이름 바꾸지 않음). 다섯 파일 해시가 research R2와 같은지 확인한다
- [X] T002 `assets/fonts/pretendard/source.json`을 data-model §2 모양으로 쓴다 — `name`·`version` "1.3.9"·`release`·`archive{url,sha256}`·`license{name "SIL Open Font License 1.1", file "LICENSE.txt", archivePath "LICENSE.txt", sha256}`·`fonts[5]{file, weight(400·500·600·700·800 숫자), archivePath "public/static/…", sha256}`. `LICENSE.txt`의 sha256 `b04538c9abec39a3db75108cf0af0fd9c77032fe8aa2cf38345b4d250e98e38e`(research R2)
- [X] T003 `LICENSE.txt`에 `` ` ``·`${`가 없는지 확인한다(data-model §6 — 템플릿 리터럴로 옮길 수 있는가)

---

## Phase 2: Foundational (기존 계약 읽기 · 토큰)

- [X] T004 research R9의 다섯 테스트(`__tests__/theme-tokens.test.ts:96`, `__tests__/ui/developer-screen.test.tsx:131`, `__tests__/ui/settings-frame.test.tsx:109`, `__tests__/ui/diagnostics-screen.test.tsx:216`, `__tests__/ui/settings-battery-row.test.tsx:63`)와 `__tests__/ui/settings-screen.test.tsx`(「정보」 묶음 행·순서), `__tests__/i18n/ko-golden.test.ts`, `__tests__/i18n/boundaries.test.ts`, `__tests__/i18n/catalog-types.ts`를 읽고 이 기능과 부딪치는 단언 목록을 이 파일 끝 「메모」에 적는다
- [X] T005 `__tests__/theme-tokens.test.ts`의 「커스텀 `fontFamily` 없음」 단언(032 FR-019a)을 뒤집는다 — `FONT.family === "Pretendard"`, `FONT.weights`가 `["400","500","600","700","800"]`, `TEXT_FONT.fontFamily === FONT.family`, `tokens.ts`가 `react-native`를 import하지 않는다(tailwind가 require한다). 실패 확인
- [X] T006 `src/ui/theme/tokens.ts`에 `FONT`(이름·굵기 다섯)와 `TEXT_FONT`(`{ fontFamily: FONT.family }`)를 더하고, 머리 주석의 「서체는 시스템 기본이다(spec FR-019a)」와 `TYPE` 주석을 「083이 뒤집었다 — 두 플랫폼 모두 Pretendard, 서체는 여기 한 곳」으로 고친다. T005 통과

**Checkpoint**: 토큰이 섰다 — 이야기 셋을 시작할 수 있다.

---

## Phase 3: User Story 1 — 두 플랫폼에서 같은 글자로 본다 (P1) 🎯 MVP

**Goal**: 모든 화면 글자가 두 플랫폼에서 Pretendard 다섯 굵기로 그려진다.

**Independent Test**: 고치기 전과 같은 상태·같은 7화면을 두 플랫폼에서 찍어 나란히 보고 글자 폭을 잰다(quickstart §3·§4).

### Tests for User Story 1 ⚠️ (먼저 쓰고 실패 확인)

- [X] T007 [US1] `__tests__/config/font-rules.test.ts`를 만들고 F1(`fontFamily`는 `tokens.ts`에만, `Menlo`·`monospace` 0회)·F2(RN `Text`/`TextInput` import는 `src/ui/components/Text.tsx`·`src/ui/rnr/text.tsx`·`src/ui/components/NameField.tsx` 셋, 셋 모두 `TEXT_FONT`를 import하고 쓴다, `Animated.Text`·`createAnimatedComponent(Text` 0회)·F3(`fontWeight` 리터럴·`font-*` 클래스·이름 값 → 숫자 ⊆ `FONT.weights`, `tailwind.config.js` 포함)·F4(`app.json`의 `expo-font` 항목: android `fontFamily === FONT.family`·굵기 집합 = `FONT.weights`·ios 경로 집합 = android 경로 집합·파일 sha256 = `source.json`·`license.file` 해시)를 contracts/font-rules.md대로 쓴다. 주석은 먼저 걷는다. 실패 확인(F1·F2·F4가 실패해야 한다)
- [X] T008 [P] [US1] research R9의 고정폭 단언 넷을 이 기능의 결정으로 뒤집는다 — `__tests__/ui/developer-screen.test.tsx:131`·`__tests__/ui/settings-frame.test.tsx:109`·`__tests__/ui/diagnostics-screen.test.tsx:216`은 「값 글자에 `fontFamily`가 없고(공통 스타일이 덮는다) `fontVariant`에 `tabular-nums`」로, `__tests__/ui/settings-battery-row.test.tsx:63`은 「`SettingsScreen`이 `Platform`을 쓰지 않는다」로. 실패 확인

### Implementation for User Story 1

- [X] T009 [US1] `app.json` plugins에 `["expo-font", { android: { fonts: [{ fontFamily: "Pretendard", fontDefinitions: [5 × { path: "./assets/fonts/pretendard/<파일>", weight: <숫자> }] }] }, ios: { fonts: [5 경로] } }]`를 더한다 — `with-no-push-entitlement`이 맨 마지막인 것을 지킨다(066). F4 통과
- [X] T010 [P] [US1] `src/ui/components/Text.tsx`(`AppText`)의 스타일 배열 맨 앞에 `TEXT_FONT`를 둔다 — 주석으로 083을 남긴다
- [X] T011 [P] [US1] `src/ui/rnr/text.tsx`의 `Text`가 `style={[TEXT_FONT, props.style]}`로 공통 스타일을 쓴다(className은 그대로) — 복사본 「바꾼 것」 주석에 083을 더한다
- [X] T012 [P] [US1] `src/ui/components/NameField.tsx`의 `TextInput` 스타일 맨 앞에 `TEXT_FONT`
- [X] T013 [P] [US1] 고정폭 6곳에서 `fontFamily`·`Platform.select({ ios: "Menlo", default: "monospace" })`를 지우고 숫자 값에 `fontVariant: ["tabular-nums"]`(이미 있으면 둔다) — `src/ui/DiagnosticsParts.tsx`(MONO 상수와 두 자리), `src/ui/SettingsScreen.tsx`(`VALUE_MONO`·`HINT_MONO`), `src/ui/SettingsFrame.tsx`(제목 옆 글자), `src/ui/DiaryListScreen.tsx`(`DEV_BADGE_TEXT`). 쓰이지 않게 된 `Platform` import를 지운다. 주석의 「고정폭」 설명을 083 결정으로 고친다
- [X] T014 [US1] `npm run test:logic`·`npm run test:ui`로 T007·T008이 통과하고 다른 테스트가 깨지지 않았는지 본다(F5는 US2)
- [X] T015 [US1] `NETRC=<빈 디렉터리> npx expo prebuild --clean` 뒤 quickstart §2의 생성물(안드로이드 `res/font` 다섯 + `xml_pretendard.xml` + `MainApplication`의 `addCustomFont`, `res/font` 파일 해시 = `source.json`; iOS `UIAppFonts` 다섯)을 확인한다. 플러그인을 못 찾으면 research R3대로 `npx expo install expo-font`
- [X] T016 [US1] 안드로이드 실기기 재설치(quickstart §2a) — `assembleDebug`(arm64) → `files/` 백업·모델 크기 확인 → uninstall → install → 되돌림 → 권한 다시 부여 → 홈·모델 확인. 되돌림 확인 전에 백업을 지우지 않는다. 용량 증가(FR-022)는 새 APK 안의 서체 항목으로 잰다 — `unzip -lv android/app/build/outputs/apk/debug/app-debug.apk | grep res/font` 의 압축 전·후 크기 합(기기에 깔린 옛 APK는 다른 기계·ABI로 빌드돼 비교 대상이 아니다)
- [X] T017 [US1] iOS 시뮬레이터 빌드·설치(quickstart §2b)
- [X] T018 [US1] 「서체만」 벌: 두 기기에 같은 상태를 깔고(quickstart §3) 7화면을 찍어 `specs/083-pretendard-font/captures/after/font-only/{android,ios,side-by-side}/`에 두고, 끝나면 데이터를 되돌린다
- [X] T019 [US1] `specs/083-pretendard-font/captures/tools/measure.py`를 쓴다 — (a) 지정한 사각 영역의 글자 잉크 폭(단위 = px/3), (b) 기준 행 셋(큰 날짜 숫자·설정 「이름」 행 라벨·하단 바 「다시 쓰기」)의 글자 잉크와 행(바) 테두리 사이 위·아래 여백. 제품 밖 도구다(원칙 IV)
- [X] T020 [US1] 「여백 끔」 벌: `TEXT_FONT`에 `includeFontPadding: false`를 더해 Metro로 올리고(네이티브 재빌드 불필요) T018과 같은 상태·화면을 `captures/after/no-font-padding/`에 찍는다
- [X] T021 [US1] T019 도구로 두 벌의 기준 행 셋 여백을 iOS와 비교해 차이 절댓값 합이 작은 쪽을 고르고(research R6), `TEXT_FONT`를 그 쪽으로 두고, 치수표를 quickstart 「실측」에 적는다. 소유자 확정은 최종 보고에서 받는다(합본 경로 제시)
- [X] T022 [US1] 글자 폭 판정(SC-002): 같은 문자열 셋(설정 「장소 이름으로 보기」 행 라벨 · 설정 「쓰는 모듈」 값 「2.0GB」 · 쓴 날 홈 상태 줄 「오늘의 하루」 — 본문 첫 줄은 두 화면 폭(360dp·402pt)이 달라 줄이 다른 자리에서 갈려 같은 문자열이 아니어서 상태 줄로 바꿨다)의 잉크 폭(단위)을 고치기 전·후 두 플랫폼에서 재어 quickstart 「실측」에 적는다 — 두 플랫폼 차 ≤ 2%, 고치기 전과 다름
- [X] T023 [US1] 굵기 다섯(SC-003)과 깜빡임(SC-004): 400·500·600·700·800 자리를 확대 캡처로 보고, 콜드 스타트를 `adb shell screenrecord`·`xcrun simctl io booted recordVideo`로 찍어 로고→홈 프레임에서 시스템 서체가 없는지 본다. 결과를 「실측」에

**Checkpoint**: US1이 두 플랫폼에서 보인다.

---

## Phase 4: User Story 2 — 앱 안에서 서체 라이선스를 볼 수 있다 (P1)

**Goal**: 설정 「정보」 → 「서체 라이선스」 → 전문, 뒤로 가면 설정.

**Independent Test**: 설정에서 행을 눌러 전문을 끝까지 보고 뒤로 간다. 전문을 `LICENSE.txt`와 대조한다.

### Tests for User Story 2 ⚠️

- [X] T024 [US2] `__tests__/config/font-rules.test.ts`에 F5를 더한다 — `PRETENDARD_LICENSE_TEXT === readFileSync("assets/fonts/pretendard/LICENSE.txt","utf8")`, 첫 줄에 `Kil Hyung-jin`·`Reserved Font Name Pretendard`, 본문에 `SIL OPEN FONT LICENSE Version 1.1`. 실패 확인
- [X] T025 [P] [US2] `__tests__/ui/font-license.test.tsx`를 만들고 L1(「정보」 묶음 `settings-group-about` 안에 `settings-font-license` 행, 라벨 「서체 라이선스」, 순서 버전 → 서체 라이선스 → 개발자, 개발자 꺼져도 있음)·L2(`onOpenFontLicense` 한 번, 없으면 누를 수 없음)·L3(`FontLicenseScreen`이 intro·「Pretendard」·라이선스 이름·전문을 그리고 전문은 `font-license-text` 한 `Text`에 통째로)·L4(소스: `FontLicenseScreen.tsx`에 `ScrollView`·`FlatList`·`numberOfLines` 없음)·L5(소스: `App.tsx`의 `fontLicenseOpen` 겹·설정 겹 `active`에 `!fontLicenseOpen`·`goHome`과 알림 라우팅의 `setFontLicenseOpen(false)`·`backTestID="back-from-font-license"`·`SETTINGS_TEXT.backToSettings`)·L6(`ko.fontLicense`의 `row`·`title`·`intro`)를 contracts/font-license-screen.md대로 쓴다. 실패 확인
- [X] T026 [P] [US2] `__tests__/ui/settings-screen.test.tsx`의 「정보」 묶음 행 단언이 새 행을 모르면 그 단언에 「서체 라이선스」를 더한다(T004 메모 기준) — 바꿀 것 없음(메모)

### Implementation for User Story 2

- [X] T027 [P] [US2] `src/ui/pretendard-license.ts`를 만든다 — `PRETENDARD_LICENSE_NAME = "SIL Open Font License 1.1"`, `PRETENDARD_LICENSE_TEXT` = `LICENSE.txt` 전체(템플릿 리터럴, 끝 줄바꿈까지 바이트 동일). 파일 주석(라틴만 — 한글 없음)에 원본 경로·083·「손으로 고치지 않는다 — F5가 대조」. T024 통과
- [X] T028 [P] [US2] `src/i18n/catalogs/ko/font-license.ts`에 `fontLicense = { row: "서체 라이선스", title: "서체 라이선스", intro: "이 앱의 글자는 Pretendard 서체로 그려요. 아래는 그 서체를 쓰도록 허락하는 라이선스 전문이에요." }`(`as const` 없음, K1), `src/i18n/catalogs/ko/index.ts`에 등록, `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 새 문구 셋(중복 문자열은 하나)
- [X] T029 [US2] `src/ui/SettingsScreen.tsx` — props에 `onOpenFontLicense?: () => void`, 「정보」 묶음에서 「버전」 다음 `Row label={text().fontLicense.row}`(또는 `lazyText` 별칭) `testID="settings-font-license"` `trailing={<Chevron />}`, 콜백이 있을 때만 `onPress`
- [X] T030 [US2] `src/ui/FontLicenseScreen.tsx`를 만든다 — 루트 `View testID="font-license-screen"`, intro(`AppText`), 서체 이름 「Pretendard」(`FONT.family`, `bodyStrong`), 라이선스 이름(`caption`), 전문 `AppText testID="font-license-text"`(줄높이는 기존 본문 토큰). 스크롤·`numberOfLines` 없음(스크롤은 `SettingsFrame`). 한글 리터럴 없음
- [X] T031 [US2] `App.tsx` — `const [fontLicenseOpen, setFontLicenseOpen] = useState(false)`, 설정 겹 `active={!renaming && !fontLicenseOpen && route !== "developer"}`, `SettingsSection`에 `onOpenFontLicense={() => setFontLicenseOpen(true)}`(그리고 `SettingsSection`이 `SettingsScreen`에 넘김), 이름 바꾸기 겹 옆에 `<StackLayer onClose={closeFontLicense} open={fontLicenseOpen}><SettingsFrame backLabel={SETTINGS_TEXT.backToSettings} backTestID="back-from-font-license" onBack={closeFontLicense} title={…fontLicense.title}><FontLicenseScreen /></SettingsFrame></StackLayer>`, `goHome`·알림 라우팅에 `setFontLicenseOpen(false)`. T025 통과
- [X] T032 [US2] `.maestro/settings-developer-sweep.yml`에 「서체 라이선스」 열기 → `font-license-text` 보임 → `back-from-font-license` → 설정 보임 단계를 더하고, `docs/e2e/feature-flow-map.md`에 「설정 — 서체 라이선스」 행(층 1 흐름 `settings-developer-sweep`, 계약 `__tests__/ui/font-license.test.tsx`·`__tests__/config/font-rules.test.ts`, 사람이 봄: 글꼴 2.0배·전문 끝까지)과 인벤토리 설명을 더한다. `__tests__/e2e/flow-map.test.ts` 통과
- [X] T033 [US2] 두 플랫폼에서 라이선스 화면을 열어 끝까지 내리고 뒤로(안드로이드는 하드웨어 뒤로 가기도) — 캡처를 `captures/after/<고른 벌>/`에 `shot-08-font-license*`로 남긴다. 글꼴 2.0배(안드로이드 `settings put system font_scale 2.0`, iOS `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`)에서도 보고 원래대로 되돌린다

**Checkpoint**: US2가 두 플랫폼에서 보인다.

---

## Phase 5: User Story 3 — 서체 규칙이 조용히 무너지지 않는다 (P2)

**Goal**: F1~F5·L1~L6이 위반을 실제로 잡는다.

**Independent Test**: 각 규칙을 어긴 사본으로 테스트가 실패하는지 본다.

- [X] T034 [US3] 위반 주입 — F1(`src/ui/LogoScreen.tsx`에 `fontFamily: "Menlo"` 한 줄), F2(`src/ui/WelcomeScreen.tsx`에 `import { Text } from "react-native"`; `AppText`에서 `TEXT_FONT` 빼기), F3(`src/ui/LogoScreen.tsx`의 `"800"` → `"900"`), F4(`assets/fonts/pretendard/Pretendard-Bold.otf` 끝에 한 바이트 덧붙인 상태; `app.json`에서 굵기 500 항목 빼기), F5(`src/ui/pretendard-license.ts` 한 글자 바꾸기), L1(행 빼기)·L5(`active` 식에서 `!fontLicenseOpen` 빼기)를 하나씩 넣고 `npx jest __tests__/config/font-rules.test.ts __tests__/ui/font-license.test.tsx`가 실패하는지 본다. 매번 치환이 실제로 적용됐는지 먼저 확인하고(`git diff --stat`) 되돌린 뒤 `git status`가 깨끗한지 확인한다. 결과를 quickstart 「실측」에 표로

---

## Phase 6: Polish & Cross-Cutting

- [X] T035 흔들리는 자리를 두 플랫폼에서 본다 — 052 접힘 문턱(쓴 날 지면 내리기), 055 행 가운데(설정 행 `uiautomator`가 안 되므로 캡처 픽셀로), 056 시각·장소 대화상자 행간, 055 iOS 큰 제목 윗부분, 060 큰 숫자, 개발자·진단 화면, 글꼴 2.0배 홈·설정. 잘림·겹침이 있으면 그 자리만 고치고 기록한다. 글꼴 2.0배의 쓴 날 홈·안 쓴 날 홈·설정 위·라이선스 화면을 두 플랫폼에서 찍어 `specs/083-pretendard-font/captures/after/font-scale-2/{android,ios,side-by-side}/`에 남긴다(FR-019)
- [X] T036 (예외 — 앞단 표본 내려받기가 해시 불일치로 멈춰 `npm run test:layer1` 대신 같은 기준 상태에서 표본 없는 열하나를 `maestro test`로 돌려 11/11; `sample-days`는 못 돌림, quickstart 「실측」) 층 1 전체 — 안드로이드 기기의 `files/diary`·`files/preferences`·`files/vision-cache`를 백업하고 `npm run test:layer1`(표본 사진이 맥의 `.cache/`에 없으면 `npm run sample:fetch`로 받는다 — 목록 `scripts/e2e-sample/photos.json`은 070에서 소유자가 이미 승인했다. 기기에 심긴 `s30-` 표본 사진은 070 규칙대로 남겨 둔다 — 다음 층 1이 다시 쓴다), 실패 흐름은 화면에 맞게 고쳐 다시 돌리고, 끝나면 되돌린다. 결과를 「실측」에
- [X] T037 `npm test`·`npm run lint`(eslint·tsc·헌법 검사·prettier) 전부 통과
- [X] T038 [P] `AGENTS.md`에 「083 — 두 플랫폼 모두 Pretendard」 절과 「저장소의 현재 상태」 한 줄을 더한다(서체는 tokens 한 곳·config plugin·런타임 loadAsync 안 됨·안드로이드 재설치 절차·고른 여백·고정폭 없음·라이선스 화면·미확인). 「iOS 시뮬레이터」·release 절차에 서체 관련 함정이 있으면 덧붙인다
- [X] T039 [P] `specs/083-pretendard-font/quickstart.md` 「실측」을 채운다 — 그리고 최종 보고에서 소유자에게 나란히 놓은 합본 경로(`captures/after/<고른 벌>/side-by-side/`·`font-scale-2/`)를 제시해 SC-001(「같다」)과 FR-010(여백 확정) 판정을 받고, 받은 판정을 「실측」에 적는다. 남은 「실측」 항목은 — 날짜·기기·빌드, 글자 폭표, 여백표와 고른 쪽, 굵기·깜빡임, 용량 증가, 위반 주입 결과, 층 1, 미확인(iOS 실기기·release·Android 7.x·핫 리로드 등)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → (US1 · US2 · US3)
- US1: T007·T008(테스트) → T009~T013 → T014 → T015 → T016·T017 → T018 → T019 → T020 → T021 → T022·T023
- US2: T024·T025·T026(테스트) → T027·T028 → T029 → T030 → T031 → T032 → T033(기기 — US1의 T015~T017 뒤)
- US3: US1·US2의 테스트·구현 뒤(T034)
- Polish: US1·US2 뒤. T036은 T021(여백 결정) 뒤

### Parallel Opportunities

- T010·T011·T012·T013(서로 다른 파일)
- T008과 T007
- T025·T026, T027·T028
- T038·T039

## Implementation Strategy

1. Setup·Foundational → US1 테스트·구현 → prebuild·기기 → 「서체만」 캡처(MVP — 두 플랫폼이 같은 서체)
2. US2(라이선스) — 기기 빌드는 US1의 것을 쓴다(JS만 바뀐다 — Metro)
3. 여백 두 벌 결정(T020·T021) → US3 위반 주입 → Polish

## 메모

T004(2026-10-15) — 부딪치는 단언:

- `__tests__/theme-tokens.test.ts` 「★ 커스텀 폰트 이름을 참조하지 않는다 — 시스템 서체다 (FR-019a)」 — `Pretendard` 문자열까지 금지한다 → T005에서 뒤집는다.
- `__tests__/ui/developer-screen.test.tsx` DV9 「값 글자의 fontFamily 가 monospace 계열」, `__tests__/ui/settings-frame.test.tsx` 제목 옆 글자 `mono|Menlo`, `__tests__/ui/diagnostics-screen.test.tsx` 진단 값 `mono|Menlo` → T008. 값 글자는 `AppText`라 뒤집은 뒤에는 `fontFamily`가 `Pretendard`(공통 스타일)로 나온다 — 「없다」가 아니라 「`FONT.family`다」로 단언한다(더 강하다).
- `__tests__/ui/settings-battery-row.test.tsx` 「Platform 사용은 글꼴 선택(Menlo)뿐」 → T008.
- `__tests__/ui/settings-screen.test.tsx` DV1 「정보」 묶음 `getAllByText(/버전|개발자/)` — 새 행 「서체 라이선스」는 정규식에 걸리지 않아 그대로 통과한다. 묶음 순서 단언(`settings-group-*`)도 그대로. T026은 바꿀 것이 없다 — 순서는 L1이 따로 잠근다.
- `__tests__/i18n/ko-golden.test.ts` G1 — 카탈로그에 새 문구가 생기면 `ADDED_AFTER_GOLDEN`에 올려야 한다(T028).
- `__tests__/i18n/boundaries.test.ts` C4 — `FontLicenseScreen`·`SettingsScreen`이 모듈 최상단에서 `text()`를 부르면 실패한다(렌더 안에서 부른다).
- `__tests__/i18n/catalog-types.ts` — 영역을 더하면 `Catalog = typeof ko`로 자동으로 따라온다.
- (T037에서 찾음 — T004가 놓쳤다) `__tests__/ui/home-navigation.test.tsx` 「`AppFrame`의 `StackLayer`가 넷」과 `__tests__/ui/settings-stack.test.tsx` 「설정 겹 `active={!renaming && route !== "developer"}`」 — 겹을 하나 더했으므로 다섯·`!fontLicenseOpen`으로 고쳤다. T004는 고정폭·설정 행·카탈로그 쪽만 grep했고 `App.tsx` 겹 배선을 소스로 잠근 테스트를 찾지 않았다.

---

## Phase 7: Convergence

- [X] T040 (구현하지 않음 — 소유자 결정 2026-10-15: 「083 밖 별도 과제로」. 083은 표본 없는 층 1 열하나 11/11로 마무리하고 `sample-days` 미실행을 잔여로 남긴다. 어긋난 15장 목록은 quickstart 「실측」, 로드맵 새 과제로 올린다) 표본 사진 목록의 해시 어긋남(`commons-indoor-13.jpg` 등 — Wikimedia가 썸네일을 다시 만들었다)을 소유자 결정에 따라 처리하고 `npm run test:layer1`을 표본과 함께 돌려 `sample-days`까지 통과시킨다 per FR-021·SC-007 (partial)
- [X] T041 iOS 글꼴 2.0배 근사에서 안 쓴 날 홈을 찍어 `specs/083-pretendard-font/captures/after/font-scale-2/ios/shot-03-home-unwritten.png`로 남기고 합본을 다시 만든다 per FR-019·T035 (partial)

---

## Phase 8: Convergence

- [X] T042 iOS 글꼴 2.0배 캡처를 2.0에 가장 가까운 단계 `accessibility-large`(본문 33pt/17pt ≈ 1.94배)로 다시 찍는다 — 지금 캡처의 `accessibility-extra-large`는 약 2.35배라 FR-019·SC-008의 「2.0배」가 아니다. 겹침·넘침을 다시 판정하고 quickstart 「실측」을 고친다 per FR-019·SC-008 (partial)
