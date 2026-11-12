# Quickstart: 117 검증

## 자동
```bash
npm run build:icons          # 생성물을 쓴다
npm run build:icons -- --check   # 0이어야 한다
npx jest __tests__/design --selectProjects logic
npm test && npm run lint
```
기대: 쓴 파일이 8개(처음), 두 번째 실행은 「바뀐 것이 없다」, `--check` 종료 코드 0.

## 눈으로 (렌더)
- `design/icon.svg`·`assets/icon.png`(1024), `store/ko/feature-graphic-1024x500.png`을 열어 노을 「P.」인지 본다.
- 29·40·48·60px로 줄여 P와 마침표가 읽히는지 기록한다(단순화 판은 없다).

## 갤럭시 SM-S901N (사용해도 된다)
```bash
npx expo prebuild --platform android --clean
```
뒤 debug APK를 새로 깔고(모델 ~2GB가 지워지는 `pm clear`·재설치 주의 — 아이콘만 보려면 설치만) 런처에서 foreground·원/스퀘어클 마스크 잘림, 설정 > 배경화면 및 스타일 > 테마 아이콘으로 monochrome을 본다. 본 것·못 본 것을 아래 표에 적는다.

## iPhone 14 (소유자가 본다)
개발 서명 Release 빌드를 깔아 두고 홈 화면을 소유자가 본다. **소유자가 본 결과를 받기 전에는 확인했다고 쓰지 않는다.**

## 기록(구현 뒤 채운다)
| 항목 | 본 것 | 못 본 것 |
|---|---|---|
| 생성기·테스트 | | |
| 갤럭시 foreground·마스크 | | |
| 갤럭시 monochrome | | |
| iPhone 14 홈 화면 | | |
| 작은 크기 렌더 | | |
