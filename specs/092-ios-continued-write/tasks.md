# Tasks: iPhone — 사용자가 시작한 쓰기를 앱을 나가도 끝까지

TDD 필수.

## Phase 1: 기반

- [ ] T001 [P] 실패 테스트 + 구현: 박동 구독 `src/inference/heartbeat.ts`(종류 `photo`·`chunk`만, 구독 해제) + `__tests__/inference/heartbeat.test.ts` (CW7·FR-004)
- [ ] T002 [P] 실패 테스트 + 구현: FR-010 — 쉼을 멈춤이 끊음(`paced`가 쉼 중 `stopped()`를 짧은 간격으로 확인)·마지막 조각 뒤 쉬지 않음(`completePaced`)·`stopRequested` 정리 자리·호출 한 번 CPU 상한 주석 in `src/inference/pacing.ts`·`src/inference/llama-port.ts`, 테스트 `__tests__/inference/pacing.test.ts`·`__tests__/inference/llama-port.test.ts` (CW8)

## Phase 2: US1 — 앱을 나가도 끝까지 (P1)

- [ ] T003 [US1] 실패 계약 + 구현: 로컬 모듈 `modules/pocketlog-continued-write/`(package.json·expo-module.config.json·ios/PocketlogContinuedWrite.podspec·ios/PocketlogContinuedWriteModule.swift — `begin`·`report`·`finish`·`onExpired`, `#available(iOS 26, *)`, `.fail`, 와일드카드 처리기 1회 등록, 처리기 전 보고 보관), Info.plist 와일드카드 in `plugins/with-battery-bg-task.js`, 계약 `__tests__/config/continued-write-module.test.ts` (CW1)
- [ ] T004 [US1] 실패 테스트 + 구현: 통로 `src/app/continued-write-port.ts`(모듈 없음·예외 → 거절) + `__tests__/app/continued-write-port.test.ts` (CW2)
- [ ] T005 [US1] 실패 테스트 + 구현: 세션 `src/app/continued-write.ts`(`start(title)` → `{ accepted, stage(s), beat(kind), finish(ok), onExpired(cb) }`, 박동 구독은 받아들여진 동안만, 두 번 닫지 않음) + `__tests__/app/continued-write.test.ts` (CW3·FR-007)
- [ ] T006 [US1] 실패 테스트 + 구현: 홈 배선 — prop `continuedWrite?` in `src/ui/DiaryHomeScreen.tsx`: `generate` 시작 때 신청, `onProgress` 단계 보고, `finally` 닫기, 받아들여진 쓰기는 앞 벗어남에 `stop()` 안 함, 만료 → `stop()`(기록 「도중에 끊김」), 그만두기·지우기(058 `stopHome`) → 실패로 닫기; 테스트 `__tests__/ui/continued-write-home.test.tsx` (CW4·FR-001·FR-006)
- [ ] T007 [US1] 실패 테스트 + 구현: 앱 밖 성공 → 완성 알림 — `sendCompletionNotification` export in `src/schedule/task.ts`, `App.tsx`가 세션 주입(iOS만)·홈 prop `onSavedAway?(day, character)` 연결, 앞 판정은 `readLaunchState()`; 소스 계약 + 홈 테스트 (CW5·FR-008)
- [ ] T008 [US1] 실패 테스트 + 구현: `pacingFor("screen","ios")` 조각 생성(쉼 0·조각 32, 스레드·한도 옵셔널) in `src/inference/assembly.ts`·`src/inference/on-device.ts`, `__tests__/inference/assembly.test.ts`·079 소스 계약 갱신 (CW6·FR-005)

## Phase 3: US2 — 진행 표시 (P2)

- [ ] T009 [P] [US2] 문구 카탈로그 `src/i18n/catalogs/ko/continued.ts`(제목 함수·단계 셋, 숫자 없음) + 골든 `ADDED_AFTER_GOLDEN` + 세션이 카탈로그를 씀 (FR-002)
- [ ] T010 [US2] 박동 내기: 조각 끝 `beat("chunk")` in `src/inference/llama-port.ts`, 캡션 한 장 끝 `beat("photo")` in `src/vision/vision-port.ts` + 테스트 (CW7·FR-003)

## Phase 4: 실기기·마무리

- [ ] T011 `npm test`·`npm run lint`
- [ ] T012 prebuild·Release 빌드·무선 설치, quickstart 1~5 실측(충전 없음) — CPU 감시로 죽으면 R6대로 바꾸고 다시 (FR-009·SC-001~003)
- [ ] T013 AGENTS 092 절·quickstart 「실측」

## Dependencies
T001·T002 → T010. T003 → T004 → T005 → T006 → T007. T008 독립. T009 → T005의 문구. 모두 → T011 → T012 → T013.
