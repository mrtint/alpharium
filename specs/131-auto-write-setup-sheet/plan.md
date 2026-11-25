# Implementation Plan: 자동 쓰기 설정 창 (G4)

**Branch**: `131-auto-write-setup-sheet` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

## Summary

첫 실행이 처음 끝날 때 온보딩 플래그에 `autoWriteSetupPending: true`를 남기고, 홈에서 조건(대기·첫 일기 흐름 끝·쓰는 중 아님·다른 확인 질문 없음)이 맞으면 `AutoWriteSetupDialog`를 띄운다. 「켜기」는 기존 `applyTargetHour`·`applyToggleOn/Off`로 저장, 「나중에」는 저장 없이 대기만 지운다. 온보딩 단계 계획에서 `battery-exception`을 뺀다.

## Technical Context

- **Language/Version**: TypeScript, Expo SDK 57 / RN 0.86
- **Storage**: `preferences/onboarding.json`(기존 `OnboardingFlag`에 필드 하나)
- **Testing**: jest `logic`(순수 판정·플래그·단계 계획)·`ui`(창 렌더), 실기기 dev 빌드
- **Platform**: iOS·안드로이드(배터리 행은 안드로이드만)
- **Constraints**: 화면 한글은 `src/i18n/catalogs/ko/`만, 문구 골든은 `CHANGED_AFTER_GOLDEN`/`ADDED_AFTER_GOLDEN`, 배터리 상태 읽기는 `battery-exception-port.ts` 한 곳(FX1)

## Constitution Check

- 원칙 II(관측 못 하는 것 단언 금지): D5 조건 줄은 조건부 약속 — 통과.
- 원칙 III(모델 정보 비노출): 새 문구에 모델 정보 없음 — 통과.
- 원칙 V(모르는 값 기본값 금지): 배터리 상태 `unknown`이면 꼬리표 없음 — 통과.
- 경계: `src/ui/`는 `schedule` 저장을 직접 부르지 않고 App이 넘긴 콜백만 — 통과.

## Project Structure (바뀌는 파일)

```text
src/onboarding/flag.ts            autoWriteSetupPending 필드(옛 파일 false)
src/onboarding/decision.ts        planOnboardingSteps에서 battery-exception 제외
src/ui/OnboardingScreen.tsx       배터리 단계 화면 걷음, 첫 완료 때 pending true
src/app/auto-write-setup.ts       (새) shouldShowAutoWriteSetup · confirmAutoWriteSetup
src/ui/AutoWriteSetupDialog.tsx   (새) 창
src/i18n/catalogs/ko/*            창 문구·슬라이드 3·권한 설명
App.tsx                           판정·창 마운트·배터리 다시 읽기
store/ko/full.txt 등              K4 조건 문구
docs/user-guidance-rules.md       G4 행·끝난 전수 목록 행 삭제
AGENTS.md                         「첫 실행」 줄(배터리 단계 → 설정 창)
docs/e2e/feature-flow-map.md, .maestro/  첫 실행 흐름에서 배터리 단계 제거
```

## Phase 0/1 산출물

[research.md](research.md) · [data-model.md](data-model.md) · [contracts/auto-write-setup.md](contracts/auto-write-setup.md) · [quickstart.md](quickstart.md)

## Post-design Constitution Check

변화 없음 — 통과.
