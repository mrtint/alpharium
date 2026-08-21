# Specification Quality Checklist: 지난 하루를 골라 쓴다

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

## 헌법 대조 (Alpharium Constitution v1.0.2)

- [x] **원칙 I** — FR-013·FR-019가 「저장된 것이 생성을 대신하는」 경로를 막는다.
      SC-007이 그것을 검증한다
- [x] **원칙 II** — 이 기능은 프롬프트를 건드리지 않는다. Out of Scope에 명시했고
      Assumptions가 007의 미해결 위반을 프롬프트의 자리로 남겼다
- [x] **원칙 III** — FR-020·SC-009가 모델 정보 노출을 막는다
- [x] **원칙 IV** — FR-018·SC-010이 진행률·시간·토큰을 막는다. 이 기능은 측정·채점을
      들이지 않는다
- [x] **원칙 V** — FR-016이 `none`/`unknown` 구분을 하루를 거슬러도 유지시킨다.
      SC-013·SC-014가 실기기 확인을 요구하고, Assumptions가 「사흘 전 사진 조회」를
      **짐작으로 명시**한다

## 반복 이력

**2차 — `/speckit-clarify` 세션 (2026-08-21), 질문 5개**:

1. **되돌림 시점이 정해져 있지 않았다**(FR-009) → 화면을 그릴 때마다 다시 판정한다.
   FR-009a·009b를 세워 **순수 함수가 매번 다시 묻게** 했다 — 008이 「거부 안내가 아직
   참인가」로 타이밍 버그를 막은 것과 같은 구조다.
2. **알림이 언제 사라지는지 없었다** → 다시 고를 때까지 남는다(FR-009c). 007의
   `movedFrom`과 달리 **되돌림의 원인이 저절로 사라지지 않으므로** 사라지는 조건이
   사용자의 행동 하나뿐임을 명시했다. FR-009d가 「화면이 스스로 비교하지 않는다」를
   못 박았고, Key Entities에서 「되돌려졌음」을 별도 갈래에서 **판정 결과로** 바꿨다.
3. **고르는 자리에 무엇이 실리는지 없었다**(FR-011) → 「일기가 이미 있다」만.
   FR-011a가 사진 갈래를 막는다 — **아직 쓰지 않은 하루의 값은 알 수 없고**, 보이려면
   Out of Scope의 기록 계층을 열어야 한다. FR-011b가 추가 읽기를 막는다.
4. **확인 못 했을 때 무엇이라 적을지 없었다**(SC-014) → 완료 조건은 SC-013이고
   사진 조회는 **관측된 대로 기록한다.** 기기에 그런 하루가 있는지는 우리가 정할 수
   없으므로(root 없이 날짜를 못 바꾼다) 007이 `none`을 미확인으로 남긴 선례를 따른다.
5. **★ 「3일」의 의미를 사용자가 바로잡았다** → 고를 수 있는 **하루의 개수**이지
   일기가 덮는 기간이 아니다. FR-006a·SC-002a를 세우고 「왜 이 기능인가」에 못 박았다.
   Out of Scope에만 있던 것을 **요구사항으로 올린 것**이며, 그것이 없으면 「사흘을
   묶은 글」이 통과할 여지가 있었다.

**1차 검토에서 고친 것**:

1. **범위 해석이 흔들렸다** — 초안이 「네 개」와 「셋」을 섞어 썼다. 사용자 표현
   「3일 전까지」를 **마지막으로 닫힌 하루 포함 셋**으로 확정하고, 다른 해석의
   존재와 바꾸는 비용을 Assumptions에 남겼다.
2. **「사흘 전 사진이 조회된다」를 사실처럼 적었다** — 원칙 V 위반이다. 짐작으로
   되돌리고 SC-014를 세워 실기기 확인 대상으로 만들었다.
3. **FR에 파일 경로·함수 이름이 새어 있었다**(`day-boundary.ts`, `FR-021a`) —
   구현 세부다. 「기존 하루 경계 정의처」로 바꿨다.
4. **Edge Case 하나가 빠져 있었다** — 「범위 안 셋 모두에 일기가 있는 경우」.
   고를 자리가 사라지지 않는다는 것을 명시했다.
5. **Out of Scope에 프롬프트 품질을 명시했다** — 007이 남긴 원칙 II 위반을 여기서
   함께 고치려는 유혹이 실재하며, 그것이 「한 축을 깊게 파는」 실패 신호다.

## Notes

- 모든 항목 통과(16/16). `/speckit-plan`으로 진행 가능하다.
- **[NEEDS CLARIFICATION] 없음.** 1차에서 남긴 범위 해석의 흔들림은 5번째 질문에서
  **사용자가 직접 확정했다** — 「3일」은 하루의 개수다.
- **저장 계층·파이프라인·신호 수집은 이미 하루를 인자로 받는다.** 제약은 화면
  한 곳에만 있으므로 이 기능의 표면은 좁다.

### 남은 것 — 계획 단계로 미룬다

**FR-017(범위 밖 하루로 생성을 시작할 수 없다)을 어디서 막을지 정하지 않았다.**
5번째 질문으로 물으려던 것이나, 사용자가 「3일」의 의미를 바로잡으면서 그쪽이 더
중요해져 자리를 넘겼다.

**선택지**: ① 쓰기를 시작하는 자리에서 막는다(판정 함수가 돌려준 하루만 넘길 수
있게 하고 파이프라인 계약은 그대로) ② 파이프라인에 `day-too-old` 갈래를 더한다
③ 둘 다.

**②는 값이 두 곳에 생길 위험이 있다** — 「사흘」은 009의 값이고 파이프라인은 002의
계약이므로, 거기 넣으면 FR-003(범위 크기는 한 자리)이 흔들린다. **계획 단계에서
정한다.**
