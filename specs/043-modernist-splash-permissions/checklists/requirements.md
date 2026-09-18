# Specification Quality Checklist: Modernist 디자인 시스템 적용 1차 — 스플래시·권한 요청 흐름

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-18
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

- 두 개의 Clarification 항목(타이틀 문구, accent 대비 대응 전략)은 스펙
  작성 중 사용자와 합의된 방향을 즉시 반영해 마커 없이 확정했다.
- FR-011·FR-012는 색상 코드(#f3f2f2 등)를 직접 인용하지만, 이는 사용자가
  제공한 디자인 리뷰 보드의 확정 값이며 032/037/042 선례(색상·상수를
  스펙에 직접 못박는 관행)를 따른 것이다 — 구현 기술(프레임워크·라이브러리)
  선택이 아니다.
- `/speckit-clarify` 세션(2026-09-18)에서 "다시 묻지 않음" 거부 갈래
  질문 1건을 처리, FR-008a·Edge Cases에 반영. 체크리스트 상태 변화 없음
  (질문 이전에도 전 항목 통과 상태).
- 2026-09-18 추가 지시로 온보딩 UX 방향이 바뀌었다 — 애초 FR-009("화면
  레이아웃 구조는 새로 설계하지 않는다")가 목적 설명 카드+화면 버튼
  구조를 전제했으나, 그 카드·버튼 자체를 걷어내고 요청 함수 연속 호출로
  대체하기로 확정(FR-007a·FR-007b·FR-008 개정). 이는 "레이아웃을 안
  바꾼다"는 원 방침의 예외이지만, 사용자가 명시적으로 요청한 변경이며
  범위(스플래시+권한 흐름 두 화면)는 그대로 유지된다 — 스코프 확장이
  아니라 그 안에서의 방향 정정으로 판단, 체크리스트 항목("Scope is
  clearly bounded") 재확인 통과.
- 후속 정정: 최초 답변("배터리 예외는 OS 다이얼로그가 없다")이 부정확
  했다 — `battery-exception-port.ts`의 `requestException()`이 실제로
  `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 인텐트(AOSP 표준 다이얼로그)를
  호출한다. 삼성 One UI에서 설정 화면으로 라우팅되는 것은 027이 실측한
  제조사 커스터마이징이지 "다이얼로그 없음"이 아니다. 사용자가 직접
  질문해 바로잡았고, 배터리 예외도 다섯 단계 연속 호출에 포함시키되
  "승인 여부 조회 불가"라는 기존 제약(020/021)에 따라 결과를 기다리지
  않는 것으로 FR-007a·FR-007b·FR-008을 재정정했다.
- context7로 `expo-intent-launcher` 공식 문서를 확인하는 과정에서 021의
  기존 결함을 하나 더 발견했다 — `requirements.ts`의 `battery-exception`
  항목이 `platforms: ["android", "ios"]`로 선언돼 있는데, 그 요청에 쓰는
  `expo-intent-launcher`는 iOS를 지원하지 않는다("동등한 API 없음", 공식
  README). 사용자 승인 하에 이번 043에서 `["android"]`로 정정하기로
  FR-017에 반영했다 — 로직 계층 무변경 원칙(FR-014)의 유일한 예외, 값
  한 줄 수정에 한정.
- 사용자 정정: "iOS·웹은 이 저장소의 검증 대상이 아니다"(AGENTS.md)는
  이 코드가 Android 전용으로 작성된다는 뜻이 아니라, 현재 개발 환경
  (Windows)에서 연결 가능한 기기가 Android뿐이라 이번 검증 범위가
  거기로 한정된다는 뜻이다 — Mac 환경이면 iOS 검증도 가능하다. 스펙
  초안이 이 구분을 "Android 전용 저장소"라는 표현으로 흐렸던 것을
  Assumptions·FR-017·Clarifications 세 곳에서 정정했다. `platforms`
  필드가 iOS를 잘못 포함한 것은 검증 미비가 아니라 코드 자체의 사실
  오류(iOS에 대응 API가 없음)라는 점이 핵심이다.
- 최종 정정: 배터리 최적화 예외가 iOS엔 대응 API가 없고 안드로이드
  에서도 제조사마다(삼성 One UI 등) 다르게 동작한다는 점이 드러나자,
  사용자가 "iOS·AOS 방식을 억지로 맞추려 들지 말고 이 항목은 통합
  대상에서 빼자"고 지시했다. FR-007a(연속 호출)에서 배터리 최적화
  예외를 완전히 제외하고 FR-007c(신설)로 기존 021 방식(안내 문구 +
  [설정 열기]/[건너뛰기] 버튼)을 그대로 유지하도록 되돌렸다 — 다만
  근거는 최초 판단("다이얼로그가 없다")과 다르다. 실제로는 다이얼로그가
  있지만 "플랫폼·제조사마다 결과가 갈리는 항목을 하나의 UX로 통일하지
  않는다"는 사용자의 명시적 정책 결정이 근거다. User Story 2·Acceptance
  Scenarios·Edge Cases·FR-007a/007c/008/008a/009·SC-003·Assumptions·
  Clarifications 전체를 이 방향으로 재정렬했다.
- `/speckit-plan`~`/speckit-analyze`~수정 반복(2026-09-18)에서 발견·
  수정한 사실 오류 4건 — 체크리스트 항목 자체의 통과 상태는 바뀌지
  않았으나(모호성·미완성 문제가 아니라 계산·소스 확인 착오였음) 기록:
  1. 권한 요구사항이 "5단계(사진·사진 위치·위치·알림·배터리)"라는
     서술이 031 변경(photo-location 항목 제거)을 반영하지 못한 사실
     오류였다 — "3단계(사진·위치·알림)+배터리 1단계"로 정정(FR-007).
  2. FR-008("거부는 곧 건너뛰기")이 요구하는 동작이 `decision.ts`의
     `statusOf()`(denied→actionable) 특성상 화면의 명시적 자동 skip
     호출 없이는 실제로 성립하지 않는다는 로직 갭을 발견해 FR-008에
     "구현 함의" 문단과 tasks.md T014에 CRITICAL 주석을 추가했다.
  3. `Button` `primary` variant 배경 변경(accent→danger)의 영향
     범위를 "온보딩 화면 유일"이라고 서술했으나 실제로는
     `AuthorPicker`·`AutoDiarySettingsScreen`·`SelectRow`도 `accent`를
     텍스트 색으로 직접 써서(회귀 위험) FR-012·FR-013에 정정 반영,
     tasks.md T005b·T005c 추가.
  4. **가장 심각했던 오류**: `accentForeground`를 `#201e1d`로 정하면
     DT4가 통과한다고 1차 판단했으나, 재계산 결과 3.95:1로 여전히
     4.5:1 미달이었다(DT4는 실사용처와 무관하게 `COLORS` 값 자체를
     비교하는 테스트라는 점을 놓쳤음). 순검정(#000000, 5.00:1)으로
     최종 확정, DT4 6쌍 전체를 node로 재계산해 전부 PASS 확인.
