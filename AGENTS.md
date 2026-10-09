# 헌법을 먼저 읽는다

이 프로젝트가 무엇이고 무엇을 지켜야 하는지는 [.specify/memory/constitution.md](.specify/memory/constitution.md)에
있다. **작업을 시작하기 전에 그것을 읽는다.** 이 문서는 헌법을 요약하지 않으며,
헌법이 담지 않는 실무 사실만 남긴다. 둘이 어긋나면 헌법이 우선한다.

한 줄로 말하면: **주인의 휴대폰이 화자가 되어 하루를 일기로 쓰는 앱**이다. 사람이
쓰는 일기가 아니다. 나머지는 헌법에 있다.

**이 문서에는 지금도 유효한 결론과 아직 남은 위험만 둔다.** 기능별 상세 실측 로그
(좌표·시각·빌드 시간·테스트 개수·위반 주입 목록)는 `specs/0xx-*/`와 git 히스토리에
있다. **뒤의 기능이 앞의 결정을 뒤집으면 앞의 서술을 주석으로 덧대지 않고 고치거나
지운다** — 이력이 결론처럼 읽히면 이 문서가 스스로 모순된다.

## 저장소의 현재 상태

2026-08-12에 이전 저장소를 되돌렸다(측정 장치와 제품이 뒤섞였던 것이 원인 — 헌법
원칙 IV가 된 경위). 같은 날 헌법을 새로 세우고 뼈대를 세웠다. 지금은 다음이 된다:

- **온디바이스 일기 생성** — 프롬프트 조립 → `llama.rn` 추론 → 4갈래 판정
  (`empty`/`echo`/`language`/`unfinished`) → 저장. 사진은 VLM이 먼저 읽는다.
- **백그라운드 자동 생성과 알림**, **통합 첫 실행 흐름**(로고 → 권한 → 다운로드 동의·
  진행 → 작명 → 자동 첫 일기), **캐릭터 페르소나**(로스터는 검증된 하나, 037).
- **홈 UI/UX 개편(Modernist)이 조각 단위로 진행 중이다**(049~054): 주간 스트립·날짜
  달력·쓴 날 읽기·읽기 스크롤·쓸 재료·제자리 쓰기.
- **설정·개발자 화면 개편**(055~060·064): 홈 위에 쌓이는 설정 틀, 매일 쓰는 시각·장소 이름 대화상자, 자동 쓰기 규칙
  (재료 없는 날·사진 권한 없는 날 건너뜀, 앱을 열면 쓰는 중), 이 휴대폰(모듈 용량·일기 모두 지우기), 개발자 메뉴(버전 7번 탭·모듈 상태·모듈 다시 받기·온보딩부터
  다시·끄기), 진단 화면(보드 `6h`의 일곱 묶음·한 번 써 보기·최근 쓰기 실패), 상태 흉내(개발 환경 — 홈 표시만 바꾸고 흉내 중엔 쓰지 않음). 분해 설계
  `docs/superpowers/specs/2026-10-01-settings-developer-decomposition-design.md`의 조각 일곱이 모두 들어갔다.
- **화면 문구는 언어별 카탈로그에서 온다**(062): `src/i18n/` — 지원 언어는 한국어 하나, 기기 언어를 읽어 고르고 없으면 한국어.
- **쓴 날의 사진을 누르면 확대 화면**(067): 핀치·두 번 탭·이동, 배율 1에서 가로 넘김·아래로 끌어 닫기.
- **이름은 포켓로그(Pocketlog), 패키지는 `com.a810labs.pocketlog`다**(065) — Google Play 내부 테스트로 배포를 준비 중이다. 절차는 아래 「release 빌드·서명·Google Play」.
- **iOS는 시뮬레이터에서만 돌아 봤다**(066, 2026-10-08) — 첫 실행부터 일기 저장까지 간다. **실제 iPhone은 한 대도 없다**(메모리 한도·속도·백그라운드·TestFlight 미확인).
  절차와 함정은 아래 「iOS 시뮬레이터」.

**이전 작업의 결론을 기억에서 꺼내 복원하지 않는다.** 헌법에 적힌 것만이 확정이다.
헌법에 없는 이전 결론은 되돌려진 것이며, 복원하면 되돌린 의미가 없어진다.

## 지금도 유효한 실측 규칙 (헌법 원칙 V — 값을 다시 재지 않도록)

### 안드로이드·Expo·기기

- **Android에는 기간 걸음 수를 되짚는 통로가 없다.** `expo-sensors`의
  `getStepCountAsync`는 iOS 전용이라 걸음 수는 `unknown`이 정상 상태다.
- **`expo-media-library`는 `ACCESS_MEDIA_LOCATION` 조회 API를 주지 않는다.** 좌표
  권한이 있는지는 `getLocation()`을 실제로 불러 봐야 안다 — 권한이 없으면 `null`이
  아니라 예외를 던지므로 반드시 감싼다. 그래서 **「장소」의 권한은 사진 권한에 묶인다**
  (장소 수가 사진 EXIF에서 나온다).
- **`Asset.getUri()`는 `file://` 경로를 준다**(`content://`가 아니다) — 이 기기에서
  `folderNameOf()`의 `content://` 분기는 dead path다.
- **`reverseGeocodeAsync`는 위치 권한이 있어야 지명을 준다**(안드로이드도). 없으면
  예외 → `geocoding-port.ts`가 삼킨다.
- **Android 14+의 부분 사진 허용(`limited`)이 실제로 온다** —
  `READ_MEDIA_VISUAL_USER_SELECTED`만 granted. `describePhotoAccessLimit`가
  `"partial"`을 주고 `visiblePhotoCount` 분기는 이 기기에서 dead path(구형 대비 유지).
- **`react-native`의 `SafeAreaView`는 안드로이드에서 no-op다.** `react-native-safe-area-context`
  + 루트 `SafeAreaProvider`가 필요하다. 조용히 실패하는 버그라 화면을 눈으로 봐야 드러난다.
- **★ edge-to-edge(Android 16)에서는 `adjustResize`가 있어도 키보드가 레이아웃을 줄이지
  않는다.** 세로 중앙 배치의 입력줄이 키보드 뒤로 숨는다 — `KeyboardAvoidingView
  behavior="padding"` + 하단 내비게이션 바 높이만큼 `keyboardVerticalOffset`(48)이 필요했다.
  키보드 위에 무언가를 두는 화면은 실기기에서 키보드를 연 채로 본다.
- **release는 `run-as`가 안 된다**(`package not debuggable`). 재부팅 뒤에는 첫 잠금 해제
  전까지 debug도 `run-as`가 실패한다(Direct Boot) — 데이터 손실이 아니다.
- **서명이 다르면 덮어 설치가 거부되고, 지우면 일기·모델이 함께 사라진다**
  (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). debug↔release 전환, 서명 키 교체 모두에서 관측됐다.
- **release 빌드에서 R8/minify는 현재 꺼져 있다**(`enableMinifyInReleaseBuilds` 기본
  `false`, 027). 켜면 동적 `import`·`llama.rn` JNI 심볼·모듈 최상단 부수 효과가 깨질 수
  있으나 실측한 적 없다.
- **이 기기(SM-G986N)는 GPU/NPU 추론 경로를 못 쓴다** — `hasDotProd && hasI8mm &&
  hasHexagon && hasAdreno`가 모두 참이어야 하는데 `i8mm`이 없다(ARMv8.2). 다른 기기는 다를 수 있다.
- **`babel.config.js`에 `react-native-worklets/plugin`이 없으면 reanimated가 조용히 안
  돈다**(오류 없이 애니메이션만 안 된다). 플러그인은 `plugins` 배열의 마지막.
- **★ React Native의 `fetch`는 응답 스트림을 주지 않는다 — `res.body`가 언제나 `undefined`다**
  (041). 전역 `fetch`는 XHR 기반 `whatwg-fetch` 폴리필이라 `ReadableStream`이 없다.
  `res.body.getReader()`로 스트리밍하려는 코드는 웹에서 옳고 여기서 조용히 반대 갈래
  (`arrayBuffer()` 폴백)를 타 구간 하나(약 380MB)를 통째로 힙에 올린다 → `OutOfMemoryError`
  (힙 한계 268MB). jest 대역은 `body`를 주므로 기기 없는 테스트가 죽은 쪽을 검증한다 —
  소스를 읽어 「쓰지 않아야 할 API」를 잠그는 계약 테스트(`__tests__/models/download-memory.test.ts`)가
  유일한 통로다. 큰 파일은 `expo-file-system`의 `DownloadTask`에 `headers: { Range }`를 준다
  (네이티브가 디스크에 직접 쓴다).

- **★ 짧게 사는 `expo-file-system` `File` 객체에 비동기 호출(`text()`·`bytes()`·`move()`·`copy()`)을 쓰지 않는다 — `*Sync()`다**(2026-10-09).
  `File`은 네이티브 공유 객체라 비동기 호출 도중 JS 참조가 끝나면 GC가 먼저 놓아 「Cannot use shared object that was already released」로
  거부된다 — `file.exists ? file.text() : null` 꼴이 열세 곳에 있었고, 강제 종료 후 콜드 스타트에서 멀쩡한 일기가 「손상됐어요」로 보였다
  (A/B: `text()` 12회 중 5회, `textSync()` 0/15). GC 시점에 달려 가끔만 나고 jest에는 이 런타임이 없다 — 소스를 세는 계약
  `__tests__/diary/expo-file-sync.test.ts`가 막는다. 재현은 Metro를 `CI=1`로 띄웠을 때 잘 됐다(감시를 끈 Metro가 메모리 사정을 바꾼다는 짐작).

### 추론·프롬프트

- **`llama.rn`의 `completion()`은 요청하지 않아도 `timings`·`tokens_predicted`를 준다.**
  원칙 IV가 금지한 값이 밀려 들어오므로 `llama-port.ts`가 경계에서 버린다(`{ text, ending }` 둘뿐).
- **평문 프롬프트로는 빈 글만 나온다** — `completion({ messages: [...], jinja: true })`로 보낸다.
- **`stopCompletion()`은 거부시키지 않는다.** `interrupted: true`로 정상 resolve되므로
  `try/catch`로 끊김을 잡으려 하면 놓친다.
- **생성 시간 한도(180초)는 모델 적재를 재지 않고 `engine.run()` 구간만 잰다**
  (`on-device.ts`의 `runWithTimeout()`). 헤드리스·Doze에서는 JS 타이머가 억제돼 이 가드가 무력하다(024).
- **캐릭터·기기에 따라 생성 시간이 크게 벌어진다.** `quiet`(kanana 2.1B) 웜 2~3초, 옛
  `narrative`(exaone 2.4B) 콜드 242초까지 관측됐다 — 이 격차가 로스터 축소(037)의 한 근거다.
- **원칙 II 위반(기록에 없는 것을 단언)은 반복 관측되며 특정 캐릭터에 국한되지 않는다.**
  매번 프롬프트 쪽을 고치되 판정 갈래는 늘리지 않는다(원칙 IV) — 014에서 「확실하지 않은
  것은 짐작의 말투로」 규칙을 넣어 교정했다. 신호가 없는 하루의 일기가 서로 닮는 것은
  정상이다(입력이 같으면 출력이 닮는다) — 다양성을 넣으려는 순간 지어내기가 시작된다.
- **★ 프롬프트 접두사(018)에서 호칭 줄을 빼면 안 된다.** 접두사의 캐릭터별 값은 이름과 출력
  언어뿐이라 이름을 빼면 같은 언어 캐릭터들의 접두사가 같아져 「캐릭터를 바꿔도 이전 KV
  캐시를 재사용한다」가 발생한다(P11). 반대로 **이름이 바뀌어 접두사가 바뀌는 것은 문제가
  아니다** — KV 캐시가 부분 재사용되어 느려질 뿐 틀리지 않는다(E10). 무효화 로직을 만들지
  않는다(「언제 무효화하는가」를 재게 되어 원칙 IV다). 로스터가 하나인 지금 P11은 둘째
  캐릭터가 들어올 때를 위한 `FUTURE_CHARACTER` 계약이다(037).
- **VLM 캡션이 느린 원인은 타일링이다, 파일 크기가 아니다** — 아래 「VLM 캡션 60초의 원인」.

### 조용히 실패하는 결함의 계열 — 기기 없는 테스트가 못 잡는다

이 저장소에서 반복된 가장 비싼 실패 유형이다. **jest는 타입을 지우고, 네이티브·OS·레이아웃·
타이밍·리렌더가 없으며, reanimated 등을 목으로 바꾼다.** 오류 없이 잘못된 갈래를 타므로
기기 없는 테스트가 전부 초록이어도 실기기에서만 드러난다:

- 011 `has_media=0`(contentUri를 네이티브가 못 열어 사진을 안 보고 일기가 나옴)·013 URI 계약
  불일치(`expo-image-manipulator`는 `file://` 요구, 011은 순수 경로 — 입력에 붙이고 출력에서
  떼는 두 단계 모두 필요, 예외 없이 `{ ok: false }`로 감싸져 `console.log`를 단계마다 심어야 보임)
- 020 헤드리스 `defineTask` 미등록(024) · 041 `res.body` · 033 worklets 플러그인
- 040 권한 결정 뒤 `completed` 미저장·자동 생성 뒤 홈이 목록을 안 다시 읽음
- 043 `busy` stale closure · 045 liveness 실패 화면이 막다른 길 · 047 키보드 · 049 effect가
  애니메이션 시작값을 되돌려 한 프레임이 샐 때 · 052 `onLayout` 되먹임 · 053 사진 0장이 「0 장 · 모름」

**처방은 하나다: 기능이 끝났다고 말하기 전에 실기기에서 실제 경로를 한 번 본다**(원칙 V).
「화면을 떠나는 자리가 바뀌면 그 화면이 저장하던 것도 함께 옮겨야 한다」·「검증 경로가 제품과
다르게 동작하면 그 검증은 제품을 재현하지 못한다」도 같은 계열의 교훈이다. 새 흐름을 만들 때
설계가 기대던 기존 계약 테스트(소스를 읽는 것)를 먼저 읽는다.

### 테스트 작성의 함정 (jest·RNTL·소스 계약)

- **계약 테스트는 소스 선언을 직접 읽는다** — `tsc`만 잡는 위반(타입·인자 개수)이 있고
  `Function.length`는 기본값 인자를 세지 않는다. **소스를 읽을 때는 주석을 먼저 걷어낸다**
  (`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`) — 이 저장소의 주석은 무엇을
  왜 금지하는가를 적으므로 금지어가 설명 안에 정당하게 나온다. `scripts/constitution-rules.ts`도 줄 단위로 걷는다.
- **`tsc`는 유니온을 좁히는 위반만 잡고 넓히는 위반은 못 잡는다**(042: `"none"`을 되살려도 0 오류).
  「고를 자리가 없다」는 소스를 읽는 테스트가 유일한 방어다. 반대로 유니온을 좁히면 `tsc`가
  변경 대상을 전부 짚으니 손으로 찾지 않는다(037·042).
- **RNTL 14는 `render`·`fireEvent`·`rerender` 모두 Promise를 반환한다** — `await` 없이는 flush되지
  않고 「`render` function has not been called」라는 엉뚱한 오류가 난다. 쿼리는 `screen.*`. 기본
  쿼리는 접근성에서 숨은 요소를 빼므로 「접혔다」의 증거는 `includeHiddenElements: true`와
  `pointerEvents`다. `UNSAFE_root`는 없다(`screen.queryAllByRole("button")` 등으로 대신).
  `it` 안에서 `render`를 두 번 부르고 손으로 `unmount()`하면 뒤 테스트의 `screen`이 어긋난다.
- **reanimated는 jest에서 손으로 쓴 목이 필요하다**(`jest/setup-ui.ts`). 공식 목도 실제 index를 다시
  import해 죽는다. 대가로 눌림·애니메이션 테스트는 「배선됐는가」만 검증하고 「움직이는가」는
  못 한다. gesture-handler는 (1) 목에 `useEvent`·`setGestureState`가 필요하고 (2) **앞 테스트에서 팬을
  쏜 뒤 새로 렌더한 것에 `fireGestureHandler`를 쏘면 앞 핸들러가 불린다** — 팬 배선은 한 테스트의
  한 렌더에서만 쏘고 문턱 판정은 순수 함수로 잠근다. `jestSetup.js`는 `jest/setup-ui.ts`에서 require한다.
- **`Pressable`의 `onPressIn`/`onPressOut`은 host props에 안 남는다**(responder로 컴파일) —
  `fireEvent(node, "pressIn")`이나 소스로 확인한다. **RN `Pressable`은 `disabled={false}`로 호출부의
  `accessibilityState.disabled`를 덮어쓴다** — 공용 `Button`이 `disabled={disabled || undefined}`를 넘긴다.
- **`ScrollView`의 `onMomentumScrollEnd`는 테스트에서 전달되지 않는다** — `onScroll` + `fireEvent.scroll`은 된다.
  **여러 텍스트 조각이 한 `<Text>`에 있으면 `testID`가 접근성 트리에 안 나온다** — `accessibilityLabel`
  + 자식을 템플릿 리터럴 하나로 합친다(025).
- **RN 리스트의 `key`는 위치여야 한다**(표시 문자열이면 이름을 바꿀 때 줄이 리마운트되어 편집 중 로컬
  state가 사라진다, 035). jest는 리렌더를 자동으로 안 시키므로 `rerender()`로 부모 갱신을 흉내낸다.
- **`@rn-primitives`는 설치본이 JSX를 그대로 담아** `ui` 프로젝트 `transformIgnorePatterns`에 넣어야 한다.
  포털 테스트는 `__tests__/ui/render-with-portal.tsx`(`rerender`도 `withPortal()`). RN jest 목의 `measure`는
  콜백을 안 불러 드롭다운은 열리지 않는다. datepicker의 타입 선언과 실제 값이 다르다(`day.date`·
  `disabledDates` 인자는 dayjs 객체) — 변환은 `app/calendar.ts`의 `dayDateFromPicker()` 한 곳.
- **위반 주입은 치환이 실제로 적용됐는지 먼저 단언한다**(prettier가 줄을 합쳐 놓으면 치환이 조용히
  안 먹는다). 정규식이 든 테스트를 스크립트로 생성하면 이스케이프(`\b`→백스페이스)가 무력화하니
  결과 파일을 다시 읽는다. 일괄 `sed` 치환은 같은 문자열의 다른 뜻(`kind: "none"`)을 구분하지 못한다.
  **이 저장소에서 python으로 파일을 쓰면 Windows가 CRLF로 바꾼다** — `open(..., newline="\n")`.
- **`jest-expo`의 `AppState.addEventListener` 스파이를 `mockRestore()`하면** 이후 테스트의 구독 반환값이
  `undefined`가 된다 — 복원하지 않는다.

## 도구 사용법 — 실기기 검증 전에 (실측으로 얻은 것)

네 가지가 갖춰져야 Maestro 실기기 테스트가 돈다. 하나라도 없으면 화면에 값이 멀쩡히 있어도 실패한다.

1. **Metro가 dev 환경으로 떠 있어야 한다** — `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`.
   **Expo는 `NODE_ENV`로 env 파일을 고르지 `EXPO_PUBLIC_APP_ENV`로 고르지 않는다** — 변수를 셸에서
   직접 준다(`@expo/env`의 `load()`는 이미 설정된 `process.env`를 보존한다).
   **★ macOS·SDK 57에서는 셸 변수가 번들에 들어가지 않았다**(066, 2026-10-08): Metro가 `.env*` 파일을 **각각 모듈로 번들에 싣고**
   (`__d(…, ".env.development")`) 런타임에 고른다. `export EXPO_PUBLIC_APP_ENV=dev` 뒤 `--clear`로 띄워도(Metro 로그는 셸 값을
   존중해 파일 값을 export하지 않는 것처럼 보인다) 앱은 `.env.development`의 `local`로 떴다. 번들이 `local`이면 온디바이스 엔진이
   조립되지 않아 **liveness가 조용히 실패하고 쓰기가 `not-implemented`**로 끝난다. gitignore된 `.env.development.local`에
   `EXPO_PUBLIC_APP_ENV=dev` 한 줄을 두면 그 모듈이 이긴다(실측). **번들을 믿지 말고 본다** —
   `curl -s "localhost:8081/index.bundle?platform=ios&dev=true" | grep -B1 '"EXPO_PUBLIC_APP_ENV"'`에 `.env.development.local` 모듈이 있어야 한다.
2. **기기 잠금이 풀려 있고 화면이 켜져 있어야 한다** — `adb shell dumpsys trust`의 `deviceLocked=0`.
   PIN은 사람이 넣는다.
3. **한글 검증 문구는 `-Dfile.encoding=UTF-8`이 있어야 읽힌다**(한국어 Windows는 CP949).
   `run-device-tests.mjs`가 이미 넣는다.
4. **테스트 전 앱 초기화(대치 + `pm clear` + 재시작)** — 다시 설치(uninstall)하지 않는다(시간 낭비).
   버전 확인 없이 dev 빌드 APK로 대치하고 데이터를 날린 뒤 다시 시작한다. `run-device-tests.mjs`가
   기기 연결 시 자동으로 먼저 한다:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   adb shell pm clear com.a810labs.pocketlog
   adb shell am start -n com.a810labs.pocketlog/.MainActivity
   ```
   **`pm clear`는 모델 파일(~2GB)·일기·설정을 지운다.** 모델·일기를 보존해야 하면 `pm clear` 없이
   `welcomeShown` 등 플래그 파일만 고친다(`files/preferences/onboarding.json`; JSON을 `adb shell "echo {...}"`로
   쓰면 셸이 중괄호·따옴표를 먹으니 로컬 파일을 `adb push /data/local/tmp/` 한 뒤
   `cat … | run-as <패키지> sh -c 'cat > …'`). `clearState`도 앱 데이터만 지우고 **OS 권한은 그대로**라
   사진·위치·알림이 이미 부여된 기기에서는 그 단계가 자동으로 지나간다.

### 빌드·연결

- **`adb reverse tcp:8081 tcp:8081`이 USB·무선 관계없이 필요하다.** 없으면 debug APK가 `Unable to load script`로
  죽는다. 재부팅으로 사라지므로 다시 건다.
- **Metro가 스테일이면 「Loading from localhost:8081...」에 영구히 머문다** — 오류 없이 영영 로딩 중이다.
  캐시 문제뿐 아니라 며칠 켜 둔 Metro가 번들을 못 서빙하는 경우도 있다(`/status`가 안 돌아옴, 포트 점유).
  프로세스를 종료하고 `npx expo start --clear`로 다시 띄운다.
- **`expo run:android`만으로는 매니페스트가 갱신되지 않는다.** `android/`가 있으면 prebuild를 건너뛴다 —
  `npx expo prebuild --platform android --clean`이 필요하고 `adb shell dumpsys package <패키지>`의
  `requested permissions`로 확인한다(빌드 성공이 매니페스트가 맞다는 뜻이 아니다).
- **Metro는 gradle 빌드가 끝난 뒤에 띄운다** — 빌드 중이면 파일 감시자가 중간 산출물을 잡으려다 exit code 7로 죽는다.
- **기기가 둘 붙으면 `adb shell`이 모호해진다** — `-s <시리얼>`. `adb`는 Windows 실행 파일이라 Git Bash의
  `/tmp`를 모르므로 `adb pull` 목적지는 `C:/…`. `adb shell` 줄 끝은 CRLF다(파일명 끝 `\r`을 걷어낸다).

### 화면 관찰·조작

- **`uiautomator dump`·`screenrecord`의 기기 경로(`/sdcard/…`)는 Git Bash에서 윈도우 경로로 바뀐다** —
  `MSYS_NO_PATHCONV=1`을 앞에 붙인다(없으면 녹화가 조용히 실패한다). 화면이 계속 움직이면 「could not get idle
  state」로 실패하니 `screencap`으로 본다. 녹화를 끝내기 전에 `adb pull`하면 `moov atom not found`다. 한글은
  콘솔에서 CP949로 뭉개지므로 UTF-8로 직접 써야 읽힌다.
- **움직임 결함은 스크린샷이 아니라 `screenrecord`(30fps) 프레임 추출로 본다.** 개발 기계에 ffmpeg가 없으면
  `pip install --target <임시 폴더> imageio-ffmpeg`가 실행 파일을 준다.
- **`adb shell input`**: 스트립을 넘긴 직후의 첫 `tap`이 먹히지 않을 수 있고, 빠른 `swipe`(300ms)는 지면을
  스크롤하지 못한 반면 1200ms는 됐다(손가락 입력에서의 원인은 모름). 접힌 뒤에는 스크롤 범위가 작아 큰
  스와이프가 한 번에 끝에 닿는다.
- **로고는 1.5초라 스크린샷으로 놓친다**(`LOGO_DISPLAY_MS`). 관찰하려면 상수를 일시적으로 올리고 되돌린다.
- **`AppState.currentState`와 `adb dumpsys`는 화면의 물리적 꺼짐을 보장하지 않는다** — 반복된 `dumpsys` 조회가
  화면을 깨운 적이 있다. `dumpsys activity`의 `ResumedActivity`도 화면이 꺼진 뒤 스테일하게 남는다.

### Maestro

- **기본 텍스트 매칭은 노드 전체와 맞춰 본다** — 부분 문자열은 정규식(`.*…*`)으로. `childOf`는 RN의 평탄화된
  접근성 트리에서 통하지 않으니 `testID`나 그 자리에만 있는 문장 전체로 대신한다(`testID`는 R8에서도 산다).
  글자가 겹치는 버튼(예: 「다시 쓰기」가 하단 바와 확인 대화상자에 둘)은 글자가 아니라 `id:`로 누른다.
- **`assertNotVisible`은 `timeout`을 받지 않는다**(파싱 실패). 사라짐을 기다리려면 `extendedWaitUntil`의 `notVisible`.
  `scrollUntilVisible`에만 `timeout`이 붙는다.
- **`scrollUntilVisible`은 대상의 위쪽 가장자리·제목에서 멈춘다** — 그 아래 요소는 개별로 스크롤해 올리고, 스크롤
  타겟은 실제로 봐야 할 것(예: 위치 표시)으로 준다. **행 높이가 바뀌면 문안·`testID`가 불변이어도 깨질 수 있다.**
- **★ NativeWind로 이관된 `Pressable`(`className` + `style` 병행)에서 `scrollUntilVisible` → `tapOn`이 엉뚱한
  좌표를 볼 수 있다**(035, 설정 탭 `author-rename-0`) — `uiautomator dump` 좌표는 정확하고 raw `adb input tap`은
  된다. `welcome-naming.yml`의 rename 블록이 이것으로 자동화 실패해 계약 테스트(`author-picker.test.tsx`
  W18·W19)와 raw-adb 검증으로 대체했다 — **알려진 실패이며 회귀가 아니다.**
- **어느 단계가 처음 뜨는지는 기기의 현재 권한 상태에 달렸다** — `id: "onboarding-step-photos"`를 박으면
  이미 부여된 기기에서 실패한다(`onboarding-step-.*` + skip-all 루프).
- **흐름의 `env:` 값은 `-e`를 덮어쓴다** — 기본값은 `${X || "…"}`로 준다. 「쓰고 있다」를 기다려 생성이 끝나기 전에
  PASS하지 않게, 쓰는 중 표식(`id: stop-button`)이 사라지길 기다린다.
- **흐름마다 따로 `maestro`를 부르면 흐름당 약 35초씩 기기가 멈춰 있다** — `run-device-tests.mjs`는 한 번의
  `maestro test`에 넘긴다(실패해도 다음 흐름으로 간다). 끊은 Maestro 직후 곧바로 다시 돌리면
  `DeviceServerDiedException`으로 전부 실패할 수 있다 — 한 번 더 돌린다. `clearState` 직후 Maestro 기기 서버가
  죽는 경우도 있어 그 흐름(`first-run-flow`)은 손으로 본다.
- **`run-device-tests.mjs`가 값(`-e WRITTEN_DAY=…` 등)을 안 넘기는 흐름은 실행기로 돌리면 실패한다**
  (`written-day-reading`·`reading-scroll`) — `maestro test`로 직접 돌린다.
- **⚠️ 새 Maestro 흐름은 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록해야 돈다.** 등록하지 않으면 파일이 있어도
  아무것도 검증되지 않은 초록불이다. 059가 `FLOWS` 밖 흐름을 모두 정했다 — 되살린 넷(`skeleton`·`prompt-preview`·`diary-body-screen`·
  `scheduled-diary-notification`)은 등록했고 폐기한 일곱은 파일을 지웠다(사유는 `FLOWS` 위 주석). 개발자·진단 화면에 닿는 흐름의 진입은
  `home-settings` → `settings-developer` [→ `developer-diagnostics`]이다(개발 환경은 7번 탭 없이 처음부터 켜짐).

### 백그라운드 작업 소크·헤드리스 관찰

- **`am force-stop`은 WorkManager 잡을 함께 취소한다** — 전경을 벗어나려고 쓰면 잡이 사라져 아무것도 안 도는 채
  시간만 흐른다(`dumpsys jobscheduler`에 항목 0개로만 드러난다). **홈 버튼을 쓴다.**
- **앱이 전경에 있으면 태스크가 아예 실행되지 않는다** — `BackgroundTaskScheduler.runTasks()`가 `inForeground`이면
  `runTasks: App is in the foreground`만 찍고 재예약한다. 그 플래그는 Activity start/stop에 반응하지 화면 on/off가
  아니다. 판정은 `wm_on_stop_called` 뒤에 `wm_on_resume_called`이 없는 라이프사이클 로그뿐이다. Doze가 깨져도
  라운드가 무효다.
- **`"skipped"`는 로그상 정상 완주와 구분되지 않는다**(`Worker result SUCCESS`, 020 B6) — 소크 판정은
  `files/diary/`의 새 파일과 개발자 탭 `결과:`를 함께 본다. 측정은 `adb logcat` + OS 조회를 사람이 문서로 옮긴다
  (검증 전용 로그 모듈은 만들지 않는다, 원칙 IV). 정오 직후 앱을 처음 띄우면 040의 첫 실행 트리거가 따로 돌아
  그날 일기를 먼저 쓴다(`decideSchedule`을 거치지 않는 다른 경로) — 결과를 시각으로 귀속시키지 않으면 오판한다.

## 기능별 핵심 결론

각 기능은 기기 없는 테스트와 최소 1회의 실기기(dev) 확인을 거쳤다(원칙 V — 「건너뛴 실기기 테스트는
통과가 아니다」). 뒤 기능이 뒤집은 부분은 지웠다.

### 007 — 캐릭터 선택·대기·목록

- **캐릭터를 사용자가 고른다**(`resolveSelection()`) — 고른 적이 없으면 준비된 것이 있어도 자동으로 고르지 않는다.
  고른 캐릭터가 준비를 잃으면 다른 것으로 옮기고 화면에 알린다(말없이 바꾸지 않는다).
- 그만두기 버튼이 있다. `ActivityIndicator`(RN 코어)에는 진행률 파라미터가 없어 이것이 원칙 IV의 방어가 됐다.
- **타입 방어는 `npm test`가 아니라 `tsc`에 있다**(jest는 타입을 지운다). 헌법 검사: `src/ui/`가 `models/roster`·
  `ModelAsset`에 닿지 못한다.

### 008 — 내려받기 충돌

- 「동시에 못 받는다」(실은 규칙인데 화면이 침묵)와 「받는 중에 다른 걸 누르면 멈춘다」(실은 화면에서만 사라짐)를
  고쳤다. 원인은 `App.tsx`의 반환값 버림·거부 요청에서도 도는 `setProgress(null)`·탭 전환 시 `Acquisition`
  인스턴스 소실 — 셋 다 오류 없이 「아무 일도 안 일어나는」 조용한 실패였다. `acquisition.ts`(비즈니스 로직)는 이미
  옳았고 판정만 `resolveDownloadView()` 순수 함수로 뗐다. 탭 밖에서도 `DownloadTask`는 이어진다.
- 알려진 빈자리: 받다 만 모델·로스터에서 빠진 모델은 앱 UI로 지울 수 없다(041이 구간 임시 파일은 `remove()`가 본다).

### 009 — 과거 하루 선택

- 일기는 하루에 하나, 그 하루만 쓴다. **고른 하루는 파일에 남기지 않는다**(시간이 지나면 저장된 값이 틀린 값이 된다;
  007의 캐릭터 선택과 의도적으로 다름). 이후 049가 화면의 선택 범위를 모든 지난 날로 넓혔고, 사흘(`selectableDays`)은
  백그라운드 재시도·알림 정리·018 미리 준비의 범위로만 남았다.
- `none`(사진이 실제로 0장)과 `unknown`(권한 없음)이 화면까지 다른 문구로 도착한다(004가 값에서 지킨 구분).

### 010 — 합성 하루를 기기에 심는 도구

- 개발 기계 스크립트가 지정한 하루의 사진을 MediaStore에 심고 앱은 평소처럼 읽는다(**앱 코드 변경 0줄**).
  `npm run seed:day -- <모양> <날짜>` / `seed:list` / `seed:clear`. 자동으로 치우지 않는다.
- **손으로 만든 EXIF는 미디어 스캐너가 무시한다** — 저장소의 실기기 템플릿 JPEG의 날짜·GPS 바이트만 길이를 유지한 채
  교체한다. **`scripts/samples/no-gps/`(2017 Galaxy)는 이 기기(Android 16)에서 `datetaken`이 NULL이 된다** →
  `with-gps/`를 먼저 쓴다(`pickNoGpsSample`, `patchLocation`은 안 부름). `patchDate`는 IFD0 `DateTime`도 덮어쓴다.
  심는 사진의 시각표 원점은 `SHAPE_CLOCK_ORIGIN_HOUR = 4`(하루 경계와 무관).
- **색인은 `content call --method scan_file` 하나뿐이다**(브로드캐스트·직접 update는 조용히 실패). `over-limit`(201장)은
  322초에 150장만 색인돼 지금 쓸 수 없다. `seed:day`는 아직 사흘 안에만 심는다(화면은 모든 지난 날).
- 헌법 검사: `scripts/seed*`가 `diary/store`·`generate(`·`initLlama`에 닿지 못한다. **심은 하루로 품질을 결론짓지
  않는다** — 얻는 것은 「경로가 도는가」다.

### 011 — 사진 내용 캡션

- 사진 보는 VLM이 장별 캡션을 만들어 프롬프트의 재료가 된다. **캐릭터 로스터와 무관한 모델 하나**이고
  `src/vision/roster.ts`는 `models/roster.ts`와 서로 import하지 않는다. 파이프라인은 `사진 → [VLM 열기 → 캡션 →
  닫기] → 텍스트 → [캐릭터 모델 → 일기]`이고 `on-device.ts`가 순서를 지킨다(한 번에 모델 하나).
- **캡션 샘플링은 `inference/sampling.ts`를 재사용하지 않는다**(낮추면 일기 생성도 바뀌어 원칙 I을 깬다) —
  `src/vision/sampling.ts`에 따로 두고 헌법 검사가 막는다. 헌법 검사: `src/vision/`이 `diary/store`에도 못 닿는다.
- 캡션은 되뱉기 판정 대상이 아니다(신호 자체). 캡션에 「틀릴 수 있다」 같은 불확실성 표현을 붙이지 않는다(붙이면
  모델이 전부 얼버무리고, 압력이 지어내기를 낳는다). 볼 것이 없으면(0장·권한 없음) VLM을 열지 않는다.
- **캡션 프롬프트가 영어라 한국어 일기에 영어 단어가 섞인다**(예: "sleeping bag") — 캡션은 여전히 영어다. 061이
  언어 줄에 「영어로 적힌 장면도 한국어로 풀어 쓴다」를 더했다(my-ollama 측정 13/72 → 1/72, 실기기 미확인).
  `image_max_tokens`가 클수록 더 지어낸다는 관측(검은 이미지 기준)은 진짜 사진에서 미확인.

### 012 — 오늘 쓰기와 사진 신호 (정오 제한은 049가 폐지)

- **「하루가 아직 끝나지 않았다」는 헌법 원칙 II MUST**로 사진 권한과 무관하게 실린다(063 이후: 날의 갈래와 무관하게
  기록 첫 줄 `S_DAY_OPEN`). **신호가 빈약한 하루에서는 이 문장이 `echo` 거부를 유발할 수 있다**(재시도로 해소; 원칙 I의 방어는 정상).
- **사용자 화면에 보이는 신호 축은 사진·장소뿐이다**(`USER_VISIBLE_SIGNAL_AXES`). 진단 화면(060 이후
  `diagnostics-view.ts`가 칸을 만들고 `DiagnosticsParts.tsx`·`DiagnosticsScreen.tsx`가 그린다)은 다섯 축을 다 보이고, 헌법 검사가 그 세 파일이 그 상수를
  참조하지 못하게 막는다.
- **가장 위험했던 결함**: 화면이 완벽해도 파이프라인 게이트가 옛 함수(`isDayClosed`)로 남으면 조용히
  `day-not-closed`로 막힌다. 신호 수집은 사진 상한이 없다(`DEFAULT_PHOTO_LIMIT` 제거) — VLM에 넘기는 상한은 023의 8장.

### 013 — 캡션 전 리사이즈

- 사진을 VLM에 넘기기 전 1024px로 리사이즈해 캡션 시간을 129초→23초(82% 감소)로 줄였다(근거는 아래 「VLM 캡션
  60초의 원인」). 캡션은 리사이즈된 진짜 사진에서도 내용을 정확히 반영했다. 품질이 무너지는 해상도 하한은 재지 않았다.
  URI 계약의 함정은 위 「조용히 실패하는 결함의 계열」.

### 014 — 캐릭터 페르소나

- 캐릭터→이름·소개의 유일한 통과 지점은 `src/diary/persona.ts`(`roster.ts`를 import하지 않는다, 원칙 III). 소개는
  프롬프트에 들어가지 않는다(이름만). 일기에 제목이 붙는다(`extractTitle()`, **`judge()` 통과 후에만** 분리; 판정
  갈래는 여전히 4개, 못 떼면 `title: undefined`로 저장). 진단 화면은 모델 이름을 보이지 않는다(060이 캐릭터별
  모델 줄을 지웠다 — 보드 `6h`에 없고 원칙 III).
- **헌법 1.1.1의 교훈**: 소개 문구가 강점의 언어로 「상상을 섞어 쓴다」를 담으면 별도 고지가 필요 없다. 진짜 문제는
  낱말의 반복이 아니라 **같은 사실의 이중 전달**이다(053에서 권한 없음 캡션이 같은 사실을 두 번 말하는 것도 같은
  계열로 남았다). 타입이 두 곳에 독립 정의된 것(`DiaryListItem`)은 `tsc`가 잡았다.
- 선택 표식은 「고름」(욕창 연상) 대신 「선택」이다.

### 018 — 프롬프트 고정 접두사 미리 프리필

- `GenerationEngine.prewarm(character)`는 **반환값이 없다**(원칙 IV) — 실패해도 다음 `run()`이 그냥 느릴 뿐 틀리지
  않는다. `prompt.ts`의 `promptPrefix()`는 `buildPrompt()`와 **같은 배열(`fixedHead()`)에서** 나온다 — 복제하면 접두사가
  한 글자만 어긋나도 KV 캐시가 빗나가 기능 전체가 「느려질 뿐 오류 없이」 무의미해진다(P8·P10·P11).
- 화면이 미리 읽은 사진 결과(`seen`)를 파이프라인에 넘기려 `PipelineInput.seen?`·`InferenceBackend.generate()`의 셋째
  인자를 옵셔널로 더했다. `on-device.ts`의 `captionDay()`가 사진 읽기만 독립적으로 돌리고(**화면은 신호를 모른다**),
  E1(엔진 하나만 열림)은 화면이 지킨다 — 사진이 있는 날은 캡션이 끝난 뒤에만 `prepare()`를 부르고, 캡션 도중 「쓰기」는
  그 `Promise`를 그대로 기다린다.
- 절감은 기대(68%)보다 작았다(약 25%, 이 기기·캐릭터에서 전체 생성이 짧아 `engine.load()` 비중이 큼) — 무거운
  캐릭터·다른 기기는 미확인. 사흘 밖의 날은 `photoDays`가 훑지 않아 `hasPhotos: false`로 보이므로 `canPrepare`가
  거짓이면 미리 준비를 하지 않는다(E1·E15, 049). 사진 없는 날은 기기에서 018 미리 준비가 돌지 않는다(`captionDay`가
  있으면 1단계가 바로 돈다).

### 019·020 — 백그라운드 자동 생성

- **019(스파이크) 결론: 조건부 가능.** 배터리 최적화 **기본값**에서는 15분 등록이 실제로 하루 1~2회(관측 간격 19시간
  33분, 약 78배 억제 — OS의 Doze/앱 대기 버킷 탓)로 억제되고, **배터리 예외**를 주면 standby bucket이 `EXEMPTED(5)`가
  되어 10~32분 간격으로 돈다. 사진 권한은 방치 후에도 유효했다.
- **020 구조**: 순수 판정은 `src/schedule/`(`decision.ts`·`retry.ts`·`notify.ts`·`lock.ts`·`settings-effects.ts`,
  전부 `now`를 인자로 받는다), 기기 통로는 `*-port.ts`. `retry.ts`는 `selectableDays`만 보므로 사흘 범위가 자동으로
  걸린다. **경합은 `pipeline.run()`의 옵셔널 `acquireLock?` + 파일 잠금 + stale**이다(`running: Set`은 인스턴스 로컬이라
  화면↔백그라운드를 못 막는다). 취득 실패는 `already-running`으로 합류하고 태스크는 `"skipped"`. `pipeline.ts`는
  `expo-file-system`을 import하지 않는다(통로는 주입).
- **`STALE_LOCK_MS`는 6분**(`lock.ts` 한 곳, `pipeline.ts`·`task.ts`는 import만; SL1). 원래 근거는 「가장 느린 완주(옛
  narrative 사진 있는 날 ≈170초) × 2」였고 그 캐릭터가 나간 뒤에도(037) 안 잰 값을 줄이는 것이 원칙 V 위반이라 유지한다.
- **자동 생성 설정은 설정 탭에 있다**(prod에도, 엔드유저). 목표 시각은 시 단위(0–23)뿐이다 — 「정각」·「매일 7시」 같은
  정밀도 암시 문구를 두지 않는다. `notified.json`은 `DiaryEntry`와 분리(`preferences/`)이고 `pruneNotified`는 날짜 문자열
  비교만 한다. 알림 라우팅은 웜(`onResponse`)·콜드(`getLastNotificationResponseAsync`)를 순수 `routeFromNotification`으로
  통일한다.

### 021 — 권한 통합 신청과 설정 「권한」 섹션

- **`src/onboarding/`**: 순수 판정(`requirements`·`decision`·`flag`)과 기기 통로(`*-port`). **필수 권한 목록은 사람이 못 박은
  상수**(`PERMISSION_REQUIREMENTS`, 5갈래: `photos`·`photo-location`·`location`·`notifications`·`battery-exception`, 고정 순서)
  — 코드가 항목을 판정하지 않는다(원칙 V). 온보딩은 건너뛸 수 있고(원칙 I), 단계 완료는 저장하지 않고 매번 실시간 권한
  상태로 재판정한다(`planOnboardingSteps`). `battery-exception`은 조회 통로가 없어 `batteryNoticeShown`(1회 제시)으로만 판정한다.
- **020의 `batteryExceptionPrompted`는 흡수·제거**됐다 — 자동 생성 토글은 배터리 인텐트를 띄우지 않고, 안내의 주체는
  첫 실행 흐름과 설정 「권한」 섹션이다. 옛 `auto-diary.json`의 그 값은 `flag.ts`가 최초 1회 읽어 시드한다(FR-010a).
- `NotificationPort.getPermission()`(창을 안 띄움)이 있다. **거부 안내는 문자열 주입으로 흐른다** — `App.tsx`가
  `PERMISSION_REQUIREMENTS[...].ifDenied`를 `deniedNotices`로 넘겨 화면이 온보딩 계층에 닿지 않는다. 포그라운드 복귀
  (`AppState` `change→active`) 시 권한을 다시 읽는다(SC-006). 설정 [권한 안내 다시 보기]는 `forceOnboarding`이다.
- **진입 게이트**: `onboarding.json`의 `completed !== true`면 탭 UI 대신 온보딩만 그린다(043·045가 그 안의 단계를 바꿨다).
  새 네이티브 모듈 0개.

### 022 — 개발자 탭의 입력 프롬프트 미리보기

- `src/diagnostics/prompt-preview.ts`가 사람이 못 박은 `SIGNAL_PRESETS`(`empty`·`photos`, 진단 계층 `fake.ts`·`collect.ts`에서
  안 가져온다)로 **실제 `buildPrompt()`를 불러** `DiagnosticReport.promptPreviews`에 문자열로 싣는다(PP1이 바이트 동일성을
  잠근다). 화면은 그 문자열만 받는다 — `DiagnosticsParts.tsx`·`DiagnosticsScreen.tsx`가 `diary/prompt`·`signals`를 import하지 않고 헌법 검사
  `UI_TOUCHES_PROMPT`(`src/ui/` 전체)가 막는다. 크기는 `text.length`
  근사치이고 「실측 토큰 아님」 라벨이 붙는다(원칙 IV, 소스에 `token` 어휘 금지, PP6).
- 개발자 화면의 진입점은 059가 두었다 — 설정 「정보」의 「개발자」 행(개발 환경은 처음부터, 배포는 버전 7번 탭 뒤)에서 「진단」 행으로 닿는다.

### 023 — 사진 선별 알고리즘

- `src/vision/select.ts`(순수 함수 하나)가 (1) 상위 폴더 이름으로 잡사진을 거르고(전부 걸러지면 원본 유지) (2) 남은 것을 찍힌
  **시각** 분포로 배분한다(칸마다 최소 1장 + 사진 수에 비례한 최대 잔여법). 011의 「하루 균일」을 대체했다.
- **`VISION_PHOTO_LIMIT = 8`**(실측 상한). 12장 하루로 총 ~138초 / 생성 시간 한도 180초 — **걸린 제약은 시간**이고
  컨텍스트는 여유(캡션 5장 프롬프트 852토큰 / `n_ctx` 2048). 올리려면 헤드리스 완주(포그라운드의 ~3~4배 느림, 042)를 먼저
  잰다. `BUCKET_COUNT = 6`(4시간 칸)과 `NON_CAMERA_FOLDERS`(`Screenshots`·`Download`·`KakaoTalk`·`WhatsApp Images`·`Telegram`)는
  사람이 정한 상수다(코드가 분포를 보고 정하지 않는다). `BUCKET_COUNT < 상한`이라 칸 수 == 예산 경계는 dead path.
  **실촬 스크린샷 경로(`Pictures/` vs `DCIM/Screenshots`)는 미확인.**
- `photosBetween()`은 `getUri()`를 부르지 않고 `folderNamesFor()`가 **상한에 닿은 하루에서만** asset별로 부른다.
  헌법 검사: `VISION_SCORES_IMAGE`(픽셀 채점 헬퍼 차단)·`checkPhotoPortFile`(`expo-port.ts`가 분류를 두지 못하게).

### 024·027 — 백그라운드 안정성

- **★ `defineTask`는 모듈 최상단 부수 효과여야 한다.** 020이 그것을 `App.tsx`의 `useEffect`로 옮겨 헤드리스 실행이
  `No task registered for key expo-task-manager`로 태스크를 자동 해제했다(자동 생성이 한 번도 안 돌았다). 최상단에서
  **동기 `require("expo-task-manager")`를 try/catch로 감싼다** — 프로덕션 RN에서는 성공(헤드리스 포함), jest `logic`에서는
  `SyntaxError` → catch → 등록 생략(B1a). release 빌드(minify OFF)에서도 등록이 성립한다(027).
- **재부팅 복구**: `expo-task-manager`가 자체 `BOOT_COMPLETED` 리시버를 가져 `enabled:true`면 재부팅 뒤 앱을 홈이든
  설정이든 한 번 열기만 하면 재예약된다(위 `defineTask` 수정이 전제). 앱을 열기 전에는 미등록(문서화된 한계).
  `enabled:false`이면 재예약되지 않는다.
- **권한 회수는 `collect.ts`가 이미 `unknown`으로 감싼다**(코드 무변경; `signal-revocation.test.ts` SR1~6이 잠근다). 사진
  권한이 `granted`가 아니거나 실행 중 회수돼도 `photos.kind === "unknown"`(절대 `none` 아님)이고 위치만 못 읽으면 `places`만
  `unknown`이 된다. `adb pm revoke`는 앱 프로세스를 즉시 kill해 「그 순간의 회수」는 재현되지 않는다.
- **헤드리스 생성은 포그라운드의 3~4배 느리다**(`quiet` 콜드 `writingMs` 158초 vs 54초; 042 `writingMs` 36.8→137.5초) —
  180초 한도에 대한 여유가 그만큼 좁다. 배터리 예외 없이는 토큰 생성 단계에서 억제돼 미완주(019의 예외 없는 억제가 생성
  경로에서도 성립). 옛 `narrative`는 헤드리스에서 26분 넘게 CPU만 태우고 산출물이 없었다(037의 근거).
- **삼성 One UI**: 「배터리 설정 열기」는 `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` 인텐트를 `AppBatteryUsageActivity`(「배터리 사용
  관리」 앱 목록)로 라우팅한다. 예외는 목록 → 앱 → 「배터리」 → 「제한 없음」까지 4탭이고 딥링크가 없다. 결과는
  `adb shell dumpsys deviceidle whitelist +`와 같다(bucket 10→5).
- **`AppState`를 판정에 쓰지 않는다**(`src/schedule/`·`src/signals/`에 참조 0건) — 「앱 UI가 전경에 없음」의 근사치일 뿐이다.
  **소크 라운드 표본**: 유효 1회에서 목표 12:00 → 발화 +13분 → 완주 81초(SC-001 충족, 표본 1). **SC-002(무예외 24h 소크)는
  접었고 미판정**이다(019 값을 대신 채우지 않는다). release APK 헤드리스 확인은 `quiet` 생성까지는 못 갔다(모델 삭제 + `run-as`
  불가) — debug 확인으로 갈음.

### 025 — 사진 슬라이더·갤러리 (051이 대체)

- 격자를 페이징 슬라이더 + 풀스크린 갤러리로 바꿨으나 `DiaryDetailScreen`과 함께 051이 홈 지면의 캐러셀로 대체했다. 남은 것:
  새 의존성 없이 코어 `ScrollView`·`Modal`로 만든 방식, `DiaryPhoto`(사본 실패 → 「이 사진은 이제 없다」)를 공유하는 구조,
  테스트 함정(위 「테스트 작성의 함정」). 「순환하지 않는다」(FR-011)는 051이 뒤집었다.

### 037 — 로스터를 검증된 하나로

- **로스터 진입 기준**(헌법 원칙 III): 이 저장소의 프롬프트로 저장 가능한 일기를 안정적으로 내는 것이 **실기기에서 관측**되어야
  한다(MUST). 옆 저장소 벤치는 후보를 좁히는 데만 쓴다. **「안정적으로」는 사람이 로그를 읽어 판단한다**(원칙 IV — 자동 채점
  코드를 만들지 않는다). **로스터가 하나인 것은 완성이 아니라 현재 상태다** — 늘리는 방향이 정상이다.
- **옛 일기가 멈추는 자리**: `DiaryEntry.character`는 파일에서 오는 값이라 로스터를 나간 캐릭터가 쓴 일기가 남아 있고
  `authorName`은 옵셔널이라(035 이전) `personaOf() → undefined.name`으로 상세가 멈춘다. **`personaOf()`에 기본값을 넣지 않는다**
  (「로스터에 없는데 성격은 있다」가 원칙 III 경계를 흐린다) — 읽는 쪽이 `PERSONA_NAMES`(로스터 밖이면 `undefined`)로 방어한다.
- **캐릭터가 둘 이상이어야 성립하는 계약(E1·E9·018 P11·026 동시 내려받기·007 옮김 알림)은 지우지 않는다.** 식별자만 필요하면
  `__tests__/future-character.ts`의 `FUTURE_CHARACTER`, 둘째가 렌더 안 되거나 페르소나가 필요하면 `it.skip` + 되살릴 조건,
  조립 대신 소스 검사로 다룬다. **`FUTURE_CHARACTER`를 `personaOf()`·`assetFor()`에 넘기지 않는다.**
- 이미 내려받은 모델 파일을 앱이 지우지 않는다(사용자 저장 공간에 손대는 판단을 코드가 하게 된다).

### 040 — 첫 실행 흐름

- `src/firstrun/`은 「시도해야 하는가」만 답한다(`resolveFirstRunStage`·`shouldShowLogo`·`shouldAutoGenerate`). 021·035·029의 순수
  로직(`requirements.ts`·`essential-assets.ts`·`liveness.ts`·`naming.ts`)은 그대로 재사용한다. **자동 첫 일기는
  `schedule/task.ts`의 `runAutoDiaryTask`를 재사용하지 않고**(그 함수는 `settings.enabled`·목표 시각 창을 본다)
  `wiring.ts`의 `triggerFirstRunAutoDiary()`가 `pipeline.run()`을 직접 부른다. 049 이후 오전에도 돈다.
- **잘린 모델 파일은 로드 전 크기 검증에서 걸러져** 재다운로드로 넘어간다(liveness 실패는 유도할 수 없어 035 계약 테스트로 갈음).
  미확인: FR-009 거부 판정 갈래.

### 041 — 모델 내려받기 OOM 해소

- 원인은 「어느 조건에서 `res.body`가 null인가」가 아니라 **언제나**였다(위 RN `fetch` 규칙). 고친 자리는 `expo-port.ts`의
  `fetchRange` 하나다 — 구간마다 임시 파일(`<key>.bin.seg<i>`)에 `DownloadTask`로 받고 `COPY_CHUNK_BYTES`(1MiB)씩 최종 파일에 옮겨
  붙인다(상주 메모리가 파일 크기와 무관). `RangeFetchPort` 계약·`src/models/segmented/`·`port.ts`는 무변경이다.
  `remove()`·`bytesUsed()`는 구간 임시 파일도 본다(`leftoverNamesFor`). 손으로 쓴 구조적 타입 대신
  `InstanceType<...["File"]>`을 빌려 `tsc`가 `FileMode.Read` 오류를 잡았다.

### 042 — 사진이 있는 하루는 VLM을 반드시 거친다

- 헌법 v1.7.0: 사진 접근이 허용되어 있으면 반드시 본다(MUST), 끄는 경로를 두지 않는다(MUST NOT), 깊이는 하나로 고정한다(MUST).
  `VisionSetting`은 `"quick"` 하나이고 기기에 남은 `preferences/vision-setting.json`은 지우지 않는다(읽는 쪽이 사라졌으므로 무해).
- **★ 백그라운드 자동 생성이 사진을 한 장도 안 보고 있었다**(`task.ts`가 「자동」·설정 없음을 `"none"`으로 떨궜다, 029). 분기를
  통째로 걷어냈다 — 실질적 이행 지점이다. 개발자 탭 「지금 생성」도 안 봤다(검증 경로가 제품과 다르면 그 검증은 제품을
  재현하지 못한다). `VisionOutcome`의 `skipped`는 도달 불가라 제거했다(6→5).
- **가드 순서**: `on-device.ts`가 `vision === undefined`를 `engine === undefined`보다 먼저 봐서 시뮬레이터에서 「네이티브 추론
  모듈이 없다」가 「사진을 못 본다」에 가려졌다(원칙 I) — 엔진 부재를 먼저 말한다. 「볼 것이 없으면 열지 않는다」(011)는 그대로다.
- **D5**: 완전 헤드리스(홈 + 화면 끄기, 15분 뒤 잡이 스스로 깸)에서도 `has_media=1` 3회 → 저장까지 간다. 저장된 `createdAt`이
  `doWork` 시각과 일치하고 그 구간에 `wm_on_resume_called`·`App is in the foreground`가 0건이다.

### 043 — Modernist 스플래시·권한 흐름

- 디자인 토큰(`src/ui/theme/tokens.ts`)은 오프화이트 배경·진한 레드·웜그레이이고 `theme-tokens.test.ts`가 WCAG 대비를 자동 검증한다.
  **빨간(accent) 면 위 글자는 보드 그대로 오프화이트다**(3.76:1 — AA 본문 4.5:1 미달, 큰 글자·UI 3:1만 충족; 2026-10-01 저장소 소유자
  결정으로 043의 「검정」을 뒤집었다). 테스트는 3:1을 하한으로 잠근다 — 대비를 이유로 다시 검정으로 바꾸지 않는다.
- 사진·위치·알림 단계는 설명 카드·[허용]/[건너뛰기]를 없애고 **빈 배경 위에서 OS 다이얼로그를 연속 호출**한다. 거부는 자동으로
  건너뛰기이고 `blocked`(「다시 묻지 않음」)일 때만 [설정 열기]가 있다. `battery-exception`은 호출 통로가 없어 카드 + [설정 열기]/[건너뛰기]를 유지한다.
- **★ `busy` stale closure**: `allow`가 `useState`의 `busy`를 캡처하고 effect deps에서 빠져 있어 첫 단계의 `busy = true`가 다음 단계
  타이머에 전달돼 조용히 탈출했다 → `useRef` 동기 가드(`busyRef`)로 고쳤다.

### 045 — 다운로드 동의와 진행 슬라이드

- **순서는 `권한 → 동의 Dialog → 진행 슬라이드 → 작명 → liveness → 자동 첫 일기`다**(040의 작명∥다운로드 병렬을 뒤집었다).
  `resolveFirstRunStage()`에 `"download-consent"`·`"downloading"`이 있고 `"waiting-for-download"`(`WaitingForDownloadScreen`)는 삭제했다.
- 동의 Dialog(`DownloadConsentDialog`)는 VLM·LLM을 고르게 하지 않는다(`ESSENTIAL_ASSET_KEYS`는 셋 다) — 무엇을 왜 받는지 알리고
  [받을게요] 하나뿐이다(거부 조작 없음). `OnboardingFlag.downloadConsented`가 넷째 필드다. **`downloadProceedConfirmed`**(세션 로컬)가
  「완료 화면 버튼을 눌렀는가」를 따로 추적한다 — 없으면 `downloadReady`가 되는 즉시 완료 화면이 사라진다(FR-007).
- **040의 헌법 검사 G8(경과 시간 어휘 전면 금지)을 제거했다** — 4초 장식 슬라이드 전환의 `elapsedMs`와 충돌했다. 원칙 IV가 금지하는 것은
  진행 중 화면에 정밀한 시간·바이트·퍼센트를 노출하는 것이지 경과 시간 개념이 아니다(`tokens_*`·`timings`는 `llama-port.ts`가 따로 막는다).
  `UI_TOUCHES_ASSET` 경계는 `ESSENTIAL_ASSET_KEYS`만 막도록 좁혔다(`essentialAssetsReady()`는 정당한 사용).
- **liveness 실패 화면의 [그냥 시작하기]가 막다른 길이었다**(035 W11 위반) — `finishWelcome()`이 `namingDone`만 세우고 `livenessOutcome`은 그대로라
  `"liveness"`에서 못 벗어났다 → `livenessSkipped` 세션 로컬 state가 그것을 대체한다(`livenessOutcome`을 `"ok"`로 덮어쓰지 않는다, 원칙 I).
- **재실행마다 완료 화면·정상 동작 확인이 다시 떴다**(045·040 결함, 048에서 고침): 세션 로컬 state만 봐서 모델이 있고 작명까지 끝낸 사용자도 매번
  지나야 했다. 완료 화면은 이번 세션에 에셋이 없는 것을 본 적이 있을 때만(`essentialsMissingSeen`), 확인은 이번 세션에 작명을 거쳤을 때만
  (`livenessPassed`) 돈다. 새 내려받기 직후의 완료 화면은 재다운로드가 필요해 소스 계약으로만 잠갔다.

### 047 — 작명 화면 = 보드 1a

- **「디자인을 참조했다」는 「디자인과 같다」가 아니다** — 계약 테스트가 전부 초록이어도 문구부터 달랐다. 참조 원본이 있으면 원문을 테스트에
  박는다(`1a` KO 문자열 글자 단위, A3). 보드를 옮길 때는 메모 글만이 아니라 마크업의 `flex`·`position:absolute`·`transform`까지 읽는다.
- 빈 입력에서 확정 버튼은 흐려지지 않는다(`1a`에 비활성 모양이 없다) — `Button`에 `disabled`를 넘기지 않고 `onPress`에서 거르며
  `accessibilityState`로만 알린다. 화살표는 문자 `→`(SVG는 공용 컴포넌트나 새 의존성이 필요). 글꼴 1.3배에서 가로 버튼 줄은
  `flexWrap: "wrap"`이어야 앞 글자가 안 잘린다. 미확인: 제스처 내비게이션 기기·다른 키보드 앱.

### 048 — 일기 홈 구조

- **탭 줄이 없다.** `route: "home" | "settings" | "developer"`이고 하위 화면은 홈 위에 쌓이는 겹이다(055 — 아래).
- **미리보기는 파이프라인과 같은 `loadSignals` 하나를 나눠 쓴다**(`wiring.previewDay(day)` → `DayPreview`, PV4). 좁히는 함수는
  `app/day-preview.ts`에 따로 있다(`state.ts`가 신호 타입을 import하면 화면이 그걸 거쳐 신호에 닿는다, DP8). 「읽는 중」은 상태로
  저장하지 않고 렌더에서 가른다(`react-hooks/set-state-in-effect`). **고른 날은 `AppFrame`이 들고 있다**(설정 왕복·재마운트에도 남고
  파일엔 안 남는다). 하단 바의 「n일」은 쓰기 버튼의 형제다(안에 두면 날짜를 눌러 쓰기가 시작된다).
- `requirements.ts`의 `ifDenied` 넷은 해요체다(홈 캡션·온보딩·설정 권한 섹션이 같은 값을 본다).

### 049 — 날 고르기

- **★ 하루는 기기 로컬 자정(00:00)에 바뀐다**(002의 04:00을 버렸다; 헌법에 04:00이 없어 개정 없이) **그리고 오늘은 언제든 쓸 수 있다**
  (`isDayWritable = day <= dayOf(now)`, 012의 정오 제한 폐지). 경계는 `day-boundary.ts` 하나다. **경계를 옮기다 숨은 복제를 찾았다** —
  `vision/select.ts`의 `bucketIndexOf`가 `getHours() - 4`로 04:00을 직접 계산하고 있었다. `day-boundary-source.test.ts` DB11이
  `getHours() ±`를 경계 파일 밖에서 막는다 — **경계 값을 바꿀 때는 값 테스트가 아니라 소스를 센다.**
- **「사흘」은 화면에서만 풀었다** — `selectableDays()`(백그라운드 재시도·알림 정리·018)는 개수·구성(정오 이후에만 오늘)을 그대로 둔다.
  **정오 조건을 함수 안에서 직접 본다** — `isDayWritable(today)`로 간접 판정하면 새 규칙을 타고 백그라운드가 아침에 오늘을 쓰기 시작한다.
  화면(`state.ts`)은 `selectableDays`를 부르지 않는다. 정오는 그 구성 규칙에만 남아 있다.
- **앱을 열면 오늘이다** — `AppFrame`의 고른 날 초기값이 `dayOf(new Date())`(`null`이면 자정을 넘길 때 새 오늘을 따라가 「보던 날 유지」가 깨진다).
  자정 타이머(`nextDayStartAt + 1초`)가 밑줄·흐림만 옮긴다.
- **스와이프는 `Gesture.Pan().runOnJS(true)` + reanimated 스프링**이고 문턱은 사람이 정한 값(`SWIPE_DISTANCE 40`·`SWIPE_VELOCITY 500`·
  `RUBBER_BAND 0.25`)이다. ctx7 기본 ID는 gesture-handler v3 API(`usePanGesture`)를 주는데 이 저장소는 v2라 `/…/v2.29.1`로 본다.
- **★ 움직임 결함 둘**(기기 없는 테스트가 못 잡는다): (1) 크로스페이드 공유값을 `useEffect`에서 되돌리면 첫 프레임을 그린 뒤라 한 프레임이 샌다 →
  겹마다 `key`로 새로 마운트하고 시작값을 `useSharedValue(from)`으로(`FadeLayer`, H9). (2) 끌린 자리는 새 내용이 그려지는 커밋(`useLayoutEffect`,
  S8)에서 되돌린다(손을 뗀 순간 0이면 옛 내용이 멈춰 보이고 스프링이면 출렁인다). 밑줄 자리는 모든 칸에 둔다(S7 — 오늘 칸에만 그리면 오늘이 든
  주에서만 스트립이 높다). 큰 날짜 숫자는 언제나 두 자리 폭이다(H10).
- 남긴 관측: 신호 없는 오전의 오늘 일기가 저녁까지 지어냈다(원칙 II — 정오 제한 폐지로 더 자주 보일 수 있다).

### 050 — 대화상자 기반

- React Native Reusables(RNR) 복사본이 `src/ui/rnr/`에 있고 공용 부품은 `components/Dialog.tsx`의 `ConfirmDialog`·`DismissibleDialog`다(덮어쓰기 확인·
  날짜로 이동 달력·다운로드 동의가 쓴다). **RNR 레지스트리 원본은 `react-native-screens`(`FullWindowOverlay`)·`lucide-react-native`(→ `react-native-svg`)를
  끌고 오므로 복사본에서 걷어냈다**(DEP1이 되살아나는 것을 막는다). 새로 들인 `@rn-primitives/*`·`react-native-ui-datepicker`·`dayjs`에는 네이티브 코드가 없다.
- 뒤로 가기는 프리미티브가 한다(`Content`가 마운트 때 `BackHandler`를 한 번 등록하므로 부품이 최신 콜백을 ref로 읽는다). `App.tsx` 루트에 `PortalHost` 하나.
  색 이름은 `tokens.ts`의 `RNR_COLOR_ALIASES`가 `COLORS`를 가리키는 별칭이다(새 색 0). RNR `Button`·`Text`는 대화상자·메뉴 부품 안에서만 쓴다(DEP2).
  `src/ui/rnr/dropdown-menu.tsx`·`@rn-primitives/dropdown-menu`는 쓰는 곳이 없지만 남겨 두었다.
- **달력은 날짜 격자만 datepicker에 맡긴다**(그 `›`는 `maxDate`를 안 보고 제어 prop은 같은 값으로 되돌릴 수 없어 머리·월·연 목록은 직접 그린다). 달력과 스트립은
  **칸 판정 하나(`cellFor`)를 쓴다** — `DateJumpDialog.tsx`에 `dayOf(`·`isDayWritable(`·`.some(`이 없다(CAL5). 미래 칸 방어는 `disabledDates`와 `maxDate` 둘이라
  위반 주입은 둘 다 빼야 잡힌다. 큰 숫자·요일만 누를 수 있다(월 라벨·상태 줄은 못 누른다). 오늘을 다시 쓸 때만 「지금까지의 하루로 써요.」(Q5).

### 051 — 쓴 날 읽기

- **홈이 곧 상세다.** 고른 날에 일기가 있으면 헤더 상태 줄에 제목, 스트립 아래 연회색 지면에 순환 캐러셀과 본문, 하단 바에 「다시 쓰기」(오늘이면
  「N시간 M분 전에 작성」)다. **「최근 · n편」 목록과 `DiaryDetailScreen`이 사라졌다** — 옛 일기는 스트립·달력으로 닿는다(`written-day-reach.test.ts` REACH).
  쓴 날인가는 목록 요약이 먼저 정한다(`paperFor`; 파일 읽기 전에 하단 바가 정해져 빨강이 깜빡이지 않는다, 늦게 온 읽기는 버린다). 쓰기 성공은 결과 화면 없이
  홈의 그 날이다. 화면 상태에 `detail`·`unreadable`·`written`이 없다.
- 알림은 「적용」과 「확인」을 가른다 — `initialDay`는 홈의 고른 날이 되고 `onInitialDayApplied`에서 경로를 비운다. 확인(`acknowledgeNotified`)은 읽을 수 있는
  일기가 지면에 실제로 보였을 때 그 날마다 한 번이다.
- 캐러셀은 `react-native-reanimated-carousel`을 2장 이상일 때만 쓴다(순환). `data`·`renderItem`은 `memo`로 뗀다(렌더마다 새로 만들면 안 된다, 046). **★ 세로 지면 안의
  가로 캐러셀에는 `.failOffsetY([-10, 10])`이 필요했다**(`activeOffsetX`만 두면 세로로 끌다 가로로 20px 흔들린 손가락을 캐러셀이 잡아 지면이 안 스크롤된다). **사진은 원본 색이다**
  (보드의 흑백 필터를 2026-10-01 저장소 소유자가 거부했다). **배지·인디케이터는 `onSnapToItem`이 아니라 `onProgressChange`를
  반올림해 움직인다** — `onSnapToItem`은 넘김 애니메이션이 끝난 뒤에 불려 한 박자 늦게 따라왔다(`indexAtProgress`).
- **하단 바는 화면 폭 전체의 블록 하나이고 쓴 날의 바는 지면 끝(4px)에 닿아야 올라온다**(`reachedEnd`). 숨긴 바는 `pointerEvents="none"` + 접근성 트리에서 뺀다
  (jest·Maestro 모두 못 본다 — 테스트는 `__tests__/ui/paper-end.ts`, 흐름은 `scrollUntilVisible`). `translateY`로 내린 바가 edge-to-edge 아래 내비게이션 바 뒤로
  비쳐 쓴 날 루트에 `overflow: "hidden"`. 헤더·스트립은 고정이고 지면만 스크롤된다. 상태 줄·제목은 큰 숫자 오른쪽 세로 묶음의 요일 아래다.
- **`⋯` 메뉴(048 `HomeMenu`)를 없앴다** — 설정 진입은 055의 월 라벨 줄 점 세 개다.
- **구현 뒤 보드와 셋이 어긋났다**(저장소 소유자 육안; 계약 테스트는 전부 초록) — 047과 같은 교훈이다.

### 052 — 읽기 스크롤

- 쓴 날의 지면을 8px 넘게 내리면 스트립과 안내 캡션이 접히고(240ms) 맨 위(2px 이하)에 닿으면 펴진다. **접힘 표시(▾)도, 접힌 날짜 줄을 눌러 펴는 길도 없다**
  (저장소 소유자 결정 — 보드 `5b`를 따르지 않는다). 판정은 `src/app/reading-scroll.ts`의 `foldAfterScroll()` 하나(`FOLD_AFTER 8`·`UNFOLD_AT 2`; 300ms 디바운스는 없다).
  보드에 없는 규칙: 접은 뒤에도 더 내릴 거리가 8px 이하인 본문은 접지 않는다(FR-005). 큰 숫자·요일은 접혔든 펴졌든 050 그대로 달력을 연다. 제목은 한 줄 말줄임이다.
- **★ 스트립을 지면 프레임 위에서 줄이면 접힘 경계에서 접힘·펼침이 되풀이된다**(프레임 경계가 손가락 아래에서 움직여 안드로이드 `ScrollView`가 그것을 드래그로 읽는다;
  히스테리시스로 못 막는다). **지면 스크롤 뷰의 프레임은 접힘으로 움직이지 않는다** — 스트립은 지면 위에 절대 배치되는 불투명 판(`StripOverlay`)이고 지면 맨 위에 같은 높이의
  스페이서(`FoldSpacer`)를 두어 둘이 `useFoldMotion`의 같은 값을 본다. 접는 감쌈은 안쪽을 절대 배치로 빼야 한다(안쪽을 흐름에 두고 `maxHeight`만 옮기면 잰 높이가 되먹임으로 줄어든다).
  **애니메이션 안쪽의 `onLayout`을 재는 값으로 다시 쓰는 되먹임은 jest가 못 잡는다.**
- 지면 높이가 바뀔 때 안드로이드가 되풀이하는 사건 둘을 거른다: 위치가 그대로인 `onScroll`, 1px 미만으로 흔들리는 `onContentSizeChange`(773.9999↔774.0001; 「같은 값」 비교를
  부동소수에 정확한 같음으로 쓰면 뚫린다). 접힐 때 큰 숫자가 튀었던 것은 「눌림 갈래」로 바꿀 때 래퍼의 정렬 스타일이 함께 바뀐 탓이다.

### 053 — 쓸 재료

- 안 쓴 날의 신호 줄은 두 칸(사진·장소)이다. **판정 하나(`src/app/material.ts`의 `decideMaterial`)를 두 곳에 쓴다** — 항목을 `some`/`zero`(관측된 0)/`unseen`(셀 수 없음)으로 옮겨
  쓰기 전 미리보기와 읽을 때의 저장된 신호에 같은 함수를 적용한다(「확인이 뜬 하루」와 「지어낸 하루」가 다른 말을 하지 않게). **`unseen`을 `zero`로 세지 않는다**(원칙 V, MAT3).
- **「지어낸 하루」는 저장하지 않는다** — 읽을 때 `paperFor()`가 `entry.signalsUsed`로 `madeUp`을 계산한다(그래서 옛 일기·백그라운드 생성 일기도 같은 규칙으로 표식이 붙는다).
  신호가 깨져 있으면 던지지 않고 표식을 안 붙인다.
- `DayPreview.photoAccess`(`ok`/`denied`/`blocked`)가 「권한 때문인가」를 가른다 — `CountHint.unknown.reason` 문구를 비교하지 않는다(문구를 고치면 조용히 깨진다). **`toDayPreview`가
  사진이 관측된 0장이면 장소도 `none`으로 옮긴다**(`collectPlaces`가 사진 `none`이어도 장소를 `unknown`으로 줘 「0 장 · 모름」이 보였다; 사진이 `unknown`이면 승격하지 않는다).
  `2f` 제목은 관측된 0이면 「😢 아무 기록도 없어요」, 전부 권한 없음이면 「😢 기록을 볼 수 없어요」다.
- 쓰기 전 판정은 누른 순간 한다(미리보기가 그 날 것이면 그것으로, 아니면 `previewDay(day)`를 한 번 기다린다). **다시 쓰기는 판정을 거치지 않는다**(050 덮어쓰기 확인이 있다).
  권한이 없어도 쓸 수 있다(확인만 거친다). 핸들러가 읽는 미리보기는 ref에 둔다(`useMemo`는 React Compiler 규칙 위반). 글꼴 2.0배에서 「권한이 없어요 ›」 두 칸이 붙던 것은 `flexWrap`.
  **홈 헤더의 021 안내 캡션이 권한 없음 칸과 같은 사실을 두 번 말한다** — 후속 판단.

### 054 — 제자리 쓰기

- 쓰는 중이 홈 안의 상태다 — 헤더 상태 줄 「쓰는 중」(빨강), 35%로 잠긴 스트립, 혼잣말과 「{이름}이 쓰고 있어요. 진행률은 세지 않아요.」, 검정 전폭 「그만두기」 바. 그만두거나
  실패하면 쓰기 전 홈이고 **실패는 하단 바 위 12에서 올라오는 토스트 한 줄**이다(글은 버려진다, SC-005).
- **`AppScreen`의 `writing`을 넓히지 않았다** — `toWriting()`이 인자를 안 받고 `Object.keys(toWriting())`가 `["kind"]`뿐인 것을 007 S1·009 I7·012 C3가 잠근다. 목록 요약은
  화면 로컬 state(`writingItems`)다. **설계를 구현에서 뒤집을 때는 그 설계가 기대던 기존 계약 테스트를 먼저 읽는다.**
- **실패 갈래 표는 사람이 못 박은 상수**(`src/app/failure-toast.ts`: `retry`·`prepare-character`·`prepare-vision`·`plain`·`save`). 파이프라인 이유는 `` `${kind}: ${detail}` `` 꼴이라 앞 토큰과
  `vision-failed`의 detail만 본다(문구 비교 금지). **사용자가 조치해야 풀리는 실패에 「다시 써 볼 수 있어요」라고 하지 않는다**(SC-006). 정본은 `TOAST_TEXT`·`TOAST_SWIPE`.
  **문구는 지금 다섯 갈래 모두 「일기를 쓰지 못했어요.」 한 줄이다**(2026-09-30 저장소 소유자 결정 — 보드 `m.failToast`의 「다시 써 볼 수 있어요」도 뺐다). 갈래 판정은 남겨
  두었다 — 055의 설정에는 캐릭터 준비 경로가 없어(S5) 다시 가를 근거가 아직 없다.
- 쓰는 도중의 준비 실패는 토스트뿐이다. 다시 받는 길은 쓰기 **시작 전** `no-ready-character` 안내 화면의 「모듈 다시 받기」(055)뿐이다.
- 혼잣말은 4초 간격 + 단계 전환 즉시 페이드 교체다(문안은 「지금 하는 일」에 근거, 039; 「지금 줄」은 글자가 아니라 `writing-monologue-text` testID로 찾는다 — 나가는 겹이 잠시 트리에 남는다).
  **쓰는 중에 들어갈 때 052의 접힘·끝 판정 상태를 비운다**(안 그러면 그만두고 돌아올 때 스트립이 접힌 채 시작한다). 토스트 바닥은 「바의 잰 높이 + 12」다.
  `react-hooks/immutability`: 공유값을 수정하는 함수는 그 값을 쓰는 effect보다 먼저 선언한다.
- 생성 중 앱을 홈으로 보냈다 돌아오면 중단 실패가 약 20초 뒤에야 토스트로 올라온다(005 FR-014b + llama의 종료 시점 — 054의 결함이 아니다). 2026-09-30 기기 확인:
  저장 실패 토스트(일기 폴더를 `run-as chmod 500`으로 막아 유도 — 새 파일 없음), 글꼴 2.0배의 토스트(한 줄, 바 위 12dp), 약한 쓸기(10pt 활성 ~ 24pt 문턱 사이)의
  되돌아옴(약 25px 따라 내려갔다가 약 230ms에 제자리, 닫히지 않음 — 녹화 프레임). **10pt 미만의 끌기는 팬이 서지 않아 토스트가 움직이지 않는다**(`activeOffsetY`).
  **미확인**: `plain`·`prepare-*` 토스트(계약 테스트로 갈음 — 문구가 한 줄로 같아 갈래는 판정 테스트가 본다), 사람 손의 손맛.

### 055 — 설정 진입과 화면 틀

- **설정은 홈 위에 쌓인다 — 홈을 언마운트하지 않는다.** `AppFrame`은 `DiarySection`을 `route`와 무관하게 늘 그리고 그 위에
  `StackLayer`(절대 배치 + reanimated `translateX` 240ms, 닫힘 뒤 JS 타이머로 언마운트)를 얹는다. 그래서 설정에 다녀와도 쓰는 중·지면
  스크롤·접힘이 그대로다. 새 내비게이션 라이브러리는 없다(`react-native-screens`는 050 DEP1). 이름 바꾸기는 설정 위에 한 겹 더 쌓는다.
- **★ 겹친 동안 홈은 뒤로 가기를 아예 등록하지 않는다(`DiaryHomeScreen`의 `covered`).** 안드로이드 `BackHandler`는 나중에 등록한 것부터
  부르므로(RN `BackHandler.android.js`가 뒤에서부터 순회), 설정이 열린 뒤 홈의 effect가 다시 돌면 쓰는 중의 그만두기 핸들러가 앞에 서서
  **설정의 뒤로 가기가 쓰기를 멈춘다** — 조용한 결함. 등록 순서에 기대지 않는다: 덮인 홈은 등록하지 않고, 겹도 위에 다른 겹이 있으면
  (`active={false}`) 등록하지 않는다. `covered`는 닫히는 240ms 동안에도 참이다(겹이 `onSettled`로 마운트 상태를 알린다). 덮인 홈은
  `importantForAccessibility="no-hide-descendants"`·`accessibilityElementsHidden`·`pointerEvents="none"`. 쓰기·혼잣말·자정 타이머는 멈추지 않는다.
- **★ 실기기에서만 드러난 결함 둘**(jest 전부 초록): (1) `currentEnvironment()`는 부를 때마다 새 객체인데 `DiarySection`이 렌더마다
  불렀다 — 설정을 열어 홈이 다시 그려지는 순간 `DiaryHomeScreen`의 `resolution` effect가 화면을 처음 상태로 돌려 **쓰는 중이 안 쓴 날로
  보이고 생성은 뒤에서 계속 돌아 저장됐다.** 환경 판정은 `useState(() => currentEnvironment())`로 마운트 때 한 번이다(jest는 같은 상수로
  다시 그려 못 잡았다 — 소스 계약으로 잠갔다). (2) 절대 배치는 부모의 패딩을 무시한다 — 겹을 `SafeAreaView` 바로 아래에 두면 인셋 밑까지
  덮는다. 홈과 겹을 안쪽 `View` 하나에 담는다. 머리 위 여백은 보드 56 − iOS 상태 표시줄 46 = 10(홈 70 → 24와 같은 환산).
- 진입점은 월 라벨 줄 오른쪽 점 셋(`home-settings`, 048의 `home-kicker` 「일기」 글자 자리) — 헤더는 접히지 않아 안 쓴 날·쓴 날·접힘·쓰는 중
  모두 같은 자리다. 쓰기 시작 전 실패 안내는 홈 헤더가 없는 별도 화면이라 진입점이 없다.
- 설정 내용: 이름(→ `RenameScreen`, 1a 입력줄 `NameField` 공유, 빈 이름이면 「저장」 흐림 — 첫 실행 1a는 047대로 흐리지 않는다)·자동으로
  쓰기 토글(그 아래 시각·장소 행은 056)·권한 네 행·버전. **캐릭터 목록·작성자 고르기·`PermissionsSection`(온보딩
  다시 하기)을 설정 조립에서 걷었고** 059가 그 파일·자기 테스트(와 그것만 쓰던 `CharacterPicker`·`ListRow`·`SelectRow`)를 지웠다. 배터리 행도 앱 정보 화면으로 간다(024의
  「배터리 사용 관리」 목록 인텐트는 온보딩 배터리 단계에만 남는다).
- 권한 꼬리표는 순수 함수 `permissionTagFor`(`src/app/permission-tags.ts`) — 읽지 못한 행은 `unread`로 꼬리표를 그리지 않는다. 사진의 위치
  정보는 조회 API가 없어 `photoLocationProbe`가 최근 사진 한 장의 `locationOf`를 실제로 불러 본다(실패 = 권한 없음으로 본다 — 「막 지운 사진」도
  섞이는 짐작). 마운트·`AppState → active` 때 다시 읽는다(`usePermissionTags`).
- 버전은 `expo-application`의 `nativeApplicationVersion`·`nativeBuildVersion`(설치본 값). `expo-constants`의 `platform.android`는 bare에서 빈 맵이다.
  `expo-application`은 `expo-notifications`를 통해 이미 자동 링크돼 있었다(`npx expo-modules-autolinking search -p android`) — 직접 의존성으로만 올렸다.
- **「설정에서 작성자 준비하기」 → 「모듈 다시 받기」**: 누르면 `onRedownload`가 다운로드 시작 ref(`essentialDownloadStarted`)와 완료 확인
  (`downloadProceedConfirmed`)을 **먼저 되돌린 뒤** 필수 에셋을 다시 읽는다 — ref를 안 되돌리면 이번 세션에 이미 받은 적이 있을 때 진행 화면만 뜬 채
  아무것도 받지 않는다. 이미 준비돼 있으면 홈으로 돌아온다.
- 큰 제목 줄높이는 보드 .9가 아니라 글자 크기(44)다(#98 — iOS가 윗부분을 자른다).
- **★ `flexWrap: "wrap"` + `minHeight`인 행은 `alignContent: "center"`도 있어야 가운데다** — 줄 바꿈을 허용하면 Yoga가 줄 묶음을
  `alignContent`(RN 기본 `flex-start`)로 놓아 `alignItems: "center"`는 줄 안에서만 가운데이고 여분이 모두 아래로 간다(2026-10-06 설정·개발자·
  진단 `Row` — 글자가 위 구분선에 붙고 아래 22dp가 비었다). jest는 레이아웃을 재지 않으므로 `uiautomator dump`의 bounds로 위·아래 여백을 잰다.
- 테스트 함정: fake timers를 쓰는 스위트에서 `act(() => …)`(동기)로 핸들러를 부르면 **다음 테스트의 effect가 flush되지 않았다** — `await act(async …)`.
  python으로 테스트에 정규식 `\b`를 쓰면 백스페이스가 박힌다(AGENTS 위 규칙 그대로 — `diary-list.test.tsx`·`day-preview.test.ts`·
  `material-grid.test.tsx`에 이전부터 박힌 것이 남아 있다, 그 단언들은 아무것도 검사하지 못한다).

### 056 — 매일 쓰는 시각과 장소 이름

- 「일기」 묶음은 토글 → 「매일 쓰는 시각」(토글이 켜졌을 때만, 높이 0 ↔ 잰 높이 200ms) → 「장소 이름으로 보기」(늘)다. 행을 누르면 대화상자
  (`TargetHourDialog` 보드 `6f`, `PlaceNameDialog` `6l`)가 열리고 **둘 다 칸을 누르면 바로 적용·닫힌다**(저장소 소유자 결정 — 보드 `6f`의 「저장」을
  뒤집었다). 옛 24칸 시각 목록·장소명 카드·알림 거부 안내(020 N8)는 걷었다. 펼침은 안쪽 행을 절대 배치로 빼고 감쌈 높이만 옮긴다(052 교훈).
- 표기·격자·미리보기·시간대 줄은 순수 함수 `src/app/target-hour.ts`(`src/ui/`를 import하지 않는다 — 문장 틀도 거기 둔다). **미리보기의 날은
  0–11시면 「어제」, 12–23시면 「그날」**이다 — 오전 시도 창에서는 `selectableDays`에 오늘이 없어 어제를 쓴다(판정은 그대로, 문구가 사실대로).
- **기기 시계는 Hermes `Intl`로 읽는다**(`src/app/device-clock.ts`, 새 네이티브 모듈 0). 실측(SM-S901N): `{ hour: "numeric" }`의 `resolvedOptions()`가
  `hourCycle: "h12"`·`timeZone: "Asia/Seoul"`을 준다. 기기의 「24시간 형식」 스위치는 이 통로로 보이지 않는다(미확인). 도시 이름은 사람이 못 박은 표
  (`CITY_NAMES`), 없으면 식별자 꼬리. GMT는 `-getTimezoneOffset()`.
- 기본 시각은 22(파일 없음·깨진 칸만 — 저장된 7은 그대로). `applyTargetHour`는 저장이 실패하면 지금 값을 돌려주고 다시 예약하지 않는다.
- **설정 값(자동 쓰기·장소 갈래)은 `AppFrame`이 한 번 읽어 들고 있다** — 설정 겹은 닫히면 언마운트되므로 거기서 읽으면 열 때마다 「설정을 읽는 중…」이
  보였다(055). 그래서 020 B5의 재등록 effect도 `AppFrame`에 있다(설정을 열지 않아도 앱을 열면 재등록). 토글 꺼짐 손잡이는 `textMuted`(면 대비 4.54:1).
- **★ 공용 대화상자 틀은 화면보다 높아지면 안전 영역 안에서 본문이 스크롤된다**(050 `Dialog.tsx` DLG8) — 글꼴 2.0배에서 장소 대화상자가 상태
  표시줄·내비게이션 바 밑으로 넘쳤다(jest 초록, 실기기에서만 보임). 포털은 edge-to-edge 화면 전체라 덮개에 인셋을 직접 더하고(`SafeAreaInsetsContext`,
  없으면 0), RNR `dialog.tsx`의 면 감쌈 `Pressable`에 `maxHeight: "100%"`가 있어야 면이 줄어든다. 제목 아래 보조 줄은 본문 첫 줄이 아니라
  `subtitle`로 준다(음수 여백으로 당기면 스크롤 뷰 위에서 잘린다).
- 대화상자 안 글자의 줄높이는 보드 body 1.55를 곱한다(`AppText` 기본 22를 물려받으면 13은 높고 16은 낮다). 055 설정 행 라벨·값(15)은 아직 22다.
- Maestro `settings-time-place.yml`(FLOWS 등록, 실기기 통과) — 끝에서 시각 22·장소 「자동」으로 두고 꺼져 있던 토글을 켠 채 끝난다(기기 설정이 바뀐다).
  `scheduled-diary-notification`·`diary-body-screen`은 해당 단계만 새 자리로 고쳤고 여전히 FLOWS 밖이다.
- **미확인**: 위치 권한이 없는 기기에서 「켬」의 권한 창, 24시간 형식 스위치를 켠 기기, 글꼴 2.0배의 날짜로 이동 달력.

### 057 — 자동 쓰기 규칙

- **판정은 `src/schedule/auto-write.ts` 하나를 두 경로가 함께 쓴다** — 백그라운드(`task.ts`)와 앱을 열 때(`App.tsx` `DiarySection`). 020 `decideSchedule`
  (켜짐·시도 창 3시간·사흘 중 안 쓴 날)은 그대로 두고, 그 날의 미리보기(`wiring.previewDay` — 파이프라인과 같은 신호 통로)로 순서 고정 판정을 얹는다:
  사진 권한 없음(`photoAccess` `denied`·`blocked` — 053이 「아직 묻지 않음」도 `denied`로 옮긴다) → 053 `decideMaterial`이 `write`면 쓴다 → 그 밖은 재료 없음.
  **위치 권한만 없고 사진이 있으면 쓴다.** 권한은 있는데 사진을 못 읽은 날(`unknown`)도 재료 없음이다(쓰지 않되 0으로 세지 않는다). 돌 일이 없으면 신호를 읽지 않는다.
  `src/schedule/` → `src/app/material.ts` import는 `task.ts`의 `app/wiring` import와 같은 방향이다(헌법 검사 통과).
- **기록은 사진 권한 건너뜀만, 날짜 하나다**(`preferences/auto-write-skipped.json` `{"day"}`, `skip-store.ts`) — `auto-diary.json`에 넣지 않는다(020 S7, D3).
  `AppFrame`이 마운트·전경 복귀 때 사진 권한을 읽어 `granted`·`limited`면 지우고(읽기 실패면 지우지 않는다), 설정은 그 날을 받아 **사진 꼬리표가
  「허용 안 함」일 때만** 사진 행 아래 빨간 줄(「어제/M월 d일 자동 쓰기를 건너뛰었어요」, `skippedLineText` — 「어제」는 건너뛴 날 기준)을 그린다.
  RN `Text`에는 보드의 `word-break: keep-all` 대응이 없다.
- **앱을 열면 쓰는 중**은 `runAutoDiaryTask`가 아니라 홈의 054 제자리 쓰기다 — `DiarySection`이 판정해 `autoWriteDay`를 넘기고, `DiaryHomeScreen`이 목록을 읽은 뒤·덮이지
  않음·대화상자 없음·그 날이 아직 안 쓴 날·`resolve`가 `resolved`일 때만 `claimAutoWrite()`를 부르고 시작한다(053 재료 확인 없이). claim은 `AppFrame`의 ref로
  **한 실행에 한 번**이고 040 `autoGenerateTried`가 서 있으면 거짓이다(첫 실행이 이긴다 — 첫 실행 단계 동안은 `DiarySection`이 아예 안 그려진다). ref는 렌더가 아니라
  콜백 안에서 읽는다(React Compiler). `generate`의 `auto` 갈래는 `already-running`(백그라운드가 쥐고 있음)이면 토스트를 띄우지 않는다. effect 본문에서 `setState`를
  부르면 `react-hooks/set-state-in-effect`에 걸려 시작은 `Promise.resolve().then`으로 미뤘다. **테스트의 claim 대역이 늘 참이면 즉시 끝나는 파이프라인에서 무한히 다시
  시작한다** — 대역도 한 번만 참이게 쓴다.
- **완성 알림은 「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」 한 줄, 본문 없음**(`notification-text.ts`, `NotificationPort.present(day, title)`) — 020의 고정 문구
  「오늘의 일기가 준비됐어요」는 지난날을 써도 「오늘」이라 걷었다. 이름은 035 `displayNameOf` + `loadCustomNames`(읽기 실패면 기본 이름).
- **2026-10-02 dev 실기기(SM-S901N)**: 목표 9시, 10월 1일 일기를 잠시 빼서 확인했다. (1) 사진 0장인 날 — 앱을 열어도 쓰기 시작 안 함, 헤드리스 잡(09:15:47, 0.4초) 뒤 일기·알림·기록
  없음. (2) 설정 앱에서 사진 권한을 끈 날 — 잡(09:32:38) 뒤 일기 없음·기록 `{"day":"2026-10-01"}`, 설정 사진 행에 「어제 자동 쓰기를 건너뛰었어요」 + 「허용 안 함」,
  권한을 허용하고 돌아오니 줄·파일 모두 사라짐. (3) `seed:day`로 사진 4장을 심고 앱을 다시 여니 홈이 10월 1일을 고른 「쓰는 중」으로 시작해 약 80초 뒤 그 날의 쓴 날
  홈으로 끝났다. (4) 9월 30일을 빼고 사진을 심은 뒤 헤드리스 잡(09:47:38~09:50:55) — 알림 제목 「은동이가 9월 30일 일기를 다 썼어요」, 본문 없음.
  (5) 글꼴 2.0배의 사진 행 — 보조 줄이 「9월 11일 자동 쓰기를 / 건너뛰었어요」로 낱말 경계에서 두 줄이 되고 꼬리표·›는 그 아래 줄로 내려가 겹치지 않는다.
  **권한을 설정 앱에서 바꾸면 앱 프로세스가 죽어 다시 열면 홈부터다**(`pm revoke`와 같다). 오전 시도 창이 어제를 쓰는데 일기 본문이 「오늘 주인은」으로 시작했다 — 프롬프트의
  날 표현 문제로 이 조각 밖이다(원칙 II 관찰로 남긴다).

### 058 — 이 휴대폰

- 설정 「이 휴대폰」 묶음(권한 다음·정보 앞): 「쓰는 모듈」은 필수 모듈 셋(`ESSENTIAL_ASSET_KEYS`)의 `bytesUsed` 합을 **1000 기준**으로 옮긴 문자열(`src/app/module-size.ts`
  — 안드로이드 저장 공간 화면과 같은 기준, 지금 「2.0GB」). 화면은 문자열만 받는다(`UI_TOUCHES_ASSET`). **`(1.95).toFixed(1)`은 「1.9」다** — 0.1GB 단위로 먼저 반올림한다.
- **일기 모두 지우기의 순서**(`src/app/wipe-diaries.ts`, 통로 주입 조합): 쓰기 잠금(020, owner `"screen"`)을 얻고 → 알림 확인 기록 읽기 → 일기 파일 → 사진 사본 자리(`vision-cache`)
  비우기 → `notified.json` `{}` → 트레이 알림 거두기 → 잠금 놓기. **일기를 사진 사본보다 먼저** 지운다(반대면 실패 때 「이 사진은 이제 없다」 반쪽 상태). `notified.json`을 남기면
  지운 날을 다시 썼을 때 「이미 확인함」으로 완성 알림이 빠진다. **057 건너뜀 기록·이름·설정·모듈은 지우지 않는다** — 통로조차 받지 않는다. 잠금을 못 얻으면(백그라운드가 쓰는 중)
  아무것도 지우지 않고 지우기 행 아래 빨간 한 줄(보드 밖 문구). `DiaryStore.removeAll()`은 `YYYY-MM-DD.json`·`.json.writing`만 지운다(디렉터리 통째 금지).
- **★ 쓰는 중이면 홈이 먼저 멈춘다**: 홈을 다시 마운트하는 것만으로는 생성이 멈추지 않는다 — 그대로 두면 지운 뒤에 저장된다. `AppFrame`이 요청 토큰(`wipeRequest`)을 내리고,
  `DiaryHomeScreen`이 054처럼 `cancelled` + `stop()` 뒤 **도는 생성의 Promise(`inFlight`)가 끝날 때까지 기다린 다음** `onWipeReady(token)`. 그 뒤 지우고 설정을 닫고 오늘로 두고
  `DiarySection`의 key(`diary-${autoGeneratedToken}-${diaryKey}`)를 올린다. 홈은 마운트 때의 토큰에 응답하지 않는다(다시 마운트된 뒤 두 번 지우지 않게).
- 0편이거나 편수를 못 읽었거나 지우는 중이면 행이 회색이고 누를 수 없다 — **누를 수 없는 행은 `onPress`도 넘기지 않는다**(RNTL `fireEvent.press`는 합성 부모의 `onPress`까지
  찾아 올라가 `View`로 바꾼 것만으로는 테스트가 통과하지 않았다). 「지우기」 버튼은 `DialogActionButton tone="danger"`(보드 `accent-700`) — 다른 대화상자는 accent 그대로다.
  **저장소 소유자 확인 대상**(R8).
- **2026-10-02 dev 실기기(SM-S901N)**: 백업 → 11편 확인 → 쓰는 중에 지우기(205초 뒤에도 0편, 토스트 없음) → 남는 것 md5 동일 → 잠금에 막힘 → 복원. 상세는
  `specs/058-settings-this-phone/quickstart.md` 끝. **위반 주입 스크립트에서 `cp` 백업 경로가 디렉터리면 복원이 조용히 실패한다** — 주입 뒤 원래 문자열이 돌아왔는지 다시 grep한다.

### 059 — 개발자 메뉴

- **켜짐은 별도 파일이다**(`preferences/developer-menu.json` `{"enabled":true}` 하나, 끄면 파일을 지운다). 개발 환경(`local`·`dev`)은 **환경이 이긴다** — 처음부터 켜져 있고 파일을 읽지도 쓰지도 않으며 「끄기」는 그 실행 동안만이다. 켜는 길은 설정 「버전」 1초 안 7번 탭(4번째부터 「N번 남았어요」)이고 순수 판정은 `src/app/developer-taps.ts`다.
- **설정 겹은 개발자 겹 아래에 열려 있다**(`route`는 단일값이라 겹이 닫히지 않게 설정 `open = settings||developer`, `active`는 개발자가 아닐 때만). 진단은 개발 환경에서만 개발자 위에 한 겹 더 그린다(배포에는 행도 트리도 없다).
- **★ `forceOnboarding`이 완료된 기기에서 죽어 있었다**(옛 `permissionStepsDecided` 식이 `completed`면 무조건 참) — `src/app/onboarding-gate.ts`가 판정을 맡는다. 「온보딩부터 다시」는 끝난 단계를 건너뛰고(권한은 매번 실시간 재판정) **모델 파일을 지우지 않는다**.
- **「모듈 다시 받기」도 모델 파일을 지우지 않는다**(037) — 빠지거나 잘린 것만 받고, 모두 준비돼 있으면 토스트(`planRedownload`). 용량 문구는 `expo-network`가 **`CELLULAR`일 때만** 낸다(Wi-Fi·모름·이더넷은 안 낸다 — 모르면 문구를 안 내는 쪽이 원칙 V). 새 네이티브 의존성이라 매니페스트(`ACCESS_NETWORK_STATE`)를 `dumpsys`로 확인했다.
- **`stopHome()`은 058의 지우기·다시 받기·온보딩 다시가 함께 쓴다** — 쓰는 중 생성이 끝날 때까지 기다린 뒤에야 파일·플래그를 건드린다.
- 모듈 줄의 「loaded」는 파일 준비 상태이지 메모리 적재가 아니다(어휘 어긋남, 보드 문구를 따랐다). 크기는 1000 기준.
- 059가 지운 것: `CharacterListScreen`·`PermissionsSection`·`AuthorPicker`(와 그것만 쓰던 `CharacterPicker`·`ListRow`·`SelectRow`)·자기 테스트·`FLOWS` 밖 Maestro 흐름 일곱. 되살린 넷은 FLOWS에 등록했다.
- **2026-10-02 dev 실기기(SM-S901N)**: 개발 환경 항상 켜짐·끄기/켜기·「이미 모두 준비돼 있어요」 토스트·온보딩 다시(배터리 단계만, `files/models` 그대로)·배포 환경(prod 번들) 7번 탭/저장/진단 없음/끄기 후 파일 삭제를 확인했다. 되살린 Maestro 넷도 `maestro test`로 직접 돌려 통과했다(실행기는 `pm clear`를 하므로 쓰지 않았다; `diary-body-screen`의 옛 「일기」 단언을 고쳤다). **미확인**: 잘린 모듈의 실제 내려받기 확인·쓰는 중의 온보딩 다시·release. 상세는 `specs/059-developer-menu/quickstart.md` 끝.

### 060 — 진단 화면

- **화면은 값과 핸들러만 받는다**(`DiagnosticsScreen`, 059 `DeveloperScreen`과 같은 방식) — 조립은 `App.tsx`의 `DiagnosticsLayer`이고 값은 `src/app/diagnostics-view.ts`(순수)가 문자열·태그로 옮긴다.
  문구 정본은 `src/app/diagnostics-text.ts`다(`src/app/`이 `src/ui/`를 import하지 않는 선례 — `target-hour.ts`). 옛 `GenerationProbe`가 만들던 진단 전용 파이프라인이 없어졌다 — **진단에서 일기를 쓰는 길은
  홈의 제자리 쓰기 하나다**(`writeRequest` 번호표 + 누른 순간의 오늘; 홈은 덮어쓰기·재료 확인 없이 시작하고 이미 쓰는 중이면 요청만 비운다 — 042 「검증 경로가 제품과 다르면 검증이 아니다」).
- **쓰기 실패 기록은 `preferences/write-failures.json`**(`src/app/write-failures.ts`) — **이유 갈래(다섯: 모듈·사진·빈 글·저장·그 밖)와 시각뿐, 최근 10건**(D3·원칙 IV; 보드 문구 넷에 안 맞는 시간 초과·판정 거부를 넷으로 뭉치지 않으려고
  「일기를 쓰지 못함」을 다섯째로 더했다). **파이프라인 안이 아니라 결과를 소비하는 세 곳이 부른다**(홈 `generate`의 그만두기 걸러낸 뒤·`runAutoDiaryTask`·첫 실행 자동 첫 일기) — 파이프라인 안에서 기록하면
  그만두기와 OS 중단을 가를 수 없다. 건너뜀·`already-running`·그만두기는 기록하지 않는다. 홈은 기록 통로를 모른다(`recordFailure` prop, 조립부가 연결). 058 지우기는 이 파일을 지우지 않는다.
- **「자동 쓰기 지금 실행」은 `runAutoDiaryTask({ manual: true })`** — 설정 입력 둘(켜짐·목표 시각)만 덮고(`src/schedule/manual.ts`) 판정 함수(`decideSchedule`·`resolveAutoWrite`·`selectableDays`)는 한 줄도 안 건드린다.
  그 파일의 `getHours()`가 DB11(하루 기준 계산) 허용 목록에 이유와 함께 올라 있다. 이미 쓴 날·재료 없음·사진 권한 없음·정오 규칙은 그대로라 재료 없는 날에 누르면 「건너뜀」이 정상이다.
- **저장 점검은 일기를 다시 읽어 센다**(`inspectDiaries` — `listDays`·`load`만 받는다, 목록을 못 읽으면 정상이 아니라 빈 값). 옛 점검(`checkStorage`)은 먼 과거 날짜로 파일을 쓰고 되읽는 왕복이라 지웠고 `collectReport`는
  환경·추론 위치·프롬프트 미리보기만 모은다. 「기기 · CPU」는 `llama-port.ts`의 `GPU_LAYERS = 0` 고정에 근거한다 — 그 상수가 바뀌면 소스 계약이 깨져 문구를 같이 고치게 한다.
- **조용히 무력해질 뻔한 것**: `DIAGNOSTICS_HIDES_AXES`가 사라진 `SignalProbe.tsx` 경로만 가리켰다 — 새 세 파일로 옮겼고 「규칙이 적은 `src/` 경로가 모두 존재한다」는 테스트(CC3)가 이를 막는다. 옛 컴포넌트를 소스로 읽던
  042 계약(`photo-vision-always.test.ts`)도 「진단은 `pipeline.run`을 안 부르고 사진 보기는 홈 `generate`의 `vision: "quick"` 한 곳」으로 옮겼다. **테스트 파일 이름이 대상을 가리키지 않을 수 있다**
  (`auto-diary-trigger.test.ts`는 옛 버튼이 아니라 `triggerFirstRunAutoDiary`를 잠근다) — 삭제 전에 열어 본다.
- **★ 문구 계약 테스트가 초록이어도 모양은 보드와 다를 수 있다**(047의 교훈이 060에서 되풀이됐다) — 개발자·진단 화면이 보드 `6e`·`6h`와 달라 사용자가 지적했다. 보드 마크업을 헤드리스 크롬(`--screenshot`은 윈도우 경로로 쓴다)으로 열고 인라인 스타일의 치수를 읽어 맞춘다. 이 기기는 360dp 폭이라 보드(402)보다 모든 것이 비례해 커 보인다 — 비교는 화면 비율이 아니라 dp 치수로 한다.
- **★ 안드로이드 14+의 글꼴 배율은 비선형이다** — 큰 글자(62·48)는 거의 안 커져 옆의 작은 글자와 어긋난다. 큰 숫자는 `useFontScale()`(`src/ui/font-scale.ts`)를 선형으로 곱하고 `allowFontScaling={false}`로 한다(홈 큰 날짜·사진 수·장소 수). jest의 `Dimensions.get("window").fontScale`로 같은 값을 읽어 테스트한다.
- **지면 안의 작은 스크롤 상자를 두지 않는다**(안드로이드 중첩 스크롤) — 프롬프트 미리보기가 안쪽 `ScrollView`일 때 끝에서 손가락이 바깥 지면으로 넘어가 화면 전체가 흘렀고(바깥 `scrollEnabled` 잠금도 무시됨) 마지막 줄이 잘렸다. 본문을 다 펼친다(보드 `6h` ⑤의 「안에서 따로 스크롤」을 뒤집음, 소유자 확인 대상).
- **2026-10-06 dev 실기기(SM-S901N)**: 일곱 묶음·저장 점검 「11편 · 정상」·신호 칸(숫자 칸 테두리/모름 칸 회색)·한 번 써 보기(홈 쓰는 중 → 쓴 날, 덮어쓰기 확인 없음, 토스트가 「그만두기」 바 위)·`chmod 500`으로 유도한 저장 실패 →
  「저장하지 못함」 한 줄(그만두기는 안 늘어남)·「건너뜀」·글꼴 2.0배·`prompt-preview.yml` 통과. 같은 날 후속으로 재료 있는 날의 자동 쓰기 지금 실행(일기·알림 생성)·깨진 일기의 「읽기 실패」(「13편 · 1편 읽기 실패」)·부분 허용의 「선택한 사진만」·앱 안 백그라운드 실행의 저장 실패 기록(`save`, 시각은 실행 시작 시각)도 확인했다. **미확인**: OS가 깨운 잡 자체의 실패 기록·앱 연 직후 첫 1분에 「자동 쓰기 지금 실행」이 「사진을 읽지 못함」으로 세 번 실패한 원인(이후엔 재현 안 됨)·240ms 겹 닫힘 녹화 확인. 상세는
  `specs/060-diagnostics-screen/quickstart.md` 끝.

### 061 — 일기 프롬프트 교체 (날의 갈래 넷·따로 묻는 제목)

- **문안의 원본은 my-ollama `scripts/device-repro/variants.ts`다**(`R16.u1` 신호 있는 날·`R17.x1` 신호 없는 날·`R18.y3` 하루가 안 끝난 신호 없는 날(063), 기기 등가 6,180런). `prompt.ts`의 한국어 경로는 그 행과
  10케이스 프롬프트·`instructionLines`·제목 질문이 **글자 단위로 같다**. 문안을 고치려면 my-ollama에서 다시 재고 바이트 대조를 다시 돌린다 — 여기서 손으로 다듬지 않는다.
  측정 장치(케이스·채점·대조 도구)는 이 저장소에 두지 않는다(원칙 IV).
- **바이트 대조 도구는 Windows에서 그대로 안 돈다**: `gen-prompts.ts`의 `await import(resolve(dir, …))`가 `ERR_UNSUPPORTED_ESM_URL_SCHEME`(`pathToFileURL`이 필요),
  `variants.ts`의 진입 가드 `import.meta.url === file://${argv[1]}`는 Windows 경로에서 거짓이라 `--round`가 아무것도 쓰지 않는다. 그리고 `assertBase()`는 옛 프롬프트와
  비교하므로 061 이후에는 **실패하는 것이 정상**이다. 기대값은 `R16`·`R17`·`R18`을 export한 스크래치 복사본에서 뽑는다. 원본 `R18.y3`은
  `S_DAY_OPEN`을 `instructionLines` 맨 앞에 끼우고 제품은 머리 넷 뒤에 둔다 — 되뱉기는 집합으로 보므로 순서 차이는 무해하고 대조는 집합으로 한다.
- **날의 갈래**(`dayKindOf`, 저장 안 함): ① 캡션 있음 / ② 사진 0장(`none`·관측된 0) / ③ 사진은 있고 캡션 없음 / ④ `unknown`(권한 없음). ④가 없던 때는 권한 없는 날의 꼬리가
  「한 장도 보지 못해서」로 기록(「사진은 모른다」)과 다른 말을 했다(원칙 V). 본 장면 없는 날은 기록 머리줄(「오늘 내가 본 것은 이렇다.」)을 싣지 않는다. **하루가 안 끝났으면
  `S_DAY_OPEN`이 날의 갈래와 무관하게 기록 첫 줄이다**(063) — 061은 본 장면 없는 날에 그것을 꼬리의 1인칭 문장으로 옮겼는데 그 날의 꼬리가 가장 길어져 낭독 거부가 났다.
- **꼬리 문안 규칙**(어기면 지시문이 일기로 나온다): 「~로 시작하고」가 가리키는 문장을 꼬리 첫 문장이 **품되 같지 않게** 한다(글자까지 같으면
  「여기부터 베끼라」로 읽혀 판정 통과 10/48, 063 지시서 §10.4) · **꼬리를 길게 만들지 않는다**(한 문장 더 붙은 날만 낭독 거부) · **금지문을 쓰지 않는다**(「탓하지는 않는다」가 본문에 64%) ·
  「상상」을 쓰지 않는다(지어내기의 직접 원인). **잘 듣는 자리(꼬리)가 베끼는 자리다** — 설명과 금지는 머리로.
- **제목은 판정 통과 뒤 두 번째 호출이다**(`GenerationEngine.ask`, `titleQuestion()`). 답이 `eos`·한 줄·`MAX_TITLE_LENGTH` 이하일 때만 「제목 + 빈 줄 + 본문」으로 잇고 나머지는 본문만 —
  제목 때문에 일기를 버리지 않는다. 제목 호출의 한도는 본문과 같은 값을 한 번 더 쓴다(새 숫자 없음). 제목을 묻는 동안 그만두면 저장하지 않는다.
- **`isEcho`는 절 단위다**: 줄 전체 + 지시 어미로 끝나는 16자 이상의 절(따옴표 안 제외), 따옴표 모양·공백 무시. 꼬리가 260자라 줄 전체 비교로는 낭독 85편 중 3편만 걸렸다.
  `instructionLines()`에 **제목 질문과 언어 줄이 들어 있다** — P-7 「모든 줄이 프롬프트에 있다」는 제목 질문 한 줄을 빼고 성립한다.
- **남은 위험**: 받침 있는 이름(`'은동'이라`)은 재지 않았다 · 장면 중계·캡션 많은 날의 지어내기는 못 고쳤다(**캡션 상한은 8로 둔다** — 2026-10-06 소유자 결정, 지시서 §7. 다시 제안하지 않는다) · 053의 「기록 대신 상상으로 하루를 채워요」
  안내와 새 글(상상하지 않는다)이 다른 말을 할 수 있다 · 본 장면 없는 ③ 갈래에 `vision.available > considered`인 조합은 원본 케이스에 없어 「일부만 보았다」를 싣지 않기로 정했다.
- **기기와 같은 GGUF는 기기에서 꺼낼 수 있다**: `adb exec-out run-as com.a810labs.pocketlog cat files/models/a1.bin > …gguf`(md5가 지시서 값과 같았다). 이 개발 기계
  (i5-1240P, GPU 없음)에서 llama.cpp `win-cpu-x64` `-np 4 -t 8`로 240런에 약 50분.
- **합격선은 「판정 통과 100% = 지시문 낭독 0%」 한 줄이다** — 새 `isEcho`에서는 낭독이 곧 거부라 지시서가 따로 적은 두 줄이 겹친다(지시서 §10.1).
  본 장면 없는 날의 글은 매번 거의 같고 꼬리의 보기 낱말을 옮긴다(거짓은 없다). 캡션이 많은 날은 「가족·카페·책」 지어내기와 「오전에는… 저녁에는…」
  중계가 남았다(캡션 상한 8, 소유자 결정). 상세는 `specs/061-diary-prompt-swap/quickstart.md` 끝.

### 063 — 하루가 안 끝난 날의 꼬리·본 장면 없는 날의 제목 질문 (061 후속)

- `prompt.ts` 두 곳뿐이고 캡션 있는 날은 바이트가 그대로다. (1) 하루가 안 끝났으면 `S_DAY_OPEN`이 날의 갈래와 무관하게 기록 첫 줄이고 지시문 줄이다 —
  본 장면 없는 날 꼬리의 `DAY_OPEN_ME`를 지웠다(원본 `R18.y3`). 061의 판정 통과 237/240(거부 3편이 전부 이 날의 꼬리 낭독)이 **264/264**(그 날 48/48)가 됐다.
  (2) 본 장면 없는 날의 제목 질문이 사진이 아니라 휴대폰의 **마음**을 묻는다 — 권한 없어 못 본 날에도 「사진 없는 하루」로 단정하던 것(24/96)이 **1/120**이 됐다.
  남은 1편은 본문이 먼저 「사진이 없어」라고 단정한 것을 제목이 따랐다(합격선 0% 미달로 적었다).
- **미확인·관찰**: 권한 없는 지난날 실기기 일기가 「주인의 웃음소리와 말소리」를 지어냈다(원칙 II, 이 조각이 바꾼 자리 밖). 상세는 `specs/063-prompt-dayopen-title/quickstart.md`.

### 062 — 화면 문구의 다국어 구조

- **화면에 보이는 한글은 `src/i18n/catalogs/ko/`에만 있다**(헌법 검사 `checkI18nFile` B1). 카탈로그 밖에 한글이 남아도 되는 파일은
  `SCREEN_TEXT_ALLOWLIST`(`scripts/constitution-rules.ts`)에 이유와 함께 있다 — **모델 입력**(`prompt.ts`·`collect.ts` 까닭·`persona.ts` 이름·
  `liveness.ts`·`prompt-preview.ts` 프리셋)과 **화면에 안 그려지는 내부 이유**(pipeline·inference·readiness·acquisition·wiring)와 `acceptance.ts`(출력 판정).
  새 화면 문구는 카탈로그에 두고 `text()`로 읽는다. 언어 하나를 더하는 일은 `languages.ts` 한 줄 + `catalogs/<언어>/` 모듈 하나 +
  `CATALOGS`에 등록이다(`Catalog = typeof ko`라 빠진 항목·다른 함수 모양·요일 개수는 tsc가 짚는다 — `__tests__/i18n/catalog-types.ts`).
- **언어는 프로세스마다 한 번 정한다**(`src/i18n/current.ts`, Clarification Q1). 헤드리스 완성 알림도 같은 `text()`를 탄다. **★ 실측: 기기 언어를
  바꿔도 앱 프로세스는 다시 뜨지 않았다**(pid 그대로, 액티비티만 다시 만들어짐) — 그 프로세스는 옛 감지값을 들고 있다. 지금은 결과가 늘 한국어라
  보이지 않지만, 지원 언어가 둘이 되면 이 자리를 다시 판단한다. `am kill`로는 안 죽어 `am force-stop`으로 새 프로세스를 띄웠다.
- **`text()`를 모듈 최상단에서 평가하지 않는다**(C4) — 옛 이름(`SETTINGS_TEXT`·`OVERWRITE_CONFIRM`·`DIAGNOSTICS_TEXT` 등)은 `lazyText((c) => c.<영역>)`
  Proxy로 남아 읽는 순간 카탈로그에서 꺼낸다(배열은 `lazyList`). **그 속성을 모듈 최상단 상수에서 읽으면 불러오는 순간 기기를 읽는다** — 함수나
  처음 그릴 때 만드는 캐시로 둔다(`REASON_TEXT`·`AUTO_TEXT`·`SLIDE_ITEMS`를 그렇게 바꿨다). 카탈로그는 `as const`를 쓰지 않는다(K1).
- **조사(`particleFor` 등)는 화면 쪽에서 한국어 카탈로그를 거쳐서만 쓴다**(K6) — 프롬프트는 계속 `particle.ts`를 직접 쓴다. **문구로 분기하지 않는다**
  (`/준비/.test(screen.message)`를 값 비교로 바꿨다, B5).
- **회귀 방어는 골든 두 겹**(`__tests__/i18n/ko-golden.test.ts`): 이관 전 화면 문구 리터럴 집합 == 카탈로그 리터럴 집합(G1), 문구 함수·상수 출력
  바이트 동일(G2, 상수는 `JSON.stringify`로 키 짝까지). 그래서 카탈로그 영역은 옛 상수와 같은 키만 갖는다(새 문구는 `frame`·`diagnosticsLanguage` 같은
  별도 영역). 골든은 `GOLDEN_WRITE=1`로 다시 쓰지 않는다(「이전」이 사라진다).
- **`expo-localization`**: `npx expo install`이 `app.json`에 config plugin을 자동으로 넣는다 — 앱별 언어 목록을 선언하지 않기로 해서 되돌렸고, plugin
  없이 `getLocales()`가 돈다(실측). 권한 추가 없음(`dumpsys package` 전후 같음). 감지는 `locale-port.ts`가 호출 시점 `require`로만 한다(D4) — jest
  `logic`(node)에서는 「감지 못함 → 한국어」로 떨어진다.
- **기기 언어 바꾸기**: `cmd locale`에는 시스템 언어 명령이 없다(앱별 `set-app-locales`뿐) — 설정 앱 「언어」에서 추가·기본으로 설정·삭제로 바꾸고 되돌린다.
  진단 「환경」의 「언어 · {감지한 첫 태그} → {고른 언어}」가 통로를 눈으로 보는 유일한 자리다(FR-011b).
- `failure-text.ts`(죽은 코드)를 지웠고, `requirements.ts`의 `neededBy`는 주석으로 옮겼다. 관찰(062 밖): 완성 알림이 `diary-completed`가 아니라 expo
  기본 채널(「Miscellaneous」)로 게시되고 있었다. 상세는 `specs/062-ui-text-i18n/quickstart.md` 끝.

### 064 — 상태 흉내

- **흉내 값은 홈 표시에만 닿는다.** 홈이 이미 주입받던 시계(`now`)와 미리보기 통로(`previewDay`)만 갈아 끼운다(`src/app/simulation.ts`). 파이프라인·자동 쓰기
  판정·신호 수집에 닿는 것은 「쓰기를 막는가」(`simulationBlocksWriting`) 하나뿐이고 헌법 검사 `checkSimulationFile`(LK1~LK3)이 잠근다 — `resolveAutoWrite`는
  흉내가 켜져도 실제 `wiring.previewDay`를 본다. 「재료 0」은 `signals/fake.ts`가 아니라 `DayPreview` 모양만 만든다.
- **기록은 `preferences/simulation.json`**(날짜 + 토글 셋, 모두 끄면 파일을 지운다). 개발 환경에서만 읽고 쓴다 — 배포 환경은 기록이 남아 있어도 읽지 않는다(`effectiveSimulation`).
  개발자 메뉴 「끄기」가 지운다. 헤드리스 `runAutoDiaryTask`는 화면이 없으므로 파이프라인을 만들기 **전에** 기록을 직접 읽어 `"skipped"`로 끝낸다(알림·실패 기록 없음).
- **다섯 쓰기 진입점**: 홈 쓰기 바(`write()` 맨 앞 — 재료·덮어쓰기 확인도 안 뜬다, 059 토스트 줄에 차단 문구 2초), 057 앱 열기 자동 시작, 060 진단 쓰기 요청, 진단 두 버튼,
  백그라운드. 이미 쓰는 중인 쓰기는 멈추지 않는다(시작만 막는다).
- **★ 흉내 기록은 마운트 뒤 비동기로 읽힌다** — 읽기 전에 057 자동 시작이 claim을 얻지 않게 `claimAutoWrite`가 `loaded` 전에는 소모하지 않고 거짓이다. 저장된 날짜 흉내는
  읽은 뒤 `onLoaded`로 홈의 고른 날이 된다(앱을 열면 오늘이다 — 049) — 처음 구현은 앱을 다시 열면 DEV는 서는데 고른 날이 실제 오늘이었다(실기기에서만 드러남).
- **★ 고정폭(`monospace`) 글꼴의 한글은 가로 줄 안에서 좁게 재여 잘린다** — 개발자 화면 묶음 머리의 「개발 빌드만」이 「개발」만 보였다(060부터 진단 묶음에도 있던 결함).
  글꼴을 빼서 고쳤다. 세로 묶음의 고정폭 보조 줄은 폭이 넉넉해 드러나지 않는다. 고정폭 글꼴은 라틴 문자에만 쓴다.
- 회색 쓰기 바 글자는 보드 neutral-700이 면 위 4.39:1이라 neutral-800(`SIMULATION.barText`, 6.81:1)이다. 날짜 대화상자는 `DateJumpDialog`를 쓰지 않는다(미래 칸을 막는다) —
  같은 datepicker 격자 위에 「끄기」·「취소」.

### 066 — iOS 시뮬레이터 스파이크

- **되는 것**(iPhone 17 시뮬레이터, iOS 26.5, Xcode 26.6, dev 빌드): 권한 셋 → 동의 → 모듈 내려받기(약 2GB) → 작명 → 홈 사진 3장 인식 → 사진 읽기 →
  본문·제목 → 저장 → 쓴 날 홈(약 50초). **안 보는 것**: 백그라운드 자동 쓰기(시뮬레이터가 BGTask를 스케줄하지 않는다), 실제 iPhone의 메모리·속도, release·서명·TestFlight.
- **★ `initMultimodal`의 기본값(`use_gpu: true`)이 시뮬레이터 Metal 드라이버 안에서 앱을 죽인다** — `clip_model_loader::load_tensors` → `lm_ggml_metal_buffer_set_tensor`
  → `_xpc_api_misuse`(SIGTRAP). JS에는 아무것도 안 오고 앱이 홈 화면으로 사라진다(크래시 보고서는 `~/Library/Logs/DiagnosticReports/Pocketlog-*.ips`). `use_gpu: false`로
  고정했다 — **iOS에서만**(`on-device.ts`가 `createVisionEngine`에 `projectorOnGpu: !isIOS()`를 넘기고, 안드로이드는 `use_gpu`를 보내지 않아 라이브러리 기본값 그대로다 —
  013·023의 안드로이드 캡션 실측이 그 기본값으로 쟀으므로 손대지 않는다; engine.test.ts·on-device.test.ts가 잠근다). 본문 모델의 `n_gpu_layers: 0`과 같은 결정. **근거(2026-10-08 조사)**: llama.rn README가 「iOS 시뮬레이터는 Metal 미지원」을
  명시하고 `initLlama`는 네이티브가 `TARGET_OS_SIMULATOR`에서 `n_gpu_layers`를 0으로 꺾지만(`RNLlamaJSI.cpp` `getMetalAvailability`), **`initMultimodal`의 `use_gpu`는
  그 가드 없이 그대로 `mtmd`로 간다**(`RNLlamaJSI.cpp` 1910행 → `rn-llama.cpp` 722행) — 시뮬레이터 크래시는 llama.rn의 빈 구멍이다. 실기기도 안전하지 않다: llama.rn
  #176(iPhone 15 Pro Max, iOS 18.5/26, Gemma 3 4B)에서 `use_gpu: true`가 「Failed to evaluate chunks」로 실패했고 우회가 `use_gpu: false`였다(미해결로 닫힘). 그 실패는
  우리 코드에선 크래시가 아니라 `vision-failed`로 떨어져 **사진 있는 날이 전부 안 써진다.** 대가는 속도다 — Metal이 서는 기기에서는 CLIP 인코딩이 CPU보다 느리다(수치는
  미실측; llama.cpp 본문 생성 기준 A17 Pro에서 GPU 32 vs CPU 12 tok/s). 실제 iPhone이 생기면 「GPU로 켠 뒤 캡션 성공·시간」을 한 번 재고 그때 되돌릴지 정한다.
- **★ 내려받기 실패가 화면에 안 보였다** — `downloadEssentials()`는 실패를 `{ ok: false }` 값으로 돌려주는데 `App.tsx`가 `.catch`만 봐서 「받는 중이에요」에 영영 머물렀다
  (안드로이드에도 같은 코드). 값 실패도 `downloadFailed`로 옮겼다(AppFrame.firstrun.test.tsx 066).
- **일기의 사본 경로는 절대 경로로 저장된다** — iOS는 업데이트마다 컨테이너 UUID가 바뀌어 옛 일기의 사진이 「이제 없어요」가 된다. 저장 형식은 두고 `fileStore.load()`가
  `rehomeResizedPath()`(`src/diary/photo-path.ts`)로 지금 자리에 옮긴다(`FileSystemPort.documentDirectory?`). 리사이즈를 건너뛴 원본 경로(013 C1)는 손대지 않는다.
  **`VISION_CACHE_DIRECTORY`의 자리는 이제 `diary/photo-path.ts`다**(`on-device.ts`는 재export).
- **iOS 권한 문구는 `app.json`의 플러그인 옵션이 유일한 자리다** — 안 주면 "Allow Pocketlog to access your photos" 영어 기본값이 권한 창에 그대로 뜬다. 사진 저장·항상 위치는
  `false`로 키 자체를 뺐다(`__tests__/config/ios-permissions.test.ts`). 생성된 `ios/Pocketlog/Info.plist`의 `UsageDescription`으로 확인한다.
  **★ 모션(`NSMotionUsageDescription`)은 빼면 안 된다** — 빌드 1이 업로드는 통과하고 **처리 단계에서 ITMS-90683으로 거부**됐다(메일로만 온다, TestFlight 목록에는 아무것도 안 뜬다).
  앱은 모션을 안 쓰지만 `expo-location`이 CoreMotion API를 참조해 Apple 정적 검사가 문구를 요구한다. `altool --validate-app`은 이것을 못 잡는다.
- **iOS 기본 줄바꿈은 글자 단위다** — 「처음 뵙겠습/니다.」. `AppText`가 `lineBreakStrategyIOS="hangul-word"`를 기본으로 준다. 작명 화면은 키보드가 뜨면 버튼 줄이 키보드 뒤라
  리턴 키(`returnKeyType="done"`·`onSubmitEditing`)가 버튼과 같은 규칙으로 확정한다.
- **앱 아이콘은 자리표시자다**(토큰 색의 빨간 사각형 + 「P」, `assets/icon.png`) — Expo 기본 아이콘이 iOS에 그대로 나왔다. 안드로이드 adaptive icon도 아직 Expo 기본이다(미교체).
- **도구**: `xcodebuild`는 `sudo xcode-select` 없이 `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`로 쓴다. `pod install`은 `~/.netrc`가 644면 거부한다 — 파일을
  안 고치려면 `NETRC=<빈 디렉터리>`. **TLS를 가로채는 네트워크에서는** 시뮬레이터에 그 네트워크의 루트 인증서를 넣어야 모델이 받아진다
  (`xcrun simctl keychain <UDID> add-root-cert <루트 인증서>.pem`) — 그 전에는
  `UnableToDownloadException: … TLS 오류`. 화면 조작은 Maestro(`brew install mobile-dev-inc/tap/maestro`, `JAVA_HOME`을 Homebrew openjdk로 줘야 뜬다)로
  `maestro --device <UDID> test <flow>`. 사진은 `xcrun simctl addmedia <UDID> *.jpg`로 넣되 **EXIF 촬영일이 있으면 그 날로 들어간다** — 오늘로 넣으려면 EXIF를 걷어낸 JPEG
  (`sips -s format bmp` → 다시 jpeg). 앱 데이터는 `xcrun simctl get_app_container <UDID> com.a810labs.pocketlog data` 아래 `Documents/`(일기·모델·preferences 모두).
- **재설치로 컨테이너 UUID가 실제로 바뀌었고**(`C1CE7ED7…` → `2150CF50…`) 옛 경로가 남은 일기의 사진이 `rehomeResizedPath`로 정상 표시됐다. 그 뒤 iOS 한정 `projectorOnGpu`로 바꾼
  번들에서 「다시 쓰기」가 두 번 연속 `photos`(사진 읽기) 실패로 기록된 뒤(09:01·09:05, 크래시 없음, 원인 미상 — 그 프로세스는 Metro 재시작 뒤 홈 화면으로 튕겼다 돌아온 상태였다)
  앱을 다시 띄우니 두 번 연속 저장됐다(`isIOS()` 참, 캡션 `seen`). **같은 프로세스에서 Metro를 다시 띄웠으면 앱도 다시 띄운다.**
- **★ `await import("react-native")`는 iOS에서 앱을 죽인다**(TestFlight 빌드 2 — 설정의 권한·배터리 행을 누르는 즉시 종료). Metro의 동적 import는 index의 모든
  export getter를 훑고(`metroImportAll`), `PushNotificationIOS` getter가 네이티브 모듈 없이 `new NativeEventEmitter()`를 만들다 던진다. 그 예외는 모듈 로드 가드가
  fatal로 보고해 **호출부의 try/catch를 지나친다**(Release는 SIGABRT, 크래시 보고서 없이 SpringBoard 로그에만 남는 경우가 있다). `react-native`는 호출 시점
  `require`로 읽는다(`os-settings-port.ts`·`battery-exception-port.ts`; 계약 테스트가 동적 import를 막는다). 안드로이드는 그 getter가 던지지 않아 드러나지 않았다.
- **★ iOS Hermes의 `formatToParts`는 `GMT+9`의 「9」를 `minute`으로 돌려준다** — dayjs 시간대 플러그인이 시간대 차이를 `+09:09`로 재고, datepicker의 `onChange`가
  주는 「그 날의 자정」이 전날 23:51이 된다(달력에서 5일을 누르면 4일이 골라졌다). `dayDateFromPicker()`가 Date를 가장 가까운 로컬 자정의 날로 읽는다(반나절을 더해
  `dayOf`). 칸에 그려지는 날(dayjs `format`)은 처음부터 옳았다 — 어긋난 것은 `onChange`의 Date뿐이다.
- **하단 바는 쓰기·그만두기 직후 `WRITING.barLockMs`(1.5초) 동안 잠긴다**(흐리고 눌리지 않음, 2026-10-08 저장소 소유자 지시). 화면 버튼만 막는다 — 자동 쓰기·진단
  쓰기 요청·지우기는 바를 거치지 않는다. 잠금과 무관한 화면 테스트는 `barLockMs={0}`으로 끄고, `bar-lock.test.tsx`만 켠다. Maestro 흐름이 쓰기 직후 `stop-button`을
  누르면 무시될 수 있다.
- **미확인**: 다운로드 실패 화면(계약 테스트로만), 위 `photos` 실패 2건의 원인, 설정·개발자·진단 화면, 글꼴 배율. 안드로이드는 이번 변경(내려받기 실패 처리·리턴 키 확정·
  사본 경로 옮기기)을 실기기로 다시 보지 않았다.

### 067 — 쓴 날 사진 확대 화면

- **사진을 누르면 확대 화면이다**(051 「사진을 누르지 않는다」·CAR9를 뒤집었다). `PhotoCarousel`이 열고 닫는다 — 지면·홈은 모른다. 닫히면 마지막으로 본 장으로
  지면 캐러셀을 `scrollTo({ index, animated: false })`로 옮긴다. 판정(배율 1~4·두 번 탭 2·끌어 닫기 120/800·이동 한계·누름 10)은 `src/app/photo-viewer.ts`의 순수 함수와
  사람이 정한 상수다. 새 의존성 0 — 확대 화면 안의 넘김도 같은 `react-native-reanimated-carousel`이다(`defaultIndex`·`scrollEnabled`).
- **확대 화면은 코어 `Modal`이고 안을 `GestureHandlerRootView`로 다시 감싼다**(안드로이드 `Modal`은 별도 창이라 앱 루트의 것 밖이다). 뒤로 가기는 그 창이 받아
  `onRequestClose`로 온다 — 홈은 `BackHandler`를 등록하지 않아도 된다(실기기: 뒤로 가기에 확대만 닫히고 앱은 그대로).
- **팬 하나가 두 얼굴이다**: 배율 1이면 세로가 먼저일 때만(`activeOffsetY`/`failOffsetX`) 서서 아래로 끌어 닫고, 확대되면 어느 방향이든 사진을 움직이며 넘김은 꺼진다.
  손을 떼면 「확대됨」이 아닌 배율은 정확히 1로 놓이므로(`settleScale`) 다른 장은 늘 배율 1에서 시작한다 — 「지금 보이는 장인가」 prop을 두지 않는다(`renderItem` 참조가
  순번마다 바뀌면 캐러셀이 내부 상태를 되돌린다, 046).
- **★ 사진이 한 장이면 가로로 쓸고 뗀 손가락이 누름이 됐다**(실기기에서만 — 여러 장이면 캐러셀 팬이 누름을 빼앗는다). `Pressable`은 요소 안에서 움직이고 떼면 누름이다 —
  누른 자리와 뗀 자리가 10 안일 때만 연다(`isTap`).
- **React Compiler**: 제스처 콜백에서 쓰는 「시작 값」을 `useRef`에 두면 렌더 중 ref 접근으로, 공유값을 prop으로 받아 `.value =`로 고치면 props 변경으로 막힌다. 시작 값은 공유값에,
  배경 불투명도는 부모가 콜백으로 받아 자기 공유값을 `.set()`한다(jest reanimated 목에 `set`·`get`을 더했다).
- **핀치는 `adb`로 못 만든다** — `input`은 한 손가락이고 production 기기는 `sendevent`의 `/dev/input/*` 권한이 없다. 핀치는 사람 손으로 본다.
- 범위 밖 기록: 「세게 넘기면 OS 뒤로 가기가 걸린다」는 **화면 가장자리 30dp(이 기기 84px)에서 시작한 넘김**이었다(실측 6/6, 가운데 시작 0) — 여백을 36dp로 넓히는 안은
  「가득 찬 느낌이 떨어진다」로 기각, 대응은 하지 않았다. 실측·검토안은 `docs/superpowers/specs/2026-10-09-photo-zoom-viewer-design.md`.
- 067 실기기 중 본 「강제 종료 후 멀쩡한 일기가 가끔 손상됐어요」는 067과 무관한 `File.text()` 공유 객체 해제였다 — 위 「안드로이드·Expo·기기」의 `*Sync()` 규칙.

### 068 — iOS 설정·개발자·진단 화면 재검증

- **iOS 시뮬레이터는 합성 마우스 클릭(`CGEvent`·`osascript`)을 무시한다**(손쉬운 사용 권한이 있어도). 조작은 **Maestro**(`brew install openjdk mobile-dev-inc/tap/maestro`,
  `JAVA_HOME=/opt/homebrew/opt/openjdk`)로 한다 — 흐름은 `.maestro/ios/`(FLOWS 미등록, 훑기 도구다). **`launchApp`은 기본이 앱 종료 후 재실행이라 상태가 사라져 크래시와 구분되지 않는다** —
  앱 설정을 다녀오는 흐름은 `launchApp: stopApp: false`로 돌아와 화면 상태가 남았는지로 가른다. 개발 클라이언트를 다시 앞으로 올리면 iOS가 「'포켓로그'에서 열겠습니까?」를 묻는다(`_dismiss-open-prompt.yml`).
  XCUITest는 접힘 애니메이션 안쪽 행의 `testID`(`settings-target-hour`)를 못 찾는다 — 글자로 짚는다.
- **개발 빌드는 오류를 화면 아래 알림(LogBox)으로만 보이고 앱을 죽이지 않는다** — 066의 `await import("react-native")` 결함은 시뮬레이터 dev에서 `ERROR [Invariant Violation: new NativeEventEmitter() requires a non-null argument.]`
  로그로만 드러났고 배포 빌드에서는 종료다. 훑기는 Metro `ERROR`와 `xcrun simctl spawn booted log show`를 읽는다(흐름이 끝까지 간다는 것은 「앱이 살아 있다」뿐이다). 수정 전 코드 재현·수정 후 정상은 시뮬레이터(iOS 26.5)에서 확인했고
  `__tests__/onboarding/no-react-native-dynamic-import.test.ts`가 잠근다. **실제 iPhone(iOS 27.0.1 TestFlight)은 미확인이다.**
- **`ios/`가 옛 `prebuild`면 이름·패키지가 옛 것이다**(`com.anonymous.alpharium`) — 현재 `app.json`으로 `prebuild --platform ios --clean`을 다시 해야 `com.a810labs.pocketlog`다(`NETRC=<빈 디렉터리>`). 새 `ios/`로 다시 만들자 시뮬레이터의 「정상 동작 확인」이 통과했다.
- **iOS에는 배터리 최적화 예외가 없다.** 온보딩 배터리 단계는 043부터 안드로이드 전용이고(`platforms: ["android"]`, `battery-ios.test.ts`가 잠근다), 설정의 「배터리」 행은 iOS에서 보조 줄이 「저전력 모드를 끄면 제때 써요」다(`src/app/battery-row.ts`의
  `batteryRowHint(platform)` — 화면은 `Platform`으로 문구를 고르지 않고 조립부가 넘긴다, `src/app/platform.ts`의 `appPlatform`이 플랫폼 값 한 곳). 자동 쓰기 토글·「매일 쓰는 시각」은 iOS에서도 그대로 두었고 BGTask의 실제 시각은 미확인이다.
- **iOS 시뮬레이터에서 일기 생성은 지금 실패한다**(미해결, 2026-10-10) — 새 `ios/`로 다시 만든 빌드에서 자동 첫 일기·진단 「지금 한 번 써 보기」가 모두 「일기를 쓰지 못했어요.」(`unwritten` 3건)로 끝났다. 「오류 로그 없음」은 생성이 된다는 뜻이 아니다. 로드맵 「iOS 시뮬레이터에서 일기 생성이 실패하는 원인 찾기」.
- 진단 화면의 「기기」 줄은 iOS에서 비어 있었다(안드로이드 릴리스만 읽었다) — `os: { platform, version }`으로 「iOS 26.5」를 보인다. 「사진 위치 정보」 값이 비는 것은 최근 30일에 사진이 없는 정상 상태(`no-photo`)다.

## VLM 캡션 60초의 원인 — 실측 (2026-08-22)

013의 리사이즈 결정 근거(SM-G986N, release, `quiet`, 「빠르게 봄」, `adb logcat`만 읽음). **원인은 타일링이지 파일 크기가 아니다.** `image_max_tokens`(256)는 청크 하나의 크기만 정하고 청크
**수**는 해상도가 정한다 — 4032×3024 사진 한 장이 IMAGE 청크 7~9개(장당 약 24~30초)를 만든다. 파일 크기 0.97MB와 4.15MB가 똑같이 7~9청크였고 시간의 96%가 IMAGE 청크
평가이며 디코드는 1% 미만이므로 압축률·포맷 변경은 효과가 없다. **리사이즈만 유효하다** — 4032×3024→1024×768에서 청크 9→1개, 장당 30.9초→1.3초(약 20배; 같은 실행 안에서
원본·리사이즈본을 함께 캡션해 대조). 제품 반영(013): 캡션 129초→23초. 미확인: 품질이 무너지는 해상도 하한(512·768), `image_min_tokens`의 효과, `i8mm`이 있는 기기에서 GPU 경로가 열리는가.

## 코드를 어디에 두는가

```
src/
├── config/       환경 판정, 추론 위치 규칙, 하루 경계
├── inference/    추론 어댑터 (온디바이스 / 데스크톱 서버)
├── signals/      하루치 신호. 사진은 실제로 수집한다 (나머지는 unknown)
├── vision/       사진의 내용을 읽는다 (011). 캐릭터와 무관한 모델 하나
├── diary/        일기의 모양, 파이프라인, 저장, 캐릭터 페르소나(014), 제목(014)
├── models/       캐릭터→모델 파일 매핑, 내려받기·검증·삭제
├── schedule/     자동 생성 판정·잠금·알림 (020) — 순수 판정 + *-port.ts
├── onboarding/   권한 요구 목록·판정·플래그 (021)
├── firstrun/     첫 실행 단계 판정 (040)
├── app/          화면이 쓰는 순수 상태·조립 (wiring.ts, state.ts, material.ts …)
├── diagnostics/  진단 정보 수집과 출력 경로
├── i18n/         화면 문구 카탈로그(catalogs/ko/)·기기 언어 감지·해석 (062)
└── ui/           화면 (components/ 공용 부품, rnr/ 대화상자 프리미티브)

scripts/          헌법 검사, 실기기 테스트 실행기, 합성 하루 심기(010)
__tests__/        기기 불필요 테스트 (항상 돈다)
.maestro/         실기기 테스트 (기기 있을 때만)
```

- `src/signals/` — **사진은 실제로 수집한다**(004). `photos`는 미디어 라이브러리에서, `places`는 사진 좌표에서 온다. `steps`·`battery`·`connectivity`는 `unknown`이며 그것이 결론이지
  미완성이 아니다. `fake.ts`는 테스트·개발 전용이며 `src/ui/`에서 import하지 않는다(원칙 I).
- `src/diary/`
  - `prompt.ts` — **헌법 원칙 II의 유일한 통과 지점.** 화자 규칙이 여기 하나뿐이고 `unknown`/`none`을 다른 문장으로 옮긴다. 캐릭터에서 오는 것은 이름과 출력 언어뿐 — 성격
    지시를 넣으면 관측된 성격이 아니라 지어낸 성격이 된다(원칙 III).
  - `acceptance.ts` — **원칙 I의 마지막 방어선.** 거부 갈래가 넷뿐이고 테스트가 그 수를 직접 센다. 임계값·유사도·점수를 쓰지 않는다 — 다섯째를 넣으려면 `contracts/acceptance.md`를 먼저 고친다.
  - `persona.ts`·`title.ts` — 014 참조. `title.ts`는 예외를 던지지 않는다.
- `src/models/` — **원칙 III의 최전선.** `roster.ts`는 캐릭터→모델 매핑의 유일한 자리이고 `allAssets()`나 `characterFor()`를 두지 않는다(「다섯을 다 받자」가 한 줄로 가능해진다).
  `readiness.ts`(준비 상태 넷), `expo-port.ts`(기기에 닿는 유일한 자리).
- `src/inference/` — `llama-port.ts`가 기기에 닿는 유일한 자리이자 **원칙 IV의 경계**, `sampling.ts`는 온디바이스·데스크톱이 공유하는 유일한 자리, `engine-port.ts`는 적재·실행·정리 계약
  (`Ending` 다섯 갈래).
- `src/vision/` — `roster.ts`(모델 하나)는 `models/roster.ts`와 서로 import하지 않는다. `select.ts`(023), `vision-port.ts`(**원칙 IV의 두 번째 경계**, `VisionRunResult`가 `text` 하나), `sampling.ts`(재사용 금지).

**측정·채점 코드를 둘 자리는 없다.** 모델 출력을 점수로 매기거나 여러 모델을 비교하는 코드는 어느 자리에도 속하지 않는다(원칙 IV) — 필요하면 별도 저장소에서 한다.
`scripts/check-constitution.mts`는 설정 위반을 잡는 것이지 모델 출력을 재지 않는다.

### 지켜야 할 경계

- **`process.env`는 `src/config/environment.ts`에서만 읽는다**(FR-009a). **추론 위치는 `src/inference/select.ts`에서만 고른다**(FR-025). **`src/config/policy.ts`가 원칙 I의 방어선이다** —
  dev·prod에서 데스크톱 서버가 허용되지 않는다는 규칙이 이 파일 한 곳에만 있다.
- **하루는 기기 로컬 자정(00:00)에 바뀌고 오늘은 언제든 쓸 수 있다**(049). 경계는 `src/config/day-boundary.ts` 하나뿐이다(FR-021a) — 다른 파일에서 `getHours() ±`로 하루 기준을 옮기지 않는다(DB11).
  함수는 모두 「지금」을 인자로 받는다(`new Date()`를 안에서 부르면 테스트 불가). 정오는 `selectableDays()`(백그라운드의 사흘) 구성 규칙에만 남아 있다.
- **모르는 것을 기본값으로 채우지 않는다**(FR-003, 원칙 V). `SignalValue<T>`는 `known`/`none`/`unknown` 셋을 가르며 `valueOr(signal, 0)` 같은 편의 함수를 만들지 않는다.
- **실패가 텍스트를 반환하지 않는다**(FR-016, 원칙 I) — `GenerationFailure`의 어느 갈래에도 `text`가 없고 플레이스홀더도 금지. **생성 중인 글을 화면에 보여주지 않는다**(005 FR-028b) — 토큰 콜백을 `completion()`에 넘기지 않는다.
- **프롬프트는 `src/diary/prompt.ts`에만 있다**(데스크톱 어댑터도 이것을 부른다). **출력 판정의 갈래는 넷이고 늘리지 않는다**(005 FR-018b) — 임계값을 두는 순간 채점 코드가 되고 그것이 원칙 IV다.
- **네이티브 추론 결과의 지표를 경계 밖으로 내보내지 않는다**(005 FR-011, `llama-port.ts`가 유일한 경계).

## 환경은 셋이다

| 환경 | 어디서 | 추론 |
| --- | --- | --- |
| `local` | 개발자 기계 시뮬레이터 | 데스크톱 서버 (기본값), 실기기 연결 시 온디바이스도 가능 |
| `dev` | 실기기, 개발 빌드 | 온디바이스만 |
| `prod` | 실기기, 배포 빌드 | 온디바이스만 |

환경은 실행 시점에 `EXPO_PUBLIC_APP_ENV`로 정해진다. 빌드는 하나다. **Expo Go로는 실행할 수 없다**(`llama.rn`이 없다) — `npx expo run:android`로 development build를 쓴다.

## release 빌드·서명·Google Play — 요청받았을 때만 탄다

**배포물을 만드는 절차다**(006, Google Play는 065). 손으로 설치할 APK와 Play에 올릴 AAB가 같은 서명·같은 빌드 설정에서 나온다.

> **⚠️ 기본 작업 흐름이 아니다.** 실기기 검증은 dev(debug)로만 하며(아래 「테스트」), 이 절차는 저장소 소유자가 그 세션에서 명시적으로 요청했을 때만 탄다. **release를 설치하려면 debug 앱을
> 지워야 하고 그때 모델 파일·일기·설정이 함께 사라진다** — 시작 전에 모델 백업(`~/.pocketlog-signing/model-backup/`)을 확인한다.

### 앱 식별자 (065)

- **패키지는 `com.a810labs.pocketlog`다** — Play에 한 번 올리면 영영 바꿀 수 없다. 앱 이름은 `Pocketlog`, 한국어 기기의 런처·스토어 이름은 「포켓로그」(`app.json`의 `locales.ko`).
  저장소 이름(GitHub `alpharium`)만 옛 이름이다.
- 옛 패키지 `com.anonymous.alpharium`과는 **다른 앱**이다 — 옛 앱의 일기·모델은 넘어오지 않는다. 옛 서명 키(`alpharium.jks`)는 옛 패키지의 덮어 설치에만 쓰므로 `~/.pocketlog-signing/legacy/`에 보관한다.

### 서명 키 (최초 1회)

**Play 앱 서명을 쓴다** — 사용자 기기에 깔리는 APK는 Google이 보관한 **앱 서명 키**로 서명되고, 우리 키(`pocketlog.jks`)는 Play에 올릴 때만 쓰는 **업로드 키**다. 업로드 키를 잃으면
Play Console에서 재설정을 요청할 수 있지만(며칠 걸린다) 손으로 설치한 release APK는 그 키로 덮어 설치하므로 **저장소 밖에 백업한다.**

```
keytool -genkeypair -v -keystore ~/.pocketlog-signing/pocketlog.jks -alias pocketlog -keyalg RSA -keysize 2048 -validity 10000
```

**원본은 저장소 밖(`~/.pocketlog-signing/`)에 두고 `android/app/`에는 사본을 놓는다** — `prebuild --clean`이 `android/`를 통째로 지우므로 거기 둔 키는 함께 사라진다.

```
cp ~/.pocketlog-signing/pocketlog.jks android/app/     # prebuild 뒤 되돌리기
```

비밀번호는 `~/.gradle/gradle.properties`에 적는다 — **저장소가 아니다**:

```
POCKETLOG_STORE_PASSWORD=<비밀번호>
POCKETLOG_KEY_PASSWORD=<비밀번호>
```

**서명 설정은 `plugins/with-release-signing.js`가 선언으로 넣는다**(`assembleRelease`·`bundleRelease` 모두). `android/app/build.gradle`은 gitignore된 생성물이라 직접 고치지 않는다.

### 빌드

```
npx expo prebuild --platform android --clean
cp ~/.pocketlog-signing/pocketlog.jks android/app/     # ★ prebuild가 지웠다
cd android && NODE_ENV=production ./gradlew bundleRelease -PreactNativeArchitectures=arm64-v8a     # Play용 AAB
cd android && NODE_ENV=production ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a   # 손으로 설치할 APK
```

**`--clean`을 건너뛰지 않는다**(004에서 권한이 빠진 APK가 설치됐다). **가운데 줄을 건너뛰지 않는다.** **`NODE_ENV=production`이 필요하다** — 없으면 `.env.production`이 로드되지 않고 앱이
「이 빌드는 잘못 만들어졌다」로 뜬다. 산출물: `android/app/build/outputs/bundle/release/app-release.aab`, `android/app/build/outputs/apk/release/app-release.apk`(APK 빌드 약 19분).

- **★ `-PreactNativeArchitectures=arm64-v8a`를 빼지 않는다**(065 실측). 네 ABI를 다 빌드하면 `llama.rn`의 CPU 갈래 10여 벌을 release 최적화로 동시에 컴파일하다
  clang이 `LLVM ERROR: out of memory`로 죽었다(34분 뒤 실패). arm64 하나면 13분 39초에 끝난다. 2GB 모델을 기기에서 돌리는 앱이라 출시 대상도 arm64뿐이다 —
  32비트·x86 기기에는 Play에서 앱이 보이지 않는다. 첫 release 빌드는 `react-android-*-release.aar`(약 168MB)를 받다 연결 시간 초과가 난 적이 있다(다시 돌리면 된다).
- **Play에 올릴 때마다 `app.json`의 `android.versionCode`를 1 올린다** — 같은 번호는 Play가 거부한다. 사람이 보는 버전은 `expo.version`(versionName)이다. 올린 번호는 커밋에 남긴다.
- 실측(065): `targetSdk`는 36(RN 0.86 기본), 모든 arm64 네이티브 라이브러리(`llama.rn` 포함)의 LOAD 정렬이 16KB다 — Play의 16KB 페이지 요구를 충족한다. `llama.rn`을 올리면 다시 본다
  (`.so`의 ELF 프로그램 헤더 `p_align`; 개발 기계에 `readelf`가 없어 node로 읽었다).

### Play 정책상 매니페스트에 두지 않는 것 (065)

- **`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`** — Play가 메신저·자동화·운동·기기 연결·안전·VPN에만 허용한다(선언만으로 심사 대상). 배터리 예외는 권한이 필요 없는 설정 목록
  (`IGNORE_BATTERY_OPTIMIZATION_SETTINGS`)으로만 안내한다. `app.json`의 `blockedPermissions`가 다른 라이브러리를 거쳐 들어오는 것까지 걷고 `battery-exception-port.test.ts`가 잠근다.
  대가: 삼성 밖 기기에서 「한 번 눌러 허용」이 「목록에서 직접 끄기」가 됐다 — 백그라운드 자동 쓰기가 늦어질 수 있고 앱을 열면 쓰는 경로(057)가 메운다.
- **`SYSTEM_ALERT_WINDOW`(다른 앱 위에 그리기)** — Expo 템플릿 기본 매니페스트가 넣을 뿐 앱이 쓰지 않는다. `blockedPermissions`로 걷는다(debug 매니페스트에는 개발 메뉴용으로 남는다).
- **`READ_MEDIA_IMAGES`는 둔다** — 사진 및 동영상 권한 정책의 신고서에 「매일 그날 찍힌 사진 전체를 자동으로 읽어 일기를 쓰는 것이 핵심 기능」이라고 적는다(사진 선택기로는 대체할 수 없다).

### 확인 — 빌드 성공을 믿지 않는다

| 무엇 | 어떻게 | 통과 |
| --- | --- | --- |
| 서명 | `apksigner verify --print-certs <apk>`, AAB는 `keytool -printcert -jarfile <aab>` | `CN=Android Debug`가 **아니다** |
| 키 비커밋 | `git status`, `git ls-files \| grep -i jks` | 아무것도 안 나온다 |
| 매니페스트 | `aapt2 dump permissions <apk>` 또는 설치 뒤 `dumpsys package com.a810labs.pocketlog` | `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`가 **없다** |
| Metro 없이 도는가 | **Metro를 끄고 USB를 뽑거나 `adb reverse --remove-all` 하고** 앱을 연다 | `Unable to load script`가 없다 |
| 환경 | 앱 화면 | 「이 빌드는 잘못 만들어졌다」가 **아니다** |

**debug에서 돌았다는 것은 release에서 돈다는 뜻이 아니다**(원칙 V) — minify·R8이 켜지면 동적 `import`·`llama.rn` JNI 심볼이 깨질 수 있다(현재는 꺼져 있다, 위 실측 규칙).
**Play에서 받은 앱은 Play가 다시 서명한 것이다** — 내부 테스트 트랙으로 받은 앱에서 설치·모델 내려받기·일기 쓰기를 한 번 본다.

## iOS 빌드·서명·TestFlight — 요청받았을 때만 탄다 (066)

**아이폰 배포물을 만드는 절차다.** 안드로이드 절차(위)와 같은 성격 — 기본 작업 흐름이 아니며 저장소 소유자가 그 세션에서 요청했을 때만 탄다.
**실제 iPhone이 한 대도 없다**(2026-10-08) — 아래에서 「실측」이라 적은 것은 iPhone 17 시뮬레이터(iOS 26.5, Xcode 26.6)에서 본 것이고, 업로드·TestFlight 설치는 미실측이다.

### 서명 주체 — 개인 계정의 수동 서명 (2026-10-08 확정)

- **Apple 계정 구조**: 소유주 Hyunmin Lee 님의 **개인(Individual) Apple Developer Program**(팀 `PGNGG84B39`)이고, 저장소 소유자(`mrtint0729@gmail.com`)는 그 App Store
  Connect의 **Admin**이다. 개인 가입은 팀원을 Developer Program 팀에 넣지 못하므로(Apple 「roles」: *"Certificates, Identifiers & Profiles is only available to Account Holders and
  members of an organization's team"*) **Xcode 자동 서명이 안 된다** — Accounts에는 `Hyunmin Lee|208773025|1`로 보이지만 Signing의 Team 드롭다운에는 안 뜬다. App Store Connect
  쪽(앱 레코드·TestFlight·업로드)은 Admin 권한으로 된다. `app.json`의 옛 `S6B8RQH6YQ`는 8월 다른 맥의 Personal Team이었다.
- **그래서 수동 서명이다.** 이 맥에서 만든 CSR로 소유주가 발급한 **Apple Distribution 인증서** + **App Store 프로파일 「Pocketlog App Store」**(App ID `com.a810labs.pocketlog`,
  entitlement는 `increased-memory-limit` 하나)를 쓴다. 파일은 **저장소 밖** `~/.pocketlog-signing/ios/`(`distribution.key`·`distribution.cer`·`Pocketlog_App_Store.mobileprovision`;
  키는 600). 인증서 만료 2027-10-08 — 그때 CSR을 다시 보낸다. **`distribution.key`를 잃으면 인증서도 못 쓴다**(안드로이드 `pocketlog.jks`와 같이 밖에 백업).
- **키체인 설치**(한 번): `security import distribution.key -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign`, `security import distribution.cer …`, 그리고
  **Apple WWDR G3 중간 인증서**(`https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer`)도 넣어야 `security find-identity -v -p codesigning`에 **valid**로 선다(없으면 0 valid).
  **프로파일은 `~/Library/Developer/Xcode/UserData/Provisioning Profiles/<UUID>.mobileprovision`에 둔다** — 옛 자리 `~/Library/MobileDevice/Provisioning Profiles`는 이 맥에서 root 소유(MDM)라 못 쓴다.
- **entitlements는 프로파일과 정확히 같아야 한다.** `expo-notifications` 플러그인이 넣는 `aps-environment`(원격 푸시, 이 앱은 안 쓴다)가 남아 있으면
  `Provisioning profile … doesn't include the aps-environment entitlement`로 아카이브가 실패한다 → `plugins/with-no-push-entitlement.js`가 **plugins 맨 마지막에서** 걷는다.
  llama.rn의 `enableEntitlements`는 `extended-virtual-addressing`까지 둘을 넣으므로 꺼 두고 `ios.entitlements`에 `increased-memory-limit`만 직접 선언한다(`__tests__/config/ios-permissions.test.ts`).
- **App Store Connect 앱 레코드**(`com.a810labs.pocketlog`)는 Admin이 App Store Connect > 나의 앱 > ＋에서 만들거나, Xcode Organizer 첫 업로드가 만든다(Xcode 13+).

### 빌드

```
npx expo prebuild --platform ios --clean          # ~/.netrc가 644면 NETRC=<빈 디렉터리>를 앞에 준다
xcodebuild -workspace ios/Pocketlog.xcworkspace -scheme Pocketlog -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -archivePath build/Pocketlog.xcarchive archive \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=PGNGG84B39 PROVISIONING_PROFILE_SPECIFIER="Pocketlog App Store" CODE_SIGN_IDENTITY="Apple Distribution"
xcodebuild -exportArchive -archivePath build/Pocketlog.xcarchive -exportOptionsPlist scripts/ios/ExportOptions.plist -exportPath build/export
```

- `scripts/ios/ExportOptions.plist`는 `method: app-store-connect`·`signingStyle: manual`·프로파일 매핑이고 **`destination: export`**다 — IPA까지만 만든다. 업로드는 사람이 확인한 뒤
  따로 한다: Xcode Organizer(Distribute App → App Store Connect → Upload, 본인 Apple ID의 Admin 권한) 또는 `xcrun altool --upload-app -f build/export/Pocketlog.ipa -t ios
  -u mrtint0729@gmail.com -p <앱 암호>`(appleid.apple.com의 앱 암호) 또는 App Store Connect API 키(`--apiKey/--apiIssuer`).
- **Release는 `NODE_ENV`를 셸에서 줄 필요가 없다** — Xcode의 「Bundle React Native code and images」 단계가 `export:embed`로 번들하며 `.env.development*`는 싣지 않는다(실측: Release
  시뮬레이터 앱 번들에 `localhost:8080`이 0건, Metro 없이 홈이 뜨고 설정에 「개발자」 행이 없다). 서명 없는 Release 아카이브(`CODE_SIGNING_ALLOWED=NO`)는 약 10분, 45MB.
- EAS Build/Submit(`eas-cli`)은 이 저장소가 안 쓴다(안드로이드도 로컬 gradle).
- **업로드는 사람의 터미널에서 돌린다** — `-p @keychain:AC_PASSWORD`는 처음 읽을 때 macOS 키체인 「허용」 창이 뜨는데, 화면 없는 셸(에이전트)에서는 창을 못 띄워
  `Failed to find item AC_PASSWORD … in keychain`으로 떨어진다. 앱 암호 저장은 Xcode 26 altool이 도움말과 달리 `--item`을 요구한다:
  `xcrun altool --store-password-in-keychain-item --item AC_PASSWORD -u <Apple ID> -p <앱 암호>`(앱 암호는 appleid.apple.com이 발급하는 값, 임의로 못 정한다).
- **2026-10-08 빌드 1(1.0.0)을 이 절차로 올렸다**(검증 → 업로드, 저장소 소유자 터미널) — **처리 단계에서 ITMS-90683(모션 문구 없음)으로 거부**됐다. 같은 날 빌드 2에 문구를 넣어 다시 올렸다.
  **업로드 성공 ≠ 처리 통과** — 「has one or more issues」 메일을 기다려 본다. 다음 업로드는 `ios.buildNumber`를 먼저 올린다.

### 다른 맥에서 올리려면

1. `~/.pocketlog-signing/ios/` 통째로 옮긴다(`distribution.key`·`.cer`·`.mobileprovision`). 옮기기 쉽게 한 파일로 묶으려면 `openssl pkcs12 -export -inkey distribution.key -in distribution.pem
   -out distribution.p12`(비밀번호는 그때 정한다; `.cer`는 DER라 바로 못 넣는다 — `distribution.pem`이 PEM 변환본) — 받는 맥에서는 `.p12`를 더블클릭하면 키·인증서가 함께 들어간다.
2. 받는 맥 키체인에 **WWDR G3**를 넣고(위), 프로파일을 `~/Library/Developer/Xcode/UserData/Provisioning Profiles/`에 둔다. `security find-identity -v -p codesigning`에 valid 1개.
3. Xcode(26 기준 실측)·CocoaPods(`brew install cocoapods`)·Node 20+. `~/.netrc`가 644면 `NETRC=<빈 디렉터리>`.
4. 앱 암호를 그 맥 키체인에 다시 저장한다(위 `--item` 명령; 암호 자체는 Apple ID에 묶여 어디서나 같다).
5. `app.json`의 `ios.buildNumber`를 올리고 커밋 → 위 「빌드」 세 줄 → 사람의 터미널에서 `--validate-app` → `--upload-app`.

### 확인 — 빌드 성공을 믿지 않는다

| 무엇 | 어떻게 | 통과 |
| --- | --- | --- |
| 서명 | `codesign -dv --verbose=2 <app>` | `Authority=Apple Distribution: …` (`Apple Development`·unsigned가 **아니다**) |
| 번호 | `PlistBuddy -c "Print :CFBundleVersion"` | 지난 업로드보다 크다 |
| 권한 문구 | `PlistBuddy -c "Print :NSPhotoLibraryUsageDescription"` | 한국어 |
| Metro 없이 도는가 | Release 시뮬레이터 빌드(`-sdk iphonesimulator -configuration Release`)를 Metro 끄고 연다 | 홈이 뜨고 일기가 써진다 (2026-10-08 실측) |
| 환경 | 설정에 「개발자」 행 | 배포 환경이면 버전 7번 탭 전까지 **없다** |

**TestFlight에서 받은 앱은 실제 iPhone의 첫 실측이다** — 2GB 모델 적재(메모리), 사진 읽기 시간(mmproj CPU), 백그라운드 자동 쓰기(BGTask)가 거기서 처음 재진다. 테스터에게
「설치 → 권한 → 내려받기 → 첫 일기 → 다음 날 자동 쓰기 알림」을 확인해 달라고 한다.

## 테스트

| 명령 | 무엇 | 기기 |
| --- | --- | --- |
| `npm test` | 기기 불필요 갈래 전부 (약 13초) | 필요 없음. **항상 돈다** |
| `npm run test:logic` | 순수 로직만 (**약 7초**) — 개발 중 기본 | 필요 없음 |
| `npm run test:ui` | 화면만 | 필요 없음 |
| `npm run test:device` | 실기기 갈래 (Maestro) | 있으면 돌고 없으면 건너뛴다 |
| `npm run lint` | eslint + tsc + 헌법 검사 + prettier 포맷 검사 | 필요 없음 |

**건너뛴 실기기 테스트는 통과가 아니다.** 기기 없이 전부 초록불이어도 온디바이스는 검증되지 않은 상태다. 기능이 끝났다고 말하려면 최소 한 번은 실기기에서 돌아야 한다(원칙 V).

**★ 그 「한 번」은 dev(debug) 빌드다. release 빌드는 만들지 않는다**(2026-09-09 저장소 소유자 지시). release 세션마다 대가가 컸다 — 빌드 한 번이 약 19분이고 설치하려면 debug 앱을 지워야 해서
모델 파일(~2GB)·일기·설정이 함께 사라진다.

- **기본**: 새 네이티브 모듈이나 빌드 설정을 건드리는 기능이어도 dev로만 검증하고 완료로 처리한다. release 잔여 위험은 스펙의 「미확인 잔여」에 한 줄 기록만 남긴다(닫을지는 저장소 소유자가 정한다).
- **스펙 문서에 release 검증 태스크를 기본으로 넣지 않는다.** 완료 조건으로도 세우지 않는다.
- **예외**: 저장소 소유자가 그 세션에서 「release로 확인해 달라」고 명시적으로 요청했을 때만 위 절차를 탄다.

시뮬레이터(Expo Go 등)는 애초에 옵션이 아니다. 실기기 도구 사용법은 위 「도구 사용법」과 「Maestro」.

### jest가 두 프로젝트로 나뉜다 — 화면만 RN 런타임을 진다

`jest-expo` 프리셋은 워커마다 React Native 런타임을 세운다. `package.json`의 jest 설정이 `.ts`(순수 로직, `node` 환경)와 `.tsx`(화면, `jest-expo`) 둘로 갈라져 있다 — 순수 로직 40여 개가
43.8초에서 12.4초로 줄었다.

**개발 중에는 `npm run test:logic`을 쓴다**(화면을 안 건드렸으면 충분). 화면을 건드렸으면 `npm run test:ui`, 커밋 전에는 `npm test`다.

- **가르는 기준은 확장자다.** `.tsx`면 화면, `.ts`면 순수 로직 — 새 화면 테스트를 `.ts`로 만들면 `render()`가 없다고 실패한다.
- **`testMatch`가 어긋나면 스위트가 조용히 사라진다** — 어느 프로젝트에도 안 잡힌 파일을 jest는 오류 없이 안 돌린다. `__tests__/jest-projects.test.ts`가 파일 수를 세어 막으며 이 가드는
  일부러 **양쪽** 프로젝트에 들어 있다.
- **`--maxWorkers=50%`가 최적이다** — 75%·100%는 워커끼리 CPU를 뺏어 오히려 느려졌다(18초→27.6초). CI는 러너가 2코어라 `--maxWorkers=2`를 따로 쓴다.
  **★ `npm test -- --maxWorkers=2`로 넘기면 안 된다** — 스크립트의 `--maxWorkers=50%`와 중복돼 jest가 배열로 받아 **50워커**를 띄운다(`jest --showConfig`의 `maxWorkers: 50`).
  2코어 CI에서 단순 스위트도 30초를 넘겨 RNTL cleanup 훅이 타임아웃으로 죽었다(052~054). CI는 `npx jest --maxWorkers=2`를 직접 부른다.

### Windows에서 느린 것은 Defender다

같은 명령이 CI(우분투)에서 6초, Windows에서 11분 39초였던 적이 있다 — 코드 문제가 아니라 Defender 실시간 검사가 `node_modules`의 44,221개 파일을 매번 가로챈 것(처음 35.37ms, 캐시 후 0.36ms,
98배 차이). `scripts/windows-dev-exclusions.ps1`을 관리자 권한으로 돌리면 해소된다(기계 설정이라 CI에는 영향 없음). 테스트는 저장소 쪽에서 `--maxWorkers=50%`로 고쳤다 — 16워커가
CPU를 서로 뺏어 `render()`가 기본 5초 타임아웃을 넘겼던 것이 원인이었다.

## Expo 작업 시

패키지 버전을 추측하지 않는다. `expo install`은 npm이 아니라 Expo API에서 버전을 해석하므로 `npm view`는 틀린 답을 준다. 대상 SDK의 버전별 공식 문서나 context7(`/expo/expo`)로 확인하고
`npx expo install --check`로 검증한다.

**Expo SDK 57**로 간다 — 온디바이스 추론(Expo 57 + RN 0.86 + `llama.rn`)이 실증된 조합이기 때문이다. `llama.rn`은 Expo가 관리하는 패키지가 아니므로 `expo install --check`가 검사하지
않는다 — 패치 버전을 올릴 때도 실기기에서 `loaded`를 다시 확인한다.

## 작업 습관

- 커밋 메시지는 한국어로 쓴다(헌법 「개발 방식」). 계약을 먼저 정하고 테스트를 먼저 쓴다.
- **`main`에서 직접 작업하지 않는다.** 기능마다 브랜치를 파고 PR로 머지한다. **작업을 시작하기 전에 `git branch --show-current`로 지금 브랜치를 눈으로 확인한다** — 스펙킷(`setup-plan.ps1` 등)이
  출력하는 `BRANCH:` 필드는 스펙 디렉터리 이름이지 체크아웃된 브랜치가 아니다(022를 통째로 `main`에서 작업·커밋한 사고가 있었다). `.githooks/pre-commit`·`pre-push`가 `main`/`master` 직접
  커밋·push를 막는다(`core.hooksPath=.githooks`, clone 후 `git config core.hooksPath .githooks` 한 번 필요; 우회는 `--no-verify`).
- **한 축을 깊게 파고들고 싶어지면 그것이 실패 신호다.** 반복된 실패는 코딩 에이전트가 여러 축 중 하나를 붙잡고 지나치게 파고든 것이었다.
- **위반 주입으로 방어를 검증한다.** 새 규칙을 세울 때마다 실제로 어겨 보고 테스트나 헌법 검사가 잡는지 확인한다(치환이 실제로 적용됐는지 먼저 단언한다).
- **경계를 옮기거나 유니온을 좁힐 때는 `tsc` 0을 완료 조건으로 삼고, 같은 규칙의 복제가 다른 파일에 있는지 소스를 센다**(049 `bucketIndexOf`).
- **보드·스펙을 옮기는 일은 원문 대조를 계약 테스트에 넣는다**(047). 구현 뒤 사람이 화면을 보고 어긋남을 찾는 일이 반복됐다.
