# Implementation Plan: NativeWind + React Native Reusables 기반 미니멀 UI 시스템 도입

**Branch**: `032-nativewind-ui-system` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/032-nativewind-ui-system/spec.md`

## Summary

`src/ui/`의 화면 20여 개가 RN 코어 컴포넌트 + 인라인 `style`/`StyleSheet.create`로
짜여 있고 색·간격·타이포에 공유 규칙이 없어 "기본 안드로이드 앱" 인상이 남는다.
이 스펙은 **NativeWind v4(babel/metro 레이어, 네이티브 링크 없음) + 저장소 소유
재사용 컴포넌트 7종 + 의미론적 디자인 토큰 계층**을 세우고, 엔드유저가 매일 보는
핵심 화면군(온보딩·일기 목록·일기 상세·생성 중·설정 탭)을 그 위로 **한 화면씩
점진 이관**한다. 표현만 바꾸고 기능·문안·네비게이션·데이터 흐름은 불변이다.
031의 라이트 고정을 유지하고(다크 팔레트·색 스킴 감지 없음), edge-to-edge 전용
라이브러리는 도입하지 않는다(둘 다 후속 스펙). 완료 기준은 핵심 5개 화면군
전부 이관 + SM-S928N(One UI 8.5) 실기기 debug 확인 1회(새 네이티브 모듈 없어
release 재확인 불필요).

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict), React 19.2, React Native 0.86.2,
Expo SDK ~57

**Primary Dependencies** (신규):
- `nativewind@^4` + `tailwindcss@^3.4` (`npx expo install`로 버전 해석,
  `expo install --check` 검증 — R1). **네이티브 모듈 아님** — babel 플러그인 +
  Metro 트랜스폼 + JS 런타임(`react-native-css-interop`).
- 신규 설정 파일: `babel.config.js`, `metro.config.js`, `tailwind.config.js`,
  `global.css` (전부 저장소 루트, JS 레이어 — prebuild 불필요)

**Storage**: N/A — 새 저장 필드·신호 없음(spec FR-022). 디자인 토큰은 코드
상수(`src/ui/theme/tokens.ts`).

**Testing**:
- `npm run test:logic` (`.ts`, node 환경) — 토큰 상수·WCAG 대비 계산 검사
- `npm run test:ui` (`.tsx`, `jest-expo`) — 재사용 컴포넌트 계약 + 기존 화면
  테스트 회귀
- `npm run lint` — eslint + `tsc --noEmit` + `check:constitution` + prettier
- `npm run test:device` — Maestro (실기기 있을 때만; 이관마다 관련 흐름)

**Target Platform**: Android 실기기 dev 빌드 (Expo Go 불가 — `llama.rn`).
검증 기기 **SM-S928N (Galaxy S24U, One UI 8.5, Android 16/SDK 36)** — 다크 모드
라이트 고정 확인 포함이므로 필수. SM-S901N(S22)은 회귀 확인 선택.

**Project Type**: Mobile app (single RN/Expo project, `src/ui/` 화면 계층)

**Performance Goals**: 리스타일링이라 추론·생성 성능과 무관. NativeWind는
빌드타임 스타일 처리라 런타임 오버헤드 낮음. 목표: 첫 렌더에 눈에 띄는 지연·
깜빡임 없음(육안).

**Constraints**:
- 새 네이티브 모듈 0 → release 재확인 불필요(spec FR-005·FR-017, 012 기준)
- 031 라이트 고정 유지 — `dark:` variant 미사용, `useColorScheme`/`Appearance`
  미사용(spec FR-019, 031 `dark-mode-no-scheme.test.ts` 확장)
- 본문 텍스트 배경 대비 ≥ 4.5:1, 큰 텍스트 ≥ 3:1 (WCAG AA, spec FR-002/SC-005)
- jest 두 프로젝트(`.ts`=logic / `.tsx`=ui) 분리 유지, `jest-projects.test.ts`
  파일 수 가드 통과(spec FR-014)
- `main` 직접 작업 금지 — `032-nativewind-ui-system` 브랜치, PR 머지
- 홈 화면 흐름·탭 구조 불변(029가 정리한 "일기 쓰기 1탭" — spec FR-021)

**Scale/Scope**:
- 신규: 설정 4파일 + `src/ui/theme/tokens.ts` + `src/ui/components/` 7 컴포넌트
  + 각 계약 테스트 (~8 `.tsx` + ~2 `.ts` 테스트)
- 이관: 핵심 화면군 5개 (`DiaryListScreen`, `DiaryDetailScreen`,
  `DiaryHomeScreen` 생성 중 뷰, `OnboardingScreen` + 에셋 단계, 설정 탭 조립)
- 범위 밖(SHOULD): `CharacterListScreen`, 개발자 탭 4화면

## Constitution Check

*GATE: Phase 0 이전 통과, Phase 1 이후 재확인.*

헌법 v1.3.0 기준. 이 스펙은 **표현 계층만** 바꾸므로 대부분의 원칙과 직접
충돌하지 않는다. 관련 게이트:

| 게이트 | 근거 조항 | 상태 | 비고 |
|---|---|---|---|
| 화면이 모델 식별자·자산에 안 닿는다 | 원칙 III, `checkSourceFile` `UI_TOUCHES_MODEL`/`_ASSET` | ✅ PASS | NativeWind `className`은 이 정규식과 무관. 이관은 표현만 바꿈. 설정 탭 "일기 작성자"는 계속 persona 이름·소개만(`AuthorPicker`). |
| 성능 지표·생성 중인 글 미표시 | 원칙 IV, 005 FR-028b, 015·016 | ✅ PASS | 생성 중 뷰 이관 시 회전 표시 + "그만두기"만 유지(spec FR-011). 진행률 콜백을 `completion()`에 안 넘김 — 기존 구조 불변. |
| 프롬프트 조립에 화면이 안 닿는다 | 원칙 II, `checkSourceFile` `UI_TOUCHES_PROMPT` (022) | ✅ PASS | 재사용 컴포넌트·이관은 `diary/prompt` import 안 함. |
| 색 스킴 감지 안 한다 (라이트 고정) | 031 `dark-mode-no-scheme.test.ts` | ✅ PASS (조치 포함) | NativeWind `darkMode: "class"` + `dark:` 미사용. 031 계약 테스트를 `src/ui/theme/`·`src/ui/components/` `.ts`+`.tsx`까지 확장(Phase 1). |
| 진단 경로가 배포 빌드에서 안 닿는다 | 원칙 III "사용자 화면과 진단 경로" | ✅ PASS | 개발자 탭은 이관 범위 밖. 게이트(`showsOnScreen`) 불변. |
| 건너뛴 실기기 테스트는 통과 아님 | 원칙 V | ✅ 계획 반영 | 핵심 화면군 전부 SM-S928N debug 1회(spec FR-017). Maestro 이관마다(FR-018). |
| 계약 먼저, 테스트 먼저 | 개발 방식 MUST | ✅ 계획 반영 | `contracts/` + 재사용 컴포넌트 `.tsx` 테스트를 구현 전 작성(tasks가 TDD 순서). |
| 커밋 메시지 한국어 | 개발 방식 MUST | ✅ | |
| 한 축을 깊게 파지 않는다 | 개발 방식 | ⚠️ 주의 | "팔레트 완벽 튜닝"에 빠지기 쉬움. R4가 방향만 정하고 최종값은 실기기 육안 1패스로 확정 — 반복 미세조정 금지. |
| 측정 장치를 제품에 안 들인다 | 원칙 IV | ✅ PASS | WCAG 대비 **계산 헬퍼**는 토큰 값 검증용(빌드 시), 모델 출력 채점이 아님. `check-constitution.mts`도 안 건드림. |

**위반 없음.** Complexity Tracking 불필요.

한 가지 명시: **로드맵 20번이 "edge-to-edge를 11번에서 함께"로 미뤄 뒀으나 이
스펙은 명시적으로 제외**한다(spec FR-020, research R9). 이는 헌법 위반이 아니라
로드맵 항목의 범위 조정이며, spec 배경·Clarifications에 근거를 남겼다.

### Post-Design 재확인 (Phase 1 이후)

`contracts/` + `data-model.md` 작성 후 재평가 — **위반 여전히 0**:

| 게이트 | Phase 1 산출물에서 확인 |
|---|---|
| 화면이 모델·자산에 안 닿는다 | `contracts/ui-components.md` UC-C4(도메인 무관 import 0), `contracts/screen-migration.md` SM5(작성자 persona만) |
| 지표·생성 중 글 미표시 | SM3(생성 중 뷰 불변식), SM2(사후 소요시간 1회성 규칙 불변) |
| 프롬프트 조립 무관 | UC-C4, SM 공통 원칙(`checkSourceFile` 위반 0) |
| 색 스킴 미감지 (라이트 고정) | `contracts/build-config.md` BC6(계약 테스트로 잠금), `contracts/design-tokens.md` DT6(다크 값 없음) |
| 계약 먼저·테스트 먼저 | 4개 contract 파일 + 각 계약에 "위반 주입" 명시. tasks가 TDD 순서로 전개 |
| 측정 장치 안 들임 | DT3·DT4의 WCAG 대비 계산은 **토큰 값 빌드 검증**이지 모델 출력 채점 아님 — `check-constitution.mts` 무수정 |
| 실기기 최소 1회 | `quickstart.md` 시나리오 B·D가 SM-S928N debug 확인을 게이트로 명시 |
| 한 축 깊이 파기 금지 | DT1의 색 값은 "방향 예시", 최종은 실기기 육안 **1패스**로 확정 — 반복 미세조정 금지를 plan·data-model·quickstart 세 곳에 못 박음 |

새 헌법 검사 경계·새 네이티브 모듈·새 저장 계층 **0개**(BC9). 031 방어
(`with-force-light-theme.js`·`expo-system-ui`) 무수정. 029가 정리한 흐름·탭
구조 무수정(FR-021).

## Project Structure

### Documentation (this feature)

```text
specs/032-nativewind-ui-system/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — R1~R11 결정
├── data-model.md        # Phase 1 — 디자인 토큰·컴포넌트 계약 모델
├── quickstart.md        # Phase 1 — 검증 시나리오
├── contracts/
│   ├── design-tokens.md      # 토큰 이름·역할·대비 계약
│   ├── ui-components.md       # 재사용 컴포넌트 7종의 prop·변형·testID 계약
│   ├── screen-migration.md    # 이관 시 불변식(기능·문안·네비·testID)
│   └── build-config.md        # babel/metro/tailwind/global.css + 다크 고정 계약
├── checklists/
│   └── requirements.md   # /speckit-specify 생성
└── tasks.md             # /speckit-tasks 출력 (아직 없음)
```

### Source Code (repository root)

```text
# 신규 — 빌드/스타일 기반 (Phase: 1단계)
babel.config.js                    # 신규 — nativewind/babel + jsxImportSource
metro.config.js                    # 신규 — withNativeWind(getDefaultConfig, {input})
tailwind.config.js                 # 신규 — tokens.ts를 require, darkMode:"class"
global.css                         # 신규 — @tailwind base/components/utilities

src/ui/theme/
└── tokens.ts                      # 신규 (.ts) — 색 역할→값, 간격·반경 상수,
                                   #   WCAG 대비 계산 헬퍼. tailwind.config가 require.

src/ui/components/                  # 신규 (.tsx) — 저장소 소유 재사용 컴포넌트
├── Button.tsx                      #   variant: primary|secondary|danger (Pressable)
├── Card.tsx                        #   Card / Section 컨테이너
├── ListRow.tsx                     #   목록 행 (라벨 + 값/액션/chevron), testID prop
├── SectionHeader.tsx               #   섹션 제목
├── Text.tsx                        #   Title / Body / Caption (RN Text 래퍼)
├── Toggle.tsx                      #   RN Switch 래퍼 (accent 색)
└── SelectRow.tsx                   #   값 선택 행 (작성자·자동생성 시각)

# 이관 — 표현만 변경, 기능·문안·testID 불변 (Phase: 2단계)
src/ui/DiaryListScreen.tsx         # 이관 (2a)
src/ui/DiaryDetailScreen.tsx       # 이관 (2b) — 025 슬라이더·갤러리 + 017 표시 유지
src/ui/DiaryHomeScreen.tsx         # 이관 (2c) — screen.kind==="writing" 뷰만
src/ui/OnboardingScreen.tsx        # 이관 (2d) — 권한 카드 + 에셋 다운로드 단계
src/ui/AutoDiarySettingsScreen.tsx # 이관 (2e) — 설정 탭 조립의 일부
src/ui/PermissionsSection.tsx      # 이관 (2e)
src/ui/AuthorPicker.tsx            # 이관 (2e) — SelectRow 재사용
src/ui/VisionPicker.tsx            # 이관 (2e)
src/ui/GeocodingSettingToggle.tsx  # 이관 (2e) — Toggle 재사용
App.tsx                            # global.css import 1줄 + 설정 탭 조립부(2e) +
                                   #   탭바 스타일(2e). 흐름·탭 구조 불변.

# 테스트 (신규)
__tests__/theme-tokens.test.ts           # (.ts, logic) — 역할 존재 + WCAG 대비 ≥ 목표
__tests__/nativewind-transform.test.ts   # (.ts 또는 .tsx) — R8 회귀: className 있는
                                         #   컴포넌트가 트랜스폼·렌더된다
__tests__/ui/button.test.tsx             # 컴포넌트별 계약 (7개)
__tests__/ui/card.test.tsx
__tests__/ui/list-row.test.tsx
__tests__/ui/section-header.test.tsx
__tests__/ui/text-styles.test.tsx
__tests__/ui/toggle.test.tsx
__tests__/ui/select-row.test.tsx

# 계약 테스트 확장 (기존 파일 수정)
__tests__/ui/dark-mode-no-scheme.test.ts # 031 — 검사 대상을 src/ui/theme/·
                                         #   src/ui/components/까지 확장 (.ts+.tsx)

# Maestro (이관마다 갱신, 필요 시 신규 등록)
.maestro/*.yml  +  scripts/run-device-tests.mjs (FLOWS)
```

**Structure Decision**: 단일 RN/Expo 프로젝트. 신규 코드는 전부 `src/ui/` 하위
(`theme/`, `components/`) — `checkSourceFile` 감시 범위 안이라 **새 헌법 검사
경계를 만들지 않는다**(spec Clarifications, research R6/R7). 빌드 설정 4파일만
저장소 루트(babel/metro/tailwind는 관례상 루트, `global.css`는 metro `input`이
루트 기준). `tokens.ts`가 색·간격·반경의 **단일 출처**이고 `tailwind.config.js`가
그것을 `require`한다(값 이중 정의 금지 — 018 교훈).

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비워 둔다.

해당 없음.
