# Data Model: 105

- **ScheduleDecision.act:true**: `{ act: true; day: DayDate; days: readonly DayDate[] }` — `days`는 일기 없는 후보 날 최근→과거, `day === days[0]`.
- **AutoWriteDecision**: 형태 불변(`idle` / `write{day}` / `skip{day, because}`). `skip no-material`의 day = 첫 후보.
- **AutoWriteAttempt**: `day?: DayDate` 추가(`YYYY-MM-DD` 형식만 읽음, 아니면 없음). 직렬화는 `day`가 있을 때만 쓴다. `ATTEMPT_OUTCOMES` 목록은 불변.
- **BodyOutcome (task.ts)**: `{ result; outcome; day? }`.
- 새 파일·새 저장소 없음.
