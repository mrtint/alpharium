# Quickstart: iOS 클라우드 릴리스 검증 가이드

이 문서는 검증 절차다. 구현 코드는 `tasks.md`와 구현 단계에 있다. 계약은 [contracts/workflow-contract.md](contracts/workflow-contract.md), 비밀 목록은 [data-model.md](data-model.md).

## 1. 기기 없이 (항상 돈다)

```bash
npx jest __tests__/ci/ios-release-workflow.test.ts   # 계약 W1~W16
npm test && npm run lint
```

통과 기준: 전부 초록. 위반 주입 표(계약 문서)의 각 주입이 해당 규칙을 실패로 뒤집는다.

## 2. 소유자가 한 번 준비한다 (에이전트는 키를 다루지 않는다)

1. GitHub > Settings > Environments > New environment **`ios-release`**.
2. Required reviewers = 소유자. Deployment branches = Selected branches → `main`만.
3. Environment secrets에 [data-model.md](data-model.md)의 여섯을 넣는다. p12는 `~/.pocketlog-signing/ios/`의 키·인증서로 `openssl pkcs12 -export` 후 `base64`한다.
   **Homebrew OpenSSL 3의 기본 암호화(AES-256)는 macOS `security import`가 못 읽는다**(오류가 「MAC verification failed」·비밀번호 틀림처럼 보인다) — 시스템 `/usr/bin/openssl`(LibreSSL)을 쓰거나 `-legacy`(또는 `-certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -macalg sha1`)를 준다.
   새로 받은 인증서가 WWDR G3가 아닌 다른 세대 중간 인증서에 매이면 워크플로의 G3 폴백이 소용없다 — 「유효한 Apple Distribution 서명 신원이 없다」로 실패하면 인증서의 발급 기관부터 본다.
   **이 설정이 서명 키를 지키는 유일한 방어다**: 워크플로가 도는 동안 `npm ci`·CocoaPods 의존성의 스크립트와 `xcodebuild`가 열린 키체인 옆에서 실행된다. 배포 브랜치를 `main`으로 제한하고 필수 리뷰어를 소유자로 두는 것을 빠뜨리지 않는다.
4. App Store Connect > Users and Access > Integrations에서 API 키(권한 App Manager 이상)를 만들어 `.p8`·Key ID·Issuer ID를 얻는다.
5. 설정 화면을 눈으로 확인한다(저장소 설정은 코드로 강제할 수 없다): 필수 리뷰어, 배포 브랜치.

## 3. 실제 실행 (원칙 V — 건너뛰면 통과가 아니다)

0. **구현 PR(`ios-release.yml` 포함)이 먼저 `main`에 머지되어 있어야 한다** — 워크플로 파일이 기본 브랜치에 있어야 Run workflow가 보이고 보호 환경이 `main`만 허용한다.
1. `app.json`의 `ios.buildNumber`를 올려 커밋하고 `main`에 머지한다.
2. Actions > 「Pocketlog iOS Release」 > Run workflow (`main`) → 소유자가 승인한다.
3. 실행 요약에서 단계별 시간·Xcode 버전·최대 메모리(재면)를 읽어 이 문서 아래 「실측 기록」에 옮긴다.
4. **처리 통과 확인**: ITMS 거부 메일이 없고 App Store Connect > TestFlight 목록에 빌드가 나타난다(업로드 성공 ≠ 처리 통과).
5. TestFlight에서 실제 iPhone에 설치하고 첫 화면까지 열어 본다(소유자).

## 4. 위반 주입 (실행)

- 비밀 하나를 비우고 시작 → 사전 점검에서 그 이름을 밝히며 빌드 전에 실패(1분 안).
- `main`이 아닌 브랜치에서 시작 → 보호 환경이 거부.
- 실패한 실행의 로그에서 정리 단계가 키체인·프로파일·`.p8`을 지웠음을 본다(SC-005).

## 5. 인증서 갱신 (만료 2027-10-08)

만료 전에 CSR을 새로 만들어 소유주에게 새 배포 인증서를 받고 p12·프로파일 비밀을 갱신한다. 절차 원본은 AGENTS.md 「iOS 빌드·서명·TestFlight」.

## 실측 기록

(첫 실행 뒤 채운다 — 단계별 시간, 최대 메모리, WWDR 유무, altool 플래그 확인, 필요했다면 낮춘 `-jobs` 값과 근거.)

### 1회차 실행 (2026-10-11 09:26, run 38128376831) — 실패: 프로파일 설치
- 사전 점검·`npm ci`·`expo prebuild`(2초)·`pod install`(55초)·서명 키체인 준비(1초)는 통과 — 비밀 여섯 개와 p12·비밀번호는 정상, Xcode 26 점검 통과. 정리 단계도 실패 뒤 성공(키체인·키 파일 정리 확인).
- `프로파일 설치`에서 실패: `security cms -D -i … | PlistBuddy … /dev/stdin`이 `Cannot parse a NULL or zero-length data`로 UUID를 못 읽었다(PlistBuddy는 파이프를 못 읽는다). 읽기 실패 문구가 UUID 변수에 들어가 `-z` 검사를 통과했고 `cp`가 이상한 경로로 죽었다.
- 수정(PR #148): 프로파일을 파일로 해독해 읽고, UUID는 8-4-4-4-12 형식 검사로 거른다. 계약 테스트·위반 주입 추가.

### 2회차 실행 (2026-10-11 09:35, run 38128889721) — 업로드 성공
러너: macOS 26.6.2, Xcode 26.6, 3코어, 7,168MB. 빌드 1.0.0 (4).

| 단계 | 걸린 시간 |
| --- | --- |
| expo prebuild | 2초 |
| pod install | 45초 |
| 서명 키체인 준비 + 프로파일 설치 | 각 1초 |
| xcodebuild archive (Release, 기본 병렬도) | 281초 (시스템 여유 메모리 최소 67%) |
| exportArchive | 9초 |
| altool 업로드 | 100초 |
| 잡 전체 | 약 8분 |

- `** ARCHIVE SUCCEEDED **`, `** EXPORT SUCCEEDED **`, `UPLOAD SUCCEEDED with no errors`, Delivery UUID `82e7ab48-74ce-4eef-a732-e3aa9cf6ad0a`.
- **메모리**: 시스템 여유 최소 67%(5초 간격 샘플이라 짧은 스파이크는 놓친다) → 7GB 러너에서 `-jobs` 낮춤이 필요 없었다(FR-015는 발동하지 않았다).
- **altool API 키**: `--apiKey`·`--apiIssuer`와 `~/.appstoreconnect/private_keys/AuthKey_<ID>.p8` 탐색이 Xcode 26.6에서 그대로 동작했다.
- **WWDR G3**: 「받아 넣는다」 메시지가 로그에 없었다 → 러너에 이미 있었던 것으로 본다(로그 부재로 본 추정, 요약 파일의 줄은 확인하지 않았다).
- 정리 단계 로그: 「정리 완료: 키체인·프로파일·API 키 파일 삭제」.
- **미확인**: App Store Connect 처리 통과(ITMS 메일 부재, TestFlight 목록), 실제 iPhone 설치, 같은 번호 재업로드의 거부 표시, 비밀 하나를 비운 사전 점검 실패, `main` 외 브랜치 거부.

## 위반 주입 결과 (T006, 2026-10-11)

`npx jest __tests__/ci/ios-release-workflow.test.ts`(20개 통과)에서 워크플로를 24가지로 바꿔 각각 해당 규칙이 실패로 뒤집히는 것을 확인했다(치환이 적용되지 않으면 실패로 처리, 끝나면 `finally`로 복원).
W2(pull_request·push·schedule 추가), W3(environment 제거), W4(id-token 추가), W5(허용 밖 비밀·run 본문 직접 보간·`toJSON(secrets)`·잡 수준 env 비밀), W6(upload-artifact·cache 추가), W7(`set -x`·비밀 변수 echo),
W8(정리의 `if: always()` 제거), 정리 뒤 이름 없는 `- run:` 단계, W9(cancel-in-progress true), W10(continue-on-error), W11(앱 암호 업로드), W12(팀 ID 변경), W13(사전 점검 단계 이름 변경),
W14(timeout 제거), checkout `persist-credentials` 제거, Xcode 검사 약화, 프로파일 UUID 검사 제거.
코드 리뷰(1회차)의 Important 6건을 반영하며 추가한 주입이 뒤 여섯 가지다.
