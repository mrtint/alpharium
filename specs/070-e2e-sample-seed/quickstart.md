# Quickstart: e2e 표본 (070)

전용 테스트 기기 전제(SM-G986N 등). 이 조각은 그 기기의 `PocketlogSeed/s30-*`를 지우고 다시 심는다.

## 준비 (한 번)

1. 사진 목록 확정 → **소유자에게 보여 주고 승인** → `npm run sample:fetch` (캐시에 200장 이상, 약 4분, 해시 대조).
2. `adb devices`에 기기 하나. dev 빌드·모델 설치·온보딩 완료.

## A. 첫 과제 — 스캐너가 EXIF를 받아들이나 (FR-014)

1. `writeExif`로 시각·GPS를 쓴 사진 한 장을 `PocketlogSeed/Camera/`에 push → `scan_volume`.
2. `content query`로 `datetaken`이 NULL이 아닌지 본다. GPS 없는 변형도 한 장.
3. 앱을 열어 그 날 칸에서 사진 1장·장소 1곳(GPS 없음은 0곳)이 보이는지 본다.
4. 안 되면 research R4를 고치고 이 단계를 다시 한다.

## B. 심기와 보장

```
npm run sample:seed          # 표본을 심는다(직접 실행)
npm run test:layer1          # 앞단이 표본을 보장하고 흐름을 돌린다
```

- 이미 맞으면 「표본: 건너뜀」 한 줄, 처음이면 「표본: N장 심음(M초)」. 시간을 기록한다(SC-007).
- 되읽기: `content query --uri content://media/external/images/media --projection _data:datetaken` 에 `_data LIKE '%PocketlogSeed%s30-%'` 조건.

## C. 위반 주입 (`contracts/sample-days-flow.md` V-2~V-4)

1. 표의 기대 장소 수를 한 날 틀리게 → `sample-days` 실패 확인 → 되돌림.
2. 기기의 `s30-` 파일 일부 삭제 → `npm run test:layer1` → 다시 심고 통과.
3. 표식 `anchor`를 어제로 → 다시 심음.

치환이 실제로 적용됐는지 먼저 단언한다(AGENTS 위반 주입 규칙). 이 조각은 앱 코드를 바꾸지 않아 Metro 번들 확인은 해당 없다.

## D. 확인 목록

- [ ] 층 1 전체(기존 8 + sample-days) 통과.
- [ ] 위반 주입 셋이 실패/재심기로 뒤집힘.
- [ ] `docs/e2e/sample-table.md`와 manifest가 같다(테스트).
- [ ] `git ls-files`에 사진 0개.
- [ ] iOS 시뮬레이터: 범위 밖(미검증).

## 실측 기록 (2026-10-10, SM-G986N, Android 13, dev, Metro CI=1)

- **층 1 전체 9개(기존 8 + `sample-days`)가 표본 위에서 11분 47초에 통과**했다. 기존 8개는 수정 없이 통과(FR-026). `sample-days`는 3분 19초.
  첫 시도는 `sample-days`만 실패했다 — 달력이 고른 날의 달에서 열려 먼 날을 못 찾았다(research R10) → 프로브마다 `launchApp`으로 고쳤다.
- **심기 129장 7.5~10초, 건너뜀 3.3초**(SC-007의 5분·10초보다 훨씬 빠르다). 사진 210장 내려받기는 약 7분(요청 간 1.1초).
- **첫 과제(FR-014)**: 직접 쓴 EXIF가 좌표 있는 사진·없는 사진 모두 `datetaken`을 정확히 얻었다. 앱이 좌표를 읽는다 — GPS 있는 날들의 장소 수(3·4·5·2곳)가 표와 같았다.
- **위반 주입 셋**(모두 치환이 적용됐는지 확인하고 되돌림): ① `full-day-over-limit`의 `expectPlaces` 4→3 → `sample-days` 실패(`Assertion is false: "3", id: signal-places-number is visible`) → 되돌리면 통과.
  ② 기기의 `s30-` 파일 3장 삭제 → `sample:seed`가 「129장 심음」. ③ 표식 `anchor`를 어제로 → 「129장 심음」. 맞는 상태에서는 「건너뜀」. 010 사진 3장은 그대로.
- **미확인**: iOS 시뮬레이터(범위 밖), 다른 기기·OS에서 `scan_volume` 색인, 위치 권한 없는 기기, 장소 이름(역지오코딩) 묶기, 8장 초과·잡사진 날의 VLM 선별(이 조각은 칸 숫자만 본다).
