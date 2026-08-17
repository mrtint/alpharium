# 계약: 생성 엔진

**Feature**: 005-diary-generation
**모듈**: `src/inference/engine-port.ts`(계약) · `src/inference/llama-port.ts`(기기 구현)
· `src/inference/sampling.ts`(공유 값)

**기기에 닿는 유일한 자리다**(FR-023). 004의 `signals/expo-port.ts`, 003의
`models/expo-port.ts`와 같은 역할이다.

---

## 이 자리가 무엇을 지키는가

**원칙 IV가 저장소 밖에서 밀고 들어오는 첫 자리다.**

001~004에서 원칙 IV는 "우리가 측정 코드를 쓰지 않는다"로 지켜졌다. 여기서는 다르다 —
`llama.rn`의 `completion()`이 **요청하지 않은 지표를 결과에 담아 보낸다**(research §1):

```
tokens_predicted, tokens_evaluated, draft_tokens, draft_tokens_accepted,
timings: { prompt_ms, prompt_per_second, predicted_ms,
           predicted_per_token_ms, predicted_per_second, ... }
```

**그래서 방어가 「안 쓴다」가 아니라 「경계에서 버린다」여야 한다.** 이 포트가 그 경계다.
여기서 걸러내지 않으면 지표가 어댑터를 지나 위로 새고, 그 순간 저장소가 다시 「측정하는
제품」이 된다.

---

## 계약: `GenerationEngine`

```
load(character: Character)        → Promise<LoadResult>
run(prompt: string, limits)       → Promise<RunResult>
stop()                            → Promise<void>
unload()                          → Promise<void>
```

**`Character`를 받고 경로를 받지 않는다.** 경로는 003의 `assetFor()`와 저장 자리만 아는
값이며, 포트가 경로를 인자로 받으면 부르는 쪽이 경로를 알아야 하고 그것이 원칙 III의
누출 경로다.

### `RunResult` — **여기가 방어선이다**

```
{ text: string, ending: Ending }
```

**이 둘뿐이다.** `NativeCompletionResult`의 나머지 필드는 **포트 구현 안에서 버려진다.**

| 네이티브 필드 | 어떻게 되는가 |
| --- | --- |
| `text` | 그대로 |
| `stopped_eos` / `stopped_limit` / `truncated` / `context_full` / `interrupted` | **`Ending` 하나로 접힌다** |
| `timings.*` | **버린다** (원칙 IV) |
| `tokens_predicted` / `tokens_evaluated` / `draft_tokens*` / `tokens_cached` | **버린다** (원칙 IV) |
| `reasoning_content` / `tool_calls` / `chat_format` | 버린다 (쓰지 않는다) |

**`Ending`으로 접는 것이 판정을 쉽게 하려는 편의가 아니다.** 다섯 불리언을 그대로
올려보내면 부르는 쪽이 조합을 해석해야 하고, 해석이 두 곳에 생기면 어긋난다. 하나의
갈래로 접으면 해석이 이 포트에만 있다.

### `Ending` 매핑 (research §1의 실측에 근거)

```
interrupted === true    → { kind: "interrupted" }
context_full === true   → { kind: "context" }
truncated === true      → { kind: "context" }
stopped_limit           → { kind: "length" }
stopped_eos === true    → { kind: "eos" }
그 외                   → { kind: "length" }   ← 모르면 정상이 아닌 쪽으로
```

**마지막 줄이 원칙 V다.** 어느 갈래에도 안 맞으면 「끝났다」가 아니라 「끝나지 않았다」로
본다. 모르는 것을 정상으로 처리하면 잘린 글이 일기가 된다.

`timeout`은 네이티브가 주지 않는다 — **어댑터가 시간 한도를 재서 붙인다**(FR-021).

### `LoadResult`

```
{ ok: true }
{ ok: false, reason: "not-found" | "load-failed" }
```

**모델 정보를 담지 않는다**(FR-010, 원칙 III). `LlamaContext`의 `model`·`systemInfo`·
`devices`·`gpu`를 밖으로 내보내지 않는다 — 그 안에 모델 메타데이터가 들어 있다.

**`reason`이 둘인 이유**: 파일이 없는 것(003이 지웠거나 사용자가 지웠다)과 있는데 못 여는
것(깨졌거나 메모리가 모자라다)은 사용자가 할 일이 다르다(FR-017d).

---

## 불변식

### E1. 한 번에 하나만 열린다 (FR-008)

`load()`가 이미 열린 것이 있으면 **먼저 닫는다.** 두 컨텍스트가 동시에 존재하는 순간이
없어야 한다 — GB 단위 모델 둘이면 기기가 죽는다.

**같은 캐릭터를 다시 `load()`하면 열린 것을 재사용해도 된다.** 닫았다 여는 것은 느리고,
같은 것이 열려 있는 것은 E1을 어기지 않는다.

### E2. 어떻게 끝나든 정리된다 (FR-009, FR-021d)

성공·실패·끊김·예외 어느 경로로도 `unload()`가 불린다. **정리되지 않으면 다음 요청이
메모리 부족으로 죽는다** — 실패 경로에서 잊기 가장 쉬운 자리다.

### E3. 토큰 콜백을 넘기지 않는다 (FR-028b)

`completion()`의 두 번째 인자를 **주지 않는다.** 스트리밍 경로가 코드에 존재하지 않으면
판정을 통과하지 않은 글이 화면에 닿을 방법이 없다.

**조심해서 안 쓰는 것이 아니라 못 쓰게 한다** — 003의 types.ts가 안쪽/바깥쪽 타입을
가른 것과 같은 판단이다.

### E4. 지표가 경계를 넘지 못한다 (FR-011, 원칙 IV)

`RunResult`에 `text`와 `ending` 외의 자리가 없다. **자리가 없으면 담을 수 없다.**

### E5. 예외를 던지지 않는다

실패는 값이다. 002가 `GenerationFailure`를 값으로 둔 것, 001이 `ModuleStatus`를 값으로
둔 것과 같다 — 예외는 삼켜지기 쉽고, 삼켜지면 파이프라인이 어느 단계에서 멈췄는지 말할 수
없다(002 FR-019).

**`stop()`은 예외적으로 조용히 실패해도 된다.** 이미 끝난 생성을 멈추려는 것은 정상이며,
그때의 오류는 알릴 것이 없다.

---

## 모델을 여는 값 (`ContextParams`)

| 값 | 정함 | 성질 |
| --- | --- | --- |
| `model` | 003이 저장한 경로 | 실측 (003이 확인) |
| `n_ctx` | **2048** | **짐작** — quickstart D4에서 확인 |
| `n_gpu_layers` | **0** | **짐작** — 안드로이드 GPU 오프로드는 기기마다 다르다 |
| `n_threads` | 주지 않음 | 기본값. 정하면 그것이 성능 튜닝이다 |

**짐작인 값에는 주석으로 짐작임을 남긴다**(원칙 V). 004의 `DEFAULT_PHOTO_LIMIT`가
「200은 짐작이며 실측이 아니다」를 남긴 것과 같은 형태다.

---

## 샘플링 (`sampling.ts`) — 양쪽이 공유하는 유일한 자리

**온디바이스와 데스크톱이 같은 값을 쓴다**(FR-005·005a). 각자 만들면 헌법 원칙 I이
요구한 「동일한 샘플링 파라미터」가 조용히 깨진다.

| 값 | 성질 |
| --- | --- |
| `temperature` | **짐작** |
| `top_p` / `top_k` | **짐작** |
| `n_predict` (길이 한도, FR-021a) | **짐작** — `n_ctx`와 함께 봐야 한다 |
| `seed` | 주지 않음 (매번 다른 일기) |

**캐릭터별로 다르지 않다.** 다르면 성격이 파라미터에서 오게 되고, 그것도 지어낸 성격이다
(원칙 III, spec Key Entities).

**전부 짐작이며 실측이 아니다.** 어떤 값이 좋은지는 관측이 필요한 일이고, 그 관측은 이
저장소의 몫이 아니다(원칙 IV — 별도 저장소에서 한다).

---

## 시간 한도 (FR-021)

**어댑터가 잰다.** 네이티브가 주지 않으므로 `run()`을 감싸 한도를 넘으면 `stop()`을 부르고
`{ kind: "timeout" }`으로 끝낸다.

**한도 값은 짐작이다** — quickstart D5에서 실제 소요를 보고 정한다. 너무 짧으면 정상
생성이 잘리고, 너무 길면 사용자가 갇힌다.

**재는 것과 기록하는 것은 다르다.** 한도를 위해 시간을 보는 것은 필요하고, 그 값을 결과에
담거나 저장하는 것이 금지다(FR-011).

---

## 앱이 앞을 벗어날 때 (FR-021b·c·d)

```
AppState가 active를 벗어남
  → stop()
  → run()이 { interrupted: true }로 정상 resolve  ← 예외가 아니다 (research §2)
  → Ending은 "interrupted"
  → 판정이 unfinished로 거부           ← 부분 출력이 여기서 막힌다
  → unload()
```

**`stop()`이 `run()`을 거부시키지 않는다.** `try/catch`로 끊김을 잡으려 하면 놓친다 —
끊김은 값으로 온다.

**끊긴 결과에도 `text`에 거기까지의 글이 들어 있다.** 판정이 `unfinished`를 **가장 먼저**
보므로 통과하지 못한다(acceptance.md 「순서」).

---

## 금지

- **`LlamaContext`를 포트 밖으로 내보내지 않는다** — `model`·`systemInfo`에 모델 정보가 있다
- **`timings`·`tokens_*`를 어떤 형태로도 올려보내지 않는다**(E4) — 로그도 포함
- **토큰 콜백을 넘기지 않는다**(E3)
- **`parallel.*`를 쓰지 않는다** — 병렬 큐는 E1과 어긋난다
- **둘 이상을 동시에 열지 않는다**(E1)
- **경로를 인자로 받지 않는다** — `Character`를 받는다
- **예외를 던지지 않는다**(E5)

---

## 검증

### 기기 없이 (대역 엔진)

| # | 무엇 |
| --- | --- |
| E-1 | 다른 캐릭터를 `load()`하면 앞의 것이 먼저 닫힌다 |
| E-2 | 생성 실패·예외 경로에서도 `unload()`가 불린다 |
| E-3 | 시간 한도를 넘으면 `stop()`이 불리고 `timeout`으로 끝난다 |
| E-4 | `RunResult`에 `text`·`ending` 외의 필드가 없다 |
| E-5 | `LoadResult`에 모델 정보가 없다 |
| E-6 | 끊긴 결과의 부분 출력이 저장되지 않는다 |

### 실기기 (대역으로 못 하는 것)

| # | 무엇 | quickstart |
| --- | --- | --- |
| E-7 | `initLlama`가 실제로 성공한다 | D1 |
| E-8 | 일기가 실제로 나온다 | D2 |
| E-9 | 백그라운드 전환에서 끊기고 정리된다 | D3 |
| E-10 | `n_ctx` 2048이 맞는가 (`context_full`이 잦지 않은가) | D4 |

**E-7~E-10은 대역으로 검증되지 않는다.** 건너뛰면 이 기능은 끝나지 않은 것이다(원칙 V).
