# Implementation Plan: 일기 글에서 좌우로 밀어 전날·다음 날로 이동한다

**Branch**: `114-day-swipe` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: `specs/114-day-swipe/spec.md`, 설계 `docs/superpowers/specs/2026-11-11-day-swipe-design.md`

## Summary

쓴 날의 본문과 안 쓴 날의 재료 지면에 가로 팬 제스처(`DaySwipe`)를 걸어, 밀기 방향을 `swipeDay()`로 이웃한 날로 바꾸고 기존 `setChosenDay`를 부른다. 주간 스트립은 고른 날에서 7칸을 만들므로 저절로 따라간다. 접근성 대안은 헤더 날짜 요소(`home-date-button`)의 사용자 지정 동작이다. 새 전환 움직임은 없다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86), `react-native-gesture-handler`, `react-native-reanimated`

**Primary Dependencies**: 없음(새 의존성 없음)

**Storage**: N/A (고른 날은 홈의 상태 `chosenDay` 그대로)

**Testing**: jest `logic`(순수 판정)·`ui`(RNTL + `fireGestureHandler`), iOS 시뮬레이터(화면), iPhone 14(사람이 한 번 민다)

**Target Platform**: iOS·Android 앱(이번 확인은 iOS만)

**Project Type**: mobile-app

**Performance Goals**: 날 바뀜이 손을 뗀 직후 한 번에 보인다(스트립 칸 누름과 같다)

**Constraints**: 하루 계산은 `day-boundary.ts`에서만(`DB11`), 화면 한글은 `src/i18n/catalogs/ko/`에만(062), 숫자는 사람이 정한 값(원칙 V), 쓰는 중 잠금(054)

**Scale/Scope**: 화면 둘(쓴 날·안 쓴 날), 홈 배선 하나, 문구 둘

## Constitution Check

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 해당 없음 |
| II 프롬프트 | 해당 없음 |
| III 캐릭터는 모델 위에 | UI가 모델·로스터를 건드리지 않는다. 통과 |
| IV 측정 장치 없음 | 속도·시간을 재지 않는다. 통과 |
| V 관측과 추측 | 넘김 수치(60pt·600)·활성 조건은 사람이 정한 값으로 주석에 적고, 안드로이드 가장자리 충돌과 손에 맞는 정도는 못 본 것으로 적는다. 통과 |

Post-design: 위 판정이 바뀌지 않는다.

## Project Structure

### Documentation

```text
specs/114-day-swipe/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/day-swipe.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
src/config/day-boundary.ts        shiftDay(day, days) 새 export (addDays는 비공개로 둔다)
src/app/state.ts                  swipeDay(selected, direction, now) 순수 판정 (SwipeDirection 재사용)
src/ui/DaySwipe.tsx (신규)        가로 팬 래퍼 + daySwipeDirectionOf 순수 판정 + 수치 상수
src/ui/WrittenDayPaper.tsx        본문(`written-body`)을 DaySwipe로 감싸고 남은 높이를 채운다. 새 prop onSwipeDay
src/ui/DiaryListScreen.tsx        안 쓴 날 지면(`material-paper`)을 DaySwipe로 감싼다. 쓰는 중엔 감싸지 않는다. DateJump에 접근성 동작. 새 prop onSwipeDay
src/ui/DiaryHomeScreen.tsx        onSwipeDay → swipeDay() → setChosenDay
src/i18n/catalogs/ko/home.ts      접근성 동작 이름 「전날」·「다음 날」
design/DESIGN.md                  홈의 날 이동 입력이 둘(스트립·본문 밀기)임을 적는다
__tests__/                        config(day-boundary), app(state), ui(DaySwipe·WrittenDayPaper·DiaryListScreen·home)
```

**Structure Decision**: 기존 화면 구조를 따른다. 새 파일은 제스처 래퍼 `DaySwipe.tsx` 하나다.

## 기술 결정 (research.md에 근거)

1. **순수 판정**: `swipeDay`는 `state.ts`(스트립의 `swipeWeek` 옆), 날짜 계산은 `day-boundary.ts`의 `shiftDay`. `daySwipeDirectionOf`는 제스처와 함께 `DaySwipe.tsx`(스트립의 `swipeDirectionOf`가 `DayPicker.tsx`에 있는 것과 같다).
2. **제스처**: `Gesture.Pan().runOnJS(true).activeOffsetX([-16, 16]).failOffsetY([-12, 12])`, 넘김은 `|translationX| ≥ 60` 또는 `|velocityX| ≥ 600`. 끝에서 방향을 정해 `onSwipeDay`를 한 번 부른다. 끌림을 따라 움직이지 않는다(새 움직임 없음).
3. **걸 자리**: 쓴 날은 `written-body` View(캐러셀 아래)를 `DaySwipe`로 감싸고 `flexGrow: 1`로 남은 높이를 채워 글이 짧아도 아래 빈 곳에서 밀 수 있게 한다. 캐러셀은 감싸지 않는다. 안 쓴 날은 `material-paper` View를 감싼다. 쓰는 중(`writing`) 분기는 감싸지 않는다.
4. **홈 배선**: `onSwipeDay(direction)`에서 `swipeDay(writePromptFor(...).day, direction, now())`를 구해 `null`이 아니면 `setChosenDay`. 스트립 `onSwipe`의 `swipeWeek` 배선과 같다.
5. **접근성**: 접근성에서 보이는 날짜 요소는 큰 숫자의 `Pressable`(`home-date-button`)뿐이다(요일은 `accessible={false}`). 거기에 `accessibilityActions`(`previousDay`·`nextDay`)와 `onAccessibilityAction`을 단다. 쓰는 중에는 `onPressDate`가 없어 이 `Pressable`도 없다(동작 없음).
6. **문구**: `home.ts` 카탈로그의 `dateJump` 옆에 `daySwipeActions: { previous, next }`를 둔다.
7. **문서**: `design/DESIGN.md`의 홈 섹션에 한 줄. 새 동작이라 보드 밖 초안임을 적는다.
