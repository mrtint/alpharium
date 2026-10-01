# Data Model: 자동 쓰기 규칙 (057)

## §1 자동 쓰기 판정 결과 `AutoWriteDecision` (저장하지 않음)

| 갈래 | 필드 | 뜻 |
| --- | --- | --- |
| `idle` | `reason`: 020 `ScheduleDecision`의 이유(`disabled`·`not-near-target`·`all-written`) | 020이 돌 일 없음 — 신호를 읽지 않는다 |
| `write` | `day: DayDate` | 그 날을 쓴다 |
| `skip` | `day: DayDate`, `because: "no-photo-access" \| "no-material"` | 쓰지 않는다. `no-photo-access`만 기록된다 |

판정 순서(고정, spec FR-003): `idle` → `no-photo-access`(`photoAccess`가 `denied`·`blocked`) → `write`(053 `decideMaterial`이 `write`) → `no-material`.

## §2 건너뜀 기록 (파일)

- 자리: `files/preferences/auto-write-skipped.json` (`auto-diary.json`과 다른 파일 — 020 S7, D3)
- 모양: `{"day":"YYYY-MM-DD"}` — 필드 하나. 시각·횟수·이유를 담지 않는다.
- 쓰는 때: `skip` + `no-photo-access` (백그라운드·앱 열기 모두). 덮어쓴다(가장 최근 한 번).
- 지우는 때: 앱이 실행되거나 앞으로 돌아와 사진 권한을 `granted`·`limited`로 읽었을 때. 읽기 실패면 지우지 않는다.
- 읽기 방어: 파일 없음·JSON 깨짐·`day`가 `YYYY-MM-DD`가 아님 → `null`. 예외를 밖으로 던지지 않는다.

## §3 화면에 보이는 값 (저장하지 않음)

- **사진 행 보조 줄**: `skippedDay !== null && 사진 꼬리표 === "denied"`일 때만. 문구는 `skippedLineText(skippedDay, now)`.
- **완성 알림 제목**: `autoWriteDoneText(displayNameOf(character, customNames), day)`. 본문 없음. `data: { day }`는 020 그대로.
- **앱 열기 자동 쓰기 문(세션 로컬)**: `AppFrame`의 `autoWriteClaimed`(이번 실행에서 시작했는가)와 040 `autoGenerateTried`. 파일에 남기지 않는다.

## 바뀌지 않는 것

`AutoDiarySettings`(`enabled`·`targetHour`), `notified.json`, `DiaryEntry`, 잠금 파일, `onboarding.json`.
