# Quickstart: 날 밀기 확인

## 기기 없이

```bash
npx jest __tests__/app/state.test.ts __tests__/ui --selectProjects logic ui
npm test && npm run lint
```

## iOS 시뮬레이터

쓴 날과 안 쓴 날이 섞인 표본(30일 표본, AGENTS 「도구 사용법」)을 둔 시뮬레이터에서 앱을 열고 시뮬레이터 제어 도구의 `swipe`로 확인한다.

1. 쓴 날 본문에서 오른쪽으로 → 전날, 왼쪽으로 → 다음 날. 주 경계에서 스트립이 따라간다.
2. 오늘에서 왼쪽으로 → 그대로.
3. 캐러셀 위에서 가로로 → 사진만 넘어간다.
4. 본문을 세로로 → 스크롤만.
5. 안 쓴 날의 재료 지면에서 같은 확인.

## iPhone 14

개발 서명 Release 빌드를 설치하고 사람이 한 번 민다(손에 맞는 정도와 세로 스크롤 경합).
