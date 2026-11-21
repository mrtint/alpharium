# Quickstart: 121 확인 절차

## 기기 없이

```bash
npm test
npm run lint
```

- `__tests__/signals/place-names.golden.test.ts` — 20곳 대조(SC-001).
- `__tests__/config/no-location.test.ts` — 바깥 전송·권한 0건(NX1~NX5, SC-003).
- 위반 주입: `src/`에 `import("expo-location")` 한 줄, `PERMISSION_REQUIREMENTS`에 `location` 한 줄을 넣어 테스트가 깨지는지 보고 되돌린다.

## 데이터 다시 만들기(사람이 필요할 때만)

```bash
brew install osmium-tool
npm run places:build   # 원본을 scripts/places/.cache/에 받고 assets/places/kr-places.bin·meta.json을 쓴다
```

결과 해시가 바뀌면 대조표(PN3)를 다시 돌려 본다.

## 실기기 (dev 빌드, 네이티브 변경이라 prebuild 필요)

1. `npx expo prebuild --platform android --clean` → `adb shell dumpsys package com.a810labs.pocketlog | grep -i location` — `ACCESS_FINE/COARSE/BACKGROUND_LOCATION`이 없고 `ACCESS_MEDIA_LOCATION`은 있다.
2. `npm run sample:seed`(앞뒤 15일) — 표본 날 중 「걸어 다닌 날」·여러 군집 날을 고른다.
3. 그 날을 홈에서 쓴다. 진단 화면 프롬프트 미리보기와 본문에 장소 이름이 시각순으로 나오는지 본다(SC-002). 설정 「끔」으로 바꿔 다시 쓰기 → 이름 줄이 없다.
4. 비행기 모드에서 한 번 더(SC-005).
5. iPhone 14 개발 서명 빌드로 2~3을 반복한다(사진 시딩 `npm run ios:seed`).
6. 시뮬레이터: 첫 실행 권한 단계에 위치가 없다(SC-004), 설정 장소 이름 대화상자 두 칸·글꼴 2.0배.
7. 이름 찾기 시간(SC-007): 개발 빌드에서 진단 로그의 시작~끝 시각(임시 로그, 확인 뒤 걷는다).

## 기록

결과를 기기·날짜·본 것·못 본 것으로 여기에 남긴다(구현 후 채운다).
