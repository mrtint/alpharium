# 헌법을 먼저 읽는다

이 프로젝트가 무엇이고 무엇을 지켜야 하는지는 [.specify/memory/constitution.md](.specify/memory/constitution.md)에 있다. **작업을 시작하기 전에 그것을 읽는다.** 이 문서는 헌법을 요약하지 않으며, 헌법이 담지 않는 실무 사실만 남긴다. 둘이 어긋나면 헌법이 우선한다.

한 줄로 말하면: **주인의 휴대폰이 화자가 되어 하루를 일기로 쓰는 앱**이다. 사람이 쓰는 일기가 아니다. 나머지는 헌법에 있다.

**이 문서에는 지금도 유효한 결론과 아직 남은 위험만 주제별로 둔다.** 기능별 상세 실측 로그와 설계 이력은 `specs/0xx-*/`와 git 히스토리에 있다. **뒤의 기능이 앞의 결정을 뒤집으면 앞의 서술을 주석으로 덧대지 않고 고치거나 지운다.**

## 저장소의 현재 상태

- **패키지·이름**: 포켓로그(Pocketlog), `com.a810labs.pocketlog`(065).
- **온디바이스 일기 생성**: 프롬프트 조립(`src/diary/prompt.ts`, 원본 `my-ollama` `hand-prompt/v5`, `~요`체, 날짜별 첫 문장 틀 11개, 077) → `llama.rn` 추론(`root ::= [^A-Za-z]*`) → 4갈래 판정(`empty`/`echo`/`language`/`unfinished`, `acceptance.ts`) → 2차 호출 제목 질문(`title.ts`) → 저장. 사진이 있는 날은 VLM이 캡션을 읽는다(011·042, 1024px 리사이즈 013, 시간 분포·잡사진 제외 상한 8장 023).
- **캐릭터 페르소나**: 검증 로스터는 `quiet`(`kanana-1.5-2.1b`, 기본 이름 금동이) 하나다(037). 다중 캐릭터 계약은 `__tests__/future-character.ts`의 `FUTURE_CHARACTER`로 잠근다.
- **첫 실행**: 스플래시·로고 → 권한 순차 요청(`photos`·`photo-location`·`location`·`notifications`·`battery-exception`, 021·043) → 필수 모듈(~2GB) 동의(`CELLULAR`일 때만 모바일 데이터/나중에 받기 + 용량 표시, 045·074) → 진행 슬라이드(046) → 작명(보드 `1a`, 047) → 정상 동작 확인(liveness) → 자동 첫 일기(040).
- **홈(Modernist)**: 탭 줄 없음(048). 주간 스트립·달력(`DateJumpDialog`)으로 모든 지난날과 오늘을 고른다(자정 00:00 경계, 049·050). 안 쓴 날은 사진·장소 재료와 쓰기 전 확인(053), 쓰는 중은 제자리 쓰기·혼잣말·그만두기·실패 토스트(054), 쓴 날은 순환 사진 캐러셀(탭 시 확대 뷰어, 067)과 본문·스크롤 접힘(051·052)을 그린다.
- **살아 있는 쓰기 등록부**: 프로세스 안의 쓰기·지우기는 메모리 등록부 하나(`src/diary/live-write.ts`)가 안다(080 — 잠금 파일·낡음 시간 폐지). 남의 쓰기 도중에 앱을 열면 홈이 「쓰는 중」으로 합류하고, 실패하면 이어서 한 번 새로 쓴다.
- **자동 쓰기·알림·기록**:
  - 판정은 `src/schedule/auto-write.ts` 하나를 백그라운드(`task.ts`)와 앱 열기(`useAutoWriteHandoff`·`useAutoWriteClaim`, 057·082)가 함께 쓴다. 목표 시각 +3시간 창 안에는 사흘 모두, 창 밖에는 차례가 지난 미작성일(오전 목표는 목표 시각 전까지 어제도 제외)을 따라잡는다(백그라운드 창 밖 따라잡기는 하루 1회 상한, 078).
  - 목표 시각마다 앞으로 7일치(쓴 날 제외) 「쓸 차례」 예약 알림(`diary-reminder`, DEFAULT)을 걸고, 누르면 `rearmAutoWrite()`로 앱 열기 자동 쓰기를 다시 연다(085). 백그라운드가 먼저 쓰면 알림을 거두고 완성 알림(`diary-completed`, HIGH)을 띄운다.
  - 개발자·진단 화면 하단에 「최근 자동 쓰기 시도」(경로 3 × 결과 14, 최근 20건, 078·080)와 「최근 실패」(갈래 11개: `module`·`photos`·`empty`·`echo`·`language`·`unfinished`·`timed-out`·`interrupted`·`error`·`save`·`unwritten`, 최근 10건, 060·081)를 남긴다.
- **설정·개발자·진단**: 홈 위의 `StackLayer`다(055~060·064). 이름 바꾸기, 자동 쓰기·시각·장소 이름 대화상자, 권한 꼬리표, 이 휴대폰(모듈 용량 1000 기준·일기 모두 지우기), 정보(버전 7번 탭으로 개발자 메뉴 활성화·서체 라이선스·개인정보처리방침·도움말), 개발자 메뉴, 진단 화면(개발 환경 전용).
- **다국어·디자인·웹**: 화면 한글은 `src/i18n/catalogs/ko/`에만 둔다(062). 서체는 정적 Pretendard v1.3.9 OTF 5종(400~800)이다(083). 디자인 토큰 정본은 `design/tokens.json` 하나이고 앱(`src/ui/theme/tokens.ts`)과 웹(`site/assets/tokens.css`)이 함께 쓴다(089). 개인정보처리방침·지원은 `site/`에서 배포하며 `__tests__/privacy/`가 잠근다(086).
- **검증·배포**: 안드로이드(SM-S901N·SM-G986N)와 iOS 실기기(iPhone 14, iOS 27.0.1, 087)에서 검증 중이다. Play 내부 테스트(076)와 TestFlight(075) 업로드는 GitHub Actions 수동 워크플로로 한다.

## 지금도 유효한 실측 규칙 (헌법 원칙 V — 값을 다시 재지 않도록)

### 안드로이드·iOS·Expo·네이티브

- **Android 걸음 수**: `expo-sensors`의 `getStepCountAsync`는 iOS 전용이라 Android 걸음 수는 `unknown`이 정상이다.
- **`expo-media-library`와 장소 권한**: `ACCESS_MEDIA_LOCATION` 조회 API가 없어 `getLocation()`을 감싸 호출해야 안다. 그래서 **「장소」 권한은 사진 권한에 묶인다.** `Asset.getUri()`는 `file://` 경로를 준다. Android 14+ 부분 허용(`limited`)은 `describePhotoAccessLimit`가 `"partial"`을 준다.
- **`reverseGeocodeAsync` 좌표 외부 전송**(086): 안드로이드는 위치 권한이 없으면 예외를 던지고(`geocoding-port.ts`가 삼킴), **iOS는 위치 권한을 보지 않고 좌표를 보낸다** — 설정 「켬」은 권한과 무관하게 보내고, 기본값 「자동」에서만 위치 권한 거부가 전송을 막는다. 백그라운드는 지오코딩하지 않는다.
- **★ `expo-file-system` `File`에는 비동기 호출(`text()`·`bytes()`·`move()`·`copy()`)을 쓰지 않는다 — `*Sync()`다**(067·073). 비동기 도중 GC가 네이티브 공유 객체를 먼저 놓아 실패한다(`__tests__/diary/expo-file-sync.test.ts`). 사진 읽기에서도 `Asset` 참조를 캡션 루프 동안 유지한다(073).
- **★ RN 전역 `fetch`는 `res.body`가 언제나 `undefined`다**(041). 큰 모델은 `DownloadTask`에 `headers: { Range }`를 줘 `.seg<i>`로 받고 `COPY_CHUNK_BYTES`(1MiB)씩 옮겨 붙인다(`__tests__/models/download-memory.test.ts`).
- **★ `await import("react-native")`는 iOS에서 앱을 죽인다**(066·068). `PushNotificationIOS` getter가 크래시하므로 호출 시점 `require`로만 읽는다(`__tests__/onboarding/no-react-native-dynamic-import.test.ts`).
- **★ iOS Hermes `formatToParts` 버그**(066): `GMT+9`의 「9」를 `minute`으로 돌려줘 datepicker `onChange`가 전날 23:51이 되므로 변환은 `src/app/calendar.ts`의 `dayDateFromPicker()`만 쓴다.
- **iOS 컨테이너 UUID 변경**(066): 업데이트·재설치마다 바뀌므로 리사이즈 사진 경로는 `fileStore.load()`가 `rehomeResizedPath()`(`src/diary/photo-path.ts`)로 현재 컨테이너 위치로 옮긴다.

### 화면·레이아웃·서체·동작

- **안전 영역·키보드·worklets**: `react-native-safe-area-context` + 루트 `SafeAreaProvider`를 쓴다. Android 16 edge-to-edge에서는 `KeyboardAvoidingView behavior="padding"` + `keyboardVerticalOffset`(48)이 필요하다(047). `babel.config.js` 마지막에 `react-native-worklets/plugin`이 있어야 reanimated가 돈다(033).
- **움직임·레이아웃**:
  - 크로스페이드 공유값은 겹마다 `key`로 새로 마운트하고 `useSharedValue(from)`으로 시작한다(`FadeLayer`, 049). 끌린 자리는 `useLayoutEffect`에서 되돌린다.
  - 쓴 날 스크롤 접힘(052): 스트립은 절대 배치 불투명 판(`StripOverlay`)으로 두고 지면 맨 위에 같은 높이의 `FoldSpacer`를 둔다(프레임 경계 진동 방지). 1px 미만의 `onContentSizeChange`는 거른다.
  - 가로 캐러셀에는 `.failOffsetY([-10, 10])`과 `onProgressChange` 반올림(`indexAtProgress`)을 쓴다(051). 탭 판정은 이동 거리 10 이내(`isTap`, 067).
  - `StackLayer`가 홈을 덮은 동안 아래 겹은 `BackHandler`를 등록하지 않는다(`covered` / `active={false}`, 055). `flexWrap: "wrap"` + `minHeight` 행에는 `alignContent: "center"`도 준다.
  - 큰 숫자(62·48)는 `useFontScale()`(`src/ui/font-scale.ts`)을 선형으로 곱하고 `allowFontScaling={false}`로 둔다(060). `Dialog.tsx`는 안전 영역 인셋 안에서 스크롤된다(056).
- **강조 색 대비(088·089)**: 빨간(`COLORS.accent`) 면 위 글자는 `accentForeground`(3.76:1)다. **밝은 면(`bg`·`surface`·`WRITTEN_DAY.paper`) 위 작은 강조 글자와 웹 링크·강조에는 `COLORS.danger`(`#ae1800`, 6.41:1)를 쓴다**(`settings-screen.test.tsx` C2, `design/tokens.json` `contrast`).
- **서체(083)**: `src/ui/theme/tokens.ts`의 `FONT`·`TEXT_FONT`에서 정하며, `AppText`·`rnr/text.tsx`·`NameField`와 대화상자 `Title`·`Description` 래퍼가 `TEXT_FONT`를 맨 앞에 둔다(`__tests__/config/font-rules.test.ts`). 고정폭(`monospace`·`Menlo`) 금지, 숫자 정렬은 `fontVariant: ["tabular-nums"]`, `AppText` 기본은 `lineBreakStrategyIOS="hangul-word"`다(066).

### 추론·프롬프트·VLM·백그라운드

- **`llama.rn` 경계와 해제 순서(079)**: `llama-port.ts`는 `timings`·`tokens_predicted`를 버리고 `{ text, ending }`만 내보낸다(원칙 IV). 호출은 `completion({ messages: [...], jinja: true })`로 하며, `stopCompletion()`은 `interrupted: true`로 resolve된다. **`unload()`는 `inFlight` 생성이 모두 끝난 뒤에야 `release()`를 부른다**(기다리지 않으면 네이티브 5초 타임아웃 뒤 행렬 곱 도중 SIGSEGV가 난다).
- **조립 주체별 스레드·시간 한도**(`src/inference/assembly.ts`, 079): 화면 조립은 기본 스레드·한도 **180초**다. 백그라운드 조립은 안드로이드에서만 **`n_threads: 2`**(작은 코어 3개 경합 해소), 시간 한도는 두 플랫폼 모두 **600초**다(`engine.run()` 구간만 측정).
- **VLM 캡션(011·013·066)**: 타일링 청크 수를 줄이려 1024px로 리사이즈한다(013). `expo-image-manipulator`는 `file://`을, `llama.rn`은 순수 경로를 요구한다. **iOS에서는 `initMultimodal`에 `use_gpu: false`를 준다**(`projectorOnGpu: !isIOS()`, 066 — Metal 크래시 및 llama.rn #176 우회).
- **프롬프트와 판정(018·061·063·077)**: `promptPrefix()`는 `buildPrompt()`와 같은 `fixedHead()`에서 나오며 **호칭 줄을 빼면 안 된다**(P11). 문안 정본은 `my-ollama` `results/hand-prompt/v5/user-prompt.md`다(077). 꼬리 첫 문장은 시작 문장 틀을 품되 글자까지 같지 않게 하고, 금지문·「상상」·내부 오류 문자열을 넣지 않는다. `isEcho`는 줄 전체 + 지시 어미로 끝나는 16자 이상의 절(따옴표 안 제외)을 검사한다.
- **백그라운드와 삼성 `freecess` 얼림(024·079·085)**: `defineTask`는 모듈 최상단 동기 `require("expo-task-manager")`로 등록한다(024). 배터리 예외가 없는 삼성 기기는 화면이 꺼진 뒤 1분 만에 프로세스를 얼려(`freezer:/frozen`) 살아 있는 동안 잡과 예약 알람(`RTC_WAKEUP`)이 미뤄진다. 맞추기(`reminders.ts`)는 켜져 있고 안 쓴 사흘 안의 날이면 지난 시각의 예약을 지우지 않는다(085 RC8).

### 테스트 작성의 함정 (jest·RNTL·소스 계약)

- **계약 테스트는 주석을 먼저 걷어내고 소스를 읽는다**(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`).
- **상태·이유 문자열을 공유하는 두 부품은 실제 파이프라인·등록부를 묶은 조립으로 최소 한 번 테스트한다**(080·081·082). 방어 둘이 겹치면 각각을 홀로 빼 본다(082). 스쳐 지나가는 토스트는 렌더 횟수 대역으로 확인한다(080).
- **RNTL 14**: `render`·`fireEvent`·`rerender`를 반드시 `await`한다. 포털 대화상자는 `withPortal()`, fake timers에서는 `await act(async () => ...)`를 쓴다. 팬 제스처(`fireGestureHandler`)는 한 테스트의 한 렌더에서만 쏘며 `AppState.addEventListener` 스파이는 `mockRestore()`하지 않는다.

## 코드를 어디에 두는가

```text
src/
├── config/       환경 판정, 추론 위치 규칙, 하루 경계(00:00)
├── inference/    추론 어댑터(온디바이스/데스크톱), 샘플링, 조립 주체별 스레드·한도(assembly.ts)
├── signals/      하루치 신호. 사진·장소는 실제로 수집한다 (걸음·배터리·연결은 unknown)
├── vision/       사진 내용 캡션(011)과 시간 분포 선별(select.ts, 023). 캐릭터와 무관한 모델 하나
├── diary/        일기 모양, 파이프라인, 저장, 페르소나(014), 제목(061), 살아 있는 쓰기 등록부(live-write.ts, 080)
├── models/       캐릭터→모델 파일 매핑(roster.ts), 구간 내려받기·검증·삭제
├── schedule/     자동 쓰기 판정(auto-write.ts)·시도 창·따라잡기 상한(078)·쓸 차례 알림 계획·맞추기(085)
├── onboarding/   권한 요구 목록·판정·플래그 (021)
├── firstrun/     첫 실행 단계 판정 (040·045)
├── app/          화면이 쓰는 순수 상태·조립·훅 (wiring.ts, state.ts, material.ts, write-failures.ts …)
├── diagnostics/  진단 정보 수집과 프롬프트 미리보기(022)
├── i18n/         화면 문구 카탈로그(catalogs/ko/)·기기 언어 감지·해석 (062)
└── ui/           화면 (components/ 공용 부품, rnr/ 대화상자 프리미티브, theme/tokens.ts)

design/           디자인 토큰 정본(tokens.json)과 디자인 시스템 규칙 문서(DESIGN.md, 089)
site/             개인정보처리방침·지원·소개 정적 웹페이지 (GitHub Pages, 086·089)
plugins/          Expo config plugin (android/·ios/는 gitignore된 생성물)
scripts/          헌법 검사, 층 1·층 2 e2e 실행기, 30일 표본(e2e-sample/), 시딩(seed*, ios-seed/), 토큰 생성기
__tests__/        기기 불필요 테스트 (항상 돈다)
.maestro/         실기기·시뮬레이터 e2e 흐름
```

### 지켜야 할 경계

- **`process.env`는 `src/config/environment.ts`에서만 읽는다.** **추론 위치는 `src/inference/select.ts`에서만 고른다.** **`src/config/policy.ts`가 원칙 I의 방어선이다**(dev·prod에서 데스크톱 서버 금지).
- **하루는 기기 로컬 자정(00:00)에 바뀌고 오늘은 언제든 쓸 수 있다**(049). 경계는 `src/config/day-boundary.ts` 하나뿐이며 다른 파일에서 `getHours() ±`로 하루 기준을 옮기지 않는다(`DB11`). 함수는 모두 `now`를 인자로 받는다.
- **모르는 것을 기본값으로 채우지 않는다**(원칙 V). `SignalValue<T>`는 `known`/`none`/`unknown` 셋을 가른다. `src/signals/fake.ts`는 `src/ui/`에서 import하지 않는다.
- **화면에 보이는 한글은 `src/i18n/catalogs/ko/`에만 둔다**(062, 예외는 `scripts/constitution-rules.ts`의 `SCREEN_TEXT_ALLOWLIST`). `text()`는 모듈 최상단 상수에서 평가하지 않는다(`lazyText`·함수 사용). 문구 골든(`__tests__/i18n/ko-golden.test.ts`)은 다시 쓰지 않고 `ADDED_AFTER_GOLDEN`·`CHANGED_AFTER_GOLDEN`에 올린다.
- **프롬프트는 `src/diary/prompt.ts`에만 있다**(원칙 II). **출력 판정의 갈래는 `src/diary/acceptance.ts`의 넷뿐이고 늘리지 않는다**(원칙 I·IV). **실패가 텍스트를 반환하거나 생성 중인 글을 화면에 보여주지 않는다.**
- **`src/models/roster.ts`가 원칙 III의 최전선이다.** `src/ui/`는 `models/roster`·`ModelAsset`·`ESSENTIAL_ASSET_KEYS`·`diary/prompt`·`signals`에 직접 닿지 못한다. `src/vision/`은 `models/roster.ts`·`inference/sampling.ts`·`diary/store.ts`에 닿지 못한다.
- **`src/diary/live-write.ts`는 시각·타이머·파일·기기를 읽지 않는다**(080).
- **측정·채점 코드를 둘 자리는 없다**(원칙 IV). `scripts/check-constitution.mts`는 아키텍처·설정 경계 위반만 잡는다.

## 환경은 셋이다

| 환경    | 어디서                       | 추론                                                     |
| ------- | ---------------------------- | -------------------------------------------------------- |
| `local` | 개발자 기계 시뮬레이터       | 데스크톱 서버 (기본값), 실기기 연결 시 온디바이스도 가능 |
| `dev`   | 실기기·시뮬레이터, 개발 빌드 | 온디바이스만                                             |
| `prod`  | 실기기, 배포 빌드            | 온디바이스만                                             |

**Expo Go로는 실행할 수 없다**(`llama.rn` 네이티브 모듈). **★ macOS·SDK 57에서는 셸의 `EXPO_PUBLIC_APP_ENV=dev`가 Metro 번들의 `.env.development`(`local`)를 이기지 못한다**(066) — gitignore된 `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`를 두고 번들로 확인한다.

## 도구 사용법 — 실기기 검증과 e2e

1. **안드로이드 연결**: `~/Library/Android/sdk/platform-tools/adb` + `JAVA_HOME=/opt/homebrew/opt/openjdk@17` + `adb reverse tcp:8081 tcp:8081`. 네이티브·서체·플러그인이 안 바뀌었으면 기기의 debug APK를 지우지 않고 Metro 번들만 올린다(`pm clear`·재설치는 모델 ~2GB를 지운다). 플래그만 되돌릴 때는 `run-as com.a810labs.pocketlog`로 `files/preferences/*.json`만 고친다.
2. **매니페스트·네이티브 설정 변경 시**: 반드시 `npx expo prebuild --platform android --clean`을 먼저 돌리고 `adb shell dumpsys package com.a810labs.pocketlog`로 확인한다.
3. **iOS 시뮬레이터·실기기(066·068·087)**: `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`로 `xcodebuild`를 쓰고, `pod install` 시 `~/.netrc`가 644면 `NETRC=<빈 디렉터리>`를 앞에 준다. 시뮬레이터는 Maestro(`maestro --device <UDID> test <flow>`, 콜드 기동은 `MAESTRO_DRIVER_STARTUP_TIMEOUT=180000`, 설정 왕복은 `stopApp: false`)로 조작한다. 실기기 사진 시딩은 `npm run ios:seed`(`scripts/ios-seed/README.md`, 087)를 쓴다.
4. **Maestro 규칙과 층 1·층 2 e2e(069·070·073·084)**: 새 흐름은 `scripts/run-device-tests.mjs`의 `FLOWS`(및 `LAYER1_FLOWS`)와 [`docs/e2e/feature-flow-map.md`](docs/e2e/feature-flow-map.md)의 두 표에 함께 등록한다(`__tests__/e2e/flow-map.test.ts`). 전용 기기에서는 모델을 보존하는 `npm run test:layer1`·`npm run test:layer2`를 쓴다.

## release 빌드·서명·Google Play — 요청받았을 때만 탄다

> **⚠️ 기본 작업 흐름이 아니다.** 실기기 검증은 dev(debug) 빌드로만 하며, release 빌드·업로드는 저장소 소유자가 명시적으로 요청했을 때만 탄다.

- **GitHub Actions 수동 워크플로**(076): `.github/workflows/android-release.yml`(`main`). 보호 환경 `android-release`의 secrets 넷(`ANDROID_KEYSTORE_BASE64`·`ANDROID_KEYSTORE_PASSWORD`·`ANDROID_KEY_PASSWORD`·`PLAY_SERVICE_ACCOUNT_JSON`)으로 `bundleRelease`(arm64-v8a) → 서명 지문(`scripts/android-release/upload-key.sha256`) 대조 → `scripts/android-release/play-upload.ts`로 Play 내부 테스트 업로드를 수행한다(`__tests__/ci/android-release-workflow.test.ts`).
- **올리기 전에**: `app.json`의 `android.versionCode`를 1 올려 커밋하고, 실제 모델로 쓰는 경로를 [docs/e2e/layer2-release-checklist.md](docs/e2e/layer2-release-checklist.md)(`npm run test:layer2` + 일기 본문 읽기 + 사람이 보는 항목)로 확인한다. 제외 권한(`blockedPermissions`): `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`·`SYSTEM_ALERT_WINDOW`(065).

## iOS 빌드·서명·TestFlight — 요청받았을 때만 탄다

- **수동 서명과 entitlements**(066): 개인 Apple Developer Program(팀 `PGNGG84B39`), 수동 서명(`Apple Distribution` + `Pocketlog App Store` 프로파일, 로컬 `~/.pocketlog-signing/ios/`). entitlements는 `increased-memory-limit` 하나뿐이며 `aps-environment`는 `plugins/with-no-push-entitlement.js`가 걷는다. `NSMotionUsageDescription`은 유지한다(ITMS-90683).
- **GitHub Actions 수동 워크플로**(075): `.github/workflows/ios-release.yml`(`main`). 보호 환경 `ios-release`의 secrets 여섯(`IOS_DIST_P12_BASE64`·`IOS_DIST_P12_PASSWORD`·`IOS_PROFILE_BASE64`·`ASC_API_KEY_P8`·`ASC_KEY_ID`·`ASC_ISSUER_ID`)으로 아카이브·`altool` 업로드를 수행한다(`__tests__/ci/ios-release-workflow.test.ts`).
- **올리기 전에**: `app.json`의 `ios.buildNumber`를 1 올려 커밋한다. 안드로이드 쪽 층 2 확인은 [docs/e2e/layer2-release-checklist.md](docs/e2e/layer2-release-checklist.md)를 따르고, 업로드 후 TestFlight 실기기 동작을 확인한다.

## 테스트

| 명령                  | 무엇                                                            | 기기                     |
| --------------------- | --------------------------------------------------------------- | ------------------------ |
| `npm test`            | 기기 불필요 갈래 전부 (`logic` + `ui`)                          | 필요 없음. **항상 돈다** |
| `npm run test:logic`  | 순수 로직만 (`.ts`, `node` 환경) — 개발 중 기본                 | 필요 없음                |
| `npm run test:ui`     | 화면만 (`.tsx`, `jest-expo`)                                    | 필요 없음                |
| `npm run test:layer1` | 실기기 화면 흐름 e2e (생성 없음, 기준 상태·30일 표본 자동 보장) | 전용 테스트 기기         |
| `npm run test:layer2` | 실기기 실제 모델 생성 스모크 4종                                | 전용 테스트 기기         |
| `npm run lint`        | eslint + tsc + 헌법 검사 + prettier 포맷 검사                   | 필요 없음                |

- **건너뛴 실기기 테스트는 통과가 아니다**(헌법 원칙 V). 기능이 끝났다고 말하려면 **dev(debug) 빌드**로 실기기에서 최소 1회 확인한다.
- **jest 두 프로젝트 구분**: `.ts`는 `logic`, `.tsx`는 `ui`다(`__tests__/jest-projects.test.ts`). 개별 파일은 `npx jest <경로> --selectProjects logic`으로 부르며, 워커 수는 `npx jest --maxWorkers=2`로 직접 부른다.

## Expo 작업 시

패키지 버전을 추측하지 않는다. **Expo SDK 57**(RN 0.86 + `llama.rn`)을 유지하며, 공식 문서나 context7(`/expo/expo`)로 확인한 뒤 `npx expo install --check`로 검증한다.

## 작업 습관

- 커밋 메시지는 한국어로 쓴다(헌법 「개발 방식」). 계약을 먼저 정하고 테스트를 먼저 쓴다.
- **화면·페이지·문서 같은 디자인 산출물을 만들기 전에 [design/DESIGN.md](design/DESIGN.md)를 먼저 읽는다** — 토큰의 정본은 `design/tokens.json` 하나이고 앱·웹이 그것을 쓴다(089).
- **`main`에서 직접 작업하지 않는다.** 기능마다 브랜치를 파고 PR로 머지한다. **작업을 시작하기 전에 `git branch --show-current`로 지금 브랜치를 눈으로 확인한다**(`.githooks/pre-commit`·`pre-push`).
- **한 축을 깊게 파고들고 싶어지면 그것이 실패 신호다.**
- **위반 주입으로 방어를 검증한다.** 새 규칙을 세울 때마다 실제로 어겨 보고(치환이 적용됐는지 먼저 단언) 테스트나 헌법 검사가 잡는지 확인한 뒤 되돌린다.
- **경계를 옮기거나 유니온을 좁힐 때는 `tsc` 0을 완료 조건으로 삼고, 같은 규칙의 복제가 다른 파일에 있는지 소스를 센다.**
- **보드·스펙을 옮기는 일은 원문 대조를 계약 테스트에 넣는다.**
