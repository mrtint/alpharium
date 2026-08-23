# 계약: 독백 문구 (monologue.ts)

**대상**: `src/diary/monologue.ts`
**관련 요구사항**: FR-001, FR-004, FR-005, FR-012, FR-013, FR-014

---

## 진입점

```ts
export function pickMonologue(
  stage: ProgressStage,
  previous: string | undefined,
  random?: () => number,
): string
```

## 문구 후보 (초안 — 최종 문구는 구현 시점에 확정, 서술어가 서로 겹치지 않게 쓴다)

| 단계 | 후보 |
| --- | --- |
| `signals` | "그날의 기록을 확인하는 중…" / "하루를 되짚어보는 중…" |
| `vision` | "사진을 들여다보는 중…" / "또 한 장을 살펴보는 중…" / "찬찬히 눈에 담는 중…" |
| `generation` | "글을 쓰는 중…" / "생각을 문장으로 옮기는 중…" / "한 줄 한 줄 적어보는 중…" |

**문구는 사람이 미리 쓴 고정 문장집합에서만 고른다.** 모델이 생성하지
않는다(원칙 IV). 사진 장수·순번(예: "두 번째 사진을…")처럼 값을 문구에
끼워 넣지 않는다 — spec User Story 1의 예시 문구는 감을 잡기 위한 것일
뿐, FR-004·FR-013(숫자·순번을 포함해서는 안 된다)이 실제 구현에서
우선한다.

## 선택 규칙

1. `stage`에 대응하는 후보 배열에서 `previous`와 다른 문자열을 무작위로
   고른다.
2. `random`을 안 넘기면 `Math.random`을 쓴다. 테스트는 결정론적 함수를
   주입한다.

**"후보가 하나뿐인 단계" 경로는 없다.** 후보 배열의 타입 자체가
`readonly [string, string, ...string[]]`(최소 2개 원소)이므로, `previous`와
다른 후보가 항상 최소 1개 존재한다 — 안전판 분기를 코드에 두지 않는다.

## 불변식 (원칙 III·IV 방어)

1. **`monologue.ts`는 `Character`·`../models/roster`·`./persona`를
   import하지 않는다.** 헌법 검사(`scripts/check-constitution.mts`)가 007
   이후 `src/ui/`의 roster 직접 접근을 막는 것과 같은 방식으로, 이 파일의
   import 목록을 소스 검사로 확인한다.
2. **`pickMonologue()`의 반환값 어디에도 숫자·시간 표현이 없다.** 계약
   테스트가 모든 후보 문구에 대해 `/\d/`가 없는지 정규식으로 검사한다
   (SC-003·SC-007 근거).
3. **`ProgressStage`의 모든 갈래(`signals`·`vision`·`generation`)에 후보가
   정확히 2개 이상 있다.** `Record<ProgressStage, readonly [string, string,
   ...string[]]>`(최소 2개 원소 튜플)으로 선언하면 TypeScript가 누락·1개짜리
   배열을 컴파일 타임에 잡는다.
4. **연속 호출에서 `previous`와 같은 문자열을 고르지 않는다.** 모든 단계가
   후보 2개 이상을 갖도록 타입이 강제하므로 예외 없이 지켜진다. 계약
   테스트가 `pickMonologue(stage, prev)`를 여러 번 호출해 결과가 `prev`와
   절대 같지 않음을 확인한다.
5. **문구는 화자 규칙(`prompt.ts`의 SPEAKER_RULES)과 별개다.** 이 파일은
   일기 프롬프트에 들어가지 않는다 — 사용자에게 보이는 화면 문구일 뿐이며,
   `prompt.ts`가 여전히 화자 규칙의 유일한 통과 지점이라는 기존 불변식을
   건드리지 않는다.
6. **순수 함수다.** 내부 상태(예: "마지막으로 고른 것")를 모듈 스코프
   변수로 기억하지 않는다 — 호출자(화면)가 `previous`를 매번 넘긴다. 그래야
   화면 상태가 유일한 진실 공급원이 되고, 테스트에서 병렬로 호출해도
   레이스 컨디션이 없다.

## 검증 표

| 상황 | 기대 | 근거 |
| --- | --- | --- |
| `pickMonologue("vision", undefined)` 호출 | 사진 보기를 뜻하는 문구 중 하나를 돌려준다 | FR-001 |
| 같은 단계로 여러 번 연속 호출(매번 직전 결과를 `previous`로 넘김) | 연속된 두 결과가 절대 같지 않다 | FR-014, SC-007 |
| 반환된 모든 후보 문구 | 숫자·퍼센트·"N단계 중 M번째" 표현이 없다 | FR-004, FR-013, SC-003 |
| `monologue.ts`의 import 문 | `roster.ts`·`persona.ts`·`Character` 없음 | 원칙 III |
| 후보 테이블 타입 | `Record<ProgressStage, readonly [string, string, ...string[]]>` — 1개짜리 배열을 대입하면 컴파일 에러 | 원칙 IV(안전판 분기를 코드에 두지 않음, 2026-08-23 정정) |
