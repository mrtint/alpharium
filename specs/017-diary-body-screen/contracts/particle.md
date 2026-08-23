# Contract: 조사 확장 (은/는)

research.md §5의 계약이다. 016이 만든 `particleFor()`(이/가)를 깨지 않고
`topicParticleFor()`(은/는)를 더한다.

## 불변식

**PT1. 배치임 판정 로직은 하나뿐이다.** `particleFor()`와 `topicParticleFor()`는
같은 내부 헬퍼(`hasBatchim(name): boolean | undefined`)를 공유한다 — 판정 로직이
두 곳에 흩어지면 한쪽만 고쳐지는 함정이 생긴다(places.ts의 `SAME_PLACE_METERS`가
"이 저장소에서 여기 하나뿐이어야 한다"고 못 박은 것과 같은 이유).

**PT2. 기존 `particleFor()`의 시그니처·동작은 바뀌지 않는다.** 016을 쓰는
호출자(`monologue.ts`)가 영향을 받지 않는다 — 순수 리팩터(내부 구현 공유)이지
공개 계약 변경이 아니다.

**PT3. `topicParticleFor()`도 예외를 던지지 않는다.** 빈 문자열·한글이 아닌
문자로 끝나는 이름에는 `"는"`을 기본값으로 돌려준다(`particleFor()`가 `"가"`를
기본값으로 삼는 것과 대응하는 선택 — 받침 없음 쪽 조사가 기본값이다).

**PT4. `diary/` 밖으로 나가지 않는 격리를 유지한다.** `particle.ts`는 여전히
`Character`·`../models/roster`·`./persona`를 import하지 않는다(원칙 III, 016이
세운 경계 그대로) — 문자열 이름만 받는 순수 함수다.

## 테스트로 확인해야 하는 것 (research.md §5)

- 로스터 5인(금동이·루이·오드·샤오바이·모카) 전부 `topicParticleFor` → `"는"`.
- 받침 있는 합성 이름(예: "민준", "테스트인") 최소 1개 → `topicParticleFor` →
  `"은"`, `particleFor` → `"이"`.
- 빈 문자열, 한글이 아닌 이름(예: "Mocha") → 각각의 기본값("는"/"가").
- `particleFor()`의 016 시절 테스트가 리팩터 후에도 그대로 통과하는지(회귀
  없음).
