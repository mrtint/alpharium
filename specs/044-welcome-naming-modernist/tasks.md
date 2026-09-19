# Tasks: Modernist 디자인 시스템 적용 2차 — 첫 만남 및 캐릭터 작명

**Input**: Design documents from `specs/044-welcome-naming-modernist/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md

**Tests**: 이 저장소는 계약 테스트를 먼저 쓰는 관례(AGENTS.md "개발 방식")를
따른다. 이번 스펙은 기존 계약 테스트(`__tests__/ui/welcome-screen.test.tsx`)를
**그대로 통과시키는 것이 목표**다 — `testID`·prop 조회 기반이라 시각 변경과
무관하게 유지되어야 한다(research.md R5). 새 계약 테스트는 이번 스펙에서
바뀌는 시각 세부(레이아웃 구분, 스타일 값)를 위해서만 추가한다.

**Organization**: User Story 1(작명 화면 시각)과 User Story 2(이름 입력·
건너뛰기 동작)는 같은 파일(`WelcomeScreen.tsx`)의 같은 `welcome` phase
블록을 다루므로 함께 구현한다. User Story 3(checking/failed 시각)은 독립된
블록이라 이어서 별도 처리한다.

## Phase 1: Setup

*(해당 없음 — 새 프로젝트 초기화나 의존성 추가가 없다. 043이 이미 토큰·
컴포넌트를 완성해 두었다.)*

## Phase 2: Foundational

**Purpose**: 이번 스펙이 의존하는 043 산출물이 실제로 이 브랜치에 존재하고
정상 동작하는지 먼저 확인한다 — 없으면 이후 태스크가 잘못된 기반 위에서
진행된다.

- [X] T001 `git log --oneline -- src/ui/theme/tokens.ts src/ui/LogoScreen.tsx`
      등으로 043이 이 브랜치에 병합되어 있는지 확인하고, `npm run
      test:logic`으로 `__tests__/theme-tokens.test.ts`(DT1~DT7)가 이미
      통과 상태인지 확인한다(043 산출물 재검증, 새로 만들 것 없음).
- [X] T002 `npm run test:ui`로 기존 `__tests__/ui/welcome-screen.test.tsx`
      전체가 **재작성 전** 현재 상태에서 통과하는지 확인해 베이스라인을
      남긴다(재작성 후 회귀 여부를 판단할 기준점).

**Checkpoint**: 043 토큰·컴포넌트가 준비되어 있고 기존 계약 테스트
베이스라인을 확인했다 — 이제 화면 재작성을 시작할 수 있다.

---

## Phase 3: User Story 1 - 새로 깨어난 캐릭터가 Modernist 화면으로 인사한다 (Priority: P1)

**Goal**: 작명 화면(`welcome` phase)이 043과 같은 오프화이트 배경 위에
굵은 타이포그래피·레드 액센트로 표시된다.

**Independent Test**: 작명 화면 진입 → 배경색·텍스트 굵기·버튼 스타일이
043 팔레트와 일치하는지 육안 확인(quickstart.md D1).

### Tests for User Story 1

- [X] T003 [P] [US1] `__tests__/ui/welcome-screen.test.tsx`에 새 describe
      블록을 추가한다 — 작명 화면 컨테이너(`welcome-greeting`)가 렌더될
      때 제목 텍스트에 적용된 스타일이 `TYPE`(굵은 타이포그래피 토큰,
      `src/ui/theme/tokens.ts`의 기존 `TYPE.title` 등)을 사용하는지,
      배경색이 `COLORS.bg`인지 소스 검사(`readFileSync` + 정규식,
      007 이후 관례)로 확인한다(FR-001, SC-001). 원칙 III·IV 관련 기존
      테스트(W13·L15, FR-005)는 건드리지 않는다.

### Implementation for User Story 1

- [X] T004 [US1] `src/ui/WelcomeScreen.tsx`의 `welcome` phase 블록을
      리뷰 보드 `1a` 레이아웃(research.md R2)에 맞춰 재작성한다 — 좌측
      정렬 세로 스택: 굵은 제목(`AppText variant="title"` 유지, 스타일만
      확대) → 본문 → 구분선(새 `View` 요소, `COLORS.border` 배경 2px
      높이) → 이름 프롬프트(`bodyStrong` variant 유지) → 이름 입력줄
      (밑줄 스타일로 `INPUT` 상수 조정 — 테두리 전체 대신 하단 테두리만,
      `COLORS.text` 색 2px, maxLength 12는 FR-004에 따라 무변경) → 힌트
      캡션 → 하단 버튼 2개 가로 배치(`flexDirection: "row"`, 건너뛰기
      좌측·확정 우측). 기존 `testID` 10개(research.md R5, FR-009)는 전부
      그대로 유지한다. `WelcomeScreenProps` 시그니처는 한 글자도 바꾸지
      않는다(FR-003). 화면은 여전히 `src/welcome/`을 import하지 않는다
      (FR-008).
- [X] T005 [US1] 같은 파일 하단의 스타일 상수(`CONTAINER`, `SECTION`,
      `INPUT` 등)를 T004의 새 레이아웃에 맞게 조정한다 — 색은 반드시
      `COLORS.*`에서만 가져오고 새 하드코딩 hex 값을 추가하지 않는다
      (FR-001, 043과 같은 제약).
- [X] T006 [US1] `npm run test:ui`로 T003에서 추가한 테스트와 기존
      `welcome-screen.test.tsx` 전체(W11~W16, FR-012~FR-014)가 통과하는지
      확인한다. 실패하면 T004로 돌아가 구조를 조정한다(`testID`는
      건드리지 않는다).

**Checkpoint**: 작명 화면의 시각 레이어가 Modernist로 바뀌었고 기존 계약이
전부 통과한다 — User Story 1은 독립적으로 완성됐다.

---

## Phase 4: User Story 2 - 이름을 짓거나 건너뛴다 (Priority: P1)

**Goal**: 이름 입력→확정, 건너뛰기, 12자 상한, 빈 입력 방지가 새 레이아웃
에서도 기존과 동일하게 동작한다.

**Independent Test**: 이름 입력→확정 경로와 건너뛰기 경로 둘 다 눌러보며
기존과 같은 결과가 나오는지 확인(quickstart.md D2~D4).

### Tests for User Story 2

*(해당 없음 — 이 스토리가 검증하는 동작은 전부 기존
`__tests__/ui/welcome-screen.test.tsx`의 "FR-012 — 빈 입력·공백만은
확정할 수 없다"·"FR-013 — 글자 수 상한"·"W11" describe 블록이 이미
덮는다. T004에서 로직을 건드리지 않았다면 이 테스트들은 수정 없이
통과해야 한다 — Phase 3의 T006이 이미 이것을 확인한다.)*

### Implementation for User Story 2

- [X] T007 [US2] T004에서 재작성한 버튼 영역이 기존 `canSubmit` 상태
      (빈 입력·공백 시 비활성)와 `onSubmitName`/`onSkip` 콜백 연결을
      그대로 유지하는지 코드 리뷰로 재확인한다 — 새 레이아웃(가로 배치)
      으로 바뀌어도 `Button`의 `disabled` prop과 `onPress` 핸들러
      배선은 변경되지 않아야 한다. 별도 파일 변경 없음(T004 산출물
      확인 태스크).
- [X] T008 [US2] `npm run test:ui`로 "FR-012"·"FR-013"·"W11" describe
      블록이 새 레이아웃에서도 통과하는지 재확인한다(T006과 중복되지
      않도록 이번엔 특히 `fireEvent.changeText`/`fireEvent.press`
      시나리오에 집중).

**Checkpoint**: 이름 입력·건너뛰기·상한 동작이 새 시각 레이어 위에서도
그대로 살아있다 — User Story 1+2가 합쳐진 작명 화면 전체가 완성됐다.

---

## Phase 5: User Story 3 - 확인 중이거나 실패했을 때도 같은 시각 언어를 본다 (Priority: P2)

**Goal**: `checking`/`failed` phase가 043 `LogoScreen`과 같은 중앙 정렬
미니멀 레이아웃으로 표시되어 작명 화면과 시각적으로 구분된다.

**Independent Test**: 확인 중 상태와 실패 상태를 재현해 로딩 표시·실패
안내·버튼이 중앙 정렬 Modernist 스타일로 보이는지 확인(quickstart.md D5).

### Tests for User Story 3

- [X] T009 [P] [US3] `__tests__/ui/welcome-screen.test.tsx`에 새 describe
      블록을 추가한다 — `checking`/`failed` 컨테이너의 스타일이 중앙
      정렬(`alignItems: "center"`, `justifyContent: "center"` 계열)이고
      `welcome-greeting`(좌측 정렬)과 다른 스타일 객체를 쓰는지 소스
      검사로 확인한다(FR-002, SC-001). 기존 W11("checking에도 화면이
      멈추지 않는다")·W16("실패 화면에 오류 사유 없음", FR-006) 테스트는
      그대로 둔다.

### Implementation for User Story 3

- [X] T010 [US3] `src/ui/WelcomeScreen.tsx`의 `checking`/`failed` phase
      블록을 중앙 정렬 레이아웃으로 재작성한다(research.md R3, FR-002) —
      카드·테두리 없이 `ActivityIndicator`(또는 기존 로딩 표시, 진행률
      수치 없음 — FR-007)와 안내 문구가 화면 중앙에 배치된다. `failed`
      블록의 [다시 시도]/[그냥 시작하기] 버튼도 같은 중앙 정렬 컨테이너
      안에 세로로 쌓는다(막다른 길 없음, W11·FR-006 유지, 오류 사유
      미노출 — FR-006). 기존 `testID`(`welcome-checking`, `welcome-failed`,
      `welcome-retry`, `welcome-failed-skip`, FR-009)는 그대로 유지한다.
- [X] T011 [US3] `npm run test:ui`로 T009 신규 테스트와 기존
      "W12 — 세 phase가 각각 다른 것을 그린다"·"W16" describe 블록이
      전부 통과하는지 확인한다.

**Checkpoint**: 세 phase 전부가 Modernist 시각 언어로 통일됐고, 작명
화면과 확인/실패 화면이 레이아웃으로 명확히 구분된다.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 회귀 확인과 실기기 검증.

- [X] T012 `npm test`(전체 스위트, `npm run test:ui` + `npm run
      test:logic`)를 돌려 이번 스펙이 건드리지 않은 다른 화면(043의
      `LogoScreen`·`OnboardingScreen` 등)에 회귀가 없는지 확인한다.
- [X] T013 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 돌려
      `checkSourceFile`의 `UI_TOUCHES_WELCOME` 규칙(FR-008) 위반이 없는지,
      타입 오류가 없는지 확인한다.
- [X] T014 실기기(dev/debug, SM 기기)에서 quickstart.md D1~D5 수행 완료
      (2026-09-19). **D1**: 작명 화면이 오프화이트 배경·좌측 정렬·굵은
      제목·구분선·밑줄 입력줄·가로 버튼 배치로 정확히 렌더됨(SC-001).
      **D2**: 이름 입력 후 확정 버튼이 레드 액센트로 활성화, 탭 시
      `checking` phase로 정상 전환. **D3**: 건너뛰기 탭 시 기본 이름으로
      다음 단계(045 범위 다운로드 대기 화면) 진행. **D4**: 16자 입력 시
      정확히 12자("ABCDEFGHIJKL")에서 잘림(FR-004). **D5**: `checking`
      phase가 043 `LogoScreen`과 같은 중앙 정렬 미니멀 레이아웃(레드
      `ActivityIndicator` + 중앙 텍스트, 카드·테두리 없음)으로 렌더되어
      작명 화면과 시각적으로 명확히 구분됨 — liveness 통과 후 막다른 길
      없이 일기 탭(`done`)까지 정상 도달. `failed` phase는 인위적 유도가
      어려워 육안 확인은 생략했다(040도 같은 이유로 미확인 — W16 계약
      테스트로 갈음).
- [X] T015 `.maestro/welcome-naming.yml`을 실기기에서 실행(2026-09-19,
      `JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8`). **이 흐름은 애초에
      `WelcomeScreen`(작명 화면) 자체가 아니라 설정 탭의 `AuthorPicker`
      이름 편집만 검증한다**(흐름 상단 주석 — "첫 실행 환영 연출(US1)은
      사람이 한다"). 실행 결과 `author-rename-input-0` 단계에서 실패했으나,
      원인은 AGENTS.md에 이미 기록된 **기존 결함**(035 실측 — "Maestro가
      NativeWind로 이관된 `Pressable`의 좌표를 잘못 본다", `scrollUntilVisible`
      이 시간대 선택 그리드의 엉뚱한 좌표를 대신 탭함)이지 044의 회귀가
      아니다 — `git diff`로 044가 `AuthorPicker.tsx`를 전혀 건드리지
      않았음을 확인했다. raw-adb로 `author-rename-input-0`가 실제로는
      존재하고 텍스트 입력이 정상 동작함을 확인해(스크린샷: 편집기에
      "금동이TEST1" 등 정상 반영) 이 흐름의 실패가 044와 무관함을
      재확인했다. AGENTS.md가 이미 이 결함을 "계약 테스트
      (`author-picker.test.tsx` W18·W19)와 실기기 raw-adb 검증으로
      대체했다"고 명시한 대로, 이 Maestro 흐름의 실패는 044의 완료
      조건이 아니다(FR-009는 `WelcomeScreen`의 `testID`가 044에서
      바뀌지 않았다는 것만 요구하며, research.md R5로 이미 확인됨).

**결과**: 모든 태스크가 끝나면 spec.md의 SC-001~SC-003이 전부 충족된다.

## Dependencies & Execution Order

- Phase 2(Foundational)는 Phase 3~5보다 먼저 끝나야 한다(043 산출물
  존재 확인, 베이스라인 확보).
- Phase 3(US1)과 Phase 4(US2)는 같은 파일의 같은 블록을 다루므로 사실상
  순차 진행(T004 이후 T007~T008) — `[P]` 마킹은 테스트 작성(T003)에만
  붙는다.
- Phase 5(US3)는 Phase 3~4와 다른 코드 블록(`checking`/`failed` vs
  `welcome`)을 다루므로 이론적으로 병렬 가능하나, 같은 파일이라 실제
  구현은 순차 편집을 권장한다(충돌 방지).
- Phase 6(Polish)은 모든 User Story 완료 후 진행한다.

## Parallel Execution Examples

```text
# Phase 3 테스트 작성과 Phase 5 테스트 작성은 서로 다른 describe 블록이라
# 병렬로 작성 가능하다(같은 파일에 추가하지만 내용이 독립적):
T003 [P] [US1]  # welcome phase 스타일 검사
T009 [P] [US3]  # checking/failed phase 스타일 검사
```

## Implementation Strategy

**MVP = User Story 1 + User Story 2** (Phase 3+4, 작명 화면 전체) — 이
둘은 같은 화면 블록이라 사실상 하나의 완성 단위다. User Story 3
(checking/failed)은 자주 보이지 않는 화면이라 P2로 분리했지만, 파일이
하나뿐이므로 실제 구현에서는 세 스토리를 한 번의 편집 세션에서 함께
끝내는 것이 효율적이다 — Phase 구분은 "무엇을 먼저 검증할 것인가"의
우선순위이지 별도 커밋 단위를 강제하지 않는다.
