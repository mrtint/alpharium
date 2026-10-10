# 계약: 층 2 흐름 넷

공통: 파일 머리 주석에 전제 상태·단언·사람이 보는 것을 적는다. **일기 본문 글자를 단언하지 않는다**(FR-013). 제목은 「있다」(존재)만. 모델 이름 노출 금지 단언은 기존 흐름처럼 유지해도 된다.
완료 대기는 `extendedWaitUntil: notVisible: id: stop-button`. 대기 한도는 R4.

| 흐름 | 전제(실행기가 만듦) | 단언(상태 전이) |
| --- | --- | --- |
| `layer2-write-and-read` | 어제 일기 없음, 어제 표본 사진 있음 | `day-${YESTERDAY}` 선택 → `write-button` → (덮어쓰기 없음) → `stop-button`·`home-day-state`「쓰는 중」 → `stop-button` 소멸 → `write-button` 대신 쓴 날 홈: `diary-title` 존재, 「다시 쓰기」 존재 |
| `layer2-open-app-writes` | 자동 쓰기 켜짐(목표 = 지금 시), 오늘 일기 있음·어제 없음 | `launchApp` → `stop-button` 나타남(쓰는 중) → 소멸 → 어제가 선택된 쓴 날 홈 |
| `layer2-diagnostics-try-write` | 오늘 일기 없음 | 홈 → 설정 → 개발자 → 진단 → 「한 번 써 보기」 → 홈이 쓰는 중 → 소멸 → 오늘 쓴 날 홈 |
| `layer2-first-run-auto-diary` | `onboarding` 되돌림, 작명 파일 삭제, 오늘 일기 없음, 모델 있음 | 로고 → (권한 자동) → 작명 입력·확정 → liveness 통과 → 쓰는 중 → 소멸 → 오늘 쓴 날 홈 |

각 흐름의 정확한 testID는 구현 때 기존 흐름(`in-place-writing`·`written-day-reading`·`settings-developer-sweep`·`first-run-flow`)에서 가져온다. 새 testID가 필요하면 앱에 가장 작은 추가만 하고 사유를 기록한다(FR-024).
