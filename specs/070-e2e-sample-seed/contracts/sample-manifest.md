# Contract: 표본 표와 사진 목록

대상: `scripts/e2e-sample/manifest.ts`, `photos.json`, `docs/e2e/sample-table.md`. 검사: `__tests__/e2e-sample/manifest.test.ts`·`catalog.test.ts`·`doc-match.test.ts`.

## 표 (manifest)

- **M-1** 날은 정확히 30개, 오프셋 1~30이 각각 한 번.
- **M-2** 슬롯 합계가 100 이상 140 이하(약 120)이고 150을 넘지 않는다.
- **M-3** 상황 열두 가지(`data-model.md`)가 모두 한 번 이상 쓰인다. 0장 날 ≥ 3, 1장 날 ≥ 2, 8장 초과(≥ 9장) 날 ≥ 1, 낮에만·밤에만·하루 종일 각 ≥ 1, GPS 없는 날(사진은 있고 좌표 슬롯 0) ≥ 2, 스크린샷/다운로드 슬롯이 섞인 날 ≥ 1.
- **M-4** 슬롯 시각은 그날 00:00~23:59 안이고 시각순이다(자정 넘김 없음, FR-005).
- **M-5** `expect.photos` = 슬롯 수. `expect.places` = 좌표 있는 슬롯의 `place`를 시각순으로 놓고 연속 중복을 뺀 길이(좌표 있는 슬롯이 없으면 0). **이 값은 표에 사람이 적고** 코드는 일치만 센다. 앱 동작(100m 규칙)을 재구현하지 않는다.
- **M-6** 군집 중심 사이 거리 ≥ 1000m, 방문 안 흔들림 ≤ 40m, 「걸어 다닌 날」의 슬롯 간 간격은 > 100m(그날의 `expect.places`가 좌표 있는 슬롯 수와 같다).
- **M-7** 군집 좌표는 상수 객체로 한 곳에만 있다(코드가 다른 곳에서 좌표를 만들지 않는다 — 소스 검사).
- **M-8** 대표 날(`probe`)은 정확히 8, 상황 일곱 이상, 각 `P_BACK`은 대표 날의 달과 오늘의 달 차(0~2 — 3/1에는 30일 전이 두 달 전이 될 수 있다)로 `probeEnv`가 `now` 기준으로 계산하고 매니페스트에는 적지 않는다, 오프셋 ≥ 3, 0장 날·1장 날·9장 이상 날·GPS 없는 날·잡사진 섞인 날·밤만 날을 포함한다.

## 사진 목록 (photos.json)

- **C-1** 모든 항목: `file`·`url`·`sha256`(64 hex)·`license`·`sourcePage`·`checkedOn`·`tags`·`widthPx`가 있다.
- **C-2** `license`는 `CC0` 또는 `PD`뿐(허용 목록 상수 한 곳).
- **C-3** `url`은 `https://upload.wikimedia.org/`로 시작하고 `sourcePage`는 `https://commons.wikimedia.org/`로 시작한다.
- **C-4** 태그 일곱(`indoor`·`food`·`document`·`street`·`people`·`landscape`·`night`)을 각각 최소 20장이 가진다. 스크린샷·다운로드 폴더 슬롯은 같은 사진 파일을 그 폴더에 두는 것으로 다룬다(023은 폴더 이름만 본다) — 별도 `screenshot` 태그 사진을 목록에 두지 않는다.
- **C-5** 목록의 서로 다른 파일은 200 이상 260 이하(소유자 결정: 슬롯이 거의 겹치지 않게 풀을 넉넉히 둔다).
- **C-6** 저장소에 이 경로 아래 `*.jpg`가 추적되지 않는다(`git ls-files scripts/e2e-sample`에 jpg 없음, `.cache/`는 gitignore).

## 문서 (docs/e2e/sample-table.md)

- **D-1** 문서의 날 표가 manifest와 같다: 오프셋·상황 이름·사진 수·방문 순서·기대 장소 수·대표 날 표시. 테스트가 문서를 파싱해 manifest와 대조한다(한쪽을 고치면 실패).
- **D-2** 문서에 사진 출처 표(파일·라이선스·출처 페이지·확인 일자)와 군집 표(이름·좌표·흔들림)가 있고 목록·manifest와 같다.
- **D-3** 문서에 「iOS 시뮬레이터는 범위 밖(미검증)」 한 줄이 있다.
