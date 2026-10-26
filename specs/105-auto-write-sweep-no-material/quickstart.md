# Quickstart: 105 검증

## 기기 불필요
- `npx jest __tests__/schedule __tests__/app --selectProjects logic` → 재현(오늘 재료 없음·어제 있음 → 어제)·경계·조립 통과
- `npm test` · `npm run lint`
- 위반 주입: `resolveAutoWrite` 루프를 첫 후보에서 멈추게 되돌리면 재현 테스트가 실패해야 한다 → 되돌림

## 실기기 (SM-S901N, dev 빌드, `adb reverse tcp:8081 tcp:8081`)
1. `sample:seed`로 어제에 표본 사진을 심고 오늘에는 사진이 없게 한다. 자동 쓰기 켬, 목표 시각 창 안으로.
2. 앱을 열어 앞으로 돌린다 → 홈이 어제를 「쓰는 중」으로 합류하는지, 저장되는지.
3. 개발자·진단의 「최근 자동 쓰기 시도」에 「앱 열기 · 홈에 넘김 · 어제 날짜」가 남는지(`auto-write-attempts.json`도 `run-as`로 확인).
4. 가능하면 `cmd jobscheduler run -f`로 백그라운드 경로.
5. 못 본 것은 못 봤다고 적는다.
