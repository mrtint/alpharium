# Data Model: 쓰는 중 독백

## ProgressStage

```ts
// src/inference/types.ts
export type ProgressStage = "signals" | "vision" | "generation";
```

- **`PipelineStage`(pipeline.ts)와 이름·목적이 다르다.** `PipelineStage`는
  "어디서 실패로 멈췄는가"(`day-not-closed`·`already-running`·`signals`·
  `request-build`·`model-not-ready`·`vision`·`generation`·`storage`)를 나타내는
  실패 갈래이고, `ProgressStage`는 "지금 무엇을 하는가"를 실시간으로 알리는
  진행 신호다. **우연히 `"signals"`·`"vision"`·`"generation"` 문자열이 겹치는
  것은 의미가 같아서이지 같은 타입을 재사용해서가 아니다** — 둘은 독립적으로
  선언되고, 실패 판정 테스트(002 FR-019)와 진행 신호 테스트가 서로 오염되지
  않는다.
- **숫자·Date·객체를 담지 않는다.** 이 타입이 문자열 리터럴 유니온 하나뿐인
  것 자체가 원칙 IV의 방어다 — 다른 필드를 추가하면(예: `{ stage: "vision",
  photoIndex: 2 }`) 그 순간 진행률이 된다.

## onStage 콜백

```ts
// src/inference/types.ts — InferenceBackend
export interface InferenceBackend {
  readonly location: InferenceLocation;
  isAvailable(): Promise<ModuleStatus>;
  generate(
    request: DiaryRequest,
    onStage?: (stage: ProgressStage) => void,
  ): Promise<GenerationResult>;
}
```

- **옵셔널이다.** 안 넘기면 지금과 완전히 같은 동작이다(003 `isModelReady?`
  선례). `desktop-server.ts`는 이 인자를 무시해도 된다.
- **동기 함수다.** 콜백이 `Promise`를 반환하지 않는다 — 화면 상태 갱신은
  동기 `setState`로 충분하고, 콜백이 비동기이면 호출 순서를 기다리다 생성이
  지연될 위험이 생긴다.
- **`on-device.ts`의 `generate()`는 `"vision"`을 직접 보내지 않는다.**
  `onStage`가 `readPhotos()`에 그대로 전달되고, `readPhotos()`는 그것을
  `captionAll()`의 `onPhotoStart`로 감싸 넘긴다(「사진 전환 신호」 절 참조)
  — `"vision"`의 유일한 발생원은 `captionAll()`의 `for` 루프다. `generate()`
  가 직접 보내는 것은 하나뿐이다:
  1. `engine.run()`을 부르기 직전(304행 근방, `runWithTimeout` 호출 직전) —
     `onStage?.("generation")`.

  ★ **2026-08-23 `/speckit-analyze` C1 정정**: 이전 버전은 여기서
  `readPhotos()` 호출 직전에도 `onStage?.("vision")`을 별도로 보내라고
  했으나, 「사진 전환 신호」 절의 `onPhotoStart`(→`onStage("vision")`)와
  중복 발화되어(사진 1장에서 `"vision"`이 2회 옴) 삭제했다.
- **`"signals"`는 `on-device.ts`가 아니라 `pipeline.ts`가 보낸다** — 신호
  수집은 파이프라인의 3단계이며 백엔드 진입 전에 끝난다. `runStages()`가
  `deps.loadSignals(input.day)`를 부르기 직전에 `onProgress?.("signals")`를
  호출한다.

## Pipeline.run() 확장

```ts
// src/diary/pipeline.ts
export interface Pipeline {
  run(input: PipelineInput, onProgress?: (stage: ProgressStage) => void): Promise<PipelineResult>;
}
```

- **옵셔널 두 번째 인자다.** 안 넘기면 기존 `pipeline.test.ts`의 모든 호출이
  그대로 통과해야 한다.
- **`runStages()`에 그대로 전달되고, `deps.backend.generate(request.request,
  onProgress)`로 백엔드까지 이어진다.** 파이프라인은 이 신호의 내용을
  해석하거나 가공하지 않는다 — 중계기 역할만 한다(핵심 배선 위험, plan.md
  참조).

## AppScreen 확장 ("writing" 상태)

```ts
// src/app/state.ts
export type AppScreen =
  | ...
  | { kind: "writing"; stage?: ProgressStage; line?: string }
  | ...
```

- **`stage`·`line` 둘 다 옵셔널이다.** 화면이 뜬 직후, 첫 `onProgress` 호출
  전에는 둘 다 `undefined`일 수 있다 — 그 순간에는 기존처럼 "쓰고 있다"만
  보여도 FR-011(짧게 지나가도 어색하지 않다)을 어기지 않는다.
- **`line`을 따로 두는 이유**: `pickMonologue(stage, previous)`가 "직전
  문구와 다른 것"을 고르려면 직전에 무엇을 보여줬는지 상태로 들고 있어야
  한다. `stage`만 있으면 매번 같은 후보 목록에서 처음 것만 고르거나 매번
  새로 무작위로 뽑아 우연히 같은 문구가 연달아 나올 수 있다 — `line`이
  "직전에 실제로 보여준 문구 문자열"을 들고 있어야 FR-014(연속 반복 금지)를
  지킬 수 있다.
- **`toWriting()` 계열 생성자가 이 필드들을 초기화하지 않는다.** `{ kind:
  "writing" }`만으로 시작하고, 화면이 `onProgress` 콜백 안에서
  `setScreen((s) => { if (s.kind !== "writing") return s; const line =
  pickMonologue(stage, s.line); return { ...s, stage, line }; })`로
  갱신한다 — 007이 세운 "진행률·시간이 들어갈 자리가 없다"는 방어를 이
  필드들 추가로 깨지 않기 위해, 타입 자체를 `ProgressStage | undefined`·
  `string | undefined`로 좁힌다(숫자·객체가 들어갈 수 없다).

## 사진 전환 신호 (Photo Advance)

```ts
// src/vision/caption.ts
export type PhotoAdvanceSignal = () => void;

export async function captionAll(
  engine: VisionEngine,
  photos: readonly Photo[],
  available: number,
  resolvePath: PhotoPathResolver,
  cancel?: CancelSignal,
  resize?: ResizeExecutor,
  cleanup?: ResizedPhotoCleaner,
  onPhotoStart?: PhotoAdvanceSignal,   // ★ 신규, 옵셔널
): Promise<PhotoVision | null>
```

- **인자를 받지 않는다.** 순번·`Photo.id`·남은 장수 어느 것도 넘기지 않는다
  — "무언가 바뀌었다"는 사실만 전달한다(research.md §6).
- **for 루프의 매 반복 시작 시점**(72행, `for (const photo of photos)`의
  본문 최상단, 취소 검사 이후·경로 해석 이전)에 부른다. 사진이 1장이면
  1회, N장이면 N회 불린다 — 순번을 세지는 않지만 호출 횟수는 실제 장수와
  일치한다(FR-013의 "장 전환마다 갱신" 요구가 이 호출 횟수로 충족된다).
- **`on-device.ts`의 `readPhotos()`가 이 콜백을 만들어 `captionAll()`에
  전달한다.** `generate()`가 받은 `onStage`를 `readPhotos(vision, request,
  cancel, onStage)`로 그대로 넘기고(시그니처 확장), `readPhotos()` 내부에서
  `() => onStage?.("vision")`을 사진 전환 콜백으로 만들어 `captionAll()`에
  넘긴다 — **`"vision"`이 나가는 자리는 이 한 곳뿐이다**(진입과 전환을
  구분하는 별도 발화가 없다, C1 정정). 화면 입장에서는 "vision 단계에서
  문구가 갱신되라는 신호가 왔다"만 알면 되고, 그것이 최초 진입인지 장
  전환인지 구분할 필요가 없다(둘 다 같은
  처리: "새 vision 문구를 골라라").

## MonologueLine (문구 후보와 선택)

```ts
// src/diary/monologue.ts
export function pickMonologue(
  stage: ProgressStage,
  previous: string | undefined,
  random: () => number = Math.random,
): string
```

- **캐릭터를 인자로 받지 않는다**(spec Assumptions — 캐릭터별 어조는 범위
  밖). `Character`·`roster.ts`·`persona.ts`를 import하지 않는다 — `persona.ts`
  가 이미 "roster.ts도 ModelAsset도 import하지 않는다"를 계약으로 선언한
  것과 같은 격리를, 이 파일도 반대 방향(다른 파일이 이 파일 때문에 로스터에
  닿지 않는다)으로 지킨다.
- **단계별 문구 후보는 정확히 2개 이상, 서로 다른 서술어로 미리 써 둔다**
  (research.md §7). 내부적으로 `Record<ProgressStage, readonly string[]>`가
  아니라 **`Record<ProgressStage, readonly [string, string, ...string[]]>`**
  (최소 2개 원소 튜플)로 선언한다 — 후보가 1개 이하인 단계는 타입 자체가
  허용하지 않는다. `ProgressStage` 세 갈래 전부에 대해 정의되어 있어야
  하며, 후보를 빠뜨리면 컴파일 타임에 잡힌다.
- **`previous`가 주어지면 그것과 다른 후보를 고른다.** 최소 2개 타입
  보장 덕분에 "후보가 하나뿐이라 같은 것을 돌려주는" 경로는 존재하지
  않는다 — 안전판 코드·테스트를 별도로 두지 않는다(research.md §7,
  2026-08-23 `/speckit-analyze` C3 정정: 이전 버전은 "최소 1개, 안전판
  있음"으로 `contracts/monologue.md`와 모순됐다).
- **`random`은 옵셔널이며 기본값이 `Math.random`이다.** 테스트에서는
  결정론적 함수(예: 고정 시퀀스를 도는 함수)를 주입해 "직전과 다른 후보를
  고른다"를 검증한다 — 001의 `probe`, 005의 `engine` 주입과 같은 테스트
  가능성 패턴.
- **순수 함수다.** 숫자·시간 값을 문자열에 삽입하지 않는다. 부작용이 없다
  (내부 상태를 갖지 않는다 — "직전 문구"는 화면(state.ts)이 들고 있다가
  매번 인자로 넘긴다).
