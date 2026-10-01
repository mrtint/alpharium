# Implementation Plan: 매일 쓰는 시각과 장소 이름 — 설정의 두 행과 두 대화상자

**Branch**: `056-settings-time-place` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/056-settings-time-place/spec.md`

## Summary

설정 「일기」 묶음의 임시 자리(`diaryExtras` — 옛 24칸 시각 목록·장소명 카드)를 두 행으로 바꾼다. 「매일 쓰는 시각」 행은 토글이 켜졌을 때만
안쪽을 절대 배치로 뺀 감쌈의 높이를 0 ↔ 잰 높이로 200ms 옮겨 펼치고(R4), 누르면 050 `DismissibleDialog` 틀의 시 격자 대화상자(`6f`)가 열려
칸 한 번에 저장·닫힌다(Clarification Q4 — 「저장」 버튼 없음). 「장소 이름으로 보기」 행은 늘 있고 `6l` 대화상자에서 칸 한 번에 저장·닫히며 「켬」이면
닫힌 직후 위치 권한을 요청한다. 시 표기·격자·미리보기(오전이면 「어제」)·시간대 줄은 순수 함수 `src/app/target-hour.ts`, 기기 시계(형식·시간대·시차)는
Hermes `Intl` + `getTimezoneOffset`을 감싼 `src/app/device-clock.ts`가 준다(R1~R3, 새 네이티브 모듈 0). 055 잔여 둘: 토글 꺼짐 손잡이를 `textMuted`로(R11),
설정 값을 `AppFrame`이 들고 있어 두 번째 열기부터 「읽는 중」이 없다(R5). 기본 시각 7 → 22는 파일 없음·깨진 칸에만(Clarification Q1·SE3).

## Technical Context

**Language/Version**: TypeScript 5 · React 19 · React Native 0.86 · Expo SDK 57

**Primary Dependencies**: react-native-reanimated 4.5.1(펼침), RNR `Dialog`(050 `DismissibleDialog`), `expo-location`(「켬」 권한 요청 — 기존 지연 import). 새 의존성 없음.

**Storage**: 기존 `preferences/auto-diary.json`(020)·장소명 파일(029). 모양 무변경, 대체 시각만 22.

**Testing**: jest logic(`target-hour`·`device-clock`·`settings-effects`·`settings`), jest ui(`SettingsScreen`·두 대화상자·조립 소스 계약·문구), `theme-tokens.test.ts`, 헌법 검사, Maestro `settings-time-place.yml`(새로 `FLOWS` 등록).

**Target Platform**: Android 실기기(SM-S901N, Android 16), dev(debug) 빌드.

**Project Type**: mobile-app (단일 Expo 앱)

**Performance Goals**: 펼침이 실기기 녹화에서 끊김 없이(SC-001), 두 번째 설정 열기에 읽는 중 0프레임(SC-006).

**Constraints**: 새 네이티브 모듈 0(FR-036), 화면은 판정하지 않는다(FR-037), `src/app/` → `src/ui/` import를 만들지 않는다(R8), 자동 생성 판정·시도 창 무변경(C7), 문구는 보드 KO 원문(C4).

**Scale/Scope**: 순수 모듈 2, 화면 부품 2(대화상자), `SettingsScreen` 행 2 + 토글 색, `App.tsx` 조립 재배치, 파일 2개·테스트 3개 삭제, Maestro 흐름 1 신설 + 2 수정.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 해당 없음 | 생성 경로 무변경 |
| II 화자 | 해당 없음 | 프롬프트 무변경 |
| III 캐릭터 | 통과 | 모델 정보 노출 없음. 화면이 로스터에 닿지 않는다 |
| IV 측정 장치 | 통과 | 설정 파일에 필드를 늘리지 않는다(020 S7·D3 — 「언제부터」 필드를 Clarification Q5에서 기각). 실측 로그(Q0)는 한 번 찍고 지운다 |
| V 관측과 추측 | 통과 | 읽지 못한 시간대는 줄을 그리지 않는다, 형식을 못 읽으면 12시간(폴백을 명시), 오전 시의 「어제」는 판정 사실대로, 첫 열기 전엔 기본값을 그리지 않는다(FR-031). `Intl` 실측은 quickstart Q0. 실기기 dev 1회 |
| 개발 방식 | 통과 | 계약 → 테스트 먼저 → 구현. 브랜치 `056-settings-time-place` |

Post-design 재확인: 위와 같다. 위반·예외 없음 — Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/056-settings-time-place/
├── plan.md
├── research.md          # R1~R11
├── data-model.md
├── quickstart.md        # 실기기 Q0~Q10
├── contracts/
│   └── settings-time-place.md   # TH·DC·SE·SR·TD·PD·AS·TX
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/
├── target-hour.ts        # 새로 — 순수 표기·격자·미리보기·시간대 줄 (TH)
└── device-clock.ts       # 새로 — Intl·getTimezoneOffset 감싸기, 던지지 않음 (DC)
src/schedule/
├── settings.ts           # 기본 targetHour 7 → 22 (SE3)
└── settings-effects.ts   # applyTargetHour 저장 실패 시 current (SE2)
src/ui/
├── SettingsScreen.tsx    # diaryExtras 제거, 시각 행(펼침)·장소 행, 토글 꺼짐 손잡이 (SR)
├── TargetHourDialog.tsx  # 새로 — 6f (TD)
├── PlaceNameDialog.tsx   # 새로 — 6l (PD)
├── settings-text.ts      # 새 키 (TX)
├── theme/tokens.ts       # SETTINGS.toggle.knobOff, 대화상자 격자·칸 치수
├── AutoDiarySettingsScreen.tsx   # 지운다 (AS5)
└── GeocodingSettingToggle.tsx    # 지운다 (AS5)
App.tsx                   # AppFrame이 설정 값 보관·재등록 effect, SettingsSection이 두 대화상자 배선 (AS)

__tests__/
├── app/target-hour.test.ts, app/device-clock.test.ts           # 새로
├── schedule/settings-effects.test.ts, schedule/settings*.test.ts  # SE2·SE3 추가
├── ui/settings-screen.test.tsx                                 # SR 추가, diaryExtras 관련 갱신
├── ui/target-hour-dialog.test.tsx, ui/place-name-dialog.test.tsx  # 새로
├── ui/settings-time-place-wiring.test.ts(x)                    # AS 소스 계약
├── ui/theme-tokens.test.ts                                     # knobOff 3:1
└── (지움) ui/auto-diary-settings-screen.test.tsx, ui/geocoding-setting-toggle.test.tsx, denied-guidance.test.tsx의 AutoDiarySettingsScreen 블록

.maestro/
├── settings-time-place.yml        # 새로, FLOWS 등록
├── scheduled-diary-notification.yml  # 시각 단계만 새 testID (FLOWS 밖 유지)
└── diary-body-screen.yml          # 장소명 블록만 새 testID (FLOWS 밖 유지)
scripts/run-device-tests.mjs       # FLOWS에 settings-time-place
```

**Structure Decision**: 기존 단일 Expo 앱 구조를 따른다 — 판정은 `src/app/`(순수), 저장 효과는 `src/schedule/`, 그리기는 `src/ui/`, 기기 통로 조립은 `App.tsx`(055와 같은 방식).

## Complexity Tracking

없음.
