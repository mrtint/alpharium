# Implementation Plan: 초기 권한 획득과 첫 실행 흐름 재설계

**Branch**: `040-onboarding-parallel-setup` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/040-onboarding-parallel-setup/spec.md`

## Summary

첫 실행 경험을 4단계 게이트로 재구성한다: (1) 전체화면 로고 → 권한 항목별
목적 설명(타이머 자동 전환) + 시스템 팝업을 순차로 띄우는 새 온보딩 화면(021
흡수, 배터리 예외 포함) → (2) 권한 결정 종료 즉시 필수 에셋(029) 다운로드를
백그라운드로 시작하면서 캐릭터 작명 화면(035 흡수)을 동시에 띄움 → (3) 작명
완료 **AND** 다운로드 완료가 모두 충족되면 035의 liveness 확인 → (4) liveness
통과 시 사용자 조작 없이 그날 첫 일기를 자동 생성(파이프라인 직접 호출, 020의
스케줄 판정과 무관). 기존 021·029·035 순수 로직(`requirements.ts`·
`essential-assets.ts`·`liveness.ts`·`naming.ts`)은 그대로 재사용하고, 이
스펙은 그 조립 순서(`App.tsx`의 게이트 로직)와 021 화면(`OnboardingScreen`
스텝 사이 자동 전환), 그리고 게이트 이후의 "자동 일기 생성" 단계 하나만
새로 만든다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React Native 0.86 / Expo SDK 57

**Primary Dependencies**: 기존 재사용 — `src/onboarding/`(021)·
`src/welcome/`(035)·`src/app/essential-assets-port.ts`(029)·
`src/diary/pipeline`·`src/config/day-boundary`. 새 네이티브 의존성 없음.

**Storage**: 기존 `preferences/onboarding.json`(021 `OnboardingFlag`) +
`preferences/character-names.json`(035) 재사용. 새 저장 파일 없음 — 이
스펙의 신규 상태(단계 간 조율)는 화면 로컬 상태 또는 기존 플래그 조합으로
표현한다(FR-011의 "이어가기"는 021·035가 이미 하는 실시간 재판정 패턴을
따른다).

**Testing**: `npm run test:logic`(순수 로직, `.ts`) / `npm run test:ui`
(화면, `.tsx`, jest-expo) / `npm run test:device`(Maestro, 실기기 있을 때만)

**Target Platform**: Android 실기기(dev debug 빌드). 시뮬레이터 불가(추론이
온디바이스 전용).

**Project Type**: Mobile app (단일 Expo/React Native 프로젝트, `src/` 아래
기능별 모듈)

**Performance Goals**: SC-002 — 권한 결정 종료 → 작명 화면 표시까지 수 초
이내(모델 전체 다운로드 시간과 뚜렷이 구분). 새 수치 목표를 만들지 않는다
(헌법 원칙 IV — 측정 코드를 제품에 넣지 않는다).

**Constraints**: 헌법 원칙 III·IV 경계 유지 — 이 흐름의 화면·문구는 모델
식별자·진행 속도 지표를 노출하지 않는다(FR-012). 021·035의 기존 헌법 검사
(`checkOnboardingFile`·`checkWelcomeFile`)가 막는 import 경계를 그대로
지킨다.

**Scale/Scope**: 화면 3~4개 재배선(로고 화면 신규 1개, 온보딩 화면 스텝 전환
로직 수정, 작명 화면 게이트 조건 변경, `App.tsx` 게이트 순서 확장) + 자동
첫 일기 생성 트리거 함수 1개 신규.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 I (온디바이스가 제품)**: 위반 없음 — 이 스펙은 추론 트리거 시점만
  바꾸고 추론 자체(모델·프롬프트·샘플링)는 건드리지 않는다.
- **원칙 II (화자는 휴대폰)**: 위반 없음 — 자동 생성이 부르는 것은 기존
  `pipeline.run()`이며 프롬프트 로직은 무변경.
- **원칙 III (모델은 캐릭터다)**: 위반 없음 — 최초 실행 기본 캐릭터 자동
  다운로드는 1.3.0 개정이 이미 허용한 예외이고, 이 스펙은 그 트리거 시점만
  옮긴다. 화면에 모델 식별자를 노출하지 않는 021·035의 경계를 그대로
  유지한다(FR-012).
- **원칙 IV (측정 장치를 제품에 들이지 않는다)**: 위반 없음 — 035의
  liveness 계약(L1-L16, 결과 2갈래·payload 없음)을 그대로 재사용하고 새
  채점·비교 코드를 만들지 않는다. SC-002의 "수 초 이내"는 코드에 임계값을
  두지 않고 실기기 관찰로 확인한다(자동 재시도 루프·타이머 카운트다운 UI를
  만들지 않는다 — FR-001의 "몇 초간 보여주고"는 고정 지연값이지 측정
  로직이 아니다).
- **원칙 V (관측된 사실과 추측 구분)**: 위반 없음 — 새 상태(진행 단계)는
  실시간 재판정이며 별도 히스토리를 쌓지 않는다(021의 `checkOnboardingFile`
  `FLAG_GROWS_HISTORY` 패턴을 신규 코드에도 적용).

**결론**: 게이트 통과. Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/040-onboarding-parallel-setup/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── onboarding/                  # 021 — 재사용, 화면 전환 방식만 변경
│   ├── requirements.ts          # 무변경 — PERMISSION_REQUIREMENTS 4갈래
│   ├── decision.ts              # 무변경 — planOnboardingSteps 재사용
│   ├── essential-assets.ts      # 무변경 — 029 필수 에셋 판정
│   ├── flag.ts                  # 무변경 — OnboardingFlag 3 boolean
│   └── flag-port.ts             # 무변경
├── welcome/                     # 035 — 재사용, 게이트 조건만 변경
│   ├── liveness.ts              # 무변경 — LivenessOutcome 2갈래
│   ├── decision.ts              # 확장 — shouldShowWelcome이 다운로드
│   │                             # 진행 중에도 true를 내도록 조건 완화
│   ├── naming.ts                # 무변경
│   └── names-port.ts            # 무변경
├── firstrun/                    # 신규 — 040 전용 조율 계층
│   ├── progress.ts              # 작명 완료 여부 + 다운로드 완료 여부를
│   │                             # 합쳐 "다음 화면이 무엇인가"를 판정하는
│   │                             # 순수 함수(FR-005~007)
│   ├── auto-diary.ts            # liveness 통과 후 그날 첫 일기를
│   │                             # pipeline.run()으로 트리거(FR-008/009)
│   └── logo.ts                  # 로고 화면 노출 조건(1회, 최초 실행 전용)
├── app/
│   ├── essential-assets-port.ts # 무변경 — downloadEssentials() 재사용
│   └── wiring.ts                # 확장 — firstrun 트리거를 위한 배선 추가
└── ui/
    ├── LogoScreen.tsx           # 신규 — 전체화면 로고(FR-001)
    ├── OnboardingScreen.tsx     # 수정 — 스텝 간 자동(타이머) 전환,
    │                             # 배터리 예외 스텝 순서 내 포함(FR-001/002)
    └── WelcomeScreen.tsx        # 수정 — 다운로드 미완료 상태에서도 렌더,
                                  # 완료 후 대기 화면으로 자연 전환(FR-006/007)

App.tsx                          # 게이트 로직 확장 — 로고 → 온보딩 →
                                  # (작명 ∥ 다운로드) → liveness → 자동
                                  # 생성 → 탭. 기존 3단 게이트에 로고 앞단과
                                  # 자동 생성 트리거를 추가.

__tests__/
├── firstrun/                    # 신규 순수 로직 테스트(.ts, node 환경)
└── ui/                          # 신규 화면 테스트(.tsx, jest-expo)

.maestro/
└── first-run-flow.yml           # 신규 — 로고부터 홈 화면 첫 일기 확인까지
                                  # 실기기 흐름 1개(run-device-tests.mjs 등록 필요)

scripts/constitution-rules.ts    # 확장 — checkFirstRunFile 규칙 추가
                                  # (src/firstrun/ → models/roster 직접 접근,
                                  # diary/prompt 직접 접근 차단 등 021/035와
                                  # 같은 경계 패턴)
```

**Structure Decision**: 기존 021(`src/onboarding/`)·035(`src/welcome/`)·
029(`src/app/essential-assets-port.ts`)의 순수 판정 로직은 그대로 두고,
이 스펙 고유의 조율(작명↔다운로드 병렬 상태 판정, liveness 이후 자동 생성
트리거, 로고 노출)만 새 `src/firstrun/` 모듈에 둔다. 021·035가 각자
`src/{onboarding,welcome}/` 안에서 제품 계층(`models/roster`·`diary/prompt`
등)을 직접 만지지 못하게 막은 것과 같은 이유로, `src/firstrun/`도 같은
경계 헌법 검사를 새로 받는다 — "화면 배선"이라는 이유로 그 안에서 파이프라인
호출·모델 매핑을 직접 하면 021/035가 지켜온 계층 분리가 040에서 새는
지점이 된다. `App.tsx`(조립 계층, 기존에도 onboarding/welcome을 배선하던
자리)가 `src/firstrun/`의 순수 판정과 `app/essential-assets-port.ts`·
`diary/pipeline`을 이어 붙인다.

## Complexity Tracking

*(Constitution Check 통과 — 해당 없음)*
