# 헌법을 먼저 읽는다

이 프로젝트가 무엇이고 무엇을 지켜야 하는지는 [.specify/memory/constitution.md](.specify/memory/constitution.md)에
있다. **작업을 시작하기 전에 그것을 읽는다.** 이 문서는 헌법을 요약하지 않으며,
헌법이 담지 않는 실무 사실만 남긴다. 둘이 어긋나면 헌법이 우선한다.

한 줄로 말하면: **주인의 휴대폰이 화자가 되어 하루를 일기로 쓰는 앱**이다. 사람이
쓰는 일기가 아니다. 나머지는 헌법에 있다.

이 문서는 압축 요약이다(2026-08-23 정리). 각 기능의 상세 실측 로그(정확한 좌표·
시각·빌드 시간 등)는 git 히스토리의 이전 버전과 `specs/0xx-*/`에 남아 있다 — 여기는
**지금도 유효한 결론**과 **아직 남은 위험**만 담는다.

## 저장소의 현재 상태

2026-08-12에 이전 저장소를 되돌렸다(측정 장치와 제품이 뒤섞였던 것이 원인 — 헌법
원칙 IV가 된 경위). 같은 날 헌법을 새로 세우고(v1.0.2) 프로젝트 뼈대를 세웠다. 이후
001부터 014까지 기능을 순서대로 쌓았고, 지금은 다음이 전부 된다:

- **온디바이스 일기 생성**(005) — 프롬프트 조립 → `llama.rn` 추론 → 4갈래 판정
  (`empty`/`echo`/`language`/`unfinished`) → 저장. 실기기(SM-G986N)에서 확인됐다.
- **손에 쥐는 빌드**(006) — 사용자 화면(목록·상세·쓰기)에서 실제로 저장되고, 제 키
  (`CN=alpharium`)로 서명한 release APK가 케이블 없이 돈다.
- **캐릭터 선택·대기·목록**(007), **내려받기 충돌 방지**(008), **과거 하루 선택**
  (009), **합성 하루를 기기에 심는 도구**(010), **사진 내용 캡션**(011), **정오
  이후 오늘 쓰기**(012), **캡션 전 리사이즈**(013), **캐릭터 페르소나**(014)까지
  차례로 쌓였다. 각 기능의 핵심 결론은 아래 절에 있다.

**이전 작업의 결론을 기억에서 꺼내 복원하지 않는다.** 헌법에 적힌 것만이 확정이다.
헌법에 없는 이전 결론은 되돌려진 것이며, 복원하면 되돌린 의미가 없어진다.

## 지금도 유효한 실측 규칙 (헌법 원칙 V — 값을 다시 재지 않도록)

- **Android에는 기간 걸음 수를 되짚는 통로가 없다.** `expo-sensors`의
  `getStepCountAsync`는 iOS 전용이라 걸음 수는 `unknown`이 정상 상태다.
- **`expo-media-library`는 `ACCESS_MEDIA_LOCATION` 조회 API를 주지 않는다.** 좌표
  권한이 있는지는 `getLocation()`을 실제로 불러 봐야 안다 — 권한이 없으면 `null`이
  아니라 예외를 던지므로 반드시 감싼다.
- **`react-native`의 `SafeAreaView`는 안드로이드에서 no-op다.** iOS 전용이며,
  `react-native-safe-area-context` + 루트를 `SafeAreaProvider`로 감싸는 조합이
  필요하다. 조용히 실패하는 버그라 안드로이드 화면을 눈으로 봐야 드러난다.
- **`llama.rn`의 `completion()`은 요청하지 않아도 `timings`·`tokens_predicted`를
  준다.** 헌법 원칙 IV가 금지한 값이 네이티브에서 밀려 들어오므로 `llama-port.ts`가
  경계에서 버린다(`{ text, ending }` 둘뿐).
- **평문 프롬프트로는 빈 글만 나온다.** instruct 모델에 채팅 템플릿 없이 평문을
  넣으면 즉시 EOS를 낸다 — `completion({ messages: [...], jinja: true })`로 보낸다.
- **`stopCompletion()`은 거부시키지 않는다.** `interrupted: true`로 정상
  resolve되므로 `try/catch`로 끊김을 잡으려 하면 놓친다.
- **release는 `run-as`가 안 된다**(`package not debuggable`). 파일 검증은 화면
  관찰이나 debug 빌드로 갈음한다.
- **서명이 다르면 덮어 설치가 거부되고, 지우면 일기·모델이 함께 사라진다**
  (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). debug↔release 전환, 서명 키 교체 양쪽
  모두에서 반복 관측됐다.
- **기기가 재부팅되면 `run-as`가 첫 잠금 해제 전까지 실패한다**(Android Direct
  Boot) — 데이터 손실이 아니라 저장소가 아직 복호화되지 않은 것이다.
- **캐릭터별 생성 시간이 100배까지 벌어진다.** `quiet`(kanana 2.1B)는 웜 2~3초인
  반면 `narrative`(exaone 2.4B)는 콜드 242초까지 관측됐다 — 헌법 로스터의 "exaone은
  가장 느리다"가 실측으로 확인된 값이다. 생성 시간 한도(180초)는 모델 **적재**
  시간을 재지 않고 `engine.run()` 구간만 잰다(`on-device.ts`의 `runWithTimeout()`).
- **원칙 II 위반(기록에 없는 것을 단언)은 반복 관측되며 특정 캐릭터에 국한되지
  않는다.** `quiet`도 예외가 아니었다(007·012 실기기). 매번 프롬프트 쪽을 고치되
  판정 갈래는 늘리지 않는다(원칙 IV) — 014에서 "확실하지 않은 것은 짐작의 말투로"
  규칙을 추가해 교정했다.
- **VLM 캡션이 느린 원인은 타일링이다, 파일 크기가 아니다**(2026-08-22 실측).
  `image_max_tokens`는 청크 하나의 크기만 정하고 청크 **수**는 해상도가 정한다 —
  4032×3024 사진 한 장이 IMAGE 청크 7~9개(장당 약 24~30초)를 만든다. 압축률·포맷
  변경은 효과가 없고(디코드는 전체의 1% 미만), **리사이즈만 유효하다**(1024×768로
  줄이면 청크 9→1개, 장당 30.9초→1.3초, 약 20배). 013이 이것을 제품에 반영했다
  (캡션 129초→23초, 82% 감소).
- **이 기기(SM-G986N, Snapdragon 865)는 GPU/NPU 추론 경로를 못 쓴다** —
  `hasDotProd && hasI8mm && hasHexagon && hasAdreno`가 모두 참이어야 하는데
  `i8mm`이 없다(ARMv8.2, i8mm은 ARMv8.6부터). 다른 기기에서는 다를 수 있다.

## 도구 사용법 — 실기기 검증 전에 (실측으로 얻은 것)

세 가지가 갖춰져야 Maestro 실기기 테스트가 돈다. 하나라도 없으면 화면에 값이
멀쩡히 있어도 실패한다.

1. **Metro가 dev 환경으로 떠 있어야 한다** — `EXPO_PUBLIC_APP_ENV=dev npx expo start
   --dev-client`. **Expo는 `NODE_ENV`로 env 파일을 고르지 `EXPO_PUBLIC_APP_ENV`로
   고르지 않는다** — `dev`라는 `NODE_ENV`는 없으므로 `.env.dev`는 자동 로드되지
   않는다. 변수를 셸에서 직접 줘야 하며, `@expo/env`의 `load()`는 이미 설정된
   `process.env` 값을 보존하므로 `.env.development`(내용이 `local`이어도) 값에
   덮어써지지 않는다.
2. **기기 잠금이 풀려 있고 화면이 켜져 있어야 한다** — `adb shell dumpsys trust`의
   `deviceLocked=0`으로 확인한다. PIN은 사람이 넣어야 한다.
3. **한글 검증 문구는 `-Dfile.encoding=UTF-8`이 있어야 읽힌다** — 한국어 Windows는
   CP949라서 안 넣으면 문자가 뭉개진 채 기기에 전달된다. `run-device-tests.mjs`가
   이 옵션을 이미 넣으므로 그 실행기를 거치면 신경 쓸 것이 없다.

그 외 실측으로 확인된 함정들:

- **`adb reverse tcp:8081 tcp:8081`이 USB·무선 관계없이 필요하다.** 없으면 debug
  APK가 `Unable to load script`로 죽는다. 재부팅으로 사라지므로 다시 건다.
- **Metro 캐시가 스테일이면 "Loading from localhost:8081..."에 영구히 머문다** —
  오류 없이 영영 로딩 중이라 원인을 가리키지 않는다. `npx expo start --clear`로
  푼다.
- **`expo run:android`만으로는 매니페스트가 갱신되지 않는다.** `android/`가 이미
  있으면 prebuild를 건너뛴다 — `npx expo prebuild --platform android --clean`이
  필요하고, `adb shell dumpsys package <패키지>`의 `requested permissions`로
  확인한다(빌드 성공이 매니페스트가 맞다는 뜻이 아니다).
- **Maestro의 기본 텍스트 매칭은 노드 전체와 맞춰 본다.** `@testing-library`의
  `toHaveTextContent`와 같은 성질이라 부분 문자열은 정규식(`.*상상을 섞어.*`)으로
  준다. `childOf`는 RN의 평탄화된 접근성 트리에서 통하지 않으므로 `testID`나
  그 자리에만 있는 문장 전체로 대신한다(`testID`는 R8·ProGuard에서도 살아남는다).
- **`uiautomator dump`가 Git Bash에서 `/sdcard/`를 윈도우 경로로 바꾼다** —
  `MSYS_NO_PATHCONV=1`을 앞에 붙인다. 화면이 계속 움직이면(다운로드 진행률 등)
  "could not get idle state"로 실패하는데 그때는 `screencap`으로 본다. 한글은
  콘솔에서 CP949로 뭉개지므로 UTF-8로 직접 써야 읽힌다.
- **기기가 둘 붙으면 `adb shell`이 모호해진다** — `-s <시리얼>`을 붙인다. `adb`는
  Windows 실행 파일이라 Git Bash의 `/tmp`를 모르므로 `adb pull`의 목적지는 `C:/…`
  꼴로 준다. `adb shell`의 줄 끝은 CRLF이므로 파일명 끝 캐리지 리턴을 걷어내지
  않으면 정규식 검사가 빗나간다.
- **Metro는 gradle 빌드가 끝난 뒤에 띄운다** — 빌드 중에 띄우면 Metro의 파일
  감시자가 gradle이 지우는 중간 산출물을 잡으려다 exit code 7로 죽는다.

## 007~014 기능별 핵심 결론

각 기능은 기기 없는 테스트(`npm test`)와 최소 1회의 실기기 확인을 거쳤다(원칙 V —
"건너뛴 실기기 테스트는 통과가 아니다"). 상세 검증 로그는 git 히스토리에 있다.

### 007 — 캐릭터 선택·대기·목록

- **캐릭터를 사용자가 고른다**(`resolveSelection()`). 006까지는 준비된 것 중
  먼저 나오는 하나를 말없이 집었다 — 그 결함을 고쳤다. 고른 적이 없으면 준비된
  것이 있어도 자동으로 고르지 않는다(FR-008, 실기기 확인).
- 고른 캐릭터가 준비를 잃으면 다른 것으로 옮기고 화면에 알린다(말없이 바꾸지
  않는다) — 캐릭터별 원칙 II 위반 빈도가 다르므로 사용자가 통제할 수 있어야 한다.
- 그만두기 버튼이 생겼다. `ActivityIndicator`(RN 코어)에는 진행률 파라미터
  자체가 없어 이것이 원칙 IV의 방어가 됐다.
- **타입 방어는 `npm test`가 아니라 `tsc`에 있다** — jest는 타입을 지우므로
  `Object.keys()` 같은 구조 위반을 못 잡는다. 이후 계약 테스트는 소스 선언을
  `readFileSync`로 직접 읽어 검사하는 패턴이 이 저장소 전반의 관례가 됐다.
- 헌법 검사: `src/ui/`가 `models/roster`·`ModelAsset`에 닿지 못하게 막는다.

### 008 — 내려받기 충돌

- 사용자가 화면에서 발견한 버그 둘("동시에 못 받는다"는 실은 규칙인데 화면이
  침묵했고, "받는 중에 다른 걸 누르면 멈춘다"는 실은 안 멈추고 화면에서만
  사라졌다)을 고쳤다. 원인은 `App.tsx`의 반환값 버림, 거부 요청에서도 도는
  `setProgress(null)`, 탭 전환 시 `Acquisition` 인스턴스 소실 — 셋 다 오류 없이
  "아무 일도 일어나지 않는" 조용한 실패였다.
- `acquisition.ts`(비즈니스 로직)는 이미 옳았다 — 고친 것은 화면이 그것을 부르는
  방식뿐이다. 판정을 `resolveDownloadView()` 순수 함수로 뗐다.
- **탭 밖에서 네이티브 다운로드가 실제로 이어진다**(`expo-file-system`의
  `DownloadTask`가 JS 참조와 별개로 산다) — 이전에는 가정이었다.
- 받다 만 모델은 앱 UI로 지울 수 없다(003의 "지우기"는 `ready`인 줄에만 있다) —
  알려진 빈자리로 남아 있다.

### 009 — 과거 하루 선택

- 고를 수 있는 하루가 셋(마지막으로 닫힌 하루 + 그 앞 둘)이다. **"3일"은 개수이지
  기간이 아니다** — 일기는 여전히 하루에 하나, 그 하루만 쓴다.
- 제약이 화면 한 곳(`DiaryHomeScreen`이 넘기는 `day:` 인자)에만 있었다 — 나머지
  계층은 이미 하루를 인자로 받고 있었다. 안 고치면 화면에서 골라도 조용히 항상
  어제가 쓰였을 것이다(006·007·008과 같은 계열의 조용한 실패).
- 되돌림(범위 밖으로 밀려난 하루를 기본값으로)은 지우는 코드 없이, 매 렌더에서
  다시 판정하는 방식으로 구현했다 — `useEffect`/타이머 없이 타이밍 버그를 막는다.
- 고른 하루는 파일에 남기지 않는다(007의 캐릭터 선택과 의도적으로 다름) — 시간이
  지나면 범위를 벗어나 저장된 값이 오히려 틀린 값이 된다.
- **`Function.length`는 기본값 인자를 세지 않는다** — 계약 테스트를 인자 개수로
  방어하려던 시도가 뚫렸다. 이후 소스를 직접 읽는 패턴으로 교체.
- `none`(사진이 실제로 0장인 하루)과 `unknown`(권한 없음)이 실기기에서 서로 다른
  문구("사진 없음" vs "사진 모름")로 확인됐다 — 004가 값에서 지킨 구분이 화면까지
  도착했다.

### 010 — 합성 하루를 기기에 심는 도구

- 테스트 기기가 주머니에 안 들어가 볼 것이 없는 하루만 검증해 온 문제를 고쳤다.
  개발 기계 스크립트가 지정한 하루의 사진을 MediaStore에 심고, 앱은 도구가
  있었는지 모른 채 평소와 똑같이 읽는다(**앱 코드 변경 0줄**).
- `npm run seed:day -- <모양> <날짜>` / `seed:list` / `seed:clear`.
- **손으로 만든 EXIF를 미디어 스캐너가 무시한다** — 원인 불명. 그래서 저장소에
  실기기에서 찍은 템플릿 JPEG을 두고 날짜·GPS 바이트만 길이를 유지한 채
  교체한다(오프셋 불변, IFD 재계산 불필요).
- **색인 방법은 `content call --method scan_file` 하나뿐이다** — 브로드캐스트나
  직접 update는 조용히 실패한다(성공한 것처럼 보이지만 셸 UID가 다른 앱 소유
  행을 못 고친다).
- **확인 단계가 실제로 결함을 잡았다**: `over-limit`(201장)을 심었더니 322초
  걸리고 150장만 색인됐다 — 되읽어 확인하지 않았다면 몰랐을 실패였다. 그래서
  `over-limit` 모양은 지금 쓸 수 없다.
- 자동으로 치우지 않는다(`existing`으로 남은 것을 알린다) — 검증을 한 번으로
  끝내지 않기 위해서다.
- 헌법 검사: `scripts/seed*`가 `diary/store`·`generate(`·`initLlama`에 닿지 못하게
  막는다 — "심은 하루로 캐릭터를 비교해 보자"는 원칙 IV·V 위반이 되기 쉬운 자리다.
  **심은 하루로 품질을 결론짓지 않는다** — 얻을 수 있는 것은 "경로가 도는가"이지
  "출력이 좋은가"가 아니다.

### 011 — 사진 내용 캡션

- 004가 장수·좌표만 세던 것을, 사진 보는 VLM이 장별로 캡션을 만들어 005의
  프롬프트에 재료로 넣는다. **캐릭터 로스터와 무관한 모델 하나** — 처음엔
  "캐릭터 모델에 mmproj를 붙인다"로 계획했으나 사용자가 바로잡았다.
  `src/vision/roster.ts`는 `models/roster.ts`와 서로 import하지 않는다.
- 파이프라인: `사진 → [VLM 열기 → 장별 캡션 → 닫기] → 텍스트 → [캐릭터 모델 →
  일기]`. 두 엔진은 서로를 모르며 `on-device.ts`가 순서를 지킨다(한 번에 모델
  하나만 열린다는 005의 제약 때문).
- **캡션 샘플링은 `inference/sampling.ts`를 재사용하지 않는다** — 캡션용 온도를
  낮추면 일기 생성도 함께 바뀌어 원칙 I을 조용히 깬다. `src/vision/sampling.ts`에
  따로 두고 헌법 검사가 재사용을 막는다.
- 캡션은 되뱉기 판정 대상에 넣지 않는다 — 캡션은 신호 자체이므로 일기에 나오는
  것이 정상이다. 5장 상한은 `n_ctx` 초과도 함께 막는다.
- **5장은 하루에 걸쳐 균일 선택한다**(004의 `slice(0, limit)`과 의도적으로 다름) —
  앞에서부터 자르면 아침만 보고 하루를 쓰게 된다.
- 캡션에 "틀릴 수 있다" 같은 불확실성 표현을 붙이지 않는다 — 붙이면 모델이 전부
  얼버무리고, 005의 실측이 가르친 것은 "압력이 지어내기를 낳는다"는 것이었다.
- 헌법 검사 둘 추가: `src/vision/`이 `diary/store`(캡션 품질을 일기 저장소로
  재는 것 방지)와 `inference/sampling`에 닿지 못한다.
- **실기기 확인에서 결함을 잡았다**: `PhotoPort`가 넘긴 것이 안드로이드
  contentUri(`content://...`)라 네이티브가 파일로 못 열었다 — 사진을 하나도
  안 보고도 일기가 나오는 조용한 실패였다(로그의 `has_media=0`으로만 드러남).
  `filePathOf()`가 `Asset.getUri()`를 부르고 `file://`를 떼는 방식으로 고쳤다.
- VLM→캐릭터 모델 전환이 실제로 된다(한 요청 안에서 크래시 없이). 「보지 않음」과
  「빠르게 봄」의 일기가 확연히 다르다(캡션이 실제로 재료가 된다).
- **캡션이 영어다** — 캡션 프롬프트가 영어라 한국어 일기에 영어 단어가 섞여
  나온다(예: "sleeping bag"). 아직 고치지 않았다.
- 캡션 깊이(`image_max_tokens`)가 클수록 더 지어낸다는 관측이 있다(검은 이미지
  기준) — 다만 진짜 사진에서 같은지는 013 이후 별도로 확인이 필요하다.
- VLM 안 열기: 사진이 0장이거나 권한이 없으면 VLM을 아예 열지 않는다(캡션 시도
  0회) — 볼 것이 없으면 여는 것 자체를 생략한다.

### 012 — 정오 이후 오늘 쓰기

- `day-boundary.ts`의 `isDayClosed` → `isDayWritable`(정오부터 열림) 교체가
  기능의 전부이며, 나머지(축 제외·덮어쓰기 확인·사진 상한 제거)는 게이트가
  열리며 함께 드러난 표면이다.
- 헌법 원칙 II MUST: `DAY_STILL_OPEN`("오늘은 아직 끝나지 않았다...") 문장이
  사진 권한과 무관하게 프롬프트에 실린다. **신호가 빈약한 하루에서는 이 문장이
  되뱉기(`echo`) 거부를 유발할 수 있다**(실기기 관측, 재시도로 해소) — 원칙 I의
  방어(거부 시 파일 안 건드림)는 정상 작동했다.
- 사용자 화면에서 걸음·배터리·연결 세 축이 사라졌다(`USER_VISIBLE_SIGNAL_AXES`
  상수). 진단 화면(`SignalProbe.tsx`)은 여전히 다섯 축을 보인다 — 헌법 검사가
  진단 화면이 그 상수를 참조하지 못하게 막아 경계를 이중으로 지킨다.
- 사진 상한을 없앴다(`DEFAULT_PHOTO_LIMIT` 제거) — 조회 성공 시 구간의 사진
  전부가 담긴다. 실기기에서 18장까지 상한 없음이 확인됐다.
- 덮어쓰기 확인 화면(`OverwriteConfirmScreen`)이 새로 생겼다 — 이미 있는 하루에
  "일기 쓰기"를 눌러도 곧바로 생성하지 않고 취소/확인을 먼저 묻는다.
- **가장 위험했던 결함**: 화면이 완벽해도 파이프라인 게이트가 옛 `isDayClosed`로
  남아 있으면 조용히 `day-not-closed`로 막힌다 — 위반 주입에서 실제로 이것부터
  걸렸다.
- 정오 이전 안내(D8)와 정오 경계를 넘나드는 순간의 화면 갱신은 기기 시각을 바꿀
  수 없어(root 필요) 실기기 미확인 — 기기 없는 계약 테스트가 이 갈래를 검증한다.

### 013 — 캡션 전 리사이즈

- 사진을 VLM에 넘기기 전 리사이즈해 캡션 시간을 129초→23초(82% 감소, 스펙 요구
  "절반 이하"를 크게 웃돎)로 줄였다. "VLM 캡션 60초의 원인" 조사(아래 문단)가
  근거다.
- **실기기에서만 드러난 함정 둘** — 기기 없는 테스트 1276개가 통과한 채로 사진을
  하나도 안 보고 일기가 나왔다(011의 결함과 같은 계열). 원인은 `expo-image-
  manipulator`(URI 요구)와 011의 `resolvePath()`(순수 경로 반환)가 정반대의 URI
  계약을 가진 것 — 리사이즈 입력에 `file://`를 붙이고, 출력에서 다시 떼는 두
  단계가 모두 필요했다. 둘 다 예외 없이 `{ ok: false }`로 조용히 감싸졌으므로
  `console.log`를 단계마다 심어야 원인이 드러났다.
- 캡션이 실제 사진 내용을 정확히 반영하는 것을 진짜 사진(피크닉 장면)으로
  확인했다 — 검은 이미지가 아닌 진짜 사진에서의 첫 검증이다.
- release 재확인은 생략했다 — `expo-image-manipulator`는 표준 Expo autolinking
  모듈이라(005·011처럼 손으로 짠 JNI 브릿지가 아님) debug 1회로 충분하다는
  판단(아래 "테스트" 절의 기준을 따름).

### 014 — 캐릭터 페르소나

- 다섯 캐릭터가 사람이 지은 이름·소개로 보인다(금동이·루이·오드·샤오바이·모카,
  `src/diary/persona.ts` 신규 — 003이 남긴 자리를 채웠다). 로드맵 문서가 이미
  옮겨 둔 값을 코드로 옮겼을 뿐 새로 짓지 않았다.
- 일기에 제목이 붙는다(`extractTitle()`, `judge()` **통과 후**에만 분리) — 판정
  갈래는 여전히 4개, 제목을 못 떼도 거부하지 않고 `title: undefined`로 저장한다.
- 프롬프트에 "확실하지 않은 것은 짐작의 말투로" 규칙을 추가해 원칙 II 위반을
  교정했다(005~012의 공통 패턴이 "짐작해도 될 것을 단정형으로 썼다"는 재진단).
- 진단 화면에 캐릭터별 모델 이름이 보인다(`roster.ts`의 `displayName()`) —
  `DiagnosticsScreen`은 여전히 `roster.ts`를 직접 import하지 않는다(007의 경계
  유지).
- **plan.md가 놓친 이중 정의**: `DiaryListItem` 타입이 `store.ts`와 `app/state.ts`
  두 곳에 독립적으로 있었다 — `tsc`가 즉시 잡았다(007·009와 달리 이번엔 타입
  검사가 원인을 정확히 가리켰다).
- **헌법 1.1.1 개정**(2026-08-23, 사용자 요청): 오드의 소개("상상력이 풍부해요")와
  헌법 MUST 고지("상상을 섞어 씁니다")가 화면에서 같은 사실을 중복 전달했다.
  로스터 조항에 "소개 문구 자체가 강점의 언어로 그 사실을 담으면 별도 고지가
  필요 없다"를 명시하고, 오드의 tagline을 헌법이 이미 예로 든 "상상력이
  풍부해요"로 유지하며 별도 고지 렌더링(`IMAGINATIVE_NOTICE`)을 제거했다. 낱말
  ("상상")의 반복이 아니라 **같은 사실의 이중 전달**이 진짜 문제였다는 것이
  교훈이다 — 처음엔 tagline만 바꿔 증상만 지웠다가 사용자가 다시 확인해 뒤집었다.
- "고름"(선택 표식)이 욕창을 연상시킨다는 사용자 피드백으로 "선택"으로 바꿨다
  (캐릭터·날짜·사진 설정 세 화면 전부, 관련 Maestro 흐름 문자열도 함께 갱신).
- 진단 화면(환경·추론 위치 등)을 일기 탭 위 작은 창에서 "개발자" 탭으로 옮겼다
  (사용자 요청) — 노출 조건(local·dev 전용, `showsOnScreen()`)은 동일하게 유지,
  prod에서는 탭 자체가 없다. 사용자가 실기기에서 직접 확인했다(2026-08-23).
- 실기기 확인: 이름·소개·제목(생성·저장·목록·상세)·진단 모델명·덮어쓰기 확인,
  개발자 탭·오드 고지·선택 표식까지 전부 문제없었다. 다른 캐릭터의 지어내기
  관측(D6)과 제목 40자 상한의 적절성은 미확인으로 남아 있다.

### 018 — 프롬프트 고정 접두사 미리 프리필 (2026-08-27)

my-ollama 저장소의 실측(Galaxy S22, 교대 설계 18런)을 근거로 받은 스펙 —
프롬프트의 69.8%(화자 규칙·이름·제목 지시문, 캐릭터가 같으면 날마다 불변)를
KV 캐시에 미리 채워 두면 TTFT가 20.6초→6.6초로 줄어든다는 결론을 이 저장소에
적용했다.

- `GenerationEngine.prewarm(character)`가 새 계약이다(`engine-port.ts`) —
  **반환값이 없다**(원칙 IV). 실패해도 다음 `run()`이 그냥 느릴 뿐 틀리지
  않으므로 알릴 것이 없다는 것이 이 설계의 핵심.
- `prompt.ts`의 `promptPrefix()`가 `buildPrompt()`와 **같은 배열
  (`fixedHead()`)에서** 나온다 — 복제하면 접두사가 한 글자만 어긋나도 KV
  캐시가 빗나가 이 기능 전체가 "느려질 뿐 오류 없이" 무의미해진다. 계약
  테스트(P8·P10·P11)가 이 바이트 동일성과 캐릭터별 유일성을 잠근다.
- **`/speckit-analyze`가 계획 단계에서 구조적 결함을 잡았다**: 화면이 미리
  읽은 사진 결과(`seen`)를 파이프라인을 거치지 않고는 실제 생성 호출에
  전달할 수 없었다 — `pipeline.ts`의 `runStages()`가 `deps.backend.generate()`를
  두 인자로만 부르고 있었기 때문이다. `PipelineInput.seen?`과
  `InferenceBackend.generate()`의 세 번째 인자를 추가해 해소했다(둘 다
  옵셔널 확장, 기존 호출자는 안 깨짐).
- 2단계(사진 있는 날)는 `on-device.ts`에 `captionDay(day, character, vision)`을
  노출해 화면이 사진 읽기만 독립적으로 트리거하게 했다 — **화면은 신호
  (`DaySignals`)를 모른다**(009부터 이어진 경계)는 제약 때문에, 신호를
  읽는 것까지 이 함수 안에서 한다(`wiring.ts`의 `deviceSignals`를 그대로
  주입받아 재사용, 새 신호 수집 경로를 만들지 않는다).
- E1(한 번에 하나의 엔진만 열림)을 지키는 자리는 화면이다 — 사진이 있는
  날은 캡션이 끝난 뒤에만 `prepare()`를 부르고, 캡션이 아직 안 끝난 상태에서
  "쓰기"를 누르면 새로 읽지 않고 그 `Promise`를 그대로 기다린다(취소·재시도
  로직 없이 기존 `Promise`를 재사용하는 것으로 충분했다).
- 계약 테스트로 확인한 위반 주입 셋 — `prewarm()`이 값을 반환하도록
  고치면 `tsc`가 잡고, 접두사에 날짜를 섞으면 P10이, 두 캐릭터 이름을
  같게 하면 P11이 잡는다. 셋 다 실제로 잡히는 것을 확인했다.
- 기기 없는 테스트 1574개 전부 통과, lint·헌법 검사·prettier 전부 클린.
- **실기기 확인 완료**(2026-08-27, SM-S901N/Galaxy S22, debug). 금동이
  (quiet)로 즉시 쓰기 36초 vs 40초 대기 후 27초 — **방향은 맞지만
  절감폭(약 25%)이 my-ollama 원 실측(약 68%)보다 작다.** 이 기기·이
  캐릭터 조합은 전체 생성 자체가 짧아(27~59초 대) `engine.load()`가
  차지하는 비중이 상대적으로 크고, `prewarm()`(KV 캐시 프리필)의
  효과가 상대적으로 더 작게 보이는 것으로 관측된다 — narrative처럼
  무거운 캐릭터나 다른 기기에서는 절감폭이 달라질 수 있다(미확인).
  화면 이탈 후 복귀도 정상 완성(41초, 오류 없음). 사진 있는 날(루이,
  합성 3장)은 캡션 18~20초, 작성 59초로 두 번 모두 사진 내용을 정확히
  반영했고, 캡션 도중 "쓰기"를 눌러도 재로드 흔적(비정상적으로 긴
  캡션 시간) 없이 한 번만 돌았다. 날짜를 A(08-24)에서 B(08-25)로
  바꾼 뒤 쓰면 B의 사진만 반영되고 A의 캡션이 섞이지 않는 것도
  확인했다(합성 하루는 010 원칙대로 "경로가 도는가"만 확인하는
  용도로 썼다).

### 019 — 백그라운드 자동 일기 생성 기술 검증 (2026-08-28)

**기능 스펙이 아니라 스파이크**(구현 아님, 검증 전용) — 산출물은
`src/spike/`의 하네스와 `specs/019-background-diary-feasibility/
findings.md`다. **결론: 조건부 가능(YES, 조건부).** 화면이 꺼지고
잠긴 상태에서 `expo-background-task`(WorkManager) 백그라운드 실행이
실제로 완주하고 정상적인 일기를 남기지만, **배터리 최적화 예외 없이는
"매일 자동으로"라는 목표 자체가 사실상 무력화된다.**

- 배터리 최적화 **기본값**(예외 없음)에서는 15분 최소 간격으로
  등록해도 실제 실행이 하루 1~2회로 억제됐다 — 관측된 두 실행 사이
  간격이 **19시간 33분**(등록값 대비 약 78배)이었다. 15분 요청 자체는
  `dumpsys jobscheduler`에 정확히 전달되고 있었으므로(`Minimum
  latency: +14m59s***ms`), 억제의 원인은 앱이 아니라 OS의 Doze/앱
  대기 버킷이다.
- 배터리 최적화 **예외**(`설정 → 앱 → 배터리 → 제한 없음`, 검증에서는
  `adb shell dumpsys deviceidle whitelist +<패키지>`로 동등하게 재현)를
  주면 standby bucket이 즉시 `EXEMPTED(5)`로 바뀌고, 같은 15분 등록이
  실제로 **10~32분** 간격으로 돌았다(연속 2회 관측).
- 6회 전부(기본값 2회 + 예외 2회, 재실행 2회 포함) `outcome: "ok"` →
  `Success`로 완주했다 — 중단·크래시 없음. 사진 있는 날(3장, 캡션
  포함)은 2분 27초, 사진 없는 날은 47초~2분 6초였다. 백그라운드에서
  나온 일기는 판정 4갈래·페르소나 규칙을 정상적으로 거쳤고 포그라운드
  생성과 구분되지 않았다(원칙 IV 위반 없음).
- 사진 권한은 6회 전부 방치 후에도 유효했다(`valid: true`) — 자동
  회수 관측 안 됨. 좌표 권한은 이 기기가 애초에 요청한 적이 없어
  "회수되는지"는 확인하지 못했다(원래 없음과 회수됨을 구분 못 함).
- **`AppState.currentState`는 화면의 물리적 꺼짐을 완벽히 보장하지
  않는다** — 반복된 `adb shell dumpsys` 조회가 화면을 깨운 것으로
  보이는 순간이 실측 중 실제로 관측됐다(`mWakefulness=Awake`로
  전환). 화면을 다시 끄고 잠금을 재확인한 뒤에도 태스크는
  `appState: "background"`로 기록됐다 — "앱 UI가 전경에 없다"만
  구분하지 "화면이 이 순간 꺼져 있다"는 보장하지 않는다는 한계다.
- narrative(exaone, 콜드 최대 242초 관측)로는 백그라운드 완주를
  확인하지 않았다 — quiet만으로 검증했다. E1(엔진 동시 접근) 경합도
  자연 발생하지 않아 재관측하지 못했다.
- **하네스는 `src/spike/`에 격리돼 있고 제품 계층을 한 줄도 고치지
  않았다**(H1). 헌법 검사(`checkSpikeFile`)가 이 경계를 지킨다. 이후
  실제 기능화 여부·하네스 유지 여부는 별도 스펙(020+)의 결정이다 —
  이 스파이크가 대신 정하지 않는다(findings.md "다음 스펙에서 고려할
  사항": 배터리 예외 요청 온보딩 UX, E1 잠금 설계, narrative 완주
  확인, 좌표 권한 회수 시나리오 전부 미결).

### 020 — 시간대 지정 자동 일기 작성과 완성 알림 (2026-08-28)

019 스파이크의 결론("조건부 가능")을 제품 기능으로 만들었다. **019
하네스(`src/spike/`)를 제거하고 제품 경로로 대체했다** —
`checkSpikeFile`을 `checkScheduleFile`로 개명·재활용해 `src/schedule/`
경계를 지킨다.

- **스케줄·알림·잠금의 순수 판정은 `src/schedule/`에, 기기 통로는
  `*-port.ts`에.** `decision.ts`(지금 돌릴까 + 어느 하루를),
  `retry.ts`(놓친 하루 선정 — `selectableDays`만 보므로 009 범위가
  자동으로 걸린다), `notify.ts`(보낼까/어떻게), `lock.ts`(경합 판정),
  `settings-effects.ts`(토글 부수 효과 S6 순서). 전부 `now`/`nowMs`를
  인자로 받고 `new Date()`를 안 부른다.
- **경합은 `pipeline.run()`의 옵셔널 `acquireLock?` + 파일 잠금 + stale
  5분.** `running: Set<DayDate>`는 인스턴스 로컬이라 화면 ↔ 백그라운드
  태스크(다른 파이프라인 인스턴스)를 못 막는다. `wiring.ts`가
  owner-bound(`"screen"`/`"background"`) `acquireLock` 클로저를 만들어
  주입하고, `pipeline.ts`는 `isDayWritable` → `running.has` **다음**에
  취득을 시도한다. 취득 실패는 `already-running` stage로 합류(화면
  문구 "이미 쓰고 있다" 재사용, 태스크는 `"skipped"`). `finally`에서
  `release`. `pipeline.ts`는 여전히 `expo-file-system`을 import하지
  않는다 — 파일 통로는 주입.
- **`STALE_LOCK_MS = 5분`의 근거**: 019 실측 최장 완주 2분 27초의 2배 +
  여유. **narrative(exaone) 백그라운드 완주가 4분을 넘으면 이 상수를
  재검토**한다(T053 게이트) — 019는 quiet만 백그라운드 검증했다.
- **자동 생성 설정은 "설정" 탭에 있다** — 개발자 탭과 달리 **prod에도
  있다**(FR-001, 엔드유저 화면). 목표 시각은 시 단위(0–23)만, 분은
  두지 않는다(근사치, FR-002). 화면·소스 어디에도 "정각"·"매일 7시"
  같은 정밀도 암시 문구를 두지 않는다(계약 테스트가 소스에서 검사).
- **`notified.json`은 `DiaryEntry`와 분리**(`preferences/`, `diary/`
  밖). `pruneNotified`는 **날짜 문자열 비교만**(값·시간 안 봄) —
  `task.ts`가 알림 발송 직후 `day - 30일`을 `keepFrom`으로 호출한다.
- **알림 라우팅**: `App.tsx`가 웜(`onResponse`)·콜드
  (`getLastNotificationResponseAsync`)를 순수 `routeFromNotification`으로
  통일 → `initialScreen(resolution, items, { initialDay, entry })`가
  목록을 건너뛰고 상세를 첫 화면으로 만든다(FR-006, SC-004). 상세
  진입 시 `acknowledgeNotified`로 확인 처리(FR-007 (2)).
- 기기 없는 테스트 1752개 전부 통과, lint·헌법 검사·prettier 클린.
- **실기기 검증에서 실제로 관측된 값**: (T053~T055 수행 후 여기 채운다
  — SC-003 배터리 예외 라운드 간격, narrative 백그라운드 완주 시간,
  배터리 인텐트가 실제 도착한 제조사 설정 화면, release R8 통과 여부.)

### 021 — 앱 요구 권한 실측 및 통합 신청 절차 (2026-08-29)

020이 `POST_NOTIFICATIONS`·배터리 예외를 새로 도입하며 앱 권한이 여러
기능에 흩어졌고, 새 release APK 설치 시 모든 권한이 꺼진 채로 사진 없는
일기가 조용히 생성되는 문제가 실기기에서 관측됐다. 앱 최초 진입부에
통합 온보딩을 두어 이를 고쳤다.

- **`src/onboarding/`가 새 경계다** — 020의 `src/schedule/`처럼 순수 판정
  (`requirements`·`decision`·`flag`)과 기기 통로(`*-port`)를 나눈다.
  `checkOnboardingFile`(`constitution-rules.ts`)이 `diary/prompt`·
  `diary/acceptance`·`models/roster`·`schedule/settings` 직접 import와
  `flag.ts`의 `Date`·`count`·`history` 토큰을 막는다(위반 주입 3건 전부
  잡히는 것을 확인).
- **필수 권한 목록은 사람이 못 박은 상수**(`requirements.ts`,
  `PERMISSION_REQUIREMENTS`) — 5갈래(`photos`·`photo-location`·`location`·
  `notifications`·`battery-exception`), `order` 1..5, 고정 순서. 012의
  `USER_VISIBLE_SIGNAL_AXES`가 선례다. **코드가 항목을 판정하지 않는다**
  (원칙 V) — 계약 테스트가 소스를 `readFileSync`로 읽어 `readonly`·문안
  토큰·플랫폼 메타를 잠근다.
- **온보딩은 건너뛸 수 있다**(원칙 I) — 각 단계 [허용]/[건너뛰기], 마지막
  [시작하기]가 `onboarding.json`에 `completed: true`를 쓴다. 뒤로 가기
  없음. 단계 완료는 저장하지 않고 매번 실시간 권한 상태로 재판정
  (`planOnboardingSteps`). `battery-exception`은 조회 통로가 없어
  `batteryNoticeShown`(1회 제시)으로만 판정하되, 세션 내 건너뛰기도
  존중한다(`skipped-eligible`).
- **020의 `AutoDiarySettings.batteryExceptionPrompted`를 흡수·제거**했다.
  `settings.ts`의 필드·파싱·직렬화 4곳, `settings-effects.ts`의
  `applyToggleOn` 배터리 로직, `SettingsEffectDeps.batteryPort`를 전부
  걷어냈다. 자동 생성 토글은 더 이상 배터리 인텐트를 띄우지 않는다 —
  배터리 안내의 주체는 통합 온보딩과 설정 "권한" 섹션뿐이다. **옛
  `auto-diary.json`의 그 값은 `loadAutoDiarySettings`가 무시하고**,
  `flag.ts`가 최초 1회 읽어 `batteryNoticeShown`을 시드한다(FR-010a) —
  `schedule/settings.ts`를 import하지 않고 `flag-port.ts`가 경로
  하드코딩으로 `auto-diary.json`을 직접 읽는다.
- **`NotificationPort`에 `getPermission()`을 더했다**(020의
  `requestPermission()`은 창을 띄우므로 상태 표시에 못 씀). 020 테스트
  mock 다수를 함께 손봤다.
- **거부 안내는 문자열 주입으로 흐른다** — `App.tsx`가
  `PERMISSION_REQUIREMENTS[...].ifDenied`를 모아 `deniedNotices`로
  `DiaryHomeScreen` → `DiaryListScreen`에 넘긴다. 006-era 화면이 온보딩
  계층에 닿지 않게 문자열만 넘긴다(중복 정의 없음).
- **App.tsx 진입 게이트**: `AppFrame`이 `onboarding.json`을 읽어
  `completed !== true`면 탭 UI 대신 `OnboardingScreen`만 그린다(006의
  "화면이 둘뿐이므로 상태 하나로 가른다"에 세 번째 상태를 얹음).
  설정 "권한" 섹션의 [권한 안내 다시 보기]가 `forceOnboarding`을 켠다 —
  `completed`는 그대로.
- **포그라운드 복귀 재조회**(SC-006): `OnboardingScreen`·
  `PermissionsSection`·App.tsx의 `deniedNotices` 계산이 전부 `AppState`
  `change` → `"active"`에서 권한을 다시 읽는다.
- **새 네이티브 모듈 0개** — `expo-media-library`·`expo-location`·
  `expo-notifications`·`expo-intent-launcher`의 기존 API만 재사용. 따라서
  release 재확인 불필요, debug 1회로 충분(012 기준).
- 기기 없는 테스트 1853개(+8 스위트) 통과, lint·헌법 검사·prettier 클린.
- **실기기 검증 완료(2026-08-29, SM-S901N/Galaxy S22, Android 16 / SDK 36,
  debug)**. 관측:
  - **진입 게이트**: 새 설치 첫 실행에서 일기 목록이 아니라 "시작하기 전에"
    온보딩이 먼저 뜬다. `pm clear`로 `onboarding.json`이 지워지면 다시
    "1 / 5"부터 재시작 — 게이트는 `completed` 플래그로만 판정.
  - **부분 사진 허용(Android 14+ `limited`)이 실제로 온다.** OS 다이얼로그의
    "제한된 액세스 허용" → 포토피커 2장 선택 시
    `READ_MEDIA_VISUAL_USER_SELECTED: granted=true` /
    `READ_MEDIA_IMAGES: granted=false`, `describePhotoAccessLimit`가
    `"partial"`을 반환하고 설정 "권한" 행이 **"일부만 허용됨" + [전체 허용]**
    로 렌더된다. 따라서 **`visiblePhotoCount` 분기는 이 기기에서 dead
    path**(구형 안드로이드 대비로 유지, 비용 0). 온보딩은 부분 허용도
    satisfied로 보고 다음 단계로 넘어간다.
  - **설정 "권한" 섹션 + OS 링크 + 복귀 갱신(SC-006)**: 5개 행이 라이브
    상태를 보인다. [전체 허용]/[허용] → `com.android.settings`
    `InstalledAppDetails` 진입. OS에서 부여 후 앱 복귀 시 `AppState`
    `change→active` 리스너가 행을 자동 갱신("일부만 허용됨"→"허용됨",
    "거부됨"→"허용됨").
  - **Maestro**: `.maestro/unified-permission-onboarding.yml` 전체 PASS.
    ⚠️ 흐름의 M2가 원래 `id: "onboarding-step-photos"`를 박아 두어, 사진
    권한이 이미(부분) 부여된 기기에서는 첫 단계가 사진이 아니라 실패했다 →
    **권한 상태 무관하게** 수정(`id: "onboarding-step-.*"` + skip-all
    루프). 어느 단계가 처음 뜨는지는 기기의 현재 권한 상태에 달렸다는 것이
    교훈 — OS가 자동 부여하는 항목이 있으면 새 설치라도 첫 단계가 사진이
    아닐 수 있다.
  - **회귀 확인**: `.maestro/scheduled-diary-notification.yml`(020)도 함께
    돌렸다 — **개발자 탭을 탭하던 stale 버그**(020 자동 생성 설정은
    `settings` 탭에 있다)를 발견·수정 후 PASS. 021 회귀가 아니라 020 흐름의
    잠재 결함이었다.
  - **D2 (온보딩 후 실제 생성 `has_media>0`)**: 캐릭터 모델(`a1.bin` kanana)과
    VLM(`v1.bin`+`v2.bin` LFM2.5-VL)을 개발 기계에서 받아 `run-as`로
    `files/models/`에 배치 + `state.json`에 `passed:true` verdict 3개
    (010 도구는 사진만 심으므로 모델은 수동). 사진 있는 하루(08-28, 3장) +
    `빠르게 봄` → `adb logcat`에 **`loadPrompt:580 ... has_media=1`**(VLM이 사진을
    IMAGE 청크로 디코드), 이어 캐릭터 모델 706토큰 프롬프트(캡션이 텍스트 재료로
    들어감). 일기가 사진 내용을 정확히 반영 + 짐작 말투. **021 온보딩이 부여한
    사진 권한으로 VLM→캐릭터 파이프라인이 실제로 사진을 읽었다**(011 "has_media=0"
    결함의 반대).
  - **D6 (020→021 업그레이드 시드)**: `onboarding.json` 삭제 + 구형
    `auto-diary.json`(`batteryExceptionPrompted:true`) → 재시작 시 온보딩 재노출
    (`completed:false` 시드), **배터리 단계는 온보딩 흐름에 안 나타남**
    (`batteryNoticeShown:true` 시드 → satisfied). `loadAutoDiarySettings`는 구형
    필드 무시, `flag.ts`만 raw로 읽어 시드 — 둘 다 확인.
  - **T030 (위치 권한 ↔ 안드로이드 장소명)**: 같은 하루(08-27, 좌표 강남 일대)를
    위치 권한 유무별로 두 번 생성. **부여**: `placeName={"kind":"known","value":"강남구"}`,
    본문에 "강남구". **거부**(`pm revoke ACCESS_FINE/COARSE_LOCATION`):
    `placeName={"kind":"unknown"}`, 본문에 지명 없음. → **안드로이드도
    `reverseGeocodeAsync`는 위치 권한이 있어야 지명을 준다**(없으면 예외 →
    `geocoding-port.ts`가 삼킴). `location.platforms`는 `["android","ios"]` 유지
    확정, `requirements.ts`의 "T030 실측 대기" 주석을 이 결과로 교체했다.
  - **미확인 잔여**: 없음. 새 네이티브 모듈 없어 release 재확인 생략(012 기준).
    ※ 검증용 모델·합성 하루는 010 원칙대로 "경로가 도는가"만 봤고 품질 결론에
    쓰지 않았다.

### 022 — 개발자 탭 내 입력 프롬프트 모니터링 (2026-08-29)

로드맵 6번. **원래 항목은 "토큰 지표 노출"까지 포함했으나 AI 이관 과정의
왜곡이었고**, 사용자 확인 결과 의도는 **입력 프롬프트 원본을 개발자 탭에
보여주는 것**뿐이었다. 토큰 지표를 건드리지 않으므로 `llama-port.ts`의 원칙 IV
경계와 파이프라인·`RunResult`는 무변경이다.

- **진단 계층이 `buildPrompt()`를 직접 부른다** — `src/diagnostics/prompt-preview.ts`가
  사람이 못 박은 `SIGNAL_PRESETS`(`empty`·`photos`)로 `buildRequest()` →
  `buildPrompt()`(실제 생성 경로가 부르는 바로 그 함수)를 불러
  `DiagnosticReport.promptPreviews`에 문자열로 싣는다. 014의 `characterModels`와
  동일한 경로. 계약 테스트 PP1이 "미리보기 문자열 == `buildPrompt()` 출력"을
  바이트 단위로 잠근다 — 복제하면 즉시 깨진다.
- **신호 프리셋은 사람이 정한 `readonly` 리터럴**(012의 `USER_VISIBLE_SIGNAL_AXES`
  선례) — 코드가 신호 값을 보고 조합을 만들지 않는다(원칙 V). `fake.ts`·`collect.ts`에서
  가져오지 않는다(경계 혼동 방지). `PREVIEW_DATE`는 과거 고정이라
  `dayStillOpen: false`로 결정된다.
- **화면은 `report.promptPreviews`의 문자열만 받는다** — `PromptPreviewPanel.tsx`가
  `diary/prompt`·`signals`를 import하지 않는다. `checkSourceFile`에
  `UI_TOUCHES_PROMPT`(`src/ui/` → `diary/prompt` 차단) 규칙을 추가했다.
  **`signals/types`는 막지 않았다** — `DiaryDetailScreen`(저장된 `signalsUsed`
  렌더)·`SignalProbe`(신호 수집)가 이미 정당하게 쓰고, 022가 그 경계를 새로
  만들지 않는다. 위반 주입 3종(화면이 `diary/prompt` import / 자체 조립 /
  `SIGNAL_PRESETS`를 `let`) 전부 잡히는 것을 확인했다.
- **근사 크기는 `text.length`**이고 화면이 "조립 시점 근사치, 실측 토큰 아님"
  라벨을 붙인다(원칙 IV). 소스에 `token` 어휘가 없다(계약 테스트 PP6).
- 기기 없는 테스트 1882개(+29) 통과, lint·헌법 검사(위반 0)·prettier 클린.
  `tsc`가 `DiagnosticReport` 생성 자리(early return 포함) 누락을 잡는다.
- **실기기 검증 완료(2026-08-29, SM-S901N/Galaxy S22, Android 16 / SDK 36, dev,
  무선 디버깅)**. 관측:
  - **D1 (프롬프트 원본)**: "개발자" 탭(dev라 노출)에 "입력 프롬프트 미리보기"
    패널이 뜨고, quiet "신호 없음" 프롬프트가 잘림 없이 전체 렌더 — 화자 규칙
    8줄 + `너는 '금동이'이라 불린다.` + 제목 지시문 + `한국어로 써라.` +
    `2026-01-15에 네가 본 것:` + `사진: 없었다.` + `다닌 자리: 없었다.` +
    `이 기록으로 그 하루의 일기를 써라.`. `<Text selectable>`이라 길게 눌러
    복사 가능(D4).
  - **D2 (프리셋 비교, SC-002)**: "사진 있음" 프롬프트에만
    `사진: 2장 (10시, 18시)`, `다닌 자리: 2곳, 대략 3400m 떨어져 있다.
    (사진 2장 중 2장에서 얻었다)`, `이 자리들은 하루의 궤적이 아니라...` 문장이
    들어감 — `buildPrompt()`가 프리셋 신호로 실제 조립한 결과(PP1 실기기 확인).
  - **D3 (근사 크기, FR-011)**: "신호 없음" **867자**, "사진 있음" **964자**
    (사진 프리셋이 더 큼, SC-003). 라벨은 `867자 (조립 시점 근사치, 실측 토큰
    아님)` — 원칙 IV 표기 정확.
  - **캐릭터 전환**: `prompt-preview-character-chinese` 칩 탭 → 프롬프트가 다시
    조립되어 마지막 줄이 `중국어로 써라.`로 바뀜(캐릭터별 `buildPrompt()` 재호출).
  - **D5 (사용자 화면 무노출, SC-005)**: 일기 상세 화면에 프롬프트·근사 크기·
    "실측 토큰" 등 진단 정보가 하나도 없음. 목록·캐릭터·설정 탭은 021에서 이미
    확인.
  - **Maestro**: `.maestro/prompt-preview.yml` 전체 PASS(`run-device-tests.mjs`
    `FLOWS`에 등록). ⚠️ 패널이 길어 각 프리셋·칩마다 `scrollUntilVisible`이
    필요했다 — `scrollUntilVisible`이 패널 제목에서 멈추므로 그 아래 요소는
    개별 스크롤로 올려야 한다(첫 작성 때 `assertVisible`만 써서 "사진 있음"에서
    실패, 수정함).
  - **회귀 — `skeleton.yml`의 stale 버그 발견·수정**: 014에서 진단 화면이
    "개발자" 탭으로 옮겨졌는데 `skeleton.yml`(마지막 수정 002)이 launch 직후
    `assertVisible: "환경"`을 하고 있어 실패했다 — 022 회귀가 아니라 기존 결함.
    개발자 탭을 먼저 누르도록 고쳐 PASS(020 회귀 검증의 "개발자 탭 stale 버그"와
    같은 성격). 진단 화면 기존 항목(환경·추론 위치·모듈 상태·저장 점검)은 022
    패널 아래 그대로 있음.
  - **미확인 잔여**: D6(prod 빌드에 개발자 탭 없음)은 이 세션에서 안 봤다 — 새
    네이티브 모듈 없어 release 재확인 생략(012 기준)이나 prod 게이트 자체의
    실측은 남아 있다. ※ 검증용 합성 프리셋은 사람이 못 박은 상수일 뿐 품질
    결론에 쓰지 않았다.

## VLM 캡션 60초의 원인 — 실측 (2026-08-22)

013의 리사이즈 결정 근거가 된 조사. 제품 코드는 건드리지 않고 `adb logcat`만
읽었다(SM-G986N, release, `quiet`, 「빠르게 봄」).

**원인은 타일링이지 파일 크기가 아니다.** `image_max_tokens`(256)는 청크 하나의
크기만 정하고, 4032×3024 사진은 타일로 쪼개져 IMAGE 청크 7~9개(장당 약 3.2~3.3초
× 개수)를 만든다 — 파일 크기 0.97MB와 4.15MB가 똑같이 7~9청크였다. 시간의 96%가
IMAGE 청크 평가이고 디코드는 1% 미만이므로 압축률·포맷 변경은 효과가 없다.

**리사이즈만 유효하며 효과는 약 20배다** — 4032×3024→1024×768에서 IMAGE 청크
9→1개, 장당 30.9초→1.3초(같은 실행 안에서 원본·리사이즈본을 함께 캡션해 대조).
1024px에서도 캡션이 실제 사진 내용을 정확히 반영했다(붉은 화병·노란 직선 등을
원본과 대조 확인). 다만 품질 하한(512·768에서도 유지되는가)은 재지 않았다.

미확인으로 남은 것: 품질이 무너지는 해상도 하한, 기기 내 리사이즈 자체의 비용
(013이 제품에 반영하며 답을 얻음 — 위 013 절 참조), `image_min_tokens`의 효과,
`i8mm`이 있는 다른 기기에서 GPU 경로가 열리는가.

## 코드를 어디에 두는가

```
src/
├── config/       환경 판정, 추론 위치 규칙, 하루 경계
├── inference/    추론 어댑터 (온디바이스 / 데스크톱 서버)
├── signals/      하루치 신호. 사진은 실제로 수집한다 (나머지는 unknown)
├── vision/       사진의 내용을 읽는다 (011). **캐릭터와 무관한 모델 하나**
├── diary/        일기의 모양, 파이프라인, 저장, 캐릭터 페르소나(014), 제목(014)
├── models/       캐릭터→모델 파일 매핑, 내려받기·검증·삭제
├── diagnostics/  진단 정보 수집과 출력 경로
└── ui/           화면

scripts/          헌법 검사, 실기기 테스트 실행기, 합성 하루 심기(010)
__tests__/        기기 불필요 테스트 (항상 돈다)
.maestro/         실기기 테스트 (기기 있을 때만)
```

- `src/signals/` — **사진은 실제로 수집한다**(004). `photos`는 미디어
  라이브러리에서, `places`는 사진 좌표에서 온다. `steps`·`battery`·`connectivity`는
  `unknown`이며 그것이 결론이지 미완성이 아니다 — 되짚을 통로가 없다. `fake.ts`는
  테스트·개발 전용이며 `src/ui/`에서 import하지 않는다(원칙 I).
- `src/diary/` — 요청·일기·파이프라인·저장·프롬프트·판정·페르소나·제목.
  - `prompt.ts` — **헌법 원칙 II의 유일한 통과 지점.** 화자 규칙이 여기 하나뿐이고
    `unknown`/`none`을 다른 문장으로 옮긴다. 캐릭터에서 오는 것은 이름과 출력
    언어뿐 — 성격 지시를 넣으면 관측된 성격이 아니라 지어낸 성격이 된다(원칙 III).
  - `acceptance.ts` — **원칙 I의 마지막 방어선.** 거부 갈래가 넷뿐(`empty`/`echo`/
    `language`/`unfinished`)이고 테스트가 그 수를 직접 센다. 임계값·유사도·점수를
    쓰지 않는다 — 다섯 번째 갈래를 넣으려면 `contracts/acceptance.md`를 먼저 고친다.
  - `persona.ts`(014) — 캐릭터→이름·소개의 유일한 통과 지점. `roster.ts`를
    import하지 않는다(원칙 III). 소개는 프롬프트에 들어가지 않는다(이름만 들어감).
  - `title.ts`(014) — `judge()` 통과 후에만 호출되는 순수 함수. 예외를 던지지
    않고, 제목을 못 떼면 `title` 없이 원문 전체를 `body`로 반환한다.
- `src/models/` — **캐릭터와 모델 파일을 잇는 자리, 원칙 III의 최전선.**
  - `roster.ts` — 캐릭터→모델 매핑의 유일한 자리. `allAssets()`나
    `characterFor()`를 두지 않는다 — 있으면 "다섯을 다 받자"가 한 줄로 가능해지고
    그것이 헌법 로스터 위반이다. `displayName()`(014)이 진단용 표시 이름을 준다.
  - `readiness.ts` — 준비 상태를 넷으로 가르는 순수 함수.
  - `expo-port.ts` — 기기에 닿는 유일한 자리. 나머지는 대역으로 검증된다.
- `src/inference/` — 001에서 열렸고 005가 실제 추론을 채웠다.
  - `llama-port.ts` — 기기에 닿는 유일한 자리이자 **원칙 IV의 경계**. 네이티브가
    요청하지 않은 지표(`timings` 등)를 보내므로 `RunResult`가 `{ text, ending }`
    둘만 갖는 것이 방어다.
  - `sampling.ts` — 온디바이스·데스크톱이 공유하는 유일한 자리(동일 파라미터).
  - `engine-port.ts` — 적재·실행·정리 계약. `Ending` 다섯 갈래.
- `src/vision/`(011) — **캐릭터 로스터와 별개의 자리**, `models/roster.ts`와 서로
  import하지 않는다.
  - `select.ts` — 5장을 하루에 걸쳐 균일하게 고른다(004의 `slice(0, limit)`과
    의도적으로 다름).
  - `vision-port.ts` — 기기에 닿는 유일한 자리이자 **원칙 IV의 두 번째 경계**
    (`VisionRunResult`가 `text` 하나뿐).
  - `sampling.ts` — `inference/sampling.ts`를 재사용하지 않는다(헌법 검사가 막음).

**측정·채점 코드를 둘 자리는 없다.** 모델 출력을 점수로 매기거나 여러 모델을
비교하는 코드는 위 어느 자리에도 속하지 않는다(원칙 IV). 필요하면 별도 저장소에서
한다. `scripts/check-constitution.mts`는 설정 위반을 잡는 것이지 모델 출력을 재지
않는다.

### 지켜야 할 경계

- **`process.env`는 `src/config/environment.ts`에서만 읽는다**(FR-009a).
- **추론 위치는 `src/inference/select.ts`에서만 고른다**(FR-025) — 어댑터를 직접
  만들어 쓰지 않는다.
- **`src/config/policy.ts`가 헌법 원칙 I의 방어선이다** — dev·prod에서 데스크톱
  서버가 허용되지 않는다는 규칙이 이 파일 한 곳에만 있다.
- **하루는 04:00에 닫히고 정오부터 오늘도 쓸 수 있다**(`src/config/day-boundary.ts`
  하나뿐, FR-021a·012). 자정이 아니다 — 00:30은 전날, 04:00은 당일이다. 두 함수
  모두 "지금"을 인자로 받는다(`new Date()`를 안에서 부르면 테스트 불가).
- **모르는 것을 기본값으로 채우지 않는다**(FR-003, 원칙 V). `SignalValue<T>`는
  `known`/`none`/`unknown` 셋을 가르며 `valueOr(signal, 0)` 같은 편의 함수를
  만들지 않는다.
- **실패가 텍스트를 반환하지 않는다**(FR-016, 원칙 I). `GenerationFailure`의 어느
  갈래에도 `text` 필드가 없다 — 플레이스홀더 텍스트도 금지.
- **신호가 없는 하루의 일기는 서로 비슷해도 된다**(006 FR-037a) — 입력이 같으면
  출력이 닮는 것은 정상이다. 일률적인 것을 결함으로 읽고 다양성을 넣으려 하지
  않는다 — 그 순간 지어내기가 시작된다.
- **프롬프트는 `src/diary/prompt.ts`에만 있다**(005 FR-013b, 데스크톱 어댑터도
  이것을 부른다). 캐릭터에서 오는 것은 이름과 출력 언어뿐이다.
- **출력 판정의 갈래는 넷이고 늘리지 않는다**(005 FR-018b) — 테스트가 그 수를
  직접 센다. 임계값을 두는 순간 채점 코드가 되고 그것이 원칙 IV — 되돌리기의
  이유다.
- **네이티브 추론 결과의 지표를 경계 밖으로 내보내지 않는다**(005 FR-011,
  `llama-port.ts`가 유일한 경계).
- **생성 중인 글을 화면에 보여주지 않는다**(005 FR-028b) — 토큰 콜백을
  `completion()`에 아예 넘기지 않는다.

## 환경은 셋이다

| 환경 | 어디서 | 추론 |
| --- | --- | --- |
| `local` | 개발자 기계 시뮬레이터 | 데스크톱 서버 (기본값), 실기기 연결 시 온디바이스도 가능 |
| `dev` | 실기기, 개발 빌드 | 온디바이스만 |
| `prod` | 실기기, 배포 빌드 | 온디바이스만 |

환경은 실행 시점에 `EXPO_PUBLIC_APP_ENV`로 정해진다. 빌드는 하나다.

**Expo Go로는 실행할 수 없다.** 네이티브 추론 모듈(`llama.rn`)이 Expo Go에 없기
때문이다. `npx expo run:android`로 development build를 쓴다.

## release 빌드와 서명

**손으로 설치할 수 있는 배포물을 만드는 절차다**(006). 스토어 등록은 범위 밖이다.

### 서명 키 (최초 1회)

**⚠️ 이 키를 잃으면 이미 설치된 앱을 덮어쓸 수 없다.** 지우고 다시 깔면 사용자의
일기가 함께 사라진다. **저장소 밖에 백업한다.**

```
keytool -genkeypair -v -keystore <경로>/alpharium.jks   -alias alpharium -keyalg RSA -keysize 2048 -validity 10000
```

**원본은 저장소 밖(`~/.alpharium-signing/`)에 두고, `android/app/`에는 사본을
놓는다** — `prebuild --clean`이 `android/`를 통째로 지우므로 거기 둔 키는 함께
사라진다.

```
mkdir -p ~/.alpharium-signing
cp android/app/alpharium.jks ~/.alpharium-signing/     # 원본 보관
cp ~/.alpharium-signing/alpharium.jks android/app/     # prebuild 뒤 되돌리기
```

비밀번호는 `~/.gradle/gradle.properties`에 적는다 — **저장소가 아니다**:

```
ALPHARIUM_STORE_PASSWORD=<비밀번호>
ALPHARIUM_KEY_PASSWORD=<비밀번호>
```

**서명 설정은 `plugins/with-release-signing.js`가 선언으로 넣는다.**
`android/app/build.gradle`을 직접 고치지 않는다 — gitignore된 생성물이라
`prebuild --clean`에 지워진다.

### 빌드

```
npx expo prebuild --platform android --clean
cp ~/.alpharium-signing/alpharium.jks android/app/     # ★ prebuild가 지웠다
cd android && NODE_ENV=production ./gradlew assembleRelease
```

**`--clean`을 건너뛰지 않는다** — 004에서 이것 때문에 권한이 빠진 APK가
설치됐다. **가운데 줄을 건너뛰지 않는다** — `prebuild --clean`이 키를 지운다.
**`NODE_ENV=production`이 필요하다** — 없으면 `.env.production`이 로드되지 않고
앱이 「이 빌드는 잘못 만들어졌다」로 뜬다.

산출물: `android/app/build/outputs/apk/release/app-release.apk`

### 확인 — 빌드 성공을 믿지 않는다

| 무엇 | 어떻게 | 통과 |
| --- | --- | --- |
| 서명 | `apksigner verify --print-certs <apk>` | `CN=Android Debug`가 **아니다** |
| 키 비커밋 | `git status`, `git ls-files \| grep -i jks` | 아무것도 안 나온다 |
| Metro 없이 도는가 | **Metro를 끄고 USB를 뽑고** 앱을 연다 | `Unable to load script`가 없다 |
| 환경 | 앱 화면 | 「이 빌드는 잘못 만들어졌다」가 **아니다** |

**⚠️ release는 minify·R8·ProGuard가 켜진다.** 동적 `import`와 `llama.rn`의 JNI
심볼이 여기서 깨질 수 있으며, **debug에서 돌았다는 것은 release에서 돈다는 뜻이
아니다**(원칙 V) — 새 네이티브 모듈이나 빌드 설정을 건드릴 때만 재확인한다.

## 테스트

| 명령 | 무엇 | 기기 |
| --- | --- | --- |
| `npm test` | 기기 불필요 갈래 전부 (약 13초) | 필요 없음. **항상 돈다** |
| `npm run test:logic` | 순수 로직만 (**약 7초**) — 개발 중 기본 | 필요 없음 |
| `npm run test:ui` | 화면만 | 필요 없음 |
| `npm run test:device` | 실기기 갈래 (Maestro) | 있으면 돌고 없으면 건너뛴다 |
| `npm run lint` | eslint + tsc + 헌법 검사 + prettier 포맷 검사 | 필요 없음 |

**건너뛴 실기기 테스트는 통과가 아니다.** 기기 없이 전부 초록불이어도 온디바이스는
검증되지 않은 상태다. 기능이 끝났다고 말하려면 최소 한 번은 실기기에서 돌아야
한다(원칙 V).

**"최소 한 번"이지 debug와 release를 매번 둘 다가 아니다**(012에서 확립). 새
네이티브 모듈이나 빌드 설정(동적 `import`, R8·ProGuard 대상, JNI 심볼 등)을
건드리지 않는 순수 로직·화면 기능이면 debug 실기기 확인 1회로 충분하다. release
재확인은 그런 경계를 새로 건드릴 때만 한다. 시뮬레이터(Expo Go 등)는 이
프로젝트에서 애초에 옵션이 아니다.

**⚠️ 새 Maestro 흐름은 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록해야
돈다.** 등록하지 않으면 파일이 있어도 실행기가 돌리지 않고, 초록불인데 아무것도
검증되지 않은 상태가 된다.

### jest가 두 프로젝트로 나뉜다 — 화면만 RN 런타임을 진다

`jest-expo` 프리셋은 워커마다 React Native 런타임을 세운다. `package.json`의
jest 설정이 `.ts`(순수 로직, `node` 환경)와 `.tsx`(화면, `jest-expo`) 둘로
갈라져 있다 — 순수 로직 40여 개가 43.8초에서 12.4초로 줄었다.

**개발 중에는 `npm run test:logic`을 쓴다** — 화면을 안 건드렸으면 이것으로
충분하다(약 7초). 화면을 건드렸으면 `npm run test:ui`, 커밋 전에는 `npm test`다.

- **가르는 기준은 확장자다.** `.tsx`면 화면, `.ts`면 순수 로직 — 새 화면 테스트를
  `.ts`로 만들면 `render()`가 없다고 실패한다(원인을 가리키는 실패라 안전하다).
- **`testMatch`가 어긋나면 스위트가 조용히 사라진다** — 어느 프로젝트에도 안
  잡힌 파일을 jest는 오류 없이 그냥 안 돌린다. `__tests__/jest-projects.test.ts`가
  파일 수를 직접 세어 막으며, 이 가드는 일부러 **양쪽** 프로젝트에 들어 있다
  (한쪽에만 두면 그 프로젝트가 통째로 사라지는 위반에서 가드 자신도 함께
  사라진다).
- **`--maxWorkers=50%`가 최적이다** — 75%·100%는 워커끼리 CPU를 뺏어 오히려
  느려졌다(18초→27.6초). CI는 러너가 2코어라 `--maxWorkers=2`를 따로 쓴다.

### Windows에서 느린 것은 Defender다

같은 명령이 CI(우분투)에서 6초, Windows에서 11분 39초였던 적이 있다 — 코드
문제가 아니라 Defender 실시간 검사가 `node_modules`의 44,221개 파일을 매번
가로챈 것(처음 35.37ms, 캐시 후 0.36ms, 98배 차이). `scripts/windows-dev-
exclusions.ps1`을 관리자 권한으로 돌리면 해소된다(기계 설정이라 CI에는 영향
없음). 테스트는 저장소 쪽에서 `--maxWorkers=50%`로 고쳤다 — 16워커가 CPU를 서로
뺏어 `render()`가 기본 5초 타임아웃을 넘겼던 것이 원인이었다.

## Expo 작업 시

패키지 버전을 추측하지 않는다. `expo install`은 npm이 아니라 Expo API에서 버전을
해석하므로 `npm view`는 틀린 답을 준다. 대상 SDK의 버전별 공식 문서나
context7(`/expo/expo`)로 확인하고 `npx expo install --check`로 검증한다.

**Expo SDK 57**로 간다 — 온디바이스 추론(Expo 57 + RN 0.86 + `llama.rn`)이
실증된 조합이기 때문이다. `llama.rn`은 Expo가 관리하는 패키지가 아니므로
`expo install --check`가 이 항목을 검사하지 않는다 — 패치 버전을 올릴 때도
실기기에서 `loaded`를 다시 확인한다(온디바이스 모듈이므로).

## 작업 습관

- 커밋 메시지는 한국어로 쓴다(헌법 「개발 방식」).
- 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」).
- **`main`에서 직접 작업하지 않는다.** 기능마다 브랜치를 파고 PR로 머지한다
  (021은 #31로 머지). **작업을 시작하기 전에 `git branch --show-current`로 지금
  브랜치를 눈으로 확인한다** — 스펙킷(`setup-plan.ps1` 등)이 출력하는 `BRANCH:`
  필드는 스펙 디렉터리 이름이지 체크아웃된 브랜치가 아니다. 2026-08-29에 이것을
  믿고 022를 통째로 `main`에서 작업·커밋한 사고가 있었다. `.githooks/pre-commit`·
  `pre-push`가 `main`/`master` 직접 커밋·push를 막는다(`core.hooksPath=.githooks`,
  clone 후 `git config core.hooksPath .githooks` 한 번 필요). 우회는 `--no-verify`.
- **한 축을 깊게 파고들고 싶어지면 그것이 실패 신호다.** 이 프로젝트에서 반복된
  실패는 코딩 에이전트가 여러 축 중 하나를 붙잡고 지나치게 파고든 것이었다.
- **계약 테스트는 소스 선언을 직접 읽는다.** jest는 타입을 지우므로 `tsc`만
  잡는 위반(타입 위반, 인자 개수 등)이 있다 — 007·009·012에서 반복 확인됐다.
- **위반 주입으로 방어를 검증한다.** 새 규칙을 세울 때마다 실제로 어겨 보고
  테스트나 헌법 검사가 잡는지 확인한다(007~014 전체의 공통 관례).
