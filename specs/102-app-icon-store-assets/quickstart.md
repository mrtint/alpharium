# Quickstart: 검증 절차

## 1. 생성물과 테스트 (기기 불필요)

```text
node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-icons.mts          # 생성
node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-icons.mts --check  # 어긋남 확인
npx jest __tests__/design/icons.test.ts __tests__/config/ios-tablet.test.ts __tests__/store --selectProjects logic
npm test && npm run lint
```

기대: 모두 통과. 위반 주입(계약 I8·S8)은 각각 실패를 만들고 되돌린 뒤 다시 통과한다.

## 2. 런처 확인 (실기기, 원칙 V)

1. 워크트리에서 안드로이드: `npx expo prebuild --platform android --clean` → `gradlew assembleDebug` → `adb install -r`(모델·데이터 보존). iOS: `npx expo prebuild --platform ios --clean` → 087 절차(Release, 수동 서명)로 빌드 → `devicectl device install app`.
2. 갤럭시 앱 서랍(또는 홈)에서 아이콘 확인. 안드로이드 13+ 테마 아이콘 켜고 monochrome 확인.
3. iPhone 14 홈 화면에서 아이콘 확인. 필요하면 iOS 배율(`scale.ios`)을 조정해 확정한다.
4. 기기 사용 전 103 세션에 알린다(research R10). 결과를 `device-check.md`에 적는다.

## 3. iPad 호환 모드 (시뮬레이터)

`supportsTablet: false` 빌드를 iPad 시뮬레이터에 설치해 첫 화면·권한·홈·설정을 본다. 결과를 `ipad-compat.md`에 시뮬레이터 점검이라고 밝혀 적는다.

## 4. 스크린샷 (실기기)

1. 소유자가 스크린샷용 사진 목록을 눈으로 확인한다(본인 사진, 얼굴·주소·번호판·타인 사진 없음, 집·직장과 무관한 장소). 확인을 `device-check.md`에 먼저 적는다.
2. 그 사진으로 실기기(iPhone 14·갤럭시)에서 실제 일기를 쓴다. 장면 5개를 캡처한다.
3. iPhone 캡처는 `scripts/store/prepare-screenshot.mts <in> <out> --size 1284x2778`로 `store/ko/screenshots/ios-6.5/`에, 갤럭시 캡처는 `... --crop-height 2160`으로 `play-phone/`에 둔다(Play 2:1 한도·알파 제거는 두 경우 모두).
4. 두 콘솔 도움말의 현재 규격을 열어 대조하고 날짜와 결과를 적는다.
