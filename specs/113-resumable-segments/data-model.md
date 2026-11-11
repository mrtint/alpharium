# Data Model

## 재개 기록 `SegmentedResume` (`state.json`의 `segmented[]`)

| 필드 | 뜻 | 규칙 |
|---|---|---|
| `assetKey` | 자산 | 자산당 항목 하나. `paused`와 상호배타 |
| `totalBytes` | 전체 크기 | > 0. 받기 시작 때 서버가 알려 준 값 |
| `segmentCount` | 구간 수 | 정수 > 0. 재개 전 정합 판정(`resume.ts`)에서 `planSegments(totalBytes).segments.length`와 같아야 한다 |
| `doneIndices` | 끝난 구간 번호 | 오름차순, 중복 없음, 각 0 ≤ i < `segmentCount` |

- 읽을 때(`storage.ts`, 형태 검사만 — `plan.ts`를 import하지 않는다) `totalBytes`·`segmentCount`가 양의 정수이고 `doneIndices`가 위 규칙을 지키는지 본다. 어기거나 옛 형식(`receivedBytes`)이면 그 항목을 버린다. 계획과의 일치는 재개 전에 `resume.ts`가 본다.
- 구간 오프셋은 저장하지 않는다(`planSegments(totalBytes)`로 복원). 속도·시간도 저장하지 않는다(원칙 IV).

## 상태 전이

- 처음 받기 → 첫 구간이 끝날 때 항목 생성 → 구간이 끝날 때마다 `doneIndices` 추가 → 모든 구간이 끝나고 지문 검증이 끝나면 항목 삭제(`withoutAsset`).
- 실패·멈춤 → 항목 유지. 다음 `prepare`가 정합을 보고 이어받거나 버린다.
- 어긋남(정합 판정 실패) → 항목과 부분 파일 삭제 → 처음부터.
- 지우기(FR-010) → `withoutAsset`이 항목을, 파일 정리가 구간 임시 파일을 지운다(기존 동작).
