---

description: "069 기능→흐름 대응표와 안드로이드 층 1 화면 흐름 e2e — 태스크"
---

# Tasks: 기능→흐름 대응표와 안드로이드 층 1 화면 흐름 e2e

**Input**: `specs/069-e2e-layer1-screen-flows/` — plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 이 저장소는 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」). 기기 없는 jest 테스트를 구현 앞에 둔다. Maestro 흐름은 실기기에서 돌려야 검증된다(원칙 V) — 기기가 없는 동안 흐름 태스크는 「작성됨, 미검증」으로만 표시한다.

**Organization**: 사용자 이야기(US1~US5)별로 묶는다. 스토리 순서는 의존 순서에 맞춰 US2 → US3 → US4 → US5 → US1이다(대응표 US1은 새 흐름이 모두 있어야 완성된다).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 서로 다른 파일이고 미완료 태스크에 의존하지 않아 병렬 가능
- 경로는 저장소 루트 기준. `src/`는 위반 주입(US3·US4) 외에 수정하지 않는다.

---

## Phase 1: Setup

- [ ] T001 `package.json`의 scripts에 `"test:layer1": "node scripts/run-device-tests.mjs --layer1"` 한 줄을 더한다
- [ ] T002 `node` 24가 `.mjs`에서 `scripts/layer1/*.ts`를 확장자 포함 동적 `import()`로 불러오는지 최소 파일 둘(`scripts/layer1/ping.ts` 만들고 불러 본 뒤 삭제)로 확인하고, 안 되면 `.mts`로 이름을 바꿔 plan.md의 파일 이름을 고친다
- [ ] T003 [P] `__tests__/e2e/` 디렉터리를 만들고 `npm run test:logic`이 이 디렉터리의 `.test.ts`를 줍는지 빈 스모크 테스트 하나로 확인한 뒤 지운다

---

## Phase 2: Foundational (모든 스토리가 쓰는 픽스처)

**⚠️ 이 단계가 끝나야 US2~US5를 시작한다.**

- [ ] T004 `__tests__/e2e/fixtures.test.ts`를 먼저 쓴다(실패해야 한다): `buildFixtureEntries(today)`가 오늘·어제·그제 3편을 만들고 (a) 각 JSON이 실제 `src/diary/store.ts`의 `deserializeEntry`를 통과한다, (b) `entry.date`가 각 날짜, `entry.photos.length`가 1·3·1이고 `signalsUsed.photos`의 사진 수와 같다, (c) `resizedPath`가 `/data/user/0/com.a810labs.pocketlog/files/vision-cache/<파일명>` 형식이다, (d) 사진 파일명이 모두 `scripts/e2e-fixtures/photos/`에 실제로 있다, (e) `createdAt`·`takenAt`이 각자의 날 안(`dayBounds`)이다, (f) `photoId`가 `e2e-<offset>-<n>`이다 — data-model.md 「쓴 날 픽스처」
- [ ] T005 [P] `scripts/e2e-fixtures/photos/`에 사진 사본 JPEG 5개(오늘 1, 어제 3, 그제 1)를 만든다 — `scripts/seed-template.jpg`를 복사해 파일명만 다르게 하고 `.gitignore`가 이 폴더의 `*.jpg`를 막지 않는지 `git check-ignore -v`로 확인한다
- [ ] T006 [P] `scripts/e2e-fixtures/diary/today.json.tmpl`·`yesterday.json.tmpl`·`day-before.json.tmpl`을 쓴다 — `DiaryEntry` 모양, `text`는 사람이 쓴 짧은 글(내용 단언 없음), `character: "quiet"`, `{{TODAY}}`·`{{YESTERDAY}}`·`{{DAY_BEFORE}}` 자리표시자(날짜·시각 자리), `photoId` `e2e-0-1`·`e2e-1-1..3`·`e2e-2-1`, `signalsUsed`는 `photos`만 `known`·나머지 `unknown`/`none`(data-model.md)
- [ ] T007 `scripts/layer1/fixtures.ts`에 `buildFixtureEntries(today: DayDate)`와 (파일 이름 → 내용) 목록을 돌려주는 순수 함수를 구현해 T004를 통과시킨다 — 날짜는 `src/config/day-boundary.ts`의 `dayOf`/`dayBounds`로만 계산하고 `getHours() ±`를 쓰지 않는다(DB11)

**Checkpoint**: `npm run test:logic -- __tests__/e2e/fixtures.test.ts` 초록.

---

## Phase 3: User Story 2 - 명령 하나로 층 1을 돌린다 (Priority: P1) 🎯 MVP

**Goal**: `--layer1`이 `pm clear` 없이 기준 상태를 만들고 층 1 흐름을 한 번에 돌린다. 모델이 없거나 기기가 없으면 통과로 보고하지 않는다.

**Independent Test**: 모델이 있는 기기에서 `npm run test:layer1`이 기준 상태를 만들고 끝까지 돈다. 기기 없이는 `skipped`, 모델 없으면 중단.

### Tests (먼저, 실패해야 한다)

- [ ] T008 [P] [US2] `__tests__/e2e/baseline.test.ts`: (G-1 드리프트 가드) `src/**/*.ts(x)`에서 설정 파일 이름 상수(`"…\.json"`로 `preferences/`에 쓰이는 것 — `onboarding.json`·`auto-diary.json` 등, `models/` 쪽 `state.json`은 허용 목록)를 긁어 `scripts/layer1/baseline.ts`의 항목에 모두 있는지, 값이 contracts/baseline-state.md 표와 같은지(특히 `auto-diary.json`이 `{"enabled":false,"targetHour":22}`이고 `onboarding.json`의 네 필드가 모두 `true`), `delete`/`keep`/`write` 동작이 맞는지 단언한다. 소스를 읽을 때는 주석을 먼저 걷어낸다(AGENTS)
- [ ] T009 [P] [US2] `__tests__/e2e/layer1-runner.test.ts`: 기기 통로를 대역으로 주입해 contracts/layer1-runner.md의 갈래를 단언한다 — 기기 없음/Maestro 없음 → `skipped`(통과 아님), `run-as` 실패 → `aborted`+이유, 모델 파일 없음 → `aborted`+「모델」, 정상 → L4(force-stop)가 L5·L6보다 먼저, `pm clear`·`install`·`uninstall`이 한 번도 불리지 않음(I-1), 일기 폴더 정리가 `YYYY-MM-DD.json(.writing)` 패턴 파일만 지움, `files/models`에 쓰기·삭제 호출 0, `files/vision-cache/`가 비워진 뒤 픽스처 사진 사본 5개로 채워짐, 흐름 실행 실패 → `failed`+흐름 이름
- [ ] T010 [P] [US2] `__tests__/e2e/layer1-source-contract.test.ts`: 주석을 걷어낸 `scripts/run-device-tests.mjs`에서 (a) `--layer1` 분기가 있고 기존 초기화 루틴(`pm clear`)은 그 분기 밖에 그대로 있다(I-4), (b) `scripts/layer1/`의 어느 파일에도 `pm clear`·`"install"`·`"uninstall"`·`files/models`에 쓰는 호출이 없다(I-1)를 단언한다

### Implementation

- [ ] T011 [US2] `scripts/layer1/baseline.ts`에 contracts/baseline-state.md의 표를 `BASELINE`(파일, 동작, 내용, 이유) 배열로 구현한다 — T008 통과
- [ ] T012 [US2] `scripts/layer1/device.ts`에 adb 통로를 구현한다: 사전 점검(`run-as … ls files`), 모델 존재 점검(`files/models`), `am force-stop`, `adb push` → `run-as cp`로 파일 쓰기, 패턴 일치 파일만 지우기, 디렉터리 비우기. `adb`는 `spawnSync(…, { shell: true })`, 기기 경로는 `/data/local/tmp/layer1/…`, 임시 파일은 `os.tmpdir()`(research R3). 통로는 인터페이스로 분리해 T009가 대역을 넣게 한다
- [ ] T013 [US2] `scripts/layer1/runner.ts`에 L0~L7 단계를 구현하고(`runLayer1({ device, flows, … })` → `passed|failed|skipped|aborted`) T009를 통과시킨다 — 안내 한 줄(L0), 건너뜀·중단의 이유 출력, 흐름은 한 번의 `maestro test --no-reinstall-driver --format junit`(기존 실행과 같은 옵션·`JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8`)
- [ ] T014 [US2] `scripts/run-device-tests.mjs`에 `--layer1` 분기와 `LAYER1_FLOWS` 배열(이 시점엔 비어 있어도 된다 — US3~US5·US1에서 채운다)을 더한다. 분기는 `await import("./layer1/runner.ts")`로 위임하고 기존 실행 경로는 한 줄도 바꾸지 않는다. 상단 주석에 대응표 경로(`docs/e2e/feature-flow-map.md`)만 건다(FR-006) — T010 통과
- [ ] T015 [US2] 기기 없는 환경에서 `npm run test:layer1`이 `skipped`(종료 코드 0, 「통과」 문구 없음)로 끝나는지 직접 실행해 출력과 종료 코드를 기록한다

**Checkpoint**: `npm run test:logic` 초록, 기기 없이 `skipped`. 기기 연결 뒤 US3에서 첫 실기기 확인.

---

## Phase 4: User Story 3 - 강제 종료 후 재시작을 반복해도 쓴 날이 읽힌다 (Priority: P1)

**Goal**: 앱을 종료했다 다시 시작하기를 10번 반복해도 쓴 날 본문이 보이고 손상 안내가 없다.

**Independent Test**: 기준 상태에서 이 흐름만 돌려 10회 통과, 위반 주입(`textSync` → `await text()`)에서 실패.

- [ ] T016 [US3] `.maestro/restart-persistence.yml`을 쓴다 — `appId: com.a810labs.pocketlog`, `repeat: times: 10`: `launchApp`(기본 종료 후 재시작), `extendedWaitUntil` `written-paper` visible(20초), `assertNotVisible: "이 날의 일기 파일이 손상됐어요."`. 변수 없이 고정 값(research R4). 주석에 근거(067 세션 결함·#122)와 「본문 내용은 단언하지 않는다」를 적는다
- [ ] T017 [US3] `scripts/run-device-tests.mjs`의 `FLOWS`와 `LAYER1_FLOWS`에 `.maestro/restart-persistence.yml`을 등록한다(주석에 이유 한 줄)
- [ ] T018 [US3] 기기를 연결해(전용 테스트 기기, debug 빌드, `adb reverse`, Metro dev) `node scripts/run-device-tests.mjs --layer1 .maestro/restart-persistence.yml`을 돌려 10회 통과를 확인하고 결과(시각·횟수·통과)를 `specs/069-e2e-layer1-screen-flows/quickstart.md` 끝 「실측 기록」에 적는다 — 기기가 없으면 「미검증」으로 적는다
- [ ] T019 [US3] 위반 주입(quickstart Q3-1): `src/diary/store.ts`의 `file.textSync()`를 `await file.text()`로 치환하고 **치환이 적용됐는지 grep으로 먼저 단언**한 뒤 Metro가 치환된 번들을 서빙하는지 확인하고(`curl -s "localhost:8081/index.bundle?platform=android&dev=true"`에서 치환한 줄을 grep — 네이티브 재빌드는 필요 없다) 같은 흐름을 돌린다 — 실패해야 한다(안 나면 횟수를 늘려 재시도하고 그래도 안 나면 결과를 그대로 기록). 되돌리고 `git diff -- src`가 비었는지 확인하고 통과를 다시 본다. 커밋하지 않는다

**Checkpoint**: 흐름이 FLOWS·LAYER1_FLOWS에 등록됨. 실기기 통과 + 주입 실패가 기록됨(또는 미검증 명시).

---

## Phase 5: User Story 4 - 사진 한 장 날에서 가로로 쓸어도 확대 화면이 열리지 않는다 (Priority: P2)

**Goal**: 사진 1장인 날(오늘)에서 쓸기는 확대 화면을 열지 않고, 탭은 연다.

**Independent Test**: 이 흐름만 돌려 통과, `isTap` 위반 주입에서 실패.

- [ ] T020 [US4] `.maestro/single-photo-swipe.yml`을 쓴다 — 홈(오늘 = 사진 1장)에서 `photo-carousel-single` visible 확인 → `swipe`(`photo-face-e2e-0-1` 위에서 좌/우 두 방향) → `assertNotVisible` id `photo-viewer` → `tapOn` id `photo-open-e2e-0-1` → `photo-viewer` visible → `back` → `photo-viewer` 사라짐(`extendedWaitUntil notVisible`)과 `written-paper` visible. 실행 중 기기 의존 요소(스와이프 좌표·`back`)가 불안정하면 5회 반복해 재현성을 본다
- [ ] T021 [US4] `scripts/run-device-tests.mjs`의 `FLOWS`와 `LAYER1_FLOWS`에 `.maestro/single-photo-swipe.yml`을 등록한다
- [ ] T022 [US4] 실기기에서 이 흐름을 돌려 통과를 확인하고 quickstart.md 「실측 기록」에 적는다(기기 없으면 「미검증」)
- [ ] T023 [US4] 위반 주입(quickstart Q3-2): `src/app/photo-viewer.ts`의 `isTap`이 항상 `true`를 돌려주게 치환(적용 grep 단언 먼저) → 흐름이 실패하는지 확인 → 되돌리고 `git diff -- src` 빈 것 확인. 커밋하지 않는다

---

## Phase 6: User Story 5 - 설정·개발자·진단의 행을 훑어도 앱이 살아 있다 (Priority: P2)

**Goal**: 설정·개발자·진단의 행을 차례로 열고 닫아도 앱이 살아 있고, 부작용 행은 보이기만 하며, 끝난 뒤 쓴 날과 기준 상태가 그대로다.

**Independent Test**: 이 흐름만 돌려 끝까지 가고 끝에서 쓴 날이 그대로.

- [ ] T024 [US5] `.maestro/settings-developer-sweep.yml`을 쓴다(FR-021·021a·021b) — 홈 `home-settings` → `settings-screen`; `settings-name` → `rename-save` 보임 → `rename-back`; 「자동으로 쓰기」 토글을 켜 `settings-target-hour`·`settings-place-names`를 연 뒤(각 대화상자 열림 확인 → 취소) 토글을 **다시 끈다**; `settings-perm-*` 중 OS 설정으로 나가지 않는 확인은 꼬리표 보임까지(OS로 나가는 행은 T025에서 실측 뒤 결정); `settings-device-modules`(이 휴대폰 모듈 용량 행)와 `settings-version`(버전 행)이 보임을 확인; `settings-wipe` → 확인 대화상자 보임 → 취소 → 일기 그대로(`back-to-home` 후 `written-paper` 보임); `settings-developer`(또는 개발 환경에서 보이는 행) → `developer-screen`, 부작용 행 `developer-redownload`·`developer-replay-onboarding`·`developer-off`는 `assertVisible`만; `developer-diagnostics` → `diagnostics-screen`, 일곱 묶음 `diagnostics-group-*` 보임, 부작용 행 `diagnostics-try-once`·`diagnostics-run-auto`는 `assertVisible`만; 닫아 홈으로 돌아와 `written-paper` 보임. 주석에 「누르지 않는 행과 이유」를 적는다
- [ ] T025 [US5] 권한 행(`settings-perm-photos` 등)을 눌렀다 `back`으로 돌아오는 동작을 기기에서 실측한다. 안정적이면 T024에 넣고, 불안정하면 흐름에서 빼 대응표(US1)에 「사람이 봄 + 이유」로 적는다
- [ ] T026 [US5] `scripts/run-device-tests.mjs`의 `FLOWS`와 `LAYER1_FLOWS`에 `.maestro/settings-developer-sweep.yml`을 등록한다
- [ ] T027 [US5] 실기기에서 이 흐름을 돌려 통과와, 끝난 뒤 기준 상태(자동 쓰기 꺼짐, 쓴 날 3편 그대로)를 확인하고 quickstart.md 「실측 기록」에 적는다(기기 없으면 「미검증」)

---

## Phase 7: User Story 1 - 어떤 기능이 어떤 e2e로 지켜지는지 한 표로 본다 (Priority: P1)

**Goal**: 대응표가 모든 흐름 파일과 주요 기능을 빠짐없이 올리고, 기계가 정합성을 지킨다.

**Independent Test**: 문서와 `flow-map.test.ts`가 서로 맞는다. 표에 적힌 파일이 실제로 있다.

### Tests (먼저)

- [ ] T028 [US1] `__tests__/e2e/flow-map.test.ts`를 쓴다(contracts/flow-map.md M-1~M-10): `.maestro/**/*.yml` 전부가 인벤토리에 있음, 인벤토리 경로가 실제 파일, 인벤토리 `FLOWS ○` == `run-device-tests.mjs`의 `FLOWS`, `층 1 ○` == `LAYER1_FLOWS`, `LAYER1_FLOWS ⊆ FLOWS`, 층 1이 `—`인 FLOWS 흐름은 이유가 비어 있지 않음, 기능 표 각 행에 층 1/계약/사람이 봄 중 하나가 있음, 인용된 계약 테스트 경로가 실제 파일, 새 흐름 셋이 양쪽 배열에 있음, (M-10) 새 흐름 셋에 픽스처 `text` 본문의 문장을 `assertVisible`·`tapOn`·`assertTrue`에 쓴 곳이 없음(FR-023), 실행기가 표 내용을 복제하지 않고 경로만 가리킴. `FLOWS`·`LAYER1_FLOWS`는 주석을 걷은 소스에서 문자열 배열로 파싱한다
- [ ] T029 [US1] `scripts/layer1/flow-map.ts`에 대응표 마크다운 파서와 위 검사 함수를 구현해 T028을 통과시킨다(파서는 `|` 표 줄만 읽는다)

### Implementation

- [ ] T030 [P] [US1] `.maestro/`의 모든 흐름(23 + 새 3)과 `.maestro/ios/`(4)를 한 파일씩 읽어 지키는 기능·생성 여부·필요한 기기 상태(오늘에 일기가 있어야 하는가, `-e` 변수를 받는가, `pm clear`를 전제하는가, 토글 상태를 바꾸는가)를 메모한다(`specs/069-e2e-layer1-screen-flows/research.md` 끝 「흐름 인벤토리 조사」에 표로 붙인다)
- [ ] T031 [P] [US1] 주요 기능별로 이미 지키는 계약 테스트를 `__tests__/`에서 찾아 **파일을 열어** 단언 내용을 확인하고(FR-003) 인용 후보를 모은다: 첫 실행·쓰기·쓴 날 읽기·날 고르기·달력·사진 확대(067 `photo-viewer`)·설정 각 행·개발자·진단·상태 흉내·자동 쓰기·지우기·`File` 동기 호출(`expo-file-sync.test.ts`)
- [ ] T032 [US1] T030·T031을 바탕으로 `docs/e2e/feature-flow-map.md`를 쓴다(contracts/flow-map.md 형식) — 기능 표(층 2는 전 행 「범위 밖(069)」), 흐름 인벤토리 표(`FLOWS`·층 1·지키는 기능·층 1이 아닌 이유), 「사람이 봄」 행(핀치 확대, 부작용 행 5개)에 이유, 빈 칸·중복·`FLOWS` 밖 흐름·iOS 훑기 표시
- [ ] T033 [US1] 인벤토리에서 「기준 상태와 수정 없이 맞는」 기존 흐름(research R5의 후보)을 `LAYER1_FLOWS`에 추가한다 — 후보마다 흐름 본문을 읽어 기준 상태 가정(오늘 쓴 날, 자동 쓰기 꺼짐, `-e` 없음)과 맞는지 확인하고, 맞지 않는 것은 넣지 않고 인벤토리 「층 1이 아닌 이유」에 적는다. 흐름·픽스처를 고치지 않는다(FR-022a)
- [ ] T034 [US1] T033에서 넣은 기존 흐름들을 실기기에서 `--layer1`로 돌려 통과를 확인한다. 통과하지 못하는 흐름은 `LAYER1_FLOWS`에서 빼고 이유를 인벤토리에 적는다(고치지 않는다). 결과를 quickstart.md 「실측 기록」에 적는다(기기 없으면 「미검증」)
- [ ] T035 [US1] 대응표가 드러낸 빈 칸(달력·스트립·권한 행·대화상자 중 기존 흐름이 안 보는 것)마다 (a) 기준 상태에서 생성 없이 끝나는 흐름으로 보강하고(새 파일이면 `FLOWS`·`LAYER1_FLOWS`에 등록하고 인벤토리에 올린다), 또는 (b) 지키는 이유가 약하면(핀치 등) 「사람이 봄 + 이유」로 대응표에 내린다. 결정과 이유를 인벤토리에 한 줄씩 적는다 (FR-022). 끝으로 `npm run test:logic`이 flow-map 불변식을 포함해 전부 초록인지 확인한다

---

## Phase 8: Polish & Cross-Cutting

- [ ] T036 [P] AGENTS.md의 「Maestro」 절에 층 1 사용법 두세 줄을 더한다(`npm run test:layer1`, 전용 기기 전제, 대응표 경로, 기준 상태 드리프트 가드가 `baseline.ts`를 가리킨다) — 길어지지 않게. 실측으로 알게 된 함정(예: `back`·스와이프)이 있으면 그것만 적는다
- [ ] T037 층 1 전체를 처음부터 한 번 더 돌린다(`npm run test:layer1`): 통과 흐름 수, 걸린 시간, 시작 전후 `files/models` 크기 동일을 quickstart.md에 기록한다 (SC-003·SC-004)
- [ ] T038 `npm test`와 `npm run lint`를 실제로 실행해 통과를 확인한다(출력 요약을 기록). 기존 테스트가 하나도 깨지지 않았는지 본다
- [ ] T039 [P] 위반 주입으로 새 계약 테스트를 확인한다: (a) `FLOWS`에서 새 흐름 하나를 빼면 `flow-map.test.ts` 실패, (b) `baseline.ts`에서 `simulation.json` 항목을 빼면 `baseline.test.ts` 실패, (c) 대응표에서 흐름 한 줄을 지우면 실패 — 각각 치환 적용을 먼저 단언하고 되돌린다

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US2(Phase 3) → US3/US4/US5(독립, 파일이 겹치지 않으나 `run-device-tests.mjs` 배열 편집은 순서대로) → US1(Phase 7) → Polish.
- US3·US4·US5는 서로 독립이다(각 흐름 파일). 단, 세 태스크(T017·T021·T026)가 같은 `run-device-tests.mjs`를 편집하므로 순서대로 한다.
- T028(대응표 테스트)은 T032(문서)보다 먼저 쓰므로 그 사이 `npm test`는 빨갛다 — 커밋은 구현 구간 끝에 하므로 의도된 상태다.
- US1의 T030·T031은 US2와 병렬로 미리 시작할 수 있으나 T032는 새 흐름 셋이 있어야 한다.
- 기기 의존 태스크: T018·T019·T022·T023·T025·T027·T034·T037. 나머지는 기기 없이 끝난다.

### Parallel Opportunities

- T005·T006(사진·틀), T008·T009·T010(테스트), T030·T031(조사), T036·T039.

## Implementation Strategy

- **MVP = Phase 1~3(US2) + US3**: 명령 하나로 층 1이 돌고 강제 종료 반복 결함을 잡는다. 기기에서 T018·T019로 먼저 증명한다.
- 이어서 US4, US5로 흐름을 늘리고, 마지막에 US1로 대응표를 닫아 빈 칸·중복을 드러낸다.
- 기기가 없는 동안은 기기 없는 태스크만 끝내고 기기 의존 태스크는 「미검증」으로 남긴다. 건너뛴 실기기 테스트는 통과가 아니다(원칙 V).
