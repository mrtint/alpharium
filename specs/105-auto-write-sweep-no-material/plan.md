# Implementation Plan: 자동 쓰기 후보 훑기 (105)

**Branch**: `105-auto-write-sweep-no-material` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: `specs/105-auto-write-sweep-no-material/spec.md`, 설계 `docs/superpowers/specs/2026-10-26-auto-write-sweep-no-material-design.md`

## Summary

`decideSchedule`이 후보 날 전부(최근→과거)를 돌려주고, `resolveAutoWrite`가 그 목록을 훑어 재료 있는 첫 날을 쓰기로 정한다. 시도 기록 줄에 선택 필드 `day`를 더하고 진단 화면이 보인다. 세 경로(백그라운드·앱 열기·알림)는 이미 `resolveAutoWrite` 하나를 쓰므로 호출부 변화는 기록에 날을 넘기는 것뿐이다. 새 저장 상태 없음.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57 / RN 0.86)

**Primary Dependencies**: 없음(순수 로직 변경) — 기존 `src/app/material.ts`·`src/app/state.ts`

**Storage**: 기존 `preferences/auto-write-attempts.json`에 줄당 선택 필드 `day` 하나(옛 파일 호환). 새 파일 없음

**Testing**: jest — logic 프로젝트(`__tests__/schedule/`, `__tests__/app/`), ui(골든), 실기기 SM-S901N

**Target Platform**: Android·iOS (판정은 플랫폼 무관)

**Project Type**: mobile-app

**Performance Goals**: 후보 최대 3일치 미리보기 조회. 헤드리스 소요는 실기기에서 측정(예산 언급은 지표가 아님)

**Constraints**: 078 창 규칙·090 하루 1회 몫 시점 불변, 결과 갈래 불변(원칙 IV), 모름을 단정하지 않음(원칙 V)

**Scale/Scope**: 파일 5~6개 수정

## Constitution Check

- I 온디바이스: 영향 없음. II 화자: 프롬프트 불변. III 캐릭터: 불변.
- IV 측정 장치: `day`는 사람이 읽는 사실(날짜)이며 시간·횟수·토큰이 아니다. 결과 갈래를 늘리지 않는다. 통과.
- V 관측/추측: 조회 실패·셀 수 없음을 재료 있음으로 채우지 않고, 전부 예외면 단정하지 않고 던진다. 실기기 확인 포함. 통과.
- 경계: `process.env`·day-boundary 불변, `src/schedule/`은 `src/app/material`·`state` 의존 그대로.

재설계 후 재확인: 위반 없음.

## Project Structure

```text
specs/105-auto-write-sweep-no-material/
├── plan.md  research.md  data-model.md  quickstart.md  tasks.md
└── contracts/sweep.md

src/schedule/retry.ts            pickRetryDays 추가 (pickRetryDay는 첫 원소로 유지)
src/schedule/decision.ts         act:true에 days 추가
src/schedule/auto-write.ts       resolveAutoWrite 훑기
src/app/auto-write-attempts.ts   AutoWriteAttempt.day, attemptDayOf, recordAttemptEnd(day)
src/schedule/task.ts             BodyOutcome.day, 기록에 전달
src/app/use-auto-write-handoff.ts  기록에 day 전달
src/app/diagnostics-view.ts + src/i18n/catalogs/ko/attempts.ts  날 꼬리
__tests__/schedule/{retry,decision,auto-write,sweep-assembly}.test.ts, __tests__/app/…attempts…, i18n 골든
```

**Structure Decision**: 기존 모듈 안의 변경. 새 모듈 없음.
