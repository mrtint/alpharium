# Contract: 내려받기·EXIF·심기·표본 보장

대상: `scripts/e2e-sample/{fetch,exif-write,plan,ensure,device}.ts`, `scripts/sample-fetch.mts`, `scripts/sample-seed.mts`. 검사: `__tests__/e2e-sample/*.test.ts`(기기 없음) + 실기기 한 번.

## 내려받기 (`npm run sample:fetch`)

- **F-1** `photos.json`의 항목을 순차로 받고(요청 간 ≥ 1초, 식별 가능한 UA), `.cache/<file>`에 쓴다. 이미 있고 sha256이 맞으면 건너뛴다.
- **F-2** sha256이 목록과 다르면 그 파일을 지우고 실패한다(종료 코드 1, 이유에 파일명). 부분 캐시를 성공으로 보고하지 않는다.
- **F-3** 네트워크는 주입된 `fetchBytes`로만 한다(테스트 대역). 429는 백오프 후 최대 3회, 그래도 실패면 이유와 함께 중단.
- **F-5** `--record-hashes` 모드: 목록의 `sha256`이 비어 있는 항목만 받아 해시를 계산해 `photos.json`에 채운다(최초 1회). 이미 채워진 항목은 바꾸지 않고 대조만 한다 — 기록 모드가 있어도 F-2의 불일치 실패는 그대로다.
- **F-4** 승인 게이트: 처음 이 명령을 쓰기 전 목록을 소유자에게 보였는지는 코드가 아니라 **작업 절차**(tasks.md 게이트 태스크)로 지킨다.

## EXIF 작성 (`exif-write.ts`)

- **E-1** `writeExif(jpeg, { takenAt, coordinate | null }): Buffer` — 순수. SOI 뒤 기존 EXIF APP1을 모두 걷고 새 APP1을 넣는다. 다른 세그먼트(JFIF APP0, 이미지 데이터)는 바이트 그대로 보존된다.
- **E-2** 시각은 `DateTime`·`DateTimeOriginal`·`DateTimeDigitized`에 같은 값(로컬, `YYYY:MM:DD HH:MM:SS`). 좌표가 있으면 GPS IFD에 `GPSLatitudeRef/Latitude/LongitudeRef/Longitude/GPSDateStamp`(로컬 날짜, 010과 같은 값). 좌표가 없으면 GPS IFD 자체가 없다.
- **E-3** 기존 `readDate`·`readLocation`(`scripts/seed/exif.ts`)이 쓴 값을 그대로 읽는다(시각 초 단위 일치, 좌표 오차 < 1e-5).
- **E-4** 출력은 유효한 JPEG(SOI·EOI 존재)이고 원본의 EXIF(예: `Make`·`Model` 문자열)가 출력 어디에도 없다.
- **E-5** 입력이 JPEG가 아니면 던진다(조용히 쓰레기를 만들지 않는다).

## 계획 (`plan.ts`, 순수)

- **P-1** `planSample(manifest, catalog, now)`는 모든 슬롯을 `SeedItem`으로 펼친다. 날짜는 `now` 기준 오프셋 일 전(`day-boundary.dayOf`로 날 문자열), 시각은 슬롯 `time`. 같은 입력이면 같은 출력(난수 없음).
- **P-2** 슬롯 → 사진 파일은 태그별로 목록 순서를 돌며 결정적으로 고른다.
- **P-3** 좌표는 군집 중심 + 결정적 흔들림(슬롯 번호로 정한 각도·거리, 방문 안 ≤ 40m / 걸어 다닌 날은 표가 지정한 오프셋). 난수는 쓰지 않는다.
- **P-4** `fingerprint(items, catalog)`는 `data-model.md` 정의대로이고 표·목록·사진 sha가 바뀌면 바뀐다. 오늘 날짜에는 의존하지 않는다.
- **P-5** `probeEnv(manifest, now)`는 대표 날 8곳의 `P<n>_*` 문자열 쌍을 만든다(`P_BACK`은 오늘과 그 날의 달 차).
- **P-6** 이 파일은 `fs`·`adb`를 import하지 않는다.

## 심기 (`sample:seed`, `ensure.ts`)

- **S-1** 순서: 캐시 확인 → 기기의 `s30-` 파일과 표식 삭제 → 로컬 임시 폴더에 `Camera/`·`Screenshots/`·`Download/` 구조로 EXIF를 쓴 사진 생성 → 폴더째 push → 볼륨 색인 한 번 → 되읽기 검증 → 표식 쓰기.
- **S-2** 되읽기: `s30-` 행 수 = 항목 수, 각 항목에 대응하는 행이 있고 `datetaken`이 NULL이 아니며 계획 시각의 같은 하루이고 시각 오차 ≤ 2분. 어긋나면 실패(이유 갈래: `missing-cache`·`push-failed`·`index-failed`·`verify-mismatch`).
- **S-3** 실패 시 표식을 쓰지 않는다(다음 보장이 다시 심는다). 부분 사진이 남아도 다음 보장이 `s30-`를 지우고 다시 심는다.
- **S-4** 삭제는 `s30-` 접두 파일과 표식뿐. `PocketlogSeed/` 아래 다른 파일(010 사진)과 그 밖 경로는 건드리지 않는다. 지운 뒤 볼륨 색인으로 유령 행을 없앤다.
- **S-6** 캐시 읽기와 임시 폴더 생성도 주입(`readCached(file)`·`makeTempDir()`)이라 `ensure` 테스트가 파일 시스템에 묶이지 않는다.
- **S-5** 기기 접근은 `SampleDevice` 인터페이스로 주입(`pushDir`·`removeSampleFiles`·`scanVolume`·`queryRows`·`readMarker`·`writeMarker`). 어떤 함수도 던지지 않고 `Outcome`을 돌려준다.

## 표본 보장 (`ensureSample`)

- **G-1** 반환: `{ status: "skipped" | "seeded" | "failed", reason?, seededCount? }`.
- **G-2** 건너뜀 조건 전부: 표식 있음 ∧ `anchor` = 오늘 ∧ `fingerprint` = 지금 지문 ∧ `photos` = 항목 수 ∧ 되읽기 검증 통과.
- **G-3** 하나라도 아니면 `S-1`을 다시 한다. 표식이 있어도 되읽기가 어긋나면 다시 심는다.
- **G-4** 캐시에 사진이 없거나 sha가 다르면 `failed("missing-cache")` — 내려받기를 하지 않는다(승인 게이트), 이유에 `npm run sample:fetch`를 안내한다.
- **G-5** 층 1 실행기는 `failed`를 `aborted`로 옮긴다(통과가 아니다, 069 I-3). 출력 한 줄: `표본: 건너뜀(맞음, 기준일 …)` / `표본: N장 심음(M초)` / 실패 이유.

## 소스 계약 (`source-contract.test.ts`)

- **K-1** `src/`에서 `e2e-sample`·`PocketlogSeed`·`s30-`를 참조하는 줄이 0.
- **K-2** `scripts/e2e-sample/`에 `rm -rf`·`removeSeedFolder`·`seed:clear` 호출이 없고 기기 삭제 명령은 `s30-` 접두를 포함한 경로뿐이다.
- **K-3** `scripts/e2e-sample/`가 `scripts/seed/ledger`를 import하지 않는다(개발 기계에 기록을 두지 않는다 — Clarify Q1).
- **K-5** `scripts/e2e-sample/`가 `selectableDays`를 참조하지 않는다(FR-018: 표본은 자기 범위 30일을 가진다).
- **K-4** 사진 바이트를 저장소 경로에 쓰는 코드가 없다(쓰기 대상은 `.cache/`와 OS 임시 폴더뿐).
