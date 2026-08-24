# Specification Quality Checklist: 일기 본문 화면 개선

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-23
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

- FR-001의 [NEEDS CLARIFICATION]은 `/speckit-specify` 단계에서 사용자 확인으로 해소됐다 —
  본문에는 "실제로 분석에 쓰인 사진만"(그날 수집된 사진 전부가 아니라) 표시한다.
- `/speckit-clarify` 세션(2026-08-23)에서 질문 2개를 추가로 해소했다:
  1. 화면에 보여줄 사진은 013의 리사이즈 사본을 캡션 후에도 보존해 재사용한다(원본 삭제와
     무관하게 동작) — FR-001a·FR-002·User Story 1 Scenario 2·SC-003에 반영.
  2. 방문지가 여럿이어도 장소 이름은 대표 하나만 "대표 장소 · N곳" 형태로 보여준다 —
     FR-007·User Story 3 Scenario 3·SC-005에 반영.
- 그 외 항목은 모두 통과했다. 장소명(User Story 4)의 나머지 세부 동작은
  `docs/roadmap/README.md`의 「장소명 — 가장 위험한 과제」 절에서 이미 상당 부분 결정되어
  있었고, 그 결정을 그대로 요구사항에 반영했다.
- **2026-08-23, `/speckit-plan`·`/speckit-tasks` 완료 후 사용자 피드백으로 재수정
  (1차)**: FR-010을 "제목은 이미 화면에 표시되므로 손댈 것 없음"으로 잘못 판단했었다
  — 화면 배선(값을 그리는 것)은 맞지만, 실제 생성되는 제목 **내용**이 "{캐릭터}의
  오늘일기"류 재조합 문구로 나오는 문제가 있었다(코드 확인: `prompt.ts:106`의
  `TITLE_INSTRUCTION`이 "제목을 짧게 쓰라"고만 하고 헤드라인다운 구체성을 요구하지
  않음). User Story 2(제목이 그날을 담은 헤드라인이다, P1)와 FR-010a·FR-010b를 새로
  추가해 반영했다 — 판정 갈래를 늘리지 않고 프롬프트 지시문 보강으로 해결한다(헌법
  원칙 IV). plan.md·tasks.md도 이어서 갱신했다.
- **2026-08-23, 재수정(2차)**: 사용자가 실기기 화면에서 "제목과 부제목이 헷갈린다"고
  다시 지적해, 기기에 연결해 저장된 일기 JSON 두 건(2026-08-21·2026-08-22)을 직접
  읽었다. `title: "### 루이의 일기"`(마크다운 기호 노출), `text: "빈 줄\n\n..."`
  (지시문 문구 "빈 줄"을 모델이 문자 그대로 되뱉음), `text: "**2026-08-21**\n\n..."`
  (날짜를 굵게 반복하는 부제목성 줄)를 실측으로 확인했다. User Story 2를 "제목과
  본문이 깔끔하게 분리된 헤드라인이다"로 넓히고 FR-010c(마크다운 금지)·FR-010d
  (본문 첫 줄 부제목 금지)를 추가했다. plan.md·research.md·contracts/title.md·
  quickstart.md·tasks.md도 이어서 갱신한다.
- 모든 체크리스트 항목 통과. `/speckit-plan` 갱신으로 진행한다.
- **2026-08-23, `/speckit-analyze` 결과 반영**: CRITICAL 이슈는 없었으나 사용자가
  MEDIUM·LOW 항목 셋을 직접 정해 해소했다. (1) plan.md·data-model.md에 남아있던
  `PhotoPlaces.representativeCoordinate` 잔여 표현을 실제 확정값인
  `PlaceTrace.representativeCoordinate`로 정정(data-model.md §3을 "취소됨" 요약으로
  축약). (2) 위치 권한을 영구 거부한 뒤 장소명 설정을 다시 켜는 경우의 동작을
  명시(contracts/place-name.md L9 신설) — unknown으로 귀결되고 설정 토글은 사용자가
  낸 값을 그대로 유지, 앱이 임의로 되돌리지 않는다. spec.md Edge Cases·quickstart.md
  D5·tasks.md T039에 반영. (3) quickstart.md D3a에 제목 좋은 예/나쁜 예를 추가해
  사람 검수 기준의 일관성을 높였다(자동 채점 코드는 추가하지 않음, 원칙 IV 유지).
