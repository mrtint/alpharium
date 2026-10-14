# Data Model: 살아 있는 쓰기 등록부와 합류 (080)

저장되는 것은 **줄어든다** — `locks/diary-generation.lock`을 더는 쓰지도 읽지도 않는다. 아래는 모두 실행 중에만 있는 값이다. 타입의 정본은 [contracts/live-write.md](./contracts/live-write.md).

## 칸 (`LiveSlot`)

등록부가 든 자리 하나. 비어 있거나, 쓰기 하나 또는 지우기 하나가 든다.

| 상태 | 뜻 | 전이 |
| --- | --- | --- |
| 빔 | 살아 있는 쓰기도 지우기도 없다 | `beginWrite()` → 쓰기 · `beginWipe()` → 지우기 |
| 쓰기 | 쓰기 하나가 돈다 | `end()` → 빔 (다른 전이 없음 — 나이로 비지 않는다) |
| 지우기 | 일기 모두 지우기가 돈다 | `end()` → 빔 |

프로세스가 죽으면 등록부가 없으므로 「빔」에서 시작한다.

## 살아 있는 쓰기 (`LiveWrite`)

| 필드 | 뜻 | 어디서 오는가 |
| --- | --- | --- |
| `day` | 쓰는 날 | `pipeline.run()`의 `input.day` |
| `owner` | 조립 주체(`screen`/`background`) | `wiring.ts`의 주체 변수(079 A8) |
| `progress()` | 최근 단계·갈래. 한 번도 없으면 `null` | 파이프라인의 진행 신호 |
| `done` | 끝. `{ ok, cancelled }` | `end()` |
| `cancel()` | 그만둠을 세우고 백엔드 `stop`을 부른다 | `wiring.ts`가 묶은 `stop` |

싣지 않는 것: 시작 시각·경과 시간·모델 식별자·토큰 수(FR-019, 원칙 III·IV).

## 끝 (`LiveWriteEnd`)

| `ok` | `cancelled` | 뜻 | 홈(합류) | 시작한 쪽 |
| --- | --- | --- | --- | --- |
| 참 | 거짓 | 저장했다 | 쓴 날 홈 | 완성 알림·`ran` |
| 참 | 참 | 그만두기가 저장 시작 뒤에 왔다 — 일기가 남았다(071) | 쓴 날 홈 | 완성 알림·`ran` |
| 거짓 | 거짓 | 실패 | 토스트 없이 목록 → 057 판정 | 쓰기 실패 기록·`failed` |
| 거짓 | 참 | 사용자가 그만둠(또는 지우기가 끊음) | 목록, 057의 「한 번」 소모 | 기록·알림 없음·`cancelled` |

## 파이프라인 결과에 더해지는 것

`PipelineResult`의 실패 갈래에 `cancelled?: true`. 성공 갈래에는 없다. `PipelineStage`는 그대로다.

## 자동 쓰기 시도 기록 (078)

`AttemptOutcome`에 `cancelled`가 더해진다(열넷). 저장 형식(`preferences/auto-write-attempts.json`)은 그대로다 — 옛 빌드는 모르는 갈래의 줄을 읽을 때 버린다(078의 읽기 규칙: 못 읽는 항목만 버린다).

## 홈의 실행 중 상태

| 값 | 뜻 |
| --- | --- |
| `running` (ref, 기존) | 홈이 시작한 쓰기가 도는가 — 합류한 동안에는 거짓 |
| `joined` (ref, 새로) | 합류한 쓰기(`LiveWrite`) 또는 없음 |
| 등록부 변화 번호 (state, 새로) | `onChange`가 올린다 — 합류·057·018 effect를 다시 돌린다 |
| 목록이 낡았다 (ref, 새로) | 남의 쓰기를 본 순간 선다. 그 쓰기가 끝난 뒤 목록을 다시 읽어 반영하면 내린다 — 서 있는 동안 057 자동 시작이 물러선다(H12) |

화면 상태(`AppScreen`)는 바뀌지 않는다 — 합류한 화면도 `{ kind: "writing" }`이다.

## 없어지는 것

`LockRecord`(`owner`·`acquiredAtMs`), `STALE_LOCK_MS`, `LockPort`, `WiringDeps.lockPort`, `WipeDeps.lockPort`·`nowMs`, `LockHandle`.
