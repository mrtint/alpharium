# Tasks: 모델 준비 완료 연출 + 캐릭터 작명

**Input**: Design documents from `/specs/035-model-ready-welcome-naming/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **필수다.** 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저
쓴다(MUST)"를 못 박았다. 계약 테스트는 소스 선언을 `readFileSync`로 직접 읽어
검사하는 저장소 관례를 따른다(007·009·012·033·034 선례) — jest는 타입을 지우므로
`tsc`만 잡는 위반이 따로 있다.

**Organization**: 사용자 스토리별로 묶어 각각 독립적으로 구현·검증한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완 작업에 의존하지 않음)
- **[Story]**: US1 / US2 / US3
- 파일 경로를 반드시 적는다

## Path Conventions

이 저장소는 **모바일 앱 단일 저장소**다. `src/`가 축별로 나뉘고 `__tests__/`가
기기 없는 테스트, `.maestro/`가 실기기 흐름이다(plan.md Structure 참조).

---

## Phase 1: 헌법 개정 (Governance — 다른 모든 작업의 선행 조건)

**Purpose**: 헌법 원칙 III 「씨앗과 페르소나」가 현행대로면 US2·US3가 위반이다.
Governance("원칙을 어기려면 헌법을 먼저 고친다. 예외를 코드에 몰래 두지
않는다")에 따라 **코드보다 헌법 커밋이 먼저**다.

**⚠️ CRITICAL**: T001을 커밋하기 전에 US2·US3의 어떤 코드도 커밋하지 않는다.

- [X] T001 헌법 원칙 III 「씨앗과 페르소나」 조항 개정 — `.specify/memory/constitution.md`의 "페르소나는 사전에 설계되어 코드 안에 있다(MUST). 사용자가 자유롭게 지어내게 하지 않는다(MUST NOT)" 조항에 예외를 명시한다: **이름은 사용자가 지을 수 있다(MAY)**, 말투·소개(tagline)·성격 지시는 여전히 코드 고정이며 사용자가 바꿀 수 없다(MUST NOT), 사용자가 짓지 않았거나 지우면 코드 안 기본 이름으로 폴백한다. 근거(이름은 호칭이지 씨앗의 서술이 아니므로 씨앗과 어긋날 수 없다)를 함께 적는다. 파일 상단 개정 이력에 Amendment 1.4.0 블록을 추가하고(MINOR — MUST/MUST NOT 조항의 형태가 바뀜, 1.1.0 선례), `**Version**` 줄을 `1.4.0`으로, `Last Amended`를 `2026-09-07`로 갱신한다
- [X] T002 T001을 단독 커밋한다 — 커밋 메시지는 한국어(헌법 「개발 방식」 MUST). 이 커밋에 코드 변경이 섞이지 않았는지 `git show --stat`으로 확인한다

**Checkpoint**: 헌법이 개정됐다. 이제 작명 코드를 쓸 수 있다.

---

## Phase 2: Foundational (순수 모듈 — 모든 스토리의 공통 기반)

**Purpose**: 세 스토리가 공유하는 순수 판정 함수들. 전부 기기 없이 검증되며,
서로 다른 파일이라 **테스트·구현 모두 병렬 가능**하다.

**⚠️ CRITICAL**: 이 단계가 끝나야 US1·US2·US3의 배선 작업을 시작할 수 있다.

### 계약 테스트 먼저 (전부 [P] — 다른 파일)

> **먼저 쓰고 FAIL을 확인한 뒤 구현한다**(헌법 「개발 방식」)

- [X] T003 [P] `__tests__/diary/character-name.test.ts` 작성 — contracts/character-name.md N1·N2·N3 검증: `displayNameOf`가 `custom` 값 우선·없으면 `PERSONAS` 이름, `custom[c]`가 `""`/`"   "`이면 기본 이름 폴백(빈 문자열 반환 0건), 같은 인자에 같은 결과(순수성), 다섯 캐릭터 기본 이름이 `PERSONAS`와 일치
- [X] T004 [P] `__tests__/welcome/naming.test.ts` 작성 — contracts/character-name.md N5·N6·N7 검증: **반환 갈래가 정확히 3개인지 개수를 직접 센다**(005 `acceptance.ts` 관례), `"  복실이  "` → `{ ok: true, value: "복실이" }`, 12자 통과·13자 `too-long`·`""`/`"   "` `empty`, **소스를 `readFileSync`로 읽어** `Character`·`CHARACTERS`·`roster`·`PERSONAS` 토큰 부재 확인, `"kanana"`·`"exaone-3.5"`가 `{ ok: true }`로 통과(FR-021)
- [X] T005 [P] `__tests__/welcome/liveness.test.ts` 작성 — contracts/liveness.md L1·L2·L3·L4·L6·L14 검증: **`LivenessOutcome` 갈래가 정확히 2개인지 소스에서 센다**(L1), **그 갈래가 문자열 리터럴인지도 확인한다**(L2 — 갈래 수만 세면 `{kind:"ok",elapsedMs}` 같은 객체 변경을 놓친다), 판정 5케이스(`loaded:false`/`text:""`/`text:"   "`/`ending:timeout` → `failed`, 정상 → `ok`), **길이가 판정을 바꾸지 않음**(1자와 500자 둘 다 `ok` — 임계값 부재의 증명), `ending`이 `length`/`context`/`interrupted`여도 `text`가 있으면 `ok`, 순수성, **소스에서 `LIVENESS_INPUT`의 금지 토큰 부재**(`휴대폰`·`기록`·`사진`·`다닌 자리`·`불린다`·`써라`·`제목`), `LIVENESS_TIMEOUT_MS < GENERATION_TIMEOUT_MS`
- [X] T006 [P] `__tests__/welcome/decision.test.ts` 작성 — contracts/welcome-gate.md W2·W3·W4·W6 검증: 진리표 4줄 전부, `onboardingNeeded: true`면 나머지 인자와 무관하게 `false`(조합 4가지), **소스에서 `Date` 토큰 부재**, 시그니처에 `Character`가 없음

### 순수 모듈 구현 (전부 [P])

- [X] T007 [P] `src/diary/character-name.ts` 신규 — `CustomNames` 타입과 `displayNameOf(character, custom): string`. `persona.ts`의 `personaOf()`를 폴백으로 쓴다. **빈 문자열·공백만인 `custom` 값은 없는 것으로 본다**(N3). `roster.ts`를 import하지 않는다. T003이 통과해야 한다
- [X] T008 [P] `src/welcome/naming.ts` 신규 — `NAME_MAX_LENGTH = 12`와 `validateCharacterName(raw): NameValidation`. 갈래는 `{ok:true,value}` / `{ok:false,reason:"empty"}` / `{ok:false,reason:"too-long"}` **셋뿐**. `Character`·로스터를 import하지 않는다(N6). T004가 통과해야 한다
- [X] T009 [P] `src/welcome/liveness.ts` 신규 — `LIVENESS_INPUT = "안녕?"`(사람이 쓴 짧은 고정 문자열. L6의 금지 토큰을 하나도 담지 않는다), `LIVENESS_TIMEOUT_MS = 60_000`, `LivenessOutcome = "ok" | "failed"`(**문자열 리터럴 유니온이어야 한다** — L2, 객체 갈래로 만들면 값을 담을 자리가 생긴다), `judgeLiveness(input)`. **`text`의 길이·품질을 재지 않고 비었는가만 본다**(L3). `diary/prompt`·`diary/acceptance`·`diary/store`를 import하지 않는다(L5·L11). T005가 통과해야 한다
- [X] T010 [P] `src/welcome/decision.ts` 신규 — `shouldShowWelcome({ onboardingNeeded, essentialAssetsReady, welcomeShown }): boolean`. `new Date()`를 부르지 않고 `Character`를 받지 않는다. T006이 통과해야 한다

### 헌법 검사 규칙 (경계 방어)

- [X] T011 `scripts/constitution-rules.ts`에 `checkWelcomeFile(fileName, contents)` 추가 — `src/welcome/`가 `models/roster`·`ModelAsset`(원칙 III)·`diary/prompt`(L7)·`diary/acceptance`(**L5 — 일기 판정 4갈래를 확인 경로에 끌어들이지 않는다**)·`diary/store`(**L11 — 실패가 텍스트·엔트리를 만들지 않는다**)를 import하지 못하게, 그리고 `Date`·`timings`·`tokens`·`elapsed` 토큰을 두지 못하게 막는다(원칙 IV). `checkOnboardingFile`(021)·`checkVisionFile`(011)을 본뜬다
- [X] T012 `scripts/constitution-rules.ts`에 역방향·화면 차단 추가 — `checkSourceFile`에 (a) `src/diary/prompt.ts`가 `welcome/`를 참조하지 못하게(contracts/liveness.md L7 역방향), (b) `src/ui/`가 `src/welcome/`를 import하지 못하게(contracts/welcome-gate.md W14, 022의 `UI_TOUCHES_PROMPT`와 같은 자리) 규칙을 더한다
- [X] T013 `__tests__/welcome/welcome-boundary.test.ts` 작성 — T011·T012의 규칙마다 **위반을 주입해 실제로 잡히는지** 확인한다(저장소 관례). L8(`src/welcome/`에 `prewarm` 토큰 부재), L9(`engine-port.ts`의 `RunResult`가 여전히 필드 둘), W5(`WelcomeScreen` 참조가 `App.tsx`에만) 소스 검사도 함께
- [X] T014 `npm run lint`로 헌법 검사가 위반 0으로 통과하는지 확인한다

**Checkpoint**: 순수 판정 넷과 경계 방어가 섰다. 기기 없이 전부 검증된다.

---

## Phase 3: User Story 1 — 첫 실행에서 캐릭터가 깨어나는 연출 (Priority: P1) 🎯 MVP

**Goal**: 필수 에셋이 `ready`가 되면 홈에 가기 전에 기본 캐릭터가 응답하는지
한 번 확인하고, 성공하면 사람이 쓴 고정 문구의 환영 화면을 띄운다. 실패하면
"아직 준비 중" 안내와 [다시 시도]/[건너뛰기]를 준다.

**Independent Test**: `pm clear` 후 앱 실행 → 온보딩 완주 → 에셋 다운로드 완료
→ **홈이 아니라 환영 흐름이 먼저 뜬다**. 대기 중 화면에 응답 텍스트·초·토큰 수가
0건. 재실행하면 환영이 다시 안 뜬다.

### 계약 테스트 먼저

- [X] T015 [P] [US1] `__tests__/onboarding/flag.test.ts` 확장 — contracts/welcome-gate.md W7·W8·W10 검증: `welcomeShown`이 없는 옛 파일을 읽으면 `undefined`이고 게이트가 연출을 띄움(W8), `completed`·`batteryNoticeShown`이 여전히 정상 파싱됨(021 회귀), 직렬화 왕복에서 `welcomeShown` 보존. **W7: `OnboardingFlag`에 진행 중 상태 필드(`welcomeStep`·`livenessChecked` 등)가 없는지 소스로 확인**(FR-009). **W10: `welcomeShown`을 `true`에서 `false`로 되돌리는 코드가 제품 경로에 없는지 소스로 확인**
- [X] T016 [P] [US1] `__tests__/ui/welcome-screen.test.tsx` 작성 — contracts/welcome-gate.md W11·W12·W13·W15·W16 + liveness.md L15·L16 검증: 세 `phase`("checking"/"welcome"/"failed")가 각각 다른 것을 그림, **props 타입에 금지 필드(`Character`·`RunResult`·`LivenessOutcome`·`text`·`ms`·`token`)가 없음을 소스로 확인**(W13·L15), 세 phase 전부에 건너뛰기 경로 존재(W11), 실패 화면에 오류 사유·경로가 없음(W16), 문구가 고정 상수이고 캐릭터 이름만 보간됨(L16). **RNTL 14는 `await fireEvent.press(...)`가 필요하다**(025 실측)

### 저장 계층

- [X] T017 [US1] `src/onboarding/flag.ts` 수정 — `OnboardingFlag`에 `welcomeShown?: boolean` 추가하고 파싱·직렬화에 반영한다(021의 `batteryNoticeShown` 패턴 그대로). **진행 중 상태 필드를 만들지 않는다**(W7). T015가 통과해야 한다

### 화면

- [X] T018 [US1] `src/ui/WelcomeScreen.tsx` 신규 — `WelcomeScreenProps { phase, characterName, onSubmitName, onSkip, onRetry }`. 대기·환영·실패 문구는 **사람이 쓴 고정 상수**이고 캐릭터 이름만 보간된다. 모델 식별자·시간·토큰·오류 사유를 표시하지 않는다. `src/welcome/`를 import하지 않는다(W14). 032/034의 NativeWind 토큰(`COLORS`·`RADIUS`·`AppText`)을 쓴다. **`<Text>`에 여러 조각이 있으면 `testID`가 접근성 트리에 안 나오므로 `accessibilityLabel`을 함께 준다**(025 실측). T016이 통과해야 한다

### 실행 배선 (기기 통로)

- [X] T019 [US1] `src/inference/on-device.ts`에 정상 동작 확인 실행 경로 추가 — `prepare()`·`captionDay()`가 이미 "화면이 부르는 준비 작업"을 모으는 자리이므로 여기다(`wiring.ts`가 아니다). `load(character)` → `run(LIVENESS_INPUT, { timeoutMs: LIVENESS_TIMEOUT_MS })` → `judgeLiveness(...)` 순서(L8). **응답 텍스트를 판정 후 버린다**(L10 — 변수에 담아 화면 state·파일·`console.log`로 보내는 경로가 없어야 한다). **확인 경로를 위해 `prewarm()`의 반환값을 바꾸지 않는다**(L8a — `Promise<void>` 유지. 단 T027의 인자 추가는 별개이며 허용된다). 대상은 `ONBOARDING_DEFAULT_CHARACTER` 하나뿐(L13), 순회하지 않는다
- [X] T020 [US1] `App.tsx` 게이트 3단화 — 기존 `shouldShowOnboarding(...)` 분기 **다음에** `shouldShowWelcome({ onboardingNeeded, essentialAssetsReady, welcomeShown })` 분기를 넣어 `WelcomeScreen`을 그린다(W1). `onboardingFlag`에서 `welcomeShown`을 읽고, 확인 실행(T019)을 트리거해 `phase`를 만든다. **`welcomeShown: true`를 쓰는 경로는 셋뿐이다**(W9): 이름 확정 / 작명 건너뛰기 / 실패 화면에서 건너뛰기. **[다시 시도]는 플래그를 쓰지 않는다**(아직 통과하지 않았다). **`WelcomeScreen`을 이 자리 밖에서 렌더하지 않는다**(W5). 확인은 정확히 한 번 돌고 자동 재시도 루프를 만들지 않는다(L12)

### 검증

- [X] T021 [US1] `npm run test:logic && npm run test:ui && npm run lint` 통과 확인. `tsc`가 `OnboardingFlag` 변경의 누락 호출처를 잡는지 함께 본다
- [X] T022 [US1] 위반 주입 검증 — contracts/liveness.md·welcome-gate.md의 「위반 주입」 표에서 US1 관련 항목을 **실제로 어겨 보고** 테스트가 잡는지 확인한다: `LivenessOutcome`에 `"slow"` 갈래 추가(L1), **`LivenessOutcome`을 `{ kind, elapsedMs }`로 변경**(L2), `judgeLiveness`에 `text.length < 5 → failed` 추가(L3), `shouldShowWelcome`에서 `onboardingNeeded` 무시(W2), `WelcomeScreen`에 `character: Character` prop 추가(W13), **`OnboardingFlag`에 `welcomeStep?: string` 추가**(W7), **[다시 시도]가 `welcomeShown: true`를 쓰게 변경**(W9)

**Checkpoint**: US1이 기기 없이 완결됐다. 실기기 확인은 Phase 6에서 한다.

---

## Phase 4: User Story 2 — 첫 만남에서 캐릭터 이름 짓기 (Priority: P1)

**Goal**: 환영 화면에서 사용자가 이름을 짓고, 그 이름이 표시 네 곳과 프롬프트
호칭 줄에 흐른다. 건너뛰면 기본 이름으로 폴백한다.

**Independent Test**: 환영 화면에서 "복실이" 입력 → 확정 → 홈. 일기 목록·설정
"일기 작성자"·진단 탭·생성 일기 프롬프트 **네 곳 모두**에 "복실이"가 나온다.

**⚠️ T001(헌법 개정)이 커밋된 뒤에만 이 단계를 커밋한다.**

### 계약 테스트 먼저

- [X] T023 [P] [US2] `__tests__/welcome/names-store.test.ts` 작성 — contracts/character-name.md N8·N9 검증: 깨진 JSON → `{}`, **로스터 밖 키 하나 + 정상 키 하나 → 정상 키만 살아남는 부분 복구**, 빈 문자열 값·상한 초과 값이 섞이면 그 키만 버려짐, 저장된 JSON에 `asset`·`path`·`bytes`·`at` 키 부재
- [X] T024 [P] [US2] `__tests__/diary/prompt.test.ts` 확장 — contracts/character-name.md N14·N15·N16·N17 + 018 P8·P10·P11 검증: 모든 캐릭터 × 사용자 지정 이름 있음/없음 조합에서 `buildPrompt(...).startsWith(promptPrefix(...))`, **기본 이름 상태에서 다섯 접두사가 서로 다름(기존 P11 유지)**, **같은 캐릭터라도 이름이 다르면 접두사가 다름**, 접두사에 날짜·"에 네가 본 것"·"사진" 부재(P10·N15 유지), 접두사·프롬프트 어디에도 `tagline` 문구 부재(014 P4 유지). **N17 — `src/inference/on-device.ts`·`llama-port.ts` 소스에 프리필 무효화 흔적(`invalidate`·`cacheVersion`·`lastPrefix` 등)이 없는지 `readFileSync`로 확인한다**(FR-020의 확정 설계가 "무효화 없음"이므로, 무효화 코드가 슬쩍 들어오면 원칙 IV 경계에 접근한다)

### 저장 계층

- [X] T025 [US2] `src/welcome/names-port.ts` 신규 — `CharacterNamesPort` 인터페이스, `loadCustomNames(port)`(**예외를 던지지 않고 부분 복구**, N8), `saveCustomNames(port, names)`, `expoCharacterNamesPort()`(`preferences/character-names.json`, 지연 import + 임시 파일 쓰고 옮기기 — 007 `selection-store.ts` 패턴). T023이 통과해야 한다

### 프롬프트 경계 (018 계약과 맞물림 — 한 번에 간다)

- [X] T026 [US2] `src/diary/prompt.ts` 수정 — `nameLine()`·`fixedHead()`·`promptPrefix()`·`buildPrompt()`·`instructionLines()`가 표시 이름을 받도록 확장한다. **`fixedHead()` 한 배열에서 접두사와 본프롬프트가 나오는 018 P9 구조를 유지**하고, **호칭 줄을 접두사에서 빼지 않는다**(N16 — 빼면 한국어 캐릭터 셋의 접두사가 같아져 P11이 깨진다). `welcome/`를 import하지 않는다(L7 역방향). T024가 통과해야 한다
- [X] T027 [US2] `src/inference/engine-port.ts` 수정 — `prewarm(character: Character, prefix: string): Promise<void>`로 시그니처 변경. **반환값은 여전히 `void`**(018 E6 유지 — `Promise<boolean>`으로 바꾸지 않는다). 주석에 "접두사를 인자로 받는 이유"(포트가 `prompt.ts`를 모르게 한다)를 남긴다
- [X] T028 [US2] `src/inference/llama-port.ts` 수정 — `prewarm()`이 인자로 받은 `prefix`를 쓰고 **`promptPrefix()` 직접 호출과 `prompt.ts` import를 제거**한다(N18). `RunResult`는 `{ text, ending }` 그대로(L9)
- [X] T029 [US2] `src/inference/on-device.ts` 수정 — `prepare(character)`가 표시 이름으로 접두사를 만들어 `engine.prewarm(character, prefix)`에 넘긴다. **`prewarm()`과 `run()`이 같은 이름 값을 보게 한다**(N14). E12(`unload`하지 않음)·E1(한 번에 하나만 열림)은 그대로
- [X] T030 [US2] `tsc`로 `prewarm()` 시그니처 변경의 모든 호출처·목이 갱신됐는지 확인한다 — `__tests__/`의 엔진 목 다수가 함께 바뀐다(021이 `NotificationPort` 확장 때 겪은 것과 같은 계열)

### 일기 스냅샷

- [X] T031 [US2] `src/diary/types.ts` 수정 — `DiaryEntry`에 `authorName?: string` 추가(N10). 주석에 "생성 시점의 사실이며 갱신되지 않는다", "옵셔널이며 옛 일기에는 없다", "소급 생성하지 않는다"를 적는다(`title?`·`placeName?` 주석 스타일). **`serializeEntry`/`deserializeEntry`는 수정하지 않는다**(`JSON.stringify` 하나라 자동 반영)
- [X] T032 [US2] `src/diary/pipeline.ts` 수정 — `PipelineInput`에 `authorName?: string` 추가(018의 `seen?` 선례)하고, 엔트리 조립에서 조건부 스프레드로 담는다(`...(input.authorName !== undefined ? { authorName: input.authorName } : {})`). **주입받을 뿐 파일을 읽지 않는다**
- [X] T033 [P] [US2] `__tests__/diary/pipeline.test.ts` 확장 — N10·N11·N12 검증: `authorName`이 주입되면 저장 엔트리에 담김, **주입되지 않으면 키 자체가 없음**(`undefined`가 아니라 키 부재), 이름 변경 경로가 `store.save()`를 부르지 않음(소스 읽기). **N12 — `src/diary/`·`src/welcome/` 소스에 소급 생성·마이그레이션·백필 함수가 없는지 확인한다**(`migrate`·`backfill`·`upgradeEntry` 토큰 부재). 옛 일기의 그 시점 이름은 관측된 적이 없으므로 지어내면 원칙 V 위반이다

### 화면·조립 배선

- [X] T034 [US2] `src/ui/WelcomeScreen.tsx` 확장 — 작명 입력 단계 추가. 빈 문자열·공백만이면 확정 비활성(FR-012), `maxLength={12}`(FR-013), [건너뛰기] 제공(FR-014). 입력창에 `testID`와 `accessibilityLabel`을 준다. T016을 확장해 이 갈래를 잠근다
- [X] T035 [US2] `App.tsx` 배선 — 앱 진입 시 `loadCustomNames()`를 읽어 상태로 들고, `displayNameOf()`로 만든 **문자열**을 화면들에 넘긴다. 작명 확정 시 `validateCharacterName()` → `saveCustomNames()` → `welcomeShown: true`. 일기 생성 호출에 `authorName`을 주입한다. **폴백(`entry.authorName ?? displayNameOf(...)`)을 조립부에서 계산해 넘긴다**(N13)
- [X] T036 [US2] `personaOf()`를 쓰던 표시 자리 6곳을 표시 이름 문자열로 교체 — `src/ui/CharacterListScreen.tsx:270`, `src/ui/CharacterPicker.tsx:78`, `src/ui/DiaryDetailScreen.tsx:146`, `src/ui/DiaryHomeScreen.tsx:298·339-340`, `App.tsx:1162`. **`tagline`은 그대로 `personaOf()`에서 온다**(사용자가 못 바꾼다). 진단 화면의 캐릭터 표시도 함께 확인한다(FR-018)
- [X] T037 [US2] `npm test && npm run lint` 통과 확인 + 위반 주입 검증 — `displayNameOf`가 `custom[c] ?? ""` 반환(N3), `naming.ts`에 `import { CHARACTERS }` 추가(N6), **호칭 줄을 `fixedHead()`에서 제거**(018 P11 — 한국어 셋이 같아지는지), `pipeline`이 `authorName`을 항상 담음(N10), `prompt.ts`에 `import { LIVENESS_INPUT }` 추가(L7 역방향). **N4 확인: `git diff --stat src/diary/persona.ts`가 비어 있어야 한다** — `PERSONAS`·`personaOf()`는 이 기능에서 수정되지 않는다(014 계약 P2·P3·P4 보존)

**Checkpoint**: US1 + US2가 기기 없이 완결됐다. 이름이 네 곳과 프롬프트에 흐른다.

---

## Phase 5: User Story 3 — 설정에서 준비된 캐릭터 이름 바꾸기 (Priority: P2)

**Goal**: 설정 탭 "일기 작성자"에서 준비된 캐릭터마다 이름을 편집한다. 미준비는
편집 불가, 비우면 기본 이름으로 되돌아간다. 과거 일기는 생성 시점 이름 유지.

**Independent Test**: 설정에서 "금동이" → "복실이" 변경 → 저장 → 같은 화면·목록·
진단에 반영. **변경 전 생성한 일기는 "금동이" 그대로, 변경 후 생성한 일기는
"복실이"**.

### 계약 테스트 먼저

- [X] T038 [P] [US3] `__tests__/ui/author-picker.test.tsx` 확장 — contracts/welcome-gate.md W17·W18·W19 검증: `ready: false`인 행에 편집 진입점이 없고 "아직 준비되지 않음" 표시가 유지됨(034 회귀), 편집이 `validateCharacterName()`과 같은 규칙을 씀, **이름을 비우면 `{ quiet: "" }`를 저장하는 게 아니라 키를 제거함**(W19)

### 구현

- [X] T039 [US3] `src/ui/AuthorPicker.tsx` 수정 — 준비된 행에 이름 편집 진입점 추가. `AuthorOption`에 편집 관련 필드/콜백을 더하되 **화면은 여전히 문자열과 콜백만 받는다**(원칙 III, 034의 구조 유지). 미준비 행의 현행 표시·`testID`·문안을 바꾸지 않는다(회귀 방지). T038이 통과해야 한다
- [X] T040 [US3] `App.tsx` 설정 탭 배선 — 이름 편집 확정 시 `validateCharacterName()` → `saveCustomNames()` → 상태 갱신으로 즉시 반영(FR-022). **비우면 `CustomNames`에서 그 키를 제거**한다(W19). **이 경로가 `DiaryStore.save()`/`load()`를 부르지 않는다**(W20/N11)
- [X] T041 [US3] 과거 일기 표시 폴백 확인 — 목록·상세가 `entry.authorName ?? displayNameOf(entry.character, custom)`로 계산된 문자열을 받는지 확인한다(N13·FR-026b). 옛 일기(스냅샷 없음)에서 빈 이름이 나오지 않아야 한다
- [X] T042 [US3] `npm test && npm run lint` 통과 확인 + 위반 주입(이름 비우기가 `{ quiet: "" }`를 저장하는지 — W19)

**Checkpoint**: 세 스토리가 전부 기기 없이 완결됐다.

---

## Phase 6: 실기기 검증 (헌법 원칙 V — 건너뛴 실기기 테스트는 통과가 아니다)

**Purpose**: SM-S901N(Galaxy S22), debug. 새 네이티브 모듈이 0개이므로
**debug 1회로 충분**하다(012 기준, release 재확인 불필요).

**⚠️ 실행 순서 주의**: `unified-permission-onboarding.yml`(021)이 `pm clear`로
앱 데이터를 전부 날린다(모델·일기·설정 삭제 — 024 §7이 이것에 당했다).
**모델이 필요한 흐름을 먼저, 그 흐름을 맨 마지막에.**

- [X] T043 Maestro 흐름 `.maestro/welcome-naming.yml` 작성 — 환영 화면 등장, 작명 입력·확정, 설정 탭 이름 변경, 목록 반영을 검증한다. **텍스트 매칭은 노드 전체와 맞으므로 부분 문자열은 정규식으로**, `scrollUntilVisible`이 필요한 자리를 확인한다
- [X] T044 `scripts/run-device-tests.mjs`의 `FLOWS` 배열에 `.maestro/welcome-naming.yml` 등록 — **등록하지 않으면 파일이 있어도 안 돌고 초록불인데 아무것도 검증되지 않는다**(AGENTS.md 경고)
- [ ] T045 [US1] 실기기 US1 검증 — quickstart.md §2-2 표대로: `pm clear` → 온보딩 → 에셋 다운로드 완주 → **홈이 아니라 환영 흐름이 먼저 뜨는지**, 대기 문구에 응답 텍스트·초·토큰 수 0건, `adb logcat`에서 **확인용 프롬프트가 일기 프롬프트보다 훨씬 짧은지**(L6 — 화자 규칙 8줄이 없어야 한다), 재실행 시 환영 미재등장(FR-008)
- [ ] T046 [US2] 실기기 US2 검증 — quickstart.md §2-3 표대로: 빈 입력·13자 차단, 건너뛰기 시 기본 이름, 재실행 후 이름 유지, **네 곳 반영**(목록·설정·진단·프롬프트). 프롬프트는 개발자 탭 "입력 프롬프트 미리보기"(022)에서 `너는 '복실이'이라 불린다.`를 확인한다
- [ ] T047 [US3] 실기기 US3 검증 — quickstart.md §2-4 표대로. **SC-005a 재현**: 이름 "금동이"로 일기 A 생성 → "복실이"로 변경 → 일기 B 생성 → 목록에서 A는 "금동이", B는 "복실이". `adb shell run-as com.anonymous.alpharium cat files/diary/<날짜>.json | grep authorName`으로 스냅샷 확인
- [ ] T048 확인 실패 갈래 검증(FR-006·FR-007) — quickstart.md §2-5: 모델을 손상시켜(`dd if=/dev/urandom`) 환영 미표시·플레이스홀더 없음·오류 사유 미노출·[다시 시도]/[건너뛰기] 동작 확인. **재현이 어려우면 계약 테스트로 갈음한다**(spec 명시)
- [ ] T049 Maestro 회귀 — `diary-character-select.yml`(023에서 페르소나 이름을 문안으로 씀 — 이름이 사용자 지정이 되면 깨질 수 있다), `prompt-preview.yml`(022 — 호칭 줄이 바뀐다), `diary-user-path.yml`을 돌린다. 깨지면 **035 회귀인지 기존 stale 버그인지 구분해 기록**한다(022·023·024가 반복 겪은 것)
- [ ] T050 `unified-permission-onboarding.yml`(021)을 **맨 마지막에** 돌린다 — `pm clear`로 데이터가 날아가므로

---

## Phase 7: Polish & 문서

- [X] T051 [P] `docs/roadmap/README.md`의 19번 항목에 구현 결과를 적는다 — 확정된 결정(호칭 줄 유지 + 프리필 무효화 없음, 스냅샷 방식, 60초·12자 상수)과 실기기 관측값, 미확인으로 남은 것을 함께(원칙 V)
- [X] T052 [P] `AGENTS.md`에 이번에 얻은 실무 사실을 더한다 — 018 접두사와 사용자 지정 이름의 상호작용(호칭 줄을 빼면 한국어 캐릭터 셋의 접두사가 같아진다)은 다음 작업자가 반드시 알아야 한다
- [X] T053 `specs/035-model-ready-welcome-naming/spec.md`의 미확인 잔여를 갱신한다 — 실기기에서 확인 못 한 갈래를 명시적으로 남긴다(원칙 V — "건너뛴 것은 통과가 아니다")
- [ ] T054 quickstart.md §3 완료 판정 체크리스트를 전부 확인한다
- [ ] T055 PR 생성 — `main` 직접 커밋 금지(헌법·AGENTS.md). 커밋 메시지는 한국어. **T001(헌법) 커밋이 코드 커밋보다 앞에 있는지** `git log --oneline`으로 확인한다

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (헌법)**: 의존 없음. **US2·US3의 절대 선행 조건**
- **Phase 2 (Foundational)**: Phase 1 이후. 모든 스토리를 막는다
- **Phase 3 (US1)**: Phase 2 이후. US2·US3와 독립
- **Phase 4 (US2)**: Phase 2 + **Phase 1** 이후. T018(WelcomeScreen)을 확장하므로 US1의 T018 이후
- **Phase 5 (US3)**: Phase 4 이후 (`names-port`·`displayNameOf` 배선을 재사용)
- **Phase 6 (실기기)**: 검증 대상 스토리가 완료된 뒤
- **Phase 7 (Polish)**: 전부 이후

### User Story Dependencies

- **US1 (P1)**: Phase 2 후 독립적으로 완결 가능 — 연출만으로도 "침묵하는 전이를
  없앴다"는 가치가 선다
- **US2 (P1)**: Phase 1 + Phase 2 필요. **화면은 US1의 `WelcomeScreen`을 확장하므로
  US1 위에서 검증된다**(spec US2의 "US1과의 관계" 참조). US2가 더하는 것(이름
  검증·저장·흐름)은 독립적으로 테스트된다
- **US1 + US2 = MVP** — 환영 화면이 "제 이름을 지어주세요"라고 말하므로, 작명 없이
  US1만 내보내면 그 문구가 거짓이 된다
- **US3 (P2)**: US2의 저장·해석 계층(T025·T007)에 의존. 화면만 추가

### Within Each Story

- 계약 테스트를 **먼저 쓰고 FAIL을 확인한 뒤** 구현한다(헌법 「개발 방식」)
- 순수 모듈 → 저장 계층 → 경계 수정 → 화면 → 조립(`App.tsx`)
- 위반 주입으로 방어를 확인해야 그 스토리가 끝난다

### Parallel Opportunities

- **Phase 2 전체가 병렬이다** — T003~T006(테스트 넷), T007~T010(구현 넷)이 각각
  다른 파일이다
- T015·T016(US1 테스트)이 병렬
- T023·T024(US2 테스트)가 병렬
- T033·T038이 각 스토리 안에서 병렬
- T051·T052(문서)가 병렬
- **T026~T029(프롬프트·엔진 경계)는 병렬이 아니다** — 018 계약 P8~P11이 넷을
  함께 잠그므로 한 묶음으로 간다

---

## Parallel Example: Phase 2 (Foundational)

```bash
# 계약 테스트 넷을 함께 쓴다 (전부 다른 파일):
Task: "__tests__/diary/character-name.test.ts — N1·N2·N3"
Task: "__tests__/welcome/naming.test.ts — N5·N6·N7 + 갈래 개수"
Task: "__tests__/welcome/liveness.test.ts — L1·L3·L6 + 갈래 개수"
Task: "__tests__/welcome/decision.test.ts — W2·W3·W4"

# FAIL 확인 후 구현 넷을 함께:
Task: "src/diary/character-name.ts — displayNameOf()"
Task: "src/welcome/naming.ts — validateCharacterName()"
Task: "src/welcome/liveness.ts — judgeLiveness() + LIVENESS_INPUT"
Task: "src/welcome/decision.ts — shouldShowWelcome()"
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1 (헌법) — **US2가 있으므로 반드시 먼저**
2. Phase 2 (순수 모듈 + 경계)
3. Phase 3 (US1) → **멈추고 검증**: T045로 실기기에서 연출을 본다
4. Phase 4 (US2) → T046으로 작명을 본다
5. 여기까지가 "침묵하는 전이를 없앴고 첫 만남에서 이름을 지었다"는 완결된 가치다

> **왜 US1만으로 끊지 않는가**: 환영 화면이 "제 이름을 지어주세요"라고 말하는데
> 작명 단계가 없으면 그 문구가 거짓이 된다. US1만 내보내려면 환영 문구를 작명을
> 청하지 않는 것으로 바꿔야 한다.

### Incremental Delivery

1. Phase 1 + 2 → 기반
2. + US1 → 연출 (MVP) → T045 검증
3. + US2 → 첫 만남 작명 → T046 검증
4. + US3 → 설정 편집 → T047 검증
5. Phase 6 나머지 + Phase 7

---

## Notes

- **[P]는 다른 파일 + 미완 의존 없음**을 뜻한다
- **위반 주입 없이는 그 방어가 검증된 것이 아니다**(007~034 전체 관례)
- `npm run test:logic`(약 7초)이 개발 중 기본, 화면을 건드렸으면
  `test:ui`, 커밋 전 `npm test`
- **`tsc`가 jest보다 먼저 잡는 것이 있다** — 이번엔 `prewarm()` 시그니처,
  `OnboardingFlag`·`DiaryEntry`·`PipelineInput` 확장 넷이 그렇다
- 커밋 메시지는 한국어(헌법 MUST). `main` 직접 작업 금지
- 각 태스크 또는 논리적 묶음마다 커밋한다

---

## Phase 8: Convergence

**Purpose**: `/speckit-converge`(2026-09-07)가 발견한 배선 누락. **네 건 전부
`partial`** — 코드가 있으나 요구사항을 아직 다 만족하지 못한다.

**공통 뿌리**: 일기 **상세·캐릭터 목록** 화면이 이름 계층에 연결되지 않았다.
`authorName`은 저장되는데 읽는 쪽이 없고, 두 화면이 `personaOf()`를 직접 부른다 —
**저장은 되는데 화면이 옛 이름을 보이는 조용한 결함**이며, 011(`has_media=0`)·
013(URI 계약 불일치)과 같은 계열이다. 기기 없는 테스트 2562개가 초록불인 채로
통과했다는 것이 F4의 근거다.

- [X] T056 [US3] `DiaryDetailScreen`이 저장된 작성자 이름을 우선 쓰게 배선한다 per FR-026b·US3/AS6 (partial) — `src/ui/DiaryDetailScreen.tsx:146`의 `personaOf(entry.character).name`을 **`entry.authorName ?? <주입받은 현재 이름>`** 으로 바꾼다. `DiaryEntry.authorName`이 `pipeline.ts`에서 저장되지만 **읽는 곳이 하나도 없어**(`grep -rn authorName src/ui/` → 0건) 스냅샷 기능 전체가 화면에서 무효다. **폴백은 조립부가 계산해 문자열로 넘긴다**(N13) — 화면이 두 값을 받아 스스로 고르면 폴백이 화면마다 흩어진다. `topicParticleFor(name)`(조사 선택)이 새 이름에도 맞는지 함께 확인한다
- [X] T057 [US2] `DiaryHomeScreen`이 `characterNames`를 `DiaryDetailScreen`에 넘긴다 per FR-018·SC-003 (partial) — `src/ui/DiaryHomeScreen.tsx:424·469`의 두 렌더 자리. `characterNames`는 이미 그 컴포넌트의 스코프에 있다(035 Phase 4에서 배선됨). T056과 한 묶음으로 간다 — 상세 화면이 이름을 받을 통로가 이것뿐이다. **SC-003의 "네 곳 모두"에서 상세 화면이 빠져 있는 것**이 이 태스크가 메우는 구멍이다
- [X] T058 [US3] `CharacterListScreen`이 이름을 주입받게 배선한다 per FR-018 (partial) — `src/ui/CharacterListScreen.tsx:270`의 `personaOf(character).name`. 이 화면은 설정 탭 하단에 실제로 렌더되므로(`App.tsx:1140`) **같은 화면 안에서 `AuthorPicker`는 "복실이", 그 아래 목록은 "금동이"로 이름이 갈려 보인다.** `AuthorPicker`와 같은 방식(조립부가 문자열을 넘김)으로 고친다. **`tagline`은 그대로 `personaOf()`에서 온다**(헌법 1.4.0 — 이름만 사용자가 짓는다)
- [X] T059 이름이 흐르는 자리를 계약 테스트로 잠근다 per FR-030·SC-006 (partial) — F1~F3이 **테스트 2562개가 전부 통과하는 상태로 빠져나갔다**(저장소가 반복 겪은 "초록불인데 아무것도 검증되지 않은 상태"). `src/ui/` 소스를 `readFileSync`로 읽어 **화면에서 `personaOf(...).name`을 직접 부르는 자리가 없는지** 검사한다(`tagline`은 허용 — 사용자가 못 바꾼다). 예외로 둘 파일이 있으면 사람이 못 박은 상수 목록으로 두고 이유를 적는다(012 `USER_VISIBLE_SIGNAL_AXES` 선례). 위반 주입으로 방어를 확인한다
