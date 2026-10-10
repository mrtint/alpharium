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

### 실측 표 (채워 넣는다 — 지금은 모두 미확인)
| 상태 | `getNetworkStateAsync()` `type` / `isConnected` | 보인 화면 |
| --- | --- | --- |
| Wi-Fi | 미확인 | 미확인 |
| 모바일 데이터만 | 미확인 | 미확인 |
| 둘 다 끔(비행기 모드) | 미확인 | 미확인 |
| 핫스팟에 붙은 Wi-Fi | 미확인 | 미확인 |
| VPN | 미확인 | 미확인 |

못 본 갈래는 「미확인」으로 남긴다(원칙 V).

## 알려진 한계 (문서화, FR-013)
- 받는 도중 Wi-Fi→모바일 전환은 다루지 않는다.
- 핫스팟에 붙은 Wi-Fi는 `WIFI`로 보고되어 모바일 동의가 뜨지 않는다.
