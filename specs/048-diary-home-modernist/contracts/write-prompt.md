# 계약: 쓸 수 있음·스트립·신호 미리보기 (순수 로직)

대상: `src/config/day-boundary.ts`, `src/app/state.ts`, `src/app/day-preview.ts`, `src/app/wiring.ts`
테스트: `__tests__/config/day-boundary.test.ts`(확장), `__tests__/app/state.test.ts`(확장),
`__tests__/app/day-preview.test.ts`(신규), `__tests__/app/wiring.test.ts`(확장) — 전부 `logic` 프로젝트(`.ts`)

시각 표기는 기기 시간대 기준. `D` = 2026-09-24(목).

## DB — day-boundary

| # | 입력 `now` | 호출 | 기대 |
| --- | --- | --- | --- |
| DB1 | 09-24 10:00 | `writableAt("2026-09-24", now)` | 09-24 12:00 |
| DB2 | 09-25 01:00 | `writableAt("2026-09-24", now)` | 09-25 04:00 (오늘=09-24가 닫히는 시각) |
| DB3 | 09-24 13:00 | `writableAt("2026-09-24", now)` | `null` |
| DB4 | 09-24 10:00 | `writableAt("2026-09-23", now)` | `null` (닫힌 날) |
| DB5 | 09-24 03:59:59 | `writableAt("2026-09-23", now)` | 09-24 04:00 |
| DB6 | 09-24 10:00 | `stripDays(now)` | `09-18 … 09-24` 7개, 오름차순 |
| DB7 | 09-25 01:00 | `stripDays(now)` | 마지막이 `09-24` (04:00 경계) |
| DB8 | 10-02 10:00 | `stripDays(now)` | `09-26 … 10-02` (월 경계) |
| DB9 | — | 소스 검사 | `WRITABLE_FROM_HOUR`·`DAY_STARTS_AT_HOUR`가 여전히 `export` 되지 않는다 |
| DB10 | 임의 | `writableAt(d, now) !== null` ⇔ `!isDayWritable(d, now)` (d ∈ `stripDays(now)` 각각) | 참 |

## WP — `writePromptFor`

| # | `now` | `chosenDay` | 기대 |
| --- | --- | --- | --- |
| WP1 | 09-24 10:00 | 없음 | `day = 09-23`, `writable: true`, `writableAt` 없음 (D9) |
| WP2 | 09-24 10:00 | 없음 | `selectable` = `[09-24(w:false), 09-23, 09-22, 09-21]` |
| WP3 | 09-24 10:00 | `09-24` | `day = 09-24`, `writable: false`, `writableAt = 09-24 12:00`, `revertedFrom` 없음 |
| WP4 | 09-25 01:00 | `09-24` | `day = 09-24`, `writable: false`, `writableAt = 09-25 04:00` |
| WP5 | 09-24 13:00 | 없음 | `selectable` = `[09-24, 09-23, 09-22]` 전부 `writable: true` (오늘 중복 없음) |
| WP6 | 09-24 13:00 | `09-24` | `writable: true` |
| WP7 | 09-24 10:00 → 12:00:01 | `09-24` 유지 | 같은 `chosenDay`로 다시 부르면 `writable: true` (전환) |
| WP8 | 09-25 04:00:01 | `09-24` | `day = 09-24`, `writable: true` (닫혀 어제가 됨, 되돌림 없음) |
| WP9 | 09-24 10:00 | `09-20` (범위 밖) | `day = 09-23`, `revertedFrom = 09-20` (009 그대로) |
| WP10 | 임의 | 임의 | I1 `day ∈ selectable`, I3 `writable === false ⇔ writableAt !== undefined`, I4 `writable:false` 칸 ≤ 1개이며 그 칸은 `dayOf(now)` |
| WP11 | 09-24 10:00, 목록에 09-24 있음 | `09-24` | `overwrites: true`, `writable: false` (둘은 독립) |

## SC — `stripCellsFor`

| # | 입력 | 기대 |
| --- | --- | --- |
| SC1 | 09-24 10:00, 목록 `09-19`·`09-23` | 7칸, `hasDiary`는 09-19·09-23만 참 (09-19는 `selectable: false`) |
| SC2 | 같은 입력, 고른 날 09-23 | `selected`는 09-23 한 칸 |
| SC3 | 같은 입력 | `selectable`은 09-21~09-24 네 칸 |
| SC4 | 09-24 13:00 | `selectable`은 09-22~09-24 세 칸 |

## DP — `toDayPreview` / `dayParts`

| # | 입력 | 기대 |
| --- | --- | --- |
| DP1 | photos known 3장, places known visitCount 2 | `{photos:{known,3}, places:{known,2}}` |
| DP2 | photos none, places none | 둘 다 `none` |
| DP3 | photos unknown, places unknown | 둘 다 `unknown` |
| DP4 | photos known, places unknown | 각각 따로 (섞이지 않는다) |
| DP5 | `null` | 둘 다 `unknown` |
| DP6 | 어떤 입력에서도 | 결과에 `photos`·`places`·`day` 외의 키가 없다(신호 원형이 새지 않는다) |
| DP7 | `dayParts("2026-09-13")` | `{2026, 9, 13, weekday: 0}` (일요일) |
| DP8 | 소스 검사 | `src/app/state.ts`가 `signals/` 를 import하지 않는다 |

## PV — `wiring.previewDay`

| # | 주입 `loadSignals` | 기대 |
| --- | --- | --- |
| PV1 | 사진 known 2장 신호 | `photos.count = 2` |
| PV2 | `null` 반환 | 둘 다 `unknown` |
| PV3 | 던짐 | 둘 다 `unknown`, 예외가 밖으로 나오지 않는다 |
| PV4 | 같은 `loadSignals` | 파이프라인과 **같은 함수**를 부른다(호출 기록으로 확인 — 새 수집 경로 없음) |
| PV5 | 데스크톱(`local`) 해석 | `previewDay`가 있다 (옵셔널 아님) |

## 위반 주입 (각각 잡혀야 한다)

- V-P1: `writePromptFor`가 오늘을 `writable: true`로 붙인다 → WP3·WP10 실패.
- V-P2: `writableAt`이 00:00~04:00에도 정오를 준다 → DB2·WP4 실패.
- V-P3: `toDayPreview`가 `none`을 `{known, 0}`으로 바꾼다 → DP2 실패.
- V-P4: `state.ts`가 `signals/types`를 import → DP8 실패.
