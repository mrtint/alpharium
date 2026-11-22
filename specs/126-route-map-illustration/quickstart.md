# Quickstart — 126 하루 동선 지도 확인 절차

## 준비 (한 번)

1. `git branch --show-current`가 `126-route-map-illustration`인지 본다.
2. 의존성: `npx expo install react-native-svg` — 버전이 `15.15.4`(SDK 57 목록)인지 `package.json`에서 본다.
3. 지도 파일 만들기: `brew install osmium-tool`(이미 있음) → `npm run map:build`(= `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/map/build-map.mts`). 원본은 `scripts/places/.cache/south-korea-latest.osm.pbf`(없으면 `npm run places:build`가 받는다). 끝나면 `assets/map/kr-map.meta.json`의 층별 크기와 총 크기를 본다 — `MAP_MAX_BYTES`를 넘으면 빌드가 실패한다(허용 오차를 사람이 고쳐 다시 돈다).
4. 토큰: `design/tokens.json`에 지도 색 5개와 대비 쌍을 올리고 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-tokens.mts`로 생성한다.

## 기기 불필요 확인

```bash
npx jest __tests__/map __tests__/app/day-route.test.ts __tests__/app/day-map.test.ts --selectProjects logic
npx jest __tests__/ui/day-route-section.test.tsx __tests__/ui/route-map-layer.test.tsx --selectProjects ui
npm test && npm run lint
```

기대: 모두 통과. 위반 주입 — ① `src/ui`가 `src/map`을 import하게 바꾸면 헌법 검사가 잡는다 ② `MIN_FRAME_METERS`를 0으로 바꾸면 한 곳·몰린 날 테스트가 잡는다 ③ `RouteMapLayer`를 낭독에 노출하면 DU5 테스트가 잡는다 ④ `kr-map.bin`을 1바이트 바꾸면 sha 계약이 잡는다.

## 개발 빌드 실기기 확인 (R3 측정 포함)

**안드로이드(SM-S901N)** — 개발 빌드(`EXPO_PUBLIC_APP_ENV=dev`):

1. `npx expo prebuild --platform android --clean` → `cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a` → `adb install -r`(`pm clear`·삭제 금지 — 모델 2GB).
2. 표본 보관함과 쓴 날을 준비한다: `npm run sample:seed`(앞뒤 15일), 2026-11-16 도심 하루를 연다.
3. 본다: ① 도심 하루(자리 4곳) — 한강·큰 길·공원 뒤 도식 ② 한 곳뿐인 날(자리 1곳 하루를 시딩) ③ 좁은 지역에 몰린 날(70m 안 4곳 시딩) ④ 좌표가 저장되지 않은 옛 일기에서 사진을 지운 날 — 지도 없이 목록만 ⑤ 지도 파일 읽기 실패(번들 자산 교체로 흉내) — 125 도식 그대로 ⑥ 글꼴 2.0배 ⑦ **새로 쓴 일기에서 원본 사진을 지운 뒤에도 지도가 그대로 보이는지**, 사진 권한을 거부한 뒤에도 보이는지 ⑧ 좌표가 저장되지 않은 옛 일기(표본으로 쓴 지난 일기)는 사진을 지우면 목록만 남는지 ⑨ 새 일기 파일의 `places`에 `latE5`·`lonE5`가 있는지(`adb shell run-as … cat files/diary/YYYY-MM-DD.json`).
4. 잰다(R3): 지도가 보이기까지 시간, 첫 읽기 지연 중 지면이 막히는지, 메모리.
5. 네트워크 0건: `adb shell dumpsys netstats`·`logcat`으로 지도를 보는 동안 요청이 없는지, 비행기 모드에서도 같은 지도가 보이는지 본다.

**iPhone 14** — 개발 서명 빌드(AGENTS의 CLI 빌드 절차)로 같은 ①~⑥. T017(125의 iPhone 확인)도 같은 회차에서 본다.

## 못 보는 것(미리 적어 둔다)

- 시골·섬·산지의 지도 모습, 허용 오차 8m의 모서리 각짐(600m 상자), 하룻밤 소크는 이 확인으로 못 본다.
- 안드로이드 테마·작은 화면은 가상 크기로만 본다.
