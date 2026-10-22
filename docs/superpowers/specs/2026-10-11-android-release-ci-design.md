# 안드로이드 release 빌드·서명·Play 업로드를 CI로 — 설계

날짜: 2026-10-11 · 로드맵: 「안드로이드 release 빌드·서명·보관을 CI로 — 로컬 19분 빌드 없이」 · 짝: 075(iOS)

## 목적

안드로이드 release 빌드·서명이 소유자의 개발 기계(약 14분 AAB, 서명 키 `~/.pocketlog-signing/pocketlog.jks`)에서만 되는 상태를 없앤다.
소유자가 GitHub에서 수동으로 시작하면 CI가 서명된 AAB를 만들어 **Play 내부 테스트 트랙에 바로 올린다.** 결과물은 아티팩트로 남기지 않는다(저장소가 퍼블릭이다).

## 소유자 결정 (2026-10-11)

1. **업로드 키와 비밀번호를 GitHub 보호 환경 secrets에 올린다.** Play 앱 서명을 쓰므로 유출이 의심되면 Play Console에서 업로드 키를 재설정한다(며칠 걸림).
2. **결과물은 Play 내부 테스트 트랙에 바로 올리고 아티팩트로 남기지 않는다.** 서비스 계정 JSON이 새 비밀이다. 소유자는 서비스 계정을 만들 수 있고 앱 레코드·내부 테스트 트랙이 이미 있다.
3. **AAB만 만든다.** 손으로 설치할 APK는 CI가 만들지 않는다 — 필요하면 로컬 절차(대안으로 남긴다).
4. **Play 내부 테스트 업로드까지가 이번 과제의 완료 조건이다.**
5. **업로드는 직접 쓴 Node 스크립트로 한다**(새 의존성 0, 서드파티 Action 없음). 서비스 계정 JSON을 저장소 안 코드만 다룬다.

## 하지 않는 것

`src/` 변경 · 안드로이드 minify/R8 활성화(꺼진 채, 실측한 적 없음) · 새 의존성 · APK 빌드 · `versionCode` 자동 올림 · 안 잰 값의 추측 기록(원칙 V).

## 구성 요소

### 1. 워크플로 `.github/workflows/android-release.yml`

075 `ios-release.yml`의 보안 틀을 옮긴다.

- 시작은 `workflow_dispatch` 하나. `permissions: contents: read`. `environment: android-release`. `concurrency` 그룹 하나, 진행 중 취소 안 함. `runs-on: ubuntu-latest`(2026-10-19부터 Ubuntu 26으로 바뀐다는 안내가 있어 사양을 실행마다 기록한다).
- `checkout`은 `persist-credentials: false`. 캐시·아티팩트·명령 추적(`set -x`)을 쓰지 않는다. 072의 gradle 캐시도 쓰지 않는다 — 서명 키가 열린 빌드에서 캐시를 쓰지 않는 것이 075의 규칙이다. 대가는 느려질 수 있다는 점이고 첫 실행에서 재서 기록한다.
- 단계 순서:
  1. 사전 점검 — 비밀 넷이 비어 있는지(이름만 밝힌다), `app.json`의 `expo.android.versionCode`가 정수인지. 값은 찍지 않는다.
  2. 러너 사양(CPU·메모리·Java·버전)을 요약에 쓴다.
  3. `npm ci` · `setup-java`(temurin 17, 072와 같음) · `expo prebuild --platform android --clean`.
  4. 키스토어 복원 — `ANDROID_KEYSTORE_BASE64`를 `android/app/pocketlog.jks`로 푼다(`umask 077`). 비밀번호는 파일에 쓰지 않는다.
  5. `./gradlew bundleRelease -PreactNativeArchitectures=arm64-v8a` — 이 단계의 `env`에 `NODE_ENV=production`(Metro 번들이 `.env.production`을 읽는다). 비밀번호는 이 단계의 `env`에 `ORG_GRADLE_PROJECT_POCKETLOG_STORE_PASSWORD`·`ORG_GRADLE_PROJECT_POCKETLOG_KEY_PASSWORD`로만 넘긴다(gradle이 프로젝트 속성으로 읽는다 — `plugins/with-release-signing.js`가 `findProperty`로 읽는 이름과 같다). 단계 시간과 5초 간격 메모리 표본을 요약에 쓴다(072와 같은 방식).
  6. 서명 확인 — `keytool -printcert -jarfile app-release.aab`의 소유자(`Owner:`)가 `CN=Android Debug`가 아니고 비어 있지 않아야 통과. 지문(SHA-256)은 요약에 쓴다(공개 정보).
  7. Play 업로드 — 서비스 계정 JSON을 이 단계의 `env`로만 받아 아래 스크립트를 부른다.
  8. 정리(`if: always()`, 마지막 단계) — 키스토어 파일·빌드 산출물 삭제. 정리 뒤에 다른 단계를 두지 않는다.
- 비밀은 보호 환경 `android-release`의 secrets 넷뿐이다: `ANDROID_KEYSTORE_BASE64`·`ANDROID_KEYSTORE_PASSWORD`·`ANDROID_KEY_PASSWORD`·`PLAY_SERVICE_ACCOUNT_JSON`. 키 별칭(`pocketlog`)은 비밀이 아니고 이미 `app.json` 플러그인 옵션에 있다.
- 필수 리뷰어 = 소유자, 배포 브랜치 = `main`은 저장소 설정이라 파일이 강제하지 못한다. quickstart에 눈으로 확인하는 단계를 둔다.

### 2. Play 업로드 스크립트 `scripts/play-upload.mjs`

- 입력: AAB 경로, 패키지 이름(`com.a810labs.pocketlog`), 트랙(`internal`). 서비스 계정 JSON은 환경변수 `PLAY_SERVICE_ACCOUNT_JSON`에서만 읽는다(인자·파일·로그 금지).
- 흐름: JWT를 Node `crypto`로 서명(RS256, scope `androidpublisher`) → 토큰 교환(`oauth2.googleapis.com/token`) → `edits.insert` → `edits.bundles.upload` → `edits.tracks.update`(`internal`, 방금 올린 `versionCode`, `releaseStatus: completed`) → `edits.commit`. 실패하면 마지막에 `edits.delete`로 편집을 버린다.
- 값은 출력하지 않는다. 실패 메시지는 HTTP 상태와 API가 준 `error.message`·`reason`만 쓴다(응답 본문 전체나 토큰은 찍지 않는다).
- 모듈은 `fetch`와 시계를 주입받는 함수로 나눠 기기·네트워크 없이 테스트한다. 외부 의존성 없음.
- 첫 실행에서 앱이 초안 상태이면 `completed`가 거부될 수 있다 — 그때는 실제 오류를 보고 `draft`로 바꿀지 소유자와 정한다(미리 추측하지 않는다).

### 3. 테스트 (계약을 먼저)

- `__tests__/ci/android-release-workflow.test.ts` — 075 `ios-release-workflow.test.ts`의 규칙 W1~을 안드로이드용으로 옮긴다: 시작은 수동 하나, 허용된 비밀 넷만(그 밖의 `secrets.` 금지, `toJSON(secrets)` 금지), 비밀은 `env` 값 자리에서만(`run` 본문 보간 금지), 잡 수준 `env`에 비밀 금지, `upload-artifact`·`actions/cache` 금지, `set -x` 금지, 정리 단계 `if: always()`이고 마지막, `permissions: contents: read`, `persist-credentials: false`, `-PreactNativeArchitectures=arm64-v8a` 존재와 `NODE_ENV=production`이 `bundleRelease` 단계에 있음, 서드파티 Action은 `actions/*`만. 각 규칙은 위반 주입으로 실패로 뒤집히는지 확인한다.
- `__tests__/scripts/play-upload.test.ts` — fetch 대역으로 호출 순서(insert→upload→track→commit)·실패 시 delete·비밀이 출력에 없음·잘못된 환경변수를 잠근다. JWT 서명은 테스트용 임시 RSA 키로 검증한다.
- 기존 072 `native-build.yml` 계약 테스트는 건드리지 않는다(그 테스트가 `secrets.`·`upload-artifact`를 금지한다 — 합치지 않는다).

### 4. 문서

- `specs/NNN-android-release-ci/quickstart.md`: 비밀 만드는 법(`.jks`는 base64 한 줄로, `gh secret set --env android-release -f <env 파일>` 명령을 소유자가 실행 — 에이전트는 키 내용을 열지 않는다), 환경 보호 규칙 확인 단계, 첫 실행 절차와 「실측 기록」(빌드 시간·메모리·실패와 수정).
- AGENTS.md 「release 빌드·서명·Google Play」: CI 경로를 기본으로, 로컬 절차를 대안으로 고친다(075가 iOS에서 한 방식 그대로). 로드맵의 해당 과제는 완료 처리 때 이력으로 옮긴다.

## 검증

1. `npm test`·`npm run lint` — 기기 없음.
2. 구현 PR이 `main`에 머지된 뒤 Actions에서 실제 실행(워크플로가 기본 브랜치에 있어야 Run workflow가 보인다). **첫 실행은 실패할 수 있다고 가정한다**(075는 `PlistBuddy`에서 첫 실행이 실패했다). 결과를 직접 보기 전에 성공이라고 말하지 않는다.
3. 서명: `keytool -printcert -jarfile`이 `CN=Android Debug`가 아님. Play Console 내부 테스트 트랙에 새 `versionCode`가 올라왔는지 확인.
4. 실기기: 전용 기기에서 Play 내부 테스트로 받은 앱을 설치해 Metro 없이 홈이 뜨는지, 모델 내려받기·일기 쓰기 경로를 본다(Play가 다시 서명한 앱이다). release는 설치하려면 debug 앱을 지워야 하므로 모델·일기가 사라진다 — 전용 기기에서만.

## 위험·미확인

- 러너(ubuntu-latest 4코어 16GB)의 release 최적화 컴파일 시간·메모리는 **잰 적이 없다**(072는 debug만 쟀다). arm64 하나로 약 13분(로컬)이므로 시간 한도 90분은 넉넉하지만 clang OOM 가능성은 첫 실행에서 본다.
- 서비스 계정 권한이 내부 트랙 업로드에 충분한지, 앱 상태에 따라 `releaseStatus`가 받아들여지는지는 첫 실행에서만 안다.
- Play가 같은 `versionCode`를 거부한다. 올림은 사람이 커밋하고, 096의 「번호 점검」 단계가 빌드 전에 Play의 마지막 번호와 견준다.
- 퍼블릭 저장소에서 서명 키·배포 권한 비밀이 쓰인다. 방어는 수동 시작 + 보호 환경 승인 + 계약 테스트(저장소 설정은 눈으로 확인)이며, 워크플로를 고치는 PR이 비밀을 훔치는 길은 `main`에 머지된 뒤에만 열린다(배포 브랜치 제한).
- 재현성: 서명 키 지문을 소유자가 로컬 키와 대조해 같은 키임을 확인하는 단계를 quickstart에 둔다(다른 키로 올리면 Play가 거부하지만 그 전에 눈으로 본다).
