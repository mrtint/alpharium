# Implementation Plan: iOS 설정·개발자·진단 화면 재검증과 고장 수정

**Branch**: `068-ios-settings-reverify` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/068-ios-settings-reverify/spec.md`

## Summary

설정·개발자·진단 화면을 iOS에서 한 줄씩 눌러 보고(훑기) 걸린 것만 고친다. 이미 알려진 고정 하나(권한 행 튕김, `a994379`)는 계약 테스트로 잠그고,
설정의 「배터리」 행은 iOS에서 「저전력 모드를 끄면 제때 써요」 안내로 바꾼다. 플랫폼 판정은 이미 `App.tsx`가 만드는 `platform` 값을 순수 함수(`src/app/`)에 넘겨
문구를 고르는 방식으로 한 곳에 모은다 — 화면은 `Platform`을 읽지 않는다. 훑기는 Maestro 흐름 파일(저장소에 둠)로 하고 `FLOWS` 등록은 이번에 하지 않는다(spec FR-009).

## Technical Context

**Language/Version**: TypeScript(strict), React Native 0.86, Expo SDK 57, Hermes

**Primary Dependencies**: 기존 것만 — `react-native`의 `Linking`(호출 시점 `require`), NativeWind·RNR 부품. 새 의존성 0.

**Storage**: N/A (파일 변경 없음)

**Testing**: jest 두 프로젝트(`.ts` 로직 / `.tsx` 화면), 소스 계약 테스트, Maestro iOS 시뮬레이터 흐름(훑기)

**Target Platform**: iOS 시뮬레이터(26.5) 검증, TestFlight 실기기는 소유자. 안드로이드는 바뀐 자리(배터리 행)만 dev 실기기로 확인.

**Project Type**: mobile-app (Expo)

**Performance Goals**: N/A

**Constraints**: 새 네이티브 모듈 0. 헌법 원칙 V(시뮬레이터 통과 ≠ 실기기 통과)를 스펙에 명기. 범위는 설정·개발자·진단 세 화면.

**Scale/Scope**: 파일 수 개 — 문구 카탈로그 1, 순수 함수 1, 설정 화면·조립부 소폭, 테스트 수 개, 흐름 파일 1~2

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 해당 없음(추론 경로를 건드리지 않는다) — 통과 |
| II 화자는 휴대폰 | 해당 없음(프롬프트·일기 본문 무변경) — 통과 |
| III 캐릭터 | 해당 없음 — 통과 |
| IV 측정 장치 금지 | 훑기는 화면·로그 관찰이고 점수·비교 코드를 만들지 않는다. Maestro 흐름은 동작 확인이지 채점이 아니다 — 통과 |
| V 관측·추측 구분 | 시뮬레이터에서만 본 것을 「실제 iPhone 미확인」으로 적는다(SC-005). 자동 쓰기의 iOS 동작은 「미확인」으로 기록한다(FR-004) — 통과 |

사진·시각 처리·로스터 절은 해당 없음. 개발 방식: 계약·테스트 먼저, 한국어 커밋, 기능 브랜치(`068-ios-settings-reverify`) — 통과.

**Post-Design 재평가**: 통과(위반 없음, Complexity Tracking 해당 없음).

## Project Structure

### Documentation (this feature)

```text
specs/068-ios-settings-reverify/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ios-settings.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks 출력
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── battery-row.ts            # 신규 — 플랫폼 → 배터리 행 안내 문구(순수)
│   ├── platform.ts               # 신규 — Platform.OS 문자열을 "android" | "ios" 유니온으로 좁히는 순수 함수 appPlatform
│   └── diagnostics-view.ts       # 기기 줄 os: { platform, version } 지원(iOS에서도 환경 기기 줄 표시)
├── i18n/catalogs/ko/
│   └── settings-platform.ts      # 신규 — permBatteryHintIos(안드로이드 값은 settings.ts에 그대로)
├── ui/
│   └── SettingsScreen.tsx        # 배터리 행의 hint를 props로 받는다(Platform을 읽지 않음)
App.tsx                           # 이미 만드는 platform으로 hint를 골라 SettingsScreen에 전달

__tests__/
├── app/battery-row.test.ts       # 순수 판정·문구
├── ui/settings-battery-row.test.tsx
├── onboarding/battery-ios.test.ts # iOS 온보딩 배터리 제외 계약
├── onboarding/no-react-native-dynamic-import.test.ts   # 소스 계약(FR-006)
└── ...                           # 훑기에서 걸린 것의 테스트(추가)

.maestro/ios/                    # 시뮬레이터 흐름(전부 FLOWS 미등록 — spec FR-009)
├── _dismiss-open-prompt.yml     # 개발 클라이언트 「열겠습니까?」 닫기
├── first-run-to-home.yml        # 첫 실행 → 홈
├── settings-sweep.yml           # 설정 훑기
└── developer-diagnostics-sweep.yml  # 개발자·진단 훑기 (T028~T030 포함)
```

**Structure Decision**: 기존 구조 안에서 닫는다. 순수 판정은 `src/app/`(화면이 쓰는 순수 상태), 문구는 062 카탈로그, 플랫폼 값은 `App.tsx`의 기존 `platform`.

## Phases

- **Phase A — 훑기(코드 변경 전)**: 현재 `app.json`으로 `prebuild --clean` 후 시뮬레이터 빌드, Maestro로 설정·개발자·진단을 눌러 오류·문구 어긋남을 모은다(결과 표: `quickstart.md`에 기록).
- **Phase B — 확정된 수정**: FR-003 배터리 행(테스트 먼저), FR-006 동적 import 계약 테스트.
- **Phase C — 훑기가 찾은 것의 수정**: 걸린 것만. 판정이 필요한 것은 소유자에게 묻는다(FR-008). 세 화면 밖의 것은 로드맵에 한 줄(FR-008a).
- **Phase D — 검증**: `npm test`·`npm run lint`, iOS 시뮬레이터 재훑기, 안드로이드 dev 실기기에서 배터리 행.

## Complexity Tracking

위반 없음 — 해당 없음.
