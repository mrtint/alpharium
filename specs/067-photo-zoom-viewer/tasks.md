---

description: "Task list for 067 쓴 날 사진 확대 화면"
---

# Tasks: 쓴 날 사진 확대 화면

**Input**: Design documents from `specs/067-photo-zoom-viewer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/photo-viewer.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 이야기의 테스트 태스크는 구현보다 먼저이고, 먼저 빨갛게 되는 것을 본다.

**Organization**: 사용자 이야기(spec US1~US3)별 단계.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일·앞 태스크에 기대지 않아 함께 할 수 있다
- **[Story]**: US1·US2·US3

---

## Phase 1: Setup

**Purpose**: 기존 계약 확인 — 새 프로젝트 설정은 없다(새 의존성 0, FR-016)

- [X] T001 기존 계약을 먼저 읽는다: `__tests__/ui/photo-carousel.test.tsx`(051 CAR1~CAR11, 특히 CAR9 「누름 핸들러가 없다」)·`__tests__/ui/written-day-home.test.tsx`·`__tests__/ui/written-day-reach.test.ts`·`__tests__/i18n/ko-golden.test.ts`·`__tests__/i18n/boundaries.test.ts`(있으면)에서 이 기능이 바꾸는 단언을 목록으로 적어 둔다(뒤집을 것은 CAR9 하나여야 한다 — 다른 것이 나오면 contracts에 더한다)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 판정 순수 함수와 문구 — 모든 이야기가 쓴다

- [X] T002 [P] 판정 계약 테스트 ZV1~ZV11을 `__tests__/app/photo-viewer.test.ts`에 쓴다 — 상수 `ZOOM_MAX 4`·`ZOOM_DOUBLE_TAP 2`·`ZOOM_MIN_LIVE 0.6`·`DISMISS_DISTANCE 120`·`DISMISS_VELOCITY 800`·`DISMISS_FADE_DISTANCE 300`·`BACKDROP_MIN_OPACITY 0.2`와 `pinchScale`·`settleScale`·`doubleTapScale`·`isZoomed`(여유 0.01)·`shouldDismiss`(`translationY > 0`이고 거리 ≥120 또는 속도 ≥800)·`backdropOpacity`(선형)·`fittedSize`(contain, 0 이하 → `undefined`)·`panLimit`(`max(0,(fitted×scale−box)/2)`, `fitted` 없으면 0)·`clampOffset`의 contracts 표 값 그대로, ZV11은 주석을 걷은 소스에 `../ui/`·`react-native` import가 없음. 실행해 빨간 것을 본다
- [X] T003 [P] 판정을 `src/app/photo-viewer.ts`에 구현한다(data-model §5, 수치 상수는 「사람이 정한 값」 주석과 함께 한 자리) — T002가 초록
- [X] T004 [P] 문구 영역 `src/i18n/catalogs/ko/photo-viewer.ts`(`photoViewer = { close: "닫기", open: "사진 크게 보기" }`, `as const` 금지 K1)를 만들고 `src/i18n/catalogs/ko/index.ts`의 `ko`에 `photoViewer`를 등록, `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 「닫기」·「사진 크게 보기」를 더하고 주석에 067을 적는다
- [X] T005 `src/ui/home-text.ts`에 `export const PHOTO_VIEWER_TEXT = lazyText((c) => c.photoViewer);`를 더한다(062 C4 — 모듈 최상단에서 속성을 읽지 않는다)

**Checkpoint**: `npm run test:logic` 초록, `npx tsc --noEmit` 0

---

## Phase 3: User Story 1 - 사진을 눌러 잘리지 않은 전체를 크게 본다 (Priority: P1) 🎯 MVP

**Goal**: 지면 사진을 누르면 확대 화면(배율 1, 넘김·확대 없이도 성립)이 열리고 ✕·뒤로 가기로 닫힌다

**Independent Test**: quickstart Q1·Q2·Q3·Q13

### Tests for User Story 1

- [X] T006 [P] [US1] 확대 화면 계약 테스트 ZP1·ZP2·ZP3·ZP4·ZP6·ZP9를 `__tests__/ui/photo-viewer.test.tsx`에 쓴다 — `PhotoViewer`를 `photos`(1장·3장)·`startIndex`·`onClose`로 렌더해 `Modal` props(`transparent`·`statusBarTranslucent`·`navigationBarTranslucent`)·`GestureHandlerRootView`(소스)·배지 「n / N」(1장이면 없음)·`photo-viewer-close`의 `accessibilityRole="button"`과 접근성 이름 `PHOTO_VIEWER_TEXT.close`·누르면 `onClose(startIndex)`·`onRequestClose` 호출 시 `onClose(startIndex)`·사진 `resizeMode="contain"`과 `file://` 경로·`onError` 뒤 `photo-viewer-missing`을 단언(RNTL 14 — `render`·`fireEvent`를 `await`). 빨간 것을 본다
- [X] T007 [P] [US1] `__tests__/ui/photo-carousel.test.tsx`의 CAR9를 ZC1·ZC2·ZC4로 바꾼다 — 3장·1장 모두 `photo-open-<photoId>`(`accessibilityRole="imagebutton"`, 이름 `PHOTO_VIEWER_TEXT.open`)가 있고, 실패 칸에는 없다. ZC3: 누르면 `photo-viewer`가 나타나고 그 캐러셀의 `defaultIndex` host prop이 누른 장(목은 첫 항목만 그리므로 첫 장 누름 → 0). 테스트 머리 주석에 「051 CAR9를 067이 뒤집었다」를 적는다. 빨간 것을 본다

### Implementation for User Story 1

- [X] T008 [US1] `src/ui/ZoomablePhoto.tsx`의 첫 모양을 만든다 — 사진 한 장을 화면 상자(`width`·`height` props)에 `resizeMode="contain"`·`source={{ uri: \`file://${resizedPath}\` }}`으로, `onError` → 「이 사진은 이제 없어요」(`WRITTEN_DAY_TEXT.photoMissing`, testID `photo-viewer-missing`), `onLoad` 원본 크기 → `fittedSize()` 저장. 이 단계에서는 제스처 없음
- [X] T009 [US1] `src/ui/PhotoViewer.tsx`를 만든다 — props `photos`·`startIndex`·`onClose(index)`; RN `Modal`(`visible`, `transparent`, `animationType="fade"`, `statusBarTranslucent`, `navigationBarTranslucent`, `onRequestClose={() => onClose(index)}`), 내용 `GestureHandlerRootView style={{ flex: 1 }}`, 배경 `COLORS.text`, 위 안전 영역 안에 배지(2장 이상, 지면 배지와 같은 `WRITTEN_DAY.badge` 모양, 템플릿 리터럴 하나 + `accessibilityLabel`, testID `photo-viewer-badge`)와 ✕ 버튼(`Pressable`, testID `photo-viewer-close`, `accessibilityRole="button"`, `accessibilityLabel={PHOTO_VIEWER_TEXT.close}`, 글자 「✕」 `COLORS.bg`, 터치 영역 최소 44). 1장이면 `ZoomablePhoto` 하나, 2장 이상이면 일단 시작 장 하나(넘김은 US2). 안전 영역은 `react-native-safe-area-context`의 `useSafeAreaInsets`(없으면 0 — `SafeAreaInsetsContext` 056 선례) — T006 중 US1 부분 초록
- [X] T010 [US1] `src/ui/PhotoCarousel.tsx`를 고친다 — `PhotoFace`가 실패가 아니면 `Pressable`(testID `photo-open-<photoId>`, `accessibilityRole="imagebutton"`, `accessibilityLabel={PHOTO_VIEWER_TEXT.open}`, `onPress={() => onOpen(i)}`)로 감싼다; 1장 화면과 캐러셀 `renderItem`(그 `index`) 모두; `PhotoCarousel`에 `viewerStart: number | null` 상태와 `<PhotoViewer>`(열렸을 때만)를 둔다; `renderItem`·`data`의 참조 고정(046·051 `memo`)을 깨지 않게 `onOpen`은 `useCallback`. 머리 주석의 「사진을 누르지 않는다」를 「067 — 누르면 확대 화면(051 결정을 뒤집음)」으로 고친다. 지면 캐러셀의 `configurePan`(CAR3)은 바꾸지 않는다. 확대 화면 상태를 `PhotoCarousel` 안에 두고 `WrittenDayPaper`의 `key={paper.entry.date}`(CAR10)는 그대로 둔다 — 자정에 고른 날이 바뀌지 않으므로(049) 열린 확대 화면이 닫히지 않는다(spec Edge Cases, plan Structure Decision) — T007 초록, 기존 CAR1~CAR8·CAR10·CAR11 초록

**Checkpoint**: `npm run test:ui -- photo` 초록 — 확대 화면이 열리고 닫힌다(MVP)

---

## Phase 4: User Story 2 - 확대 화면 안에서 넘기고, 아래로 끌어 닫는다 (Priority: P2)

**Goal**: 배율 1에서 순환 넘김·아래로 끌어 닫기, 닫으면 지면이 마지막 장

**Independent Test**: quickstart Q5·Q6·Q7

### Tests for User Story 2

- [X] T011 [P] [US2] `__tests__/ui/photo-viewer.test.tsx`에 ZP5·ZP7·ZP8을 더한다 — 3장: `photo-viewer-carousel`의 host props `loop`·`defaultIndex`·`scrollEnabled === true`, 1장: 캐러셀 없음; 끌어 닫기 팬(`withTestId("photo-viewer-dismiss-<photoId>")`)을 `fireGestureHandler`로 `translationY 130` → `onClose` 1회 / `translationY 60, velocityY 0` → 0회(**한 테스트의 한 렌더에서만 쏜다** — AGENTS gesture-handler 함정); 소스: 배율 1의 `activeOffsetY([-10, 10])`·`failOffsetX([-10, 10])`, 확대 시 `scrollEnabled={!zoomed}` 꼴, 확대 화면 캐러셀의 `onConfigurePanGesture`가 함수(host prop)이고 소스에 그 설정 `activeOffsetX([-10, 10])`·`failOffsetY([-10, 10])`. 빨간 것을 본다
- [X] T012 [P] [US2] `__tests__/ui/photo-carousel.test.tsx`에 ZC5·ZC6·ZC7을 더한다 — 확대 화면의 `onClose(2)`(열린 `PhotoViewer`의 ✕ 대신 props로 직접 부르거나 `onRequestClose`)를 쏘면 지면 배지 「3 / 3」·셋째 막대; 소스에 `scrollTo({ index` 와 `animated: false`; `configurePan`의 `activeOffsetX([-10, 10])`·`failOffsetY([-10, 10])` 그대로. 빨간 것을 본다

### Implementation for User Story 2

- [X] T013 [US2] `src/ui/PhotoViewer.tsx`에 넘김을 더한다 — 2장 이상이면 `Carousel`(testID `photo-viewer-carousel`, `data`는 받은 배열 참조 그대로, `loop`, `defaultIndex={startIndex}`, `scrollEnabled={!zoomed}`, `width`·`height` = 창 크기, `onProgressChange` → `indexAtProgress()`(051)로 `index`, `renderItem`은 `useCallback`), 배지는 `index`를 따라간다. `zoomed`는 `ZoomablePhoto`의 `onZoomChange(boolean)`로 받고 사진이 바뀌면 `false`. 확대 화면 캐러셀의 팬은 `failOffsetY([-10, 10])`·`activeOffsetX([-10, 10])`(세로 끌기와 겨루지 않게)
- [X] T014 [US2] `src/ui/ZoomablePhoto.tsx`에 아래로 끌어 닫기를 더한다 — `Gesture.Pan().runOnJS(true)`(049 선례), 배율 1일 때 `activeOffsetY([-10, 10])`·`failOffsetX([-10, 10])`, `onUpdate`에서 `dragY = max(0, translationY)`, 배경 투명도는 끈 거리를 부모로 알리고(`onDragChange(down, settle)`) 부모가 `backdropOpacity()`로 자기 공유값을 `.set()`한다(prop 공유값을 고치지 않는다 — React Compiler), `onEnd`에서 `shouldDismiss(translationY, velocityY)`면 `onDismiss()` 아니면 `withTiming(0)`; `withTestId("photo-viewer-dismiss-<photoId>")`. `PhotoViewer`는 `onDismiss` → `onClose(index)`
- [X] T015 [US2] `src/ui/PhotoCarousel.tsx`에 닫힌 뒤 위치 맞춤 — 지면 `Carousel`에 `ref`(`CarouselRef`, `react-native-reanimated-carousel` 최상위 import — CAR11), `PhotoViewer`의 `onClose(last)`에서 `setViewerStart(null)`·`setIndex(last)`·`ref.current?.scrollTo({ index: last, animated: false })`. 1장이면 ref 없음 — T011·T012 초록

**Checkpoint**: US1·US2 테스트 초록

---

## Phase 5: User Story 3 - 핀치로 확대하고 움직여 본다 (Priority: P3)

**Goal**: 핀치·두 번 탭·확대 상태 이동, 확대 중엔 넘김·끌어 닫기 없음

**Independent Test**: quickstart Q8~Q11

### Tests for User Story 3

- [X] T016 [P] [US3] `__tests__/ui/photo-viewer.test.tsx`에 ZP10을 더한다 — 소스(주석 걷은 뒤): `ZoomablePhoto.tsx`에 `Gesture.Pinch`·`numberOfTaps(2)`·`Gesture.Simultaneous`가 있고 `pinchScale(`·`settleScale(`·`doubleTapScale(`·`panLimit(`·`clampOffset(`·`isZoomed(`를 부른다. 빨간 것을 본다

### Implementation for User Story 3

- [X] T017 [US3] `src/ui/ZoomablePhoto.tsx`에 확대를 더한다 — 공유값 `scale`·`offsetX`·`offsetY`(시작값 저장용 `savedScale`·`savedX`·`savedY`), `Gesture.Pinch().runOnJS(true)`: `onUpdate` `scale = pinchScale(saved × e.scale)`, `onEnd` `settleScale` → `withTiming`, 위치는 `clampOffset(·, panLimit(fitted, box, 결과 배율))`로 다시 자름; `Gesture.Tap().numberOfTaps(2)`: `doubleTapScale(scale)`로 `withTiming`, 1이면 위치 0; 팬은 `zoomed`(= `isZoomed(scale)`, JS 상태 — 바뀔 때 `onZoomChange`)이면 `minDistance(1)`로 어느 방향이든 서고 `offset = clampOffset(saved + translation, panLimit(...))`, 아니면 T014의 끌어 닫기; 셋을 `Gesture.Simultaneous(pinch, pan, doubleTap)`로 하나의 `GestureDetector`에. 실패 칸(`failed`)이면 제스처 없음. `Animated.View`에 `transform: [{ translateX }, { translateY: offsetY + dragY }, { scale }]`
- [X] T018 [US3] 다른 장이 배율 1에서 시작함(FR-012)을 확인한다 — 구현 중 `active` prop 대신 구조로 성립시켰다: 확대 중 넘김 꺼짐(`scrollEnabled={!zoomed}`) + `settleScale`이 「확대됨」이 아닌 배율을 정확히 1로 둠(ZV3에 1.005 → 1 추가). data-model §4에 그 근거를 적는다 — T016 초록

**Checkpoint**: 모든 이야기 초록

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] 경계 확인 ZB1·ZB2 — `src/ui/PhotoViewer.tsx`·`ZoomablePhoto.tsx`·`PhotoCarousel.tsx`에 한글 리터럴 없음(헌법 검사 `checkI18nFile`이 잡는지 `npm run lint`로), `package.json` `dependencies` 변경 없음(`git diff package.json` 빈 것)
- [X] T020 `npm test`·`npm run lint` 실행, 전부 통과를 확인한다(ZB3)
- [X] T021 위반 주입 — contracts의 「위반 주입」 중 ZV3(1 미만 그대로)·ZV6(위로 끈 것도 닫기)·ZC1(`Pressable` 제거)·ZC4(실패 칸도 누름)·ZP4(`onRequestClose` 빼기)·ZP8(`failOffsetX` 제거)·ZB1(한글 리터럴)을 하나씩 실제로 넣어 테스트·lint가 빨개지는 것을 보고 되돌린다(치환이 실제로 적용됐는지 먼저 확인 — AGENTS). 결과를 quickstart.md 끝에 적는다
- [X] T022 실기기(dev, SM-G986N) quickstart Q1~Q13 — `screenrecord` 프레임으로 Q5~Q11의 움직임을 보고, 손에 맞지 않는 수치는 `src/app/photo-viewer.ts`에서만 고친다(FR-015, 고친 값은 ZV1과 함께). 결과(통과·미통과·미확인 — 아이폰 미확인 포함)를 `specs/067-photo-zoom-viewer/quickstart.md` 끝에 적는다
- [X] T023 [P] `AGENTS.md` 「기능별 핵심 결론」에 067 절을 더한다 — 지금도 유효한 결론만(051 「사진을 누르지 않는다」를 뒤집음, 확대 화면은 `Modal` + `GestureHandlerRootView`, 실기기에서 드러난 함정, 뒤로 가기 실측 기록의 위치는 설계 문서). 051 절의 「사진을 누르지 않는다」 관련 서술이 있으면 고친다(주석으로 덧대지 않는다)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2 → US3 → Polish. US2·US3은 US1의 `PhotoViewer`·`ZoomablePhoto` 파일 위에 쌓으므로 순서대로 한다(같은 파일).
- Phase 2 안: T002 → T003, T004 → T005. T002·T004는 함께.
- 각 이야기 안: 테스트(빨강) → 구현(초록).

## Parallel Example

```text
Phase 2: T002(판정 테스트) ∥ T004(카탈로그)
US1:     T006(photo-viewer 테스트) ∥ T007(photo-carousel 테스트)
US2:     T011 ∥ T012
Polish:  T019 ∥ T023
```

## Implementation Strategy

- **MVP = US1**: 누르면 크게, ✕·뒤로 가기로 닫기. 여기서 멈춰도 「잘린 사진을 볼 길이 없다」가 풀린다.
- US2(넘김·끌어 닫기·위치 맞춤) → US3(핀치·두 번 탭·이동) 순으로 쌓는다.
- 실기기 확인(T022)은 모든 이야기 뒤 한 번에 — 각 단계의 jest는 배선만 본다.

## Phase 7: Convergence

- [ ] T024 확대 화면이 내비게이션 바 자리까지 어둡게 덮게 한다 — 실기기에서 아래 띠가 옅게 남았다(`src/ui/PhotoViewer.tsx`) per FR-004 (partial)
- [ ] T025 사람 손으로 핀치를 한 번 확인한다 — 벌려 확대·4배에서 멈춤·1 아래로 오므려 놓으면 1로 복귀(quickstart Q8) per US3/AC1·AC2 (partial)
- [X] T026 스트립이 접힌 상태(글꼴 2.0배로 본문을 길게)에서 확대 화면을 열고 닫아 접힘·스크롤 위치가 그대로인지 확인한다(quickstart Q3) per FR-013 (partial)
