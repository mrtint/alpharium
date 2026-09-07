# Implementation Plan: 캐릭터 화면 이관 + 눌림 피드백

**Branch**: `033-character-screen-press-feedback` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-character-screen-press-feedback/spec.md`

## Summary

032가 남긴 두 빈자리를 메운다.

1. **`CharacterListScreen.tsx` 이관** — 원시 hex 6종(`#fdf3d8`·`#ddd`·`#666`×2·
   `#999`·`#eee`)을 `tokens.ts`로 교체하고, 032가 만들고 안 쓰던 `ListRow`를
   `label: string | ReactNode`로 넓혀 **실제로 적용**한다. 다섯 캐릭터 행 + 사진
   모델 행 + 거부 안내가 전부 공용 컴포넌트(`ListRow`·`Button`·`AppText`) 위로
   옮겨간다. 032 `contracts/screen-migration.md`의 "표현만 바꾼다" 공통 원칙과
   "className + 토큰 style 병행" 패턴을 그대로 재사용한다.
2. **눌림 피드백** — reanimated로 `Button`·`ListRow` 내부에 `onPressIn` scale
   축소 / `onPressOut` 복귀를 넣는다. 새 컴포넌트 0개, 상수는 `tokens.ts` 한 곳.

**★ 이 스펙의 최대 위험은 빌드 설정이다** — `babel.config.js`에
`react-native-worklets/plugin`이 **없다**. reanimated 4.x는 이 플러그인 없이는
worklet이 컴파일되지 않는다. R1 참조.

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.86.2 / Expo SDK 57

**Primary Dependencies**: `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1`
(둘 다 설치 완료 — 032가 NativeWind v4.2의 peerDependency로 들여옴),
`nativewind@4.2.6`, `react-native-css-interop@0.2.6`

**Storage**: N/A — 이 스펙은 저장 계층을 건드리지 않는다. 새 신호·새 파일 0개.

**Testing**: jest 2프로젝트(`logic` = `.ts` / `ui` = `.tsx` + jest-expo).
새 테스트는 전부 `.tsx`. 실기기는 Maestro(기존 흐름 무갱신).

**Target Platform**: Android (SM-S901N / Galaxy S22, One UI 7, Android 16, dev debug)

**Project Type**: Mobile app (Expo development build — Expo Go 불가)

**Performance Goals**: 눌림 반응이 UI 스레드에서 끊김 없이 돈다(reanimated worklet).
**측정하지 않는다** — 프레임 수치를 재는 코드를 넣으면 원칙 IV 위반이다. 육안 확인만.

**Constraints**:
- 사용자가 읽는 한국어 문장 **문자 그대로 불변**(FR-002)
- `testID` 7종 불변(FR-003) — `character-row-<c>`·`action-<c>`·`pause-<c>`·
  `action-vision`·`vision-row`·`download-notice`·`dismiss-notice`
- 기존 테스트 **무수정** 통과(FR-020, SC-002)
- 기존 Maestro 흐름 **무갱신** 통과(FR-021, SC-004)
- 원시 hex 0개(FR-001, SC-001)

**Scale/Scope**: 화면 1개 이관 + 공용 컴포넌트 2개 수정 + 토큰 1항목 추가.
`src/ui/` 밖은 **한 줄도 안 고친다**.

## Constitution Check

*GATE: Phase 0 전 통과 필수. Phase 1 설계 후 재확인.*

| 원칙 | 이 스펙과의 관계 | 판정 |
|---|---|---|
| **I. 온디바이스가 제품이다** | 추론 경로를 안 건드린다. `src/inference/`·`src/vision/`·`src/diary/` 무수정. | ✅ 무관 |
| **II. 화자는 휴대폰** | 프롬프트·판정을 안 건드린다. `src/diary/prompt.ts` 무수정. | ✅ 무관 |
| **III. 모델은 캐릭터다** | **정면으로 시험받는 자리.** `CharacterListScreen`이 `ModelAsset`·`roster`에 닿지 않는 상태를 이관 후에도 유지해야 한다(FR-005). 이름·소개는 `persona.ts`에서만(FR-006). 상태 문장에 크기·규모 없음(FR-007). 추천·미리 고르기 없음(FR-008). `checkSourceFile`의 `UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`가 자동 검사. | ✅ 통과 (C1~C4로 잠금) |
| **IV. 측정 장치를 들이지 않는다** | 눌림 반응이 **어떤 수치도 만들지 않는다**(FR-018). 생성 중 화면에 진행률·경과시간·생성 중인 글 여전히 0개(SC-006). 다운로드 진행 문장은 현행 그대로(FR-019). 애니메이션 성능을 재는 코드 없음. | ✅ 통과 (C5~C7로 잠금) |
| **V. 관측과 추측을 구분** | 눌림 반응의 세기·시간은 **사람이 정한 상수**(FR-016) — 012 `USER_VISIBLE_SIGNAL_AXES`, 021 `PERMISSION_REQUIREMENTS`, 032 `tokens.ts` 선례. 코드가 계산하지 않는다. 실기기 1회 육안 필수(FR-022). | ✅ 통과 (C8로 잠금) |

**032가 세운 경계 유지 확인**:
- `src/ui/` → `diary/prompt`·`models/roster`·`ModelAsset` 차단 규칙 유지 ✅
- `dark:` variant 미사용, `useColorScheme`/`Appearance` 미사용(031 라이트 고정) ✅
- 디자인 토큰 단일 출처 `src/ui/theme/tokens.ts` — 눌림 상수도 여기 ✅
- jest 2프로젝트 분리 유지, 새 테스트는 `.tsx` ✅

**위반 없음. 정당화 필요 항목 없음** → Complexity Tracking 절 삭제.

## Project Structure

### Documentation (this feature)

```text
specs/033-character-screen-press-feedback/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — R1~R6
├── data-model.md        # Phase 1 — 타입·상수 변경
├── quickstart.md        # Phase 1 — 검증 시나리오
├── contracts/
│   ├── character-screen-migration.md   # CS1~CS9
│   └── press-feedback.md               # PF1~PF8
├── checklists/
│   └── requirements.md  # (완료)
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

```text
src/ui/
├── theme/
│   └── tokens.ts                 # ✏️ PRESS 상수 추가 (신규 export 1개)
├── components/
│   ├── Button.tsx                # ✏️ 눌림 반응 내장
│   ├── ListRow.tsx               # ✏️ label 타입 확장 + 눌림 반응 내장
│   ├── Text.tsx                  # (무수정)
│   ├── Card.tsx                  # (무수정 — FR-010)
│   ├── Toggle.tsx                # (무수정 — FR-010)
│   ├── Section*.tsx              # (무수정 — FR-010)
│   └── SelectRow.tsx             # (무수정)
└── CharacterListScreen.tsx       # ✏️ 이관 (StyleSheet → 토큰·공용 컴포넌트)

babel.config.js                   # ✏️ ★ worklets 플러그인 추가 (R1 — 최우선)

__tests__/ui/
├── character-list.test.tsx       # 🔒 무수정 통과 (SC-002)
├── list-row.test.tsx             # 🔒 무수정 통과 (SC-002)
├── button.test.tsx               # 🔒 무수정 통과
├── press-feedback.test.tsx       # ➕ 신규 (PF 계약)
└── character-list-migration.test.tsx  # ➕ 신규 (CS 계약)

.maestro/
├── download-conflict.yml         # 🔒 무갱신 통과 (SC-004)
├── parallel-model-download.yml   # 🔒 무갱신 통과 (SC-004)
└── photo-vision.yml              # 🔒 무갱신 통과 (SC-004)
#   ⚠️ diary-character-select.yml 은 이 화면과 무관 (R7 — 029가 AuthorPicker로 분리)
```

**Structure Decision**: 032가 세운 `src/ui/` 구조를 그대로 쓴다. 새 디렉터리·새
경계·새 헌법 검사 규칙 0개 — 이 스펙은 기존 경계 **안에서** 완결된다. `src/ui/`
밖에서 바뀌는 파일은 `babel.config.js` 하나뿐이며 그것은 빌드 설정이다.

## 단계별 계획

**Phase A — 빌드 설정 (R1, 최우선)**: `babel.config.js`에
`react-native-worklets/plugin` 추가 + 스테일 주석 교체. Metro 캐시 비우기.
`npm test` 두 프로젝트 전부 GREEN 확인. **이것이 안 되면 나머지가 전부 무의미**하다.

**Phase B — 토큰**: `tokens.ts`에 `PRESS` 상수 추가 + 계약 테스트.

**Phase C — 컴포넌트**: `Button`·`ListRow`에 눌림 반응 내장, `ListRow.label` 타입
확장. **기존 테스트 무수정 GREEN이 게이트**.

**Phase D — 화면 이관**: `CharacterListScreen` 이관. **기존
`character-list.test.tsx` 무수정 GREEN이 게이트**.

**Phase E — 검증**: `npm test` 전체 + lint(eslint·tsc·헌법 검사·prettier) +
위반 주입 3종 + 실기기 1회(Maestro 무갱신 + 육안).

## 위험과 대응

| 위험 | 근거 | 대응 |
|---|---|---|
| **worklets 플러그인 부재로 애니메이션이 조용히 안 돎** | `babel.config.js`가 명시적으로 배제 중 (주석이 스테일) | Phase A를 최우선. 실기기 육안이 유일한 최종 확인 — jest는 이것을 못 잡는다(R1) |
| **jest-expo에서 reanimated 목킹 실패** | 032가 겪은 "className은 jest에 없다"와 같은 계열 | R2 — jest-expo 57 프리셋의 reanimated 목 확인. 필요시 `jest/setup-ui.ts`에 목 추가 |
| **`ListRow` 적용 시 Maestro 접근성 트리 변화** | 003·008 실측: 버튼이 행의 자식으로 안 보임 | `testID`를 **버튼 자신**에 계속 준다(FR-003). CS4가 잠금 |
| **★ 행 높이 변화로 Maestro 스크롤 도달이 어긋남** | R7: 이 화면은 설정 탭 하단에 있고 흐름 셋이 `scrollUntilVisible`에 크게 의존. `ListRow`는 `paddingVertical:14`, 현행 행은 `12` | 화면 쪽에서 `ListRow`의 `style` prop으로 높이를 현행에 맞춘다. 실기기 3흐름 실행이 유일한 확인 |
| **엉뚱한 흐름을 회귀 대상으로 착각** | 로드맵·spec 초안이 `diary-character-select.yml`을 지목했으나 그것은 `AuthorPicker`용 | R7에서 정정 — 대상은 `download-conflict`·`parallel-model-download`·`photo-vision` |
| **release/R8에서 worklet 깨짐** | 032 이월 잔여 (2) | **이 스펙 범위 밖**(FR-023). 다만 그 잔여의 확인 항목에 "눌림 반응"을 추가 기록 |

## Constitution Re-Check (Phase 1 설계 후)

설계 산출물(`data-model.md`·`contracts/`·`quickstart.md`)을 만든 뒤 다시 본다.

| 원칙 | 설계가 새로 만든 위험 | 판정 |
|---|---|---|
| **I. 온디바이스** | 없음. 바뀌는 파일은 `src/ui/` 3개 + `babel.config.js` + `jest/setup-ui.ts`. 추론 계층 무수정 | ✅ |
| **II. 화자는 휴대폰** | 없음. 프롬프트·판정 무수정 | ✅ |
| **III. 모델은 캐릭터다** | `ListRow` 적용이 새 import를 들여올 위험 → **CS6이 잠그고 `checkSourceFile`이 자동 검사**. `label`을 ReactNode로 넓혀도 화면이 넘기는 것은 `personaOf()` 문자열뿐(CS7) | ✅ |
| **IV. 측정 장치 금지** | reanimated 도입이 성능 측정 유혹을 만든다 → **PF8이 명시적으로 금지**하고, `quickstart` Q4가 "재는 순간 측정 장치"를 못박는다. 프레임·지속시간을 기록하는 코드 0 | ✅ |
| **V. 관측과 추측 구분** | `PRESS` 값의 근거를 만들려 하면 그것이 측정이다 → **R4가 "사람이 정한 상수"로 확정**. 실기기 육안이 유일한 판단 통로(Q3-2·Q4) | ✅ |

**설계가 오히려 강화한 것**: research R1·R2·R7이 **초록불을 믿지 않는 세 자리**를
문서화했다. 특히 PF7("기기 없는 테스트는 배선됐는가만 잠근다")은 011·013·020이
반복해 겪은 "테스트 전부 통과 + 실기기에서 조용히 안 됨"을 계약으로 못박는다.

**위반 0. Complexity Tracking 불필요.**

## Phase 1 산출물

| 파일 | 내용 |
|---|---|
| `research.md` | R1~R7 — worklets 플러그인 부재(★), jest 목 실측, `label` 호환, 상수 근거, 032 계약 상속, 이월 잔여, **Maestro 흐름 정정**(★) |
| `data-model.md` | `PRESS` 상수, `ListRow.label` 확장, 무변경 유지 항목 4종, 제거되는 `StyleSheet` |
| `contracts/character-screen-migration.md` | CS1~CS10 |
| `contracts/press-feedback.md` | PF1~PF8 + 위반 주입 4종 |
| `quickstart.md` | Q0~Q5 검증 절차 |
