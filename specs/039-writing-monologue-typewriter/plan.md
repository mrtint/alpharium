# Implementation Plan: 생성 중 독백 문구 타자기 연출

**Branch**: `039-writing-monologue-typewriter` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-writing-monologue-typewriter/spec.md`

## Summary

생성 중 화면(`DiaryHomeScreen`의 `case "writing"`)이 `screen.line`(독백 문구)을
`AppText`로 즉시 렌더하는 것을, 038이 만든 `TypewriterText`로 교체해 글자 단위로
노출한다. `line`은 파이프라인의 `onProgress(stage, branch)` 콜백이 단계 전환
시에만 갱신하므로(같은 단계 안에서 자동으로 몇 초마다 바뀌는 로직은 없음 —
research 참조), `TypewriterText`를 `key={line}`으로 리마운트하는 038과 동일한
패턴이 그대로 적용된다. `skipToEnd`는 항상 `false`로 고정한다(탭 건너뛰기
없음, US2). 새 컴포넌트·새 유틸 없음 — 038 자산 재사용뿐이다.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86.2 (Expo 57)

**Primary Dependencies**: React 코어 hooks(`useState`/`useEffect`)뿐. 038의
`src/ui/components/TypewriterText.tsx`·`src/ui/theme/tokens.ts`의 `REVEAL.charMs`를
그대로 재사용. 새 의존성 없음.

**Storage**: N/A — 화면 로컬 렌더링만 다룬다. 저장 계층 무관.

**Testing**: jest(`ui` 프로젝트, jest-expo) + RNTL(`@testing-library/react-native`).
038의 `typewriter-text.test.tsx` 패턴을 참고해 `DiaryHomeScreen`의 `case
"writing"` 렌더링만 계약 테스트로 검증.

**Target Platform**: Android 실기기(dev build) — 038과 동일.

**Project Type**: Mobile app(React Native, 기존 저장소 구조 그대로).

**Performance Goals**: N/A — 이 기능은 성능 목표가 아니라 시각 연출이다.

**Constraints**: 원칙 IV(측정 장치 금지) — 새 정보(진행률·경과시간·생성 중
본문)를 추가하지 않는다(FR-005). 038이 정한 `charMs` 값을 재사용해 화면마다
타이핑 속도가 달라지지 않게 한다(FR-007).

**Scale/Scope**: 화면 하나(`DiaryHomeScreen`의 `case "writing"` 블록)만 수정.
새 파일 없음.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 관련성 | 판정 |
|------|--------|------|
| I. 온디바이스가 제품이다 | 무관 — 추론 경로를 건드리지 않는다 | PASS |
| II. 화자는 휴대폰이고 시야는 좁다 | 무관 — 프롬프트·생성 결과를 건드리지 않는다 | PASS |
| III. 모델은 캐릭터다 | 무관 — 독백 문구는 캐릭터 이름을 쓰지 않는다(015 결정 유지) | PASS |
| IV. 측정 장치를 제품에 들이지 않는다 | **핵심 경계.** 이 기능은 이미 고정된 문구가 "나타나는 방식"만 바꾼다 — 새 지표·진행률·경과시간을 추가하지 않는다(FR-005, US3가 이 경계를 명시적으로 검증) | PASS (조건: US3 계약 테스트로 잠금) |
| V. 관측된 사실과 추측을 구분해 기록한다 | 무관 — 값을 다루지 않는다 | PASS |

**결론**: 위반 없음. 헌법 개정 불필요. Complexity Tracking 섹션 불필요(아래
표는 빈 채로 둔다).

**Post-Design Re-Check** (Phase 1 설계 완료 후): research.md 결정 1~6과
data-model.md·contracts/writing-monologue-typewriter.md를 검토한 결과,
설계는 038의 `TypewriterText`를 그대로 재사용하고 `onDone`을 무시하며
(결정 3) `AppScreen` 타입을 확장하지 않는다(data-model.md) — 새 지표·
진행률·상태를 하나도 추가하지 않는다. 원칙 IV 경계는 설계 단계에서도
그대로 PASS 유지.

## Project Structure

### Documentation (this feature)

```text
specs/039-writing-monologue-typewriter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── ui/
│   ├── DiaryHomeScreen.tsx        # 수정 — case "writing"의 문구 렌더를
│   │                                TypewriterText로 교체
│   └── components/
│       └── TypewriterText.tsx     # 038 자산 재사용, 무수정
└── (기타 전부 무변경 — src/diary/, src/inference/, src/vision/, src/app/state.ts)

__tests__/
└── ui/
    └── writing-monologue-typewriter.test.tsx   # 신규 — case "writing" 렌더 계약
```

**Structure Decision**: 단일 파일(`DiaryHomeScreen.tsx`) 수정 + 신규 테스트
파일 하나. 038과 마찬가지로 `src/diary/`·`src/inference/`·`src/vision/`·
`src/app/state.ts`는 무변경이어야 한다(SC 대응, git diff --stat으로 확인).

## Complexity Tracking

> 위반 없음 — 이 섹션은 채우지 않는다.
