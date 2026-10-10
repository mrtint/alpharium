---

description: "073 — 낡은 흐름 정리와 층 2 구현 태스크"
---

# Tasks: e2e 마무리 — 낡은 흐름 정리와 층 2(실제 생성 스모크)

**Input**: `specs/073-e2e-layer2-stale-flows/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 이 저장소는 계약·테스트 먼저(헌법 「개발 방식」)다 — 기기 없는 테스트를 구현 앞에 둔다. 실기기 확인은 각 스토리 끝과 Polish에 둔다.

**Format**: `- [ ] T### [P?] [US?] 설명 — 파일 경로`. 모든 실기기 단계는 전용 기기(SM-G986N, dev, Metro `CI=1`, `adb reverse`)를 전제한다(quickstart 전제).

## Phase 1: Setup

- [ ] T001 `package.json`에 `"test:layer2": "node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/run-device-tests.mjs --layer2"` 추가(`test:layer1` 바로 아래)

(T002는 T008에 흡수되어 번호만 비워 두었다 — `.cache/`는 이미 gitignore됨.)

## Phase 2: Foundational (층 2 실행기 바닥 — US2·US4가 쓴다)

**⚠️ 이 구간이 끝나야 US2 흐름을 돌릴 수 있다**

- [ ] T003 [P] `__tests__/e2e/layer2-runner.test.ts` 작성(실패 상태로): contracts/layer2-runner.md T-1~T-7(기기 없음→skipped, 모델 없음→aborted·흐름 0개, 흐름 4개가 각각 기준 상태 재생성을 거침·호출 순서 기록, 한 흐름 실패해도 나머지 실행, `DeviceServerDiedException` 한 번 재시도, 가져오기 실패해도 passed 유지, 마지막에 기준 상태 복원). 대역은 `layer1-runner.test.ts`의 `fakeDevice` 패턴
- [ ] T004 [P] `__tests__/e2e/layer2-source-contract.test.ts` 작성(실패 상태로): `scripts/layer2/*.ts`에 `pm clear`·`install`·`uninstall` 없음(069 I-1과 같은 정규식, 주석 먼저 걷기), 채점 어휘(`judge`·`score`·`similar`) 없음, 일기 `text` 필드를 읽는 코드 없음, 모델 폴더에 쓰기·지우기 없음, `run-device-tests.mjs`의 `--layer2` 분기가 `pm clear` 루틴 밖에 있음
- [ ] T005 `scripts/layer1/runner.ts`에서 L2~L6(프로브·모델 점검·앱 종료·설정 기준값·일기 폴더·사진 사본 정리)를 `prepareBaseline(device, serial, { overrides, deleteFiles, fixtures })`로 뽑고 `runLayer1`이 그것을 부르게 한다 — 층 1 동작·기존 `layer1-runner.test.ts`·`layer1-source-contract.test.ts`는 그대로 통과해야 한다 (`npm run test:logic`로 확인)
- [ ] T006 `scripts/layer1/device.ts`에 `pullFile(serial, relative, localPath): Outcome`(`adb exec-out run-as <패키지> cat files/<relative>`를 로컬 파일로 저장; 경로는 `safeRelative` 검사)를 더하고 `Layer2Device` 타입을 `scripts/layer2/`에서 `Layer1Device & { pullFile }`로 정의한다
- [ ] T007 `scripts/layer2/flows.ts` 작성(그리고 `__tests__/e2e/layer2-runner.test.ts`에 「표본 1일 전 사진 수 ≥ 1」 단언 한 줄을 더한다 — `scripts/e2e-sample/manifest.ts`를 읽는다) — data-model.md `Layer2Flow` 표 4행(파일·story·`preferenceOverrides`·`deleteFiles`·`absentDays`·`writtenDay`·`env`)을 사람이 못 박은 상수로. 흐름 2의 `auto-diary.json`은 `{"enabled":true,"targetHour":<지금 시>}`를 실행 시각에서 만드는 함수. 흐름 4의 `onboarding.json`은 `{"completed":false,"downloadConsented":true,"welcomeShown":false,"batteryNoticeShown":true}`
- [ ] T008 `scripts/layer2/runner.ts` 작성 — contracts/layer2-runner.md L2-0~L2-8: 흐름마다 앱 종료 → `prepareBaseline` → 덮어쓰기·삭제 → 픽스처에서 `absentDays` 제거 → `runMaestro([흐름], env)` → `writtenDay` 일기를 `pullFile`로 `.cache/layer2/<시각>/<흐름>-<날>.json`에 → 끝에 흐름별 표 출력 → 기준 상태 복원. T003이 통과해야 한다
- [ ] T009 `scripts/layer2/with-sample.ts` 작성 — `scripts/layer1/with-sample.ts`와 같은 앞단(단일 기기 확인·표본 보장·`-e` 대표 날 값) 후 `runLayer2`. 어제 날짜 `YESTERDAY`를 `-e`로 넘긴다(표본 1일 전 = `commute` 사진 5장, research R3 — 폴백 없음). `-e` 값은 `[A-Za-z0-9_-]+`만
- [ ] T010 `scripts/run-device-tests.mjs`에 `LAYER2_FLOWS` 배열과 `--layer2` 분기(`runLayer2Mode`, `runLayer1Mode`와 같은 모양, 건너뜀→exit 0/중단·실패→exit 1)를 추가한다. 층 2 흐름은 `NEEDS_LAYER1_BASELINE`에 넣지 않고(`sample-flow-contract` FL-9 등 기존 계약이 그 배열을 층 1 전제로 읽는다) 일반 실행의 제외 목록(`skippedForBaseline`)을 `NEEDS_LAYER1_BASELINE ∪ LAYER2_FLOWS`로 만들어 일반 실행(`pm clear` 뒤)에서 돌지 않게 한다. `__tests__/e2e-sample/sample-flow-contract.test.ts`·`flow-map.test.ts`가 계속 통과해야 한다. T004가 통과해야 한다

**Checkpoint**: `npm run test:logic`에서 layer2 테스트·layer1 테스트 모두 초록 (흐름 파일은 아직 없으므로 T011 이후 정합 테스트가 이를 요구한다)

## Phase 3: User Story 1 — 일반 실행이 거짓 실패 없이 돈다 (P1)

**Goal**: 낡은 흐름 셋이 고쳐지거나 근거와 함께 지워져 일반 실행에서 이 셋 때문에 실패하지 않는다.

**Independent Test**: 셋을 각각 실기기에서 돌려 결과 확인 + 고친 흐름의 단언 하나를 틀리게 해 실패 확인.

- [ ] T011 [US1] `skeleton` 판정: 층 1 기준 상태로 `npm run test:layer1 -- .maestro/skeleton.yml`을 돌려 실패 단계를 기록하고(`screencap`으로 진단 화면 확인) 원인을 가른다(contracts/stale-flows.md 1~2). 결과를 `specs/073-e2e-layer2-stale-flows/quickstart.md` 끝에 「실측」 한 단락으로 적는다
- [ ] T012 [US1] `skeleton` 처치: 문구·구조 변경이면 진단의 현재 문구/`testID`로 `.maestro/skeleton.yml`을 고치고(「loaded」·`on-device`·저장 점검 단언 유지), `settings-developer-sweep`이 같은 단언을 하면 삭제 + 근거(흐름 이름·단언 줄) 기록. 앱 결함이면 고치지 않고 소유자에게 보고(FR-004)
- [ ] T013 [US1] `prompt-preview` 판정·처치: 같은 절차로 실패 단계 확인 후 `.maestro/prompt-preview.yml`을 프롬프트 문안 글자가 아닌 구조(프리셋 둘·근사 크기 라벨·「실측 토큰 아님」)만 단언하도록 고친다(FR-003) 또는 삭제
- [ ] T014 [US1] `today-diary` 판정·처치: 「일기」 단언 실패가 문구 탓인지 기준 상태 탓인지 가린 뒤 고치거나, `dialog-foundation`이 같은 단언(덮어쓰기 확인 열기·취소)을 하면 삭제 + 근거 기록
- [ ] T015 [US1] 고친 흐름마다 위반 주입: 단언 하나를 틀리게 치환(치환 적용 여부를 먼저 단언 — `grep`) → 흐름 실패 확인 → 원복(FR-022-3). 지운 흐름은 해당 없음
- [ ] T016 [US1] `scripts/run-device-tests.mjs` `FLOWS` 위 주석을 결과대로 고친다: 고친 것은 갱신, 지운 것은 `FLOWS`에서 빼고 059 폐기 목록 옆에 사유 한 줄. 이 셋 때문에 실패하는 흐름이 없음을 실기기로 확인한다 — **`npm run test:layer1 -- .maestro/<흐름>.yml`로만 돌린다.** 일반 실행(`node scripts/run-device-tests.mjs`, 인자를 줘도)은 먼저 `pm clear`를 하므로 모델 약 2GB가 지워져 뒤의 층 2가 「모델 없음」으로 중단된다 — 이 전용 기기에서는 돌리지 않는다. 일반 실행의 `FLOWS`에서 이 셋이 빠졌거나 통과하는 상태임은 소스 정합(`flow-map.test.ts`)과 개별 실행으로 갈음한다

**Checkpoint**: US1 독립 통과

## Phase 4: User Story 2 — 층 2 한 번으로 실제 생성 경로 확인 (P1) 🎯

**Goal**: `npm run test:layer2`가 흐름 넷을 실제 모델로 돌려 상태 전이를 확인하고 일기 경로를 출력한다.

**Independent Test**: 전용 기기에서 `npm run test:layer2`가 흐름 넷 통과 + 일기 경로 출력, 위반 주입 둘 실패.

- [ ] T017 [P] [US2] `.maestro/layer2-write-and-read.yml` — contracts/layer2-flows.md 1행. 완료 대기 한도 300000ms. testID는 `.maestro/in-place-writing.yml`·`written-day-reading.yml`에서 가져온다(`day-${YESTERDAY}`·`write-button`·`stop-button`·`home-day-state`·제목·「다시 쓰기」). 머리 주석에 전제·단언·사람이 보는 것. 본문 글자 단언 금지
- [ ] T018 [P] [US2] `.maestro/layer2-open-app-writes.yml` — 2행. 완료 대기 한도 300000ms. `launchApp` 후 `stop-button` 나타남→소멸→쓴 날 홈
- [ ] T019 [P] [US2] `.maestro/layer2-diagnostics-try-write.yml` — 3행. 완료 대기 한도 300000ms. 진입은 `home-settings` → `settings-developer` → `developer-diagnostics`(`settings-developer-sweep.yml` 참조), 「한 번 써 보기」 testID는 진단 화면 소스(`src/ui/screens/DiagnosticsScreen.tsx` 계열)에서 확인
- [ ] T020 [P] [US2] `.maestro/layer2-first-run-auto-diary.yml` — 4행. `first-run-flow.yml`의 작명 입력 단계를 가져오되 `clearState`는 쓰지 않는다. 대기 한도 600000ms
- [ ] T021 [US2] 네 흐름을 `scripts/run-device-tests.mjs`의 `FLOWS`와 `LAYER2_FLOWS`에 등록하고 `scripts/layer2/flows.ts`의 `file`과 같게 맞춘다
- [ ] T022 [US2] 실기기: `npm run test:layer2`를 돌려 흐름 넷이 통과하는지 본다. 실패하면 `systematic-debugging`으로 원인을 가린다(플래그 조합·testID·대기 한도 — research R7). 통과하면 출력된 `.cache/layer2/…` 일기를 열어 본문을 읽고 관찰을 quickstart.md 끝에 적는다(채점 아님)
- [ ] T023 [US2] 위반 주입(FR-022-1): `layer2-write-and-read.yml`의 `stop-button` 소멸 대기 id를 틀리게 → 그 흐름만 실패·나머지 셋은 돈다 → 원복. (치환 적용 먼저 `grep`)
- [ ] T024 [US2] 모델 없음 중단 확인(quickstart B-5): `files/models` 한 파일 이름을 `run-as mv`로 바꿔 aborted·흐름 0개 실행 확인 후 **반드시 원복**(`ls files/models`로 확인)

**Checkpoint**: US2 독립 통과 (MVP)

## Phase 5: User Story 3 — 릴리스 전 체크리스트 (P2)

**Goal**: 체크리스트가 있고 배포 절에서 링크된다.

**Independent Test**: 문서가 층 2 명령·본문 읽기·「사람이 봄」 항목을 담고 AGENTS 링크가 있다(계약 테스트).

- [ ] T025 [P] [US3] `__tests__/e2e/layer2-checklist.test.ts` 작성(실패 상태로): `docs/e2e/layer2-release-checklist.md`가 있고 `npm run test:layer2`를 포함하며, `AGENTS.md`에 그 경로 링크가 「release 빌드·서명·Google Play」 절과 「iOS 빌드·서명·TestFlight」 절 각각에 있다
- [ ] T026 [US3] `docs/e2e/layer2-release-checklist.md` 작성: 전제(전용 기기·dev 빌드·모델·표본), `npm run test:layer2` 실행, 출력된 일기 본문 읽기, 대응표의 「사람이 봄」 항목 중 릴리스 전 확인할 것(핀치, 알림 실제 표시 등), 결과 기록 방법. iOS는 「층 2 iOS 갈래 없음 — TestFlight 첫 실측은 사람」 한 줄
- [ ] T027 [US3] `AGENTS.md` release 절·iOS 절에 체크리스트 링크 각각 한 줄 추가(T025 통과)

## Phase 6: User Story 4 — 대응표가 층 2와 정리 결과를 반영한다 (P2)

**Goal**: 대응표의 모든 주요 기능에 층 1/층 2/사람이 봄이 있고 정합 테스트가 층 2까지 덮는다.

**Independent Test**: `flow-map.test.ts` 통과, 층 2 흐름 하나를 `LAYER2_FLOWS`/`FLOWS`에서 빼면 실패.

- [ ] T028 [P] [US4] `__tests__/e2e/flow-map.test.ts`·`scripts/layer1/flow-map.ts`를 층 2로 확장(실패 상태로): 인벤토리 표에 「층 2」 열을 **끝 칸으로** 더해(기존 칸 인덱스 1·2·4를 읽는 M-3·M-5가 밀리지 않게) 열 파서를 확장하고, M-5(층 1이 아닌 FLOWS 흐름의 이유)는 층 2 흐름에도 이유 칸이 있게, M-6(기능 표 각 행)은 「층 2」 칸의 「범위 밖」을 내용으로 세지 않게 바꾼다. 인벤토리에 「층 2」 열, `LAYER2_FLOWS`(`stringArray`)가 `FLOWS`의 부분집합·파일 존재·`scripts/layer2/flows.ts`의 `file`과 같음·층 1 목록과 겹치지 않음, 「층 2」 열 값이 `LAYER2_FLOWS`와 같음. 위반 주입 V7·V8(층 2 열 불일치, 등록 누락) 추가. FR-022(2)는 실제로 실행한다: `run-device-tests.mjs`의 `FLOWS`에서 층 2 흐름 하나를 지우고(치환 적용을 `grep`으로 먼저 단언) `npx jest __tests__/e2e/flow-map.test.ts`가 실패하는지 확인한 뒤 원복
- [ ] T029 [US4] `docs/e2e/feature-flow-map.md` 갱신: 기능 표 「층 2」 열을 흐름 넷으로 채우고(쓰기·자동 쓰기·진단·첫 실행) 나머지는 「사람이 봄」 이유 또는 층 1 근거 유지; 인벤토리에 「층 2」 열과 네 흐름 행, 낡은 흐름 셋을 T012~T014 결과대로(고친 것은 통과 상태, 지운 것은 행 제거); 「대응표가 드러낸 것」의 낡은 흐름 단락과 머리말의 「층 2는 범위 밖」을 현행화. T028 통과
- [ ] T030 [US4] 빈 칸 점검: 기능 표의 모든 행에 층 1 흐름 또는 층 2 흐름 또는 「사람이 봄」+이유가 있는지 확인(SC-004). 비어 있으면 이유를 적는다

## Phase 7: Polish & 완료

- [ ] T031 `AGENTS.md` 현행화: 「069 — 기능→흐름 대응표」 절에 층 2 한 줄(명령·전제·흐름마다 따로 부르는 이유)과 「기존 흐름 셋이 이미 낡았다」 문장을 결과대로 고친다(앞의 서술을 주석으로 덧대지 말고 고친다 — AGENTS 규칙)
- [ ] T032 `docs/roadmap/README.md`: 「주요 기능별 e2e」 항목의 「진행」·「남은 것」 현행화(스펙 073 반영, 남은 것: iOS 갈래·CI 판단). 완료 이력 표 이동은 kickoff 완료 처리에서 한다
- [ ] T033 `npm test`·`npm run lint`를 실제로 실행해 통과 확인(출력 확인 후 주장)
- [ ] T034 실기기 최종: `npm run test:layer1`(층 1이 `prepareBaseline` 리팩토링 뒤에도 9개 통과) + `npm run test:layer2` 완주 기록 — 결과를 `specs/073-e2e-layer2-stale-flows/quickstart.md` 끝에 날짜·기기·소요 시간으로 적는다. 못 돈 것은 「미확인」으로 적는다
- [ ] T035 `specs/073-e2e-layer2-stale-flows/quickstart.md` 끝 「실측」과 「미확인 잔여」(iOS·CI·release·다른 기기) 정리

## Dependencies & 실행 순서

- Phase 1 → Phase 2(T003·T004 먼저, T005~T010 구현) → Phase 3(US1)와 Phase 4(US2)는 Phase 2 뒤 독립이지만 **기기 하나라 순차 실행**(US1 → US2). Phase 5·6은 Phase 4·3 결과가 필요하다(T029는 T012~T014·T021 뒤).
- T005 → T008(`prepareBaseline` 필요). T006 → T008. T007 → T008·T021. T017~T020은 서로 병렬(파일 다름), T021 뒤 T022.
- T028(테스트) → T029(문서). T025(테스트) → T026·T027.

## Parallel 예

- Phase 2 시작: T003 ∥ T004. Phase 4 흐름 작성: T017 ∥ T018 ∥ T019 ∥ T020. 그 밖 Phase 5·6의 테스트 작성(T025 ∥ T028).

## 구현 전략

- MVP = Phase 1~2 + US2(T017~T024): 층 2가 실기기에서 돌면 가치의 대부분이다. 그러나 US1이 일반 실행의 바닥이라 권장 순서는 US1 → US2.
- 각 스토리 끝에서 멈춰 실기기 결과를 확인한다. 원인을 모르는 실패는 추측으로 고치지 않고 `systematic-debugging`.
- 앱 코드는 바꾸지 않는다(FR-024); testID가 필요하면 가장 작은 추가 + 사유 기록.
