# Implementation Plan: 화면 문구의 다국어 구조 — 카탈로그와 기기 언어 해석

**Branch**: `062-ui-text-i18n` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/062-ui-text-i18n/spec.md`

## Summary

화면 문구 전부를 언어별 타입 안전 카탈로그(`src/i18n/catalogs/`)로 옮기고, 기기 선호 언어를 `expo-localization`으로 읽어 순수 규칙으로 지원 목록에
맞춰 고르는 통로(`src/i18n/`)를 만든다. 지원 언어는 한국어 하나라 결과는 언제나 한국어이며, 한국어 출력이 이관 전과 바이트 동일함을 골든 두 겹(리터럴
다중집합·함수 출력)으로 잠근다. 모델 입력(프롬프트·신호 까닭·프롬프트 호칭)은 대상 밖이다. 언어 하나 추가의 비용은 테스트 전용 가짜 카탈로그로 시연한다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, React Native 0.86, Hermes)

**Primary Dependencies**: 새로 `expo-localization`(감지만, 버전은 `npx expo install`이 정함). i18n 라이브러리 없음(브레인스토밍 결정, research R4)

**Storage**: 없음 — 언어 결정은 프로세스 메모리(data-model)

**Testing**: jest 두 프로젝트(`logic` `.ts` / `ui` `.tsx` RNTL 14), `tsc`, 헌법 검사(`scripts/constitution-rules.ts`), dev 실기기 수동 확인

**Target Platform**: Android (SM-S901N, Android 16) — dev(debug) 빌드만

**Project Type**: mobile-app (단일 프로젝트)

**Performance Goals**: 언어 결정은 프로세스당 한 번, 결과 캐시 — 렌더 경로에 추가 비용 없음(같은 객체 반환, C2)

**Constraints**: 한국어 화면 바이트 변화 0(진단 언어 줄만 새로 더함) · 061 프롬프트 테스트 무수정 통과 · 헤드리스에서 같은 해석 · 감지 실패 시 지어내지 않음

**Scale/Scope**: 이관 대상 한글 리터럴 약 310개 / 21개 파일(화면 문구 갈래, research R5 — 추출 스크립트 기준이라 JSX 주석 오탐 몇 개 포함) + 그 문구 모음을 참조하는 소비자 화면 파일과 테스트 약 60개 파일의 참조 경로

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스 | 통과 | 추론 경로 무변경. 미리 만든 응답 없음 |
| II. 화자는 휴대폰 | 통과 | 프롬프트 문안 무변경(FR-015, G3). 화면 언어가 프롬프트로 새지 않음(B2, X2) |
| III. 캐릭터는 모델 위에 | 통과 | 출력 언어는 캐릭터 `LANGUAGE` 표(FR-016). 이름은 번역 안 함(FR-018). 카탈로그가 roster·persona·`Character`를 모름(K5, 독백 격리 규칙 확장) |
| IV. 측정 장치 금지 | 통과 | 번역 품질 채점 없음(FR-019). 골든은 「바뀌지 않았다」의 바이트 대조이지 품질 점수가 아니다 |
| V. 관측과 추측 구분 | 통과 | 감지 못함 = `null`, 기본값으로 감지값을 채우지 않음(L1, D2). 감지/고름 분리(FR-008) + 진단 표시(FR-011b). 실기기 확인은 quickstart §2 |
| 개발 방식 | 통과 | 계약(contracts/i18n.md) → 테스트 → 구현. 한국어 커밋. 기능 브랜치 `062-ui-text-i18n` |

**Post-design 재확인**: 위반 없음. Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/062-ui-text-i18n/
├── spec.md
├── plan.md              # 이 파일
├── research.md          # R1~R12
├── data-model.md
├── quickstart.md
├── contracts/
│   └── i18n.md          # L·D·C·K·B·G·X·V 계약
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/i18n/                      # 새 계층
├── languages.ts               # SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, Language
├── resolve.ts                 # resolveLanguage (순수)
├── locale-port.ts             # readDeviceLocales — expo-localization을 만지는 유일한 자리
├── current.ts                 # text(), languageResolution() — 프로세스 단위 캐시
└── catalogs/
    ├── index.ts               # CATALOGS: Record<Language, Catalog>, type Catalog
    └── ko/                    # 한국어 카탈로그 (영역별 파일 → index.ts가 묶음)
        ├── index.ts
        ├── home.ts  settings.ts  developer.ts  diagnostics.ts
        ├── welcome.ts  download.ts  onboarding.ts
        ├── monologue.ts  notification.ts  calendar.ts

src/ui/*.tsx, src/ui/*-text.ts     # 문구 상수·리터럴 → text().<영역> 참조 (home-text.ts 등은 판정 없는 조립 함수만 남기거나 카탈로그로 흡수)
src/app/target-hour.ts, skipped-line.ts, diagnostics-text.ts, diagnostics-view.ts, failure-toast.ts   # 문장 틀 → 카탈로그
src/app/failure-text.ts            # 삭제 (죽은 코드, research R5)
src/diary/monologue.ts             # 선택 로직만 남고 후보 표는 text().monologue
src/onboarding/requirements.ts     # 화면 문구는 카탈로그 참조
src/schedule/notification-text.ts, notification-port.ts   # 카탈로그 참조 (헤드리스)
scripts/constitution-rules.ts      # 새 규칙: 화면 한글은 카탈로그에만(B1)·i18n 격리(K5)·particle 차단(K6)·prompt↛i18n(B2)·expo-localization 단일 자리(D4)

__tests__/i18n/                    # 새 테스트
├── resolve.test.ts  locale-port.test.ts  current.test.ts  catalog-shape.test.ts
├── boundaries.test.ts             # B1~B5, K5·K6, 허용 목록 경로 존재
├── ko-literals.golden.json  ko-outputs.golden.json  ko-golden.test.ts   # G1·G2
├── catalog-types.ts               # K2·K3 @ts-expect-error (tsc가 lint에서 본다)
├── fixtures/xx.ts                 # 테스트 전용 가짜 카탈로그
└── add-language.test.tsx          # X1~X3
```

**Structure Decision**: 단일 프로젝트에 `src/i18n/` 계층 하나를 더한다. 카탈로그는 「말」만 알고 판정하지 않는다(K4) — 판정은 지금 자리(`src/app/`·`src/schedule/` 등)에 남고
결과를 카탈로그 함수의 인자로 준다. 한국어 카탈로그는 영역별 파일로 나누되 진입 모듈 하나(`catalogs/ko/index.ts`)로 묶어 「언어 하나 = 카탈로그 모듈 하나 + 목록 한 줄」을 지킨다.

## 이관 순서 (tasks의 뼈대)

1. **골든 먼저** — 아무것도 옮기기 전에 G1(리터럴 다중집합)·G2(함수 출력) 골든을 지금 코드에서 만들어 커밋 가능한 JSON으로 둔다. 이 단계의 테스트는 지금 코드에 대해 초록이어야 한다.
2. **통로** — `languages`·`resolve`·`locale-port`·`current`·빈 카탈로그 뼈대 + 계약 테스트(L·D·C·K). `npx expo install expo-localization`.
3. **영역별 이관** — 영역 하나씩(calendar → home → settings → onboarding·welcome·download → monologue → notification → developer·diagnostics). 영역마다 기존 원문 대조 테스트의
   import 경로만 바꾸고 기대값은 그대로 둔다. 매 영역 뒤 `npm run test:logic`·`test:ui`·`tsc`.
4. **경계 잠금** — B1~B5·K5·K6·D4 헌법 검사/계약 테스트, 문구 분기 제거(R8), `failure-text.ts` 삭제, 기존 규칙 경로 갱신(R12).
5. **진단 언어 줄**(FR-011b, V1·V2).
6. **시연** — 가짜 카탈로그 X1~X3, 타입 테스트 K2·K3.
7. **골든 전환** — G1을 `catalogs/ko/`에 대해 돌려 다중집합 동일 확인(명시 차이만).
8. **위반 주입**(quickstart 표) → `npm test`·`npm run lint` → dev 실기기(quickstart §2) → AGENTS.md에 결론 기록.

## 남은 위험 (plan 시점)

- **프로세스가 다시 뜨는가는 짐작이다** — 안드로이드는 언어 변경 시 `configChanges`에 `locale`이 없으면 액티비티를 다시 만든다. 프로세스는 살아남을 수 있고, 그때
  `current.ts`의 캐시는 옛 결정을 유지한다(Clarification Q1이 허용한 동작, 결과는 언제나 한국어라 지금은 보이지 않는다). 실기기에서 `pidof`로 기록한다.
- **기존 화면 테스트가 모듈 최상단 상수(`SETTINGS_TEXT` 등)를 import한다** — 카탈로그 참조로 옮길 때 테스트 수가 많다(약 29개 파일). 기대 문자열은 고치지 않는다(G4).
- **Hermes `Intl`과 무관하게** 한국어 날짜·시각은 지금 문자열 조립을 그대로 옮긴다(R11).
- release 빌드에서의 `expo-localization` 동작은 확인하지 않는다(정책) — 미확인 잔여.

## Complexity Tracking

해당 없음.
