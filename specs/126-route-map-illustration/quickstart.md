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

## 기록

### 안드로이드 SM-S901N · 개발 빌드 · 2026-11-22

본 것:

- **옛 일기(좌표 미저장) 11-16**: 사진 좌표를 다시 읽어 도심 하루(서울함공원·강남역·서울숲, 번호 4)를 한강·큰 길 위에 그렸다. 이름표 4개가 겹치지 않고 「1·4」로 합쳐진 점도 정상.
- **사진이 이미 없는 옛 일기(11-20, 「이 사진은 이제 없어요」)**: 동선 구역 없이 본문만 보인다(요구한 대로 목록만도 없음).
- **새로 쓴 일기(11-16 「다시 쓰기」)**: 저장 파일 `places[]`에 `latE5`·`lonE5` 4쌍이 들어갔고(서울 안 값) 지도는 옛 일기와 같다.
- **사진 권한 회수**(`READ_MEDIA_IMAGES`·`ACCESS_MEDIA_LOCATION`·`READ_MEDIA_VISUAL_USER_SELECTED` 끔, 앱 재시작): 새 일기의 지도가 그대로 보인다. 갤러리 사진을 지우지는 않았다.
- **글꼴 2.0배**: 제목·범례 글자가 커지고 배치는 깨지지 않는다. 지도 안 이름표는 고정 크기(12)라 상대적으로 작다.

- **한 곳뿐인 날(11-22, 경복궁 사진 4장)**: 새로 쓴 일기에 좌표 1쌍(37.5796, 126.9770)이 저장됐고, 600m 폭 지도에 점 1개·이름표 1개·범례 한 줄(설명 줄 없음)이 나온다. 경회루 연못으로 보이는 물 면(안에 섬 모양 구멍)과 주변 길이 그려졌고 모서리가 각져 보인다(허용 오차 영향 — 예상한 모습).
- **몰린 날(11-21, 광화문 70m 안 사진 6장)**: 사진 6장이 한 자리로 합쳐져 좌표 1쌍이 저장됐고, 한 곳뿐인 날과 같은 모양(점 1개·이름표 월대)으로 큰 길·궤도(점선)·공원(귀퉁이 초록)이 보인다. 한 자리 안에 여러 점이 몰린 그림은 만들어지지 않는다 — 자리 단위에서 이미 합쳐진다.

시딩 메모: `seed:day`의 검은 단색 템플릿 사진은 사진 읽기(VLM)에서 실패해 쓰기가 곧바로 「일기를 쓰지 못했어요」로 끝났다(AGENTS의 기존 함정). 기기에 있던 실사 표본(`s30-05-0N.jpg`)을 `scripts/samples/with-gps/`(gitignore)에 임시로 두고 다시 심어 풀었다 — 시험 뒤 그 파일들은 지웠다. 11-21·11-22의 심은 사진·일기는 기기에 남아 있다.

못 본 것: 지도 읽기 실패 흉내, 읽기 시간·화면 막힘·메모리(R3), 네트워크 0건·비행기 모드, 시골·섬·산지.

시험 뒤 되돌림: 권한 3개 다시 허용, 글꼴 배율 1.0. 11-16 일기는 새로 쓴 것으로 바뀌었다(시험 기기, 사후 보고).

### 해외 날 (코드 읽기 — 기기에서 못 봄)

좌표는 저장되나 지도 파일이 한국 범위뿐이라 지도 없이 도식·목록만 나오고, 장소 이름도 없어 이름 칸이 빈다. 한국과 외국이 섞인 날은 상자 폭이 60km를 넘어 지도가 없다.
