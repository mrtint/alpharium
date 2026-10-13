# Data Model: 쓰기 실패 기록의 갈래 (081)

## 1. `WriteFailureReason` — 열하나

```ts
type WriteFailureReason =
  | "module" | "photos" | "empty" | "save"            // 060 그대로
  | "echo" | "language" | "unfinished"                 // 판정 거부(빈 글은 위 `empty`)
  | "timed-out" | "interrupted" | "error"              // 생성 단계의 나머지
  | "unwritten";                                       // 그 밖의 모든 것, 옛 기록
```

사람이 못 박은 상수다. 순서는 위 그대로(`REASONS` 배열).

## 2. 갈래 표 (`writeFailureReasonFor`)

입력은 `{ stage?, reason? }`. `reason`은 `` `${kind}` `` 또는 `` `${kind}: ${detail}` ``이고 첫 쌍점에서 가른다(뒤의 쌍점은 detail에 남는다).

| stage | kind | detail | 갈래 |
| --- | --- | --- | --- |
| `storage` | — | — | `save` |
| `request-build`·`model-not-ready` | — | — | `module` |
| `signals` | — | — | `photos` |
| `vision` | — | `not-ready` | `module` |
| `vision` | — | `cancelled` | `interrupted` ← 060은 `photos` |
| `vision` | — | 그 밖(`failed` 등) | `photos` |
| `generation` | `model-load-failed` | — | `module` |
| `generation` | `rejected` | `empty` | `empty` |
| `generation` | `rejected` | `echo` | `echo` |
| `generation` | `rejected` | `language` | `language` |
| `generation` | `rejected` | `unfinished` | `unfinished` |
| `generation` | `rejected` | 그 밖·없음 | `unwritten` |
| `generation` | `timed-out` | — | `timed-out` |
| `generation` | `interrupted` | (무엇이든) | `interrupted` |
| `generation` | `generation-failed` | (무엇이든 — 읽지 않는다) | `error` |
| `generation` | 그 밖(`not-implemented`·`backend-unavailable`…) | — | `unwritten` |
| 그 밖·없음 | — | — | `unwritten` |

거부 갈래 넷(`empty`·`echo`·`language`·`unfinished`)은 `acceptance.ts`의 `REJECT_REASONS`와 같은 집합이다.

## 3. 기록 항목 (바뀌지 않는다)

```ts
type WriteFailure = { reason: WriteFailureReason; at: Date };
// 파일: preferences/write-failures.json — { "items": [{ "reason": "...", "at": "<ISO>" }] }, 최근 10건, 최신이 앞
```

필드는 둘뿐이다. 기록할 만한 실패인가(`isRecordable`)도 그대로다 — 성공·`already-running`·`cancelled: true`는 기록하지 않는다.

## 4. 파이프라인 이유 문자열 (한 자리만 바뀐다)

| 어댑터가 돌려준 것 | 지금 `reason` | 081 `reason` |
| --- | --- | --- |
| `{ kind: "rejected", why: "echo" }` | `"rejected"` | `"rejected: echo"` |
| `{ kind: "timed-out" }` | `"timed-out"` | 같음 |
| `{ kind: "interrupted" }` | `"interrupted"` | 같음 |
| `{ kind: "generation-failed", reason: m }` | `` `generation-failed: ${m}` `` | 같음 |
| `{ kind: "vision-failed", reason: "cancelled" }` | `"vision-failed: cancelled"`(stage `vision`) | 같음 |

## 5. 화면의 줄 (바뀌지 않는다)

```ts
type FailureLine = { reasonText: string; timeText: string };
```

`reasonText`의 출처: 옛 다섯은 카탈로그 `diagnostics` 영역(`failModule`·`failPhotos`·`failEmpty`·`failSave`·`failUnwritten`), 새 여섯은 `failures` 영역:

| 갈래 | 키 | 문구 |
| --- | --- | --- |
| `echo` | `echo` | 지시문을 되뱉음 |
| `language` | `language` | 다른 언어로 씀 |
| `unfinished` | `unfinished` | 글을 끝맺지 못함 |
| `timed-out` | `timedOut` | 시간 초과 |
| `interrupted` | `interrupted` | 도중에 끊김 |
| `error` | `error` | 생성 중 오류 |

## 6. `FailuresGroup` props

```ts
{ failures: readonly FailureLine[]; idPrefix: "diagnostics" | "developer" }
```

testID: `${idPrefix}-group-failures` · `${idPrefix}-failures-empty` · `${idPrefix}-failure-${index}`.

`DeveloperScreenProps`에 `failures: readonly FailureLine[]`(필수)가 더해진다.
