# Data Model: 안드로이드 배터리 예외 인지

## BatteryExceptionStatus

`"exempt" | "restricted" | "unknown"` — 읽은 순간의 값. **저장하지 않는다**(매번 읽는다).

| 값 | 의미 | 읽는 방법 |
|---|---|---|
| `exempt` | 배터리 사용 「제한 없음」 — 백그라운드가 화면이 꺼진 채에도 쓴다(079) | `isBatteryOptimizationEnabledAsync() === false` |
| `restricted` | 예외 없음 | `isBatteryOptimizationEnabledAsync() === true` |
| `unknown` | 읽지 못함 — 호출 실패·iOS | 던짐 또는 iOS |

## 알림 지연

`reminderDelayFor(status)` → `number`(분): `exempt` → 30, 그 밖 → 0. 순수 함수. 상수 `REMINDER_DELAY_MINUTES = 30`(사람이 정한 값).

`planReminders({ now, settings, writtenDays, name, delayMinutes })`:
- 불변식: `0 ≤ delayMinutes < 60`인 정수, 아니면 `RangeError`.
- `ReminderPlanEntry.at = 정각 + delayMinutes·60000`. `id`·`day`·`title`은 지연과 무관(정각 기준).
- 정각이 지났어도 `at`이 `now` 뒤면 오늘 발화로 계획에 든다(`at <= now`일 때만 건너뜀).

## 권한 꼬리표

`PermissionFacts.battery: BatteryExceptionStatus`, `TaggedPermission += "battery"`.

| battery | 꼬리표 |
|---|---|
| `exempt` | `allowed` (허용됨) |
| `restricted` | `denied` (허용 안 함) |
| `unknown` | `unread` (꼬리표 없음) |

## 홈 안내 (BatteryNotice)

상태 머신(훅 안의 메모리 상태, 저장하지 않음):

```
hidden ──onAutoWriteSaved & shouldShow──▶ shown
shown  ──dismiss──▶ hidden (닫은 시각 기록)
shown  ──AppState active & status≠restricted──▶ hidden (기록 없음)
shown  ──새 자동 쓰기 저장(이미 shown)──▶ shown (그대로)
```

`shouldShowBatteryNotice({ platform, status, dismissedAt, now })`:
- 안드로이드이고 `status === "restricted"`이며
- `dismissedAt`이 `null`(닫은 적 없음)이거나 `now − dismissedAt ≥ 7일`이고(`dismissedAt`이 미래 값이면 보이지 않는다 — 시계가 뒤로 간 경우 모르는 것으로 본다)
- 기록을 읽지 못한 것(`"unreadable"`)이 아니면 참.

## 닫은 시각 기록

`files/preferences/battery-notice-dismissed.json` — `{ "at": number }`(epoch ms). 하나뿐이고 새 닫음이 이전 것을 덮는다. 읽기 결과: `number`(닫은 시각) / `null`(기록 없음·깨짐) / `"unreadable"`(통로 예외).
