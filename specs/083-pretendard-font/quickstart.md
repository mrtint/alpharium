# Quickstart: 두 플랫폼 모두 Pretendard로 — 확인 절차

계약은 [contracts/font-rules.md](contracts/font-rules.md)(F1~F5)·[contracts/font-license-screen.md](contracts/font-license-screen.md)(L1~L6), 값은 [data-model.md](data-model.md).

## 1. 기기 없는 확인

```bash
npx jest __tests__/config/font-rules.test.ts __tests__/ui/font-license.test.tsx
npm test
npm run lint
```

- 통과 기준: 전부 초록. 위반 주입(F1~F5, 각 계약의 「위반 주입」)이 실패로 뒤집힌다.

## 2. 빌드 — 네이티브 설정이 바뀐다

```bash
NETRC=<빈 디렉터리> npx expo prebuild --clean
```

- 안드로이드: `android/app/src/main/res/font/`에 `.otf` 다섯 + `xml_pretendard.xml`, `MainApplication`에 `ReactFontManager.getInstance().addCustomFont(this, "Pretendard", R.font.xml_pretendard)`. `res/font`의 각 파일 sha256이 `source.json`과 같다(플러그인은 복사만 한다).
- iOS: `ios/Pocketlog/Info.plist`의 `UIAppFonts`에 다섯.

### 2a. 안드로이드 실기기(SM-S901N) 재설치 — 데이터 보존

기기의 debug APK는 다른 기계에서 서명돼 덮어 설치가 안 된다(research R8). **되돌림을 확인하기 전에 백업을 지우지 않는다.**

```bash
export PATH=$PATH:~/Library/Android/sdk/platform-tools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
(cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a)
adb shell am force-stop com.a810labs.pocketlog
adb exec-out run-as com.a810labs.pocketlog tar -cf - files > <백업>/pocketlog-files.tar   # 약 2GB
tar -tvf <백업>/pocketlog-files.tar | grep models/            # a1.bin·v1.bin·v2.bin 크기 확인
adb uninstall com.a810labs.pocketlog
adb install android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.a810labs.pocketlog/.MainActivity && adb shell am force-stop com.a810labs.pocketlog   # 데이터 폴더 만들기
adb push <백업>/pocketlog-files.tar /data/local/tmp/ && adb shell chmod 644 /data/local/tmp/pocketlog-files.tar
adb shell "cat /data/local/tmp/pocketlog-files.tar | run-as com.a810labs.pocketlog tar -xf -"
adb shell run-as com.a810labs.pocketlog ls -la files/models files/diary
for p in READ_MEDIA_IMAGES READ_MEDIA_VISUAL_USER_SELECTED ACCESS_MEDIA_LOCATION ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION POST_NOTIFICATIONS; do adb shell pm grant com.a810labs.pocketlog android.permission.$p; done
adb shell rm /data/local/tmp/pocketlog-files.tar
```

- 확인: 모델 파일 크기가 백업과 같고, 앱이 온보딩 없이 홈으로 뜨고, 일기가 보인다. 그 뒤에야 맥의 백업을 지운다.
- 권한은 지우면 함께 사라진다 — 위 `pm grant`(기기에 없는 권한은 오류로 넘어간다)나 설정 앱에서 다시 준다.

### 2b. iOS 시뮬레이터(iPhone 17)

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -workspace ios/Pocketlog.xcworkspace \
  -scheme Pocketlog -configuration Debug -sdk iphonesimulator \
  -destination 'id=887BFB8C-1D79-47B9-B1A2-08AA2B60234F' -derivedDataPath <scratch>/dd build
xcrun simctl install 887BFB8C-1D79-47B9-B1A2-08AA2B60234F <scratch>/dd/Build/Products/Debug-iphonesimulator/Pocketlog.app
```

- 같은 맥에서 빌드하므로 덮어 설치로 데이터가 남는다(컨테이너 UUID는 바뀐다 — `xcrun simctl get_app_container booted com.a810labs.pocketlog data`로 다시 찾는다).

## 3. 같은 상태 깔기 → 찍기 → 나란히 (도구는 `captures/tools/`)

1. 두 기기의 `diary/`·`preferences/`·`vision-cache/`를 백업한다(안드로이드 `run-as tar`, iOS `cp -R`).
2. `node --no-warnings captures/tools/gen-fixtures.mts <out>`(저장소 루트에서) — 층 1 기준 설정 + 픽스처 일기 사흘 + 사진 사본 이름. 삭제 대상 설정 파일 목록도 찍는다.
3. 안드로이드: `/data/local/tmp`로 밀어 `run-as`로 `files/diary/`·`files/preferences/`·`files/vision-cache/`에 쓴다. iOS: 컨테이너 `Documents/` 아래에 복사한다.
4. Metro를 dev로 띄운다(`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`, `.env.development.local` 확인), `adb reverse tcp:8081 tcp:8081`, 기기 잠금 해제·화면 켜짐.
5. `maestro --device <시리얼/UDID> test captures/tools/capture-{android,ios}.yml`·`rename-{android,ios}.yml` — 스크린샷은 `~/.maestro/tests/<시각>/<흐름>/takeScreenshot/`에 남는다. `captures/after/<벌>/{android,ios}/`로 옮긴다.
6. `python3 -I captures/tools/side-by-side.py <pillow 경로> <android> <ios> <out>` — 1080px(360dp)와 1206px(402pt)가 같은 3px/단위라 그대로 나란히 붙는다.
7. 끝나면 두 기기의 데이터를 백업에서 되돌린다.

## 4. 판정

| 무엇 | 어떻게 | 통과 |
| --- | --- | --- |
| Pretendard가 쓰였다(SC-002) | `captures/tools/widths.py` — 같은 문자열(설정 「장소 이름으로 보기」·「쓰는 모듈」 값 「2.0GB」·쓴 날 홈 상태 줄 「오늘의 하루」) 잉크 폭을 단위(dp/pt)로 | 두 플랫폼 차이 ≤ 2%, 고치기 전(`captures/before/`)과 다름 |
| 굵기 다섯(SC-003) | 개발자·진단(700), 큰 날짜(800), 행 라벨(400), 버튼(600), 쓴 시각(500)을 눈으로 + 잉크 두께 | 다섯이 서로 다르고 두 플랫폼이 같다 |
| 깜빡임 없음(SC-004) | 콜드 스타트를 `screenrecord`(안드로이드)·`simctl io recordVideo`(iOS)로 찍어 로고→홈 프레임 | 시스템 서체 프레임 0 |
| 안드로이드 여백(FR-010) | 「서체만」 벌과 「여백 끔」 벌을 찍어 기준 행 셋의 위·아래 여백(dp) 대 iOS(pt) | 차이 합이 작은 쪽을 남기고 소유자 확정, 치수를 아래 「실측」에 |
| 라이선스 화면(SC-005·SC-008) | 설정 → 「서체 라이선스」 → 끝까지 → 뒤로. 글꼴 2.0배에서도 | 전문 끝 줄까지 보이고 설정으로 돌아온다, 겹침 0 |
| 층 1(SC-007) | `npm run test:layer1`(전용 기기 전제 — 일기를 지운다; 시작 전에 2a 백업과 같은 방법으로 `files/diary` 등을 따로 백업하고 끝나면 되돌린다) | 전부 통과 |
| 용량(FR-022) | 새 debug APK 안의 서체 항목 — `unzip -lv android/app/build/outputs/apk/debug/app-debug.apk \| grep res/font`의 압축 전·후 크기 합(기기의 옛 APK는 다른 기계·ABI라 비교하지 않는다) | 증가분 기록 |
| 흔들리는 자리 | 052 접힘 문턱·055 행 가운데·056 대화상자 행간·055 iOS 큰 제목 윗부분·060 큰 숫자·개발자 화면 | 잘림·겹침 없음 |

## 실측

2026-10-15, 안드로이드 SM-S901N(Android 16, dev — 맥에서 빌드한 debug APK arm64) · iOS iPhone 17 시뮬레이터(iOS 26.5, dev, 같은 맥 빌드), 둘 다 맥의 Metro. 고치기 전은 2026-10-14에 찍었다(픽스처 날이 하루 다르다 — 같은 규칙으로 만든 「오늘부터 사흘」).

### 빌드·설치

- `prebuild --clean`: 안드로이드 `res/font/` 다섯(sha256이 `source.json`과 같다 — 플러그인은 복사만 한다)·`xml_pretendard.xml`(굵기 400~800)·`MainApplication`의 `addCustomFont(this, "Pretendard", R.font.xml_pretendard)`. iOS `UIAppFonts` 다섯. `expo-font`를 직접 의존성으로 올리지 않아도 플러그인이 풀렸다(research R3 그대로).
- `assembleDebug`(arm64) 6분 4초.
- 안드로이드 재설치: `files/` 백업 2,014,692,864바이트(2분 5초) → uninstall → install → 되돌림(밀어 넣기 51초) → 모델 셋 md5가 지우기 전과 같다(a1 `d8506380…`, v1 `b0f40eda…`, v2 `7e8624e7…`) → `pm grant`로 사진·위치·알림 다시 부여. **재설치 뒤 기기가 Smart Lock 신뢰를 잃어 PIN 잠금이 걸렸다**(`trustState=UNTRUSTED`) — 사람이 풀었다.
- 용량(FR-022): 새 APK 안 `res/font/` 다섯 = 압축 전 7,887,296바이트 · **APK 안 압축 5,314,201바이트(약 5.3MB)** + XML 896/280바이트. 기기의 옛 APK는 다른 기계·ABI라 비교하지 않았다. iOS 시뮬레이터 `.app` 안의 서체 다섯은 압축 없이 7,887,296바이트(약 7.9MB) — IPA는 zip이라 안드로이드와 비슷하게 줄 것으로 본다(재지 않았다).

### 글자 폭 (SC-002, `tools/widths.py`, 단위 = dp/pt)

| 문자열 | 전 안드로이드 | 전 iOS | 후 안드로이드 | 후 iOS | 후 차이 |
| --- | --- | --- | --- | --- | --- |
| 「장소 이름으로 보기」 | 109.0 | 109.7 | 109.0 | 109.0 | 0% |
| 「2.0GB」 | 39.0 | 41.0 | 40.0 | 40.0 | 0% |
| 「오늘의 하루」 | 55.7 | 67.7 | 67.7 | 67.3 | 0.6% |

- 두 플랫폼 차이 ≤ 2% — 통과. 안드로이드는 고치기 전과 크게 다르다(「오늘의 하루」 55.7 → 67.7). **iOS는 고치기 전과 거의 같다**(0.3~1.0단위) — iOS 시스템 서체(SF + Apple SD Gothic Neo)와 Pretendard가 원래 닮았다(Pretendard의 설계 의도). Pretendard가 실제로 쓰였다는 iOS 쪽 증거는 스파이크(`captures/spike-ios-variable-vs-static.png` — 시스템 서체와 폭이 다름)와 서체를 넣은 뒤 두 플랫폼 폭이 같아진 것이다.

### 안드로이드 글자 위아래 여백 (FR-010, `tools/measure.py refs`, 단위 = dp/pt)

| 기준 행 | 항목 | 서체만(안드로이드) | 여백 끔(안드로이드) | iOS |
| --- | --- | --- | --- | --- |
| 큰 날짜 숫자 | 월 라벨 → 숫자 잉크 위 | 19.0 | 19.0 | 13.3 |
| | 숫자 잉크 아래 → 스트립 선 | 26.3 | 26.3 | 32.0 |
| 설정 「이름」 | 「캐릭터」 → 「이름」 잉크 위 | 27.0 | 27.0 | 27.0 |
| | 「이름」 잉크 아래 → 구분선 | 15.0 | 15.0 | 14.7 |
| 하단 바 「다시 쓰기」 | 바 위 경계 → 잉크 위 | 13.7 | 13.7 | 13.7 |
| | 잉크 아래 → 보조 줄 | 12.3 | 12.3 | 12.3 |
| | **차이 절댓값 합** | **11.7** | **11.7** | — |

- **두 벌이 픽셀 단위로 같았다**(7화면 모두 차이 0픽셀, Metro 번들에 `includeFontPadding: false`가 실린 것을 확인). 이 기기·RN 0.86(New Architecture)·이 화면들에서 `includeFontPadding`은 결과를 바꾸지 않는다 — **더 단순한 「서체만」을 남겼다**(`TEXT_FONT`는 `fontFamily` 하나). 소유자 확정 대기.
- **남은 차이 하나 — 큰 날짜 숫자가 안드로이드에서 약 5.7dp 아래에 있다**(고치기 전에도 같았다: 18.3/25.7 vs 13.7/32.7). 숫자는 `fontSize 62 · lineHeight 62`로 줄높이가 서체의 자연 높이보다 작다 — 줄높이가 모자랄 때 두 플랫폼이 글자를 줄 상자 안에 다르게 놓는 것으로 본다(짐작 — 재지 않았다). 서체·여백으로는 닫히지 않는다.

### 굵기·깜빡임

- 굵기 다섯(SC-003): 나란히 놓은 합본(`after/font-only/side-by-side/`)에서 400(본문)·500(「N시간 M분 전에 작성」)·600(행 라벨·버튼)·700(요일·진단 값)·800(큰 날짜·「다시 쓰기」·큰 제목)이 두 플랫폼에서 같은 굵기로 보인다(눈). 안드로이드 XML 서체 묶음 + `fontWeight`가 굵기를 고른다는 것을 이 기기에서 처음 봤다.
- 깜빡임(SC-004): 콜드 스타트 녹화(안드로이드 `screenrecord` 30fps, iOS `recordVideo`)에서 큰 날짜 「15」가 처음 그려진 프레임이 마지막 프레임과 **픽셀 차이 0**(안드로이드 f141, iOS f122) — 시스템 서체로 그려진 프레임이 없다. (이 dev 기기는 로고 화면 없이 Metro 번들을 받는 빈 화면 뒤 홈이 뜬다.)

### 서체 라이선스 화면

- 두 플랫폼에서 설정 「정보」 → 「서체 라이선스」 → 전문 끝까지(`after/font-only/*/shot-08·09`) → 「‹ 설정」. 안드로이드 하드웨어 뒤로 가기는 라이선스 겹만 닫고, 한 번 더 누르면 홈(`tools/license-back-android.yml`).
- 전문은 원본의 줄바꿈(약 70자)을 그대로 두어 좁은 화면에서 짧은 줄이 끼어든다 — 원문이어야 해서 손대지 않았다.
- 글꼴 2.0배(`after/font-scale-2/`): 안드로이드 `font_scale 2.0`에서 홈·안 쓴 날·설정·개발자·라이선스에 겹침·넘침 없음. iOS는 2.0에 가장 가까운 단계 `accessibility-large`(본문 33pt/17pt ≈ 1.94배)에서 쓴 날 홈·안 쓴 날 홈·설정 위·라이선스에 겹침·넘침 없음 — 큰 제목 「서체 라이선스」는 「서체 / 라이선스」로 낱말 경계에서 두 줄이 된다. (처음에는 `accessibility-extra-large`(약 2.35배)로 찍어 큰 제목이 「라이선 / 스」로 낱말 가운데서 갈리고, 스트립 날짜 숫자가 붙고, 하단 「일기 쓰기」 바가 사진·장소 칸을 덮는 것을 봤다 — 2.0배를 넘는 단계라 SC-008 판정에서 뺐다. 그 단계의 모양은 서체와 무관하게 iOS 큰 글자에서 원래 그럴 것으로 본다 — 짐작, 소유자 확인 대상.)

### 위반 주입 (SC-006)

| 주입 | 적용 확인 | 결과 |
| --- | --- | --- |
| F1 `LogoScreen`에 `fontFamily: "Menlo"` | ○ | 실패(2) |
| F2 `WelcomeScreen`이 RN `Text` 직접 import | ○ | 실패(1) |
| F2 `AppText`에서 `TEXT_FONT` 빼기 | ○ | 실패(1) |
| F3 `LogoScreen` `"800"` → `"900"` | ○ | 실패(2) |
| F4 `Pretendard-Bold.otf` 끝에 1바이트 | ○ | 실패(1) |
| F4 `app.json`에서 굵기 500 빼기 | ○ | 실패(3) |
| F5 전문 한 글자 바꾸기 | ○ | 실패(1) |
| L1 행 testID 바꾸기 | ○ | 실패(4) |
| L5 설정 겹 `active`에서 `!fontLicenseOpen` 빼기 | ○ | 실패(1) |

매번 되돌린 뒤 바이트가 원래와 같은지 확인했고 마지막에 907개 통과.

### 층 1

- **`npm run test:layer1`은 돌지 못했다** — 앞단의 「표본 보장」이 표본 사진을 받다 `commons-indoor-13.jpg`의 sha256이 목록과 달라 멈췄다(Wikimedia 썸네일이 다시 만들어진 것으로 본다 — 070의 「다른 사진을 쓰지 않는다」 규칙이 막았다, 이 기능과 무관). 목록을 고치는 것은 소유자 확인 대상이라 손대지 않았다. 목록 전체를 다시 받아 대조하니 **210장 중 15장**이 어긋났다(모두 같은 URL에서 JPEG가 오지만 바이트가 다르다): indoor-13·18·26·28, street-06·12·29, people-12·14·18·19·26, night-01·08·22. **소유자 결정(2026-10-15): 083 밖 별도 과제로** — 로드맵에 올린다.
- 대신 층 1 기준 상태(같은 `prepareBaseline` 규칙 — 설정 기준값 + 픽스처 일기 사흘·사진 사본)를 손으로 깔고 층 1 흐름 열둘 중 표본이 필요 없는 **열하나를 한 번의 `maestro test`로 돌려 11/11 통과**(10분 53초, 새 「서체 라이선스」 단계가 든 `settings-developer-sweep` 포함). `sample-days`는 돌리지 못했다.
- 끝나고 두 기기의 일기·설정·사진 사본을 백업에서 되돌렸다.

### 코드 리뷰 반영 (2026-10-15)

- **대화상자 제목·설명이 시스템 서체로 남아 있었다** — `@rn-primitives`의 `Title`·`Description`이 `asChild` 없이 RN `Text`를 직접 그려 F2(저장소 소스의 import만 센다)가 못 봤다. 리뷰어가 고치기 전·후 안드로이드 캡처의 「날짜로 이동」 제목을 같은 자리에서 잘라 **바이트가 같다**는 것으로 찾았다. `rnr/alert-dialog.tsx`·`rnr/dialog.tsx`가 `style={[TEXT_FONT, style]}`로 감싼다. 고친 뒤 같은 자리를 다시 잘라(`after/review-dialog/android-title-before-after.png`) 1,909픽셀이 달라졌고, 제목 잉크 폭이 안드로이드 89.3 · iOS 89.3단위로 같다(고치기 전 iOS 88.7).
- 화면 테스트 `__tests__/ui/dialog-font.test.tsx`(두 대화상자의 제목·설명 `fontFamily`)를 먼저 써서 실패를 본 뒤 고쳤다. F2에 「프리미티브 Title·Description은 `TEXT_FONT`로 감싼다」·「`import X, { Text }` 꼴도 센다」·「`import * as` 금지」를, F3에 「굵기를 담는 모든 키·삼항의 값」을 더했다. 위반 주입 넷(대화상자 제목 감싸기 되돌리기·삼항 `"900"`·토큰 `titleWeight: "900"`·`import X, { Text }`)이 모두 실패로 잡혔다.

### 미확인

- iOS 실기기·TestFlight(서체가 든 release 빌드 포함)·안드로이드 release·Play에서 받은 앱.
- Android 7.x(API 24·25)에서 굵기 다섯 — 정적 파일이라 문제가 없을 것으로 보지만 기기가 없다.
- `sample-days` 흐름(표본 내려받기 실패).
- 다른 안드로이드 기기(SM-G986N 등)·다른 제조사 서체 설정.
- iOS 「굵은 텍스트」·삼성 「글꼴 스타일」 같은 시스템 설정 — 앱에 넣은 서체는 시스템 서체처럼 따르지 않을 수 있다(재지 않았다).
