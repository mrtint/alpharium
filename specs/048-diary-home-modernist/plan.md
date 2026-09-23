# Implementation Plan: 일기 홈을 디자인 보드 1d로 — 날짜 중심 홈과 화면 이동 구조

**Branch**: `048-diary-home-modernist` | **Date**: 2026-09-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/048-diary-home-modernist/spec.md`

## Summary

홈을 보드 `1d`로 다시 그리고 전역 탭 줄을 없앤다. 홈이 루트이고 설정·개발자는 하단 바의 `⋯` 메뉴로 들어가는
하위 화면이 된다. 판정 쪽은 세 가지를 더한다 — (1) `day-boundary.ts`가 「쓸 수 있게 되는 시각」(04:00/12:00)과
7칸 스트립 날짜를 준다, (2) `writePromptFor()`가 「고를 수 있다」와 「쓸 수 있다」를 갈라 아직 쓸 수 없는 오늘을
고를 수 있게 한다, (3) `wiring.ts`가 004 신호 수집을 개수로 좁힌 `DayPreview`를 준다. 화면은 신호 원형도, 04·12
숫자도 모른다. 저장 계층·파이프라인·프롬프트는 무변경이며, 쓸 수 없는 날의 쓰기는 화면·핸들러·파이프라인
게이트 세 겹으로 막는다.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86 / Expo SDK 57

**Primary Dependencies**: 기존 `AppText`·`Button`·`COLORS`/`TYPE` 토큰, RN 코어 `Modal`·`BackHandler`·`AppState`.
새 의존성·새 네이티브 모듈 없음

**Storage**: 없음 — `route`·`chosenDay`는 `AppFrame`의 메모리 상태(파일에 남기지 않음, 009)

**Testing**: jest `logic`(`.ts`)·`ui`(`.tsx`) 프로젝트, 소스 읽기 계약 테스트, 위반 주입, Maestro, 실기기 dev 1회

**Target Platform**: Android 실기기(SM-S901N), dev debug

**Project Type**: mobile app (단일 프로젝트)

**Performance Goals**: 신호 미리보기는 날마다 004 수집을 한 번 더 부른다 — 캐시 없음(FR-022). 느리다는 실측이
생기면 그때 다룬다

**Constraints**: 화면은 `DaySignals`·`WRITABLE_FROM_HOUR`·`DAY_STARTS_AT_HOUR`를 모른다. 색은 `COLORS.*`만,
accent 위 글자는 `accentForeground`(043 R2). 기존 `testID` `day-<date>` 유지

**Scale/Scope**: 화면 파일 7개(신규 3), 순수 로직 4개(신규 1), `App.tsx`, 온보딩 문구 1개, 테스트 ~10개, Maestro
흐름 ~14개

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스가 제품이다 | PASS | 생성 경로 무변경. 저장된 것이 생성을 대신하는 지름길 없음 — `onWrite` 인자 없음 유지(006 S1), 이미 쓴 날은 012 확인 |
| II 화자·좁은 시야 / 하루의 끝 | PASS | 아직 끝나지 않은 하루를 쓰지 못하게 세 겹으로 막는다(FR-034). 정오 전 오늘을 **볼** 수만 있다 |
| III 캐릭터·모델 경계 | PASS | 화면에 모델 정보 없음. `src/ui/`→`models/roster` 차단(007) 유지. 메뉴 항목은 문자열·콜백만 |
| IV 측정 장치 금지 | PASS | 신호 줄의 개수는 004가 이미 모은 입력값이지 모델 출력 점수가 아니다. 진행 중 정밀 수치 없음 |
| V 관측·추측 구분 | PASS | 「없음」과 「모름」을 모든 자리(신호 줄·카드)에서 가른다. 0으로 채우지 않는다. 실기기 dev 확인이 완료 조건, 오전 세션 불가 시 미확인 잔여로 기록 |
| 사진과 시각 처리 | PASS | 미리보기는 캡션을 돌리지 않는다(개수만). 쓸 수 없는 날에는 `captionDay`를 부르지 않는다(FR-036) |
| 개발 방식 | PASS | 계약 먼저(`contracts/`), 테스트 먼저, 한국어 커밋, 기능 브랜치 |

**사후 재검토(Phase 1 후)**: 그대로 PASS. `previewDay`는 파이프라인과 같은 `loadSignals`를 재사용해 새 수집
경로를 만들지 않음을 계약 PV4로 잠갔다.

## Project Structure

### Documentation (this feature)

```text
specs/048-diary-home-modernist/
├── plan.md
├── research.md             # R1~R12
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── write-prompt.md     # DB·WP·SC·DP·PV (순수 로직)
│   └── home-screen.md      # H·S·G·B·M·N·T (화면·이동)
├── checklists/requirements.md
└── tasks.md                (/speckit-tasks)
```

### Source Code (repository root)

```text
src/config/day-boundary.ts        # + STRIP_DAY_COUNT, stripDays(), writableAt()         (수정)
src/app/state.ts                  # SelectableDay.writable, WritePrompt.writable/writableAt,
                                  #   CountHint, DayPreview, dayParts(), StripCell, stripCellsFor()  (수정)
src/app/day-preview.ts            # toDayPreview()                                        (신규)
src/app/wiring.ts                 # AppPipelineResult.previewDay                          (수정)
src/onboarding/requirements.ts    # ifDenied 네 문장 해요체                                 (수정)
src/ui/home-text.ts               # 월·요일·날짜·시각·캡션 문구 조립                          (신규)
src/ui/DayPicker.tsx              # 세로 목록 → 7칸 스트립                                   (재작성)
src/ui/HomeMenu.tsx               # ⋯ 버튼 + Modal 목록                                    (신규)
src/ui/SubScreenFrame.tsx         # 「← 일기」 + BackHandler                               (신규)
src/ui/DiaryListScreen.tsx        # 1d 헤더·신호 줄·카드·하단 바                            (재작성)
src/ui/DiaryHomeScreen.tsx        # chosenDay 제어 prop, 미리보기, 전환 타이머, 쓰기 게이트    (수정)
App.tsx                           # tab → route, 탭 줄 제거, 메뉴 항목, chosenDay 끌어올림    (수정)
scripts/run-device-tests.mjs      # FLOWS에 diary-home-1d.yml                             (수정)
.maestro/diary-home-1d.yml        # 신규 흐름                                              (신규)
.maestro/*.yml                    # 탭 → 메뉴, 바뀐 문구 → testID (research R12)            (수정)
docs/roadmap/README.md            # 31번 진행 기록, 35번 「전역 하단 탭 바」 전제 정정          (수정)
AGENTS.md                         # 048 절                                                 (수정)

__tests__/config/day-boundary.test.ts   # DB (확장)
__tests__/app/state.test.ts             # WP·SC·DP7·DP8 (확장)
__tests__/app/day-preview.test.ts       # DP (신규)
__tests__/app/wiring.test.ts           # PV (확장)
__tests__/ui/home-text.test.ts          # 문구 조립 + G10 소스 검사 (신규, logic)
__tests__/ui/day-picker.test.tsx        # S (재작성)
__tests__/ui/diary-list.test.tsx        # H·G·B (재작성)
__tests__/ui/home-menu.test.tsx         # M (신규)
__tests__/ui/home-navigation.test.tsx   # N (신규)
__tests__/ui/diary-home-writable.test.tsx  # T·G7·G8 (신규)
__tests__/ui/diary-home-write-gate.test.tsx # B6 — DiaryListScreen 대역 (신규)
```

**Structure Decision**: 기존 계층 그대로 — 판정은 `config/`·`app/`의 순수 함수, 기기 통로는 `wiring.ts`, 그리기는
`ui/`. 새 디렉터리 없음.

## Complexity Tracking

위반 없음.
