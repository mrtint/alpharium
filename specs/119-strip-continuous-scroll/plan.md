# Implementation Plan: 홈 날 스트립을 오늘에서 끝나는 이어 스크롤로

**Branch**: `119-strip-continuous-scroll` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: `specs/119-strip-continuous-scroll/spec.md`, 설계 `docs/superpowers/specs/2026-11-16-strip-continuous-scroll-design.md`

## Summary

`DayPicker`의 7칸 팬 제스처를 가로 `FlatList`(칸 폭 = 스트립 폭 ÷ 7, `getItemLayout`, `snapToInterval`)로 바꾼다. 칸 목록은 `state.ts`의 새 순수 함수 `stripCellsFor()`가 범위 시작일(`day-boundary.ts`의 `stripStartDay()`)부터 오늘까지 만든다. 고른 날이 바깥에서 바뀌면 `DayPicker`가 순수 판정 `stripScrollTarget()`(화면 안이면 `null`, 밖이면 최소 거리 오프셋)으로 스크롤한다. 주 넘김 코드(`weekCellsFor`·`swipeWeek`·`canSwipeNext`·`swipeDirectionOf`·고무줄·교체 대기·`day-strip-pan`)와 그것만 쓰던 `weekOf`·`shiftWeek`를 지운다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86)

**Primary Dependencies**: 새 의존성 없음. RN `FlatList`, `useReduceMotion()`(100)

**Storage**: N/A

**Testing**: jest `logic`(범위·칸 목록·스크롤 목표 순수 판정), `ui`(RNTL — 칸 렌더, 누름, 스크롤 이벤트 뒤 선택 유지, 바깥 변경 시 `scrollToOffset` 호출), iOS 시뮬레이터(모양), iPhone 14 개발 서명 Release(손맛)

**Target Platform**: iOS·Android(이번 실기기 확인은 iOS만 — 갤럭시는 밤샘 시험 중)

**Project Type**: mobile-app

**Performance Goals**: 첫 그리기에 보이는 칸만 그린다(가상화). 366칸 × 일기 목록 탐색은 `Set` 한 번으로 줄인다.

**Constraints**: 하루 계산은 `day-boundary.ts`에서만(DB11), `DayPicker`는 판정하지 않는다(049 S5 — 스크롤 목표 계산도 순수 함수를 부른다), 스트립 높이 고정(052), 화면 한글 추가 없음, 365는 사람이 정한 값(원칙 V)

**Scale/Scope**: 칸 최대 366(+ 먼 고른 날이면 그만큼), 화면 부품 하나, 상태 함수 셋, 계약 갱신

## Constitution Check

| 원칙                   | 판정                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| I 온디바이스           | 해당 없음                                                                                                 |
| II 프롬프트            | 해당 없음                                                                                                 |
| III 캐릭터는 모델 위에 | UI가 모델·로스터를 건드리지 않는다. 통과                                                                  |
| IV 측정 장치 없음      | 시간·속도를 재지 않는다. 통과                                                                             |
| V 관측과 추측          | 365일·붙기 추정(녹화 0.4초 프레임)을 사람이 정한 값·추정으로 적고, 안드로이드는 못 본 것으로 적는다. 통과 |

Post-design: 바뀌지 않는다.

## Project Structure

### Documentation

```text
specs/119-strip-continuous-scroll/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/strip-scroll.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
src/config/day-boundary.ts      stripStartDay(selected, now) 추가 · STRIP_PAST_DAYS=365 · weekOf·shiftWeek 삭제
src/app/state.ts                stripCellsFor(items, selected, now) · stripScrollTarget(...) 추가, weekCellsFor·swipeWeek·canSwipeNext 삭제
src/ui/DayPicker.tsx            FlatList 스트립. 팬·고무줄·교체 대기·swipeDirectionOf 삭제. 바깥 변경 시 스크롤
src/ui/DiaryListScreen.tsx      onSwipe·canSwipeNext prop 삭제, 주석 갱신
src/ui/DiaryHomeScreen.tsx      onSwipe 삭제, cells=stripCellsFor
specs/049-home-day-picker/contracts/day-picking.md   S4·S6·SW1·SW3~SW5·SW6·HS1·DB8 갱신(119로 옮겼다고 적는다)
__tests__/config/day-boundary.test.ts · __tests__/app/state.test.ts · __tests__/ui/day-picker.test.tsx · 스트립에 닿는 ui 테스트
.maestro/past-day-diary.yml     M5 — 스트립 밀기 뒤 칸을 눌러 고른다
design/DESIGN.md · AGENTS.md    홈 스트립 서술
```

**Structure Decision**: 기존 파일만 고친다. 새 파일 없음.

## Complexity Tracking

없음.
