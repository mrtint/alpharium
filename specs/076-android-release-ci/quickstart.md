# Quickstart: 안드로이드 클라우드 릴리스 검증 가이드

이 문서는 검증 절차다. 구현 코드는 `tasks.md`와 구현 단계에 있다. 계약은 [contracts/workflow-contract.md](contracts/workflow-contract.md)·[contracts/scripts-contract.md](contracts/scripts-contract.md), 비밀 목록은 [data-model.md](data-model.md).

## 1. 기기 없이 (항상 돈다)

```bash
npx jest __tests__/ci/android-release-workflow.test.ts __tests__/scripts/play-upload.test.ts __tests__/scripts/verify-signature.test.ts __tests__/scripts/android-release-sources.test.ts
npm test && npm run lint
```

통과 기준: 전부 초록. 워크플로 계약의 위반 주입 표 각 줄이 해당 규칙을 실패로 뒤집는다.

## 2. 소유자가 한 번 준비한다 (에이전트는 키를 열지 않는다)

1. **보호 환경**: GitHub > Settings > Environments > New environment **`android-release`**. Required reviewers = 소유자. Deployment branches = Selected branches → `main`만.
2. **Play 서비스 계정**: Google Cloud에서 서비스 계정을 만들고 JSON 키를 발급한다. Play Console > Users and permissions에서 그 계정의 이메일을 초대하고 앱 `com.a810labs.pocketlog`에 **내부 테스트 트랙 릴리스** 권한만 준다(프로덕션·다른 앱 권한 없음). 권한 반영에 시간이 걸릴 수 있다.
3. **기대 지문**: 로컬 키에서 SHA-256을 뽑아 저장소에 커밋한다(공개 값).
   ```bash
   keytool -list -v -keystore ~/.pocketlog-signing/pocketlog.jks -alias pocketlog | grep "SHA256:"
   ```
   `SHA256:` 뒤의 `AA:BB:…` 값 한 줄을 `scripts/android-release/upload-key.sha256`에 적는다(`#` 주석 줄 허용). 비밀번호 입력은 소유자가 한다.
4. **Environment secrets**([data-model.md](data-model.md)의 넷). 값 하나당 한 명령, 표준 입력으로 넘긴다(여러 줄·긴 값이 안전하다):
   ```bash
   base64 -w0 ~/.pocketlog-signing/pocketlog.jks | gh secret set ANDROID_KEYSTORE_BASE64 --env android-release -R mrtint/alpharium
   gh secret set ANDROID_KEYSTORE_PASSWORD --env android-release -R mrtint/alpharium       # 프롬프트에 붙여넣기
   gh secret set ANDROID_KEY_PASSWORD --env android-release -R mrtint/alpharium
   gh secret set PLAY_SERVICE_ACCOUNT_JSON --env android-release -R mrtint/alpharium < 서비스계정키.json
   ```
   Git Bash의 `base64 -w0`가 없으면 `base64 | tr -d '\n'`. 비밀을 만든 파일(서비스 계정 JSON 등)은 등록 뒤 지운다.
5. **눈으로 확인**(저장소 설정은 코드로 강제할 수 없다): 필수 리뷰어, 배포 브랜치 `main`. **이 설정이 키를 지키는 유일한 방어다** — 워크플로가 도는 동안 `npm ci`의 스크립트와 gradle이 열린 키스토어 옆에서 실행된다.

## 3. 실제 실행 (원칙 V — 건너뛰면 통과가 아니다)

0. **구현 PR(워크플로 포함)이 먼저 `main`에 머지되어 있어야 한다** — 워크플로가 기본 브랜치에 있어야 Run workflow가 보이고 보호 환경이 `main`만 허용한다.
1. `app.json`의 `android.versionCode`를 올려 커밋하고 `main`에 머지한다(Play에 이미 있는 번호는 096의 「번호 점검」이 빌드 전에 막는다).
2. Actions > 「Pocketlog Android Release」 > Run workflow (`main`) → 소유자가 승인한다.
3. 실행 요약에서 단계별 시간·러너 사양·최대 메모리·서명 소유자와 지문을 읽어 아래 「실측 기록」에 옮긴다. **첫 실행은 실패할 수 있다고 가정한다** — 결과를 직접 보기 전에 성공이라고 말하지 않는다.
4. **서명**: 요약의 지문이 `upload-key.sha256`과 같고 소유자가 `CN=Android Debug`가 아니다(워크플로가 이미 강제하지만 눈으로도 본다).
5. **Play 반영**: Play Console > 내부 테스트에서 새 `versionCode`의 릴리스를 확인한다.
6. **첫 실행에서 가장 가능성 높은 실패**(미실측 — 아직 한 번도 돌리지 않았다): (a) 서비스 계정 권한이 내부 트랙 릴리스에 모자람 (b) 앱이 Play에서 초안 상태이거나 스토어 등록정보가 덜 끝나 `completed` 릴리스가 거부됨("Only releases with status draft may be created on draft app") — 그때는 소유자가 초안으로 바꿀지 정한다 (c) 관리형 게시·검토 대기 변경이 있어 `commit`이 거부됨("Changes cannot be sent for review automatically") (d) 환경변수 `ORG_GRADLE_PROJECT_POCKETLOG_*`가 서명에 닿지 않음(서명 확인 단계가 아니라 gradle 단계에서 서명 실패로 드러난다) (e) 리눅스 러너의 `keytool` 출력이 로컬과 달라 서명 확인이 해석에 실패함. 첫 AAB는 Play Console에서 사람이 한 번 올려야만 API가 열리는 경우도 있다.
7. **전용 기기**(모델·일기가 사라져도 되는 기기): 내부 테스트 링크로 Play에서 받아 설치하고 Metro 없이 홈이 뜨는지, 모델 내려받기와 일기 쓰기까지 한 번 본다. Play가 다시 서명한 앱이다.

## 4. 위반 주입 (실행)

- 비밀 하나를 비우고 시작 → 사전 점검에서 그 이름을 밝히며 빌드 전에 실패(1분 안). 기대 지문 파일이 없으면 설정 점검이 `npm ci` 전에 실패한다(첫 실행 전의 정상 상태).
- 기대 지문 불일치는 실행으로 만들지 않는다(`main`에 틀린 값을 커밋해야 한다). 대신 단위 테스트(V6)와 로컬 실물 확인(tasks T006: 일회용 키로 일치/불일치 종료 코드)이 잠근다.
- `main`이 아닌 브랜치에서 시작 → 보호 환경이 거부.
- 실패한 실행의 로그에서 정리 단계가 키스토어를 지웠음을 본다(SC-006).

## 5. 키·계정 교체

- 업로드 키 유출이 의심되면: Play Console에서 업로드 키 재설정을 요청하고(며칠), 새 키로 `ANDROID_KEYSTORE_*`와 `upload-key.sha256`을 함께 바꾼다.
- 서비스 계정 키는 Google Cloud에서 폐기하고 새로 발급해 `PLAY_SERVICE_ACCOUNT_JSON`을 갱신한다.

## 위반 주입 결과 (T015, 2026-10-11)

`npx jest __tests__/ci/android-release-workflow.test.ts`(24개 통과)에서 워크플로를 33가지로 바꿔 각각 해당 규칙이 실패로 뒤집히는 것을 확인했다(치환이 적용되지 않으면 오류로 처리, 끝나면 `finally`로 복원 — 복원 뒤 24개 다시 통과).
W2(pull_request·push·schedule 추가), W3(environment 제거), W4(id-token 추가), W5(허용 밖 비밀·run 본문 직접 보간·`toJSON(secrets)`), W5a(잡 수준 env에 비밀), W5b(서비스 계정 비밀을 빌드 단계로),
W6(upload-artifact·cache 추가), W7(`set -x`·비밀 변수 echo), W8(정리의 `if: always()` 제거·정리 뒤 이름 없는 단계), W9(cancel-in-progress true), W10(continue-on-error), W11(외부 Action 추가),
W12(아키텍처 옵션 제거·`NODE_ENV` 제거·`assembleRelease` 추가), W13(서명 확인을 업로드 뒤로·사전 점검 이름 변경), W14(timeout 제거), W18(persist-credentials 제거), W19(`build.gradle` 직접 수정). 코드 리뷰 반영 뒤 추가한 주입: W6(`package-manager-cache: false` 제거·`cache: npm` 추가), 줄 끝 주석 뒤에 숨긴 비밀 `echo`(W5·W7), W17(사전 점검에 `node` 호출), W17a(설정 점검에 비밀 env·`npm ci` 뒤로).
스크립트 소스 계약(`__tests__/scripts/android-release-sources.test.ts`)은 8가지 주입(토큰·서비스 계정·assertion 출력, 외부 패키지 import, 순수 모듈의 `process.env`·`node:fs`, 다른 비밀 env 읽기, 서비스 계정을 인자로 받기)이 각각 실패로 뒤집혔다.

## 로컬 실물 확인 (T006, 2026-10-11)

일회용 키(소유자 키 아님)로 서명한 jar에 진입점을 돌렸다: 지문 일치 → 종료 0, 불일치 → 1, 기대 파일 없음 → 1, 서명 없는 파일 → 1, `--check-expected-only`(정상 → 0, 파일 없음 → 1).
**`keytool` 출력은 한국어 Windows JDK 17에서 로캘을 따라 한국어(`소유자:`)로 나왔고 `LC_ALL=C`로는 안 바뀌었다** — `-J-Duser.language=en -J-Duser.country=US`를 주면 영어로 나온다(진입점이 이 옵션을 쓴다). 줄 끝이 CRLF와 LF로 섞여 있었다.
리눅스 러너의 출력은 아직 보지 않았다 — 첫 실행이 증명한다.

## 실측 기록

### 1회차 실행 (2026-10-11 21:14, run 38138524204) — 성공

러너: ubuntu-latest(Ubuntu 24.04.5 LTS, 4코어, 15,989MB), openjdk 17.0.20.1. 빌드 1.0.0 (versionCode 10). 시작부터 끝까지 약 13분 30초(12:14:42 → 12:28:15 UTC). 소유자 승인(필수 리뷰어)을 거쳐 시작했다.

| 단계 | 걸린 시간 |
| --- | --- |
| npm ci | 약 35초 |
| expo prebuild | 3초 |
| gradle bundleRelease (arm64, 캐시 없음) | 684초 (Gradle `BUILD SUCCESSFUL in 11m 23s`) |
| 서명 확인 | 1초 미만 |
| Play 업로드 | 57초 |

- **최대 메모리**: 9,529MB (5초 간격 샘플, 머신 전체 사용량 — 16GB 중 약 60%). OOM 없음 → gradle 병렬도를 낮출 필요가 없었다(FR-015는 발동하지 않았다). 짧은 스파이크는 놓친다.
- **AAB 크기**: 55MB.
- **서명 확인**: 소유자 `CN=Mr. Tint, OU=A810Labs, O=A810, L="Bundang-gu, Seongnam-si", ST=Gyeonggi-do, C=KR`, SHA-256이 기대 지문(`92:CC:E6:44:…:55:04:FC`)과 같았다. 이는 환경변수 `ORG_GRADLE_PROJECT_POCKETLOG_*`가 플러그인의 `findProperty`에 닿았다는 증거이기도 하다(research D2의 미실측이 해소됨).
- **리눅스 러너의 `keytool` 출력**: 영어 `Owner:`·`SHA256:`로 정상 해석됐다(`-J-Duser.language=en` 옵션을 준 상태에서). 옵션 없이도 영어로 나오는지는 시험하지 않았다.
- **Play**: 스크립트가 `업로드 완료: versionCode 10 (트랙 internal)`을 출력했다 — 서비스 계정 권한이 충분했고 `status: completed` 릴리스가 받아들여졌다(첫 실행 전 우려한 초안 앱·관리형 게시 거부는 없었다). 업로드 시간 57초는 타임아웃(번들 600초) 안이다.
- **정리**: `정리 완료: 키스토어·AAB 삭제`.
- **소유자 확인(2026-10-11)**: Play Console 내부 테스트에 versionCode 10이 반영됐고, 전용 기기에서 Play로 받은 앱을 설치해 확인했다(세부 기기·시간은 기록하지 않았다). 첫 시도부터 성공했다(075와 달리 첫 실행의 버그가 없었다).
- **미확인(아직 실제로 재 본 적이 없는 것)**: 위반 주입 실행 — 비밀 하나를 비운 채 시작해 사전 점검에서 실패하는지(SC-003 1분 안), `main`이 아닌 브랜치의 거부, 실패 실행의 정리 단계(SC-006의 실패 경로), 같은 versionCode 재업로드의 거부 표시, 지문이 다른 키 때문에 서명 확인이 막는 실행. 단위·계약 테스트와 로컬 실물 확인으로는 잠겨 있다.
