# Specification Quality Checklist: 사진의 내용을 보고 일기의 재료로 준다

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-22
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

### 구현 세부를 담지 않은 방식

사용자가 준 설명에는 `VLM`·`mmproj`·`VisionSetting`이 있었으나 **요구사항(FR)에는
하나도 넣지 않았다.** 대신:

| 구현 용어 | 스펙이 쓴 말 |
| --- | --- |
| VLM / 시각 인코더 | 「사진의 내용을 읽는다」 |
| mmproj / VLM 모델 파일 | 「사진을 보는 모델」 — 캐릭터와 무관한 하나(FR-025) |
| `VisionSetting` | 「사진 설정」 — 헌법이 쓴 「보지 않음/빠르게 봄/자세히 봄」 |
| `n_ctx` / 컨텍스트 | Edge Cases에만, 「컨텍스트가 모자란다」로 |

`VLM`은 「왜 이것이 필요한가」와 Key Entities의 타입 이름에만 남아 있으며, **왜 이
기능이 필요한지를 설명하는 자리**다. 005의 requirements.md가 `initMultimodal`을 같은
방식으로 다룬 선례를 따랐다.

### /speckit-clarify가 답한 것 (2026-08-22, 5문 중 4문)

| 물음 | 답 | 반영 |
| --- | --- | --- |
| 「빠르게/자세히」의 차이 | **한 장을 보는 깊이** — 보는 수는 같다 | FR-019·019a, SC-015 |
| VLM과 캐릭터의 관계 | **두 단계** — VLM은 캐릭터와 무관한 하나 | FR-025~031a, US5 전면 교체 |
| 장별 요약인가 일괄인가 | **한 장씩** | FR-001a·005a, SC-006a |
| 읽는 상한 | **5장, 하루에 걸쳐 균일하게** | FR-007·007a·007b, SC-007a |
| 요약의 불확실성 전달 | **전달하지 않는다** | FR-011 교체, Edge Case 정정 |
| 사진 보는 모델 | **LFM2.5-VL 450M 주력 / SmolVLM 500M 후보** | FR-030a, Assumptions |

### ★ 사용자 정정으로 스펙의 구조가 바뀌었다

초안은 사용자 설명의 「캐릭터 모델에 mmproj를 붙인다」를 그대로 받아 **003의 로스터
계약을 여는 기능**으로 썼다. 사용자가 바로잡았다:

```
사진 → [VLM 모델] → 텍스트 요약 → [캐릭터 모델] → 일기
```

**캐릭터 모델은 사진을 보지 않고 텍스트만 받는다.** 그래서:

- 003의 로스터를 **열 필요가 없다** — Out of Scope로 옮겼다
- US5가 「캐릭터를 준비하면 함께 받는다」에서 **「하나를 한 번 받는다」**로 바뀌었다
- 「어느 캐릭터가 사진을 볼 수 있는가」라는 **물음 자체가 사라졌다**(FR-024 교체)
- FR-013(캐릭터와 무관하게 같은 방식)이 **구조로 보장된다** — SC-001a가 이를 검증한다

이것이 원칙 III에 더 잘 맞는다. 사진 요약이 캐릭터를 가리지 않는다는 것이 규율이
아니라 구조가 됐다.

### ★ 「균일하게 고른다」는 004와 의도적으로 다르다

004의 `collect.ts`는 `usable.slice(0, limit)`으로 **이른 시각부터** 자른다. 이 기능은
그러면 안 된다 — 아침 사진 다섯 장만 보면 휴대폰이 아침만 본 채 하루를 쓴다.
**004는 「그날 사진이 몇 장인가」를 세고 이 기능은 「하루가 어떠했는가」를 그린다**
(FR-007a). 사용자가 상한을 답하며 함께 짚은 것이며, 초안의 선택지에는 없었다.

### ★ 불확실성을 언어로 전달하지 않기로 했다

초안은 「해석된 것임이 드러나는 말로 적는다」(FR-011)를 요구했다. 사용자가 **전달할
필요가 없다**고 답했고, 그 판단이 005의 실측과 맞는다: **압력이 지어내기를 낳는다.**
요약에 「틀릴 수 있다」를 붙이면 모델이 전부를 얼버무리게 된다.

**휴대폰은 그 사진을 실제로 보았다.** 날씨나 커피잔처럼 관측한 적 없는 것과 달리
사진은 진짜 입력이며, 요약은 004의 장수·좌표와 **같은 자격의 관측**이다.

대신 방어가 **값 쪽에 남는다**: 몇 장을 보았는가(FR-006), 하루의 어느 때인가
(FR-007b), 읽지 못한 것과 없는 것의 구분(FR-005).

### ★ 옆 저장소의 실측이 두 자리를 짐작에서 사실로 바꿨다

`my-ollama`가 2026-08-10에 **같은 기기(SM-G986N)**에서 VLM 셋을 쟀고, 그 결과가
이 스펙의 두 곳을 고쳤다:

| 자리 | clarify 직후 | 실측 확인 뒤 |
| --- | --- | --- |
| 어느 모델인가 | 「계획의 몫」 | **LFM2.5-VL 450M** (FR-030a) |
| 5장이 몇 초인가 | 「짐작이다」 | **약 10초** — 적재 1.0초 + 장당 1.9초 (FR-007) |

**003이 캐릭터 로스터의 URL을 그 저장소에서 옮겨 온 것과 같은 선례다.** 옮겨 오는
것은 **「무엇을 쓰는가」와 「몇 초인가」라는 사실**이지, 두 VLM을 견주는 표나 캡션
품질 점수가 아니다 — 그것을 옮기면 원칙 IV가 금지한 측정 장치가 이 저장소에 생긴다.

**후보(SmolVLM)는 대체 경로가 아니다.** 003 FR-035가 「미리 넣어 둔 모델이나 대체
모델로 채우는 경로를 만들지 않는다」를 못 박았으므로, 후보는 **사람이 바꿔 넣는
기록**으로만 남는다(Out of Scope에 명시).

### 아직 정하지 않은 것 — `/speckit-plan`의 자리

- **「깊이」를 무엇으로 조절하는가** — FR-019가 결과의 차이로만 쓰였다.
- **md5 지문** — 첫 내려받기에서 **채록한다**(FR-031, 원칙 V). 미리 적지 않는다.
- **5장 10초가 이 저장소에서도 같은가** — 옆 저장소의 값이며 **여기서 다시 재지
  않았다.** SC-016의 실기기 확인이 이것도 함께 답한다.

### 원칙 V가 걸린 자리

SC-016이 **실기기 확인을 성공 기준에 직접 올렸다.** 이 저장소에서 반복된 실패
(006의 `GenerationProbe`, 007의 끊긴 `stop` 배선, 008의 버려진 반환값, 009의 `day:`
한 줄)가 전부 **기기 없는 검증이 초록불인 채로 조용히 실패한 것**이었다.

시각 처리는 그 위험이 더 크다 — 사진을 안 보고도 일기는 나오기 때문이다.
**「일기가 나왔다」가 「사진을 봤다」의 증거가 아니다.** 그래서 SC-001이 「보지 않음」과
견주도록 쓰였다.

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
