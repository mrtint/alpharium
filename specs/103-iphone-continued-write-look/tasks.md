# Tasks: iPhone 이어 하기가 보이는 모습

**Input**: `specs/103-iphone-continued-write-look/` (spec.md, plan.md, research.md, contracts/progress-bar.md, quickstart.md)

테스트가 먼저다(헌법 「개발 방식」). 형식: `- [ ] Tnnn [P] [USn] 설명 + 경로`.

## Phase 1: Setup

- [ ] T001 `git branch --show-current`가 `103-iphone-continued-write-look`인지 확인하고, 기존 `__tests__/app/continued-write.test.ts`·`__tests__/app/app-continued-write-source.test.ts`의 토큰 비율(1/400) 단언 위치를 읽어 둔다.

## Phase 2: Foundational

- [ ] T002 비율 선택 모의를 `research.md` R1 표로 재현한다(순수 계산 — 제품 코드에 두지 않는다). 표가 맞으면 R2 후보(1/1600) 유지.

## Phase 3: User Story 1 — 막대 (P1)

**독립 검증**: 단위 테스트 + iPhone 14 실기기 회차(quickstart).

- [ ] T003 [US1] `__tests__/app/continued-write.test.ts`에 PB2~PB4를 먼저 쓴다 — 토큰 비율이 1/400보다 작고 32 × 비율이 조각 비율(1/16)보다 작음(PB2), 같은 박동열에서 새 비율의 위치가 옛 비율(테스트 안 상수 1/400로 따로 계산)보다 아래, 박동이 아주 많아도 95%를 넘지 않고 보고마다 한 칸 이상 오름. 이 시점엔 실패해야 한다.
- [ ] T004 [US1] `src/app/continued-write.ts`의 `BEAT_SHARE.token`을 1/1600으로 바꾸고 주석(상단 설명·`BEAT_SHARE` 설명)을 새 값·근거(research R1)·「사람이 정한 값」으로 고친다. 기존 1/400 단언(`continued-write.test.ts` 헤더 주석 포함)을 새 값으로 갱신한다.
- [ ] T005 [US1] 위반 주입: `BEAT_SHARE.token`을 1/400으로 되돌려 T003 테스트가 실패하는지 확인하고(치환 적용을 먼저 단언) 되돌린다.
- [ ] T006 [US1] `__tests__/app/app-continued-write-source.test.ts`가 새 소스에서 통과하는지 확인하고, 막힌 것이 있으면 맞춘다(주석을 걷고 읽는 규칙 유지).
- [ ] T007 [US1] 102 세션(`alpharium-a7`)에 iPhone 14 점유 시작·예상 시간(약 25분)을 알리고, 개발 환경 Release 빌드를 만들어 덮어 설치한 뒤(JS가 번들되어 코드 변경에는 재빌드가 필요하다; `specs/087-ios-real-device-verify/quickstart.md` 26행 명령, 개발 인증서는 이 맥 키체인에 있음. 같은 팀·번들 ID라 모델·일기는 그대로, `--remove-existing-content` 금지. TestFlight 업로드가 아니므로 release 업로드 제한과 무관) 충전 없는 이어 하기 1회를 사람과 함께 돈다. 결과를 `quickstart.md` 결과 표에 적는다(report 횟수, 글 단계 후반 completedUnitCount 추이와 900k에 닿은 시각, 종료).
- [ ] T008 [US1] 실기기에서 `expired`(정체 종료)가 났거나 SC-003 판단이 모자라면 비율을 다시 정해 T004·T007을 반복한다. 모자라 조각 비율·곡선 모양을 바꿔야 하면 멈추고 소유자에게 묻는다(plan 위험).

## Phase 4: User Story 2 — 배너 글자 (P2)

- [ ] T009 [US2] `AGENTS.md` 「iPhone 이어 하기(092)」 `남은 위험`을 고쳐 쓴다 — 막대 겉모습 문장은 새 값·실측 결과로 바꾸고, 배너 글자색은 시스템 몫이며 소유자가 받아들이기로 했다(2026-10-23)는 한 줄을 둔다(주석 덧대기 금지).
- [ ] T010 [US2] `git diff`에 `modules/pocketlog-continued-write/`와 `src/i18n/catalogs/ko/`가 없음을 확인한다(FR-007·FR-009).

## Phase 5: User Story 3 — all-written (P2)

- [ ] T011 [P] [US3] `src/schedule/decision.ts`·`src/app/use-auto-write-handoff.ts`·`use-auto-write-claim.ts`·일기 저장소 목록 읽기를 훑어 `existingDiaryDays`의 출처와 캐시 가능성을 `quickstart.md`에 적는다(research R5).
- [ ] T012 [US3] iPhone 14에서 094와 같은 순서(일기 모두 지우기 → 자동 쓰기 켜기 → 시각 바꾸기 → 시딩 재기동)를 시도하고 개발자 화면 「최근 자동 쓰기 시도」·「최근 실패」·`diary/` 목록을 같은 시각으로 읽어 `quickstart.md`에 적는다. 재현되면 원인을 정하고, 작으면(한 파일·한 규칙) 테스트를 먼저 쓰고 고친다 — 크면 원인만 닫고 로드맵에 새 과제로 올린다. 재현 안 되면 「재현 안 됨」으로 닫는다.

## Phase 6: Polish

- [ ] T013 `npm test`·`npm run lint`를 실행해 통과를 확인한다.
- [ ] T014 `quickstart.md`의 결과 표·③ 기록을 완성한다(SC-001~SC-004 대조).

- [ ] T015 로드맵 갱신(별도 커밋): `docs/roadmap/README.md` 「진행 예정 과제」에서 이 과제를 빼고 「완료 이력」 표에 스펙 103으로 한 줄 옮긴다(소유자가 시킨 뒤에만 커밋). ③이 새 과제를 낳았으면 그 과제를 로드맵에 올린다.

## 의존

T001 → T002 → T003 → T004 → T005, T006 → T007 → T008. T009는 T008 뒤(결과 문장). T011은 언제든, T012는 기기 점유 조정 후(T007과 같은 점유 구간에 묶어도 된다). T013·T014는 마지막, T015는 T014 뒤 별도 커밋(로드맵 이력).
