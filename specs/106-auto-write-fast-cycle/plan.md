# Implementation Plan: 자동 쓰기 빠른 주기(개발 빌드 전용)와 080 잔여 결함 (106)

**Branch**: `106-auto-write-fast-cycle` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: `specs/106-auto-write-fast-cycle/spec.md`, 설계 `docs/superpowers/specs/2026-10-26-auto-write-fast-cycle-and-residuals-design.md`

## Summary

자동 쓰기의 시간 규칙(목표 시각·시도 창·후보 날·알림 발화·알림 지연 상한)을 `ScheduleTiming` 한 곳(`src/schedule/timing.ts`)이 정하게 하고, 개발 환경에서만 읽는 기록(`preferences/dev-fast-cycle.json`)이 「하루」를 N분 주기로 바꿔 끼운다. 판정 규칙(`decideSchedule`·`resolveAutoWrite`·`planReminders`)은 그대로 두고 입력만 `ScheduleTiming`으로 받는다. 주기가 바뀌면 판정 직전에 한 절차(`resetFastCycleIfDue`)가 오늘의 일기와 딸린 기록을 지워 매 주기를 새 하루처럼 시작한다. 판정이 일어나는 두 자리(백그라운드 `task.ts`, 앱 열기 훅 `use-auto-write-handoff.ts`)가 같은 절차를 부른다. 개발자 메뉴 구역과 진단 한 줄이 켜고 읽는 길이다.

080 잔여는 네 갈래다. ① `llama-port.ts`의 `load()`를 도착 순서로 직렬화한다. ② 홈 화면의 죽은 018 입력(`prepare`·`release`·`captionDay`)을 걷는다. ④ 홈이 합류한 쓰기가 실패하면 `rearmAutoWrite`로 「한 번」을 한 번 다시 연다. ⑤ 막힘 문구를 확정 문구로 바꾼다. ③은 코드 없이 기록만 남긴다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57 / RN 0.86)

**Primary Dependencies**: 새 의존 없음. 기존 `expo-file-system`(기록 통로), `expo-background-task`(잡 재등록), `expo-notifications`(알림 거두기)

**Storage**: 새 파일 `preferences/dev-fast-cycle.json`(`{ periodMinutes, resetCycle }`, 켜짐일 때만 존재, 개발 환경에서만 읽음). 일기 파일은 `DiaryStore.removeDay`로 하나씩 지움. 따라잡기 기록(`auto-write-catch-up.json`)에 지우는 함수 추가

**Testing**: jest — logic(`__tests__/schedule/`, `__tests__/app/`, `__tests__/inference/`, `__tests__/config/`), ui(개발자 화면·진단·설정 문구·골든), 소스 계약, 실기기 SM-S901N dev 빌드

**Target Platform**: Android·iOS. 빠른 주기는 두 플랫폼 모두에서 판정 쪽만 줄인다(깨움 빈도는 OS 몫)

**Project Type**: mobile-app

**Performance Goals**: 없음(개발 도구). 리셋은 판정당 파일 몇 개의 읽기·지우기

**Constraints**: 배포 판정 결과 불변(기존 테스트 무수정 통과), prod는 기록이 있어도 읽지 않음, 쓰기가 살아 있으면 지우지 않음, 결과 갈래 불변(원칙 IV), 사람이 정한 값은 측정이라 쓰지 않음(원칙 V)

**Scale/Scope**: 새 모듈 5개, 수정 10여 개, 테스트·계약·헌법 규칙 추가

## Constitution Check

- **I 온디바이스**: 영향 없음. 빠른 주기도 실제 온디바이스 쓰기를 탄다. 미리 만든 응답 없음.
- **II 화자 / III 캐릭터**: 프롬프트·로스터 불변.
- **IV 측정 장치**: 시도 기록의 결과 갈래를 늘리지 않는다. 진단 한 줄은 켜짐 상태 표시이며 점수·비교가 아니다. 창·지연 값은 상수다.
- **V 관측/추측**: 창 = ⌊N/2⌋, 지연 상한은 **사람이 정한 값**이라고 문서·진단에 적는다. 기록을 못 읽거나 모양이 다르면 꺼짐으로 읽는다(켜짐으로 채우지 않는다). 모르는 환경 판정도 `showsOnScreen`을 따른다. 실기기 확인 계획 포함.
- **경계**: `process.env`는 `environment.ts`에서만(변경 없음). 하루 경계는 `day-boundary.ts`(자정 이후 분은 `dayBounds`로 구한다 — `getHours()`로 하루 기준을 옮기지 않는다, DB11). `src/ui/`는 `models/roster`·`diary/prompt`·`signals`에 닿지 않는다. 화면 한글은 `src/i18n/catalogs/ko/`에만. `src/diary/live-write.ts`는 시각·타이머·파일을 읽지 않는다(변경 없음 — 리셋은 이 등록부의 `beginWipe`를 쓸 뿐).
- **새 규칙**: 빠른 주기 기록의 읽기는 `src/schedule/timing-source.ts` 한 곳, 가드(`devEnvironment`) 뒤에서만, 리셋은 `src/app/fast-cycle-reset.ts` 한 곳(헌법 검사 `FAST_CYCLE_LEAKS` FL1~FL3, 위반 주입으로 확인).

재설계 후 재확인: 위반 없음. 개발 환경에서 일기를 지우는 기능이 새로 생기므로 prod 가드(User Story 2)를 소스 계약과 실행 테스트 둘로 잠근다.

## Project Structure

### Documentation (this feature)

```text
specs/106-auto-write-fast-cycle/
├── plan.md  research.md  data-model.md  quickstart.md  tasks.md
└── contracts/
    ├── fast-cycle.md      # ScheduleTiming·주기 수학·기록·가드·알림 계획 (FC1~)
    ├── cycle-reset.md     # 주기 리셋 절차·호출 자리·한 번 다시 열기 (CR1~)
    ├── engine-load.md     # load() 직렬화 (LD1~)
    └── joined-retry.md    # 합류 쓰기 실패 뒤 한 번 다시 열기 (JR1~)
```

### Source Code (repository root)

```text
src/schedule/timing.ts              (새) ScheduleTiming·productionTiming·fastCycleTiming·cycleOf — 순수
src/schedule/fast-cycle-store.ts    (새) 기록 파싱·직렬화·통로(preferences/dev-fast-cycle.json)
src/schedule/timing-source.ts       (새) loadScheduleTiming({settings, now, devEnvironment, port})·loadFastCycleRecord({devEnvironment, port}) — 기록을 읽는 유일한 곳
src/schedule/decision.ts            timing 입력(창·오전 목표·후보 제한). isNearTarget를 timing.ts로 옮김
src/schedule/auto-write.ts          resolveAutoWrite deps에 timing?
src/schedule/reminder-plan.ts       planReminders에 timing (빠른 주기 = 다음 주기 시작 하나, 지연 상한)
src/schedule/reminders.ts           ReminderDeps.loadTiming? (기본 production)
src/schedule/reminder-deps.ts       expoReminderDeps가 timing-source 연결
src/schedule/catch-up-store.ts      clearCatchUpDay 추가
src/schedule/task.ts                판정 직전 리셋·timing 사용·창 밖 몫 판정에 timing (수동 실행은 배포 timing·리셋 없음)
src/schedule/manual.ts              변화 없음(수동 실행은 설정 입력만 덮는다 — 빠른 주기와 독립, task.ts가 빠른 주기를 건너뜀)
src/diary/store.ts                  DiaryStore.removeDay(day) (메모리·파일)
src/app/fast-cycle-reset.ts         (새) resetFastCycleIfDue + createFastCycleResetter(훅에 주는 클로저) — 등록부 칸·지우기·기록 비우기·알림 거두기
src/app/use-fast-cycle.ts           (새) 기록 읽기·켜기/끄기·프리셋·확인 흐름 상태 (use-simulation 모양)
src/app/use-auto-write-handoff.ts   판정 전에 리셋, 리셋했으면 onCycleReset
src/app/use-auto-write-claim.ts     주석만(다시 여는 자리 셋: 알림 누름·합류 쓰기 실패·빠른 주기 리셋)
src/ui/DiaryHomeScreen.tsx          018 죽은 입력 걷기, onJoinedWriteFailed
src/ui/DeveloperScreen.tsx          fastCycle 묶음(옵션 prop)
src/ui/DiagnosticsScreen.tsx        머리 한 줄
src/ui/developer-text.ts            → 카탈로그 연결
src/i18n/catalogs/ko/fast-cycle.ts  (새) 새 영역 + settings.ts wipeBlocked 문구
src/inference/llama-port.ts         load() 직렬화
App.tsx                             use-fast-cycle 조립, 개발자 메뉴 끌 때 기록 지움, rearm 연결
scripts/constitution-rules.ts       FAST_CYCLE_LEAKS FL1~FL3
__tests__/…                         research.md「테스트」참조
```

**Structure Decision**: 시간 상수는 `src/schedule/timing.ts`로 모으고(순수), 기록 읽기는 `timing-source.ts` 한 곳, 일기를 지우는 절차는 `src/app/`(wipe-diaries와 같은 층)에 둔다. 판정 함수는 새 책임을 얻지 않고 입력만 받는다.

## Complexity Tracking

위반 없음.
