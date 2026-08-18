# Specification Quality Checklist: 첫 일기 앱 — 최소한의 제품으로 묶는다

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-18
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

- [x] 원칙 I — 저장된 일기를 생성 대신 보여주지 않는다(FR-028), 미리 만든 응답 자리를 두지 않는다(FR-030), 사용자 경로가 `select.ts`를 거친다(FR-011a)
- [x] 원칙 II — 화자 교정이 명시적 목표이며(Story 2), 규칙 자리가 하나로 유지된다(FR-014, SC-013)
- [x] 원칙 III — 모델 정보 비노출(FR-026, SC-010), 캐릭터 문안을 여전히 짓지 않는다(Assumptions)
- [x] 원칙 IV — 지표 비노출(FR-027, SC-011), 판정 갈래를 늘리지 않는다(FR-015, SC-012)
- [x] 원칙 V — `unknown`/`none` 구분이 화면까지 간다(FR-023, SC-014), 실기기 확인이 성공 기준에 있다(SC-001, SC-008)
- [x] 「한 축을 깊게 파지 않는다」 — 디자인·배포·날짜 선택·편집을 전부 범위 밖으로 밀었다

## 검토 중 확인한 것 (validation notes)

### 1차 검토에서 고친 것

- **초안은 Story 2(프롬프트 교정)를 P2로 두었다.** 화면 붙이기가 먼저라고 보았기
  때문이다. **P1으로 올렸다** — 사용자가 처음 읽는 일기가 원칙 II를 어기면 패키징이
  자기 설정을 배반하는 것이 된다. 둘은 분리할 수 없다.
- **초안의 SC 일부가 구현을 가리켰다**("화면 컴포넌트가 상태를 받는다"). 사용자가
  관측할 수 있는 결과로 다시 썼다.
- **「패키징」의 뜻이 두 갈래였다**(사용자가 쓸 수 있는 모양 / 스토어 배포). Assumptions와
  Out of Scope에서 명시적으로 갈랐다 — 후자를 먼저 열면 아무 일도 안 하는 앱의 배포
  작업만 쌓인다.

### [NEEDS CLARIFICATION]을 쓰지 않은 이유

세 자리가 후보였으나 저장소의 기존 결정으로 답이 정해졌다.

- **어느 날짜의 일기를 쓰는가** → 「어제」. 하루가 04:00에 닫히므로(001 FR-021a) 오늘은
  대개 닫히지 않았다. 날짜 선택 UI는 별개 축이므로 범위 밖으로 두었다.
- **네비게이션을 어떻게 하는가** → 화면이 셋뿐이라 상태로 가른다고 가정했다. 라이브러리
  도입은 별개 축이며, 필요하면 `/speckit-plan`에서 뒤집을 수 있다.
- **읽을 수 없는 일기 파일을 어떻게 다루는가** → Edge Cases에 남겨 두었다. `fileStore`가
  이미 `null`을 주고 「빈 일기로 만들지 않는다」가 확정된 상태이므로, 목록에서 어떻게
  보일지는 계획 단계의 판단으로 충분하다.

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- 전 항목 통과. `/speckit-plan`으로 갈 수 있다.
- **계획 단계에서 가장 조심할 자리**: 화면이 생성을 부르는 경로. 진단 화면은
  `onDeviceBackend()`를 직접 부르는 예외였고(dev에서만 열리므로 성립), 사용자 경로는
  그 예외가 성립하지 않는다 — `selectBackend()`를 거치지 않으면 원칙 I의 검증 지점이
  우회된다(FR-011a, SC-016).
