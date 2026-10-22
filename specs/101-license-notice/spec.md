# Feature Specification: 모델·오픈소스 라이선스 고지

**Feature Branch**: `101-license-notice`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "docs/superpowers/specs/2026-10-22-license-notice-design.md 설계문서를 입력으로, 배포물에 들어가는 모델과 네이티브 라이브러리의 라이선스 고지를 앱 밖 페이지에 두고 설정 「정보」에서 여는 기능."

## 근거와 원본

- **설계**: `docs/superpowers/specs/2026-10-22-license-notice-design.md`(D6~D8은 소유자 확정, 2026-10-22).
- **로드맵 과제**: 「모델·오픈소스 라이선스 고지」.
- **문제**: LFM2.5-VL(사진 모델, `lfm1.0`)은 배포할 때 라이선스 사본·저작권 고지를 남기라고 하고, Kanana 1.5(Apache-2.0)·llama.cpp·llama.rn(MIT)도 저작권·라이선스 고지를 요구한다. 지금 이 고지는 어디에도 없다. 한편 헌법 원칙 III은 모델 식별자를 사용자 화면에 노출하지 않게 한다.
- **결정**: 고지는 앱 밖 페이지에 둔다(D6). 앱 화면에는 모델 이름이 나오지 않아 **헌법을 고치지 않는다**. 앱의 진입점은 설정 「정보」의 새 행 하나다(D7). 범위는 모델과 네이티브 라이브러리다(D8). 083 「서체 라이선스」(앱 안 화면)는 선례이지만 이 과제는 따르지 않는다 — 모델 이름이 앱 화면에 나오기 때문이다.
- **범위 밖**: JS/Expo 의존성의 고지, 헌법 개정, 개인정보 방침·지원 페이지의 본문 개정(099가 바꾼 「보존과 삭제」·「앱을 지우면」 문장은 그대로 둔다), 설정의 기존 행·문구, 홈 화면 문구, 제목 구간·동작 줄이기 코드(병렬 실측 세션 몫).

## 용어

- **고지 페이지**: 정적 사이트 `site/licenses/index.html`. 배포는 기존 Pages 워크플로(086)가 한다.
- **고지 항목**: 이름·저작권자·라이선스 이름·원문 링크·라이선스 전문 한 묶음. 항목은 넷이다 — Kanana 1.5, LFM2.5-VL(본체·mmproj 파일 둘이 한 항목), llama.cpp/ggml, llama.rn.
- **소유자 확인 항목(H1~H4)**: 법적 해석이 걸려 에이전트가 확정하지 않는 부분. 스펙의 「소유자 확인 항목」 절에 둔다.
- **모델 식별자**: 헌법 원칙 III이 앱 화면에 노출을 금하는 모델 이름·파라미터 수·양자화 방식 따위.

## Clarifications

### Session 2026-10-22

- Q: 고지 페이지의 안내 글은 한국어, 라이선스 전문은 영어 원문 그대로로 둘까? → A: 그렇다(A). 안내 글(제목·항목 설명·출처 문장)은 한국어, 전문은 원문 그대로이고 번역은 싣지 않는다.
- Q: 소유자가 H1~H4를 확인하기 전에도 구현을 먼저 할까? → A: 그렇다(A). 구현은 H1~H4와 무관하게 진행하고, 미해결은 최종 보고에 올린다. 머지·릴리스 전에 소유자가 확인한다.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 사용자가 고지 페이지에서 모델·오픈소스 라이선스를 읽는다 (Priority: P1)

설정 「정보」에서 「오픈소스 라이선스」 행을 누르면 기기 브라우저가 고지 페이지를 연다. 페이지에서 앱이 쓰는 모델과 네이티브 라이브러리 각각의 이름·저작권자·라이선스와 그 전문을 읽을 수 있다.

**Why this priority**: 라이선스가 요구하는 고지를 실제로 내보내는 일이 이 과제의 목적이다.

**Independent Test**: 사이트 HTML을 읽는 계약 테스트(항목 넷·원문 링크·전문)와 설정 행의 주소 단언.

**Acceptance Scenarios**:

1. **Given** 설정 「정보」, **When** 「오픈소스 라이선스」 행을 누른다, **Then** 기기 브라우저가 고지 페이지 주소를 연다. 열지 못하면 086 방침·지원 행처럼 그 행 아래에 실패 한 줄과 주소가 보인다.
2. **Given** 고지 페이지, **Then** 항목 넷(Kanana 1.5·LFM2.5-VL·llama.cpp/ggml·llama.rn) 각각에 이름, 저작권자, 라이선스 이름, 원문 링크, 라이선스 전문이 있다.
3. **Given** 고지 페이지의 라이선스 전문, **Then** 각 전문은 원문 그대로이며(글자 바꿈 외 편집 없음) 출처 주소와 확인일이 페이지에 적혀 있다.
4. **Given** LFM 항목, **Then** LFM Open License v1.0 전문이 포함되고, 연 매출 기준 상업적 이용 조건이 있다는 사실을 가리는 요약이 없다(전문이 그대로 있다).

---

### User Story 2 - 앱 화면은 모델 식별자를 노출하지 않는다 (Priority: P1)

새 행과 그 문구는 모델 이름을 말하지 않는다. 사용자는 앱 안에서 모델 이름을 보지 않고, 고지가 필요한 사람만 앱 밖 페이지에서 본다.

**Why this priority**: 원칙 III을 조용히 어기지 않는 것이 헌법상 이 과제의 전제다.

**Independent Test**: 새 카탈로그 영역의 모든 문구를 모델 식별자 목록과 대조하는 테스트, 위반 주입.

**Acceptance Scenarios**:

1. **Given** 새 카탈로그 영역의 문구, **Then** 모델 식별자(Kanana·LFM·Liquid·파라미터 수·양자화 표기)가 한 글자도 없다.
2. **Given** `src/ui/`와 카탈로그, **Then** 헌법 검사(`UI_TOUCHES_MODEL` 등)가 그대로 통과하며 예외 목록이 늘지 않는다.
3. **Given** 새 문구에 모델 이름을 일부러 넣는 위반 주입, **Then** 테스트가 실패한다.

---

### User Story 3 - 소유자가 법적 해석 항목을 확인한다 (Priority: P1)

에이전트가 확정하지 못하는 H1~H4를 소유자가 원문과 함께 읽고 결정할 수 있도록 스펙과 최종 보고에 표시한다.

**Why this priority**: 2차 자료로 쓴 고지는 의무를 못 채울 수 있다. 사람이 읽어야 하는 부분을 숨기면 안 된다.

**Independent Test**: 스펙에 H1~H4와 원문 출처·확인일이 있는지, 고지 페이지의 전문이 원문 해시와 맞는지 계약 테스트.

**Acceptance Scenarios**:

1. **Given** 이 스펙, **Then** H1~H4가 각각 원문 인용(또는 원문 주소)과 함께 「소유자 확인 필요」로 올라 있다.
2. **Given** 고지 페이지의 전문 블록, **Then** 각 블록이 스펙에 적힌 원문 출처의 내용과 같다는 것을 해시 대조로 확인한다.
3. **Given** 소유자가 H1~H4를 아직 읽지 않았다, **Then** 최종 보고가 이를 미해결로 남기며 「완료」로 단정하지 않는다.

### Edge Cases

- 오프라인이거나 브라우저를 못 열면 행 아래에 실패 한 줄과 주소가 보인다(086과 같은 방식).
- 사이트는 앱 릴리스와 따로 배포된다. 새 행이 여는 주소는 앱을 올리기 전에 이미 배포돼 있어야 한다(릴리스 순서의 전제).
- 글꼴 2.0배에서 새 행 이름이 잘리거나 가려지지 않는다.
- mmproj는 LFM 본체와 같은 라이선스라 항목을 따로 만들지 않는다. 항목 수가 파일 수와 다르다는 사실이 페이지에 적혀 있다.
- Kanana의 GGUF는 DevQuasar의 재배포본이다. 원 저작권자와 재배포자가 모두 적힌다.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 고지 페이지 `site/licenses/index.html`이 있고 항목 넷 각각에 이름·저작권자·라이선스 이름·원문 링크·라이선스 전문을 둔다.
- **FR-002**: 라이선스 전문은 원문(영어) 그대로이며 번역을 싣지 않는다(안내 글만 한국어). 스펙의 「원문 출처」 절에 주소·확인일·해시가 있으며 페이지가 같은 출처를 밝힌다.
- **FR-003**: 설정 「정보」 묶음에 새 행 「오픈소스 라이선스」 하나를 더한다. 누르면 기기 브라우저가 고지 페이지를 연다. 실패하면 행 아래에 실패 한 줄과 주소를 보인다(086 방식).
- **FR-004**: 고지 페이지 주소는 `src/app/policy-links.ts`에 한 줄로 정의되고, 앱·사이트·테스트가 끝의 `/`까지 같은 문자열을 쓴다.
- **FR-005**: 새 화면 문구는 새 카탈로그 영역 파일(`ko/license-links.ts`)에만 둔다. 문구 골든은 다시 쓰지 않고 `ADDED_AFTER_GOLDEN`에만 덧붙인다(다른 세션의 항목과 충돌하면 양쪽을 모두 남긴다).
- **FR-006**: 앱 화면 문구(새 영역)에는 모델 식별자가 없다. 이를 막는 테스트가 있고 위반 주입으로 검증한다.
- **FR-007**: 헌법은 고치지 않는다. 헌법 검사 예외 목록(`SCREEN_TEXT_ALLOWLIST` 등)에 항목을 더하지 않는다.
- **FR-008**: 고지 페이지는 개인정보 방침·지원 페이지와 같은 디자인 토큰·서체 자원을 쓴다(089). 새 외부 자원이 없다(`__tests__/privacy/`의 외부 요청 잠금이 통과한다).
- **FR-009**: 기존 설정 행·문구, 홈 화면 문구, 099가 바꾼 방침·지원 문장, 실측 세션 코드는 바뀌지 않는다.
- **FR-010**: 스펙에 소유자 확인 항목 H1~H4를 원문 인용과 함께 올리고, 최종 보고가 확인 상태를 밝힌다. 구현은 H1~H4의 확인을 기다리지 않으며, 미해결이면 머지·릴리스 전에 소유자가 확인해야 한다고 보고한다.
- **FR-011**: llama.cpp 항목은 `llama.rn`에 함께 들어 있는 서드파티 코드(nlohmann/json·anyascii·stb_image·miniaudio·OpenCL-Headers) 하위 블록을 가진다. 각 블록은 이름·저작권자·라이선스 이름과 번들 소스(또는 상류)에서 옮긴 전문을 둔다. OpenCL-Headers는 소스에 Apache-2.0 헤더 고지만 있으므로 그 고지 원문과 Apache 2.0 원문 링크를 두고, 본문은 같은 페이지의 Kanana 항목(Apache 2.0 전문)을 가리킨다. 항목은 여전히 넷이다.

### Key Entities

- **고지 항목**: 이름, 저작권자, 라이선스 이름, 원문 링크, 전문, 확인일. 항목은 넷이다.
- **고지 주소**: 앱과 사이트가 같은 문자열로 공유하는 한 줄.

## 원문 출처 (확인일 2026-10-22)

원문은 `curl`로 받아 `specs/101-license-notice/sources/`에 그대로 두었고 SHA-256을 아래에 적는다. 고지 페이지의 전문은 이 파일과 글자까지 같아야 한다(계약 테스트). 요약(WebFetch)이 아니라 이 파일이 정본이다.

| 항목 | 원문 주소 | 파일 | SHA-256 |
|------|-----------|------|---------|
| LFM2.5-VL | `https://huggingface.co/LiquidAI/LFM2.5-VL-450M/raw/main/LICENSE` | `lfm-LICENSE.txt` | `4d28ca14…c068c` (전체는 research R1) |
| Kanana 1.5 | `https://huggingface.co/kakaocorp/kanana-1.5-2.1b-instruct-2505/raw/main/LICENSE` | `kanana-LICENSE.txt` | `d1ee8126…df57` |
| llama.cpp/ggml | 앱이 싣는 `llama.rn@0.12.9`의 `cpp/LICENSE`(MIT, "Copyright (c) 2023-2024 The ggml authors") | `llama-cpp-LICENSE.txt` | `e562a2dd…757d` |
| llama.rn | `https://raw.githubusercontent.com/mybigday/llama.rn/main/LICENSE`(= 설치본 `LICENSE`) | `llama-rn-LICENSE.txt` | `b22eff2c…2883` |

- llama.cpp 상류 `master`의 같은 파일은 연도만 "2023-2026"이다(다른 글자 없음). **앱이 실제로 싣는 것은 `llama.rn` 번들 쪽이므로 그 글자를 정본으로 삼는다.**
- Kanana GGUF 재배포본(DevQuasar)은 HF 메타데이터에 라이선스 표기와 LICENSE 파일이 없다 — 원 저장소(`kakaocorp/…`)의 Apache-2.0을 정본으로 하고, 재배포자 이름은 출처 줄에만 적는다(H3).
- LFM 사진 모델 GGUF 저장소(`LiquidAI/LFM2.5-VL-450M-GGUF`)의 라이선스 표기는 `other`/`lfm1.0`이며 LICENSE 파일이 있다. 본체 저장소의 LICENSE와 같은 내용인지는 구현 단계에서 해시로 대조한다.

## 소유자 확인 항목

- **H1**: LFM Open License v1.0 5절 — 연 매출 1,000만 달러 이상 법인의 상업적 이용 조건. 이 앱의 배포가 해당하는지. **소유자 확인 필요.**
  원문(`sources/lfm-LICENSE.txt`): 1절 「"Threshold" shall mean annual revenue of 10 million United States dollars ($10,000,000) or more.」 · 5(a) 「The rights granted under this License for Commercial Use are conditioned upon You or Your Legal Entity not exceeding the Threshold.」 · 5(b) 「Any Commercial Use of the Work or a Derivative Work by a Legal Entity that exceeds the Threshold is not licensed under this Agreement.」 · 1절 「"Commercial Use" shall mean any use of the Work for direct or indirect commercial advantage or monetary compensation.」
- **H2** 원문 인용: 4절 도입 「You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, … provided that You meet the following conditions」 · 4(a) 「You must give any other recipients of the Work or Derivative Works a copy of this License」 · 4(d) 「If the Work includes a "NOTICE" text file … Derivative Works that You distribute must include a readable copy of the attribution notices」. 이 페이지는 전문을 싣는 것으로 4(a)를 이행하려는 것이다.
- **H2**: LFM 4절 — 사본 제공(a)·고지문 유지(d). 앱이 모델 파일을 싣지 않고 사용자 기기가 직접 내려받는 방식에서 "배포"에 해당하는지, 고지를 어디에 어떻게 실어야 하는지. **소유자 확인 필요.**
- **H3** 확인 사실: 원 저장소 `LICENSE`는 Apache 2.0 본문이며 저작권자 줄이 없고, 4절(Redistribution)은 「You must give any other recipients of the Work or Derivative Works a copy of this License」 등을 요구한다. 모델 카드는 `license: apache-2.0`뿐이다. DevQuasar 재배포본 카드에도 `license: apache-2.0`과 「Quantized version of: kakaocorp/kanana-1.5-2.1b-instruct-2505」 한 줄만 있다(research R5). 페이지는 저작권자 줄에 「원문에 저작권자 표기가 없음」이라 적고 Kakao Corp.를 단정하지 않는다.
- **H3**: Kanana — Apache-2.0 본문·저작권 표기를 Kakao 원 저장소에서 인용, DevQuasar 재배포본 표기 확인. **소유자 확인 필요.**
- **H4**: `llama.rn@0.12.9`에는 llama.cpp 외에 다른 코드가 함께 들어 있다 — nlohmann/json(MIT, © 2013-2025 Niels Lohmann), anyascii(ISC, © 2020-2023 Hunter WB), stb_image(MIT 또는 공공 영역, © 2017 Sean Barrett), miniaudio(공공 영역 또는 MIT-0), OpenCL-Headers(Apache-2.0, © Khronos Group). 이들의 고지를 llama.cpp 항목 안의 하위 블록으로 싣는 것(FR-011)이 충분한지. **소유자 확인 필요.**

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 고지 페이지에 항목 넷이 100% 있고, 각 항목에 이름·저작권자·라이선스 이름·원문 링크·전문이 있다(계약 테스트).
- **SC-002**: 설정 화면을 연 뒤 「정보」의 새 행을 한 번 누르면 기기 브라우저에서 고지 페이지가 열린다(실기기 1회).
- **SC-003**: 앱 화면의 모델 식별자는 0건이고, 새 문구에 모델 이름을 되돌려 넣는 위반 주입을 테스트가 잡는다.
- **SC-004**: 헌법 파일과 헌법 검사 예외 목록의 diff가 0줄이다.
- **SC-005**: `npm test`와 `npm run lint`가 통과하고, `__tests__/privacy/`의 사이트 잠금이 그대로 통과한다.
- **SC-006**: H1~H4가 최종 보고에서 확인 상태와 함께 보고된다.

## Assumptions

- D6~D8은 소유자 확정 사항이며 이 과제에서 다시 고르지 않는다.
- 새 행은 「정보」 묶음의 「서체 라이선스」 다음에 둔다(플랜에서 확정; 명시적 위치 지시가 없었다).
- 사이트 배포(GitHub Pages)는 앱과 따로 나가고, 새 행이 열 주소는 앱을 올리기 전에 배포돼 있다.
- 실기기 확인은 SM-S901N dev 빌드 또는 이 세션과 겹치지 않는 시점의 기기에서 한 번 한다(병렬 실측 세션이 기기를 쓰므로 소유자에게 먼저 알린다).
- 병렬 세션이 `ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`을 같이 덧붙인다. 충돌 시 양쪽 항목을 모두 남긴다.
- 모델 이름은 앱 밖 페이지인 고지 페이지에는 나와도 된다(원칙 III은 사용자 화면에 한정).
