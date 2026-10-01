# Data Model: 매일 쓰는 시각과 장소 이름

새 파일을 저장하지 않는다. 기존 두 파일의 모양도 그대로다.

## 저장되는 것 (기존)

| 무엇 | 파일 | 모양 | 이 조각의 변경 |
| --- | --- | --- | --- |
| 자동 쓰기 설정 | `preferences/auto-diary.json` (020) | `{ enabled: boolean, targetHour: 0–23 정수 }` — 필드 둘뿐(S7) | 파일 없음·`targetHour` 깨짐의 대체값 7 → **22**(FR-005). 필드는 늘지 않는다 |
| 장소 갈래 | 029의 장소명 파일(`geocoding-setting-store.ts`) | `"auto" \| "on" \| "off"`, 기본 `"auto"` | 없음 |

**이미 저장된 `targetHour`(옛 기본값 7 포함)는 옮기지 않는다**(Clarification Q1).

## 실행 중에만 있는 것

| 무엇 | 사는 곳 | 모양 | 수명 |
| --- | --- | --- | --- |
| 설정 값 보관 | `AppFrame` | `{ autoDiary: AutoDiarySettings, geocoding: GeocodingPreference } \| null` (`null` = 아직 못 읽음) | 앱 실행 동안. 마운트 때 한 번 읽고 설정에서 바꿀 때마다 갱신(R5) |
| 시간 형식 | 설정을 열 때(`SettingsSection` 마운트) 한 번 읽음 | `"h12" \| "h24"` | 저장하지 않는다(R1) |
| 시간대 | 설정을 열 때(`SettingsSection` 마운트) 한 번 읽음 | `{ timeZoneId: string \| null, offsetMinutes: number }` | 저장하지 않는다(R1·R3) |
| 오전/오후 선택 | `TargetHourDialog` 로컬 | `"am" \| "pm"` — 열릴 때 저장된 시에서 정함 | 대화상자가 닫히면 버린다(FR-017) |
| 열린 대화상자 | `SettingsSection` 로컬 | `"time" \| "place" \| null` — 열린 대화상자만 렌더한다(열 때마다 새로 마운트) | 설정 겹과 함께 |

## 변환 규칙 (순수, `src/app/target-hour.ts`)

- **시 → 오전/오후·표시 숫자(12시간)**: 0 → 오전 12, 1–11 → 오전 1–11, 12 → 오후 12, 13–23 → 오후 1–11.
- **칸 + 오전/오후 → 시**: 칸 12 → 오전 0 / 오후 12, 칸 n(1–11) → 오전 n / 오후 n+12. 24시간 형식은 칸 = 시.
- **격자 칸 순서**: 12시간 `[12, 1, 2, …, 11]`(4열), 24시간 `[0, 1, …, 23]`(6열).
- **미리보기의 날 낱말**: 시 12–23 → 「그날」, 0–11 → 「어제」(Clarification Q2).
- **GMT**: 동쪽 분 오프셋 0 → `GMT`, 그 밖 `GMT±h` + 분이 있으면 `:mm`.
- **도시**: `CITY_NAMES[id]` → 없으면 `id`의 마지막 `/` 뒤, 밑줄은 띄어쓰기. `id`가 `null`이면 시간대 줄 없음.
- **형식 판정**: `hourCycle` `h11`·`h12` → `h12`, `h23`·`h24` → `h24`, 없으면 `hour12` 불리언, 그것도 없으면 `h12`.
