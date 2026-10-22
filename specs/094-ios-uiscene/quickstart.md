# Quickstart: 검증

1. `npx expo install --check` → 통과.
2. `npm test && npm run lint && npx tsc --noEmit`.
3. prebuild 점검: `npx expo prebuild --platform ios --clean` 뒤 `ios/Pocketlog/Info.plist`에 `UIApplicationSceneManifest`, `AppDelegate.swift`에 `ExpoReactNativeFactoryProvider`, `BGTaskSchedulerPermittedIdentifiers`에 090~092 식별자.
4. 실기기(iPhone 14, UDID 00008110-00010D890C81401E): Xcode 27 Release, `EXPO_PUBLIC_APP_ENV=dev`, 수동 서명(`CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=PGNGG84B39 PROVISIONING_PROFILE_SPECIFIER="Pocketlog Development" CODE_SIGN_IDENTITY="Apple Development: Hyunmin Lee (8G2BJ83L43)"`) → `devicectl device install app` / `process launch --console`.
   - 첫 실행: 크래시 없이 홈. 스크린샷 `devicectl device capture screenshot`.
   - 앞·뒤: `devicectl … launch com.apple.Preferences` 후 다시 앱.
   - 이어 하기: 사람이 「쓰기」 누르고 앱 나감 → `[continued-write]` submitted·report·close, 완성 알림.
   - 알림 누름(085): 사람이 알림을 누른다.
5. CI: PR의 iOS 빌드(Xcode 26.6) 통과.

## 결과 기록 — 실기기 잔여 확인 (2026-10-22, iPhone 14 · iOS 27.0.1)

빌드: Xcode 27 Release, `EXPO_PUBLIC_APP_ENV=dev`, 수동 서명, origin/main `6ab9548`(expo 57.0.30). `npx expo install --check`는 이 시점에 `expo` 57.0.31·`expo-location` 57.0.22·`expo-network` 57.0.3 패치가 새로 나와 통과하지 못했다(이 확인은 57.0.30 조합으로 했다). `npm test`(7171)·`lint`·`tsc`는 통과.

| 확인 | 조건 | 결과 | 근거 |
| --- | --- | --- | --- |
| 첫 실행·앞/뒤 전환 | 덮어 설치 → 모델 받기 → 첫 일기 | 통과 | 크래시 없이 홈, 오늘 첫 일기 저장, `Preferences`로 뒤로 보냈다 돌아옴 |
| 알림 누름 — 웜 | 앱 백그라운드(프로세스 살아 있음), 09:00 쓸 차례 알림 | 통과 | 누른 직후(09:18:06) `app-open → write`, 홈 「쓰는 중」·이어 하기 배너 |
| 알림 누름 — 콜드 | 앱 프로세스 종료 후, 10:00 쓸 차례 알림 | 통과 | 새 pid로 앱이 열리고(10:03:26) `app-open → write`, 홈 「쓰는 중」, 21일 저장(10:04) |
| 이어 하기 — 충전 중 | USB 연결, 사진 5장, 앱을 `Preferences`로 뒤로 | 통과 | `submitted` 08:10:54 → `report` 210회 → `close success=true attached=true` 08:27:48(약 17분), 일기 저장, 완성 알림 도착 |
| 이어 하기 — 충전 없음 | USB 분리, 사진 5장(19일), 앱을 나감 | 통과(사람 관찰) | 약 18분 뒤 저장(10:43), 완성 알림 도착. `--console`이 끊겨 로그는 없다 — 시각·알림은 사람이 적었다. 표본 1 |

관찰:
- **알림이 쓰는 날**: 알림을 누르면 쓰는 날은 누른 날이 아니라 목표 시각 +3시간 창 안의 가장 오래된 안 쓴 날이다(사흘 모두 대상 — 설계대로). 이번엔 일기를 모두 지워 사흘이 다 안 쓴 날이라 20일·21일이 먼저 쓰였다.
- **막대**: 사진 단계에서 50k → 323k, 글 단계 초반 510k → 934k까지 오르고 이후 949k에서 사실상 선다(보고마다 1칸 이상 오르므로 stall 판정은 피했다; 08:23 949,379 → 08:26 949,944 → 08:27:46 949,977). 충전 없는 회차에서도 사람이 본 흐름은 같다(약 75%까지 빠르다가 더디다). 092 「남은 위험」의 겉모습 문제 그대로.
- **배너 글자**: iOS가 그리는 이어 하기 배너의 글자가 흰색일 때가 있어 밝은 배경 위에서는 안 보인다(10:03·10:04 캡처, 사람이 확인). 어두운 배경에서는 보인다. 앱은 제목·부제 문자열만 넘기고 색을 정하는 API가 없다 — 코드는 바꾸지 않았다.
- **시각 변경 직후**: 자동 쓰기를 켜거나 시각을 바꾸면 앱 열기 쓰기가 바로 한 번 돈다(`app-open → write`). 알림 확인 전 준비 상태가 쓰기로 소진될 수 있다.
- **10:00 백그라운드 재기동**: 앱을 종료해 둔 채 목표 시각이 되자 iOS가 앱을 백그라운드로 다시 띄웠다(새 pid). 콜드 확인은 그 프로세스를 다시 종료한 뒤 눌렀다.
- **원인 미확인**: 10:53 `app-open → all-written`이 남았는데 `diary/`에 22일이 없었다(10:09에 시딩이 앱을 다시 띄워 앱 열기 쓰기가 한 번 돈 것과 관련 가능). 이번 통과 조건과 무관해 파고들지 않았다.
- **안드로이드**: 같은 알림 누름 기준선은 이번 확인 범위 밖(UIScene은 iOS 전용, 085에서 실기기 확인됨).
