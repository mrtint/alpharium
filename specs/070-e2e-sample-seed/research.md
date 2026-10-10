# Research: e2e 표본 (070)

Phase 0 — 미지수 해소와 결정. 「실측」은 2026-10-10 SM-G986N(Android 13) 기준이다.

## R1. 색인 방식 — `scan_volume` 한 번

- **Decision**: 사진을 폴더째 `adb push`한 뒤 `content call --uri content://media/external --method scan_volume --arg external_primary`를 **한 번** 부른다. 되읽기로 파일 수와 `datetaken`을 확인한다.
- **실측**: 20장(2MB) — `scan_file` 장마다 25.8초(장당 1.3초), `scan_volume` 1.5초. 둘 다 20장의 `datetaken`이 정상으로 색인됐다. 푸시는 20장에 7초(원본 크기, 960px로 줄이면 더 짧다).
- **Rationale**: 010 연구(`scan_file`만 동작)와 다르지만 이 기기에서 `scan_volume`이 동작함을 직접 확인했다. 120장을 `scan_file`로 하면 약 160초, `scan_volume`이면 수 초.
- **Alternatives**: 장마다 `scan_file`(느림), 브로드캐스트(받는 이 없음 — 010), `content update`(조용히 무효 — 010).
- **위험**: `scan_volume`은 볼륨 전체를 훑는다(전용 기기 전제). 다른 기기·OS 버전에서 같을지는 미확인 — 되읽기 검증(FR-015)이 실패를 드러낸다.

## R2. 「장소 N곳」의 뜻 — 순차 방문 수

- **Decision**: 표의 기대 장소 수는 「그날 사진을 시각순으로 놓은 군집 방문 순서에서 연속 중복을 뺀 개수」다. 같은 방문 안의 흔들림은 ≤ 40m로 두어 100m(`SAME_PLACE_METERS`) 규칙에서 한 자리로 세어지게 하고, 군집 사이는 ≥ 1km로 둔다. 「걸어 다닌 날」은 사진 간격을 약 150m로 두어 한 군집에서도 여러 자리로 세어지는 것을 의도적으로 한 날 넣는다.
- **근거**: `src/signals/places.ts` `tracePlaces` — 시각순으로 훑으며 직전 자리와 100m 초과면 새 자리.
- **계약 테스트**: 표의 적힌 기대 수가 방문 순서(각 사진의 좌표에서 `SAME_PLACE_METERS`로 직접 묶어 본 결과가 아니라, 표가 적은 군집 이름의 연속 중복 제거)와 같음을 확인한다. 거리 규칙까지 재현하는 두 번째 구현을 만들지 않는다(IV) — 단, 방문 간 최소 거리·방문 내 최대 흔들림이 상수 조건을 지키는지는 별도 불변식으로 센다.

## R3. 앱이 화면에 보이는 값

- **사진 칸**: `DayPreview.photos`의 `known.count`는 `signals.photos.value.photos.length` — 수집은 상한이 없다(012). 잡사진(Screenshots·Download)도 센다(선별은 VLM에 넘길 8장 고를 때만, 023). 그러므로 12장 날은 「12」, 잡사진 섞인 날은 폴더 무관하게 총 장수.
- **장소 칸**: 사진이 있고 GPS가 하나도 없으면 `none` → 회색 「0 곳」. 사진이 0장이면 사진·장소 모두 회색 0(053 승격). 권한이 없으면 두 칸 「권한이 없어요 ›」(이 조각 밖).
- **testID**: `signal-photos-number`·`signal-places-number`(텍스트는 숫자 문자열), `signal-photos`·`signal-places`(칸).
- **미확인(첫 과제·구현 중 확인)**: 8장 초과 날과 잡사진 섞인 날의 실제 표시값이 위와 같은가. 다르면 표가 아니라 **관측을 기록하고 원인을 가린다**(앱 결함인지 기대 오류인지).

## R4. EXIF 작성 — 직접 쓰는 최소 APP1

- **Decision**: 받은 JPEG의 APP0/APP1 등 메타 세그먼트 중 EXIF(APP1 `Exif\0\0`)를 걷고, SOI 직후에 새 APP1(리틀엔디언 TIFF)을 넣는다: IFD0(`DateTime` 0x0132, ExifIFD 포인터, GPS IFD 포인터), ExifIFD(`DateTimeOriginal` 0x9003, `DateTimeDigitized` 0x9004), GPS IFD(`GPSLatitudeRef/Latitude/LongitudeRef/Longitude`, `GPSDateStamp`). 좌표 없는 사진은 GPS IFD를 넣지 않는다.
- **근거**: 010 실측 — `DateTime`·`DateTimeOriginal`·`DateTimeDigitized`·`GPSDateStamp`를 **다 일치**시켜야 스캐너가 `datetaken`을 정확히 넣는다(`seed/exif.ts` 주석). 새로 쓰므로 길이 유지 제약이 없고 오프셋을 우리가 계산한다. 읽기는 기존 `readDate`·`readLocation`(`scripts/seed/exif.ts`)을 재사용해 왕복을 확인한다.
- **Alternatives**: `piexifjs`/`exifr` 같은 의존성(새 의존성 금지 — 스펙 FR-012), 010 템플릿 패치(원래 EXIF가 남음·사진 다양성 없음).
- **첫 과제(FR-014)**: 한 장을 푸시해 ① `datetaken`이 색인에 들어가는지 ② 앱이 좌표를 읽는지(`getLocation`) 본다. GPS 없는 사진의 `datetaken`은 `no-gps/` 샘플에서 NULL이었으므로 반드시 따로 본다.

## R5. 사진 출처 — Wikimedia Commons

- **Decision**: CC0 또는 퍼블릭 도메인 표시가 명확한 파일, `upload.wikimedia.org`의 표준 폭 축소본(960px 안팎, 구현 때 실제 가능한 표준 폭을 확인). 목록에는 파일명·직접 URL·sha256·라이선스·출처 페이지 URL·확인 일자·태그.
- **내려받기 예절**: 순차, 요청 간 1초 이상, `User-Agent`에 프로젝트·연락처 식별(Wikimedia 정책), 429에 백오프 후 실패 시 이유와 함께 중단.
- **태그 → 사용처**: 실내(집)·음식(집/카페)·문서(직장)·거리(직장 근처)·사람(주말, 얼굴이 식별되지 않는 퍼블릭 도메인 사진만)·풍경(주말)·밤(밤 상황). 사진 내용과 군집이 어긋나지 않게 상황별 허용 태그를 manifest가 정한다.
- **승인 게이트**: 목록(파일명·라이선스·URL) 확정 후, **내려받기 전에** 소유자에게 보여 주고 승인을 받는다(FR-010).
- **위험**: 라이선스 표시는 바뀔 수 있다 — 확인 일자와 출처 페이지 URL을 남긴다. sha256이 어긋나면 실패(조용히 다른 사진을 쓰지 않는다).

## R6. 기록(표식)의 위치 — 기기의 텍스트 파일

- **Decision**(Clarify Q1 A): `PocketlogSeed/s30-marker.txt` 한 파일(`anchor=YYYY-MM-DD`, `fingerprint=<hex>`, `photos=<n>`). 개발 기계에는 기록을 두지 않는다.
- **010과의 차이**: 010은 앱이 심은 것을 알 길이 생길까 봐 개발 기계에 ledger를 두었다. 이 표식은 앱 데이터 밖(공유 저장소 `Pictures/`)의 `.txt`이고 앱은 이미지 라이브러리만 읽으므로 앱이 볼 길이 열리지 않는다. 앱 코드는 무변경(FR-022).
- **판정**: 표식이 있고, 기준일 = 오늘, 지문 = 지금 표의 지문, **그리고 기기의 `s30-` 사진을 되읽은 결과가 표와 같음**(수·`datetaken`)일 때만 건너뜀. 표식만 믿지 않는다.
- **자정 근처**: 기준일은 개발 기계의 로컬 날짜. 기기 시간대와 다르면 `datetaken` 대조(R7)가 어긋남을 드러낸다.

## R7. 되읽기 검증

- 심은 뒤·보장 때 모두 `content query ... --projection _data:datetaken --where "_data LIKE '%PocketlogSeed%s30-%'"`로 읽어, 표의 각 사진에 대응하는 행이 있고 `datetaken`이 그 사진의 계획 시각의 같은 하루(`dayBounds`)에 있으며 NULL이 없음을 본다. 정확한 ms 일치까지는 요구하지 않는다(스캐너가 초 단위·시간대 보정을 다룰 수 있음) — 같은 하루 + 시각 오차 ≤ 2분으로 비교한다.
- 010 `seed/verify.ts`의 `verifySeeded`는 한 하루·개수만 보므로 재사용하지 않고 같은 원칙(색인 실패를 시간대 어긋남보다 먼저 본다)으로 날 단위 판정을 `ensure.ts`에 둔다.

## R8. 실행기 연결과 흐름 입력

- **Decision**: 동기인 069 `runLayer1` 앞에 비동기 래퍼(`scripts/layer1/with-sample.ts`)를 둔다: 기기·Maestro가 있고 기기가 하나일 때 「표본 보장」을 하고(없으면 069의 「건너뜀」이 그대로 나온다) 그 뒤 `runLayer1`을 부른다. 실패는 `aborted`. 대표 날 8곳의 `P<n>_DATE`·`P<n>_BACK`·`P<n>_PHOTOS`·`P<n>_PLACES`를 `maestro test -e …`로 넘긴다(`Layer1Device.runMaestro`가 env를 받는다). 흐름은 값을 쓰기만 한다.
- **sample-days는 기준 상태 + 표본을 전제**하므로 `NEEDS_LAYER1_BASELINE`에 넣어 일반 실행에서 제외한다(069 I-4).
- **달력 이동**: 헤더 날짜 → `home-date-button` → (`P_BACK` ≥ 1이면 `calendar-prev`, ≥ 2면 한 번 더) → `calendar-day-<날짜>`. 30일 전은 달에 따라 한 달 또는 두 달 이전일 수 있다(3/1 → 1/30). TS가 `P_BACK`(0~2)을 `now`로 계산하고 흐름은 `calendar-prev`를 그 횟수만큼 누른다. **달력은 고른 날의 달에서 열린다** — 앞 대표 날의 달에서 열리면 `BACK`이 어긋나므로(실측 R10) 프로브마다 `launchApp`으로 오늘부터 시작한다.

## R9. 위험·미확인 목록

- 첫 과제 전에는 스캐너 수용(시각·GPS)이 미확인이다.
- Wikimedia 표준 폭·속도 제한은 내려받기 때 확인한다.
- Android 13에서 잰 속도가 다른 기기·버전에서 같을지는 미확인(되읽기가 안전망).
- 기기에 표본 사진이 120장 있을 때 기존 층 1 흐름 8개의 영향은 구현 중 한 번 돌려 본다(FR-026).

## R10. 첫 실기기 실측 (2026-10-10, SM-G986N, Android 13)

- **EXIF 수용(FR-014)**: 직접 쓴 APP1(받은 사진 `commons-food-01.jpg` + 시각·GPS)을 `PocketlogSeed/Camera/`에 푸시하고 `scan_volume` 한 번 → **좌표 있는 사진과 없는 사진 모두 `datetaken`이 정확히 들어갔다**(2026-09-05 10:00·11:00). 010이 겪은 「직접 만든 EXIF를 스캐너가 무시한다」는 이 방식(IFD0 해상도·방향, ExifIFD `ExifVersion`·`OffsetTime*`·`ComponentsConfiguration`·화소 크기, GPS `GPSVersionID`)에서는 일어나지 않았다. 원인은 여전히 모른다(어느 태그가 결정적인지 가르지 않았다 — 원칙 V).
- **앱이 좌표를 읽는가**: `sample-days`의 GPS 있는 날들(집→직장→집 3곳, 하루 종일 4곳, 걸어 다닌 날 5곳, 잡사진 섞임 2곳)과 GPS 없는 날(0곳)이 표의 기대와 같게 보였다(`P0`~`P6` 통과).
- **심기 시간(SC-007)**: 129장 처음 심기 **7.5초**(변환·push·`scan_volume`·되읽기·표식), 이미 맞을 때 건너뜀 **3.3초**. 계획한 상한(5분·10초)보다 훨씬 빠르다.
- **달력은 고른 날의 달에서 열린다**: 앞 대표 날(9/28)의 달에서 열리면 `BACK`(오늘의 달 기준)이 어긋나 다음 대표 날(9/14)을 못 찾았다 → 프로브마다 `launchApp`.
