# Implementation Plan: 시간대 지정 자동 일기 작성과 완성 알림

**Branch**: `020-scheduled-diary-notification` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/020-scheduled-diary-notification/spec.md`

## Summary

019 스파이크가 실기기로 확인한 결론 — 화면 꺼짐·잠금 상태에서
WorkManager(`expo-background-task`) 백그라운드 생성이 완주한다 — 위에
짓는 첫 실제 배포 기능이다. 사용자가 설정에서 대략적인 목표 시각(기본
오전 7시)을 고르면, 하루 경계(04:00)가 지난 뒤 그 시각 근방에
백그라운드에서 전날 일기가 자동 생성되고, 성공하면 로컬 알림이 떠서
누르면 그 일기 상세로 바로 이동한다.

기술 접근:

- **트리거**: 019의 `expo-background-task`(WorkManager, `minimumInterval:
  15`) 경로를 그대로 제품화한다. 매 실행이 콜백 안에서 "지금이 목표 시각
  근방인가 + 오늘 대상 하루가 아직 안 쓰였나"를 판정해 조건이 맞을 때만
  파이프라인을 돈다(Clarifications: 목표 시각 변경 시 예약 취소·재등록).
- **생성**: `wiring.ts`의 `createAppPipeline()` → `pipeline.run()`을
  그대로 부른다. 019 하네스가 이미 이 경로로 완주를 확인했다. **판정
  4갈래·저장 경로는 화면 수동 생성과 100% 공유**한다(FR-011).
- **알림**: `expo-notifications`(신규 의존)로 **완료 직후 즉시 로컬
  알림**(`trigger: null`)만 쏜다. 예약 알림·DAILY 트리거·alarm 계열은
  쓰지 않는다(019 결정 계승). 알림 식별자를 날짜로 고정해 중복을 막고,
  탭 응답에서 `data.day`를 읽어 상세로 라우팅한다.
- **경합(FR-008)**: 파이프라인 `run()`의 기존 `running: Set<DayDate>`는
  **한 인스턴스 안에서만** 유효하다 — 백그라운드 태스크와 화면은 서로
  다른 파이프라인 인스턴스를 만든다. 프로세스를 가로지르는 잠금이
  필요하다: `expo-file-system` 기반 **파일 잠금**(취득 시각 기록, stale
  타임아웃 포함)을 `pipeline.run()` 앞단에 둔다.
- **배터리 예외(FR-010)**: `expo-intent-launcher`(신규 의존)로
  `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 인텐트를 자동 생성 최초
  1회만 띄우고, 이후엔 설정 화면 상시 링크로만 재접근.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19.2.3, React Native 0.86.2

**Primary Dependencies**:

- 기존: `expo ~57`, `expo-background-task ~57`, `expo-task-manager ~57`,
  `expo-file-system ~57`, `llama.rn ^0.12.8`
- **신규**: `expo-notifications`(로컬 알림·응답 리스너·트레이 조회),
  `expo-intent-launcher`(배터리 최적화 예외 요청 인텐트)
- 후보(대안 존재): `expo-battery`(배터리 최적화 활성 여부 조회) — 없어도
  기능은 동작하나, 상시 링크 문구를 상태에 맞춰 바꾸려면 유용. Phase 1
  research.md에서 채택 여부 확정.

**Storage**: `expo-file-system` (`Paths.document`) 하나만. 새 저장 계층을
만들지 않는다(spec Assumptions).

- 자동 생성 설정(목표 시각, on/off): 007의 `selection-store.ts`와 같은
  층위 — `files/preferences/` 아래 새 JSON 파일 하나(`auto-diary.json`).
- 알림 상태(날짜별 "발송됨 + 미확인"): **일기 파일과 분리** —
  `files/preferences/notified.json`(날짜→상태 맵). `DiaryEntry`에 필드를
  더하지 않는다(하위 호환·판정 경계 유지).
- 경합 잠금: `files/locks/diary-generation.lock`(취득 시각 1줄).

**Testing**:

- `npm run test:logic` — 순수 로직(스케줄 판정, 알림 dedup 판정, 잠금
  판정, 재시도 대상 선정). 소스 선언을 `readFileSync`로 읽는 계약 테스트
  포함(007·009·012 관례).
- `npm run test:ui` — 설정 화면, 알림 탭 라우팅 상태 전이.
- `npm run test:device` — `.maestro/scheduled-diary-notification.yml`
  (신규, `FLOWS`에 등록). 실기기 1회 필수 — 새 네이티브 모듈
  (`expo-notifications`, `expo-intent-launcher`)을 들이므로 **debug +
  release 재확인 양쪽**(AGENTS.md 「테스트」의 재확인 기준에 해당).

**Target Platform**: Android (실기기, development build 및 release APK).
iOS는 이 저장소의 검증 대상이 아니다.

**Project Type**: 단일 프로젝트 모바일 앱. `src/` 아래 계층 구조.

**Performance Goals**:

- SC-002: 배터리 예외 없이도 목표 시각 후 24시간 내 최소 1회 시도.
- SC-003: 배터리 예외 적용 시 목표 시각으로부터 1시간 내 최소 1회 시도
  (MUST), 관측 시도 과반 40분 이내(SHOULD, 019 표본 근거).
- SC-004: 알림 탭 1회로 해당 일기 도달.
- SC-005: 화면×백그라운드 경합 100회 재현에서 중복·손상 0건.

**Constraints**:

- 온디바이스 전용(헌법 원칙 I). 서버·원격 푸시 없음.
- 한 번에 하나의 추론 엔진만(019 E1). 경합 잠금이 이걸 프로세스
  경계에서 지켜야 한다.
- 생성 중 진행률·경과시간 미노출(헌법 원칙 IV, 015·016). 알림 문구도
  본문 요약·감상 지어내기 금지(FR-012, 원칙 II).
- 배터리 예외 요청 인텐트는 최초 1회만(안드로이드 정책, FR-010).
- 019의 "이 기기·이 OS 버전 기준" 한계 계승 — 모든 제조사 동일 정확도
  가정 안 함.

**Scale/Scope**:

- 화면 1개 신규(자동 생성 설정) + 기존 일기 화면에 알림 라우팅 진입점.
- 순수 모듈 4개 신규(`src/schedule/`), 기기 통로 3개(알림·인텐트·잠금).
- 하루 1개 일기 불변 — 재시도는 "가장 최근 미완성 1개"만, 009 범위 안.

### 019 스파이크 코드의 처리

`src/spike/`(하네스)는 **이 스펙에서 제거한다**. 019 findings.md의
결론("조건부 가능")이 이 스펙으로 실제 기능화되므로, 하네스는 소임을
다했다. tasks 단계에서 `git rm -r src/spike/` + `DiagnosticsScreen.tsx`
진입점 되돌리기 + `check-constitution.mts`의 `checkSpikeFile` 등록 제거를
하나의 태스크로 묶는다. 하네스가 검증한 것(전역 `defineTask`, 콜백에서
`wiring.ts` 재사용, 권한 재확인 패턴)은 제품 코드로 **다시 구현**하되
베낀 코드가 아니라 계약(아래 contracts/)을 따른다.

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 이후 재확인.*

| 원칙 | 게이트 | 판정 |
|---|---|---|
| **I. 온디바이스가 제품이다** | 자동 생성도 그 기기에서 돈다. 미리 만든 응답·플레이스홀더 없음. 원격 푸시 없음(로컬 알림만). | ✅ 통과 — `wiring.ts` 경로 그대로. 알림은 `expo-notifications` 로컬. |
| **II. 화자는 휴대폰이고 시야는 좁다** | 알림 문구가 관측 안 된 것을 단언하지 않는다. 본문 요약·감상 지어내기 금지(FR-012). "아직 안 끝난 하루" 규칙은 전날만 자동 생성하므로 무관하나, 재시도가 오래된 날을 건드리지 않게 009 범위로 제한(FR-013). | ✅ 통과 — 알림 문구 계약(contracts/notification.md)이 고정 문구만 허용. |
| **III. 모델은 캐릭터다** | 설정 화면·알림에 모델 식별자 노출 없음. 자동 생성은 007이 저장한 캐릭터 선택을 **읽기만** 한다. | ✅ 통과 — `loadSelection()` 재사용, 새 매핑 없음. |
| **IV. 측정 장치를 제품에 들이지 않는다** | 스케줄 실행 로그에 점수·비교·모델 지표 없음. 019 하네스의 `verification-log`(검증 전용)는 제거. 제품에 남는 로그는 진단 경로(dev/prod 게이트)만. | ✅ 통과 — 실행 성패 사실만, 비교·평균 필드 없음. |
| **V. 관측된 사실과 추측을 구분해 기록한다** | SC-003 수치가 019 실측(표본 2회)에 근거하고 "관측 지향값"으로 명시됨. 권한 회수 시 `unknown`/`none` 구분 유지(FR: 사진 없음/좌표 모름). | ✅ 통과 — spec Clarifications가 표본 한계 명시. |
| **개발 방식** | 계약 먼저, 테스트 먼저. 커밋 메시지 한국어. 한 축 과도한 파고들기 경계. | ✅ 계획이 contracts/ 를 먼저 고정. |

**게이트 결과: 통과.** Complexity Tracking 불필요.

### Phase 1 이후 재확인 (2026-08-28)

design 산출물(data-model.md, contracts/×6, quickstart.md)을 낸 뒤 다시
게이트를 확인했다 — **여전히 통과**:

| 원칙 | 재확인 결과 |
|---|---|
| I | 알림은 `expo-notifications` **로컬**(`trigger: null`), 서버·푸시 없음. 백그라운드 생성은 `wiring.ts` → `pipeline.run()` 그대로(contracts/background-generation.md B3). 미리 만든 응답 경로 없음. ✅ |
| II | 알림 문구가 코드 상수 2개로 고정, 본문 요약·감상 금지를 계약 테스트가 소스에서 확인(notification.md N2·N9). "정각"/"매일 7시" 문자열 금지(battery-exception.md E5·E7). ✅ |
| III | 설정·알림에 모델 식별자 없음. `AutoDiarySettings`는 목표 시각·플래그만(auto-diary-settings.md S7). `notified.json`은 `DiaryEntry`와 분리(data-model.md §6). ✅ |
| IV | 019의 `verification-log`(검증 전용 실행 이력)를 **제거**. 제품에 실행 이력 로그를 남기지 않음 — `AutoDiarySettings`에 "마지막 실행 시각" 필드 금지(S7), `pruneNotified`는 날짜 문자열만 비교(S5). 잠금·스케줄 판정 어디에도 점수·비교·평균 없음. ✅ |
| V | SC-003이 "관측 지향값(표본 2회)"로 명시됨. `pruneNotified`·`decideSchedule`가 값이 아니라 날짜만 본다 — "언제 unknown인지 코드가 판정하지 않는다"(원칙 V)와 같은 정신. ✅ |

**신규 의존 3종의 원칙 영향**:

- `expo-notifications` — 로컬 알림만. 원격 API·서버 추론 아님(원칙 I
  무관). 표준 Expo 모듈이라 `checkEnvFile`의 금지 키와 무관.
- `expo-intent-launcher` — 시스템 설정 화면 이동. 추론·측정과 무관.
- (`expo-battery`는 채택 안 함 — research.md §5, battery-exception.md E6.)

`pipeline.ts`에 `acquireLock?` 옵셔널 주입을 더하는 것은 게이트 위반이
아님을 재확인 — 003(`isModelReady?`)·017(`geocoding?`)이 같은 방식으로
`PipelineDeps`를 넓혔고, 계약 테스트가 "주지 않으면 기존 동작"(회귀
없음)을 잠근다(generation-lock.md L5·L8).

### 경계 (지켜야 할 것)

- **`process.env`는 `src/config/environment.ts`에서만**(FR-009a) — 신규
  코드도 예외 없음.
- **하루 경계·정오·선택 범위는 `src/config/day-boundary.ts`에만** —
  스케줄 판정이 "목표 시각"을 새로 계산하되 04:00/정오/3일은 기존 함수
  (`latestClosedDay`, `selectableDays`, `dayBounds`)를 통해서만 본다.
- **프롬프트는 `src/diary/prompt.ts`에만** — 자동 생성도 같은 프롬프트.
- **판정 4갈래 고정**(`src/diary/acceptance.ts`) — 자동이라고 갈래를
  늘리거나 완화하지 않는다(FR-011).
- **알림 발송 판정은 순수 함수 하나에**(`src/schedule/notify.ts`) —
  기기 통로(`expo-notifications`)는 얇은 어댑터, 판정은 밖에서 테스트.
- **경합 잠금 판정도 순수 함수**(`src/schedule/lock.ts`) — 파일 통로는
  주입, stale 타임아웃 값은 이 파일 한 곳에.
- **추론 위치는 `src/inference/select.ts`에서만** — 백그라운드 태스크도
  `wiring.ts`를 거쳐 얻는다. 어댑터 직접 생성 금지(006의 실패 계승).

## Project Structure

### Documentation (this feature)

```text
specs/020-scheduled-diary-notification/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/           # Phase 1 산출물
│   ├── schedule-decision.md      # 스케줄 판정 순수 함수 계약
│   ├── background-generation.md  # 백그라운드 태스크가 파이프라인을 부르는 계약
│   ├── notification.md           # 알림 발송·dedup·탭 라우팅 계약
│   ├── generation-lock.md        # 프로세스 경계 경합 잠금 계약
│   ├── auto-diary-settings.md    # 자동 생성 설정 영속화 계약
│   └── battery-exception.md      # 배터리 최적화 예외 안내·요청 계약
├── checklists/
│   └── requirements.md  # /speckit-specify 산출물 (이미 존재)
└── tasks.md             # /speckit-tasks 산출물 (아직 없음)
```

### Source Code (repository root)

```text
src/
├── schedule/                      # ★ 신규 — 스케줄·알림·잠금의 순수 로직
│   ├── decision.ts                #   지금 자동 생성을 돌려야 하는가 (순수)
│   ├── retry.ts                   #   재시도 대상(가장 최근 미완성 1개, 009 범위) 선정 (순수)
│   ├── notify.ts                  #   알림을 보내야 하는가 / 어느 식별자로 (순수)
│   ├── lock.ts                    #   경합 잠금 취득·해제·stale 판정 (순수)
│   ├── settings.ts                #   자동 생성 설정의 모양 + load/save (통로 주입)
│   ├── notified-store.ts          #   날짜별 알림 상태 맵 load/save (통로 주입)
│   ├── background-port.ts         #   expo-background-task 등록/취소 (기기 통로)
│   ├── notification-port.ts       #   expo-notifications 얇은 어댑터 (기기 통로)
│   ├── battery-exception-port.ts  #   expo-intent-launcher / 설정 링크 (기기 통로)
│   └── task.ts                    #   전역 defineTask 콜백 본체 (wiring.ts 재사용)
├── ui/
│   ├── AutoDiarySettingsScreen.tsx   # ★ 신규 — 목표 시각·on/off·배터리 안내
│   └── DiaryHomeScreen.tsx           # 알림 탭 → 상세 진입점 추가 (기존 수정)
├── app/
│   └── notification-routing.ts    # ★ 신규 — 콜드/웜 시작 시 마지막 알림 응답 → 화면 (순수 판정 + 통로)
├── config/                        # 변경 없음 (day-boundary 재사용만)
├── diary/                         # 변경 없음 (pipeline·store·acceptance 재사용)
└── inference/                     # 변경 없음 (wiring 경유)

App.tsx                            # 자동 생성 설정 탭/진입 + 알림 응답 리스너 배선 (기존 수정)

src/spike/                         # ★ 제거 (git rm -r) — 019 하네스, 소임 완료

scripts/
├── check-constitution.mts        # checkSpikeFile 등록 제거, (필요시) checkScheduleFile 추가
├── constitution-rules.ts         # src/schedule/ 경계 규칙 추가 여부는 tasks에서 판단
└── run-device-tests.mjs          # FLOWS에 scheduled-diary-notification.yml 등록

.maestro/
└── scheduled-diary-notification.yml   # ★ 신규 실기기 흐름

__tests__/
├── schedule/                     # ★ 신규 — decision·retry·notify·lock·settings 테스트
└── ui/                           # AutoDiarySettingsScreen 테스트 추가
```

**Structure Decision**: 단일 프로젝트. 019가 `src/spike/`로 격리했던
검증 로직을 제품 계층으로 승격하되, **스케줄·알림·잠금의 순수 판정은
`src/schedule/` 한 디렉터리에 모으고 기기 통로(`*-port.ts`)만 얇게**
둔다 — 001의 `policy.ts`, 003의 `roster.ts`, 005의 `prompt.ts`가 규칙을
한 곳에 모은 것과 같은 구조다. 기존 제품 계층(`diary/`, `inference/`,
`config/`)은 **재사용만 하고 수정하지 않는다**(예외: `DiaryHomeScreen`과
`App.tsx`의 알림 라우팅 배선, 그리고 `pipeline.run()` 앞단에 잠금
훅 — 아래 Complexity Tracking 없음 판정 근거 참조).

### `pipeline.run()` 잠금 훅에 대한 판단

FR-008(프로세스 경계 경합)은 `pipeline.ts`의 인스턴스 로컬
`running: Set<DayDate>`만으로는 못 지킨다. 두 선택지:

1. **`pipeline.ts`에 잠금 통로를 옵셔널로 주입**(`deps.acquireLock?`) —
   003의 `isModelReady?`, 017의 `geocoding?`이 계약을 넓힌 것과 같은
   패턴. 주지 않으면 기존 동작(회귀 없음).
2. **호출부(task.ts / DiaryHomeScreen)에서 잠금을 감싸기** —
   `pipeline.ts`를 안 건드리지만, 화면·태스크 두 곳이 각자 잠금을
   불러야 해서 한쪽이 빠뜨리면 조용한 경합(006~012가 반복한 배선 끊김).

**선택: 1번.** `pipeline.run()`이 잠금을 아는 유일한 자리가 되어야
"화면에서 골라도 언제나 어제가 쓰인다"류의 조용한 실패를 막는다. 계약
테스트가 옵셔널 확장임을 잠근다(기존 2인자 호출 불변). 상세는
contracts/generation-lock.md.

## Complexity Tracking

> Constitution Check 게이트 위반 없음 — 이 절은 비워 둔다.

`pipeline.ts`에 잠금 통로를 더하는 것은 게이트 위반이 아니라 003·017이
이미 확립한 "옵셔널 의존 주입으로 계약을 넓힌다" 패턴의 재적용이다.
`src/schedule/` 신규 디렉터리도 010·011·015가 신규 디렉터리를 만든
전례를 따른다.
