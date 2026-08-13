# Implementation Plan: 일기 파이프라인의 축 사이 계약

**Branch**: `002-diary-pipeline-contracts` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-diary-pipeline-contracts/spec.md`

## Summary

001이 만든 바닥 위에 **일기가 만들어지는 길의 경계면**을 놓는다. 하루치 신호 → 생성 요청 →
일기 → 저장으로 이어지는 흐름을 정의하되, 각 축의 내부는 최소 구현만 둔다.

기술적 접근의 핵심은 **세 가지를 값으로 표현하는 것**이다.

1. **"없음"과 "알 수 없음"을 타입으로 가른다**(FR-002). 옵셔널 필드로 두면 둘이 뭉개진다.
   `Known<T> | None | Unknown` 형태의 합 타입이라야 "사진 0장"과 "사진에 접근 못 함"이
   구분된다. 이것이 이 기능에서 가장 중요한 설계 결정이다.
2. **"아직 없음"을 정직한 결과로 만든다**(FR-015, FR-016). 온디바이스 생성은 예외를 던지거나
   가짜 일기를 반환하지 않고 `not-implemented`를 값으로 돌려준다.
3. **파이프라인이 실행 시점을 모른다**(FR-018a). 날짜를 인자로 받을 뿐 "지금이 언제인지"를
   스스로 판단하지 않으므로, 나중에 백그라운드 실행이 붙어도 계약이 그대로다.

001의 `InferenceBackend`에 `generate()`를 더한다. 추론 위치 선택은 `select.ts`를 그대로 쓰고
새로 만들지 않는다(FR-017).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict), React 19.2.3 — 001 기준선 그대로

**Primary Dependencies**: Expo SDK 57, React Native 0.86.2, `llama.rn ^0.12.8`,
`expo-file-system ~57.0.2` (이미 설치됨, 저장에 쓴다)

**Storage**: `expo-file-system`의 `File`/`Paths` API로 날짜별 JSON 파일. 선택 근거는
[research.md](research.md) §3에 있다.

**Testing**: `jest-expo` (기기 불필요 갈래). **이 기능은 실기기 테스트가 필요 없다** —
실제 추론도 실제 수집도 하지 않으므로 전부 기기 없이 검증된다(SC-003).

**Target Platform**: Android 실기기(arm64-v8a). 다만 이 기능의 검증은 기기 없이 끝난다.

**Performance Goals**: N/A — 이 기능은 추론을 수행하지 않는다. 생성 소요 시간 목표는 실제
추론이 붙는 다음 기능에서 정한다.

**Constraints**:
- 가짜 일기·미리 만든 일기 경로 금지 (헌법 원칙 I, FR-016)
- 요청·일기에 모델 식별자 금지 (원칙 III, FR-008/FR-013)
- 수집 못 한 신호를 기본값으로 채우기 금지 (원칙 V, FR-003)
- 출력 점수화·비교 코드 금지 (원칙 IV, FR-027)
- 하루 경계 04:00은 한 곳에서만 정의 (FR-021a)

**Scale/Scope**: 엔티티 6개, 파이프라인 단계 3개, 저장 어댑터 1개. 엔드유저 기능 0개.

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 후 재확인.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | ✅ 통과 | 실제 추론을 하지 않지만 **가짜로 대신하지도 않는다**. 온디바이스 구현은 `not-implemented`를 값으로 반환한다(FR-015). 이것은 원칙 I이 금지한 "미리 만들어 둔 응답"이 아니라 그 반대 — 없는 것을 없다고 말하는 것이다. 추론 위치 선택은 001의 지점을 재사용한다(FR-017). |
| **II. 화자는 휴대폰이다** | ⚠️ 간접 해당 | 프롬프트를 쓰지 않으므로 화자 규칙을 직접 강제하지 않는다. 다만 `DiaryRequest`가 캐릭터를, `DiaryEntry`가 근거 신호를 담아 **다음 기능이 화자를 잃지 않을 자리**를 만든다. 신호가 없는 하루도 일기가 되므로(FR-005b), 없는 일을 지어내지 않는 것은 프롬프트 기능의 몫임을 계약에 적는다. |
| **III. 모델은 캐릭터다** | ✅ 통과 | `Character`는 사용자가 고른 성격이며 모델 식별자와 잇지 않는다. 요청·일기 어디에도 모델 식별자·파라미터 수·양자화 방식을 담지 않는다(FR-008, FR-013). 캐릭터→모델 매핑은 이 기능에서 만들지 않는다. |
| **IV. 측정 장치를 들이지 않는다** | ✅ 통과 | 출력을 점수화·비교하는 코드를 만들지 않는다(FR-027). 진단·통계 필드를 `DiaryEntry`에 넣지 않는다. 001의 검사 스크립트를 확장하지 않는다. |
| **V. 관측과 추측을 구분한다** | ✅ 통과 | **이 기능의 중심 설계가 원칙 V다.** "없음"과 "알 수 없음"을 타입으로 가르고(FR-002), 수집 못 한 값을 기본값으로 채우지 않는다(FR-003). 걸음 수를 0으로 두면 "걷지 않았다"는 거짓이 된다. |
| **개발 방식 — 계약·테스트 우선** | ✅ 통과 | 계약을 `contracts/`에 먼저 적고 검증 표의 각 행을 테스트로 옮긴다. 전부 기기 없이 돈다. |
| **개발 방식 — 한 축 파고들기 금지** | ✅ 통과 | 이 기능 자체가 경계면 우선 접근이다. 「범위 밖」에 실제 수집·모델 파일·프롬프트·화면을 명시했고, 이 계획도 그 경계를 넘지 않는다. |

**게이트 결과: 통과.** 정당화가 필요한 위반 없음 → Complexity Tracking 비움.

원칙 II는 "간접 해당"으로 둔다 — 이 기능이 화자 규칙을 강제할 수단(프롬프트)을 갖지 않기
때문이며, 회피가 아니라 범위의 문제다. 다음 기능이 반드시 다뤄야 할 항목으로 계약에 남긴다.

## Project Structure

### Documentation (this feature)

```text
specs/002-diary-pipeline-contracts/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/           # Phase 1 산출물
│   ├── signals.md       # 하루치 신호와 "알 수 없음" 표현
│   ├── diary.md         # 생성 요청·일기·추론 확장
│   ├── pipeline.md      # 단계 연결과 실패 표현
│   └── storage.md       # 저장·조회·덮어쓰기
├── checklists/
│   └── requirements.md  # 명세 품질 점검표 (완료)
└── tasks.md             # /speckit-tasks 산출물 (여기서 만들지 않음)
```

### Source Code (repository root)

```text
src/
├── config/                    # 001 그대로. 아래 하나만 추가
│   └── day-boundary.ts        # 04:00 경계 — 여기서만 정의한다 (FR-021a)
├── inference/                 # 001의 경계에 생성 계약을 더한다
│   ├── types.ts               # InferenceBackend에 generate() 추가 (FR-014)
│   ├── on-device.ts           # generate()는 not-implemented 반환 (FR-015)
│   ├── desktop-server.ts      # generate()는 not-implemented 반환
│   └── select.ts              # 001 그대로. 손대지 않는다 (FR-017)
├── signals/                   # 새 자리 — 하루치 신호의 모양
│   ├── types.ts               # DaySignals, SignalValue<T> (FR-001~004)
│   └── fake.ts                # 테스트·개발용 가짜 신호 (실제 수집 아님)
├── diary/                     # 새 자리 — 일기의 모양과 파이프라인
│   ├── types.ts               # DiaryRequest, DiaryEntry, Character, VisionSetting
│   ├── request.ts             # 신호+캐릭터+시각설정 → 요청 (FR-006, FR-007)
│   ├── pipeline.ts            # 단계 연결과 실패 표현 (FR-018~020)
│   └── store.ts               # 저장·조회·덮어쓰기 (FR-022~024)
└── diagnostics/               # 001 그대로

__tests__/
├── config/day-boundary.test.ts
├── signals/
├── diary/
└── inference/                 # generate() 계약 테스트 추가
```

**Structure Decision**:

`src/signals/`와 `src/diary/`는 001의 AGENTS.md가 **"아직 없고 앞으로 생길 자리"**로 예약해
둔 곳이다. 예약대로 만든다.

배치의 핵심 세 가지:

- **`src/config/day-boundary.ts`가 04:00의 유일한 정의처다**(FR-021a). 신호 수집(다음 기능)과
  일기 생성이 서로 다른 하루를 보지 않으려면 한 곳이어야 한다. 순수 함수이므로 기기 없이
  테스트된다.
- **`src/signals/`는 모양만 두고 수집은 두지 않는다.** 실제 수집(권한·사진·GPS)은 다음
  기능이며, 여기 들어오면 「범위 밖」을 넘는 것이다. `fake.ts`는 테스트용이지 제품 경로가
  아니다 — 이것이 헌법 원칙 I의 "미리 만들어 둔 응답"으로 오해되지 않도록 계약에 명시한다.
- **`src/diary/pipeline.ts`가 진입점이지만 실행 시점을 모른다**(FR-018a). 날짜를 인자로
  받을 뿐, "지금 만들 때인가"는 부르는 쪽이 판단한다. 그래서 앱을 열 때 부르든 나중에
  백그라운드가 부르든 계약이 같다.

**001에서 손대지 않는 것**: `src/inference/select.ts`, `src/config/policy.ts`,
`src/config/environment.ts`. 특히 `policy.ts`는 헌법 원칙 I의 방어선이므로 이 기능에서
건드릴 이유가 없다.

## Constitution Check — Phase 1 설계 후 재확인

| 원칙 | 재판정 | 설계에서 확인된 것 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | ✅ 통과 | `GenerationFailure`의 어느 갈래에도 `text` 필드가 없도록 타입을 짰다. 플레이스홀더 문자열이 들어올 자리가 타입 수준에서 없다. quickstart B가 이것을 직접 확인한다. `select.ts`는 손대지 않는다. |
| **II. 화자는 휴대폰이다** | ⚠️ 간접 (자리를 만듦) | 설계 중 확인: 신호가 전부 비어도 요청이 만들어지므로(FR-005b), **없는 일을 지어낼 위험이 다음 기능으로 넘어간다.** 이것을 contracts/diary.md 「다음 기능에 넘기는 것」에 명시적으로 적었다. 회피가 아니라 인계다. |
| **III. 모델은 캐릭터다** | ✅ 통과 | 위험 지점을 하나 발견해 처리했다 — 캐릭터 식별자를 짓다 보면 모델 이름을 쓰고 싶어진다. `'quiet' \| 'narrative' \| ...`처럼 성질로만 두고, 이것이 최종 이름이 아님을 계약에 못 박았다(헌법 「로스터」: 이름은 사람이 짓는다). quickstart D가 grep으로 검증한다. |
| **IV. 측정 장치를 들이지 않는다** | ✅ 통과 (경계 명시함) | 위험 지점 발견: `DiaryEntry`에 "생성에 몇 초 걸렸는지"를 넣고 싶어진다. 무해해 보이지만 모델 비교의 시작점이다. contracts/diary.md에 금지를 적고 quickstart E가 grep으로 검증한다. |
| **V. 관측과 추측을 구분한다** | ✅ 통과 | **이 기능의 중심 설계다.** `SignalValue`가 `none`/`unknown`을 타입으로 가른다. 설계 중 추가로 막은 것: (1) `valueOr(signal, 0)` 같은 기본값 대체 함수 금지, (2) 직렬화가 `unknown`을 `null`로 뭉개지 않는지 왕복 테스트 — 후자는 놓치기 쉬운데 뭉개지면 원칙 V가 조용히 깨진다. |
| **개발 방식 — 계약·테스트 우선** | ✅ 통과 | 계약 4개가 검증 표를 포함해 먼저 작성됐다. 전부 기기 없이 돈다 — 001과 달리 실기기 갈래가 필요 없다. |
| **개발 방식 — 한 축 파고들기 금지** | ✅ 통과 | 어댑터를 `generate()` 계약까지로 끊었고, 구현은 `not-implemented`다. 신호는 모양만, 프롬프트는 없다. 각 계약이 「다음 기능에 넘기는 것」을 적어 경계를 눈에 보이게 했다. |

**게이트 결과: 통과.** Phase 0 판정과 같으며, 설계 과정에서 원칙 III·IV·V의 구체적 위험
지점을 발견해 계약과 quickstart 검사로 막았다.

### 설계에서 새로 드러난 사실

1. **직렬화가 원칙 V를 깰 수 있다.** `SignalValue`가 합 타입이므로 저장·복원 왕복에서
   `unknown`이 `null`로 뭉개지면 "모름"이 "없음"이 된다. contracts/storage.md의 불변식 2와
   quickstart C의 마지막 줄이 이것을 잡는다. 데이터 모델만 봐서는 안 보이는 위험이었다.
2. **`fake.ts`가 원칙 I로 자랄 수 있다.** 테스트용 가짜 신호가 제품 경로로 새면 "미리
   만들어 둔 응답"이 된다. contracts/signals.md에 제품 경로 금지를 명시했다.
3. **파이프라인이 `now`를 인자로 받아야 한다.** FR-018a(실행 시점을 모른다)의 귀결인데,
   부수적으로 03:59/04:00 경계 테스트를 가능하게 한다. 두 요구가 같은 설계로 만족된다.
4. **이 기능은 실기기가 필요 없다.** 001과 달리 전부 기기 없이 검증된다(SC-003). 다만
   저장 구현이 `expo-file-system` 57 API를 처음 쓰는 것이라, 다음 기능이 실기기를 쓸 때
   실제 동작을 확인해야 한다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비움.
