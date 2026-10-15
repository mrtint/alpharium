# Data Model — 085 쓸 차례 알림

새 저장 파일은 없다(FR-018). 예약 상태는 운영체제의 알림 예약표에 있다.

## ReminderPlanEntry — 계획 한 줄 (순수 값)

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | `string` | `"diary-reminder-" + day`. 접두사 `REMINDER_ID_PREFIX = "diary-reminder-"`가 「이 기능이 건 것」을 가르는 유일한 규칙이다 |
| `day` | `DayDate` | 그 발화가 겨냥하는 날(그 날 몫) |
| `at` | `number` | 울릴 시각(ms). 목표 시의 정각(로컬)이고 `now`보다 뒤다. 알림 `data.at`과 DATE 트리거의 `date`에 같은 값이 들어간다 |
| `title` | `string` | `reminderTitle(name, day)` — 「{이름}{이/가} {M}월 {d}일 일기를 쓸 차례예요」 |

- 발화일 `X`의 그 날 몫은 `includesTodayAtHour(targetHour)`가 참이면 `X`, 거짓이면 `X - 1일`이다.
- 같은 `day`는 두 번 나오지 않는다. 발화일과 그 날 몫은 일대일이다.
- 한 번에 최대 7개다. 첫 발화는 오늘 목표 시각이 `now`보다 뒤면 오늘, 아니면 내일이다. 이미 쓴 날은 빠진다.

## ScheduledReminder — 운영체제가 들고 있는 우리 예약 (통로가 읽어 준 값)

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | `string` | 접두사로 거른 것만 |
| `day` | `DayDate \| null` | `content.data.day`. 모양이 아니면 `null` |
| `at` | `number \| null` | `content.data.at`. 숫자가 아니면 `null` — 예약표의 트리거로 되읽지 않는다(iOS는 간격만 남는다, research R2) |
| `title` | `string \| null` | `content.title` |

같은 것의 기준: `id`·`at`·`title`이 모두 계획 한 줄과 같으면 「걸려 있다」다(research R16). 하나라도 다르거나 `null`이면 취소하고 다시 건다.

## PresentedReminder — 트레이에 떠 있는 우리 알림

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | `string` | 요청 id(접두사로 거름) |
| `day` | `DayDate \| null` | `data.day`. `null`이면 거둔다(어느 날인지 모르는 우리 알림) |

## 알림 내용의 `data`

| 알림 | `data` |
| --- | --- |
| 완성 알림(020·057) | `{ day }` — 그대로 |
| 쓸 차례 알림 | `{ day, kind: "write-reminder", at }`. `kind`는 앞쪽 숨김(FR-021)과 누름 판별(FR-023)에 쓰고, 라우팅(020)은 `day`만 읽는다 |

## 안드로이드 채널

| id | 이름 | 중요도 |
| --- | --- | --- |
| `diary-completed` | 「일기 완성 알림」(기존) | HIGH |
| `diary-reminder` | 「일기 쓸 시각 알림」(새) | DEFAULT(헤드업 없음 — 소유자 결정 2026-10-15) |

## 맞추기 입력 (deps)

| 이름 | 「읽지 못함」 | 「없음」 |
| --- | --- | --- |
| 설정 | 던짐 → 아무것도 바꾸지 않음 | 파일 없음 → 기본값(꺼짐) |
| 일기 목록 | 던짐 → 아무것도 바꾸지 않음 | `[]` |
| 표시 이름 | 캐릭터를 못 읽으면 첫 실행 기본 캐릭터(홈과 같다) | 선택이 없으면 첫 실행 기본 캐릭터 — `null`은 순수 계획의 방어로만 남는다(RP8) |

## 상태 전이 — 날 D의 쓸 차례 알림

```text
(계획에 듦) ──맞추기──▶ 예약됨 ──발화(OS)──▶ 트레이 ──누름(OS가 걷음, 「한 번」 다시 엶)──▶ 없음
                         │                       │
       D가 써짐·꺼짐·시각/이름 바뀜          D가 써짐·꺼짐·사흘 밖
                         ▼                       ▼
                    취소(맞추기)             거둠(맞추기)
앞에 있을 때 발화 ──▶ 보이지 않음(FR-021)
```
