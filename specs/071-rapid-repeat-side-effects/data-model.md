# Data Model: 반복 시나리오·점검 결과·부작용

앱 데이터 모델은 바뀌지 않는다. 아래는 이 조사가 문서에 쌓는 기록의 모양이다.

## 반복 시나리오 (RepeatScenario)

| 필드 | 설명 |
| --- | --- |
| id | `S-A`~`S-E` (research R1; S-E는 작명·온보딩 반복, FR-013) |
| interval | `0ms` / `300ms` / `1.5s+` / `1.6s` / `3s` / `10s` |
| warmth | `cold`(모델 미적재 첫 쓰기) / `warm`(적재된 뒤) — 같은 간격이어도 구분해 기록 |
| repeats | 같은 (시나리오, 간격)을 돌린 횟수 (SC-003은 고친 뒤 각 5회) |

## 점검 결과 (CheckResult)

반복 한 번 뒤 읽은 값의 묶음. `RepeatScenario`에 매달린다.

| 점검 항목 | 읽는 곳 | 기대(정상) |
| --- | --- | --- |
| lock | `files/locks/diary-generation.lock` | 쓰는 중이 아니면 없음 |
| diaryDir | `files/diary/` | 새 파일은 정상 완주한 날만, `.json.writing` 없음, 같은 날 중복 없음 |
| failures | `files/preferences/write-failures.json` | 그만두기는 기록되지 않음(054·060) |
| screen | `uiautomator dump`/`screencap` | 쓰는 중이 아니면 홈의 쓰기 바, 토스트는 실제 실패일 때만 |
| log | `adb logcat` | 모델 적재·해제가 짝, 처리되지 않은 예외 없음 |
| memory | `dumpsys meminfo`(전후) | 반복 후 누적 증가 없음 |

## 부작용 (SideEffect)

점검 결과가 기대와 어긋난 것 하나. 형식은 [contracts/side-effect-list.md](./contracts/side-effect-list.md).

| 필드 | 설명 |
| --- | --- |
| id | `SE-1`, `SE-2` … |
| symptom | 관측한 증상(해석 없이) |
| repro | (시나리오, 간격, warmth) |
| evidence | 근거 로그·파일 내용·화면 한 줄 |
| verdict | `code-defect` / `env-limit` / `out-of-scope` / `owner-decision` |
| status | `open` / `fixed (테스트 이름)` / `not-fixed (이유)` |

## 상태 전이

`관측됨` → (판정) → `code-defect` → `fixed` / `env-limit`·`out-of-scope`·`owner-decision` → `not-fixed`(이유 필수, FR-009). 「관측 없음」인 (시나리오, 간격)은 `SideEffect` 없이 `CheckResult`만 남는다(FR-005).
