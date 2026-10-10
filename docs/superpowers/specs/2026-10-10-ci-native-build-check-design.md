# CI에 네이티브 빌드 확인 추가 — 설계

2026-10-10. 로드맵 「진행 예정 과제」의 「CI에 네이티브 빌드 확인 추가」.

## 목적

의존성 올림·config plugin·prebuild 결과가 깨져 **JS는 멀쩡한데 네이티브가 안 빌드되는** 상태를, 로컬 release 빌드 때가 아니라
`main`에 들어온 직후 CI에서 알아챈다. **빌드가 되는지만 본다.** 결과물 저장·서명·업로드는 하지 않는다.

이 잡은 품질 보증이 아니다. 이 앱이 실제로 아팠던 결함(iOS `await import` 튕김, ITMS-90683, 004 권한 누락)은 빌드가 성공한 상태에서
났다 — 빌드 확인은 컴파일·prebuild 깨짐만 막는다.

## 결정 (소유자 확정)

1. **트리거는 세 가지다**(2026-10-10 재결정 — 실무의 3티어 CI 구성에 맞춤. 앞서 정한 "PR에서는 돌리지 않는다"를 대체한다).
   - `pull_request`: 네이티브 입력이 바뀐 PR에서만 — 경로 필터 `package.json`·`package-lock.json`·`app.json`·`plugins/**`·`.github/workflows/native-build.yml`(자기 자신).
     의존성·config plugin 변경이 네이티브를 깨뜨리는 주범이고 그런 PR은 드물어 10~20분대 빌드의 비용이 작다. `pull_request`는 PR 브랜치의 워크플로 파일을 쓰므로 새 파일도 PR에서 곧바로 돈다.
   - `push`: `main`, **같은 경로 필터**(재결정 — 문서 오탈자 머지에 빌드를 돌리지 않는다). `workflow_dispatch`: 수동 실행(파일이 `main`에 있어야 한다).
   - 티어: Tier 1 모든 PR = `ci.yml`, **Tier 2 = 이 워크플로**, Tier 3 서명·업로드 = 후속 두 과제(태그·수동 트리거).
2. **`main` push도 같은 경로에서만 돈다.** 처음에는 항상 돌리기로 했으나(경로 필터가 놓친 변경·upstream 변화를 걸러내려고), PR에 경로 필터를 건 3티어 구성에서는 중복이고 문서 머지마다 10~13분을 쓴다. upstream 변화로 깨지는 것은 수동 실행으로 본다.
3. **안드로이드는 `assembleDebug`, arm64 하나다.** `plugins/with-release-signing.js`가 release에 키스토어를 요구해 서명 없는 release는 돌지 않는다.
   release 최적화 컴파일(로컬에서 네 ABI는 clang OOM이었다)과 서명은 「안드로이드 release 빌드·서명·보관을 CI로」 과제에서 정한다.
4. **iOS는 macOS 러너의 서명 없는 시뮬레이터 빌드다**(`prebuild` → `pod install` → `xcodebuild -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO`).
   release 아카이브·서명은 「무료 빌드 머신으로 iOS 빌드·업로드」 과제에서 정한다.
5. **실패하면 빨간불이고 `continue-on-error`를 쓰지 않는다.** 머지를 막지 않는 것은 브랜치 보호의 필수 체크에 이 잡을 넣지 않는 것으로 이룬다 — 저장소 설정이라 워크플로로 못 정한다. 경로 필터로 건너뛴 워크플로의 필수 체크는 「대기 중」에 머물러 PR을 막으므로 필수로 올리지 않는 편이 단순하다.
6. **먼저 러너에서 한 번 재서** 시간·메모리를 본다. 값을 보기 전에는 타임아웃·캐시 키를 확정하지 않는다.

## 구성

새 파일 `.github/workflows/native-build.yml`. 기존 `ci.yml`은 건드리지 않는다.

- **`android` 잡** (`ubuntu-latest`): `npm ci` → `npx expo prebuild --platform android --clean` → `cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`.
  gradle 캐시와 ccache. 빌드 중 메모리를 주기적으로 기록한다.
- **`ios` 잡** (`macos-latest`): `npm ci` → `npx expo prebuild --platform ios --clean` → `pod install` → 서명 없는 시뮬레이터 `xcodebuild`.
  Pods·DerivedData 캐시.
- **동시성**: 같은 ref(PR이면 그 PR)에서 새 실행이 시작되면 앞선 진행 중 실행을 취소한다(`concurrency`, ref별, 소유자 결정 2026-10-10 — 연속 push의 중간 커밋 깨짐은 확인되지 않을 수 있다).
- iOS 빌드 구성은 안드로이드 debug와 맞춰 Debug다(Release 아카이브는 iOS 업로드 과제의 몫).
- 두 잡은 서로 의존하지 않고 병렬이다. 산출물 업로드(`upload-artifact`)는 없다.
- 각 잡은 걸린 시간(캐시 적중 여부 포함)과 안드로이드 최대 메모리를 `$GITHUB_STEP_SUMMARY`에 남긴다.
- Node 24, `actions/checkout@v5`, `actions/setup-node@v5`(`ci.yml`과 같다).

## 검증

- **계약 테스트**(`__tests__/ci/`, 기기 불필요): 워크플로 YAML을 읽어 (a) `pull_request.paths`가 위 다섯 항목뿐이고 `pull_request_target`·`schedule`이 없으며 `push`가 `main`(경로 필터 없음)과 `workflow_dispatch`뿐이다 (b) `continue-on-error`가 어디에도 없다
   (c) 안드로이드 빌드 명령에 `-PreactNativeArchitectures=arm64-v8a`가 있다 (d) 서명 관련 비밀(`secrets.`)과 `upload-artifact`가 없다. 소스를 읽을 때 주석을 먼저 걷어낸다(AGENTS 「테스트 작성의 함정」).
- **위반 주입(러너)**: 피처 브랜치를 base로 하는 일회용 PR에서 `app.json`에 없는 config plugin 이름을 넣는다 → 두 잡이 빨개진다. 되돌리면 초록이 된다. 문서만 바꾼 일회용 PR에서는 이 확인이 시작되지 않는다.
- **실측 기록**: 첫 실행(캐시 없음)과 둘째 실행(캐시 적중)의 시간, 안드로이드 최대 메모리를 스펙의 `quickstart.md` 끝에 적는다.
- 기기 검증은 해당 없음 — 앱 코드 변경이 없다. 완료 보고에 그 사실을 적는다.

## 범위 밖

서명·release 빌드·결과물 보관(두 후속 과제), 필수 체크 지정·브랜치 보호 설정 변경, 빌드 산출물로 도는 E2E(우리 E2E는 실기기에서 2GB 모델을 받아 돌린다), 앱 코드 변경, 빌드 성공 후의 실행 경로 검증(e2e 과제).

## 로드맵 갱신

- 이 과제의 1번 항목(경로 필터)을 위 결정 1·2로 고친다.
- 후속 두 과제(안드로이드 release CI·iOS 업로드)에 「Tier 3(서명·업로드)는 태그·수동 트리거로, release 빌드 종류는 여기서 정한다」를 한 줄 남긴다.

## 확인 사항 (구현 전 소유자가 아는 것)

- 브랜치 보호에서 이 잡이 필수 체크가 아닌지(머지 차단 여부). 워크플로 쪽에서는 보장할 수 없다.
