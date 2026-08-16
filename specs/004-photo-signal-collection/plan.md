# 구현 계획: 사진 신호 수집

**Branch**: `004-photo-signal-collection` | **Date**: 2026-08-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-photo-signal-collection/spec.md`

## Summary

002가 세운 `DaySignals`의 다섯 자리 중 **`photos` 하나를 실제로 채우고**, 사진에 딸린
좌표로 `places`를 부분적으로 채운다. 나머지 셋은 `unknown`으로 남으며 그것이 결론이다.

**구조는 003을 그대로 따른다** — 기기에 닿는 통로(`PhotoPort`)를 인터페이스로 두고, 판정은
순수 함수로 떼어 기기 없이 검증한다. 002의 `PipelineDeps.loadSignals`가 이미 열려 있어
파이프라인 코드를 고치지 않는다.

**이 기능의 최대 위험은 「모른다」가 「없다」로 뭉개지는 것이다**(헌법 원칙 V). 권한 없음을
빈 목록으로 바꾸는 두 줄이 일기를 거짓으로 만든다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React Native 0.86.2, Expo SDK 57

**Primary Dependencies**: `expo-media-library ~57.0.3` (새로 들인다), 기존 `expo-file-system`,
`llama.rn`

**Storage**: 없음. **수집 결과를 저장하지 않는다** — 물을 때마다 미디어 라이브러리에서 다시
얻는다(Assumptions). 신호를 쌓는 계층은 배터리·연결이 필요해질 때의 문제다.

**Testing**: jest + jest-expo (기기 불필요), Maestro (실기기)

**Target Platform**: Android 실기기(SM-G986N, Android 13). iOS는 무너지지 않게만 둔다.

**Project Type**: 모바일 단일 앱

**Performance Goals**: 하루 조회가 사진 수에 비례하되 상한(200장)으로 묶인다. 좌표를
사진마다 묻는 것이 비용의 대부분이다(research.md §3).

**Constraints**:
- 사진의 **내용에 닿지 않는다**(FR-005) — `exeForMetadata()` 경로가 이것을 구조로 보장한다
- 권한을 **스스로 요청하지 않는다**(FR-011)
- `SignalValue`의 세 갈래를 **넓히지 않는다**(FR-026)

**Scale/Scope**: 신호 하나(+ 부분적으로 하나). 새 화면 없음 — 진단 화면에 자리만 더한다.

**남은 미지수**: 안드로이드가 「일부 사진만 허용」을 `limited`로 주는지 **확인되지 않았다**
(research.md §2). 구현 초반에 실기기로 푼다(quickstart D1). **결과가 명세를 바꿀 수 있다.**

## Constitution Check

*GATE: Phase 0 이전에 통과해야 한다.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | ✅ 통과 | 이 기능은 추론에 닿지 않는다. 신호는 기기 안에서만 읽히고 어디로도 나가지 않는다. `generate()`는 여전히 `not-implemented`다 |
| **II. 화자는 휴대폰이고 시야는 좁다** | ✅ 통과 — **오히려 이 기능이 시야를 정의한다** | 휴대폰이 무엇을 볼 수 있고 없는지가 여기서 정해진다. `photosConsidered`/`photosWithLocation`을 담는 것이 "얼마나 봤는지"를 005에 넘기기 위함이다 |
| **III. 모델은 캐릭터다** | ✅ 통과 — 위험 낮음 | 사진 수집은 모델에 닿지 않는다. FR-019가 003의 경계를 유지하는 것만 확인한다 |
| **IV. 측정 장치를 들이지 않는다** | ✅ 통과 | 사진 수를 세는 것은 **신호**이지 모델 품질 측정이 아니다. 추론 속도·출력 점수를 담는 자리가 없다 |
| **V. 관측과 추측을 구분한다** | ⚠️ **최고 위험 — 설계로 막는다** | 이 기능의 본체다. `none`/`unknown`의 갈림이 `contracts/collection.md`에 한 곳으로 모였고, 편의 함수를 금지했으며(FR-027), 100m·200장이 **짐작임을 명시**했다(FR-013h, research.md §7). 미확인(안드로이드 `limited`)을 확인인 척 적지 않았다 |

**개발 방식**:

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 계약 먼저, 테스트 먼저 | ✅ | `contracts/` 셋을 먼저 썼고 검증 표가 테스트 목록이 된다 |
| 커밋 메시지 한국어 | ✅ | 그대로 지킨다 |
| **한 축 파고들기 금지** | ✅ 통과 — **이 계획의 핵심 선택** | VLM을 004에 넣지 않고 005로 미뤘다. mmproj는 생성 엔진이 서야 붙고 로스터 계약을 다시 열어야 한다 — 신호 수집 안에 넣으면 두 축이 엉킨다. 신호도 사진 하나로 좁혔다 |

**측정 장치 경계**: `scripts/constitution-rules.ts`를 넓히지 않는다(research.md §9). 004의
위험은 설정 키가 아니라 코드 판정이고, 그것은 테스트가 잡는다.

**결과: 통과.** 위반 없음. 원칙 V가 최고 위험이며 설계가 그것을 정면으로 다룬다.

## Project Structure

### Documentation (this feature)

```
specs/004-photo-signal-collection/
├── spec.md              # 명세 (clarify 4문 반영)
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 확인/판단/미확인을 가른다
├── data-model.md        # Phase 1 — 무엇이 새로 생기고 무엇이 그대로인가
├── quickstart.md        # Phase 1 — 검증 절차 (D1이 명세를 바꿀 수 있다)
├── contracts/
│   ├── photo-port.md    # 기기에 닿는 유일한 통로 (FR-017)
│   ├── collection.md    # 판정 규칙 — 원칙 V의 방어선
│   └── diagnostics.md   # 진단 화면의 권한 자리 (FR-020~023)
└── checklists/
    └── requirements.md  # 명세 품질 검사 (16/16)
```

### Source Code (repository root)

```
src/
├── config/           # 001·002 그대로. day-boundary를 쓴다 (FR-002)
├── inference/        # 손대지 않는다. generate()는 여전히 not-implemented
├── signals/
│   ├── types.ts      # ⚠️ 넓힌다 — PhotoObservation·PhotoPlaces 추가.
│   │                 #   SignalValue 세 갈래와 DaySignals 자리 수는 그대로 (FR-026)
│   ├── fake.ts       # 그대로 둔다. 제품 경로 아님 (FR-018)
│   ├── port.ts       # 신규 — PhotoPort. 기기 의존의 유일한 모양
│   ├── expo-port.ts  # 신규 — expo-media-library를 부르는 유일한 자리
│   ├── collect.ts    # 신규 — 판정과 조립. 순수 함수 (원칙 V의 방어선)
│   └── places.ts     # 신규 — 좌표 묶기. SAME_PLACE_METERS가 여기만 있다
├── diary/            # 손대지 않는다. loadSignals가 이미 열려 있다
├── models/           # 003 그대로
├── diagnostics/      # 권한 상태를 진단에 싣는다 (FR-020)
└── ui/
    └── DiagnosticsScreen.tsx  # 권한 상태와 요청 버튼 (FR-021)

__tests__/signals/
├── collect.test.ts   # C1~C16 — 판정 규칙
├── places.test.ts    # C10~C12 — 자리 묶기
└── port.test.ts      # 대역이 계약을 만족하는가

app.json              # expo-media-library 플러그인 (research.md §8)
```

**`src/signals/`가 002에서 열렸고 지금까지 모양만 있었다.** 004가 그 안을 채운다.

## Constitution Check — Phase 1 설계 후 재확인

*GATE: Phase 1 이후 다시 본다.*

| 원칙 | 판정 | 설계가 무엇을 더했는가 |
| --- | --- | --- |
| I | ✅ 통과 | 변화 없음. 추론에 닿지 않는다 |
| II | ✅ 통과 | `photosWithLocation`/`photosConsidered`가 "얼마나 봤는지"를 값에 남긴다 — 005의 프롬프트가 단언과 짐작을 가르는 근거가 된다 |
| III | ✅ 통과 | 변화 없음 |
| IV | ✅ 통과 | 설계 어디에도 점수·비교·속도 측정이 없다 |
| V | ✅ 통과 | `collection.md`의 판정 규칙이 한 곳에 모였다. `PhotoObservation`·`PhotoPlaces`가 **한계를 값에 붙여** 떼어낼 수 없게 했다(FR-024~027). 미확인을 표로 따로 뽑았다 |

### 설계에서 새로 드러난 사실

1. **`exeForMetadata()`가 FR-005를 구조로 보장한다**(research.md §1). 메타데이터 경로에는
   픽셀에 닿을 문 자체가 없다. 계약이 아니라 API 선택으로 경계를 지킨다.

2. **`getLocation()`이 안드로이드에서 예외를 던진다**(research.md §3, 타입 주석 명시).
   감싸지 않으면 좌표 권한이 없는 기기에서 **사진 신호 전체가 무너진다.** FR-013a가
   구현에서 깨지는 지점이 여기 하나로 특정됐다.

3. **좌표는 `AssetMetadata`에 없고 `Asset`에만 있다.** 사진 수만큼 네이티브 왕복이
   생기며, 상한(200장)이 성능 방어선을 겸한다.

4. **`granularPermissions`를 좁혀야 한다**(research.md §8). 기본값이면 영상·음성 권한까지
   매니페스트에 들어간다 — 쓰지 않는 권한을 요구하는 것이다.

5. **안드로이드 `limited` 판정이 미확인이고, 이것이 명세를 바꿀 수 있다**(research.md §2).
   FR-008이 지켜질 수 있는지가 여기 달렸다. **구현 초반에 확인한다**(quickstart D1).

### 002·003과의 관계

| 무엇 | 어떻게 되는가 |
| --- | --- |
| `PipelineDeps.loadSignals` | **갈아끼운다.** 002가 주석으로 예고한 자리다 |
| `pipeline.ts` | **고치지 않는다.** `signals` 단계가 이미 있다 |
| `fake.ts` | **그대로.** 테스트가 쓰고 제품 경로가 아니다(FR-018) |
| `SignalValue`·`DaySignals` | **뼈대 그대로.** 담기는 값의 타입만 넓어진다 |
| `src/models/` | **손대지 않는다.** VLM이 005로 갔으므로 로스터를 열 이유가 없다 |

## Complexity Tracking

*헌법 위반으로 정당화가 필요한 항목: **없음.***

설계상 감수한 것은 아래 둘이며, 둘 다 원칙 위반이 아니라 **선택**이다.

| 무엇 | 왜 감수하는가 | 대안을 기각한 이유 |
| --- | --- | --- |
| `photos`가 담는 값이 `Photo[]`에서 묶음으로 바뀐다 | 한계를 값에서 떼어낼 수 없게 하려고(FR-024) | `SignalValue`에 네 번째 갈래를 더하면 002·003의 모든 판정이 영향받는다 |
| 좌표를 사진마다 따로 묻는다 | `AssetMetadata`에 좌표가 없다 | 일괄 조회 API가 없다. 상한이 비용을 묶는다 |
