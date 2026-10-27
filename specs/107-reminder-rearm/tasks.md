# Tasks: 쓸 차례 알림 다시 걸기

**Input**: [spec.md](spec.md) · [plan.md](plan.md) · [contracts/rearm.md](contracts/rearm.md) · [data-model.md](data-model.md) · [quickstart.md](quickstart.md)
**Tests**: 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」) — 테스트가 실패하는 것을 확인한 뒤 구현한다.

## Phase 1: Setup

- [x] T001 기준선: `npx jest __tests__/schedule --selectProjects logic`가 통과하는지 확인한다(`node_modules`는 메인 저장소를 링크해 쓴다)

## Phase 2: 사용자 이야기 1·2 — 첫 맞추기에서 전부 다시 건다 (P1·P2)

**독립 테스트**: 통로 대역에서 계획과 같은 예약이 걸려 있어도 첫 맞추기는 계획 수만큼 `schedule`한다.

- [x] T002 [US1] RA1·RA2 실패 테스트를 `__tests__/schedule/reminder-rearm.test.ts`(새 파일 — 기존 파일 비대화를 피함)에 쓴다(`rearm` 문 대역: 같은 예약 걸림 + pending → 전부 `schedule`; pending 아님 → 0건)
- [x] T003 [US1] RA3·RA4·RA5 실패 테스트를 같은 파일에 쓴다(`schedule` 실패 시 `done` 안 부름·소비 안 됨, 읽기 실패 RC6·꺼짐·빈 계획이면 `pending`/`done` 미소비, 목록 못 읽은 맞추기 소비)
- [x] T004 [US1] `src/schedule/reminders.ts`에 `RearmGate` 형과 `ReminderDeps.rearm?`을 더하고 다시 걸기 분기·`schedule` 실패 추적·`done()` 호출을 구현한다
- [x] T005 [US1] 문(門) 기본 조립: `src/schedule/reminder-deps.ts`에 모듈 메모리 문과 `overrides.rearmGate`를 더하고, 프로세스당 한 번(`pending` 참 → `done` 뒤 거짓)을 `__tests__/schedule/reminder-deps.test.ts`에 테스트한다

## Phase 3: 사용자 이야기 3 — 기존 규칙 불변 (P1)

- [x] T006 [US3] RA6 테스트(`reminder-rearm.test.ts`): 다시 걸기 맞추기에서도 쓴 날 거두기·RC8 지난 시각 보존·104 지연 예약 보존·트레이 거두기가 같다
- [x] T007 [US3] RA7 테스트: 거의 동시에 두 번 부르면 `schedule`이 한 번분만(`reminder-rearm.test.ts`)
- [x] T008 [US3] 조립 테스트 `__tests__/schedule/reminder-rearm-assembly.test.ts`: `expoReminderDeps`(대역 통로·같은 문 인스턴스)로 두 번 맞추면 첫 번째만 다시 걸고, 새 문(새 프로세스)에서 다시 건다

## Phase 4: Polish

- [x] T009 위반 주입: `rearm` 분기 삭제 → T002 실패, `done()`을 실패 무시로 변경 → T003 실패 확인 후 되돌린다
- [x] T010 `npm run test:logic`, `npm run test:ui`, `npm run lint` 통과(실제 출력 확인). FR-005 확인: `git status`에 새 저장 파일·`src/i18n/` 변경이 없다
- [x] T011 AGENTS.md 「자동 쓰기·알림·기록」의 쓸 차례 알림 문단에 다시 걸기 사실 한 줄과 실기기 미확인을 고쳐 쓴다(헌법 검사·문서 대조 테스트가 있으면 같이 통과)

## Dependencies

T001 → T002·T003 → T004 → T005 → T006~T008 → T009~T011. MVP = T002~T005.
