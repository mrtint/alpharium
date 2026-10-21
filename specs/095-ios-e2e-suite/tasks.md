# Tasks: iOS e2e 세트 — 안드로이드와 같은 층 1·층 2를 iOS에 갖춘다

**Input**: `specs/095-ios-e2e-suite/` — [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: 이 프로젝트는 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」, AGENTS). 테스트 태스크는 구현 태스크보다 앞선다. 기기 없는 jest(`logic`)는 포트를 대역으로 주입한다. `.ts`는 `npx jest <경로> --selectProjects logic`.

**Format**: `- [ ] T### [P?] [US?] 설명 (파일 경로)`. [P] = 다른 파일이라 병렬 가능.

**기기 태스크**: "시뮬레이터에서", "iPhone에서"는 실제 기기 실측이다. 건너뛴 것은 통과가 아니다(원칙 V). iPhone 태스크는 전제(모델 받음, Xcode 끔, 잠금 해제)를 사람이 맞춘다.

## Phase 1: Setup — 계획이 남긴 실측 (기기 확인, 코드 변경 없음)

- [ ] T001 시뮬레이터 하나(iPhone 18 Pro `7D4BB86B-…`)를 부팅해 dev 클라이언트가 깔려 있고 `get_app_container … data`가 `Documents/`를 주는지, Metro가 dev 환경(`.env.development.local`)으로 번들하는지 확인하고 결과를 `specs/095-ios-e2e-suite/research.md`에 한 줄 덧붙인다
- [ ] T002 [P] R5 실측 — 시뮬레이터 `Documents/models/`를 채우는 방법(앱 첫 실행 내려받기 vs 호스트 사본 복사)을 하나 골라 실제로 `a1.bin`·`v1.bin`·`v2.bin`(+`state.json`)을 두고, 걸린 시간과 방법을 `research.md` R5에 확정으로 적는다 (가짜 파일 금지 — 042)
- [ ] T003 [P] R4 실측 — 시뮬레이터 사진 DB(`…/data/Media/PhotoData/Photos.sqlite`)에서 `simctl addmedia`로 심은 사진의 이름·촬영 시각을 `sqlite3` 읽기 전용으로 질의할 수 있는지, EXIF 촬영 시각이 반영되는지 시험(연습 사진 1장)하고 테이블·열 이름을 `research.md` R4에 확정으로 적는다
- [ ] T004 [P] R7 실측 — `xcrun devicectl device info files … --json-output -`의 JSON 모양(경로·디렉터리 구분 필드)을 iPhone에서 한 번 받아 `__tests__/e2e/fixtures/devicectl-info-files.json`에 저장(개인 경로 제외)하고, `devicectl device process launch --console`로 앱 출력에서 쓰기 진행을 볼 수 있는지 시험해 결과를 `research.md` R7에 적는다

---

## Phase 2: Foundational — 플랫폼 중립으로 좁히기 (모든 이야기가 기다린다)

- [ ] T005 테스트 먼저: `__tests__/e2e/layer1-runner.test.ts`에 (a) 장치가 알린 플랫폼 문구가 skipped 이유에 쓰인다(안드로이드는 기존 문구와 바이트 동일, iOS는 `simctl`·시뮬레이터 문구), (b) `prepareBaseline`이 `BaselineDevice`(= `Layer1Device`에서 `listDevices`·`hasMaestro`·`runMaestro`를 뺀 `Pick`)만으로 돈다를 더해 실패하는 것을 본다
- [ ] T006 `scripts/layer1/device.ts`에 `platform: "android" | "ios"`와 이유 문구 필드, `BaselineDevice` 타입을 더하고 `adbDevice()`를 맞춘다. `scripts/layer1/runner.ts`·`scripts/layer2/runner.ts`의 `adb`/안드로이드 고정 문구를 장치가 준 문구로 바꾼다 (안드로이드 동작·문구는 바이트 그대로 — FR-009)
- [ ] T007 `npx jest __tests__/e2e --selectProjects logic`가 모두 통과함을 확인한다 (기존 안드로이드 테스트 회귀 0)

**Checkpoint**: 두 플랫폼이 `prepareBaseline`을 포트로 공유할 수 있다.

---

## Phase 3: User Story 1 — iOS 화면 흐름을 한 번에 돌려 회귀를 잡는다 (P1)

**Goal**: 시뮬레이터에서 `npm run test:layer1:ios` 한 번으로 층 1 전부 통과.
**Independent Test**: quickstart A (SC-001·003·005).

### Tests (먼저, 실패하는 것을 확인)

- [ ] T008 [P] [US1] `__tests__/e2e/ios-simulator-device.test.ts` — `exec` 포트 대역으로: 컨테이너 경로를 호출마다 `get_app_container`로 찾는다(저장 안 함), `listDevices`가 부팅된 iOS 시뮬레이터만 준다, 경로 안전 검사(`..`·공백 거부), `forceStop`은 미실행이어도 성공, 앱이 없으면 `probe`가 이유를 준다
- [ ] T009 [P] [US1] `__tests__/e2e/ios-layer1-source-contract.test.ts` — 주석을 걷어낸 `scripts/layer1/ios-simulator-device.ts`에 `erase`·`uninstall`·`install`·`delete`·`rm -rf`·`models`를 지우는 연산이 없음을 소스로 잠근다 (I-1, `layer1-source-contract.test.ts`와 같은 방식)
- [ ] T010 [P] [US1] `__tests__/e2e/ios-sample-device.test.ts` — `SampleDevice` iOS 구현: `pushDir`가 `addmedia`에 폴더 안 파일들을 넘긴다, `queryRows`가 DB 대역에서 `s30-` 행만 준다, `removeSampleFiles`는 지우지 않고 실패(Outcome.ok=false)와 「새 시뮬레이터 보관함이 필요하다」 이유를 준다(research R4), 표식은 시뮬레이터 데이터 폴더 안에 읽고 쓴다
- [ ] T011 [US1] `__tests__/e2e/ios-layer1-runner.test.ts` — iOS 대역 장치로 `runLayer1`: 시뮬레이터 없음→skipped, 둘 이상→aborted, 앱 미설치→aborted, 모델 없음→aborted, 정상→Maestro가 `--device <UDID>`로 한 번 불리고 passed, 실패 흐름 이름 보고, 실행 전후 `diary/`에 픽스처 외 새 일기 없음(SC-003)

### Implementation

- [ ] T012 [US1] `scripts/layer1/ios-simulator-device.ts` — `Layer1Device` iOS 구현 (data-model 「IosSimulatorDevice」): `xcrun simctl list devices booted --json`, `get_app_container data`, `Documents/` 호스트 파일 연산, `simctl terminate`, `maestro --device <UDID> test … --format junit`(UTF-8 옵션 포함, `--no-reinstall-driver`는 iOS 드라이버 재설치 여부를 T021에서 실측해 정한다)
- [ ] T013 [P] [US1] `scripts/e2e-sample/ios-device.ts` — `SampleDevice` iOS 구현: `simctl addmedia`, T003에서 확정한 `Photos.sqlite` 질의, 표식은 시뮬레이터 데이터 폴더, `removeSampleFiles`는 위 T010대로 중단 이유를 돌려준다. `simctl privacy grant photos|location com.a810labs.pocketlog`는 표본 보장 앞에서 한 번 부른다
- [ ] T014 [US1] `scripts/e2e-sample/layer1-step.ts`의 `realSampleStep(log)`가 샘플 장치를 받게 하고(`realSampleStep(log, sampleDevice = adbSampleDevice())`), `scripts/layer1/with-sample.ts`의 「기기 하나」 문구를 장치가 준 문구로 바꾼다 (안드로이드 경로 바이트 그대로)
- [ ] T015 [US1] `scripts/run-device-tests.mjs`에 `IOS_LAYER1_FLOWS`와 `--ios-layer1` 모드(`runIosLayer1Mode`)를 더하고 `package.json`에 `"test:layer1:ios"`를 더한다. 끝 줄에 「시뮬레이터 결과 — 실제 iPhone을 말해 주지 않는다」를 보고하고, 건너뜀·중단·실패를 안드로이드와 같은 `report()`로 낸다 (기존 `--layer1`·`--layer2` 모드는 변경 없음)
- [ ] T016 [US1] Maestro 호환 — `- back`을 쓰는 흐름의 사이트를 흐름마다 점검해 안드로이드 동작은 그대로 두고 iOS에서도 같은 의도를 지키게 한다(`when: platform: Android` 분기 또는 화면의 뒤로 가기·닫기 id 탭, research R3): `.maestro/single-photo-swipe.yml`(48행)
- [ ] T017 [P] [US1] 위와 같이 `.maestro/dialog-foundation.yml`(50행)·`.maestro/diary-home-1d.yml`(84행)·`.maestro/today-diary.yml`(111행)
- [ ] T018 [P] [US1] 위와 같이 `.maestro/state-simulation.yml`(42·43·73·74행)
- [ ] T019 [US1] 위와 같이 `.maestro/settings-developer-sweep.yml`(94·107·119·131행의 `back` + OS 설정 왕복 부분은 `.maestro/ios/settings-sweep.yml`이 이미 푼 방식 재사용: `launchApp stopApp: false` + `_dismiss-open-prompt`)
- [ ] T020 [US1] `.maestro/ios/` 정리(FR-006, 결정): `settings-sweep.yml`·`developer-diagnostics-sweep.yml`은 T019로 `settings-developer-sweep.yml`이 iOS에서 같은 범위를 보므로 삭제하고, `first-run-to-home.yml`은 새 설치 전제(`clearState`)에 모델 ~2GB 내려받기가 걸려 층 1 기준 상태와 맞지 않고 같은 경로를 층 2 `first-run-auto-diary`가 실제 모델로 보므로 삭제한다. 보조 `_dismiss-open-prompt.yml`은 남긴다. 사유를 `docs/e2e/feature-flow-map.md` 인벤토리에 적는다
- [ ] T021 [US1] 시뮬레이터에서 `npm run test:layer1:ios`를 돌려 모든 흐름이 통과할 때까지 흐름/실행기를 고친다(모델 없는 상태에서 닿는 화면 범위·소요 시간 메모, `--no-reinstall-driver` 효과 포함). `PASSED` 출력 확보 — SC-001
- [ ] T022 [US1] 위반 주입(quickstart A5·A6): (a) 흐름 하나의 기대 id를 치환했음을 단언한 뒤 실행해 `FAILED`와 흐름 이름이 나오는지 확인하고 되돌린다, (b) 실행 뒤 시뮬레이터 `Documents/diary/`가 픽스처 사흘뿐인지 확인한다 — SC-003

**Checkpoint**: US1 단독으로 가치가 있다 — iOS 화면 회귀를 잡는다.

---

## Phase 4: User Story 2 — iPhone 14에서 실제 모델로 쓰는 경로를 네 흐름으로 확인한다 (P1)

**Goal**: `npm run test:layer2:ios`로 네 흐름이 완주한다.
**Independent Test**: quickstart B (SC-002).

### Tests (먼저)

- [ ] T023 [P] [US2] `__tests__/e2e/ios-device-ctl.test.ts` — `devicectl` 실행 포트 대역과 T004 JSON 고정물로: `info files` 파싱(`Documents/<rel>` 직접 자식), `copy to/from` 인자(`--domain-type appDataContainer --domain-identifier com.a810labs.pocketlog`), 파일 삭제가 디렉터리 단위 교체(`--remove-existing-content true`)로 구현됨, 연결된 iPhone이 0대→skipped·2대→aborted
- [ ] T024 [P] [US2] `__tests__/e2e/ios-layer2-source-contract.test.ts` — 주석을 걷어낸 `scripts/layer2-ios/device.ts`에서 `uninstall`·`install`이 없고 `--remove-existing-content`는 `preferences`·`diary`·`vision-cache` 디렉터리에만 쓰이며 `models`를 올리거나 교체하는 코드가 없음을 잠근다 (I-1)
- [ ] T025 [P] [US2] `__tests__/e2e/ios-layer2-flows.test.ts` — 흐름 id 넷(`open-app-writes`·`write-and-read`·`diagnostics-try-write`·`first-run-auto-diary`) 존재, `open-app-writes`만 `humanSteps` 비어 있음, 나머지는 번호 안내문 있음, 대기 한도 기본값 5분·10분, 안드로이드 `LAYER2_FLOWS`와 `story` 문구가 같음
- [ ] T026 [US2] `__tests__/e2e/ios-layer2-runner.test.ts` — 대역 장치·대역 시계로 `runLayer2Ios`: (a) 일기 파일이 생기면 passed+수집, (b) Enter 없이 5분이 지나면 `failed-operation-timeout`, Enter 뒤 10분 안에 파일이 안 생기면 `failed-generation-timeout`으로 서로 다르게 보고한다(FR-010), 표준 입력이 터미널이 아니면 사람 흐름은 aborted, (c) `write-failures.json`에 항목이 생기면 failed와 갈래 이름, (d) 모델 0바이트→aborted, (e) Xcode 실행 중→시딩 전에 aborted(087), (f) 기준 상태 복원이 마지막에 불린다, (g) 본문을 읽거나 점수화하지 않는다(수집은 복사뿐), (h) 연결된 iPhone이 없으면 skipped와 이유(SC-005), (i) 순서: 시딩은 자동 쓰기 꺼짐 상태에서 일어나고 흐름별 덮어쓰기는 시딩 뒤에 적용된다(B2), (j) 같은 날 재실행에서는 시딩을 건너뛴다(B1)

### Implementation

- [ ] T027 [US2] `scripts/layer2-ios/device.ts` — `devicectl` 기반 `Layer2Device` 부분집합 + 앱 실행(`process launch --terminate-existing`)/종료 + 스테이징 폴더(`preferences`·`diary`·`vision-cache`만 미러링, `models/`는 읽기 전용) (data-model 「IosDeviceTarget」)
- [ ] T028 [P] [US2] `scripts/layer2-ios/flows.ts` — `Layer2IosFlow` 표 (data-model): `preferenceOverrides`·`deleteFiles`·`absentDays`·`writtenDay`는 `scripts/layer2/flows.ts`의 같은 흐름과 같은 값을 쓴다(복제 대신 import 후 `humanSteps`·`seedsPhotos`만 더한다)
- [ ] T029 [US2] `scripts/layer2-ios/runner.ts` — contracts/ios-layer2-runner.md L2-0~L2-8: `prepareBaseline` 재사용(스테이징 장치 위), `humanSteps` 흐름의 Enter 대기(`operationTimeoutMs`), 5초 폴링, 형식 확인(JSON 파싱·날짜 일치·본문 비어 있지 않음만), `write-failures.json` 단언, 수집(`.cache/layer2-ios/<시각>/`), 마지막 기준 상태 복원. 대기 한도는 옵션으로 받는다(테스트·음성 확인용)
- [ ] T030 [US2] `scripts/layer2-ios/run.ts` — 실제 포트 연결: `ios:seed`를 어제 날짜·5장·위치 포함으로 호출(사진은 `.cache/e2e-sample/` 카탈로그의 카메라 사진 5장 — 없으면 `npm run sample:fetch`가 필요하다는 이유로 aborted), `.cache/layer2-ios/seeded.json`으로 같은 날 재시딩 방지(contracts L2-3), Xcode 실행 점검(`pgrep -x Xcode`), 안내문 출력
- [ ] T031 [US2] `scripts/run-device-tests.mjs`에 `--ios-layer2` 모드, `package.json`에 `"test:layer2:ios"`를 더한다(`--operation-timeout`·`--generation-timeout` 초 단위 인자 전달 — 기본 300·600). 기존 모드 변경 없음
- [ ] T032 [US2] iPhone에서 (사람이 모델을 받은 뒤) `open-app-writes` 흐름을 `npm run test:layer2:ios`로 돌려 사람 조작 없이 PASS하는 것을 확인하고 일기 수집 경로를 `research.md`에 기록한다
- [ ] T033 [US2] iPhone에서 `write-and-read` 흐름 완주(안내대로 어제 「쓰기」 탭) 확인
- [ ] T034 [US2] iPhone에서 `diagnostics-try-write` 흐름 완주 확인
- [ ] T035 [US2] iPhone에서 `first-run-auto-diary` 흐름 완주 확인(작명 입력 포함)
- [ ] T036 [US2] 음성 확인(quickstart B6): `write-and-read`를 `--operation-timeout 5 --generation-timeout 5`(초)로 Enter를 누르지 않고 돌려 `failed-operation-timeout`이 나오는지, Enter만 누르고 쓰기를 하지 않으면 `failed-generation-timeout`이 나오는지 보고 기본값으로 되돌린다. 네 흐름 일기를 사람이 읽은 소견(원칙 II·IV)을 `research.md`에 한 줄 남긴다 — SC-002

**Checkpoint**: US1·US2가 각각 독립으로 동작한다.

---

## Phase 5: User Story 3 — 어떤 흐름이 어떤 기능을 지키는지 한곳에서 안다 (P2)

**Goal**: 등록과 대응표가 어긋나면 기기 없는 테스트가 실패한다.
**Independent Test**: quickstart C (SC-004).

- [ ] T037 [US3] 테스트 먼저: `__tests__/e2e/flow-map.test.ts`에 contracts/ios-flow-map.md M-iOS-1~4를 더하고(`IOS_LAYER1_FLOWS`·`scripts/layer2-ios/flows.ts` ↔ 대응표 iOS 열/인벤토리, `.maestro/ios/` 파일은 등록 또는 `_` 보조), 실패하는 것을 확인한다
- [ ] T038 [US3] `docs/e2e/feature-flow-map.md` — 기능 표에 「iOS 층 1」·「iOS 층 2」 열, 흐름 인벤토리에 iOS 열과 사유, 머리말의 「iOS 갈래는 범위 밖」 문구와 마지막 행(iOS 시뮬레이터 훑기) 정리, T020의 `.maestro/ios/` 결정 반영. 계약 테스트가 이미 지키는 동작은 iOS 흐름을 새로 만들지 않았음을 확인한다(FR-016, M-iOS-5)
- [ ] T039 [US3] `docs/e2e/layer2-release-checklist.md` — 「iOS」 절을 이 기능의 실제 절차(전제·`npm run test:layer2:ios`·안내 조작·본문 읽기)로 바꾸고 안드로이드 전제 항목의 중복을 피한다. `__tests__/e2e/layer2-checklist.test.ts`가 절 이름/문구를 잠그면 함께 고친다
- [ ] T040 [US3] 위반 주입: (a) `IOS_LAYER1_FLOWS`에서 흐름 하나를 뺀 상태를 만들어(치환 적용을 먼저 단언) `flow-map.test.ts`가 실패하는지 확인하고 되돌린다, (b) 대응표에서 iOS 층 2 행 하나를 지워 실패하는지 확인하고 되돌린다 — SC-004
- [ ] T041 [US3] `AGENTS.md`의 「저장소의 현재 상태」·「도구 사용법 3·4」·「테스트」 표에서 iOS e2e 서술을 이 결정(층 1 시뮬레이터 `test:layer1:ios`, 층 2 실기기 `test:layer2:ios`, 실기기 Maestro 구동 도구 미채택과 이유)으로 고친다 — 낡은 서술은 주석으로 덧대지 않고 고친다(FR-018)

---

## Phase 6: User Story 4 — CI에 넣을지 근거로 정한다 (P3)

- [ ] T042 [US4] T021·T022의 층 1 소요 시간(분), 모델 없이 닿는 화면 범위, 모델 2GB 요구로 CI가 어려운 점을 `docs/roadmap/README.md` 해당 항목(또는 완료 이력 행)과 `research.md`에 한 줄로 기록하고 CI 도입 여부 결정을 적는다 — SC-006, FR-020

---

## Phase 7: Polish & Cross-Cutting

- [ ] T043 `.gitignore`에 `.cache/layer2-ios/`가 걸리는지 확인한다(`.cache/` 전체가 무시되면 그대로)
- [ ] T044 `scripts/check-constitution.mts`/`scripts/constitution-rules.ts`가 새 파일에서 불평하는지 `npm run lint`로 확인하고 필요하면 예외 목록 없이 구조를 고친다
- [ ] T045 제품 코드 무변경 확인(FR-008): `git diff --stat origin/main -- src/ app.json plugins/ modules/`가 비어 있음을 확인한다
- [ ] T046 위반 주입(FR-019): (a) `scripts/layer1/ios-simulator-device.ts`에 `uninstall` 문자열을 넣어(치환이 적용됐는지 먼저 단언) `ios-layer1-source-contract.test.ts`가 실패하는지, (b) `scripts/layer2-ios/device.ts`에서 `models`를 `--remove-existing-content` 대상에 넣어 `ios-layer2-source-contract.test.ts`가 실패하는지, (c) `scripts/layer2-ios/runner.ts`가 일기 본문을 읽는 코드를 넣어 T026(g)가 실패하는지 확인하고 모두 되돌린다
- [ ] T047 `npm test`와 `npm run lint`를 실제로 실행해 통과를 확인한다 (SC-007)
- [ ] T048 `specs/095-ios-e2e-suite/quickstart.md`의 명령·기대 문구를 실제 구현과 맞추고 quickstart를 처음부터 한 번 따라 해 본다
- [ ] T049 `docs/roadmap/README.md`의 「주요 기능별 e2e 테스트」 항목 본문(배경·할 일 1·2·3·완료 조건·위험)에서 「iOS 시뮬레이터 갈래」·「층 2의 iOS 갈래」 서술을 실제 결정(층 1 시뮬레이터, 층 2 iPhone 14 실기기 + 사람 조작, Maestro 실기기 구동 미채택과 이유)에 맞게 고친다 — 낡은 서술은 덧대지 않고 고친다(FR-018). 실제 이력 이동은 kickoff 완료 처리 단계에서 한다

---

## Dependencies & Execution Order

- Phase 1(T001~T004) → Phase 2(T005~T007) → US1(Phase 3)과 US2(Phase 4)는 Phase 2 뒤 병렬 가능(서로 다른 파일). US3(Phase 5)는 US1·US2의 흐름 표가 있어야 확정(T037은 먼저 써 둘 수 있다). US4는 T021·T022 뒤.
- 각 이야기 안: 테스트 → 구현 → 기기 확인.
- T016~T019는 서로 다른 흐름 파일이라 T017·T018은 [P], 같은 시뮬레이터에서 T021이 모두 모아 검증한다.
- iPhone 태스크(T032~T036)는 사람이 모델 내려받기·Xcode 끄기·잠금 해제를 맞춘 뒤에만 시작한다.

## Parallel Examples

- Phase 1: T002·T003·T004를 동시에.
- US1 테스트: T008·T009·T010을 동시에.
- US2 테스트: T023·T024·T025를 동시에, 구현은 T027 후 T028 [P].

## Implementation Strategy

1. **MVP = US1** (Phase 1·2 + Phase 3): iOS 화면 회귀를 잡는다.
2. US2로 실기기 실제 모델 경로를 더한다.
3. US3로 등록·문서를 잠그고 US4로 CI 판단을 기록한다.
4. 실측으로 계획이 틀렸음이 드러나면(예: 시뮬레이터 보관함 한계) 해당 research 항목을 고치고 이 파일에 태스크를 더한다.
