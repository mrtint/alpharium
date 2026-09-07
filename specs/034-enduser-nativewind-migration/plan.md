# Implementation Plan: 엔드유저 화면 전체를 NativeWind/토큰으로 이관

**Branch**: `034-enduser-nativewind-migration` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/034-enduser-nativewind-migration/spec.md`

## Summary

032가 세운 디자인 토큰(`src/ui/theme/tokens.ts`)·재사용 컴포넌트 7종과 033이 확립한 "className + 토큰 style 병행" 이관 패턴을, 아직 `className`이 없는 **엔드유저 화면 4개**(`AuthorPicker`·`BuildErrorScreen`·`OverwriteConfirmScreen`·`PermissionsSection`)에 적용한다. 표현만 바꾼다 — 문안·`testID`·순수 함수 로직은 전부 불변이고, 기존 `__tests__/ui/*.test.tsx` 4개가 한 글자도 안 바뀐 채 통과하는 것이 1차 계약이다.

**Clarify 2026-09-07 확정**:
- **일괄 이관**(OQ-1) — 네 파일을 한꺼번에 옮기고 `npm test` 통과 후 실기기 Maestro 회귀 1회. tasks.md는 "이관"·"검증" 두 단계.
- **`App.tsx` 조립부가 설정 탭 좌우 여백 소유**(OQ-2) — `PermissionsSection`의 좌우 padding을 걷어내고 `settingsSection`(`paddingHorizontal: 20`) 래퍼로 감싼다. `App.tsx` 1곳 변경.
- **`PermissionsSection`에 `Card`·`Section`/`SectionHeader` 실제 적용**(OQ-3) — 032가 만들고 안 쓰던 컴포넌트를 처음 쓴다. `Card`의 `padding: 16`·배경·border로 인한 레이아웃 변화는 아래 [research 결정 R3]에서 확정.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86.2 (Expo SDK ~57.0.9)

**Primary Dependencies**: NativeWind v4.2 (className→style, Metro 시점 변환), `react-native-reanimated` 4.5.1 (033이 `Button`·`ListRow` 눌림 피드백에 사용 — 이 스펙은 추가 안 함). 디자인 토큰은 `src/ui/theme/tokens.ts`.

**Storage**: N/A — 이 스펙은 저장 계층을 건드리지 않는다. 표현만 바꾼다.

**Testing**: jest 두 프로젝트 — `.ts`(logic, node 환경) / `.tsx`(ui, `jest-expo`). `npm test` 전체, `npm run test:ui` 화면만, `npm run lint`(eslint + tsc + `scripts/check-constitution.mts` + prettier). 실기기: Maestro(`npm run test:device`), SM-S901N debug 1회.

**Target Platform**: Android (SM-S901N/Galaxy S22 실기기 검증). 라이트 모드 고정(031).

**Project Type**: React Native mobile app — 단일 프로젝트, `src/ui/`가 화면 계층.

**Performance Goals**: N/A — 표현 이관. 추론·렌더 성능 목표 없음.

**Constraints**:
- 문안·`testID`·`accessibilityRole`/`State`/`Label` 문자 그대로 유지.
- 행 높이·세로 여백 불변 (`AuthorPicker` `paddingVertical: 12`, `OverwriteConfirmScreen` `padding: 24`·`gap: 16`, `BuildErrorScreen` `padding: 32`·`gap: 12`). `PermissionsSection`은 OQ-2·OQ-3으로 레이아웃이 의도적으로 바뀌며 Maestro 회귀로 검증.
- `src/ui/`가 `models/roster`·`ModelAsset`·`diary/prompt`에 닿지 않는다 (`checkSourceFile`).
- `useColorScheme`·`Appearance`·`dark:` variant 미사용 (031 라이트 고정).
- 색·간격·타이포는 `src/ui/theme/tokens.ts` 단일 출처.
- 새 컴포넌트 0개, 새 네이티브 모듈 0개.
- `main` 직접 작업 금지 — `034-enduser-nativewind-migration` 브랜치 + PR.

**Scale/Scope**: 4개 파일 (`AuthorPicker` 87줄, `BuildErrorScreen` 37줄, `OverwriteConfirmScreen` 55줄, `PermissionsSection` 240줄) + `App.tsx` 설정 탭 조립부 1곳. 기존 테스트 4개 무수정 통과 + 새 계약 테스트(이관 불변식) 1~2개 스위트.

## Constitution Check

*GATE: Phase 0 research 전 통과, Phase 1 design 후 재확인.*

이 스펙은 **표현(스타일)만 바꾸는 리팩터**다. 도메인 로직·프롬프트·판정·저장·추론에 한 줄도 손대지 않는다. 헌법 원칙 대비:

| 원칙 | 게이트 | 이 스펙의 준수 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | 추론 경로·모델 저장을 안 건드린다 | ✅ 대상 4파일 중 추론·모델에 닿는 것 0개. `git diff`에서 `src/inference/`·`src/models/` 0줄 (SC-009) |
| **II. 화자는 휴대폰, 시야는 좁다** | 프롬프트·화자 규칙 불변 | ✅ `diary/prompt`에 닿지 않는다 (`UI_TOUCHES_PROMPT`). `OverwriteConfirmScreen`이 `entry` 없이 날짜만 그리는 계약(X1) 유지 — FR-008 |
| **III. 모델은 캐릭터다** | 화면이 모델을 모른다. 식별자·크기·양자화 미노출 | ✅ 대상 4파일이 `models/roster`·`ModelAsset`·`diary/persona`에 닿지 않는다 (지금도 안 닿음 — `author-picker.test.tsx`가 이미 잠금). `AuthorPicker`는 persona 이름·소개를 **props로만** 받고, `BuildErrorScreen`은 환경 변수 이름을 안 보인다(S10), `OverwriteConfirmScreen`은 모델 식별자·캐릭터 내부 키 없음(X3), `PermissionsSection`은 `expo-*`를 직접 import 안 하고 포트를 주입받는다 |
| **IV. 측정 장치를 제품에 안 들인다** | 점수·비교·채점·진행률·경과시간 미도입 | ✅ 스타일 이관이라 지표 코드가 생길 자리 없음. `OverwriteConfirmScreen`의 "진행률·경과시간 없음"(X2) 유지 — FR-008. `tokens.ts`의 `contrastRatio`는 빌드 시 팔레트 검증용이지 모델 채점이 아님(032가 이미 확립) |
| **V. 관측된 사실과 추측을 구분** | 사람이 정한 상수를 코드가 재판정하지 않는다 | ✅ 색·간격·타이포는 `tokens.ts`의 사람이 정한 상수. 이관이 값을 계산하거나 조건 분기하지 않는다. `PERMISSION_REQUIREMENTS`(`PermissionsSection`이 props로 받음)는 021이 못 박은 `readonly` 상수 — 이관이 안 건드림 |

**추가 게이트 (032·033이 세운 경계)**:
- `checkSourceFile`의 `UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`·`UI_TOUCHES_PROMPT` 위반 0 — `npm run lint`가 자동 검사.
- `dark-mode-no-scheme.test.ts`가 `src/ui/*` 전역에서 `useColorScheme`·`dark:` 0을 검사 — 이관이 이걸 깨면 즉시 잡힌다.
- `theme-tokens.test.ts`가 `COLORS_DARK`·`darkColors` 토큰 부재를 검사.
- `jest-projects.test.ts` 파일 수 가드 — 새 `.tsx` 테스트는 ui 프로젝트에 잡혀야 한다.

**결론 (Phase 0 전)**: 위반 없음. Complexity Tracking 불필요.

**Phase 1 design 후 재확인**: research.md·data-model.md·contracts·quickstart 작성 후 재검토 — 여전히 위반 없음.
- R2가 `AuthorPicker`를 `SelectRow`로 바꾸지 않기로 한 것은 **문안 불변(원칙 III 페르소나 표시 문안)을 지키기 위한** 결정 — 헌법을 강화하는 방향.
- R3의 `Card` 행 래핑은 순수 시각 변화. `Card`는 도메인 import 0인 `View` 래퍼(032가 이미 계약 검증). 화면이 모델을 아는 경로를 새로 만들지 않는다.
- R4의 `App.tsx` 1곳 변경은 조립부의 `View` 래퍼 추가 — 조립 계층은 원래 화면과 배선을 잇는 자리이고(원칙 III 주석: "화면이 모델을 아는 것과 진단이 아는 것은 다르다 — 조립이 대응을 읽어 문자열로"), 여기서는 스타일 래퍼만 더하므로 그 경계와 무관.
- 신규 `enduser-screen-migration.test.tsx`는 소스를 읽어 검사하는 계약 테스트 — `check-constitution.mts`가 설정 위반을 잡듯 이관 불변식을 잡는다. 모델 출력을 채점하지 않는다(원칙 IV 무관).

## Project Structure

### Documentation (this feature)

```text
specs/034-enduser-nativewind-migration/
├── plan.md              # 이 파일 (/speckit-plan)
├── research.md          # Phase 0 — 이관 방식·컴포넌트 선택·Card 레이아웃 결정
├── data-model.md        # Phase 1 — "엔티티"가 없으므로 이관 대상 파일별 스타일 인벤토리
├── quickstart.md        # Phase 1 — 검증 실행 가이드 (npm test + Maestro + 육안)
├── contracts/
│   └── enduser-screen-migration.md   # 이관 불변식 (ES1~ESn) — 033 CS 계약 상속
├── checklists/
│   └── requirements.md  # /speckit-specify 산출 (이미 있음)
└── tasks.md             # Phase 2 (/speckit-tasks — 이 명령이 만들지 않음)
```

### Source Code (repository root)

```text
src/ui/
├── AuthorPicker.tsx            # [이관] 설정 탭 "일기 작성자" — DayPicker 방식(AppText+토큰+병행)
├── BuildErrorScreen.tsx        # [이관] 환경 판정 실패 — 전면 교체
├── OverwriteConfirmScreen.tsx  # [이관] 덮어쓰기 확인 — 전면 교체
├── PermissionsSection.tsx      # [이관] 설정 탭 "권한" — Card+Section 적용 (OQ-3), 좌우 padding 제거 (OQ-2)
├── components/
│   ├── Text.tsx                # (무변경) AppText
│   ├── Button.tsx              # (무변경) 눌림 피드백 내장
│   ├── Card.tsx                # (무변경) Card / Section — PermissionsSection이 처음 사용
│   ├── SectionHeader.tsx       # (무변경) AppText sectionTitle 래퍼
│   └── theme/tokens.ts         # (무변경) 단일 출처
└── ...

App.tsx                        # [1곳 변경] SettingsScreen 조립부 — PermissionsSection을 settingsSection 래퍼로 감쌈 (OQ-2)

__tests__/ui/
├── author-picker.test.tsx           # (무수정 통과 — 1차 계약)
├── build-error.test.tsx             # (무수정 통과)
├── overwrite-confirm.test.tsx       # (무수정 통과)
├── permissions-section.test.tsx     # (무수정 통과)
└── enduser-screen-migration.test.tsx  # [신규] 이관 불변식 계약 (ES1~ESn)

.maestro/
├── diary-character-select.yml        # AuthorPicker 회귀 (author-picker·author-option-N)
├── writing-flow-simplified.yml       # AuthorPicker·OverwriteConfirm 회귀
├── generate-diary.yml                # OverwriteConfirm 회귀
├── past-day-diary.yml                # OverwriteConfirm 회귀
├── photo-selection-over-limit.yml    # OverwriteConfirm 회귀
├── writing-monologue-expansion.yml   # OverwriteConfirm 회귀
├── model-acquisition.yml             # AuthorPicker "일기 작성자" 문자열 회귀
├── parallel-model-download.yml       # AuthorPicker 회귀
└── skeleton.yml                      # OverwriteConfirm 회귀
# PermissionsSection·BuildErrorScreen을 직접 지나는 흐름은 없음 (육안 검증)
```

**Structure Decision**: 단일 RN 프로젝트. 변경은 `src/ui/`의 4개 화면 파일 + `App.tsx` 조립부 1곳 + 신규 계약 테스트 1스위트로 국한된다. `src/ui/components/`·`tokens.ts`는 무변경(공용 컴포넌트를 이 스펙 하나 때문에 고치지 않는다 — 033 CS10 원칙). 도메인 계층(`src/diary/`·`src/models/`·`src/inference/`·`src/signals/`·`src/vision/`·`src/schedule/`·`src/onboarding/`)은 0줄.

## Phase 0: Research — `research.md`

해소할 결정 5가지 (spec의 OQ-3 세부 + 이관 방식 세부):

- **R1 — 각 화면의 이관 방식** (DayPicker 방식 vs `SelectRow` vs 전면 교체)
- **R2 — `AuthorPicker`를 `SelectRow`로 바꿀 수 있는가** (문안·testID 제약)
- **R3 — `PermissionsSection`의 `Card`/`Section` 적용 형태** (spec OQ-3의 ㉮/㉯/㉰)
- **R4 — 설정 탭 좌우 여백 이관 방식** (OQ-2 구현 세부)
- **R5 — 새 계약 테스트의 범위** (033 CS 계약을 어디까지 상속·추가)

## Phase 1: Design & Contracts

- **`data-model.md`** — 데이터 엔티티가 없으므로 **이관 대상 4파일의 현행 스타일 인벤토리**(어떤 `StyleSheet` 키가 어떤 토큰·className으로 가는지)를 표로 정리. `App.tsx` 변경 지점도.
- **`contracts/enduser-screen-migration.md`** — 033 `character-screen-migration.md`의 CS 계약을 상속해 ES1~ESn 불변식. 화면별로 문자열·testID·순수 함수·props 타입·원칙 III 경계·원시 hex 0·Maestro 흐름을 잠근다. `PermissionsSection`은 `Card`/`Section` 사용 + 좌우 여백 이관을 추가로 잠근다.
- **`quickstart.md`** — `npm run test:ui` → `npm test` → `npm run lint` → 실기기 Maestro 회귀(순서: `pm clear` 안 쓰는 흐름 먼저, `unified-permission-onboarding.yml`은 맨 마지막) → 육안 체크리스트(설정 탭 톤·덮어쓰기 확인·빌드 오류 화면).

## Complexity Tracking

> Constitution Check 위반 없음 — 이 절 비움.
