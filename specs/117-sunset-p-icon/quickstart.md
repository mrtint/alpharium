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

## 기록 (2026-11-12)

| 항목 | 본 것 | 못 본 것 |
|---|---|---|
| 생성기·테스트 | `build:icons` 8개 파일, 두 번째 실행 「바뀐 것이 없다」, `--check` 0, `__tests__/design` 141개 통과, `npm test` 416 스위트 통과, `npm run lint` 오류 0(기존 경고 2) | resvg가 Linux·Windows에서 같은 픽셀을 내는지 — macOS arm64·Node 24에서만 봤다(CI는 ubuntu — 그래서 픽셀 대조는 채널당 2 이내로 했다, 이 값도 Linux에서 확인한 적 없다). 배율 3.0은 resvg가 패닉해(원인 미조사) 위반 주입은 1.5로 한다 |
| 렌더(눈으로) | `assets/icon.png`·기능 그래픽·monochrome이 노을 「P.」·P 윤곽+마침표로 나온다. 29·40·48·60·120·180px로 줄여도 P와 마침표가 읽힌다(분홍·보라 P로 읽히고 풍경 세부는 60px 아래에서 사라진다) | 안드로이드 원·스퀘어클 마스크 합성 미리보기는 만들지 않았다(안전 영역 수치 검사로 갈음) |
| 갤럭시 foreground·마스크 | `expo prebuild --platform android --clean` → debug APK 빌드 → `adb install -r`(데이터 보존) 성공. 소유자가 잠금을 푼 뒤 앱 목록 화면(SM-S901N 기본 런처, 스퀘어클 마스크)에서 「포켓로그」 아이콘을 스크린샷으로 봤다: 노을 「P.」가 크림색 배경 위에 나오고 P의 윗면·오른쪽·마침표가 마스크에 잘리지 않았다(배율 0.784 그대로, 바꾸지 않았다) | 원형 등 다른 마스크 모양·홈 화면 배치·다른 기기. 배율이 보기에 적당한지의 판단은 소유자 눈이 필요하다 |
| 갤럭시 monochrome | 못 봤다 — 설정 > 배경화면 및 스타일 > 테마 아이콘을 켜야 하는데 기기 시스템 설정이라 에이전트가 바꾸지 않았다. 소유자가 켜 보고 알려 주기 전에는 미확인이다 | 설정 > 배경화면 및 스타일 > 테마 아이콘 |
| iPhone 14 홈 화면 | `expo prebuild --platform ios --clean` → 개발 서명 Release 빌드(`BUILD SUCCEEDED`) → `devicectl device install app`으로 설치(2026-11-12). 소유자가 홈 화면에서 보고 「확인했음」이라고 알려 왔다 | 소유자가 말한 것은 확인했다는 한 마디뿐이다 — 배율(1.0)이 적당한지·작은 크기에서의 읽힘 같은 세부는 전해 듣지 못했고, 배율은 바꾸지 않았다 |
