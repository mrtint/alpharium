# 계약: 모델 로드 신호 (onStage("load", ...))

**대상**: `src/inference/engine-port.ts`, `src/inference/llama-port.ts`,
`src/inference/on-device.ts`, `src/inference/types.ts`
**관련 요구사항**: FR-001, FR-002, FR-011, FR-012, FR-013

---

## 신호 흐름

```
on-device.ts generate()
  ├─ (vision 처리 — 015와 동일, readPhotos() 완료까지 대기)
  ├─ buildPrompt(...)
  ├─ onStage?.("load")                    ← ★ 로드 시작. branch 없음(아직 모름)
  ├─ engine.load(request.character)       ← llama-port.ts가 warm 판정
  │    └─ LoadResult: { ok: true; warm } | { ok: false; reason }
  ├─ (!loaded.ok)면 model-load-failed로 반환, 이 아래 신호는 안 보낸다
  ├─ (cancel.cancelled === true)면 ★ engine.unload() 후 { kind: "interrupted" }
  │    로 반환한다 — 확정 신호도 "generation"도 보내지 않는다(research.md §7,
  │    FR-013)
  ├─ onStage?.("load", loaded.warm ? "hot" : "cold")   ← ★ 로드 완료, 확정
  ├─ onStage?.("generation")              ← 015와 동일
  └─ engine.run(...)
```

## 취소 — 로드 자체는 중단되지 않는다 (FR-013, research.md §7)

**`llama.rn`의 `initLlama()`에는 로드를 중단할 API가 없다**(research.md
§7 실측 — `LlamaContext`가 노출하는 `stopCompletion()`은 생성 중인
completion만 멈춘다). 그러므로 `stop()`이 `cancel.cancelled = true`를
세워도 이미 시작된 `engine.load()` 호출은 끝까지 실행된다 — 이것은
새로 만드는 제약이 아니라 네이티브 라이브러리의 한계를 있는 그대로
반영한 것이다.

**`engine.load()`가 완료되면(성공이든 실패든) 그 즉시 `cancel.cancelled`
를 다시 확인한다** — 011의 `captionAll()`이 루프를 마친 뒤
`cancel?.cancelled`를 재확인해 `null`(버림)을 돌려주는 것과 같은
패턴이다(`caption.ts:156`). 로드 성공 후 취소 상태였다면:

1. 콜드/핫 확정 신호(`onStage("load", ...)`)를 보내지 않는다 — 사용자가
   이미 그만두기를 눌렀으므로 새 정보를 보여줄 이유가 없다.
2. `engine.unload()`로 방금 연 모델을 즉시 정리한다(E2 불변식 — 정리를
   빠뜨리면 다음 요청이 메모리 부족으로 죽는다).
3. `{ kind: "interrupted" }`를 반환한다 — 005가 이미 정의한 갈래를
   재사용한다("앱이 앞을 벗어나 끊겼다, 사용자가 떠나서 그런 것이다"라는
   뜻이 취소 버튼과 정확히 같은 사실이므로 새 갈래를 만들지 않는다,
   FR-016d 유지). 화면은 기존 007 취소 처리 경로를 그대로 탄다.

**로드 실패 후 취소 상태였다면** 별도 처리가 필요 없다 — 이미
`model-load-failed`로 반환되는 경로이고, 이 경로는 애초에 콜드/핫 확정
신호를 보내지 않는다(취소든 아니든 결과가 같다).

## LoadResult — warm 판정의 근거

`llama-port.ts`의 `load()`가 이미 갖고 있는 판정을 반환값에 싣는다
(research.md §1):

```ts
async load(character: Character): Promise<LoadResult> {
  const warm = context !== null && openFor === character;
  if (warm) return { ok: true, warm: true };

  if (context !== null) await this.unload();

  // ... 기존 로드 로직 ...
  // 성공 시: return { ok: true, warm: false };
  // 실패 시: return { ok: false, reason: ... };  // 변경 없음
}
```

**`warm`은 새로 재는 값이 아니다.** `context !== null && openFor ===
character` 비교는 005부터 있던 E1 재사용 로직 그 자체이며, 016은 그
판정 결과를 밖으로 낼 뿐이다.

## 누가 언제 보내는가

| 신호 | 보내는 자리 | 조건 |
| --- | --- | --- |
| `onStage("load")` (branch 없음) | `on-device.ts`의 `generate()`, `engine.load(request.character)` 호출 **직전** | 항상 (엔진이 있고 vision 단계를 통과한 뒤) |
| `onStage("load", "cold"\|"hot")` | `on-device.ts`의 `generate()`, `engine.load()` 호출 **직후**, `loaded.ok === true`일 때만 | 로드 성공 시에만. 실패하면 이 신호를 보내지 않고 `model-load-failed`로 반환한다 |

**두 신호는 항상 쌍으로 온다(성공 경로에서).** 로드가 실패하면 첫 신호만
오고 두 번째는 오지 않는다 — 이것이 FR-011("실패 시 기존 실패 화면으로
전환되고 독백이 남지 않는다")의 근거다.

## 화면(state.ts)이 첫 신호를 받았을 때

**`stage: "load", branch: undefined` 신호를 받아도 화면 상태(`stage`·
`branch`·`line`)를 갱신하지 않는다**(research.md §2 결정). 직전 단계(사진
보기)의 마지막 문구가 화면에 그대로 남아 있다가, 두 번째 신호(콜드/핫
확정)가 오면 그때 `stage: "load"`, `branch`, 새 `line`으로 한 번에
갱신된다.

**근거**: 로드 시작 시점에는 콜드/핫을 모르므로 보여줄 문구 자체가
없다(원칙 II·V — 모르는 것을 안다고 말하지 않는다). 별도의 "확인 중"
문구 풀을 만들지 않기로 한 이유는 research.md §2에 있다.

## 검증 표

| 상황 | 기대 | 근거 |
| --- | --- | --- |
| 캐릭터 모델이 처음 로드됨(콜드) | `onStage`가 `"load"`(branch 없음) → `"load", "cold"` → `"generation"` 순서로 불린다 | FR-002, SC-001 |
| 같은 캐릭터로 바로 다시 생성(핫) | `onStage`가 `"load"`(branch 없음) → `"load", "hot"` → `"generation"` 순서로 불린다. `"cold"`는 한 번도 안 온다 | FR-002, SC-002 |
| 다른 캐릭터로 전환 후 생성 | 이전에 어떤 캐릭터가 열려 있었든 `openFor !== character`이므로 `warm: false` — `"cold"`가 온다 | Edge Case(005 E1) |
| 모델 로드 실패(`not-found`\|`load-failed`) | `onStage`가 `"load"`(branch 없음)까지만 오고, 확정 신호(`"cold"`\|`"hot"`)와 `"generation"`은 오지 않는다. 결과는 `model-load-failed` | FR-011 |
| 로드 진행 중 `stop()` 호출(취소), 로드는 성공으로 끝남 | 확정 신호(`"cold"`\|`"hot"`)와 `"generation"`이 오지 않는다. `engine.unload()`가 불린다. 결과는 `{ kind: "interrupted" }` | FR-013 |
| `onStage`를 안 넘김 | 기존 `on-device.test.ts` 테스트가 그대로 통과한다 | 옵셔널 확장(003·012·015 선례) |

## 불변식

1. **콜백은 순서를 보장한다.** `"load"`(branch 없음)가 `"load"`(branch
   확정)보다 항상 먼저 오고, 그 뒤에 `"generation"`이 온다 — 동기적으로
   순서가 정해진 코드 경로다.
2. **로드 실패 시 확정 신호는 오지 않는다.** 콜드/핫 어느 쪽도 "실패한
   로드"를 설명하지 않는다 — 실패는 완전히 별도 화면(FR-011)이 맡는다.
3. **`branch`는 `"cold"`/`"hot"` 둘 중 하나이거나 `undefined`뿐이다.**
   로드 시간(밀리초)이나 재시도 횟수를 담지 않는다(원칙 IV).
4. **콜백이 없어도(옵셔널 생략) 생성 전체 흐름이 지금과 동일하게
   동작한다.**
5. **로드 자체는 중단되지 않는다 — 취소는 로드 완료 직후에만 반영된다**
   (FR-013). "그만두기"를 눌러도 로드가 끝날 때까지는 화면이 전환되지
   않는다 — 이것은 결함이 아니라 네이티브 라이브러리의 한계를 정직하게
   반영한 설계다(research.md §7).
