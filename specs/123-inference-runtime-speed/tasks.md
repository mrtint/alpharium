# Tasks: 추론 런타임 속도 최적화 (123)

**Input**: spec.md · plan.md · research.md · data-model.md · contracts/ · 테스트 먼저(TDD) — 헌법 「개발 방식」

## Phase 1: Setup
- [x] T001 `adb reverse --list`로 reverse 확인 후 SM-S901N을 Metro(또는 main 빌드)로 띄우고 새 a1·표본 하루(사진 있는 날)를 확인한다 (기기)
- [x] T002 iPhone 14에 122 개발 서명 Release 빌드가 새 a1로 도는지 확인한다 (기기)

## Phase 2: Foundational — 스파이크·기준선 (코드 변경 없음, 제품에 계측 없음)
- [x] T003 [US1] 기준선: 두 기기에서 변경 없는 코드로 쓰기를 조건당 3회 돌려 본문 t/s·1+2턴 총 시간·최고 RAM을 `specs/123-inference-runtime-speed/quickstart.md` 표에 기록한다 (개발 로그·`dumpsys meminfo`·Instruments)
- [x] T004 [US1] llama.cpp 로그에서 `flash_attn_type: auto`가 실제로 켜졌는지 읽어 quickstart에 기록한다
- [x] T005 [US1] 임시(커밋 안 함) 변경으로 `flash_attn_type` `on`/`off`를 각각 같은 방식으로 측정해 표에 기록한다
- [x] T006 [US1] 임시 변경으로 2턴 상태 재사용 후보 (a)`completion()`에 `save_state_path`/`load_state_path`, (b)`saveSession`/`loadSession`을 시도해 동작 여부·제목 구간 시간·최고 RAM을 표에 기록한다 (research R2)
- [x] T007 [US1] 임시 변경으로 `getBackendDevicesInfo()` 값을 찍어 `maxMemorySize`가 기기 RAM인지 확인하고, 강제 `cache_type_k/_v: q8_0`(FA 포함/미포함)의 완주·RAM을 기록한다 (research R3)
- [x] T008 [US1] 임시 변경을 모두 되돌리고(`git status` 확인) 결과로 채택/미채택을 quickstart 「결정」 절에 쓴다 — 이득 없음·크래시 옵션은 까닭과 수치로 미채택

## Phase 3: US2 — 실측으로 채택된 것만 (T008 결과: 채택 = iOS 제목 호출의 미리 읽기 건너뛰기. 미채택 = FA 명시(`on`/`off`)·상태 파일 재사용·KV q8_0 — 수치와 까닭은 quickstart)
- [x] T009 [US2] `__tests__/inference/llama-port.test.ts`에 제목 호출(ask)은 미리 읽기 없이 곧바로 조각 생성하고 박동이 나오는 테스트, 본문(run)은 종전대로 미리 읽는 테스트를 먼저 쓴다 (FR-003·FR-005)
- [x] T010 [US2] `src/inference/llama-port.ts`의 `send`·`completePaced`에 `warm` 인자를 더해 `ask()`만 미리 읽기를 건너뛴다. 건너뛰기를 일부러 빼 보아 테스트가 잡는지 확인한다
- [x] T011 [US2] 079 해제 순서·106 `load()` 직렬화를 다루는 기존 테스트(`llama-port.test.ts`·`llama-port-load-race.test.ts`)가 그대로 통과함을 확인한다 (FR-004)
- [x] T012 [US2] (미채택 항목) `contextParams`는 종전 출력과 같다는 점을 기존 테스트가 잠그고 있는지 확인한다 — 안 잠겨 있으면 CP1 테스트를 더한다 (contracts CP1)

## Phase 4: US3 — 저사양 KV (T008 결과: 미채택 — SM-S901N 실측에서 q8_0은 프롬프트 읽기가 느려져 1+2턴이 짧아지지 않았고 RAM 이득이 측정 흔들림 안이었다. 코드 변경 없음, 수치는 quickstart. 실제 2 GiB 미만 기기는 [미확인])

## Phase 5: 변경 후 실측·마무리
- [x] T016 [US1] 채택 구성으로 두 기기에서 변경 후 3회씩 측정해 표를 채우고 1+2턴 완주·메모리 한도를 확인하며, iOS 화면 쓰기 페이싱(`use_mmap: false`)과 안드로이드 백그라운드 `n_threads: 2` 조건에서도 완주하는지 본다. 안 본 것은 [미확인]
- [x] T017 소스 계약: 제품 소스에 `tokens_predicted`·`timings` 등 측정 장치가 새지 않았는지 기존 `llama-port` 경계 테스트로 확인한다 (SC-004, FR-001) — `git diff main`에 계측·타이밍 코드 추가가 0건임도 확인한다
- [x] T018 `npm run lint`·`npm test` 통과, AGENTS.md 「제목 구간(100)」/「추론」 서술을 사실대로 고친다(뒤집힌 서술은 주석 덧대기 없이 수정)
- [x] T019 로드맵에서 과제를 완료 이력으로 옮기고(완료 처리 커밋) PR을 연다

## Dependencies
T001·T002 → T003 → T004~T007(병행 가능, 같은 기기 순차 주의) → T008 → Phase 3·4(채택된 항목만) → T016 → T017~T019
