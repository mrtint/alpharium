# Quickstart: 하단 바 색 채우기 (115)

## 자동
```bash
npx jest __tests__/app/safe-bottom.test.ts __tests__/ui/bottom-bar-fill.test.tsx __tests__/ui/safe-area.test.tsx
npm test && npm run lint
```

## iOS 시뮬레이터 (iPhone 17e, 홈 표시줄 있음)
1. Release 시뮬레이터 빌드 설치, `.maestro/ios/_prepare-simulator.yml`로 모델 준비.
2. 표본 일기를 앱 데이터 `diary/`에 JSON으로 써 둔다(쓴 날 하나, 안 쓴 날 하나).
3. 스크린샷: 안 쓴 날 「일기 쓰기」, 쓰는 중 「그만두기」(Maestro로 쓰기 시작), 쓴 날 지면 끝(「다시 쓰기」)과 중간(바 내려감), 제약 띠(사진 권한 거부), 토스트, 설정·개발자 겹, 첫 실행 화면.
4. 판정: 화면 맨 아래 픽셀 행이 바 색(또는 바가 내려간 쓴 날은 지면 색), 겹의 마지막 항목이 홈 표시줄과 겹치지 않음.
5. 종전(main) 빌드와 같은 상태의 스크린샷을 나란히 비교한다.

## iPhone 14 (사람)
개발 서명 Release 빌드 설치 후 사람이 바 세 가지·토스트·겹을 본다. 바 끝쪽을 눌러 홈 표시줄과 겹침이 불편한지 본다. 결과를 받기 전에는 「확인했다」고 쓰지 않는다.

## 못 보는 것
안드로이드(제스처·3버튼 아이콘 색·scrim).
