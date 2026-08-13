# 계약: 생성 요청·일기·추론 확장

**대상**: `src/diary/types.ts`, `src/diary/request.ts`, `src/inference/types.ts`
**관련 요구사항**: FR-006~FR-017

---

## Character / VisionSetting

```ts
type Character = 'quiet' | 'narrative' | 'imaginative' | 'chinese' | 'english'
type VisionSetting = 'none' | 'quick' | 'detailed'
```

**캐릭터 식별자는 자리표시일 뿐 최종 이름이 아니다.** 헌법 「로스터」가 "캐릭터 이름은 사람이
짓는다"고 했으므로, 이 기능은 다섯 개의 자리만 두고 표시 이름을 짓지 않는다.

**금지**(FR-008, 헌법 원칙 III):

- 캐릭터를 모델 파일명·모델 식별자와 잇지 않는다
- 파라미터 수·양자화 방식을 어디에도 담지 않는다
- 캐릭터→모델 매핑 테이블을 이 기능에서 만들지 않는다

`VisionSetting`은 **캐릭터가 아니라 설정**이다(헌법 「사진과 시각 처리」). 사용자에게 시각
인코더를 고르게 하지 않는다(FR-009).

---

## DiaryRequest

```ts
type RequestResult =
  | { ok: true; request: DiaryRequest }
  | { ok: false; reason: 'no-character' }

function buildRequest(
  signals: DaySignals,
  character: Character | undefined,
  vision: VisionSetting,
): RequestResult
```

### 검증 표

| 상황 | 기대 | 근거 |
| --- | --- | --- |
| 신호·캐릭터·시각설정이 모두 있음 | `ok: true` | FR-006 |
| 캐릭터가 `undefined` | `ok: false, reason: 'no-character'` | FR-007 |
| 신호가 전부 `unknown` | `ok: true` | FR-005b |
| 신호가 전부 `none` | `ok: true` | FR-005b |

**신호가 비어도 요청은 만들어진다.** 신호의 양으로 거부하지 않는다(FR-005a).

### 불변식

요청 객체에 모델 식별자가 없어야 한다(FR-008). 테스트로 확인한다 — 객체를 문자열로 만들어
모델 이름이 나오지 않는지 본다.

---

## 추론 어댑터 확장

001의 `InferenceBackend`에 생성 계약을 더한다. **`isAvailable()`은 그대로 둔다.**

```ts
type DiaryDraft = { text: string }

type GenerationFailure =
  | { kind: 'not-implemented' }
  | { kind: 'backend-unavailable'; reason: string }
  | { kind: 'generation-failed'; reason: string }

interface InferenceBackend {
  readonly location: InferenceLocation
  isAvailable(): Promise<ModuleStatus>        // 001에서 그대로
  generate(request: DiaryRequest): Promise<DiaryDraft | GenerationFailure>   // 추가
}
```

### 검증 표

| 구현 | 상황 | 기대 | 근거 |
| --- | --- | --- | --- |
| 온디바이스 | 어떤 요청이든 | `{ kind: 'not-implemented' }` | FR-015 |
| 데스크톱 서버 | 어떤 요청이든 | `{ kind: 'not-implemented' }` | FR-015 |

**이 기능에서 두 구현 모두 `not-implemented`를 반환한다.** 실제 생성은 다음 기능이다.

### 불변식 — 이 파일에서 가장 중요한 규칙

1. **실패가 텍스트를 반환해서는 안 된다**(FR-016, 헌법 원칙 I).
   `GenerationFailure`의 어느 갈래에도 `text` 필드가 없다. "일기를 생성할 수 없습니다" 같은
   플레이스홀더도 금지다 — 그럴듯한 텍스트가 일기 자리에 들어가는 순간 가짜 일기와 구분이
   사라진다.
2. **`not-implemented`는 가짜 응답이 아니다.** 원칙 I이 금지한 것은 *미리 만들어 둔 응답을
   보여주는 경로*이며, 없는 것을 없다고 말하는 것은 그 반대다.
3. **예외를 던지지 않는다.** 실패는 값이어야 파이프라인이 어느 단계에서 멈췄는지 말할 수
   있다(FR-019). 001에서 `ModuleStatus`를 값으로 둔 것과 같은 이유다.
4. **추론 위치 선택은 001의 `select.ts`를 그대로 쓴다**(FR-017). 새 선택 지점을 만들지
   않는다 — 만들면 헌법 원칙 I의 방어선이 둘로 갈라진다.

---

## DiaryEntry

```ts
type DiaryEntry = {
  date: DayDate
  text: string
  character: Character
  signalsUsed: DaySignals
  createdAt: Date
}
```

### 불변식

1. **모델 식별자를 담지 않는다**(FR-013, 원칙 III).
2. **추론 속도·출력 점수·품질 지표를 담지 않는다**(원칙 IV). 이 타입이 원칙 IV를 어기기
   가장 쉬운 자리다 — "생성에 몇 초 걸렸는지" 정도는 무해해 보이지만, 그것이 모델 비교의
   시작점이 된다. 필요하면 별도 저장소에서 한다.
3. **실패는 `DiaryEntry`가 되지 않는다**(FR-012). 빈 본문의 일기를 만들지 않는다.
4. `signalsUsed`가 있어야 "이 일기가 무엇을 보고 쓰였나"를 되짚을 수 있다(FR-011).

---

## 다음 기능에 넘기는 것

이 계약이 **자리만 만들고 채우지 않는** 것들이다. 다음 기능이 반드시 다뤄야 한다.

| 항목 | 왜 여기서 안 하는가 |
| --- | --- |
| 프롬프트와 화자 규칙 (원칙 II) | 프롬프트가 없으므로 강제할 수단이 없다. **신호가 없는 하루에 없는 일을 지어내지 않는 것**이 그 기능의 핵심 과제다 |
| 캐릭터 표시 이름 | 헌법이 "사람이 짓는다"고 했다 |
| 캐릭터→모델 매핑 | 모델 파일을 다루는 기능의 몫 |
| 일기 길이의 하한·상한 | 프롬프트와 함께 정해야 의미가 있다 |
