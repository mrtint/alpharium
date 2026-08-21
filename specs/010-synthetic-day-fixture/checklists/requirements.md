# Specification Quality Checklist: 가상의 하루를 기기에 심는 도구

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

## 헌법 검토 (이 저장소 고유)

- [x] **원칙 I** — 도구가 일기를 만들지 않고, 미리 만들어 둔 응답 경로가 생기지 않는다
      (FR-003·004, SC-010)
- [x] **원칙 III** — 도구가 캐릭터·모델을 알지 않는다 (해당 없음으로 확인)
- [x] **원칙 IV** — 도구가 생성된 일기를 읽거나 채점하지 않는다 (FR-022, SC-011)
- [x] **원칙 V** — 합성 하루의 관측을 진짜 관측과 구분해 적고, 합성 하루로 품질을
      결론짓지 않는다 (FR-020·021)
- [x] **원칙 V (값)** — `none`/`unknown` 구분이 도구를 거쳐도 유지된다 (FR-013)

## Notes

### 검토에서 걸러 낸 것

**초안에서 「가상 신호를 앱에 주입한다」로 쓸 뻔했다.** 그러면 `src/signals/fake.ts`가
제품 경로로 자라고, 그것이 002 계약이 명시적으로 금지한 것이다(「이 모듈을 src/ui/에서
import 하지 않는다」). 사진 파일을 기기에 심는 쪽으로 뒤집으면 앱의 코드가 한 줄도 바뀌지
않으며, FR-004a·SC-009가 그것을 못 박는다.

**「도구로 프롬프트 수리를 검증한다」로 쓸 뻔했다.** 그것이 헌법 원칙 V의 「합성 데이터로
모델 품질을 평가하지 않는다」 위반이다. FR-021이 이것을 명시적으로 금지하고, Out of Scope가
프롬프트 수리를 005의 자리로 되돌린다.

### 명확화 뒤 재검증 (2026-08-21)

다섯 질문의 답이 명세에 반영된 뒤 21개 항목을 다시 봤다. **상태가 바뀐 항목은 없다** —
명확화가 새 모호함을 만들지 않았고, 옛 서술과 부딪히는 자리는 함께 고쳤다.

고친 잔재 셋:

- Key Entities의 「알아볼 표식」 → 전용 폴더로 대체(Q1이 정한 것)
- SC-001·US1의 「개발자가 명령 하나로」 → 「에이전트가 한 번의 실행으로」(Q2)
- FR-008의 SHOULD → MUST. **에이전트가 부르면 이름이 곧 계약이다**(Q2의 귀결) — 매번
  값을 지어내게 하면 두 번의 검증을 비교할 수 없다

### 명세 안에 남긴 미결

- 사진 몇 장까지를 「상한을 넘는 하루」로 볼 것인지는 004의 `DEFAULT_PHOTO_LIMIT`(200)를
  따르며, 그 값을 이 기능이 다시 정하지 않는다.
- 전용 폴더의 **이름과 자리**는 계획 단계의 일이다. 명세는 「한 곳에 모으고, 되돌리기는
  그 안의 것만 지우고, 사람이 눈으로 구분하고, 앱은 폴더를 묻지 않는다」(FR-016~017)까지만
  정한다.
- 「기계가 읽을 결과」의 **모양**도 계획 단계의 일이다. 명세는 무엇이 담겨야 하는지
  (FR-018b)와 오독되면 안 된다는 것(FR-018a·018c)까지만 정한다.
