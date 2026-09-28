# Implementation Plan: 대화상자 기반 — 덮어쓰기 확인과 날짜로 이동

**Branch**: `050-dialog-foundation` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/050-dialog-foundation/spec.md`

## Summary

React Native Reusables(RNR)의 AlertDialog·Dialog·DropdownMenu를 **네이티브 의존성을 걷어낸 복사본**(`src/ui/rnr/`)으로 들여와, 보드 모양의
공용 대화상자 부품 둘(`ConfirmDialog`·`DismissibleDialog`)을 세운다. 그 위에 (1) 전체 화면 덮어쓰기 확인을 홈 위의 `2d` 대화상자로 바꾸고
(오늘을 다시 쓸 때만 안내 한 줄), (2) 헤더 날짜를 누르면 `2j` 「날짜로 이동」 달력을 연다 — 날짜 격자는 react-native-ui-datepicker, 머리와
월·연 목록은 직접 그리며, 칸 판정은 049 스트립과 **같은 `cellFor()` 하나**다. (3) 다운로드 동의 대화상자와 홈 ⋯ 메뉴를 같은 부품으로 옮긴다.
색은 `tokens.ts`에서 RNR 색 이름 별칭을 만들어 잇고(CSS 변수 없음), 새 네이티브 모듈은 없다(research R1).

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), React 19.2, React Native 0.86.2, Expo SDK 57

**Primary Dependencies**: 기존 — NativeWind 4.2, reanimated 4.5.1, gesture-handler 2.32, safe-area-context 5.7. 새 — `@rn-primitives/{alert-dialog,dialog,dropdown-menu,portal,slot}` 1.5.x,
`class-variance-authority` 0.7, `clsx` 2, `tailwind-merge` 3, `react-native-ui-datepicker` 3.3, `dayjs` 1.11 (research R1 — 전부 순수 JS)

**Storage**: 없음 — 저장 형식 무변경. 달력·대화상자 상태는 화면 로컬(FR-020)

**Testing**: jest 29 두 프로젝트(`logic` `.ts` / `ui` `.tsx`, jest-expo), RNTL 14(`render`·`fireEvent` await), Maestro(실기기)

**Target Platform**: Android(SM-S901N, Android 16), dev(debug) 빌드

**Project Type**: mobile-app (Expo, 단일 저장소)

**Performance Goals**: 대화상자 열림·달력 달 넘김이 눈에 띄는 지연 없이(체감). 수치 목표 없음 — 측정 코드를 두지 않는다(원칙 IV)

**Constraints**: 새 네이티브 모듈 0(C2), 색 단일 출처(032 BC5), 하루 경계는 `day-boundary.ts` 하나(049 DB11), 문구는 보드 KO 원문(C4),
다른 조각의 영역을 만들지 않는다(C7), 실기기는 `pm clear` 없이

**Scale/Scope**: 새 파일 약 12개(복사본 7 + 부품·화면 4 + 순수 1), 고치는 파일 약 10개, Maestro 흐름 5개 수정 + 1개 신규

## Constitution Check

*GATE: Phase 0 전 통과 — Phase 1 뒤 재확인.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론 경로 무변경. 확인 대화상자는 생성만 시작시키고, 저장은 판정 통과 뒤(OW8 — 기존 동작 잠금). 대화상자에 미리 만든 글·미리보기가 없다(OW7) |
| II. 화자는 휴대폰 | 통과 | 프롬프트 무변경. 오늘 다시 쓰기 안내(FR-007a)는 사용자에게 사실을 알릴 뿐 모델 출력을 바꾸지 않는다 — 원인 수정은 범위 밖으로 명시(Q5) |
| III. 캐릭터는 모델 위에 | 통과 | 대화상자·달력·메뉴에 모델 이름·식별자 없음(OW7). `src/ui/`가 `models/roster`에 닿지 않는다(기존 헌법 검사) |
| IV. 측정 장치를 들이지 않는다 | 통과 | 진행률·경과 시간·채점 없음. 성능 수치 목표를 두지 않는다 |
| V. 관측과 추측 구분 | 통과 | 네이티브 없음·뒤로 가기 처리는 설치본을 읽어 확인(research R1·R3) — 짐작이던 설계 §1 「미확인」을 실측으로 바꿨다. 실기기 dev 1회, 못 본 것(동의 흐름·D13)은 미확인 잔여로 적는다 |
| 개발 방식 | 통과 | 계약(contracts/dialogs.md) → 테스트 먼저. 한국어 커밋. `050-dialog-foundation` 브랜치 |

**Phase 1 뒤 재확인**: 통과. `confirm-overwrite`에 `items`를 더한 것(data-model §3)은 012 X1(본문 금지)을 깨지 않는다 — `DiaryListItem`은 목록이
이미 보이는 요약이고 `DiaryEntry`는 여전히 싣지 않는다. 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/050-dialog-foundation/
├── plan.md
├── research.md          # R1~R9 (설치본 확인)
├── data-model.md
├── quickstart.md
├── contracts/dialogs.md # DLG·OW·CAL·TXT·MIG·DEP
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
App.tsx                                  # <PortalHost /> (SafeAreaProvider 안 마지막 자식)
tailwind.config.js                       # colors: { ...COLORS, ...RNR_COLOR_ALIASES }, borderRadius.control
jest/setup-ui.ts                         # reanimated 목에 FadeIn·FadeOut·ReduceMotion 스텁

src/ui/theme/tokens.ts                   # RADIUS.control, RNR_COLOR_ALIASES, OVERLAY, DIALOG, CALENDAR
src/ui/rnr/                              # 새 — RNR 레지스트리 복사본(FullWindowOverlay·lucide 제거, 상대 경로)
├── alert-dialog.tsx  dialog.tsx  dropdown-menu.tsx
├── button.tsx  text.tsx  native-only-animated-view.tsx
└── utils.ts                             # cn()
src/ui/components/Dialog.tsx             # 새 — ConfirmDialog·DismissibleDialog (보드 면·버튼 모양 한 곳)
src/ui/OverwriteConfirmDialog.tsx        # 새 — 2d (OverwriteConfirmScreen.tsx 삭제)
src/ui/DateJumpDialog.tsx                # 새 — 2j (머리·월/연 목록 직접, 격자 datepicker)
src/ui/DownloadConsentDialog.tsx         # 교체 — ConfirmDialog 사용
src/ui/HomeMenu.tsx                      # 교체 — RNR DropdownMenu
src/ui/DiaryListScreen.tsx               # onPressDate + home-date-button
src/ui/DiaryHomeScreen.tsx               # confirm-overwrite를 홈 위 대화상자로, calendarOpen
src/ui/home-text.ts                      # OVERWRITE_CONFIRM·DATE_JUMP·CALENDAR_WEEKDAYS·calendarMonthText·calendarYearText
src/app/state.ts                         # cellFor() 분리, confirm-overwrite.items, startWriting(prompt, items)
src/app/calendar.ts                      # 새 — 보이는 달·연 목록·피커 날짜 변환 (순수)

__tests__/app/calendar.test.ts           # CAL12
__tests__/app/state.test.ts              # cellFor·CAL6·startWriting items (기존 파일 확장)
__tests__/ui/dialog.test.tsx             # DLG1~7
__tests__/ui/overwrite-confirm.test.tsx  # OW1~7·OW9·OW10 (기존 파일 재작성)
__tests__/diary/pipeline-overwrite.test.ts # OW8 (새 — 판정 거부·중단 시 저장 0회)
__tests__/ui/diary-list.test.tsx         # 049 H7 → 050 CAL1 (헤더 숫자·요일만 누름)
__tests__/ui/diary-home.test.tsx         # CAL1·CAL7 홈 반영
__tests__/ui/date-jump-dialog.test.tsx   # CAL1~11
__tests__/ui/home-text.test.ts           # TXT1~3 (기존 파일 확장)
__tests__/ui/home-menu.test.tsx          # MIG2 (기존 파일 — Modal 수단을 새 부품으로)
__tests__/ui/download-consent-dialog.test.tsx # MIG1 (기존 파일)
__tests__/ui/dialog-foundation-deps.test.ts   # DEP1~5, MIG3
__tests__/ui/enduser-screen-migration.test.tsx # OverwriteConfirmScreen 항목(ES11) → OverwriteConfirmDialog로 옮김

.maestro/dialog-foundation.yml           # 새 (FLOWS 등록)
.maestro/{diary-user-path,generate-diary,photo-selection-over-limit,writing-flow-simplified,today-diary}.yml  # 덮어쓰기 문구
```

**Structure Decision**: 기존 단일 Expo 구조를 따른다. RNR 복사본은 `src/ui/rnr/`에 격리해 「RNR 부품은 대화상자 부품 안에서만」(Q3)을 경로로
검사할 수 있게 한다(DEP2). 순수 판정은 `src/app/`(049가 `weekCellsFor`·`swipeWeek`를 둔 자리), 문구는 `home-text.ts`(048 FR-037).

## 설계 결정 요약 (research 참조)

1. **RNR 복사본에서 네이티브 import를 걷어낸다**(R2) — `FullWindowOverlay`(iOS 전용)와 lucide 아이콘. DEP1이 잠근다.
2. **뒤로 가기는 프리미티브가 한다**(R3). 부품은 최신 콜백을 ref로 읽는다(마운트 시점 캡처 대응).
3. **datepicker는 날짜 격자만**(R5) — `›`가 `maxDate`를 모르고 제어 prop 되돌리기가 동작하지 않아, 머리·월/연 목록을 직접 그린다.
4. **색 별칭**(R6) — `RNR_COLOR_ALIASES`는 `COLORS` 참조만. RNR식 `accent` 클래스는 `bg-surface`로.
5. **칸 판정 하나**(R9) — `cellFor()`를 떼고 스트립·달력이 둘 다 부른다.
6. **`confirm-overwrite`에 `items`**(data-model §3) — 대화상자 뒤에 홈을 그리기 위해. 취소는 목록을 다시 읽지 않는다.

## 위험

| 위험 | 대응 |
| --- | --- |
| 메뉴 위치가 048 실기기 수정(하단 바 윗선 덮음)을 되살린다 | `side="top"`·`sideOffset`으로 잡고 실기기 D12에서 본다. 어긋나면 `insets`/`sideOffset`만 조정 |
| NativeWind `className` + `style` 병행 `Pressable`을 Maestro가 엉뚱한 좌표로 본다(035 실측) | 대화상자 버튼은 포털 안(스크롤 없음)이라 `scrollUntilVisible`을 안 쓴다. 실패하면 `uiautomator dump` 좌표로 확인 |
| datepicker `onChange`의 `dayjs.tz` 변환이 하루를 민다 | `timeZone`을 주지 않는다. jest(실제 datepicker) + 실기기 D8에서 고른 날 = 스트립 선택을 본다 |
| 프리미티브 BackHandler와 기존 핸들러(쓰는 중 그만두기, SubScreenFrame)가 겹친다 | 대화상자는 홈 목록 상태에서만 열린다. 쓰는 중·하위 화면과 동시에 마운트되지 않는다 |
| 포털 저장소(zustand)가 jest 테스트 사이에 남는다 | 렌더 도우미가 `PortalHost`를 함께 그리고 매 테스트 `unmount` |

## Complexity Tracking

(위반 없음)
