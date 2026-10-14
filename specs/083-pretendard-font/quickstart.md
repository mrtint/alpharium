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
| Pretendard가 쓰였다(SC-002) | `captures/tools/`의 글자 폭 재기 — 같은 문자열(설정 「장소 이름으로 보기」·쓴 날 본문 첫 줄·「2.0GB」) 잉크 폭을 단위(dp/pt)로 | 두 플랫폼 차이 ≤ 2%, 고치기 전(`captures/before/`)과 다름 |
| 굵기 다섯(SC-003) | 개발자·진단(700), 큰 날짜(800), 행 라벨(400), 버튼(600), 쓴 시각(500)을 눈으로 + 잉크 두께 | 다섯이 서로 다르고 두 플랫폼이 같다 |
| 깜빡임 없음(SC-004) | 콜드 스타트를 `screenrecord`(안드로이드)·`simctl io recordVideo`(iOS)로 찍어 로고→홈 프레임 | 시스템 서체 프레임 0 |
| 안드로이드 여백(FR-010) | 「서체만」 벌과 「여백 끔」 벌을 찍어 기준 행 셋의 위·아래 여백(dp) 대 iOS(pt) | 차이 합이 작은 쪽을 남기고 소유자 확정, 치수를 아래 「실측」에 |
| 라이선스 화면(SC-005·SC-008) | 설정 → 「서체 라이선스」 → 끝까지 → 뒤로. 글꼴 2.0배에서도 | 전문 끝 줄까지 보이고 설정으로 돌아온다, 겹침 0 |
| 층 1(SC-007) | `npm run test:layer1`(전용 기기 전제 — 일기를 지운다; 시작 전에 2a 백업과 같은 방법으로 `files/diary` 등을 따로 백업하고 끝나면 되돌린다) | 전부 통과 |
| 용량(FR-022) | 새 debug APK 안의 서체 항목 — `unzip -lv android/app/build/outputs/apk/debug/app-debug.apk \| grep res/font`의 압축 전·후 크기 합(기기의 옛 APK는 다른 기계·ABI라 비교하지 않는다) | 증가분 기록 |
| 흔들리는 자리 | 052 접힘 문턱·055 행 가운데·056 대화상자 행간·055 iOS 큰 제목 윗부분·060 큰 숫자·개발자 화면 | 잘림·겹침 없음 |

## 실측

(구현 뒤 채운다 — 날짜·기기·빌드·치수·고른 여백·용량·층 1 결과·미확인)
