# Data Model: 자동 쓰기 시도의 날짜별 장부

## 시도 줄 (`AutoWriteAttempt`, 불변)

`at: Date` · `path: "background"|"app-open"|"manual"` · `outcome: AttemptOutcome(15갈래)` · 선택 `launch`·`wake`·`day`. 직렬화는 `at`을 ISO 문자열로. **이 필드 밖은 저장하지 않는다**(FR-005, 계약 테스트).

## 날 장부 파일

`<문서>/attempt-ledger/YYYY-MM-DD.json` = `{ "items": [시도 줄…] }`, **시간순**(오래된 줄이 앞, 덧붙임). 파일 이름이 날짜 키(`dayOf(at)`). 임시 `*.json.writing`을 쓰고 옮긴다.

규칙(기록 함수):

| 함수 | 동작 |
|---|---|
| `recordAttemptStart(port, path, at, launch?, wake?)` | `dayOf(at)` 파일에 `started` 줄을 덧붙임 |
| `recordAttemptEnd(port, path, at, outcome, day?)` | 같은 `at`·`path`의 줄이 있으면 결과로 교체(`day` 추가). 없으면: 마지막 줄이 `app-open`이고 경로·결과·`day`가 같으면 시각만 갱신, 아니면 덧붙임 |
| `recordAttemptExpired(port, at)` | `dayOf(at)` 파일에 `background`/`expired` 줄을 덧붙임(합치지 않음) |

## 날짜별 요약 (파생, 저장 안 함)

`DaySummary = { day, wakes, firstAt?, lastAt?, unfinished, byOutcome }`

- 입력: 그 날 파일의 줄 중 `path === "background"`
- `wakes` = `outcome !== "expired"`인 줄 수 · `unfinished` = `outcome === "started"` 줄 수
- `firstAt`/`lastAt` = 위 `wakes` 줄의 최소/최대 `at`(없으면 없음)
- `byOutcome` = `started`·`expired` 제외 갈래별 줄 수
- 범위 `summaryDays(earliest, today, 14)` = 가장 이른 장부 날부터 오늘까지 최대 14일, 파일 없는 날은 빈 요약(wakes 0)
