# Implementation Plan: 작은 글자 대비와 누름 영역 — accent 글자·선택 칸 요일·설정 토글

**Branch**: `088-small-text-contrast-hit-target` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/088-small-text-contrast-hit-target/spec.md`

## Summary

밝은 배경 위 작은 강조 글자 다섯 자리(홈 월 라벨·쓰는 중 상태 줄·쓰는 중 머리말·첫 만남 작명 표지·설정/개발자/진단 묶음 머리)의 색상을 `COLORS.accent`(`#ec3013`, 대비 3.76~3.85:1)에서 `COLORS.danger`(`#ae1800`, 대비 6.41~6.56:1)로 바꿔 일반 글자 AA 기준(4.5:1)을 만족시키고 `src/ui/` 내 글자 스타일 `color: COLORS.accent` 0건을 소스 계약으로 잠근다(UX-07). 주간 스트립(`DayPicker`) 요일 약자의 `opacity: 0.7`을 걷어 선택 칸 요일을 `COLORS.accentForeground`(`#f3f2f2`, 대비 3.76:1)로, 비선택 칸 요일을 불투명 합성 상수 `DAY_STRIP.dowMuted`(`#5f5e5d`, 대비 5.79:1)로 분리하고 글자 불투명도 합성을 금지한다(UX-08). 공용 설정 토글(`Toggle`, 44×26dp)에 `hitSlop={{ top: 9, bottom: 9 }}`를 더해 시각 변화 없이 세로 누름 영역을 44dp로 넓힌다(UX-10).

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 57, React Native 0.86.2, New Architecture)

**Primary Dependencies**: 없음(새 패키지·네이티브 의존성 0, `prebuild` 불필요)

**Storage**: 없음(앱 데이터·설정 파일 형식 불변)

**Testing**: jest `logic`(`__tests__/theme-tokens.test.ts`) 및 `ui`(`__tests__/ui/*.test.tsx`, RNTL 14). 실기기: 안드로이드 `SM-S901N` dev 빌드(화면 밝기 최저 육안 확인, 글꼴 1.0/2.0배 캡처, 토글 슬롭 안팎 좌표 탭 대조, Maestro 층 1 `settings-time-place.yml`·`week-strip-swipe.yml`)

**Target Platform**: Android·iOS 공통 (`src/ui/` 공통 스타일·토큰)

**Project Type**: mobile-app (단일 저장소)

**Performance Goals**: 런타임 색상 계산·불투명도 합성 제거(정적 상수 토큰 참조)

**Constraints**: `COLORS` 9개 역할 키(`DT1`) 불변 · 런타임 색상 함수(`darken` 등) 금지(원칙 V) · 계약 먼저·테스트 먼저 · 한국어 커밋 · 실기기 확인 필수(원칙 V)

**Scale/Scope**: 수정 파일 6개(`src/ui/theme/tokens.ts`, `src/ui/DiaryListScreen.tsx`, `src/ui/WritingPaper.tsx`, `src/ui/WelcomeScreen.tsx`, `src/ui/SettingsScreen.tsx`, `src/ui/DayPicker.tsx`), 테스트 파일 6개(`__tests__/theme-tokens.test.ts`, `__tests__/ui/settings-screen.test.tsx`, `__tests__/ui/writing-in-place.test.tsx`, `__tests__/ui/diary-list.test.tsx`, `__tests__/ui/welcome-screen.test.tsx`, `__tests__/ui/day-picker.test.tsx`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스 | 해당 없음 | 추론 경로를 건드리지 않는다 |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·일기 문구 불변 |
| III. 캐릭터는 모델 위 | 해당 없음 | 모델 식별자·사양과 무관 |
| IV. 측정 장치 금지 | 통과 | `contrastRatio`는 빌드 시 디자인 토큰 상수의 WCAG 대비를 검증하는 순수 함수이며 모델 출력을 채점하지 않는다 |
| V. 관측과 추측 구분 | 통과 | 색·치수는 사람이 정한 상수 리터럴이고, 명암비는 WCAG 공식 계산값으로 명시하며, 완료 전 `SM-S901N` 실기기에서 확인한다 |
| 개발 방식 | 통과 | 계약(`contracts/contrast-and-hit-target.md`) 먼저 → 실패하는 테스트 먼저 → 구현 → 위반 주입 확인 · 한국어 커밋 · 기능 브랜치(`088-small-text-contrast-hit-target`) |

위반 없음 — Complexity Tracking 비움.

**Phase 1 뒤 재확인**: 통과. `data-model.md`와 `contracts/contrast-and-hit-target.md`의 모든 항목이 정적 상수와 소스/컴포넌트 계약 테스트로만 구성된다.

## Project Structure

### Documentation (this feature)

```text
specs/088-small-text-contrast-hit-target/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── contrast-and-hit-target.md   # C1~C7 — 강조 글자·스트립 요일·토글 hitSlop 계약
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/ui/
├── theme/tokens.ts          # DAY_STRIP.dowMuted("#5f5e5d"), SETTINGS.toggle.hitSlop(9)
├── DiaryListScreen.tsx      # 홈 월 라벨(449행)·WRITING_STATE(1015행) → COLORS.danger
├── WritingPaper.tsx         # 쓰는 중 머리말(60행) → COLORS.danger
├── WelcomeScreen.tsx        # 작명 표지 KICKER(326행) → COLORS.danger
├── SettingsScreen.tsx       # Group 묶음 머리(288행) → COLORS.danger, Toggle hitSlop
└── DayPicker.tsx            # DOW opacity 제거, 요일 색상 selected ? accentForeground : DAY_STRIP.dowMuted

__tests__/
├── theme-tokens.test.ts             # DT4 danger/bg ≥ 4.5, DAY_STRIP.dowMuted/bg ≥ 4.5, toggle hitSlop
└── ui/
    ├── settings-screen.test.tsx     # F3 묶음 머리 COLORS.danger, Toggle hitSlop, C2 소스 계약(color: COLORS.accent 0건)
    ├── writing-in-place.test.tsx    # W3 쓰는 중 상태 줄·W2 머리말 COLORS.danger
    ├── diary-list.test.tsx          # 홈 월 라벨 COLORS.danger
    ├── welcome-screen.test.tsx      # 작명 표지 KICKER COLORS.danger
    └── day-picker.test.tsx          # 선택/비선택 요일 색상 및 DOW opacity 0건 계약
```

**Structure Decision**: 새 소스 파일이나 테스트 파일을 늘리지 않고 기존 화면 파일과 각 화면의 대응 계약 테스트 파일에 규칙 C1~C7을 배치한다.

## Complexity Tracking

없음.
