# Implementation Plan: 쓸 차례 알림 — 배터리 예외가 없는 사용자에게 완주를 약속하지 않기

**Branch**: `085-write-reminder` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/085-write-reminder/spec.md`

## Summary

목표 시각마다 「{이름}{이/가} {M}월 {d}일 일기를 쓸 차례예요」 알림을 운영체제 예약으로 건다. 예약은 날짜별 일회 예약이고, 앞으로 7번까지 걸며, 이미 쓴 날은 뺀다. 앱이 얼어 있어도 OS가 알림을 띄운다. 누르면 그 날로 열리고, 그 실행의 「한 번」이 다시 열려 기존 앱 열기 자동 쓰기(057)가 그 날을 쓴다.

- **계획과 맞추기**
  - 순수 함수 `planReminders`가 예약할 목록을 만든다.
  - `reconcileReminders`는 걸린 예약과 계획의 차이만 고친다.
  - 트레이에 떠 있는 알림 가운데 쓴 날과 사흘 밖의 날 것은 거둔다.
- **맞추기를 부르는 자리**
  - 앱(`useReminderSync`): 마운트, 전경 복귀, 등록부의 칸이 빌 때, 설정과 이름이 바뀔 때.
  - 백그라운드 태스크: 끝날 때마다. 저장에 성공했으면 완성 알림보다 먼저 부른다.
- **채널**: 완성 알림은 원래 채널인 `diary-completed`로 보낸다(C2). 쓸 차례 알림은 새 채널 `diary-reminder`로 보내며, 예약·게시 전에 채널을 먼저 보장한다.
- **문구**: 설정의 미리보기·배터리 행과 온보딩의 알림·배터리 안내를 사실대로 고친다.
- **화면 동작**
  - 알림이 꺼져 있으면 알림 행 아래에 빨간 줄을 보인다.
  - 개발자 화면에 예약 줄을 둔다.
  - 앱이 앞에 있을 때 발화한 쓸 차례 알림은 숨긴다.

근거와 대안은 [research.md](./research.md)(R1~R21(구현 때 R22 추가))에 있다.

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 57, React Native 0.86)

**Primary Dependencies**: `expo-notifications` 57.0.15(이미 있음)
- 쓰는 API: DATE 트리거, `getAllScheduledNotificationsAsync`, `cancelScheduledNotificationAsync`, `getPresentedNotificationsAsync`, `dismissNotificationAsync`.
- **새 의존성 0, 네이티브 변경 0, 매니페스트 변경 0.**

**Storage**: 새 파일이 없다. 예약 상태는 OS 예약표에 있다.

**Testing**
- jest `logic`(`.ts`): 계획·맞추기·통로 대역·소스 계약·골든.
- jest `ui`(`.tsx`): 훅, 설정 행, 개발자 줄, 「누르면 한 번 더」 조립.
- 실기기: dev(SM-S901N, 기기의 debug APK + 맥의 Metro).

**Target Platform**: Android·iOS 공통. 플랫폼 분기는 배터리 행 문구 하나뿐이다(068 `batteryRowHint`).

**Project Type**: mobile-app

**Performance Goals**
- 맞추기 한 번 = 설정·목록 읽기 + 예약표 읽기 1 + 차이만큼의 취소·예약 + 트레이 읽기 1.
- 15분마다 도는 태스크에서도 계획이 그대로면 알람을 다시 걸지 않는다(R16).

**Constraints**
- `src/schedule/`에 `AppState`를 두지 않는다(OP7).
- `getHours()`는 DB11 허용 목록 밖에서 쓰지 않는다(R15).
- 판정(`decideSchedule`·`resolveAutoWrite`·`selectableDays`)을 바꾸지 않는다.
- 062 골든 json을 다시 쓰지 않는다.
- 배터리 예외 요청 권한·정확 알람 권한·`expo-battery`를 들이지 않는다.
- 계약을 먼저, 테스트를 먼저 쓴다.
- release 빌드·`pm clear`·`npm run test:layer1` 전체는 하지 않는다.

**Scale/Scope**
- 새 소스 8개
  - `src/schedule/`: `reminder-plan.ts`, `reminders.ts`, `reminder-port.ts`, `reminder-deps.ts`
  - `src/app/`: `use-reminder-sync.ts`, `notification-behavior.ts`, `notification-off-line.ts`, `reminder-summary.ts`
- 새 카탈로그 1개
- 수정 소스
  - `notification-port.ts`, `notification-text.ts`, `task.ts`, `settings.ts`(해석 함수 export)
  - `use-auto-write-claim.ts`, `App.tsx`, `SettingsScreen.tsx`, `DeveloperScreen.tsx`
  - 카탈로그 셋(`settings`, `settings-platform`, `onboarding`)
- 테스트: 새 13개(reminder-plan·reminders·reminder-port·reminder-deps·task-reminder·notification-behavior·reminder-summary·notification-off-line·promise-copy·use-reminder-sync·reminder-rearm-assembly·developer-reminder-line·settings-notification-off). 수정 — `notification-port.test.ts`, `ko-golden.test.ts`, `day-boundary-source.test.ts`(DB11), `use-auto-write-claim.test.tsx`(082 CL6), 태스크 대역 셋, `app-auto-write-source.test.ts`, 옛 문구 단언들(`target-hour`·`battery-row`·`settings-screen`·`settings-battery-row`·`onboarding/requirements`), Maestro 흐름 둘(`settings-time-place`·`scheduled-diary-notification`).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론 경로를 건드리지 않는다. 알림은 쓰기를 부르는 수단일 뿐이고, 쓰기는 기존 온디바이스 경로다 |
| II. 화자는 휴대폰 | 통과 | 알림 문구에는 이름과 날짜만 있고 일기 내용·감상이 없다(020 FR-012) |
| III. 캐릭터는 모델 위에 | 통과 | 이름은 사용자가 지은 호칭(`displayNameOf`)뿐이고 모델 정보가 없다. `src/schedule/`이 `models/roster`에 닿지 않는다(`checkScheduleFile`) |
| IV. 측정 장치를 들이지 않는다 | 통과 | 새 기록·로그가 없다. 개발자 줄은 OS 예약표를 읽은 그대로 보일 뿐이고, 무엇을 세거나 재지 않는다. 지연은 실기기에서 `dumpsys`로 사람이 옮긴다 |
| V. 실측과 추측의 구분 | 통과 | research가 소스와 짐작을 가른다. 「제때 써요」처럼 확인되지 않은 약속을 걷는 것이 이 기능의 목적이다. 읽지 못한 설정을 「꺼짐」으로 단정하지 않는다(R18). 얼어 있는 상태에서의 발화와 지연은 실기기로 보고, iOS 실기기는 미확인으로 적는다 |
| 개발 방식 | 통과 | 계약(`contracts/write-reminder.md`) → 테스트 → 구현 순서다. 기능 브랜치·한국어 커밋 |

**Post-design re-check**: 위와 같다.
- `reminders.ts`·`reminder-plan.ts`는 `../app/`을 import하지 않는다.
- 기본 조립 `reminder-deps.ts`만 `task.ts`처럼 `../app/selection-store`를 읽는다. `src/schedule/` → `src/app/` 방향은 `task.ts`에 이미 있다.
- 헌법 검사(`checkScheduleFile`·`checkSimulationFile`·`checkI18nFile`)에 새 예외가 필요하면 구현 때 이유와 함께 여기에 적는다.

## Project Structure

### Documentation (this feature)

```text
specs/085-write-reminder/
├── plan.md
├── research.md            # R1~R21(구현 때 R22 추가)
├── data-model.md
├── quickstart.md
├── contracts/
│   └── write-reminder.md  # RP·RC·RD·RT·RA·CH·TK·SY·FG·ST·DV·GD·FX·위반 주입
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/schedule/
├── reminder-plan.ts        # 새 — planReminders (RP), REMINDER_ID_PREFIX
├── reminders.ts            # 새 — reconcileReminders + 순서 줄 (RC)
├── reminder-port.ts        # 새 — ReminderPort + expoReminderPort, REMINDER_CHANNEL_ID (RT)
├── reminder-deps.ts        # 새 — expoReminderDeps (RD)
├── settings.ts             # 설정 문자열 해석 함수를 export (RD2)
├── notification-port.ts    # present의 channelId(CH1), 채널 둘(CH2), 머리말·주석 고침(R4)
├── notification-text.ts    # reminderTitle(name, day) 추가
└── task.ts                 # 끝날 때마다 맞추기, 성공이면 맞추기 → 채널 보장 → 완성 알림 (TK·CH4)

src/app/
├── use-reminder-sync.ts    # 새 — AppFrame의 맞추기 배선 (SY)
├── use-auto-write-claim.ts # rearmAutoWrite (RA1~RA4)
├── notification-behavior.ts# 새 — 앞쪽 숨김(FG)·쓸 차례 응답 판별(RA5)
├── notification-off-line.ts# 새 — 알림 꺼짐 줄 판정 (ST1)
└── reminder-summary.ts     # 새 — 개발자 줄 (DV1)

src/i18n/catalogs/ko/
├── reminder.ts             # 새 영역 — title·channelName·notificationOff·developerLine·developerNone
├── settings.ts             # permBatteryHint·targetHour.preview 값만
├── settings-platform.ts    # permBatteryHintIos 값만
├── onboarding.ts           # 알림·배터리 rationale·ifDenied 값만 (FR-024)
└── index.ts                # reminder 영역 등록

src/ui/
├── SettingsScreen.tsx      # notificationOffText prop (ST2)
└── DeveloperScreen.tsx     # reminderLine prop (DV3)

App.tsx                     # AppFrame: useReminderSync, setNotificationHandler → notificationBehaviorFor,
                            # onResponse → rearmAutoWrite, 개발자 겹 열릴 때 scheduled() 읽기,
                            # SettingsSection에 notificationOffText 넘김
```

테스트 목록은 [tasks.md](./tasks.md)에 있다.

**Structure Decision**
- 계획·맞추기·통로·기본 조립은 `src/schedule/`에 둔다. 헤드리스 태스크가 같은 코드를 부르기 때문이다.
- `AppState` 구독과 등록부 구독은 `src/app/`의 훅에 둔다(OP7).
- 쓸 차례 통로는 `NotificationPort`와 따로 둔다. 그 인터페이스의 키 집합을 잠근 계약과 대역 다섯을 건드리지 않기 위해서다(CH3).

## 구현 순서 (테스트 먼저)

tasks.md의 Phase 순서다.

1. 기존 계약을 읽는다.
2. 문구와 골든을 바꾼다.
3. US1을 만든다: 계획, 통로, 맞추기, 기본 조립, 앞쪽 숨김, 「누르면 한 번 더」, 앱 배선, 개발자 줄.
4. US2: 쓴 날을 빼고 거둔다. 태스크에 맞추기를 넣는다.
5. US3: 채널.
6. US4: 설정의 꺼짐 줄과 문구 단언.
7. 전체를 확인한다: `npm test`·`npm run lint`, 위반 주입 V1~V12, 실기기 quickstart §3, `AGENTS.md`.

## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 얼어 있는 프로세스에 알람이 닿지 않아 알림이 뜨지 않는다 | 이 기능의 핵심 가정이다. 실기기 시나리오 A로 먼저 본다. 뜨지 않으면 구현을 멈추고 소유자에게 보고한다(포그라운드 서비스는 재기 전에는 고르지 않는다 — 소유자 결정) |
| 부정확한 알람이 크게 늦어 「쯤」을 넘는다 | 지연을 실측해 AGENTS에 적는다. 정확 알람 권한은 Play 정책상 더하지 않는다 |
| 등록부 `onChange`가 지우기·쓰기마다 맞추기를 불러 겹친다 | 순서 줄(RC4)로 세운다. 차이만 고치므로(RC1) 겹쳐도 알람을 다시 걸지 않는다 |
| 골든 장치가 「바뀐 값」을 숨기는 통로가 된다 | 항목마다 `spec` 번호와 `from`을 요구하고, `from`이 골든과 다르면 실패한다(V10) |
| 게시된 예약 알림을 id로 거두지 못한다(R2의 짐작) | 시나리오 B로 본다. 안 되면 `getPresentedNotificationsAsync`가 준 `request.identifier`로 거두는지 확인한다 |
| 「누르면 한 번 더」가 지운 직후·흉내 중에 쓴다 | 흉내·첫 실행은 앞선다(RA3). 지운 뒤라도 알림을 누른 것은 사용자의 명시적 행동이다(소유자 결정) |

## Complexity Tracking

위반 없음 — 채울 것이 없다.
