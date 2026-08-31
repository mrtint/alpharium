# Phase 1 데이터 모델: 모델 병렬·동시 내려받기

003 `types.ts`의 「안쪽 값 / 바깥쪽 값」 경계를 이어받는다. 세그먼트 관련 타입은 전부
**안쪽 값**이다 — 화면으로 나가지 않는다.

---

## 경계 요약

| 값                                  | 안/바깥 | 화면에 나가나    | 어디에 산다                           |
| ----------------------------------- | ------- | ---------------- | ------------------------------------- |
| `Segment`                           | 안      | ✗                | `segmented/plan.ts` 계산 결과, 메모리 |
| `SegmentPlan`                       | 안      | ✗                | 〃                                    |
| `SegmentedResume`                   | 안      | ✗                | `state.json`의 `segmented[]`          |
| `RangeSupport`                      | 안      | ✗                | 탐지 결과, 메모리                     |
| 동시 슬롯 `Map<Character, handle>`  | 안      | ✗                | `acquisition.ts` 메모리               |
| `DownloadProgress` (003, 무변경)    | 바깥    | ✓ (`fraction`만) | 콜백                                  |
| `DownloadView.active` (배열로 확장) | 바깥    | ✓                | `download-view.ts` 결과               |
| `DownloadRejection` (003, 무변경)   | 바깥    | ✓                | 〃                                    |
| `ModelReadiness` (003, 무변경)      | 바깥    | ✓                | `readiness.ts` 결과                   |

---

## 신규 타입 — `src/models/segmented/types.ts`

### `Segment`

한 구간. `planSegments()`가 결정론적으로 만든다.

| 필드    | 타입     | 뜻                                                             |
| ------- | -------- | -------------------------------------------------------------- |
| `index` | `number` | 0부터. 파일 내 순서                                            |
| `start` | `number` | 바이트 오프셋(포함)                                            |
| `end`   | `number` | 바이트 오프셋(포함). HTTP `Range: bytes=start-end`와 동일 규약 |

**불변식**: 구간들은 `[0, totalBytes-1]`을 빈틈·겹침 없이 덮는다. `end - start + 1`이 그
구간의 크기.

### `SegmentPlan`

| 필드         | 타입        | 뜻                                                  |
| ------------ | ----------- | --------------------------------------------------- |
| `totalBytes` | `number`    | 파일 전체 크기                                      |
| `segments`   | `Segment[]` | 길이 = `SEGMENT_COUNT` (또는 파일이 작으면 그 이하) |

### `SegmentedResume` — **`state.json`에 저장되는 유일한 세그먼트 값**

| 필드            | 타입       | 뜻                                                                    |
| --------------- | ---------- | --------------------------------------------------------------------- |
| `assetKey`      | `AssetKey` | 어느 자산                                                             |
| `totalBytes`    | `number`   | 재개 계획을 복원하는 데 필요(서버 값이 바뀌면 지문 검증이 잡는다)     |
| `segmentCount`  | `number`   | 〃. `SEGMENT_COUNT`가 나중에 바뀌어도 재개는 저장 당시 값으로         |
| `receivedBytes` | `number[]` | 길이 = `segmentCount`. `receivedBytes[i]` = 구간 i가 이미 받은 바이트 |

**저장하지 않는 것**: 구간 오프셋(`planSegments(totalBytes, segmentCount)`로 재구성).
경과 시간·속도(원칙 IV). `url`(로스터가 준다).

**`PausedDownload`(003)와 상호배타** — 한 `assetKey`는 `paused[]`나 `segmented[]` 중 한
곳에만 있다. `withSegmentedResume`가 `paused`에서 같은 키를 제거하고, `withPaused`가
`segmented`에서 제거한다.

### `RangeSupport`

탐지 결과. 밖으로 나가지 않는다.

```
type RangeSupport =
  | { kind: "supported"; totalBytes: number }
  | { kind: "unsupported" }   // Accept-Ranges 없음 / Content-Length 없음 / 애매함
```

---

## 확장되는 기존 타입

### `ModelState` — `src/models/storage.ts`

```
type ModelState = {
  verdicts: VerificationVerdict[];
  paused: PausedDownload[];
  segmented: SegmentedResume[];   // ← 추가
};
```

`readState`의 파싱: `Array.isArray(parsed.segmented) ? parsed.segmented : []` (기존 필드와
동형 — 없거나 깨지면 빈 배열). **기존 `state.json`에 `segmented` 키가 없어도 안전** — 옛
파일은 `paused`/`verdicts`만 가지며 그대로 읽힌다(마이그레이션 불필요).

신규 헬퍼(기존 `withVerdict`/`withPaused`/`withoutAsset` 옆):

| 함수                                 | 하는 일                                      |
| ------------------------------------ | -------------------------------------------- |
| `segmentedFor(state, key)`           | `SegmentedResume \| null`                    |
| `withSegmentedResume(state, resume)` | 갈아 끼운다. **같은 키를 `paused`에서 제거** |
| `withoutSegmented(state, key)`       | `segmented`에서만 제거                       |
| `withoutAsset(state, key)`           | (기존) `segmented`도 함께 비우도록 확장      |

### `ReadinessInput` — `src/models/readiness.ts`

```
type ReadinessInput = {
  // ... 기존 필드 ...
  segmentedResume?: SegmentedResume | null;   // ← 추가 (옵셔널, 003 테스트 회귀 방지)
};
```

**판정 순서에 삽입** (`readinessOf`, 파일 없음 분기 안):

```
if (!file.exists) {
  if (paused !== null) return { kind: "partial", reason: interrupted, resumable: true };
  if (segmentedResume != null) return { kind: "partial", reason: interrupted, resumable: true };  // ← FR-023
  if (hasPartialFile) return { kind: "partial", reason: interrupted, resumable: false };  // ← FR-026
  return { kind: "not-downloaded" };
}
```

`paused`와 `segmentedResume`는 상호배타이므로 순서는 무관하지만, 방어적으로 `paused` 먼저.

### `DownloadView` — `src/models/types.ts`

```
type DownloadView = {
  active: DownloadProgress[];   // ← DownloadProgress | null 에서 변경
  notice: DownloadRejection | null;   // (무변경)
};
```

**불변식** (008에서 유지 + 확장):

1. `notice`는 하나뿐(배열 아님) — 쌓이지 않는다.
2. `active`의 어느 원소도 `notice.requested`와 같은 `character`를 갖지 않는다(008 FR-010의
   배열 대응).
3. `active`에 시간·속도·바이트·구간 정보가 없다 — `DownloadProgress`가 담지 않으므로.
4. `active`의 `character`는 유일하다(같은 캐릭터가 두 번 나오지 않는다).

### `DownloadProgress` — **변경 없음**

```
type DownloadProgress = { character: Character; fraction: number | null };
```

세그먼트 병렬이어도 `fraction`은 `mergeProgress(receivedBytes[], totalBytes)` 하나로 합쳐
나온다. 구간 개수·구간별 값이 여기 들어갈 자리가 **타입 수준에서** 없다(원칙 III·IV).

### `DownloadFailure` / `DownloadRejection` — **변경 없음**

`busy` 갈래의 **의미만** 좁아진다(같은 캐릭터 중복). 타입은 그대로.

---

## 신규 상수 — `src/models/segmented/plan.ts`

| 상수                | 값(잠정)          | 근거                                                               | 확정        |
| ------------------- | ----------------- | ------------------------------------------------------------------ | ----------- |
| `SEGMENT_COUNT`     | `4`               | research §3 — 모바일 4병렬이 이득 대부분, 6모델×4=24 커넥션이 상한 | 실기기 T0xx |
| `MIN_SEGMENT_BYTES` | `8 * 1024 * 1024` | research §3 — 이하는 요청 오버헤드가 이득을 앞지름                 | 실기기 T0xx |

둘 다 `readonly` 리터럴. 계약 테스트 `segmented-plan.test.ts`가 `readFileSync`로 소스를 읽어
값·`readonly`·`as const`를 검사(FR-030). 위반 주입: 값을 바꾸면 테스트 실패(SC-011).

---

## 순수 함수 시그니처 — `src/models/segmented/plan.ts`

| 함수                | 시그니처                                                          | 하는 일                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planSegments`      | `(totalBytes: number, count?: number) => SegmentPlan`             | `[0, totalBytes-1]`을 `count`(기본 `SEGMENT_COUNT`) 구간으로 균등 분할. `totalBytes < MIN_SEGMENT_BYTES * 2`면 `count = 1`(단일). 나머지 바이트는 마지막 구간에         |
| `remainingSegments` | `(resume: SegmentedResume) => Segment[]`                          | 저장된 `totalBytes`/`segmentCount`로 계획 복원 후, 각 구간의 남은 Range(`start + receivedBytes[i]` ~ `end`). `receivedBytes[i] >= 구간크기`면 그 구간은 제외(이미 완료) |
| `mergeProgress`     | `(receivedBytes: number[], totalBytes: number) => number \| null` | `Σ receivedBytes / totalBytes`, `[0,1]` 클램프. `totalBytes <= 0`이면 `null`(003 `fractionOf`와 동형 — 모름을 지어내지 않는다)                                          |
| `isComplete`        | `(receivedBytes: number[], plan: SegmentPlan) => boolean`         | 모든 구간이 자기 크기만큼 받았는가                                                                                                                                      |
| `remainingCapacity` | `(expectedBytes: number, receivedSoFar: number) => number`        | `max(0, expectedBytes - receivedSoFar)`. §6 공간 판정용                                                                                                                 |

전부 `Date`·난수·파일 안 씀. 인자만 본다(023 `select.ts`, 020 `src/schedule/` 전례).

---

## 상태 전이 — 세그먼트 다운로드 한 건

```
                 planSegments(totalBytes)
   [시작] ──────────────────────────────────▶ [N구간 병렬 수신]
                                                    │
              ┌─────────────────────────────────────┼──────────────────────┐
              ▼                                     ▼                      ▼
     모든 구간 완료                         사용자 "멈추기"            구간 하나 실패
     isComplete = true                            │                      │
              │                        writeState(segmented[])           │
              ▼                                    │            (다른 구간 취소)
     조각이 오프셋에 이미 기록됨                     ▼                      ▼
     = 병합 완료                          [partial + resumable]    { failed }
              │                                    │                      │
              ▼                          "이어받기" 누름                  │
     contentHash → 지문 검증                        │                      │
              │                        remainingSegments(resume)          │
        ┌─────┴─────┐                              │                      │
        ▼           ▼                              ▼                      │
     passed      불일치                   [남은 구간부터 병렬 수신] ◀──────┘
        │           │                              │
        ▼           ▼                    (위 흐름으로 합류)
   { completed }  파일 삭제
   withoutSegmented  { verification-failed }
```

**앱 강제 종료 시**: `writeState(segmented[])`를 못 부른다 → 부분 파일만 남음 →
`readiness.ts`가 `partial + resumable: false` → 처음부터 다시(FR-026).

---

## `state.json` 예시 (확장 후)

```json
{
  "verdicts": [
    { "assetKey": "a1", "verifiedMd5": "d850...", "verifiedBytes": 1522796768, "passed": true }
  ],
  "paused": [],
  "segmented": [
    {
      "assetKey": "a2",
      "totalBytes": 1644918272,
      "segmentCount": 4,
      "receivedBytes": [411229568, 411229568, 200000000, 0]
    }
  ]
}
```

`a1`은 받아서 검증됨. `a2`는 세그먼트 재개 대기(구간 0·1 완료, 2 진행 중, 3 미시작).
`paused`는 비어 있음 — `a2`가 `segmented`에 있으므로 `paused`에 있을 수 없다(상호배타).
