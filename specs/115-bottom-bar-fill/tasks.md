# Tasks: 하단 바의 색을 화면 맨 아래까지 채운다

**Input**: `specs/115-bottom-bar-fill/` (spec.md, plan.md, research.md, contracts/bottom-bar.md, quickstart.md)

**Tests**: 이 저장소는 테스트를 먼저 쓴다(헌법 「개발 방식」). 테스트 → 구현 순서다. 실행: `npx jest <경로> --selectProjects logic|ui`.

## Phase 1: Setup

- [x] T001 `git branch --show-current`가 `115-bottom-bar-fill`인지 확인하고 `npm test` 기준선(통과 수)을 기록한다

## Phase 2: Foundational (모든 스토리가 기대는 부품)

- [x] T002 [P] `__tests__/app/bar-metrics.test.ts`(logic)에 `barMetrics`의 계약 B1 테스트를 먼저 쓴다: 인셋 0이면 `{minHeight: 64, paddingBottom: 10}`, 인셋 34면 `{98, 44}`, 음수·NaN은 0으로 본다. 아직 없어 실패해야 한다
- [x] T003 `src/ui/safe-bottom.ts`(`useBottomInset()` — `SafeAreaInsetsContext`로 읽고 없으면 0, 계약 S4)와 `src/ui/bar-metrics.ts`(순수 `barMetrics(inset)` — logic 테스트가 RN 없이 본다)를 만든다(`WRITTEN_DAY.bar.minHeight` + 인셋, 아래 여백 10 + 인셋). T002가 통과한다

## Phase 3: User Story 1 — 바 색이 맨 아래까지 간다 (P1)

**Independent Test**: 인셋 34를 준 렌더에서 세 바의 `minHeight`·`paddingBottom`에 인셋이 들어가고, 인셋 0이면 종전과 같다.

- [x] T004 [US1] `__tests__/ui/bottom-bar-fill.test.tsx`(ui)에 계약 B2 테스트를 먼저 쓴다: `SafeAreaInsetsContext.Provider`(bottom 34)로 `DiaryListScreen`을 안 쓴 날·쓰는 중·쓴 날(끝에 닿아 바가 올라온 상태)로 렌더해 `write-button`·`stop-button`의 스타일에 `minHeight 98`·`paddingBottom 44`·위 반경 6이 있고, 상태 흉내(`simulation`)에서도 같다(쓰기·다시 쓰기는 회색 `SIMULATION.barFill`, 「그만두기」는 흉내에서도 검정). 인셋 0이면 64·10. 같은 테스트에서 컨텍스트 값을 34에서 0으로 바꿔 다시 렌더하면 바 치수가 따라온다(엣지 케이스 4). 실패해야 한다
- [x] T005 [US1] `src/ui/DiaryListScreen.tsx`: `WriteBar`·`StopBar`·`RewriteBar`의 Pressable이 `BAR` 뒤에 `barMetrics(useBottomInset())`를 덧입도록 한다. `BAR`의 `paddingVertical: 10`은 `paddingTop: 10`으로 바꾼다(아래는 `barMetrics`). `BAR` 주석(「아래 안전 영역은 루트 `SafeAreaView`가 비킨다」)을 새 사실로 고친다. T004가 통과한다
- [x] T006 [US1] `App.tsx`: 홈 마지막 `return`의 `SafeAreaView` `edges`를 `["top","left","right"]`로 고치고 `edges` 주석을 새 사실(바닥 인셋은 바·겹·토스트가 각자 비킨다)로 고친다. 첫 실행 `SafeAreaView`들은 건드리지 않는다

## Phase 4: User Story 2 — 바에 기대는 것이 따라온다 (P1)

**Independent Test**: 인셋을 준 렌더에서 토스트·제약 띠 바닥은 잰 바 높이 기준이고, 지면 아래 여백과 홈 토스트 바닥이 인셋만큼 늘어난다.

- [x] T007 [US2] `__tests__/ui/bottom-bar-fill.test.tsx`에 B3·B4 테스트를 먼저 쓴다: 바 래퍼에 `onLayout` 높이 98을 보내면 토스트 `bottom`이 98 + 12, 제약 띠 래퍼 `bottom`이 98(인셋 값이 식에 직접 들어가지 않음). 안 쓴 날 `material-paper`의 `paddingBottom`이 120 + 인셋(띠 없을 때), 쓴 날 지면 `contentContainerStyle.paddingBottom`이 띠 높이 + 인셋. 실패해야 한다
- [x] T008 [US2] `src/ui/DiaryListScreen.tsx`: 안 쓴 날 `materialPaperView`의 `paddingBottom`에 인셋을 더하고, 쓴 날 `WrittenDayPaper`의 `bottomInset`을 `bandInset + 인셋`으로 한다. 쓴 날 분기의 「내려간 바가 …비치지 않게 자른다」 주석을 새 사실(내려간 바는 화면 밖으로 나가고 ROOT가 자른다)로 고치고, `ROOT`가 `overflow: hidden`인 이유를 남긴다. T007이 통과한다
- [x] T009 [US2] `App.tsx`: `AppFrame`에서 `useBottomInset()`을 읽어 `toastBottom = (route !== "home" ? 24 : HOME_TOAST_BOTTOM) + inset`으로 하고 `HOME_TOAST_BOTTOM`·`toastBottom` 주석에 「바닥에서 잰 값 + 인셋」을 적는다(계약 S3)

## Phase 5: User Story 3 — 겹과 첫 실행은 인셋을 비킨다 (P1)

**Independent Test**: 겹의 안쪽 여백에 인셋이 들어가고, 소스 계약이 홈 `edges`·첫 실행 `edges`를 잠근다.

- [x] T010 [US3] `__tests__/ui/safe-area.test.tsx`에 계약 S1 소스 계약을 먼저 쓴다(주석을 걷어낸 `App.tsx`에서): 홈 마지막 `SafeAreaView`는 `bottom`이 없고 `top`·`left`·`right`가 있으며, 나머지 `SafeAreaView` `edges`는 모두 `bottom`을 가진다. `StackLayer.tsx` 소스가 `useBottomInset`을 부르고 `paddingBottom`을 둔다(S2). `__tests__/ui/bottom-bar-fill.test.tsx`에 렌더 테스트: `SafeAreaInsetsContext`(bottom 34) 안에서 `StackLayer open`의 겹 스타일에 `paddingBottom: 34`, 인셋 0이면 0. 실패해야 한다
- [x] T011 [US3] `src/ui/StackLayer.tsx`: `useBottomInset()`을 읽어 겹 `Animated.View` 스타일에 `paddingBottom`을 더한다. 중첩 겹은 절대 배치라 부모 패딩을 받지 않고 자기 인셋을 비킨다는 사실을 주석에 남긴다. T010이 통과한다

## Phase 6: Polish & 문서

- [x] T012 [P] `design/DESIGN.md`: 「공용 부품」 또는 「안내·알림 방식」 가까이에 한 줄 — 홈 하단 바 면은 아래 안전 영역까지 닿고(글자는 위 64 안), 겹은 안쪽 여백으로 비킨다. 보드 밖 초안임을 적는다. `__tests__/design/design-doc.test.ts`가 통과하는지 본다
- [x] T013 [P] `AGENTS.md`의 홈 항목에 한 줄 — 하단 바 면이 아래 안전 영역까지 닿는다(115, 보드 밖 초안, iOS 시뮬레이터에서 봤고 안드로이드·iPhone 실기기는 사람 확인 대기). 결과를 받기 전에는 「확인했다」고 쓰지 않는다
- [x] T014 전체 `npm test`와 `npm run lint`를 돌려 통과를 확인한다(기준선 T001 대비)

## Phase 7: 화면 확인 (구현 구간 끝)

- [x] T015 iPhone 17e 시뮬레이터 Release 빌드 + 표본 일기로 quickstart 「iOS 시뮬레이터」 스크린샷을 찍고 종전(main) 상태와 나란히 비교한다(바 세 가지·토스트·제약 띠·겹·첫 실행). 결과표를 `specs/115-bottom-bar-fill/quickstart.md`에 적는다
- [ ] T016 iPhone 14에 개발 서명 Release 빌드를 설치하고 사람이 볼 항목을 정리한다(결과는 받은 뒤에만 적는다) — 설치 완료(2026-11-11), 사람의 확인 결과 대기

## Dependencies

- T002 → T003 → (T004 → T005, T006) → (T007 → T008, T009) → (T010 → T011) → T012·T013 → T014 → T015 → T016
- T005·T008은 같은 파일(`DiaryListScreen.tsx`)이라 순서대로. T006·T009는 같은 파일(`App.tsx`)이라 순서대로.

## Parallel

- T002와 T001, T012와 T013은 서로 다른 파일이라 같이 할 수 있다.

## Implementation Strategy

MVP는 Phase 3(바) + T006이다. 단 겹이 인셋을 비키지 않으면 설정이 막대 밑으로 들어가므로 T006과 T011은 같은 변경으로 나가야 한다(중간 커밋 없음).

## Phase 8: Convergence

- [x] T017 `src/ui/DiaryListScreen.tsx`의 `RewriteBar`가 내려가는 거리 공유값(`height`)의 초기값을 `WRITTEN_DAY.bar.minHeight + 인셋`으로 한다 — 재기 전 첫 프레임에 내려간 바의 아래 인셋 부분이 비치지 않게. `__tests__/ui/bottom-bar-fill.test.tsx`에 먼저 쓴 테스트: 인셋 34에서 `useSharedValue` 초기값 호출이 98(레이아웃 이벤트 전)이다 per US2/AC2 (partial)
- [x] T018 `src/ui/WritingPaper.tsx` 쓰는 중 지면 아래 여백에 인셋을 더한다(독립 코드 리뷰 Important — 바가 인셋만큼 커져 혼잣말이 바에 붙던 것). 테스트 먼저: `bottom-bar-fill.test.tsx`의 쓰는 중 120+인셋. 같은 변경에서 낡은 주석(`SettingsFrame`·`tokens.ts`)과 헐거운 테스트(S3 정규식, 첫 프레임 토스트 바닥, 중첩 겹 인셋 한 번)를 고쳤다 per FR-004 (partial)
