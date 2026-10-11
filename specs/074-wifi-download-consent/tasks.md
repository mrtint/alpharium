---

description: "074 모바일 데이터 동의 — 태스크"
---

# Tasks: 첫 실행 모델 내려받기 — 모바일 데이터면 알리고 고르게 하기

**Input**: `specs/074-wifi-download-consent/` — plan.md, spec.md, research.md, data-model.md, contracts/consent-gate.md, quickstart.md

**Prerequisites**: plan.md, spec.md (모두 있음)

**Tests**: 이 저장소는 계약·테스트 먼저(헌법 「개발 방식」)라 각 스토리의 테스트를 구현보다 먼저 쓰고 **실패하는 것을 확인**한다. 위반 주입은 스토리 끝에 한다.

**Organization**: 스토리별 phase. 경로는 저장소 루트 기준. `[P]`는 다른 파일·선행 미완료 의존 없음.

## 규칙 (모든 태스크에 적용)

- 새 저장 필드·권한·네이티브 의존성을 더하지 않는다(FR-012). `src/firstrun/progress.ts`·`src/onboarding/flag.ts`·`src/app/network-port.ts`·`src/app/redownload-plan.ts`는 수정하지 않는다(CG18).
- 화면 문구는 `src/i18n/catalogs/ko/consent-gate.ts`(새 `consentGate` 영역)에만 둔다(FR-011). 기존 `download.ts`는 수정하지 않는다(골든 G1·G2; 새 리터럴은 T005의 `ADDED_AFTER_GOLDEN`).
- 실기기 단계(T030~T034)는 **시작 전 소유자 확인**을 받는다(안티그랩이 기기 사용 중). 모델 백업 없음 — `pm clear` 전에 소유자가 정한다.
- 테스트 확장자: 순수 로직 `.ts`, 화면 `.tsx`. RNTL 14는 `await render/fireEvent`. 소스를 읽는 테스트는 주석을 걷고 읽는다.

> **구현 중 정한 구조 변경 (2026-10-11)**: T010·T011은 계획과 달리 (a) `DownloadConsentDialog`에 `variant`를 더하는 대신 모바일 동의를 `src/ui/CellularConsentDialog.tsx`로 따로 두고(045의 [받을게요] 하나뿐 계약 테스트가 소스 어휘까지 잠근다), (b) 조립을 App.tsx 안이 아니라 `src/ui/DownloadConsentGate.tsx`로 떼어 통로를 props로 받는다(App.tsx는 jest에서 렌더되지 않아 게이트 동작을 실제로 그리려면 분리가 필요하다). 훅의 통로는 `readSizeLabel`(문자열) 하나다. T008·T015·T022의 `AppFrame.firstrun` 확장은 소스 배선 단언이고 동작 시험은 `download-consent-gate.test.tsx`가 맡는다. 기존 단언 하나("동의 분기가 DownloadConsentGate를 그린다")만 새 구조에 맞게 고쳤다.

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `074-wifi-download-consent`인지 확인하고, 변경 전 기준으로 `npm run test:logic`·`npm run test:ui`가 초록인지 기록한다(기존 `__tests__/firstrun/progress.test.ts`, `__tests__/ui/download-consent-dialog.test.tsx`, `__tests__/ui/AppFrame.firstrun.test.tsx`, `__tests__/app/redownload-plan.test.ts`, `__tests__/i18n/ko-golden.test.ts`)

## Phase 2: Foundational (모든 스토리의 선행)

- [X] T002 [P] 계약 테스트를 먼저 쓴다 `__tests__/app/consent-gate.test.ts` — CG1(`consentViewOf`: `cellular`만 `"cellular"`, `wifi`/`other`/`unknown` 모두 `"standard"`), CG2(`withTimeout`: 먼저 끝나면 값, 한도 후 fallback, 거부도 fallback; fake timers), CG3(`READ_LIMIT_MS === 3000`이 `src/app/consent-gate.ts` 한 곳에만 — 다른 `src/` 파일에 `3000` 리터럴로 같은 한도를 쓰지 않음), CG4(`expo-network`·`react-native`·`expo-file-system` import 없음, 주석 걷고 읽기). 실패 확인.
- [X] T003 `src/app/consent-gate.ts` 신규 — `READ_LIMIT_MS = 3000`, `consentViewOf(connection: Connection)`(`Connection` 타입은 `./network-port`에서 type import만), `withTimeout<T>(p, ms, fallback)`(타이머만, `Date` 없음, 정리 시 `clearTimeout`). T002 통과.
- [X] T004 [P] 새 파일 `src/i18n/catalogs/ko/consent-gate.ts`를 만들고 `src/i18n/catalogs/ko/index.ts`에 최상위 영역 `consentGate`로 등록한다(기존 `download.ts`는 수정하지 않는다 — 골든 G1·G2 보호): `cellular = { title, body: (size: string | null) => string, confirm: "모바일 데이터로 받기", defer: "나중에 받기" }`, `deferred = { title, body, recheck: "다시 확인하기" }`. 문구는 research R6의 해요체 안. 모델 식별자·바이트 단위·진행률 어휘 금지. `Catalog = typeof ko`라 `tsc`가 다른 언어 빠짐을 짚는다(언어는 한국어 하나).
- [X] T005 `__tests__/i18n/ko-golden.test.ts`를 실행해 G1(리터럴 집합 == 골든)이 새 리터럴 때문에 실패하는 것을 확인한 뒤, 새 문구 리터럴(`${}` 치환 표기 규칙대로)을 같은 파일의 `ADDED_AFTER_GOLDEN` 배열에 올려 통과시킨다. **`*.golden.json`은 다시 쓰지 않고 `GOLDEN_WRITE=1`을 쓰지 않는다.** 기존 `download` 영역 상수의 G2 출력이 그대로인지 함께 확인.

**Checkpoint**: 순수 모듈·문구가 서 있다. `npm run test:logic`·`npx tsc --noEmit` 초록.

## Phase 3: User Story 1 — 모바일 데이터에서는 알고 나서 받는다 (P1) 🎯 MVP

**Goal**: 모바일 데이터로 확인될 때만 모바일 동의가 뜨고 받을 양이 보이며 「모바일 데이터로 받기」가 기존 동의와 같은 효과를 낸다. 그 밖은 표준 동의 그대로.

**Independent Test**: 연결을 바꿔 가며 동의 단계 진입 — `cellular`만 모바일 동의, 나머지는 표준(CG1·CG5~CG7·CG11·CG12·CG16).

### Tests (먼저, 실패 확인)

- [X] T006 [P] [US1] `__tests__/app/use-consent-gate.test.tsx` 신규 — CG5(마운트 시 `readConnection` 정확히 1회, 읽는 동안 `reading`), CG6(`cellular`일 때만 `readRemainingBytes` 호출, 표준이면 호출 0), CG7(연결 읽기가 `READ_LIMIT_MS` 안에 안 끝나면 `standard`; 받을 양이 안 끝나면 `cellular` + `sizeLabel === null`; fake timers), CG10(늦게 온 옛 결과는 버림·언마운트 뒤 갱신 없음), 읽기 거부(throw)는 `standard`.
- [X] T007 [P] [US1] `__tests__/ui/download-consent-dialog.test.tsx` 확장(기존 표준 케이스는 수정하지 않는다) — CG11(`variant` 생략/`"standard"`는 변경 전과 같은 렌더: 버튼 하나 testID `download-consent-confirm`), CG12(`variant="cellular"`: 버튼 둘 `download-consent-cellular-confirm`·`download-consent-defer`, `sizeLabel` 있으면 본문 포함·없으면 양 없는 문구, 덮개 누름·뒤로 가기에 닫히지 않음, `onConfirm`/`onDefer` 각각 호출).
- [X] T008 [P] [US1] `__tests__/ui/AppFrame.firstrun.test.tsx` 확장 — CG15(동의 단계가 아니면 `readConnection` 호출 0: 모델 준비됨·이미 동의한 사용자), 모바일 연결이면 모바일 동의가 뜨고 **뜬 동안 동의 저장·다운로드 시작 통로 호출이 0**(CG13a, SC-001), 「모바일 데이터로 받기」가 `downloadConsented: true` 저장 + 다운로드 시작(CG16), Wi-Fi·`other`·`unknown`·읽기 응답 없음(3초)이면 표준 동의(CG7/SC-003a). 기존 케이스는 수정하지 않는다(연결 통로는 기본값 대역으로 `wifi`를 준다).

### Implementation

- [X] T009 [US1] `src/app/use-consent-gate.ts` 신규 — `useConsentGate({ readConnection, readRemainingBytes, formatBytes })` → `{ view: "reading" | "standard" | "cellular" | "deferred", sizeLabel: string | null, defer(), recheck() }`. 마운트에서 한 번 읽기(요청 번호표 ref는 effect/콜백 안에서만 접근 — React Compiler), `withTimeout`으로 각 읽기에 `READ_LIMIT_MS` 적용, `cellular`일 때만 받을 양 읽기. `defer`/`recheck`는 US2에서 채우되 시그니처는 지금 둔다. T006 통과.
- [X] T010 [US1] `src/ui/DownloadConsentDialog.tsx` 수정 — props에 `variant?: "standard" | "cellular"`(기본 `standard`), `sizeLabel?: string | null`, `onDefer?: () => void` 추가. `standard`는 지금 JSX 그대로(문구·testID 불변). `cellular`는 `ConfirmDialog`의 `actions`에 `DialogActionButton` 둘(「나중에 받기」 보조, 「모바일 데이터로 받기」 주). 문구는 `lazyText((c) => c.consentGate.cellular)`. 화면은 `network-port`·`essential-assets`를 import하지 않는다(CG14). T007 통과.
- [X] T011 [US1] `App.tsx`의 `firstRunStage === "download-consent"` 분기(현재 1450행 근처)를 새 함수 컴포넌트 `DownloadConsentGate`(같은 파일 안, 훅 사용)로 바꾼다 — 훅에 `readConnection`(이미 import됨)·`readEssentialRemainingBytes`(이미 import됨)·`formatModuleBytes`를 주입, `view`가 `reading`이면 `SafeAreaView`만(대화상자 없음), `standard`/`cellular`면 `DownloadConsentDialog`, `onConfirm={onConfirmDownloadConsent}`(CG16 동일 호출). `deferred`는 US2에서. 이 컴포넌트는 이 분기에서만 마운트되므로 다른 사용자는 읽지 않는다(CG15). T008 통과.
- [X] T012 [US1] 위반 주입(CG1·CG6·CG7): (a) `consentViewOf`가 `"other"`도 cellular로 보게 치환 → T002 실패, (b) 표준 갈래에서도 `readRemainingBytes`를 부르게 치환 → T006 실패, (c) `withTimeout` fallback 제거 → T006/T002 실패. **치환이 실제 적용됐는지 먼저 단언**하고(prettier로 줄이 합쳐졌을 수 있다), 확인 뒤 원복해 `git diff`가 비어 있는지 본다.

**Checkpoint**: US1 단독으로 모바일 동의가 뜨고 받기가 진행된다(「나중에 받기」는 `onDefer` 미연결이라 버튼만 있음 → US2에서 연결).

## Phase 4: User Story 2 — 「나중에 받기」는 막다른 길이 아니다 (P1)

**Goal**: 아무것도 받지 않고 대기 화면에 머물며, 「다시 확인하기」·전경 복귀로 다시 판정된다. 저장 없음.

**Independent Test**: 모바일 동의 → 「나중에 받기」 → 파일·플래그 변화 없음 → Wi-Fi로 바꾸고 「다시 확인하기」 → 표준 동의.

### Tests (먼저)

- [X] T013 [US2] `__tests__/app/use-consent-gate.test.tsx`에 추가 — CG8(`defer()` → `deferred`, 저장·다운로드 시작 콜백 호출 0), CG9(`deferred`에서 `recheck()` → `reading`을 거쳐 재판정: 이제 wifi면 `standard`, 여전히 cellular면 `cellular`; `AppState active`는 `deferred`일 때만 재판정하고 `cellular`/`standard` 중에는 다시 읽지 않는다 — 읽기 호출 횟수로 단언; 훅 안의 AppState 구독은 `change→active`만 보고 `AppState.currentState`를 판정에 쓰지 않는다 — AGENTS 규칙. `AppState.addEventListener` 스파이를 `mockRestore`하지 않는다).
- [X] T014 [P] [US2] `__tests__/ui/download-deferred-screen.test.tsx` 신규 — CG13(testID `download-deferred`, `download-deferred-recheck` 누르면 `onRecheck` 호출, 모델 식별자·바이트 단위·진행률 어휘 없음; 뒤로 가기(`BackHandler` 모의 발화)에 화면이 유지되고 앱이 닫히지 않음 — FR-008. 모바일 동의에서도 같은 단언을 T007에 둔다).
- [X] T015 [US2] `__tests__/ui/AppFrame.firstrun.test.tsx`에 추가 — CG17(「나중에 받기」 후 `saveOnboardingFlag` 호출 0·다운로드 통로 호출 0·`downloadConsented` 저장 안 됨), 대기 화면 표시, 「다시 확인하기」로 연결이 wifi가 되면 표준 동의, 앱을 새로 마운트하면(재실행 흉내) 처음부터 `reading`.
- [X] T016 [P] [US2] `__tests__/firstrun/consent-gate-source.test.ts` 신규 소스 계약 — CG14(`src/ui/**`가 `network-port`·`readConnection`·`essential-assets`를 import하지 않음), CG18(`src/firstrun/progress.ts`에 `deferred`/`cellular` 어휘 없음 — 단계값 불변), `src/app/use-consent-gate.ts`에 `AppState.currentState` 참조 없음, `onboarding/flag.ts`에 새 필드 없음(`downloadDeferred` 같은 이름 부재).

### Implementation

- [X] T017 [US2] `src/ui/DownloadDeferredScreen.tsx` 신규 — props `onRecheck`, 문구는 `lazyText((c) => c.consentGate.deferred)`, 기존 공용 `Button`/`AppText`/`COLORS` 사용(새 색 없음), testID는 CG13. T014 통과.
- [X] T018 [US2] `src/app/use-consent-gate.ts`의 `defer()`·`recheck()`·`deferred` 전이 완성 + `AppState` 구독(`change→active`이고 현재 `view === "deferred"`일 때만 `recheck`; 구독 해제 정리). 세션 로컬 — 저장 통로를 받지 않는다. T013 통과.
- [X] T019 [US2] `App.tsx`의 `DownloadConsentGate`에 `deferred` 분기와 `onDefer={gate.defer}` 연결. 뒤로 가기는 표준 동의와 같이 아무것도 바꾸지 않는다(FR-008, 새 `BackHandler` 등록 없음). T015·T016 통과.
- [X] T020 [US2] 위반 주입(CG17·CG9): (a) `defer()`가 `onConfirmDownloadConsent`를 부르게 치환 → T015 실패, (b) `cellular` 중에도 `AppState active`에 다시 읽게 치환 → T013 실패. 원복 후 diff 확인.

**Checkpoint**: US1+US2로 두 갈래가 기기 없이 모두 검증됐다.

## Phase 5: User Story 3 — 기존 사용자와 다른 경로는 달라지지 않는다 (P2)

**Goal**: 045·059 계약 무변경.

- [X] T021 [P] [US3] `__tests__/firstrun/progress.test.ts`·`__tests__/ui/download-consent-dialog.test.tsx`(standard 케이스)·`__tests__/app/redownload-plan.test.ts`·`__tests__/app/network-port.test.ts`가 **수정 없이** 통과하는지 `npx jest <파일>`로 확인하고 `git diff --stat`에 이 파일들·`progress.ts`·`flag.ts`·`network-port.ts`·`redownload-plan.ts`가 없음을 확인한다(SC-004, CG18).
- [X] T022 [US3] `__tests__/ui/AppFrame.firstrun.test.tsx`에 회귀 단언 확인/추가 — 이미 동의한 사용자는 모바일 연결이어도 모바일 동의가 안 뜨고 읽기 0회(스펙 US3-2), 설정의 「모듈 다시 받기」 경로는 동의 게이트를 거치지 않음(`onRedownload` 흐름 무변경).

## Phase 6: Polish & 문서

- [X] T023 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)와 `npm test` 전체를 실제로 실행해 통과를 확인한다. 헌법 검사의 화면 문구 규칙(B1)이 새 한글을 잡으면 카탈로그로 옮긴다. `SCREEN_TEXT_ALLOWLIST`에 새 파일을 올리지 않는다.
- [X] T024 [P] `AGENTS.md`에 074 요약 한 단락을 추가한다(기능별 핵심 결론 — 「조용한 결과만」: 모바일 갈래 판정은 `cellular`만, 「나중에 받기」는 세션 로컬, 핫스팟 한계, 045 FR-002a 범위 좁힘). 45의 「[받을게요] 하나뿐」 서술은 덧대지 않고 모바일 갈래 예외를 명시하도록 고친다. 상태 절의 첫 실행 흐름 항목도 함께 갱신. 로드맵은 완료 처리 메모(T035)에서 다룬다.
- [X] T025 [P] `specs/074-wifi-download-consent/quickstart.md`의 실측 표는 T032 이후에만 채운다(지금은 「미확인」 유지).

## Phase 7: 실기기 확인 (⚠️ 시작 전 소유자 확인)

- [X] T030 소유자에게 확인한다 — 기기(`R3CN60JVNCE` / 무선 `192.168.219.112:46409` 중 무엇), 안티그랩 사용 여부, **모델 백업 없이 `pm clear`로 2GB를 지워도 되는지**(Wi-Fi로 다시 받는 것으로 갈음할지). 답 전에는 `adb install`·`pm clear`·Maestro를 실행하지 않는다(읽기 조회 `adb devices`는 가능).
- [X] T031 확인이 나면 dev APK를 설치하고(`adb -s <시리얼> install -r android/app/build/outputs/apk/debug/app-debug.apk`; 필요하면 먼저 빌드), Metro를 dev로 띄워 번들에 `.env.development.local`이 들어갔는지 `curl`로 확인, `adb reverse tcp:8081 tcp:8081`.
- [X] T032 (실측: quickstart 「실측」 절 — 실제 모바일 데이터는 SIM 무서비스로 미확인, 모바일 갈래는 연결 값을 덮어써 화면·흐름 확인) quickstart 시험 순서 1~5를 따라 본다 — Wi-Fi(모달 없음) / 모바일 데이터(모바일 동의, 받을 양 표시) → 「나중에 받기」(파일 없음·`downloadConsented` false 확인 `run-as`) → Wi-Fi 켜고 「다시 확인하기」 → 표준 / 모바일 → 「모바일 데이터로 받기」로 진행 시작만 확인하고 끊기 / 비행기 모드. 각 상태의 `getNetworkStateAsync()` 값을 quickstart 실측 표에 적는다. 못 본 것은 「미확인」. `uiautomator dump`가 이 기기에서 `Killed`이므로 고정 좌표 + `screencap`을 쓴다.
- [X] T033 글꼴 2.0배에서 모바일 동의 버튼 둘이 잘리지 않는지(056 DLG8 교훈) 한 번 본다. 못 보면 「미확인」.
- [X] T034 시험 뒤 기기 상태를 되돌린다(Wi-Fi 켜기, 비행기 모드 끄기) 하고 결과를 소유자에게 보고한다.

## 구현 구간 밖 — 완료 처리 메모 (체크박스 아님, `/speckit-implement`가 실행하지 않는다)

- T035: 로드맵의 「진행 예정 과제」에서 이 과제를 빼고 「완료 이력」 표에 074 한 줄로 옮긴다. 완료 조건 문구를 「앱 닫기」 → 「나중에 받기」로 반영한다. 별도 커밋(소유자 확인 후).

## Dependencies & Execution Order

- Phase 1 → Phase 2(T002→T003, T004·T005 병렬) → US1(T006·T007·T008 병렬 → T009 → T010 → T011 → T012) → US2(T013·T014·T016은 파일이 달라 병렬, T015는 T008 뒤 같은 파일 → T017 → T018 → T019 → T020) → US3(T021·T022 병렬) → Polish(T023 → T024·T025) → 실기기(T030 확인이 선행, 이후 순차).
- US2는 US1의 훅·게이트 컴포넌트 위에 쌓인다(같은 파일 `use-consent-gate.ts`, `App.tsx`).
- 같은 파일을 만지는 태스크는 병렬 아님: `use-consent-gate.test.tsx`(T006→T013), `AppFrame.firstrun.test.tsx`(T008→T015→T022), `App.tsx`(T011→T019).

## Parallel Examples

- Phase 2: T002와 T004·T005
- US1 테스트: T006·T007·T008 (서로 다른 파일)
- US2 테스트: T014·T016은 신규 파일이라 T013·T015와 병렬 (T013은 T006, T015는 T008과 같은 파일 뒤에 추가 — 순차)

## Implementation Strategy

- **MVP = Phase 2 + US1**: 모바일일 때 알리고 고르게 하는 핵심. 단 「나중에 받기」 버튼이 US2 전까지 연결되지 않으므로 US1만 배포하지 않는다 — US1+US2가 한 묶음이다.
- 구현 구간은 T001~T025 후 converge, 실기기는 T030 소유자 확인 뒤.

## 미해결 / 후속 (범위 밖, 기록용)

- 받는 도중 Wi-Fi→모바일 전환, 설정의 「Wi-Fi에서만」 옵션, 핫스팟 Wi-Fi 판별은 후속 과제 후보(로드맵 완료 처리 때 소유자와 정한다).

## Phase 8: Convergence

- [X] T036 `.maestro/unified-permission-onboarding.yml` 151행의 `assertVisible` 정규식(`download-consent-dialog|download-progress-screen|…`)에 `cellular-consent-dialog`를 더한다 — 모바일 데이터인 기기에서는 표준 동의 대신 모바일 동의가 떠 이 흐름이 거짓 실패한다 per FR-001·FR-002 (partial)
- [X] T037 [P] `docs/e2e/feature-flow-map.md`의 `download-consent-flow` 행 전제와 `.maestro/download-consent-flow.yml` 머리 주석에 「Wi-Fi(또는 모바일 데이터가 아닌) 연결이 전제 — 모바일 갈래는 quickstart 074를 사람이 본다」를 적는다. 표와 흐름 파일이 어긋나면 `flow-map.test.ts`가 실패하므로 `npm run test:logic`으로 확인 per SC-005 (partial)
- [X] T038 [P] `.maestro/ios/first-run-to-home.yml` 47행 근처 `when: visible: download-consent-confirm` 블록 옆에 `download-consent-cellular-confirm`을 누르는 같은 모양의 블록을 더한다(시뮬레이터가 모바일로 읽는 경우의 방어 — 호스트 네트워크는 대개 `other`/`wifi`라 평소엔 안 돈다) per FR-005 (partial)
- [X] T039 [P] 설계 문서의 이름 표류를 바로잡는다: `contracts/consent-gate.md` CG5·CG6의 `readRemainingBytes`를 `readSizeLabel`(문자열 통로)로, `data-model.md`·`research.md` R3의 훅 시그니처(`readRemainingBytes`·`formatBytes`)를 구현(`useConsentGate({ readConnection, readSizeLabel })`)에 맞춘다. `spec.md`·`plan.md`는 건드리지 않는다 per plan: Structure Decision (partial)
- [X] T040 T030~T034(실기기 확인)가 여전히 남아 있다 — 소유자 확인 뒤 quickstart 실측 표를 채워야 SC-005가 닫힌다. 못 본 갈래는 「미확인」으로 남긴다 per SC-005 (missing)
