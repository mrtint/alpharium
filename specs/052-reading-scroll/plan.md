# Implementation Plan: 읽기 스크롤 — 쓴 날을 읽는 동안 스트립을 접는다

**Branch**: `052-reading-scroll` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/052-reading-scroll/spec.md`

## Summary

쓴 날의 지면을 아래로 8px 넘게 내리면 스트립(과 그 아래 안내 캡션)을 240ms로 접고 날짜 줄 오른쪽에 ▾를 띄운다. 맨 위(2px 이하)로 올라가거나
접힌 날짜 줄 전체를 누르면 펼친다. 펼쳐도 읽던 위치·바 상태는 그대로다(보드 `5a`·`5b`). 판정은 순수 함수 `foldAfterScroll()`
(`src/app/reading-scroll.ts`)가 하고, 화면은 051 지면(`WrittenDayPaper`)이 알려 주는 스크롤 표본을 넘기고 결과를 그린다. 접는 움직임은
reanimated `maxHeight`(잰 높이 ↔ 0) + `opacity`다. 끝 판정은 051 `reachedEnd`를 그대로 쓰되, 다시 판정하는 때를 스크롤 사건·내용 크기 변화·첫 측정으로
좁힌다(접힘·펼침이 바를 움직이지 않게). 새 의존성·새 네이티브 모듈·저장 형식 변경이 없다.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), React 19.2, React Native 0.86.2(새 아키텍처), Expo SDK 57

**Primary Dependencies**: 기존만 — reanimated 4.5.1(+ `react-native-worklets/plugin`, 033), gesture-handler 2.32(049 스트립 팬 — 무변경).
**새 의존성 0.**

**Storage**: 없음. 접힘 상태는 화면 로컬(`DiaryListScreen`), 파일에 남기지 않는다

**Testing**: jest 29 두 프로젝트(`logic` `.ts` — 판정 함수 / `ui` `.tsx` — 배선), RNTL 14(`render`·`fireEvent` await), 051 `paper-end.ts` 도우미 확장,
Maestro(실기기, `maestro test` 직접 실행)

**Target Platform**: Android(SM-S901N, Android 16), dev(debug) 빌드

**Project Type**: mobile-app (Expo, 단일 저장소)

**Performance Goals**: 접힘·펼침이 240ms 안에 끝나고 되튐이 없다(SC-003, 화면 녹화로 본다). 측정 코드를 두지 않는다(원칙 IV)

**Constraints**: 새 의존성 0(C1·C2), 색 단일 출처(C5), 문구는 `home-text.ts`(C4), 안 쓴 날 무변경(C7·FR-016), 판정 상수는 한 파일(FR-018),
애니메이션 시작값은 마운트 값으로(049 교훈), 실기기는 `pm clear` 없이

**Scale/Scope**: 새 파일 2(`src/app/reading-scroll.ts`, `.maestro/reading-scroll.yml`) + 테스트 2, 고치는 파일 4
(`DiaryListScreen.tsx`·`WrittenDayPaper.tsx`·`home-text.ts`·`tokens.ts`) + `run-device-tests.mjs`

## Constitution Check

*GATE: Phase 0 전 통과 — Phase 1 뒤 재확인.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스가 제품이다 | 통과 | 추론·저장 경로 무변경. 쓰기 동작(`onWrite`)과 판정 경로 무변경 |
| II. 화자는 휴대폰 | 통과 | 프롬프트 무변경 |
| III. 캐릭터는 모델 위에 | 통과 | 새 화면 글자 없음(▾, 접근성 라벨 하나) — 모델 식별자 없음 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 스크롤 위치는 화면 판정의 입력일 뿐 기록·채점하지 않는다 |
| V. 관측과 추측 구분 | 통과 | 판정 경계는 사람이 정한 상수(보드 8·2·4)이고 테스트로 잠근다. 「접으면 스크롤할 것이 없어지는 본문」 규칙은 **보드에 없음**으로 표시했다(FR-005). 움직임은 실기기 녹화로 확인하고 확인 못 한 것은 미확인으로 남긴다. 실기기 dev 1회 |
| 개발 방식 | 통과 | 계약(contracts/reading-scroll.md) → 테스트 먼저. 한국어 커밋. `052-reading-scroll` 브랜치 |

**Phase 1 뒤 재확인**: 통과. 050 CAL1(큰 숫자·요일 → 달력)은 펼친 상태에서 그대로이고, 접힌 상태에서만 날짜 줄 누름이 펼치기로 바뀐다 — 계약
RS-TAP에 적었다. 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/052-reading-scroll/
├── plan.md
├── research.md               # R1~R7
├── data-model.md
├── quickstart.md
├── contracts/reading-scroll.md # FOLD·PAPER·RS·TAP·SRC
├── checklists/requirements.md
└── tasks.md                  # /speckit-tasks
```

### Source Code (repository root)

```text
src/app/reading-scroll.ts        # 새 — foldAfterScroll() (순수), FOLD_AFTER 8 · UNFOLD_AT 2
src/ui/WrittenDayPaper.tsx       # onScrollSample(y, previousY, viewport, content) 알림 추가,
                                 #   끝 판정은 스크롤 사건·첫 측정·내용 크기 변화에서만 (레이아웃 변화로는 재판정 안 함)
src/ui/DiaryListScreen.tsx       # 쓴 날: 접힘 상태(날마다 새로), Header에 foldable/collapsed/onExpand,
                                 #   StripFold(스트립 + 안내 캡션을 감싸 maxHeight·opacity), DateRow 누름 두 갈래, ▾
src/ui/home-text.ts              # READING_SCROLL(▾ 글자, 접힌 날짜 줄 접근성 라벨)
src/ui/theme/tokens.ts           # READING_SCROLL 치수(접힘 240·불투명도 180·▾ 240·▾ 폭 28·14/700)

__tests__/app/reading-scroll.test.ts   # FOLD1~ (logic)
__tests__/ui/reading-scroll.test.tsx   # PAPER·RS·TAP·SRC (ui)
__tests__/ui/paper-end.ts              # scrollPaper(y) 도우미 추가

.maestro/reading-scroll.yml      # 새 흐름 (FR-020)
scripts/run-device-tests.mjs     # FLOWS 등록
```

**Structure Decision**: 판정은 `src/app/`(051 `written-day.ts`와 같은 계열의 화면 판정), 그리기는 `src/ui/`. 지면은 스크롤 표본만 알리고 판정을
모른다 — 접힘 상태는 헤더와 지면을 모두 가진 `DiaryListScreen`이 든다.

## Complexity Tracking

없음.
