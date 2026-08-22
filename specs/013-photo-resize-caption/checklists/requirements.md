# Specification Quality Checklist: 사진을 보기 전에 줄인다

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-22
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

## Constitution Alignment (이 저장소 고유)

- [x] **원칙 I** — 실패가 텍스트를 반환하지 않는다 (FR-011: 못 읽은 사진을 지어내지 않는다)
- [x] **원칙 III** — 모델 설정이 화면에 드러나지 않는다 (FR-013·014)
- [x] **원칙 IV** — 지표를 담을 자리를 두지 않는다 (FR-015), 판정 갈래를 늘리지 않는다 (FR-019),
      품질 비교는 Out of Scope
- [x] **원칙 V** — 실측과 짐작을 구분해 적었다 (FR-020·021, Assumptions), 재지 않은 것을
      결론짓지 않았다 (품질 하한)

## Notes

### 검토에서 걸러낸 것

- **초안의 SC-001이 「20배 빨라진다」였다.** 20배는 **한 사진·한 해상도의 관측**이며
  기기 안 리사이즈 비용이 아직 안 재진 상태에서 목표로 삼으면 짐작을 계약에 넣는 것이다.
  **「절반 이하」로 낮췄다** — 실측 기준선(129초)이 있으므로 여전히 측정 가능하다.
- **「목표 크기 1024px」를 FR이 아니라 Assumptions에 두었다.** 값이 요구사항이 되면
  하한을 재기 전에 고정되고, 그것이 원칙 V가 경계한 「짐작을 확정으로 적는 것」이다.
  FR-002는 **「한 자리에만 있어야 한다」는 구조**만 요구한다.
- **EXIF 방향(FR-005)은 초안에 없었다.** Edge Case를 쓰다 발견했다 — 뒤집힌 사진을
  모델이 보면 **오류 없이 캡션만 틀리므로**, 이 저장소가 반복해서 겪은 「조용한 실패」의
  전형이다.
- **FR-009(치우지 못한 것이 남아도 다음이 실패하지 않는다)** 도 검토 중에 더했다.
  008에서 받다 만 모델이 기기에 남았던 선례가 이 자리에 그대로 적용된다.

### clarify로 정해진 것 (2026-08-22)

- **줄인 사진의 자리** — 앱 전용 디렉터리(FR-007). 갤러리·시스템 캐시가 아니다
- **보관 여부** — 013은 임시로만 다룬다(FR-008). 일기 본문 화면이 재사용할지는 그
  기능이 열릴 때 다시 정한다(로드맵 「일기 본문 화면」 절에 메모를 남겼다)

### 다음 단계에서 정할 것

- 언제 치우는가의 정확한 지점 — 장별인지 하루 끝인지 (FR-008이 「캡션이 끝나면」만
  요구한다)
- 기기 안 리사이즈 수단 — 새 의존이 필요한지 (`/speckit-plan`의 몫)
