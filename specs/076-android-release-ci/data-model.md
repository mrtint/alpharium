# Data Model: 안드로이드 클라우드 릴리스

저장되는 앱 데이터는 없다. 다루는 것은 비밀, 공개 기대 값, 실행 입력뿐이다.

## 서명·배포 비밀 묶음 (보호 환경 `android-release`의 secrets)

| 이름 | 내용 | 출처(소유자 준비) | 쓰이는 단계 |
| --- | --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `pocketlog.jks`를 한 줄 base64로 | `~/.pocketlog-signing/pocketlog.jks` | 키스토어 복원 |
| `ANDROID_KEYSTORE_PASSWORD` | 키스토어 비밀번호 | `~/.gradle/gradle.properties`의 `POCKETLOG_STORE_PASSWORD` | `bundleRelease` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 | 같은 파일의 `POCKETLOG_KEY_PASSWORD` | `bundleRelease` |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play 서비스 계정 JSON 키 | Google Cloud 서비스 계정 키 발급 + Play Console 사용자 초대 | Play 업로드 |

규칙: 이 네 이름 밖의 `secrets.*` 참조 금지. 저장소 수준 secrets에 두지 않고 Environment에만 둔다. 키 별칭(`pocketlog`)과 키스토어 경로는 `app.json` 플러그인 옵션에 이미 있고 비밀이 아니다.

## 기대 업로드 키 지문 (공개 값, 저장소)

- 파일: `scripts/android-release/upload-key.sha256`
- 내용: `#`로 시작하는 줄과 빈 줄을 뺀 첫 줄 하나 — keytool 출력과 같은 `AA:BB:…`(32바이트, 대문자 16진수, 콜론 구분, 총 95자).
- 소유자가 로컬 `pocketlog.jks`에서 뽑아 커밋한다. 이 값을 바꾸는 것은 서명 키를 바꾸는 결정이다.
- 없거나 형식이 틀리면 사전 점검과 서명 확인 모두 실패한다(건너뛰지 않는다).

## 릴리스 실행 (한 번의 수동 시작)

- **입력**: 시작한 `main` 커밋의 `app.json` `expo.version`·`expo.android.versionCode`.
- **상태 전이**: 시작 → 소유자 승인 대기 → 사전 점검 → prebuild → 키스토어 복원 → 빌드 → 서명 확인 → Play 업로드(편집 열기 → AAB → 트랙 → 커밋) → 정리. 어느 단계의 실패든 정리로 간다. 업로드 중 실패는 편집을 버린다.
- **출력**: Play 내부 테스트 트랙의 릴리스 하나, 실행 요약(러너 사양·단계별 초·최대 메모리·서명 소유자와 지문). 파일 산출물 없음.
- **유일성**: 같은 `versionCode`는 Play가 거부한다. 사람이 커밋으로 올리고, 096의 「번호 점검」이 빌드 전에 Play의 마지막 번호와 견준다.

## 러너 임시 상태 (잡이 끝나면 없어야 하는 것 — SC-006)

`android/app/pocketlog.jks`, 빌드된 AAB(`android/app/build/outputs/bundle/release/`), `$RUNNER_TEMP`의 임시 파일(메모리 표본 제외 가능).
