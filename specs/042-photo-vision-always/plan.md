# Implementation Plan: 사진이 있는 하루는 VLM을 반드시 거친다

**Branch**: `042-photo-vision-always` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/042-photo-vision-always/spec.md`

## Summary

헌법 v1.7.0 「사진과 시각 처리」를 코드로 옮긴다. **사진을 볼 수 있는데 보지 않는
경로 셋을 닫고**(설정의 「보지 않음」, 「자동」의 내려감, 백그라운드의 강제 `none`),
**깊이 선택을 없앤다**.

방법은 037의 것을 그대로 쓴다 — `VisionSetting`을 `"quick"` 하나로 좁히면
**컴파일 오류가 곧 작업 목록**이 된다. 다만 `tsc`가 침묵하는 자리가 둘 있고
(018 두 갈래의 판별자, 유니온을 되살리는 위반), 그 둘은 계약 테스트가 잡는다.

**새 의존성 0. 새 저장 필드 0. 새 네이티브 모듈 0. 새 헌법 검사 규칙 0.**

## Technical Context

**Language/Version**: TypeScript ~6.0.3

**Primary Dependencies**: Expo ~57.0.14 · React Native 0.86.2 · `llama.rn` ^0.12.8
(전부 기존 — 이 기능이 더하거나 올리는 것이 없다)

**Storage**: `expo-file-system` — 일기는 `files/diary/*.json`, 설정은
`preferences/*.json`. **이 기능은 스키마를 바꾸지 않으며**, `preferences/
vision-setting.json`은 읽는 쪽이 사라질 뿐 파일은 기기에 그대로 둔다(FR-007).

**Testing**: jest ~29.7.0, 두 프로젝트(`logic` 111 스위트 / `ui` 44 스위트) +
Maestro 실기기 흐름 21개

**Target Platform**: Android (dev/debug). 검증 기기 SM-S901N / Galaxy S22 /
Android 16. **release 빌드를 만들지 않는다**(2026-09-09 확정, R10)

**Project Type**: Mobile app (Expo development build — Expo Go로는 실행 불가)

**Performance Goals**: 해당 없음. **이 기능은 속도를 목표로 하지 않는다** —
사진을 보게 되므로 사진 있는 하루는 **느려지는 것이 정상**이다(캡션 시간이 붙는다).
원칙 IV가 금지한 비교·평균을 만들지 않는다.

**Constraints**:

- 한 번에 **엔진 하나만** 열린다(005) — 018의 캡션→준비 순서가 이 제약을 지킨다
- 생성 시간 한도 180초는 `engine.run()` 구간만 감시한다(변경 없음)
- 사진 상한 8장 유지(023, 범위 밖)

**Scale/Scope**: 소스 12~14파일 수정, 2파일 삭제, 테스트 2파일 삭제 + 다수 수정,
Maestro 1흐름 재작성

## Constitution Check

_GATE: Phase 0 이전에 통과해야 하고 Phase 1 이후 재확인한다._

| 원칙                                     | 이 기능과의 관계                                                                                                                                            | 판정 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **I. 온디바이스가 제품이다**             | 추론 경로를 건드리지 않는다. 실패가 텍스트를 반환하지 않는 방어(`VisionOutcome`의 실패 갈래에 캡션 없음) 유지                                               | ✅   |
| **II. 화자는 휴대폰이고 시야는 좁다**    | **강화된다** — 사진을 보게 되므로 시야가 넓어지는 것이 아니라 **실제로 본 것만 쓰게** 된다. 0장/권한없음의 「없다」·「모른다」 구분이 프롬프트까지 유지(C4) | ✅   |
| **III. 모델은 캐릭터다**                 | 시각 모델은 로스터와 무관(011). `IMAGE_TOKENS`의 256이 화면에 안 나오는 방어 유지                                                                           | ✅   |
| **IV. 측정 장치를 제품에 들이지 않는다** | **판정 갈래가 늘지 않고 줄어든다**(`VisionOutcome` 6→5). 깊이 다이얼 제거는 "재지 않은 값을 노출하지 않는다"의 이행                                         | ✅   |
| **V. 관측과 추측을 구분한다**            | 「없다」/「모른다」 구분이 이 기능의 FR-003. 256·1024의 차이를 **재지 않았음**을 research.md가 명시                                                         | ✅   |
| **사진과 시각 처리** (v1.7.0)            | 이 기능이 이행하는 절 자체                                                                                                                                  | ✅   |
| **Governance**                           | **헌법 개정이 선행됐다**(v1.7.0, PR #67). 코드가 헌법을 뒤따른다                                                                                            | ✅   |

**게이트 통과.** 위반 없음 → Complexity Tracking 비움.

### Phase 1 이후 재확인

설계가 원칙을 더 침해하지 않는가:

- **원칙 IV 재확인**: `ResolvedParams`에 `hasPhotos` **필드 하나**를 더한다.
  장수·시간·점수가 아니라 boolean 하나이며, 011이 세운 "임계값 없음"을 유지한다 ✅
- **원칙 I 재확인**: `skipped` 갈래 제거가 "대신 쓸 것"을 만들지 않는다 —
  **줄이는 방향**이다 ✅
- **원칙 III 재확인**: 진단 경로(`GenerationProbe`)에서 인자를 빼는 것이 모델
  정보를 노출하지 않는다 ✅

## Project Structure

### Documentation (this feature)

```text
specs/042-photo-vision-always/
├── plan.md                          # 이 파일
├── spec.md                          # 명확화 2건 반영됨 (FR-004a·FR-012a)
├── research.md                      # Phase 0 — R1~R10
├── data-model.md                    # Phase 1 — E1~E9 + 불변식
├── quickstart.md                    # Phase 1 — 기기 없는 검증 → 위반 주입 → 실기기 D1~D7
├── contracts/
│   └── photo-vision-always.md       # Phase 1 — C1~C9
├── checklists/
│   └── requirements.md              # 16/16 통과
└── tasks.md                         # /speckit-tasks 산출물 (아직 없음)
```

### Source Code (repository root)

```text
src/
├── diary/
│   ├── types.ts                     ★ VisionSetting 축소 — 여기서 tsc가 시작한다
│   ├── request.ts · pipeline.ts     타입만 좁음
│   └── prompt.ts                    「없었다」/「모른다」 두 문구 유지 확인 (FR-003)
├── vision/
│   ├── types.ts                     VisionDepth 축소 + VisionOutcome의 skipped 제거
│   └── vision-port.ts               IMAGE_TOKENS 축소
├── inference/
│   ├── on-device.ts                 depth 삼항 제거 (tsc가 짚는다)
│   └── select.ts                    captionDay 시그니처 (타입만 좁음)
├── app/
│   ├── resolve-generation.ts        ★ R5 제거, hasPhotos 신설 (FR-012a)
│   ├── vision-setting-store.ts      ✗ 파일 삭제
│   └── wiring.ts                    vision 배선 정리
├── schedule/
│   └── task.ts                      ★ 강제 none 분기 제거 (FR-004, 이 기능의 실질)
└── ui/
    ├── VisionPicker.tsx             ✗ 파일 삭제
    ├── DiaryHomeScreen.tsx          ★ 018 두 갈래 판별자 교체 (FR-012)
    └── GenerationProbe.tsx          vision prop 제거 (FR-004a)

App.tsx                              설정 탭 「사진 보기」 섹션 + state 둘 제거

__tests__/
├── app/vision-setting-store.test.ts ✗ 삭제 (대상 없음)
├── ui/vision-picker.test.tsx        ✗ 삭제 (대상 없음)
├── ui/diary-home.test.tsx           ★ 018 갈래 테스트 재작성 (C5)
├── vision/types.test.ts             갈래 수 6→5, VisionDepth 주장 반전
└── (그 외 8파일)                     좁아진 타입에 맞춰 수정

.maestro/photo-vision.yml            ★ 「설정이 없다」로 재작성 (준비 상태 부분 유지)
```

**Structure Decision**: 기존 구조를 그대로 쓴다. **새 디렉터리·새 경계·새 헌법
검사 규칙을 만들지 않는다**(R9) — 020의 `src/schedule/`, 021의 `src/onboarding/`,
040의 `src/firstrun/`처럼 새 판정 계층이 생기는 기능이 아니라, **기존 타입을
좁히고 그 여파를 정리하는** 기능이다.

축소의 시작점은 [src/diary/types.ts](../../src/diary/types.ts)의 `VisionSetting`
한 줄이며, 나머지는 `tsc`가 짚는 자리다.

## 작업 순서 (tasks가 따를 뼈대)

1. **타입을 먼저 좁힌다** — `VisionSetting` → `tsc`가 목록을 뱉는다
2. **`tsc`가 짚은 자리를 위에서 아래로** — 판정(`resolve-generation`) → 파이프라인
   → 화면 → 진단
3. **`tsc`가 못 짚는 둘을 계약 테스트로** — 018 갈래(C5), 유니온 넓히기(C1)
4. **삭제** — 두 소스 파일, 두 테스트 파일, 설정 섹션
5. **Maestro 재작성** — `photo-vision.yml`
6. **위반 주입 7종**(quickstart §2)으로 방어 확인
7. **실기기 dev 1회** — D1~D7, 특히 **D5(백그라운드)·D6(진단)**

## Complexity Tracking

> 헌법 위반 없음 — 비움.
