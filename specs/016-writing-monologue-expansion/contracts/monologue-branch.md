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

**[2026-08-23 철회]** `characterName`은 시그니처에 남아 있지만
`pickMonologue()`가 실제로 사용하지 않는다 — 문구 검수 과정에서 사용자가
이름을 화면 문구에 넣는 기능 자체를 "별 쓸모 없어 보인다"며 철회했다. 아래
「로드 단계 문구 — 이름과 조사」 절은 더 이상 유효하지 않다(철회 표시 참조).

## 문구 후보 풀 — 구조

| stage | branch | 최소 개수 | 이름 필요 | 비고 |
| --- | --- | --- | --- | --- |
| `signals` | (없음) | 10 | 아니오 | 2026-08-23 검수에서 3→10으로 확장 |
| `vision` | `normal` | 10 | 아니오 | FR-005(정직성 경계) 적용 |
| `vision` | `many` | 10 | 아니오 | FR-005·FR-007(숫자 없이 "많다" 인상만) |
| `load` | `cold` | 10 | 아니오 | ~~FR-003·FR-003a~~ 2026-08-23 이름 주입 철회 |
| `load` | `hot` | 10 | 아니오 | ~~FR-003·FR-003a~~ 2026-08-23 이름 주입 철회 |
| `generation` | (없음) | 10 | 아니오 | 015의 3개를 대체(spec Assumptions) |

**모든 갈래가 정확히 10개다**(2026-08-23 검수 결과 — 최초 설계는 "10개
이상"이었으나 사용자가 각 갈래 11번째 문구를 제거해 정확히 10개로 통일하도록
요청했다). `AtLeast10` 타입 자체는 "10개 이상"을 강제할 뿐 "정확히 10개"를
강제하지 않는다 — 정확히 10개인지는 문구 배열을 직접 세어 지키는 관례이지
타입 수준의 불변식이 아니다.

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

## 로드 단계 문구 — 이름 (2026-08-23 철회)

~~문구는 이름 자리를 비운 템플릿으로 미리 쓴다. `pickMonologue()`가
템플릿을 고른 뒤 `characterName`과 `particleFor(characterName)`으로 자리를
채운다.~~

**철회됨.** 콜드/핫 문구는 이름을 포함하지 않는다 — `LOAD_COLD_TEMPLATES`·
`LOAD_HOT_TEMPLATES`는 `{name}` 자리가 없는 완성된 문장이다.
`characterName` 매개변수는 여전히 `pickMonologue()`가 받지만 사용하지
않는다(015 이후 호출자가 계속 넘겨주는 값과의 시그니처 호환을 위해 남겨
둠). `particleFor()`(아래 「조사 선택」)는 코드에 남아 있으나 이 경로에서
호출되지 않는다.

## 선택 규칙

1. `(stage, branch)` 조합에 대응하는 후보 배열에서 `previous`와 다른
   문자열을 무작위로 고른다(015와 동일한 로직, 풀이 커져 안전판 분기가
   여전히 불필요하다).
2. `characterName`은 받기만 하고 문구 생성에 쓰이지 않는다(2026-08-23
   철회).
3. `random`을 안 넘기면 `Math.random`을 쓴다(015와 동일).

## 불변식 (원칙 III·IV 방어, 015 계승 + 확장)

1. **`monologue.ts`·`particle.ts` 둘 다 `Character`·`../models/roster`·
   `./persona`를 import하지 않는다**(헌법 검사, `checkMonologueFile`이
   `monologue.ts`를 이미 검사하며, `particle.ts`도 같은 규칙 대상에
   추가한다 — research.md §4가 현재 정규식이 `string` 매개변수를
   막지 않음을 확인했다).
2. **`pickMonologue()`의 반환값 어디에도 숫자·시간 표현이 없다**(015
   불변식 유지, 015 SC-003·SC-008 근거).
3. **모든 `(stage, branch)` 조합에 정의된 문구 후보가 정확히 10개
   있다**(2026-08-23 검수 결과 — `signals` 포함 여섯 갈래 전부).
4. **연속 호출에서 `previous`와 같은 문자열을 고르지 않는다**(015
   불변식 유지).
5. **문구는 화자 규칙(`prompt.ts`의 SPEAKER_RULES)과 별개다**(015 불변식
   유지 — 일기 프롬프트에 들어가지 않는다).
6. **순수 함수다**(015 불변식 유지 — 내부 상태·부수효과를 갖지 않는다.
   `characterName`을 받아도 로그를 남기거나 다른 부수효과를 일으키지
   않는다, 2026-08-23 명시).

## 검증 표

| 상황 | 기대 | 근거 |
| --- | --- | --- |
| `pickMonologue("vision", "many", undefined)` | "많다" 인상의 문구 중 하나 | FR-006 |
| `pickMonologue("vision", "normal", undefined)` | "많다" 인상이 아닌 사진 보기 문구 | FR-006, FR-007 |
| `pickMonologue("load", "cold", undefined, "루이")` | 이름이 없는 콜드 문구(`.not.toContain("루이")`) | 2026-08-23 철회 |
| `pickMonologue("load", "hot", undefined, "오드")` | 이름이 없는 핫 문구(`.not.toContain("오드")`) | 2026-08-23 철회 |
| 같은 `(stage, branch)`로 여러 번 연속 호출 | 연속된 두 결과가 절대 같지 않다 | FR-010 |
| 각 `(stage, branch)` 후보 배열 길이 | 여섯 갈래(signals, vision-normal/many, load-cold/hot, generation) 전부 정확히 10 | FR-009 |
| 반환된 모든 후보 문구 | 숫자·퍼센트 표현이 없다 | FR-004 |
| `monologue.ts`·`particle.ts`의 import 문 | `roster.ts`·`persona.ts`·`Character` 없음 | 원칙 III |
