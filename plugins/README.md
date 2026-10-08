# `plugins/` — Expo config plugin

**`android/`가 gitignore된 생성물이므로 네이티브 설정은 여기에 선언으로 남긴다.**

## 왜 직접 고치면 안 되는가

`.gitignore` 16행이 `/android`를 무시하며 `git ls-files android/`는 비어 있다.
`android/app/build.gradle`을 직접 고치면:

- 저장소에 남지 않아 다음 사람이 재현할 수 없다
- `npx expo prebuild --platform android --clean`에 **지워진다**

**004에서 같은 성질의 사고가 있었다** — `expo run:android`가 prebuild를 건너뛰어
`READ_MEDIA_IMAGES`가 빠진 APK가 설치됐다. 빌드가 성공했다는 것이 설정이 맞다는
뜻은 아니다.

## 여기에 두는 것

- **`with-release-signing.js`** — release 서명 설정. **비밀번호를 담지 않는다**;
  경로와 별칭만 알고 실제 값은 빌드 시점에 읽는다(SC-005).
- **`with-battery-exception.js`** — 알림 권한을 매니페스트에 선언한다. 이름과 달리
  배터리 예외 권한은 더 이상 넣지 않는다(065에서 Play 정책 때문에 걷었다).
- **`with-force-light-theme.js`** — One UI 8.5+의 다크 모드에서 앱을 라이트로 고정한다(031).
- **`with-no-push-entitlement.js`** — iOS entitlements에서 `expo-notifications`가 넣는 `aps-environment`(원격 푸시)를 걷는다(066).
  배포 프로파일에 푸시 기능이 없어 남아 있으면 서명이 실패한다. **plugins 맨 마지막**에 둔다.

위 셋은 안드로이드, 마지막 하나는 iOS 설정이다. 어느 플러그인을 쓰는지는 `app.json`의 `plugins`가 정한다. iOS도 `ios/`가 gitignore된 생성물이라
같은 규칙이다 — `npx expo prebuild --platform ios --clean` 뒤 `ios/Pocketlog/Pocketlog.entitlements`·`Info.plist`로 확인한다.

## 고친 뒤에 할 일

```
npx expo prebuild --platform android --clean
```

`--clean`을 건너뛰면 반영되지 않는다. 반영됐는지는 빌드 성공이 아니라
`adb shell dumpsys package <패키지>`나 `apksigner verify --print-certs`로 확인한다.
