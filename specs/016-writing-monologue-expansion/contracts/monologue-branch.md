# 계약: 독백 문구 확장 (monologue.ts — branch·이름·10개 이상)

**대상**: `src/diary/monologue.ts`, `src/diary/particle.ts`,
`src/inference/types.ts`
**관련 요구사항**: FR-002, FR-003, FR-003a, FR-005, FR-006, FR-007, FR-009,
FR-010, FR-014

---

## 진입점

```ts
export function pickMonologue(
  stage: ProgressStage,
  branch: MonologueBranch | undefined,
  previous: string | undefined,
  characterName?: string,
  random?: () => number,
): string
```

015의 `pickMonologue(stage, previous, random)`에 `branch`(세 번째 자리가
아니라 `stage` 바로 다음)와 `characterName`(옵셔널)이 추가된다.

## 문구 후보 풀 — 구조

| stage | branch | 최소 개수 | 이름 필요 | 비고 |
| --- | --- | --- | --- | --- |
| `signals` | (없음) | 3 (015 그대로) | 아니오 | 016 확장 대상 아님(spec Assumptions) |
| `vision` | `normal` | 10 | 아니오 | FR-005(정직성 경계) 적용 |
| `vision` | `many` | 10 | 아니오 | FR-005·FR-007(숫자 없이 "많다" 인상만) |
| `load` | `cold` | 10 | **예** | FR-003·FR-003a(조사 자동 선택) |
| `load` | `hot` | 10 | **예** | FR-003·FR-003a |
| `generation` | (없음) | 10 | 아니오 | 015의 3개를 대체(spec Assumptions) |

**"10개 이상"은 컴파일 타임에 강제된다.** 015가 `readonly [string, string,
...string[]]`(최소 2개)로 후보 부족을 막았던 것과 같은 원리를, 최소 10개
튜플로 확장한다 — 예:

```ts
type AtLeast10 = readonly [
  string, string, string, string, string,
  string, string, string, string, string,
  ...string[],
];
```

## 사진 보기 문구 — 정직성 경계 (FR-005)

**허용**: 011의 `PhotoCaption`이 실제로 만드는 것(사진 한 장을 보고 짧은
서술 하나)에 근거한 인상 — "사진을 들여다보는 중", "무엇이 담겼는지
살펴보는 중", "찬찬히 눈에 담는 중" 류.

**금지**: 인물 식별("누군지 들여다보는 중"), 촬영 시각·장소를 사진
내용에서 알아내는 것("언제 어디서 찍힌 건지 찾는 중"), 장소에 대한
주관적 감상을 사실처럼 단정하는 것("좋은 곳에 다녀온 것 같다"). 011의
`CAPTION_PROMPT`("Describe what is visible in this photo in one short
sentence.")가 하는 일의 범위를 넘는 모든 표현.

**"many" 갈래 문구**: 사진이 많다는 인상은 전달하되 정확한 장수를
포함하지 않는다("살펴볼 사진이 많아서 반가운 하루예요" 류는 허용,
"사진 5장을 보는 중"은 금지).

## 로드 단계 문구 — 이름과 조사 (FR-003, FR-003a)

**문구는 이름 자리를 비운 템플릿으로 미리 쓴다.** `pickMonologue()`가
템플릿을 고른 뒤 `characterName`과 `particleFor(characterName)`(아래
「조사 선택」)로 자리를 채운다:

```
템플릿: "{name} 글을 쓸 준비를 하고 있어요"
채움:   "루이가 글을 쓸 준비를 하고 있어요"   (루이 → 받침 없음 → "가")
채움:   "오드가 글을 쓸 준비를 하고 있어요"   (오드 → 받침 없음 → "가")
```

**받침 판정은 표준 한국어 주격 조사 규칙을 따른다**: 이름의 마지막
글자에 받침이 있으면 "이", 없으면 "가"가 그대로 붙는다(예: "사람이",
"나무가") — 조사 앞에 다른 글자를 끼워 넣지 않는다. research.md §5가
유니코드 코드포인트로 로스터 5인(금동이·루이·오드·샤오바이·모카)을
전부 검증했다 — 다섯 모두 마지막 글자가 받침 없는 음절이라 **현재는
전부 "가"를 받는다.** 받침 있는 이름(예: "훈")에 대한 "이" 분기는
로스터에 실례가 없으므로, 계약 테스트에 별도 가상 이름 케이스를 추가해
죽은 코드로 남지 않게 한다(research.md §5, quickstart A3).

## 선택 규칙

1. `(stage, branch)` 조합에 대응하는 후보 배열에서 `previous`와 다른
   문자열을 무작위로 고른다(015와 동일한 로직, 풀이 커져 안전판 분기가
   여전히 불필요하다).
2. `stage === "load"`이고 `branch`가 확정된 경우, 고른 템플릿의 이름
   자리를 `characterName` + `particleFor(characterName)`로 채운다.
3. `random`을 안 넘기면 `Math.random`을 쓴다(015와 동일).

## 불변식 (원칙 III·IV 방어, 015 계승 + 확장)

1. **`monologue.ts`·`particle.ts` 둘 다 `Character`·`../models/roster`·
   `./persona`를 import하지 않는다**(헌법 검사, `checkMonologueFile`이
   `monologue.ts`를 이미 검사하며, `particle.ts`도 같은 규칙 대상에
   추가한다 — research.md §4가 현재 정규식이 `string` 매개변수를
   막지 않음을 확인했다).
2. **`pickMonologue()`의 반환값 어디에도 숫자·시간 표현이 없다**(015
   불변식 유지, 015 SC-003·SC-008 근거).
3. **모든 `(stage, branch)` 조합에 정의된 문구 후보가 최소 10개
   있다**(신설 갈래만 해당 — `signals`는 015의 3개를 유지한다, spec
   Assumptions).
4. **연속 호출에서 `previous`와 같은 문자열을 고르지 않는다**(015
   불변식 유지).
5. **문구는 화자 규칙(`prompt.ts`의 SPEAKER_RULES)과 별개다**(015 불변식
   유지 — 일기 프롬프트에 들어가지 않는다).
6. **순수 함수다**(015 불변식 유지 — 내부 상태를 갖지 않는다).
7. **`characterName`이 필요한 조합(`load`+`cold`/`hot`)에서 그것이 안
   오면, 방어적 기본값(예: "캐릭터")을 지어내지 않는다** — 호출자가 항상
   유효한 이름을 준다는 것이 spec Edge Cases의 전제이며, 이 전제가
   깨지는 것은 상위 계층(화면)의 버그이지 이 함수가 감출 일이 아니다.

## 검증 표

| 상황 | 기대 | 근거 |
| --- | --- | --- |
| `pickMonologue("vision", "many", undefined)` | "많다" 인상의 문구 중 하나 | FR-006 |
| `pickMonologue("vision", "normal", undefined)` | "많다" 인상이 아닌 사진 보기 문구 | FR-006, FR-007 |
| `pickMonologue("load", "cold", undefined, "루이")` | "루이가 ..." 형태의 콜드 문구, 조사가 문법적으로 맞음 | FR-003, FR-003a |
| `pickMonologue("load", "hot", undefined, "오드")` | "오드... " 형태의 핫 문구, 조사가 올바름 | FR-003, FR-003a, SC-002a |
| 같은 `(stage, branch)`로 여러 번 연속 호출 | 연속된 두 결과가 절대 같지 않다 | FR-010 |
| 각 `(stage, branch)` 후보 배열 길이 | 신설·수정 갈래(vision-normal/many, load-cold/hot, generation) 전부 10 이상 | FR-009 |
| 반환된 모든 후보 문구(이름 치환 전 템플릿 기준) | 숫자·퍼센트 표현이 없다 | FR-004 |
| `monologue.ts`·`particle.ts`의 import 문 | `roster.ts`·`persona.ts`·`Character` 없음 | 원칙 III |
