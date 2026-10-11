---

description: "075 iOS 클라우드 릴리스 — 구현 태스크"
---

# Tasks: 무료 빌드 머신으로 iOS 빌드·업로드

**Input**: `/specs/075-ios-cloud-release/` — plan.md, spec.md, research.md, data-model.md, contracts/workflow-contract.md, quickstart.md

**Prerequisites**: plan.md, spec.md

**Tests**: 요청됨(헌법 「계약 먼저, 테스트 먼저」). 계약 테스트를 워크플로보다 먼저 쓰고 실패(red)를 본다.

**Organization**: 사용자 스토리별. 앱 코드(`src/`)는 건드리지 않는다.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 `git branch --show-current`가 `075-ios-cloud-release`인지 확인하고, 072의 `__tests__/ci/native-build-workflow.test.ts`(`read`·`section`·`listItems` 헬퍼)와 `.github/workflows/native-build.yml`의 러너·액션 버전을 읽어 새 파일이 같은 방식을 따르게 한다.

## Phase 2: Foundational (모든 스토리 전에)

- [x] T002 `__tests__/ci/ios-release-workflow.test.ts`를 만든다 — 072 헬퍼를 복사하되 대상은 `.github/workflows/ios-release.yml`, 주석을 먼저 걷는다. W1(파일이 있다)만 넣고 실행해 **파일이 없어서 실패**하는 것을 확인한다(red).

## Phase 3: User Story 2 - 비밀이 퍼블릭 저장소에서 새지 않는다 (Priority: P1)

**Goal**: 워크플로 파일을 읽는 계약이 비밀 유출 경로를 모두 잠근다.

**Independent Test**: `npx jest __tests__/ci/ios-release-workflow.test.ts` + 위반 주입 12종이 각각 실패로 뒤집힌다.

- [x] T003 [US2] `__tests__/ci/ios-release-workflow.test.ts`에 W2~W12·W14~W16을 추가한다(contracts/workflow-contract.md 표 그대로): `on:` 키가 `workflow_dispatch` 하나뿐, 잡 하나·`environment: ios-release`·`runs-on: macos-latest`, 최상위 `permissions`가 `contents: read` 하나뿐, `secrets.` 참조 집합이 허용 여섯의 부분집합이고 `env:` 값 자리에서만 나옴, `actions/upload-artifact`·`actions/cache` 없음, `set -x`·비밀 변수 출력 없음, 정리 단계 `if: always()`와 `security delete-keychain`·프로파일·`AuthKey_` 삭제, `concurrency`의 `cancel-in-progress: false`, `continue-on-error` 없음, 업로드가 `--apiKey`·`--apiIssuer`이고 `--username`·`--password` 없음, 서명 인자(`CODE_SIGN_STYLE=Manual`·`DEVELOPMENT_TEAM=PGNGG84B39`·`PROVISIONING_PROFILE_SPECIFIER="Pocketlog App Store"`·`scripts/ios/ExportOptions.plist`), `timeout-minutes` 있음, 요약에 Xcode 버전·단계별 시간, `scripts/ios/ExportOptions.plist`의 `destination`이 `export`. 실행해 red를 확인한다.

## Phase 4: User Story 1 - 맥 없이 TestFlight 빌드를 올린다 (Priority: P1) 🎯 MVP

**Goal**: 수동 시작·승인으로 아카이브·서명·업로드까지 끝낸다.

**Independent Test**: T003 계약이 초록이 되고, 실제 실행 한 번이 처리 통과·iPhone 설치까지 간다.

- [x] T004 [US1] `.github/workflows/ios-release.yml`을 만든다 — `on: workflow_dispatch`, `concurrency`(`cancel-in-progress: false`), `permissions: contents: read`, 잡 `environment: ios-release`·`macos-latest`·`timeout-minutes: 90`. 단계: 러너 사양(Xcode 버전 포함, 072 방식으로 `GITHUB_STEP_SUMMARY`에 표) → checkout@v5 → setup-node@v5(24, npm 캐시) → `npm ci` → `expo prebuild --platform ios --clean --no-install` → `pod install` → 키체인 준비(임시 키체인 create·unlock·p12 import `-T /usr/bin/codesign`·`set-key-partition-list`, WWDR G3 유무 확인해 요약에 기록) → 프로파일 설치(`~/Library/Developer/Xcode/UserData/Provisioning Profiles/<UUID>.mobileprovision`) → `xcodebuild archive`(066 서명 인자, `-archivePath $RUNNER_TEMP/Pocketlog.xcarchive`) → `xcodebuild -exportArchive`(`scripts/ios/ExportOptions.plist`) → API 키를 `~/.appstoreconnect/private_keys/AuthKey_<id>.p8`에 쓰고 `xcrun altool --upload-app -f <ipa> -t ios --apiKey --apiIssuer` → 정리 단계(`if: always()`: `security delete-keychain`, 프로파일·`AuthKey_*.p8`·`$RUNNER_TEMP` 사본 삭제). 비밀은 각 단계 `env`로만, `set -x` 금지, 단계마다 `trap`으로 걸린 시간을 요약에 적는다.
- [x] T005 [US1] `npx jest __tests__/ci/ios-release-workflow.test.ts`가 초록임을 확인한다(green). 실패하면 테스트가 아니라 워크플로를 고친다(계약이 정본).
- [x] T006 [US2] 위반 주입 12종(contracts/workflow-contract.md 표)을 하나씩 적용한다 — **치환이 실제로 적용됐는지 먼저 단언**(grep)하고, 각 주입이 해당 W 규칙을 실패로 뒤집는지 확인한 뒤 되돌려 다시 초록. 결과는 quickstart.md 아래 「위반 주입 결과」에 한 줄씩 기록한다.
- [ ] T006a [US1] **구현 PR을 `main`에 머지한다(소유자 결정)** — 워크플로 파일이 기본 브랜치에 있어야 Run workflow가 보이고 보호 환경의 배포 브랜치도 `main`뿐이다. T007·T008·T011은 이 머지 뒤에만 가능하며 kickoff 8단계(실기기 확인)에서 수행한다. 그 결과 기록(quickstart 실측·T012 문구 확정)은 머지 뒤 후속 문서 커밋으로 남긴다.
- [ ] T007 [US1] **실제 실행(사람 몫 포함, T006a 뒤)**: quickstart.md §2(소유자가 Environment·비밀 여섯 등록, 설정 화면을 눈으로 확인)와 §3(`buildNumber` 올려 커밋 → `main` 머지 → Run workflow → 승인 → 업로드 → 처리 통과·ITMS 메일 없음 → TestFlight 목록 → iPhone 설치)을 소유자와 함께 진행한다. 에이전트는 비밀 값을 다루지 않는다. 메모리 부족이면 FR-015대로 `xcodebuild`에 `-jobs`를 낮춰 재시도하고 값·근거를 기록한다.
- [ ] T008 [US1] 첫 실행의 실측(단계별 시간·최대 메모리·WWDR 유무·altool 플래그 확인·낮춘 `-jobs` 값)을 `specs/075-ios-cloud-release/quickstart.md`의 「실측 기록」에 적는다. 안 잰 것은 「미확인」으로 쓴다(원칙 V).

## Phase 5: User Story 3 - 비밀이 빠졌거나 번호가 틀리면 빨리 안다 (Priority: P2)

**Goal**: 비싼 빌드 전에 설정 실수를 잡는다.

**Independent Test**: 비밀 하나를 비운 채 시작하면 1분 안에 이름을 밝히며 실패한다.

- [x] T009 [US3] `__tests__/ci/ios-release-workflow.test.ts`에 W13(사전 점검 단계가 `expo prebuild`보다 앞)과 점검 내용(여섯 이름 모두 검사, `ios.buildNumber` 정수 검사, 값을 출력하지 않고 이름만 밝힘)을 추가하고 red를 확인한다.
- [x] T010 [US3] `.github/workflows/ios-release.yml`에 사전 점검 단계를 `npm ci` 직후·`expo prebuild` 앞에 추가한다 — 비밀은 `env`로 받아 비었으면 `::error::`로 **이름만** 밝히고 실패, `app.json`의 `expo.ios.buildNumber`가 정수가 아니면 실패. 중복 번호는 점검하지 않는다(FR-009). T009가 green이 되는지 확인한다.
- [ ] T011 [US3] (T006a 뒤) quickstart.md §4의 위반 주입 — 비밀 하나를 비운 채 실제로 시작해 빌드 전에 실패하는지, `main` 외 브랜치에서 거부되는지, 실패 실행의 정리 단계가 키체인·프로파일·`.p8`을 지웠는지(SC-005)를 로그로 확인한다. 또 T007에서 올린 것과 **같은 버전·번호로 한 번 더 업로드**해 Apple의 거부가 숨겨지지 않고 실패로 보이는지 확인한다(US3-3). 결과를 quickstart에 기록한다.

## Phase 6: User Story 4 - 절차 문서가 새 경로를 기본으로 말한다 (Priority: P3)

**Goal**: 다음 사람이 문서만 보고 CI 경로를 쓸 수 있다.

**Independent Test**: AGENTS.md와 quickstart만으로 비밀 등록부터 실행·확인까지 따라갈 수 있다.

- [x] T012 [US4] `AGENTS.md` 「iOS 빌드·서명·TestFlight」 절을 고친다 — CI 경로(`ios-release.yml` 수동 실행·승인·비밀 여섯·Environment 설정·실측 결과)를 기본으로, 맥 절차는 「다른 맥에서 올리려면」 옆의 대안으로 남긴다. 「저장소의 현재 상태」 목록의 iOS 항목도 같은 사실로 맞춘다. 앞 서술은 주석으로 덧대지 않고 고치거나 지운다(AGENTS 규칙).
- [x] T013 [US4] quickstart.md §5(인증서 갱신: 만료 2027-10-08)가 AGENTS.md 절차와 일치하는지 대조한다.

## Phase 7: Polish & Cross-Cutting

- [x] T014 `npm test`·`npm run lint`를 실제로 실행해 통과를 확인한다(출력을 읽고 보고한다). (머지 전 상태: npm test 276 스위트 통과, lint 오류 0 — 경고 2건은 이 변경 밖의 기존 파일)
- [ ] T015 `docs/roadmap/README.md`: 완료 처리는 kickoff 8단계(구현 커밋과 분리)에서 한다 — 이 태스크는 그때 「진행 예정 과제」에서 빼고 「완료 이력」에 075를 옮겼는지만 확인한다.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3(테스트 red) → Phase 4(워크플로 green → 위반 주입 → 실제 실행) → Phase 5(같은 두 파일에 이어 수정) → Phase 6 → Phase 7.
- 같은 두 파일(`ios-release.yml`, 계약 테스트)을 계속 고치므로 **파일 단위 병렬은 없다**. T012(AGENTS.md)만 T004 이후 T007과 병렬로 쓸 수 있으나 실측 문구는 T008 뒤에 확정한다.
- T007·T011은 소유자의 비밀 등록과 승인이 필요하고, **T006a(구현 PR의 `main` 머지) 뒤에만** 할 수 있다 — 이 지점에서 소유자 응답을 기다린다. T014는 T006a 전에도 돌려 머지 전 상태를 확인하고, 실측 기록 뒤 문서 커밋에서 다시 돈다.

## Implementation Strategy

MVP = Phase 1~4(계약 + 워크플로 + 실제 한 번의 통과). 그 뒤 사전 점검(US3), 문서(US4). 실제 실행에서 새 사실(altool 플래그, WWDR, 메모리)이 나오면 계약 문서와 이 태스크를 먼저 고치고 구현을 고친다.
