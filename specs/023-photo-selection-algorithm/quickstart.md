# Quickstart: 사진 선별 알고리즘 고도화 검증

**Feature**: `023-photo-selection-algorithm` | **Date**: 2026-08-29

기기 없는 테스트가 대부분을 잠그고(순수 함수), 실기기는 (1) 폴더 경로
문자열 확인, (2) 상한 값 실측 두 가지를 위해 필요하다. AGENTS.md 기준 —
새 네이티브 모듈이 아니므로 debug 실기기 1회로 충분, release 재확인 없음.

---

## 사전 조건

- `npm run test:logic` 전부 통과 (분류·시간 분포·최대 잔여법·되돌림·결정성·
  시그니처)
- `npm run lint` 통과 (eslint + tsc + 헌법 검사 + prettier)
- `check-constitution.test.ts`의 위반 주입 3종(G3)이 실제로 잡히는 것 확인
- debug 빌드가 실기기(SM-S901N 1차)에 설치되고 Metro가 dev로 떠 있음
  (AGENTS.md 「도구 사용법」 3항목)
- 010 심는 도구로 합성 하루 준비 가능(`npm run seed:day`)

---

## 기기 없는 검증 (항상 돈다)

### T1. 분류 (contracts/classification.md)

`select.test.ts`가 표 기반으로:
- `Camera×4, Screenshots×3` → kept = Camera 4장
- `Screenshots×8` → 되돌림, kept = 8장 전부
- `folderName undefined ×10` → kept = 10장 전부 (unclassifiable는 남음)
- 목록 밖 폴더 이름(`OpenCamera`) → camera로 분류, 남음
- 같은 입력 2회 → 동일 분류 (결정성)

### T2. 시간 분포 배분 (contracts/time-distribution.md)

- 3장 (상한 이하) → 전부
- 오전 20장 + 오후 2장 + 저녁 2장 (예산 5) → 오전 칸 2~3장, 오후·저녁 각 1장
  (오전 칸이 독점하지 않음)
- 6개 칸 각 1장 (예산 5) → 시간축 균등 5개 칸, 양 끝 칸 포함
- 전부 20–22시 10장 (예산 5) → 그 칸에서 011 R2로 5장 (011 기존 동작에 수렴)
- **최대 잔여법 정확값**: 예산 8, 칸 A(2)·B(30)·C(5)·D(3) → alloc A1·B4·C2·D1
- 결과 시각 순·중복 없음
- 같은 하루 2회 → 동일 집합

### T3. 시그니처·상수 미노출 (011 S1)

`select.test.ts`가 `readFileSync`로 `select.ts` 소스를 직접 읽어:
- `selectForVision`의 인자가 정확히 1개 (둘째 인자·기본값 인자 없음)
- `VISION_PHOTO_LIMIT`·`BUCKET_COUNT`·`NON_CAMERA_FOLDERS`가 export 목록에
  없음
- `reachedVisionLimit`만 export

### T4. 004 신호 수집 회귀 없음 (SC-009)

`collect.test.ts`의 기존 케이스 전부 통과 — `PhotoFacts.folderName?`가
선택적이라 `collectPhotos()`의 타입·판정이 바뀌지 않음. `usablePhotos()`가
`folderName`을 이월하는 것만 새로 확인(`folderName`이 있는 `PhotoFacts`
입력 → `Photo`에 그대로 실림).

### T5. 폴더 이름 추출 (`expo-port.test.ts`)

`folderNameOf()` 순수 함수:
- `file:///storage/emulated/0/DCIM/Camera/IMG_1.jpg` → `"Camera"`
- `/storage/emulated/0/Pictures/Screenshots/S_1.png` → `"Screenshots"`
- `content://media/external/images/media/1000000871` → `undefined`
- `""` / `null` / `undefined` → `undefined`
- 슬래시 없는 문자열 → `undefined`

### T6. 헌법 검사 (constitution-guard.md)

`check-constitution.test.ts` — G3의 위반 주입 3종이 잡히고, 정상 소스에서는
0건.

---

## 실기기 검증 (debug 1회)

### D1. 잡사진 필터링 + 폴더 경로 문자열 확인 → `NON_CAMERA_FOLDERS` 확정

**목적**: 023 seed 도구가 심은 하위 폴더(`AlphariumSeed/Camera/`·
`Screenshots/`·`Download/`)에서 `folderNameOf()`가 폴더 이름을 뽑아 분류
하는지 확인하고, 실촬 사진에서 실제 경로 문자열도 봐서
`NON_CAMERA_FOLDERS`를 확정한다(011·013에서 URI 계약이 반복 함정).

1. **seed 도구로**: `npm run seed:day -- mixed-clutter <날짜>` — 카메라 6장
   + 스크린샷 3장 + 다운로드 1장이 각 하위 폴더에 심긴다. 그 하루로 일기
   쓰기를 시작해 `adb logcat`에서:
   - `folderNameOf()` 입력·출력 (구현 시 임시 `console.log`) — 하위 폴더
     사진이 `"Camera"`/`"Screenshots"`/`"Download"`로 갈리는가
   - `has_media` — 캡션 대상에 스크린샷·다운로드가 안 들어가는가
2. **되돌림**: `npm run seed:day -- screenshots-only <날짜>` — 스크린샷만
   5장. 그때는 그 스크린샷이 캡션됨을 확인(카메라 원본 0장 → 원본 유지).
3. **실촬 사진으로 경로 확정**: 실기기에서 직접 촬영 3장, 스크린샷 2장,
   카톡/브라우저 저장 1장을 실제로 만들어 같은 하루로 일기. `adb logcat`의
   `folderNameOf()` 입력에서 스크린샷이 `Pictures/Screenshots`인가
   `DCIM/Screenshots`인가, 카톡이 `Pictures/KakaoTalk`인가, 다운로드가
   `Download`인가, `content://`가 섞여 나오는가.
4. `NON_CAMERA_FOLDERS`(`select.ts`)를 관찰값으로 확정하고 주석에
   "SM-S901N, Android 16, 날짜" 근거를 채운다.
5. **`content://`가 다수면** — `folderNamesFor()`의 `getUri()` N회 비용을 잰다:
   `adb logcat`에 `folderNamesFor()` 진입·반환 타임스탬프를 찍어 상한 초과인
   하루(`many-camera`는 12장, 필요하면 `--bursts`로 더 많이) 기준 추가
   지연을 본다. 지연이 크면 T041 태스크에서 게이트를 더 좁힌다.

**통과**: seed 도구의 하위 폴더 사진이 의도한 분류로 갈리고, 캡션 대상에
스크린샷·다운로드가 안 들어간다. `screenshots-only`에서는 되돌림이 동작.
실촬 경로로 `NON_CAMERA_FOLDERS` 확정.

### D2. 시간 분포 선별 관찰 (SC-003)

**목적**: 사진이 몰린 하루에서 다른 시간대가 대표되는지 눈으로 확인.

1. `npm run seed:day -- morning-heavy <날짜>` — 오전(04–06시)에 15장, 낮·
   저녁에 각 2장. (사진 내용은 "경로가 도는가"만 보는 용도 — 010 원칙, 품질
   결론에 쓰지 않음.) 다른 분포가 필요하면 `--bursts`로 조합을 직접 넘긴다:
   `npm run seed:day -- --bursts '[{"fromHour":6,"spanHours":3,"count":10,"location":"near-a"},{"fromHour":6,"spanHours":1,"count":4,"location":null,"folder":"Screenshots"}]' <날짜>`
2. 그 하루로 일기를 쓰고, `adb logcat`에서 캡션된 사진의 `takenAt`(또는
   순번)을 본다.
3. 관찰: 캡션된 사진의 시각이 오전에만 몰려 있지 않다. 낮·저녁 시간대가
   각각 최소 1장씩. 오전 칸에서 2장 이상.

**통과**: 캡션 대상의 시각 분포가 하루에 걸쳐 있고, 몰린 칸이 선택을
독점하지 않는다.

### D3. 상한 값 실측 → `VISION_PHOTO_LIMIT` 확정 (FR-017a)

**목적**: 시간·컨텍스트 두 물리 한계를 재 작은 쪽에서 여유를 뺀 값을 정한다.

1. 사진이 상한 후보(예: 10장, 12장)보다 많은 하루를 준비한다 —
   `npm run seed:day -- many-camera <날짜>`(12장) 또는 `--bursts`로 더
   많이. `quiet`(kanana) 캐릭터로 시작.
2. **시간**: `adb logcat`에서
   - 각 사진 캡션 시작·종료 타임스탬프 → 장당 시간, 누적 시간
   - VLM 적재 시간 + 캐릭터 모델 콜드/웜 로드 시간
   - `runWithTimeout()`이 재는 `engine.run()` 구간이 180초에서 얼마나
     떨어져 있는가
3. **컨텍스트**: 캐릭터 모델 프롬프트 조립 로그에서
   - 캡션 N장이 들어간 프롬프트의 토큰 수(`llama.rn`이 프롬프트 평가 시
     찍는 값 — `llama-port.ts` 경계 밖 로그라 진단용으로만 읽음)
   - `n_ctx` 설정값(`src/inference/`의 llama 초기화)
   - 토큰 수 / `n_ctx` 비율
4. **narrative로 한 번 더**(가능하면): 같은 하루를 `narrative`(exaone,
   콜드 최대 242초 관측)로 써서 캡션+생성이 180초를 넘기지 않는지. 못
   하면 "narrative 미확인"을 `data-model.md` §3.4 주석과 AGENTS.md에
   명시(019·020이 남긴 위험 계열).
5. 두 한계 중 작은 쪽을 잡고 여유를 뺀 값을 `VISION_PHOTO_LIMIT`으로
   확정. `data-model.md` §3.4 주석에 "어느 제약이 걸렸는지, 잰 값,
   기기·날짜"를 채운다.

**통과**: 새 상한으로 사진이 상한만큼 있는 하루의 캡션+생성이 시간 한도
안에 여유를 두고 들어오고(SC-008), 캡션이 들어간 프롬프트가 `n_ctx`를
넘지 않는다(SC-007). 016의 "많음/보통" 갈래가 새 상한을 기준으로 갈리는
것도 확인(`reachedVisionLimit`).

### D4. 회귀 — 011·013·016 흐름

- `.maestro/` 사진 관련 흐름(있는 것) 전부 PASS
- 「보지 않음」과 「빠르게 봄」의 일기가 여전히 확연히 다름(011 — 캡션이
  실제로 재료가 됨)
- 리사이즈가 여전히 걸림(013 — 캡션 시간이 비정상적으로 길지 않음)
- 새 Maestro 흐름을 추가했다면 `run-device-tests.mjs`의 `FLOWS`에 등록
  (AGENTS.md 경고)

---

## 검증 후 기록 — 실측 완료 (2026-08-29, SM-S901N / Galaxy S22, Android 16 / SDK 36, debug)

### 상한(`VISION_PHOTO_LIMIT`) — **5 → 8** (T031·T032)

`many-camera`(12장, `folder` 미지정) 하루로 「빠르게 봄」 `quiet`(금동이)
생성을 상한 5·8 두 번 걸고 `DiaryEntry.timing`·`adb logcat`(`RNLlama`)을 읽음:

| 상한 | visionMs (캡션) | writingMs (생성) | 총 | 한도 180초 여유 |
|---|---|---|---|---|
| 5 | 33999 (34초) | 98824 (99초) | ~133초 | 47초 |
| 8 | 45652 (46초, 장당 ~5.7초) | 91663 (92초) | ~138초 | 42초 |

- **걸린 제약: 시간.** 10장 초과 시 180초에 근접. `narrative`(exaone 콜드
  최대 242초, AGENTS.md)는 미확인 → 8에서 멈춤.
- **컨텍스트는 여유:** 캡션 5장 캐릭터 프롬프트 = 852~855토큰. 캐릭터 모델
  `n_ctx`=2048(`llama-port.ts`), `n_predict`=512(`sampling.ts`) → 프롬프트
  상한 1536. 8장 ≈ 1030토큰(n_ctx의 50%, 상한의 67%). VLM `n_ctx`=4096
  (`on-device.ts`), IMAGE 청크 장당 1개(n_tokens 234~252 — 013 리사이즈 유효).

### 시간 분포 선별 (T036, SC-003)

`many-camera` 12장(전부 02:00~10:22 KST에 몰림) → 캡션 8장의 `takenAt`:
`02:00, 02:06, 04:02, 06:25, 06:31, 06:39, 09:33, 10:22`. 첫·마지막 사진
포함(011 R3), 몰린 구간에서 8장이 고르게 퍼짐. `distributeByTime` budget=8이
실기기에서 정확히 동작. 본문도 8장을 시각순으로 서술.

### 잡사진 필터링 (D1)

`mixed-clutter`(Camera 6 + Screenshots 3 + Download 1 = 10장, Phase 8
하위폴더 격리) → `signalsUsed`(선별 전) 10장 / 캡션된 사진 **6장 전부
`Camera/` 하위폴더**. Screenshots 3 + Download 1이 캡션 대상에서 빠짐 —
`folderNameOf()`가 `Asset.getUri()`가 준 `file://` 경로에서 하위폴더 이름
(`Screenshots`/`Download`)을 뽑아 `NON_CAMERA_FOLDERS` 매치 → 제외. MediaStore
`bucket_display_name`이 하위폴더별로 `Camera`/`Screenshots`/`Download`로 갈림.

- **`getUri()`는 `file://` 경로를 반환** — `content://`가 아니다(T035).
  `folderNameOf()`의 `file://` 경로 분기가 실기기에서 유효. `content://`
  분기는 이 기기에서 dead path(구형 대비로 유지).
- **`NON_CAMERA_FOLDERS` 실촬 확정은 미완** — seed 하위폴더(`AlphariumSeed/
  Screenshots` 등)로 격리·분류는 확인했으나, 실제 촬영/스크린샷/메신저 저장
  경로가 `Pictures/Screenshots`인지 `DCIM/Screenshots`인지 등은 재지 않음.
  현재 목록(`Screenshots`·`Download`·`KakaoTalk`·`WhatsApp Images`·
  `Telegram`)은 알려진 값 유지. `select.ts` 주석에 명시.

### seed 도구 결함 발견·수정 (T035 부산물)

`scripts/samples/no-gps/`의 실사 샘플(2017년 Galaxy)이 이 기기 미디어
스캐너에서 `datetaken`을 NULL로 둔다 — **patch 여부·EXIF 날짜 태그 3개
일치 여부와 무관**. 원본을 그대로 push해도 그렇다. `with-gps/` 샘플은 EXIF가
온전해 `patchDate`만 적용해도 정상. `mixed-clutter`·`screenshots-only`
(Phase 8, 좌표 없는 잡사진) seed가 "10장 심었는데 색인 6장"으로 실패했다.
수정:
- `scripts/seed/samples.ts` `pickNoGpsSample()` — `with-gps/` 후보를 먼저
  쓴다(`patchLocation`은 부르지 않으므로 좌표는 안 심긴다).
- `scripts/seed/exif.ts` `patchDate()` — IFD0의 `DateTime`(0x0132)도 함께
  덮어쓴다(세 날짜 태그 일치, 정석). no-gps 문제의 직접 해결은 아니었으나
  유익한 강화.

### 문서

- `data-model.md` §3.4 (`VISION_PHOTO_LIMIT` 실측), `src/vision/select.ts`
  상수 주석 — 갱신 완료.
- Maestro: `generate-diary.yml`·`diary-character-select.yml`의 stale
  (014 이후) 수정, `photo-selection-over-limit.yml` 신규 + `FLOWS` 등록.
- AGENTS.md 023 절, `docs/roadmap/README.md` 2·8번 — 갱신.
- `content://` 다수 아님 → 분류 최적화 불필요(현재 게이트로 충분).
