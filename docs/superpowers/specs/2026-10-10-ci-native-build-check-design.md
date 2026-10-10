# CI에 네이티브 빌드 확인 추가 — 설계

2026-10-10. 로드맵 「진행 예정 과제」의 「CI에 네이티브 빌드 확인 추가」.

## 목적

의존성 올림·config plugin·prebuild 결과가 깨져 **JS는 멀쩡한데 네이티브가 안 빌드되는** 상태를, 로컬 release 빌드 때가 아니라
`main`에 들어온 직후 CI에서 알아챈다. **빌드가 되는지만 본다.** 결과물 저장·서명·업로드는 하지 않는다.

이 잡은 품질 보증이 아니다. 이 앱이 실제로 아팠던 결함(iOS `await import` 튕김, ITMS-90683, 004 권한 누락)은 빌드가 성공한 상태에서
났다 — 빌드 확인은 컴파일·prebuild 깨짐만 막는다.

## 결정 (소유자 확정)

1. **트리거는 `main` push와 수동 실행(`workflow_dispatch`)이다.** `pull_request`와 경로 필터는 없다. 이유: 빌드까지 포함하면 시간이 길어(안드로이드 arm64 release 로컬 13분 39초,
   iOS 서명 없는 아카이브 약 10분) PR을 기다리게 할 수 없다. 머지 후에는 임의의 브랜치를 수동 실행할 수 있다(머지 전 검증은 아래 「구성」의 일회용 브랜치).
2. **`main`에서는 경로와 무관하게 항상 돈다**(경로 필터가 놓친 변경·upstream 변화도 한 번 걸러진다).
3. **안드로이드는 `assembleDebug`, arm64 하나다.** `plugins/with-release-signing.js`가 release에 키스토어를 요구해 서명 없는 release는 돌지 않는다.
   release 최적화 컴파일(로컬에서 네 ABI는 clang OOM이었다)과 서명은 「안드로이드 release 빌드·서명·보관을 CI로」 과제에서 정한다.
4. **iOS는 macOS 러너의 서명 없는 시뮬레이터 빌드다**(`prebuild` → `pod install` → `xcodebuild -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO`).
   release 아카이브·서명은 「무료 빌드 머신으로 iOS 빌드·업로드」 과제에서 정한다.
5. **실패하면 빨간불이고 `continue-on-error`를 쓰지 않는다.** 머지를 막지 않는 것은 브랜치 보호의 필수 체크에 이 잡을 넣지 않는 것으로 이룬다 — 저장소 설정이라 워크플로로 못 정한다.
6. **먼저 러너에서 한 번 재서** 시간·메모리를 본다. 값을 보기 전에는 타임아웃·캐시 키를 확정하지 않는다.

## 구성

새 파일 `.github/workflows/native-build.yml`. 기존 `ci.yml`은 건드리지 않는다.

- **`android` 잡** (`ubuntu-latest`): `npm ci` → `npx expo prebuild --platform android --clean` → `cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`.
  gradle 캐시와 ccache. 빌드 중 메모리를 주기적으로 기록한다.
- **`ios` 잡** (`macos-latest`): `npm ci` → `npx expo prebuild --platform ios --clean` → `pod install` → 서명 없는 시뮬레이터 `xcodebuild`.
  Pods·DerivedData 캐시.
- **동시성**: 같은 브랜치에서 새 실행이 시작되면 앞선 진행 중 실행을 취소한다(`concurrency`, 소유자 결정 2026-10-10 — 연속 머지의 중간 커밋 깨짐은 확인되지 않을 수 있다).
- iOS 빌드 구성은 안드로이드 debug와 맞춰 Debug다(Release 아카이브는 iOS 업로드 과제의 몫).
- 머지 전 검증은 일회용 브랜치에서 한다 — `workflow_dispatch`만 있는 워크플로는 `main`에 파일이 있어야 수동 실행할 수 있다.
- 두 잡은 서로 의존하지 않고 병렬이다. 산출물 업로드(`upload-artifact`)는 없다.
- 각 잡은 걸린 시간(캐시 적중 여부 포함)과 안드로이드 최대 메모리를 `$GITHUB_STEP_SUMMARY`에 남긴다.
- Node 24, `actions/checkout@v5`, `actions/setup-node@v5`(`ci.yml`과 같다).

## 검증

- **계약 테스트**(`__tests__/ci/`, 기기 불필요): 워크플로 YAML을 읽어 (a) 트리거에 `pull_request`가 없고 `push`가 `main`·`workflow_dispatch`뿐이다 (b) `continue-on-error`가 어디에도 없다
   (c) 안드로이드 빌드 명령에 `-PreactNativeArchitectures=arm64-v8a`가 있다 (d) 서명 관련 비밀(`secrets.`)과 `upload-artifact`가 없다. 소스를 읽을 때 주석을 먼저 걷어낸다(AGENTS 「테스트 작성의 함정」).
- **위반 주입(러너)**: 일회용 브랜치(머지 전) 또는 수동 실행(머지 뒤)에서 `app.json`에 없는 config plugin 이름을 넣고 돌린다 → 두 잡이 빨개진다. 되돌리고 다시 실행 → 초록이 된다.
- **실측 기록**: 첫 실행(캐시 없음)과 둘째 실행(캐시 적중)의 시간, 안드로이드 최대 메모리를 스펙의 `quickstart.md` 끝에 적는다.
- 기기 검증은 해당 없음 — 앱 코드 변경이 없다. 완료 보고에 그 사실을 적는다.

## 범위 밖

서명·release 빌드·결과물 보관(두 후속 과제), PR 선검사, 브랜치 보호 설정 변경, 앱 코드 변경, 빌드 성공 후의 실행 경로 검증(e2e 과제).

## 로드맵 갱신

- 이 과제의 1번 항목(경로 필터)을 위 결정 1·2로 고친다.
- 후속 두 과제(안드로이드 release CI·iOS 업로드)에 「release 빌드 종류와 PR 선검사 여부는 여기서 정한다」를 한 줄 남긴다.

## 확인 사항 (구현 전 소유자가 아는 것)

- 브랜치 보호에서 이 잡이 필수 체크가 아닌지(머지 차단 여부). 워크플로 쪽에서는 보장할 수 없다.
