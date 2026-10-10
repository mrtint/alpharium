# Contract: `sample-days` 흐름과 실행기 연결

## 입력

- **FL-1** 흐름은 env `P0..P7`의 `_DATE`·`_BACK`(0~2)·`_PHOTOS`·`_PLACES`를 받는다. 값은 층 1 실행기가 manifest의 대표 날에서 만들어 `maestro test -e KEY=VALUE`로 넘긴다. 흐름 안에 날짜·기대 수를 쓰지 않는다.
- **FL-2** 값이 없으면 흐름이 실패한다(기본값 없음) — 실행기 밖에서 조용히 통과하지 않는다. 첫 단계가 `P0_DATE`의 존재를 단언한다.
- **FL-3** `-e`로 넘기는 값에는 공백·따옴표가 없다(날짜·숫자만).

## 흐름

- **FL-4** `.maestro/sample-days.yml`은 `_sample-probe.yml`을 P0..P7에 대해 8번 `runFlow`한다. 각 호출은 `env`로 `DATE`·`BACK`·`PHOTOS`·`PLACES`를 보조 흐름에 넘긴다.
- **FL-5** `_sample-probe.yml`: 앱을 다시 연다(`launchApp` — 달력은 고른 날의 달에서 열리고 앱을 열면 오늘이 골라지므로 `BACK`이 오늘의 달 기준으로 맞는다) → 홈 대기 → `home-date-button` → `calendar-dialog` → (`BACK` ≥ 1이면 `calendar-prev`, `BACK` ≥ 2면 한 번 더 — `runFlow when`) → `calendar-day-${DATE}` 탭 → 달력 닫힘 → 단언:
  - `signal-photos-number`의 텍스트 = `${PHOTOS}`
  - `signal-places-number`의 텍스트 = `${PLACES}`
  - 안 쓴 날이므로 `signal-row`가 보인다.
- **FL-6** 일기 본문·문장·길이를 단언하지 않는다(원칙 IV). 사진/장소 칸의 숫자 텍스트와 존재만 본다.
- **FL-7** 대표 날은 오프셋 ≥ 3이다(1·2는 층 1 픽스처의 쓴 날).
- **FL-8** 흐름은 설정·상태를 바꾸지 않는다.

## 등록

- **FL-9** `sample-days.yml`은 `FLOWS`·`LAYER1_FLOWS`·`NEEDS_LAYER1_BASELINE`에 등록한다. `_sample-probe.yml`은 보조 흐름이라 등록하지 않되 대응표 인벤토리에 「(보조)」로 올린다(`.maestro/ios/_dismiss-open-prompt.yml`과 같은 처리).
- **FL-10** 대응표의 기능 행(쓸 재료·날 고르기·날짜로 이동)과 인벤토리를 갱신한다. `flow-map.test.ts`가 통과해야 한다.

## 계약 테스트 (`sample-flow-contract.test.ts`)

- **T-1** 흐름이 `P0`~`P7` 정확히 여덟 묶음을 참조하고 manifest의 대표 날 수와 같다.
- **T-2** 흐름 파일(주석 제외)에 `\d{4}-\d{2}-\d{2}` 날짜 리터럴이 없고, 기대 수 리터럴을 쓰는 `text:`가 없다(값은 env로만 온다).
- **T-3** `probeEnv(manifest, now)`가 만든 키가 흐름이 참조하는 키와 같다.
- **T-4** 러너 소스가 `-e` 값에 공백·따옴표를 넣지 않는다.

## 검증 (실기기)

- **V-1** 표본이 심긴 기기에서 `npm run test:layer1`이 통과한다(기존 8 + sample-days).
- **V-2** 위반 주입 ①: manifest 한 날의 `expect.places`를 틀리게 → `sample-days` 실패 → 되돌리면 통과.
- **V-3** 위반 주입 ②: 표본 `s30-` 파일 일부를 지움 → 층 1이 다시 심음 → 통과.
- **V-4** 위반 주입 ③: 표식의 `anchor`를 어제로 고침 → 다시 심음.
