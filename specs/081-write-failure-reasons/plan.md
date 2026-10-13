# Implementation Plan: 쓰기 실패 기록의 갈래 나누기와 개발자 화면의 「최근 실패」

**Branch**: `081-write-failure-reasons` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/081-write-failure-reasons/spec.md`

## Summary

쓰기 실패 기록(060)이 판정 거부·시간 초과·끊김·예외를 `unwritten` 하나로 뭉치고, 「최근 실패」는 배포 빌드에 없는 진단 화면에만 있다. 네 가지를 한다:

1. **파이프라인** — 판정 거부의 까닭(`why`)을 이유 문자열의 detail로 싣는다(한 줄, research R1). 지금은 버려져 060의 `empty`조차 죽은 갈래다.
2. **갈래** — `WriteFailureReason`을 다섯에서 열하나로, `writeFailureReasonFor()`의 표를 고친다. `vision` + `cancelled`는 `photos`에서 `interrupted`로 옮긴다.
3. **문구** — 새 여섯을 카탈로그의 새 영역 `failures`에 두고 `reasonText()`가 열하나를 옮긴다.
4. **화면** — 「최근 실패」 묶음을 `FailuresGroup`으로 뽑아 진단 화면(자리 그대로)과 개발자 화면(시도 묶음 아래, 새 맨 아래)이 함께 쓴다. AppFrame이 개발자 겹을 열 때 실패 기록을 함께 읽는다.

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 57, React Native 0.86)

**Primary Dependencies**: 없음 — 새 의존성 0, 네이티브 변경 0

**Storage**: `preferences/write-failures.json` 형식 그대로(`{ items: [{ reason, at }] }`, 최근 10건). `reason`이 가질 수 있는 값이 다섯에서 열하나가 된다. 새 파일 없음

**Testing**: jest 두 프로젝트 — `logic`(갈래 표·파이프라인 조립·저장·문구·배선 소스 계약)과 `ui`(묶음·두 화면, RNTL 14). 실기기는 dev 빌드(SM-S901N, 기기의 debug APK + 맥의 Metro)

**Target Platform**: Android·iOS 공통(플랫폼 분기 없음)

**Project Type**: mobile-app (단일 저장소)

**Performance Goals**: 없음

**Constraints**: 측정 코드를 제품에 넣지 않는다(원칙 IV) — 기록은 갈래와 시각뿐 · 판정 갈래 넷·토스트·시도 기록을 바꾸지 않는다 · `PipelineStage`·`PipelineResult`의 모양을 넓히지 않는다 · 062 골든 json을 다시 쓰지 않는다 · 계약을 먼저 쓰고 테스트를 먼저 쓴다 · release 빌드·`npm run test:layer1`·실패 재현 반복 실행을 하지 않는다

**Scale/Scope**: 새 소스 2개(`catalogs/ko/failures.ts`·`ui/FailuresGroup.tsx`), 수정 소스 9개(그중 `catalogs/ko/diagnostics.ts`는 주석만). 새 테스트 파일 2개(`write-failures.pipeline.test.ts`·`failures-group.test.tsx`), 수정 테스트 약 7개. 계약 문서 새 1개 + 060 계약에 대체 표기 1곳, Maestro 흐름 1개, `AGENTS.md`·로드맵

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론 위치·모델·샘플링을 건드리지 않는다. 실패는 여전히 글을 돌려주지 않는다 — 이유 문자열에 실리는 것은 닫힌 값 넷 중 하나이고 거부된 글이 아니다(002 FR-016, 005 FR-017c) |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·판정을 건드리지 않는다 |
| III. 캐릭터는 모델 위에 | 통과(판단 기록) | 「되뱉음」·「다른 언어」는 모델의 거동을 드러내는 말이다(005 FR-017e). 홈·토스트·알림에는 나오지 않고(FR-009), 버전 7번 탭 뒤의 개발자 화면에만 나온다 — 소유자가 문구와 함께 승인했다(spec Clarifications). 모델 이름·식별자는 어디에도 실리지 않는다 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 판정 갈래는 넷 그대로다 — 임계값·점수·새 판정이 없다. 기록은 「어느 문에서 멈췄는가」의 갈래와 시각뿐이고 시간·토큰·오류 문구·글을 담지 않는다(FR-006). 「시간 초과」를 더 가르려면 시간을 기록해야 하므로 가르지 않는다(spec Edge Cases) |
| V. 실측과 추측의 구분 | 통과 | 기기에서 만들 수 없는 갈래(거부 넷·시간 초과·오류)를 미확인으로 적는다. 「도중에 끊김」과 두 화면은 dev 실기기에서 본다. 이 기능이 080 실패의 까닭을 밝히지 않는다는 것을 스펙에 적었다 |
| 개발 방식 | 통과 | 계약 먼저(`contracts/write-failure-reasons.md`) → 테스트 먼저 → 구현. 기능 브랜치·한국어 커밋 |

**Post-design re-check (Phase 1 뒤)**: 위와 같다. 새 UI 파일은 `app/diagnostics-view`의 타입과 `app/diagnostics-text`만 import한다(`AttemptsGroup`과 같다) — `scripts/constitution-rules.ts`에 새 예외가 필요 없다. `write-failures.ts`는 `acceptance.ts`를 import하지 않는다(F5 — 테스트만 둘을 대조한다).

## Project Structure

### Documentation (this feature)

```text
specs/081-write-failure-reasons/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── write-failure-reasons.md   # 파이프라인(P)·갈래(F)·저장(S)·문구(T)·묶음(G)·두 화면(D)·조립(A)·흐름(M)·불변(X)
├── checklists/requirements.md
└── tasks.md                       # /speckit-tasks가 만든다
```

### Source Code (repository root)

```text
src/
├── diary/pipeline.ts                 # 이유 문자열에 why를 detail로(한 줄)
├── app/
│   ├── write-failures.ts             # WriteFailureReason 열하나, REASONS, writeFailureReasonFor 표, 머리 주석
│   ├── diagnostics-view.ts           # reasonText() 열하나
│   └── diagnostics-text.ts           # FAILURE_TEXT = lazyText((c) => c.failures)
├── i18n/catalogs/ko/
│   ├── failures.ts                   # 새 파일 — 새 여섯 문구
│   ├── diagnostics.ts                # 주석만 — failUnwritten의 「다섯째 갈래」 서술(키·값 그대로)
│   └── index.ts                      # failures 영역 등록
└── ui/
    ├── FailuresGroup.tsx             # 새 파일 — 공용 묶음
    ├── DiagnosticsScreen.tsx         # 인라인 묶음 → FailuresGroup idPrefix="diagnostics"
    └── DeveloperScreen.tsx           # failures prop, AttemptsGroup 아래 FailuresGroup idPrefix="developer"

App.tsx                               # AppFrame: failurePort + developerFailures, 개발자 겹 effect에서 함께 읽는다

.maestro/settings-developer-sweep.yml # developer-group-failures 단언
specs/060-diagnostics-screen/contracts/diagnostics.md   # WF1 머리에 「081로 대체됨」
AGENTS.md · docs/roadmap/README.md · docs/e2e/feature-flow-map.md(어긋나면)

__tests__/
├── diary/pipeline.test.ts                   # P1~P3 — 실패 결과의 reason 단언을 더한다
├── app/
│   ├── write-failures.test.ts               # F1~F7, S1~S5 — 표를 열하나로 다시 쓴다
│   ├── write-failures.pipeline.test.ts      # 새 파일 — F8 조립(진짜 createPipeline)
│   ├── diagnostics-view.test.ts             # T3
│   ├── diagnostics-text.test.ts             # T1·T4·T5·T6
│   └── auto-write-attempts-wiring.test.ts   # A1·A2 (또는 같은 꼴의 새 describe)
├── i18n/ko-golden.test.ts                   # ADDED_AFTER_GOLDEN에 여섯
└── ui/
    ├── failures-group.test.tsx              # 새 파일 — G1~G4
    ├── developer-screen.test.tsx            # D2~D4, 기본 props에 failures
    └── diagnostics-screen.test.tsx          # D1 — 기존 단언 그대로 통과
```

**Structure Decision**: 기존 구조 그대로다. 갈래 판정은 `src/app/write-failures.ts` 한 곳, 문구는 카탈로그, 묶음은 `src/ui/`의 값만 받는 부품, 기기 통로는 조립부(`App.tsx`)가 쥔다 — 078의 시도 묶음과 같은 배치다.

## 구현 순서 (테스트 먼저)

1. **파이프라인(P)** — `pipeline.test.ts`에 reason 단언을 먼저 더해 실패를 본 뒤 한 줄을 고친다.
2. **갈래·저장(F·S)** — `write-failures.test.ts`의 표를 열하나로 다시 쓰고, 조립 테스트(F8) 새 파일. 실패를 본 뒤 `write-failures.ts`. 이 시점에 `tsc`가 `reasonText()`의 빠진 갈래를 짚는다(다음 단계의 입구).
3. **문구(T)** — 카탈로그 새 영역·`FAILURE_TEXT`·`reasonText()`·골든 허용 목록.
4. **묶음·두 화면(G·D)** — `failures-group.test.tsx` → `FailuresGroup` → 진단 화면 교체(기존 테스트 그대로 통과) → 개발자 화면.
5. **조립(A)** — 소스 계약 → `App.tsx`.
6. **흐름·문서(M)** — Maestro 흐름, 060 계약의 대체 표기, 흐름 대응표.
7. **전체** — `npm test`·`npm run lint`, 위반 주입, dev 실기기(quickstart §2), `AGENTS.md`(081 절 + 060의 `empty`가 죽어 있었다는 한 줄).

## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 이유 문자열이 `"rejected"`에서 `"rejected: echo"`로 바뀌어 다른 읽는 곳이 조용히 갈래를 바꾼다 | 읽는 곳은 둘뿐이다(R2, 062 B3가 잠근다). `failure-toast.test.ts`가 이미 `"rejected: echo"` → `retry`를 잠근다 |
| 손으로 쓴 이유 문자열로만 테스트해 또 죽은 갈래가 생긴다 | F8 조립 테스트 — 진짜 파이프라인이 만든 결과를 그대로 넣는다. 위반 주입으로 확인 |
| 진단 화면의 묶음을 부품으로 바꾸다 모양·testID가 달라진다 | 기존 `diagnostics-screen.test.tsx`를 수정 없이 통과시키는 것이 조건(D1). JSX를 그대로 옮긴다 |
| 개발자 화면의 `failures`를 필수 prop으로 더해 다른 렌더 자리가 깨진다 | `tsc` 0이 완료 조건 — 빠진 자리는 `tsc`가 짚는다 |
| 개발자 화면 맨 아래가 내려가 Maestro 흐름이 깨진다 | M1로 고치고 실기기에서 개발자·진단 구간을 돌린다(quickstart D4) |
| 옛 빌드가 새 갈래 줄을 버려 테스터가 버전을 내렸을 때 줄이 준다 | 받아들인다 — 파일의 줄은 남고 새 빌드에서 다시 보인다(옛 빌드는 읽기만 버린다; 단 옛 빌드가 새 실패를 기록하면 버린 줄 없이 다시 쓴다 — 버전을 내리는 일은 테스트 배포에서 드물다) |

## Complexity Tracking

위반 없음 — 채울 것이 없다.
