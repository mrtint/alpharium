# Contract: `.github/workflows/android-release.yml`

계약 테스트(`__tests__/ci/android-release-workflow.test.ts`)가 파일 텍스트(주석을 걷은 뒤)로 잠그는 것이다. 테스트가 이 문서보다 먼저 쓰인다. 규칙 번호는 075 `ios-release.yml` 계약(W1~)과 같은 뜻이면 같은 번호를 쓴다.

## 단계 이름 (테스트가 이름으로 단계를 찾는다 — 바꾸면 계약도 바꾼다)

`사전 점검` · `러너 사양` · `키스토어 복원` · `gradle bundleRelease` · `서명 확인` · `Play 업로드` · `최대 메모리 사용량` · `정리`. 그 밖의 단계(checkout·setup-node·setup-java·`npm ci`·`expo prebuild`)는 이름을 정하지 않는다.

## 잠그는 규칙

| ID | 규칙 | 근거 FR |
| --- | --- | --- |
| W1 | 파일이 있다 | — |
| W2 | `on:` 아래 키가 `workflow_dispatch` **하나뿐**이다 (`pull_request`·`pull_request_target`·`push`·`schedule`·`workflow_run` 없음) | FR-002 |
| W3 | 정확히 한 잡이 있고 `environment: android-release`, `runs-on: ubuntu-latest` | FR-001·003 |
| W4 | 최상위 `permissions:`가 `contents: read` **하나뿐**이고 잡 수준 `permissions`가 없다 | FR-003 |
| W5 | `secrets.X` 참조의 집합이 허용 넷(`ANDROID_KEYSTORE_BASE64`·`ANDROID_KEYSTORE_PASSWORD`·`ANDROID_KEY_PASSWORD`·`PLAY_SERVICE_ACCOUNT_JSON`)의 부분집합이고 모든 참조 줄이 `NAME: ${{ secrets.NAME }}` 꼴이다(`run:` 본문 보간·`toJSON(secrets)`·`secrets['X']` 불가). `${{ … secrets … }}` 식은 전부 그 꼴이다 | FR-004·005 |
| W5a | 비밀 참조는 **단계 `env` 깊이**에만 있다(잡 수준 `env`·`with:` 금지) | FR-005 |
| W5b | 각 비밀은 정해진 단계에서만 나온다: 키스토어 → `키스토어 복원`, 두 비밀번호 → `gradle bundleRelease` 단계(키 `ORG_GRADLE_PROJECT_POCKETLOG_STORE_PASSWORD`·`ORG_GRADLE_PROJECT_POCKETLOG_KEY_PASSWORD`), 서비스 계정 → `Play 업로드` 단계, 사전 점검은 넷 모두 | FR-005 |
| W6 | `actions/upload-artifact`·`actions/cache`가 없다 | FR-008 |
| W7 | `set -x`·`set -o xtrace`·비밀 변수를 `echo`·`cat`·`printenv` 인자로 쓰는 줄이 없다 | FR-005 |
| W8 | 정리 단계가 있고 `if: always()`이며 마지막 단계이고 키스토어 파일·AAB 삭제를 포함한다 | FR-005·SC-006 |
| W9 | `concurrency:`가 있고 `cancel-in-progress: false`이다 | FR-010 |
| W10 | `continue-on-error`가 없다 | — |
| W11 | 외부 Action은 `actions/*`뿐이다(`uses:`의 소유자) | FR-012 |
| W12 | 빌드 인자: `./gradlew bundleRelease`·`-PreactNativeArchitectures=arm64-v8a`가 있고, `NODE_ENV: production`이 `gradle bundleRelease` 단계의 `env`에 있으며, `assembleRelease`·`apk`는 없다 | FR-001·006 |
| W13 | 단계 순서: 사전 점검 < `expo prebuild` < 키스토어 복원 < `bundleRelease` < 서명 확인 < Play 업로드 < 정리 | FR-007·009 |
| W14 | `timeout-minutes`가 있다 | — |
| W15 | `GITHUB_STEP_SUMMARY`에 러너 사양(CPU·메모리·Java)을 적고, `expo prebuild`·`gradle bundleRelease`·`Play 업로드` 세 단계가 `trap`으로 걸린 시간을, `최대 메모리 사용량` 단계가 최대 메모리를 적는다. `서명 확인` 단계는 AAB 크기·소유자·지문을 적는다 | FR-011 |
| W16 | 서명 확인 단계가 `scripts/android-release/verify-signature.mts`를 부르고, Play 업로드 단계가 `scripts/android-release/play-upload.mts`를 부른다 | FR-007·012 |
| W17 | 사전 점검이 `upload-key.sha256`의 존재를 본다(스크립트 위임) | FR-009 |
| W18 | `actions/checkout`에 `persist-credentials: false`가 있다 | FR-005 |
| W19 | `android/`를 직접 고치는 줄이 없다(`sed -i`·`>>` 등으로 `build.gradle`·`gradle.properties`를 쓰지 않는다) | FR-006 |

## 위반 주입 (치환이 실제로 적용됐는지 먼저 단언한다)

| 주입 | 기대 |
| --- | --- |
| `on:`에 `pull_request:`·`push:`·`schedule:` 추가 | W2 실패 |
| `environment: android-release` 제거 | W3 실패 |
| `permissions`에 `id-token: write` 추가 | W4 실패 |
| `secrets.OTHER` 참조 추가 | W5 실패 |
| `run:` 본문에 `${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}` 직접 보간 | W5 실패 |
| `toJSON(secrets)` 추가 | W5 실패 |
| 잡 수준 `env`에 비밀 추가 | W5a 실패 |
| 서비스 계정 비밀을 빌드 단계로 이동 | W5b 실패 |
| `actions/upload-artifact`·`actions/cache` 추가 | W6 실패 |
| `set -x` 추가, 비밀 변수 `echo` | W7 실패 |
| 정리 단계의 `if: always()` 제거 | W8 실패 |
| 정리 뒤에 이름 없는 `- run:` 단계 추가 | W8 실패 |
| `cancel-in-progress: true` | W9 실패 |
| `continue-on-error: true` 추가 | W10 실패 |
| `uses: someone/else@v1` 추가 | W11 실패 |
| `-PreactNativeArchitectures=arm64-v8a` 제거, `NODE_ENV: production` 제거 | W12 실패 |
| `assembleRelease` 추가 | W12 실패 |
| 서명 확인 단계를 Play 업로드 뒤로 이동 | W13 실패 |
| 사전 점검 단계 이름 변경(빌드 뒤로) | W13 실패 |
| `timeout-minutes` 제거 | W14 실패 |
| `persist-credentials: false` 제거 | W18 실패 |
| `sed -i … android/app/build.gradle` 추가 | W19 실패 |

## 한계

이 표는 휴리스틱이다. W7은 같은 줄의 `echo|cat|printenv`와 `set -x`만 보고, `bash -x`·인자 없는 `env`는 못 잡는다. 그래서 워크플로를 고칠 때는 이 표를 통과하는 것에 만족하지 않고 비밀이 어디로 흐르는지 읽는다.

## 비계약 (코드가 강제하지 못하는 것 — quickstart의 눈으로 확인 단계)

Environment 보호 규칙(필수 리뷰어·배포 브랜치 `main`)은 저장소 설정이라 파일에 없다. 소유자가 설정 화면에서 직접 확인한다. 서비스 계정의 Play 권한 범위(내부 트랙 릴리스만)도 같다.
