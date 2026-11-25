# Implementation Plan: 안내 규칙 잠금 테스트 (G6)

**Branch**: `132-guidance-lock-g6` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

## Summary

안내 규칙 K1·K3·K4를 기기 없는 소스·카탈로그 계약 테스트 한 파일로, K8·K9를 `DiaryListScreen` 렌더 테스트로 잠근다. K11은 `writingLeaveNote`에 이어 하기 가능 여부 인자를 더하고 조립부가 iOS 주 버전으로 판정한다(유일한 동작 변경). 끝나면 규칙 문서에서 G6·잠근 5장 행을 걷는다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86) · **Testing**: jest 두 프로젝트(`logic` `.ts`, `ui` `.tsx`), RNTL 14
**Storage**: 없음 · **Target**: iOS 16.4+ / Android · **Project Type**: mobile app
**Constraints**: 문구 골든 변경 0(SC-003), 주석을 걷고 소스를 읽는다(AGENTS), 위반 주입으로 각 규칙 확인
**Scale/Scope**: 테스트 2~3 파일, 소스 2 파일(`src/app/leave-note.ts`, `App.tsx`), 문서 1(규칙 문서)

## Constitution Check

- 원칙 V(모르는 것을 기본값으로 채우지 않는다): K11의 버전 모름 → 줄 없음. ✓
- 화면 한글은 카탈로그에만: 새 문구 없음. ✓
- `process.env`·추론·프롬프트 경계 무관. ✓
- 측정·채점 코드 없음. ✓
- 실기기 확인: K11 줄을 iOS 26+ 실기기(iPhone 14, iOS 27)에서 쓰는 중 화면으로 본다. 26 미만 기기는 없음 — 단위 테스트로만(남은 위험). ✓(설계 후 재평가 동일)

## Project Structure

```text
src/app/leave-note.ts            writingLeaveNote(platform, continuedAvailable) + continuedAvailableFor(platform, version)
App.tsx                          조립부 호출부
__tests__/config/guidance-lock.test.ts   K1·K3·K4 (logic)
__tests__/app/leave-note.test.ts         K11 판정 + 소스 계약 (logic)
__tests__/ui/guidance-lock-home.test.tsx K8·K9 (ui)
docs/user-guidance-rules.md      G6 행·잠근 5장 행 걷기
```

data-model.md는 만들지 않는다 — 저장 엔티티가 없다(허용 목록은 테스트 상수). 계약은 [contracts/lock-rules.md](contracts/lock-rules.md).
