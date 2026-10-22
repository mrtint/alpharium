# Quickstart: iOS e2e 세트 (097)

이 기능을 확인하는 절차다. 명령은 구현된 그대로다. 근거·실측은 [research.md](research.md), 계약은 [contracts/](contracts/).

## 전제 (공통)

- Xcode 27.1(`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`), Maestro 2.11.0, `JAVA_HOME=/opt/homebrew/opt/openjdk@17`, Node 22+.
- 앱은 **dev 환경 번들**을 쓴다 — 저장소의 gitignore된 `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`가 있고 Metro가 떠 있다: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`.

## A. 층 1 — iOS 시뮬레이터

1. **전용 시뮬레이터 하나만 부팅한다**: `xcrun simctl boot <UDID>`. 앱(dev 클라이언트)이 설치돼 있어야 한다. 둘 이상 부팅돼 있으면 실행기가 중단한다.
2. **모델(처음 한 번)**: 새 시뮬레이터라면 `maestro --device <UDID> test .maestro/ios/_prepare-simulator.yml`(앱이 필수 모듈 ~2GB를 실제로 받는다, 약 14분). **`clearState`로 앱 데이터를 지우므로 새 시뮬레이터에서만** 돌린다. 확인: 컨테이너 `Documents/models/`에 `a1.bin`·`v1.bin`·`v2.bin`이 있고 0바이트가 아니다(`xcrun simctl get_app_container <UDID> com.a810labs.pocketlog data`).
3. **표본 사진(처음 한 번)**: `npm run sample:fetch`(210장, 약 4분). 실행기가 나머지(시뮬레이터에 심기·권한)를 한다. **표본이 낡으면 그 시뮬레이터의 사진 보관함을 통째로 초기화한다**(사진이 모두 사라진다, 앱 데이터는 그대로) — 이 도구가 전에 심은 적이 없는 시뮬레이터에서는 허락이 필요하다: 전용 시뮬레이터라면 `POCKETLOG_E2E_RESET_SIM_PHOTOS=1 npm run test:layer1:ios`로 처음 한 번 돌린다(그 뒤에는 표식이 있어 필요 없다).
4. 실행: `npm run test:layer1:ios` (흐름을 골라 돌리려면 `-- .maestro/<흐름>.yml`).
5. **기대**: `12/12 Flows Passed`, 끝에 `PASSED`. 시뮬레이터가 없거나 모델이 없으면 `SKIPPED`/`ABORTED`와 이유(통과가 아니다). 실측: 흐름 8분 19초, 전체 약 9분.
6. **음성 확인(위반 주입)**: 흐름 하나의 기대 id를 치환했음을 단언한 뒤 실행하면 `FAILED`와 그 흐름 이름이 나온다(2026-10-22 `week-strip-swipe`에서 확인). 확인 뒤 되돌린다.
7. **일기 안 씀 확인**: 실행 뒤 컨테이너 `Documents/diary/`가 픽스처 사흘(`.json` 셋)뿐이다(SC-003).

## B. 층 2 — iPhone 실기기

1. iPhone이 맥에 연결돼 잠금이 풀려 있다(`xcrun devicectl list devices`). **Xcode를 끈다**(사진 시딩·파일 지우기가 lldb를 쓴다, 087). 개발 서명 빌드가 깔려 있다. 앱에 사진 읽기·쓰기 권한이 허용돼 있다.
2. **모델이 받아져 있다** — 앱에서 직접 받아 둔다. 컨테이너 `Documents/models/`의 세 `.bin`이 0바이트가 아니다. 없으면 실행기가 중단한다.
3. 표본 사진: `npm run sample:fetch`(A3과 같다).
4. **터미널에서 직접** 실행한다: `npm run test:layer2:ios`. 흐름마다 안내가 나오면 그대로 하고 **조작을 마치면 터미널에서 Enter를 누른다**:
   - `write-and-read`: 홈에서 어제를 골라 「쓰기」(확인 창이 뜨면 확인) → 앱을 앞에 둔다.
   - `open-app-writes`: **아무것도 누르지 않는다**(앱이 알아서 쓴다).
   - `diagnostics-try-write`: 설정(⋯) → 「개발자」 → 「진단」 → 「한 번 써 보기」.
   - `first-run-auto-diary`: 권한 창을 허용하고 작명 화면에서 이름을 입력해 완료한다(키보드가 버튼을 가리면 키보드의 완료 키).
5. **기대**: 흐름마다 PASS, 끝에 `.cache/layer2-ios/<시각>/`의 일기 파일 경로가 출력된다. 본문을 사람이 읽는다(원칙 II·IV).
6. **음성 확인**: `npm run test:layer2:ios -- write-and-read --operation-timeout 5 --generation-timeout 5`에서 Enter를 안 누르면 `failed-operation-timeout`, Enter만 누르고 쓰기를 안 하면 `failed-generation-timeout`이 나온다.

> **주의 — 이 실행은 기기의 앱 데이터를 바꾼다**: 설정·일기·사진 사본을 기준 상태로 되돌리고(지우기는 앱 안에서 lldb로), 합성 사진 5장을 사진 보관함에 심는다(같은 날은 기기마다 한 번만, `.cache/layer2-ios/seeded.json`에 UDID별로 적는다 — 폰을 바꾸거나 보관함을 비웠다면 그 파일을 지운다). **`devicectl device copy to --remove-existing-content`는 쓰지 않는다** — 부모 디렉터리를 비워 모델이 지워진 적이 있다(research R2).

## C. 문서·계약 확인

- `npm test`·`npm run lint` 통과(2026-10-22: 352 suites, 7,242 tests).
- 흐름 하나를 `IOS_LAYER1_FLOWS`에서 빼거나 대응표 iOS 열을 지우면 `__tests__/e2e/flow-map.test.ts`가 실패한다(V-iOS-1~5, SC-004).
- 소스 계약: 시뮬레이터 장치에 `uninstall` 등, iPhone 장치에 `--remove-existing-content`·`models` 삭제, 실행기에 본문 점수화 코드를 넣으면 `ios-layer1-source-contract`·`ios-layer2-source-contract`가 실패한다(2026-10-22 위반 주입으로 확인).

## D. CI 판단

층 1은 macOS 러너에서 모델·표본을 매번 받아 한 번에 30분 안팎이라 **로컬 실행으로 둔다** — 근거와 실측은 research.md 「층 1 실측과 CI 판단」.
