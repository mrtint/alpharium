# Quickstart (기기 없이)

```sh
npx jest __tests__/schedule/reminders.test.ts __tests__/schedule/reminder-deps.test.ts __tests__/schedule/reminder-rearm-assembly.test.ts --selectProjects logic
npm run test:logic && npm run test:ui && npm run lint
```

위반 주입: `reminders.ts`의 `rearm` 분기를 지우면 RA1 테스트가, `done()` 호출을 실패와 무관하게 만들면 RA3 테스트가 실패해야 한다.

## 실기기 확인 목록 (이번 세션에서 하지 않음 — 실기기 미확인)
1. 자동 쓰기 켠 채 강제 중지 → 앱 열기 → `dumpsys alarm`에 `diary-reminder` 알람 재등록.
2. 강제 중지 뒤 열지 않고 목표 시각 경과 → 알림이 안 뜬다(한계).
3. 재부팅 뒤 expo 부팅 복구와 겹쳐도 알람이 중복되지 않는가(같은 id).
4. 새 프로세스 백그라운드 실행마다 재걸기의 영향.
5. iOS에서 무해한가.
