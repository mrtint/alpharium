# Implementation Plan: 쓸 재료 — 쓰기 전에 그날의 재료를 보이고, 없으면 한 번 더 묻는다

**Branch**: `053-writing-material` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/053-writing-material/spec.md`

## Summary

안 쓴 날의 신호 줄(세 칸)을 보드 `1d` ④의 두 칸(사진·장소)으로 바꾼다. 사진 권한이 없으면 두 칸 모두 빨간 「권한이 없어요 ›」이고
누르면 사진 권한을 요청한다(다시 물을 수 없으면 050 확인 대화상자로 설정 안내). 쓰기 전에 셀 수 있는 재료를 보고 하나라도 있으면 바로 쓰고,
아니면 확인 대화상자를 먼저 띄운다. 「지어낸 하루」는 **새 저장 필드 없이** 읽을 때 저장된 신호로 계산해 본문 지면 맨 위 한 줄로 보인다.

판정은 순수 모듈 하나(`src/app/material.ts`)가 한다 — 「셀 수 있는 항목 중 재료가 있는가」의 **같은 규칙**을 미리보기(쓰기 전)와
저장된 신호(읽을 때) 양쪽에 적용한다. 권한 상태는 `DayPreview.photoAccess`로 화면에 오고(`CountHint`는 세 갈래 그대로),
기기 통로는 새로 만들지 않는다(021 `requestPhotoPermission`·`os-settings-port`). 새 의존성·새 네이티브 모듈·저장 형식 변경이 없다.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), React 19.2, React Native 0.86.2(새 아키텍처), Expo SDK 57

**Primary Dependencies**: 기존만 — 050 대화상자 부품(`ConfirmDialog` 등), 021 권한·설정 통로. **새 의존성 0.**

**Storage**: 없음. 일기 파일 형식 무변경(FR-020). 대화상자·권한 요청 상태는 화면 로컬

**Testing**: jest 29 두 프로젝트(`logic` `.ts` — 판정 / `ui` `.tsx` — 배선), RNTL 14(`render`·`fireEvent` await), Maestro(실기기, `maestro test` 직접)

**Target Platform**: Android(SM-S901N, Android 16), dev(debug) 빌드, `pm clear` 없음

**Project Type**: mobile-app (Expo, 단일 저장소)

**Performance Goals**: 없음(측정 코드를 두지 않는다 — 원칙 IV). 재료 수는 표시되는 사실이지 성능 지표가 아니다

**Constraints**: 새 의존성 0(C1·C2), 색 단일 출처(C5), 문구는 `home-text.ts`(C4), 「없음」과 「모름」을 0으로 뭉개지 않는다(원칙 V), `state.ts`는 신호 계층을
import하지 않는다(DP8), 화면은 `DaySignals`를 모른다, 권한 요청을 강제하지 않는다(FR-012)

**Scale/Scope**: 새 파일 3(`src/app/material.ts`, `src/ui/MaterialGrid.tsx`, `src/ui/MaterialDialogs.tsx`) + `.maestro/writing-material.yml`, 고치는 파일 약 8
(`state.ts`·`day-preview.ts`·`wiring.ts`·`written-day.ts`·`DiaryHomeScreen.tsx`·`DiaryListScreen.tsx`·`WrittenDayPaper.tsx`·`home-text.ts`) + `App.tsx`
조립 + `run-device-tests.mjs`

## Constitution Check

*GATE: Phase 0 전 통과 — Phase 1 뒤 재확인.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론·저장 경로 무변경. 권한이 없어도 쓸 수 있다(FR-012 — 확인만 거친다). 실패가 텍스트를 반환하지 않는다 |
| II. 화자는 휴대폰 | 통과 | 프롬프트 무변경. 재료 없는 하루는 이미 「없었다/모른다」로 프롬프트에 옮겨진다 — 이 조각은 그 사실을 **쓰기 전에 사용자에게** 보일 뿐이다 |
| III. 캐릭터는 모델 위에 | 통과 | 새 화면 글자에 모델·캐릭터 식별자 없음 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 사진·장소 수는 사용자에게 보이는 **관측된 사실**이지 소요 시간·토큰이 아니다. 어떤 값도 기록·채점·비교하지 않는다. 「지어낸 하루」는 저장하지 않고 읽을 때 계산한다 |
| V. 관측과 추측 구분 | 통과 | 핵심 원칙이다. 세 갈래(수·관측된 0·셀 수 없음)를 화면까지 유지하고, 권한 없음과 읽기 실패를 가르며(FR-008), 2f 제목이 기록이 없는지 모르는 상태를 단정하지 않는다(FR-017). 실기기 dev 1회 |
| 개발 방식 | 통과 | 계약(contracts/material.md) → 테스트 먼저. 한국어 커밋. `053-writing-material` 브랜치 |

**Phase 1 뒤 재확인**: 통과. 새 계층·저장·네이티브 모듈이 없어 원칙 I·IV 위반 표면이 늘지 않는다. Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/053-writing-material/
├── plan.md
├── research.md                 # R1~R8
├── data-model.md
├── quickstart.md
├── contracts/material.md       # MAT·DEC·PRM·GRID·DLG·MADE·SRC
├── checklists/requirements.md
└── tasks.md                    # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/material.ts             # 새 — 「셀 수 있는 재료가 있는가」 순수 판정 (미리보기·저장된 신호 공용)
src/app/state.ts                # DayPreview에 photoAccess 추가 (CountHint는 세 갈래 그대로)
src/app/day-preview.ts          # toDayPreview(day, signals, photoAccess)
src/app/wiring.ts               # previewDay가 photoPermission()도 읽어 photoAccess를 싣는다
src/app/written-day.ts          # PaperState.readable에 madeUp (저장된 신호에서 계산)
src/ui/MaterialGrid.tsx         # 새 — 두 칸·권한 없음·0 안내 (SignalRow 대체)
src/ui/MaterialDialogs.tsx      # 새 — 2f 재료 없음 확인, 2m 설정 안내 (050 ConfirmDialog 사용)
src/ui/DiaryListScreen.tsx      # SignalRow·「쓸 수 있는 때」 제거 → MaterialGrid, 안 쓴 날 지면 배치
src/ui/DiaryHomeScreen.tsx      # 쓰기 전 판정·대화상자·권한 요청·복귀 시 다시 셈
src/ui/WrittenDayPaper.tsx      # 본문 위 「지어낸 하루」 한 줄
src/ui/home-text.ts             # MATERIAL_TEXT (보드 KO 원문 + 사람이 정한 두 줄)
App.tsx                         # 권한 요청·설정 열기 통로를 DiaryHomeScreen에 넘긴다 (조립만)

__tests__/app/material.test.ts          # MAT·DEC·MADE (logic)
__tests__/ui/material-grid.test.tsx     # GRID·PRM·DLG (ui)
.maestro/writing-material.yml           # 새 흐름 — FLOWS 등록
```

**Structure Decision**: 새 계층을 만들지 않는다. 판정은 `src/app/`의 순수 모듈, 화면은 `src/ui/`, 통로는 기존 것을 `App.tsx`에서 조립한다.
