# Implementation Plan: 작명 화면을 디자인 보드 1a와 일치시키기

**Branch**: `047-welcome-naming-1a` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/047-welcome-naming-1a/spec.md`

## Summary

`WelcomeScreen`의 `welcome` 단계 하나만 디자인 보드 `1a`와 같게 다시 그린다 —
"ALPHARIUM" 표지, 🤖 얼굴 타일, `1a` 문구, 세로 중앙 묶음 + 하단 버튼 줄, 이름 옆
"n/12" 카운터, 화살표 붙은 확정 버튼. `checking`/`failed`와 props 계약, 조립부
(`App.tsx`)는 건드리지 않는다. 바뀌는 파일은 화면 하나와 그 계약 테스트다.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86 / Expo SDK 57
**Primary Dependencies**: 기존 `Button`·`AppText`·`COLORS`/`TYPE` 토큰. 새 의존성 없음
**Storage**: 없음 (이름 초안은 화면 로컬 `useState`, 저장 방식 무변경)
**Testing**: jest-expo `ui` 프로젝트(`__tests__/ui/welcome-screen.test.tsx`), Maestro `welcome-naming.yml`
**Target Platform**: Android 실기기(SM-S901N), dev debug
**Project Type**: mobile app (단일 프로젝트)
**Performance Goals**: 해당 없음 (정적 레이아웃)
**Constraints**: 새 네이티브 모듈 0 → dev 1회 실기기 확인으로 충분(012 기준). 색은 `COLORS.*`만
**Scale/Scope**: 화면 파일 1개 + 테스트 파일 1개

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I (실패가 텍스트를 반환하지 않음 / 막다른 길 없음) | PASS | [나중에 할래요] 유지(W11), 실패 단계 무변경 |
| II (기록에 없는 것을 단언하지 않음) | PASS | 문구는 사람이 쓴 고정 상수(L16), 추론 텍스트 없음 |
| III (모델·캐릭터 경계) | PASS | props 무변경 — 문자열·콜백만. `src/welcome/` import 금지 유지(W14). 🤖는 화면 상수이며 `Character`·로스터를 읽지 않음 |
| IV (측정 장치 금지) | PASS | "n/12"는 입력 중 글자 수 표시이지 성능·모델 지표가 아님. 시간·바이트·퍼센트 없음 |
| V (실측 우선) | PASS | 치수는 `1a` 마크업에서 옮긴 사람의 값. 실기기 dev 확인을 완료 조건으로 둔다 |

**사후 재검토(Phase 1 후)**: 위 판정 그대로 PASS — 설계가 props·조립부를 건드리지 않음을 확인.

## Project Structure

### Documentation (this feature)

```text
specs/047-welcome-naming-1a/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/welcome-1a.md
└── tasks.md            (/speckit-tasks)
```

### Source Code (repository root)

```text
src/ui/WelcomeScreen.tsx                 # welcome 단계 레이아웃·문구·카운터 (수정)
__tests__/ui/welcome-screen.test.tsx     # 계약 테스트 갱신 + 047 계약 추가 (수정)
.maestro/welcome-naming.yml              # 문구 의존 여부 확인, 필요 시 갱신
docs/roadmap/README.md                   # 047 기록 (이미 반영)
```

**Structure Decision**: 화면 한 파일 안에서 완결한다. 얼굴 타일·카운터를 별도 컴포넌트로
빼지 않는다(쓰는 곳이 하나뿐 — 032가 남긴 "만들고 안 쓰는" 자리를 만들지 않는다).

## Complexity Tracking

위반 없음.
