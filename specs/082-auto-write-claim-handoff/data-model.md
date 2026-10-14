# Data Model: 앱 열기 자동 쓰기의 「한 번」과 넘겨 둔 날 (082)

저장되는 것은 없다. 둘 다 앱 프로세스가 사는 동안의 메모리 상태다.

## 1. 넘겨 둔 날 (`useAutoWriteHandoff`)

| 이름 | 모양 | 뜻 |
| --- | --- | --- |
| 안의 상태 | `{ day: DayDate \| null; settings: AutoDiarySettings } \| null` | 가장 최근에 반영된 판정의 결과와 그 판정을 낳은 설정(참조). 판정이 반영된 적 없으면 `null` |
| 돌려주는 값 | `DayDate \| null` | 안의 상태의 `settings`가 **지금 설정과 같은 참조**일 때만 그 `day`. 그 밖은 `null` |

### 판정 → 반영

| 판정(`AutoWriteDecision`) | 반영되는 `day` |
| --- | --- |
| `write` | 그 날 |
| `idle`(꺼짐·쓰는 시각 아님·모두 써 있음) | `null` |
| `skip`(사진 권한 없음·재료 없음) | `null` |
| 판정이 던짐 | 반영하지 않는다(앞의 상태 그대로 — 설정이 바뀐 뒤라면 돌려주는 값은 이미 `null`) |

### 반영의 조건

- 그 판정을 시작한 effect가 아직 살아 있다(설정·통로가 바뀌지 않았고 언마운트되지 않았다).
- 그 effect 안에서 **가장 늦게 시작한** 판정이다.

시도 기록(078)은 두 조건과 무관하게 남는다.

## 2. 한 번 (`useAutoWriteClaim`)

상태: `claimed: boolean`(ref, 처음 `false`). 한 번 `true`가 되면 그 실행에서 되돌아가지 않는다.

| 사건 | `claimed` | 돌려주는 값 |
| --- | --- | --- |
| `claimAutoWrite()` — 흉내 기록을 아직 읽지 않았다 | 그대로 | `false` |
| `claimAutoWrite()` — 첫 실행 자동 첫 일기를 시도한 실행(040) | 그대로 | `false` |
| `claimAutoWrite()` — 이미 `true` | 그대로 | `false` |
| `claimAutoWrite()` — 그 밖 | `true` | 흉내로 막혀 있으면 `false`, 아니면 `true` |
| 흉내로 쓰기가 막힘(`writeBlocked`가 참이 됨, 064) | `true` | — |
| `spendAutoWrite()` (**새로**) | `true` | — |

`spendAutoWrite()`를 부르는 곳은 「일기 모두 지우기」가 `busy`가 아닌 결과로 끝나 홈을 다시 마운트하기 직전 한 곳이다.
홈이 080 합류의 끊김 뒤에 부르는 것은 종전대로 `claimAutoWrite()`다.

## 3. 바뀌지 않는 것

- `AutoDiarySettings`·`AutoWriteDecision`·`WipeOutcome`의 모양, `preferences/*.json` 전부.
- `DiaryHomeScreen`의 props(`autoWriteDay?: DayDate | null`·`claimAutoWrite?: () => boolean`).
