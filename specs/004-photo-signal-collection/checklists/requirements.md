# Specification Quality Checklist: 사진 신호 수집

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-14
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

## Notes

### 검증에서 고친 것

- **1차**: FR-013~FR-013e가 「EXIF」라는 구현 용어를 쓰고 있었다. 「사진에 담긴 좌표」로
  바꿔 기술 중립으로 만들었다. 마찬가지로 「미디어 라이브러리」는 사용자에게도 통하는
  개념이라 남겼지만, 특정 패키지 이름은 어디에도 넣지 않았다.
- **1차**: SC-006(「픽셀을 읽는 경로가 0개」)이 구현 세부로 읽힐 수 있으나, 이것은 헌법
  원칙과 다음 기능의 경계를 지키는 **검증 가능한 결과**이므로 남긴다.

### 2차 검증 (clarify 이후, 2026-08-14)

네 개의 질문이 통합된 뒤 다시 훑었다. 상태가 바뀐 항목은 없다 — 1차에서 이미 전부
통과했고, clarify는 모호함을 없앴지 새로 만들지 않았다.

clarify가 메운 구멍:

- **상한을 넘긴 하루의 판정**이 「값에 드러난다」로만 적혀 있어 두 가지로 읽혔다.
  `known` + 잘림 표시로 확정했다(FR-014a~d).
- **같은 자리를 가르는 거리**가 아예 없었다. 100m로 정하고 **짐작임을 명시**했다(FR-013f~h).
  값이 없으면 `visitCount`가 검증 불가능한 요구사항이었다.
- **권한을 누가 요청하는가**가 비어 있었다. FR-011이 자동 요구를 막기만 하고 시작점을
  두지 않아, 실기기에서 영원히 `unknown`이 나올 수 있었다(FR-020~023).
- **한계를 담을 자리**가 없었다. FR-014c가 「002를 넓히지 말라」고만 해서 실제로 어디에
  담을지 정해지지 않았다. 값의 타입을 넓히는 쪽으로 확정했다(FR-024~027).

### 헌법과의 관계

이 기능의 최대 위험은 **원칙 V(관측과 추측의 구분)**이며, FR-007~FR-010과 SC-002가 그
방어선이다. 「권한 없음 → 빈 목록」이 한 줄만 들어가도 일기가 거짓을 쓰게 된다.

원칙 III(모델은 캐릭터다)은 이 기능에서 위험이 낮다 — 사진 수집은 모델에 닿지 않는다.
FR-019가 003의 경계를 그대로 유지하는 것만 확인한다.

원칙 IV(측정 장치 금지)도 위험이 낮다. 사진 수를 세는 것은 신호이지 모델 품질 측정이 아니다.
