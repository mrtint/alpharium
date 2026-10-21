# Implementation Plan: iOS 백그라운드 자동 쓰기 — 원인 가르기와 「밤 충전 중 완주」

**Branch**: `090-ios-bg-auto-write` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

## Summary

iOS가 깨워 준 백그라운드 기회를 버리지 않게 판정 두 곳을 고치고(따라잡기 몫은 실제로 쓸 때만 소모 · 백그라운드로 뜬 iOS 앱의 홈은 앞으로 올 때까지 판정하지 않음),
원인을 가를 앱 기록 둘(예산 만료 갈래 · 깨운 순간의 앱 상태)을 더하고, iOS 배터리 행 문구를 두 플랫폼 같은 기대에 맞춘다. 그 뒤 실제 iPhone에서 재현·하룻밤 실측을 한다.

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo SDK 57, Hermes) + Swift 소량(로컬 Expo 모듈)
**Primary Dependencies**: `expo-background-task` 57.0.14(`patches/` — 요청 조건 두 줄, R7), `patch-package`(개발 의존성, `postinstall`), `expo-task-manager`, `expo-modules-core`(로컬 모듈 — 새 npm 의존성 0)
**Storage**: `preferences/auto-write-attempts.json`(필드 하나 추가, 옵셔널), `preferences/auto-write-catch-up.json`(모양 그대로)
**Testing**: jest 두 프로젝트(`logic`·`ui`), 소스 계약 테스트, 실기기(iPhone 14 iOS 27.0.1 — 개발 환경 Release 빌드, 087 4절)
**Target Platform**: iOS 27(실기기), 안드로이드는 회귀 없음 확인
**Project Type**: 모바일 앱(단일 저장소)
**Constraints**: 원칙 IV — 기록에 모델 지표 없음(앱 동작 기록은 허용, 소유자 2026-10-18). `src/schedule/`은 `AppState`를 참조하지 않는다(024) — 앱 상태는 주입받은 통로 값으로만 기록한다.

## Constitution Check

| 원칙 | 판정 |
| --- | --- |
| I 온디바이스 | 변경 없음 — 추론 경로 무변경 |
| II 화자 규칙 | 무관(프롬프트 무변경) |
| III 로스터 | 무관 |
| IV 측정 장치 금지 | 통과 — 기록은 갈래·시각·앱 상태뿐, 모델 지표 없음 |
| V 실측 | 실기기 재현 + 하룻밤 실측이 완료 조건(FR-009, SC-001) |

Post-design 재평가: 통과(아래 설계가 새 지표·채점을 들이지 않는다).

## Project Structure

```text
specs/090-ios-bg-auto-write/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/ios-bg-auto-write.md

src/schedule/task.ts                  # 몫 소모 지점, 시작 줄 상태, 만료 구독
src/app/auto-write-attempts.ts        # 갈래 `expired`, 옵셔널 `launch` 필드, 만료 기록 함수
src/app/use-auto-write-handoff.ts     # iOS·background 마운트 → 첫 판정 보류
src/app/launch-state-port.ts          # (새) 지금 앱 상태를 읽는 통로 — react-native 호출 시점 require
src/app/bg-expiry-port.ts             # (새) 만료 알림 구독 통로 — 네이티브 모듈 없으면 no-op
modules/pocketlog-bg-expiry/          # (새) 로컬 Expo 모듈(iOS만): expo의 onTasksExpired 알림 → JS 이벤트
src/ui/AttemptsGroup.tsx              # 상태 꼬리 표시
src/i18n/catalogs/ko/attempts.ts      # `expired`·상태 문구
src/i18n/catalogs/ko/settings-platform.ts  # permBatteryHintIos
App.tsx                               # 훅에 플랫폼 전달
__tests__/…                           # 아래 contracts의 번호
```

## Complexity Tracking

| 추가 | 왜 필요한가 | 더 단순한 대안을 버린 이유 |
| --- | --- | --- |
| `patch-package` | iOS CPU 감시가 백그라운드 추론을 죽인다 — 요청 조건은 expo 소스에만 있다(R7) | swizzle은 덜 투명, 쉼은 예산 초과 |
| 로컬 Swift 모듈 | expo가 만료 이벤트를 `userInfo["url"]` 가드로 JS에 넘기지 않는다 | `patch-package`는 새 의존성 + node_modules 수정, 기록 없이 두면 만료와 종료를 못 가른다 |
