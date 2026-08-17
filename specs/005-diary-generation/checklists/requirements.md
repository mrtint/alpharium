# Specification Quality Checklist: 실제 일기 생성

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-16
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

## 헌법 정합성 (이 프로젝트 고유)

- [x] **원칙 I** — 온디바이스 생성이 요구되고(FR-002), 미리 만들어 둔 응답 경로가 금지되며(FR-003), 실패가 텍스트를 반환하지 않는다(FR-017a·b). **화면 쪽 우회로도 닫혔다** — 판정을 통과하지 않은 글을 보여주지 않는다(FR-028b)
- [x] **원칙 II** — 화자 규칙이 프롬프트 요구사항으로 들어갔고(FR-013·013a), 검증은 사람이 읽어 확인하는 것으로 두었다(SC-002·002a)
- [x] **원칙 III** — 모델 정보 노출이 프롬프트·실패 문구·진단 경로 모두에서 금지됐다(FR-015, FR-027a, SC-007). **거부 사유를 그대로 보이는 것도 누출로 다룬다**(FR-017e). 캐릭터 표시 이름은 여전히 짓지 않는다
- [x] **원칙 IV** — 속도·점수·토큰 수 필드가 금지됐고(FR-011, FR-018a, SC-008), 출력 판정을 「기계가 볼 수 있는 것」으로 한정했다(FR-018). **판정 갈래가 넷으로 못 박혔고 임계값이 금지됐다**(FR-018b·c, FR-016b-2) — 초판의 최대 위험이 닫힌 자리다
- [x] **원칙 V** — `unknown`/`none`이 프롬프트 경계에서 구분되어야 하고(FR-012a·b), 짐작인 값(샘플링 파라미터·한도)이 짐작임을 남기도록 했다(Assumptions)

## Notes

### 확인된 사항

- **[NEEDS CLARIFICATION] 마커가 남지 않았다.** 판단 지점 **열하나**가 전부 Clarifications에 근거와 함께 기록됐다. 초판의 여섯은 헌법에서 답이 유도되었고, `/speckit-clarify`(2026-08-17)에서 **다섯이 사람의 결정으로 더해졌다.**

  초판(헌법에서 유도):
  1. 캐릭터별 프롬프트 여부 → 원칙 III(성격은 관측된 것이지 지어낸 것이 아니다)에서 유도
  2. 거부된 출력의 처리 → 원칙 I(고쳐 쓰면 우리가 만든 일기가 된다)에서 유도
  3. 판정의 깊이 → 원칙 IV(측정 장치를 제품에 들이지 않는다)에서 유도
  4. `quick`/`detailed`의 처리 → 001 FR-009c·003 FR-008a의 「조용한 대체 금지」 선례에서 유도
  5. 빈 신호의 처리 → 002 FR-005a·b가 이미 정한 것을 확인
  6. 모델 적재 수명 → 기기 메모리 제약이라는 물리적 사실에서 유도

  clarify(사람의 결정):
  7. 앱이 앞에 있을 때만 생성한다 → FR-021b·c·d
  8. 하루에 일기는 하나이며 덮어쓴다 → FR-020a·b
  9. 생성 중에는 「쓰고 있다」만 보인다 → FR-028 무리
  10. 거부는 「할 수 있는 것」으로 옮겨 알린다 → FR-017c·d·e
  11. 되뱉기는 문자열 일치로만 판정한다 → FR-016b-1·2, FR-018b·c

- **구현 세부를 담지 않았다.** `llama.rn`·`initLlama`·`initMultimodal`은 「이 기능이 무엇인가」와 Out of Scope에서 **왜 시각 처리가 범위 밖인지**를 설명하는 데만 등장하며, 요구사항(FR)에는 나오지 않는다. FR은 전부 「무엇을」로 쓰였다.

- **성공 기준이 기술 중립이다.** SC-008만이 "필드가 0개"로 코드를 가리키지만, 이것은 헌법 원칙 IV가 **코드의 모양 자체를 규정한 것**이므로 검증 대상이 코드일 수밖에 없다. 003·004의 SC도 같은 형태를 썼다.

### 다음 단계에서 정해질 것 (스펙의 공백이 아님)

- 시간 한도와 길이 한도의 **구체적인 수** — FR-021·021a는 한도가 **있어야 한다**를 요구하고, 값은 004의 사진 상한 200과 같이 plan/research 단계에서 근거와 함께 정한다.
- 샘플링 파라미터의 **구체적인 값** — 위와 같다. Assumptions에 「짐작이며 실측이 아니다」로 명시했다.
- 언어 판정(FR-016c)의 **구체적인 방법** — 판정의 상한은 FR-018b가 못 박았고, 문자 범위를 어떻게 보는지는 contracts 단계다.

### 해소된 위험 (2026-08-17 clarify)

- **판정이 채점 코드로 자라는 위험이 닫혔다.** 초판이 「가장 미끄러운 요구사항」으로 남긴 것이며, clarify에서 세 겹으로 막았다: 되뱉기를 문자열 일치로 한정(FR-016b-1), 임계값 금지(FR-016b-2), **판정 갈래를 넷으로 못 박고 더하려면 원칙 IV를 먼저 따지게 함**(FR-018b). SC-008c·008d가 이것을 검증 가능하게 만든다.
- **생성 중 화면이 원칙 I의 우회로가 되는 위험을 찾아 닫았다.** 초판에 없던 축이다 — 스트리밍은 판정을 통과하지 않은 글을 화면에 올리므로, 실패 경로를 막아도 화면으로 샌다(FR-028b, SC-008a).
- **거부 사유가 원칙 III의 누출 경로가 되는 위험을 찾아 닫았다.** 「되뱉었다」·「언어가 다르다」는 캐릭터 뒤의 모델을 드러내는 말이다(FR-017e).

### 구현 뒤의 상태 (2026-08-17)

- **`npm test` 30 suites / 507 tests 통과**, `npm run lint` 통과(헌법 검사 위반 0건).
- **✅ `npm run test:device` PASSED** — 흐름 3개. 온디바이스가 검증됐다.
- **✅ 일기가 실기기에서 나왔다** (SM-G986N, `imaginative`, 약 30초). SC-001 달성.
- **❌ SC-002a는 실패했다** — 생성된 글이 기록에 없는 것을 단언했다("날씨가 정말 좋았다",
  "친구와 산책", "커피를 마시며"). **화자는 휴대폰이었으므로 SC-002는 통과다.**
  고칠 자리는 프롬프트이며 판정 갈래를 늘리지 않는다(원칙 IV).
- **⚠️ research §4의 판단이 뒤집혔다** — 평문 프롬프트로는 모델이 **빈 글만** 냈다.
  채팅 템플릿(`messages` + `jinja`)이 필요했다. 그 과정에서 테스트 2개가 깨졌고, **깨진
  것이 옳았다**(FR-005를 지키고 있었다).
- **구현 중 계약이 하나 바뀌었다**: `instructionLines()`가 `request`를 받는다
  (contracts/prompt.md에 기록).
- **003에 `modelFilePath()`를 더했다** — `initLlama`가 경로를 요구하는데 `ModelFilePort`는
  일부러 경로를 안 내준다. 005가 디렉터리 규칙을 다시 만들면 경로 지식이 두 곳에 생기므로
  이미 아는 003이 내주게 했다.

### 남은 위험

- **FR-028의 「쓰고 있다」 표시가 수치로 자라기 쉽다.** 사용자가 오래 기다리므로 「얼마나 남았나」를 넣고 싶어지는 압력이 실제로 있고, 그것이 원칙 IV의 지표다. FR-028a와 SC-008이 막지만, 압력이 지속되는 자리라는 것을 plan 단계에서 기억해야 한다.
- **FR-021b(앱이 앞에 있을 때만)와 온디바이스 추론의 느림이 정면으로 부딪친다.** 실기기에서 생성이 몇 분 걸리면 이 결정이 사용성 문제로 돌아올 수 있다. 결정을 바꾸는 것은 백그라운드 실행이라는 축을 여는 일이므로, **먼저 실기기에서 실제 소요를 보는 것**이 순서다(SC-001). **아직 재지 못했다** — quickstart D5.
- **🔴 생성된 일기가 원칙 II를 완전히 지키지 못한다 (SC-002a).** 이것이 지금 가장 큰 남은
  일이다. 프롬프트가 "기록에 없는 것을 단언하지 마라"를 담고 있는데도 모델이 날씨·친구·
  커피를 지어냈다. **1.5B 모델의 지시 준수 한계일 수 있고 프롬프트 표현의 문제일 수도
  있다** — 다른 캐릭터(2.1B·2.4B)로도 봐야 판단할 수 있다.
- **🔴 끊김(FR-021b)이 실기기에서 미확인이다.** 생성이 30초라 홈에 다녀오는 사이 끝난다.
  `n_predict`를 크게 올려 길게 만든 뒤 다시 보는 것이 방법이다.
- **~~프롬프트 평문 방식의 대가~~ → 해소됐다.** 대가가 「지시 준수 하락」이 아니라
  **「아무것도 안 나옴」**이었고, 채팅 템플릿으로 바꿔 해결했다.
- **~~`n_ctx` 2048~~ → 205토큰 프롬프트에는 충분함이 확인됐다.** 사진이 아주 많은 하루는
  여전히 미확인.
