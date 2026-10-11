# Contract: `.github/workflows/ios-release.yml`

계약 테스트(`__tests__/ci/ios-release-workflow.test.ts`)가 파일 텍스트(주석을 걷은 뒤)로 잠그는 것이다. 테스트가 이 문서보다 먼저 쓰인다.

## 잠그는 규칙

| ID | 규칙 | 근거 FR |
| --- | --- | --- |
| W1 | 파일이 있다 | — |
| W2 | `on:` 아래 키가 `workflow_dispatch` **하나뿐**이다 (`pull_request`·`pull_request_target`·`push`·`schedule`·`workflow_run` 없음) | FR-002 |
| W3 | 정확히 한 잡이 있고 `environment: ios-release`, `runs-on: macos-latest` | FR-001·003 |
| W4 | 최상위 `permissions:`가 `contents: read` **하나뿐**이다 | FR-003 |
| W5 | `secrets.X` 참조의 집합이 허용 여섯(`IOS_DIST_P12_BASE64`·`IOS_DIST_P12_PASSWORD`·`IOS_PROFILE_BASE64`·`ASC_API_KEY_P8`·`ASC_KEY_ID`·`ASC_ISSUER_ID`)의 부분집합이고 각 참조는 `env:` 값 자리에서만 나온다(`run:` 본문에 `${{ secrets.` 직접 보간 없음) | FR-004·005 |
| W6 | `actions/upload-artifact`·`actions/cache`가 없다 | FR-008 |
| W7 | `set -x`·`set -o xtrace`·`echo "$…` 로 비밀 변수를 찍는 줄이 없다 (`IOS_DIST_P12_PASSWORD`·`ASC_API_KEY_P8`가 `echo`·`cat`·`printenv` 인자로 나오지 않음) | FR-005 |
| W8 | 정리 단계가 있고 `if: always()`이며 `security delete-keychain`·프로파일·`AuthKey_` 삭제를 포함한다 | FR-006 |
| W9 | `concurrency:`가 있고 `cancel-in-progress: false`이다 | FR-010 |
| W10 | `continue-on-error`가 없다 | — |
| W11 | 업로드가 `--apiKey`·`--apiIssuer`를 쓰고 `--username`·`--password`를 쓰지 않는다 | FR-007 |
| W12 | 서명 인자가 066과 같다: `CODE_SIGN_STYLE=Manual`·`DEVELOPMENT_TEAM=PGNGG84B39`·`PROVISIONING_PROFILE_SPECIFIER="Pocketlog App Store"`, 내보내기는 `scripts/ios/ExportOptions.plist` | FR-006 |
| W13 | 사전 점검 단계가 빌드(`expo prebuild`)보다 앞이다 | FR-009 |
| W14 | `timeout-minutes`가 있다 | — |
| W15 | 단계 요약(`GITHUB_STEP_SUMMARY`)에 Xcode 버전과 단계별 시간을 적는다 | FR-011 |
| W16 | `scripts/ios/ExportOptions.plist`의 `destination`이 `export`이다 (업로드는 altool이 맡는다) | 설계 |

## 위반 주입 (치환이 실제로 적용됐는지 먼저 단언한다)

| 주입 | 기대 |
| --- | --- |
| `on:`에 `pull_request:` 추가 | W2 실패 |
| `on:`에 `push:`·`schedule:` 추가 | W2 실패 |
| `environment: ios-release` 제거 | W3 실패 |
| `permissions`에 `id-token: write` 추가 | W4 실패 |
| `secrets.OTHER` 참조 추가 | W5 실패 |
| `run:` 본문에 `${{ secrets.ASC_KEY_ID }}` 직접 보간 | W5 실패 |
| `actions/upload-artifact` 추가 | W6 실패 |
| `actions/cache` 추가 | W6 실패 |
| `set -x` 추가 | W7 실패 |
| 정리 단계의 `if: always()` 제거 | W8 실패 |
| `cancel-in-progress: true` | W9 실패 |
| 업로드를 `--username/--password`로 | W11 실패 |

## 한계

이 표는 휴리스틱이다. W7은 같은 줄의 `echo|cat|printenv`와 `set -x`만 보고(`bash -x`·인자 없는 `env`·`printenv`는 못 잡는다), W11은 `--username/--password`만 막는다. 그래서 워크플로를 고칠 때는 이 표를 통과하는 것에 만족하지 않고 비밀이 어디로 흐르는지 읽는다. W5는 `${{ … secrets … }}` 식이 전부 `NAME: ${{ secrets.NAME }}` 꼴이고 단계 `env` 깊이(10칸)에만 있도록 잠근다(`toJSON(secrets)`·잡 수준 env 차단).

## 비계약 (코드가 강제하지 못하는 것 — quickstart의 눈으로 확인 단계)

Environment 보호 규칙(필수 리뷰어·배포 브랜치 `main`)은 저장소 설정이라 파일에 없다. 소유자가 설정 화면에서 직접 확인한다.
