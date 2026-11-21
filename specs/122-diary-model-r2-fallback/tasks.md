# Tasks: 온디바이스 일기 모델 교체와 R2 미러·폴백 내려받기 (122)

TDD: 각 구현 앞에 실패하는 테스트를 먼저 쓴다(AGENTS.md 「작업 습관」).

## Phase 1: Setup

- [X] T001 기준선 확인 — `npx jest __tests__/models --selectProjects logic`가 통과하는지 본다

## Phase 2: Foundational

- [X] T002 `src/models/types.ts` `ModelAsset`에 `fallbackUrl?: string`("예비 경로. 없으면 전환 없음. `url`과 달라야 한다") 추가

## Phase 3: US1 — 새 모델을 주 경로에서 받는다 (P1)

- [X] T003 [US1] `__tests__/models/roster.test.ts`에 `a1`의 url(R2 전체 주소)·fallbackUrl(HF)·expectedBytes 1_241_435_520·md5 dfc35a88fb1f5215f708ea5a348121b8·url≠fallbackUrl 단언 추가(먼저 실패)
- [X] T004 [US1] `src/models/roster.ts` `ASSETS.quiet` 값 교체와 출처 주석(2026-11-21 curl 200·CL·206, terrarium EXP-013~015) 갱신

## Phase 4: US2 — 주 경로 실패 시 예비 경로 (P1)

- [X] T005 [US2] `__tests__/models/acquisition-fallback.test.ts` 신규 — 계약 AF1~AF8(`contracts/acquisition-fallback.md`)을 가짜 포트로 검증(먼저 실패)
- [X] T006 [US2] `src/models/acquisition.ts` — 주 경로 `failed` 뒤 `fallbackUrl`로 한 번 전환(`settleResumeRecord` 재호출 → resume/start, paused 기록 삭제, 슬롯 핸들 교체)

## Phase 5: US3 — 옛 a1 정리 (P2)

- [X] T007 [P] [US3] `__tests__/models/acquisition-fallback.test.ts`에 옛 파일(1_522_796_768 B + 옛 검증 기록) → 삭제·새로 받기, 옛 구간 기록(totalBytes 1_522_796_768) → 정리, 정리 뒤 멈춘 기록 → 두 번째 prepare에서 이어받기 테스트
- [X] T008 [P] [US3] `__tests__/app/redownload-plan.test.ts`(있으면 그 파일)에 `remainingBytes`가 used>expected일 때 expected를 센다는 테스트(먼저 실패)
- [X] T009 [US3] `src/app/redownload-plan.ts` `remainingBytes` 수정

## Phase 6: US4 — 샘플링 (P2)

- [X] T010 [P] [US4] `__tests__/inference/sampling.test.ts`(신규)에 0.60/0.90/40/512 단언(먼저 실패)
- [X] T011 [US4] `src/inference/sampling.ts` 값·근거 주석 교체, `scripts/constitution-rules.ts`의 「일기는 0.8」 주석 갱신

## Phase 7: Polish

- [X] T012 위반 주입 — 전환 줄 제거·md5 한 글자 변경·remainingBytes 되돌림·temperature 되돌림 각각에서 테스트가 잡는지 확인 후 복구
- [X] T013 `npm run lint`·`npm test` 통과
- [X] T014 `AGENTS.md` 「저장소의 현재 상태」의 모델 줄(검증 로스터 `kanana-1.5-2.1b`)을 새 파일·경로로 갱신
- [X] T015 실기기 SM-S901N dev — `quickstart.md` 1~5 실행·기록, 못 본 것 [미확인]
- [X] T016 [P] FR-011 — `__tests__/models/boundaries.test.ts`에 `fallbackUrl`이 바깥쪽 타입(`DownloadProgress`·`DownloadFailure`·`ModelReadiness`)과 `src/ui/`에 나타나지 않는다는 소스 단언 추가

## Dependencies

T002 → T003~T006. US1·US3·US4 테스트는 병렬 가능. T012~T016은 마지막(T016은 T002 뒤 언제든).

## Implementation Strategy

MVP = US1+US2(교체·폴백). US3·US4는 같은 PR에서 이어서.

## Phase 8: Convergence

- [X] T017 새 외부 호스트(R2)·바뀐 모델 출처·모듈 크기(약 1.7GB)를 반영한 방침·지원·라이선스 페이지와 선언 초안·`__tests__/privacy` 변경의 근거를 plan.md 구조와 spec 가정에 기록 per FR-011·Constitution I (unrequested)
