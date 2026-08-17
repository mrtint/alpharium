# Implementation Plan: 실제 일기 생성

**Branch**: `005-diary-generation` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-diary-generation/spec.md`

## Summary

**비어 있던 `generate()` 하나를 채운다.** 002가 `not-implemented`를 반환하도록 둔 그
자리에 실제 추론이 들어가고, 그 결과 파이프라인이 처음으로 `generation`을 지나 저장까지
도달한다.

기술적으로는 세 조각이다:

1. **프롬프트 구성** — `DaySignals`를 문자열로 옮긴다. 순수 함수, 기기 무관.
2. **판정** — 생성된 글이 일기가 될 수 있는지 본다. 순수 함수, 기기 무관.
3. **적재와 실행** — `llama.rn`으로 모델을 열고 돌리고 닫는다. **기기에 닿는 유일한 자리.**

1과 2가 순수하고 3만 기기를 아는 구조는 004(`collect.ts` 순수 / `expo-port.ts`가 기기)와
003(`readiness.ts` 순수 / `expo-port.ts`가 기기)이 쓴 것과 같다. 이 저장소에서 세 번째로
반복되는 형태이며, 기기 없이 SC-010을 달성하는 유일한 길이다.

**핵심 설계 판단**: `llama.rn`의 `completion()`은 `timings`·`tokens_predicted` 같은
**원칙 IV가 금지한 값을 공짜로 함께 준다**(research §1). 그래서 포트 구현이 그 결과에서
필요한 것만 꺼내고 나머지를 버리는 것이 이 기능의 첫 방어선이다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (기존 그대로)

**Primary Dependencies**: `llama.rn` 0.12.9 (설치본). **새 의존성을 더하지 않는다** —
`initLlama`·`completion`·`stopCompletion`·`release` 넷과 React Native의 `AppState`만 쓴다.

**Storage**: 기존 `src/diary/store.ts`(002). **변경 없다** — 하루 하나 덮어쓰기가 이미
그 모양이다(FR-020a).

**Testing**: `jest-expo` ~57.0.4 (기기 불필요) + Maestro (실기기). 기존 구조 그대로.

**Target Platform**: Android 13, arm64-v8a (SM-G986N). development build.

**Project Type**: mobile-app (Expo 57 / React Native 0.86)

**Performance Goals**: **없다.** 성능 목표를 세우면 그것을 재는 코드가 생기고 그것이
원칙 IV 위반이다. 생성이 느린 것은 온디바이스의 성질이지 고칠 대상이 아니다.

**Constraints**:
- 한 번에 모델 하나만 메모리에 (FR-008) — GB 단위 파일, 좁은 기기 메모리
- 앱이 앞에 있을 때만 생성 (FR-021b)
- 시간·길이 한도 필수 (FR-021·021a)
- **판정 갈래는 넷을 넘지 않는다** (FR-018b)

**Scale/Scope**: 캐릭터 5, 판정 갈래 4, 새 모듈 4개, 002~004 계약 변경 0건.

## Constitution Check

*GATE: Phase 0 앞에서 통과해야 하고 Phase 1 뒤에 다시 본다.*

### Phase 0 이전 — 통과

| 원칙 | 이 기능의 위험 | 계획이 세운 방어 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | 「그럴듯한 무언가」가 일기 자리에 들어감 | 판정을 어댑터 **안쪽**에 둔다(research §5) — 거부될 텍스트를 담은 `DiaryDraft`가 존재하는 순간이 없다. 토큰 콜백을 아예 넘기지 않아 스트리밍 경로가 코드에 없다(§1) |
| **II. 화자는 휴대폰** | 프롬프트가 화자 규칙을 잃음 | 프롬프트가 한 파일에만 있고(FR-013b), 화자 규칙이 그 파일의 상수다. 지킴 여부는 **사람이 읽어 확인**(SC-002) |
| **III. 모델은 캐릭터다** | 모델 정보가 `completion()` 결과·실패 문구로 샘 | 003의 `assetFor()`만 경로를 안다. 실패는 「할 수 있는 것」으로 옮긴다(FR-017e). `LlamaContext.model`·`systemInfo`를 밖으로 내보내지 않는다 |
| **IV. 측정 장치 금지** | **`NativeCompletionResult`가 `timings`·`tokens_*`를 공짜로 준다** | 포트가 필요한 것만 꺼내고 버린다. 판정 갈래를 넷으로 못 박고(FR-018b) 임계값을 금지(FR-016b-2). 판정 결과에 수를 담지 않는다(FR-018c) |
| **V. 실측과 짐작 구분** | `unknown`이 프롬프트에서 0이 됨 | 프롬프트 구성이 `SignalValue` 세 갈래를 각각 다른 문장으로 옮긴다(FR-012a·b). `n_ctx`·한도·최소 길이가 짐작임을 주석에 남긴다 |

**위반 없음.** Complexity Tracking 비어 있다.

### 특별히 주의할 자리 — 원칙 IV

이 기능은 **원칙 IV가 저장소 밖에서 밀고 들어오는 첫 기능이다.** 001~004에서는 우리가
측정 코드를 안 쓰면 됐지만, 여기서는 `llama.rn`이 요청하지 않은 지표를 결과에 담아
보낸다. 방어가 「안 쓴다」가 아니라 **「경계에서 버린다」**여야 하는 이유다.

### Phase 1 이후 재평가 — 통과

설계를 마친 뒤 다시 봤다. 세 가지가 설계 과정에서 드러났고 전부 계약에 반영됐다:

1. **끊긴 생성에도 `text`가 들어 있다**(research §2). `interrupted: true`인 결과가 부분
   출력을 담고 정상 resolve된다. 판정이 `interrupted`를 **먼저** 보므로 통과하지 못한다
   — 판정이 어댑터 바깥이었다면 이 방어가 늦었다.
2. **잘림 판정을 짐작하지 않아도 된다.** `stopped_limit`·`truncated`·`context_full`이
   사실을 준다. 문장 부호로 추측했다면 그것이 휴리스틱이고 원칙 IV의 언저리였다.
3. **`n_ctx`가 새 짐작을 하나 들여온다**(§3). 004의 `DEFAULT_PHOTO_LIMIT`와 같은 형태로
   주석에 짐작임을 남기고 quickstart D4에서 확인한다.

**여전히 위반 없음.**

## Project Structure

### Documentation (this feature)

```text
specs/005-diary-generation/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — llama.rn 실측, 미지수 해소
├── data-model.md        # Phase 1 — 타입과 경계
├── quickstart.md        # Phase 1 — 검증 절차 (기기 없이 / 실기기)
├── contracts/
│   ├── prompt.md        # 신호 → 프롬프트
│   ├── acceptance.md    # 생성된 글 → 통과/거부
│   └── engine.md        # 모델 적재·실행·정리 (기기에 닿는 자리)
├── checklists/
│   └── requirements.md  # 이미 있음
└── tasks.md             # /speckit-tasks가 만든다
```

### Source Code (repository root)

```text
src/
├── diary/
│   ├── types.ts          # 002. 변경 없다
│   ├── request.ts        # 002. 변경 없다
│   ├── pipeline.ts       # 002. 변경 없다 (deps 주입만 달라진다)
│   ├── store.ts          # 002. 변경 없다
│   ├── prompt.ts         # ★ 신규 — 신호+화자규칙 → 문자열. 순수
│   └── acceptance.ts     # ★ 신규 — 글 → 통과/거부. 순수
├── inference/
│   ├── types.ts          # 002. GenerationFailure에 갈래를 더할 수 있다(FR-025 범위)
│   ├── select.ts         # 001. 변경 없다
│   ├── on-device.ts      # ☆ 수정 — generate()가 엔진을 부른다
│   ├── desktop-server.ts # ☆ 수정 — 같은 프롬프트·판정을 쓴다
│   ├── engine-port.ts    # ★ 신규 — 적재·실행·정리의 계약 (기기 무관)
│   ├── sampling.ts       # ★ 신규 — 샘플링 값. 양쪽이 공유하는 유일한 자리
│   └── llama-port.ts     # ★ 신규 — llama.rn에 닿는 유일한 자리
├── models/               # 003. 변경 없다 (assetFor·경로를 읽기만 한다)
├── signals/              # 004. 변경 없다
├── config/               # 001. 변경 없다
└── ui/
    └── DiagnosticsScreen.tsx  # ☆ 수정 — 생성 시도 + 「쓰고 있다」 불리언

__tests__/
├── diary/
│   ├── prompt.test.ts        # ★ 신규
│   └── acceptance.test.ts    # ★ 신규
└── inference/
    └── generate.test.ts      # ★ 신규 — 대역 엔진으로 파이프라인 전체

.maestro/
└── generate-diary.yaml       # ★ 신규 — 실기기 흐름
```

**Structure Decision**: 기존 구조를 그대로 쓴다. 새 폴더를 만들지 않는다.

**왜 `prompt.ts`·`acceptance.ts`가 `src/diary/`이고 `src/inference/`가 아닌가**:
둘은 **일기가 무엇인가**에 대한 규칙이지 추론에 대한 규칙이 아니다. 데스크톱 어댑터도
같은 것을 쓰므로(FR-005a) 어느 한쪽 추론 구현에 속할 수 없다.

**왜 `sampling.ts`는 `src/inference/`인가**: 샘플링은 추론 실행의 값이다. 다만 **양쪽
어댑터가 공유하는 자리**여야 하므로 어느 한 어댑터 파일 안에 두지 않는다.

**`llama-port.ts`가 기기에 닿는 유일한 자리다**(FR-023). 004의 `signals/expo-port.ts`,
003의 `models/expo-port.ts`와 같은 역할이며, 나머지는 대역으로 기기 없이 검증된다.

## Phase 1 설계 요약

계약 셋으로 갈랐다. 갈린 기준은 **무엇이 기기를 아는가**다.

| 계약 | 무엇 | 기기 | 원칙 |
| --- | --- | --- | --- |
| [prompt.md](contracts/prompt.md) | 신호+캐릭터 → 문자열 | 모른다 | II, V |
| [acceptance.md](contracts/acceptance.md) | 글+종료 사실 → 통과/거부 | 모른다 | I, IV |
| [engine.md](contracts/engine.md) | 적재·실행·정리 | **안다** | I, III, IV |

[data-model.md](data-model.md)가 타입과 그 사이 경계를, [quickstart.md](quickstart.md)가
검증 절차를 담는다.

### 구현 순서 (계약 → 테스트 → 구현)

1. `sampling.ts` — 값 하나. 양쪽이 공유한다
2. `prompt.ts` + 테스트 — 순수. `unknown`/`none` 구분이 여기서 갈린다
3. `acceptance.ts` + 테스트 — 순수. **판정 갈래 넷을 넘지 않는다**
4. `engine-port.ts` — 계약만. 구현 없음
5. `on-device.ts` 수정 + 대역 엔진 테스트 — 파이프라인이 처음 `ok: true`가 된다
6. `llama-port.ts` — 기기에 닿는다. 대역으로 검증 못 하는 자리
7. `desktop-server.ts` 수정 — 같은 프롬프트·샘플링·판정
8. 진단 화면 + Maestro 흐름
9. **실기기 검증** — 이것이 끝나야 기능이 끝난다(원칙 V)

2~3이 5보다 먼저인 이유는 판정과 프롬프트가 어댑터의 입력이기 때문이고, 6이 5보다 나중인
이유는 **대역으로 파이프라인이 도는 것을 먼저 보고** 기기 문제와 설계 문제를 갈라내기
위해서다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비어 있다.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (없음) | | |

## 남은 위험 (체크리스트에서 이어짐)

- **FR-021b(앱이 앞에 있을 때만) × 온디바이스의 느림.** quickstart D5에서 실제 소요를
  본다. 몇 분이면 결정을 다시 볼 근거가 되지만, **바꾸는 것은 백그라운드 실행이라는 축을
  여는 일**이므로 먼저 재는 것이 순서다.
- **「쓰고 있다」가 수치로 자라는 압력.** 타입에 자리를 하나만 두는 것이 유일한 방어다
  (research §9).
- **`prompt` 평문이 instruct 모델의 지시 준수를 떨어뜨릴 수 있다**(research §4). 거부가
  잦으면 그때 채팅 템플릿을 다시 본다. 지금 도입하면 FR-005·FR-014의 검증 가능성을 먼저
  잃는다.
- **데스크톱 서버 경로는 이 기능에서 실기기만큼 검증되지 않는다**(research §8). 같은
  함수를 쓴다는 것이 코드로 보장될 뿐이다 — "돌 것이다"와 "돌았다"는 다르다.
