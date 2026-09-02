# Implementation Plan: 일기 쓰기 흐름 단순화 + 최초 실행 필수 에셋 다운로드

**Branch**: `029-writing-flow-simplification` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/029-writing-flow-simplification/spec.md`

## Summary

007·009·011·012·014·018이 홈 화면에 누적한 위젯 4개(캐릭터·하루·사진 설정·장소명
토글)를 걷어내고, "일기 쓰기" 한 번 탭 → (덮어쓰기 확인 1회) → 생성으로 접는다.
생성 파라미터는 배선 계층(`src/app/`)의 새 순수 함수가 자동 판정하고, 사용자가
설정 탭에서 고정값을 두면 그 값이 덮어쓴다. 동시에 온보딩(021)에 "필수 에셋
다운로드" 단계를 더해 공용 사진 모델(v1+v2)과 기본 캐릭터(quiet)를 자동으로 받고,
온보딩 완료 게이트에 "필수 에셋 준비됨"을 AND로 잠근다 — 028이 확인한 최초 실행
model-not-ready 결함을 없앤다.

**접근**: 새 계층·새 네이티브 모듈·새 저장 파일 0개. 기존 경계를 재배치·재사용한다:
- 자동 판정 → `src/app/resolve-generation.ts` (신규 순수 함수, 007 `selection.ts`
  선례)
- 필수 에셋 → 011 `visionAssets()` + 003 `assetFor(quiet)` + 026 다운로드 통로,
  온보딩이 조립만
- 온보딩 게이트 AND → `src/onboarding/decision.ts`에 순수 판정 추가
- 설정 탭 세 섹션 → 기존 `vision-setting.json`·`geocoding-setting.json`·
  `selected-character.json`에 "자동" 상태를 얹음
- 헌법 v1.3.0 개정을 **코드보다 먼저** 커밋

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86 (Expo SDK 57)

**Primary Dependencies**: `expo-file-system`(설정 저장·모델 파일), `llama.rn`(추론 —
이 스펙은 안 건드림), `react-native` 코어(화면), 기존 011 vision roster·003 model
acquisition·026 segmented download

**Storage**: `files/preferences/` — `selected-character.json`(007),
`vision-setting.json`(011), `geocoding-setting.json`(017). `files/onboarding.json`
(021). `files/models/`(003·011). **새 파일 없음.**

**Testing**: `npm run test:logic`(순수 로직, ~7초), `npm run test:ui`(화면),
`npm test`(전부), Maestro(실기기). 계약 테스트는 소스 선언을 `readFileSync`로 직접
읽는 저장소 관례(007·009·012).

**Target Platform**: Android (SM-S901N / Galaxy S22, Android 16 / SDK 36에서 검증).
iOS는 계약상 존재하나 이 스펙의 실기기 검증 대상 아님.

**Project Type**: 모바일 앱 (단일 Expo 프로젝트, `src/` + `App.tsx`)

**Performance Goals**: "일기 쓰기" 탭에서 생성 시작까지 추가 지연 없음(자동 판정은
순수 함수, 파일 3개 읽기). 온보딩 에셋 다운로드는 026의 세그먼트 병렬 속도 그대로.

**Constraints**:
- `src/diary/prompt.ts` 입력 시그니처 불변 (원칙 II)
- 판정 갈래 4개 유지 (원칙 IV)
- `src/config/day-boundary.ts` 한 곳 (009·012)
- 화면이 모델을 모름 (원칙 III) — 설정 탭 "일기 작성자"도 persona 문자열만
- `src/onboarding/`이 `models/roster`·`diary/prompt`·`diary/acceptance`·
  `schedule/settings`를 import하지 않음 (`checkOnboardingFile`)
- release 재확인 불필요 (새 네이티브 모듈·빌드 설정 없음, 012 기준)

**Scale/Scope**: 화면 ~6개 영향(DiaryHomeScreen·DiaryListScreen·OnboardingScreen·
AutoDiarySettingsScreen·CharacterListScreen 흡수·App.tsx 탭). 신규 순수 모듈 ~3개.
캐릭터 5, 필수 에셋 3파일(v1+v2+a1).

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 이후 재확인.*

### 원칙 I — 온디바이스가 제품이다

- **통과**. 이 스펙은 추론 경로를 건드리지 않는다. `generate()` 흐름·`pipeline.run()`·
  판정 후에만 저장하는 규칙 전부 무변경(FR-028). 자동 판정은 `pipeline.run()`
  **이전** 계층에서 값을 정할 뿐이다.
- 실패가 텍스트를 만들지 않는다(FR-014) — 자동 판정한 캐릭터가 준비 안 됐고 대체도
  없으면 생성을 시작하지 않고 설정 탭으로 안내한다.

### 원칙 II — 화자는 휴대폰이고, 시야는 좁다

- **통과**. `src/diary/prompt.ts`가 유일한 통과 지점이며 입력 계약(캐릭터·하루·사진
  설정)이 바뀌지 않는다(FR-013, SC-006). 자동 판정은 `prompt.ts`에 넘길 값을 그
  앞에서 정한다 — 새 프롬프트 조립 자리를 만들지 않는다.
- 012 정오 게이트 안내 유지(FR-005) — "하루의 끝" 조항.

### 원칙 III — 모델은 캐릭터다

- **통과, 단 헌법 개정 동반**. 설정 탭 "일기 작성자" 섹션은 persona 이름·소개와
  준비 상태만 받는다(FR-023·027) — 007 `CharacterPicker` 선례. `checkSourceFile`의
  `UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`가 이를 잠근다.
- **로스터 조항 개정(v1.2.0 → v1.3.0)**: "사용자가 고른 캐릭터의 모델만 내려받는
  구조여야 한다(MUST)" → "고르지 않은 캐릭터는 내려받지 않는다(MUST NOT). 단 최초
  실행 시 기본 캐릭터 하나 자동 내려받기 허용(MAY)". Governance("원칙을 어기려면
  헌법을 먼저 고친다") — **코드보다 먼저 커밋**(FR-032, SC-007).
- "다섯 개 다 받기"는 여전히 금지 — `roster.ts`에 `allAssets()` 없음 유지.

### 원칙 IV — 측정 장치를 제품에 들이지 않는다

- **통과**. 자동 판정은 (마지막 캐릭터, 날짜, 사진 신호 유무, 위치 권한, 설정 선호)의
  순수 함수다 — 점수·비교·채점 없음. 사진 신호는 "0장인가"만 본다(FR-010) — 임계값
  없음(원칙 V).
- 에셋 다운로드 진행률은 하나의 합산 바(FR-017) — 026의 병렬성·속도를 노출하지
  않는다. `checkSegmentedFile`의 `SEGMENTED_MEASURES_SPEED`가 이미 잠근 자리.
- 온보딩 플래그는 여전히 boolean 2개(`checkOnboardingFile`의 `FLAG_GROWS_HISTORY`) —
  "필수 에셋 준비됨"은 플래그가 아니라 003 readiness를 실시간 조회.

### 원칙 V — 관측된 사실과 추측을 구분해 기록한다

- **통과**. 온보딩 기본 캐릭터는 사람이 못 박은 고정값 `quiet`(FR-018) — 코드가
  로스터를 보고 정하지 않는다. 012 `USER_VISIBLE_SIGNAL_AXES`, 021
  `PERMISSION_REQUIREMENTS` 선례.
- 사진 설정 자동 판정에 최소 장수 magic number 없음(FR-010).

### 개발 방식 — "한 축을 깊게 파면 실패 신호"

- **이 스펙 자체가 그 교훈의 적용이다**. 007~018이 각자 한 위젯을 더한 누적을,
  전체를 놓고 "매번 이걸 다 물어야 하나"로 되묻어 접는다. 새 축을 파지 않는다 —
  기존 경계 재배치.

### 게이트 결론 (Phase 0 이전)

**PASS** (헌법 개정 선행 조건부). 위반 없음. 유일한 헌법 변경(로스터 조항 완화)은
MINOR이며 Governance 절차대로 코드보다 먼저 한다.

### 게이트 재확인 (Phase 1 설계 이후)

설계 산출물(data-model·contracts) 확정 후 재평가 — **여전히 PASS**.

- **원칙 II**: `resolve-generation.md` R7이 `resolve-generation.ts`에
  `diary/prompt` import 금지를 계약 테스트로 잠근다. `prompt.ts` 시그니처 불변
  확인(`ResolvedParams`가 `character`·`day`·`vision`만 `pipeline.run`에 전달,
  `geocodingEnabled`는 배선이 `createPipeline`에 별도로 넘기던 기존 경로).
- **원칙 III**: `settings-sections.md` SS1·S5가 세 섹션 컴포넌트에 `models/roster`
  import 금지를 잠근다. `essential-assets.ts`(순수)는 `Character` 타입만 —
  `onboarding-assets.md` AR3. 포트는 `src/app/`에 두어 `checkSourceFile`
  `UI_TOUCHES_MODEL`(src/ui/ 한정)에 안 걸림 — research §5.
- **원칙 IV**: `essentialDownloadFraction`은 합산 비율 하나(AR2). 속도·구간
  어휘 없음 — 026 `checkSegmentedFile`이 이미 잠근 자리를 새로 뚫지 않음.
  `VisionSetting` 타입에 `"auto"` **미추가**(S5) — "auto"는 스토어 반환 유니온일
  뿐. 자동 판정은 `photoSignalPresent: boolean` 하나로 임계값 없음(R5).
- **원칙 V**: `ESSENTIAL_ASSET_KEYS`·`ONBOARDING_DEFAULT_CHARACTER`는 `as const`
  상수, 코드가 로스터를 보고 정하지 않음(AR4). `a1` == `assetFor("quiet").key`
  대조는 `src/app/` 포트의 계약 테스트(BR5)가 함 — 순수 판정 파일은 로스터를
  모른 채로 유지.
- **새 헌법 검사 규칙 필요 없음**: 배치(`essential-assets.ts` → onboarding,
  포트 → app)로 기존 규칙을 회피. 태스크에 위반 주입 검증 포함
  (`resolve-generation.ts`에 `new Date()`·`models/roster` import,
  `essential-assets.ts`에 `models/roster` import를 넣어 각 방어가 잡는지).

**설계 후 게이트: PASS. 위반·정당화 필요 항목 없음.**

## Project Structure

### Documentation (this feature)

```text
specs/029-writing-flow-simplification/
├── plan.md              # 이 파일
├── research.md           # Phase 0 — 재사용 경계 조사, 열린 결정
├── data-model.md         # Phase 1 — 엔티티·상태·전이
├── quickstart.md         # Phase 1 — 실기기 검증 시나리오
├── contracts/            # Phase 1 — 순수 함수·화면 계약
│   ├── resolve-generation.md      # 자동 판정 순수 함수
│   ├── onboarding-assets.md       # 필수 에셋 다운로드 + 완료 게이트
│   ├── home-screen.md             # 홈 화면 단순화 후 계약
│   └── settings-sections.md       # 설정 탭 세 섹션
├── checklists/
│   └── requirements.md   # /speckit-specify가 만든 품질 체크리스트
└── tasks.md              # /speckit-tasks 출력 (아직 없음)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── resolve-generation.ts       # ★ 신규 — 자동 판정 순수 함수 (FR-007~012·014)
│   │   └─ 계약 테스트: __tests__/app/resolve-generation.test.ts (저장소 관례 007·009·012)
│   ├── selection.ts                # 재사용 — resolveSelection() (FR-014 캐릭터 폴백)
│   ├── selection-store.ts          # 재사용 — 생성 성공 시 여기 기록 (FR-008a)
│   ├── vision-setting-store.ts     # 수정 — "자동" 상태 추가 (FR-024·026)
│   ├── geocoding-setting-store.ts  # 수정 — "자동" 상태 추가 (FR-025·026)
│   └── wiring.ts                   # 수정 — 자동 판정을 배선에 연결, geocoding 자동
├── onboarding/
│   ├── decision.ts                 # 수정 — 완료 게이트 AND 순수 판정 (FR-019·020)
│   ├── essential-assets.ts         # ★ 신규 — 필수 에셋 목록·준비 판정 순수 함수 (FR-015·018)
│   ├── essential-assets-port.ts    # ★ 신규 — 다운로드 통로 (026 재사용, 기기에 닿는 자리)
│   └── requirements.ts             # 무변경 — 권한 5갈래 그대로
├── ui/
│   ├── DiaryHomeScreen.tsx         # 수정 — 위젯 4개 제거, 날짜 셀렉트만 (FR-001~006)
│   ├── DiaryListScreen.tsx         # 수정 — 위젯 props 제거
│   ├── OnboardingScreen.tsx        # 수정 — 에셋 다운로드 단계 추가 (FR-015~017·022)
│   ├── AutoDiarySettingsScreen.tsx # 수정 — 세 섹션 추가 (FR-023~025)
│   ├── CharacterPicker.tsx         # 이동/개편 — 설정 탭 "일기 작성자"로 흡수
│   ├── CharacterListScreen.tsx     # 제거 또는 설정 탭 섹션으로 흡수 (Q1=A)
│   ├── VisionPicker.tsx            # 이동/개편 — 설정 탭 "사진 보기"로
│   └── GeocodingSettingToggle.tsx  # 이동/개편 — 설정 탭 "장소명"으로
└── diary/
    └── prompt.ts                   # ★ 무변경 (FR-013, SC-006)

App.tsx                             # 수정 — "캐릭터" 탭 제거, 진입 게이트에 에셋 AND,
                                    #        DiarySection에서 위젯 배선 제거

scripts/
└── constitution-rules.ts           # 필요 시 — 새 경계 규칙 (research에서 판단)

.specify/memory/constitution.md     # ★ 먼저 개정 — v1.2.0 → v1.3.0 (FR-032·033)

__tests__/                          # 계약 테스트 (기기 불필요)
.maestro/                           # 실기기 흐름 — 위젯 제거·탭 제거 반영해 갱신
```

**Structure Decision**: 단일 Expo 프로젝트. 신규 파일은 순수 함수 3개
(`resolve-generation.ts`, `essential-assets.ts`, `essential-assets-port.ts`)로
최소화하고, 나머지는 기존 화면·스토어·배선의 수정이다. `src/app/`이 자동 판정의
자리인 것은 spec이 명시("배선 계층에서 계산 — 화면 아님", FR-007)하며, 007
`selection.ts`가 같은 디렉터리에 순수 판정을 둔 선례다.

## Complexity Tracking

> 헌법 위반 없음. 유일한 헌법 변경은 로스터 조항 완화(MINOR)이며 Governance 절차대로
> 코드보다 먼저 한다 — 위반이 아니라 정규 개정이다.

| 항목 | 판단 |
|---|---|
| 신규 순수 모듈 3개 | 자동 판정·필수 에셋 목록·에셋 다운로드 통로 — 각각 단일 책임. 007 `selection.ts`(순수) + `selection-store.ts`(통로) 쌍과 같은 구조. 합치면 순수/통로 경계가 흐려진다 |
| `src/onboarding/`에 에셋 개념 추가 | 021이 "권한만"이던 것에 "필수 에셋"을 더한다. `checkOnboardingFile`이 `models/roster` 직접 import를 막으므로, `essential-assets-port.ts`가 011 `visionAssets()`·003 `assetFor()`를 부르는 것이 규칙에 걸리는지 research에서 확인·필요 시 규칙 조정 |
