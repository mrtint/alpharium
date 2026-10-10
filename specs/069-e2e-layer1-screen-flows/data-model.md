# Data Model: 069 층 1

앱의 데이터 모델은 바뀌지 않는다. 이 문서는 도구가 다루는 세 가지 값의 모양이다.

## 1. 기준 상태 항목 (`BaselineEntry`)

| 필드 | 의미 |
| --- | --- |
| `file` | `files/preferences/` 아래 파일 이름 |
| `action` | `write`(내용을 쓴다) / `delete`(지운다) / `keep`(건드리지 않는다) |
| `content` | `write`일 때 JSON 문자열 |
| `reason` | `keep`·`write`의 이유 한 줄 |

규칙: 소스에서 앱이 읽는 설정 파일 이름 집합 ⊆ 항목 `file` 집합(드리프트 가드). 모델 파일(`files/models/`)은 항목에 없다 — 도구는 읽기(존재 점검)만 한다.
상세는 [contracts/baseline-state.md](contracts/baseline-state.md).

## 2. 쓴 날 픽스처 (`FixtureDay`)

| 필드 | 의미 |
| --- | --- |
| `offset` | 오늘로부터 며칠 전(0, 1, 2) |
| `photoCount` | 사진 수(오늘 1, 어제 3, 그제 1) |
| `photoIds` | 고정 식별자 `e2e-<offset>-<n>` (흐름이 `photo-open-<photoId>`로 짚는다) |
| `template` | `scripts/e2e-fixtures/diary/*.json.tmpl` — `DiaryEntry` 모양의 JSON, 날짜·시각 자리에 `{{TODAY}}` 계열 자리표시자 |

생성 결과는 `DiaryEntry`로서 실제 `deserializeEntry`를 통과해야 한다. 규칙:

- `entry.date` = 그 날, `entry.photos.length == photoCount`, `signalsUsed.photos`의 사진 수와 같다.
- `photos[].resizedPath`는 `/data/user/0/<패키지>/files/vision-cache/<파일명>` 형식이다.
- `text`는 사람이 쓴 짧은 글이다(내용 단언 없음). `character`는 `quiet`.
- 사진 사본 파일명은 `entry.photos[].resizedPath`의 파일명과 `scripts/e2e-fixtures/photos/`의 파일이 일치한다.

## 3. 대응표 행 (`FeatureRow`)

| 필드 | 의미 |
| --- | --- |
| `feature` | 주요 기능 이름 |
| `layer1` | 지키는 층 1 흐름 파일들(없을 수 있다) |
| `contract` | 지키는 계약 테스트 파일들(실제로 열어 확인한 것만) |
| `layer2` | 「범위 밖」 표시 |
| `human` | 「사람이 봄」 이유(없으면 비운다) |

별도로 **흐름 인벤토리**: `.maestro/**/*.yml` 파일마다 `FLOWS` 등록 여부·층 1 목록 포함 여부·지키는 기능·(층 1에 안 넣었으면) 이유. 형식과 기계 검사 불변식은 [contracts/flow-map.md](contracts/flow-map.md).
