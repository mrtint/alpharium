# Implementation Plan: 내려받기 충돌을 사용자에게 알린다

**Branch**: `008-download-conflict-feedback` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-download-conflict-feedback/spec.md`

## Summary

**두 버그의 뿌리는 하나다: 화면이 내려받기의 실제 상태를 그리지 않고, 요청의 결과를
버린다.** 내려받기 자체(`acquisition.ts`)는 옳게 동작하며 기기 없는 테스트가 그것을
확인한다 — 고칠 자리는 **화면과 그 배선**이다.

무엇을 하는가:

1. **거부를 화면까지 나르는 길을 낸다.** [App.tsx:294](../../App.tsx#L294)가 `prepare()`의
   반환값을 버리므로 `busy` 실패가 사용자에게 한 글자도 닿지 않는다. 반환값을 받아
   화면에 넘긴다.
2. **진행 표시가 「받는 중인 것」을 따르게 한다.** 지금은 `setProgress(null)`이 **거부된
   요청에서도** 돌아 받던 것의 진행률과 멈추기 버튼을 함께 지운다. **자기 요청의
   결과로만 진행 표시를 거두게** 바꾼다.
3. **화면을 오가도 진행 표시가 남게 한다.** 진행 상태가 `ModelSection`의 지역 상태라
   탭을 떠나면 언마운트와 함께 사라진다. **내려받기를 아는 쪽(`Acquisition`)에게 물어서**
   되찾는다.

**설계의 중심**: 판정을 화면에 두지 않는다. 「받는 중인가·거부되었는가·무엇을 보일
것인가」를 **순수 함수 하나**로 모으고 화면은 그리기만 한다 — 007의 `resolveSelection()`이
같은 구조였고, 그래야 이 기능의 규칙 전체가 기기 없이 검증된다.

**동시 내려받기를 허용하지 않는다.** 003 FR-020은 근거를 남기고 확정한 규칙이며, 이
기능은 **규칙이 아니라 그 규칙의 침묵**을 고친다(spec 「이 기능이 하지 않는 것」).

## Technical Context

**Language/Version**: TypeScript ~6.0.3

**Primary Dependencies**: Expo SDK ~57.0.13, React Native 0.86.2. **새 의존 0개** —
필요한 것(상태·순수 함수·기존 화면)이 전부 이미 있다.

**Storage**: 없다. 거부 통지는 **일시적이며 기기에 남지 않는다**(spec Key Entities) —
남기면 앱을 껐다 켰을 때 참이 아닌 안내가 뜬다. 003의 `running`을 메모리에만 둔 것과
같은 판단이다.

**Testing**: Jest + `@testing-library/react-native` 14(기기 불필요), Maestro(실기기).
`npm test` / `npm run test:device` / `npm run lint`.

**Target Platform**: Android 13 (SM-G986N 실기기), arm64-v8a

**Project Type**: Mobile (Expo development build / release APK)

**Performance Goals**: 거부 안내가 **3초 안에** 보인다(SC-001). `busy` 거부는 네트워크를
타지 않고 즉시 반환되므로 여유가 크다.

**Constraints**:
- **진행 표시에 시간·속도·바이트를 더하지 않는다**(FR-016, 원칙 IV)
- **거부 안내에 모델 정보가 들어가지 않는다**(FR-004, 원칙 III)
- **백분율을 모르면 모른다고 한다**(FR-017, 원칙 V)
- **`src/ui/`는 `roster`·`assetFor`·`ModelAsset`에 닿을 수 없다**(007이 세운 헌법 검사
  규칙, `check-constitution`이 강제)

**Scale/Scope**: 화면 1개(`CharacterListScreen`), 배선 1곳(`App.tsx`의 `ModelSection`),
새 순수 함수 모듈 1개. 캐릭터는 다섯으로 고정이고 동시 내려받기는 최대 1개다.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능과의 관계 | 판정 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | 추론 경로를 건드리지 않는다. 내려받기는 모델 파일을 기기에 두는 일이고 그 자체가 원칙 I의 수단이다. **거부되었을 때 대체 자산으로 채우지 않는다** — `DownloadFailure`에 자리가 없다 | ✅ 통과 |
| **II. 화자는 휴대폰이고 시야는 좁다** | 일기 텍스트를 만들지 않는다. 무관 | ✅ 해당 없음 |
| **III. 모델은 캐릭터다** | **가장 큰 위험이다.** 거부 안내는 새로 쓰는 사용자 문구이며, 「quiet을 받는 중(3.2GB)」처럼 크기·주소·식별자가 섞이기 쉽다. FR-004·SC-004가 이것을 막고, **`src/ui/`의 import 금지 규칙이 구조로 막는다** | ⚠️ 감시 후 통과 |
| **IV. 측정 장치를 제품에 들이지 않는다** | **둘째 위험이다.** 「받는 중인 것을 잘 보이게」를 고치다 보면 남은 시간·속도·바이트를 더하고 싶어진다. FR-016이 금지하고, **`DownloadProgress` 타입에 자리가 없는 것**이 구조적 방어다(003이 세웠다) | ⚠️ 감시 후 통과 |
| **V. 관측된 사실과 추측을 구분한다** | 백분율을 모르면 모른다고 한다(FR-017, 003이 이미 그렇게 만들었다). **실기기 확인을 SC-007이 요구한다** — 기기 없는 테스트가 전부 통과해도 끝이 아니다 | ✅ 통과 |
| **개발 방식** | 계약을 먼저 정하고 테스트를 먼저 쓴다. 커밋 메시지는 한국어 | ✅ 통과 |

**게이트 통과.** 정당화가 필요한 위반이 없으므로 Complexity Tracking은 비운다.

**감시 항목 둘은 구조로 막힌다**: 원칙 III는 `src/ui/`의 import 금지(헌법 검사가
강제)로, 원칙 IV는 `DownloadProgress`에 시간·바이트 필드가 없는 것으로 막힌다.
**「조심해서 안 쓰는 것」이 아니라 「쓸 수 없는 것」이며**, 이 기능은 그 방어를
약화시키지 않는다.

## Project Structure

### Documentation (this feature)

```text
specs/008-download-conflict-feedback/
├── plan.md              # 이 파일
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── download-view.md # Phase 1 — 화면이 무엇을 받고 무엇을 그리는가
├── checklists/
│   └── requirements.md  # /speckit-specify 산출
└── tasks.md             # /speckit-tasks 산출 (이 명령이 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── acquisition.ts        # 손대지 않는다 (busy 판정·자리 잡기가 이미 옳다)
│   ├── download-view.ts      # ★ 새로 — 무엇을 보일지 정하는 순수 함수
│   ├── types.ts              # DownloadProgress 그대로. 거부 통지 타입만 더한다
│   └── port.ts               # 손대지 않는다
└── ui/
    └── CharacterListScreen.tsx  # 거부 안내를 그리고, 진행 표시를 뷰가 시키는 대로

App.tsx                       # ModelSection의 배선 — 반환값을 받고 넘긴다

__tests__/
├── models/
│   └── download-view.test.ts        # ★ 새로 — 판정 규칙 전부
└── ui/
    └── character-list.test.tsx      # ★ 새로 — 이 화면에 지금 테스트가 없다

.maestro/
└── model-acquisition.yml     # 거부·진행 유지 흐름을 더한다
```

**Structure Decision**: 기존 구조를 그대로 따른다. **판정은 `src/models/`의 순수 함수에,
그리기는 `src/ui/`에, 배선은 `App.tsx`에** — 003·007이 세운 삼분할이며 이 기능이
바꿀 이유가 없다.

**새 모듈을 `src/models/`에 두는 이유**: 판정의 재료가 `DownloadProgress`·
`DownloadFailure`(둘 다 `src/models/types.ts`)이고, `src/ui/`에 두면 화면이 판정을
겸하게 되어 기기 없는 검증이 화면 렌더링에 묶인다. 007이 `resolveSelection()`을
`src/app/`에 둔 것과 같은 판단이다.

**⚠️ `CharacterListScreen`에 device-free 테스트가 없다**(2026-08-21 확인). `__tests__/ui/`에
파일이 없고, 경계 검사(`boundaries.test.ts`)가 소스 문자열만 훑는다. **이 기능이 그
화면을 크게 고치므로 테스트를 함께 세운다** — 없는 채로 고치면 회귀를 잡을 그물이 없다.

## Complexity Tracking

> Constitution Check에 정당화가 필요한 위반이 없으므로 비운다.

---

## Constitution Check — Phase 1 이후 재평가

*설계가 끝난 뒤 다시 본다. 게이트는 설계 전에 통과했으나, **설계가 방어를 약화시켰는지**가
여기서 판가름난다.*

| 원칙 | 설계 후 판정 | 무엇이 방어인가 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | ✅ 통과 | 추론 경로를 건드리지 않았다. `DownloadRejection`에 **대체 자산을 담을 자리가 없다** |
| **II. 화자는 휴대폰** | ✅ 해당 없음 | 일기 텍스트를 만들지 않는다 |
| **III. 모델은 캐릭터다** | ✅ 통과 | **삼중 방어**: ① `src/ui/`의 `roster`·`assetFor` import 금지(헌법 검사가 강제) ② `DownloadRejection`이 `Character`만 담는다 ③ V14·SC-004가 확인 |
| **IV. 측정 장치를 들이지 않는다** | ✅ 통과 | **`DownloadView`에 시간·속도·바이트 필드가 없다.** 003의 `DownloadProgress`가 그 필드를 갖지 않으므로 **담고 싶어도 담을 자리가 없다** — 007의 `ActivityIndicator`와 같은 구조 |
| **V. 관측과 추측을 구분한다** | ✅ 통과 | research가 **셋째 결함을 찾아 「지금 동작」이라는 spec의 가정을 뒤집었다**(§2). 미해결 4건을 표로 남겼다. F4가 그중 하나에 답한다 |
| **개발 방식** | ✅ 통과 | 계약(`download-view.md`)을 먼저 정했고 검증 표 V1~V22가 테스트보다 앞선다 |

**게이트 재통과.** 설계가 기존 방어를 하나도 약화시키지 않았고, **오히려 두 곳을
강화했다**:

1. **`CharacterListScreen`에 device-free 테스트가 생긴다** — 지금은 하나도 없다
2. **`Acquisition`의 수명이 탭에서 앱으로 올라간다** — 지금은 탭을 옮기면 사라진다

### 설계가 spec을 고쳐야 할 곳 하나

**spec Assumptions의 「화면 밖으로 나가도 내려받기가 이어지는 것은 지금 동작이다」가
틀렸다**(research §2). `Acquisition`이 `ModelSection`의 지역 상태라 탭을 옮기면
인스턴스가 통째로 사라진다 — `running`도 `handle`도 함께.

**그래서 FR-013·FR-014는 「깨지 않기」가 아니라 「고치기」다.** 이 발견이 없었다면 탭
왕복 테스트가 실패했을 때 원인을 엉뚱한 데서 찾았을 것이다.

**spec을 되돌려 고치지 않고 여기 적는다** — 계획 단계의 발견이며, 요구사항 자체
(FR-013·FR-014의 문장)는 그대로 옳다. 바뀐 것은 **난이도의 추정**이다.

## Phase 1 산출물

| 파일 | 무엇 |
| --- | --- |
| [research.md](research.md) | 두 버그의 정확한 원인, **셋째 결함 발견**, 미해결 4건 |
| [data-model.md](data-model.md) | `DownloadRejection`·`DownloadView`, 상태 전이, 소유 관계 |
| [contracts/download-view.md](contracts/download-view.md) | 순수 함수 계약, 화면 계약, 배선 계약, 검증 표 V1~V22 |
| [quickstart.md](quickstart.md) | F1~F9 검증 절차, 위반 주입 4가지 |

**해소된 미해결 2건** (Phase 1에서 확인):

- **`expoModelPorts()`는 가볍다** — [expo-port.ts:235](../../src/models/expo-port.ts#L235)가
  클로저 객체 넷을 만들 뿐이고 기기 통로는 메서드 안의 `await import`로 열린다.
  `AppFrame`으로 올려도 일기 탭에 비용이 없다
- **진행 상태도 `AppFrame`으로 올린다** — 그래야 백분율이 탭 왕복을 넘어 산다.
  `Acquisition`을 이미 올리므로 관심사가 새로 섞이지 않는다

**남은 미해결 2건** (실기기에서만 답이 나온다):

- 탭 밖에서 네이티브 전송이 실제로 이어지는가 → **F4**
- 거부 안내가 release의 R8에서 살아남는가 → **F9**
