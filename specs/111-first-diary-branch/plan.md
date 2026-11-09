# Implementation Plan: 첫 일기 분기

**Branch**: `111-first-diary-branch` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

## Summary

정상 동작 확인을 통과한 첫 실행이 오늘 재료를 읽어 있을 때만 묻고, 고른 때만 홈의 제자리 쓰기로 쓴다. 쓰기가 실패하면 실행당 한 번 확인으로 되돌린다. 묻지 않고 파이프라인을 직접 돌리던 040 자동 첫 일기(`triggerFirstRunAutoDiary`·`auto-diary.ts`)는 걷는다.

## Technical Context

**Language/Version**: TypeScript, React Native 0.86, Expo SDK 57

**Primary Dependencies**: 새 의존성 없음. 기존 `decideMaterial`(053), 홈 쓰기 요청(060), 이어 하기(092), `ConfirmDialog`(050)

**Storage**: 없음 — 흐름 상태는 세션 로컬

**Testing**: jest `logic`(순수·조립), `ui`(홈·대화상자), 소스 계약, 층 2 e2e, iOS 시뮬레이터 Maestro

**Target Platform**: Android(SM-S901N), iOS(iPhone 14·13 mini) — 실기기 확인은 기기가 빌 때

**Project Type**: 모바일 앱

**Performance Goals**: 재료 읽기 한도 10초(사람이 정한 값 — 측정 아님, 원칙 V)

**Constraints**: `src/firstrun/`는 파이프라인·로스터에 닿지 않는다(`checkFirstRunFile`). 화면 한글은 카탈로그에만. 문구 골든은 `ADDED_AFTER_GOLDEN`. 110 코드·App.tsx 하단 바 작업을 끌어오지 않는다

**Scale/Scope**: 제품 파일 약 7개 + e2e·문서

## Constitution Check

- **I 온디바이스**: 쓰기는 실제 파이프라인 그대로. 미리 만든 응답 없음. 통과.
- **II 화자**: 프롬프트를 건드리지 않는다. 재료 없는 지어낸 하루를 첫인상에서 뺀다. 통과.
- **III 캐릭터**: 사양 노출 없음. 원문 오류를 화면에 싣지 않는다. 통과.
- **IV 측정 장치**: 되돌림 횟수는 지표가 아니라 분기 입력이고 파일에 남기지 않는다. 통과.
- **V 관측·추측**: 볼 수 없는 재료를 「없다」고 말하지 않고 묻지만 않는다. 10초 한도는 사람이 정한 값으로 적는다. 실기기 확인 전에 완료로 닫지 않는다. 통과.
- **개발 방식**: 테스트 먼저, 한국어 커밋, 기능 브랜치. 통과.

설계 후 재평가: 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/111-first-diary-branch/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
└── contracts/first-diary-flow.md
```

### Source Code

```text
src/firstrun/first-diary.ts         새 — 단계 전이(순수)
src/firstrun/auto-diary.ts          삭제
src/app/first-diary-material.ts     새 — 재료·오늘 일기 읽기, 한도, 쓰기 결과 → 갈래
src/app/use-first-diary-flow.ts     새 — 흐름 상태·재료 읽기·되돌림 신호(App.tsx에서 뗀 훅)
src/app/wiring.ts                   triggerFirstRunAutoDiary 삭제
src/app/use-auto-write-claim.ts     주석만(표식 이름)
src/ui/MaterialDialogs.tsx          FirstDiaryConfirmDialog
src/ui/home-text.ts                 문구 연결
src/i18n/catalogs/ko/home.ts        문구
src/ui/DiaryHomeScreen.tsx          쓰기 요청의 첫 일기 갈래·결과 콜백
App.tsx                             흐름 조립, 확인창, 되돌림
scripts/layer2/*                    첫 일기 흐름·재료 없음 흐름·오늘 사진 심기
scripts/layer2-ios/flows.ts         사람 조작·사진 심기
scripts/run-device-tests.mjs, .maestro/*, docs/e2e/feature-flow-map.md
scripts/constitution-rules.ts       설명 주석
docs/user-guidance-rules.md, AGENTS.md
```

## Complexity Tracking

없음.
