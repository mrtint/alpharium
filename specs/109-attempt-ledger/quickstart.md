# Quickstart: 109 장부 검증

## 기기 불필요

```bash
npx jest __tests__/app/auto-write-attempts.test.ts __tests__/app/auto-write-attempts-wiring.test.ts __tests__/app/diagnostics-view.test.ts --selectProjects logic
npx jest __tests__/config/backup-rules-plugin.test.ts --selectProjects logic
npm test && npm run lint
```

기대: 30회 백그라운드 기록이 30줄로 남음(상한 없음), 짝 교체, 미완 집계, 앱 열기 합치기, 자정 경계, 실패 삼킴, 필드 목록 잠금, 옛 파일 문자열 없음, 백업 제외.

## 실기기 (SM-S901N dev 빌드, Metro 번들만 — 모델 보존)

1. 빌드 올리기: `adb reverse tcp:8081 tcp:8081` 확인 후 번들 새로 고침(`pm clear`·재설치 금지).
2. 앱 열기 → 개발자 메뉴 → 맨 아래 「날짜별 백그라운드」 구역이 오늘 한 줄로 보인다.
3. 강제 잡: `adb shell cmd jobscheduler run -f com.a810labs.pocketlog <잡 id>` (id는 `dumpsys jobscheduler`) → 잠시 뒤 구역의 깨움이 1 늘고 `adb shell run-as com.a810labs.pocketlog cat files/attempt-ledger/<오늘>.json`에 `background` 줄이 있다.
4. 기준선 시각을 메모리(`project-bg-attempts-passive-measure`)에 적고, 며칠 뒤 `run-as … ls files/attempt-ledger`와 각 파일을 한 번 읽는다.

## 못 보는 것

화면을 끈 채 OS가 스스로 깨우는 잡은 며칠 뒤 읽기로만 본다. 백업 제외의 실제 효과는 `bmgr` 로컬 전송으로 따로 본다(099 절차, 이번 완료 조건은 아님).
