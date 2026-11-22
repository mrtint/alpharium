# Data Model — 125

저장되는 값은 없다. 아래는 `app/`가 화면에 넘기는 **메모리 안 모양**이다.

## RouteItem — 범례·점 한 항목
| 필드 | 뜻 |
| --- | --- |
| `n` | 시간순 번호(1부터) |
| `period` | `morning`·`afternoon`·`evening`·`night` — 저장된 `firstSeenAt`을 `dayPeriodOf`로 옮긴 것 |
| `label` | 저장된 이름. `null`이면 「이름을 모르는 곳」으로 그린다(지어내지 않는다) |
| `x`·`y` | **0~1 상대 위치**. 도식일 때만 있다. 절대 좌표(위도·경도)는 이 모양에 없다 |

## DayRoute — 칸 하나
| 필드 | 뜻 |
| --- | --- |
| `items` | `RouteItem[]` — 시간순 앞 12곳까지 |
| `more` | 12곳 밖의 자리 수(`0`이면 「외 N곳」 줄 없음) |
| `diagram` | `true`면 모든 `items`에 `x`·`y`가 있고 점·선을 그린다. `false`면 범례 목록만 |

`null`(칸 없음)은 모양이 아니라 반환값이다 — 아래 상태 표.

## 상태 (입력 → 결과)
| 입력 | 결과 |
| --- | --- |
| 저장된 자리 없음(`entry.places` 없음·빈 배열) | `null` — 칸 없음 |
| 저장된 자리 1곳 | `{ items: 1개, diagram: false }` — 한 줄만 |
| 저장된 자리 ≥2, 다시 읽은 자리 `null`(읽지 못함·`unknown`·`none`) | `{ diagram: false }` — 저장된 이름·때 목록 |
| 저장된 자리 ≥2, 다시 읽은 자리 수 ≠ 저장 수 | `{ diagram: false }` — 목록 |
| 저장된 자리 ≥2, 수 같음, 점이 서로 떨어져 있음 | `{ diagram: true }` — 점·선·목록 |
| 저장된 자리 ≥2, 수 같음, 모든 점이 100m 안에 겹침(퇴화) | `{ diagram: false }` — 목록 |

## 검증 규칙
- 모든 `x`·`y`는 `[0,1]` 안이다. 모든 점이 100m 안에 겹치면(퇴화) 도식을 만들지 않는다(`diagram: false`).
- `items.length ≤ 12`, `more = 전체 − items.length`(≥0).
- `diagram: true`이면 `items.length ≥ 2`다(1곳은 도식이 없다).
- 자리 수 일치 검사는 12곳으로 자르기 **전** 전체 수로 한다.

## 읽기 전용으로만 쓰는 기존 모양
`SavedPlace`(`src/diary/place-lines.ts`: `label·category·firstSeenAt·lastSeenAt·photoCount`)·`PlaceVisit`(`src/signals/types.ts`, 좌표는 `app/day-route.ts` 안에서만 읽는다).
