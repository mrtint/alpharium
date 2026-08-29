# Implementation Plan: 개발자 탭 내 입력 프롬프트 모니터링

**Branch**: `022-prompt-token-diagnostics` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-prompt-token-diagnostics/spec.md`

## Summary

개발자 진단 화면(DiagnosticsScreen)에 **입력 프롬프트 원본**을 캐릭터 × 대표 신호 조합별로
보여준다. `src/diary/prompt.ts`의 `buildPrompt()`(실제 생성이 쓰는 바로 그 함수)를 진단 계층이
사람이 못 박은 신호 프리셋으로 호출해 결과 문자열을 `DiagnosticReport`에 실어 화면에 넘긴다 —
014의 `characterModels`와 동일한 경로. 화면 계층(`src/ui/`)은 완성된 문자열만 받고
`prompt.ts`·`signals`를 직접 import하지 않는다. 네이티브 추론 지표(`tokens_*`·`timings`)는
건드리지 않으므로 `llama-port.ts`의 원칙 IV 경계와 파이프라인은 그대로다.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86 (Expo SDK 57)

**Primary Dependencies**: 없음 추가. 기존 `react-native`(ScrollView/Text), 기존
`src/diary/prompt.ts`, `src/diary/request.ts`, `src/signals/types.ts`, `src/diary/types.ts`만
재사용.

**Storage**: N/A — 프롬프트 미리보기는 휘발성. 파일·일기 항목에 저장하지 않는다.

**Testing**: jest (기기 없는 갈래). 순수 로직은 `.ts`(node 환경), 화면은 `.tsx`(jest-expo).
계약 테스트는 소스 선언을 `readFileSync`로 직접 읽는 이 저장소 관례를 따른다. 실기기 검증은
Maestro(`.maestro/`), debug 1회.

**Target Platform**: Android 실기기(dev·prod 빌드) + 개발 기계 시뮬레이터(local). 진단 화면은
local·dev에서만 노출, prod 빌드에는 "개발자" 탭 자체가 없다(001 SC-013, `showsOnScreen()`).

**Project Type**: Mobile app (단일 저장소, `src/` + `App.tsx` + `__tests__/` + `.maestro/`).

**Performance Goals**: N/A — 조립 시점 문자열 계산뿐. `collectReport()`가 캐릭터 5 × 프리셋
2~3개 = 최대 15회 `buildPrompt()`를 부르며, 각 호출은 순수 문자열 조합이라 수 ms 미만.

**Constraints**:
- 프롬프트 조립은 `src/diary/prompt.ts`에만 있다(005 FR-013b) — 미리보기용 조립 로직을
  복제하지 않는다.
- `src/ui/`는 `src/diary/prompt.ts`·`src/signals/`를 직접 import하지 않는다(FR-008, 007·012·014
  선례). 새 헌법 검사로 못 박는다.
- 신호 프리셋은 사람이 정한 상수 — 코드가 신호 값을 보고 조합을 판정하지 않는다(원칙 V,
  012의 `USER_VISIBLE_SIGNAL_AXES` 선례).
- 판정 갈래(4개)·`RunResult`·파이프라인·`llama-port.ts`를 변경하지 않는다.

**Scale/Scope**: 신규 파일 2개(`src/diagnostics/prompt-preview.ts`, 그 테스트), 수정 파일 4개
(`src/diagnostics/types.ts`, `src/diagnostics/report.ts`, `src/ui/DiagnosticsScreen.tsx`,
`scripts/constitution-rules.ts` + 그 테스트), Maestro 흐름 1개 갱신. 예상 순증 300~400 LOC.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 게이트 | 판정 |
|---|---|---|
| **I. 사용자의 하루를 대신 쓰지 않는다** | 이 기능이 일기 생성·판정·저장에 손대는가? | ✅ PASS — 진단 계층·화면에만 코드를 더한다. `buildPrompt()`를 **읽기 전용**으로 호출한다(부작용 없음, 결정적). 파이프라인·`store`·`acceptance`를 건드리지 않는다. |
| **II. 화자는 휴대폰이다** | 프롬프트 조립 규칙이 두 곳에 생기는가? | ✅ PASS — `prompt.ts`의 `buildPrompt()`를 그대로 부른다. 미리보기용 조립 로직 복제 없음(FR-006). 계약 테스트가 "미리보기 문자열 == `buildPrompt()` 출력"을 잠근다. |
| **III. 모델은 캐릭터다** | 캐릭터↔모델 대응이 사용자 화면에 새는가? | ✅ PASS — 프롬프트는 `FR-015`(prompt.ts)에 의해 캐릭터 식별자조차 담지 않는다. 진단 경로에서 캐릭터명이 프롬프트와 함께 보이는 것은 014 `characterModels` 선례로 허용(MAY). 화면은 진단 리포트의 문자열만 받는다 — `src/ui/`가 `roster`·`prompt`·`signals`에 직접 닿지 않도록 새 검사 추가. |
| **IV. 측정 장치를 제품에 들이지 않는다** | 점수·비교·토큰 수·추론 속도가 노출되는가? | ✅ PASS — 네이티브 지표를 일절 건드리지 않는다(FR-003). 보여주는 것은 우리가 조립한 텍스트와 그 **문자 수 근사값**뿐. 여러 실행 비교·평균·순위 없음. `llama-port.ts`가 `timings`를 버리는 기존 계약 테스트가 그대로 통과함을 SC-006이 검증. |
| **V. 관측된 사실과 추측을 구분해 기록한다** | 코드가 값을 보고 무엇을 보여줄지 판정하는가? | ✅ PASS — 신호 프리셋은 사람이 상수로 정한다(FR-007). 근사 크기 값은 "조립 시점 근사치(실측 토큰 아님)"로 표기(FR-011). 프롬프트 조립 실패는 사유를 담아 정직하게 보여준다(FR-009) — 빈 문자열로 뭉개지 않는다. |

**위반 없음.** Complexity Tracking 불필요.

**추가 확인 — 진단 화면 축 노출 규칙(012 FR-009)**: `SignalProbe.tsx`는 다섯 축을 전부
보여야 하고 `USER_VISIBLE_SIGNAL_AXES`를 참조하면 위반이다. 이 기능은 **프롬프트 미리보기**를
보여주며, 프롬프트 자체는 `signalLines()` 안에서 `USER_VISIBLE_SIGNAL_AXES`로 축을 이미
거른다(사용자 일기에 나갈 프롬프트이므로 그게 맞다). 미리보기는 "실제 프롬프트가 무엇인가"를
보여주는 것이 목적이므로 걸러진 프롬프트를 그대로 보이는 것이 옳다 — 진단 화면이 그 상수를
**직접** 참조하는 것이 아니라 `buildPrompt()`의 출력을 보이는 것이라 012 규칙과 무관하다.

## Project Structure

### Documentation (this feature)

```text
specs/022-prompt-token-diagnostics/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── prompt-preview.md   # 진단 계층 ↔ 화면 계약
├── checklists/
│   └── requirements.md  # (already created by /speckit-specify + /speckit-clarify)
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
src/
├── diagnostics/
│   ├── prompt-preview.ts       # ★ 신규 — 신호 프리셋 상수 + buildPrompt() 호출로 미리보기 조립
│   ├── types.ts                # 수정 — DiagnosticReport에 promptPreviews 필드 추가
│   └── report.ts               # 수정 — collectReport()가 prompt-preview를 리포트에 실음
├── diary/
│   ├── prompt.ts               # 무변경 — buildPrompt() / promptPrefix() 그대로 호출
│   ├── request.ts              # 무변경 — buildRequest()로 DiaryRequest 조립
│   └── types.ts                # 무변경 — CHARACTERS, Character, VisionSetting
├── signals/
│   └── types.ts                # 무변경 — DaySignals 타입만 참조
└── ui/
    └── DiagnosticsScreen.tsx   # 수정 — 프롬프트 미리보기 섹션 렌더 (report 문자열만 사용)

scripts/
└── constitution-rules.ts       # 수정 — src/ui/가 prompt·signals에 닿는 것을 잡는 규칙 추가

__tests__/
├── prompt-preview.test.ts          # ★ 신규 — 프리셋·조립 동일성·실패 갈래 (순수 로직, .ts)
├── diagnostics-report.test.ts      # 수정/신규 — collectReport가 promptPreviews를 싣는지
├── diagnostics-screen.test.tsx     # 수정/신규 — 화면이 문자열만 렌더, prompt/signals 미import
└── constitution-rules.test.ts      # 수정 — 새 UI 규칙의 위반 주입 검증

.maestro/
└── (기존 진단 화면 흐름에 프롬프트 섹션 확인 스텝 추가 — run-device-tests.mjs FLOWS 확인)
```

**Structure Decision**: 단일 저장소 mobile app 구조. AGENTS.md "코드를 어디에 두는가"의 경계를
그대로 따른다 — 순수 판정·상수는 `src/diagnostics/`, 화면은 `src/ui/`, 헌법 검사는 `scripts/`.
020의 `src/schedule/`, 021의 `src/onboarding/`이 각자 경계 파일(`checkScheduleFile`·
`checkOnboardingFile`)을 둔 것과 달리, 이 기능은 **기존 `src/diagnostics/` 경계 안**에 머무르므로
새 경계 검사 함수를 만들지 않고 기존 `checkSourceFile`(src/ui 감시)에 규칙 한 줄을 더한다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비워 둔다.
