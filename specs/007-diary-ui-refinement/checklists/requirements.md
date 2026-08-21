# Specification Quality Checklist: 최소버전 일기의 UI/UX 개선

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-20
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

## 헌법 대조 (이 저장소 고유)

- [x] **원칙 I** — 저장된 일기가 생성을 대신하는 경로를 열지 않는다 (FR-025, SC-014)
- [x] **원칙 I** — 생성 중인 글을 화면에 올리지 않는다 (FR-012, SC-013)
- [x] **원칙 III** — 모델 식별자·파라미터·크기·속도를 노출하지 않는다 (FR-007, FR-026, SC-011)
- [x] **원칙 III** — 관측 근거 없는 성격 설명을 붙이지 않는다 (FR-009)
- [x] **원칙 IV** — 진행률·경과 시간·토큰 수를 화면에 두지 않는다 (FR-011, FR-027, SC-012)
- [x] **원칙 V** — `none`과 `unknown`을 서로 다르게 보인다 (FR-019, SC-008)
- [x] **원칙 V** — 실기기 확인 없이 완료를 주장하지 않는다 (SC-016)

## Notes

### 검증에서 실제로 고친 것

1차 통과 후 재검토에서 발견해 수정한 항목:

- **FR-008과 FR-003이 충돌했다.** "미리 골라 두지 않는다"(003 FR-005b 승계)와 "고른
  캐릭터가 유지된다"가 문면상 어긋났다. FR-008에 **"이전에 고른 것을 복원하는 것은
  추천이 아니다"**를 명시해 해소했다.
- **FR-009가 헌법 로스터와 충돌할 뻔했다.** "성격 설명을 붙이지 않는다"를 그대로 두면
  헌법이 MUST로 요구한 `imaginative`의 「상상을 섞는다」 고지를 막는다. 예외와 그
  근거(헌법 본문)를 명시했다.
- **SC-012를 검증 가능하게 고쳤다.** "0건 노출"만으로는 눈으로 훑는 것이 되므로
  **"화면 상태에 그 값을 담을 자리가 없는 것으로 검증한다"**를 더했다 — 006이
  `AppScreen`의 `writing`에 필드를 두지 않은 것과 같은 방어다.

### 아슬아슬했던 자리 — 2026-08-20 clarify에서 해소됨

- **「도는 중」 표시가 원칙 IV에 걸리는가** → **해소.** 회전 표시로 확정했고
  **화면 상태에 필드를 더하지 않는 것**이 방어가 됐다(FR-010a). 단계 이름을 보이는
  선택은 명시적으로 거부됐다(FR-010b).
- **목록의 신호 단서를 전문 없이 얻을 수 있는가** → **질문 자체가 틀렸음이 확인됐다.**
  `listDiaries()`가 이미 날짜마다 `store.load()`를 불러 `readable`을 판정하므로
  **일기 전체가 이미 역직렬화되어 있다.** 추가 읽기 비용이 없으므로 FR-020을
  「전문을 *보이지* 않는다」로 고쳐 취지를 살렸다.

### clarify에서 새로 드러난 것

- **`stopCompletion()`이 부분 결과를 담아 정상 resolve된다**(2026-08-17 실측)는 사실이
  FR-014a·b를 낳았다. 「그만두면 글이 없다」가 자동으로 성립하지 않으므로 **명시적으로
  버려야 한다** — 이것을 모르면 끊긴 글이 화면에 오를 수 있었다.
- **FR-005의 자동 대체가 FR-008(추천 금지)과 충돌할 뻔했다.** 「성격을 근거로 고르는
  것」과 「쓸 수 있는 것으로 옮기는 것」을 가르고, 알림·되돌리기를 조건으로 달아
  해소했다(FR-005a·b, FR-008).

### 계획 단계에서 확인할 것

- 회전 표시를 어떤 방식으로 그리든 **새 네이티브 의존이 생기지 않아야 한다**(FR-028,
  SC-015).
- 006 이전에 저장된 일기에 사진 신호가 없으면 그 줄은 단서 없이 날짜만 보인다 —
  **없는 것을 지어내지 않는다**(원칙 V, Assumptions).
