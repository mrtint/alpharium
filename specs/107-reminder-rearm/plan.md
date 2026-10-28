# Implementation Plan: 쓸 차례 알림 다시 걸기

**Branch**: `107-reminder-rearm` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

## Summary

프로세스의 첫 맞추기에서 계획 전부를 다시 건다. 순수 맞추기(`src/schedule/reminders.ts`)는 의존성 `rearm`(문: `pending()`·`done()`)을 받아 쓰고, 프로세스 메모리 문은 기본 조립(`reminder-deps.ts`)이 든다.

## Technical Context

**Language**: TypeScript (Expo SDK 57, RN 0.86) · **Testing**: jest `logic` 프로젝트(`__tests__/schedule/`) · **Storage**: 없음(새 파일 없음) · **Target**: 안드로이드(주), iOS(무해) · **Constraints**: 085 RC1~RC8, 104, 106 불변. 기기 사용 금지(이번 세션) — 실기기 미확인은 목록으로 남김.

## Constitution Check

- I~IV: 해당 없음(추론·페르소나·측정 장치 무관).
- V: 알람이 살아 있는지 읽을 통로가 없음을 인정하고 보수적 신호를 쓴다. 실측 없는 값은 문서에서 「사람이 정한/미확인」으로 표시. 실기기 미확인을 완료로 부르지 않는다. **통과.**
- 개발 방식: 계약·테스트 먼저, 한국어 커밋, 기능 브랜치. **통과.**

## Project Structure

```text
specs/107-reminder-rearm/{spec,plan,research,data-model,quickstart,tasks}.md, contracts/rearm.md
src/schedule/reminders.ts        # rearm 의존성, 다시 걸기 분기, 실패 추적
src/schedule/reminder-deps.ts    # 프로세스 메모리 문 + overrides.rearmGate
__tests__/schedule/reminders.test.ts            # 단위 (RA1~RA7) · RA8은 reminder-deps 테스트
__tests__/schedule/reminder-deps.test.ts        # 문이 프로세스당 한 번
__tests__/schedule/reminder-rearm-assembly.test.ts  # 실제 조립(deps + 대역 통로) 최소 한 번
```

## Design

계약은 [contracts/rearm.md](contracts/rearm.md), 데이터는 [data-model.md](data-model.md), 근거는 [research.md](research.md), 검증은 [quickstart.md](quickstart.md).
