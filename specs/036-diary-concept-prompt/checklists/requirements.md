# Specification Quality Checklist: 일기 자동 생성 프롬프트 재구성 (E2SN)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
  - 예외: `prompt.ts`·`buildPrompt()`·`instructionLines()` 등 함수명을 쓴다. 이 스펙은
    "기존 함수가 내는 문자열을 바꾸는" 리팩터라 대상이 파일 하나로 고정돼 있고,
    핸드오프 문서가 그 세 자리를 명시적으로 지목했다. 대안(순수 사용자 언어)은
    "어느 문자열을 바꾸는가"를 흐려 검증 불가능하게 만든다.
- [x] Focused on user value and business needs — US1이 결정 12 채택의 실체(사용자가
  읽게 될 일기)를 다룬다.
- [ ] Written for non-technical stakeholders — 부분적. §5.6 손잡이·바이트 일치는
  기술적이나, 이 스펙의 이해관계자는 저장소 소유자 한 명이고 리포트를 이미 읽었다.
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous — 각 FR이 my-ollama 상수명 또는
  구체 문안을 지목한다.
- [x] Success criteria are measurable — SC-001은 바이트 일치, SC-004~005는 편 수.
- [ ] Success criteria are technology-agnostic — SC-001·SC-002는 함수·파일을 언급한다.
  바이트 일치 검증이 이 스펙의 핵심 안전장치라 추상화하면 의미가 사라진다.
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified — 루이·오드, 샤오바이·모카, 캡션 없는 사진 날,
  placeName, 바이트 불일치.
- [x] Scope is clearly bounded — prompt.ts 세 자리. acceptance.ts·vision/·llama-port.ts
  불변 명시.
- [x] Dependencies and assumptions identified — my-ollama 브랜치 fetch, 035
  displayNameOf, 029 모델 준비.

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows — 생성 흐름(US1), 검증(US2), 이름(US3).
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — 위에 적은 의도된 예외 외에는.

## Clarifications 반영 (Session 2026-09-08)

- **Q1 = B**: 세 한국어 캐릭터 모두 E2SN 머리 + 문장형 신호. → FR-000 추가, FR-001·
  004·006 범위 명시, Edge Cases·Assumptions·SC-004a 갱신.
- **Q2 = B**: 바이트 일치 검증은 세 한국어 캐릭터 × 6 = 18. chinese·english × 6 = 12는
  회귀 검증. → FR-024·024a·025, SC-001·001a 갱신.

## Analyze 지적 반영 (2026-09-08, /speckit-analyze)

CRITICAL 0. MEDIUM 4 + LOW 3 수정:
- **C1** (FR-016 부분 커버): `visionLimitLines()` 언어 분기 — `S_VISION_PARTIAL`만
  갈라지고 `VISION_UNREAD`·`VISION_NONE_READ`는 현행 문안. → FR-016 재작성, T016 갱신.
- **C2** (FR-024a/SC-001a 명시 gate 없음): T024에 chinese·english 12행 회귀를 세
  gate 중 하나로 명시.
- **C3·C4** (verify-036 대조 방향): 톤 줄 제거는 **my-ollama `buildCandidate`
  출력**에 적용(alpharium은 안 냄). `fixedHead` 조건부 spread로 `\n\n` 방지. →
  quickstart §3c 재작성, contracts E8 강화, T014·T023 갱신.
- **A1** (SC-007 지표 모호): "base 대비 안 늘어남"으로 재작성(BA 대비 빠름 요구 안 함).
- **A2·I1** (부분 문자열 충돌 / jest 카운트 가드): T008에 주의 추가.
- **FR-022** (llama-port gate 부재): T019에 `git diff src/inference/llama-port.ts` = 0.

## Notes

- 기술 용어(함수명·상수명)를 남긴 것은 의도적이다. 이 스펙은 새 기능이 아니라
  "확정된 문자열을 옮기는" 이식 작업이고, 리포트 §5.6·§7과 my-ollama
  `concept-candidates.ts`가 원본이다. 사용자 언어로만 쓰면 "E2SN 조립과 바이트가
  같아야 한다"는 이 작업의 유일한 성공 기준을 표현할 수 없다.
- `/speckit-plan`으로 진행 가능. 계획 단계에서 확인할 것: `sentenceSignalLines()`가
  받는 `ConceptCase` 타입과 alpharium `DaySignals`·`DiaryRequest`의 매핑, `koHour` 등
  헬퍼를 alpharium에 옮길지 인라인할지, `fixedHead()`/`signalLines()`/`visionLines()`가
  언어로 분기하는 자리를 어떻게 둘지(FR-000).
