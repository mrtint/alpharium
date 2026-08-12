# Tasks: 프로젝트 뼈대와 의존성 기반 세우기

**Input**: Design documents from `/specs/001-project-skeleton-setup/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: 테스트 작업을 **포함한다**. 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저
쓴다"를 MUST로 요구하고, 명세 FR-021a~f가 테스트 두 갈래를 정의한다.

**Organization**: 작업은 사용자 스토리별로 묶여 독립적으로 구현·검증된다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 미완료 의존 없음)
- **[Story]**: 해당 사용자 스토리 (US1~US5)
- 모든 작업에 정확한 파일 경로를 적는다

## Path Conventions

Expo 앱 (모바일 단일 프로젝트). 저장소 루트 기준:

- 소스: `src/`, 루트의 `App.tsx`·`index.ts`
- 기기 불필요 테스트: `__tests__/`
- 실기기 테스트: `.maestro/`
- 스크립트: `scripts/`

---

## Phase 1: Setup (공유 기반)

**Purpose**: 폴더 구조와 도구 설정. 코드를 둘 자리를 만든다.

- [X] T001 `src/config/`, `src/inference/`, `src/diagnostics/`, `src/ui/`, `__tests__/`, `scripts/` 디렉터리 생성 (plan.md 「Source Code」 구조대로). `src/sensors/`·`src/diary/`는 만들지 않는다 — 자리만 문서로 예약한다
- [X] T002 [P] `eslint.config.js`의 주석을 SDK 57 기준으로 수정. 현재 "Expo SDK 54"와 존재하지 않는 「플랫폼 제약」 절을 인용하고 있어 헌법과 어긋난다
- [X] T003 [P] `package.json`의 `format` 스크립트에서 존재하지 않는 `App.tsx` 참조 문제를 확인하고 `src/**/*.{ts,tsx}`와 루트 `*.tsx`를 함께 다루도록 수정
- [X] T004 `package.json`에 `test:device` 스크립트 추가 (실기기 갈래를 따로 실행, FR-021b)

**Checkpoint**: 코드를 둘 자리가 생겼다

---

## Phase 2: Foundational (차단 전제)

**Purpose**: 모든 사용자 스토리가 의존하는 타입과 진입점. **이 단계 없이는 어떤 스토리도
시작할 수 없다.**

**⚠️ CRITICAL**: US1~US5 전부가 이 단계를 기다린다

- [X] T005 `src/config/types.ts`에 `Environment`, `EnvironmentResolution` 타입 정의 (data-model.md 「Environment」)
- [X] T006 [P] `src/inference/types.ts`에 `InferenceLocation`, `ModuleStatus`, `InferenceBackend` 인터페이스 정의 (contracts/inference.md)
- [X] T007 [P] `src/diagnostics/types.ts`에 `DiagnosticReport`, `Sink` 타입 정의 (contracts/diagnostics.md). 모델 식별자 필드를 넣지 않는다 (헌법 원칙 III)
- [X] T008 `App.tsx` 생성 — 루트 컴포넌트 (FR-002)
- [X] T009 `index.ts`를 `App.tsx` 등록으로 교체. 현재는 "등록할 루트 컴포넌트가 없다"는 빈 파일이다

**Checkpoint**: 타입 계약이 정해졌고 앱이 뜰 뼈대가 생겼다 — 스토리 작업 시작 가능

---

## Phase 3: User Story 3 - 환경이 셋으로 갈리고 추론 위치가 정해진다 (Priority: P1) 🎯 MVP

**Goal**: local/dev/prod 환경 판정과 환경별 추론 위치 규칙을 세운다. **헌법 원칙 I의 방어선이
여기 있다.**

**Independent Test**: 기기 없이 `npm test`만으로 전부 검증된다. dev·prod에서
`desktop-server`가 거부되는지가 핵심.

**MVP인 이유**: US1(앱이 뜬다)보다 먼저다. 이 규칙이 없으면 앱이 떠도 추론 위치를 정할 수
없고, 헌법 원칙 I을 어긴 채로 나머지가 쌓인다. 기기 없이 완결되므로 가장 먼저 끝낼 수 있다.

### Tests for User Story 3 ⚠️ 먼저 쓰고, 실패를 확인한 뒤 구현한다

- [X] T010 [P] [US3] `__tests__/config/environment.test.ts` — `resolveEnvironment()` 검증. contracts/environment.md 「검증 표」 8행을 그대로 케이스로 옮긴다 (`local`/`dev`/`prod`/`undefined`/`''`/`staging`/`PROD`/`' dev '`)
- [X] T011 [P] [US3] `__tests__/config/policy.test.ts` — `defaultLocationFor()` 3행과 `isLocationAllowed()` 6행 검증. **dev×desktop-server=false, prod×desktop-server=false 두 행이 이 기능에서 가장 중요한 테스트다**
- [X] T012 [P] [US3] `__tests__/inference/select.test.ts` — `selectLocation()` 검증 표 10행. 판정 실패 시 요청을 무시하는 것과 dev·prod에서 서버 요청이 `location-forbidden`으로 거부되는 것 포함

### Implementation for User Story 3

- [X] T013 [US3] `src/config/environment.ts`에 `resolveEnvironment(raw)` 구현. 인자로 받고 함수 안에서 `process.env`를 읽지 않는다 (contracts/environment.md). 대소문자·공백을 관대하게 처리하지 않고, 기본값으로 떨어지지 않는다
- [X] T014 [US3] `src/config/environment.ts`에 `process.env.EXPO_PUBLIC_APP_ENV`를 읽는 진입점 추가. **저장소에서 이 환경 변수를 읽는 유일한 곳** (FR-009a)
- [X] T015 [US3] `src/config/policy.ts`에 `defaultLocationFor()`, `isLocationAllowed()` 구현 (FR-010~012). 순수 함수로 유지한다
- [X] T016 [US3] `src/inference/select.ts`에 `selectLocation()` 구현 — 추론 위치를 고르는 유일한 지점 (FR-025). 차단된 요청을 조용히 다른 값으로 바꿔치기하지 않는다 (FR-009c)

**Checkpoint**: 헌법 원칙 I의 방어선이 테스트로 지켜진다. 기기 없이 검증 완료

---

## Phase 4: User Story 1 - 실기기에서 앱이 뜬다 (Priority: P1)

**Goal**: development build로 안드로이드 실기기에 설치해 앱이 뜬다. 시뮬레이터에서는 화면과
흐름을 확인할 수 있다.

**Independent Test**: 실기기에 설치해 실행하고 죽지 않는지 본다. 시뮬레이터로는 `npx expo
start`로 화면이 뜨는지 본다.

### Implementation for User Story 1

- [X] T017 [US1] `app.json`에 `llama.rn` config plugin 등록 (`node_modules/llama.rn/app.plugin.js`). 네이티브 추론 모듈이 development build에 포함되려면 필요하다
- [X] T018 [US1] `App.tsx`에 최소 루트 화면 구현 (FR-002). 앱이 살아 있음을 확인할 수 있으면 충분하다 — 디자인은 범위 밖
- [X] T019 [US1] development build로 안드로이드 실기기에서 실행 확인 (FR-001, FR-003). 코드 변경이 화면에 반영되는지 함께 확인
- [X] T020 [US1] 시뮬레이터에서 앱 실행 확인 (SC-006). 실기기 빌드를 기다리지 않고 화면·흐름 작업이 가능한지 본다 — **시뮬레이터가 아니라 실기기 + local 환경으로 확인했다.** 진단 화면이 `local` / `desktop-server` / 서버 연결 실패를 표시했고, 대체 응답으로 넘어가지 않았다(FR-016). 시뮬레이터 자체는 이 기계에 없어 돌리지 않았다

**Checkpoint**: 앱이 뜬다. 나머지를 눈으로 확인할 바탕이 생겼다

---

## Phase 5: User Story 2 - 온디바이스 추론 모듈이 적재된다 (Priority: P1)

**Goal**: 네이티브 추론 모듈이 붙어 호출 가능함을 확인한다. **모델 파일 없이** 확인한다
(FR-008).

**Independent Test**: 실기기에서 모듈 상태가 `loaded`로 보이는지, 시뮬레이터에서
`unavailable`이 오류가 아닌 예상 상태로 다뤄지는지 본다.

### Tests for User Story 2 ⚠️ 먼저 쓴다

- [X] T021 [P] [US2] `__tests__/inference/on-device.test.ts` — `llama.rn`의 `jest/mock.js`를 써서 `isAvailable()` 검증. contracts/inference.md 「온디바이스 어댑터 검증 표」 3행 (`loaded`/`unavailable`/`failed`)
- [X] T022 [P] [US2] `__tests__/inference/desktop-server.test.ts` — 서버 응답/불응답 2행 검증. **서버에 닿지 못했을 때 대체 응답을 반환하지 않는 것**을 명시적으로 검증한다 (헌법 원칙 I, FR-016)

### Implementation for User Story 2

- [X] T023 [P] [US2] `src/inference/on-device.ts` 구현. `getBackendDevicesInfo()` 호출 성공 여부로 판정한다 (research.md §1). `initLlama()`·`loadLlamaModelInfo()`를 부르지 않는다 — 모델 경로가 필요해 FR-008을 어긴다
- [X] T024 [P] [US2] `src/inference/desktop-server.ts` 구현. 연결 실패는 `failed`와 원인으로 표현한다. **대체 응답 경로를 만들지 않는다.** FR-013의 동일 GGUF·프롬프트·샘플링 제약을 소스 주석에 남긴다
- [X] T025 [US2] `src/inference/select.ts`의 `selectBackend()` 구현 — `selectLocation()` 결과에 따라 어댑터를 반환한다. 규칙을 여기서 다시 판단하지 않는다
- [X] T026 [US2] `unavailable`과 `failed`의 구분이 실제로 유지되는지 확인. 시뮬레이터의 모듈 부재는 오류가 아니다 (User Story 2 시나리오 3)

**Checkpoint**: 모듈 적재 여부를 값으로 알 수 있다

---

## Phase 6: User Story 3 (이어서) - 진단 보고와 환경 정리 (Priority: P1)

**Goal**: 현재 환경·추론 위치·모듈 상태를 개발자가 확인할 수 있게 하고, 헌법을 어기는 기존
설정을 정리한다.

**Independent Test**: 각 환경으로 실행해 진단 정보가 규칙대로 나오는지, 저장소에 금지된 설정이
0건인지 확인한다.

### Tests ⚠️ 먼저 쓴다

- [X] T027 [P] [US3] `__tests__/diagnostics/sink.test.ts` — `sinksFor()` 검증 표 4행. **모든 경우에 `'log'`가 포함되는 불변식**과 **prod에서만 `'screen'`이 빠지는 것**을 검증한다 (FR-007a/b, SC-013)

### Implementation

- [X] T028 [US3] `src/diagnostics/report.ts` 구현 — 환경·추론 위치·모듈 상태·실패 목록을 모은다 (FR-017). 모델 식별자를 싣지 않는다
- [X] T029 [US3] `src/diagnostics/sink.ts` 구현 — 환경별 출력 경로 (FR-007a). 판정 실패 시 화면에 보인다
- [X] T030 [US3] `src/ui/DiagnosticsScreen.tsx` 구현 — 상태를 읽을 수 있게만. **속도 측정·출력 점수·모델 비교를 넣지 않는다** (헌법 원칙 IV). prod에서 이 화면에 도달하는 경로가 없어야 한다 (SC-013)
- [X] T031 [US3] `App.tsx`에 진단 화면 연결. local·dev에서만 보이게 한다
- [X] T032 [US3] `.env.development` 정리 — `EXPO_PUBLIC_AI_MODE`, `EXPO_PUBLIC_AI_API_BASE_URL`, `EXPO_PUBLIC_ENABLE_MOCK_FALLBACK` 제거하고 `EXPO_PUBLIC_APP_ENV=local`로 대체 (FR-015, FR-016)
- [X] T033 [US3] `.env.production` 정리 — 원격 추론·대체 응답 키 제거, `EXPO_PUBLIC_APP_ENV=prod`. **데스크톱 서버 주소 키를 두지 않는다** (FR-014, 값을 비우는 것으로 대신하지 않는다)
- [X] T034 [US3] dev 환경 설정 파일 추가 (`EXPO_PUBLIC_APP_ENV=dev`). 서버 주소 키 없음
- [X] T035 [US3] local 설정에 데스크톱 서버 주소 키 추가. local에만 존재한다 (FR-014)

**Checkpoint**: 세 환경이 갈리고, 헌법 위반 설정이 사라졌다

---

## Phase 7: User Story 4 - 다음 기능이 테스트를 먼저 쓸 수 있다 (Priority: P2)

**Goal**: 테스트 두 갈래가 돌고, 건너뜀이 통과와 구분된다.

**Independent Test**: 기기 없이 `npm test`를 돌려 기기 불필요 갈래가 전부 돌고 실기기 갈래가
`skipped`로 보고되는지 확인한다.

### Implementation for User Story 4

- [X] T036 [US4] `jest` 설정에서 기기 불필요 갈래만 `npm test`가 돌도록 분리 (FR-021b). 이 갈래는 항상 돈다 (FR-021c)
- [X] T037 [US4] `.maestro/skeleton.yml` 작성 — 앱 실행과 진단 화면의 모듈 상태 확인 (FR-021f). 시뮬레이터로 대체하지 않는다
- [X] T038 [US4] `scripts/run-device-tests.mjs` 작성 — 기기 연결 여부를 확인해 없으면 **건너뜀으로 보고하고 종료 코드 0**으로 끝낸다 (FR-021d). 기기가 없다고 전체 실행이 실패하지 않는다
- [X] T039 [US4] 건너뜀이 통과로 집계되지 않도록 출력 형식 확정 (FR-021e, SC-015). `passed`/`failed`/`skipped` 셋이 구분돼 보여야 한다 — 헌법 원칙 V
- [X] T040 [US4] 일부러 실패하는 테스트를 추가해 실패가 실패로 보고되는지 확인한 뒤 제거 (US4 시나리오 2)

**Checkpoint**: 다음 기능이 테스트를 먼저 쓸 수 있다

---

## Phase 8: 헌법 위반 자동 검사 (Priority: P1 — US3 완결)

**Goal**: 금지된 설정이 저장소에 들어오는 것을 사람의 주의력에 기대지 않고 막는다.

**Independent Test**: 일부러 위반을 넣고 검사가 실패하는지 확인한다 (SC-012).

### Tests ⚠️ 먼저 쓴다

- [X] T041 [P] [US3] `__tests__/scripts/check-constitution.test.ts` — contracts/constitution-check.md 「검증 표」 5행. **local 설정의 서버 주소 키는 통과해야 한다**는 마지막 행을 반드시 포함한다 (과잉 차단 방지)

### Implementation

- [X] T042 [US3] `scripts/check-constitution.mjs` 구현 — 검사 3항목 (FR-027). 서버 주소는 **값이 아니라 키의 존재**를 본다
- [X] T043 [US3] 실패 출력 형식 구현 — 어느 파일의 어느 설정이 왜 걸렸는지 지목한다 (FR-029). "검사 실패"만 출력하지 않는다
- [X] T044 [US3] 스크립트 상단 주석에 헌법 원칙 IV와의 경계 명시 — 설정 위반을 잡는 것이지 모델 출력을 재는 것이 아니며, 여기에 출력 품질 검사를 넣지 않는다 (FR-028)
- [X] T045 [US3] `package.json`의 `lint` 스크립트에 검사 연결 (FR-026)

**Checkpoint**: 헌법 위반이 자동으로 막힌다

---

## Phase 9: User Story 5 - 어디에 무엇을 둘지가 정해져 있다 (Priority: P3)

**Goal**: 새 코드를 둘 자리가 문서로 정해진다. 측정·채점 코드를 둘 자리는 없다.

**Independent Test**: 문서를 읽고 "일기 생성 코드는 어디, 화면은 어디, 기기 신호 수집은
어디"에 답할 수 있는지 확인한다.

### Implementation for User Story 5

- [X] T046 [P] [US5] `AGENTS.md`에 코드 배치 경계 추가 (FR-023) — `src/config/`, `src/inference/`, `src/diagnostics/`, `src/ui/`의 역할과 아직 만들지 않은 `src/sensors/`·`src/diary/`의 예약된 자리
- [X] T047 [US5] 같은 문서에 **측정·채점 코드를 둘 자리가 없다**는 것을 명시 (FR-024, 헌법 원칙 IV)
- [X] T048 [P] [US5] `AGENTS.md`에 Expo Go 실행 불가와 그 이유 명시 (FR-004). development build가 필요한 까닭이 읽는 사람에게 전달돼야 한다
- [X] T049 [P] [US5] `AGENTS.md`에 `process.env`를 `src/config/`에서만 읽는다는 규칙 명시. 다른 곳에서 환경을 다시 판정하면 FR-009a가 무너진다

**Checkpoint**: 다음 세션이 구조를 헤매지 않는다

---

## Phase 10: Polish & 마무리

**Purpose**: CI 정리와 전체 검증

- [X] T050 `.github/workflows/ci.yml`에서 없는 경로 참조 제거 (`prettier --check "src/**" "App.tsx"`가 존재하지 않는 경로를 가리켰다, research.md §6)
- [X] T051 같은 파일에서 웹 빌드(`npx expo export --platform web`) 제거 — 이 제품은 안드로이드 앱이고 웹에서는 온디바이스 추론이 불가능하다
- [X] T052 CI에 헌법 검사와 기기 불필요 테스트 연결. 실기기 테스트는 CI에서 건너뛰어지며 그 사실이 보고된다 (FR-021e)
- [X] T053 `npm run lint`와 `npm test`가 모두 통과하는지 확인 (FR-019~022)
- [X] T054 [quickstart.md](quickstart.md) A단계 전체 실행 — 검사가 실제로 위반을 잡는지 포함 (SC-012)
- [X] T055 [quickstart.md](quickstart.md) B단계 실행 — 시뮬레이터. 서버를 끈 상태에서 대체 응답이 나오지 않는지 확인
- [X] T056 **[quickstart.md](quickstart.md) C단계 실행 — 실기기.** 건너뛴 채로 완료를 선언하지 않는다 (헌법 원칙 V)
- [X] T057 `getBackendDevicesInfo()`의 실기기 반환값을 관측해 [research.md](research.md) §1에 기록 — 언제 어디서 쟀는지와 함께 (헌법 원칙 V). 반환값이 예상과 다르면 T023의 판정 기준을 고친다

---

## 실기기 검증 완료 (2026-08-12)

**Galaxy S20+ (SM-G986N), Android 13, arm64-v8a** — 이전 작업에서 온디바이스 추론이
실증된 바로 그 기기다.

| 관측 항목 | 결과 |
| --- | --- |
| development build 빌드·설치 | 성공 (9분 37초, 184개 gradle 작업) |
| APK 내 네이티브 라이브러리 | `lib/arm64-v8a/librnllama.so` 포함, arm64 `.so` 28개 |
| 앱 실행 | 죽지 않고 진단 화면 표시 |
| 환경 판정 | `dev` |
| 추론 위치 | `on-device` |
| **모듈 상태** | **`loaded`** — 실패 0건 |
| Maestro 자동 테스트 | PASSED (5개 단언 전부) |

**`getBackendDevicesInfo()` 실기기 반환값** (T057, research.md §1에 기록):

```json
[{"backend":"CPU","type":"cpu","deviceName":"CPU","maxMemorySize":11116609536}]
```

"호출 성공 = 모듈 적재됨"이라는 가정이 실기기에서 성립했다. 판정 기준을 바꿀 필요가 없다.

### 검증 과정에서 확인한 것

**Maestro 흐름이 우연히 통과하지 않는다.** local 환경(데스크톱 서버)으로 앱을 띄운 채
돌렸더니 **실패했다** — 그것이 옳은 동작이다. dev 환경으로 다시 띄우니 통과했다. 흐름이
실제로 온디바이스 여부를 보고 있다는 뜻이다.

**실기기 검증은 dev 환경에서 해야 한다.** Metro를 어느 env 파일로 띄웠는지에 따라 앱의
환경이 갈리므로, `npm run test:device`가 실행 전에 이 사실을 안내한다.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존 없음
- **Phase 2 (Foundational)**: Phase 1 완료 후. **모든 스토리를 차단한다**
- **Phase 3 (US3 규칙)**: Phase 2 후. 기기 없이 완결 — MVP
- **Phase 4 (US1)**: Phase 2 후. Phase 3와 병렬 가능
- **Phase 5 (US2)**: Phase 4 후 (앱이 떠야 실기기 확인 가능). 타입은 Phase 2에서 이미 정해짐
- **Phase 6 (US3 진단)**: Phase 3·5 후 (환경 규칙과 모듈 상태가 있어야 보고할 것이 있다)
- **Phase 7 (US4)**: Phase 4·5 후 (검증할 대상이 있어야 한다)
- **Phase 8 (검사)**: Phase 6 후 (정리된 설정이 있어야 검사 대상이 확정된다)
- **Phase 9 (US5)**: Phase 1 후 언제든. 문서 작업이라 병렬 가능
- **Phase 10 (Polish)**: 전부 완료 후

### User Story Dependencies

- **US3 (P1)**: 규칙 부분은 독립. 진단 부분은 US2의 모듈 상태를 쓴다
- **US1 (P1)**: 독립
- **US2 (P1)**: US1 이후 (앱이 떠야 실기기에서 확인 가능)
- **US4 (P2)**: US1·US2 이후
- **US5 (P3)**: 독립 (문서)

### Parallel Opportunities

- T002·T003 (Setup, 다른 파일)
- T006·T007 (타입 정의, 다른 파일)
- T010·T011·T012 (US3 테스트, 다른 파일)
- T021·T022 (US2 테스트, 다른 파일)
- T023·T024 (어댑터 구현, 다른 파일)
- T046·T048·T049 (문서, 같은 파일이지만 다른 절 — 순차 권장)
- **Phase 3와 Phase 4는 통째로 병렬 가능** (기기 없는 규칙 작업 vs 기기 있는 실행 작업)

---

## Parallel Example: User Story 3 테스트

```bash
# US3 테스트 3개를 함께 작성 (전부 다른 파일):
Task: "__tests__/config/environment.test.ts — resolveEnvironment 검증 표 8행"
Task: "__tests__/config/policy.test.ts — isLocationAllowed 검증 표 6행"
Task: "__tests__/inference/select.test.ts — selectLocation 검증 표 10행"
```

---

## Implementation Strategy

### MVP 우선 (Phase 1~3)

1. Phase 1 Setup 완료
2. Phase 2 Foundational 완료 (**전부를 차단하므로 먼저**)
3. Phase 3 US3 규칙 완료
4. **멈추고 검증**: `npm test`로 헌법 원칙 I의 방어선이 지켜지는지 확인
5. 기기 없이 여기까지 도달 가능

**왜 US1이 아니라 US3가 MVP인가**: 앱이 뜨는 것보다 추론 위치 규칙이 먼저다. 규칙 없이 앱을
띄우면 헌법 원칙 I을 어긴 채로 나머지가 쌓인다. 게다가 US3 규칙은 기기 없이 완결되므로 가장
빨리 끝난다.

### 증분 전달

1. Phase 1~2 → 바닥
2. Phase 3 → 헌법 방어선 (MVP)
3. Phase 4~5 → 앱이 뜨고 모듈이 붙는다
4. Phase 6 → 상태가 보인다
5. Phase 7~8 → 테스트와 검사가 지킨다
6. Phase 9~10 → 문서와 CI 정리

### 완료 판정

**Phase 10의 T056(실기기 검증)을 건너뛰고 완료를 선언하지 않는다.** 기기 없이 T001~T055가
전부 통과해도 온디바이스는 검증되지 않은 상태이며, 관측하지 못한 것을 관측한 것처럼 다루는
것은 헌법 원칙 V 위반이다.

---

## Notes

- `[P]` = 다른 파일, 의존 없음
- 테스트를 먼저 쓰고 **실패를 확인한 뒤** 구현한다 (헌법 「개발 방식」)
- 계약의 검증 표 각 행이 테스트 케이스다 — 표를 옮겨 적는 것으로 시작한다
- 커밋 메시지는 한국어로 쓴다 (헌법 「개발 방식」)
- 한 축을 깊게 파고들고 싶어지면 멈춘다. 일기 생성·모델 파일·기기 신호는 이 기능의 범위 밖이다
