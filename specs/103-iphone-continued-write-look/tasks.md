# Tasks: iPhone 이어 하기가 보이는 모습

**Input**: `specs/103-iphone-continued-write-look/` (spec.md, plan.md, research.md, contracts/progress-bar.md, quickstart.md)

테스트가 먼저다(헌법 「개발 방식」). 형식: `- [ ] Tnnn [P] [USn] 설명 + 경로`.

## Phase 1: Setup

- [x] T001 `git branch --show-current`가 `103-iphone-continued-write-look`인지 확인하고, 기존 `__tests__/app/continued-write.test.ts`·`__tests__/app/app-continued-write-source.test.ts`의 토큰 비율(1/400) 단언 위치를 읽어 둔다.

## Phase 2: Foundational

- [x] T002 비율 선택 모의를 `research.md` R1 표로 재현한다(순수 계산 — 제품 코드에 두지 않는다). (R2 후보 1/1600은 1회차 실측으로 폐기 — R6).

## Phase 3: User Story 1 — 막대 (P1)

**독립 검증**: 단위 테스트 + iPhone 14 실기기 회차(quickstart). 1회차(토큰 1/1600, research R6)는 효과가 없어 쌍곡선 공식으로 바뀌었다(소유자, Clarifications) — 아래 T003~T005는 처음 안의 기록이고 T016~T020이 새 안이다.

- [x] T003 [US1] (폐기된 첫 안) 토큰 비율 테스트를 `__tests__/app/continued-write.test.ts`에 썼다 — T016이 대체한다.
- [x] T004 [US1] (폐기된 첫 안) `src/app/continued-write.ts`의 `BEAT_SHARE.token`을 1/1600으로 바꿨다 — T017이 대체한다.
- [x] T005 [US1] (폐기된 첫 안) 위반 주입으로 PB2·PB3 실패를 확인했다.
- [x] T006 [US1] `__tests__/app/app-continued-write-source.test.ts` 통과 확인(첫 안 기준). T019에서 새 소스로 다시 본다.
- [x] T007 [US1] 102 세션에 점유를 알리고 개발 환경 Release 빌드를 만들어 덮어 설치한 뒤 1회차(충전 중, 사진 5장)를 돌았다. 결과는 `research.md` R6, `quickstart.md`.
- [x] T008 [US1] 1회차에서 정체가 안 줄어 소유자에게 물었다 — 쌍곡선으로 결정(Clarifications, 2026-10-23).
- [x] T016 [US1] `__tests__/app/continued-write.test.ts`에 PB2~PB4를 새 공식 기준으로 다시 쓴다 — (a) 토큰 약 3000개·조각 약 100개 시점의 위치가 옛 공식(테스트 안에서 1/4·1/16·1/400으로 따로 계산)보다 아래이고 그 시점 토큰 박동 하나의 걸음이 옛 공식의 10배 이상, (b) 박동이 아주 많아도 보고마다 한 칸 이상 오르고 95%·`PROGRESS_TOTAL - 1`을 넘지 않음, (c) 토큰 박동 하나는 조각 박동 하나보다 조금 오르고 위치는 박동에 대해 줄지 않음, (d) 단계가 바뀌면 몫 시작으로 뛰고 뒤로 가지 않음. 기존 정확값 단언(150_000·225_000·481_250 등)을 새 값으로 갱신한다. 이 시점엔 실패해야 한다.
- [x] T017 [US1] `src/app/continued-write.ts`의 박동 계산을 쌍곡선(`단계 시작 + 몫 × w/(w+k)`)으로 바꾼다 — 박동 무게(사진 1·조각 4·토큰 1), 반몫(사진 2·글 1000, 준비는 박동이 없어 사용하지 않음)을 상수로 두고 주석에 근거(research R6·R7)와 「사람이 정한 값」을 적는다. `BEAT_SHARE`와 관련 주석(1/400·1/1600)은 지운다. 보고마다 한 칸 이상 오르는 하한과 95% 상한은 유지한다.
- [x] T018 [US1] 위반 주입: 위치 계산을 옛 공식(남은 몫의 1/4·1/16·1/400)으로 되돌려 T016 테스트가 실패하는지 확인하고(치환 적용을 먼저 단언) 되돌린다.
- [x] T019 [US1] `__tests__/app/app-continued-write-source.test.ts`와 `__tests__/app` 전체가 새 소스에서 통과하는지 확인하고, 막힌 것이 있으면 맞춘다(주석을 걷고 읽는 규칙 유지). 소스에 `BEAT_SHARE`·`1 / 400`이 남지 않았는지 `grep`으로 센다.
- [x] T020 [US1] 개발 환경 Release 빌드를 다시 만들어 덮어 설치하고(102 세션에 점유 알림), 충전 중 1회·충전 없음 1회를 돈다. 결과(구간별 completedUnitCount, 끝 5분의 변화, 종료 결과)를 `quickstart.md` 표에 적는다. `expired`가 났거나 끝 5분 변화가 SC-003에 못 미치면 상수를 다시 정해 T017·T020을 반복한다(공식의 모양을 또 바꿔야 하면 멈추고 소유자에게 묻는다).

## Phase 4: User Story 2 — 배너 글자 (P2)

- [x] T009 [US2] `AGENTS.md` 「iPhone 이어 하기(092)」 `남은 위험`을 고쳐 쓴다 — 막대 겉모습 문장은 새 값·실측 결과로 바꾸고, 배너 글자색은 시스템 몫이며 소유자가 받아들이기로 했다(2026-10-23)는 한 줄을 둔다(주석 덧대기 금지).
- [x] T010 [US2] `git diff`에 `modules/pocketlog-continued-write/`와 `src/i18n/catalogs/ko/`가 없음을 확인한다(FR-007·FR-009).

## Phase 5: User Story 3 — all-written (P2)

- [x] T011 [P] [US3] `src/schedule/decision.ts`·`src/app/use-auto-write-handoff.ts`·`use-auto-write-claim.ts`·일기 저장소 목록 읽기를 훑어 `existingDiaryDays`의 출처와 캐시 가능성을 `quickstart.md`에 적는다(research R5).
- [x] T012 [US3] iPhone 14에서 094와 같은 순서(일기 모두 지우기 → 자동 쓰기 켜기 → 시각 바꾸기 → 시딩 재기동)를 시도하고 개발자 화면 「최근 자동 쓰기 시도」·「최근 실패」·`diary/` 목록을 같은 시각으로 읽어 `quickstart.md`에 적는다. 재현되면 원인을 정하고, 작으면(한 파일·한 규칙) 테스트를 먼저 쓰고 고친다 — 크면 원인만 닫고 로드맵에 새 과제로 올린다. 재현 안 되면 「재현 안 됨」으로 닫는다.

## Phase 6: Polish

- [x] T013 `npm test`·`npm run lint`를 실행해 통과를 확인한다.
- [x] T014 `quickstart.md`의 결과 표·③ 기록을 완성한다(SC-001~SC-004 대조).

- [ ] T015 로드맵 갱신(별도 커밋): `docs/roadmap/README.md` 「진행 예정 과제」에서 이 과제를 빼고 「완료 이력」 표에 스펙 103으로 한 줄 옮긴다(소유자가 시킨 뒤에만 커밋). ③이 새 과제를 낳았으면 그 과제를 로드맵에 올린다.

## 의존

T001 → T002 → (T003~T008 완료) → T016 → T017 → T018, T019 → T020. T009는 T020 뒤(결과 문장). T011은 언제든, T012는 기기 점유 조정 후(T007과 같은 점유 구간에 묶어도 된다). T013·T014는 마지막, T015는 T014 뒤 별도 커밋(로드맵 이력).

## Phase 7: Convergence

- [x] T021 충전 없는 3회차의 완성 알림 도착 여부와 시각을 사용자에게 확인해 `quickstart.md` 결과 표에 적는다 per SC-002 (partial) — 3회차는 알림 없음(화면 잠금+시스템 질문), 화면을 안 건드린 4회차(20일)는 12:05에 도착, `notified.json`으로 확인
