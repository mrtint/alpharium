# Implementation Plan: 완성된 일기 첫 표시를 타자기 연출로

**Branch**: `038-typewriter-diary-reveal` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/038-typewriter-diary-reveal/spec.md`

## Summary

일기 생성·판정·저장이 모두 끝난 뒤의 **첫 표시**(`app/state.ts`의
`{ kind: "written" }`)에서, `DiaryDetailScreen`이 제목→본문을 글자 단위로
점진 노출하고, 본문 타이핑이 끝난 뒤에만 "이 일기가 본 것" 절과 사진 슬라이더를
렌더한다. 화면 아무 곳이나 탭하면 즉시 전체가 드러난다(연출 완료 전 = 건너뛰기,
완료 후 = 아님). 목록에서 다시 여는 경로(`{ kind: "detail" }`)는 이 기능 도입
전과 100% 동일하다.

기술 접근의 핵심은 **`DiaryDetailScreen`에 옵셔널 `reveal` prop 하나를 더하는
것**이다(브레인스토밍 A안). `reveal`이 있으면 점진 노출, 없으면 지금과 동일.
새 순수 표시 컴포넌트 `TypewriterText`가 완성 문자열을 `Array.from()`으로 잘라
타이머로 흘린다 — **reanimated 불필요**(투명도 전환이 아니라 문자열 슬라이스라
`setState`로 충분, 021/033의 눌림 피드백 작업과 무관).

**헌법 개정 없음.** `src/diary/`·`src/inference/`·`src/vision/`·파이프라인·판정
4갈래·저장 스키마 무변경. `src/ui/` 안에서 완결된다(025 갤러리와 같은 성격).

## Technical Context

**Language/Version**: TypeScript 5.x (React Native 0.86 / Expo SDK 57)

**Primary Dependencies**: 기존 의존만 — `react-native` 코어(`Pressable`·`View`·
`Text`), NativeWind 토큰. **새 네이티브 모듈 0개. reanimated 사용 안 함.**

**Storage**: 없음. `DiaryEntry`(제목·본문·신호·타이밍·사진)를 읽기 전용으로
소비한다. 첫 표시 여부는 이미 `app/state.ts`가 `written`/`detail`로 구분하며
파일에 남기지 않는다(009·025 선례).

**Testing**: jest 두 프로젝트 — `test:ui`(`.tsx`, jest-expo)가 이 기능의 주
검증 자리다(`TypewriterText`·`DiaryDetailScreen` 계약). `jest.useFakeTimers` +
`act(() => jest.advanceTimersByTime())`로 노출 글자 수 증가를 검증. 순수 문자열
분할 유틸이 생기면 `test:logic`(`.ts`)로도 잠근다. 실기기는 Maestro.

**Target Platform**: Android (SM-S901N / Galaxy S22, debug 빌드로 검증)

**Project Type**: 모바일 앱 (단일 저장소, `src/` 축별 분리)

**Performance Goals**: 해당 없음 — 원칙 IV가 지표 수집·비교를 금한다. 유일한
시간 값은 `REVEAL.charMs`(글자당 노출 간격, 기본 ~15ms) — **사람이 정한 상수**,
화면에 노출하지 않음, 여러 실행 비교 없음.

**Constraints**:
- `src/diary/`·`src/inference/`·`src/vision/` 0줄 변경(SC-006)
- 일기 판정 갈래 넷 그대로, 파이프라인 시그니처 무변경
- 생성 중 화면(`{ kind: "writing" }`)은 이 기능으로 바뀌지 않는다(FR-011, SC-005)
- 연출은 첫 표시에서만, 목록 재진입은 즉시 전체(FR-007, SC-004)
- 새 네이티브 모듈 없음 → debug 실기기 1회로 충분(012 기준)
- 화면 이탈·백그라운드 시 타이머 정리(FR-014)

**Scale/Scope**: 신규 컴포넌트 1개(`TypewriterText.tsx`), 신규 순수 유틸 1개
(글자 경계 분할), 기존 파일 수정 3개(`DiaryDetailScreen.tsx`·`DiaryHomeScreen.tsx`
+ 필요 시 `scripts/constitution-rules.ts`). FR 14개.

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 후 재확인.*

| 원칙 | 관련 | 판정 | 근거 |
|---|---|---|---|
| **I. 온디바이스가 제품이다** | 생성 경로 | ✅ PASS | 생성·추론 경로를 건드리지 않는다. 이미 생성·저장된 문자열을 화면에서 자를 뿐 |
| **II. 화자는 휴대폰이고 시야는 좁다** | 본문 내용 | ✅ PASS | 본문·제목 문자열을 바꾸지 않는다. 자르는 순서만 정한다 |
| **III. 모델은 캐릭터다** | 화면이 모델을 아는가 | ✅ PASS | `DiaryDetailScreen`은 지금도 `entry`만 받는다. `reveal`은 boolean 하나 — 모델·로스터에 닿지 않는다 |
| **IV. 측정 장치를 들이지 않는다** | ⚠️ **톤 위험** | ✅ PASS (방어 포함) | 타자기가 "실시간 생성 중"처럼 *보이면* 015·016이 세운 "생성 중엔 회전 표시만" 경계를 흐린다. **방어**: (1) `{ kind: "writing" }` 화면은 무변경(FR-011) — 회전 표시·"그만두기"·금지어 0(SC-005). (2) 연출 대상은 **판정 통과·저장 완료** 문자열이라 헌법이 금하는 "생성 중인 글"(005 FR-028b)이 아니다. (3) `REVEAL.charMs`는 화면에 안 뜨고 비교·평균 없음 |
| **V. 관측된 사실과 추측을 구분** | 상수 근거 | ✅ PASS | `REVEAL.charMs`는 **사람이 정한 값**(012 `USER_VISIBLE_SIGNAL_AXES`·033 `PRESS` 선례) — 코드가 재서 정하지 않는다 |

**추가 게이트 (저장소 관례)**:

| 항목 | 판정 |
|---|---|
| 프롬프트는 `prompt.ts`에만 | ✅ 해당 없음 (프롬프트 무관) |
| 판정 갈래 4개 유지 | ✅ `acceptance.ts` 무변경 |
| `process.env`는 `environment.ts`에서만 | ✅ 해당 없음 |
| jest 두 프로젝트 분리 | ✅ 컴포넌트 `.tsx`(test:ui) / 분할 유틸 `.ts`(test:logic) |
| main 직접 작업 금지 | ✅ `038-typewriter-diary-reveal` 브랜치 |
| 새 네이티브 모듈 시 release 재확인 | ✅ 새 모듈 0개 → debug 1회(012) |
| 새 Maestro 흐름은 `run-device-tests.mjs` `FLOWS`에 등록 | ✅ 신규 흐름 없음 — 기존 "생성 후 상세" 흐름 시작부에 "화면 탭(건너뛰기)" 추가 |

**GATE 결과: PASS.** 헌법 개정 불필요. 원칙 IV 톤 위험은 FR-011·SC-005로
방어되며 새 헌법 검사 규칙은 넣지 않는다(research 결정 7).

## Project Structure

### Documentation (this feature)

```text
specs/038-typewriter-diary-reveal/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물 ✅
├── data-model.md        # Phase 1 산출물 ✅
├── quickstart.md        # Phase 1 산출물 ✅
├── contracts/           # Phase 1 산출물
│   ├── typewriter-text.md   # TypewriterText 컴포넌트 계약
│   └── diary-reveal.md      # DiaryDetailScreen reveal 흐름 계약
├── checklists/
│   └── requirements.md  # ✅ 16/16
└── tasks.md             # /speckit-tasks 산출물 (아직 없음)
```

### Source Code (repository root)

```text
src/
└── ui/
    ├── components/
    │   └── TypewriterText.tsx    ★ 신규 — 완성 문자열을 글자 단위로 흘리는 순수 표시 컴포넌트
    ├── text/
    │   └── grapheme-slice.ts     ★ 신규 — 글자 경계 안전 분할 순수 유틸 (Array.from 기반)
    ├── DiaryDetailScreen.tsx     수정 — 옵셔널 `reveal` prop, reveal 시 제목/본문 점진 노출 + 하단 절 지연
    └── DiaryHomeScreen.tsx       수정 — `case "written"`에서만 `reveal` 전달, `case "detail"`은 무변경

scripts/
└── constitution-rules.ts        변경 없음 — 새 헌법 검사 규칙을 넣지 않는다(research 결정 7).
                                  "생성 중처럼 보임" 톤 위험은 소스 토큰 검사로 잡을 종류가
                                  아니며 FR-011 계약 테스트(writing 케이스 diff 0)가 직접 방어한다.

__tests__/
├── ui/
│   ├── typewriter-text.test.tsx      ★ 신규 (.tsx) — C1~Cn 계약
│   └── diary-reveal.test.tsx         ★ 신규 (.tsx) — reveal 유무별 하단 절 존재/부재
└── ui/text/
    └── grapheme-slice.test.ts        ★ 신규 (.ts) — 이모지·서로게이트·결합 문자 경계

.maestro/
└── (신규 흐름 없음) diary-photo-gallery.yml 등 "생성 후 상세" 흐름 시작부에
    "화면 탭(건너뛰기)" 단계 추가
```

**Structure Decision**: 025가 세운 패턴 — **`src/ui/` 안에서 완결되는 순수 표시
기능**. `diary/`·`vision/`·`signals/`·`models/`·`inference/` 무수정. 새 컴포넌트는
`src/ui/components/`(032의 재사용 컴포넌트 7종과 같은 자리), 순수 문자열 유틸은
`src/ui/text/`(테스트를 `test:logic`으로 돌리려면 `.ts`여야 하고 RN 런타임에
의존하지 않아야 한다).

`grapheme-slice.ts`를 별도 파일로 빼는 이유: FR-009(이모지·서로게이트·결합 문자
경계)를 **기기 없이** 잠그려면 순수 함수여야 한다. `TypewriterText.tsx`는
jest-expo(RN 런타임)에서만 도는데, 글자 경계 로직이 거기 묻히면 `test:logic`에서
검증할 수 없다.

## Phase 1 실행 순서 (핵심 의존성)

```
순수 유틸 (기기 불필요)
  └─ src/ui/text/grapheme-slice.ts  (Array.from 기반 글자 배열 + 길이 N 접두 문자열)
  │
  ▼
표시 컴포넌트 (jest-expo)
  └─ src/ui/components/TypewriterText.tsx
       props: { text, charMs, skipToEnd, onDone }
       - Array.from(text)를 타이머로 노출, skipToEnd면 즉시 전체 + onDone 1회
       - text 교체 시 처음부터, 언마운트 시 타이머 정리
  │
  ▼
화면 수정
  ├─ DiaryDetailScreen.tsx
  │    - 옵셔널 reveal?: boolean
  │    - reveal이 참: 제목(있으면) → 본문을 TypewriterText로, 완료 전 하단 절·슬라이더 미렌더
  │    - reveal이 참: 화면 전체를 Pressable로 감싸 탭 → skip 상태로
  │    - saved:false / overwrote:true 안내는 reveal과 무관하게 표시(FR-012)
  │    - reveal이 없거나 거짓: 지금과 100% 동일
  └─ DiaryHomeScreen.tsx
       - case "written": <DiaryDetailScreen reveal ... />
       - case "detail": 무변경
  │
  ▼
계약 테스트 + 위반 주입
  ├─ grapheme-slice.test.ts       (.ts)
  ├─ typewriter-text.test.tsx     (.tsx)
  └─ diary-reveal.test.tsx        (.tsx)
  │
  ▼
Maestro 흐름 조정 + 실기기 (debug 1회)
```

## Complexity Tracking

> Constitution Check에 정당화가 필요한 위반 없음.

이 기능은 새 경계·새 저장·새 네이티브 모듈·헌법 개정이 없다. 늘어나는 것은
`src/ui/` 안의 컴포넌트 1개 + 순수 유틸 1개이며, 025가 같은 자리에서 같은 규모의
작업을 한 선례가 있다.

**유일하게 주의할 지점**: 원칙 IV의 "생성 중처럼 보임" 톤 위험. 이것은 코드
복잡도가 아니라 검증 항목이며 FR-011(생성 중 화면 무변경)·SC-005(금지어 0)가
방어한다.

## Post-Design Constitution Re-Check

*Phase 1 설계(data-model.md, contracts/) 작성 후 재평가.*

| 원칙 | 재확인 | 결과 |
|---|---|---|
| I | 생성·추론 경로 `git diff` 0줄. `TypewriterText`는 문자열만 받는다 | ✅ |
| II | 본문·제목 문자열 불변. 자르는 순서만 결정 | ✅ |
| III | `reveal: boolean` 하나. `DiaryDetailScreen`이 로스터·모델에 닿지 않는 것은 지금과 동일 | ✅ |
| IV | `{ kind: "writing" }` 화면 diff 0줄. `TypewriterText` props에 시간·토큰·비교 값 없음(`charMs`는 상수 주입, 노출 안 함). 연출 대상은 판정 통과·저장 완료 문자열 | ✅ |
| V | `REVEAL.charMs`는 사람이 정한 상수. 첫 표시 여부는 `app/state.ts`가 이미 만든 구분(코드가 새로 판정하지 않음) | ✅ |

**최종 판정: PASS (조건 없음).**
