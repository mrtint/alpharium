# Implementation Plan: 안드로이드 배터리 예외 인지

**Branch**: `104-battery-exception-awareness` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/104-battery-exception-awareness/spec.md`, 설계문서 `docs/superpowers/specs/2026-10-24-battery-exception-awareness-design.md`

## Summary

안드로이드 배터리 예외 상태(`exempt`/`restricted`/`unknown`)를 `expo-battery`로 읽는 통로를 하나 세우고, 그 값 하나로 세 가지를 정한다.

1. 쓸 차례 알림의 울릴 시각 — `exempt`일 때만 정각 + 30분(`planReminders`에 `delayMinutes` 입력). 예약을 거두는 규칙(저장된 뒤에만)은 손대지 않는다.
2. 설정 배터리 행의 꼬리표 — 기존 권한 꼬리표 판정(`permissionTagFor`)에 `battery`를 더한다.
3. 홈 안내 — 앱 열기 자동 쓰기(`auto: true`)가 **저장된 뒤**, `restricted`이고 7일 안에 닫지 않았으면 한 줄 + [설정 열기]·[닫기].

새 기록 파일은 하나(닫은 시각)뿐이고, 상태 값은 저장하지 않는다.

## Technical Context

**Language/Version**: TypeScript (strict), Expo SDK 57 / React Native 0.86, Hermes

**Primary Dependencies**: `expo-battery`(신규, `sdk-57` 태그 57.0.3), 기존 `expo-intent-launcher`(설정 목록 열기)·`expo-file-system`(기록 파일)·`expo-notifications`(예약)

**Storage**: `files/preferences/battery-notice-dismissed.json` 하나(`{ "at": <ms> }`). 예외 상태는 저장하지 않는다.

**Testing**: jest 두 프로젝트(`logic`=`.ts`, `ui`=`.tsx`), RNTL 14. 실기기 SM-S901N dev.

**Target Platform**: Android(기능 전체), iOS(변화 없음 — 상태 `unknown`·지연 0·꼬리표 없음·안내 없음)

**Project Type**: mobile-app (Expo)

**Performance Goals**: 상태 읽기는 한 번의 네이티브 호출(`PowerManager.isIgnoringBatteryOptimizations`)이며 맞추기 한 번당 1회. 맞추기는 15분 주기 태스크와 전경 복귀에서 도는 기존 빈도 그대로.

**Constraints**: 권한 선언을 늘리지 않는다(SC-006, `expo-battery`의 AndroidManifest는 권한이 없다 — research R2). `process.env`·Platform 읽기 규칙 유지. 문구는 `src/i18n/catalogs/ko/`에만.

**Scale/Scope**: 소스 변경 약 10개 파일(통로 1·계획 1·맞추기 2·꼬리표 3·홈 안내 4), 신규 파일 3(안내 판정·기록·훅).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
|---|---|---|
| I. 온디바이스가 제품이다 | 통과 | 추론·서버와 무관. `src/config/policy.ts` 방어선 건드리지 않음. |
| II. 화자는 휴대폰이다 | 통과 | 새 문구(홈 안내 한 줄)는 일기 본문이 아니며 일기 내용·감상을 담지 않는다. 승인된 문구(spec 2026-10-24). |
| III. 캐릭터는 모델 위에 선다 | 통과 | `src/models/roster`·`diary/prompt`에 닿지 않는다. 완성 알림 문구는 그대로. |
| IV. 측정 장치를 들이지 않는다 | 통과 | 상태를 기록·집계하지 않는다(읽고 쓴다). 저장하는 것은 사용자가 안내를 닫은 시각 하나(UI 상태, `skip-store`와 같은 층). 시도 기록(`auto-write-attempts`)의 갈래를 늘리지 않는다. |
| V. 관측과 추측을 구분한다 | 통과 | 읽지 못한 것은 `unknown`이고 지연 0·꼬리표 없음·안내 없음. 30분은 사람이 정한 값으로 코드·문서에 표시. 헤드리스 읽기는 가정 → 실기기로 확인(quickstart Q3). |

경계 규칙: `src/ui/`는 `models/roster`·`ModelAsset`·`diary/prompt`·`signals`에 닿지 않는다(건드리지 않음). `src/schedule/` → `src/app/platform`은 이미 있는 방향. `src/app/`은 `src/ui/`를 import하지 않는다 — 안내 문구는 `lazyText`로 카탈로그에서 읽는다(`battery-row.ts` 선례).

**Post-design 재평가**: 변동 없음. 새 파일은 `src/app/`(판정·기록·훅)과 `src/schedule/`(통로 확장) 안에 놓이고 경계를 넘지 않는다.

## Project Structure

### Documentation (this feature)

```text
specs/104-battery-exception-awareness/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── battery-exception.md   # 읽기 통로 + 지연 규칙 + 맞추기
│   ├── permission-tag.md      # 설정 꼬리표
│   └── home-notice.md         # 홈 안내 판정·기록·훅·화면
└── tasks.md                   # /speckit-tasks
```

### Source Code (repository root)

```text
package.json                                  # expo-battery ~57.0.3 (npx expo install)
src/
├── schedule/
│   ├── battery-exception-port.ts            # + BatteryExceptionStatus, readStatus()
│   ├── reminder-plan.ts                     # + delayMinutes 입력, reminderDelayFor(status), REMINDER_DELAY_MINUTES
│   ├── reminders.ts                         # ReminderDeps + loadBatteryStatus, 계획에 delayMinutes 전달
│   └── reminder-deps.ts                     # 기본 조립: batteryPort.readStatus()
├── app/
│   ├── permission-tags.ts                   # TaggedPermission + "battery", PermissionFacts.battery
│   ├── battery-notice.ts                    # (신규) 노출 판정 순수 함수 + 7일 상수
│   ├── battery-notice-store.ts              # (신규) 닫은 시각 기록 통로
│   └── use-battery-notice.ts                # (신규) 훅: 저장 신호 → 판정 → 보임/닫기/설정 열기/전경 복귀 재읽기
├── ui/
│   ├── use-permission-tags.ts               # battery 꼬리표
│   ├── SettingsScreen.tsx                   # 배터리 행 trailing = PermissionTrailing(battery)
│   ├── DiaryHomeScreen.tsx                  # onAutoWriteSaved 호출, batteryNotice 전달
│   └── DiaryListScreen.tsx                  # BatteryNotice 한 줄(쓰는 중 제외)
└── i18n/catalogs/ko/                        # home 안내 문구 (+ 골든 ADDED_AFTER_GOLDEN)
App.tsx                                       # readPermissions에 battery, useBatteryNotice 배선
scripts/layer1/baseline.ts                    # 설정 파일 표에 새 파일 한 줄(G-1)
__tests__/                                    # contracts 별 테스트 + 기존 갱신: config/promise-copy.test.ts(FX1 expo-battery 금지 → 새 규칙), ui/settings-*.test.tsx(permissionTags 픽스처에 battery)
docs                                          # 055 FR-025·085 FR-019 서술, AGENTS 한 줄
```

**Structure Decision**: 단일 모바일 앱 구조(Expo). 예외 읽기는 `src/schedule/`의 기존 배터리 통로에 모으고(앱 훅·헤드리스가 같은 통로), 홈 안내의 판정·기록·훅은 `src/app/`에 둔다(화면이 쓰는 순수 상태·조립 — AGENTS 배치 규칙).

## Complexity Tracking

위반 없음.
