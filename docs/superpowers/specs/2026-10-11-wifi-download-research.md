# 첫 실행 모델 내려받기 — Wi-Fi가 아닐 때: 다른 앱·플랫폼 조사

조사일: 2026-10-11. 로드맵 「첫 실행 모델 내려받기 — Wi-Fi가 아니면 알리고 고르게 하기」의 선행 조사다. 이 문서는 스펙이 아니다 — 결정은 소유자와 따로 정한다.
**확인한 것**은 출처 URL을 적었고, 확인하지 못한 것은 「미확인」이다(원칙 V). 웹 검색·페이지 요약 도구로 읽었으며 원문 전체를 직접 본 것이 아니라 요약을 거쳤다.

## 1. 플랫폼이 직접 하는 일 (확인됨)

### Android — Play Asset Delivery (PAD)
출처: https://developer.android.com/guide/playcore/asset-delivery/integrate-java (2026-10-11 확인)

- 에셋 팩이 **200MB보다 크고 사용자가 Wi-Fi가 아니면 사용자가 명시적으로 동의하기 전까지 내려받기를 시작하지 않는다.** 상태는 `WAITING_FOR_WIFI`.
- **내려받는 도중 Wi-Fi를 잃으면** 큰 팩은 **멈추고** 같은 상태가 되며 모바일 데이터로 이어 받으려면 다시 명시적 동의가 필요하다.
- 동의 UI는 시스템이 주는 `showConfirmationDialog()`다. 앱이 이를 부르지 않으면 **Wi-Fi로 돌아올 때까지 멈춰 있다가 자동으로 재개**한다.
- 결과는 `RESULT_OK`(동의) / `RESULT_CANCELED`(거절·뒤로 가기). 거절 뒤 상태·재시도 방법은 문서에 없다(미확인).
- 시사점: 플랫폼의 기본 정책은 **기본 = 기다림(Wi-Fi 대기), 데이터는 사용자가 한 번 더 승인**이고, **Wi-Fi 끊김도 같은 규칙으로 다시 묻는다.** 이 앱은 Play 에셋 팩이 아니라 자체 서버에서 받으므로 이 정책이 자동 적용되지 않는다.

### Android — 일반 지침
출처: https://developer.android.com/develop/connectivity/network-ops/reading-network-state (2026-10-11 확인)

- 「Wi-Fi가 항상 무과금(unmetered)이라고 가정하지 말라」 — 전송 종류(`hasTransport`)는 과금 여부의 **나쁜 대용물**이고, 과금 여부는 `NET_CAPABILITY_NOT_METERED`로 본다. (핫스팟에 붙은 Wi-Fi는 Wi-Fi지만 metered일 수 있다.)
- 연결이 돌아오거나 unmetered일 때 하는 백그라운드 내려받기는 WorkManager를 권한다.
- 「큰 내려받기 전에 사용자에게 물어라」는 **이 페이지에는 없다.** Android 공식의 별도 권고 문서는 찾지 못했다(미확인).
- `DownloadManager`에는 큰 파일(시스템 한도 초과)을 Wi-Fi가 될 때까지 대기시키는 상태 `PAUSED_QUEUED_FOR_WIFI`가 있다. 출처: https://developer.android.com/reference/android/app/DownloadManager (검색 요약으로만 확인).

### iOS
- App Store 앱 자체의 내려받기: iOS 13부터 셀룰러 용량 상한이 사라지고 **경고 후 사용자가 넘길 수 있게** 됐으며 설정에 「항상 허용 / 200MB 초과 시 묻기(기본) / 항상 묻기」가 있다. 대화상자는 크기를 보이고 「계속」 또는 Wi-Fi가 될 때까지 보류를 고르게 한다. 출처: https://techcrunch.com/2019/06/03/ios-13-will-let-you-bypass-the-app-store-download-cap-when-on-a-cellular-connection , https://www.idownloadblog.com/2019/10/25/about-app-store-cellular-download-limit/ (2019년 기사 — 현재 iOS의 문구·임계값은 **미확인**).
- `URLSession`: `allowsCellularAccess`, `waitsForConnectivity`, `isDiscretionary`, 저데이터 모드의 `allowsConstrainedNetworkAccess`, 핫스팟을 가리키는 `allowsExpensiveNetworkAccess`. Low Data Mode는 사용자가 와이파이·셀룰러별로 켜는 신호이고 「사용자가 직접 시작한 작업을 막지 말라」가 WWDC19 권고다. 출처: https://wwdcnotes.com/documentation/wwdc19-712-advances-in-networking-part-1/ (제3자 노트), https://developer.apple.com/documentation/foundation/nsmutableurlrequest/allowsconstrainednetworkaccess.md
- **Apple HIG에서 「큰 내려받기 전에 셀룰러 여부를 물어라」에 해당하는 문장은 찾지 못했다**(미확인). `URLSession` 문서 본문은 도구가 비어서 받아 오지 못했고, 위 `allowsCellularAccess` 등의 의미는 일반 지식이다(**미확인으로 취급**).
- iOS에는 앱이 스스로 종료하는 공식 방법이 없다(로드맵에 적힌 사실; Apple 가이드가 `exit()` 같은 호출을 권하지 않는다는 점은 이번 조사에서 원문으로 확인하지 못했다 — **미확인**).

## 2. 앱들이 하는 일

| 앱 | 확인된 것 | 출처 |
| --- | --- | --- |
| Google Maps 오프라인 지도 | 기본은 Wi-Fi로 받는다. 설정 > 오프라인 지도 > **다운로드 환경설정**에서 「Wi-Fi만」/「Wi-Fi 또는 모바일 네트워크」를 고른다. 자동 업데이트는 Wi-Fi일 때만. **Wi-Fi가 끊길 때 묻는지는 확인 못 함.** 기본값의 이름·문구는 도구가 못 읽어 옛 기사(2016)와 앱 안내로만 맞췄다(**기본값은 미확인**). | https://support.google.com/maps/answer/6291838 , https://www.androidcentral.com/google-maps-gets-wi-fi-only-mode-you-can-now-download-offline-areas-sd-card |
| Netflix 다운로드 | 공식 페이지는 「데이터를 아끼려면 Wi-Fi에서 받길 권한다」 한 문장뿐. 「Wi-Fi만」 옵션·끊김 동작은 그 페이지에 없다(별도 데이터 사용 페이지 **미확인**). | https://help.netflix.com/en/node/54816 |
| 온디바이스 AI 앱(Google AI Edge Gallery, PocketPal 등) | **모바일 데이터 경고가 있는지 확인 못 했다.** Edge Gallery는 모델을 Hugging Face에서 받는 실험 앱이라는 것만 확인. | https://decrypt.co/323534/googles-latest-app-run-ai-offline |
| 게임 추가 데이터(Play Asset Delivery를 쓰는 앱) | 위 PAD 규칙이 시스템에서 걸린다(200MB 초과 + 비 Wi-Fi → 동의 필요, Wi-Fi 끊기면 일시정지·재동의). | 위 PAD 페이지 |

종합하면 **일관된 관행은 둘이다**: (a) 큰 파일은 **기본이 Wi-Fi 대기이고** 모바일 데이터는 사용자가 명시적으로 허용하는 쪽이며, (b) 앱 설정에 「Wi-Fi만 / 모바일 데이터도」 선택을 두는 앱이 있다(Maps). 「앱 닫기」를 선택지로 둔 사례는 이번 조사에서 **찾지 못했다** — 보이는 선택지는 「모바일 데이터로 계속 / Wi-Fi가 될 때까지 기다림(보류)」이다.

## 3. 선택지 구성 (조사로 본 모양)

- **계속(데이터로 받기)** / **Wi-Fi 대기(보류)** 두 갈래가 표준이다(Play 확인 대화상자·App Store 대화상자). **취소/닫기를 별도로 두는 사례는 찾지 못했다.**
- 안내 시점: 내려받기를 **시작하기 전**(PAD·App Store 모두). 문구에는 **크기**를 보이는 쪽이 일반적이다(App Store 대화상자).
- 기본값: 앱이 네트워크 종류를 몰라도(`unknown`) 대기시키는 정책은 PAD에서 보이지 않는다 — PAD는 시스템이 알고 정한다.
- Wi-Fi 끊김: PAD는 **일시정지 + 재동의**. 그 밖의 앱은 **미확인**.

## 4. 이 저장소에서 확인한 사실 (원칙 V)

- `src/app/network-port.ts`가 `expo-network`를 import하는 **유일한 파일**이고 `wifi`/`cellular`를 가른다(059). 지금은 설정의 「모듈 다시 받기」만 쓰며 `CELLULAR`일 때만 용량 문구를 낸다.
- `expo-network` 값(문서 기준, 출처 https://docs.expo.dev/versions/v55.0.0/sdk/network/ — 2026-10-11 확인, **이 저장소의 SDK 57 문서가 아닌 v55 문서**임에 주의): `type`은 `WIFI`·`CELLULAR`·`ETHERNET`·`VPN`(Android)·`BLUETOOTH`(Android)·`OTHER`(Android)·`WIMAX`(Android)·`NONE`·`UNKNOWN`. `isConnected`는 `NONE`·`UNKNOWN`이면 false. `CELLULAR`는 「모바일 데이터 **또는 테더링 상류용 DUN**」. iOS의 `isInternetReachable`은 `isConnected`와 항상 같다. 변화 구독은 `addNetworkStateListener`.
- **`expo-network`의 `type`은 과금 여부(metered)를 말하지 않는다.** 핫스팟에 붙은 Wi-Fi는 `WIFI`로 나오지만 사용자의 모바일 데이터를 쓴다. Android 공식 지침도 같은 이유로 전송 종류로 과금 여부를 추정하지 말라고 한다(위 1절). 이 앱이 `expo-network`만 쓰면 **핫스팟 Wi-Fi는 못 잡는다** — 한계로 문서에 적고 판정 범위에서 정해야 한다.
- **실측 필요(이 문서 작성 시점에는 하지 않았다)**: SM-G986N에서 Wi-Fi / 모바일 데이터 / Wi-Fi 끄고 데이터도 끔 / 핫스팟 / VPN 각각의 `getNetworkStateAsync()` 값. 구현 중 실기기에서 재서 이 문서 또는 스펙의 quickstart에 적는다.

## 5. 헌법·기존 설계와의 충돌 확인

- 과제 본문과 착수 지시문은 「앱 닫기가 **원칙 I(앱이 사용자를 막지 않는다)**과 충돌하는가」를 묻는다. **현행 헌법 v2.0.1의 원칙 I은 「온디바이스가 제품이다」이고 「앱이 사용자를 막지 않는다」는 어느 원칙에도 없다.** 그 문장은 2.0.0 개정 전 헌법의 표현이다(AGENTS.md도 「온보딩은 건너뛸 수 있고(원칙 I)」로 옛 번호를 쓴다). 따라서 **「앱 닫기」가 걸리는 헌법 조항은 없다.** 다만 정신으로서의 「사용자를 막다른 길에 두지 않는다」는 045 설계(거부 조작 없는 동의 — 045는 받지 않으면 앱이 쓸모가 없다는 이유로 [받을게요] 하나만 둔다)와 같은 결의 문제이며, 이는 **헌법이 아니라 045의 설계 결정**이다. (AGENTS.md의 옛 원칙 번호 표기 정정은 이번 과제 밖이므로 소유자에게 알리기만 한다.)
- 헌법 원칙 III: 「최초 실행 시 기본 캐릭터 하나를 받는 것은 허용」 — 모바일 데이터 확인 단계를 두어도 이 허용과 충돌하지 않는다(받을지 말지의 시점만 바뀐다).
- 045의 `DownloadConsentDialog`는 [받을게요] 하나뿐이고 `resolveFirstRunStage()`에 `"download-consent"` 단계가 이미 있다(`__tests__/firstrun/progress.test.ts` C2·C3·FR-011이 우선순위·이미 준비된 사용자 재노출 금지·재시작 멱등을 잠근다). 모바일 데이터 확인을 새 단계로 넣으면 이 테스트들의 우선순위 표(7가지)를 직접 건드린다.

## 6. 조사에서 도출된 결정 후보

1. 판정 범위: `CELLULAR`만 / `UNKNOWN`·`NONE` 포함. (조사: PAD는 비 Wi-Fi 전체에서 막는다. `expo-network`는 핫스팟을 못 가른다.)
2. 동의 대화상자와 합칠지: 합치면 `progress.ts`의 단계가 늘지 않는다. (조사: 표준 선택지는 「데이터로 계속 / Wi-Fi 대기」이고 「앱 닫기」 사례는 못 찾았다.)
3. Wi-Fi 끊김: PAD는 일시정지+재동의를 기본으로 한다.
4. 설정의 「Wi-Fi에서만」 옵션: Maps에 있다. 이 앱은 첫 실행 한 번이라 필요성이 낮을 수 있다(결정 필요).
