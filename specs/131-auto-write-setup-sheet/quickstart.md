# Quickstart — 131 실기기 확인

전제: dev 빌드, 모델 받아 둔 기기. 첫 실행 다시 보기: `preferences/onboarding.json`의 `completed`·`welcomeShown`을 false, `autoWriteSetupPending` 키 삭제, `character-names.json` 삭제 후 재시작(`pm clear` 금지).

1. 안드로이드: 권한 단계에 배터리 화면이 없다.
2. 첫 일기 「써 보기」 → 쓰는 중 창 없음 → 저장 뒤 창이 뜬다.
3. 배터리 행 → 설정 목록 → 예외 허용 → 돌아오면 「허용됨」.
4. 「켜기」 → 설정 화면에서 켬·시각 확인. 앱 재시작 시 창 없음.
5. iOS: 배터리 행 없음, 조건 줄 iOS 문구.
6. 기존 설치(키 없는 onboarding.json, completed true) → 창 없음.

## 기록

**2026-11-25 · SM-S901N (dev 빌드, Metro)** — 첫 실행은 `onboarding.json`의 `completed`·`welcomeShown`을 false로 고치고 `character-names.json`을 지워 흉내 냈다.

| 항목 | 결과 |
| --- | --- |
| 6. 기존 설치(키 없음·completed true) | 창 없음 |
| 1. 권한 단계 | 배터리 화면 없이 작명으로 바로 |
| 2. 첫 일기 흐름 끝 → 창 | 떴다 — 단, 오늘 재료 0장이라 확인창 없이 흐름이 끝난 경로(재료 없음). 표본 129장을 심었는데도 오늘 사진이 0장이었고 원인은 보지 않았다 |
| 2'. 쓰는 중 미표시 | 대기 true·자동 쓰기 켬·어제 일기 지움으로 앱 열기 자동 쓰기를 일으켰다 — 약 60초 쓰는 동안 창 0회, 저장 직후 떴다 |
| 3. 배터리 왕복 | 설정 「앱 배터리 사용」이 열리고 돌아오면 창이 남는다. `dumpsys deviceidle whitelist -/+`로 예외를 빼고 넣자 꼬리표가 허용됨 → 허용 안 함 → 허용됨 |
| 4. 켜기 | 오후 9시로 바꾸고 켜기 → `{"enabled":true,"targetHour":21}`, 대기 false, 재시작 시 창 없음 |
| 나중에 | 설정 그대로, 대기만 false |

**2026-11-25 · iPhone 14 (개발 서명 Release, JS 내장)** — `devicectl device copy to`로 파일 하나씩 올려 첫 실행을 흉내 냈다(오늘 일기 있음).

| 항목 | 결과 |
| --- | --- |
| 1. 권한 단계 | 배터리 단계 없이 작명 |
| 5. 창 | 배터리 행 없음, iOS 조건 줄 |
| 4. 켜기(사람이 누름) | `{"enabled":true,"targetHour":22}`, 대기 false, 재시작 시 창 없음 |

**못 본 것**: 첫 일기 「써 보기」로 쓰는 중 → 저장 → 창 경로(두 기기 모두), iOS 「나중에」·시각 변경, 글꼴 2.0배, 작은 화면.
