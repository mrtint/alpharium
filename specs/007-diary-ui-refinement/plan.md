# Implementation Plan: 최소버전 일기의 UI/UX 개선

**Branch**: `007-diary-ui-refinement` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-diary-ui-refinement/spec.md`

## Summary

**막힌 자리 셋을 뚫는다**: 캐릭터를 고를 수 없는 것, 30초를 정지한 글자로 견디는 것,
목록이 날짜 나열인 것. 그리고 그 과정에서 **006이 남긴 끊긴 배선 하나를 잇는다.**

접근은 006의 구조를 그대로 따른다 — **판단은 `src/app/`의 순수 함수가 하고 화면은
그리기만 한다.** 새 화면도, 새 네이티브 의존도, 네비게이션 라이브러리도 없다.
회전 표시는 React Native 내장 `ActivityIndicator`이고, 캐릭터 선택의 영속화는
003이 이미 쓰는 `expo-file-system` 통로를 같은 모양으로 재사용한다.

### ⚠️ 계획 중에 드러난 것 — 끊김 기능이 실기기에서 죽어 있다

005가 「앱이 앞을 벗어나면 생성을 끊는다」(FR-014b)를 만들었고 코드가 다 있다.
그런데 **제품 경로에서 한 번도 동작한 적이 없다**:

- [on-device.ts:41](../../src/inference/on-device.ts#L41)에 `StoppableBackend`가 있고 `stop()`을 구현한다
- [DiaryHomeScreen.tsx:49](../../src/ui/DiaryHomeScreen.tsx#L49)가 `stop?` prop을 받아 `AppState` 구독에서 부른다
- **그런데 [App.tsx](../../App.tsx)가 그 prop을 넘기지 않는다.** `createAppPipeline()`이
  `{ pipeline, location }`만 돌려주고 **backend를 버리기 때문에** 넘길 것이 없다

AGENTS.md에 「끊김은 실기기에서 확인하지 못했다」고 적혀 있는데, **확인하지 못한 것이
아니라 배선이 없어서 확인할 수 없었다.** `stop?`이 옵셔널이라 타입 검사도 통과했고
테스트는 prop을 직접 주입하므로 초록불이었다 — **006의 `GenerationProbe`가
파이프라인을 건너뛴 것과 정확히 같은 종류의 결함이다.**

**Story 2(그만두기)가 이 배선을 요구하므로 007이 이것을 잇는다.** 없는 것을 새로
만드는 것이 아니라 끊긴 것을 잇는 일이다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19.2.3

**Primary Dependencies**: Expo SDK ~57.0.14, React Native 0.86.2,
`react-native-safe-area-context` ~5.7.0, `expo-file-system` ~57.0.4.
**새로 더하는 의존은 없다**(FR-028, SC-015). 회전 표시는 React Native 내장
`ActivityIndicator`이며 별도 설치가 없다(2026-08-20 설치본에서 export 확인).

**Storage**: `expo-file-system`의 `File`/`Paths`. 일기는 `files/diary/<날짜>.json`,
**캐릭터 선택은 새 파일 하나**(003의 `ModelState` 파일과 같은 모양·다른 자리).

**Testing**: Jest + `jest-expo` (기기 불필요, `--maxWorkers=50%`), Maestro (실기기).
새 Maestro 흐름은 **`scripts/run-device-tests.mjs`의 `FLOWS`에 등록해야 돈다.**

**Target Platform**: Android 13+ 실기기 (SM-G986N에서 검증), release 빌드 포함

**Project Type**: Mobile (Expo development build, 단일 프로젝트)

**Performance Goals**: 목록 그리기가 **지금보다 느려지지 않는다.** 그만두기는
10초 안에 목록 복귀(SC-005). 생성 자체는 약 30초로 변하지 않는다.

**Constraints**: 완전 오프라인·온디바이스. 화면에 지표를 담을 **자리 자체가 없어야
한다**(원칙 IV). release의 R8·ProGuard에서 살아남아야 한다.

**Scale/Scope**: 화면 4개 수정(목록·상세는 유지, 홈·App), 새 모듈 2~3개,
캐릭터 5·시각 설정 1. 일기 수십 개 규모.

## Constitution Check

*GATE: Phase 0 이전에 통과해야 하고 Phase 1 이후 재검토한다.*

| 원칙 | 이 기능에서의 위험 | 방어 | 판정 |
| --- | --- | --- | --- |
| **I. 온디바이스가 제품이다** | 목록에 이미 있는 일기가 생성을 대신하는 지름길(FR-025). 그만둔 부분 결과를 화면에 올리는 것(FR-014a) | `toWriting()`이 인자를 받지 않는 006의 방어를 유지한다. 쓰기 자리에 덮어쓰기 예고가 붙어도 **`onWrite`는 여전히 목록을 보지 않는다.** 그만둔 결과는 화면 상태에 담을 자리를 두지 않는다 | ✅ PASS |
| **II. 화자는 휴대폰** | 이 기능은 프롬프트를 건드리지 않는다 | `src/diary/prompt.ts`를 수정하지 않는다 | ✅ 해당 없음 |
| **III. 모델은 캐릭터다** | **가장 큰 위험.** 캐릭터를 고르는 화면을 처음 만들면서 모델 정보가 샐 수 있다. 성격 설명을 붙이고 싶어진다 | 선택 화면이 `ModelAsset`·`roster.ts`를 **import 하지 않는다** — 003의 `CharacterListScreen`과 같은 방어. 표시 문안을 짓지 않고 자리표시 식별자를 그대로 보인다 | ⚠️ 감시 (research §1) |
| **IV. 측정 장치를 들이지 않는다** | **두 번째 위험.** 30초를 견디게 하려면 진행률을 넣고 싶어진다 | 회전 표시는 **상태를 담지 않는다.** `AppScreen`의 `writing`에 **필드를 더하지 않는 것**이 방어이며(FR-010a), 단계 이름은 명시적으로 금지(FR-010b) | ✅ PASS |
| **V. 관측과 추측을 구분한다** | 목록에서 `none`과 `unknown`을 같은 말로 뭉개는 것. 006 이전 일기에 없는 정보를 지어내는 것 | 목록이 사진을 **세 갈래**로 보인다(FR-019). 신호가 없으면 단서 없이 날짜만 — 지어내지 않는다 | ✅ PASS |
| **개발 방식** | 「UI 개선」이 테마·서체로 번져 한 축을 깊게 파는 것 | 스펙의 「하지 않는 것」이 범위를 못 박았고 FR-026~030이 금지 조항이다 | ✅ PASS |

**초기 게이트: 통과.** 원칙 III·IV가 이 기능에서 가장 가까이 지나가므로 research에서
따로 다룬다. **Complexity Tracking에 적을 위반이 없다.**

## Project Structure

### Documentation (this feature)

```text
specs/007-diary-ui-refinement/
├── plan.md              # 이 파일
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── selection.md     # 캐릭터 선택의 계약
│   └── screens.md       # 화면 상태와 전이 (006의 것을 넓힌다)
├── checklists/
│   └── requirements.md  # /speckit-specify 산출
└── tasks.md             # /speckit-tasks 산출 (이 명령이 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── state.ts            # ✏️ 수정 — 쓰기 자리 정보, 그만두기 전이
│   ├── selection.ts        # ✨ 신규 — 고른 캐릭터의 순수 규칙 (옮김·되돌림)
│   ├── selection-store.ts  # ✨ 신규 — 선택의 영속화 (기기에 닿는 유일한 자리)
│   ├── failure-text.ts     # ✏️ 수정 — 그만둠 문구
│   └── wiring.ts           # ✏️ 수정 — backend를 함께 돌려준다 (끊긴 배선)
├── ui/
│   ├── DiaryHomeScreen.tsx # ✏️ 수정 — 회전 표시, 그만두기, 쓰기 자리 조립
│   ├── DiaryListScreen.tsx # ✏️ 수정 — 사진 신호, 쓰기 자리
│   └── CharacterPicker.tsx # ✨ 신규 — 고르는 자리 (모델 정보에 닿지 않는다)
└── inference/
    └── select.ts           # ✏️ 수정 — StoppableBackend를 좁히지 않고 넘긴다

App.tsx                     # ✏️ 수정 — stop 배선, 선택 상태 잇기

__tests__/
├── app/
│   ├── selection.test.ts       # ✨ 순수 규칙 (기기 불필요)
│   ├── selection-store.test.ts # ✨ 대역 통로로 왕복
│   └── state.test.ts           # ✏️ 새 전이
└── ui/
    ├── diary-home.test.tsx     # ✏️ 회전 표시·그만두기
    ├── diary-list.test.tsx     # ✏️ 사진 신호·쓰기 자리
    └── character-picker.test.tsx # ✨ 모델 정보 비노출 검증

.maestro/
└── diary-character-select.yaml # ✨ 실기기 흐름 (FLOWS 등록 필수)
```

**Structure Decision**: 006이 세운 구조를 그대로 따른다 — **판단은 `src/app/`의 순수
함수, 화면은 `src/ui/`에서 그리기만.** 새 폴더를 만들지 않는다.

`selection.ts`(순수 규칙)와 `selection-store.ts`(기기 통로)를 **가르는 것이 핵심**이다.
003이 `readiness.ts`와 `expo-port.ts`를 가른 것, 002가 `store.ts`와 `FileSystemPort`를
가른 것과 같다 — 그래야 「옮김」 규칙 전체가 기기 없이 검증된다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비워 둔다.

이 기능은 **새 의존 0개, 새 화면 0개**로 끝난다. 늘어나는 것은 모듈 셋
(`selection.ts`·`selection-store.ts`·`CharacterPicker.tsx`)이며, 셋 다 기존 구조의
같은 자리에 놓인다.

## Phase 0 — Research

**산출**: [research.md](research.md)

해소해야 했던 미지수 넷:

1. **회전 표시를 새 의존 없이 그릴 수 있는가** → `ActivityIndicator`가 React Native
   코어에 있다(설치본에서 export 확인). **SC-015 통과.**
2. **캐릭터 선택을 어디에 저장하는가** → `AsyncStorage`가 **의존에 없다.**
   `expo-file-system`으로 003과 같은 모양의 파일 하나. 새 의존이 없다.
3. **`stop()`을 화면까지 어떻게 잇는가** → 배선이 끊겨 있음을 발견. `selectBackend`가
   `InferenceBackend`로 좁히는 자리를 넓힌다.
4. **목록의 사진 신호를 추가 비용 없이 얻는가** → `listDiaries()`가 이미 전체를
   읽고 있다(clarify에서 확인). 비용 0.

## Phase 1 — Design & Contracts

**산출**: [data-model.md](data-model.md), [contracts/selection.md](contracts/selection.md),
[contracts/screens.md](contracts/screens.md), [quickstart.md](quickstart.md)

## Post-Design Constitution Re-check

**Phase 1 설계를 마친 뒤 재검토했다 (2026-08-20). 결과: 통과.**

| 원칙 | 설계가 세운 방어 | 어디에 | 판정 |
| --- | --- | --- | --- |
| **I** | `toWriting()`이 **여전히 인자를 받지 않는다.** `WritePrompt`가 「이미 있다」를 알아도 쓰기를 시작하는 함수는 모른다. 그만둠 갈래를 만들지 않아 부분 결과를 담을 자리가 없다 | data-model §3·§4, screens §2·§4 | ✅ PASS |
| **II** | 프롬프트를 건드리지 않는다 | — | ✅ 해당 없음 |
| **III** | `CharacterPicker`가 `Character`와 불리언만 받는다. `roster.ts`·`ModelAsset`을 **import 하지 않아** 모델 정보에 닿는 경로가 없다. **모듈 그래프로도 검증한다** | selection §4 | ✅ PASS (초기 ⚠️에서 해소) |
| **IV** | `writing`에 **필드를 더하지 않았다.** `ActivityIndicator`는 진행률 파라미터가 **없다**. 단계 이름이 계약에서 금지됐다 | data-model §3, screens §1 | ✅ PASS (초기 ⚠️에서 해소) |
| **V** | `PhotoHint`가 세 갈래로 `SignalValue`와 일대일. 선택 파일이 깨지면 지어내지 않고 「없음」으로 떨어진다. research가 실측과 짐작을 갈라 적었다 | data-model §2·§5, selection §2 | ✅ PASS |
| **개발 방식** | 새 의존 0개, 새 화면 0개. 계약이 먼저 서고 검증 표가 테스트보다 앞선다 | 전체 | ✅ PASS |

### 초기 게이트의 ⚠️ 둘이 어떻게 해소됐는가

- **원칙 III (모델 정보 누출)** → 003이 이미 푼 방식을 그대로 베꼈다.
  **「조심해서 안 쓰는 것」이 아니라 「받지 못하므로 쓸 수 없는 것」**으로 만들었다.
- **원칙 IV (진행률 유혹)** → 회전 표시를 고른 것이 우연히 방어가 됐다.
  `ActivityIndicator`는 **진행률을 담을 파라미터가 없어서**, 넣고 싶어도 넣을 수 없다.

### 설계가 새로 만든 위험 하나

**`stop` 배선을 이으면서 `AppPipelineResult`에 옵셔널 필드가 하나 는다.** 옵셔널이
바로 이 결함을 숨긴 원인이므로([research §3](research.md)), 계약이
**「온디바이스면 반드시 있다」와 「화면까지 실제로 이어진다」를 검사 항목으로
못 박았다**([contracts/selection.md](contracts/selection.md) §3 표 1·4번).

**Complexity Tracking에 적을 위반은 여전히 없다.**

---

## 되돌아보기 — 이 기능이 발견한 것

계획 중 코드를 읽다가 **두 가지 사실이 스펙의 전제를 바꿨다.** 둘 다 기록해 둔다.

1. **끊김 기능이 실기기에서 죽어 있었다.** AGENTS.md는 「30초라 확인하지 못했다」고
   적었지만 **진짜 이유는 `App.tsx`가 `stop`을 넘기지 않는 것**이었다. 006의
   `GenerationProbe`와 같은 종류의 결함이며, 옵셔널 prop + prop 주입 테스트가
   조용히 통과시켰다.
2. **목록이 이미 모든 일기를 읽고 있었다.** `readable` 판정을 위해 전체를
   역직렬화해 놓고 버린다. 그래서 사진 신호를 보이는 비용이 **0이고**, 006 FR-020의
   「전문을 읽지 않는다」는 이미 사실이 아니었다 — 취지를 「보이지 않는다」로 살렸다.

**둘 다 「초록불인데 아무것도 검증되지 않은 상태」였다**(원칙 V가 막으려는 것).
