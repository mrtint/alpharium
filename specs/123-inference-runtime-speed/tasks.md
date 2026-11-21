# Tasks: 추론 런타임 속도 최적화 (123)

**Input**: spec.md · plan.md · research.md · data-model.md · contracts/ · 테스트 먼저(TDD) — 헌법 「개발 방식」

## Phase 1: Setup
- [ ] T001 `adb reverse --list`로 reverse 확인 후 SM-S901N을 Metro(또는 main 빌드)로 띄우고 새 a1·표본 하루(사진 있는 날)를 확인한다 (기기)
- [ ] T002 iPhone 14에 122 개발 서명 Release 빌드가 새 a1로 도는지 확인한다 (기기)

## Phase 2: Foundational — 스파이크·기준선 (코드 변경 없음, 제품에 계측 없음)
- [ ] T003 [US1] 기준선: 두 기기에서 변경 없는 코드로 쓰기를 조건당 3회 돌려 본문 t/s·1+2턴 총 시간·최고 RAM을 `specs/123-inference-runtime-speed/quickstart.md` 표에 기록한다 (개발 로그·`dumpsys meminfo`·Instruments)
- [ ] T004 [US1] llama.cpp 로그에서 `flash_attn_type: auto`가 실제로 켜졌는지 읽어 quickstart에 기록한다
- [ ] T005 [US1] 임시(커밋 안 함) 변경으로 `flash_attn_type` `on`/`off`를 각각 같은 방식으로 측정해 표에 기록한다
- [ ] T006 [US1] 임시 변경으로 2턴 상태 재사용 후보 (a)`completion()`에 `save_state_path`/`load_state_path`, (b)`saveSession`/`loadSession`을 시도해 동작 여부·제목 구간 시간·최고 RAM을 표에 기록한다 (research R2)
- [ ] T007 [US1] 임시 변경으로 `getBackendDevicesInfo()` 값을 찍어 `maxMemorySize`가 기기 RAM인지 확인하고, 강제 `cache_type_k/_v: q8_0`(FA 포함/미포함)의 완주·RAM을 기록한다 (research R3)
- [ ] T008 [US1] 임시 변경을 모두 되돌리고(`git status` 확인) 결과로 채택/미채택을 quickstart 「결정」 절에 쓴다 — 이득 없음·크래시 옵션은 까닭과 수치로 미채택

## Phase 3: US2 — 채택된 쓰기 옵션 (T008에서 채택된 것만, 미채택이면 해당 항목은 건너뛰고 사유를 tasks에 적는다)
- [ ] T009 [US2] `__tests__/inference/context-params.test.ts`에 CP1(채택 옵션 없을 때 종전 출력 동일)과 채택한 FA 값을 잠그는 테스트를 먼저 쓴다 (`contextParams`, contracts CP1·CP2)
- [ ] T010 [US2] `src/inference/llama-port.ts` `contextParams`에 채택한 `flash_attn_type`을 싣는다. 위반 주입으로 테스트가 잡는지 확인한다. 옵션 값 때문에 모델 열기가 실패하면 종전 인자로 한 번 다시 여는 폴백 테스트(spec Edge Cases)도 먼저 쓰고 구현한다
- [ ] T011 [US2] (2턴 재사용 채택 시) `__tests__/inference/turn-reuse.test.ts`에 TR1~TR4(폴백·`tracked()`·파일 정리·박동)와 낡은 상태 파일을 다음 `load()`가 지우는 것와 079 해제 순서·106 직렬화를 다시 잠그는 테스트를 먼저 쓴다
- [ ] T012 [US2] (채택 시) `src/inference/llama-port.ts` `run`/`ask`에 상태 저장·복원과 임시 파일 정리(`load()`의 낡은 파일 청소 포함)를 넣는다. 위반 주입(`tracked()` 빼기·파일 안 지우기)으로 테스트 확인
- [ ] T013 [US2] (채택 시) 임시 파일 위치가 백업 제외(캐시)임을 `__tests__/config/` 소스 계약으로 잠근다 (FR-008)

## Phase 4: US3 — 저사양 KV
- [ ] T014 [US3] (채택 시) `__tests__/inference/memory-tier.test.ts`에 미만·이상·읽지 못함 경계와 CP3을 먼저 쓴다 (기준 2 GiB = 사람이 정한 값 주석)
- [ ] T015 [US3] (채택 시) 메모리 판정 함수와 `contextParams`의 KV 값 연결을 구현하고 위반 주입으로 확인한다 (`src/inference/llama-port.ts` 또는 `src/inference/memory-tier.ts`)

## Phase 5: 변경 후 실측·마무리
- [ ] T016 [US1] 채택 구성으로 두 기기에서 변경 후 3회씩 측정해 표를 채우고 1+2턴 완주·메모리 한도를 확인하며, iOS 화면 쓰기 페이싱(`use_mmap: false`)과 안드로이드 백그라운드 `n_threads: 2` 조건에서도 완주하는지 본다. 안 본 것은 [미확인]
- [ ] T017 소스 계약: 제품 소스에 `tokens_predicted`·`timings` 등 측정 장치가 새지 않았는지 기존 `llama-port` 경계 테스트로 확인한다 (SC-004, FR-001) — `git diff main`에 계측·타이밍 코드 추가가 0건임도 확인한다
- [ ] T018 `npm run lint`·`npm test` 통과, AGENTS.md 「제목 구간(100)」/「추론」 서술을 사실대로 고친다(뒤집힌 서술은 주석 덧대기 없이 수정)
- [ ] T019 로드맵에서 과제를 완료 이력으로 옮기고(완료 처리 커밋) PR을 연다

## Dependencies
T001·T002 → T003 → T004~T007(병행 가능, 같은 기기 순차 주의) → T008 → Phase 3·4(채택된 항목만) → T016 → T017~T019
