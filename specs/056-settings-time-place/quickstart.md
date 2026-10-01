# Quickstart: 매일 쓰는 시각과 장소 이름 — 검증 안내

## 기기 없이

```bash
npm run test:logic   # TH·DC·SE
npm run test:ui      # SR·TD·PD·AS·TX
npm test && npm run lint
```

계약 목록은 [contracts/settings-time-place.md](contracts/settings-time-place.md).

## 실기기 (dev 빌드 1회, AGENTS 「도구 사용법」)

준비: Metro를 `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`로 띄우고 `adb reverse tcp:8081 tcp:8081`, 기기 잠금 해제.
모델·일기를 보존해야 하므로 `pm clear`를 하지 않는다. 새 네이티브 모듈이 없어 JS 번들 갱신만으로 된다.

| # | 무엇 | 어떻게 | 통과 |
| --- | --- | --- | --- |
| Q0 | `Intl` 실측(R1) | dev 빌드에서 `readDeviceClock(new Date())` 결과를 한 번 `console.log`로 찍고 지운다(로그 모듈을 남기지 않는다) | `format`·`timeZoneId`·`offsetMinutes` 값을 research R1에 실측으로 옮긴다 |
| Q1 | 펼침·접힘 | 설정 → 자동으로 쓰기 켬/끔, `screenrecord` 30fps(`MSYS_NO_PATHCONV=1`) | 시각 행이 끊김 없이 펼쳐지고 접힌다(SC-001), 다시 켜면 같은 값(FR-003) |
| Q2 | 시각 대화상자 | 행 → 오전/오후 바꾸기 → 칸 누르기 | 미리보기 갱신, 칸 한 번에 닫힘·행 값 갱신(SC-004) |
| Q3 | 다시 예약 | Q2 뒤 `adb shell dumpsys jobscheduler \| grep -A3 alpharium` | 잡이 새로 잡혀 있다(SC-002) |
| Q4 | 취소 세 경로 | 오전/오후만 바꾸고 「취소」·바깥·시스템 뒤로 | 값 그대로(SC-003) |
| Q5 | 장소 대화상자 | 행 → 「끔」 → 다시 → 「자동」 | 칸 한 번에 닫힘, 값 갱신 |
| Q6 | 「켬」 권한 | 위치 권한을 끈 상태에서 「켬」 | 대화상자가 닫힌 직후 OS 권한 창, 거부해도 「켬」, 위치 행 「허용 안 함」 |
| Q7 | 다시 열기 | 설정을 닫고 다시 열기, 녹화 | 「설정을 읽는 중…」 0프레임(SC-006) |
| Q8 | 토글 꺼짐 | 끈 토글을 눈으로 | 손잡이가 면과 구분된다(SC-007) |
| Q9 | 글꼴 2.0배 | 기기 글꼴 크기 최대 | 시각 행·격자 숫자가 잘리지 않는다 |
| Q10 | Maestro | `maestro test .maestro/settings-time-place.yml` | 통과 |

끝나면 바꾼 시각·장소 값을 원래대로 돌려 둔다.

## 결과

(구현 뒤 실측을 여기에 적는다.)
