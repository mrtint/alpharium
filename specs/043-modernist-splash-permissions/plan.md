# Implementation Plan: Modernist 디자인 시스템 적용 1차 — 스플래시·권한 요청 흐름

**Branch**: `043-modernist-splash-permissions` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/043-modernist-splash-permissions/spec.md`

## Summary

스플래시 화면(1k 마크업)과 그 직후 권한 요청 흐름 두 화면만 Modernist
디자인 시스템으로 새로 그린다. 색 토큰(`src/ui/theme/tokens.ts`)을
Modernist 팔레트로 전면 교체하고, `LogoScreen.tsx`를 마크업 레이아웃으로
새로 작성하며, `OnboardingScreen.tsx`는 사진·위치·알림 세 단계에서 목적
설명 카드와 [허용]/[건너뛰기] 버튼을 걷어내고 OS 다이얼로그 연속 자동
호출로 바꾼다. 배터리 최적화 예외 단계는 기존 021 화면 구조(안내+버튼)를
그대로 두고 시각 스타일만 바꾼다. 로직 계층(`src/onboarding/decision.ts`
등)은 `requirements.ts`의 `battery-exception.platforms` 필드 한 줄(FR-017)
외에는 무변경이다.

## Technical Context

**Language/Version**: TypeScript (strict), React Native 0.86.2, Expo ~57.0.9

**Primary Dependencies**: React Native 코어 컴포넌트(`View`/`Text`/`Pressable`),
NativeWind(tailwind 토큰 자동 상속), 기존 `src/onboarding/`·`src/firstrun/`
순수 로직, `expo-media-library`/`expo-location`/`expo-notifications`/
`expo-intent-launcher`(021이 이미 씀 — 새 의존성 없음).

**Storage**: N/A(이 스펙은 새 영속 데이터를 만들지 않음. 기존
`onboarding.json` 읽기 전용 소비).

**Testing**: `npm run test:ui`(`.tsx` 화면, jest-expo) +
`npm run test:logic`(`.ts` 토큰 값 계약, node) + Maestro
(`.maestro/unified-permission-onboarding.yml` 등 회귀) — 실기기 dev/debug
최소 1회.

**Target Platform**: Android 실기기(dev/debug, SM-S901N) — 이번 개발
환경에서 검증 가능한 범위. 코드 자체는 플랫폼 무관(FR-017 근거).

**Project Type**: Mobile app (Expo/React Native), 단일 저장소.

**Performance Goals**: N/A(시각 재구현, 성능 목표 없음). 기존 온보딩 흐름의
반응성(각 단계 전환이 눈에 띄게 지연되지 않음)만 유지.

**Constraints**: 새 네이티브 의존성 추가 금지(FR-016). 로직 계층
(`src/diary/`, `src/models/`, `src/firstrun/`, `src/schedule/`,
`src/signals/`, `src/vision/`, `src/inference/`, `src/app/`,
`src/onboarding/decision.ts`) 무변경(FR-014, 예외는 FR-017 한 줄).
`src/ui/`의 기존 경계 검사(`checkSourceFile`) 유지(FR-015). WCAG AA 대비
전 항목 통과(FR-012, SC-005).

**Scale/Scope**: 화면 2개(`LogoScreen.tsx`, `OnboardingScreen.tsx`) 전면
재작성 + 토큰 파일(`tokens.ts`) 값 교체 + `Button.tsx` variant 배경 조정 +
`requirements.ts` 1줄 수정.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 I (온디바이스가 제품)**: 해당 없음 — 이 스펙은 추론 경로를
  건드리지 않는다. PASS.
- **원칙 II (화자는 휴대폰)**: 해당 없음 — 프롬프트·일기 생성 로직
  무변경. PASS.
- **원칙 III (캐릭터는 모델 위에 선다)**: 해당 없음 — 캐릭터·모델 매핑
  무변경. PASS.
- **원칙 IV (측정 장치를 제품에 들이지 않는다)**: 스플래시의 로딩 점은
  정적 장식이며 실제 진행률을 계산하지 않는다(FR-005, R4). `Onboarding`
  화면도 새 진행률 계산을 추가하지 않는다(기존 `doneCount/total` 문구는
  021이 이미 검증한 것을 그대로 재사용, 변경 없음). PASS.
- **원칙 V (관측된 사실과 추측을 구분)**: 색 토큰 값은 마크업에서 직접
  추출한 사람이 정한 상수이고(COLORS는 여전히 `as const` 리터럴, DT1
  유지), WCAG 대비는 `contrastRatio()`로 실측했다(research.md R2, 실제
  node 계산값 기록). PASS.
- **Governance (원칙을 어기려면 헌법을 먼저 고친다)**: 이 스펙이 요구하는
  변경 중 헌법 개정이 필요한 것은 없다 — FR-017(`platforms` 필드 정정)은
  버그 수정이지 새 정책이 아니다. PASS.

**결과: 위반 없음. Complexity Tracking 불필요.**

## Project Structure

### Documentation (this feature)

```text
specs/043-modernist-splash-permissions/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물 (완료)
├── data-model.md         # Phase 1 산출물
├── quickstart.md         # Phase 1 산출물
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 산출물 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── ui/
│   ├── theme/
│   │   └── tokens.ts              # [MODIFY] COLORS 값 전면 교체 (키는 불변)
│   ├── components/
│   │   ├── Button.tsx             # [MODIFY] primary variant 배경 accent→danger
│   │   └── Text.tsx                # [READ] 변경 없음 — AppText variant 재사용
│   ├── LogoScreen.tsx              # [REWRITE] 1k 마크업 레이아웃
│   └── OnboardingScreen.tsx        # [REWRITE] 세 단계 즉시 호출 + 배터리 단계 유지
├── onboarding/
│   ├── requirements.ts             # [MODIFY] battery-exception.platforms 1줄
│   └── decision.ts                 # [NO CHANGE]
└── firstrun/                       # [NO CHANGE]

__tests__/
├── theme-tokens.test.ts            # [VERIFY] DT4 대비 검증 그대로 통과해야 함
└── (LogoScreen/OnboardingScreen 화면 테스트는 .tsx test:ui 프로젝트)

.maestro/
└── unified-permission-onboarding.yml  # [REGRESSION] 021 흐름 재검증 대상
```

**Structure Decision**: 기존 저장소 구조(`src/ui/`, `src/onboarding/`)를
그대로 따른다. 새 디렉터리를 만들지 않는다 — 이 스펙은 화면 2개의 재작성과
토큰 값 교체에 한정된다.

## Complexity Tracking

*(해당 없음 — Constitution Check 위반 없음)*
