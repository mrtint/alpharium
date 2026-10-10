# Tasks: CI에 네이티브 빌드 확인 추가

**Input**: `specs/072-ci-native-build-check/` — plan.md, spec.md, research.md, quickstart.md
**Tests**: 이 저장소는 테스트 먼저(TDD)다 — 계약 테스트를 쓰고 실패를 본 뒤 워크플로를 쓴다. 앱 코드 변경이 없어 실기기 검증은 해당 없음.
**형식**: `- [ ] T### [P?] [US?] 설명 (파일 경로)` — [P]는 병렬 가능(다른 파일, 미완료 태스크 의존 없음).

## Phase 1: Setup

- [x] T001 `git branch --show-current`가 `072-ci-native-build-check`인지 확인하고, `docs/roadmap/README.md`의 커밋 안 된 수정(별도 과제 추가·4번 항목 서술)이 그대로인지 `git diff --stat`로 확인한다 (docs/roadmap/README.md)
- [x] T002 `.github/workflows/ci.yml`을 읽고 액션 버전(`actions/checkout@v5`·`actions/setup-node@v5`)·Node 24·주석 스타일을 새 워크플로가 따를 규칙으로 정한다 — 파일은 수정하지 않는다 (.github/workflows/ci.yml)

## Phase 2: Foundational (모든 스토리의 전제)

- [x] T003 계약 테스트 뼈대를 쓴다: 워크플로 파일을 읽고 주석을 걷어내는 도우미(`/^\s*#.*$/gm`와 줄 끝 ` #…` 제거), 파일이 없으면 실패하는 첫 테스트. `.ts`라 jest `logic` 프로젝트에서 돈다 (__tests__/ci/native-build-workflow.test.ts)
- [x] T004 T003 테스트가 파일 부재로 **실패**하는 것을 `npx jest __tests__/ci/native-build-workflow.test.ts`로 확인한다

## Phase 3: User Story 2 — 네이티브와 무관한 PR과 머지를 느리게 하지 않는다 (P1) 🎯 워크플로 뼈대

**Goal**: 네이티브 입력이 바뀐 PR·`main` push·수동 실행에서만 시작하고, 네이티브와 무관한 PR에서는 시작하지 않으며, 실패가 가려지지 않는다.
**Independent Test**: 트리거·동시성·`continue-on-error` 부재를 소스로 단언하는 테스트가 통과한다.

- [x] T005 [US2] 트리거 계약 테스트를 쓴다: `pull_request.paths`가 정확히 `package.json`·`package-lock.json`·`app.json`·`plugins/**`·`.github/workflows/native-build.yml` 다섯, `pull_request_target`·`schedule` 없음, `push.branches`가 `main`뿐이고 push에 `paths` 없음, `workflow_dispatch` 있음 (__tests__/ci/native-build-workflow.test.ts)
- [x] T006 [US2] 동시성·실패 처리 계약 테스트를 쓴다: `concurrency.group`에 `github.ref` 포함·`cancel-in-progress: true`, `continue-on-error` 어디에도 없음 (__tests__/ci/native-build-workflow.test.ts)
- [x] T007 [US2] 테스트가 실패하는 것을 확인한 뒤, 워크플로 뼈대(`name: Pocketlog Native Build`, `on`, `concurrency`)를 쓴다. 잡은 아직 없다 — T005·T006이 통과해야 한다 (.github/workflows/native-build.yml)

## Phase 4: User Story 1 — 네이티브가 깨진 채 main에 들어가면 빨간불로 안다 (P1) 🎯 MVP

**Goal**: 안드로이드·iOS 두 잡이 서로 독립으로 돌며 각자 네이티브 빌드를 끝까지 한다.
**Independent Test**: 없는 config plugin을 넣은 브랜치에서 실행하면(PR을 열면) 두 잡이 모두 실패하고, 되돌리면 둘 다 성공한다.

- [x] T008 [US1] 잡 계약 테스트를 쓴다: `android`·`ios` 잡이 있고 어느 잡에도 `needs:`가 없음 · 안드로이드 `runs-on: ubuntu-latest`, `expo prebuild --platform android --clean`, `./gradlew assembleDebug`, `-PreactNativeArchitectures=arm64-v8a`가 있고 `armeabi`·`x86`이 없음 · iOS `runs-on: macos-latest`, `expo prebuild --platform ios --clean`, `pod install`, `-sdk iphonesimulator`, `CODE_SIGNING_ALLOWED=NO` · 두 잡 모두 `timeout-minutes`가 있음(러너가 시간 제한으로 죽이면 실패로 표시되게 하는 안전망) (__tests__/ci/native-build-workflow.test.ts)
- [x] T009 [US1] 서명·결과물 금지 계약 테스트를 쓴다: `secrets.`·`upload-artifact`·`.jks`·`signingConfig`·`keystore`가 없음, 안드로이드에 `assembleRelease`·`bundleRelease`가 없음 (__tests__/ci/native-build-workflow.test.ts)
- [x] T010 [US1] T008·T009가 **실패**하는 것을 확인한다 (잡이 없으므로)
- [x] T011 [US1] `android` 잡을 쓴다: checkout → setup-node(24, npm 캐시) → setup-java(temurin 17) → `npm ci` → `expo prebuild --platform android --clean` → gradle 캐시(`~/.gradle`, 키 = `package-lock.json`·`app.json` 해시) → `cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`. `timeout-minutes: 60` (.github/workflows/native-build.yml)
- [x] T012 [US1] `ios` 잡을 쓴다: checkout → setup-node → `npm ci` → `expo prebuild --platform ios --clean --no-install` → CocoaPods 캐시 → `cd ios && pod install` → `xcodebuild -workspace ios/Pocketlog.xcworkspace -scheme Pocketlog -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath $RUNNER_TEMP/dd CODE_SIGNING_ALLOWED=NO build`. `timeout-minutes: 60` (.github/workflows/native-build.yml)
- [x] T013 [US1] `npx jest __tests__/ci/native-build-workflow.test.ts`가 통과하는 것을 확인한다
- [x] T014 [US1] 위반 주입(소스 계약): quickstart §3의 표 여섯 가지를 하나씩 적용해 테스트가 실패하는지 본다. **치환이 실제로 적용됐는지 먼저 단언**하고(prettier가 줄을 합쳤으면 치환이 조용히 안 먹는다), 되돌린 뒤 원래 문자열이 돌아왔는지 `grep`한다 (.github/workflows/native-build.yml, __tests__/ci/native-build-workflow.test.ts)

## Phase 5: User Story 3 — 걸리는 시간과 메모리가 숫자로 남는다 (P2)

**Goal**: 각 잡의 단계별 시간과 안드로이드 최대 메모리가 실행 요약에 남고, 실패·타임아웃에도 남는다.
**Independent Test**: 실행의 Summary에 값이 보인다.

- [x] T015 [US3] 측정 계약 테스트를 쓴다: 두 잡 모두 `GITHUB_STEP_SUMMARY`에 쓴다 · 요약 기록 단계가 `if: always()` · 안드로이드에 `/proc/meminfo` 샘플링이 있음 · 측정 코드가 `src/`를 건드리지 않는다는 것은 `git diff --stat`으로 T020에서 본다 (__tests__/ci/native-build-workflow.test.ts)
- [x] T016 [US3] T015가 **실패**하는 것을 확인한다
- [x] T017 [US3] 두 잡에 러너 사양(`nproc`·`free -m` 또는 `sw_vers`·`sysctl hw.memsize`)을 요약에 쓰는 단계와, 각 큰 단계(prebuild·pod install·빌드)의 시작·끝 `date +%s`로 시간을 요약에 쓰는 기록을 더한다. 기록 단계는 `if: always()` (.github/workflows/native-build.yml)
- [x] T018 [US3] 안드로이드 잡에 빌드 직전 백그라운드로 5초마다 `MemTotal - MemAvailable`을 파일에 적는 단계를 더하고, 빌드 뒤(`if: always()`) 최대값을 요약에 쓴다 (.github/workflows/native-build.yml)
- [x] T019 [US3] `npx jest __tests__/ci/native-build-workflow.test.ts`가 통과하는 것을 확인하고, 측정 가드를 위반 주입으로 확인한다: 요약 기록 단계의 `if: always()` 제거, `/proc/meminfo` 샘플링 제거 각각 테스트가 실패해야 한다(치환 적용 단언·되돌림 grep 포함) (.github/workflows/native-build.yml, __tests__/ci/native-build-workflow.test.ts)

## Phase 6: Polish & 검증

- [x] T020 `npm test`·`npm run lint`(prettier 포함 — 워크플로 YAML도 포맷 검사 대상인지 확인)를 실행해 통과를 확인한다. `git diff --stat main...HEAD -- src .github/workflows/ci.yml`이 비어 있음을 확인한다 (원칙 IV·FR-011·SC-005)
- [x] T021 사용자 확인을 받고 현재 구현을 피처 브랜치에 커밋한 뒤 push하고 **초안 PR**을 연다(워크플로 파일이 경로 필터에 들어 있어 첫 실행이 돈다). 러너에서만 드러나는 문제(NDK/CMake 버전, Xcode 버전, 캐시 키)는 고쳐서 같은 커밋에 합치고(`--amend` + `--force-with-lease`, 자기 브랜치, 매번 확인) plan의 「실측 전이라 확정하지 않는 것」 표에 따라 research.md에 기록한다 (.github/workflows/native-build.yml, specs/072-ci-native-build-check/research.md)
- [x] T022 `gh run rerun`으로 같은 ref에서 **둘째 실행**을 해 캐시 적중 시간을 얻는다. 러너 수정 push가 진행 중이던 앞선 실행을 취소하는지(FR-001a)는 관찰되면 기록한다(계약 테스트가 설정을 잠근다) (러너)
- [x] T023 위반 주입(SC-001): 피처 브랜치에서 `072-inject`를 따 `app.json`의 `plugins`에 없는 이름(`"./plugins/does-not-exist"`)을 넣고 **피처 브랜치를 base로** 초안 PR을 연다 → 두 잡이 빨갛게 되는 것을 본다. 되돌려 push해 초록을 본다 (app.json)
- [x] T028 경로 필터 음성 확인(FR-003): 피처 브랜치에서 `072-docs-only`를 따 문서 파일 하나만 바꾸고 피처 브랜치를 base로 PR을 연다 → 이 확인이 시작되지 않고 `ci.yml`만 도는 것을 본다 (docs)
- [x] T024 첫·둘째 실행의 값으로 quickstart §5 표를 채우고, `timeout-minutes`를 실측에 맞게 확정한다. 안드로이드가 지나치게 길면 ccache를 후속 과제로 로드맵에 한 줄 남긴다 (specs/072-ci-native-build-check/quickstart.md, .github/workflows/native-build.yml, docs/roadmap/README.md)
- [x] T025 FR-013 확인 사항(브랜치 보호의 필수 체크에 이 잡이 없다)을 소유자에게 확인해 quickstart에 결과를 적는다 (specs/072-ci-native-build-check/quickstart.md)
- [x] T026 `docs/roadmap/README.md`를 갱신한다: 이 과제의 할 일 1번을 「네이티브 입력(`package.json`·`package-lock.json`·`app.json`·`plugins/**`)이 바뀐 PR과 `main` push·수동 실행에서만, 필수 체크는 아님」으로 고치고, 「안드로이드 release 빌드·서명·보관을 CI로」와 「무료 빌드 머신으로 iOS 빌드·업로드」에 「Tier 3(서명·업로드)는 태그·수동 트리거로, release 빌드 종류는 여기서 정한다」를 한 줄씩 더한다 (docs/roadmap/README.md)
- [x] T027 T023·T028 뒤 두 PR을 닫고 `072-inject`·`072-docs-only`를 로컬·원격에서 지운다(`git branch -D`, `git push origin --delete`) — 사용자 확인 후 (git)

## Dependencies & 실행 순서

- Phase 1 → Phase 2 → **Phase 3(US2: 뼈대)** → **Phase 4(US1)** → Phase 5(US3) → Phase 6. 같은 두 파일(`native-build.yml`·테스트 파일)을 모든 스토리가 건드리므로 **병렬 가능한 태스크는 없다**.
- US1과 US2는 둘 다 P1이다. US2의 뼈대가 파일을 만들어 US1이 그 위에 잡을 얹으므로 US2가 먼저다.
- T021~T023·T028은 PR 실행으로 한다(`pull_request`는 파일이 `main`에 없어도 PR 브랜치의 워크플로를 쓴다). T026은 어느 단계 뒤에도 된다.
- **머지 뒤에만 관찰 가능**: FR-001(`main` push 실행)과 FR-002(수동 실행)는 워크플로가 `main`에 들어간 뒤에야 확인된다. 이 구현 구간에서는 닫을 수 없으므로 최종 보고의 미확인 잔여로 올리고, 머지 뒤 quickstart §2.4로 한 번 본다.
- T021~T023·T028은 러너가 필요하고 push를 동반한다 — 커밋·push는 구현 구간 종료 규칙(kickoff)에 따라 사용자 확인을 받은 뒤에 한다.

## 구현 전략

- **MVP**: Phase 2~4(뼈대 + 두 잡). 측정(Phase 5)은 그 위의 추가다.
- 3티어 모델: 이 워크플로가 Tier 2이고 Tier 1은 `ci.yml`, Tier 3(서명·업로드)는 후속 과제다.
- 러너에서 처음 돌리면 예상 못 한 환경 문제가 나올 수 있다(NDK·Xcode 버전). T021에서 고치고 기록하되 새 도구를 임의로 들이지 않는다.

## Phase 7: Convergence

- [x] T029 러너 사양·단계별 시간·안드로이드 최대 메모리를 실행 요약뿐 아니라 잡 로그(표준 출력)에도 출력해 `gh run view --log`로 읽을 수 있게 한다 (.github/workflows/native-build.yml) per SC-003 (missing)
- [x] T030 `gh workflow run native-build.yml`로 수동 실행이 되는지 확인하고, `main` push 실행(머지 직후)의 결과를 기록한다 per FR-001·FR-002 (missing)
- [x] T031 T029 반영 push로 도는 실행에서 캐시 적중 시간을 얻고, 첫 실행(안드로이드 9분 51초·iOS 8분 52초)과 함께 quickstart §5 표를 채운다. `timeout-minutes`를 실측에 맞게 확정한다 per SC-003 (missing)
- [x] T032 `main`에서 따는 `072-inject` 브랜치로 `app.json`에 없는 plugin 이름을 넣은 PR을 열어 두 잡이 빨갛게 되는지, 되돌리면 초록이 되는지 확인한다 per SC-001 (missing)
- [x] T033 `main`에서 따는 `072-docs-only` 브랜치로 문서 파일 하나만 바꾼 PR을 열어 네이티브 빌드 확인이 시작되지 않고 `ci.yml`만 도는지 확인한다 per FR-003 (missing)
- [x] T034 `gh api`로 `main`의 브랜치 보호(필수 체크)를 조회해 이 잡이 필수가 아님을 확인하고 quickstart §4에 결과를 적는다 per FR-013 (missing)
- [x] T035 T032·T033의 PR을 닫고 `072-inject`·`072-docs-only` 브랜치를 로컬·원격에서 지운다 per plan: 일회용 PR 정리 (missing)
