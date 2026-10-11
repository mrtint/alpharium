# Quickstart: 074 검증

## 기기 없이 (항상)
```
npm run test:logic      # consent-gate, 소스 계약
npm run test:ui         # 동의 대화상자·대기 화면·AppFrame.firstrun
npm run lint            # eslint + tsc + 헌법 검사 + prettier
```
기존 `__tests__/firstrun/progress.test.ts`·`download-consent-dialog.test.tsx`(standard)·`redownload-plan.test.ts`가 수정 없이 통과해야 한다(SC-004).

## 실기기 (dev, SM-G986N) — ⚠️ 시작 전 소유자 확인 필수
- 안티그랩이 기기를 쓰는 중이라 `adb install`/`pm clear`/Maestro 실행 전에 소유자에게 묻는다.
- 이 기능은 **모델이 없는 상태가 전제**라 `pm clear`가 약 2GB 모델·일기·설정을 지운다. 이 기계에 모델 백업이 없다 — 소유자가 「Wi-Fi로 다시 받는다」로 갈음할지 정한다.
- Metro는 dev 환경으로 띄우고(`EXPO_PUBLIC_APP_ENV=dev`, `.env.development.local` 번들 확인), `adb reverse tcp:8081 tcp:8081`.

### 시험 순서
1. Wi-Fi 켠 채 첫 실행 → 동의 단계에 **모달 없이** 표준 [받을게요] (연결 종류 값 기록).
2. Wi-Fi 끄고 모바일 데이터만 → 앱 재시작 → 모바일 동의(받을 양 표시). **「나중에 받기」** → 대기 화면, `files/models/`에 새 파일 없음(`run-as`+`ls`), `onboarding.json`의 `downloadConsented`가 false.
3. Wi-Fi 켜고 「다시 확인하기」 → 표준 동의. (앱을 홈으로 보냈다 돌아오는 전경 복귀 재판정도 한 번.)
4. Wi-Fi 끄고 재시작 → 모바일 동의 → **「모바일 데이터로 받기」** → 진행 화면 시작(데이터 비용 때문에 시작만 확인하고 Wi-Fi를 켜거나 앱을 끊는다).
5. 비행기 모드(연결 없음) → 표준 동의(모달 안 뜸).

### 실측 (2026-10-11, SM-G986N, Android 13, dev, Metro 번들에 `consentGate` 포함 확인)

**기기를 `pm clear`로 지우지 않았다** — `run-as`로 `files/models`를 같은 파일시스템 안에서 `files/models.074bak`으로 옮기고 `onboarding.json`의 `downloadConsented`만 false로 바꿔 모델이 없는 첫 실행 상태를 만들었다. 끝나고 모델 폴더(a1·v1·v2·state.json, 바이트 수 동일)와 `onboarding.json`을 되돌렸다. 연결 값은 임시 프로브(`console.log`, 커밋하지 않고 `git checkout App.tsx`로 되돌림)로 `ReactNativeJS` 로그에서 읽었다.

| 상태 | `getNetworkStateAsync()` 실측 | 앱의 판정 → 보인 화면 |
| --- | --- | --- |
| Wi-Fi(AG-AP) | `{"isConnected":true,"type":"WIFI","isInternetReachable":true}` | `wifi` → 표준 동의 [받을게요] 하나뿐, 모바일 모달 없음 ✅ |
| Wi-Fi 끔(연결 없음) | `{"isConnected":false,"type":"NONE","isInternetReachable":false}` | `other` → 표준 동의 ✅ (모달 없음) |
| **모바일 데이터 (실제)** | **미확인** — 이 기기의 SIM은 `OUT_OF_SERVICE`·등록 거부·긴급 통화만(`dumpsys telephony.registry`)이라 모바일 데이터가 실제로 잡히지 않는다. `type: CELLULAR`가 실제로 오는지는 이 기기에서 못 봤다 | 미확인 |
| 핫스팟에 붙은 Wi-Fi | 미확인 | 미확인 |
| VPN | 미확인 | 미확인 |

**모바일 갈래는 연결 값을 임시로 `cellular`로 덮어서(처음 두 번 호출만) 화면·흐름을 실기기에서 본 것이다** — 판정 입력이 가짜이므로 「`expo-network`가 모바일에서 `CELLULAR`를 준다」는 이 기기에서 **미확인**이다(코드는 059가 이미 쓰는 `NetworkStateType.CELLULAR` 비교다). 덮어쓴 값으로 본 것:

- 모바일 동의가 뜬다 — 「모바일 데이터로 연결돼 있어요」·본문에 **실제 남은 용량 「약 2.0GB」**(빈 모델 폴더에서 `readEssentialRemainingBytes` 계산)·「모바일 데이터로 받기」(주)·「나중에 받기」(보조). 뒤로 가기(`input keyevent 4`)에도 대화상자가 그대로이고 앱이 닫히지 않았다 ✅
- 「나중에 받기」 → 대기 화면(「Wi-Fi에서 받는 게 좋아요」·「다시 확인하기」), `files/models`에 파일 0개, `onboarding.json`의 `downloadConsented` false 그대로 ✅
- 「다시 확인하기」 → 연결을 다시 읽어(프로브 로그 2번째 호출) 덮어쓴 값이 아직 cellular라 모바일 동의 재표시, 다시 「나중에 받기」 → 「다시 확인하기」(3번째 호출은 실제 값 wifi) → 표준 동의 ✅
- 대기 화면에서 홈 버튼 → 앱 복귀: 프로브 로그에 재판정 호출이 한 번 더 찍히고 모바일 동의 재표시(전경 복귀 재판정) ✅
- 「모바일 데이터로 받기」 → `downloadConsented: true` 저장, 진행 화면(「받는 중이에요」) 표시, `v1.bin.seg0~3`이 실제로 쓰이기 시작(약 4×58MB를 11초에) ✅ (연결은 실제로는 Wi-Fi였다. 시작을 확인하고 앱을 강제 종료한 뒤 조각을 지웠다)
- 글꼴 2.0배: 제목·본문이 줄을 바꾸고 버튼 둘이 잘리지 않는다. 버튼 글자가 버튼 높이를 거의 채워 위아래 여백이 빠듯하다(잘리진 않음) — 소유자 육안 확인 대상 ✅(잘림 없음)/⚠️(여백)

**못 본 것**: 실제 모바일 데이터에서의 `CELLULAR` 값과 그때의 두 갈래(SIM이 동작하는 기기가 필요), 핫스팟·VPN·이더넷 값, 앱을 완전히 종료했다 다시 연 직후의 대기 화면 초기화(코드·jest로는 확인, 기기에서는 「재시작 후 처음부터 읽기」를 위 절차 중 `force-stop` 뒤 재실행으로만 간접 확인), iOS.

## 알려진 한계 (문서화, FR-013)
- 받는 도중 Wi-Fi→모바일 전환은 다루지 않는다.
- 핫스팟에 붙은 Wi-Fi는 `WIFI`로 보고되어 모바일 동의가 뜨지 않는다.
