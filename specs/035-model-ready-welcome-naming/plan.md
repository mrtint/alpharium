# Implementation Plan: 모델 준비 완료 연출 + 캐릭터 작명

**Branch**: `035-model-ready-welcome-naming` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/035-model-ready-welcome-naming/spec.md`

## Summary

모델이 `ready`가 되는 침묵하는 상태 전이를 "첫 만남"으로 연출한다. 진입 게이트에
세 번째 단(온보딩 → **환영** → 홈)을 더해, 기본 캐릭터가 실제로 응답하는지 한 번
확인하고(`load()` + `run("안녕?")`, 응답 텍스트는 즉시 폐기) 성공하면 사람이 쓴
고정 문구의 환영 화면을 띄운다. 그 흐름에서 사용자가 캐릭터 이름을 짓고, 이후
설정 탭 "일기 작성자"에서 준비된 캐릭터마다 바꿀 수 있다.

기술 접근의 핵심은 **`personaOf()`를 건드리지 않는 것**이다. 사용자 지정 이름은
`displayNameOf(character, custom)`이라는 새 순수 함수 하나가 해석하고, 파일 읽기는
조립부(`App.tsx`)가 해서 **문자열로 흘려보낸다**. 그래야 `buildPrompt()`가
결정적 순수 함수로 남고(005 P6), 화면이 여전히 모델을 모른다(원칙 III).

**헌법 원칙 III 개정이 Phase 1로 선행한다**(FR-001) — 코드보다 헌법 커밋이 먼저.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native 0.86 / Expo SDK 57)

**Primary Dependencies**: 기존 의존만 — `expo-file-system`(저장), `llama.rn`(추론),
`react-native`/NativeWind(화면). **새 네이티브 모듈 0개.**

**Storage**: `expo-file-system` 파일. 신규 `preferences/character-names.json`,
기존 `onboarding.json`에 필드 하나 추가, `DiaryEntry`에 옵셔널 필드 하나 추가.

**Testing**: jest 두 프로젝트 — `test:logic`(`.ts`, node 환경) /
`test:ui`(`.tsx`, jest-expo). 계약 테스트는 소스를 `readFileSync`로 읽어 검사
(007·009·012·033·034 관례). 실기기는 Maestro.

**Target Platform**: Android (SM-S901N / Galaxy S22, debug 빌드로 검증)

**Project Type**: 모바일 앱 (단일 저장소, `src/` 축별 분리)

**Performance Goals**: 해당 없음 — 헌법 원칙 IV가 지표 수집·비교를 금한다. 유일한
시간 값은 `LIVENESS_TIMEOUT_MS = 60_000`(상한이지 목표가 아니며 화면에 노출 안 함).

**Constraints**:
- `buildPrompt()`는 결정적 순수 함수로 남아야 한다(005 P6, 018 P12)
- 018 계약 P8·P9·P10·P11 유지
- `RunResult`는 `{ text, ending }` 둘뿐(원칙 IV)
- 일기 판정 갈래는 넷 그대로(005 FR-018b)
- 온보딩·연출은 건너뛸 수 있어야 한다(원칙 I)
- 새 네이티브 모듈 없음 → debug 실기기 1회로 충분(012 기준)

**Scale/Scope**: 화면 1~2개 신규, 순수 모듈 4개 신규, 기존 파일 ~10개 수정.
FR 38개(FR-001~FR-032 + 세분화된 a/b/c).

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 후 재확인.*

| 원칙 | 관련 | 판정 | 근거 |
|---|---|---|---|
| **I. 온디바이스가 제품이다** | 확인이 실제 온디바이스 추론 | ✅ PASS | `load()`+`run()`이 기존 온디바이스 경로. 미리 만든 응답 저장 없음. 실패가 텍스트를 반환하지 않는다(FR-006, `judgeLiveness`는 2갈래 값만) |
| **II. 화자는 휴대폰이고 시야는 좁다** | 프롬프트 호칭 줄 | ✅ PASS | `prompt.ts`가 유일한 통과 지점으로 남는다. 캐릭터에서 오는 것은 여전히 **이름과 언어뿐**(FR-019) — 이름의 출처만 상수에서 사용자 값으로 바뀐다. 확인용 입력은 프롬프트가 아니며 서로 참조 금지(FR-003b) |
| **III. 모델은 캐릭터다** | ⚠️ **개정 선행 필요** | ⚠️ **개정 후 PASS** | 현행 "페르소나는 코드 안에 있다(MUST) / 사용자가 지어내게 하지 않는다(MUST NOT)"와 충돌. **이름만** 여는 개정이 Phase 1(FR-001). 개정 후: 말투·tagline·성격은 코드 고정 유지, 화면은 모델 미노출(FR-027), `checkWelcomeFile`이 로스터 접근 차단(§8) |
| **IV. 측정 장치를 들이지 않는다** | "정상 동작 확인" | ✅ PASS | 응답의 **비었는가만** 본다 — 길이·품질·점수·비교 없음. `RunResult` 경계 불변(FR-028). 응답 텍스트 즉시 폐기(FR-004a). 시간·토큰 미노출(FR-004). `checkWelcomeFile`이 `Date`·`timings`·`ms` 토큰 차단 |
| **V. 관측된 사실과 추측을 구분** | 이름 스냅샷 폴백 | ✅ PASS | 옛 일기의 스냅샷을 **소급 생성하지 않는다**(FR-026b) — 관측된 적 없는 값을 지어내지 않는다. 상한 값(60초·12자)은 **사람이 정한 상수**이며 코드가 값을 보고 정하지 않는다(012·021·023 선례) |

**추가 게이트 (저장소 관례)**:

| 항목 | 판정 |
|---|---|
| 프롬프트는 `prompt.ts`에만 | ✅ 확인용 입력은 일기 프롬프트가 아님. 양방향 import 차단(§8) |
| 판정 갈래 4개 유지 | ✅ `judgeLiveness()`는 별도 2갈래 함수. `judge()` 무변경 |
| `process.env`는 `environment.ts`에서만 | ✅ 해당 없음 |
| jest 두 프로젝트 분리 | ✅ 순수 로직 `.ts` / 화면 `.tsx` |
| main 직접 작업 금지 | ✅ `035-model-ready-welcome-naming` 브랜치 |
| 새 네이티브 모듈 시 release 재확인 | ✅ 새 모듈 0개 → debug 1회(012) |

**GATE 결과: 조건부 PASS** — 원칙 III 개정(Phase 1 T001)이 다른 모든 코드
작업의 선행 조건이다. 개정 전에 US2·US3 코드를 커밋하면 Governance 위반이다.

## Project Structure

### Documentation (this feature)

```text
specs/035-model-ready-welcome-naming/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물 ✅
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/           # Phase 1 산출물
│   ├── character-name.md    # 이름 해석·검증·저장
│   ├── liveness.md          # 정상 동작 확인
│   └── welcome-gate.md      # 진입 게이트·연출 흐름
├── checklists/
│   └── requirements.md  # ✅ 16/16
└── tasks.md             # /speckit-tasks 산출물 (아직 없음)
```

### Source Code (repository root)

```text
src/
├── welcome/                      ★ 신규 경계 (020 schedule/·021 onboarding/ 패턴)
│   ├── liveness.ts               LIVENESS_INPUT 상수 + judgeLiveness() 순수 함수
│   ├── naming.ts                 NAME_MAX_LENGTH + validateCharacterName() 순수 함수
│   ├── decision.ts               shouldShowWelcome() 순수 함수
│   └── names-port.ts             character-names.json 기기 통로
│
├── diary/
│   ├── character-name.ts         ★ 신규 — displayNameOf() 단일 통과 지점
│   ├── persona.ts                무변경 (기본값 상수의 자리로 남는다)
│   ├── prompt.ts                 수정 — nameLine()/fixedHead()/promptPrefix()가 이름을 받는다
│   ├── types.ts                  수정 — DiaryEntry.authorName? 추가
│   └── pipeline.ts               수정 — authorName 조립, PipelineInput에 이름 주입
│
├── inference/
│   ├── engine-port.ts            수정 — prewarm(character, prefix) 시그니처
│   ├── llama-port.ts             수정 — prompt.ts import 제거, prefix를 인자로
│   └── on-device.ts              수정 — prepare()가 prefix를 만들어 넘긴다
│
├── onboarding/
│   └── flag.ts                   수정 — welcomeShown? 필드
│
├── app/
│   └── wiring.ts                 수정 — 이름 포트 배선
│
└── ui/
    ├── WelcomeScreen.tsx         ★ 신규 — 대기·환영·작명·실패 (문자열/콜백만 받음)
    └── AuthorPicker.tsx          수정 — 이름 편집 진입점

App.tsx                           수정 — 게이트 3단, 이름 상태 로드/전달

scripts/
└── constitution-rules.ts         수정 — checkWelcomeFile 추가 + 역방향 차단

__tests__/
├── welcome/                      ★ 신규 계약 테스트 (.ts)
│   ├── liveness.test.ts
│   ├── naming.test.ts
│   ├── decision.test.ts
│   └── welcome-boundary.test.ts  헌법 검사·경계 (소스 readFileSync)
├── diary/character-name.test.ts  ★ 신규
└── ui/welcome-screen.test.tsx    ★ 신규 (.tsx)

.maestro/
└── welcome-naming.yml            ★ 신규 흐름 (run-device-tests.mjs FLOWS 등록 필수)
```

**Structure Decision**: 020의 `src/schedule/`, 021의 `src/onboarding/`가 세운
패턴을 그대로 따른다 — **순수 판정은 축 디렉터리에, 기기 통로는 `*-port.ts`에**.
`src/welcome/`가 새 경계이며 `checkWelcomeFile`이 지킨다.

`displayNameOf()`만 `src/welcome/`가 아니라 `src/diary/`에 두는 이유: `prompt.ts`가
이것을 써야 하는데, `src/diary/`가 `src/welcome/`를 import하면 프롬프트 계층이
연출 계층에 의존하게 되어 §8의 역방향 차단과 충돌한다. 이름 해석은 페르소나의
연장이므로 `persona.ts` 옆이 맞는 자리다.

## Phase 1 실행 순서 (핵심 의존성)

```
T001  헌법 개정 (원칙 III) ─── 반드시 첫 커밋
  │
  ├─ US2/US3 (작명) 전체의 선행 조건
  │
  ▼
순수 모듈 (기기 불필요, 병렬 가능)
  ├─ character-name.ts (displayNameOf)
  ├─ welcome/naming.ts (validateCharacterName)
  ├─ welcome/liveness.ts (judgeLiveness)
  └─ welcome/decision.ts (shouldShowWelcome)
  │
  ▼
경계 수정 (순서 있음)
  ├─ prompt.ts (이름 주입) ──┐
  ├─ engine-port.ts          │ 018 P8~P11 계약 테스트가 이 셋을
  ├─ llama-port.ts           │ 함께 잠근다 — 한 번에 간다
  └─ on-device.ts ───────────┘
  │
  ▼
저장 계층
  ├─ names-port.ts + character-names.json
  ├─ onboarding/flag.ts (welcomeShown?)
  └─ types.ts + pipeline.ts (authorName?)
  │
  ▼
화면 + 조립
  ├─ WelcomeScreen.tsx
  ├─ AuthorPicker.tsx (편집)
  └─ App.tsx (게이트 3단)
  │
  ▼
헌법 검사 + 위반 주입 검증 + 실기기
```

## Complexity Tracking

> Constitution Check에 정당화가 필요한 위반이 하나 있다.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 원칙 III 「페르소나는 코드 안에 있다 / 사용자가 지어내게 하지 않는다」 완화 | 로드맵 19번의 핵심 요구. 사용자가 자기 휴대폰의 캐릭터에 이름을 지어주는 것이 "첫 만남" 연출의 목적 그 자체다 | **개정 없이 구현**은 Governance("예외를 코드에 몰래 두지 않는다") 정면 위반. **이름도 코드 고정 유지**는 기능 자체를 포기하는 것. 완화 범위를 **이름 하나로 좁힌 것**이 이미 최소 대안이다 — 말투·tagline·성격 지시는 그대로 MUST NOT으로 남으므로, 원 조항이 막으려던 위험("사용자 페르소나가 씨앗과 어긋난다")은 그대로 방어된다. 이름은 호칭이지 씨앗의 서술이 아니다 |

**그 외 복잡도**: 새 경계 `src/welcome/` 하나가 늘지만, 020·021이 같은 이유로
같은 모양의 경계를 만든 선례가 있고 헌법 검사로 지켜진다. 순수 함수 4개는 전부
기기 없이 검증 가능하다.

## Post-Design Constitution Re-Check

*Phase 1 설계(data-model.md, contracts/) 작성 후 재평가.*

| 원칙 | 재확인 | 결과 |
|---|---|---|
| I | `judgeLiveness()`가 `{ text }`를 받지만 반환은 `"ok" \| "failed"` 2갈래 — 실패가 텍스트를 반환할 자리가 타입에 없다 | ✅ |
| II | `nameLine()`이 여전히 `prompt.ts`의 유일한 호칭 줄. `displayNameOf()`는 이름 문자열만 준다 | ✅ |
| III | 개정(T001) 후 성립. `checkWelcomeFile`이 `src/welcome/` → 로스터를 차단하고, 화면은 문자열만 받는다 | ✅ (개정 조건부) |
| IV | `LivenessOutcome`에 시간·토큰을 담을 자리 없음. `DiaryEntry.authorName`은 문자열 하나 — 이력·시각 자리 없음 | ✅ |
| V | 60초·12자는 사람이 정한 상수. 스냅샷 소급 생성 금지 | ✅ |

**최종 판정: PASS (T001 헌법 개정 선행 조건부).**
