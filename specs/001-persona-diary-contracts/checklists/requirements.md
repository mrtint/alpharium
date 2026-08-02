# Specification Quality Checklist: 퍼소나-일기 경계면 계약

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

## Boundary-Spec Discipline (이 스펙 고유 항목)

이 스펙은 기능 스펙이 아니라 **경계면 스펙**이므로, 일반 항목에 더해 아래를 검사한다.

- [x] BND001 네 축(퍼소나·수집/정제·추론·저장)이 모두 다루어졌다
- [x] BND002 어느 한 축의 내부 구현이 정의되지 않았다 (센서, EXIF 필드, 캡션 생성, 프롬프트, 모델, UI 디자인)
- [x] BND003 축 사이에 흐르는 데이터의 형태가 네 경계면 모두에서 정의되었다
- [x] BND004 비운 항목이 「후속 스펙으로 넘기는 것」에 명시적으로 이관되었다 — 암묵적 누락이 아니다
- [x] BND005 후속 스펙이 인접 축의 입출력을 상상하지 않아도 되도록 형태가 못박혔다 (SC-001)

## Constitution Compliance (v2.0.0)

원칙 0·I·V는 v1.3.0에서 변경되지 않았으므로 아래 CON001~CON008의 판정이 그대로
유효하다. 개정된 원칙 II·III·IV에 대한 재검사는 CON009~CON011로 따로 적었다.

- [x] CON001 원칙 0 — 화자가 휴대폰임이 요구사항으로 명시되었다 (FR-019)
- [x] CON002 원칙 0 — 사실 일치도를 수용 기준으로 삼지 않음이 명시되었다 (FR-020, SC-009)
- [x] CON003 원칙 0 — 퍼소나가 기기 식별자에 종속되지 않음이 명시되었다 (FR-005, FR-006)
- [x] CON004 원칙 0 — 회상 슬롯이 계약에만 존재하고 비활성임이 명시되었다 (FR-015, FR-016)
- [x] CON005 원칙 II — 실패 시 조용한 fallback 금지가 요구사항으로 명시되었다 (FR-022~FR-027)
- [x] CON006 원칙 II — 실패한 날 일기를 저장하지 않음이 명시되었다 (FR-023, SC-003)
- [x] CON007 원칙 V — 로컬 저장·삭제·이행이 명시되었다 (FR-033~FR-036)
- [x] CON008 기존 PoC 코드가 설계 근거로 사용되지 않았다

### v2.0.0 개정분 재검사 (2026-08-02)

- [x] CON009 원칙 II 「mock 경로 없음」(MUST NOT, 신설) — 이 스펙은 대체 문장 경로를 두지
      않는다. FR-024가 「미리 준비된 문장이나 대체 텍스트로 메우지 않는다」를 이미 MUST
      NOT으로 요구하므로 개정된 헌법보다 느슨한 자리가 없다. 라벨링된 mock을 예외로 두는
      서술도 없다
- [x] CON010 원칙 III 「어댑터의 책임은 호출뿐」(MUST, 재정의) — **이 스펙에서 검사할
      대상이 없는 것이 정상이다.** FR-021이 프롬프트·모델·출력 형식의 세부를 후속 추론
      스펙에 위임했고, 경계면 스펙은 어댑터 내부 배치를 정하지 않는다. 이 규범은
      [plan.md](../plan.md)의 구조 결정과 tasks의 T014·T033이 받는다
- [x] CON011 원칙 IV 「목록은 범위 요구가 아니다」(신설) — 이 스펙은 US1~US5를 모두 정의하되
      **무엇을 언제 구현할지는 정하지 않는다.** 범위 결정은 plan의 몫이며, 원칙 IV가 요구하는
      범위 대조는 [plan.md](../plan.md)의 「원칙 IV 범위 대조」가 수행한다. 스펙 층위에서
      어긋나는 자리가 없다

## Notes

- 검증 1회차에서 전 항목 통과. `[NEEDS CLARIFICATION]` 마커는 발생하지 않았다 — 미정 사항 두 건(퍼소나 이름·성격의 귀속, 생성 시점)은 스펙 작성 전에 저장소 소유자가 결정했다.
- **2026-08-01 `/speckit-clarify` 재검증**: 질문 5건 반영 후 전 항목 재평가. 상태 변경 없음(25/25 유지). 추가된 요구사항(FR-004a·b, FR-013a·b, FR-034a~c, FR-035a, FR-040a·b, FR-042, FR-043·a·b)과 기준(SC-010~013)은 모두 테스트 가능하며 구현 세부를 도입하지 않았다.
- 재검증에서 발견해 수정한 모순 2건: (1) FR-030의 "날짜당 한 편"이 소프트 삭제와 충돌 → "사용자에게 보이는 일기 기준"으로 정정. (2) 엔티티 관계의 "함께 소멸"이 소프트 삭제를 표현하지 못함 → "함께 숨겨짐"을 추가.
- **의도적 미정의 항목**은 결함이 아니다. 이 스펙은 경계면만 정의하므로, 축 내부의 세부는 「후속 스펙으로 넘기는 것」 절에 이관되었다. 그 절에 없는 채로 비어 있는 항목이 발견되면 그것이 진짜 누락이다.
- 다음 단계 판단: `/speckit-clarify`는 불필요하다(미해결 마커 없음). `/speckit-plan`으로 진행 가능하나, 이 스펙은 경계면 계약이므로 구현 계획보다 **축별 후속 스펙 작성**이 자연스러운 다음 단계일 수 있다.
- **2026-08-02 헌법 v2.0.0 재검사**: 개정된 원칙 II·III·IV에 대해 CON009~CON011을 추가하고 전 항목 재평가. 상태 변경 없음 — **체크박스 32개 전부 통과**(이전 노트의 "25/25"는 Content Quality 4개를 제외한 셈이었다. 이후로는 실계수를 쓴다). 스펙 본문 수정은 필요하지 않았다 — 개정의 대상이 **계획·구현 층위**(어댑터 내부 배치, 범위 대조 표기)이거나, 스펙이 이미 헌법보다 강하게 요구하고 있었기 때문이다(FR-024).
- 개정이 다른 아티팩트에 남긴 몫은 [plan.md](../plan.md)의 「원칙 IV 범위 대조」와 [tasks.md](../tasks.md)의 T014·T033이 받았다. 이 체크리스트는 **스펙 층위**만 검사하므로 그쪽 폐쇄 여부는 `/speckit-analyze`가 판정한다.
