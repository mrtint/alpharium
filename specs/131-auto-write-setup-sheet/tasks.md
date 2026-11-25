# Tasks: 자동 쓰기 설정 창 (G4, 131)

TDD(AGENTS 「테스트를 먼저 쓴다」): 각 구현 태스크 앞에 실패하는 테스트를 먼저 쓴다.

## Phase 1: Foundational

- [X] T001 `autoWriteSetupPending: boolean` 필드를 추가한다 — 「키 없음 → false」, 기본값 false, 파서·저장 반영 — in src/onboarding/flag.ts (테스트 __tests__/onboarding/flag.test.ts 먼저)
- [X] T002 순수 판정 `shouldShowAutoWriteSetup`과 조립 `confirmAutoWriteSetup`(contracts/auto-write-setup.md 그대로)을 만든다 in src/app/auto-write-setup.ts (테스트 __tests__/app/auto-write-setup.test.ts 먼저)

## Phase 2: User Story 1 — 첫 실행 끝 설정 창 (P1)

**Independent Test**: 새 설치 첫 실행 뒤 창 1회, 「켜기」 저장, 재시작 시 미표시.

- [X] T003 [US1] 창 문구 `autoWriteSetup.*`(title 「매일 일기를 써 드릴까요?」·rowAuto 「자동으로 쓰기」·rowHour 「쓰는 시각」·rowBattery 「배터리 제한 풀기」·conditionIos/conditionAndroid D5 원문·confirm 「켜기」·later 「나중에」)를 추가하고 골든 `ADDED_AFTER_GOLDEN`에 올린다 in src/i18n/catalogs/ko/
- [X] T004 [US1] `AutoWriteSetupDialog`를 만든다(props는 계약대로, 배터리 행 안드로이드만, 꼬리표 unknown이면 없음) in src/ui/AutoWriteSetupDialog.tsx (렌더 테스트 __tests__/ui/auto-write-setup-dialog.test.tsx 먼저)
- [X] T005 [US1] 온보딩이 `completed` false→true로 저장될 때 `autoWriteSetupPending: true`를 함께 저장한다 in src/ui/OnboardingScreen.tsx
- [X] T006 [US1] App에서 판정·마운트: 홈 준비(첫 실행 단계 `done`)·대기·`firstDiary.entered`/`step`·쓰는 중·확인창 여부로 `shouldShowAutoWriteSetup`, 「켜기」→`confirmAutoWriteSetup`(설정 효과 deps 재사용, 화면 상태 `autoDiary` 갱신), 「나중에」→대기만 false, 시각 행은 기존 `TargetHourDialog` 재사용 in App.tsx

## Phase 3: User Story 2 — 배터리 행 (P2, 안드로이드)

- [X] T007 [US2] 배터리 행 누름에 설정 화면 배터리 행과 같은 OS 설정 열기를 연결하고, 앞 복귀 때 `battery-exception-port` 상태 다시 읽어 꼬리표 갱신 in App.tsx

## Phase 4: User Story 3 — 권한 단계 통일 (P2)

- [X] T008 [US3] `planOnboardingSteps`에서 `battery-exception`을 뺀다(`requirements.ts` 목록은 유지, `batteryNoticeShown`은 판정에서 더 읽지 않음) in src/onboarding/decision.ts (테스트 __tests__/onboarding/decision.test.ts 먼저)
- [X] T009 [US3] 배터리 단계 전용 화면 코드·문구 쓰임을 걷는다 in src/ui/OnboardingScreen.tsx, src/i18n/catalogs/ko/onboarding.ts (설정 화면이 쓰는 문구는 남긴다)

## Phase 5: Polish

- [X] T010 슬라이드 3 제목·권한 설명(알림)·스토어 설명문을 K4대로 「켜 두면」 조건 품게 고치고 `CHANGED_AFTER_GOLDEN`에 올린다 in src/i18n/catalogs/ko/, store/ko/
- [X] T011 e2e 흐름 표·첫 실행 흐름(배터리 단계 제거)을 맞춘다 in docs/e2e/feature-flow-map.md, .maestro/
- [X] T012 규칙 문서에서 G4 행·끝난 전수 목록 행(243·244·237·297·304 등)을 지우고 AGENTS 「첫 실행」 줄을 고친다 in docs/user-guidance-rules.md, AGENTS.md
- [X] T013 `npm test`·`npm run lint` 통과, 위반 주입(판정에서 writing 조건 제거 → 테스트 실패 확인 후 되돌림)
- [X] T014 실기기 확인 quickstart.md 1~6, 「기록」 채움 in specs/131-auto-write-setup-sheet/quickstart.md

## Dependencies

T001→T002→(T004,T005,T006)→T007. T008·T009는 US1과 독립. T010~T014는 마지막.

## Parallel

T003·T004·T008 [P] 가능(서로 다른 파일).

## MVP

US1 + US3(G4는 쪼개지 않는다 — 규칙 문서 0-4).
