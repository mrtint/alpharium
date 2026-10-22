# Research: 안드로이드 release CI

NEEDS CLARIFICATION은 없다. 아래는 결정과 **첫 실행에서 재야 하는 미실측**을 가른 것이다(원칙 V).

## 결정

### D1 — 빌드 머신: GitHub Actions `ubuntu-latest`
- **Decision**: 사용한다. 저장소가 퍼블릭이라 분 제한이 없다.
- **Rationale**: 072가 같은 러너에서 prebuild + debug arm64 gradle을 통과시켰다(gradle 296~601초, 최대 메모리 약 12GB/16GB). Android SDK·JDK가 이미지에 있다.
- **Alternatives**: 자체 호스팅 러너(퍼블릭 저장소에서 위험), EAS Build(저장소가 안 쓴다, 075와 같은 이유).
- **주의**: `ubuntu-latest`가 2026-10-19부터 Ubuntu 26으로 바뀐다는 안내가 있다 — 사양을 실행마다 요약에 남겨 비교한다.

### D2 — 서명: 기존 플러그인 선언 + 환경변수 속성
- **Decision**: 키스토어를 `android/app/pocketlog.jks`로 복원한다(`plugins/with-release-signing.js`가 `file('pocketlog.jks')`를 선언). 비밀번호는 `bundleRelease` 단계의 `env`에 `ORG_GRADLE_PROJECT_POCKETLOG_STORE_PASSWORD`·`ORG_GRADLE_PROJECT_POCKETLOG_KEY_PASSWORD`로 둔다. gradle은 `ORG_GRADLE_PROJECT_<이름>` 환경변수를 프로젝트 속성 `<이름>`으로 읽고, 플러그인은 그 속성을 `project.findProperty('POCKETLOG_STORE_PASSWORD')`로 읽는다.
- **Rationale**: `~/.gradle/gradle.properties`에 비밀번호를 쓰는 파일이 생기지 않는다. 플러그인과 `app.json`은 무변경이다.
- **Alternatives**: gradle.properties 파일 작성(디스크에 비밀번호가 남는다), `-P` 인자(프로세스 목록에 보인다).
- **미실측**: 환경변수 속성이 이 Expo/Gradle 판에서 `findProperty`에 보이는지 — 첫 실행에서 서명 확인 단계가 곧 증명이다(안 보이면 빈 비밀번호로 서명 실패).

### D3 — 서명 확인: `keytool -printcert -jarfile` + 기대 지문
- **Decision**: AAB는 jarsigner 서명이므로 `keytool -printcert -jarfile app-release.aab`로 첫 서명자의 `Owner:`와 `SHA256:`를 읽는다. `Owner`가 비었거나 `CN=Android Debug`를 포함하거나 `SHA256`이 저장소의 `upload-key.sha256`과 다르면 실패한다. 판정은 순수 함수로 두고 keytool 실행은 진입점이 한다.
- **Rationale**: AGENTS가 이미 이 명령을 서명 확인의 표준으로 둔다. 기대 지문 비교는 clarify에서 확정(소유자 2026-10-11).
- **Alternatives**: `apksigner`(APK용, AAB 직접 불가), `jarsigner -verify`(무결성 검증이지 신원 비교가 아님).
- **실측(2026-10-11, 로컬 JDK 17, 한국어 Windows)**: `keytool` 출력은 로캘을 따라 한국어(`소유자:`)로 나오고 `LC_ALL=C`로는 안 바뀐다. `-J-Duser.language=en -J-Duser.country=US`를 주면 `Owner:`·`SHA256:`가 영어로 나온다. 줄 끝이 섞여 있다(`Signer #1:`·`Certificate #1:`·`Version: 3` 줄은 CRLF, 나머지는 LF) — 파싱이 `
`을 걷는다. `SHA256:` 줄은 로캘과 무관하게 같았다. 러너(리눅스)에서의 출력은 **미실측** — 같은 `-J` 옵션을 쓰므로 영어여야 하며 첫 실행이 증명한다.

### D4 — Play 업로드: 직접 쓴 Node 스크립트(Play Developer API v3 edits)
- **Decision**: 서비스 계정 JSON → JWT(RS256, `crypto.createSign`) → `POST https://oauth2.googleapis.com/token`(jwt-bearer) → `POST …/applications/{pkg}/edits` → `POST …/upload/…/edits/{id}/bundles?uploadType=media`(옥텟 스트림) → `PUT …/edits/{id}/tracks/internal`(`releases: [{ versionCodes, status: "completed" }]`) → `POST …/edits/{id}:commit`. 어느 단계든 실패하면 `DELETE …/edits/{id}`.
- **Rationale**: 새 의존성 0, 비밀을 저장소 안 코드만 다룬다(소유자 결정). `fetch`·`now`를 주입해 jest에서 네트워크 없이 돈다. 토큰 요청 본문의 `assertion`·응답의 토큰은 출력하지 않는다.
- **Alternatives**: `r0adkll/upload-google-play`(서드파티 코드에 배포 권한 비밀 전달), fastlane supply(Ruby 새 의존성).
- **미실측**: 서비스 계정 권한이 내부 트랙 업로드에 충분한가, 앱 상태에서 `status: completed`가 받아들여지는가, AAB 업로드 크기·시간 — 첫 실행에서만 안다. 거부되면 Play의 사유가 그대로 실패로 보이고, 초안으로 바꿀지는 소유자가 정한다(clarify).

### D5 — 퍼블릭 저장소 비밀 방어
- **Decision**: 075와 같다 — 트리거는 `workflow_dispatch`뿐, 잡에 `environment: android-release`, 권한 `contents: read`뿐, 비밀은 단계 `env`로만, 각 비밀은 쓰는 단계에서만 참조(키스토어는 복원 단계, 비밀번호는 빌드 단계, 서비스 계정은 업로드 단계). 보호 규칙은 quickstart의 눈으로 확인 단계.
- **Rationale**: 포크 PR은 보호 환경 비밀에 닿지 못한다. 아티팩트는 퍼블릭 저장소에서 누구나 받는다.

### D6 — 캐시 없음
- **Decision**: gradle 캐시(072)를 쓰지 않는다. **Rationale**: 서명 키가 열린 빌드에서 캐시 복원은 캐시 오염 경로다(075 규칙). 대가는 시간이며 첫 실행에서 잰다. `setup-node`의 `cache: npm`도 캐시 복원이므로 쓰지 않는다(075 iOS는 두었지만 스펙 FR-008이 「캐시도 쓰지 않는다」이고, 계약 테스트가 `cache:` 키를 막는다). `npm ci`가 조금 느려질 뿐이다.

### D7 — 사전 점검의 범위
- **Decision**: 비밀 이름이 비었는지, `android.versionCode`가 정수인지, 기대 지문 파일이 있고 형식이 맞는지만 본다(전부 빌드 전). 같은 `versionCode`의 중복은 이 사전 점검이 아니라 별도 단계 「번호 점검」이 Play의 마지막 번호를 읽어 본다(096).
- **Rationale**: 기대 지문 파일이 없으면 14분 빌드 뒤에야 알게 되는 것을 앞당긴다.

### D8 — 메모리 부족 대응: 첫 실행에서 재고, 죽으면 낮춘다
- **Decision**: `bundleRelease -PreactNativeArchitectures=arm64-v8a`를 기본 설정으로 돈다. OOM이면 `org.gradle.workers.max`·`-Dorg.gradle.jvmargs` 등을 낮춰 재시도하고 값과 시간을 quickstart에 실측과 함께 적는다(FR-015).
- **Rationale**: 안 잰 값을 미리 넣지 않는다(원칙 V). 로컬에서 14분이었고 clang OOM은 네 ABI 때문이었다.

## 미실측 (첫 실행에서 재서 quickstart에 기록)

| 항목 | 왜 모르는가 |
| --- | --- |
| release 컴파일 시간·최대 메모리 | 072는 debug만 쟀다 |
| 환경변수 `ORG_GRADLE_PROJECT_*`가 플러그인의 `findProperty`에 닿는가 | 이 저장소에서 쓴 적 없다 |
| 러너의 `keytool -printcert` 출력 형식·로캘 | 로컬(Windows)과 다를 수 있다 |
| 서비스 계정 권한·`completed` 수락 | 이 저장소에서 Play API를 부른 적 없다 |
| AAB 업로드 시간 | 크기(수백 MB?)를 모른다 |
