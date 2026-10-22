# Data Model: iOS 클라우드 릴리스

저장되는 앱 데이터는 없다. 다루는 것은 비밀과 실행 입력뿐이다.

## 서명 비밀 묶음 (보호 환경 `ios-release`의 secrets)

| 이름 | 내용 | 출처(소유자 준비) | 쓰이는 단계 |
| --- | --- | --- | --- |
| `IOS_DIST_P12_BASE64` | 배포 인증서 + 개인 키 `.p12`를 base64 | `~/.pocketlog-signing/ios/distribution.key`·`.cer`에서 `openssl pkcs12 -export` 후 `base64` | 키체인 준비 |
| `IOS_DIST_P12_PASSWORD` | `.p12` 비밀번호 | 위를 만들 때 정한 값 | 키체인 준비 |
| `IOS_PROFILE_BASE64` | `Pocketlog_App_Store.mobileprovision` base64 | `~/.pocketlog-signing/ios/` | 프로파일 설치 |
| `ASC_API_KEY_P8` | App Store Connect API 개인 키 본문 | App Store Connect > Users and Access > Integrations | 업로드 |
| `ASC_KEY_ID` | API 키 ID | 같은 화면 | 업로드 |
| `ASC_ISSUER_ID` | Issuer ID | 같은 화면 | 업로드 |

규칙: 이 여섯 이름 밖의 `secrets.*` 참조 금지. 저장소 수준 secrets에 두지 않고 Environment에만 둔다.

## 릴리스 실행 (한 번의 수동 시작)

- **입력**: 시작한 `main` 커밋의 `app.json` `expo.version`·`expo.ios.buildNumber`.
- **상태 전이**: 시작 → 소유자 승인 대기 → 사전 점검 → 빌드 → 서명·내보내기 → 업로드 → 정리. 어느 단계의 실패든 정리로 간다.
- **출력**: App Store Connect의 빌드 한 개, 실행 요약(러너 사양·Xcode 버전·단계별 초). 파일 산출물 없음.
- **유일성**: 같은 `version`+`buildNumber`는 Apple이 거부한다. 사람이 커밋으로 `buildNumber`를 올리고, 096의 「번호 점검」이 빌드 전에 스토어의 마지막 번호와 견준다.

## 러너 임시 상태 (잡이 끝나면 없어야 하는 것 — SC-005)

임시 키체인, 설치된 프로파일, `AuthKey_<id>.p8`, `$RUNNER_TEMP`에 풀린 p12·프로파일 사본.
