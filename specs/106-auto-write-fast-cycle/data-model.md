# Data Model: 106

## 빠른 주기 설정 (`preferences/dev-fast-cycle.json`)

| 필드 | 형 | 규칙 |
|---|---|---|
| `periodMinutes` | 정수 | 5 ≤ N ≤ 180. 범위 밖·비정수·비숫자 → 파일 전체를 꺼짐으로 읽는다 |
| `resetCycle` | 문자열 | 마지막으로 리셋한 주기 id(`YYYY-MM-DD#순번`). 문자열이 아니면 꺼짐 |

- 파일 없음 = 꺼짐. 켜짐일 때만 파일이 있다(꺼질 때 삭제).
- 개발 환경에서만 읽는다(`devEnvironment` 가드). 배포는 파일을 열지도 않는다.
- 알 수 없는 필드는 무시한다(`simulation.json`과 같음). 시각·횟수·이력 필드를 두지 않는다(원칙 IV).

## 주기 (`Cycle`, 파생 값 — 저장하지 않음)

| 필드 | 뜻 |
|---|---|
| `id` | `"<day>#<순번>"`, 순번 = ⌊(now − 자정) / (N분)⌋ |
| `startMs` | 자정 + 순번 × N분 |
| `endMs` | min(startMs + N분, 다음 자정) |
| `windowEndMs` | startMs + min(⌊N/2⌋분, endMs − startMs) |

## ScheduleTiming (파생 값 — 저장하지 않음)

| 필드/메서드 | 배포 | 빠른 주기 |
|---|---|---|
| `kind` | `"production"` | `"fast-cycle"` |
| `inWindow(now)` | 시 ∈ [목표 시, +3시간) (자정 wrap) | `startMs ≤ now < windowEndMs` |
| `targetAhead(now)` | `getHours() < 목표 시` | `false` |
| `targetDay` | `includesTodayAtHour(목표 시)` | `"today"` |
| `candidateDays(selectable, today)` | `selectable` | `[today]` |
| `reminderDelayCap` | 30 | min(30, ⌊⌊N/2⌋ / 2⌋) — 창의 절반 |
| `nextCycleStart(now)` | — | 현재 `endMs` |

## 변경되는 기존 구조

- `DiaryStore.removeDay(day: DayDate): Promise<void>` — 새 메서드. 없는 날은 조용히 넘어간다. 파일: `<day>.json`과 `<day>.json.writing`.
- `FileSystemPort.remove(name)`는 이미 있다(058). 새 포트 메서드 없음.
- `CatchUpStorePort`에 `remove()` 추가(+ `clearCatchUpDay`). 기록이 없으면 무시.
- `ReminderDeps.loadTiming?: () => Promise<ScheduleTiming>` 옵션(기본 배포).
- `resolveAutoWrite` deps `timing?: ScheduleTiming`(기본 `productionTiming(settings)`).
- `decideSchedule` input `timing: ScheduleTiming` 필수(호출부 둘 + 테스트 갱신, `selectableDays`는 호출부가 준 목록을 timing이 거른다).

## 상태 전이: 주기 리셋

```text
off ──켜기(확인)──▶ on{N, resetCycle = 켠 순간의 주기}
on  ──주기 바뀜 + 판정──▶ [칸 차지 성공] 오늘 일기·기록 삭제 ▶ resetCycle = 현재 주기
                        [칸 못 차지]   변화 없음(다음 판정이 다시)
on  ──주기 값 변경(다른 값)──▶ 켜기와 같은 길: [오늘 일기가 있으면 확인] → 오늘 일기·기록 삭제 → on{N', resetCycle = 새 주기의 현재 번호}
on  ──주기 값 변경(같은 값)──▶ 아무 일도 없다
on  ──끄기 / 개발자 메뉴 끄기──▶ off (파일 삭제)
```
