# Data Model: 128

- `PhotoFacts`(signals/port.ts): + `filename?: string`, `width?: number`, `height?: number` — 모르면 없음(`null`→`undefined`).
- `Photo`(signals/types.ts): 같은 세 필드 이월.
- `PhotoVision`(vision/types.ts): + `unreadable: number` — 문서류로 거른 장 수(화면 캡처 + 문서 묘사). `considered`(고른 수)는 그대로. 불변식: `captions.length + unreadable ≤ considered`.
- 일기 `entry.photos`: 형식 불변. 거른 장은 들어가지 않는다.
