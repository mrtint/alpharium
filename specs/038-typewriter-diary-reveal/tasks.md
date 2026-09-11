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

- [X] T001 `git branch --show-current`로 `038-typewriter-diary-reveal` 브랜치 확인 (스펙킷 `BRANCH:` 필드 아님, AGENTS.md 경고)
- [X] T002 `src/ui/theme/tokens.ts`에 `REVEAL = { charMs: 15 } as const` 추가 (033 `PRESS` 상수 바로 아래, data-model.md §4). JSDoc에 "사람이 정한 값·화면 미노출" 명시
- [X] T003 [P] `__tests__/ui/theme/` 또는 기존 `theme-tokens.test.ts`에 `REVEAL.charMs`가 양수 상수임을 잠그는 한 줄 추가

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `graphemeSlice` 유틸 + `TypewriterText` 컴포넌트. 세 Story 전부의
선행 조건. 완료 시 세 Story의 계약 테스트가 붙을 대상이 존재한다.

### 순수 유틸 (test:logic)

- [X] T004 [P] `__tests__/ui/text/grapheme-slice.test.ts` 작성 (RED) — contracts/typewriter-text.md G1~G7. `.ts` 파일, node 환경. 한글 NFC·이모지 서로게이트·음수·초과·빈 문자열·round-trip
- [X] T005 `src/ui/text/grapheme-slice.ts` 구현 — `graphemeUnits`(=`Array.from`)·`graphemeSlice`(clamp + slice + join)·`graphemeLength`. 새 의존성 없음. T004 GREEN
- [X] T006 위반 주입 확인 — `graphemeSlice`가 `text.slice(0, n)`을 쓰도록 임시 변경 → G2 FAIL 확인(`"a👍b"[1]` 반쪽 서로게이트) → 되돌림

### 표시 컴포넌트 (test:ui)

- [X] T007 [P] `__tests__/ui/typewriter-text.test.tsx` 작성 (RED) — contracts/typewriter-text.md C1~C9 + C-TYPO. `charMs`는 임의 양수(10) 주입(A1). `jest.useFakeTimers()` + `act(() => jest.advanceTimersByTime())`. RNTL 14 규칙(`await render`/`fireEvent`/`unmount`, `screen.*`) — `unmount()`도 Promise를 반환해 `await` 누락 시 fake timer 상태가 다음 테스트로 샜다(실측, C6 구현 중 발견)
- [X] T008 `src/ui/components/TypewriterText.tsx` 구현 — props `{ text, charMs, skipToEnd, onDone, variant?: TextVariant, style?, testID? }`. `variant` 기본 `"body"`, `variant`·`style`을 `<AppText>`에 그대로 위임(C-TYPO, I1). `useState` 노출 카운터 + `useEffect` 타이머, `graphemeSlice`로 렌더, `skipToEnd` 처리, `onDone` 1회 가드, `text` 교체 리셋, 언마운트 정리, `text === ""` 즉시 `onDone`. 모델·도메인 import 0. T007 GREEN(14개)
- [X] T009 위반 주입 확인 — (a) `skipToEnd` 분기 삭제 → C4 FAIL 확인, (b) `onDone` 중복 가드 삭제 → C8 FAIL 확인(호출 2회), (c) 언마운트 `clearInterval` 삭제 → 기존 C6 어서션은 못 잡아 `clearInterval` spy 테스트를 추가해 FAIL 확인. 각각 되돌림
- [X] T010 [P] `TypewriterText.tsx` 소스 검사 테스트 — C9(`charMs`가 JSX 텍스트로 안 나옴, `Date.now`/`performance.now` 없음, 도메인 계층 import 없음). `typewriter-text.test.tsx`의 C9 describe 블록에 통합(별도 파일 불필요)

**Checkpoint**: `npm run test:logic`·`npm run test:ui` GREEN. `TypewriterText`·
`graphemeSlice`가 독립적으로 검증됨.

---

## Phase 3: User Story 1 — 생성 직후 첫 일기가 타자기로 드러난다 (P1) 🎯 MVP

**Goal**: `written` 케이스에서 제목→본문 점진 노출, 본문 완료 후 하단 절·슬라이더
등장. 그 자리가 그대로 상세.

**Independent Test**: 일기 생성 → 첫 표시에서 제목·본문 글자가 시간에 따라
늘어나고, 타이핑 완료 후에만 하단 절·슬라이더가 보인다.

### 계약 테스트 (RED 먼저)

- [X] T011 [P] [US1] `__tests__/ui/diary-reveal.test.tsx` 작성 (RED) — contracts/diary-reveal.md C11~C13, C17(제목 없는 entry → 본문부터, FR-002/C1), C18(`saved:false` 안내가 타이핑 완료 전 존재). `reveal` 없으면 즉시 전체(회귀), `reveal` 있으면 초기 본문·하단 절 부재, 타이머 진행 시 등장. 본문 렌더 노드에 `fontSize:16` 포함 확인(I1)
- [X] T012 [P] [US1] `diary-reveal.test.tsx`에 C23~C25 추가 (RED) — `DiaryHomeScreen`을 `case "written"`/`case "detail"`/`case "writing"` 상태로 렌더. writing 케이스 금지어 검사(SC-005, 기존 SM3 계열 재사용)

### 구현

- [X] T013 [US1] `src/ui/DiaryDetailScreen.tsx` — 옵셔널 `reveal?: boolean` prop 추가. `revealDone` 로컬 state(초기값 `reveal === true ? false : true`), `titleDone` state(초기값 `reveal === true && entry.title !== undefined ? false : true`). data-model.md §2. `detail` 경로는 `reveal` 미전달이라 둘 다 `true` — T026이 이걸로 US3를 커버
- [X] T014 [US1] `DiaryDetailScreen.tsx` — `reveal === true` 경로: 제목 있으면 `<TypewriterText variant="title" text={entry.title} charMs={REVEAL.charMs} skipToEnd={revealDone} onDone={()=>setTitleDone(true)} />`(현재 `:443`과 동일 타이포), `titleDone` 후 본문 `<TypewriterText variant="body" style={{ fontSize: 16, lineHeight: 26 }} ... onDone={()=>setRevealDone(true)} />`(현재 `:452`와 동일, I1) (C3~C5). `reveal !== true`이면 기존 렌더 그대로(C1)
- [X] T015 [US1] `DiaryDetailScreen.tsx` — `revealDone === false` 동안 "이 일기가 본 것" `<View style={styles.signals}>`·`PhotoSlider`·`PhotoGalleryModal` **미렌더** (조건에 `&& revealDone` AND, C6). `revealDone === true`면 기존과 구조 동일(C7)
- [X] T016 [US1] `DiaryDetailScreen.tsx` — `saved:false`·`overwrote:true` 안내는 `revealDone`과 무관하게 렌더(C9). 날짜 캡션도 즉시(C10)
- [X] T017 [US1] `src/ui/DiaryHomeScreen.tsx` — `case "written"`에서만 `<DiaryDetailScreen ... reveal />` 전달(C20). `case "detail"`·`case "writing"` 무변경(C21·C22)
- [X] T018 [US1] `npm run test:ui` — T011·T012 GREEN(10/10). 기존 `photo-gallery.test.tsx`(025, 17개)·`diary-detail.test.tsx`(017, 39개)·`diary-home.test.tsx`(007/009/029, 56개) 스위트 **무수정** GREEN 확인(SC-004) — 총 112개 회귀 테스트 0 FAIL

**★ 구현 중 발견·수정한 버그(실측)**: `setCount`의 updater 함수 안에서 `onDone()`
(부모 `setState` 경유)을 부르면 React가 "Cannot update a component while
rendering a different component" 경고를 냈다(C13 통합 테스트에서 처음 발견 —
`typewriter-text.test.tsx` 단독으로는 안 잡힘, `DiaryDetailScreen`이 제목→본문
두 `TypewriterText`를 이어 붙일 때만 드러났다). 첫 수정 시도(`finished` 클로저
플래그로 updater 밖에서 호출)는 fake timer 환경에서 `setCount` updater가 동기
실행을 보장하지 않아 `onDone`이 아예 안 불리는 회귀를 냈다(C3·C5·C8 FAIL). 최종
해법: 완료 판정을 `count` 값을 관찰하는 **별도 `useEffect`**로 옮겼다 — 타이머
effect는 `setCount(prev => Math.min(prev+1, total))`만 하고, `onDone` 호출은
`[count, total, text]` 의존성의 effect가 전담한다. `TypewriterText.tsx` 완료
판정 로직을 계약(C3)과 함께 갱신, `typewriter-text.test.tsx`·`diary-reveal.test.tsx`
둘 다 GREEN + 콘솔 에러 0.

**Checkpoint**: `written` 첫 표시가 타자기로 드러나고, `detail`·`writing`은
무변경. `npm test` + `npm run lint` GREEN.

---

## Phase 4: User Story 2 — 화면을 탭하면 즉시 전체가 드러난다 (P1)

**Goal**: 연출 완료 전 어느 시점의 탭이든 즉시 전체(제목·본문·하단 절). 완료 후
탭은 skip 아님.

**Independent Test**: 타이핑 도중(경계 구간 포함) 화면 탭 → 즉시 전문. 완료 후
슬라이더 사진 탭 → 갤러리 열림.

### 계약 테스트 (RED 먼저)

- [X] T019 [P] [US2] `diary-reveal.test.tsx`에 C14~C16 추가 (RED) — 타이핑 도중 `await fireEvent.press(screen.getByTestId("diary-reveal-skip"))` → 즉시 전체. 제목 자연 완료 전(본문 `TypewriterText` 미마운트) 오버레이 탭 → 즉시 전체(C15). `revealDone` 후 `diary-reveal-skip` 오버레이가 트리에 없음(`queryByTestId` null), 슬라이더 사진 탭은 갤러리 오픈(C16)

### 구현

- [X] T020 [US2] `src/ui/DiaryDetailScreen.tsx` — `reveal === true && !revealDone`일 때만 `ScrollView`의 `contentContainer` 최상단에 화면 덮는 투명 `Pressable` 오버레이(`StyleSheet.absoluteFill`, `testID="diary-reveal-skip"`) 렌더. 루트 `ScrollView`를 `Pressable`로 감싸지 않음(스크롤 충돌, U2). `onPress={onSkip}`. `revealDone === true`면 오버레이 미렌더 → 슬라이더·갤러리 탭 정상 도달(FR-006, C16)
- [X] T021 [US2] `DiaryDetailScreen.tsx` — `onSkip = () => { setTitleDone(true); setRevealDone(true); }` 한 핸들러(U1). 제목 미완 시점 탭에서도 다음 렌더에 본문 `TypewriterText`가 `skipToEnd={true}`로 첫 마운트 → `TypewriterText` C7로 즉시 전체 + 하단 절 렌더
- [X] T022 [US2] 위반 주입 확인 — (a) 오버레이를 `revealDone === true`에서도 렌더 → C16 FAIL 확인(완료 후 탭이 슬라이더 탭을 삼킴), (b) `onSkip`에서 `setTitleDone(true)` 제거 → 처음 짠 C15 테스트(제목 자연 완료 "후" 탭)는 놓쳤고, 제목 **자연 완료 전** 탭으로 테스트를 정정한 뒤에야 FAIL 확인(본문이 영원히 스킵되지 않는 회귀). 각각 되돌림
- [X] T023 [US2] `npm run test:ui` — T019 GREEN(13/13). 025 갤러리 흐름 회귀 없음

**Checkpoint**: 탭 건너뛰기가 단일 조건(`reveal && !revealDone`)으로 동작.

---

## Phase 5: User Story 3 — 나중에 목록에서 다시 열면 즉시 전체 (P1)

**Goal**: 목록 재진입(`detail`)은 타이핑 없이 즉시 전문. 첫 표시에서 중단 후
재진입도 이어재생 안 함.

**Independent Test**: 생성 후 첫 표시 연출 → 뒤로 → 목록에서 다시 열기 → 즉시
전문. 타이핑 도중 뒤로 → 목록 재진입 → 즉시 전문.

### 계약 테스트 (RED 먼저)

- [X] T024 [P] [US3] `diary-reveal.test.tsx`에 재진입 시나리오 추가 (RED→즉시 GREEN) — `reveal`로 렌더해 타이머 일부만 진행 → 언마운트 → 같은 `entry`로 `detail` 케이스(reveal 없이) 렌더 → 본문 전문 즉시 존재, 하단 절 즉시 존재(FR-007·FR-008). C11(회귀)과 연결
- [X] T025 [P] [US3] `diary-reveal.test.tsx` — C19 추가 — `reveal` 준 `DiaryDetailScreen` `unmount()` 후 `advanceTimersByTime` → act 경고·콘솔 에러 없음(FR-014)

### 구현

- [X] T026 [US3] 확인 — `detail` 케이스는 `reveal`을 안 받으므로 `revealDone`·`titleDone` 초기값이 둘 다 `true` → **코드 추가 없이 T024가 첫 실행에 GREEN**(예측대로 US1 구현이 이미 성립시킴)
- [X] T027 [US3] 확인 — `TypewriterText` 언마운트 정리(T008 C6)가 T025를 커버한다. `DiaryDetailScreen`은 별도 타이머를 안 만든다(소스 확인 — `useState`/`Pressable`뿐, `setInterval`·`setTimeout` 없음)
- [X] T028 [US3] `npm run test:ui` — T024·T025 GREEN(전체 15/15, 코드 변경 0줄로 US3 전체 통과 — tasks.md 예측과 일치)

**Checkpoint**: 세 Story의 계약 테스트가 모두 GREEN. `npm test`·`npm run lint`
클린.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 회귀 방지 검사, Maestro 조정, 실기기, 문서.

- [X] T029 [P] `git diff --stat`으로 `src/diary/`·`src/inference/`·`src/vision/`·`src/app/state.ts` **0줄** 확인(SC-006). `scripts/constitution-rules.ts`도 무변경 확인(research 결정 7 — 새 규칙 안 넣음)
- [X] T030 [P] `npm run lint` — eslint 0 error, `tsc` 0, 헌법 검사 위반 0, prettier 클린

**★ 구현 중 발견·수정한 회귀 2건(실측, 038과 무관한 기존 결함)**:
1. **`__tests__/jest-projects.test.ts`의 자체 glob 매칭 헬퍼가 2단계 깊이
   경로를 잘못 매칭했다** — `**/`를 `(?:.*/)?`로 바꾸기 **전에** `*`를
   `[^/]*`로 먼저 바꾸면, 그 안의 `*`까지 걸려 "임의 깊이"가 "정확히 한
   단계"로 좁아진다. `__tests__/ui/text/grapheme-slice.test.ts`(038이 처음
   만든 2단계 깊이 테스트 파일)가 이 잠복 결함을 처음 드러냈다 — 실제
   jest는 정상적으로 이 파일을 `logic` 프로젝트로 잡고 있었고(`--listTests`로
   확인), 이 테스트 파일 **자신의 매칭 로직**만 틀렸다. 플레이스홀더로
   치환 순서를 강제해 수정.
2. **`__tests__/ui/press-feedback.test.tsx` PF2**가 `src/ui/components/`
   파일 수를 7개로 못박아 뒀다(033이 "032가 만들고 안 쓴 컴포넌트를 남기지
   않는다"는 취지로 세운 가드). `TypewriterText.tsx`는 그 패턴이 아니라
   **실제로 `DiaryDetailScreen`이 쓰는 필수 컴포넌트**라 8개로 갱신하고
   이유를 주석에 남겼다.
- [X] T031 확인 결과 — **기존 Maestro 흐름 중 "화면 탭(건너뛰기)" 스텝이 필요한 곳이 없었다.**
  `.maestro/*.yml` 전체를 조사(`generate-diary`·`diary-user-path`·`writing-flow-simplified`·
  `writing-monologue(-expansion)`·`photo-selection-over-limit` 등 "일기 쓰기"를 부르는
  9개 흐름): 전부 "쓰고 있다"가 사라지는 것과 실패 문자열 부재만 확인하고, 곧장 다른
  탭으로 이동하거나 흐름을 마친다 — **생성 직후 `written` 화면의 본문 텍스트를 직접
  assert하는 흐름이 하나도 없다.** `diary-photo-gallery.yml`은 목록에서 이미 저장된
  일기를 여는 `detail` 경로만 써서 애초에 `reveal`이 안 켜진다. C26의 전제("타자기가
  도는 동안 assertVisible이 본문 일부를 못 볼 수 있다")는 실측 결과 이 저장소의
  현재 흐름 어디에도 해당하지 않아 **스텝 추가가 불필요**했다. `run-device-tests.mjs`
  `FLOWS` 목록 불변(C27) — 신규·수정 흐름 없음.
- [X] T032 **실기기 확인 완료**(2026-09-11, SM-S901N/Galaxy S22, dev). quickstart.md
  2-1~2-6 전부 수행:
  - **2-1 첫 표시 타자기(SC-001)**: 사진 있는 하루(010 `seed:day rich`로
    2026-09-08~09-10에 사진 3장씩 심음)로 생성 → 완료 직후 제목이 빈 상태에서
    시작해 글자 단위로 채워지고, 이어 본문이 글자 단위로 흐름을 육안 확인. 본문이
    흐르는 동안 "이 일기가 본 것" 절·사진 슬라이더 부재, 본문 완료 직후 등장 —
    화면 전환 없이 그대로 상세 화면.
  - **2-2 탭 건너뛰기(SC-003)**: 타이핑 도중 화면 탭 → 제목·본문 전문 + 하단
    절 + 슬라이더 즉시 표시 확인.
  - **2-3 목록 재진입(SC-004)**: 뒤로 가기 후 방금 쓴 일기를 목록에서 재열람 →
    타이핑 없이 즉시 전문 확인.
  - **2-4 옛 일기 회귀(FR-007/SC-004)**: 이 기능 이전 생성분 열람 → 이전과 동일
    (타이핑 없음, 문구만) 확인.
  - **2-5 생성 중 화면 무변경(FR-011/SC-005)**: 회전 표시 + 독백 한 줄 +
    "그만두기"만, 진행률·경과 시간·생성 중 본문 없음 확인.
  - **2-6 Maestro 회귀**: `node scripts/run-device-tests.mjs` 실행, 9흐름 전체 +
    037 이후 추가된 나머지 흐름(총 18흐름) 확인. **038이 직접 관련된 흐름
    (`generate-diary`·`diary-user-path`·`today-diary`·`writing-flow-simplified`·
    `diary-body-screen`)은 전부 PASS — 038 회귀 없음.** 실패 6개
    (`download-conflict`·`parallel-model-download`·`prompt-preview`·
    `photo-selection-over-limit`·`diary-photo-gallery`·`welcome-naming`)는 전부
    038과 무관한 기존 원인: `download-conflict`·`parallel-model-download`는
    037이 이미 기록한 알려진 실패(로스터가 하나뿐이라 구조적으로 통과 불가).
    나머지 넷은 `unified-permission-onboarding.yml`이 `Launch app … with clear
    state`(`pm clear`)로 앱 데이터를 초기화해 온보딩이 재노출된 상태에서 그
    뒤에 실행된 흐름들이 "일기" 탭을 못 찾은 것 — 024 AGENTS.md에 이미 기록된
    "021 흐름은 pm clear로 앱 데이터를 전부 날린다" 상호 오염과 동일 원인
    (스크린샷으로 "시작하기 전에" 온보딩 4/4 화면 확인). 흐름 실행 순서
    문제이지 038 코드 결함이 아니다. release 재확인 불필요(새 네이티브 모듈
    0, 012).
- [X] T033 [P] `docs/roadmap/README.md` 23번 항목에 "✅ 038에서 구현" + 구현 결과 상세 추가(실기기 미확인 상태 명시, 다음 세션 필수)
- [X] T034 [P] release 재확인 판정 기록 — **불필요**(새 네이티브 모듈 0, 012 dev-only 정책). quickstart.md "완료 판정"에 이미 명시돼 있음

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
