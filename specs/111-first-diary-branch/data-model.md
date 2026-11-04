# Data Model: 첫 일기 분기

저장하는 것이 없다. 아래는 세션 로컬 상태다.

## FirstDiaryState

| 필드 | 값 | 뜻 |
| --- | --- | --- |
| `step` | `before` · `reading` · `asking` · `writing` · `done` | 지금 단계 |
| `rolledBack` | boolean | 이 실행에서 되돌림을 썼는가 |

전이는 [contracts/first-diary-flow.md](contracts/first-diary-flow.md) FD 표가 정본이다. 그 밖의 사건은 상태를 바꾸지 않는다.

## FirstWriteOutcome

`saved` · `stopped`(그만두기) · `interrupted`(앞을 벗어나 끊김) · `busy`(다른 쓰기) · `refused`(시작 거절) · `failed`(그 밖의 실패·예외). `failed`만 되돌릴 수 있다.

## FirstDiaryMaterial

`{ day: DayDate; canAsk: boolean }` — `canAsk`는 오늘 일기가 없고 `decideMaterial`이 `write`일 때만 참이다. 읽기 실패·한도 초과는 거짓.
