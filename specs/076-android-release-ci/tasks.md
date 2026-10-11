---

description: "076 안드로이드 클라우드 릴리스 — 구현 태스크"
---

# Tasks: 안드로이드 release 빌드·서명·Play 업로드를 CI로

**Input**: `/specs/076-android-release-ci/` — plan.md, spec.md, research.md, data-model.md, contracts/workflow-contract.md, contracts/scripts-contract.md, quickstart.md

**Prerequisites**: plan.md, spec.md

**Tests**: 요청됨(헌법 「계약 먼저, 테스트 먼저」). 테스트를 구현보다 먼저 쓰고 실패(red)를 본다.

**Organization**: 사용자 스토리별. 앱 코드(`src/`)는 건드리지 않는다. 스크립트는 판정(`.ts`, 순수)과 진입점(`.mts`)으로 나눈다.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 `git branch --show-current`가 `076-android-release-ci`인지 확인하고, 075의 `__tests__/ci/ios-release-workflow.test.ts`(`read`·`section`·`step` 헬퍼)와 `.github/workflows/ios-release.yml`·`native-build.yml`의 러너·액션 버전(checkout@v5·setup-node@v5·setup-java@v5)을 읽어 새 파일이 같은 방식을 따르게 한다. 기존 `scripts/**/*.ts`의 `.ts` 확장자 import 방식과 `package.json`의 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON` 실행 형태를 확인한다.

## Phase 2: Foundational (모든 스토리 전에)

- [x] T002 `__tests__/ci/android-release-workflow.test.ts`를 만든다 — 075 헬퍼를 복사하되 대상은 `.github/workflows/android-release.yml`, 주석을 먼저 걷는다. W1(파일이 있다)만 넣고 실행해 **파일이 없어서 실패**하는 것을 확인한다(red).

## Phase 3: User Story 2 - 서명이 debug 키가 아님을 CI가 스스로 확인한다 (Priority: P1)

**Goal**: AAB의 서명 인증서를 읽어 debug 키·읽기 실패·기대 지문 불일치를 업로드 전에 막는다.

**Independent Test**: `npx jest __tests__/scripts/verify-signature.test.ts`가 초록이고, 로컬에서 임시 키로 서명한 jar를 진입점에 넣으면 지문이 일치/불일치에 따라 종료 코드 0/1이다.

- [x] T003 [P] [US2] `__tests__/scripts/verify-signature.test.ts`를 만든다 — contracts/scripts-contract.md의 V1~V7: `parseCertificate`(keytool 출력 고정 문자열에서 첫 서명자 `Owner:`·`SHA256:`, 하나라도 없으면 `undefined`, 서명자가 둘이어도 첫 번째), `parseExpectedFingerprint`(`#` 줄·빈 줄 건너뛴 첫 줄이 `AA:BB:…`(대문자 16진수 32바이트, 콜론 구분, 총 95자)이면 그것, 아니면 `undefined`, 소문자는 대문자로 정규화), `verifySigner`(`CN=Android Debug` 포함이면 실패, `expected`가 `undefined`이면 실패, 지문 불일치면 실패하고 `reason`에 두 지문, 일치하면 `ok: true`). 실행해 모듈이 없어서 red를 확인한다.
- [x] T004 [US2] `scripts/android-release/verify-signature.ts`를 만든다(순수, `process.env`·`fs` 불사용, 외부 패키지 없음) — T003이 green이 된다.
- [x] T005 [US2] `scripts/android-release/verify-signature.mts`를 만든다 — `verify-signature.mts <aab> [<expected 파일>]`: `keytool -J-Duser.language=en -J-Duser.country=US -printcert -jarfile <aab>`(실측: `LC_ALL=C`는 한국어 Windows에서 로캘을 못 바꾼다)를 `execFileSync`로 실행(인자 배열, 셸 없음)해 T004 함수로 판정한다. 통과하면 `owner`·`sha256`을 표준 출력에 한 줄씩, 실패하면 `reason`을 표준 오류에 쓰고 종료 1. 기대 파일 기본값은 `scripts/android-release/upload-key.sha256`. `--check-expected-only`: 기대 지문 파일만 읽어 형식을 판정한다(없거나 틀리면 1). 비밀을 다루지 않는다.
- [x] T006 [US2] 로컬 실물 확인(소유자 키는 쓰지 않는다): 임시 디렉터리에서 `keytool -genkeypair`로 일회용 키스토어를 만들고 작은 zip을 `jarsigner`로 서명해 `keytool -printcert -jarfile`의 **실제 출력 형식**이 T003의 고정 문자열과 같은 키(`Owner:`·`SHA256:`)인지 본다. 지문을 기대 파일로 주면 0, 틀리면 1임을 진입점으로 확인한다. 일회용 키스토어·zip은 작업 후 지운다. 다른 점이 있으면 T003 고정 문자열과 계약을 고친다(원칙 V — 짐작 금지).

## Phase 4: User Story 1 - 개발 기계 없이 서명된 빌드를 Play 내부 테스트에 올린다 (Priority: P1) 🎯 MVP

**Goal**: 수동 시작·승인으로 서명 AAB를 만들어 Play 내부 테스트 트랙에 올린다.

**Independent Test**: 업로드 스크립트 테스트와 워크플로 계약이 초록이고, 실제 실행 한 번이 트랙 반영·전용 기기 구동까지 간다(Phase 9).

- [x] T007 [P] [US1] `__tests__/scripts/play-upload.test.ts`를 만든다 — contracts/scripts-contract.md의 P1~P7을 fetch 대역·고정 시계·테스트용 임시 RSA 키(`crypto.generateKeyPairSync`)로: 호출 순서(토큰→insert→bundles.upload→tracks.update→commit)와 각 요청의 URL·메서드·본문(트랙 `releases: [{ versionCodes: [String(versionCode)], status: "completed" }]`, 번들 업로드 `Content-Type: application/octet-stream`), JWT 클레임(`iss`·`scope`·`aud`·`iat`·`exp`)과 RS256 서명이 공개 키로 검증됨, 서비스 계정 JSON 오류(JSON 아님·`client_email`/`private_key` 없음)는 네트워크 호출 전에 던짐, `versionCode`가 정수가 아니면 편집 폐기 후 던짐, 어느 단계의 HTTP 실패든 `edits.delete`가 불리고 그 실패는 삼키며 원래 오류를 던지고 `commit` 성공 뒤에는 불리지 않음, **오류 메시지가 `HTTP <상태> <호출 이름>: <API 사유>` 꼴이고 서비스 계정 JSON·개인 키·JWT·액세스 토큰을 포함하지 않음**(대역 응답에 토큰 모양 문자열을 넣어 새어 나가지 않음을 확인). 실행해 모듈이 없어서 red를 확인한다.
- [x] T008 [US1] `scripts/android-release/play-upload.ts`를 만든다(`fetch`·`now` 주입, `node:crypto`만 사용, 외부 패키지 없음) — T007이 green이 된다. 엔드포인트는 research.md D4를 따른다.
- [x] T009 [US1] `scripts/android-release/play-upload.mts`를 만든다 — `--aab <경로> --package <패키지> [--track internal]`: `PLAY_SERVICE_ACCOUNT_JSON` 환경변수에서만 읽고(없거나 비면 종료 1, 값은 출력하지 않음), AAB를 읽어 `uploadBundle`을 부른다. 성공하면 `업로드 완료: versionCode N (트랙 internal)`만 쓰고, 실패는 오류 메시지(T008이 만든 안전한 문장)만 표준 오류에 쓴다.
- [x] T010 [US1] `__tests__/ci/android-release-workflow.test.ts`에 W2~W12·W14~W16·W18·W19를 추가한다(contracts/workflow-contract.md 표 그대로): `on:` 키가 `workflow_dispatch` 하나뿐, 잡 하나·`environment: android-release`·`runs-on: ubuntu-latest`, 최상위 `permissions`가 `contents: read` 하나뿐이고 잡 수준 없음, `secrets.` 참조 집합이 허용 넷의 부분집합이고 모두 `NAME: ${{ secrets.NAME }}` 꼴, `actions/upload-artifact`·`actions/cache` 없음, `set -x`·비밀 변수 출력 없음, 정리 단계 `if: always()`·마지막·키스토어와 AAB 삭제 포함, `concurrency`의 `cancel-in-progress: false`, `continue-on-error` 없음, `uses:`는 `actions/*`뿐, 빌드 인자(`./gradlew bundleRelease`·`-PreactNativeArchitectures=arm64-v8a`, `NODE_ENV: production`이 `bundleRelease` 단계 `env`에 있음, `assembleRelease` 없음), `timeout-minutes`, 요약에 러너 사양(CPU·메모리·Java)과 단계별 시간·최대 메모리, 서명 확인·Play 업로드 단계가 각각 `verify-signature.mts`·`play-upload.mts`를 부름, `persist-credentials: false`, `android/` 직접 수정 줄 없음. 실행해 red를 확인한다.
- [x] T011 [US1] `.github/workflows/android-release.yml`을 만든다 — `on: workflow_dispatch`, `concurrency`(`cancel-in-progress: false`, 그룹 `android-release`), `permissions: contents: read`, 잡 `environment: android-release`·`ubuntu-latest`·`timeout-minutes: 90`. 단계(이름은 계약의 「단계 이름」 절과 정확히 같게): 러너 사양(CPU·메모리·Java·`app.json` 버전, `GITHUB_STEP_SUMMARY` 표) → checkout@v5(`persist-credentials: false`) → setup-node@v5(24, 캐시 없음) → setup-java@v5(temurin 17) → (T017의 사전 점검) → `npm ci` → `expo prebuild --platform android --clean`(`trap`으로 걸린 시간 기록) → **키스토어 복원**(`ANDROID_KEYSTORE_BASE64`를 `umask 077`로 `android/app/pocketlog.jks`에 풀기) → **gradle bundleRelease**(단계 이름은 정확히 `gradle bundleRelease`, `working-directory: android`, `./gradlew bundleRelease -PreactNativeArchitectures=arm64-v8a`, `env`에 `NODE_ENV: production`(Metro 번들이 `.env.production`을 읽는 곳 — 빠지면 앱이 「이 빌드는 잘못 만들어졌다」로 뜬다)과 `ORG_GRADLE_PROJECT_POCKETLOG_STORE_PASSWORD`·`ORG_GRADLE_PROJECT_POCKETLOG_KEY_PASSWORD`, 5초 간격 `/proc/meminfo` 표본과 `trap`으로 시간 기록, 072 방식) → **서명 확인**(AAB 크기를 `stat`으로 읽어 요약에 함께 적는다. `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/android-release/verify-signature.mts android/app/build/outputs/bundle/release/app-release.aab`, 통과 출력을 요약에 기록) → **Play 업로드**(`trap`으로 걸린 시간을 요약에 기록, `env`에 `PLAY_SERVICE_ACCOUNT_JSON`, `play-upload.mts --aab … --package com.a810labs.pocketlog --track internal`) → **최대 메모리 사용량**(`if: always()`, 요약에 기록) → **정리**(`if: always()`, 마지막: 키스토어·AAB·`$RUNNER_TEMP` 임시 파일 삭제). 비밀은 각 단계 `env`로만, `set -x` 금지. 사전 점검 단계는 T017에서 `npm ci` 뒤 `expo prebuild` 앞에 넣는다.
- [x] T012 [US1] `npx jest __tests__/ci/android-release-workflow.test.ts`가 초록임을 확인한다(green). 실패하면 테스트가 아니라 워크플로를 고친다(계약이 정본). T002의 W1도 함께 초록이 된다.

## Phase 5: User Story 3 - 비밀이 퍼블릭 저장소에서 새지 않는다 (Priority: P1)

**Goal**: 워크플로와 스크립트를 읽는 계약이 비밀 유출 경로를 모두 잠그고, 각 규칙이 위반 주입으로 실패로 뒤집힌다.

**Independent Test**: 위반 주입 표의 모든 줄이 해당 W 규칙을 실패로 뒤집고, 스크립트 소스 계약이 초록이다.

- [x] T013 [US3] `__tests__/ci/android-release-workflow.test.ts`에 W5a(비밀 참조는 단계 `env` 깊이에만 — 잡 수준 `env`·`with:` 금지)와 W5b(키스토어 비밀은 `키스토어 복원`, 두 비밀번호는 `bundleRelease` 단계의 `ORG_GRADLE_PROJECT_POCKETLOG_*` 키, 서비스 계정은 `Play 업로드` 단계, 사전 점검은 넷 모두)를 추가하고 red를 확인한 뒤 필요하면 T011 워크플로를 고쳐 green으로 만든다.
- [x] T014 [P] [US3] 스크립트 소스 계약 테스트를 추가한다(`__tests__/scripts/android-release-sources.test.ts`) — contracts/scripts-contract.md §3: 주석을 걷은 `play-upload.ts`·`.mts`에 `console.log`·`console.error`·`process.stdout.write`·`process.stderr.write` 인자로 `serviceAccountJson`·`private_key`·`access_token`·`assertion`이 들어가는 줄이 없다, `.ts`(순수)는 `process.env`·`node:fs`·`node:child_process`를 쓰지 않는다, `scripts/android-release/`의 모든 파일은 `node:` 내장과 상대 경로 외 import가 없다(외부 패키지 금지), `PLAY_SERVICE_ACCOUNT_JSON` 외 비밀 이름을 `process.env`로 읽지 않는다. red→green(필요하면 T008/T009 수정).
- [x] T015 [US3] 워크플로 위반 주입을 하나씩 적용한다(contracts/workflow-contract.md 「위반 주입」 표 전체 22줄) — **치환이 실제로 적용됐는지 먼저 단언**(grep)하고, 각 주입이 해당 W 규칙을 실패로 뒤집는지 확인한 뒤 `finally`로 되돌려 다시 초록. 결과를 `specs/076-android-release-ci/quickstart.md` 아래 「위반 주입 결과」에 한 줄씩 적는다. 소스 계약(T014)도 `console.log(accessToken)`·외부 import 한 줄 주입으로 뒤집히는지 확인한다.

## Phase 6: User Story 4 - 비밀이 빠졌거나 번호가 틀리면 빨리 안다 (Priority: P2)

**Goal**: 긴 빌드 전에 설정 실수를 잡는다. 업로드 실패는 Play에 반쪽 릴리스를 남기지 않는다.

**Independent Test**: 비밀 하나를 비운 채 시작하면 1분 안에 이름을 밝히며 실패한다. 업로드 실패 테스트(T007의 P4)가 편집 폐기를 확인한다.

- [x] T016 [US4] `__tests__/ci/android-release-workflow.test.ts`에 W13(단계 순서: 사전 점검 < `expo prebuild` < 키스토어 복원 < `bundleRelease` < 서명 확인 < Play 업로드 < 정리)과 W17·사전 점검 내용(넷 이름 모두 검사하고 값은 출력하지 않고 이름만 밝힘, `expo.android.versionCode`가 정수인지 검사, `verify-signature.mts --check-expected-only`로 기대 지문 파일 점검, 중복 `versionCode`는 점검하지 않음)을 추가하고 red를 확인한다.
- [x] T017 [US4] `.github/workflows/android-release.yml`에 `사전 점검` 단계를 추가한다(위치는 T031에서 `npm ci` 앞으로 옮긴다) — 넷을 `env`로 받아 비었으면 `::error::`로 **이름만** 밝히고 실패, `app.json`의 `expo.android.versionCode`가 정수가 아니면 실패, `node … verify-signature.mts --check-expected-only` 실패면 실패(모두 모아 한 번에 종료 1). T016이 green이 되는지 확인한다.
- [x] T018 [US4] 같은 `versionCode`가 Play에 있을 때의 거부가 숨겨지지 않는지 T007에 케이스를 더한다(`bundles.upload`가 HTTP 403/400 + `error.message`를 주면 그 문장이 `HTTP <상태> bundles.upload: …`로 보이고 편집이 폐기된다). red→green(필요하면 T008 수정).

## Phase 7: User Story 5 - 절차 문서가 새 경로를 기본으로 말한다 (Priority: P3)

**Goal**: 다음 사람이 문서만 보고 CI 경로를 쓸 수 있다.

**Independent Test**: AGENTS.md와 quickstart만으로 비밀 등록부터 실행·확인까지 따라갈 수 있다.

- [x] T019 [US5] `AGENTS.md` 「release 빌드·서명·Google Play」 절을 고친다 — CI 경로(`android-release.yml` 수동 실행·승인·비밀 넷·Environment 설정·기대 지문 파일·versionCode 올림 규칙·실측 결과)를 기본으로, 로컬 절차(키·빌드)는 「CI를 못 쓸 때 / 손으로 설치할 APK」 대안으로 남긴다. 「저장소의 현재 상태」의 배포 준비 항목도 같은 사실로 맞춘다. 앞 서술은 주석으로 덧대지 않고 고치거나 지운다(AGENTS 규칙). 실측 문구는 T024 뒤에 확정한다.
- [x] T020 [US5] quickstart.md §2·§5가 AGENTS.md 절차와 일치하는지 대조한다(비밀 등록 명령·기대 지문 뽑기·키/계정 교체).

## Phase 8: Polish & Cross-Cutting

- [x] T021 `npm test`·`npm run lint`를 실제로 실행해 통과를 확인한다(출력을 읽고 보고한다). 신규 `.ts`·`.mts`가 `tsc --noEmit`·`eslint`·`prettier`(대상 확장자 밖이면 해당 없음 확인)를 통과하는지 본다. `check:constitution`이 `scripts/android-release/`에 걸리지 않는지 본다.

## Phase 9: 실제 실행 (kickoff 8단계 — 구현 PR이 `main`에 머지된 뒤)

- [ ] T022 [US1] **구현 PR을 `main`에 머지한다(소유자)** — 워크플로가 기본 브랜치에 있어야 Run workflow가 보이고 보호 환경의 배포 브랜치도 `main`뿐이다. 아래는 이 머지 뒤에만 가능하다.
- [ ] T023 [US1] **소유자 준비**(에이전트는 키를 열지 않는다): quickstart.md §2 — 환경 `android-release` 생성, 필수 리뷰어·배포 브랜치 `main`을 설정 화면에서 눈으로 확인, Play 서비스 계정 권한(내부 테스트 릴리스만), 로컬 키에서 SHA-256을 뽑아 `scripts/android-release/upload-key.sha256`을 PR로 머지(`main` 직접 커밋은 훅이 막는다), 비밀 넷 등록(`gh secret set … --env android-release`).
- [ ] T024 [US1] **실제 실행**: `app.json`의 `android.versionCode`를 올려 커밋·머지 → Actions 「Pocketlog Android Release」 Run workflow(`main`) → 승인 → 끝까지 → 요약에서 단계별 시간·최대 메모리·AAB 크기·업로드 시간·서명 소유자·지문 읽기, 그리고 환경변수 `ORG_GRADLE_PROJECT_POCKETLOG_*`가 서명에 닿았는지(research D2의 미실측)를 quickstart.md 「실측 기록」에 적는다(안 잰 것은 「미확인」). **첫 실행은 실패할 수 있다고 가정한다** — 실패하면 원인을 읽어 워크플로·스크립트·계약 테스트를 고치고(테스트 먼저) 다시 돈다. 진행은 3분마다 `gh run`을 폴링해 보고한다. 결과를 직접 보기 전에 성공이라고 말하지 않는다. OOM이면 gradle 병렬도를 낮춰 재시도하고 값·근거를 기록한다(FR-015).
- [ ] T025 [US1] Play Console 내부 테스트 트랙에 새 `versionCode`가 올라왔는지 소유자가 확인한다. 서비스 계정 권한·`completed` 수락 여부를 기록한다(거부되면 사유와 함께 소유자가 초안으로 바꿀지 결정).
- [ ] T026 [US1] **전용 기기 확인**(모델·일기가 사라져도 되는 기기): 내부 테스트로 받은 앱을 설치해 Metro 없이 홈이 뜨는지, 모델 내려받기와 일기 쓰기까지 한 번 본다(원칙 V — 건너뛰면 통과가 아니다). 결과를 quickstart에 기록한다.
- [ ] T027 [US4] quickstart.md §4의 실행 위반 주입: 비밀 하나를 비운 채 시작해 사전 점검에서 이름을 밝히며 실패하는지, `main`이 아닌 브랜치에서 거부되는지, 실패 실행의 정리 단계가 키스토어를 지웠는지(SC-006)를 로그로 확인하고 기록한다.
- [ ] T028 `docs/roadmap/README.md`: 완료 처리는 kickoff 8단계(구현 커밋과 분리)에서 한다 — 이 태스크는 「진행 예정 과제」에서 빼고 「완료 이력」에 076을 옮겼는지 확인한다. 실측 문구가 정해지면 T019의 AGENTS.md 서술을 확정한다.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3(US2: 스크립트, 워크플로와 독립) → Phase 4(US1: T007~T009 스크립트는 T003~T006과 파일이 달라 병렬 가능, T010~T012 워크플로는 둘 다 필요) → Phase 5(US3: 같은 워크플로·테스트 파일에 이어 수정) → Phase 6(US4) → Phase 7(US5) → Phase 8 → Phase 9.
- T003 ∥ T007: 서로 다른 파일이라 병렬 가능(T007은 T004~T006과도 무관). 워크플로 파일과 워크플로 계약 테스트는 계속 같은 두 파일을 고치므로 **파일 단위 병렬은 없다**.
- Phase 9는 소유자의 준비(T023)와 승인이 필요하고 **T022(`main` 머지) 뒤에만** 가능하다 — 이 지점에서 소유자 응답을 기다린다. T021은 머지 전 상태를 확인하고, 실측 기록 뒤 문서 커밋에서 다시 돈다.

## Implementation Strategy

MVP = Phase 1~4(스크립트 + 워크플로 + 계약 green). 그 뒤 보안 주입(US3)·사전 점검(US4)·문서(US5), 마지막에 실제 실행(Phase 9). 실제 실행에서 새 사실(환경변수 속성 전달, keytool 출력, 서비스 계정 권한, 메모리)이 나오면 계약 문서와 이 태스크를 먼저 고치고 구현을 고친다.

## Phase 10: Convergence

- [x] T029 quickstart.md §1의 「기기 없이」 jest 명령 목록에 `__tests__/scripts/android-release-sources.test.ts`를 추가한다 per SC-007 (partial)

## Phase 11: Convergence

- [x] T030 `.github/workflows/android-release.yml`의 `actions/setup-node`에서 `cache: npm`을 빼고, 워크플로 계약 테스트에 `cache:` 키가 없음을 추가하며, research.md D6의 `cache: npm` 허용 서술을 고친다 per FR-008 (contradicts)
- [x] T031 `사전 점검` 단계를 `npm ci` 앞(setup-java 뒤)으로 옮기고 워크플로 계약 테스트에 「사전 점검이 `npm ci`보다 앞」을 추가한다 per SC-003 (partial)

## Phase 12: 코드 리뷰 반영 (requesting-code-review, Important 3건 + Minor)

- [x] T032 `setup-node`에 `package-manager-cache: false`를 명시하고 W6이 잠근다 (v5는 `packageManager` 필드가 생기면 캐시를 자동으로 켠다)
- [x] T033 워크플로 계약 테스트의 `read()`가 줄 끝 `#...`를 걷지 않게 한다 (따옴표 안의 `#`로 비밀 출력이 테스트에 안 보이는 우회를 막는다)
- [x] T034 비밀이 든 `사전 점검`에서 저장소 코드(node)를 빼고, versionCode·기대 지문 점검은 비밀 없는 `설정 점검` 단계로 나눈다 (W17·W17a)
- [x] T035 Play 호출에 시간 제한을 붙인다 (일반 60초, 번들 업로드 600초 — 미실측 값이며 첫 실행에서 본다)
- [x] T036 quickstart에 첫 실행의 가장 가능성 높은 실패(초안 앱·관리형 게시·서비스 계정 권한 등)를 적는다
