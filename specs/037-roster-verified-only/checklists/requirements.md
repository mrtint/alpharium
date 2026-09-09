# Specification Quality Checklist: 로스터를 검증된 하나로 축소

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-09
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

### 검증 1차에서 고친 것

- **파일명·심볼명을 요구사항에서 걷어냈다.** 초안의 FR은 `CHARACTERS`·
  `roster.ts`·`persona.ts`·`AuthorPicker`를 직접 지목했다 — 구현 세부이므로
  "캐릭터 자리 전체", "작성자 자리"처럼 무엇이 성립해야 하는가로 바꿨다.
  구현 위치는 설계 문서(`docs/superpowers/specs/2026-09-09-roster-reduction-design.md`)와
  plan 단계가 정한다.
- **FR-014(되돌릴 길)를 심볼 나열에서 성질 나열로 바꿨다** — `resolveSelection`·
  `018 P11`·`usesE2SN` 대신 (a)~(d)의 규칙으로 적었다. 계약의 정체가 남고
  이름은 plan이 잇는다.

### 실측으로 드러난 것 (초안에 없던 요구사항)

- **FR-008 후단**: `DiaryDetailScreen.tsx:167`이 `entry.authorName ??
  currentAuthorName ?? personaOf(entry.character).name` 순으로 이름을 찾는다.
  캐릭터 자리가 좁아지면 로스터에 없는 캐릭터의 페르소나 조회가 `undefined`가
  되어 **작성자 이름이 저장되지 않은 옛 일기에서 화면이 멈출 수 있다**
  (`authorName?: string` — 035 이전 일기에는 없다). 이 갈래를 Edge Cases와
  SC-002에 명시했다.
- **FR-010**: 007이 만든 "고른 캐릭터가 준비를 잃으면 다른 것으로 옮긴다"가
  캐릭터 하나에서는 옮길 곳이 없다. 말없이 실패하지 않도록 요구사항으로 세웠다.
- **FR-011**: 026 다운로드 관리에서 빠진 캐릭터 줄이 사라지므로 이미 받은
  모델 파일을 앱으로 지울 수 없게 된다. 008의 "받다 만 모델은 못 지운다"와
  같은 계열의 알려진 빈자리로 Assumptions에 적었다.

### 판단

모든 항목 통과. `/speckit-plan`으로 진행 가능.

[NEEDS CLARIFICATION] 0건 — 설계 문서에서 이미 결정된 사항(로스터 축소 방식,
AuthorPicker 처리)을 저장소 소유자가 승인했고, 나머지는 기존 실측과 헌법에서
근거가 나온다.
