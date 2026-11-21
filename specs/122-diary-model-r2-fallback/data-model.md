# Data Model — 122

## ModelAsset (안쪽 값, 변경)
| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| key | string | `a1` 불변 |
| url | string | 주 경로(R2) |
| fallbackUrl | string? (신규) | 예비 경로. 없으면 전환 없음. `url`과 달라야 한다 |
| expectedBytes | number | 1,241,435,520 |
| md5 | string | dfc35a88fb1f5215f708ea5a348121b8 |

## SegmentedResume — 변경 없음(경로를 담지 않는다 → 경로 사이에 그대로 이어진다)

## 상태 전이 (prepare)
settle(옛 파일·기록 정리) → 공간 판정 → 주 경로 받기 → {completed→검증 | paused→기록 | failed→(fallbackUrl 있으면) 기록 재정리→예비 받기 → {completed→검증 | paused→기록 | failed→network}}
