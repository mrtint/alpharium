# Quickstart: 쓸 재료 (053) 검증

## 1. 기기 없는 검증

```bash
npm run test:logic -- material day-preview written-day state
npm run test:ui -- material-grid diary-home diary-list
npm test
npm run lint
```

통과 기준: 전부 초록. 위반 주입(contracts의 각 항목)으로 테스트가 실제로 잡는지 확인하고 결과를 §5에 적는다.

## 2. 실기기 준비 (dev, `pm clear` 없음 — 모델 보존)

```bash
npx expo run:android            # dev 빌드 설치 (기존 데이터 유지)
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client
adb reverse tcp:8081 tcp:8081
adb shell dumpsys trust | grep deviceLocked   # deviceLocked=0
```

Metro는 gradle 빌드가 끝난 뒤에 띄운다. 권한은 `adb shell pm revoke/grant com.anonymous.alpharium android.permission.READ_MEDIA_IMAGES`로 바꾼다
(Maestro `launchApp`은 권한을 다시 줄 수 있으니 `permissions: {all: deny}`로 제어한다 — 048 §6).

## 3. 눈으로 볼 것

| # | 무엇 | 통과 |
| --- | --- | --- |
| D1 | 사진이 있는 안 쓴 날(예: 합성 3장) | 사진 `3 장`·장소 `n 곳` 두 칸, 「쓸 수 있는 때」 칸·세로선 없음, 지면이 바닥까지 |
| D2 | 사진 0장인 안 쓴 날 | `0 장`·`0 곳` 회색 숫자(단위는 본색), 아래 「기록 대신 상상으로 하루를 채워요.」 |
| D3 | 사진 권한을 회수(`pm revoke`)하고 앱 복귀 | 두 칸 모두 빨간 「권한이 없어요 ›」, 안내 한 줄 없음 |
| D4 | 「권한이 없어요 ›」를 누르고 OS 창에서 허용 | 홈으로 돌아와 숫자로 바뀐다 |
| D5 | 「다시 묻지 않음」 상태(거부 두 번)에서 누름 | OS 창 대신 「설정에서 사진 접근을 허용해 주세요」 대화상자. 배경 누름으로 안 닫힘 |
| D6 | 「설정 열기」→ 설정에서 허용 → 앱 복귀 | 자동으로 다시 센다 |
| D7 | 재료 있는 날 「일기 쓰기」 | 확인 없이 바로 쓰는 중 |
| D8 | 재료 0인 날 「일기 쓰기」 | 「😢 아무 기록도 없어요」 확인 대화상자. 취소 → 그대로, 확인 → 쓰기 |
| D9 | 권한 없는 날 「일기 쓰기」 | 「😢 기록을 볼 수 없어요」 |
| D10 | 확인으로 쓴 일기를 읽는다 | 본문 위(캐러셀 아래)에 「지어낸 하루」 한 줄. 재료 있던 일기에는 없다 |
| D11 | 글꼴 1.3배 | 두 칸·「권한이 없어요 ›」가 잘리거나 겹치지 않는다. 하단 바가 보인다 |

## 4. Maestro

새 흐름 `.maestro/writing-material.yml`을 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록하고 `maestro test`로 직접 돌린다. 기존 흐름 중
신호 줄을 지나는 것(048 `diary-home-1d` 등)을 함께 돌려 회귀를 본다.

## 5. 위반 주입 결과 / 6. 실기기 결과

(구현 뒤에 채운다)
