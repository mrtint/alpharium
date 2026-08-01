# Specification Quality Checklist: 저장 — 휴대폰이 기억하는 것과 잊는 것

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

## ROADMAP 005 완료 조건 대조

- [x] **다섯 질문에 답이 있다**
  - 저장 매체와 구조 → FR-400~FR-406
  - 이행 절차 → FR-450~FR-456
  - 소프트 삭제된 기록의 표현 방식과 복구 진입 경로 → FR-430~FR-433a, FR-438
  - 소프트 삭제 기록의 누적 처리 → FR-434~FR-437 (복구 기간 약 1개월)
  - 조회 성능과 보존 기간 → FR-460~FR-462, FR-434 / 「후속」의 보존 기간 항목
- [x] **001의 FR-028~FR-037을 위반하지 않는다** — 「001 계약 정합성」 표로 전 항목 대조
- [x] **원본 로그를 보관하지 않음이 구조로 보장된다 (FR-029)** — FR-402가 「담을 자리가
      존재하지 않아야 한다」로 못 박고, 저장 시점 걸러내기를 명시적으로 금지했다.
      ROADMAP이 「관행이 아니라 구조」를 요구한 지점이다.
- [x] **일기와 집계의 짝이 모든 경로에서 유지된다 (FR-032)** — FR-410이 조작 단위를
      기록 묶음으로 두어 경로별 방어가 아니라 구조로 보장한다. 저장(FR-411)·소프트
      삭제(FR-430)·복구(FR-433)·재생성(FR-415·FR-416)·이행(FR-454)·전체 삭제(FR-440)
      전 경로에 대응 FR이 있다. SC-402가 검사한다.
- [x] **전체 삭제 후 복구 가능한 잔여물이 없다 (FR-035a)** — FR-441·FR-442, SC-408

## 프로젝트 고유 검사

- [x] **경계면 우선** — 축 내부를 파기 전에 계약이 확정되어 있다. 입력은 001·002·003·004가
      확정한 것을 그대로 받고(FR-401·FR-420), 출력은 FR-470~FR-474로 006에 넘긴다.
      저장 매체·인덱스·이행 절차 등 내부의 깊은 판단은 구현 단계로 미뤘다.
- [x] **원칙 0 정합** — 퍼소나 지속성이 구조로 보장된다: 기기 식별자 미포함(FR-404),
      성격을 식별자로 저장해 카탈로그 갱신이 성격을 바꾸지 못하게 함(FR-421).
- [x] **원칙 II 정합** — 저장 실패(FR-412), 복구 실패(FR-436), 이행 실패(FR-453)가
      모두 「알린다」로 수렴한다. 조용히 지나가는 경로가 없다.
- [x] **품질 판정으로 미끄러지지 않았는가** — 이 축은 일기의 내용을 해석하지 않는다.
      집계 항목도 해석 없이 그대로 보관한다(002·003·004 정합성 표). 저장 여부를
      기록의 내용으로 판단하는 요구가 하나도 없다.
- [x] **답하지 않는 것을 쓰지 않았는가** — 삭제·복구의 화면 조작(FR-472), 인덱스
      설계·쿼리 최적화(FR-462)를 명시적으로 배제했다.
- [x] **선행 스펙 역참조** — 001·002·003·004 계약 정합성 표로 각 요구가 어디서 처리되는지
      추적 가능하다.

## Notes

### 검증에서 다룬 쟁점

**보존 기간을 스펙에 숫자로 박는 것이 003의 실패 패턴과 같지 않은가** — 003은 상한·임계값을
비우고 실측을 요구했는데(FR-257), 여기서는 「약 1개월」을 확정했다. 이 둘은 **종류가 다르다**:

- 003의 임계값은 **실측이 답을 정할 수 있는 값**이다 — 집계를 키웠을 때 추론 품질이
  어떻게 변하는지 관측하면 근거가 나온다. 근거 없이 박으면 그것이 ROADMAP이 막으려던
  실패다.
- 복구 기간은 **실측이 답을 정할 수 없는 값**이다. 「치웠다가 마음이 바뀌는 데 얼마나
  걸리는가」는 측정 대상이 아니라 사용자 의도에 대한 제품 결정이다. 무기한 보존과 즉시
  하드 삭제 사이에서 선택해야 하고, 어느 쪽도 관측으로 도출되지 않는다.

따라서 이 값은 **사용자 결정으로 확정**하되, 「약 1개월」 안에서의 세부(30일이냐 한 달이냐)는
어떤 계약 성질도 바꾸지 않으므로 FR-434a로 구현 단계에 열어 두었다.

**이행을 전부 아니면 원상복귀로 한 이유** — 부분 이행을 허용하면 두 형식이 공존하고,
그 상태에서 기록 묶음의 짝(FR-410)이 깨진 기록이 생길 수 있다. 004 FR-304가 짝 보장에
의존해 재료 요약을 저장하지 않기로 했으므로, 짝이 깨지는 창을 아예 만들지 않는 쪽이
앞선 결정과 정합적이다. FR-455가 숨겨진 기록까지 이행 대상에 포함시킨 것도 같은 이유다 —
숨겨진 기록만 이전 형식으로 남으면 복구 시점에 읽을 수 없다.

**복구 기간의 기준 시점** — 복구 후 재삭제한 경우 기간을 마지막 삭제 시점부터 새로
시작하도록 했다(FR-435). 최초 삭제 기준으로 하면, 복구했다가 다시 치운 기록이 곧바로
만료되어 사용자가 「방금 치웠는데 사라졌다」를 겪는다.

### 남은 판단

- **보이는 기록에는 만료를 두지 않았다.** 사용자가 지우지 않은 일기는 남는다. 오래된
  기록의 자동 정리는 원칙 V의 「사용자 소유 데이터」와 정면으로 부딪치므로 「후속」의
  「나중에 판단할 것」으로 넘겼다.
- **백그라운드 실행 제약** — FR-435의 만료 제거가 백그라운드 작업에 의존할 수 없다는
  사실을 Assumptions에 적었고(003 Assumptions와 같은 제약), 제거 시점의 선택을
  FR-437로 구현 단계에 열어 두었다.
- **백업·동기화·기기 이전은 범위 밖이다.** 헌법 원칙 0의 「기기를 교체해도 퍼소나가
  이어진다」는 저장 구조가 기기 비종속임(FR-404)까지를 이 스펙에서 보장하며, 실제 이전
  수단은 별도 판단 사안이다.
