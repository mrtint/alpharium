# Specification Quality Checklist: 내려받기 충돌을 사용자에게 알린다

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-21
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

## 헌법 정합성 (이 저장소 고유)

- [x] 원칙 III — 거부 안내와 진행 표시에 모델 정보가 들어가지 않는다(FR-004, SC-004)
- [x] 원칙 IV — 진행 표시에 시간·속도·바이트를 더하지 않는다(FR-016)
- [x] 원칙 V — 모르는 백분율을 지어내지 않는다(FR-017), 실기기 확인을 요구한다(SC-007)
- [x] 003 FR-020(한 번에 하나)을 바꾸지 않고 유지한다(FR-015, SC-008)

## Notes

- 사용자가 적은 「동시에 받을 수 없다」를 **규칙의 문제가 아니라 규칙을 숨긴 화면의
  문제**로 해석했다. 근거는 003 spec.md:299(FR-020)와 그 결정 기록(spec.md:444)이며,
  이 해석을 spec의 「이 기능이 하지 않는 것」과 Assumptions에 명시했다. 규칙 자체를
  바꾸려면 003 계약을 여는 별도 결정이 필요하다.
- 사용자가 적은 「quiet이 멈춘다」는 **실제로는 멈추지 않는다**는 것을 코드에서
  확인했다 — 화면에서 사라질 뿐이며 내려받기는 계속된다. spec이 이 차이를 명시했다.
- [NEEDS CLARIFICATION] 0건. 두 버그 모두 관측된 현상이고 003 계약이 기대 동작을
  이미 정해 두었으므로 열린 결정이 없다.
