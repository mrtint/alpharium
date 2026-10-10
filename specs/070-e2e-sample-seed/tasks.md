# Tasks: e2e 표본 — 30일치 가상의 하루를 심고 시작한다

**Input**: `specs/070-e2e-sample-seed/` — spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 이 저장소는 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」) — 순수 로직 테스트 태스크를 구현 앞에 둔다. jest `logic` 프로젝트라 파일은 `.ts`.

**형식**: `- [ ] T### [P?] [US?] 설명 (파일 경로)` — `[P]` = 다른 파일·미완료 태스크에 의존 없음.

**순서 주의**: US3(사진·EXIF)이 US2(심기·보장)의 재료고 US2가 US1(흐름)의 전제다. 우선순위는 셋 모두 P1이라 구현은 US3 → US2 → US1 → US4 순서로 한다.

## Phase 1: Setup

- [x] T001 `package.json`에 `"sample:fetch"`·`"sample:seed"` 스크립트를 더한다(`node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/sample-fetch.mts` 등, 기존 `seed:day` 줄과 같은 형식). `.gitignore`에 `scripts/e2e-sample/.cache/`를 더한다.

## Phase 2: Foundational (표·EXIF·계획 — 모든 이야기의 전제)

**⚠️ 이 단계가 끝나야 사진 목록·심기·흐름이 시작된다.**

- [x] T002 [P] 스펙 번호 기록 확인: `docs/roadmap/README.md`의 해당 과제 제목에 「(스펙 070)」이 있고 `.specify/feature.json`의 `feature_directory`가 `specs/070-e2e-sample-seed`인지 본다(이미 반영됨 — 확인만).
- [x] T003 [P] `__tests__/e2e-sample/exif-write.test.ts`(새 폴더 `__tests__/e2e-sample/`의 첫 테스트 — `npm run test:logic -- __tests__/e2e-sample`로 `logic` 프로젝트에 잡히는지, `jest-projects.test.ts`의 파일 수 가드가 통과하는지 확인) — E-1~E-5를 실패하는 테스트로 먼저 쓴다: JFIF APP0·이미지 데이터 보존, 원본 EXIF 문자열(`Make`·`Model`)이 출력에 없음, `readDate`·`readLocation`(`scripts/seed/exif.ts`) 왕복(초 단위·오차 < 1e-5), 좌표 없으면 GPS IFD 없음(`readLocation === null`), 세 날짜 태그가 모두 같음, JPEG가 아니면 던짐. 테스트 입력 JPEG는 `scripts/seed-template.jpg`(저장소 템플릿)를 쓴다.
- [x] T004 `scripts/e2e-sample/exif-write.ts` — `writeExif(jpeg: Buffer, { takenAt: Date; coordinate: { latitude: number; longitude: number } | null }): Buffer`. EXIF APP1 걷기 + 리틀엔디언 TIFF의 IFD0(`DateTime` 0x0132, ExifIFD 포인터 0x8769, 좌표 있으면 GPS 포인터 0x8825) / ExifIFD(`DateTimeOriginal` 0x9003, `DateTimeDigitized` 0x9004) / GPS IFD(0x0001~0x0004, `GPSDateStamp` 0x001D, 위·경도 DMS rational). T003이 통과해야 한다. 순수 함수 — `fs`·`adb` import 금지(P-6 정신).
- [x] T005 [P] `__tests__/e2e-sample/manifest.test.ts` — contracts/sample-manifest.md M-1~M-8을 테스트로 쓴다(날 30·슬롯 합·상황 커버리지·시각순·자정 넘김 없음·기대 수 일치·군집 거리/흔들림·대표 날 8). 처음엔 manifest가 없어 실패한다.
- [x] T006 `scripts/e2e-sample/manifest.ts` — 군집 4개 상수(`home`·`work`·`cafe`·`weekend`, 한국 공공장소 근처, 사이 ≥ 1000m, `jitterMeters` ≤ 40), 상황 열둘, 30일(오프셋 1~30) × 슬롯 표, 날마다 `visits`(군집 순서)·`expect.photos`·`expect.places`, 대표 날 8곳(오프셋 ≥ 3; `P_BACK`은 `probeEnv`가 계산). 슬롯 합 약 120(≤ 150). 날마다 다른 상황을 data-model.md의 목록대로 섞는다. 기대 장소 수는 **사람이 적는다**(방문 순서의 연속 중복 제거). T005 통과.
- [x] T007 [P] `__tests__/e2e-sample/plan.test.ts` — P-1~P-5(`P_BACK`이 0~2이고 3/1 같은 달 경계 `now`에서 2가 나옴): 같은 입력→같은 출력, 날짜가 `now` 기준 오프셋, 슬롯→사진 선택이 결정적, 좌표 흔들림 ≤ 40m(걸어 다닌 날은 지정 오프셋), 지문이 표·목록 변경에는 바뀌고 오늘 날짜에는 안 바뀜, `probeEnv`가 `P0~P7`의 `_DATE`·`_BACK`·`_PHOTOS`·`_PLACES` 문자열을 만들고 값에 공백·따옴표가 없음, `plan.ts`가 `fs`/`child_process`/`adb`를 import하지 않음(소스 검사).
- [x] T008 `scripts/e2e-sample/plan.ts` — `planSample(manifest, catalog, now): SeedItem[]`, `fingerprint(items, catalog): string`(앞 16 hex), `probeEnv(manifest, now): Record<string,string>`. 하루 문자열은 `src/config/day-boundary.ts`의 `dayOf`를 쓴다(자체 하루 계산 금지, DB11). 난수 없음. T007 통과.

**Checkpoint**: 표·EXIF·계획이 기기 없이 검증된다.

## Phase 3: User Story 3 — 사진은 실제 무료 사진이고 저장소에는 목록만 있다 (P1)

**Goal**: Wikimedia Commons CC0/PD 사진 200장 이상의 목록(URL·sha256·라이선스)을 확정하고 캐시에 받는다.

**Independent Test**: 빈 캐시에서 `npm run sample:fetch` → 모든 항목이 해시까지 맞게 받아지고, `catalog.test.ts`가 통과한다. 저장소에 jpg가 추적되지 않는다.

- [x] T009 [P] [US3] `__tests__/e2e-sample/catalog.test.ts` — C-1~C-6: 필드 완전성, 허용 라이선스(`CC0`·`PD`), URL 접두(`https://upload.wikimedia.org/`)·출처 접두(`https://commons.wikimedia.org/`), 태그 일곱 각 ≥ 20장, 서로 다른 파일 200~260, `git ls-files scripts/e2e-sample`에 jpg 없음(없는 상태로 통과하는 것을 먼저 단언), `catalog.ts`의 허용 라이선스 상수가 한 곳.
- [x] T010 [US3] `scripts/e2e-sample/catalog.ts` — `photos.json` 읽기·검증(`loadCatalog()`가 위반을 이유와 함께 던지거나 `Outcome`으로), 허용 라이선스 상수 한 곳. `photos.json` 스키마 타입 `CatalogPhoto`(data-model.md).
- [x] T011 [P] [US3] `__tests__/e2e-sample/fetch.test.ts` — F-1~F-3·F-5(`--record-hashes`: 빈 sha만 채움, 채워진 항목은 대조만, 불일치는 여전히 실패): 주입한 `fetchBytes` 대역으로 순차 호출·간격 호출, 해시 일치 시 캐시 기록·재실행 시 건너뜀, 해시 불일치 시 파일 삭제+실패(이유에 파일명), 429 백오프 3회 후 실패, 부분 캐시를 성공으로 보지 않음.
- [x] T012 [US3] `scripts/e2e-sample/fetch.ts` + `scripts/sample-fetch.mts` — `fetchCatalog({ catalog, cacheDir, fetchBytes, sleep, recordHashes })`(`--record-hashes`는 CLI 플래그), CLI는 실제 `fetchBytes`(User-Agent: `Pocketlog-e2e-sample/1.0 (+https://github.com/mrtint/alpharium)` 형식으로 식별)와 간격 1초 이상. T011 통과.
- [x] T013 [US3] **게이트(외부 서비스 — FR-010)**: Commons에서 CC0/PD 후보를 검색해(메타데이터 조회) 태그별 후보 목록(파일명·라이선스·출처 페이지·직접 URL·크기)을 만든다. **소유자에게 보여 주고 승인받은 뒤에만** 다음 태스크로 간다.
- [x] T014 [US3] 승인된 목록으로 `scripts/e2e-sample/photos.json`을 쓴다(`sha256`은 빈 문자열) → `npm run sample:fetch -- --record-hashes`로 해시를 채운다 → 이후 `sample:fetch`는 대조만 한다. 확인 일자는 오늘, `widthPx`는 실제 받은 폭. `npm run sample:fetch` 후 `catalog.test.ts` 통과, `git status`에 jpg 없음.

**Checkpoint**: 사진 목록·캐시가 있고 EXIF를 쓸 수 있다.

## Phase 4: User Story 2 — 층 1 실행이 표본을 알아서 보장한다 (P1)

**Goal**: 기기를 되읽어 표본이 맞으면 건너뛰고, 없거나 낡았거나 일부가 빠졌으면 `s30-`만 지우고 다시 심는다.

**Independent Test**: (1) 맞는 기기에서 건너뜀 (2) 일부 사진 삭제 후 다시 심음 (3) 표식 기준일이 어제/지문이 다르면 다시 심음 (4) 010 사진은 그대로. 기기 없는 단위 테스트 + 실기기 한 번.

- [x] T015 [P] [US2] `__tests__/e2e-sample/ensure.test.ts` — `SampleDevice` 대역으로 G-1~G-5·S-1~S-5: 건너뜀 조건 전부 / 표식 없음 → 심음 / anchor 어제 → 심음 / 지문 다름 → 심음 / 표식 있는데 사진 수 부족 → 심음 / `datetaken` NULL 행 → 심음 / 캐시 없음 → `failed("missing-cache")`(내려받기 안 함) / 되읽기 실패 → 표식 쓰지 않음 / 삭제 명령이 `s30-`·표식만 대상 / 010 사진 불가침 / 어떤 단계도 던지지 않음.
- [x] T016 [P] [US2] `__tests__/e2e-sample/source-contract.test.ts` — K-1~K-5: `src/`에 `e2e-sample`·`PocketlogSeed`·`s30-` 줄 0, `scripts/e2e-sample/`에 `rm -rf`·`removeSeedFolder`·`seed:clear` 0 / 삭제 명령은 `s30-` 포함, `scripts/seed/ledger` import 0, `selectableDays` 참조 0(K-5, FR-018), 사진 바이트를 저장소 경로에 쓰는 코드 0(소스를 읽기 전 주석을 걷어낸다 — AGENTS 규칙). 위반 주입 한 줄은 T031에서.
- [x] T017 [US2] `scripts/e2e-sample/ensure.ts` — `ensureSample({ device: SampleDevice; now; log; readCached; makeTempDir })`(캐시 읽기·임시 폴더는 주입, S-6). `SampleDevice` 인터페이스(`pushDir`·`removeSampleFiles`·`scanVolume`·`queryRows`·`readMarker`·`writeMarker`)와 `Outcome` 형태, 되읽기 판정(수·`datetaken` non-null·같은 하루·시각 오차 ≤ 2분 — `dayBounds` 사용, 색인 실패를 시간대 어긋남보다 먼저). 로컬 임시 폴더에 `Camera/`·`Screenshots/`·`Download/` 구조로 `writeExif` 결과를 쓰고 `pushDir`로 한 번에 넘긴다. T015·T016 통과.
- [x] T018 [US2] `scripts/e2e-sample/device.ts` — adb 통로: `pushDir`(`adb push <dir>/. /sdcard/Pictures/PocketlogSeed/`), `removeSampleFiles`(`find`+`rm`을 `s30-` 접두 경로로만; 셸 연산자를 명령에 넣지 않는다 — `scripts/seed/device.ts` 주석의 함정), `scanVolume`(`content call … scan_volume --arg external_primary`), `queryRows`(`_data LIKE '%PocketlogSeed%s30-%'`, CRLF 제거), `readMarker`/`writeMarker`(`s30-marker.txt` push). 어떤 함수도 던지지 않는다. `scripts/seed/device.ts`의 상수 `SEED_FOLDER`를 재사용한다(경로 복제 금지).
- [x] T019 [US2] `scripts/sample-seed.mts` — CLI: 기기 하나 확인(없거나 여럿이면 실패, 010과 같은 규칙) → `ensureSample` → 결과 한 줄 출력, 실패 시 종료 코드 1. `sample:seed` 스크립트에 연결(T001).
- [x] T020 [US2] **첫 과제(FR-014, 실기기)**: 로컬에 있는 실사 샘플(`scripts/samples/with-gps/*.jpg`, 비커밋)로 `writeExif` 결과 두 장(좌표 있음/없음)을 `PocketlogSeed/Camera/`에 push(**표본 범위 밖인 오늘 −35일**에 심고 파일명에 `s30-` 접두를 쓰지 않는다 — 표본과 섞이지 않게) → `scan_volume` → `datetaken` 확인 → 앱에서 그 날의 사진 칸·장소 칸 확인(좌표 있음: 1·1, 좌표 없음: 사진 +1·장소 변화 없음). 결과를 `specs/070-e2e-sample-seed/research.md` R4에 실측으로 덧붙인다. 안 되면 T004를 고친다. 확인 뒤 두 장은 지운다.
- [x] T021 [US2] `scripts/layer1/device.ts` — `Layer1Device.runMaestro(flows, env?)`가 `-e KEY=VALUE`를 붙이고(값에 공백·따옴표가 있으면 던지기 전에 거부), `scripts/layer1/runner.ts`의 `Layer1Options`에 `ensureSample?`/`sampleDevice?`·`probeEnv`를 주입한다. `scripts/layer1/runner.ts` L2 직후에 「표본 보장」을 끼운다: `failed`면 `aborted`(통과 아님). 기존 `__tests__/e2e/layer1-runner.test.ts`가 계속 통과하게 주입을 옵셔널로 둔다.
- [x] T022 [P] [US2] `__tests__/e2e/layer1-runner.test.ts`에 표본 보장 갈래를 더한다: 보장 `failed` → `aborted`·흐름 미실행 / `skipped`·`seeded` → 흐름 실행 / env가 `runMaestro`에 전달됨.
- [x] T023 [US2] 실기기: `npm run sample:seed`를 직접 돌려 처음 심기 시간·건너뜀 시간을 재고(SC-007) 기록한다. 되읽기 쿼리로 `s30-` 행 수·`datetaken`을 눈으로 확인한다.

**Checkpoint**: 표본을 한 명령으로 심고 보장한다.

## Phase 5: User Story 1 — 날이 많은 기기에서 날마다 다른 상황이 맞게 보인다 (P1)

**Goal**: 새 흐름이 대표 날 8곳의 사진·장소 칸이 표의 기대와 같음을 본다.

**Independent Test**: 표본이 심긴 기기에서 `sample-days`만 돌려 통과. 표의 기대 한 칸을 틀리게 하면 실패.

- [x] T024 [P] [US1] `__tests__/e2e-sample/sample-flow-contract.test.ts` — contracts/sample-days-flow.md T-1~T-4: 흐름이 `P0`~`P7` 여덟 묶음, 날짜/기대 수 리터럴 없음(주석 제외), `probeEnv` 키 = 흐름 참조 키, 러너 소스의 `-e` 값에 공백·따옴표 없음. 흐름 파일이 없어 처음엔 실패.
- [x] T025 [US1] `.maestro/_sample-probe.yml`(보조) — env `DATE`·`BACK`(0~2)·`PHOTOS`·`PLACES`: 홈 대기 → `home-date-button` → `calendar-dialog` → `BACK` ≥ 1이면 `calendar-prev`, ≥ 2면 한 번 더(`runFlow when`) → `calendar-day-${DATE}` 탭 → 달력 닫힘 → `signal-row` 보임 → `signal-photos-number`가 `${PHOTOS}`, `signal-places-number`가 `${PLACES}`. 머리말 주석에 단언·미단언·함정을 적는다(원칙 IV: 본문 단언 없음).
- [x] T026 [US1] `.maestro/sample-days.yml` — 첫 단계 `P0_DATE` 존재 단언 후 `_sample-probe.yml`을 P0~P7에 `runFlow`(env 매핑). 앱을 열 때 `launchApp` 하나. T024 통과.
- [x] T027 [US1] `scripts/run-device-tests.mjs` — `FLOWS`·`LAYER1_FLOWS`·`NEEDS_LAYER1_BASELINE`에 `sample-days`를 등록하고 `--layer1` 경로가 표본 보장·`probeEnv`를 주입하게 한다(`runLayer1Mode`가 실제 `adbDevice`·표본 통로를 만든다). 주석에 근거를 한 줄 더한다.
- [x] T028 [US1] `docs/e2e/feature-flow-map.md` — 기능 행 「쓸 재료」·「날 고르기」·「날짜로 이동」에 `sample-days`를 올리고 인벤토리에 `sample-days.yml`(FLOWS ○·층 1 ○)과 `_sample-probe.yml`(보조)을 더한다. `npm run test:logic -- __tests__/e2e`로 `flow-map.test.ts` 통과.
- [x] T029 [US1] 실기기: Metro(`CI=1`, 앱 코드 무변경이라 번들 확인 불필요) + `adb reverse` + `npm run test:layer1`로 `sample-days` 포함 전체를 한 번 돌린다. 8장 초과·잡사진 날의 실제 표시값이 표의 기대와 같은지 본다 — 다르면 **표가 아니라 관측을 기록하고 원인을 가린다**(앱 결함 vs 기대 오류).
- [x] T030 [US1] 기존 층 1 흐름 8개가 표본 위에서도 통과하는지 T029 결과로 확인하고, 통과하지 않는 것이 있으면 표본 탓인지 가려 이유와 함께 대응표·`research.md`에 기록한다(FR-026).

**Checkpoint**: 표본 위에서 층 1 전체가 돈다.

## Phase 6: User Story 4 — 표본 표가 문서로 남는다 (P2)

**Goal**: `docs/e2e/sample-table.md`가 manifest·사진 목록과 같고 테스트로 잠긴다.

**Independent Test**: 문서와 manifest를 대조하는 테스트가 통과하고, 한쪽을 바꾸면 실패한다.

- [x] T031 [P] [US4] `__tests__/e2e-sample/doc-match.test.ts` — D-1~D-3: 문서 표를 파싱해 날(오프셋·상황·사진 수·방문 순서·기대 장소 수·대표 날)·군집 표·사진 출처 표가 manifest·`photos.json`과 같음, iOS 범위 밖 한 줄 존재. 위반 주입(문서의 숫자 하나 치환 → 실패)도 같은 파일에 둔다 — 치환이 실제로 적용됐는지 먼저 단언.
- [x] T032 [US4] `docs/e2e/sample-table.md` — 날 표(30행), 군집 표(이름·좌표·흔들림), 사진 출처 표(파일·라이선스·출처 페이지·확인 일자·태그), 심은 촬영 시각·GPS 요약, 「iOS 시뮬레이터는 범위 밖(미검증)」. 문서는 사람이 읽는 형식이되 T031이 파싱할 수 있는 마크다운 표로 쓴다. T031 통과.

## Phase 7: Polish & Cross-Cutting

- [x] T033 위반 주입(실기기, quickstart C): ① manifest 한 날의 `expect.places`를 틀리게 → `sample-days` 실패 → 되돌림 ② 기기 `s30-` 파일 일부 삭제 → `test:layer1`이 다시 심고 통과 ③ 표식 `anchor`를 어제로 → 다시 심음. 매번 치환이 적용됐는지 먼저 확인하고 되돌린 뒤 `git diff`로 잔여를 확인한다.
- [x] T034 `AGENTS.md`의 069 절 아래에 070 한 절을 더한다(실측한 결론만: `scan_volume`, 순차 방문 수, 표식 위치, 표본 보장, 한계). 기능별 상세 로그는 `specs/070-*`에 둔다.
- [x] T035 `npm test`와 `npm run lint`(eslint·tsc·헌법 검사·prettier)를 실제로 돌려 통과를 확인하고 새 파일의 prettier 오류를 고친다. 헌법 검사 `scripts/check-constitution.mts`가 새 `scripts/e2e-sample/`을 어떻게 다루는지 확인한다(`src/` 밖이라 영향 없는 것이 정상).
- [x] T036 `specs/070-e2e-sample-seed/quickstart.md` 끝에 실측 기록(처음 심기·건너뜀 시간, 8장 초과/잡사진 날 표시, 기존 8 흐름 결과, 위반 주입 결과, 미확인)을 덧붙인다.

## Dependencies & Execution Order

- Setup(T001~T002) → Foundational(T003~T008) → US3(T009~T014) → US2(T015~T023) → US1(T024~T030) → US4(T031~T032) → Polish(T033~T036).
- T013(외부 서비스 게이트)은 소유자 승인이 필요하다 — 승인 전에 T014를 하지 않는다.
- T020(첫 과제)은 T004 이후 아무 때나 가능하다(사진 목록과 무관, 로컬 실사 샘플 사용). 실패하면 T004를 고치고 T017 앞으로 되돌아간다.
- T021은 T017·T018에 의존한다. T027은 T021·T026에 의존한다.
- 병렬 가능: T003 ∥ T005 ∥ T007(서로 다른 테스트 파일), T009 ∥ T011, T015 ∥ T016, T031은 T032 전에 쓴다.

## Implementation Strategy

- **MVP**: Foundational + US3 + US2 + US1 — 표본이 심기고 흐름이 한 번 통과하면 핵심 가치가 닿는다. US4(문서)는 완료 조건이므로 같은 PR에서 닫는다.
- 첫 위험(스캐너가 EXIF를 받는가)을 T020에서 먼저 닫아 뒤 태스크가 헛돌지 않게 한다.
- 실기기 통과(T029·T033)를 완료 선언 조건으로 한다(원칙 V). 기기 없이 못 돈 것은 통과가 아니라 미확인으로 기록.

## Phase 8: Convergence

- [x] T037 plan.md 「Source Code」 목록에 구현에서 생긴 `scripts/e2e-sample/{doc.ts,doc-util.ts,fs-port.ts,layer1-step.ts}`와 `scripts/sample-doc.mts`를 올린다 per plan: Source Code 구조 (unrequested)
- [x] T038 plan.md 「Documentation」 목록에 `photo-candidates.md`(소유자 승인 경위 + 최종 사진 목록 기록)를 올린다 per FR-010 (unrequested)
