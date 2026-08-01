# Specification Quality Checklist: 추론 — 집계와 퍼소나로 일기 한 편 쓰기

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-01
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## 프로젝트 고유 검사

- [x] **경계면 우선** — 축 내부를 파기 전에 축 사이 계약이 확정되어 있다. 입력은
      001·002·003이 확정한 것을 그대로 받고, 출력은 FR-370~FR-373으로 005·006에
      넘긴다. 프롬프트 문면·모델 선택 등 축 내부의 깊은 판단은 구현 단계로 미뤘다.
- [x] **원칙 0 정합** — 화자(FR-345~349), 유희 목적(FR-330·FR-332), 근거의 한계
      (FR-311·FR-333), 회상 비활성(FR-315)이 모두 처리되었다.
- [x] **원칙 II 정합** — 네 가지 실패가 모두 「저장하지 않음」으로 수렴한다
      (FR-350~FR-355). 고정 fallback 계승 금지가 명시되었다(FR-353).
- [x] **품질 판정으로 미끄러지지 않았는가** — 추측의 강도(FR-331), 본문 길이(Edge
      Cases), 집계 규모(FR-317) 어느 것도 수용 기준이 되지 않는다. 검사 대상은 형식
      계약뿐이다.
- [x] **실측 미검증 전제가 표시되었는가** — FR-318·FR-331이 실측을 요구하고,
      Assumptions가 어떤 전제가 아직 검증되지 않았는지와 그것이 깨져도 결론이
      유지되는지를 구별해 적었다. SC-315가 그 시점을 판정한다.
- [x] **선행 스펙 역참조** — 001·002·003 계약 정합성 표로 각 요구가 어디서 처리되는지
      추적 가능하다.

## Notes

### 검증에서 다룬 쟁점

**재료 요약을 저장할 것인가 (사용자 제기)** — 「나중에 다시 만들면 재료 수가 바뀌니
스냅샷으로 저장해야 하지 않나」라는 우려를 001·003 계약에 대조해 검토했다. 결론은
**저장하지 않고 파생**(FR-304)이다:

- 집계는 생성 시점에만 만들어지고(003 FR-260) 다시 관측되어 변하는 값이 아니다.
- 일기와 그 근거 집계는 소프트 삭제·복구·재생성 전 과정에서 짝을 유지한다(001 FR-032).
  재생성 시에는 둘이 **함께** 대체된다(001 FR-040b).
- 따라서 저장된 일기 옆에는 항상 그 일기가 실제로 근거로 삼은 집계가 있고, 언제
  파생해도 같은 수가 나온다. SC-302a가 이것을 검증한다.
- 반대로 저장하면 같은 사실이 두 곳에 존재해 어긋날 수 있으며, 이는 001 FR-032가
  막으려는 종류의 문제다. 001 FR-028의 「저장 대상 세 가지」도 개정해야 한다.

이 결론은 **짝 보장에 의존**하므로 Assumptions 첫 항목에 의존 관계를 명시했고,
005가 짝을 설계할 때 이 사실을 알도록 「후속 스펙으로 넘기는 것」에도 적었다. 짝
보장이 깨지면 스냅샷 저장이 옳아진다는 조건도 함께 남겼다.

### 남은 판단

- 실측이 필요한 항목(FR-318 입력 구성, FR-331 추측 강도)은 이 스펙에서 값을 고정하지
  않았다. 003 FR-257과 같은 처리이며, SC-315가 구현 단계에서 닫는다.
- FR-311(미관측 제외)의 대가는 FR-311a에 손실로 명시했다. 전환 판단은 실측 이후다.
