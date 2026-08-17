# 데이터 모델: 실제 일기 생성

**Feature**: 005-diary-generation | **Date**: 2026-08-17

이 기능은 **002의 타입을 바꾸지 않는다**(FR-025). 새 타입은 전부 002가 남긴 빈 자리를
채우는 것이며, 기존 타입의 자리 수와 갈래는 그대로다.

---

## 경계 — 무엇이 어디까지 가는가

003이 「안쪽 값(화면 금지)」과 「바깥쪽 값(화면 허용)」을 가른 것과 같은 구조를 쓴다.
이 기능은 여기에 **한 겹을 더한다**: 네이티브에서 온 것 중 **경계를 넘지 못하는 값**.

```
┌─ 네이티브 (llama.rn) ─────────────────────────────┐
│  NativeCompletionResult                           │
│   text, content, reasoning_content, tool_calls,   │
│   tokens_predicted, tokens_evaluated,             │  ← 원칙 IV
│   draft_tokens, tokens_cached,                    │  ← 원칙 IV
│   timings { prompt_ms, predicted_per_second, ... }│  ← 원칙 IV
│   truncated, stopped_eos, stopped_limit,          │
│   context_full, interrupted                       │
│  LlamaContext { model, systemInfo, devices, gpu } │  ← 원칙 III
└───────────────────┬───────────────────────────────┘
                    │  llama-port.ts — 여기서 버린다
                    ▼
┌─ 엔진 포트 ───────────────────────────────────────┐
│  RunResult { text, ending }                       │
│  LoadResult { ok } | { ok, reason }               │
└───────────────────┬───────────────────────────────┘
                    │  on-device.ts / desktop-server.ts — 판정
                    ▼
┌─ 002의 계약 (변경 없음) ──────────────────────────┐
│  DiaryDraft { text }        ← 통과한 글만          │
│  GenerationFailure          ← text 없음            │
└───────────────────┬───────────────────────────────┘
                    ▼
┌─ 화면 ────────────────────────────────────────────┐
│  DiaryEntry, 「쓰고 있다」 불리언,                  │
│  「할 수 있는 것」으로 옮긴 실패                    │
└───────────────────────────────────────────────────┘
```

**첫 화살표가 이 기능의 핵심 방어다.** 네이티브가 주는 것 중 절반이 헌법이 금지한
값이며, 경계에서 버리지 않으면 위로 샌다.

---

## 새 타입

### `Ending` — 생성이 어떻게 끝났는가

**모듈**: `src/inference/engine-port.ts`

```
{ kind: "eos" }          모델이 스스로 끝냈다  ← 유일한 정상
{ kind: "length" }       길이 한도에 걸렸다
{ kind: "context" }      컨텍스트가 모자랐다
{ kind: "interrupted" }  끊겼다 (앱이 벗어남)
{ kind: "timeout" }      시간 한도를 넘었다
```

**왜 불리언 다섯이 아니라 갈래 하나인가**: 네이티브는 `stopped_eos`·`truncated`·
`context_full`·`interrupted`·`stopped_limit`를 따로 준다. 그대로 올려보내면 **해석이
부르는 쪽마다 생기고, 두 해석이 어긋나면 잘린 글이 통과한다.** 하나로 접으면 해석이
포트에만 있다.

**왜 값을 갖지 않는가**: `{ kind: "length", tokens: 512 }` 같은 형태를 두면 그것이
지표다(원칙 IV). 갈래만 있으면 담을 자리가 없다.

**`timeout`만 우리가 만든다.** 나머지 넷은 네이티브의 사실이고, 시간 한도는 어댑터가
재서 붙인다(FR-021).

---

### `RunResult` / `LoadResult` — 엔진이 돌려주는 것

**모듈**: `src/inference/engine-port.ts`

```
RunResult  = { text: string, ending: Ending }
LoadResult = { ok: true } | { ok: false, reason: "not-found" | "load-failed" }
```

**`RunResult`에 자리가 둘뿐인 것이 계약이다**(engine.md E4). 자리가 없으면 지표를 담을 수
없다 — 002가 `DiaryDraft`를 `{ text }` 하나로 둔 것과 같은 방어이며, 그 판단이 이 기능에서
값을 했다.

**`LoadResult`가 모델 정보를 담지 않는다**(원칙 III). `LlamaContext`는 포트 밖으로 나가지
않는다.

---

### `Verdict` / `RejectReason` — 판정 결과

**모듈**: `src/diary/acceptance.ts`

```
Verdict      = { ok: true } | { ok: false, why: RejectReason }
RejectReason = "empty" | "echo" | "language" | "unfinished"
```

**넷을 넘지 않는다**(FR-018b). 이 수가 계약이며, 다섯 번째를 넣으려면
[acceptance.md](contracts/acceptance.md)를 먼저 고쳐야 한다.

**텍스트를 담지 않는다**(FR-017c) — 거부된 글이 실려 나가면 그것이 `text`가 새는 경로다.
**수를 담지 않는다**(FR-018c) — 수가 있으면 그것으로 모델을 견주게 된다.

**이것은 안쪽 값이다.** 진단에는 남을 수 있으나 사용자에게 가는 말은 「할 수 있는 것」으로
옮겨진다(FR-017d·e) — 「되뱉었다」는 캐릭터 뒤의 모델을 드러내는 말이다.

---

### `SamplingSettings` — 양쪽이 공유하는 값

**모듈**: `src/inference/sampling.ts`

```
temperature, top_p, top_k, n_predict
```

**캐릭터별로 갈리지 않는다**(FR-014, 원칙 III). 갈리면 성격이 파라미터에서 오게 된다.

**seed를 두지 않는다** — 같은 하루를 다시 요청하면 다른 일기가 나오는 것이 자연스럽다.

**전부 짐작이며 실측이 아니다**(원칙 V). 주석에 그렇게 남긴다.

---

### `GenerationState` — 「쓰고 있다」

**모듈**: `src/ui/`(진단 화면의 지역 상태)

```
boolean
```

**불리언 하나다**(FR-028a·b). 진행률·남은 시간·생성 중인 글을 담을 자리가 없다.

**타입에 자리가 하나뿐인 것이 유일한 방어다** — 오래 기다리는 화면에 「얼마나 남았나」를
넣고 싶어지는 압력은 실제로 생긴다(research §9).

---

## 002 타입에 더해질 수 있는 것

### `GenerationFailure` — 갈래를 더할 수 있다

002의 세 갈래로는 이 기능의 실패를 다 말하지 못한다:

```
기존:  not-implemented | backend-unavailable | generation-failed
```

**`not-implemented`는 남는다** — 시각 처리(`quick`/`detailed`)가 아직 없다는 것을 말하는
데 쓰인다(FR-022). 이름이 맞고, 없앨 이유가 없다.

**더할 수 있는 것**(FR-025 범위 안):

| 갈래 | 언제 | 왜 별개인가 |
| --- | --- | --- |
| `model-load-failed` | 모델을 열지 못함 | 사용자가 할 일이 다르다 — 다시 받기 (FR-017d) |
| `rejected` | 판정에서 거부됨 | 다시 시도할 만하다 |
| `interrupted` | 앱이 앞을 벗어남 | 사용자가 떠나서 그런 것이다 |
| `timed-out` | 시간 한도 초과 | 기기가 버거운 것이다 |

**어느 갈래에도 `text`가 없다**(002 FR-016, FR-017a). 이 불변식이 002의 것이고 넓히지
않는다.

**`rejected`가 `why`를 담을 수 있으나 거부된 글은 담지 않는다.** `why`는 진단용이며,
사용자에게는 「할 수 있는 것」으로 옮겨진다(FR-017e).

**이것이 계약을 바꾸는 것이 아닌 이유**: 002가 `GenerationFailure`를 유니온으로 둔 것은
갈래가 늘 것을 전제한 구조다. 늘어난 갈래가 기존 불변식(「`text` 없음」)을 지키는 한
FR-025의 「자리 수와 갈래를 넓히지 않는다」에 걸리지 않는다 — 그 조항이 막은 것은
`DiaryEntry`·`DiaryRequest`의 모양이 바뀌는 것이다.

---

## 바뀌지 않는 것

| 타입 | 어디 | 왜 그대로인가 |
| --- | --- | --- |
| `DiaryEntry` | 002 | 이 기능은 그 자리에 처음으로 진짜 값을 넣을 뿐이다 |
| `DiaryRequest` | 002 | 프롬프트 구성의 입력이며 모양이 맞다 |
| `DiaryDraft` | 002 | `{ text }` 하나인 것이 이 기능의 방어선이 됐다 |
| `PipelineStage` | 002 | 새 단계가 필요 없다 — 판정이 어댑터 안쪽이다 |
| `DaySignals` | 004 | 읽기만 한다 |
| `ModelAsset`·`ModelReadiness` | 003 | 읽기만 한다 |
| `Character`·`VisionSetting` | 002 | 그대로 |

**`PipelineStage`가 그대로인 것이 설계의 결과다.** 판정을 파이프라인에 두었다면 단계가
하나 늘었을 것이고, 그러면 **거부될 텍스트를 담은 `DiaryDraft`가 존재하는 순간**이
생겼을 것이다(research §5).

---

## 상태 전이 — 모델 적재

```
        ┌──────────┐
        │  없음    │ ←──────────────┐
        └────┬─────┘                │
             │ load(A)              │ unload()
             ▼                      │
        ┌──────────┐                │
        │ A 열림   │────────────────┘
        └────┬─────┘
             │ load(B)  →  먼저 A를 unload 한 뒤 B를 load
             │            (둘이 동시에 열린 순간이 없다)
             ▼
        ┌──────────┐
        │ B 열림   │
        └──────────┘
```

**`load(A)`가 이미 A가 열린 상태에서 불리면 재사용한다** — 닫았다 여는 것은 느리고,
E1(한 번에 하나)을 어기지 않는다.

**어느 경로로 끝나도 「없음」으로 돌아온다**(E2). 성공·실패·끊김·예외 전부 마찬가지이며,
돌아오지 않으면 다음 요청이 메모리 부족으로 죽는다.

---

## 생성 한 번의 흐름

```
파이프라인 (002, 그대로)
  → day-not-closed?  already-running?  signals  request-build  model-not-ready
  → backend.generate(request)
       ├ vision이 none이 아니면 → not-implemented        (FR-022)
       ├ buildPrompt(request)                            (prompt.ts, 순수)
       ├ engine.load(character)                          → 실패 시 model-load-failed
       ├ engine.run(prompt, limits)  [시간 한도 감시]     → RunResult
       ├ judge(text, ending, character, instructionLines())
       │      ├ ok    → DiaryDraft { text }
       │      └ 거부  → GenerationFailure (text 없음)
       └ engine.unload()   ← 어느 경로로든 (E2)
  → 저장 (성공한 경우만, 하루 하나 덮어쓰기)
```

**`unload()`가 흐름의 바깥에 있는 것이 의도적이다.** 성공 경로에만 두면 실패에서 새고,
실패는 잊기 쉬운 자리다.

**판정이 `generate()` 안에 있으므로 `DiaryDraft`는 통과한 글만 담는다.** 002의 계약을
넓히지 않으면서 불변식이 하나 강해졌다.
