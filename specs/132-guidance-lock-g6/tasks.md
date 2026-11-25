# Tasks: 안내 규칙 잠금 테스트 (G6)

**Input**: [spec.md](spec.md) · [plan.md](plan.md) · [contracts/lock-rules.md](contracts/lock-rules.md) · [research.md](research.md)
TDD: 테스트를 먼저 쓴다(헌법 「개발 방식」).

## Phase 1: Setup / Phase 2: Foundational

없음 — 기존 jest 설정·`__tests__/i18n/ko-literals.ts`를 그대로 쓴다.

## Phase 3: User Story 1 — 지킬 수 없는 약속을 막는다 (P1)

**Independent test**: `npx jest __tests__/config/guidance-lock.test.ts --selectProjects logic`

- [X] T001 [P] [US1] GL1(K1) 테스트 — 사용자 화면 카탈로그(R2 제외 파일 목록 상수)·`site/**/*.html`(`<!-- -->` 제거)·`store/ko/*.txt`에서 금지 낱말 검사, 허용 목록(파일+조각) 적용 in `__tests__/config/guidance-lock.test.ts`
- [X] T002 [P] [US1] GL2(K3) 테스트 — 카탈로그 소스(주석 제거)에서 `\w+Ios` 키를 모아 짝 표(R5)·허용 목록과 대조, 짝 표의 안드로이드 키 실재 확인 in `__tests__/config/guidance-lock.test.ts`
- [X] T003 [US1] GL3(K4) 테스트 — `ko.download.slides`(제목+본문)·`ko.onboarding.permissions.notifications`·`ko.welcome`의 문자열 값에서 약속 낱말 + 조건 검사, `welcomeBody` 허용 in `__tests__/config/guidance-lock.test.ts`

## Phase 4: User Story 2 — 안 되는 기기에서 「나가도 계속」을 말하지 않는다 (P1)

**Independent test**: `npx jest __tests__/app/leave-note.test.ts --selectProjects logic`

- [X] T004 [US2] LN1·LN2·LN3 테스트 먼저(실패 확인) in `__tests__/app/leave-note.test.ts`
- [X] T005 [US2] `writingLeaveNote(platform, continuedAvailable: boolean | undefined)`와 `continuedAvailableFor(platform, version: string | number | undefined)` 구현 in `src/app/leave-note.ts`
- [X] T006 [US2] 조립부 호출을 `writingLeaveNote(p, continuedAvailableFor(p, Platform.Version))`로 in `App.tsx`

## Phase 5: User Story 3 — 홈 하단 안내는 한 번에 하나 (P2)

**Independent test**: `npx jest __tests__/ui/guidance-lock-home.test.tsx --selectProjects ui`

- [X] T007 [P] [US3] HB1(K8)·HB2(K9) 렌더 테스트 — `DiaryListScreen`에 `constraint`+`toast` / `writing`+`constraint` in `__tests__/ui/guidance-lock-home.test.tsx`

## Phase 6: Polish

- [X] T008 위반 주입 6건(quickstart 3번) — 각 테스트 실패 확인 후 되돌림, 결과를 `specs/132-guidance-lock-g6/quickstart.md` 「기록」에
- [X] T009 규칙 문서 정리 — 0-4 G6 행, 5장 K1·K3·K4·K8·K9·K11 행을 걷고 잠근 테스트 파일로 연결, 1-3 R6의 「짝이 비어 있는 것」·4-1의 K11 해당 ⛔ 행 갱신 in `docs/user-guidance-rules.md`
- [X] T010 `npm test`(문구 골든 `ko-golden.test.ts` 변경 없이 통과 — SC-003)·`npm run lint` 통과
- [X] T011 실기기 확인(iPhone 14 쓰는 중 안내 줄, SM-S901N 무변화) → quickstart 「기록」

## Dependencies

US1·US3는 독립. US2는 T004 → T005 → T006. T008은 T001~T007 뒤, T009~T011은 마지막.
**MVP**: US2(유일한 동작 변경) + US1.
