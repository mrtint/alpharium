# Research: iOS e2e 세트 (095)

2026-10-22 실측·조사. 값은 이 맥(Xcode 27.1)과 iPhone 14(iOS 27.0.1)에서 본 것이다.

## R1 — Maestro는 iOS 실기기를 구동하지 못한다

- **Decision**: 층 1은 시뮬레이터(Maestro), 층 2는 실기기(Maestro 없이 사람 조작 + 스크립트 단언).
- **Rationale**: 비공식 `maestro-ios-device`를 격리 환경에서 시험했으나 러너 빌드가 실패했다 — 배포 목표 14.0이 Xcode 27.1 허용 범위(15.0~27.1.x) 밖, 번들 ID 둘의 프로파일 없음(자동 서명 시 개인 계정에 App ID 등록). 도구는 iOS 16~18·Maestro 2.0.9~2.0.10 기준이고 우리는 2.11.0. 소유자가 채택하지 않기로 했다.
- **Alternatives**: Appium/WDA(서명 부담·흐름 재작성), 클라우드 실기기(모델·사진이 외부로 나간다 — 온디바이스 성격과 충돌).

## R2 — 컨테이너 접근: 시뮬레이터는 호스트 파일, 실기기는 `devicectl`

- 시뮬레이터: `xcrun simctl get_app_container <UDID> com.a810labs.pocketlog data`가 컨테이너 경로를 준다(실측: 앱이 깔려 있고 `Documents/{preferences,models,diary}`가 있다). 호스트 파일 시스템이므로 `Documents/`에 직접 읽고 쓴다. 앱은 `simctl terminate`로 끈 뒤 바꾼다(안드로이드 L4 `forceStop`과 같다). **경로를 저장하지 않고 매번 찾는다**(컨테이너 UUID가 바뀐다, 066).
- 실기기: `xcrun devicectl device info files --domain-type appDataContainer --domain-identifier com.a810labs.pocketlog`(목록, JSON 출력 가능), `devicectl device copy to/from`(복사). 실측: 목록에 `Documents/preferences/onboarding.json`, `Documents/models/v1.bin` 등이 보인다.
- **삭제 통로 없음, 그리고 `--remove-existing-content`는 쓰면 안 된다**: `devicectl device copy`는 `to`·`from`뿐이고 파일 삭제 명령이 없다(실측). `copy to <디렉터리> --destination <경로> --remove-existing-content true`는 **대상 디렉터리의 부모를 통째로 비운다**(임시 영역 실측: `tree/keep`을 둔 채 `tree/replace`를 올리자 `tree/keep`이 사라졌다). 한 번 이 옵션으로 `Documents/preferences`를 올리다 기기의 `Documents/`가 비워졌고 모델 ~2GB가 지워졌다(2026-10-22, 사고). 그래서 이 옵션은 쓰지 않고(소스 계약이 문자열을 막는다) 쓰기는 **파일 하나씩** `copy to`(덮어쓰기, 없는 부모는 만들어진다 — 실측), 지우기는 **앱 프로세스 안에서 lldb로 `removeItemAtPath:`**(092 관찰법, `app-delete.ts`)로 한다. `models/`에는 쓰지도 지우지도 않는다.
- **관측**: 이 시점 iPhone의 `Documents/models/v1.bin`이 0KB이고 `Library/Caches/com.apple.nsurlsessiond/Downloads/…`에 90.4MB 임시 조각이 있다 — 모델이 내려받기 중이거나 중단된 상태다. 층 2 전제(모델 있음)는 사람이 먼저 맞춰야 한다. 실행기는 L3처럼 모델이 없으면 중단한다.

## R3 — 층 1 흐름의 iOS 호환

층 1 흐름 열두 개를 소스로 점검했다(돌려 보지 않았다).

- `- back`(Android 하드웨어 뒤로 가기)을 쓰는 흐름: `single-photo-swipe`(48행), `settings-developer-sweep`(94·107·119·131행), `dialog-foundation`(50행), `diary-home-1d`(84행), `state-simulation`(42·43·73·74행), `today-diary`(111행). iOS Maestro에서 `back`은 동작하지 않으므로 화면의 뒤로 가기 요소(`back-to-home`·`rename-back`·`back-from-font-license`·`back-to-developer` 등 id가 이미 있다)나 대화상자 닫기 요소로 바꾼다. 의도(닫는다/돌아온다)는 같고 입력 수단만 다르다.
- `launchApp`: 기본은 앱을 종료했다 다시 띄운다. 설정 앱을 다녀오는 흐름은 `stopApp: false`(068).
- 권한 행을 눌러 OS 설정으로 나가는 `settings-developer-sweep` 부분: iOS는 설정 앱 왕복 방식이 다르다(`launchApp stopApp:false` + 재진입 확인 창 `_dismiss-open-prompt`). 기존 `.maestro/ios/settings-sweep.yml`이 이미 푼 방식을 재사용한다.
- 나머지(`restart-persistence`, `week-strip-swipe`, `diary-body-screen`, `sample-days`, `skeleton`, `prompt-preview`)는 `back`이 없고 id 기반이라 그대로 돌 가능성이 높다 — 실측으로 확인한다.
- **Decision**: 흐름 파일을 플랫폼별로 복제하지 않는다. `when: platform`/공용 보조 흐름으로 가르고, 안드로이드 동작은 바이트 그대로 둔다.

## R4 — 표본 사진: `simctl addmedia`, 되읽기는 시뮬레이터 `Photos.sqlite`

- `simctl addmedia <UDID> <파일…>`로 심는다(EXIF의 촬영 시각·GPS는 `exif-write.ts`가 이미 파일에 쓴다).
- 되읽기(070 S-4의 「표식만 믿지 않는다」에 해당): 시뮬레이터 데이터의 사진 DB(`…/data/Media/PhotoData/Photos.sqlite`)를 `sqlite3` 읽기 전용으로 질의한다. **실제 경로·테이블은 구현 첫 태스크에서 실측해 확정**한다.
- **단건 삭제 통로가 없다**(simctl에 없음). 표본이 낡았을 때 안드로이드는 `s30-` 파일만 지우고 다시 심지만, 시뮬레이터는 보관함 비우기가 `simctl erase`(앱·모델까지 지움)뿐이다. **Decision**: 표본이 표와 어긋나면 지우지 않고 「새 시뮬레이터 보관함이 필요하다」는 이유로 **중단**하고 절차를 안내한다(전용 시뮬레이터를 하나 두고 표본은 처음 한 번만 심는다). 표 기준일이 바뀌어 낡아지는 문제는 quickstart의 「표본 다시 만들기」(새 시뮬레이터 + 모델 복사)로 다룬다. 실측 전에는 이 한계가 실제로 문제인지 장담하지 않는다.
- 권한: `simctl privacy <UDID> grant photos|location com.a810labs.pocketlog`로 부여.
- **대안**: 호스트 파일 시스템의 보관함 DB를 직접 수정(깨지기 쉬움 — 기각).

## R5 — 시뮬레이터의 모델 파일

- 시뮬레이터 컨테이너 `Documents/models/`는 비어 있다(실측 0B). 층 1은 생성하지 않지만 기준 상태의 모델 점검(L3)과 앱의 첫 실행 게이트(`resolveFirstRunStage`가 온보딩 완료 + 필수 모델 존재를 본다)가 모델 파일을 요구한다.
- **Decision**: 가짜 파일을 만들지 않는다(042). 모델은 시뮬레이터에서 앱의 정상 내려받기로 한 번 받거나, 이미 받은 호스트 쪽 사본을 복사한다(`Documents/models/*.bin` 세 개, `state.json` 포함). 어느 쪽을 쓸지는 구현 첫 실측(내려받기 시간 vs 복사 가능 여부)으로 정하고 quickstart에 적는다.
- **Alternative**: 크기 0 파일로 게이트만 통과 — 첫 실행 게이트·liveness가 무엇을 보는지 실측 전에는 안전하지 않고, 가짜 검증이 된다.

## R6 — 층 2 실행기는 `runLayer2`를 일반화하지 않고 따로 둔다

- `runLayer2`는 흐름마다 `device.runMaestro([file])`을 부르는 구조다. iOS 층 2는 「앱 실행 → 안내 → 폴링」이라 Maestro가 아니다. `runMaestro`에 거짓 구현을 끼우지 않는다(가짜 검증 금지).
- **Decision**: `prepareBaseline`(층 1 `runner.ts`, 포트 `Layer1Device`로 주입)만 재사용하고, 흐름 순회·단언·수집은 `scripts/layer2-ios/runner.ts`에 새로 둔다. iOS 층 2 장치는 `Layer2Device`(listDevices·probe·listDir·forceStop·ensureDirs·writeFile·copyFile·removeFile·pullFile)를 구현하되 `runMaestro`는 쓰지 않는다 — 인터페이스에서 `runMaestro`를 선택으로 바꾸는 대신, iOS 장치는 `Layer1Device`의 부분집합을 `Pick`으로 받는 `BaselineDevice` 타입을 `prepareBaseline`이 받게 좁힌다.

## R7 — 층 2 관찰: 파일 폴링과 한계

- 단언 대상: `Documents/diary/<날짜>.json`의 생성(목록 폴링 → `copy from`으로 내려받아 형식 확인), `Documents/preferences/write-failures.json`에 새 항목이 없음(기준 상태에서 삭제된 뒤 시작하므로 파일이 생기면 실패).
- **쓰는 중 중간 전이는 파일로 안 보인다.** 일기 저장소가 임시 파일을 두는지 소스를 확인했으나 `.writing` 임시 파일은 설정 저장소(`settings.ts`·`skip-store.ts`)에만 있고 일기에는 보이지 않는다. 메모리 등록부(080)라 컨테이너에도 없다. **Decision**: 쓰는 중은 단언하지 않는다(FR-012, spec Assumptions). `devicectl process launch --console` 로그로 볼 수 있는지는 구현 중 한 번 확인하되, 안 되면 사람이 본다.
- **조작 완료 신호**: 쓰는 중이 파일로 안 보이므로 실행기는 조작 여부를 알 수 없다. 사람이 안내된 조작을 마치면 터미널에서 Enter를 눌러 알린다(`humanSteps`가 있는 흐름만). 그래서 조작 대기 초과(Enter 없음)와 생성 대기 초과(Enter 뒤 파일 없음)를 가를 수 있다. 표준 입력이 터미널이 아니면 사람 흐름은 aborted한다.
- 폴링 주기 5초, 생성 대기 10분(clarify), 조작 대기 5분(가정). 폴링은 읽기뿐이다. 완전 자동 흐름(`open-app-writes`)은 Enter 단계가 없다.

## R8 — 시뮬레이터는 dev 환경으로 띄운다

- `local` 환경이면 추론이 데스크톱 서버를 가리켜 진단 화면 문구(`skeleton`의 「기기 · CPU」)가 달라진다. 층 1 전제로 `.env.development.local`의 `EXPO_PUBLIC_APP_ENV=dev`와 Metro 번들을 둔다(AGENTS). 이미 시뮬레이터에 dev 클라이언트 앱이 설치돼 있다(실측).

## 구현 실측 (2026-10-22, T001~T004)

- **T001 시뮬레이터**: iPhone 18 Pro(`7D4BB86B-…`, iOS 27.0)에 dev 클라이언트가 설치돼 있고 `get_app_container data`가 `Documents/{preferences,models,diary}`를 준다. `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`가 있다. Metro는 층 1을 돌릴 때 띄운다(지금은 꺼짐). `scripts/e2e-sample/.cache/`는 비어 있어 표본 사진은 `npm run sample:fetch`가 먼저다.
- **T003 시뮬레이터 사진 DB (R4 확정)**: `…/data/Media/PhotoData/Photos.sqlite`(WAL이라 `sqlite3 -readonly "file:<경로>?mode=ro"`로 읽는다). `simctl addmedia`는 **파일 이름을 `IMG_nnnn.JPG`로 바꾼다** — 원래 이름은 `ZADDITIONALASSETATTRIBUTES.ZORIGINALFILENAME`에 남는다(`aa.ZASSET = a.Z_PK`로 조인). 촬영 시각은 `ZASSET.ZDATECREATED`(Core Data 시간: 유닉스 + 978307200 초 이전), 좌표는 `ZLATITUDE`/`ZLONGITUDE`. addmedia는 파일의 EXIF 촬영 시각과 GPS를 존중하고 몇 초 안에 DB에 반영된다. 휴지통은 `ZTRASHEDSTATE`.
- **R4 결정 변경 — 보관함 초기화로 지운다**: 표본은 기준일(오늘) 상대라(`ensure.ts`의 anchor) 날이 바뀌면 낡는다. 단건 삭제 통로가 없어 「어긋나면 중단」으로 두면 하루만 지나도 층 1을 못 쓴다. 실측: 시뮬레이터를 `shutdown` → `Media/PhotoData`와 `Media/DCIM`을 지움 → `boot` 하면 **라이브러리가 빈 채로 다시 만들어지고**(`ZASSET` 0행) 앱 컨테이너 UUID와 `Documents/`는 그대로다. 그래서 iOS `removeSampleFiles`는 「전용 시뮬레이터의 사진 보관함을 통째로 초기화」(shutdown → 두 폴더만 `rmSync` → boot → bootstatus)다. 전용 시뮬레이터 전제이며 앱 데이터·모델은 건드리지 않는다. 시간(몇십 초)은 층 1 소요 시간에 포함해 기록한다.
- **T004 `devicectl info files` JSON**: `--json-output <경로>`, `--subdirectory Documents`, `-s`(검색), 기본 재귀. 모양: `result.files[]` = `{ name, relativePath, metadata:{size, lastModDate}, resources:{isDirectory,…} }`. 고정물: `__tests__/e2e/fixtures/devicectl-info-files.json`(이름·크기·디렉터리 여부만).
- **iPhone 현재 상태**: `Documents/models/a1.bin` 등이 0바이트 — 모델 내려받기가 끝나지 않았다. 층 2 전제(모델 있음)는 사람이 먼저 맞춘다. `process launch --console` 시험(쓰는 중 관찰)은 사용 중인 기기의 내려받기를 끊을 수 있어 T032에서 흐름과 함께 시험한다.

## 층 1 실측과 CI 판단 (2026-10-22, T021·T042)

- **iOS 시뮬레이터 층 1 한 번**: iPhone 18 Pro 시뮬레이터(iOS 27.0), Maestro 2.11.0, 흐름 12개 **전부 통과 — 8분 19초**(흐름 합계), 실행기 전체 **약 9분**(기준 상태·표본 확인 포함, 2026-10-22 537초). 흐름별: `restart-persistence` 1분 37초, `settings-developer-sweep` 1분 43초, `sample-days` 1분 32초, 나머지는 14~30초.
- **표본 첫 심기**: 129장 85.6초(`simctl addmedia` + 되읽기 검증 통과). 표본 사진 210장 내려받기 약 4분(Wikimedia 간격 규칙, 처음 한 번). 표본은 기준일(오늘)이 바뀌면 낡아 다음 실행에서 보관함 초기화(shutdown → 두 폴더 삭제 → boot) 뒤 다시 심는다.
- **모델**: 시뮬레이터에서 앱 첫 실행 내려받기로 한 번 받았다(~2GB, 받는 시간은 수 분, 첫 실행 흐름 전체 약 14분). 층 1 흐름은 생성하지 않지만 기준 상태 점검(L3)과 설정의 「쓰는 모듈 2.0GB」 표시가 파일을 본다. 가짜 파일은 시험하지 않았다(042).
- **모델 없이 닿는 화면**: 기준 상태가 온보딩 완료·모델 파일 있음을 전제하므로 첫 실행 게이트(로고·권한·동의·진행·작명) 화면은 층 1이 닿지 않는다 — 그 경로는 층 2 `first-run-auto-diary`(iPhone)가 본다.
- **CI 판단 — 로컬 실행으로 둔다**: macOS 러너는 매 실행이 빈 상태라 시뮬레이터 모델 ~2GB(약 14분)·표본 사진 내려받기(약 4분)·표본 심기(약 1.5분)에 흐름 8분 남짓이 더해져 한 번에 30분 안팎이고, 모델 캐시를 러너 사이에 두려면 대용량 캐시·시뮬레이터 상태 보존이 필요하다. 층 1이 잡는 것(화면 회귀)에 비해 비용이 크고 릴리스 전 로컬 한 번으로 충분하다. 층 2는 실기기라 CI 대상이 아니다. 실측이 바뀌면(모델 없이도 닿는 화면 범위를 넓히는 등) 다시 정한다.
- **iOS 시뮬레이터에서 처음 낸 결함 클래스**(층 1이 잡은 것): ① 시뮬레이터 키체인 오류 LogBox 토스트가 쓰기 바를 덮음(시뮬레이터 전용), ② RN `Modal` 루트 `testID`와 접근성 합쳐짐 때문에 날짜 숫자·진단 값·대화상자 루트를 못 봄(iOS 접근성 트리 차이 — 제품 결함이 아니라 e2e의 시야 차이). 앱 크래시·화면 오류 같은 제품 결함은 이번 실행에서 나오지 않았다.

## iPhone 실기기 실측 (2026-10-22, T032~T036)

- **통과 셋**: `open-app-writes`(사람 조작 없음, 일기 파일 약 몇 분 안), `write-and-read`(사람이 어제를 골라 「쓰기」, 신호 파일로 Enter 대신), `first-run-auto-diary`(권한 허용·작명 뒤 자동 첫 일기). 가져온 일기 본문을 사람이 읽었다 — 화자가 휴대폰이고 사진 내용을 반영한다(원칙 II). 음성 확인(`--operation-timeout 5 --generation-timeout 5`): Enter를 안 누르면 `failed-operation-timeout`, Enter만 누르고 쓰기를 안 하면 `failed-generation-timeout`으로 갈라 실패했다.
- **미확인 하나**: `diagnostics-try-write` — iPhone의 앱이 배포(prod) 환경 빌드라 진단 화면이 없다(`developer-menu.json`을 7번 탭으로 켰을 뿐 — 진단은 개발 환경 전용). 소유자 결정으로 건너뛰었다. dev 환경 빌드를 설치한 iPhone에서 확인해야 한다.
- **실기기에서 처음 드러나 고친 것(기기 없는 테스트로는 못 잡았다)**: ① 앱 안 삭제를 lldb Objective-C 식(`stringByAppendingPathComponent:`·`NSHomeDirectory()`)으로 하면 Foundation 선언이 없어 거절된다 → `dlsym`으로 C 함수(`chdir`·`unlink`)를 부른다. ② 멈춘 채 띄운 앱은 라이브러리가 안 올라 `_dlsym` 심볼이 없다 → `UIApplicationMain`까지 달리게 한 뒤 삭제한다. ③ 그냥 띄우면 lldb가 붙기 전에 앱이 `auto-write-attempts.json`을 다시 만들어 삭제 확인(`verifyBaseline`)이 실패한다 → `--start-stopped`로 띄우고 `process kill`(detach 아님)로 끝낸다. 지우기 확인이 이 결함을 바로 잡았다.
- **터미널이 아닌 셸**: Enter 대신 `POCKETLOG_IOS_L2_ENTER_FILE`로 준 파일을 `touch`해 알린다(`enter-signal.ts`).
- **안드로이드 회귀**: 갤럭시(SM-S901N, dev 빌드)에서 `npm run test:layer1` **12/12 통과**(14분 3초) — 공유 흐름·실행기 변경이 안드로이드를 깨지 않았다. 첫 시도는 기기가 잠겨 있어 12개가 모두 홈에서 실패했다(환경 문제).
