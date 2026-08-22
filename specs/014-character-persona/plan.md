# Implementation Plan: 캐릭터 페르소나

**Branch**: `014-character-persona` | **Date**: 2026-08-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-character-persona/spec.md`

## Summary

다섯 캐릭터가 여전히 내부 식별자(`quiet`·`narrative`·…)로 화면에 노출되고 있다
(003의 `CharacterListScreen`·007의 `CharacterPicker` 둘 다 `{character}`를 그대로
찍는다 — 주석에 "이름은 사람이 짓는다"고 이미 적혀 있던 빈자리). `src/diary/persona.ts`
(신규)가 캐릭터→이름·한 줄 소개의 유일한 매핑이 되어 두 화면이 모두 이것을 참조한다.
`src/diary/prompt.ts`의 `SPEAKER_RULES`에 이름·언어만 더하고(성격 지시 없음), 지어내기
교정 문구를 개정한다. `src/diary/pipeline.ts`가 판정 통과 후 `extractTitle()`(신규,
`src/diary/title.ts`)로 본문에서 제목을 사후 분리해 `DiaryEntry.title?`에 담는다.
`src/models/roster.ts`에 `displayName`을 더해 진단 리포트가 그것을 담고
`DiagnosticsScreen`이 그리기만 하도록 한다(007이 `src/ui/`의 `roster` 접근을 막은
헌법 검사 규칙은 그대로 둔다).

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React Native 0.86.2, Expo SDK 57

**Primary Dependencies**: 없음(신규 의존 0개) — 기존 모듈(`diary/prompt.ts`,
`diary/acceptance.ts`, `diary/pipeline.ts`, `models/roster.ts`,
`diagnostics/report.ts`) 확장과 신규 순수 함수 파일 둘(`diary/persona.ts`,
`diary/title.ts`)

**Storage**: 파일 시스템(기존, 변경 없음) — `DiaryEntry`에 옵셔널 필드 `title?`이
추가되므로 필드가 없는 기존 파일도 그대로 읽혀야 한다(FR-010)

**Testing**: `npm run test:logic`(순수 함수, 대부분) + `npm run test:ui`(화면 두 곳의
이름·소개 렌더링) + `npm run test:device`(Maestro, 실기기에서 이름 표시·제목 저장·
진단 화면 모델명 확인)

**Target Platform**: Android 실기기(헌법 원칙 I) + local 개발 환경(진단 화면)

**Project Type**: Mobile app (기존 구조에 파일 둘 추가, 기존 파일 다섯 수정)

**Performance Goals**: 해당 없음 — UI 텍스트·프롬프트 문구·사후 파싱이며 성능 목표를
가지지 않는다

**Constraints**:
- 사용자 화면에 내부 식별자를 노출하지 않는다(FR-004)
- 판정 갈래는 넷 그대로(`empty`/`echo`/`language`/`unfinished`), 제목 유무로 새 갈래를
  만들지 않는다(FR-008)
- 프롬프트에 성격 지시를 넣지 않는다(FR-015, 헌법 원칙 III)
- 지어내기 교정은 프롬프트 문구로만 하고 자동 채점 코드를 두지 않는다(FR-014, 원칙 IV)
- `src/ui/`는 `roster.ts`·`ModelAsset`에 여전히 닿지 않는다(FR-018, 기존 헌법 검사 유지)
- 모델 표시 이름은 release 빌드에서 닿는 경로가 없다(FR-019)

**Scale/Scope**: 캐릭터 다섯 자리 고정(`CHARACTERS` 변경 없음). 화면 파일 2개
(`CharacterListScreen.tsx`, `CharacterPicker.tsx`) + `DiaryListScreen.tsx`의 옮김 안내
1곳 수정

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 관련 조항 | 이 기능의 적용 | 통과 |
| --- | --- | --- | --- |
| I. 온디바이스가 제품이다 | 미리 만들어 둔 응답 금지 | 이름·소개는 정적 UI 텍스트이지 생성 결과가 아니다. 제목은 매 요청마다 실제로 생성된 텍스트에서 사후 분리한다 — 캐싱이 아니다 | ✅ |
| II. 화자는 휴대폰 | 프롬프트는 `diary/prompt.ts` 하나 | 이름·언어 추가와 지어내기 교정 문구 모두 `prompt.ts`의 기존 상수 안에서만 이루어진다. 새 프롬프트 자리를 만들지 않는다 | ✅ |
| III. 모델은 캐릭터다 — 이름 비노출 | MUST NOT: 모델 식별자 노출 | 캐릭터 이름·소개는 노출해도 되는 것(정의상 페르소나)이고, 모델 식별자(`a1`·`kanana` 등)는 여전히 `src/models/roster.ts`에만 있다. `persona.ts`는 `Character`(`quiet` 등)만 받고 `ModelAsset`을 모른다 | ✅ |
| III. 씨앗과 페르소나 | 페르소나는 씨앗과 어긋나지 않는다 | 다섯 소개 문구는 로드맵 문서에 이미 실측 근거와 함께 확정돼 있다(005~012 관측) — 이 기능은 그 값을 코드로 옮길 뿐 새로 짓지 않는다 | ✅ |
| III. 성격 지시 금지 | 프롬프트에 캐릭터의 이름·말투만, 성격 지시는 안 됨 | `persona.ts`가 프롬프트에 넘기는 것은 이름과(이미 있는) 언어뿐이다. "너는 상상력이 풍부하다" 류의 문장을 만들지 않는다(FR-015) | ✅ |
| III. 진단 경로는 배포에서 안 닿음 | MUST | `roster.ts`의 `displayName`은 `diagnostics/report.ts`만 읽고, 001 SC-013이 이미 검증하는 "진단 화면이 release에서 안 보인다"가 이 필드에도 그대로 적용된다 | ✅ |
| III. `src/ui/`가 모델 자산에 안 닿음 | 헌법 검사 규칙(007) | `persona.ts`는 `src/diary/`에 있고 `Character`만 다룬다. 화면은 `persona.ts`만 import하지 `roster.ts`를 여전히 import하지 않는다 | ✅ |
| IV. 측정 장치를 이 저장소에 두지 않는다 | 자동 채점 금지 | 지어내기 감소는 SC-003에서 "사람이 읽고 판단"으로 명시했다. 코드에 유사도·점수 함수를 두지 않는다 | ✅ |
| IV. 판정 갈래를 늘리지 않는다 | acceptance.md 넷 고정 | `judge()` 시그니처·로직을 바꾸지 않는다. 제목 분리는 `judge()` 통과 **이후** `pipeline.ts`에서 일어나는 별도 순수 함수다(FR-007·009) | ✅ |
| IV. 지표를 담을 자리를 두지 않는다 | 타입 제약 | `title.ts`의 결과 타입에 파싱 성공 여부 외 시간·신뢰도 필드를 두지 않는다 — Phase 1에서 확정 | ⏳ Phase 1 |
| V. 실측/짐작 구분 | 코드에 근거를 남긴다 | 소개 문구 각각에 근거가 된 실기기 관측(005~012)을 주석으로 남긴다. 제목 형식(첫 줄/빈 줄)은 짐작이며 quickstart에서 실기기로 확인한다 | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/014-character-persona/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── persona.md       # Phase 1 output — persona.ts 계약
│   └── title.md         # Phase 1 output — title.ts 계약
└── tasks.md              # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── diary/
│   ├── persona.ts        # 신규 — Character → { name, tagline } 유일한 매핑
│   ├── title.ts           # 신규 — 판정 통과한 전체 텍스트에서 제목 사후 분리
│   ├── prompt.ts          # 수정 — SPEAKER_RULES에 이름 추가, 지어내기 교정 문구 개정
│   ├── pipeline.ts        # 수정 — judge() 통과 후 extractTitle() 호출, DiaryEntry.title 채움
│   ├── types.ts           # 수정 — DiaryEntry에 title?: string 추가
│   └── store.ts           # 수정 — DiaryListItem에 title?: string 추가(photoHintOf와 같은 자리)
├── models/
│   └── roster.ts          # 수정 — displayName 추가 (FR-004a가 막던 표시 이름의 예외적 허용처, 진단 전용)
├── diagnostics/
│   ├── types.ts           # 수정 — DiagnosticReport에 캐릭터별 모델 표시 이름 필드 추가
│   └── report.ts          # 수정 — collectReport()가 roster.displayName을 읽어 담는다
└── ui/
    ├── CharacterListScreen.tsx   # 수정 — {character} → persona 이름·소개
    ├── CharacterPicker.tsx       # 수정 — {character} → persona 이름·소개, IMAGINATIVE_NOTICE를 persona로 흡수
    ├── DiaryListScreen.tsx       # 수정 — movedFrom 안내 문구가 이름을 쓴다
    ├── DiaryDetailScreen.tsx     # 수정 — entry.title이 있으면 표시
    └── DiagnosticsScreen.tsx     # 수정 — 모델 표시 이름 렌더링(기존 구조, 문자열만 받음)

__tests__/
├── diary/
│   ├── persona.test.ts    # 신규
│   ├── title.test.ts      # 신규
│   ├── prompt.test.ts     # 수정 — 성격 지시 부재 검사(문자열 스캔) 추가
│   └── pipeline.test.ts   # 수정 — title 배선 검사
└── ui/
    ├── character-list.test.tsx   # 수정
    └── diary-list.test.tsx       # 수정
```

**Structure Decision**: 기존 5계층 구조(`config/inference/signals/vision/diary/models/
diagnostics/ui`)를 그대로 따른다. 새 파일 둘은 모두 `src/diary/`에 둔다 — 페르소나는
헌법 원칙 III이 다루는 대상이고 003의 `roster.ts`(모델 자산)와는 이미 분리된 관심사이며,
제목은 프롬프트·판정과 마찬가지로 "일기 생성 파이프라인"의 산출물이기 때문이다. 007이
세운 "`src/ui/`는 `roster.ts`·`ModelAsset`에 닿지 않는다"는 헌법 검사 규칙은 그대로
유지되고, `persona.ts`가 그 규칙 아래에서 화면이 쓸 수 있는 새로운 안전한 창구가 된다.

## Complexity Tracking

*No violations — table omitted.*
