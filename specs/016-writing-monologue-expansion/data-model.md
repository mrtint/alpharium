# Data Model: 쓰는 중 독백 확장

## ProgressStage (확장)

```ts
// src/inference/types.ts
export type ProgressStage = "signals" | "vision" | "generation" | "load";
```

- **`"load"` 값 하나만 추가한다.** 015의 세 값은 그대로 유지된다.
- **파이프라인 실행 순서상 `"load"`는 `"vision"`과 `"generation"` 사이에
  위치한다**(spec Clarifications, research.md §1·plan.md Summary) — 캐릭터
  모델은 사진 보기에 쓰인 VLM과 별개 엔진이라 사진을 다 본 뒤에만 열린다
  (E1 불변식).
- **여전히 숫자·Date·객체를 담지 않는다.** 문자열 리터럴 유니온 하나뿐인
  것이 원칙 IV의 방어다.

## MonologueBranch (신설)

```ts
// src/inference/types.ts
export type MonologueBranch = "cold" | "hot" | "normal" | "many";
```

- **`stage`와 독립된 별개 타입이다**(clarify 결정 — `ProgressStage` 자체를
  확장하지 않는다). `stage`가 "load"일 때만 `"cold"`/`"hot"`이 의미를
  갖고, `stage`가 "vision"일 때만 `"normal"`/`"many"`가 의미를 갖는다 —
  이 대응 규칙은 타입이 강제하지 않고 `pickMonologue()`의 계약(아래)이
  문서화한다.
- **`stage`가 "signals"·"generation"이거나, "load"의 로드-시작 신호(아직
  콜드/핫 미확정)일 때는 `branch`가 `undefined`다.**
- 문자열 리터럴 유니온이므로 숫자·객체를 담을 수 없다(원칙 IV 방어,
  015의 `ProgressStage`와 같은 성격).

## LoadResult (확장)

```ts
// src/inference/engine-port.ts
export type LoadResult =
  | { ok: true; warm: boolean }
  | { ok: false; reason: "not-found" | "load-failed" };
```

- **`{ ok: false }` 갈래는 변경 없다.** 실패에는 콜드/핫이 의미가 없다.
- **`warm`이 콜드/핫의 유일한 근거값이다.** `true`면 이미 같은 캐릭터가
  열려 있어 재사용했다(핫 스타트), `false`면 새로 적재했다(콜드
  스타트) — `llama-port.ts`의 `load()`가 이미 판정하는 사실
  (`context !== null && openFor === character`, research.md §1)을 그대로
  반환값에 싣는다. 새로 재는 값이 아니다(원칙 IV).
- **모델 정보를 담지 않는다는 기존 계약은 그대로 유지된다.** `warm`은
  불리언 하나이지 모델 식별자나 로드 시간이 아니다.

## onStage 콜백 (확장 — 로드 신호 두 단계)

```ts
// src/inference/types.ts — InferenceBackend
export interface InferenceBackend {
  readonly location: InferenceLocation;
  isAvailable(): Promise<ModuleStatus>;
  generate(
    request: DiaryRequest,
    onStage?: (stage: ProgressStage, branch?: MonologueBranch) => void,
  ): Promise<GenerationResult>;
}
```

- **시그니처가 `(stage, branch?)`로 넓어진다.** 015의 `(stage: ProgressStage)
  => void`에 옵셔널 두 번째 인자가 붙는다 — 안 넘기면(015 시절 호출부)
  `undefined`로 취급되어 기존 동작과 같다.
- **`on-device.ts`의 `generate()`가 로드 신호를 두 번 보낸다**
  (research.md §2):
  1. `engine.load(request.character)`를 부르기 **직전** —
     `onStage?.("load")`(branch 없음, 아직 콜드/핫 모름).
  2. `engine.load()`가 완료된 **직후**, 성공한 경우에만 —
     `onStage?.("load", loaded.warm ? "hot" : "cold")`.
  실패(`!loaded.ok`)하면 두 번째 신호를 보내지 않고 그대로
  `model-load-failed`를 반환한다 — 015 FR-009의 연장(실패 시 독백은
  실패 화면으로 전환되고 남지 않는다).
- **`"vision"` 신호에 사진 보기 갈래(many/normal)가 실린다**(research.md
  §3). `readPhotos()`가 `selectForVision()` 직후, `captionAll()`을 부르기
  전에 `onStage?.("vision", branch)`를 한 번 보낸다 — `branch`는
  `selected.length >= VISION_PHOTO_LIMIT ? "many" : "normal"`. 이후
  `captionAll()`의 `onPhotoStart`가 만드는 장 전환 신호(`onStage?.(
  "vision")`, branch 없음)에서는 화면이 **직전에 저장해 둔 branch를
  계속 사용한다**(아래 「AppScreen 확장」 참조) — `captionAll()` 자체는
  015와 동일하게 인자 없는 `PhotoAdvanceSignal`을 그대로 쓴다.
- **`"generation"` 신호는 015와 동일하다.** branch 없이 `onStage?.(
  "generation")` 한 번.
- **`"signals"` 신호는 015와 동일하다.** `pipeline.ts`가 보내고 branch가
  없다.

## Pipeline.run() 확장

```ts
// src/diary/pipeline.ts
export interface Pipeline {
  run(
    input: PipelineInput,
    onProgress?: (stage: ProgressStage, branch?: MonologueBranch) => void,
  ): Promise<PipelineResult>;
}
```

- **시그니처만 onStage와 함께 넓어진다.** 파이프라인은 여전히 이 신호의
  내용을 해석·가공하지 않고 `deps.backend.generate(request.request,
  onProgress)`로 그대로 중계한다(015와 같은 "중계기" 역할 — `"load"`
  신호도 파이프라인은 만들지 않는다, `on-device.ts`만 안다).

## AppScreen 확장 ("writing" 상태)

```ts
// src/app/state.ts
export type AppScreen =
  | ...
  | {
      kind: "writing";
      stage?: ProgressStage;
      branch?: MonologueBranch;
      line?: string;
    }
  | ...
```

- **`branch` 필드가 새로 추가된다.** `stage`·`line`은 015와 동일한 역할을
  유지한다.
- **`branch`는 "직전에 유효했던 갈래"를 기억한다** — `stage`가 바뀌어도
  같은 `stage` 안에서 branch 없는 신호(사진 전환, generation 시작 등)가
  오면 이전 `branch` 값을 그대로 쓴다. 다만 **`stage` 자체가 바뀌면
  `branch`도 그 단계에 맞게 갱신되거나 지워진다**:
  - `"vision"`으로 처음 진입(branch 실린 신호) → `branch`를 그 값으로 설정.
  - `"vision"` 안에서 장 전환(branch 없는 신호) → 기존 `branch` 유지.
  - `"load"`로 진입(branch 없는 신호, 로드 시작) → **화면 상태를 갱신하지
    않는다**(research.md §2 결정 — 이전 단계 문구를 유지). `stage`·`branch`·
    `line` 모두 변경 없음.
  - `"load"`에서 branch 실린 신호(콜드/핫 확정) → `stage: "load"`,
    `branch`를 `"cold"`/`"hot"`로 설정, `line`을 그 갈래에서 새로 고른다.
  - `"generation"`으로 진입(branch 없는 신호) → `branch`를 `undefined`로
    지운다(generation 단계는 갈래가 없다).
- **선택 로직**: `pickMonologue(stage, branch, previous)`를 부를 때
  `previous`는 여전히 `line`(직전에 실제로 보여준 문자열)이다.
- **타입 방어는 015와 동일한 원리다.** `branch`도 문자열 리터럴 유니온
  또는 `undefined`뿐이라 숫자·객체가 들어갈 자리가 없다.

## 사진 전환 신호 (Photo Advance) — 변경 없음

015의 `PhotoAdvanceSignal`(`() => void`)과 `captionAll()`의 호출 방식은
그대로 유지된다(research.md §3 — 계약을 깨지 않는 것이 채택 이유).
`readPhotos()`가 `captionAll()` 호출 전에 별도로 `onStage("vision",
branch)`를 보내는 것이 신설 배선이다.

## MonologueLine (문구 후보와 선택 — 확장)

```ts
// src/diary/monologue.ts
export function pickMonologue(
  stage: ProgressStage,
  branch: MonologueBranch | undefined,
  previous: string | undefined,
  characterName?: string,
  random: () => number = Math.random,
): string
```

- **`branch` 매개변수가 새로 추가된다**(clarify 결정). `stage`가 "load"·
  "vision"이 아니면(또는 아직 확정 전이면) `undefined`다.
- **`characterName`이 새로 추가된다.** `stage === "load"`이고 `branch`가
  `"cold"`/`"hot"`로 확정된 경우에만 쓰인다 — 그 외 단계의 문구 풀은
  이름을 요구하지 않으므로 `undefined`로 호출해도 된다(옵셔널). 이름이
  필요한데 안 왔으면(방어적 기본값을 만들지 않는다 — 호출자가 항상 유효한
  캐릭터 이름을 갖고 있다는 것이 spec Edge Cases의 전제) 계약 테스트가
  이 조합을 요구한다.
- **`monologue.ts`는 여전히 `Character`·`roster.ts`·`persona.ts`를
  import하지 않는다**(research.md §4 — 현재 헌법 검사 규칙이 이미
  허용함을 확인). `characterName`은 `string` 타입일 뿐이다.
- **문구 후보 테이블의 키가 `(stage, branch)` 조합이 된다.** 015의
  `Record<ProgressStage, [...]>` 단일 축 테이블에서, 016은 갈래가 있는
  두 단계(`load`·`vision`)에 대해 `branch`별로 분리된 풀을 갖는다:

  | stage | branch | 풀 이름 |
  | --- | --- | --- |
  | `signals` | (없음) | signals (015 그대로, 3개 유지) |
  | `vision` | `normal` | vision-normal (10개 이상) |
  | `vision` | `many` | vision-many (10개 이상) |
  | `load` | `cold` | load-cold (10개 이상, 이름+조사 템플릿) |
  | `load` | `hot` | load-hot (10개 이상, 이름+조사 템플릿) |
  | `generation` | (없음) | generation (10개 이상) |

  타입 표현은 015의 최소-길이 튜플 패턴을 유지하되 키가 복합된다 —
  `Record<"signals" | "generation", readonly [string, string, ...string[]]>`와
  `Record<"vision" | "load", Record<MonologueBranch, readonly [string, ...9 more]>>`
  처럼 두 테이블로 나누거나, 하나의 판별 유니온으로 표현한다(구현
  단계에서 최종 형태 결정 — 어느 쪽이든 "10개 미만이면 컴파일 에러"라는
  타입 방어가 유지되어야 한다는 것이 계약이다).
- **로드 단계 문구는 이름 자리를 비운 템플릿이다.** 예:
  `"{name} 글을 쓸 준비를 하고 있어요"`에서 `{name}`이 `characterName +
  particleFor(characterName)`(아래 「조사 선택」 참조)로 치환된다.
- **`previous`와 같은 문구를 고르지 않는 규칙은 그대로 유지된다**(015
  FR-014) — 각 풀이 10개 이상이므로 이 제약이 015보다 훨씬 쉽게 지켜진다.
- **순수 함수다.** 015와 동일하게 내부 상태를 갖지 않는다.

## 조사 선택 (Particle Selection, 신설)

```ts
// src/diary/particle.ts
export function particleFor(name: string): "이" | "가"
```

- **순수 함수다.** 이름의 마지막 글자가 한글 완성형(가-힣)이면 받침
  유무를 유니코드 코드포인트 공식(`(code - 0xAC00) % 28 !== 0`)으로
  판정하고, 받침이 있으면 `"이"`, 없으면 `"가"`를 돌려준다(research.md
  §5).
- **`Character`·`roster.ts`·`persona.ts`를 import하지 않는다.** 이름
  문자열만 받는 범용 함수이며, `monologue.ts`가 이 함수를 import해
  로드 단계 문구 템플릿을 완성한다.
- **로스터 5인 이름 전부(금동이·루이·오드·샤오바이·모카)에서 올바른
  결과를 낸다**(research.md §5 표, SC-002a 근거).
