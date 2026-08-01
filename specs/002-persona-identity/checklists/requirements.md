# Specification Quality Checklist: 퍼소나 정체성 부여

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

## ROADMAP 002 완료 조건

ROADMAP의 「002 — 퍼소나 스펙」이 정한 완료 조건에 대한 검사다.

- [x] **다섯 질문에 답이 있다**
  - 이름 부여 방식 → FR-101~FR-104 (내장 후보 목록에서 무작위 선택)
  - 성격 표현 형태 → FR-110~FR-113 (카탈로그 항목: 식별자·표시명·서술)
  - 성격의 가짓수와 분포 → FR-114~FR-118 (둘 이상, 설치마다 무작위로 갈림)
  - 이름 변경 제약 → FR-120~FR-128 (1~20자, 앞뒤 공백 제거, 빈 값·제어문자 거부, 중복 검사 없음)
  - 최초 부여 시점 → FR-130~FR-135 (앱 최초 실행 시, 사용자 입력 없이, 한 번만)
- [x] **001의 FR-001~FR-007, FR-004a·b를 위반하지 않는다** — spec.md 「001 계약 정합성」 표에 조항별로 대조. 성격 불변은 FR-119·FR-119a·FR-119b가 앱 갱신 경로까지 막았고, 기기 비종속은 FR-103·FR-116이 선택의 **재료**를, FR-132가 재부여의 **계기**를 각각 막았다.
- [x] **004가 이 문서만 읽고 "퍼소나가 무엇을 넘겨주는지" 확정할 수 있다** — FR-140~FR-142가 넘기는 값을 명시(이름 + 성격의 식별자·표시명·서술, 그 외 없음). SC-112가 이를 검증 항목으로 세움.

## 「답하지 않는 것」 준수 검사

ROADMAP이 002의 범위 밖으로 정한 것들이 실제로 새어 들어오지 않았는지 확인한다.

- [x] **성격별 문체 예시가 없다** — ROADMAP이 지정한 실패 신호. FR-113이 서술에 지시문을 담는 것을 MUST NOT으로 금지해 구현 단계에서도 새지 않게 했다.
- [x] **프롬프트 반영 방식을 쓰지 않았다** (→ 004) — 「후속 스펙으로 넘기는 것」에 이관
- [x] **화면 표시를 정하지 않았다** (→ 006) — 부여 알림 시점, 이름 변경 UI, 성격 표시 여부 모두 이관
- [x] **저장 형식을 정하지 않았다** (→ 005) — 보관 형식과 카탈로그 갱신 이행 절차 이관
- [x] **후보 목록·카탈로그의 실제 문자열을 쓰지 않았다** — FR-104·FR-118이 구현 단계로 명시 이관. Assumptions에 그 이유(문구 다듬기가 스펙 작업으로 위장되는 것)를 기록.

## 공통 완료 조건 (ROADMAP)

- [x] 001의 경계면 계약을 위반하지 않는다 — 「001 계약 정합성」 표 참조. 001 수정이 필요한 항목 없음
- [x] 인접 축의 입출력을 상상하지 않는다 — 004에 대해서는 FR-140~FR-142로 **내보내는 쪽만** 정의했고, 004가 그것을 어떻게 쓸지는 쓰지 않았다
- [x] 「답하지 않는 것」에 해당하는 내용을 쓰지 않았다 — 위 절 참조
- [x] 헌법 원칙 0·I·II를 위반하지 않는다 — spec.md 「헌법 정합성」 표 참조

## Notes

- 이 스펙이 001에 없던 **새로 결정한 것**: 이름 길이 상한 20자(Assumptions에 근거 기록), 부여 시점을 최초 실행으로 고정(FR-130에 근거 기록), 카탈로그 항목 제거 금지(FR-119b — 앱 갱신이 FR-004a를 뒤집는 것을 막기 위해 이 스펙에서 추가).
- **명확화 세션이 필요하지 않다**: 다섯 질문 중 방향이 갈릴 수 있었던 셋(이름 부여 방식, 성격 표현 형태, 성격 분포)은 스펙 작성 전에 사용자가 결정했고, 나머지 둘(이름 제약, 부여 시점)은 001과 헌법에서 근거가 도출된다.
