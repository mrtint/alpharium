# Implementation Plan: 일기 대기 시간 단축 (고정 서두 미리 준비)

**Branch**: `018-prompt-prefix-prewarm` | **Date**: 2026-08-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-prompt-prefix-prewarm/spec.md`

## Summary

일기 프롬프트의 69.8%(화자 규칙·이름·제목 지시문 — 캐릭터가 같으면 날마다
바뀌지 않는 부분)를 사용자가 "쓰기"를 누르기 전, 캐릭터·날짜 선택 화면에
머무는 대기 시간 동안 미리 KV 캐시에 읽혀 둔다. 프롬프트 내용·판정·출력은
한 글자도 바뀌지 않으며, 오직 "쓰기"를 누른 뒤 첫 글자가 나오기까지의
프리필 시간만 줄어든다(실측 근거: Galaxy S22, 20.6초 → 6.6초, 약 14.1초
절감).

1단계(FR-005)는 사진 없는 날에 한정해 캐릭터·날짜 선택 즉시 준비를
시작한다. 2단계(FR-006)는 사진이 있는 날에서, 사진을 먼저 다 읽은 뒤에만
준비를 시작해 헌법의 "한 번에 하나의 추론 엔진만 연다" 불변식(E1)을
지킨다. 두 단계 모두 `GenerationEngine`에 반환값 없는 `prewarm()` 메서드
하나를 추가하는 것으로 구현되며, `generate()`의 기존 로직은 건드리지
않는다 — 이미 열려 있는 캐릭터를 재사용하는 기존 `warm` 분기가 준비된
컨텍스트를 그대로 재사용한다.

## Technical Context

**Language/Version**: TypeScript (React Native 0.86, Expo 57)

**Primary Dependencies**: `llama.rn` ^0.12.8 (온디바이스 추론), 기존
`src/inference/`·`src/vision/`·`src/diary/`·`src/ui/` 계층 (신규 의존
없음)

**Storage**: 해당 없음 — 이 기능은 영속 데이터를 추가하지 않는다. 준비
상태는 메모리 내 휘발성 상태다(엔진 컨텍스트, 캡션 캐시).

**Testing**: `npm run test:logic`(순수 로직, node 환경) — `engine-port.ts`
계약 확장과 `prompt.ts`의 접두사 분리는 화면을 건드리지 않으므로 대부분
`.ts` 스위트에 속한다. 화면 훅(`DiaryHomeScreen.tsx`의 준비 트리거, 자원
해제)은 `npm run test:ui`. 실기기 확인은 `npm run test:device`(Maestro,
최소 1회 — AGENTS.md 기준: 새 네이티브 모듈이 아니므로 debug 1회로 충분).

**Target Platform**: Android 실기기(dev/prod), 개발자 데스크톱 시뮬레이터
(local, 데스크톱 서버 추론 — 이 기능은 온디바이스 전용이며 데스크톱
어댑터에는 `prewarm()`이 no-op이거나 아예 배선되지 않는다, 아래 「범위
밖」 참고)

**Project Type**: 모바일 앱(단일 프로젝트, Expo/React Native)

**Performance Goals**: 사진 없는 날 프리필 20.6초 → 6.6초(약 68% 감소,
S22 실측). 사진 있는 날 전체 대기 약 101초 → 약 66초(2단계 완료 시).
이 저장소는 성능을 자동으로 재는 코드를 두지 않으므로(헌법 원칙 IV) 확인은
화면에 이미 있는 `writingMs` 표시를 사람이 직접 여러 차례 비교해 읽는다
(quickstart.md).

**Constraints**:
- 헌법 E1("한 번에 하나의 추론 엔진만 연다") — 준비 동작이 사진 읽기와
  동시에 진행되면 안 된다.
- 헌법 원칙 IV — `prewarm()`은 반환값이 없다. 소요 시간·토큰 수를 담을
  자리를 만들지 않는다.
- 헌법 원칙 I — 준비 중 생성되는 어떤 글도 화면·저장소·로그로 새면 안
  된다.
- 프롬프트 접두사(`promptPrefix()`)와 `buildPrompt()`의 실제 서두가
  바이트 단위로 항상 일치해야 한다 — 어긋나면 캐시가 빗나가 이 기능
  전체가 조용히 무의미해진다(성능 저하일 뿐 기능 오류로 드러나지 않는다).
- 저사양 기기 메모리 — 화면을 벗어나면 준비 상태(열린 컨텍스트)를
  놓아준다.

**Scale/Scope**: `src/inference/engine-port.ts`(계약 확장),
`src/inference/llama-port.ts`(구현), `src/inference/on-device.ts`(`prepare()`
노출, 사진 읽기 분리 준비), `src/inference/types.ts`(`InferenceBackend.generate()`
계약에 `seen?` 추가), `src/diary/prompt.ts`(접두사 추출),
`src/diary/pipeline.ts`(`PipelineInput.seen?` 추가, `runStages()`가
그대로 전달), `src/ui/DiaryHomeScreen.tsx`(트리거·자원 해제) — 7개 기존
파일 수정, 신규 파일 없음. 2단계(캡션을 `generate()` 밖으로 완전히 꺼내는
것)는 범위에 포함하되, 화면·파이프라인 계층 변경은 최소화한다(아래
「구조 결정」·「2단계 범위에 대한 결정」).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능이 지키는 방식 | 게이트 |
|---|---|---|
| **I. 온디바이스가 제품이다** | 프롬프트·샘플링·판정 로직을 조금도 바꾸지 않는다. 준비 동작이 만드는 글은 어디로도 새지 않는다(`prewarm()` 반환값 없음, E6 신설). | PASS |
| **II. 화자는 휴대폰이고 시야는 좁다** | 건드리지 않는다 — `promptPrefix()`는 `buildPrompt()`가 이미 만들던 배열의 앞부분을 그대로 추출한 것뿐이다. | PASS |
| **III. 모델은 캐릭터다** | `prewarm(character)`만 받는다. 모델 경로·식별자가 어댑터 밖으로 나가지 않는다(기존 `load()`와 같은 경계). | PASS |
| **IV. 측정 장치를 제품에 들이지 않는다** | `prewarm()`은 반환값이 없다(계약으로 강제). 확인은 이미 있는 `writingMs` 화면 표시를 사람이 읽는 것으로 한다 — 새 측정 코드를 만들지 않는다. | PASS |
| **V. 관측된 사실과 추측을 구분한다** | `visionMs`는 실제로 사진을 읽은 호출에서만 기록된다(FR-010, 기존 T4 불변식 재사용) — 미리 읽어 둔 결과를 재사용한 호출은 "사진을 읽지 않았다"로 취급한다. | PASS |
| **E1 (한 번에 하나)** | §2가 스펙의 핵심 제약이었다. FR-004·FR-006·FR-006a가 준비와 사진 읽기가 겹치지 않도록 순서를 명시한다. | PASS, 아래 「구조 결정」에서 상세 |
| **E2 (정리)** | `generate()`의 `finally { unload() }`를 건드리지 않는다. 준비 상태는 화면 이탈 시(FR-008) 별도로 해제된다. | PASS |

**초기 게이트 통과 — 위반 없음. Complexity Tracking 불필요.**

## Project Structure

### Documentation (this feature)

```text
specs/018-prompt-prefix-prewarm/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물
├── data-model.md         # Phase 1 산출물
├── quickstart.md         # Phase 1 산출물
├── contracts/            # Phase 1 산출물
│   ├── prewarm-engine.md     # engine-port.ts 계약 확장 (E6 등)
│   └── prompt-prefix.md      # prompt.ts 접두사 분리 계약 (바이트 동일성)
└── tasks.md               # Phase 2 산출물 (/speckit-tasks, 이 명령 아님)
```

### Source Code (repository root)

이 저장소는 이미 확립된 단일 구조를 쓴다(AGENTS.md 「코드를 어디에
두는가」). 새 디렉터리를 만들지 않는다 — 기존 일곱 파일만 수정한다.

```text
src/
├── inference/
│   ├── engine-port.ts     # [수정] GenerationEngine에 prewarm() 추가, 불변식 E6
│   ├── llama-port.ts       # [수정] prewarm() 구현 (messages+jinja, n_predict:1)
│   ├── on-device.ts        # [수정] prepare()/release() 노출, generate()가 seen? 수용
│   └── types.ts             # [수정] InferenceBackend.generate()에 seen? 세 번째 인자
├── diary/
│   ├── prompt.ts            # [수정] fixedHead()/promptPrefix() 추출, buildPrompt()는
│   │                         #        같은 배열을 재사용 (바이트 동일성 유지)
│   └── pipeline.ts          # [수정] PipelineInput.seen? 추가, runStages()가 그대로 전달
└── ui/
    └── DiaryHomeScreen.tsx  # [수정] 선택 완료 시 준비 트리거, AppState로 자원 해제

__tests__/
├── diary/
│   ├── prompt.test.ts      # [수정] 접두사 경계 테스트 3종 추가
│   └── pipeline.test.ts    # [수정] seen이 backend.generate()로 전달되는지 확인
├── inference/
│   ├── llama-port.test.ts  # [수정] prewarm 모양 테스트 4종 추가
│   └── on-device.test.ts   # [수정] prepare()/E1 순서/자원 수명 테스트 추가
└── ui/
    └── DiaryHomeScreen.test.tsx  # [수정] 준비 트리거·해제 테스트 추가
```

**Structure Decision**: 신규 파일이나 디렉터리를 만들지 않는다. 기존
다섯 계층 파일에 최소 변경을 가하는 것으로 충분하다 — 이 기능은 새
사용자 기능이 아니라 기존 파이프라인 경로 위에 "미리 준비" 얇은 층을
얹는 것이며, `GenerationEngine` 계약을 넓히는 것이 유일한 구조적
확장이다. 원칙 IV·V 방어는 기존 파일(`engine-port.ts`, `on-device.ts`)의
경계를 그대로 재사용한다.

## 2단계 범위에 대한 결정

원 제안 문서(§4)는 2단계를 "캡션을 `generate()` 밖으로 완전히 꺼내
화면이 `seen`을 넘긴다"는 더 큰 리팩터로 제안한다(`generate(request, {
seen? })` 시그니처 변경, 화면이 사진 읽기 생명주기를 직접 관리). 이
계획은 그 리팩터를 **이번 기능의 범위에 포함**하되(FR-006·FR-006a가
요구하는 "사진 읽기 후에만 준비 시작"이 이것 없이는 화면 쪽에서
구현할 수 없다), 저장 계층(`store.ts`)은 건드리지 않는다 —
`on-device.ts`의 `generate()`가 이미 읽어 둔 `seen`을 받아들이는
쪽으로 확장되고, 없으면 지금처럼 스스로 읽는다(회귀 없음, 원 문서 §4가
이미 요구한 성질).

**`pipeline.ts`는 최소 변경이 불가피하다.** `/speckit-analyze`에서 발견된
구조적 문제(F1) — `DiaryHomeScreen.tsx`는 `pipeline.run()`만 부르고,
`pipeline.ts`의 `runStages()`가 `deps.backend.generate(request.request,
onProgress)`를 정확히 두 인자로 호출한다. 화면이 미리 읽어 둔 `seen`이
파이프라인을 거치지 않고 백엔드에 닿을 방법이 없으므로, 아래 세 지점을
함께 넓힌다(모두 옵셔널 확장이며 기존 호출자는 깨지지 않는다):
- `PipelineInput`(`pipeline.ts`)에 `seen?: PhotoVision` 필드 추가
- `InferenceBackend.generate()`(`src/inference/types.ts`) 계약에 세
  번째 옵셔널 인자 `seen?: PhotoVision` 추가
- `runStages()`가 `deps.backend.generate(request.request, onProgress,
  input.seen)`로 전달

저장 계층(`store.ts`, `DiaryEntry` 등)은 여전히 건드리지 않는다 — 이
확장은 파이프라인의 **입력**을 넓히는 것뿐이며 저장되는 `DiaryEntry`의
모양이나 `timing` 처리(FR-010)는 `on-device.ts`가 이미 하던 대로다.

## Complexity Tracking

*게이트 위반 없음 — 이 절은 비워 둔다.*
