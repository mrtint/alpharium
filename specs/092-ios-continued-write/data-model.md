# Data Model — 092

- **ContinuedSession**(메모리): `accepted: boolean`, `closed: boolean`, `stage: "prepare" | "photos" | "writing"`, `fraction`(0–0.95). `report`는 `accepted && !closed`일 때만 네이티브에 간다. `finish(ok)`는 한 번만.
- **Beat**: `"photo" | "chunk"` — 그 밖의 필드 없음.
- 저장 파일·기록 형식 변경 없음.
