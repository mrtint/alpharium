# Quickstart: 119 스트립 이어 스크롤 확인

## 기기 없이

```bash
npx jest __tests__/config/day-boundary.test.ts __tests__/app/state.test.ts --selectProjects logic
npx jest __tests__/ui --selectProjects ui
npm test && npm run lint
```

## iOS 시뮬레이터 (모양)

30일 표본이나 쓴 날 몇 개를 둔 시뮬레이터에서:

1. 첫 화면: 스트립 오른쪽 끝이 오늘, 7칸.
2. 스트립을 오른쪽으로 밀기: 칸이 하루씩 흐르고 칸 경계에 멈춘다. 월 경계가 끊기지 않는다. 고른 날·지면은 그대로.
3. 보이는 지난 칸을 누르면 그 날로.
4. 달력으로 두 달 전 날 → 스트립이 그 칸을 보인다.
5. 본문 밀기(114)로 화면 밖 날로 → 스트립이 따라간다.
6. 쓴 날 읽기 스크롤 접힘(052)이 흔들리지 않는다.

## iPhone 14 (손맛)

개발 서명 Release 빌드를 깔고 소유자가 민다 — 「주 단위로 탁 넘어가는 현상」이 없어졌는지(SC-004).

## 못 볼 것(예정)

안드로이드(갤럭시 밤샘 시험 중), 자정 넘김 실기기, 글꼴 2.0배 실기기.
