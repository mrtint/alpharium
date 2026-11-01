# Implementation Plan: 안내·알림 방식 일원화 — 제약 띠

**Branch**: `108-notice-unification` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

## Summary

홈 스트립 아래의 안내 줄(`Notices` 줄글·`BatteryNoticeLine`)을 걷고, 사진 권한 거부와 배터리 제한을 쓰기 바 위의 한 줄 「제약 띠」(`ConstraintBand`)로 옮긴다. 어떤 띠를 보일지는 순수 함수 `constraintBandFor`가 정하고, 배터리 상태는 새 훅 `useConstraintBand`가 앱이 앞으로 돌아올 때마다 읽는다. 캐릭터 대체 안내(`movedNotice`)는 기존 토스트로 보낸다. 규칙은 `design/DESIGN.md`에 절 하나로 남기고 소스 계약으로 잠근다.

## Technical Context

**Language**: TypeScript (Expo SDK 57, RN 0.86) · **Testing**: jest `logic`(`__tests__/app/`)·`ui`(`__tests__/ui/`) · **Storage**: 새 파일 없음, 옛 `preferences/battery-notice-dismissed.json`은 읽지 않는다 · **Target**: 안드로이드(배터리 띠 포함), iOS(사진 권한 띠만) · **Constraints**: 헌법 원칙 V(모르는 것은 보이지 않는다), 화면 한글은 `src/i18n/catalogs/ko/`에만, 예외 상태는 `battery-exception-port.ts`에서만 읽는다(FX1), `src/ui/`는 `models/roster` 등에 닿지 않는다. 기기 검증은 dev 빌드(SM-S901N, iOS 시뮬레이터)로.

## Constitution Check

- I~IV: 해당 없음(추론·페르소나·측정 무관). 새 문구에 모델 식별자 없음.
- V: 읽지 못했거나 `unknown`이면 띠 없음. 문구·치수는 「사람이 정한 값」으로 표시하고 실기기 미확인을 완료로 부르지 않는다. **통과.**
- 개발 방식: 계약·테스트 먼저, 위반 주입, 한국어 커밋, 기능 브랜치(`108-notice-unification`). **통과.**

## Project Structure

```text
specs/108-notice-unification/{spec,plan,research,data-model,quickstart,tasks}.md, contracts/constraint-band.md
src/app/constraint-band.ts            # 순수 판정 constraintBandFor (신규)
src/app/use-constraint-band.ts        # 훅: 배터리 상태 읽기·앞 복귀 재읽기·설정 목록 열기 (신규, use-battery-notice.ts 대체)
src/ui/components/ConstraintBand.tsx  # 공용 부품: 한 줄 글자 + 채워진 버튼 하나 (신규)
src/ui/DiaryListScreen.tsx            # Notices·BatteryNoticeLine 삭제, 띠 자리·토스트 중 가림
src/ui/DiaryHomeScreen.tsx            # batteryNotice·deniedNotices·onAutoWriteSaved prop 정리, 캐릭터 대체→토스트
App.tsx                               # deniedNotices → photoDenied, useBatteryNotice → useConstraintBand
src/i18n/catalogs/ko/home.ts          # batteryNotice 삭제, constraintBand 문구 추가 (보드 밖 초안)
design/DESIGN.md                      # 「안내·알림 방식」 절
삭제: src/app/battery-notice.ts, battery-notice-store.ts, use-battery-notice.ts (+ 해당 테스트)
__tests__/app/constraint-band.test.ts · use-constraint-band.test.tsx · __tests__/ui/constraint-band.test.tsx · home-constraint-band.test.tsx(진짜 홈 조립)
__tests__/config/notice-rules.test.ts  # 소스 계약 (스트립 아래 안내·닫기 금지)
```

## Design

계약은 [contracts/constraint-band.md](contracts/constraint-band.md), 데이터는 [data-model.md](data-model.md), 근거·결정은 [research.md](research.md), 검증은 [quickstart.md](quickstart.md).
