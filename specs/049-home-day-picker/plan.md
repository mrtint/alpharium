# Implementation Plan: 날 고르기 — 홈 헤더와 주간 스트립

**Branch**: `049-home-day-picker` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/049-home-day-picker/spec.md`

## Summary

홈 위쪽을 보드 `1d` ①②③(월 라벨·큰 날짜 헤더·일~토 주간 스트립)으로 바꾸고, 스트립을 좌우로 넘겨 지난 날 전부에 닿게
한다. clarify에서 두 규칙이 더해졌다 — **앱 전체의 하루 경계를 04:00에서 기기 로컬 자정으로**, **012의 정오 제한 폐지**.
경계는 `day-boundary.ts` 한 곳에서 바꾸고 소비처는 그대로 따라오게 하며(R1), 백그라운드·알림·미리 준비가 쓰는 「사흘」은
뜻을 보존한다(R4). 사흘 밖의 날을 고를 수 있게 되면서 열리는 미리 준비(018)의 두 모델 동시 적재 위험을 `canPrepare`로
막는다(R5). 스와이프는 설치된 gesture-handler `Gesture.Pan` + reanimated 스프링(R7). 새 의존성 없음.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19 / React Native 0.86.2 (Expo SDK 57)

**Primary Dependencies**: 설치된 것만 — `react-native-gesture-handler ~2.32.0`(Pan), `react-native-reanimated 4.5.1`
(`withSpring`·`withTiming`·공유 값), `react-native-safe-area-context`. 문서 출처는 [research.md](research.md) R7.

**Storage**: 변경 없음. 일기 파일명(`YYYY-MM-DD.json`)의 뜻만 「자정~자정」으로 바뀌고 기존 파일은 옮기지 않는다.

**Testing**: jest 두 프로젝트(`test:logic` `.ts` / `test:ui` `.tsx`), RNGH `jestSetup.js` + `fireGestureHandler`
(ui 프로젝트 setupFiles에 추가 — 테스트 설정 변경이지 의존성 추가가 아니다), 소스 읽기 계약 테스트, Maestro 실기기.

**Target Platform**: Android(SM-S901N, dev debug 1회). 보드는 iOS 프레임이다(C6).

**Project Type**: mobile-app (Expo, 단일 저장소 `src/` + `App.tsx`)

**Performance Goals**: 스와이프 끌림이 손가락을 따라오고(체감 지연 없음), 교체·크로스페이드 150ms. 실기기 육안 확인(D3·D4).

**Constraints**: 새 의존성 금지(FR-022), 하루 경계는 한 파일(FR-018), 판정은 순수 함수에서만 — 화면은 판정하지 않는다.

**Scale/Scope**: 화면 셋(`DiaryListScreen` 헤더, `DayPicker`, `DiaryHomeScreen` 조립) + `App.tsx` 배선 + 경계 모듈과
그 소비처 주석·테스트. Maestro 흐름 4개 수정 + 1개 신규.

## Constitution Check

*GATE: Phase 0 전 / Phase 1 후 재확인.*

| 원칙 | 점검 | 결과 |
| --- | --- | --- |
| I. 온디바이스 | 추론 경로 변경 없음. R5가 오히려 두 모델 동시 적재(기기 사망 = 일기 없음)를 막는다 | 통과 |
| II. 화자·좁은 시야 | 정오 전 오늘 일기는 재료가 적다 — `DAY_STILL_OPEN` 문장이 그대로 실리고 판정 갈래는 늘리지 않는다 | 통과 |
| III. 캐릭터 | 모델 정보 노출 없음 | 통과 |
| IV. 측정 장치 없음 | 채점·비교 코드 없음. 스와이프 수치는 사람이 정한 상수 | 통과 |
| V. 관측과 추측 구분 | 「짐작」 표기(research R7·R8), 실기기 1회(dev), 자정 전환 실기기 미확인 시 기록 | 통과 |
| 헌법 「사진과 시각 처리」 | 사흘 밖의 날도 사진이 있으면 `generate()`가 VLM을 거친다(R5 — 미리 준비만 생략) | 통과 |
| 개발 방식 | 계약(contracts/) 먼저, 테스트 먼저, 기능 브랜치 | 통과 |

04:00 경계·정오 제한은 헌법 2.0.0에 없다(002·012 스펙 규칙) — 개정 불필요. **Phase 1 후 재확인: 위반 없음.**

## Project Structure

### Documentation (this feature)

```text
specs/049-home-day-picker/
├── plan.md
├── research.md          # R1~R11
├── data-model.md        # 하루·주·WritePrompt·StripCell·스와이프
├── quickstart.md        # 위반 주입 V1~V8, 실기기 D1~D10
├── contracts/
│   └── day-picking.md   # DB·WP·SW·H·S·HS·AF
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/config/day-boundary.ts   ★ 자정 경계, isDayWritable 단순화, writableAt·stripDays 삭제,
                               weekOf·shiftWeek·nextDayStartAt 신규, selectableDays 정오 조건 내장(R4)
src/vision/select.ts         ★ bucketIndexOf의 04:00 복제 제거(자정 기준 분)
src/app/state.ts             WritePrompt 축소(selectable·revertedFrom·writableAt 삭제), 기본값 = 오늘,
                               weekCellsFor·swipeWeek·canSwipeNext 신규, StripCell.isToday
src/ui/home-text.ts          dayStateText 신규, hourText·revertedText 삭제
src/ui/DayPicker.tsx         일~토 주, 밑줄, 흐림 .3, Gesture.Pan(runOnJS) + 스프링 튕김
src/ui/DiaryListScreen.tsx   헤더(보드 수치·크로스페이드·상태 줄), 되돌림 캡션 삭제, WriteBar 쓸 수 없음 갈래 삭제,
                               「쓸 수 있는 때」 칸 값 고정 「지금」
src/ui/DiaryHomeScreen.tsx   전환 타이머 → 자정 타이머, canPrepare 게이트(R5), 스와이프 배선
App.tsx                      고른 날 초기값 = 오늘(AppFrame), canPrepare 배선
scripts/seed/shapes.ts       사진 시각 표를 자정 경계로
scripts/run-device-tests.mjs 009 주석 갱신, week-strip-swipe 등록
.maestro/                    today-diary·past-day-diary·diary-home-1d·photo-selection-over-limit 수정,
                               week-strip-swipe.yml 신규
package.json (jest ui setupFiles)  RNGH jestSetup.js 추가
AGENTS.md                    「하루는 04:00에 닫히고 정오부터…」 경계 절 교체, 049 절 추가
__tests__/                   04:00·정오 기대값을 가진 기존 테스트 15개 파일 갱신 + 신규 계약 테스트
```

**Structure Decision**: 기존 계층 그대로. 판정은 `config/`·`app/`의 순수 함수, 화면은 결과만 그린다(048 구조 유지).

### 영향받는 기존 테스트 (04:00·정오·사흘 화면 가정)

`__tests__/app/state.test.ts`, `config/day-boundary.test.ts`, `diary/pipeline.test.ts`, `schedule/decision.test.ts`,
`schedule/retry.test.ts`, `seed/day-range.test.ts`, `seed/exif.test.ts`, `signals/collect.test.ts`,
`vision/select.test.ts`, `ui/AppFrame.firstrun.test.tsx`, `ui/day-picker.test.tsx`, `ui/diary-home-write-gate.test.tsx`,
`ui/diary-home.test.tsx`, `ui/generation-probe.test.tsx`, `ui/home-text.test.ts`.

**원칙**: 기대값을 새 규칙에 맞게 바꾸되, **그 테스트가 지키던 성질이 새 규칙에서도 의미가 있으면 성질은 남긴다**
(예: 009의 「사흘」 테스트는 화면이 아니라 `selectableDays` 계약으로 옮긴다, 048 B4~B6 쓰기 게이트 세 겹은 「미래 날」 입력으로
유지). 성질 자체가 사라진 테스트(정오 전환 타이머, `writableAt`, 되돌림)는 지우고, 지운 이유를 커밋 메시지에 적는다.

## 위험

| 위험 | 대응 |
| --- | --- |
| 경계를 바꾸고 숨은 복제를 놓친다(`select.ts` 같은) | DB11 소스 계약 + 위반 주입 V2 |
| `selectableDays`가 새 `isDayWritable`을 타고 정오 전 오늘을 포함 → 백그라운드가 아침에 씀 | R4 정오 조건 내장 + DB6 + V1 |
| 사흘 밖 사진 있는 날에서 두 모델 동시 적재 | R5 `canPrepare` + HS3 + 실기기 D9 |
| `runOnJS(true)` 팬이 JS 스레드 부하로 끊겨 보임(짐작) | 실기기 D4에서 확인. 끊기면 worklet + `scheduleOnRN`으로 바꾼다(설치됨) |
| 040 첫 실행 자동 생성이 오전에도 돈다 | 사용자 결정의 귀결 — spec Assumptions에 기록, 막지 않음 |
| 자정 전환을 실기기로 못 봄 | HS2 가짜 시계 + 「미확인 잔여」 기록 |

## Complexity Tracking

헌법 위반 없음 — 비워 둔다.
