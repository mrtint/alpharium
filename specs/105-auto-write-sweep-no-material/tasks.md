# Tasks: 자동 쓰기 후보 훑기 (105)

**Input**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/sweep.md](contracts/sweep.md) · [research.md](research.md)

테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다(TDD, AGENTS). 경로는 저장소 루트 기준.

## Phase 1: Setup

- [x] T001 현재 브랜치가 `105-auto-write-sweep-no-material`인지 `git branch --show-current`로 확인하고 `npx jest __tests__/schedule/retry.test.ts __tests__/schedule/decision.test.ts __tests__/schedule/auto-write.test.ts --selectProjects logic`로 기준선이 초록임을 본다

## Phase 2: Foundational (후보 목록)

- [x] T002 [P] `__tests__/schedule/retry.test.ts`에 `pickRetryDays` 테스트 추가(일기 없는 후보 전부, 최근→과거 순, 전부 있으면 빈 배열, 입력에 없는 날 불포함) — 실패 확인
- [x] T003 `src/schedule/retry.ts`에 `pickRetryDays(selectableDays, existingDiaryDays): DayDate[]` 추가하고 `pickRetryDay`는 `pickRetryDays(...)[0] ?? null`로 유지
- [x] T004 [P] `__tests__/schedule/decision.test.ts`에 `act:true`가 `days`(첫 원소 === `day`)를 싣는 테스트 추가: 창 안 사흘 / 창 밖 오늘 제외 / 오전 목표 목표 시각 전 어제 제외 / 후보 없음 시 종전 이유 — 실패 확인
- [x] T005 `src/schedule/decision.ts`: `ScheduleDecision`의 `act:true`에 `days: readonly DayDate[]`를 더하고 `decideSchedule`이 `pickRetryDays`로 `day`·`days`를 채운다(`waiting` 계산도 `pickRetryDays`로)

## Phase 3: User Story 1 + 2 — 훑기와 안전 경계 (P1)

**Independent Test**: 오늘 재료 없음·어제 재료 있음 입력이 어제를 쓰기로 정하고, 경계 입력이 contracts/sweep.md를 지킨다.

- [x] T006 [US1] `__tests__/schedule/auto-write.test.ts`에 재현 테스트 먼저: 목표 시각 이후, 오늘 재료 없음·어제 재료 있음 → `{kind:"write", day: 어제}`, `previewDay`가 최근→과거 순으로 불린다 — 실패 확인(SW1·SW3)
- [x] T007 [P] [US1] 같은 파일에 추가: 가장 오래된 날만 재료 있음→그 날 / 재료 있는 날 둘→가장 최근 / 후보 하나(있음·없음)는 종전과 같음(SW3·SW6)
- [x] T008 [P] [US2] 같은 파일에 추가: 첫 후보 사진 권한 거부→`saveSkippedDay(첫 후보)`+`skip no-photo-access`, 더 부르지 않음 / 전부 재료 없음→`skip{day:첫 후보, because:"no-material"}`이고 skipPort에 아무것도 안 씀 / 오늘 재료가 나중에 생기면 다음 판정에서 오늘이 후보(SW2·SW5·SW7)
- [x] T009 [P] [US2] 같은 파일에 추가: 첫 후보 `previewDay` 예외→다음 후보 재료 있으면 그 날 / 셀 수 없음(`unknown` 사진)은 건너뜀 / 전 후보 예외→첫 예외를 던짐 / 후보 하나가 예외→던짐(SW4·SW6)
- [x] T010 [P] [US2] 같은 파일에 추가: 창 밖에서 오늘 재료 있음·어제 없음→오늘을 훑지 않아 `no-material` / 오전 목표 목표 시각 전 어제 재료 있음→어제 훑지 않음(FR-002)
- [x] T011 [US1] `src/schedule/auto-write.ts`의 `resolveAutoWrite`에 훑기 구현(contracts SW1~SW7), 헤더 주석의 판정 순서(1~4)를 훑기에 맞게 고친다. 하루 경계는 새로 계산하지 않고 `now`·기존 `selectableDays`만 쓴다(FR-011)
- [x] T012 [US1] 조립 테스트 `__tests__/schedule/sweep-assembly.test.ts`: 실제 `decideSchedule`·`resolveAutoWrite`·`runAutoDiaryTask`(주입 통로)로 백그라운드가 어제를 고르고 90 몫(`saveCatchUpDay`)이 파이프라인 직전에만 쓰임을 확인(재료 없음만 나오면 몫 안 씀; 몫을 이미 썼으면 신호를 읽지 않고 `catch-up-spent`로 끝남 — spec US2-5·FR-008) — 같은 입력으로 앱 열기 훅 판정도 같은 날(FR-003, 080·081·082)
- [x] T013 [US2] 위반 주입: `resolveAutoWrite`의 루프를 첫 후보에서 멈추게 임시로 되돌려 T006·T012가 실패함을 확인(치환 적용 여부 먼저 단언) 후 원복

## Phase 4: User Story 3 — 시도 기록의 날 (P2)

**Independent Test**: 쓰기로 정해진 시도 줄에 `day`가 저장·복원되고 옛 줄이 읽히며 화면 문구가 나온다.

- [x] T014 [US3] `__tests__/app/auto-write-attempts.test.ts`에 추가: `recordAttemptEnd(..., day)` 저장·로드 왕복 / `day` 없는 옛 JSON·형식이 틀린 `day`는 날 없이 읽힘 / 합치기는 날이 다르면 별도 줄 / `attemptDayOf(write)`=날, 그 밖 undefined / `ATTEMPT_OUTCOMES` 불변 — 실패 확인(AT1·AT2)
- [x] T015 [US3] `src/app/auto-write-attempts.ts`: `AutoWriteAttempt.day?: DayDate`, 읽기 검증(`^\d{4}-\d{2}-\d{2}$`), 저장은 있을 때만, `attemptDayOf(decision)`, `recordAttemptEnd(port, path, at, outcome, day?)`(같은 줄 교체·합치기에 날 반영)
- [x] T016 [P] [US3] `src/schedule/task.ts`: `BodyOutcome`에 `day?`를 더하고 `decision.kind === "write"` 이후의 반환(`ran`·`cancelled`·`already-running`·`no-character`·`failed`)에 `decision.day`를 싣고 `recordAttemptEnd`에 넘긴다. `__tests__/app/auto-write-attempts-wiring.test.ts`(백그라운드 조립)에 기록 줄 `day` 단언 추가
- [x] T017 [P] [US3] `src/app/use-auto-write-handoff.ts`: `recordAttemptEnd`에 `attemptDayOf(decision)` 전달. `__tests__/app/use-auto-write-handoff.test.tsx`에 기록 줄 `day` 단언 추가
- [x] T018 [US3] `src/i18n/catalogs/ko/attempts.ts`에 `withDay(outcome, month, day)` 꼬리 문구 추가, `src/app/diagnostics-view.ts`의 `attemptLines`가 `item.day`가 있으면 붙인다. `__tests__/app/diagnostics-view.test.ts`에 줄 문구 테스트, 문구 골든은 `ADDED_AFTER_GOLDEN`에 올린다(`__tests__/i18n/ko-golden.test.ts`)

## Phase 5: Polish

- [x] T019 FR-011 확인: `src/schedule/auto-write.ts`·`retry.ts`에 `getHours()` 같은 하루 기준 이동이 없는지 소스를 세고(`DB11`), `npm run lint`(헌법 검사 포함)로 경계 규칙을 확인한다
- [x] T020 `AGENTS.md`의 자동 쓰기 서술(「목표 시각 +3시간 창 안에는…」 줄 근처)에 훑기 사실 한 줄과 시도 기록의 `day`를 반영하고, 085/057/078 설계 서술과 어긋나는 곳이 있으면 고친다
- [x] T021 `npm test`·`npm run lint` 전체 실행
- [x] T022 `release-notes/ko.txt`에 사용자 눈높이 한 줄 추가(예: 오늘 사진이 없어도 이전 날의 일기를 저절로 써 줘요) — 500자 한도 확인
- [ ] T023 SM-S901N dev 빌드 실기기 확인(quickstart.md): 오늘 재료 없음·어제 표본 사진, 앱 열기 자동 쓰기가 어제를 쓰고 진단 「최근 자동 쓰기 시도」에 날이 남는지. 가능하면 `cmd jobscheduler run -f` 백그라운드. 결과와 못 본 것을 `specs/105-auto-write-sweep-no-material/device-check.md`에 적는다

## Dependencies

- T002→T003, T004→T005, 둘 다 Phase 3 선행. T006~T010(테스트) → T011 → T012 → T013.
- US3(T014~T018)는 T011과 독립이나 T012 이후가 안전. T016·T017은 T015 뒤.
- Polish는 전부 뒤. T023은 T021 뒤.

## Parallel

- T002‖T004, T007~T010 동시 작성, T016‖T017.

## Strategy

MVP = Phase 2 + 3(훑기). US3와 Polish는 이어서. 구현 완료 선언 전에 T023을 건너뛰지 않는다.
