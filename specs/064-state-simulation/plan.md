# Implementation Plan: 상태 흉내 — 개발 환경에서 홈의 상태를 데이터 없이 띄워 본다

**Branch**: `064-state-simulation` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/064-state-simulation/spec.md`

## Summary

개발 환경의 개발자 화면에 「상태 흉내」 묶음(보드 `6e` ③)을 둔다. 흉내 값은 별도 파일 `preferences/simulation.json`(날짜 하나 + 토글 셋, 모두 꺼지면 파일을 지운다)에
담고 `AppFrame`이 마운트 때 한 번 읽어 든다(059 `use-developer-menu.ts`와 같은 모양, R1·R2). 흉내는 **홈의 입력 두 개만 갈아 끼운다** — 홈이 이미 주입받는 시계(`now`)와
미리보기 통로(`previewDay`)다(R3·R4). 「실패 토스트 보기」는 홈이 다시 보일 때 054 토스트를 한 번 올린다(R5). 「하나라도 켜짐」은 순수 함수 하나(`simulationBlocksWriting`)이고
다섯 쓰기 진입점이 그것을 본다 — 홈 쓰기 바(회색 + DEV, 누르면 059 토스트 줄), 앱 열면 쓰는 중(057 claim), 진단 쓰기 요청, `runAutoDiaryTask`(헤드리스는 파일을 직접 읽음),
진단 두 행(누를 수 없음 + 차단 문구)(R6~R8). 흉내 값이 파이프라인·자동 쓰기 판정·신호에 닿지 않게 헌법 검사를 하나 더한다(R10).

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, React Native 0.86, React Compiler)

**Primary Dependencies**: 기존 것만 — 날짜 대화상자는 050의 `react-native-ui-datepicker`·`dayjs`·RNR Dialog(`components/Dialog.tsx`)를 쓴다. 새 의존성 0, 새 네이티브 모듈 0.

**Storage**: 새 파일 하나 — `preferences/simulation.json`(흉내가 하나라도 켜졌을 때만 존재). data-model §1.

**Testing**: jest 두 프로젝트(`logic` `.ts` / `ui` `.tsx`), 소스 계약 테스트, 헌법 검사(`npm run lint`, 위반 주입), Maestro 흐름 하나(`FLOWS` 등록), dev 실기기(quickstart)

**Target Platform**: Android 실기기 — dev(debug) 빌드

**Project Type**: mobile-app

**Performance Goals**: 해당 없음. 파일 읽기는 앱 마운트 때 한 번, 백그라운드 태스크 시작 때 한 번.

**Constraints**: 원칙 I(흉내 중 쓰기 없음, 흉내 값이 생성 경로에 닿지 않음), 원칙 V(못 읽으면 꺼짐 — 모르는 것을 켜짐으로 채우지 않는다), S7·D2(개발 환경 판정은 `showsOnScreen`),
D3(실행 이력 없음, 별도 파일), 055 겹 규칙(홈 언마운트 금지), 054 `AppScreen` 불변(007 S1·009 I7·012 C3), 049 `day-boundary.ts` 단일 출처(DB11 — `getHours() ±` 금지),
062 카탈로그(화면 문구는 `src/i18n/catalogs/ko/`), React Compiler 규칙(ref는 콜백 안에서만)

**Scale/Scope**: 새 소스 4(`src/app/simulation.ts`·`simulation-store.ts`, `src/ui/use-simulation.ts`·`SimulationDateDialog.tsx`) + 카탈로그 영역 1(`src/i18n/catalogs/ko/simulation.ts`) + Maestro 흐름 1(`.maestro/state-simulation.yml`)
+ 테스트, 고침 약 8(`App.tsx`·`DiaryHomeScreen.tsx`·`DiaryListScreen.tsx`·`DeveloperScreen.tsx`·`DiagnosticsScreen.tsx`·`src/schedule/task.ts`·`tokens.ts`·`scripts/constitution-rules.ts`·`run-device-tests.mjs`)

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 흉내는 저장된 응답을 보이지 않는다. 흉내 중에는 다섯 진입점 모두 쓰지 않는다(FR-012). 흉내 값은 생성 경로에 들어가지 않는다(FR-015, R10) |
| II. 화자는 휴대폰 | 무관 | 프롬프트·판정 무변경 |
| III. 캐릭터는 모델 위에 | 통과 | 모델·키에 닿지 않는다(`UI_TOUCHES_ASSET` 그대로) |
| IV. 측정 장치 금지 | 통과 | 흉내 기록에 시각·횟수 없음(D3). 측정·채점 코드 없음 |
| V. 모르는 것을 채우지 않는다 | 통과 | 파일을 못 읽으면 꺼짐(FR-016). 「재료 0」 흉내는 관측된 0을 **흉내라고 밝힌 화면(DEV)에서만** 보인다 |

재평가(Phase 1 뒤): 통과 — data-model·contracts가 위 경계를 그대로 잠근다.

## Project Structure

### Documentation (this feature)

```text
specs/064-state-simulation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/simulation.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/simulation.ts          # 순수: 파싱·효력·하나라도 켜짐·지금 치환·미리보기 치환
src/app/simulation-store.ts    # 통로: preferences/simulation.json 읽기·쓰기·지우기
src/ui/use-simulation.ts       # AppFrame이 든 흉내 상태(마운트 때 한 번 읽음, 바꾸면 저장)
src/ui/SimulationDateDialog.tsx
src/ui/DeveloperScreen.tsx     # 「상태 흉내」 묶음
src/ui/DiaryListScreen.tsx     # DEV 표시·회색 쓰기 바
src/ui/DiaryHomeScreen.tsx     # writeBlocked·onWriteBlocked·simulatedFailToast
src/ui/DiagnosticsScreen.tsx   # writeBlocked
src/schedule/task.ts           # 시작 전 차단 확인
App.tsx                        # 조립
src/i18n/catalogs/ko/simulation.ts  # 새 카탈로그 영역(062 골든 밖, R11)
scripts/constitution-rules.ts  # SIMULATION_LEAKS
.maestro/state-simulation.yml
```

**Structure Decision**: 기존 단일 앱 구조. 순수 판정은 `src/app/`, 화면은 `src/ui/`, 조립은 `App.tsx`(059·060과 같다).

## Complexity Tracking

위반 없음.
