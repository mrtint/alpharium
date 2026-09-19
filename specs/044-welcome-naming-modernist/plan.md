# Implementation Plan: Modernist 디자인 시스템 적용 2차 — 첫 만남 및 캐릭터 작명

**Branch**: `044-welcome-naming-modernist` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/044-welcome-naming-modernist/spec.md`

## Summary

`WelcomeScreen.tsx` 화면 하나만 Modernist 시각 언어로 재작성한다. 작명 화면
(`welcome` 단계)은 좌측 정렬 카드형(리뷰 보드 화면 `1a`) — 굵은 제목·본문,
이름 입력줄, 확정/건너뛰기 버튼 가로 배치. 확인 중(`checking`)·실패(`failed`)
단계는 043 `LogoScreen`과 같은 중앙 정렬 미니멀 레이아웃으로 시각적으로
구분한다(2026-09-19 클래리파이 결정). 화면 계약(`WelcomeScreenProps`)·
`testID`·기존 로직(035 이름 검증, 040 병렬 다운로드 트리거)은 전혀 건드리지
않는다 — 043과 마찬가지로 색·타이포그래피·레이아웃만 바꾸는 시각 전용
스펙이다. `src/ui/theme/tokens.ts`에 새 토큰을 추가하지 않고 043이 이미
이관한 `COLORS.*` 9개 역할만 재사용한다.

## Technical Context

**Language/Version**: TypeScript (strict), React Native 0.86.2, Expo ~57.0.9

**Primary Dependencies**: React Native 코어 컴포넌트(`View`/`Text`/
`TextInput`/`ActivityIndicator`), NativeWind(tailwind 토큰 자동 상속),
기존 `src/ui/components/Button.tsx`·`Text.tsx`(043이 이미 Modernist화).
새 의존성 없음.

**Storage**: N/A — 이 스펙은 새 영속 데이터를 만들지 않는다. 화면은 여전히
문자열과 콜백만 받는다(원칙 III, W12).

**Testing**: `npm run test:ui`(`.tsx` 화면, jest-expo, 기존
`__tests__/ui/welcome-screen.test.tsx` 전량 재사용) + `npm run test:logic`
(토큰 값 계약, 043이 만든 `__tests__/theme-tokens.test.ts` 무변경 재검증) +
Maestro(`.maestro/welcome-naming.yml` 회귀) — 실기기 dev/debug 최소 1회.

**Target Platform**: Android 실기기(dev/debug) — 043과 동일 정책, release
재확인 불필요(새 네이티브 의존성 없음, 012 기준).

**Project Type**: Mobile app (Expo/React Native), 단일 저장소.

**Performance Goals**: N/A — 시각 재구현, 성능 목표 없음. 기존 화면 전환
반응성만 유지.

**Constraints**: 새 네이티브 의존성 추가 금지. `WelcomeScreenProps` 시그니처
무변경(FR-003). 이름 입력 상한(12자) 무변경(FR-004). `src/welcome/`·
`src/firstrun/`·`App.tsx`의 조립 로직 무변경(범위 밖). `checkSourceFile`의
`UI_TOUCHES_WELCOME` 규칙 유지(FR-008). WCAG AA 대비는 043이 이미 검증한
`COLORS.*` 값을 재사용하므로 추가 검증 불필요.

**Scale/Scope**: 화면 1개(`WelcomeScreen.tsx`) 전면 재작성. 다른 파일 변경
없음(토큰 파일도 043에서 이미 완성되어 이번 스펙은 읽기만 한다).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 I (온디바이스가 제품)**: 해당 없음 — 추론 경로 무변경. PASS.
- **원칙 II (화자는 휴대폰)**: 해당 없음 — 프롬프트·일기 생성 로직 무변경.
  PASS.
- **원칙 III (캐릭터는 모델 위에 선다)**: 화면은 `characterName` 문자열만
  받고 `Character` 심볼·모델 식별자에 닿지 않는다(기존 W13 계약, 무변경).
  PASS.
- **원칙 IV (측정 장치를 제품에 들이지 않는다)**: 확인 중 화면의 로딩
  표시는 정적 장식이며 진행률을 계산하지 않는다(기존 계약 그대로, FR-007).
  실패 화면은 오류 사유를 노출하지 않는다(기존 W16, FR-006). PASS.
- **원칙 V (관측된 사실과 추측을 구분)**: 색 토큰은 043이 이미 실측
  검증했다(WCAG AA `contrastRatio()`) — 이번 스펙은 새 토큰을 만들지 않고
  그 값을 그대로 재사용한다. 클래리파이에서 확정한 레이아웃 스타일(중앙
  정렬 vs 좌측 정렬)은 043의 기존 코드 두 패턴을 그대로 재사용하는 선택이라
  새로 재야 할 값이 없다. PASS.
- **Governance (원칙을 어기려면 헌법을 먼저 고친다)**: 헌법 개정 불필요 —
  이 스펙은 시각 레이어만 바꾼다. PASS.

**결과: 위반 없음. Complexity Tracking 불필요.**

## Project Structure

### Documentation (this feature)

```text
specs/044-welcome-naming-modernist/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물
├── data-model.md         # Phase 1 산출물
├── quickstart.md         # Phase 1 산출물
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 산출물 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
└── ui/
    ├── theme/
    │   └── tokens.ts              # [NO CHANGE] 043이 이미 완성 — 읽기만 함
    ├── components/
    │   ├── Button.tsx             # [NO CHANGE] 043 Modernist 스타일 재사용
    │   └── Text.tsx               # [NO CHANGE] AppText variant 재사용
    └── WelcomeScreen.tsx          # [REWRITE] 1a 마크업 레이아웃 + 043 중앙정렬 패턴

__tests__/
└── ui/
    └── welcome-screen.test.tsx    # [VERIFY] 기존 계약 전량(W11~W16, FR-012~014) 그대로 통과해야 함

.maestro/
└── welcome-naming.yml             # [REGRESSION] 035 흐름 재검증 대상
```

**Structure Decision**: 043과 동일하게 기존 저장소 구조를 그대로 따른다.
새 디렉터리·새 파일을 만들지 않는다 — `WelcomeScreen.tsx` 한 파일의
재작성에 한정된다. 토큰·컴포넌트(`Button`/`Text`)는 043이 이미 완성했으므로
이번 스펙은 그것을 소비만 한다.

## Complexity Tracking

*(해당 없음 — Constitution Check 위반 없음)*
