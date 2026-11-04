# Quickstart: 첫 일기 분기 확인

## 기기 없이

`npm test`, `npm run lint`.

## iOS 시뮬레이터 (2GB를 받지 않고 되풀이)

1. 워크트리에서 `npm ci` → `npx expo prebuild --platform ios --clean` → `NETRC=<빈 경로>`로 `pod install` → `xcodebuild`로 Release 시뮬레이터 빌드(Metro 불필요).
2. 설치 뒤 `simctl get_app_container … data`의 `Documents/models/`에 `a1.bin`·`v1.bin`·`v2.bin`을 넣고(지문 대조) `state.json` 없이 첫 실행을 탄다. **main 기반 빌드는 이 파일을 다시 받거나 사진 모델에서 준비되지 못할 수 있다**(파일 검증은 110 코드에만 있다). 막히면 `_prepare-simulator.yml`처럼 한 번 정상으로 받는다.
3. 되풀이: 앱을 끄고 `Documents/preferences/onboarding.json`의 `welcomeShown`·`completed`를 `false`로 고치고 `character-names.json`·오늘 일기를 지운다. **「온보딩부터 다시」는 이 흐름에 닿지 않는다**(작명·확인을 다시 타지 않는다).
4. Maestro(`clearState` 없이)로 본다:
   - 오늘 사진 없음 → 확인창 없이 안 쓴 날.
   - `simctl addmedia`로 오늘 사진 → 확인창, 「나중에」 → 안 쓴 날, 일기 없음.
   - 「써 보기」 → 쓰는 중 화면·그만두기. 끝까지 쓰기는 시뮬레이터에서 못 볼 수 있다.

시뮬레이터에서 정상 동작 확인이 실패하면 분기에 닿지 못한다. 그때는 못 봤다고 적는다.

## 실기기 (기기가 빌 때 — 그 전에 완료로 닫지 않는다)

- [ ] 재료 있음: 확인창 → 써 보기 → 쓰는 중 → 쓴 날 (SM-S901N, iPhone)
- [ ] 재료 없음: 확인창 없이 안 쓴 날
- [ ] 실패 되돌림: 쓰기 실패 → 확인 중 → 확인창 재등장 → 다시 실패 → 토스트 + 안 쓴 날
- [ ] 그만두기: 토스트 없이 안 쓴 날
- [ ] 쓰는 중 앱 나가기: 안드로이드 끊김 토스트, iOS 이어 하기
- [ ] 층 2: `npm run test:layer2`, `npm run test:layer2:ios`

실패 주입: 쓰기 실패를 자연스럽게 내기 어려우면 사진 모델 파일(`v1.bin`)을 잠시 옮겨 `vision`/`module` 실패를 낸다. 정상 동작 확인은 사진 모듈을 보지 않으므로 지나간다(규칙 0-2). 앱을 앞에 둔 채 옮긴다 — 앱이 앞으로 돌아오면 필수 모듈을 다시 읽어 받기 화면으로 간다(`AppState` 재판정, 소스 읽기).

## 결과 기록

(기기 확인 때 표로 채운다.)
