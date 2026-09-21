---
description: "Task list template for feature implementation"
---

# Tasks: 다운로드 진행 화면(캐러셀 + 프로그레스 바) 완성

**Input**: Design documents from `/specs/046-download-progress-carousel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/download-progress-carousel.md, quickstart.md

**Tests**: AGENTS.md 「개발 방식」 — "계약을 먼저 정하고 테스트를 먼저
쓴다(MUST)" — 테스트 태스크를 포함한다.

**Organization**: 4개 User Story(US1~US4, spec.md 순서와 동일)별로 구성.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 의존성 없음)
- **[Story]**: 어느 User Story에 속하는지(US1~US4)
- 파일 경로는 실제 저장소 경로를 그대로 쓴다(예시 placeholder 아님)

## Path Conventions

이 저장소는 단일 프로젝트 구조다(`src/`, `__tests__/` 레포 루트).
`plan.md`의 Project Structure 절 그대로 따른다.

---

## Phase 1: Setup

**Purpose**: 신규 의존성 도입과 네이티브 링크 반영. 이후 모든 User Story의
전제조건.

- [X] T001 `npx expo install react-native-reanimated-carousel
      react-native-gesture-handler`로 `package.json`에 신규 의존성 추가
      (research.md R2 — `react-native-reanimated`·`react-native-worklets`·
      babel 플러그인은 이미 있음, 추가하지 않는다)
- [X] T002 `npx expo prebuild --platform android --clean`으로 네이티브
      링크 반영 (AGENTS.md 「Expo 작업 시」 절 — `--clean` 생략 금지)
- [X] T003 `App.tsx`의 `App` 함수(현재 `SafeAreaProvider`로 `AppFrame`을
      감싸는 부분, App.tsx:117-124)를 `GestureHandlerRootView`
      (`style={{ flex: 1 }}`)로 한 번 더 감싸기 (research.md R3, 공식
      설치 가이드의 앱 루트 1회 래핑 패턴)

**Checkpoint**: `npm run lint`(tsc 포함)가 신규 의존성 타입을 인식하고
통과한다. 이 시점에는 아직 캐러셀 자체를 쓰지 않는다.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 User Story가 공유하는 순수 함수(`progressSegments`)와
기존 계약 확인. 이 phase 없이는 어느 User Story도 시작할 수 없다.

**⚠️ CRITICAL**: 이 phase 완료 전까지 User Story 작업을 시작하지 않는다.

### Tests for Foundational (계약 D1~D3 먼저 작성, FAIL 확인)

- [X] T004 [P] `__tests__/firstrun/consent.test.ts`에 `progressSegments()`
      계약 테스트 추가:
      - D1: 같은 입력에 항상 같은 출력(순수성) — 두 번 호출해 결과 동일
        확인
      - D2: `progressSegments(0.62)` → `[1, 1, 0.48, 0]`(오차 `±0.001`),
        `progressSegments(0)` → `[0,0,0,0]`, `progressSegments(1)` →
        `[1,1,1,1]`, `progressSegments(0.25)` → `[1,0,0,0]`(경계값,
        앞 칸을 완전히 채운 것으로 봄)
      - D3: `progressSegments(1.0000001)` → 각 원소 `[0,1]`로 clamp,
        `progressSegments(-0.1)` → `[0,0,0,0]`
      (테스트 작성 시점엔 `progressSegments`가 없으므로 import 오류로
      FAIL — 정상)

### Implementation for Foundational

- [X] T005 `src/firstrun/consent.ts`에 `progressSegments(fraction: number):
      readonly [number, number, number, number]` 순수 함수 추가
      (data-model.md `ProgressSegments`, contracts D1~D3 — `Date.now()`·
      난수·파일·네트워크 미사용, `essentialDownloadFraction()`을 import
      하지 않고 숫자 하나만 받는다)
- [X] T006 T004의 테스트가 전부 PASS하는지 확인 (`npm run test:logic`)

**Checkpoint**: `progressSegments()`가 계약대로 동작. 이제 US1~US4를
시작할 수 있다.

---

## Phase 3: User Story 1 - 다운로드가 진행되는 동안 계속 넘어가는 이야기
카드를 본다 (Priority: P1) 🎯 MVP 일부

**Goal**: 4장의 카드가 무한 순환하며, 손 스와이프와 4초 자동 전환 둘 다로
넘어간다.

**Independent Test**: 다운로드 완료 여부와 무관하게 이 화면에 진입해
스와이프·자동 전환·무한 순환만 확인하면 검증된다(quickstart.md 3번).

### Tests for User Story 1 (계약 D9 성격 확인 — 렌더 테스트 위주)

- [X] T007 [P] [US1] `__tests__/ui/download-progress-screen.test.tsx`에
      캐러셀 렌더 테스트 추가: `downloadReady: false, failed: false`일 때
      캐러셀 컴포넌트(테스트 가능한 `testID`, 예:
      `download-progress-carousel`)가 렌더되는지, 4장의 카드 데이터
      (045 `SLIDES` 상수)가 그대로 전달되는지 확인 (라이브러리 자체의
      제스처 반응은 jest-expo에서 완전히 검증되지 않음 — 033 선례,
      실기기 검증으로 보완)

### Implementation for User Story 1

- [X] T008 [US1] `src/ui/DownloadProgressScreen.tsx`에서 기존 정적
      슬라이드 렌더 블록(`stage.kind === "slide"`, 현재
      `resolveSlideStage`가 `elapsedMs` 기반 인덱스를 반환하는 부분)을
      `react-native-reanimated-carousel`의 `Carousel` 컴포넌트로 교체:
      `data={SLIDES}`, `loop={true}`, `autoPlay={true}`,
      `autoPlayInterval={SLIDE_INTERVAL_MS}`(기존 4000 상수 재사용),
      `onSnapToItem`으로 현재 인덱스를 화면 로컬 state에 반영 (research
      R1, contracts D9 — 인덱스 산술을 앱이 직접 하지 않는다). **헤더
      (순번/04 표시, 킥커 텍스트 "준비하는 중")·이미지 슬롯·타이틀/본문
      텍스트 블록은 각 카드의 `renderItem` 콜백 내부에 포함한다**(045
      원본 구조 유지 — 이 넷은 슬라이드마다 달라지는 요소이므로 캐러셀
      바깥 고정 오버레이로 빼지 않는다)
- [X] T009 [US1] 헤더의 "01 / 04" 표시를 T008의 로컬 인덱스 state 기반으로
      갱신되도록 연결 (기존 `stage.index` 기반 렌더 로직 대체)
- [X] T010 [US1] `src/firstrun/consent.ts`의 `resolveSlideStage()` 함수를
      **`DownloadProgressScreen.tsx`에서 더 이상 호출하지 않도록 정리한다
      (제거하지 않고 유지)** — 카드 인덱스는 이제 캐러셀 라이브러리
      (`onSnapToItem`)가 낸 값을 신뢰하므로 `elapsedMs` 기반 자동 타이머
      로직(화면의 `useEffect`+`setInterval`)이 불필요해진다(라이브러리의
      `autoPlay`가 대체). **함수 자체와 045 계약 테스트(C6·C7,
      `__tests__/firstrun/consent.test.ts`)는 역사적 기록으로 그대로
      둔다** — 이 문서(046)는 045의 `download-consent-gate.md`를
      대체하지 않으므로, 그 계약이 검증하는 대상(함수의 순수성·경계값
      동작)은 여전히 유효한 채로 남는다. 미사용 함수 lint 경고가 뜨면
      `export`를 유지해 억제한다(다른 소비자가 생길 수 있는 유틸리티
      함수 취급)
- [X] T011 [US1] T007 테스트가 PASS하는지 확인, 필요 시
      `resolveSlideStage` 제거로 깨지는 기존 테스트(045
      `consent.test.ts`의 C6·C7 관련 케이스) 정리 — 단, D1~D3(T004)
      테스트는 그대로 유지

**Checkpoint**: 캐러셀이 무한 순환하며 스와이프·자동 전환 둘 다 동작.
프로그레스 바는 아직 정적(US2에서 연결).

---

## Phase 4: User Story 2 - 다운로드가 실제로 얼마나 진행됐는지 눈으로
확인한다 (Priority: P1) 🎯 MVP 일부

**Goal**: 4분할 프로그레스 바가 실제 `essentialDownloadFraction()` 값을
반영하고, 채워지는 칸에 애니메이션이 있으며, 캐러셀 전환과 무관하게
유지된다.

**Independent Test**: 다운로드 진행 중 프로그레스 바만 관찰해 퇴행 없음·
카드 전환 무관·완료 시 4칸 전부 채움을 확인하면 검증된다(quickstart.md
4번).

### Tests for User Story 2 (계약 D4 — 구간 독립성)

- [X] T012 [P] [US2] `__tests__/ui/download-progress-screen.test.tsx`에
      프로그레스 바 렌더 테스트 추가: `downloadFraction` prop(신규,
      T013에서 추가)에 `0.62`를 주면 4개 구간 뷰의 채움 정도(예: 각 구간
      뷰의 `style.width` 또는 접근 가능한 진행률 속성)가 T005의
      `progressSegments(0.62)` 결과와 일치하는지 확인
- [X] T013 [P] [US2] 같은 테스트 파일에 D4 계약 테스트 추가: 캐러셀
      `onSnapToItem`을 시뮬레이션해 카드 인덱스를 바꿔도(fireEvent 또는
      prop 재전달) `downloadFraction`이 그대로면 진행 바 렌더 결과가
      변하지 않는지 확인

### Implementation for User Story 2

- [X] T014 [US2] `DownloadProgressScreenProps`에 `downloadFraction: number`
      prop 추가(0~1, `App.tsx`가 041/029 기존 `essentialAssets
      .downloadEssentials(onProgress)` 콜백에서 받는 값을 그대로 전달 —
      새 계산 로직 없음, 기존 콜백 값을 화면까지 흘려보내기만 함)
- [X] T015 [US2] `App.tsx`의 다운로드 진행 콜백(현재 "진행률 값을 받지만
      쓰지 않는다"로 주석 처리된 부분, App.tsx:406-410)을 수정해 받은
      fraction을 state로 저장하고 `DownloadProgressScreen`에
      `downloadFraction`으로 전달
- [X] T016 [US2] `DownloadProgressScreen.tsx`에서 T005의
      `progressSegments(downloadFraction)`을 호출해 4개 구간 뷰의 채움
      정도를 계산, 기존 정적 `PROGRESS_BAR_ROW`/`BAR_SEGMENT` 렌더를
      이 값 기반으로 교체(구간 인덱스 `0..3` 순회, 각 구간은 캐러셀
      인덱스 state와 독립된 별도 값만 참조 — contracts D4)
- [X] T017 [US2] `react-native-reanimated`의 `useAnimatedStyle`+
      `withTiming`으로 현재 채워지는 중인 구간(값이 `0`도 `1`도 아닌
      구간)의 폭에 애니메이션 적용(research R5, 033의 `scale 0.97`
      패턴과 동일한 방식)
- [X] T018 [US2] T012·T013 테스트가 PASS하는지 확인

**Checkpoint**: 프로그레스 바가 실제 다운로드 진행률을 반영하고 캐러셀
전환에 영향받지 않는다. US1+US2로 MVP(정상 경로 핵심) 완성.

---

## Phase 5: User Story 3 - 다운로드가 끝나면 확인하고 다음으로 넘어간다
(Priority: P2)

**Goal**: 완료 시 캐러셀 대신 완료 뷰, 버튼을 눌러야 다음 화면으로.

**Independent Test**: `downloadReady: true`로 진입해 완료 뷰·버튼 동작만
확인하면 검증된다(quickstart.md 5번). **기존 045 구현이 이미 이 계약
(D5)을 충족하므로 이 phase는 회귀 확인 위주다.**

### Tests for User Story 3 (기존 테스트 유지 확인)

- [X] T019 [US3] 기존 `__tests__/ui/download-progress-screen.test.tsx`의
      "FR-007 — 완료 화면(downloadReady: true)" describe 블록(완료 뷰
      렌더, `onProceed` 콜백 1회 호출)이 T008~T017의 캐러셀·프로그레스
      바 변경 이후에도 그대로 PASS하는지 확인 — FAIL 시 T008의 캐러셀
      교체가 완료 뷰 분기(`if (stage.kind === "complete")` 또는 그
      대체 조건)를 건드렸다는 뜻이므로 원인을 좁혀 수정

### Implementation for User Story 3

- [X] T020 [US3] `DownloadProgressScreen.tsx`에서 완료 뷰 분기 조건을
      `downloadReady === true`(캐러셀 라이브러리의 상태와 무관하게 이
      prop 하나로 판정)로 명시적으로 유지 — T010에서 `resolveSlideStage`를
      제거했으므로 이 분기가 그 함수에 의존하지 않도록 재확인
- [X] T021 [US3] `App.tsx`의 `downloadProceedConfirmed` 게이트(045가
      만든 것, App.tsx 주변)가 T014~T017 변경 이후에도 그대로 동작하는지
      코드 리뷰로 확인(완료 뷰의 버튼을 누르기 전까지 `firstRunStage`가
      `"naming"`으로 안 바뀌는지)

**Checkpoint**: 완료 게이트 회귀 없음 확인.

---

## Phase 6: User Story 4 - 다운로드가 멈춰도 사용자가 손 쓸 필요가 없다
(Priority: P2)

**Goal**: 실패해도 화면 레이아웃 유지, 안내 문구만 교체, 10초 간격 자동
재시도.

**Independent Test**: 다운로드 중 네트워크를 끊어 레이아웃 유지·자동
재시도·복구 후 완료 도달을 확인하면 검증된다(quickstart.md 6번).

### Tests for User Story 4 (계약 D6~D8 — 기존 실패 뷰 테스트 교체)

- [X] T022 [US4] 기존 `__tests__/ui/download-progress-screen.test.tsx`의
      "FR-011 — 실패 시 재시도 뷰" describe 블록 전체를 제거(전용
      `download-progress-failed` 뷰·`onRetry` prop 관련 테스트 4건 —
      더 이상 유효하지 않은 계약)
- [X] T023 [P] [US4] 같은 파일에 신규 describe 블록 추가 — 계약 D6·D7:
      `failed: true`일 때도 캐러셀·프로그레스 바 `testID`가 그대로
      렌더되는지(레이아웃 유지), 진행 바 하단 안내 텍스트만 실패 문구로
      바뀌는지, 그 문구에 오류 원문·모델 식별자가 없는지(기존 CODE 정규식
      검사 패턴 재사용)
- [X] T024 [P] [US4] 같은 파일에 계약 D8 테스트 추가 — 소스 검사:
      `DownloadProgressScreenProps` 타입에 `onRetry` 필드가 없는지
      확인(정규식 또는 필드 집합 비교, 기존 "props 시그니처" describe
      블록의 패턴 재사용 — 이제 `{downloadReady, downloadFraction,
      onProceed, failed}` 4개만 있어야 함)
- [X] T025a [P] [US4] `find __tests__ -iname "*app*"`으로 `App.tsx`
      전용 기존 테스트 파일이 있는지 확인하고, T025의 정확한 파일 경로를
      확정한다(있으면 그 파일에 추가, 없으면 `__tests__/app/download-
      retry.test.ts` 신규 생성) — 이 태스크의 산출물은 T025가 쓸 확정
      경로 하나
- [X] T025 [US4] T025a에서 확정한 경로에 자동 재시도 타이머 테스트 추가
      — **실제로는 `__tests__/ui/AppFrame.firstrun.test.tsx`(기존 App.tsx
      소스 검사 계약 테스트 파일, T025a가 찾은 것과 다른 기존 파일)에
      추가했다.** 이유: `App.tsx`는 새 네이티브 통로를 여럿 직접 import해
      이 파일 상단 주석이 이미 "전체 렌더가 어렵다"고 명시하고, jest fake
      timers로 실제 `setTimeout` 실행을 검증하려면 `App.tsx`를 렌더해야
      하는데 그것이 이 파일의 확립된 관례(006·021·029·040·045)와 어긋난다.
      대신 소스 검사로 (1) `DOWNLOAD_RETRY_INTERVAL_MS = 10_000` 상수
      존재, (2) `downloadFailed`에 반응하는 `useEffect`가
      `setTimeout`+상수+`essentialDownloadStarted.current = false`+
      `setDownloadFailed(false)`+`setDownloadRetryToken` 갱신+
      `clearTimeout` cleanup을 전부 갖는지, (3) `onRetry` prop을 더 이상
      넘기지 않는지(D8)를 확인했다

### Implementation for User Story 4

- [X] T026 [US4] `DownloadProgressScreen.tsx`에서 기존
      `download-progress-failed` 전용 뷰(early return 블록)를 제거,
      `onRetry` prop을 `DownloadProgressScreenProps`에서 제거
- [X] T027 [US4] 같은 파일에서 진행 바 하단 안내 텍스트(`PROGRESS_TEXT`
      상수 렌더 위치)를 `failed` prop에 따라 "받는 중이에요" 또는
      실패 안내 고정 문구(오류 원문 미포함)로 조건부 렌더(contracts D6·
      D7 — 레이아웃 트리 자체는 바뀌지 않음)
- [X] T028 [US4] `App.tsx`에서 사용자 트리거 `onRetryDownload`(기존
      `essentialDownloadStarted.current`를 리셋하던 콜백)를
      `DownloadProgressScreen`에 더 이상 넘기지 않고, 대신
      `downloadFailed === true`인 동안 10초 간격 `setInterval`로
      `essentialDownloadStarted.current`를 리셋 + 재시도를 스스로
      트리거하는 `useEffect`로 교체(research R6 — 재시도 로직은 조립
      계층에 둔다)
- [X] T029 [US4] T022~T025(T025a 포함) 테스트가 전부 PASS하는지 확인

**Checkpoint**: 실패해도 레이아웃 유지, 자동 재시도로 사용자 개입 없이
복구.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 전체 회귀 확인과 실기기 검증.

- [X] T030 `npm run lint`(eslint + tsc + 헌법 검사 + prettier) 전체 클린
      확인 — 특히 `tsc`가 `onRetry` 제거로 인한 `App.tsx` 쪽 타입
      불일치를 전부 잡아내는지
- [X] T031 `npm test`(전체 스위트) 통과 확인
- [ ] T032 quickstart.md의 실기기 검증 6단계(캐러셀·프로그레스 바·완료·
      실패/자동재시도)를 dev debug 빌드로 수행(AGENTS.md 원칙 V — 새
      네이티브 링크 모듈 도입이므로 필수)
- [ ] T033 [P] 기존 Maestro 흐름(`unified-permission-onboarding.yml` 등
      온보딩 관련) 회귀 확인 — `GestureHandlerRootView` 추가가 다른
      화면의 터치 조작에 영향 없는지
- [X] T034 로드맵 문서(`docs/roadmap/README.md`)에 이번 작업 결과 반영
      (045 항목 갱신 또는 신규 046 항목 추가, 저장소 관례 — 043~045가
      각자 로드맵에 결과를 기록한 패턴 계승)
- [X] T035 FR-001 회귀 확인: 코드 리뷰 완료(App.tsx:421-427). 트리거
      조건(`!permissionStepsDecided` → return, `downloadConsented !==
      true` → return, `essentialsReady`가 이미 준비/미조회 → return,
      `essentialDownloadStarted.current` → return, 그 외엔 즉시
      `essentialDownloadStarted.current = true` + `downloadEssentials()`
      호출)이 T014·T015 변경 전후로 **동일**함을 확인 — 바뀐 것은 진행률
      콜백 본문(`setDownloadFraction(fraction)` 추가)뿐이고 시작 조건·
      타이밍 자체는 무변경. FR-001 회귀 없음. 실기기 검증(T032)에서
      "동의 확인 직후 지체 없이 다운로드가 시작되는지"를 관찰 항목에
      포함한다

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음, 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 — 모든 User Story를 막는다
- **User Story 1·2 (Phase 3·4)**: Foundational 완료 후 시작 가능. **US2는
  US1이 만든 캐러셀 인덱스 state와 독립적이지만, 같은 파일
  (`DownloadProgressScreen.tsx`)을 수정하므로 병렬 작업 시 병합 충돌
  위험 — 순차 권장(US1 → US2)**
- **User Story 3 (Phase 5)**: US1·US2 완료 후(같은 파일의 완료 뷰 분기가
  그 변경들과 공존해야 하므로) — 회귀 확인 성격
- **User Story 4 (Phase 6)**: US1·US2·US3 완료 후(같은 파일의 실패 분기가
  캐러셀·프로그레스 바 렌더와 공존해야 함)
- **Polish (Phase 7)**: 모든 User Story 완료 후

### User Story 간 관계

이 기능은 spec.md에서 이미 밝혔듯 4개 User Story가 **같은 화면 파일 하나**
(`DownloadProgressScreen.tsx`)의 서로 다른 관심사(캐러셀/진행바/완료/실패)를
다룬다 — 일반적인 speckit 프로젝트처럼 독립된 모델·서비스로 분리되지 않는다.
따라서 "병렬 팀 전략"보다 **US1 → US2 → US3 → US4 순차 구현**을 권장한다
(각 phase 완료 시점마다 checkpoint에서 독립적으로 테스트 가능한 것은
spec.md의 Independent Test 기준 그대로 유지됨).

### Within Each User Story

- 테스트를 먼저 작성해 실패를 확인한다(AGENTS.md 개발 방식) → 구현 → 테스트
  통과 확인
- Foundational의 순수 함수(T005) 없이는 US2가 시작 불가

### Parallel Opportunities

- T001(의존성 설치)과 T003(GestureHandlerRootView 배선)은 서로 다른
  관심사이나 T002(prebuild)가 T001 이후·T003 적용 이전이어야 하므로 실질
  순차 — [P] 표시 없음
- T023·T024·T025a는 서로 다른 검증 축(레이아웃 유지/props 시그니처/파일
  경로 확인)이라 병렬 작성 가능. T025는 T025a 완료 후 순차 진행
- T033(Maestro 회귀)은 T030~T032와 독립적으로 준비 가능

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료(`progressSegments` 순수 함수)
3. Phase 3: US1(캐러셀 무한 순환) 완료 → 독립 검증
4. Phase 4: US2(프로그레스 바 실제 반영) 완료 → 독립 검증
5. **여기서 멈추면**: 사용자가 처음 지적한 핵심 증상("정적 화면", "진행이
   안 느껴짐")이 이미 해소된다

### Incremental Delivery

1. Setup + Foundational → 기반 완성
2. US1 → 캐러셀이 살아 움직임 확인
3. US2 → 진행 바가 정직하게 진행 상태를 보여줌 확인(MVP 완성)
4. US3 → 완료 게이트 회귀 없음 확인
5. US4 → 실패해도 매끄러움 확인
6. Polish → 실기기 검증 + 회귀 확인 + 로드맵 기록

---

## Notes

- [P] 태스크 = 다른 파일 또는 서로 다른 검증 축, 의존성 없음
- 태스크 완료마다 또는 논리적 묶음마다 커밋(AGENTS.md — 커밋 메시지
  한국어, `main` 직접 작업 금지, 이미 `046-download-progress-carousel`
  브랜치에서 작업 중)
- 각 phase의 Checkpoint에서 해당 User Story를 독립적으로 검증하고 다음
  phase로 넘어간다
- 피할 것: 같은 파일(`DownloadProgressScreen.tsx`)을 여러 User Story가
  동시에 병렬 수정 — 병합 충돌과 계약 회귀(D4·D5·D6 상호 간섭) 위험

---

## Phase 8: Convergence

- [X] T036 `src/ui/DownloadProgressScreen.tsx` 상단 docstring(라인 18
      부근, "카드 전환은 이제 `react-native-reanimated-carousel`이
      맡는다" 문단)의 `autoPlay`+`autoPlayInterval`(camelCase) 표기를
      실제 코드가 쓰는 `autoplay`+`autoplayInterval`(lowercase)로
      정정한다 — research.md R2가 이미 이 API 표기 정정을 기록했으나
      소스 docstring에는 반영되지 않았다(partial)
