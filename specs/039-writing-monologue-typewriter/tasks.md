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

- [X] T001 브랜치 확인 — `git branch --show-current`로
  `039-writing-monologue-typewriter`인지 확인. 새 의존성 설치 불필요
  (038 자산 재사용, research.md 결정 2).

---

## Phase 2: Foundational

**Purpose**: 계약 테스트가 기대하는 현재 상태를 확인한다 — 별도 구현
선행 작업은 없다(새 컴포넌트·새 유틸이 없으므로).

- [X] T002 `src/ui/DiaryHomeScreen.tsx`의 `case "writing"` 블록(현재
  `AppText`로 `screen.line ?? "쓰고 있다"`를 즉시 렌더하는 부분)과
  `src/ui/components/TypewriterText.tsx`(038)의 현재 props 시그니처를
  다시 확인해 계약 테스트 작성의 기준으로 삼는다.

**Checkpoint**: 계약 테스트 작성 시작 가능.

---

## Phase 3: 계약 테스트 (RED — 구현 전 실패 확인)

**Goal**: contracts/writing-monologue-typewriter.md의 C1~C10을 코드로
표현한다. 이 시점에는 `case "writing"`이 아직 `TypewriterText`를 쓰지
않으므로 C1·C2·C3·C4·C5·C6은 FAIL해야 한다(RED 확인).

- [X] T003 [US1] `__tests__/ui/writing-monologue-typewriter.test.tsx` 신규
  작성 — C1(TypewriterText로 렌더)·C4(key=line)·C6(variant="body") 검증.
  `DiaryHomeScreen`을 `screen.kind === "writing"`, `line: "테스트 문구"`로
  렌더해 `TypewriterText`가 해당 텍스트로 마운트되는지 확인(038의
  `typewriter-text.test.tsx` 패턴 차용, RNTL `render`/`fireEvent`는
  `await` 필수). `diary-home.test.tsx`의 `loadProgressPipeline()` 패턴을
  복제해 `onProgress`를 밖에서 호출한다.
- [X] T004 [P] [US1] 같은 파일에 C2(`charMs === REVEAL.charMs`) 검증
  추가 — `theme/tokens.ts`의 `REVEAL.charMs`를 import해 값 일치를
  단언한다. **실측**: 처음엔 진행 횟수만 세는 약한 assert였는데
  위반 주입(T015)에서 `charMs=10`으로 바꿔도 통과해버려 무의미함이
  드러남 — 절대 시간 경계(`REVEAL.charMs * 4` vs `* 5`)로 강화해
  실제로 값을 검증하게 고쳤다.
- [X] T005 [P] [US1] 같은 파일에 문구 갱신 시 리마운트 계약 검증 추가 —
  `pipeline.onProgress()`로 새 단계를 보내 `line`이 바뀌면
  `TypewriterText`가 다시 마운트되어 처음부터 시작하는지 확인(FR-002,
  data-model.md 상태 다이어그램). fake timer로 일부만 진행시킨 상태에서
  갱신해 "이어서 채우기"가 없음을 확인.
- [X] T006 [P] [US2] 같은 파일에 C3(`skipToEnd` 항상 `false`) 검증 추가 —
  `TypewriterText`에 전달된 `skipToEnd` prop이 리터럴 `false`인지
  (상태가 아닌지) 확인.
- [X] T007 [P] [US3] 같은 파일에 C5(`onDone`이 아무 상태도 안 바꿈)
  검증 추가 — `onDone`을 호출해도 `DiaryHomeScreen`의 다른 렌더 출력
  (회전 표시·그만두기 버튼)이 그대로인지 확인.
- [X] T008 [P] [US3] 같은 파일에 C7·C8 검증 추가 — 회전 표시
  (`accessibilityLabel="쓰고 있다"`)와 "그만두기" `Pressable`이 여전히
  렌더되는지(C7), 지표 문자열 부재(원칙 IV). C8(다른 케이스 무영향)은
  신규 테스트 대신 기존 `diary-home.test.tsx`의 다른 `describe` 블록들
  (전부 GREEN 유지)로 갈음.
- [X] T008a [P] [US1] 같은 파일에 FR-002a(완료 후 정지 상태 유지) 검증
  추가 — fake timer로 문구 전체 길이만큼 진행시켜 완료 상태로 만든 뒤,
  추가로 시간을 더 진행시켜도 렌더된 텍스트가 그대로임을 확인(analyze
  C1 대응).
- [X] T009 `npm run test:ui -- writing-monologue-typewriter`로 위 신규
  테스트 실행, 4개 FAIL 확인(RED) — 실패 사유가 정확히 "문구가 즉시
  전체로 렌더돼 타이핑 중 상태를 못 봄"이었음을 확인해 테스트 자체가
  유효함을 검증. (C5·C7·지표부재 테스트는 기존 동작이 이미 충족하므로
  구현 전에도 GREEN — 정상.)

**Checkpoint**: 계약 테스트 전부 작성 완료, 전부 RED 확인.

---

## Phase 4: 구현 (GREEN)

**Goal**: `case "writing"`을 계약대로 수정해 Phase 3 테스트를 GREEN으로
만든다.

- [X] T010 [US1] `src/ui/DiaryHomeScreen.tsx`의 `case "writing"` 블록에서
  `<AppText variant="body">{screen.line ?? "쓰고 있다"}</AppText>`를
  `TypewriterText`로 교체(계획대로).
  `TypewriterText`·`REVEAL` import 추가.
- [X] T011 `npm run test:ui -- writing-monologue-typewriter`로 Phase 3
  테스트 전부 GREEN 확인.
- [X] T012 `npm run test:ui`(화면 전체) + `npm run test:logic`으로 기존
  스위트에 회귀가 없는지 확인. **실측 — 예상대로 회귀 발생, 수정
  완료**: `diary-home.test.tsx`의 015·016 테스트 8개가 `getByText`로
  독백 문구를 즉시 조회하다 실패(타이핑 애니메이션 때문에 즉시 전체가
  안 보임). 원인은 테스트가 "즉시 렌더"를 전제했기 때문 — 정당한
  회귀다. `getByText` → `findByText`(비동기 재시도)로 8곳 갱신,
  전체 스냅샷 비교 2곳(콜드/핫 스타트 비교, load→generation 전환)은
  타이핑 완료 후 문구만 비교하도록 재작성. 수정 후 39개 스위트 전부
  GREEN(607 passed / 6 skipped), `test:logic` 104개 스위트 GREEN
  (2055 passed / 9 skipped).

**Checkpoint**: US1·US2·US3 전부 코드로 성립, 기기 없는 테스트 GREEN.

---

## Phase 5: 위반 주입 (방어 확인)

**Goal**: 헌법 「개발 방식」의 위반 주입 관례 — 계약을 실제로 어겨보고
테스트가 잡는지 확인한다.

- [X] T013 [P] `key` prop 제거 위반 주입 — **예상과 다른 결과**: 외부
  `key`를 빼도 T005가 계속 GREEN이었다. 원인은 `TypewriterText`(038)
  자체가 함수 본문에서 이미 `key={props.text}`를 내부적으로 걸고
  있어(`return <TypewriterTextInner key={props.text} {...props} />`),
  호출부의 외부 `key`가 없어도 `text` prop 변경 시 리마운트가 자동
  성립하기 때문 — 이 외부 `key`는 방어적 명시일 뿐 실질적으로 무해한
  중복임이 실측으로 확인됨. contracts C4에 이 사실 기록. 코드는
  가독성을 위해 `key` 유지.
- [X] T014 [P] `skipToEnd={true}`로 하드코딩하는 위반 주입 — T006이
  정확히 FAIL(문구가 즉시 완성됨)함을 확인, 되돌림.
- [X] T015 [P] `charMs={10}`으로 하드코딩하는 위반 주입 — **1차
  시도에서 T004가 GREEN으로 남아 테스트 자체의 약점을 발견**(진행
  횟수만 세는 assert라 어떤 charMs든 통과). T004를 절대 시간 경계
  검증으로 강화한 뒤 재시도 → 정확히 FAIL함을 확인, 되돌림.

**Checkpoint**: 세 위반 전부 테스트가 잡는 것을 확인, 코드는 정상
상태로 복원됨.

---

## Phase 6: 회귀·경계 확인

- [X] T016 `git diff --stat -- src/diary/ src/inference/ src/vision/
  src/app/state.ts`가 빈 출력임을 확인(C9, SC 대응).
- [X] T017 조사 결과 — **038과 달리 이번엔 실제 위험이 있다.**
  `.maestro/writing-monologue.yml`·`.maestro/writing-monologue-expansion.yml`
  둘 다 `tapOn: "일기 쓰기"` 직후 `runFlow: when: visible: "쓰고 있다"`로
  **정확한 전체 문자열**을 매칭한다 — 039로 이 문구가 글자 단위로
  노출되면서(폴백 "쓰고 있다" 5글자, `REVEAL.charMs=15ms`, 완성까지
  최대 75ms) `when` 평가 시점이 그 75ms 창과 겹치면 부분 문자열만 있어
  조건이 거짓으로 판정되고 **블록 전체가 SKIPPED로 지나갈 위험**이 있다
  (Maestro의 `when`은 재시도 없는 1회성 체크로 추정). **코드 수정으로
  섣불리 대응하지 않는다** — `.*쓰.*있다.*` 완화나 "그만두기" 선행
  대기 같은 수정을 시도했으나 후자는 중첩 `runFlow` 들여쓰기를 전체
  재구성해야 해 실수 위험이 커졌고, 038의 방법론(먼저 실측, 실제
  문제일 때만 최소 수정)을 따라 **실기기 검증(T020)에서 실제로 SKIPPED
  되는지 먼저 관찰**하기로 결정, 흐름 파일은 원상태로 되돌렸다
  (`git checkout`). 75ms는 Maestro의 통상 폴링 주기보다 짧을 수 있어
  실제로는 안 걸릴 가능성도 있다 — 추측으로 고치지 않는다(원칙 V).
  **T020에서 이 두 흐름이 SKIPPED 없이 정상 실행되는지 반드시 확인하고,
  SKIPPED가 관측되면 그때 흐름을 최소 수정한다.**
- [X] T018 `npm run lint`(eslint + tsc + 헌법 검사 + prettier) 전체 GREEN
  확인 — 0 errors, 기존 무관 경고 2개(release-signing.test.ts,
  safe-area.test.tsx), 헌법 검사 위반 0건, prettier 클린.

---

## Phase 7: 문서화·실기기 검증

- [X] T019 [P] `docs/roadmap/README.md` 23번 항목 아래에 "✅ 039에서
  확장" 절 추가 — 038 실기기 검증 중 사용자 요청으로 이어진 경위, 구현
  요약, 기존 테스트 회귀 수정, Maestro 위험 발견을 기록.
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
