# Specification Quality Checklist: UI — 휴대폰의 일기를 사용자가 만나는 자리

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-01
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

**검토 note**: FR-507이 레이아웃·시각 디자인을, FR-500이 탭·스택·모달의 선택을 명시적으로
구현 단계에 넘겼다. FR-595(어댑터 경계)·FR-596(저장 축 조회만 사용)은 기술 선택이 아니라
**헌법 원칙 III와 005 FR-472가 정한 경계의 재확인**이므로 구현 세부에 해당하지 않는다.

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

**검토 note — 검사 가능성**: FR-541(「낮게 평가하는 것으로 읽히지 않아야 한다」)은 그
자체로는 재량 판정이다. 이 스펙은 그것을 검사 가능한 세 조건으로 분해했다 — FR-542(진행이
기본 선택), FR-543(평가어·경고 기호 금지), FR-540(「보통」에서는 미표시). SC-511·SC-512·
SC-514가 각각의 검사 지점이다. **분해로 닫히지 않는 잔여**(사용자가 실제로 말리는 것으로
느끼는가)는 Assumptions 두 번째 항목에 명시하고 구현 후 관찰로 넘겼다.

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

---

## ROADMAP 006 완료 조건 대조

ROADMAP.md 「006 — UI 스펙」이 정한 조건이다.

### 답해야 끝나는 질문 여섯

- [x] **화면 구성과 이동 경로** — FR-500~FR-507. 다섯 자리와 그 사이의 도달 가능성을
      정하고, 구현 형태는 넘겼다.
- [x] **생성 진행·실패 표시** (001 FR-022·FR-041) — FR-520~FR-529. 진행 표시, 결말 도달
      보장, 실패 구별의 기준(다음 행동이 갈리는 만큼), 추론 외 실패까지.
- [x] **덮어쓰기 확인** (FR-040) — FR-530~FR-534. 소프트 삭제된 날짜의 분기 포함.
- [x] **「적음」 확인** (FR-043) — FR-540~FR-547. 아래 별도 항목에서 다시 본다.
- [x] **삭제·복구 조작 경로** — FR-560~FR-573. 개별 삭제의 진입, 숨긴 기록 목록, 복구,
      복구 기간 표시, 전체 삭제 확인의 무게 차이.
- [x] **개발 모드 클라우드 표시** (헌법 원칙 I) — FR-590~FR-593. 프로덕션 미표시와
      「지나칠 수 없는 자리」 조건 포함.

### 완료 조건 넷

- [x] **위 여섯 질문에 답이 있다** — 위 표.
- [x] **실패가 조용히 지나가지 않는다** (헌법 원칙 II) — FR-522(명시적 표시)·FR-521(결말
      도달)·FR-525(대체 문장 금지)·FR-528(집계·저장·복구·이행 실패까지)·FR-565(복구 실패).
      SC-506~SC-509·SC-521이 검사 지점. **추론 실패만 다루고 나머지를 삼키는 것**이 이
      조건의 흔한 빠져나감이므로 FR-528을 따로 두었다.
- [x] **FR-043의 확인이 「막는 것」이 아니라 「알리는 것」으로 읽힌다** (FR-043a) —
      FR-541~FR-546. 문면에만 기대지 않고 **구조적 요소**(기본 선택의 위치, 기호·색)를
      금지한 것이 이 절의 핵심이다. 잔여 불확실성은 Assumptions에 명시.
- [x] **일기와 그 근거 집계를 대조할 수 있다** (001 FR-031) — FR-504·FR-510. 대조를
      부가 기능이 아니라 **일기 상세의 필수 구성**으로 두었고(도메인 개념), FR-510이
      「별도 영역으로 벗어나게 하지 않는다」로 접근 비용까지 제약했다. SC-501이 검사 지점.

### 파기 시작했다는 신호 — 자체 점검

ROADMAP은 006에 대해 별도의 「파기 신호」를 적지 않았으나, 공통 실패 양상(문면 다듬기를
스펙 작업으로 위장하는 것)에 대해 자체 점검했다.

- [x] 실제 마이크로카피 문장을 쓰지 않았다 — FR-516·FR-529·FR-547이 문면을 명시적으로
      구현 단계에 넘겼다.
- [x] 레이아웃·색·서체·아이콘을 정하지 않았다 — FR-507.
- [x] 재료 요약이 **어떤 항목을 세는지** 정하지 않았다 — 004 FR-306이 이 축에 넘겼으나
      성질(FR-511~FR-513)만 정하고 선택은 구현으로 넘겼다.

---

## 공통 완료 조건 (ROADMAP 「공통 완료 조건」)

- [x] **001의 경계면 계약을 위반하지 않는다** — 「001 계약 정합성」 표에서 FR-003·FR-004·
      FR-010·FR-013·FR-018·FR-020·FR-022~FR-027·FR-030·FR-031·FR-034~FR-035a·FR-037·
      FR-038·FR-040~FR-043a를 대조했다. 001 수정이 필요한 항목은 없다.
- [x] **인접 축의 입출력을 상상하지 않는다** — 표시 대상 전부를 002 FR-140·FR-141,
      003 FR-244·FR-281, 004 FR-300·FR-350·FR-373, 005 FR-470·FR-471에서 가져왔다.
      「002·003·004·005 계약 정합성」 표가 출처를 항목별로 명시한다.
- [x] **「답하지 않는 것」에 해당하는 내용을 쓰지 않는다** — 집계의 항목 구성(003),
      일기의 구성(004), 저장 내부(005)에 손대지 않았다. 「이 스펙의 범위」 절에 명시.
- [x] **헌법 원칙 0·I·II를 위반하지 않는다** — 「헌법 정합성」 표.
      - 원칙 0(화자): FR-599가 본문 편집을 금지한다 — 사용자가 고치면 그 일기는 휴대폰이
        쓴 것이 아니게 되어 001 FR-018의 귀속이 거짓이 된다. 001~005 어디에도 이 금지가
        없었고, 화면이 편집을 붙이면 원칙 0이 조용히 무너지는 자리였다.
      - 원칙 0(유희): FR-598이 정확도 평가·피드백 수집을 금지한다. 「맞았나요?」를 묻는
        순간 사실 일치도가 사용자 눈앞의 기준이 되어 001 FR-020·SC-009와 부딪힌다.
      - 원칙 II: 위 「실패가 조용히 지나가지 않는다」 항목.

---

## Notes

- **이 스펙이 닫지 못한 것 하나** — 「적음」 확인이 사용자에게 실제로 게이트로 느껴지지
  않는지는 스펙 단계에서 판정할 수 없다. 검사 가능한 구조적 조건(FR-542·FR-543)까지
  정하고 나머지는 구현 후 관찰로 넘겼다. **003의 실측 이월과 같은 성격**이며, 근거 없는
  판정을 스펙에 박아 넣고 완료로 표시하지 않는 쪽을 택했다.
- **이 스펙이 새로 금지한 것 둘** — FR-598(정확도 평가·피드백 수집)과 FR-599(본문 편집).
  둘 다 001~005에 없던 요구다. 화면 축에서만 발생 가능한 원칙 0 위반이므로 여기서 막는
  것이 맞으나, **001의 경계면 계약을 넘어선 신설이 아니라 원칙 0의 화면 측 적용**이다.
- 006은 ROADMAP의 마지막 축 스펙이다. 이후 남은 것은 구현 단계와, ROADMAP 「이 로드맵
  밖의 것」에 적힌 별도 판단 항목들이다.
