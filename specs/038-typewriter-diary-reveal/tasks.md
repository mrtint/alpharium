---
description: "Task list for 038-typewriter-diary-reveal"
---

# Tasks: 완성된 일기 첫 표시를 타자기 연출로

**Input**: Design documents from `/specs/038-typewriter-diary-reveal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 포함한다 — 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저
쓴다"를 MUST로 정한다.

**Organization**: 세 User Story가 모두 P1이고 같은 코어(`TypewriterText` +
`DiaryDetailScreen.reveal`)를 공유한다. Phase 2(Foundational)가 코어를 만들고,
각 Story Phase는 해당 시나리오의 계약 테스트 + 실기기 확인 슬라이스다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 미완 태스크 의존 없음 → 병렬 가능
- **[Story]**: US1/US2/US3 (Setup·Foundational·Polish는 라벨 없음)
- 모든 태스크에 정확한 파일 경로

## Path Conventions

- 모바일 단일 저장소. `src/ui/` 안에서 완결. `__tests__/` 는 저장소 루트.

---

## Phase 1: Setup

**Purpose**: 브랜치·상수 자리 확인. 새 의존성 없음.

- [ ] T001 `git branch --show-current`로 `038-typewriter-diary-reveal` 브랜치 확인 (스펙킷 `BRANCH:` 필드 아님, AGENTS.md 경고)
- [ ] T002 `src/ui/theme/tokens.ts`에 `REVEAL = { charMs: 15 } as const` 추가 (033 `PRESS` 상수 바로 아래, data-model.md §4). JSDoc에 "사람이 정한 값·화면 미노출" 명시
- [ ] T003 [P] `__tests__/ui/theme/` 또는 기존 `theme-tokens.test.ts`에 `REVEAL.charMs`가 양수 상수임을 잠그는 한 줄 추가

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `graphemeSlice` 유틸 + `TypewriterText` 컴포넌트. 세 Story 전부의
선행 조건. 완료 시 세 Story의 계약 테스트가 붙을 대상이 존재한다.

### 순수 유틸 (test:logic)

- [ ] T004 [P] `__tests__/ui/text/grapheme-slice.test.ts` 작성 (RED) — contracts/typewriter-text.md G1~G7. `.ts` 파일, node 환경. 한글 NFC·이모지 서로게이트·음수·초과·빈 문자열·round-trip
- [ ] T005 `src/ui/text/grapheme-slice.ts` 구현 — `graphemeUnits`(=`Array.from`)·`graphemeSlice`(clamp + slice + join)·`graphemeLength`. 새 의존성 없음. T004 GREEN
- [ ] T006 위반 주입 확인 — `graphemeSlice`가 `text.slice(0, n)`을 쓰도록 임시 변경 → G2·G5 FAIL 확인 → 되돌림

### 표시 컴포넌트 (test:ui)

- [ ] T007 [P] `__tests__/ui/typewriter-text.test.tsx` 작성 (RED) — contracts/typewriter-text.md C1~C9 + C-TYPO. `charMs`는 임의 양수(예: 10) 주입(A1). `jest.useFakeTimers()` + `act(() => jest.advanceTimersByTime())`. RNTL 14 규칙(`await render`/`fireEvent`, `screen.*`)
- [ ] T008 `src/ui/components/TypewriterText.tsx` 구현 — props `{ text, charMs, skipToEnd, onDone, variant?: TextVariant, style?, testID? }`. `variant` 기본 `"body"`, `variant`·`style`을 `<AppText>`에 그대로 위임(C-TYPO, I1). `useState` 노출 카운터 + `useEffect` 타이머, `graphemeSlice`로 렌더, `skipToEnd` 처리, `onDone` 1회 가드, `text` 교체 리셋, 언마운트 정리, `text === ""` 즉시 `onDone`. 모델·도메인 import 0. T007 GREEN
- [ ] T009 위반 주입 확인 — (a) `skipToEnd` 분기 삭제 → C4 FAIL, (b) `onDone` 중복 가드 삭제 → C8 FAIL, (c) 언마운트 `clearTimeout` 삭제 → C6 FAIL. 각각 되돌림
- [ ] T010 [P] `TypewriterText.tsx` 소스 검사 테스트 — C9(`charMs`가 JSX 텍스트로 안 나옴, `Date`/`Date.now`/`performance` 토큰 없음). `readFileSync` + 주석 제거 관용구(AGENTS.md)

**Checkpoint**: `npm run test:logic`·`npm run test:ui` GREEN. `TypewriterText`·
`graphemeSlice`가 독립적으로 검증됨.

---

## Phase 3: User Story 1 — 생성 직후 첫 일기가 타자기로 드러난다 (P1) 🎯 MVP

**Goal**: `written` 케이스에서 제목→본문 점진 노출, 본문 완료 후 하단 절·슬라이더
등장. 그 자리가 그대로 상세.

**Independent Test**: 일기 생성 → 첫 표시에서 제목·본문 글자가 시간에 따라
늘어나고, 타이핑 완료 후에만 하단 절·슬라이더가 보인다.

### 계약 테스트 (RED 먼저)

- [ ] T011 [P] [US1] `__tests__/ui/diary-reveal.test.tsx` 작성 (RED) — contracts/diary-reveal.md C11~C13, C17(제목 없는 entry → 본문부터, FR-002/C1), C18(`saved:false` 안내가 타이핑 완료 전 존재). `reveal` 없으면 즉시 전체(회귀), `reveal` 있으면 초기 본문·하단 절 부재, 타이머 진행 시 등장. 본문 렌더 노드에 `fontSize:16` 포함 확인(I1)
- [ ] T012 [P] [US1] `diary-reveal.test.tsx`에 C23~C25 추가 (RED) — `DiaryHomeScreen`을 `case "written"`/`case "detail"`/`case "writing"` 상태로 렌더. writing 케이스 금지어 검사(SC-005, 기존 SM3 계열 재사용)

### 구현

- [ ] T013 [US1] `src/ui/DiaryDetailScreen.tsx` — 옵셔널 `reveal?: boolean` prop 추가. `revealDone` 로컬 state(초기값 `reveal === true ? false : true`), `titleDone` state(초기값 `reveal === true && entry.title !== undefined ? false : true`). data-model.md §2. `detail` 경로는 `reveal` 미전달이라 둘 다 `true` — T026이 이걸로 US3를 커버
- [ ] T014 [US1] `DiaryDetailScreen.tsx` — `reveal === true` 경로: 제목 있으면 `<TypewriterText variant="title" text={entry.title} charMs={REVEAL.charMs} skipToEnd={revealDone} onDone={()=>setTitleDone(true)} />`(현재 `:443`과 동일 타이포), `titleDone` 후 본문 `<TypewriterText variant="body" style={{ fontSize: 16, lineHeight: 26 }} ... onDone={()=>setRevealDone(true)} />`(현재 `:452`와 동일, I1) (C3~C5). `reveal !== true`이면 기존 렌더 그대로(C1)
- [ ] T015 [US1] `DiaryDetailScreen.tsx` — `revealDone === false` 동안 "이 일기가 본 것" `<View style={styles.signals}>`·`PhotoSlider`·`PhotoGalleryModal` **미렌더** (조건에 `&& revealDone` AND, C6). `revealDone === true`면 기존과 구조 동일(C7)
- [ ] T016 [US1] `DiaryDetailScreen.tsx` — `saved:false`·`overwrote:true` 안내는 `revealDone`과 무관하게 렌더(C9). 날짜 캡션도 즉시(C10)
- [ ] T017 [US1] `src/ui/DiaryHomeScreen.tsx` — `case "written"`에서만 `<DiaryDetailScreen ... reveal />` 전달(C20). `case "detail"`·`case "writing"` 무변경(C21·C22)
- [ ] T018 [US1] `npm run test:ui` — T011·T012 GREEN. 기존 `photo-gallery.test.tsx`(025)·`diary-body-screen`(017) 스위트 **무수정** GREEN 확인(SC-004)

**Checkpoint**: `written` 첫 표시가 타자기로 드러나고, `detail`·`writing`은
무변경. `npm test` + `npm run lint` GREEN.

---

## Phase 4: User Story 2 — 화면을 탭하면 즉시 전체가 드러난다 (P1)

**Goal**: 연출 완료 전 어느 시점의 탭이든 즉시 전체(제목·본문·하단 절). 완료 후
탭은 skip 아님.

**Independent Test**: 타이핑 도중(경계 구간 포함) 화면 탭 → 즉시 전문. 완료 후
슬라이더 사진 탭 → 갤러리 열림.

### 계약 테스트 (RED 먼저)

- [ ] T019 [P] [US2] `diary-reveal.test.tsx`에 C14~C16 추가 (RED) — 타이핑 도중 `await fireEvent.press(screen.getByTestId("diary-reveal-skip"))` → 즉시 전체. 제목→본문 사이(본문 `TypewriterText` 미마운트) 오버레이 탭 → 즉시 전체(C15). `revealDone` 후 `diary-reveal-skip` 오버레이가 트리에 없음(`queryByTestId` null), 슬라이더 사진 탭은 갤러리 오픈(C16)

### 구현

- [ ] T020 [US2] `src/ui/DiaryDetailScreen.tsx` — `reveal === true && !revealDone`일 때만 `ScrollView`의 `contentContainer` 최상단에 화면 덮는 투명 `Pressable` 오버레이(`StyleSheet.absoluteFill`, `testID="diary-reveal-skip"`) 렌더. 루트 `ScrollView`를 `Pressable`로 감싸지 않음(스크롤 충돌, U2). `onPress={onSkip}`. `revealDone === true`면 오버레이 미렌더 → 슬라이더·갤러리 탭 정상 도달(FR-006, C16)
- [ ] T021 [US2] `DiaryDetailScreen.tsx` — `onSkip = () => { setTitleDone(true); setRevealDone(true); }` 한 핸들러(U1). 제목 미완 시점 탭에서도 다음 렌더에 본문 `TypewriterText`가 `skipToEnd={true}`로 첫 마운트 → `TypewriterText` C7로 즉시 전체 + 하단 절 렌더
- [ ] T022 [US2] 위반 주입 확인 — (a) 오버레이를 `revealDone === true`에서도 렌더 → C16 FAIL(완료 후 탭이 슬라이더 탭을 삼킴), (b) `onSkip`에서 `setTitleDone(true)` 제거 → C15 FAIL(본문이 한 렌더 늦게 채워짐). 각각 되돌림
- [ ] T023 [US2] `npm run test:ui` — T019 GREEN. 025 갤러리 흐름 회귀 없음

**Checkpoint**: 탭 건너뛰기가 단일 조건(`reveal && !revealDone`)으로 동작.

---

## Phase 5: User Story 3 — 나중에 목록에서 다시 열면 즉시 전체 (P1)

**Goal**: 목록 재진입(`detail`)은 타이핑 없이 즉시 전문. 첫 표시에서 중단 후
재진입도 이어재생 안 함.

**Independent Test**: 생성 후 첫 표시 연출 → 뒤로 → 목록에서 다시 열기 → 즉시
전문. 타이핑 도중 뒤로 → 목록 재진입 → 즉시 전문.

### 계약 테스트 (RED 먼저)

- [ ] T024 [P] [US3] `diary-reveal.test.tsx`에 재진입 시나리오 추가 (RED) — `written`으로 렌더해 타이머 일부만 진행 → 언마운트 → 같은 `entry`로 `detail` 케이스 렌더 → 본문 전문 즉시 존재, 하단 절 즉시 존재(FR-007·FR-008). C11(회귀)과 연결
- [ ] T025 [P] [US3] `diary-reveal.test.tsx` — C19 추가 (RED) — `reveal` 준 `DiaryDetailScreen` `unmount()` 후 `advanceTimersByTime` → act 경고·콘솔 에러 없음(FR-014)

### 구현

- [ ] T026 [US3] 확인 — `detail` 케이스는 `reveal`을 안 받으므로 `revealDone` 초기값이 `true` → 코드 추가 없이 T024가 GREEN인지 검증. 아니면 `DiaryDetailScreen`의 초기값 계산 수정
- [ ] T027 [US3] 확인 — `TypewriterText` 언마운트 정리(T008)가 T025를 커버하는지. `DiaryDetailScreen`이 별도 타이머를 만들지 않음을 소스로 확인
- [ ] T028 [US3] `npm run test:ui` — T024·T025 GREEN

**Checkpoint**: 세 Story의 계약 테스트가 모두 GREEN. `npm test`·`npm run lint`
클린.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 회귀 방지 검사, Maestro 조정, 실기기, 문서.

- [ ] T029 [P] `git diff --stat`으로 `src/diary/`·`src/inference/`·`src/vision/`·`src/app/state.ts` **0줄** 확인(SC-006). `scripts/constitution-rules.ts`도 무변경 확인(research 결정 7 — 새 규칙 안 넣음)
- [ ] T030 [P] `npm run lint` — eslint 0 error, `tsc` 0, 헌법 검사 위반 0, prettier 클린
- [ ] T031 `.maestro/diary-photo-gallery.yml`·`.maestro/generate-diary.yml` 등 "생성 후 상세" 흐름에 생성 완료 직후 "화면 탭(건너뛰기)" 스텝 추가(C26). `run-device-tests.mjs` `FLOWS` 목록은 불변(C27) — 등록 상태만 확인
- [ ] T032 실기기(SM-S901N, debug) — quickstart.md 2-1~2-6 수행: 첫 표시 타자기(SC-001), 탭 건너뛰기(SC-003), 목록 재진입 즉시(SC-004), 옛 일기/0장 회귀(SC-004), 생성 중 화면 무변경(SC-005), Maestro 회귀 PASS
- [ ] T033 [P] `docs/roadmap/README.md` 23번 항목에 "✅ 038에서 구현" + 실기기 결과 한 문단 추가 (완료 후)
- [ ] T034 [P] release 재확인 판정 기록 — **불필요**(새 네이티브 모듈 0, 012 dev-only 정책). quickstart.md "완료 판정"에 한 줄

---

## Dependencies & Execution Order

```
Phase 1 (Setup: T001-T003)
  ▼
Phase 2 (Foundational: T004-T010)  ← 세 Story 전부의 선행 조건
  ├─ 유틸 T004→T005→T006  (순수, test:logic)
  └─ 컴포넌트 T007→T008→T009, T010  (test:ui) — T005 이후(graphemeSlice 사용)
  ▼
Phase 3 (US1: T011-T018)  ← MVP. Phase 2 완료 필수
  ▼
Phase 4 (US2: T019-T023)  ← US1의 DiaryDetailScreen 구조 위에 탭 스킵 추가
  ▼
Phase 5 (US3: T024-T028)  ← 대부분 "확인" — US1의 초기값·언마운트 정리로 이미 성립
  ▼
Phase 6 (Polish: T029-T034)
```

- **US2·US3는 US1에 의존한다**(같은 `DiaryDetailScreen` 파일을 수정·검증).
  독립 병렬 불가 — 순차.
- **Phase 2 안에서**: T004~T006(유틸)과 T007(테스트 작성)은 병렬 가능하나
  T008(컴포넌트 구현)은 T005 이후.

## Parallel Opportunities

- **Phase 1**: T003이 T002와 병렬 가능(다른 파일).
- **Phase 2**: T004(유틸 테스트)·T007(컴포넌트 테스트 작성) 병렬. T010(소스 검사)
  은 T008 이후지만 다른 파일.
- **각 Story Phase**: 계약 테스트 작성 태스크([P] 표시)는 서로 병렬. 구현
  태스크는 같은 파일(`DiaryDetailScreen.tsx`)이라 순차.
- **Phase 6**: T029·T030·T033·T034 병렬(검사·문서, 서로 무관). T031·T032는
  실기기 순차.

## Implementation Strategy

- **MVP = Phase 1 + Phase 2 + Phase 3 (US1)**. 여기까지면 "생성 직후 타자기
  연출"이 동작하고 목록 재진입은 이미(코드 추가 없이) 즉시 전체다.
- **US2**는 UX 필수(연출이 사용자를 가두지 않음) — MVP 직후 바로.
- **US3**는 대부분 검증 태스크 — US1 구현이 옳으면 자동으로 성립하며, 계약
  테스트로 그 사실을 잠근다.
- 실기기(T032)는 세 Story 계약 테스트가 전부 GREEN이 된 뒤 한 번에.
