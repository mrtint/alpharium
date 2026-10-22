# Tasks: 릴리스 빌드 번호 사전 점검

**Input**: `specs/096-release-build-number-check/` (spec.md, plan.md, research.md, data-model.md, contracts/)
**Tests**: 헌법 「개발 방식」에 따라 테스트를 먼저 쓴다(TDD). 모든 작업은 워크트리 `.claude/worktrees/096-build-number`에서 한다. `app.json` 번호는 올리지 않는다.

## Phase 1: Setup

- [x] T001 `git branch --show-current`가 `096-release-build-number-check`인지 확인하고 기준선으로 `npx jest __tests__/ci __tests__/scripts --maxWorkers=2`가 통과하는지 확인한다

## Phase 2: Foundational (인증·호출 도우미 추출 — 기존 동작 불변)

- [x] T002 `scripts/android-release/play-upload.ts`에서 토큰 교환(`parseServiceAccount`→`signJwt`→`token`)을 `authorize(deps, serviceAccountJson)`로 추출하고 `call`·`jsonOf`·`PlayDeps`를 export한다. `uploadBundle`의 동작·오류 문장은 그대로이며 기존 `__tests__/scripts/play-upload.test.ts`가 통과해야 한다
- [x] T003 `scripts/ios-release/testflight-notes.ts`에서 `call`을 `publishWhatsNew` 클로저 밖의 `callAsc(deps, token, name, method, url, body?)`로 추출하고 `signJwt`·`AscDeps`와 함께 export한다. 기존 `__tests__/scripts/testflight-notes.test.ts`가 통과해야 한다

## Phase 3: User Story 1 — 이미 있는 번호면 빌드 전에 실패 (P1)

**Independent Test**: 판정·조회 대역 테스트 + 워크플로 순서 계약.

- [x] T004 [P] [US1] `__tests__/scripts/version-check.test.ts`를 쓴다 — contracts/scripts-contract.md A1~A5(빈 목록 통과, 더 큼 통과, 같음·중간 번호 중복·작음 실패, 메시지에 이번 번호·마지막 번호·`minimum`·「expo.android.versionCode」, 통과 한 줄 형식)
- [x] T005 [P] [US1] `__tests__/scripts/build-number-check.test.ts`를 쓴다 — I1~I5(새 버전 통과, 같음·작음 실패에 버전 이름, 정수 아닌 번호 무시와 개수)
- [x] T006 [US1] `scripts/android-release/version-check.ts`에 `decideVersionCode`·`describeVersionCode`를 구현한다(T004 통과)
- [x] T007 [US1] `scripts/ios-release/build-number-check.ts`에 `decideBuildNumber`·`describeBuildNumber`를 구현한다(T005 통과)
- [x] T008 [P] [US1] `__tests__/scripts/play-upload.test.ts`에 `listBundleVersionCodes` 시험을 더한다 — P5(호출 순서: token→edits.insert→bundles GET→edits.delete, `commit`·upload·`tracks.update` 호출 0), P6(실패해도 삭제 호출·삭제 실패 삼킴), P7(`bundles` 키 없음→빈 배열, 형식 불일치 실패)
- [x] T009 [P] [US1] `__tests__/scripts/testflight-notes.test.ts`에 `listBuildNumbers` 시험을 더한다 — T1(`apps`→`builds`, 쪽 이어받기, 쪽 상한 20 초과 실패, GET만), T2(앱 없음·형식 불일치)
- [x] T010 [US1] `play-upload.ts`에 `listBundleVersionCodes`를 구현한다 — P8의 403 권한 문구 포함(T008·T017 통과, T017을 먼저 쓴다)
- [x] T011 [US1] `testflight-notes.ts`에 `listBuildNumbers`를 구현한다 — T3(다른 호스트 `links.next` 거부)·T4(403 문구) 포함(T009·T017 통과, T017을 먼저 쓴다)
- [x] T012 [US1] `scripts/android-release/version-check.mts`를 쓴다 — 인자 `--app-json --package --commit`, 환경변수 `PLAY_SERVICE_ACCOUNT_JSON`만, 통과는 표준 출력 한 줄·종료 0, 실패는 `::error::<message>`·종료 1. `app.json`을 못 읽거나 번호가 정수가 아니면 이름을 밝히며 실패
- [x] T013 [US1] `scripts/ios-release/build-number-check.mts`를 쓴다 — 인자 `--app-json --bundle --commit`, 환경변수 `ASC_API_KEY_P8`·`ASC_KEY_ID`·`ASC_ISSUER_ID`만, 출력 규칙은 T012와 같다
- [x] T014 [P] [US1] 진입점 시험 `__tests__/scripts/release-number-entrypoints.test.ts` — 임시 `app.json`을 만들고 `.mts`를 자식 프로세스(`node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON`)로 돌려 인자·환경변수 누락 시 종료 1과 사용법/이름 문장(네트워크 없이 닿는 경로만)을 확인한다
- [x] T015 [US1] `.github/workflows/android-release.yml`에 `- name: 번호 점검`을 `설정 점검` 뒤·`npm ci` 앞에 넣는다(contracts/workflow-contract.md N1~N5, 헤더 주석의 「versionCode 올림은 사람이」·「중복은 점검하지 않는다」 주석을 새 사실로 고친다)
- [x] T016 [US1] `.github/workflows/ios-release.yml`에 같은 단계를 `릴리스 노트 점검` 뒤·`npm ci` 앞에 넣는다(사전 점검 안의 「중복은 점검하지 않는다」 주석과 헤더 주석을 고친다)

## Phase 4: User Story 2 — 못 읽어도 이름을 밝히고 멈춘다 (P1)

- [x] T017 [P] [US2] (T010·T011보다 먼저) `play-upload.test.ts`·`testflight-notes.test.ts`에 403(권한 문구 P8/T4 덧붙임)·네트워크 오류·형식 불일치(`bundles` 비배열, 정수 아닌 `versionCode`, 다른 호스트 `links.next` T3) 시험을 더하고, 각 실패 문장에 토큰·개인 키·응답 본문이 실리지 않는다는 단언(FR-007)을 넣는다. 구현은 T010·T011이 한다
- [x] T018 [US2] T010·T011 구현 뒤 `npx jest __tests__/scripts/play-upload.test.ts __tests__/scripts/testflight-notes.test.ts`로 US2 시험이 모두 통과하는지 확인한다

## Phase 5: User Story 3 — 비밀 방어 계약 (P1)

- [x] T019 [US3] `__tests__/ci/android-release-workflow.test.ts`를 고친다 — W13 순서에 `번호 점검`을 넣고(`설정 점검` < `번호 점검` < `expo prebuild`, `npm ci` 앞), W5b에서 `PLAY_SERVICE_ACCOUNT_JSON`이 사전 점검·번호 점검·Play 업로드 세 곳에만 나오게 하고, N2~N5(단계 env 하나·`${{` 보간 없음·스크립트 하나·`npm`/`npx`/`gradlew` 없음·요약 tee)를 새 `it`으로 잠근다
- [x] T020 [US3] `__tests__/ci/ios-release-workflow.test.ts`에 같은 계약을 더한다(ASC 셋, 비밀별 참조 횟수가 있으면 고친다)
- [x] T021 [US3] 소스 계약: 새 `.ts`/`.mts` 네 개가 외부 패키지를 import하지 않고 비밀 환경변수를 `console`로 출력하지 않는지 `__tests__/scripts/`의 기존 소스 계약 테스트에 포함시킨다(`android-release-sources.test.ts`가 안드로이드, iOS는 같은 방식의 `release-number-sources.test.ts`를 새로 쓴다. 주석을 걷은 소스를 읽는다)
- [x] T022 [US3] 위반 주입(각각 실제로 치환이 적용됐는지 먼저 단언한 뒤 테스트가 실패하는지 확인하고 되돌린다): ① 번호 점검을 `npm ci` 뒤로 ② 허용 밖 `secrets.X` 추가 ③ `contents: write` ④ 번호 점검 `run`에 `${{ secrets.… }}` 보간 ⑤ `.mts`에 `console.log(process.env.PLAY_SERVICE_ACCOUNT_JSON)` ⑥ 사전 점검에 `node` 호출 ⑦ iOS 같은 항목. 결과는 quickstart.md 「위반 주입」에 표로 남긴다

## Phase 6: User Story 4 — 번호↔커밋 기록 (P2)

- [x] T023 [US4] T012·T013 출력(A5·I5)이 워크플로의 `tee -a "$GITHUB_STEP_SUMMARY"`로 요약에 남고 `러너 사양` 단계의 버전·번호 줄과 모순되지 않는지 계약 테스트에 확인을 더한다(N5)

## Phase 7: Polish

- [x] T024 [P] AGENTS.md의 「release 빌드·서명·Google Play」·「iOS 빌드·서명·TestFlight」에서 「`versionCode`/`buildNumber`는 올리기 전에 사람이 올려 커밋한다」 서술을 새 사실(사람이 올리되 「번호 점검」이 스토어 마지막 번호와 견줘 빌드 전에 실패, 읽기 전용, 못 읽으면 실패, 실제 응답은 첫 실행에서 처음 본다)로 고친다 — 주석 덧대기 금지
- [x] T025 [P] `specs/076-android-release-ci/`·`specs/075-ios-cloud-release/`에서 「중복은 점검하지 않는다」는 서술이 남아 있으면 096 참조로 고치거나 지운다(grep으로 확인)
- [x] T026 [P] `docs/roadmap/README.md`에서 「릴리스 빌드 번호 자동 올림」을 진행 예정 과제에서 빼고 완료 이력에 한 줄(스펙 096, 못 본 것 포함) 올린다. 소유자 실제 실행 확인 요청이 남았음을 적는다
- [x] T027 `npm test`, `npm run lint`, `npx tsc --noEmit`을 돌려 통과를 확인한다

## Phase 8: Convergence

- [x] T028 `specs/075-ios-cloud-release/spec.md` Acceptance 3(L80)과 `data-model.md`(L23)를 096의 「번호 점검」이 중복을 빌드 전에 막고 못 막은 경우에만 Apple의 거부가 그대로 보인다는 사실로 고친다 per FR-010 (partial)
- [x] T029 `specs/076-android-release-ci/spec.md` Acceptance 3(L108)·`data-model.md`(L28)·`quickstart.md`(L36)를 같은 사실로 고친다 per FR-010 (partial)
- [x] T030 `docs/superpowers/specs/2026-10-11-ios-cloud-build-upload-design.md`(L35)와 `2026-10-11-android-release-ci-design.md`(L72)의 「점검하지 않는다 / Play가 거부한다」를 096 사실로 고친다(주석 덧대기 금지) per FR-010 (partial)
- [x] T031 `__tests__/scripts/play-upload.test.ts`에 목록 조회가 성공했지만 `edits.delete`가 실패해도 번호를 그대로 돌려주는 시험을 더한다 per Edge Cases (partial)
