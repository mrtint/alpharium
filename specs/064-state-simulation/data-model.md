# Data Model: 상태 흉내

## 1. 흉내 기록 — `preferences/simulation.json`

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `date` | `"YYYY-MM-DD"` (선택) | 있으면 날짜 흉내 켬. 형식이 아니면 그 필드만 없는 것으로 본다 |
| `failToast` | boolean | `true`가 아니면 꺼짐 |
| `noMaterial` | boolean | 같다 |
| `noPhoto` | boolean | 같다 |

- **존재 규칙**: 하나라도 켜졌을 때만 파일이 있다. 모두 꺼지면 지운다(`false`만 든 파일을 쓰지 않는다).
- **담지 않는 것**: 켠 시각·바꾼 횟수·이전 값(D3, 원칙 IV).
- **읽기**: 없음·깨짐·모양 다름·통로 예외 → 모두 꺼짐(FR-016). 던지지 않는다.

## 2. 흉내 상태 (메모리)

```text
SimulationState = { date: DayDate | null; failToast: boolean; noMaterial: boolean; noPhoto: boolean }
OFF = { date: null, failToast: false, noMaterial: false, noPhoto: false }
```

- `effectiveSimulation(state, devEnvironment)` → 배포 환경이면 `OFF`.
- `simulationBlocksWriting(state)` → `date !== null || failToast || noMaterial || noPhoto`.
- `simulatedNow(date, real)` → `date`가 `null`이면 `real`, 아니면 `date`의 시작 + `real`의 「그 날 시작 이후 경과」.
- `simulatedPreviewDay(state)` → `noPhoto`면 권한 없음 미리보기, 아니면 `noMaterial`이면 관측된 0 미리보기, 둘 다 아니면 `undefined`.

## 3. 상태 전이

- 개발자 화면에서 토글·날짜를 바꿈 → 메모리 상태 즉시 반영 → 파일 쓰기(모두 꺼지면 지우기). 쓰기 실패는 그 실행의 상태를 바꾸지 않는다.
- 날짜를 켬·바꿈 → 홈의 고른 날 = 그 날. 날짜를 끔 → 홈의 고른 날 = 실제 오늘.
- 개발자 메뉴 끄기 → `OFF` + 파일 지우기.
- 앱 시작(개발 환경) → 파일을 한 번 읽음. 배포 환경 → 읽지 않음, 언제나 `OFF`.
