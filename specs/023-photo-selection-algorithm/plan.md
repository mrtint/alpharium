# Implementation Plan: 사진 선별 알고리즘 고도화 — 잡사진 거르기·시간 분포 선별·상한 확장

**Branch**: `023-photo-selection-algorithm` | **Date**: 2026-08-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/023-photo-selection-algorithm/spec.md`

## Summary

VLM에 넘길 사진을 고르는 방식을 세 축으로 바꾼다.

1. **잡사진 필터링** — 각 사진을 파일 경로의 상위 폴더 이름으로 "카메라 원본 /
   잡사진(스크린샷·다운로드·메신저) / 분류 불가"로 나누고, 잡사진을 선별
   대상에서 뺀다. 카메라 원본이 0장이면(또는 전부 분류 불가면) 필터링 전 원본
   목록으로 되돌린다.
2. **시간 분포 선별** — 목록 인덱스 균등(011) 대신, 하루(04:00 경계)를 6개
   고정 시간 칸으로 나누고 "사진 있는 칸마다 최소 1장 + 남은 예산을 칸별 사진
   수에 비례(최대 잔여법) 배분"한다. 칸 안에서는 011 R2 방식으로 시각 균등.
3. **상한 확장** — 013 리사이즈로 장당 캡션 시간이 크게 줄어 5장 상한의 근거가
   낡았다. 시간(180초 한도)·컨텍스트(`n_ctx`) 두 물리 한계를 실기기에서 재고
   작은 쪽에서 여유를 뺀 값을 새 `VISION_PHOTO_LIMIT`으로 정한다.

분류·선별 로직은 `src/vision/select.ts`의 순수 함수로 들어가고(인자는 사진
목록 하나 — 011 S1 유지), 폴더 이름은 `PhotoFacts`·`Photo`에 선택적 필드로
실려 선별 이전에 도착한다. `expo-port.ts`는 경로에서 폴더 이름만 뽑고 잡사진
판정은 하지 않는다(헌법 경계).

## Technical Context

**Language/Version**: TypeScript (React Native 0.86, Expo 57)

**Primary Dependencies**: `expo-media-library`(기존 — `getUri()`/`exeForMetadata()`
재사용, 신규 API 없음), 기존 `src/vision/`·`src/signals/`·`src/inference/`·
`src/config/` 계층. 신규 의존 없음.

**Storage**: 해당 없음. 이 기능은 영속 데이터를 추가하지 않는다 —
`PhotoFacts`·`Photo`에 더하는 `folderName`은 신호 수집 중에만 존재하는
휘발성 필드이며 `DiaryEntry`에 저장되지 않는다.

**Testing**: `npm run test:logic`(순수 로직, node 환경) — 분류·시간 분포
선별·최대 잔여법·되돌림이 전부 `select.ts`의 순수 함수라 `.ts` 스위트.
`PhotoFacts` 확장이 004 신호 수집 경로를 깨지 않는지(`collect.test.ts`),
`selectForVision` 선언에 둘째 인자·상수 export가 없는지(소스 직접 읽기)
계약 테스트. 헌법 검사(`check-constitution` 스위트)에 새 경계 3종 + 위반
주입. 실기기는 `npm run test:device`(Maestro) — 새 네이티브 모듈이 아니므로
debug 1회로 충분(AGENTS.md·012 기준). 상한 값 실측은 quickstart D1·D3
(실기기 `adb logcat`).

**Target Platform**: Android 실기기(dev/prod). 1차 실측 기기 SM-S901N
(Galaxy S22, Android 16 / SDK 36).

**Project Type**: 모바일 앱(단일 프로젝트, Expo/React Native).

**Performance Goals**: 이 저장소는 성능을 자동으로 재는 코드를 두지
않는다(원칙 IV). "이득"의 확인은 (a) 잡사진이 섞인 하루에서 캡션 대상에
잡사진이 안 들어가는지(SC-001), (b) 사진이 몰린 하루에서 다른 시간대가
대표되는지(SC-003)를 quickstart에서 사람이 관찰하는 것으로 한다. 상한
확장의 시간·컨텍스트 여유는 quickstart D3가 `adb logcat`으로 잰다.

**Constraints**:
- 011 S1 — `selectForVision()`의 인자는 사진 목록 하나. 상한·칸 개수·폴더
  목록을 밖에서 정하지 못한다. 선언을 소스에서 직접 읽어 검증.
- 011 S1 (상한 미노출) — `VISION_PHOTO_LIMIT` 숫자는 `select.ts` 밖으로
  export하지 않는다. "닿았는가"는 `reachedVisionLimit()`.
- 006 FR-037a / 011 R6 — 선별은 결정적. `Date.now()`·`Math.random()` 안
  읽음. 같은 하루 → 같은 사진.
- 원칙 IV — 분류가 픽셀·이미지 채점·품질 점수에 닿지 않는다. 헌법 검사가
  `src/vision/`에서 이를 막는다.
- 원칙 V — 잡사진 폴더 목록·시간 칸 개수·상한은 사람이 못 박은 상수. 코드가
  분포를 보고 정하지 않는다.
- 004 FR-005a — 한 장의 분류 실패(경로 못 얻음)가 하루를 무너뜨리지 않는다.
  "분류 불가"는 선별에서 남긴다.
- 013 — 선별된 사진이 캡션 전에 리사이즈되는 파이프라인 순서는 그대로.
- `expo-port.ts` 경계 — 폴더 이름 추출(문자열 처리)까지만. 잡사진 판정은
  순수 계층.

**Scale/Scope**: 수정 파일 —
- `src/vision/select.ts` (분류 + 시간 분포 선별 + 최대 잔여법 + 되돌림, 전부
  순수 함수. `selectForVision` 시그니처 불변)
- `src/signals/types.ts` (`Photo`에 `folderName?`)
- `src/signals/port.ts` (`PhotoFacts`에 `folderName?`)
- `src/signals/expo-port.ts` (`photosBetween()`가 폴더 이름 채움)
- `src/signals/collect.ts` (`usablePhotos()`가 `folderName` 이월)
- `src/inference/on-device.ts` (변경 최소 — `selectForVision()` 호출은
  그대로, `folderName`이 `Photo`에 이미 실려 오므로 배선 불필요.
  `reachedVisionLimit()` 인자만 확인)
- `scripts/constitution-rules.ts` (새 경계 2종)
- `src/inference/`의 llama 설정 (상한 값 — quickstart D3 후)

신규 파일 없음(단, `select.ts`가 커지면 분류를 `src/vision/classify.ts`로
분리 검토 — 아래 「구조 결정」).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능이 지키는 방식 | 게이트 |
|---|---|---|
| **I. 온디바이스가 제품이다** | 프롬프트·샘플링·판정 갈래를 바꾸지 않는다. 캡션·생성 경로는 013·011 그대로 — 이 기능은 "무엇을 캡션할지"만 바꾼다. | PASS |
| **II. 화자는 휴대폰이고 시야는 좁다** | `prompt.ts`를 건드리지 않는다. 선별이 하루를 더 고르게 대표하면 오히려 "아침만 본 채 하루를 쓴다"(011이 경계한 상태)를 줄인다. | PASS |
| **III. 모델은 캐릭터다** | 캐릭터·모델에 무관. `select.ts`는 `roster.ts`/`persona.ts`를 import하지 않는다(이미 그렇다). | PASS |
| **IV. 측정 장치를 제품에 들이지 않는다** | 분류는 폴더 이름 문자열 대조뿐 — 픽셀·채점 없음. 시간 분포는 사진 수 세기와 산술(최대 잔여법)뿐. 상한은 두 물리 한계 안에 드는 최대치를 찾는 단일 질문(여러 후보 품질 비교 아님). 헌법 검사가 `src/vision/`에서 픽셀·채점 어휘를 새로 막는다. | PASS |
| **V. 관측된 사실과 추측을 구분한다** | 잡사진 폴더 목록·시간 칸 개수·상한 전부 `readonly` 상수(012·021 선례). 코드가 분포를 보고 임계값을 만들지 않는다. "분류 불가"와 "잡사진 아님"을 값에서 구분(진단용) — 004의 none/unknown 계열. | PASS |
| **선별 결정성 (011 R6, 006 FR-037a)** | `select.ts`는 `Date.now()`·`Math.random()`을 안 읽는다. 시간 칸은 `Photo.takenAt`에서 순수 유도(그 하루의 04:00 기준 경과 시간). 동점은 사진 수 → 이른 칸 순으로 고정. | PASS |
| **011 S1 (인자 하나·상한 미노출)** | `selectForVision(photos)` 시그니처 불변. `VISION_PHOTO_LIMIT`·칸 개수·폴더 목록 전부 파일 로컬, export 안 함. `reachedVisionLimit()`만 밖으로. | PASS |
| **004 FR-005a (한 장 실패가 하루를 안 무너뜨림)** | 폴더 이름을 못 얻은 사진은 `folderName: undefined` → "분류 불가" → 선별에서 남김. 전부 그러면 필터가 no-op로 degrade. | PASS |
| **경계: `expo-port.ts`** | 폴더 이름 추출(마지막 `/` 앞 세그먼트)까지만. 잡사진 목록 대조는 `select.ts`. 헌법 검사가 `expo-port.ts`에서 폴더 목록·잡사진 판정 어휘를 막는다. | PASS, 아래 「구조 결정」 |

**초기 게이트 통과 — 위반 없음. Complexity Tracking 불필요.**

### Phase 1 재점검 (설계 후)

Phase 1 산출물(data-model.md, contracts/, quickstart.md)을 쓴 뒤 다시 확인:

- `PhotoFacts.folderName?`가 선택적이고 004 경로가 읽지 않음 → 원칙 V의
  "값을 기본값으로 채우지 않는다" 위반 아님(`undefined`는 "분류 불가"라는
  명시적 의미). PASS.
- 시간 칸 유도 함수가 `day-boundary.ts`를 import하지 않고 `takenAt`만으로
  계산 → `select.ts`의 "기기를 모른다·시각을 읽지 않는다"(순수) 유지. PASS.
- 헌법 검사 새 규칙이 `resize.ts`(정당한 이미지 처리 계약)를 오탐하지 않음 —
  규칙을 픽셀 디코드·채점 어휘로 좁히고 위반 주입으로 확인. PASS (contracts에
  규칙 문구 확정).

**Phase 1 재점검 통과.**

## Project Structure

### Documentation (this feature)

```text
specs/023-photo-selection-algorithm/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물 (완료)
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/           # Phase 1 산출물
│   ├── classification.md    # 폴더 이름 → 분류, 되돌림 규칙
│   ├── time-distribution.md # 시간 칸·최소 커버리지·최대 잔여법 배분
│   └── constitution-guard.md # 헌법 검사 새 규칙 2종 + 위반 주입
└── tasks.md             # Phase 2 산출물 (/speckit-tasks, 이 명령 아님)
```

### Source Code (repository root)

이 저장소는 확립된 단일 구조를 쓴다(AGENTS.md 「코드를 어디에 두는가」).

```text
src/
├── vision/
│   ├── select.ts          # [수정] classifyPhotos()·distributeByTime() 순수 함수 추가.
│   │                        #        selectForVision(photos)이 이 둘을 조립.
│   │                        #        시그니처 불변. VISION_PHOTO_LIMIT·BUCKET_COUNT·
│   │                        #        NON_CAMERA_FOLDERS 전부 파일 로컬 상수.
│   └── (classify.ts)       # select.ts가 너무 커지면 분류만 분리 — Phase 1에서 결정
├── signals/
│   ├── types.ts           # [수정] Photo에 folderName?: string
│   ├── port.ts            # [수정] PhotoFacts에 folderName?: string
│   ├── expo-port.ts       # [수정] photosBetween()이 경로에서 폴더 이름 뽑아 채움
│   └── collect.ts         # [수정] usablePhotos()가 folderName 이월
└── inference/
    ├── on-device.ts       # [수정 최소] selectForVision() 호출 그대로.
    │                        #             reachedVisionLimit() 인자 확인.
    └── (llama 설정 파일)   # [수정] VISION_PHOTO_LIMIT 최종값 — quickstart D3 후

scripts/
└── constitution-rules.ts  # [수정] checkVisionFile에 픽셀·채점 어휘 규칙 추가.
                            #        expo-port.ts가 잡사진 판정을 못 하게 하는 규칙.

__tests__/
├── vision/
│   └── select.test.ts     # [수정] 분류·되돌림·시간 분포·최대 잔여법·결정성·
│                            #        시그니처(둘째 인자·상수 export 없음) 테스트
├── signals/
│   ├── collect.test.ts    # [수정] folderName 이월 확인, 004 경로 회귀 없음
│   └── expo-port.test.ts  # [수정] 폴더 이름 추출(file://·content://·경로 없음)
└── scripts/
    └── check-constitution.test.ts  # [수정] 새 규칙 2종 + 위반 주입 3종
```

**Structure Decision**: 신규 사용자 기능이 아니라 기존 선별 함수
(`selectForVision`)의 내부 알고리즘 교체 + 그 재료(폴더 이름)를 신호 계층에서
실어 나르는 얇은 확장이다. 새 디렉터리를 만들지 않는다. `select.ts` 파일
크기가 순수 함수 3~4개로 커지면(분류 + 시간 칸 유도 + 배분 + 조립) 분류만
`src/vision/classify.ts`로 떼는 것을 Phase 1(data-model)에서 판단한다 —
`checkVisionFile()`이 이미 `src/vision/` 전체를 대상으로 하므로 경계는 파일이
갈려도 유지된다.

## 구조 결정 상세

### 왜 폴더 이름을 `PhotoFacts`에 싣는가

분류에는 파일 경로가 필요한데, 현재 `filePathOf()`는 `captionAll` 안에서
*선택이 끝난 뒤* 개별 사진에만 불린다(research §1). 분류는 **선택 이전**에
전체 후보에 대해 일어나야 하므로, 폴더 이름이 선택 이전에 도착해야 한다.

- **`filePathOf()`를 `select.ts`가 부르게 하면** `select.ts`가 기기에 닿게
  되어 순수성이 깨진다(011 S1·R6 위반).
- **폴더 이름을 `PhotoFacts`에 선택적 필드로 실으면** `expo-port.ts`(기기에
  닿는 유일한 자리)가 채우고, `select.ts`는 이미 실려 온 문자열만 본다.
  011이 `filePathOf()`를 "함수로 둬서 안 부르는 쪽은 경로를 못 얻게" 한 것과
  방향은 같고, 이번엔 선별이 반드시 필요로 하므로 필드로 승격한다.
- **004 신호 수집 경로는 이 필드를 읽지 않는다**(FR-024, SC-009) — 선택적
  필드라 `collectPhotos()`의 동작·타입이 바뀌지 않는다.

### `expo-port.ts`의 경계

`photosBetween()`이 하는 일: `exeForMetadata()` 결과(또는 필요 시
`getUri()`)에서 **마지막 `/` 앞의 폴더 이름 문자열 하나**를 뽑아
`folderName`에 넣는다. `content://...`나 경로가 없으면 `undefined`.

`photosBetween()`이 하지 않는 일: 그 폴더 이름이 "잡사진인가"를 판정하는 것.
잡사진 폴더 목록(`NON_CAMERA_FOLDERS`)은 `select.ts`에만 있고,
`expo-port.ts`는 그것을 import하지 않는다. 헌법 검사가 이 경계를 지킨다
(constitution-guard.md).

### `on-device.ts` 변경이 왜 최소인가

`Photo`에 `folderName`이 실려 오면 `selectForVision(photos.value.photos)`
호출은 **문자 그대로 그대로**다 — `select.ts`가 내부에서 `photo.folderName`을
읽어 분류하고 시간 분포로 배분한다. `on-device.ts`는 그 사이에 아무것도 하지
않는다. `reachedVisionLimit(photos.value.photos.length)`도 그대로(상한 상수만
`select.ts` 안에서 바뀜).

### `AssetMetadata` 경로 유무 (research §5)

구현 시작 시 설치본 타입을 확인해:
- **(a) `AssetMetadata`에 경로/URI가 있으면** `photosBetween()`이 추가 호출
  없이 폴더 이름을 뽑는다.
- **(b) 없으면** 사진마다 `getUri()`를 한 번씩 더 부른다. 수백 장인 하루의
  비용이 크면(quickstart D1 실측), 상한 이하인 하루는 어차피 전부
  캡션하므로(FR-013) 분류를 건너뛰고 상한 초과인 하루에만 분류를 돈다.
  이 최적화는 `on-device.ts`가 아니라 `expo-port.ts` 또는 별도 포트
  메서드에서 하되, 되돌림·"분류 불가" 의미는 동일하게 유지한다.

## 2단계·미결 사항

- **시간 칸 개수**: plan은 6칸(4시간 간격)에서 출발 제안(research §6). 사람이
  구현 단계에서 확정.
- **`VISION_PHOTO_LIMIT` 최종값**: quickstart D3의 실기기 실측 후 확정
  (FR-017a — 시간·컨텍스트 작은 쪽에서 여유 뺌).
- **잡사진 폴더 목록**: quickstart D1에서 `adb logcat`으로 실제 경로 확인 후
  확정(research §3).
- **narrative 상한 검증**: quickstart D3가 시도, 못 하면 미확인 명시(019·020이
  남긴 위험 계열).

## Complexity Tracking

*게이트 위반 없음 — 이 절은 비워 둔다.*
