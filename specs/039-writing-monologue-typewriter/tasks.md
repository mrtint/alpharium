# Tasks: 생성 중 독백 문구 타자기 연출

**Input**: Design documents from `specs/039-writing-monologue-typewriter/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/writing-monologue-typewriter.md, quickstart.md

**Tests**: 헌법 「개발 방식」이 계약 우선·테스트 우선을 MUST로 요구하므로 포함한다.

**Organization**: 이 기능은 단일 파일(`DiaryHomeScreen.tsx`) 수정이 세
User Story(US1 글자 단위 노출, US2 탭 무반응, US3 화면 규칙 무변경)를
동시에 충족시킨다 — 038과 달리 Story별로 독립 구현 단위를 나눌 표면이
없다. 대신 계약(C1~C10)별로 태스크를 쪼갠다.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 브랜치 확인 — `git branch --show-current`로
  `039-writing-monologue-typewriter`인지 확인. 새 의존성 설치 불필요
  (038 자산 재사용, research.md 결정 2).

---

## Phase 2: Foundational

**Purpose**: 계약 테스트가 기대하는 현재 상태를 확인한다 — 별도 구현
선행 작업은 없다(새 컴포넌트·새 유틸이 없으므로).

- [ ] T002 `src/ui/DiaryHomeScreen.tsx`의 `case "writing"` 블록(현재
  `AppText`로 `screen.line ?? "쓰고 있다"`를 즉시 렌더하는 부분)과
  `src/ui/components/TypewriterText.tsx`(038)의 현재 props 시그니처를
  다시 확인해 계약 테스트 작성의 기준으로 삼는다.

**Checkpoint**: 계약 테스트 작성 시작 가능.

---

## Phase 3: 계약 테스트 (RED — 구현 전 실패 확인)

**Goal**: contracts/writing-monologue-typewriter.md의 C1~C10을 코드로
표현한다. 이 시점에는 `case "writing"`이 아직 `TypewriterText`를 쓰지
않으므로 C1·C2·C3·C4·C5·C6은 FAIL해야 한다(RED 확인).

- [ ] T003 [US1] `__tests__/ui/writing-monologue-typewriter.test.tsx` 신규
  작성 — C1(TypewriterText로 렌더)·C4(key=line)·C6(variant="body") 검증.
  `DiaryHomeScreen`을 `screen.kind === "writing"`, `line: "테스트 문구"`로
  렌더해 `TypewriterText`가 해당 텍스트로 마운트되는지 확인(038의
  `typewriter-text.test.tsx` 패턴 차용, RNTL `render`/`fireEvent`는
  `await` 필수).
- [ ] T004 [P] [US1] 같은 파일에 C2(`charMs === REVEAL.charMs`) 검증
  추가 — `theme/tokens.ts`의 `REVEAL.charMs`를 import해 값 일치를
  단언한다.
- [ ] T005 [P] [US1] 같은 파일에 문구 갱신 시 리마운트 계약 검증 추가 —
  `line: "A"`로 렌더 후 `rerender`로 `line: "B"`를 주입하면
  `TypewriterText`가 새 `key`로 다시 마운트되어 "B"가 처음부터
  타이핑되는지 확인(FR-002, data-model.md 상태 다이어그램). fake timer로
  일부만 진행시킨 상태에서 갱신해 "이어서 채우기"가 없음을 확인.
- [ ] T006 [P] [US2] 같은 파일에 C3(`skipToEnd` 항상 `false`) 검증 추가 —
  `TypewriterText`에 전달된 `skipToEnd` prop이 리터럴 `false`인지
  (상태가 아닌지) 확인.
- [ ] T007 [P] [US3] 같은 파일에 C5(`onDone`이 아무 상태도 안 바꿈)
  검증 추가 — `onDone`을 호출해도 `DiaryHomeScreen`의 다른 렌더 출력
  (회전 표시·그만두기 버튼)이 그대로인지 확인.
- [ ] T008 [P] [US3] 같은 파일에 C7·C8 검증 추가 — 회전 표시
  (`accessibilityLabel="쓰고 있다"`)와 "그만두기" `Pressable`이 여전히
  렌더되는지(C7), 그리고 `screen.kind`가 `"detail"`·`"written"`·
  `"failed"` 등일 때 이 변경이 그 케이스들의 출력에 영향을 주지 않는지
  (C8, 기존 회귀 테스트가 있다면 그것으로 갈음 가능 — 신규 작성은
  최소한으로).
- [ ] T009 `npm run test:ui -- writing-monologue-typewriter`로 위 신규
  테스트가 전부 **FAIL**하는지 확인(RED, 구현 전이므로 당연히 실패해야
  한다 — 실패 이유가 "TypewriterText가 안 쓰인다"인지 확인해 테스트
  자체가 유효한지 검증).

**Checkpoint**: 계약 테스트 전부 작성 완료, 전부 RED 확인.

---

## Phase 4: 구현 (GREEN)

**Goal**: `case "writing"`을 계약대로 수정해 Phase 3 테스트를 GREEN으로
만든다.

- [ ] T010 [US1] `src/ui/DiaryHomeScreen.tsx`의 `case "writing"` 블록에서
  `<AppText variant="body">{screen.line ?? "쓰고 있다"}</AppText>`를
  `<TypewriterText key={screen.line ?? "쓰고 있다"} text={screen.line ??
  "쓰고 있다"} charMs={REVEAL.charMs} skipToEnd={false} onDone={() =>
  {}} variant="body" />`로 교체한다. `TypewriterText`·`REVEAL` import
  추가(`../ui/components/TypewriterText`·`./theme/tokens`).
- [ ] T011 `npm run test:ui -- writing-monologue-typewriter`로 Phase 3
  테스트 전부 GREEN 확인.
- [ ] T012 `npm run test:ui`(화면 전체) + `npm run test:logic`으로 기존
  스위트에 회귀가 없는지 확인 — 특히 015·016(`writing-monologue`)
  관련 기존 테스트, `diary-home.test.tsx`류.

**Checkpoint**: US1·US2·US3 전부 코드로 성립, 기기 없는 테스트 GREEN.

---

## Phase 5: 위반 주입 (방어 확인)

**Goal**: 헌법 「개발 방식」의 위반 주입 관례 — 계약을 실제로 어겨보고
테스트가 잡는지 확인한다.

- [ ] T013 [P] `key` prop을 제거(또는 고정값으로)해 문구 전환 시
  리마운트가 안 되게 만든 뒤 T005 테스트가 FAIL하는지 확인, 되돌린다.
- [ ] T014 [P] `skipToEnd`를 상태로 바꿔 탭 시 `true`가 되게 만든 뒤
  T006 테스트가 FAIL하는지 확인, 되돌린다.
- [ ] T015 [P] `charMs`에 임의의 다른 값(예: `10`)을 하드코딩한 뒤 T004
  테스트가 FAIL하는지 확인, 되돌린다.

**Checkpoint**: 세 위반 전부 테스트가 잡는 것을 확인, 코드는 정상
상태로 복원됨.

---

## Phase 6: 회귀·경계 확인

- [ ] T016 `git diff --stat -- src/diary/ src/inference/ src/vision/
  src/app/state.ts`가 빈 출력인지 확인(C9, SC 대응).
- [ ] T017 `.maestro/writing-monologue.yml`·
  `.maestro/writing-monologue-expansion.yml`을 읽어, 생성 중 화면의
  독백 문구 텍스트를 직접 assert하는 스텝이 있는지 조사한다(038 T031과
  같은 방법론). **있으면** 그 assert가 타이핑 도중에도 안전한지 판단하고
  필요시 흐름 수정 태스크를 추가한다. **없으면**(예상 결과 — 015·016
  흐름은 "쓰고 있다"가 사라지는 것만 봄, 038 조사에서 이미 확인) 흐름
  무수정으로 결론짓는다.
- [ ] T018 `npm run lint`(eslint + tsc + 헌법 검사 + prettier) 전체 GREEN
  확인.

---

## Phase 7: 문서화·실기기 검증

- [ ] T019 [P] `docs/roadmap/README.md`에 이 기능 관련 항목이 있으면
  갱신(039 스펙 생성 경위 — 사용자가 038 검증 중 추가 요청한 기능이라
  기존 로드맵 번호가 없을 수 있음, 없으면 이 태스크는 스킵하고 이유를
  기록).
- [ ] T020 실기기 검증 — `quickstart.md` 2-1~2-6 수행(SM-S901N 또는
  동등 dev 빌드). 문구 글자 단위 노출(SC-001), 완료 후 정지 유지
  (SC-002), 결과 화면 전환 시 잔상 없음(SC-003), 화면 구성 무변경
  (SC-004), 탭 무반응(SC-005) 육안 확인 + Maestro 회귀.

---

## Dependencies & Execution Order

- Setup(T001) → Foundational(T002) → 계약 테스트(T003~T009, RED) →
  구현(T010~T012, GREEN) → 위반 주입(T013~T015) → 회귀·경계(T016~T018)
  → 문서화·실기기(T019~T020).
- T004~T008은 모두 같은 신규 파일(T003이 만든
  `writing-monologue-typewriter.test.tsx`)에 `describe` 블록을 추가하는
  것이라 **파일 충돌 방지를 위해 순차 실행을 권장**한다(`[P]` 표시는
  "서로 논리적으로 독립"이라는 뜻이지 "동시에 같은 파일을 편집해도
  된다"는 뜻이 아니다).
- T013~T015는 `[P]`이지만 같은 파일(`DiaryHomeScreen.tsx`)을 임시로
  건드리므로 실제로는 하나씩 주입→확인→복원 후 다음으로 넘어간다.

## Implementation Strategy

이 기능은 크기가 작아 별도의 "MVP 우선 단계적 배포" 전략이 필요 없다 —
전체를 한 번에(Phase 1~7) 완료하는 것이 가장 단순하다.
