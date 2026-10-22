# Quickstart: 100 측정 절차와 기록

> 실측 결과는 측정 후 이 문서의 「결과」 절에 채운다. 지금은 절차만 있다.

## 준비

1. 워크트리 `.claude/worktrees/three-measurements`에서 작업. `git branch --show-current` = `100-three-measurements`.
2. 기기 설정 시작 값 기록: `adb shell settings get global transition_animation_scale` · `animator_duration_scale` · `window_animation_scale`, `adb shell settings get system font_scale`, `adb shell svc power stayon` 상태(켜 둔다). 시작 값(2026-10-22): 모두 `1.0`.
3. Metro: `EXPO_PUBLIC_APP_ENV=dev`(`.env.development.local`로 확인)로 8082에 띄우고 `adb reverse tcp:8081 tcp:8082`. 끝나면 `adb reverse tcp:8081 tcp:8081`로 원복, Metro 종료.
4. 네이티브가 바뀌지 않았으므로 기기의 debug APK는 그대로 둔다(`pm clear`·재설치 금지).

## UX-01 제목 구간

시험 쓰기 한 번으로 logcat에 두 번째 호출 신호가 보이는지 확인(research R1) → 사진 있는 날·없는 날 각 유효 회차 2개(실패 회차는 따로 적고 보충 쓰기 최대 2회)의 구간을 기록. 중앙값은 날 종류별.

## UX-11 동작 줄이기

장면 7개를 켠 상태·끈 상태로 `adb shell screenrecord`(iOS는 `xcrun simctl io recordVideo`)로 녹화. 내려받기 화면은 074 절차(research R3). 장면: 설정 겹 열기·닫기 / 날짜 넘김 / 실패 토스트 / 스트립 튕김 / 달력 / 사진 확대 / 내려받기.

## UX-12 쓴 날

083 이후 쓴 날 레이아웃이 바뀌었는지 확인(`git log --since=2026-10-15`)하고, 그대로면 083 캡처에서 센 뒤(바뀌었으면 현재 코드로 재촬영), SE급 시뮬레이터에서 글꼴 1.0·약 2.0배로 쓴 날 첫 화면 캡처.

## 종료 점검

- 기기 설정 대조(data-model 표), `adb reverse` 원복, Metro 종료.
- `git status`로 측정 도구가 저장소에 없음을 확인.
- `npm test` · `npm run lint`.

## 결과

(측정 후 작성)
