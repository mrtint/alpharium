# Tasks: 일기 쓰기 흐름 단순화 + 최초 실행 필수 에셋 다운로드

**Input**: `specs/029-writing-flow-simplification/` — plan.md, spec.md, research.md,
data-model.md, contracts/ (resolve-generation·onboarding-assets·home-screen·
settings-sections), quickstart.md

**Tests**: 포함한다 — 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저
쓴다(MUST)"를 요구하고, 007~028 스펙 전체가 계약 테스트를 소스 선언 직접 읽기로
검증해 왔다.

**Organization**: User Story별 phase. US1·US2·US3은 P1(MVP), US4·US5는 P2.

**⚠️ App.tsx 순차 규칙** (analyze I1): `App.tsx`를 건드리는 태스크는 T026·T027·T028
(US1) → T036·T037·T038 (US2) → T040·T041 (US3) → T045·T046 (US5) → T056·T057·T058
(US4) 순서로만 진행한다. 이들은 **[P]가 아니다** — phase가 다르지만 같은 파일이라
앞 phase의 App.tsx 변경 위에 rebase해야 한다. 각 태스크 설명의 `⚠ App.tsx` 표식이
이를 상기시킨다.

## Path Conventions

모바일 앱 (단일 Expo 프로젝트). 소스는 `src/`, 계약 테스트는 `__tests__/`, 화면
테스트는 `.tsx` 파일로 `__tests__/ui/`. `App.tsx`는 저장소 루트.

---

## Phase 1: Setup (헌법 개정 — 코드보다 먼저)

**Purpose**: FR-032·033, SC-007. Governance("원칙을 어기려면 헌법을 먼저 고친다")에
따라 어떤 코드보다도 먼저 한다. 이 phase가 **별도 커밋**이다.

- [x] T001 `git branch --show-current`로 `029-writing-flow-simplification` 확인
      (스펙킷 `BRANCH:` 필드는 디렉터리 이름이지 체크아웃 브랜치가 아님 — AGENTS.md
      경고). main이면 중단.
- [x] T002 `.specify/memory/constitution.md` 개정 — 「로스터」 절의 "사용자가 고른
      캐릭터의 모델만 내려받는 구조여야 한다(MUST)"를 research.md §8의 개정 문구
      (MUST NOT + MAY + MUST, "다섯 개 다 받기" 금지 유지)로 교체.
- [x] T003 `.specify/memory/constitution.md` 상단 Amendment 블록에 1.3.0 항목 추가
      (무엇이·왜 바뀌었는지, MINOR 근거 — 1.1.0의 "MUST/MUST NOT 조항이 늘면
      MINOR" 선례 인용).
- [x] T004 `.specify/memory/constitution.md` 하단 `**Version**: 1.2.0 | ... |
      **Last Amended**: 2026-08-23` → `1.3.0 | ... | 2026-09-02`.
- [x] T005 `npm run lint`이 헌법 파일 형식(있다면)에 걸리지 않는지 확인. 헌법
      개정만 담아 한국어 커밋 메시지로 커밋 ("헌법 v1.3.0 — 로스터 조항: 최초
      실행 기본 캐릭터 1개 자동 내려받기 허용").

**Checkpoint**: 헌법이 v1.3.0. 이후 코드 변경이 로스터 조항과 부딪히지 않는다.

---

## Phase 2: Foundational (모든 User Story의 선행조건)

**Purpose**: 자동 판정 순수 함수와 스토어 확장 — US2·US3·US4가 전부 이것에 의존.
설계 계약(`contracts/`)을 코드로 옮기는 자리.

**⚠️ CRITICAL**: 이 phase 완료 전에는 어떤 User Story도 시작할 수 없다.

### 스토어 계약 (data-model §1, contracts/settings-sections.md S2·S3)

- [x] T006 [P] `__tests__/app/vision-setting-store.test.ts` 작성/확장 (ST1) —
      `{auto:true}`→"auto", `{vision:"quick"}`→"quick", 파일 없음→"auto",
      깨짐→"auto". 반환 타입 `"auto" | VisionSetting`.
- [x] T007 [P] `__tests__/app/geocoding-setting-store.test.ts` 작성/확장 (ST2) —
      `{mode:"on"}`→"on", 구형 `{enabled:true}`→"on", 구형 `{enabled:false}`→"off",
      파일 없음→"auto".
- [x] T008 `src/app/vision-setting-store.ts` 수정 — `loadVisionSetting`이
      `{auto:true}`를 `"auto"` 센티넬로 인식, `saveVisionSetting`이 `"auto"`를
      `{auto:true}`로 직렬화. `VisionSetting` 타입 자체(`src/diary/types.ts`
      `VISION_SETTINGS`)는 **불변** — "auto" 추가 금지 (S5·ST6).
- [x] T009 `src/app/geocoding-setting-store.ts` 수정 — 3-상태(`"auto"|"on"|"off"`)
      로 확장. `{mode}` 직렬화, 구형 `{enabled}` 마이그레이션 읽기, 파일 없음→
      "auto". `loadGeocodingSetting` 반환 타입 변경 (호출자 App.tsx는 Phase 3에서
      맞춤).
- [x] T010 [P] `__tests__/app/*setting-store*` 위반 주입 — `src/diary/types.ts`에
      "auto"를 `VISION_SETTINGS`에 넣어 보고 ST6가 잡는지 확인 (되돌림).

### 자동 판정 순수 함수 (contracts/resolve-generation.md)

- [x] T011 [P] `__tests__/app/resolve-generation.test.ts` 작성 — 계약 표 C1~C15
      전부 + R7 소스 불변식(`new Date(` 없음, `../signals/`·`../models/`·
      `../diary/prompt` import 없음). `readFileSync`로 소스 직접 읽기.
- [x] T012 `src/app/resolve-generation.ts` 작성 — `resolveGenerationParams(input):
      ResolveOutcome`. 규칙 R1~R6 (contracts/resolve-generation.md). `Character`·
      `VisionSetting`은 `../diary/types`, `resolveSelection`은 `./selection`,
      `DayDate`는 `../config/day-boundary`에서만 import. `new Date()` 안 부름.
- [x] T013 `__tests__/app/resolve-generation.test.ts` 위반 주입 — (a)
      `photoSignalPresent` 대신 `photoCount >= 2` 임계값 도입 → 계약 테스트가 잡음
      확인, (b) `new Date()` 추가 → R7 잡음, (c) `import { assetFor } from
      "../models/roster"` 추가 → R7 잡음. 셋 다 되돌림.
- [x] T013a [US3] `__tests__/app/resolve-generation.test.ts` — movedFrom 케이스
      추가 (analyze U1): C4(narrative 미준비 → quiet로 옮김)에서 `movedFrom ===
      "narrative"` **및** `character === "quiet"` 확인. 배선(T028)이 기록하는
      값이 `character`(옮겨진 쪽)임을 T042 통합 테스트가 잇는다.

### 온보딩 완료 게이트 순수 판정 (contracts/onboarding-assets.md C)

- [x] T014 [P] `__tests__/onboarding/decision.test.ts` 확장 — `shouldShowOnboarding
      (flag, essentialAssetsReady)` 2-인자 시그니처. 표 D1~D4. 기존 1-인자
      테스트 갱신.
- [x] T015 `src/onboarding/decision.ts` 수정 — `shouldShowOnboarding`에
      `essentialAssetsReady: boolean` 인자 추가. DR1~DR3. 호출자(App.tsx)는
      Phase 6에서 맞춤.

**Checkpoint**: 순수 판정 3종(자동 판정·스토어 로드·완료 게이트)이 계약 테스트로
잠겼다. `npm run test:logic` 통과. User Story 구현 시작 가능.

---

## Phase 3: User Story 1 — 최초 실행: 권한 다음 필수 에셋 + 첫 일기 1탭 (Priority: P1) 🎯 MVP

**Goal**: 앱을 처음 켠 사용자가 온보딩(권한 → 필수 에셋 다운로드)을 마치고 홈에서
"일기 쓰기" 한 번 탭으로 첫 일기를 얻는다. model-not-ready 없음.

**Independent Test**: `pm clear` → 온보딩 진행 → 에셋 다운로드 화면이 권한 뒤에
나타나고 건너뛸 수 없음 → 완료 후 홈 1탭으로 생성, model-not-ready 없음
(quickstart Q1).

### 필수 에셋 순수 판정·상수 (contracts/onboarding-assets.md A)

- [ ] T016 [P] [US1] `__tests__/onboarding/essential-assets.test.ts` 작성 —
      `ESSENTIAL_ASSET_KEYS = ["v1","v2","a1"]` (readonly·`as const`),
      `ONBOARDING_DEFAULT_CHARACTER === "quiet"`, `essentialAssetsReady` (AR1),
      `essentialDownloadFraction` (AR2 — clamp·0 분모). 소스에 `models/roster`·
      `vision/roster`·`diary/prompt`·`diary/acceptance`·`schedule/settings` import
      없음 (AR3), `let` 재할당 없음 (AR4).
- [x] T017 [US1] `src/onboarding/essential-assets.ts` 작성 — 상수 2개 + 순수 함수
      2개. `Character` 타입만 `../diary/types`에서 import.
- [ ] T018 [US1] `essential-assets.ts` 위반 주입 — `import { assetFor } from
      "../models/roster"` 추가 → `checkOnboardingFile` + T016 AR3가 잡는지 확인
      (되돌림). `ESSENTIAL_ASSET_KEYS`를 `let`으로 → AR4 잡는지.

### 필수 에셋 기기 통로 (contracts/onboarding-assets.md B — src/app/에 둔다)

- [ ] T019 [P] [US1] `__tests__/app/essential-assets-port.test.ts` 작성 — 대역으로
      `readFacts`/`downloadEssentials`/`hasSpaceForEssentials` 계약. **BR5**:
      `ESSENTIAL_ASSET_KEYS`의 `"a1"`이 `assetFor("quiet").key`와 같은지 대조.
      실패 매핑(BR3): 공간 부족→`"insufficient-space"`, 네트워크→`"network"`.
- [ ] T020 [US1] `src/app/essential-assets-port.ts` 작성 — `expoEssentialAssetsPort()`.
      `readFacts`는 011 `visionReadiness(ports)`를 `v1`·`v2`로, `a1`은
      **`ports.files.facts(assetFor("quiet").key)` + `verdictFor(state, key)`**
      (003·026 `storage.ts` 헬퍼 — `App.tsx` `refreshReady`가 쓰는 조합, **003에
      새 export 만들지 않음**, contract BR1). `downloadEssentials`는 `prepareVision`
      + `createAcquisition(ports).prepare("quiet", cb)` 호출, 두 진행을
      `essentialDownloadFraction`으로 합산해 하나의 `fraction` (BR2). `assetFor`
      결과(URL·바이트)를 화면으로 넘기지 않음 (BR4). `hasSpaceForEssentials`는
      003 `SPACE_HEADROOM` 재사용.
- [ ] T021 [US1] `src/app/essential-assets-port.ts`가 `src/ui/`가 아니므로
      `checkSourceFile` `UI_TOUCHES_MODEL`에 안 걸리는 것 확인 — `npm run lint`
      위반 0.

### 온보딩 화면 assets 단계 (contracts/onboarding-assets.md D)

- [ ] T022 [P] [US1] `__tests__/ui/onboarding-screen.test.tsx` 확장 — 표 OS1~OS4.
      권한 전부 satisfied 뒤 assets 단계, [건너뛰기] 미렌더(SR2), 진행률 바 하나
      `testID="onboarding-assets-progress"`(SR3), ready 시 [시작하기] 활성(SR4),
      failed 시 안내 + [다시 시도](SR5).
- [x] T023 [US1] `src/onboarding/decision.ts`에 `OnboardingStep`의 `assets` 갈래
      추가 (data-model §5) — `{ kind:"assets"; status:"downloading"|"ready"|
      "failed"; fraction:number }`. `nextStep`이 권한 단계를 먼저 소진한 뒤 assets
      단계를 `current`로 (SR1).
- [ ] T024 [US1] `src/ui/OnboardingScreen.tsx` 수정 — `assets` 단계 렌더. 진행률
      바 하나, [건너뛰기] 없음(SR2), [시작하기]는 `essentialAssetsReady` true일
      때만(SR3·SR4), failed 시 공간/네트워크별 안내 + [다시 시도](SR5·FR-022).
      `AppState active` 복귀 시 `readFacts` 재조회(SR7), [다시 시도]·복귀 시
      `downloadEssentials` 재호출 → 026 이어받기 자동(SR6·FR-021).
      **SR8**: `essentialAssetsReady`·`essentialDownloadFraction`은
      `../onboarding/essential-assets`에서만, `EssentialAssetsPort`는 주입받은
      타입만 — `models/*`·`vision/roster` import 없음(`UI_TOUCHES_MODEL`). T022가
      소스에서 확인.
- [ ] T025 [US1] `src/ui/OnboardingScreen.tsx` `OnboardingPorts`에
      `essentialAssets: EssentialAssetsPort` 추가. `App.tsx`가 만들어 주입
      (021 패턴).

### App.tsx 진입 게이트 + 첫 일기 배선 (일부는 Phase 6과 겹침 — 여기선 US1 경로만)

- [ ] T026 [US1] `⚠ App.tsx` `AppFrame` — `onboarding.json` 로드 시 003·011 readiness
      로 `essentialAssetsReady` 계산, `shouldShowOnboarding(flag, essentialAssetsReady)`
      로 진입 게이트 판정 (DR1·DR2). `AppState change→active`에서 재조회.
- [ ] T027 [US1] `⚠ App.tsx` `DiarySection` — 생성 파라미터를 `resolveGenerationParams`
      로 계산해 `pipeline.run`에 넘기는 최소 배선 (US1은 "quiet 하나, 사진 없는 날"
      경로만이라도 통과). `onboardingDefault`는 `ONBOARDING_DEFAULT_CHARACTER`.
- [ ] T028 [US1] `⚠ App.tsx` — 생성 성공 직후 `saveSelection(selectionPort,
      params.character)` 호출 (FR-008a). **`params.character`는 옮겨졌으면 옮겨진
      쪽** — 원래(`movedFrom`)가 아니라 실제로 쓴 캐릭터를 기록(FR-008a, analyze
      U1). 실패 경로에서는 안 부름 (원칙 I).
- [ ] T029 [US1] quickstart Q1 수동 확인 준비 — `.maestro/writing-flow-simplified.yml`
      신규 (최초 실행: 온보딩 → assets → 홈 1탭). `scripts/run-device-tests.mjs`
      `FLOWS`에 등록.

**Checkpoint**: 최초 실행이 온보딩 → 에셋 다운로드 → 첫 일기 1탭으로 완결. `npm
test` 통과. **여기까지가 MVP** — 028의 model-not-ready 결함 해소.

---

## Phase 4: User Story 2 — 홈 위젯 4개 제거, "일기 쓰기" 1탭 (Priority: P1)

**Goal**: 기존 사용자의 홈 화면에서 캐릭터·사진 설정·장소명 위젯이 사라지고, 일기
목록 + "일기 쓰기" + 날짜 셀렉트만 남는다. "일기 쓰기" 1탭(+덮어쓰기 확인 1회)으로
생성.

**Independent Test**: 마지막 캐릭터가 있는 데이터로 홈을 열어 위젯 부재 확인 →
날짜 셀렉트 오늘 + "일기 쓰기" 1탭 → 확인 없이 생성 → 마지막 캐릭터로 쓰임
(quickstart Q3).

### 화면 계약 테스트 (contracts/home-screen.md)

- [ ] T030 [P] [US2] `__tests__/ui/diary-home-screen.test.tsx` 갱신 — 표 HT1~HT6.
      캐릭터/사진/장소명 위젯 `queryByTestId` 전부 null(HT1), 1탭 생성(HT2),
      덮어쓰기 확인(HT3), no-ready-character → failed + 설정 경로(HT4),
      movedFrom 안내(HT5), 정오 게이트(HT6).
- [ ] T031 [P] [US2] `__tests__/ui/diary-list-screen.test.tsx` 갱신 — 위젯 렌더
      제거 확인, 날짜 셀렉트·"일기 쓰기"·목록만.
- [ ] T032 [US2] 소스 불변식 테스트 (H7) — `DiaryHomeScreen.tsx`·
      `DiaryListScreen.tsx`에 `CharacterPicker`·`VisionPicker`·
      `GeocodingSettingToggle` import 없음, `diary/prompt`·`models/` import 없음.

### 화면 수정

- [x] T033 [US2] `src/ui/DiaryHomeScreen.tsx` — props 제거: `characters`,
      `onSelectCharacter`, `vision`, `onSelectVision`, `onToggleGeocoding`,
      `geocodingEnabled` (H2). `onGoToCharacters` → `onGoToSettings`로 교체.
      `write()`가 상위에서 `ResolveOutcome`을 받아 H3 흐름(no-ready-character →
      toFailed + onGoToSettings; resolved → startWriting/generate). `movedFrom`
      안내 (H3-4).
- [x] T034 [US2] `src/ui/DiaryListScreen.tsx` — `CharacterPicker`·`VisionPicker`·
      `GeocodingSettingToggle` 렌더·props 제거. 날짜 셀렉트(009)·정오 게이트
      안내(012 `todayNotYetWritable`)·`deniedNotices`(021) 유지.
- [ ] T035 [US2] `src/ui/DiaryHomeScreen.tsx` `generate(day, params)` — `pipeline.run`
      호출은 `character`·`vision`만 전달(FR-013, prompt.ts 불변). 성공 후
      `saveSelection` (T028과 같은 경로 — 화면이 아니라 상위 콜백으로 위임).

### App.tsx 배선

- [x] T036 [US2] `⚠ App.tsx` `DiarySection` — `vision`/`geocodingEnabled` state와
      로드/저장 `useEffect` 제거(설정 탭으로 이동, H2). `resolveGenerationParams`
      입력(마지막 캐릭터·readyCharacters·fixedAuthor·chosenDay·photoSignalPresent·
      locationPermission·visionPreference·geocodingPreference)을 모아 계산,
      `DiaryHomeScreen`에 `ResolveOutcome` 전달.
- [x] T037 [US2] `⚠ App.tsx` — `photoSignalPresent` 계산: 그 날 신호에서 사진 ≥ 1장
      인가 (FR-010, 임계값 없음). 신호 수집은 기존 `deviceSignals`/`collectDaySignals`
      재사용, 화면·resolve 함수는 boolean만 받음.
- [x] T038 [US2] `⚠ App.tsx` — `createAppPipeline`에 넘기는 `geocodingEnabled`를
      자동 판정 결과(`params.geocodingEnabled`)로 설정. `wiring.ts`의
      `geocodingEnabled` 주입 경로는 그대로, 값의 출처만 자동 판정으로.

**Checkpoint**: 기존 사용자도 홈 1탭. `npm run test:ui` 통과. US1 + US2로 "처음
켠 사람도, 쓰던 사람도 1탭".

---

## Phase 5: User Story 3 — 배선 계층이 파라미터를 자동 결정 (Priority: P1)

**Goal**: US2의 "1탭"을 뒷받침하는 자동 판정이 화면이 아닌 배선 계층에서 돌고,
`prompt.ts`가 안 바뀐다.

**Independent Test**: `resolve-generation.test.ts` 계약 표 통과 + `prompt.ts`
시그니처 소스 비교로 불변 확인 (Phase 2에서 대부분 완료, 여기선 통합·회귀).

> ⚠️ 핵심 로직(`resolve-generation.ts`)은 Phase 2에서 이미 구현·테스트됨. 이
> phase는 **배선 통합**과 **prompt.ts 불변 회귀**만.

- [ ] T039 [P] [US3] `__tests__/diary/prompt-signature.test.ts` (또는 기존 계약
      테스트 확장) — `src/diary/prompt.ts`의 `buildPrompt`/`buildRequest` 입력
      시그니처를 소스에서 읽어 이 스펙 전후로 동일함을 잠근다 (SC-006).
- [x] T040 [US3] `⚠ App.tsx`의 `resolveGenerationParams` 호출이 렌더마다 다시 도는
      경로(날짜 셀렉트 변경·`AppState active` 권한 재조회) 확인 — `useMemo` 의존성에
      `chosenDay`·권한 상태·설정 선호 포함.
- [x] T041 [US3] `fixedAuthor` 입력 배선 — `loadSelection` 결과를 그대로
      `resolveGenerationParams`의 `fixedAuthor`로. "고정값 없음"(파일 없음·로스터
      밖) = `null` (contracts/settings-sections.md S1 자동 판정 연결).
- [ ] T042 [US3] 통합 테스트 `__tests__/app/generation-params-integration.test.ts`
      — 대역 스토어·readiness로 `App.tsx`가 조립한 입력이 `resolveGenerationParams`
      의 계약 표와 일치하는지 (마지막 캐릭터 로드 → fixedAuthor 우선 → 폴백 →
      no-ready-character).
- [ ] T043 [US3] 위반 주입 — `App.tsx` 또는 `DiaryHomeScreen`이 캐릭터/사진/장소명을
      **화면에서** 정하도록 되돌려 보고 (FR-007 MUST NOT) 계약/화면 테스트가
      잡는지. 되돌림.

**Checkpoint**: 자동 판정이 배선 계층에서만 돈다. `prompt.ts` 불변 잠김. `npm
test` 통과.

---

## Phase 6: User Story 5 — 온보딩 완료 게이트 AND (Priority: P2)

**Goal**: 온보딩 완료 플래그가 true여도 필수 에셋이 준비 안 됐으면 앱 진입 시
온보딩(에셋 단계)이 다시 뜬다. 세션 중 캐릭터 손상은 설정 탭 안내(FR-014).

**Independent Test**: 플래그 true + `a1.bin` 삭제 → 재실행 시 온보딩 재노출.
플래그 true + 에셋 준비 → 곧바로 홈 (quickstart Q2).

> ⚠️ `shouldShowOnboarding(flag, ready)`는 Phase 2에서 구현·테스트됨. 이 phase는
> **App.tsx 진입 게이트 통합**과 **세션 중 vs 진입 시점 분기**.

- [ ] T044 [P] [US5] `__tests__/ui/app-frame-gate.test.tsx` (또는 App.tsx 계약
      테스트) — 플래그 true + essentialAssetsReady false → `OnboardingScreen`
      렌더 (DR2), true + true → 탭 UI 렌더 (DR3).
- [ ] T045 [US5] `⚠ App.tsx` `AppFrame` — T026의 게이트를 완성: `essentialAssetsReady`
      false면 `forceOnboarding`과 무관하게 `OnboardingScreen`(assets 단계로 바로
      진입 가능하게). `completed`는 건드리지 않음.
- [ ] T046 [US5] `⚠ App.tsx` — 세션 중("일기 쓰기" 시점) `ResolveOutcome`이
      `no-ready-character`면 `DiaryHomeScreen`이 설정 탭 안내(FR-014), **온보딩
      재노출 안 함** (contracts/home-screen.md H3-2, Clarifications 2026-09-02).
- [ ] T047 [US5] quickstart Q2·Q5 Maestro — `unified-permission-onboarding.yml`에
      "플래그 true + 모델 삭제 → 재노출" 케이스, 세션 중 손상 → 설정 안내 케이스.

**Checkpoint**: 028 결함이 진입 게이트로 잠겼다. `npm test` 통과.

---

## Phase 7: User Story 4 — 설정 탭 세 섹션 (Priority: P2)

**Goal**: 설정 탭에서 "일기 작성자"(선택 + 미준비 다운로드), "사진 보기"(자동+3),
"장소명"(자동/켬/끔)을 관리. 고정값이 자동 판정을 덮어씀. "캐릭터" 탭 흡수(Q1=A).

**Independent Test**: 설정 탭에서 "사진 보기"="보지 않음" 고정 → 사진 있는 날에
일기 → 사진 안 봄. "일기 작성자"에서 다른 준비된 캐릭터로 → 그 캐릭터로 쓰임
(quickstart Q4).

### 계약/화면 테스트 (contracts/settings-sections.md)

- [ ] T048 [P] [US4] `__tests__/ui/settings-author-section.test.tsx` — 5개 캐릭터가
      persona 이름·소개로(모델 이름 문자열 없음, SS1·ST3), 준비됨 [작성자로
      선택], 미준비 [내려받기]. 선택 → `saveSelection` 호출 (SS2). **US4 AS4
      (analyze C2)**: `selected-character.json` 없을 때 현재 작성자가 온보딩
      기본(quiet)으로 표시, 값이 있으면 그 값으로 표시.
- [ ] T049 [P] [US4] `__tests__/ui/settings-vision-section.test.tsx` — 4선택지(자동/
      보지 않음/빠르게 봄/자세히 봄), 기본 "자동"(ST4), 선택 → `saveVisionSetting`
      (SS5).
- [ ] T050 [P] [US4] `__tests__/ui/settings-geocoding-section.test.tsx` — 3선택지,
      기본 "자동"(ST2·ST5), "켬" 선택 시 위치 권한 요청 통로 호출(SS11).
- [ ] T051 [US4] 소스 불변식 (S5) — 세 섹션 컴포넌트(또는
      `AutoDiarySettingsScreen`)에 `models/` import 없음. `src/diary/types.ts`
      `VISION_SETTINGS`에 "auto" 없음 (ST6).

### 화면 구현

- [ ] T052 [US4] `src/ui/` — "일기 작성자" 섹션 컴포넌트 (예: `AuthorSection.tsx`).
      003 `CharacterListScreen`의 다운로드 관리(멈춤·삭제·재개 — 003·026)를 흡수
      (SS4). props로 persona 문자열·준비 상태·진행(`{character,fraction}`)만 받음
      (SS1·SS3, 원칙 III).
- [ ] T053 [US4] `src/ui/` — "사진 보기" 섹션. `VisionPicker.tsx`를 4-상태로 개편
      또는 새 `VisionSection.tsx`. 값 표시·선택 콜백만.
- [ ] T054 [US4] `src/ui/` — "장소명" 섹션. `GeocodingSettingToggle.tsx`를
      3-상태로 개편 또는 새 `GeocodingSection.tsx`.
- [ ] T055 [US4] `src/ui/AutoDiarySettingsScreen.tsx` (또는 상위 설정 탭 컨테이너)
      — 세 섹션을 합성. 020 자동 생성 설정과 한 화면에 나열 (스크롤 길면 하위
      화면 분리 — spec Assumptions, S4).
- [x] T056 [US4] `⚠ App.tsx` — "캐릭터" 탭 제거 (`tab` 유니온에서 `"characters"`
      삭제, 탭 버튼·`ModelSection` 렌더 삭제). `onGoToCharacters` → `setTab("settings")`.
      `CharacterListScreen`의 로직을 T052 `AuthorSection`으로 이동 (Q1=A).
- [x] T057 [US4] `⚠ App.tsx` `AutoDiarySection` — 세 스토어(`selectionPort`·
      `visionPort`(개편)·`geoPort`(개편)) 로드/세이브 배선. 세 섹션에 props·콜백
      주입.
- [x] T058 [US4] `⚠ App.tsx` — `resolveGenerationParams` 입력의 `visionPreference`·
      `geocodingPreference`·`fixedAuthor`를 개편된 스토어 로드값으로 연결 (S1·S2·S3
      자동 판정 연결, FR-012).

**Checkpoint**: 설정 탭에서 세 축을 통제, 고정값이 자동 판정을 덮어씀. "캐릭터"
탭 사라짐. `npm run test:ui` 통과.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: 회귀·문서·실기기.

- [ ] T059 [P] `src/models/roster.ts`·`src/models/acquisition.ts` 주석에서 "사용자가
      고른 캐릭터의 모델만 내려받는 구조여야 한다(MUST)"를 v1.3.0 개정 문구로 갱신
      (T002와 정합).
- [ ] T060 [P] `.maestro/generate-diary.yml` 갱신 — 홈에서 위젯 거치던 단계 제거,
      "일기 쓰기" 직행 (quickstart Q6).
- [ ] T061 [P] `.maestro/diary-character-select.yml` 갱신/재작성 — "캐릭터" 탭 →
      설정 탭 "일기 작성자" 섹션 경로 (Q1=A). 또는 설정 탭 흐름으로 이름 변경.
- [ ] T062 `scripts/run-device-tests.mjs` `FLOWS`에 `writing-flow-simplified.yml`
      등록 확인 (T029). 미등록 시 안 돌아감 (AGENTS.md 경고).
- [ ] T063 `npm run lint` (eslint + tsc + check-constitution + prettier) — 위반 0.
      `npm test` 전체 통과. **부정 요구 회귀 assert (analyze C1)**: `src/config/
      day-boundary.ts`가 여전히 하루 경계의 유일한 자리(FR-029) — 기존 계약 테스트
      확인 또는 grep. `src/diary/acceptance.ts`의 판정 갈래가 여전히 4개(FR-030) —
      `REJECT_REASONS` 개수를 세는 기존 테스트 확인. `pipeline.run`이 여전히
      판정 후에만 저장(FR-028) — 기존 파이프라인 테스트 통과.
- [ ] T064 위반 주입 종합 확인 (헌법 「개발 방식」 관례) — research §9의 3종
      (자동 판정 임계값·`new Date()`·`essential-assets.ts`의 `models/roster`
      import)이 각 방어에 잡히는 것을 마지막으로 재확인, 전부 되돌림.
- [ ] T065 실기기 검증 (SM-S901N, dev) — quickstart Q1~Q6 수행:
      최초 실행 1탭(Q1), 완료 게이트 AND(Q2), 기존 사용자 1탭(Q3), 설정 세
      섹션(Q4), 세션 중 손상 안내(Q5), Maestro 회귀(Q6).
- [ ] T066 실기기 관측값을 `quickstart.md` "검증 후 기록" 절 또는
      `specs/029-writing-flow-simplification/findings.md`에 채움 — 에셋 다운로드
      소요 시간, quiet 첫 생성 시간, 설정 전환 동작, Maestro PASS 여부. release
      재확인 생략 근거(012) 재확인.
- [ ] T067 `docs/roadmap/README.md` 16번 항목에 "029에서 구현" 결과 문단 추가
      (007~028 관례).

---

## Dependencies & Execution Order

### Phase 의존성

```
Phase 1 (헌법 개정) ──먼저 커밋──┐
                                 ▼
Phase 2 (Foundational: 순수 판정 3종) ──── 모든 US의 선행조건
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
Phase 3 (US1 P1)         Phase 4 (US2 P1)         Phase 6 (US5 P2)
최초 실행 + 에셋          홈 위젯 제거              완료 게이트 AND
        │                        │                        │
        │                        ▼                        │
        │                Phase 5 (US3 P1)                  │
        │                자동 판정 배선 통합               │
        │                        │                        │
        └────────────────────────┴────────────────────────┘
                                 ▼
                        Phase 7 (US4 P2)
                        설정 탭 세 섹션 + "캐릭터" 탭 흡수
                                 │
                                 ▼
                        Phase 8 (Polish + 실기기)
```

- **Phase 1은 절대적으로 먼저** — 헌법 개정 없이 로스터 조항에 닿는 코드
  (필수 에셋 자동 다운로드)를 쓰면 Governance 위반.
- **Phase 2는 모든 US의 blocker** — 순수 판정 3종이 없으면 US2·US3·US4·US5가 못
  움직인다.
- **US1(Phase 3)과 US2(Phase 4)는 Phase 2 완료 후 병렬 가능** — 서로 다른 파일
  (온보딩 vs 홈). 단 둘 다 `App.tsx`를 건드리므로 실제로는 순차가 안전
  (T026·T027 ↔ T036·T037 충돌).
- **Phase 5는 Phase 4에 의존** (배선 통합이 US2의 App.tsx 변경 위에 얹힘).
- **Phase 6은 Phase 3에 의존** (`essentialAssetsReady` 계산이 US1의 포트에 의존).
- **Phase 7은 Phase 4·5 이후** (설정 스토어 개편이 자동 판정 입력에 연결됨).

### User Story별 독립 테스트 기준

| US | 독립 테스트 |
|---|---|
| US1 | `pm clear` → 온보딩 → 에셋 다운로드(건너뛰기 불가) → 홈 1탭, model-not-ready 없음 (Q1) |
| US2 | 마지막 캐릭터 있는 데이터로 홈 열기 → 위젯 부재 → 1탭 생성 → 마지막 캐릭터로 쓰임 (Q3) |
| US3 | `resolve-generation.test.ts` 계약 표 통과 + `prompt.ts` 시그니처 불변 (소스 비교) |
| US4 | 설정 "사진 보기"="보지 않음" → 사진 있는 날 → 사진 안 봄 / "일기 작성자" 변경 → 그 캐릭터로 (Q4) |
| US5 | 플래그 true + `a1.bin` 삭제 → 재실행 시 온보딩 재노출 / 준비되면 곧바로 홈 (Q2) |

---

## Parallel Execution Examples

### Phase 2 — 계약 테스트 먼저 (전부 [P], 서로 다른 파일)

```
T006 vision-setting-store.test.ts
T007 geocoding-setting-store.test.ts
T011 resolve-generation.test.ts
T014 onboarding/decision.test.ts
```
→ 4개 병렬 작성 후, 각 구현(T008·T009·T012·T015) 진행.

### Phase 3 (US1) — 순수 판정·포트·화면 테스트 병렬

```
T016 essential-assets.test.ts
T019 essential-assets-port.test.ts
T022 onboarding-screen.test.tsx
```
→ 3개 병렬, 이후 T017·T020·T024 구현.

### Phase 7 (US4) — 세 섹션 화면 테스트 병렬

```
T048 settings-author-section.test.tsx
T049 settings-vision-section.test.tsx
T050 settings-geocoding-section.test.tsx
```
→ 3개 병렬, 이후 T052·T053·T054 구현.

### Phase 8 — Maestro·문서 병렬

```
T059 roster.ts 주석 갱신
T060 generate-diary.yml
T061 diary-character-select.yml
```

---

## Implementation Strategy

### MVP = Phase 1 + Phase 2 + Phase 3 (US1)

028이 확인한 "처음 켜면 model-not-ready"를 없애는 것이 최소 가치. 헌법 개정 →
순수 판정 → 온보딩 에셋 단계 → 첫 일기 1탭. 여기까지면 최초 사용자가 앱을 쓸 수
있다.

### Incremental Delivery

1. **MVP** (Phase 1~3): 최초 실행이 돈다. 커밋·PR 가능.
2. **+ US2·US3** (Phase 4~5): 기존 사용자도 홈 1탭. 홈에서 위젯이 사라진다 — 이
   시점에 11번(NativeWind)이 올라탈 흐름이 확정된다.
3. **+ US5** (Phase 6): 진입 게이트가 model-not-ready 재발을 잠근다.
4. **+ US4** (Phase 7): 걷어낸 통제권을 설정 탭에서 되찾는다. "캐릭터" 탭 흡수.
5. **Polish** (Phase 8): Maestro·문서·실기기.

### 커밋 경계 (헌법 「커밋 메시지는 한국어로」)

- Phase 1 = 독립 커밋 (헌법 v1.3.0).
- Phase 2 = 순수 판정 커밋.
- Phase 3~7 = User Story별 커밋.
- Phase 8 = 회귀·문서·실기기 커밋.
- `main` 직접 금지 — `029-writing-flow-simplification` 브랜치 → PR (AGENTS.md).
