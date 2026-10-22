# 무료 빌드 머신으로 iOS 빌드·업로드 — 설계

로드맵 과제 「무료 빌드 머신으로 iOS 빌드·업로드 — 개인 맥 없이」(Tier 3). 날짜: 2026-10-11.

## 목적과 성공 기준

회사 맥 없이 iOS 빌드를 만들어 TestFlight까지 올린다. **완료 조건**: 이 경로로 올린 빌드가 App Store Connect
**처리 단계까지 통과**하고(업로드 성공 ≠ 처리 통과 — ITMS 메일 확인) TestFlight에서 실제 iPhone에 설치된다.

## 확정된 결정 (소유자, 2026-10-11)

- **빌드 머신은 GitHub Actions `macos-latest`다.** 저장소가 퍼블릭이라 분 제한이 없다. Xcode Cloud·Codemagic·EAS·fastlane은 쓰지 않는다.
- **서명 키를 GitHub Secrets에 올리는 것을 소유주(Hyunmin Lee 님)가 동의했거나 받을 수 있다**고 소유자가 확인했다.
  배포 인증서·프로파일은 066의 수동 서명 그대로다(팀 `PGNGG84B39`, 프로파일 「Pocketlog App Store」).
- **`ios.buildNumber` 올림은 사람이 커밋한다**(CI는 올리지 않는다). 안드로이드 AAB, iOS 시뮬레이터·Maestro 갈래는 이 과제 밖이다.

## 입력 (072 실측)

macos-latest 3코어·7,168MB·macOS 26.6.2·Xcode 26.6. 시뮬레이터 Debug 빌드는 잡 전체 9~13분이었다.
**iOS Pods·DerivedData 캐시는 효과가 없었다** — 새 워크플로는 캐시를 쓰지 않는다. Release 아카이브의 시간·메모리는 미실측이라
첫 실행에서 단계별로 잰다(072 요약 방식 재사용).

## 설계

### 워크플로 `.github/workflows/ios-release.yml`

- **트리거는 `workflow_dispatch`뿐이다.** `pull_request`·`pull_request_target`·`push`·`schedule`을 두지 않는다 — 포크 PR이 비밀에 닿을 길이 없다.
- 잡 하나, `runs-on: macos-latest`, `environment: ios-release`, `permissions: contents: read`, `timeout-minutes: 90`.
  Environment 보호 규칙은 필수 리뷰어 = 소유자, 배포 브랜치는 `main`으로 제한한다(저장소 설정이라 파일이 정하지 못한다 → 설정 절차를 quickstart에 적는다).
- 동시 실행 하나(`concurrency`, `cancel-in-progress: false` — 업로드 도중 취소로 반쪽 상태가 되지 않게).
- 단계: `checkout → setup-node(24, npm 캐시) → npm ci → 사전 점검 → expo prebuild --platform ios --clean --no-install → pod install →
  임시 키체인 생성·p12 import·프로파일 설치 → xcodebuild archive(수동 서명) → exportArchive(scripts/ios/ExportOptions.plist) → altool 업로드 → 정리(if: always())`.
  `xcodebuild`는 066의 세 줄을 그대로 쓴다. 단계별 걸린 시간은 072처럼 `GITHUB_STEP_SUMMARY`에 적는다.
- **사전 점검**(비밀을 쓰기 전, 값이 틀리면 즉시 실패): (a) 필수 비밀 이름이 모두 비어 있지 않음, (b) `app.json`의 `ios.buildNumber`가 정수,
  (c) 같은 `version`+`buildNumber`가 이미 올라갔는지는 이 사전 점검이 아니라 별도 단계 「번호 점검」(096)이 App Store Connect를 읽어 본다. 막지 못한 중복은 Apple이 거부하며 그 실패는 그대로 보이게 둔다.

### 비밀 (Environment `ios-release`의 secrets만, 저장소 수준에 두지 않는다)

| 이름 | 내용 |
| --- | --- |
| `IOS_DIST_P12_BASE64` | 배포 인증서 + 개인 키 `.p12`(base64) |
| `IOS_DIST_P12_PASSWORD` | `.p12` 비밀번호 |
| `IOS_PROFILE_BASE64` | `Pocketlog_App_Store.mobileprovision`(base64) |
| `ASC_API_KEY_P8` | App Store Connect API 개인 키(`.p8` 본문) |
| `ASC_KEY_ID` · `ASC_ISSUER_ID` | API 키 식별자 |

- 비밀은 해당 단계의 `env`로만 넘기고 `set -x`·`echo`로 값을 찍지 않는다. 파일로 풀 때는 `$RUNNER_TEMP`에 쓰고 단계 끝에서 지운다.
- **업로드는 앱 암호가 아니라 API 키**다: `xcrun altool --upload-app -f <ipa> -t ios --apiKey <id> --apiIssuer <issuer>` — altool은
  `~/.appstoreconnect/private_keys/AuthKey_<id>.p8`에서 키를 읽으므로 그 자리에 쓰고 정리 단계에서 지운다.
- **임시 키체인**: `security create-keychain` → 기본 목록에 추가 → unlock(잡 동안만) → p12 import(`-T /usr/bin/codesign`) →
  `set-key-partition-list`. WWDR G3 중간 인증서는 러너 이미지에 있는지 먼저 확인하고 없으면 066 문서의 URL에서 받아 넣는다(첫 실행에서 확인).
  정리 단계(`if: always()`)가 키체인 삭제·프로파일·`.p8` 제거를 한다.
- **IPA·로그를 아티팩트로 남기지 않는다**(퍼블릭 저장소라 누구나 내려받는다). 로그에 서명 신원 이름이 나오는 것은 허용(비밀 아님)이나 비밀 값은 GitHub의 마스킹에 기대지 않고 애초에 찍지 않는다.

### 자동 검증 (기기 없이)

`__tests__/ci/ios-release-workflow.test.ts` — 소스를 읽는 계약 테스트(주석을 먼저 걷는다, AGENTS 규칙).
트리거가 `workflow_dispatch`뿐, `pull_request*`·`push`·`schedule`·`continue-on-error` 없음, `environment: ios-release`, `permissions`가
`contents: read`뿐, `secrets.` 참조가 허용 목록 여섯 개뿐, `upload-artifact` 없음, `set -x` 없음, 정리 단계가 `if: always()`,
`actions/cache` 없음. **072의 `native-build.yml` 계약 테스트는 `secrets.`·`upload-artifact`를 금지하므로 그 테스트는 대상 파일을 건드리지 않는다**
(새 워크플로는 별도 파일·별도 테스트). 위반 주입으로 각 규칙이 실패로 뒤집히는지 확인한다.

### 문서

- `AGENTS.md`의 「iOS 빌드·서명·TestFlight」: CI 경로를 **기본**으로 고치고(트리거 방법, 비밀 목록, Environment 설정), 맥 절차는
  「다른 맥에서 올리려면」 옆에 대안으로 남긴다. 앞 서술이 뒤집히는 곳은 주석으로 덧대지 않고 고친다.
- 비밀 등록·Environment 설정 순서와 인증서 만료(2027-10-08) 갱신 절차를 `specs/NNN-*/quickstart.md`에 둔다.
- 로드맵: 완료 후 이력으로 옮긴다.

### 실행 확인 (원칙 V — 기기 없는 테스트로 대신하지 않는다)

1. 소유자가 비밀 여섯 개와 Environment 보호 규칙을 등록한다(**사람 몫** — 에이전트는 키를 다루지 않는다).
2. `buildNumber`를 올려 커밋 후 `gh workflow run ios-release.yml`(승인 필요) → 아카이브·내보내기·업로드 성공.
3. 처리 단계: ITMS 메일 부재, App Store Connect TestFlight 목록에 빌드가 뜸, 실제 iPhone 설치(소유자).
4. 위반 주입: 비밀 하나를 비우면 사전 점검에서 즉시 실패, `main`이 아닌 브랜치에서 실행 요청이 거부, 정리 단계가 키체인을 지우는지 로그로 확인.

## 남은 위험

- App Store Connect API 키는 소유자가 발급할 수 있음을 확인했다(2026-10-11 clarify) — 앱 암호 후퇴안은 두지 않는다.
- Release 아카이브의 시간·메모리(3코어 7GB에서 llama.rn 컴파일)는 미실측 — 첫 실행이 곧 측정이다. 메모리 부족이면 `-jobs`를 낮춰 이 과제 안에서 통과시킨다(clarify 확정).
- macOS 러너 이미지 변경(Xcode 버전)으로 코드 변경 없이 깨질 수 있다 — 072 잡이 먼저 빨개지는 것은 시뮬레이터 구성이라 Release 경로의 깨짐은 이 워크플로를 돌려야 드러난다.
- 퍼블릭 저장소에 서명 키가 있다는 사실 자체: 방어는 Environment 보호 규칙(소유자 승인)과 `workflow_dispatch` 한정에 있다. 보호 규칙은 저장소 설정이라
  코드가 강제하지 못한다 — 실행 확인 1단계에서 소유자가 한 번 눈으로 확인한다.
