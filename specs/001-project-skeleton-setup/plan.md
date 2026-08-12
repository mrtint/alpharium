# Implementation Plan: 프로젝트 뼈대와 의존성 기반 세우기

**Branch**: `001-project-skeleton-setup` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-project-skeleton-setup/spec.md`

## Summary

앱 코드가 없는 저장소에 **다음 기능이 올라설 바닥**을 만든다. 실기기에서 앱이 뜨고, 네이티브
추론 모듈이 적재되며, 환경이 local/dev/prod로 갈리고, 헌법 위반 설정이 자동 검사로 막히고,
테스트를 먼저 쓸 수 있는 상태까지가 이 기능이다.

기술적 접근의 핵심은 **추론 위치를 고르는 지점을 한 곳으로 모으는 것**(FR-025)이다. 환경 판정
→ 추론 위치 결정 → 어댑터 선택을 하나의 경계 뒤에 두면, 일기 생성 코드는 자신이 어디서 도는지
모른 채로 남고 dev·prod의 온디바이스 강제(FR-012)를 그 한 지점에서 검증할 수 있다. 모델 파일
없이도 `llama.rn`의 백엔드 조회로 모듈 적재를 확인할 수 있어(FR-006), 범위를 넘지 않고 P1을
만족한다.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict), React 19.2.3

**Primary Dependencies**: Expo SDK 57 (`~57.0.9`), React Native 0.86.2, `llama.rn ^0.12.8`
— 헌법 원칙 I이 확정한 기준선. 이 기능에서 버전을 다시 정하지 않는다.

**Storage**: N/A — 이 기능은 영속 데이터를 다루지 않는다. 일기·모델 파일 저장은 범위 밖이다.

**Testing**: `jest-expo ~57.0.4` (기기 불필요 갈래), Maestro (실기기 갈래, 옵셔널)

**Target Platform**: Android 실기기 (arm64-v8a, Android 13 기준 — Galaxy S20+에서 실증됨).
시뮬레이터는 화면·흐름 확인용. iOS는 범위 밖.

**Project Type**: Mobile app (Expo development build). 네이티브 추론 모듈이 필요하므로
Expo Go로 실행 불가.

**Performance Goals**: N/A — 이 기능은 추론을 수행하지 않는다. 속도 목표는 일기 생성 기능에서
정한다.

**Constraints**:
- dev·prod는 온디바이스 추론만 (FR-012). 기기 밖으로 나가는 경로 0건.
- 대체 응답·미리 만든 응답 경로 금지 (헌법 원칙 I).
- 모델 출력 점수화·비교 코드 금지 (헌법 원칙 IV).
- 실기기 테스트는 옵셔널이되 건너뜀을 통과로 집계하지 않는다 (FR-021e).

**Scale/Scope**: 화면 1개(진단), 추론 어댑터 2개(온디바이스/데스크톱 서버), 자동 검사 1개.
엔드유저 기능 0개.

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 후 재확인.*

| 원칙 | 이 기능에서의 판정 | 근거 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | ✅ 통과 | dev·prod는 온디바이스 전용 어댑터만 선택 가능(FR-012). local의 데스크톱 서버는 원칙 I이 MAY로 허용한 경로이며 동일 GGUF·프롬프트·샘플링 제약을 문서로 건다(FR-013). 대체 응답 경로를 만들지 않으며, 서버 연결 실패는 실패로 드러난다. |
| **II. 화자는 휴대폰이다** | ➖ 해당 없음 | 이 기능은 일기를 생성하지 않는다. 프롬프트·화자 규칙은 일기 생성 기능의 몫이다. |
| **III. 모델은 캐릭터다** | ➖ 해당 없음 | 로스터·캐릭터 화면은 범위 밖. 단, 진단 화면이 **개발자 전용**이며 prod에서 감춰지므로(FR-007a) 모델 식별자가 엔드유저에게 노출되지 않는다 — 원칙 III의 노출 금지와 충돌하지 않는다. |
| **IV. 측정 장치를 들이지 않는다** | ✅ 통과 (주의 필요) | 자동 검사는 **설정 위반**을 잡는 것이지 모델 출력을 재지 않는다(FR-028). 진단 화면은 모듈 적재 여부만 보이고 품질 점수를 내지 않는다. 벤치마크·모델 비교 코드를 만들지 않는다. |
| **V. 관측과 추측을 구분한다** | ✅ 통과 | 실기기 테스트를 건너뛴 것과 통과한 것을 구분해 보고한다(FR-021e). 기기 없이 돌린 결과를 온디바이스 검증으로 집계하지 않는다. |
| **개발 방식 — 계약·테스트 우선** | ✅ 통과 | 환경 판정과 추론 위치 선택은 순수 규칙이라 기기 없이 테스트 가능. 계약을 `contracts/`에 먼저 적고 테스트를 먼저 쓴다. |
| **개발 방식 — 한 축 파고들기 금지** | ✅ 통과 | 「범위 밖」 절이 명세에 있고, 이 계획도 그 경계를 넘지 않는다. 추론 어댑터는 인터페이스와 최소 구현까지만. |

**게이트 결과: 통과.** 정당화가 필요한 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-skeleton-setup/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/           # Phase 1 산출물
│   ├── environment.md   # 환경 판정 계약
│   ├── inference.md     # 추론 어댑터 계약
│   └── diagnostics.md   # 진단 보고 계약
├── checklists/
│   └── requirements.md  # 명세 품질 점검표 (완료)
└── tasks.md             # /speckit-tasks 산출물 (이 명령에서 만들지 않음)
```

### Source Code (repository root)

```text
src/
├── config/                 # 환경 판정. 여기서만 process.env를 읽는다
│   ├── environment.ts      # local/dev/prod 판정, 알 수 없는 값 처리 (FR-009a/b)
│   └── policy.ts           # 환경 → 허용 추론 위치 규칙 (FR-010~012)
├── inference/              # 추론 경계. 일기 생성 코드가 보는 유일한 문
│   ├── types.ts            # InferenceBackend 인터페이스 (FR-025)
│   ├── select.ts           # 환경에 따라 어댑터를 고르는 단 한 곳
│   ├── on-device.ts        # llama.rn 어댑터
│   └── desktop-server.ts   # 데스크톱 추론 서버 어댑터 (local 전용)
├── diagnostics/            # 진단 정보 수집·보고 (FR-007a/b, FR-017)
│   ├── report.ts           # 환경·추론 위치·모듈 적재 상태
│   └── sink.ts             # 환경별 출력 경로 (화면/로그)
└── ui/
    └── DiagnosticsScreen.tsx  # local·dev 전용 진단 화면

App.tsx                     # 루트 컴포넌트 (FR-002)
index.ts                    # 진입점 — App 등록으로 교체

scripts/
└── check-constitution.mjs  # 헌법 위반 설정 자동 검사 (FR-026~029)

__tests__/                  # 기기 불필요 갈래 (항상 실행, FR-021c)
├── config/
├── inference/
└── diagnostics/

.maestro/                   # 실기기 갈래 (옵셔널, FR-021d)
└── skeleton.yml
```

**Structure Decision**:

핵심은 **`src/inference/select.ts`가 추론 위치를 고르는 유일한 지점**이라는 것이다(FR-025).
`src/config/policy.ts`가 「환경 → 허용된 추론 위치」 규칙을 순수 함수로 들고 있고,
`select.ts`가 그 규칙에 따라 어댑터를 반환한다. 일기 생성 코드는 `InferenceBackend`
인터페이스만 보므로 자신이 어디서 도는지 모른다.

이 배치가 헌법을 지키는 방식:

- **원칙 I** — dev·prod에서 `desktop-server.ts`가 선택되는 경로가 `policy.ts` 한 곳에만
  존재하므로, 그 한 파일의 테스트로 FR-012를 검증할 수 있다.
- **원칙 IV** — 측정·채점 코드를 둘 자리가 이 구조에 없다(FR-024). `diagnostics/`는 적재
  여부와 환경만 다루고 품질을 재지 않는다. 이 경계를 구조 문서에 명시한다.
- **환경 변수 격리** — `process.env`를 읽는 곳을 `src/config/`로 한정한다. 다른 곳에서
  환경을 다시 판정하면 FR-009a의 단일 판정이 무너진다.

기기 신호 수집(`src/sensors/`)과 일기 생성(`src/diary/`)은 이 기능에서 **만들지 않되 자리만
문서로 예약**한다(FR-023). 빈 폴더를 만들지 않는다.

## Constitution Check — Phase 1 설계 후 재확인

*설계 산출물을 만든 뒤 다시 본다. 설계 과정에서 드러난 것을 반영한다.*

| 원칙 | 재판정 | 설계에서 확인된 것 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | ✅ 통과 | 방어선이 `policy.isLocationAllowed()`의 두 칸(dev·prod × desktop-server = false)으로 좁혀졌다. 순수 함수라 기기 없이 테스트되며(FR-021c) 항상 돈다. 대체 응답 금지는 어댑터 계약에 명시. |
| **II. 화자는 휴대폰이다** | ➖ 해당 없음 | 변화 없음. 일기를 생성하지 않는다. |
| **III. 모델은 캐릭터다** | ✅ 통과 | 설계 중 위험을 하나 발견해 처리했다 — 진단 정보에 모델 식별자를 실을 유인이 생길 수 있어, `DiagnosticReport`에 싣지 않는 것을 계약에 못 박았다(diagnostics.md). |
| **IV. 측정 장치를 들이지 않는다** | ✅ 통과 (경계 명시함) | 위험 지점 두 곳을 확인했다. (1) 진단 화면 — 속도·점수·비교를 넣지 않도록 계약에 명시. (2) 헌법 검사 스크립트 — 확장 유혹이 생기므로 "여기에 출력 품질 검사를 넣지 않는다"를 계약과 소스 주석 양쪽에 남긴다. |
| **V. 관측과 추측을 구분한다** | ✅ 통과 | `TestTier`의 `skipped`가 `passed`와 분리됐다. research.md가 미확인 항목(`getBackendDevicesInfo()` 실기기 반환값)을 추측으로 메우지 않고 명시적으로 남겼고, quickstart가 그것을 관측할 지점을 지정했다. |
| **개발 방식 — 계약·테스트 우선** | ✅ 통과 | 계약 4개가 검증 표를 포함해 먼저 작성됐다. 표의 각 행이 테스트 케이스가 된다. |
| **개발 방식 — 한 축 파고들기 금지** | ✅ 통과 | 어댑터를 `isAvailable()`까지로 끊었다. 추론 호출을 넣으면 일기 생성 축으로 넘어간다. `src/sensors/`·`src/diary/`는 자리만 문서로 예약하고 빈 폴더를 만들지 않는다. |

**게이트 결과: 통과.** Phase 0 판정과 동일하며, 설계 과정에서 원칙 III·IV의 위험 지점을
발견해 계약으로 막았다.

### 설계에서 새로 드러난 사실

1. **`EXPO_PUBLIC_` 값은 엔드유저가 읽을 수 있다** (Expo 공식 문서, research.md §3).
   그래서 FR-014를 "값을 비운다"가 아니라 **"prod 설정에 키 자체를 두지 않는다"**로 구현하고,
   자동 검사가 키의 존재를 본다.
2. **기존 CI가 저장소와 어긋나 있다** (research.md §6). 없는 경로(`src/`, `App.tsx`)를
   참조하고, 이 제품이 지원하지 않는 웹 플랫폼으로 빌드한다. 이 기능에서 함께 고친다.
3. **모델 없이 모듈 적재를 확인할 수 있다** — `getBackendDevicesInfo()`가 모델 인자를 받지
   않는다(research.md §1). FR-006과 FR-008을 동시에 만족하는 길이 실제로 존재함을 확인했다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비움.
