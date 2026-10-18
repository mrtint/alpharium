# Tasks: iPhone 충전 없이 백그라운드에서 쓰기

TDD 필수.

## Phase 1: 측정 장치 (US2 — 먼저 설치해 하루를 잰다)

- [ ] T001 [US2] 실패 계약: 설치된 패치·Info.plist 식별자 둘(RQ1) in `__tests__/config/bg-task-request-patch.test.ts`
- [ ] T002 [US2] expo 패치 확장(요청 둘·식별자 둘 등록·`pocketlog.bgWakeIdentifier`) → `patches/expo-background-task+57.0.14.patch` 다시 만들기; `plugins/with-battery-bg-task.js` + `app.json` plugins 등록
- [ ] T003 [P] [US2] 실패 테스트 + 구현: `wake` 필드(값 `"power" | "battery"`만, 밖이면 필드 없이) in `src/app/auto-write-attempts.ts`, 꼬리 「· 충전」/「· 배터리」 in `src/app/diagnostics-view.ts`·`src/i18n/catalogs/ko/attempts.ts`, 골든 `ADDED_AFTER_GOLDEN` (WK2)
- [ ] T004 [US2] Swift `Function("wakeKind")` in `modules/pocketlog-bg-expiry/ios/PocketlogBgExpiryModule.swift`, `readWakeKind()` in `src/app/bg-expiry-port.ts`, 이름 대조 계약 in `__tests__/config/bg-expiry-module.test.ts` (WK1)
- [ ] T005 [US2] 태스크가 시작 때 `wake`를 읽어 시작 줄에(백그라운드만) — 주입 `wakeKind?` in `src/schedule/task.ts`, 테스트 `__tests__/schedule/background-generation.test.ts` — 같은 날 둘째 백그라운드 실행이 살아 있는 쓰기에 막혀 `already-running`으로 끝나는 갈래도(US1 AC3, 080 등록부) (WK2)
- [ ] T006 [US2] 측정 빌드 설치(무선)·하루 시작 — quickstart 2

## Phase 2: 느린 쓰기 (US1)

- [ ] T007 [P] [US1] 실패 테스트 + 구현: `pacingFor`·배터리 한도 in `src/inference/assembly.ts`, `__tests__/inference/assembly.test.ts` (PC1)
- [ ] T008 [P] [US1] 실패 테스트 + 구현: 쉼 계산·잠자기 `src/inference/pacing.ts` + `__tests__/inference/pacing.test.ts` (PC2)
- [ ] T009 [US1] 실패 테스트 + 구현: 조각 생성 `completePaced` in `src/inference/llama-port.ts`(엔진이 `pacing?`을 받아 `run`·`ask`가 씀), 가짜 컨텍스트 테스트 in `__tests__/inference/llama-port.test.ts` (PC3·PC5, 멈춤 포함)
- [ ] T010 [US1] 사진 장 사이 쉼 in `src/vision/vision-port.ts` + 테스트 (PC4)
- [ ] T011 [US1] 배선: `wiring.ts` `wake` → `on-device.ts` pacing·한도 → 엔진·사진 엔진; 태스크가 `makePipeline(resolution, {lockOwner, wake})` (FR-003·FR-005·FR-006)
- [ ] T012 [US1] 느린 쓰기 빌드 설치·충전 없는 완주 실측 — quickstart 3·4 (SC-001·SC-003; 충전 중 두 요청이 함께 깨면 쓰기 하나 — US1 AC3)

## Phase 3: US3 문구

- [ ] T013 FR-008 — SC-001 확인 시 `permBatteryHintIos` 085 문구로 + 테스트·골든 갱신, 아니면 유지 기록

## Phase 4: Polish

- [ ] T014 `npm test`·`npm run lint`
- [ ] T015 AGENTS 091 절, quickstart 「실측」
- [ ] T016 (조건부, FR-007) 예산 만료가 나면 캡션 이어 받기 — 그때 같은 날 다음 깨움이 이어 쓰도록 만료로 끝난 실행의 따라잡기 몫(078·090)을 어떻게 할지 함께 정한다(지금은 다음 날까지 밀린다 — spec Edge Cases). 만료가 안 나면 「필요 없었음」 기록

## Dependencies
T001→T002; T003·T004→T005→T006. T007·T008→T009·T010→T011→T012→T013. T006은 Phase 2와 나란히(하루 측정).
