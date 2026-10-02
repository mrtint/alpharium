# Implementation Plan: 자동 쓰기 규칙

**Branch**: `057-auto-write-rules` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/057-auto-write-rules/spec.md`

## Summary

자동 쓰기가 재료 없는 날과 사진 권한 없는 날을 쓰지 않게 하고(053 판정 재사용), 사진 권한 건너뜀을 날짜 하나 파일로 남겨 설정 사진 행에 빨간 보조 줄로
보인다(보드 `6g`). 목표 시각의 시도 창 안에서 앱을 열면 홈이 054 제자리 쓰기로 시작한다. 완성 알림을 「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」 한 줄로 바꾼다.
판정은 `src/schedule/auto-write.ts`의 순수 함수 하나와 그것을 감싼 조합 함수 하나를 두 경로가 함께 쓴다(research R1·R2).

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, React Native 0.86, React Compiler)

**Primary Dependencies**: 기존 것만 — `expo-file-system`(기록 파일), `expo-notifications`(알림), `expo-background-task`/`expo-task-manager`(020), reanimated(054 그대로). 새 의존성·네이티브 모듈 0.

**Storage**: `files/preferences/auto-write-skipped.json` (`{"day"}` 하나, data-model §2)

**Testing**: jest 두 프로젝트(`logic` `.ts` / `ui` `.tsx`), 소스 계약 테스트, 헌법 검사(`npm run lint`), dev 실기기 수동(quickstart)

**Target Platform**: Android 실기기(SM-S901N, Android 16) — dev(debug) 빌드

**Project Type**: mobile-app

**Performance Goals**: 백그라운드 콜백이 돌 일이 없으면 신호를 읽지 않는다(AW1). 건너뜀이면 모델을 열지 않는다.

**Constraints**: 원칙 IV(측정·이력 금지 — 기록은 날짜 하나), 020 S7(설정 파일 필드 고정), AGENTS(`src/schedule/`에 `AppState` 금지), 054 `AppScreen` 선언 불변

**Scale/Scope**: 새 소스 파일 4(`auto-write.ts`·`skip-store.ts`·`notification-text.ts`·`src/app/skipped-line.ts` + 테스트), 고침 6(`task.ts`·`notification-port.ts`·`App.tsx`·`DiaryHomeScreen.tsx`·`SettingsScreen.tsx`·`settings-text.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 쓰는 경로는 그대로 `pipeline.run()`(화면·백그라운드). 건너뜀은 텍스트를 만들지 않는다 — 실패가 텍스트를 반환하지 않는다. |
| II 화자·좁은 시야 | 통과 — 강화 | 재료 없는 날을 사용자 확인 없이 지어 쓰지 않는다. 알림은 일기 내용·감상을 담지 않는다(FR-024). |
| III 캐릭터 | 통과 | 알림의 이름은 035 `displayNameOf`(호칭)뿐, 모델 정보 없음. `src/schedule/`은 `models/roster`에 닿지 않는다(헌법 검사). |
| IV 측정 장치 금지 | 통과 | 기록은 날짜 하나(SK1). 시각·횟수·걸린 시간 없음. 건너뜀은 실패 기록(§3.6)에 넣지 않는다(S11). |
| V 관측과 추측 | 통과 | `unknown`을 0으로 세지 않는다(AW4는 「쓰지 않음」이지 「0이다」가 아니며 기록·표시하지 않는다). 권한을 읽지 못하면 기록을 지우지 않는다(R4). 실기기 dev 1회(quickstart). |
| 개발 방식 | 통과 | 계약(contracts/auto-write.md) → 테스트 먼저. 한국어 커밋, 기능 브랜치. |

Phase 1 뒤 재확인: 위반 없음. Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/057-auto-write-rules/
├── plan.md
├── research.md          # R1~R8
├── data-model.md        # 판정 결과·기록 파일·화면 값
├── quickstart.md        # 기기 없이 + dev 실기기 4단계
├── contracts/auto-write.md   # AW·SK·BG·NT·SL·OP
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/schedule/
├── auto-write.ts            # 새 — decideAutoWrite(순수) + resolveAutoWrite(조합, 의존 주입)
├── skip-store.ts            # 새 — 건너뛴 날 하나 읽기·쓰기·지우기 + 기기 통로
├── notification-text.ts     # 새 — autoWriteDoneText(name, day)
├── notification-port.ts     # 고침 — present(day, title), 본문 없음
└── task.ts                  # 고침 — resolveAutoWrite → skip이면 skipped, 이름 읽어 알림 제목
src/app/
└── skipped-line.ts          # 새 — skippedLineText(day, now)
src/ui/
├── SettingsScreen.tsx       # 고침 — photoSkipText, Row hintTone
├── settings-text.ts         # 고침 — 문구 둘
└── DiaryHomeScreen.tsx      # 고침 — autoWriteDay·claimAutoWrite, generate의 auto 갈래
App.tsx                      # 고침 — AppFrame: skippedDay 상태·권한 읽어 지우기·앱 열기 문 / DiarySection: resolveAutoWrite
__tests__/schedule/          # auto-write·skip-store·notification-text 새, background-generation·notification-port 고침
__tests__/app/                # skipped-line, app-auto-write-source(App.tsx 소스 계약 — logic 갈래)
__tests__/ui/                 # settings-screen·home-auto-write
```

**Structure Decision**: 기존 계층을 따른다 — 판정·기록은 `src/schedule/`(020의 자리), 화면 문장 판정은 `src/app/`, 그리기는 `src/ui/`, 조립은 `App.tsx`.
`src/schedule/` → `src/app/material.ts` import는 `task.ts`의 기존 `app/wiring` import와 같은 방향이다(research R1).

## 구현 순서 (태스크의 뼈대)

1. 계약 테스트 먼저: AW·SK·NT·SL1(logic) → 구현.
2. `task.ts`·`notification-port.ts` 고침 + BG 테스트 갱신(020 N2 갱신 포함).
3. 설정 보조 줄: `settings-text`·`SettingsScreen`(SL2) → `App.tsx` 조립(SL3, R4 지우기).
4. 앱 열기: `DiaryHomeScreen`(OP2~OP6) → `App.tsx`(OP1, `DiarySection`의 `resolveAutoWrite`).
5. `npm test`·`npm run lint` → dev 실기기(quickstart 1~4) → AGENTS에 057 절.

## Complexity Tracking

없음.
