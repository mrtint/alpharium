# Research: iOS e2e 세트 (095)

2026-10-22 실측·조사. 값은 이 맥(Xcode 27.1)과 iPhone 14(iOS 27.0.1)에서 본 것이다.

## R1 — Maestro는 iOS 실기기를 구동하지 못한다

- **Decision**: 층 1은 시뮬레이터(Maestro), 층 2는 실기기(Maestro 없이 사람 조작 + 스크립트 단언).
- **Rationale**: 비공식 `maestro-ios-device`를 격리 환경에서 시험했으나 러너 빌드가 실패했다 — 배포 목표 14.0이 Xcode 27.1 허용 범위(15.0~27.1.x) 밖, 번들 ID 둘의 프로파일 없음(자동 서명 시 개인 계정에 App ID 등록). 도구는 iOS 16~18·Maestro 2.0.9~2.0.10 기준이고 우리는 2.11.0. 소유자가 채택하지 않기로 했다.
- **Alternatives**: Appium/WDA(서명 부담·흐름 재작성), 클라우드 실기기(모델·사진이 외부로 나간다 — 온디바이스 성격과 충돌).

## R2 — 컨테이너 접근: 시뮬레이터는 호스트 파일, 실기기는 `devicectl`

- 시뮬레이터: `xcrun simctl get_app_container <UDID> com.a810labs.pocketlog data`가 컨테이너 경로를 준다(실측: 앱이 깔려 있고 `Documents/{preferences,models,diary}`가 있다). 호스트 파일 시스템이므로 `Documents/`에 직접 읽고 쓴다. 앱은 `simctl terminate`로 끈 뒤 바꾼다(안드로이드 L4 `forceStop`과 같다). **경로를 저장하지 않고 매번 찾는다**(컨테이너 UUID가 바뀐다, 066).
- 실기기: `xcrun devicectl device info files --domain-type appDataContainer --domain-identifier com.a810labs.pocketlog`(목록, JSON 출력 가능), `devicectl device copy to/from`(복사). 실측: 목록에 `Documents/preferences/onboarding.json`, `Documents/models/v1.bin` 등이 보인다.
- **삭제 통로 없음**: `devicectl device copy`는 `to`·`from`뿐이고 파일 삭제 명령이 없다(실측). 대신 `copy to … --remove-existing-content true`가 디렉터리를 올릴 때 그 디렉터리의 나머지 파일을 지운다 — 기준 상태 단계에서 `preferences/`·`diary/`·`vision-cache/`를 호스트 스테이징 폴더로 미러링해 수정한 뒤 디렉터리째 올려 지운다. `models/`에는 쓰지도 지우지도 않는다.
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
