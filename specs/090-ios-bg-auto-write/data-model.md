# Data Model — 090

## 시도 기록 줄 (`preferences/auto-write-attempts.json`, 078)

```json
{ "items": [ { "at": "2026-10-19T02:10:00.000Z", "path": "background", "outcome": "started", "launch": "background" } ] }
```

| 필드 | 값 | 변경 |
| --- | --- | --- |
| `at` | ISO 시각 | 그대로 |
| `path` | `background`·`app-open`·`manual` | 그대로 |
| `outcome` | 078 열넷 + **`expired`** | 갈래 하나 추가 |
| `launch` | `active`·`background` (옵셔널) | **새 필드** — 백그라운드·수동의 시작 줄에만. 끝남으로 바뀌어도 남는다 |

- 읽기: `launch`가 없거나 두 값 밖이면 그 필드 없이 읽는다(옛 줄·옛 빌드 호환). 옛 빌드는 `expired` 줄을 모르는 갈래로 버린다(081과 같은 수용).
- `expired` 줄: `path: background`, `at`은 만료 시각, `launch` 없음. 바로 앞 줄 합치기 규칙(같은 경로·결과면 시각만 갱신)은 그대로 적용된다.

## 따라잡기 몫 (`preferences/auto-write-catch-up.json`, 078)

모양 그대로(`{"on": "YYYY-MM-DD"}`). 쓰는 때만 바뀐다: 창 밖 백그라운드 판정이 `write`일 때.
