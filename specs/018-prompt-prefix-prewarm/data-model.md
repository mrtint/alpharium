# Data Model: 일기 대기 시간 단축 (고정 서두 미리 준비)

이 기능은 영속 데이터를 추가하지 않는다. 저장소(`DiaryStore`,
`DiaryEntry`)는 변경되지 않는다. 아래는 이 기능이 다루는 **메모리 내
휘발성 상태**다 — spec.md의 Key Entities를 구현 층위로 옮긴 것이다.

## 1. 준비 상태 (prepared engine state)

spec.md의 "준비 상태(prepared state)"에 대응.

**어디에 있는가**: `src/inference/llama-port.ts`의 클로저 내부
(`context`, `openFor` — 이미 존재하는 변수). 새 타입을 만들지 않는다.
"준비됐다"는 것은 `context !== null && openFor === character`라는 기존
조건으로 이미 표현 가능하다 — `prewarm()`은 이 상태에 KV 캐시 내용을
더할 뿐, 존재 자체를 나타내는 새 필드를 만들지 않는다.

**속성**:
- 어떤 캐릭터를 위해 열렸는가(`openFor: Character`) — 기존 필드
- 열린 네이티브 컨텍스트(`context: LlamaLike`) — 기존 필드
- (암묵적) KV 캐시에 고정 접두사가 프리필되어 있는가 — **이 상태는
  코드에 별도로 표현되지 않는다.** `prewarm()` 성공 여부를 밖에서 알
  필요가 없다는 것이 계약이다(원칙 IV) — 실패해도 다음 `run()`이
  느릴 뿐 틀리지 않으므로, "프리필됐는가"라는 불리언을 두는 순간 그
  것이 측정 대상이 된다.

**생명주기**:
1. 화면이 `prepare(character)`를 부른다 → `engine.load(character)` →
   `engine.prewarm(character)`. `unload()`가 불리지 않아 컨텍스트가
   열린 채로 남는다.
2. 사용자가 "쓰기"를 누른다 → `generate()`의 기존 `engine.load()`가
   같은 캐릭터를 발견하고 재사용(`warm: true`) → KV 캐시가 이미 채워진
   상태로 `run()`이 시작된다.
3. 생성이 끝나면 `generate()`의 기존 `finally { unload() }`가 컨텍스트를
   닫는다 — **1단계에서 열어 둔 것이든 방금 새로 연 것이든 구분하지
   않는다**, 기존 정리 로직 그대로.
4. 화면이 캐릭터·날짜 선택을 벗어나면(FR-008) `release()`를 불러 명시적으로
   해제한다 — 생성이 시작되지 않은 채 화면을 벗어난 경우의 정리.

**소멸 조건**: 화면 이탈(FR-008), 캐릭터 변경(새 `prepare()` 호출이
`load()`의 기존 E1 로직으로 이전 컨텍스트를 닫음), 앱이 백그라운드로
전환(`AppState` 구독, 기존 `stop()` 배선과 같은 훅 재사용), 생성 완료
(기존 `finally { unload() }`).

## 2. 미리 읽은 사진 내용 (prewarmed vision result)

spec.md의 "미리 읽은 사진 내용"에 대응. 기존 타입 `PhotoVision`
(`src/vision/types.ts`)을 그대로 쓴다 — 새 타입을 만들지 않는다.

**어디에 있는가**: `DiaryHomeScreen.tsx`의 컴포넌트 상태(신규
`useState` 또는 `useRef`) — 지금까지는 `generate()` 내부의 지역 변수
(`seen`)였던 것이, 2단계에서 화면이 그 값을 미리 확보해 들고 있다가
`generate()`에 건네는 형태로 바뀐다.

**속성**: 기존 `PhotoVision` 그대로(`captions`, `available`,
`considered` 등) — 새 필드를 추가하지 않는다.

**어떤 날짜의 것인지와 연결**: 명시적인 "날짜" 필드를 새로 두지 않고,
화면의 `chosenDay` 상태와 같은 렌더 사이클에서 함께 관리한다(009가
`chosenDay`를 다룬 것과 같은 방식 — 파일에 남기지 않고 매 렌더에서
유효성을 재판정).

**생명주기**:
1. 사진이 있는 날이 선택되면 화면이 캡션 읽기를 시작한다(기존
   `readPhotos()` 로직을 화면 쪽 헬퍼로 노출 — `on-device.ts`의
   `prepare()`가 이를 감싼다).
2. 완료되면 결과를 상태에 보관하고, 그 뒤에만 `engine.prepare()`(LLM
   준비)를 부른다(E1 순서).
3. 사용자가 "쓰기"를 누르면 보관된 값을 `generate(request, seen)`에
   넘긴다. 아직 읽기가 끝나지 않았다면 그 `Promise`를 기다린 뒤
   넘긴다(FR-006a).
4. **날짜가 바뀌면 폐기한다**(FR-009) — 이전 값을 들고 있지 않도록
   상태를 무효화(`null`/초기화)한다. 진행 중이던 읽기가 있다면 결과가
   와도 무시한다(이미 취소된 요청의 결과가 새 상태를 덮어쓰지 않도록
   요청 세대 번호 또는 날짜 비교로 가드 — 009가 「범위 밖이면 되돌린다」를
   매 렌더 재판정으로 처리한 것과 같은 원리를 여기서는 "이 결과가 지금
   `chosenDay`에 대한 것인가"로 재사용).

## 3. `GenerationEngine` 계약 확장

`src/inference/engine-port.ts`. 기존 타입에 메서드 하나를 추가하는 것
외에 새 타입은 없다.

```
GenerationEngine {
  load(character): Promise<LoadResult>          // 기존
  prewarm(character): Promise<void>              // 신규 — 반환값 없음
  run(prompt, limits): Promise<RunResult>         // 기존
  stop(): Promise<void>                            // 기존
  unload(): Promise<void>                          // 기존
}
```

`prewarm()`의 계약은 [contracts/prewarm-engine.md](contracts/prewarm-engine.md)에
있다.

## 4. `on-device.ts` 어댑터가 노출하는 새 함수

새 타입을 추가하지 않고 두 함수를 노출한다(둘 다 `StoppableBackend`
확장이 아니라 별도 export — 파이프라인·화면이 선택적으로 쓴다).

```
prepare(character: Character): Promise<void>
release(): Promise<void>
```

그리고 `generate()`의 시그니처가 선택적 인자를 받도록 넓어진다.
**기존 두 번째 인자(`onStage`) 뒤에 세 번째로 추가한다** — 위치가
바뀌면 `InferenceBackend.generate(request, onStage?)`를 두 인자로
부르는 기존 모든 호출부(파이프라인 포함)가 깨진다:

```
generate(
  request: DiaryRequest,
  onStage?: (stage, branch?) => void,
  seen?: PhotoVision,
): Promise<GenerationResult>
```

`seen`이 주어지면 `readPhotos()`를 부르지 않고 그 값을 그대로
`buildPrompt()`·`judge()`에 사용한다(§6 research.md). `seen`이 없으면
지금과 동일하게 스스로 읽는다 — **회귀 없음**.

## 5. 파이프라인을 거쳐 `seen`이 전달되는 경로

`/speckit-analyze`에서 확인된 것 — `DiaryHomeScreen.tsx`는
`pipeline.run()`만 부르고, `pipeline.ts`의 `runStages()`가
`deps.backend.generate(request.request, onProgress)`를 부른다. 화면이
미리 읽어 둔 `seen`이 이 경로를 거치지 않고는 실제 백엔드에 닿을 수
없으므로, 세 타입이 옵셔널로 넓어진다(기존 호출자는 깨지지 않는다):

```
// src/diary/pipeline.ts
PipelineInput {
  day: DayDate
  now: Date
  character: Character | undefined
  vision: VisionSetting
  seen?: PhotoVision        // 신규
}

// src/inference/types.ts
InferenceBackend {
  generate(
    request: DiaryRequest,
    onStage?: (stage, branch?) => void,
    seen?: PhotoVision,      // 신규
  ): Promise<GenerationResult>
}
```

`runStages()`는 `deps.backend.generate(request.request, onProgress,
input.seen)`로 세 번째 인자를 그대로 넘긴다 — 파이프라인 자신은 `seen`의
내용을 해석하거나 가공하지 않는다(그저 통과시키는 값). 저장 계층
(`store.ts`, `DiaryEntry`)은 이 확장과 무관하다.

## 상태 전이 없음

`AppScreen`(`src/app/state.ts`)에 새 상태(`kind`)를 추가하지 않는다.
"준비 중"이라는 상태는 사용자에게 보이지 않으므로(FR-003, FR-011) 화면
전이 다이어그램에 나타날 이유가 없다 — 기존 `list` 상태에 머무는 동안
배경에서 조용히 진행된다.
