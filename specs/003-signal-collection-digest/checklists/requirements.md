# Specification Quality Checklist: 신호 수집·정제와 일별 집계

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

## ROADMAP 003 완료 조건 대조

ROADMAP의 「003 — 수집·정제 스펙」이 정한 완료 조건을 그대로 옮겨 검사한다.

- [x] **위 일곱 질문에 답이 있다** — 「이 스펙의 범위」의 대응표가 질문별 FR 구간을 지정한다. 일곱 질문 전부 대응 구간이 존재한다.
- [x] **001의 FR-008~FR-013b를 위반하지 않는다 — 특히 미관측과 값-없음의 구별(FR-010)이 항목별로 표현 가능하다** — FR-211이 관측 여부를 **항목 단위**로 못 박고, FR-242·FR-243이 관측됨/미관측/관측된 값-없음 세 상태를 구별한다. FR-252가 사진 항목 **내부**에서도 항목별 구별을 요구한다. SC-203·SC-204가 검사한다.
- [x] **"비었다"와 "적다"의 판정이 기계적으로 결정 가능하다 (사람의 재량 판단이 개입하지 않는다)** — FR-271이 판정 근거를 개수로 한정하고, FR-272가 세는 대상을 **여섯 항목으로 열거**하고, FR-273·FR-274가 경계값과 임계값 범위(2~6)를 정하고, FR-275가 결정성을 요구한다. SC-210·SC-211이 검사한다.

  검증: 허용된 임계값 전 범위(2~6)와 가능한 관측 개수 전 범위(0~6)의 모든 조합에서 **판정이 정확히 하나씩만 성립하고**(총합·배타성), 「적음」과 「보통」이 모두 도달 가능함을 전수 대조로 확인했다.
- [x] **004가 이 문서만 읽고 집계의 형태를 확정할 수 있다** — FR-244가 항목의 최종 목록을 표로 확정했고, FR-245·FR-246이 각 항목의 미관측 가능 여부를 정했고, FR-280~FR-283이 경계면을 명시했다. SC-215가 검사한다.
- [ ] **온디바이스 여건에서 실측으로 검증된 압축 수준이다** — **이 스펙만으로 충족되지 않는다.** 아래 「미해결 항목」 참조.

## 미해결 항목

**압축 수준의 실측** — ROADMAP의 다섯 번째 완료 조건은 이 스펙 단계에서 닫히지 않는다.

확인된 사실: 저장소의 PoC(`src/`, `App.tsx`)에는 센서 관련 의존성이 하나도 설치되어 있지 않고, `DeviceSignalPackage`는 손으로 넣은 값으로 채워졌다. 즉 concept.md가 말한 "실측으로 확인했다"는 **일기 생성이 가능한가**에 대한 실측이며, **집계 크기와 추론 품질의 관계**에 대한 실측이 아니다.

이 스펙의 처리:

- 상한 값과 시간대 세분도, 규모 판정 임계값을 **확정하지 않고** 구현 단계로 넘겼다 (FR-228, FR-257, FR-274).
- 실측을 **요구사항으로 못 박았다** (FR-257: 실측 없이 정한 값을 최종값으로 남기지 않는다).
- 검사 지점을 남겼다 (SC-216).
- 검증되지 않았다는 사실을 Assumptions에 명시했다.

**따라서 이 항목은 003 스펙의 결함이 아니라 구현 단계로 이월된 조건이다.** 근거 없는 숫자를 스펙에 박아 넣고 완료로 표시하는 것이 ROADMAP이 막으려던 실패이므로, 값을 비운 채 실측을 요구하는 쪽을 택했다.

## 파기 신호 점검

ROADMAP은 003의 실패 신호를 **"특정 라이브러리의 API 사용법을 쓰고 있다면 구현 단계의 영역"**으로 정했다.

- [x] 특정 패키지 이름, 함수 이름, 옵션 값이 스펙 본문에 없다 — 소스는 「활동·위치·사진·일정」이라는 관측 대상으로만 서술된다.
- [x] 권한을 플랫폼별 권한 문자열이 아니라 **무엇을 읽는 권한인가**로 서술했다 (FR-204~FR-207).
- [x] 캡션 생성 모델을 지정하지 않았다 (FR-237).
- [x] 「이 스펙이 답하지 않는 것」 표가 구현 단계로 넘기는 항목을 명시한다.

## 검사 중 고친 것

**파생 항목이 개수 세기를 편향시키는 문제** — 초안의 FR-244는 「사진 총 개수」를 다른 항목과 나란히 두었고 FR-272는 그것을 따로 셌다. 그 결과 사진 한 장 찍은 날은 2로, 걸음 수만 관측된 날은 1로 세어져 **같은 관측이 소스에 따라 다른 무게를 갖는** 상태였다. 001 FR-013a가 요구한 "개수만으로 판정"은 형식적으로 지켜지지만, 세는 방식 자체가 사진에 가중치를 주므로 FR-275의 기계적 결정성이 실질적으로 무너진다.

고친 내용: FR-246a를 신설해 「사진 총 개수」를 **파생 항목**으로 규정하고, FR-272에서 세는 대상을 **여섯 항목으로 명시적으로 열거**했다. 이에 따라 FR-274의 임계값 상한도 「목록의 항목 수」라는 모호한 표현에서 **2~6의 구체적 범위**로 바뀌었다.

## Notes

- 「미해결 항목」의 실측 조건을 제외한 모든 검사 항목이 통과했다.
- 다음 단계로 `/speckit-clarify`를 돌릴 실익은 크지 않다 — 남은 미확정 항목(상한 값·임계값)은 사용자와의 대화가 아니라 **실측**으로만 닫히기 때문이다.
- 004(추론) 착수 전제는 이 스펙으로 충족된다. 004는 001·002·003을 읽고 시작한다.
