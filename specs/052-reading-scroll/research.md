# Research: 읽기 스크롤 (052)

## R1 — 접는 움직임: 잰 높이를 `height`로 옮긴다

- **Decision**: 스트립과 안내 캡션을 감싼 `Animated.View`(`overflow: hidden`)의 **`height`**를 옮긴다.
  - 안쪽 `View`의 `onLayout`으로 자연 높이를 잰다. **잰 뒤에는 안쪽을 절대 배치로 뺀다.**
  - 옮기는 값은 `펼침 진행도(0~1) × 잰 높이`이고, 240ms `Easing.out(Easing.ease)`다.
  - 재기 전(`natural === 0`)에는 높이를 주지 않는다. 그래서 첫 프레임부터 스트립이 제 높이로 보인다.
  - 불투명도는 별도 공유값으로 180ms 옮긴다.
  - **★ 처음 구현은 `maxHeight`만 옮기고 안쪽을 흐름에 뒀다 — 실기기에서 되먹임이 났다.** 안쪽이 바깥 제약에 눌려
    잰 높이가 108 → 64 → 41 → 21로 줄었고, 그 값으로 다시 높이를 정해 헤더 높이가 흔들렸다. 그때마다 지면
    스크롤이 튀어 펼침·접힘이 되풀이됐다(빠른 위 스크롤의 절반이 맨 위에 못 닿고 접힌 채 멈췄다). 절대 배치는
    바깥 제약을 받지 않으므로 잰 높이가 늘 자연 높이다. jest는 못 잡는다(C9).
- **Rationale**:
  - reanimated 문서의 accordion 예제(ctx7 `/websites/swmansion_react-native-reanimated`, 「Implement AccordionItem Component」)는 안쪽을 `onLayout`으로 재고 바깥의 `height`를 `withTiming`으로 옮긴다. 이 문서가 이 방식의 출처다.
  - 다만 그 예제는 높이를 0에서 시작하므로 **재기 전 첫 프레임에 스트립이 사라진다.** 안 쓴 날에서 쓴 날로 바뀌면 `Header`가 다른 트리에서 다시 마운트되므로, 그 순간 스트립이 한 번 깜빡인다.
  - 재기 전에 높이를 주지 않으면 첫 프레임부터 자연 높이다. (보드는 CSS `max-height`를 옮기지만 CSS는 안쪽이 눌리지 않는다.)
  - 보드의 180은 CSS 상한이다. 그대로 쓰면 실제 높이(약 100)에 닿을 때까지 움직임이 안 보인다. 그래서 잰 높이를 쓴다(설계 결정 1).
- **Alternatives**:
  - `height`를 0부터 옮기기: 위의 첫 프레임 깜빡임이 생긴다.
  - translateY로 겹치기: 지면의 보이는 높이와 끝 판정이 어긋난다.
  - `LayoutAnimation`: 240/180을 따로 줄 수 없다.
  - reanimated 레이아웃 애니메이션(`entering`·`exiting`): 접힌 뒤에도 트리에 남아야 펼칠 때 위치가 유지된다. 마운트·언마운트는 맞지 않는다.

## R2 — 애니메이션 시작값

- **Decision**:
  - 공유값의 시작값은 마운트 때의 상태에서 준다(`useSharedValue(collapsed ? 0 : 1)`).
  - 상태가 바뀌면 `useEffect`에서 **현재 값에서** `withTiming(목표)`로 간다. 시작값을 되돌리지 않는다.
- **Rationale**:
  - 049 교훈: effect에서 시작값을 **되돌리면** 첫 프레임이 샌다.
  - 여기서는 되돌리지 않고 이어서 옮기므로 새는 프레임이 없다.
  - 날이 바뀌어 펼칠 때(FR-015)도 현재 값에서 1로 옮긴다.

## R3 — 판정 함수의 입력

- **Decision**: 판정 함수는 `foldAfterScroll(collapsed, sample)`이고 `sample = { y, previousY, viewport, content, stripHeight }`다.
  - 접힘: `!collapsed && y > 8 && y >= previousY && content − viewport − stripHeight > 8`
  - 펼침: `collapsed && y < previousY && y <= 2`
  - 그 밖에는 `collapsed` 그대로다.
- **Rationale**:
  - 방향 판정은 보드 `5b`의 `up = y < lastY`, `!up`과 같다. `y === previousY`는 「위가 아님」이므로 접힘 쪽이다.
  - 마지막 조건(FR-005)은 접은 뒤에도 8px 넘게 더 내릴 수 있어야 접는다는 뜻이다.
  - `stripHeight`가 아직 0(재기 전)이면 조건이 `content − viewport > 8`이 된다. `y > 8`이 가능하다는 것과 같으므로 자연히 성립한다.
  - 디바운스를 두지 않는다(FR-006). 설계 결정 3.
- **Alternatives**: 방향을 속도(`velocity.y`)로 판정하는 방법이 있다. 안드로이드 `onScroll`의 속도 값은 기기마다 들쭉날쭉하다고 알려져 있으나(짐작 — 확인하지 않음), 위치 차이만으로 충분하다.

## R4 — 끝 판정을 다시 하는 때

- **Decision**: `WrittenDayPaper`는 세 경우에만 끝을 다시 판정한다.
  - 스크롤 사건(`onScroll`)
  - 내용 크기 변화(`onContentSizeChange`)
  - **처음** 잰 레이아웃(`onLayout`, 아직 한 번도 알리지 않았을 때)

  이후의 레이아웃 변화는 보이는 높이만 기록하고 판정하지 않는다.
- **Rationale**:
  - 보드 `5b`는 `atEnd`를 스크롤 사건에서만 다시 잰다.
  - 접힘·펼침은 지면의 보이는 높이를 바꾼다. 여기서 재판정하면 끝에서 펼칠 때 바가 내려간다. 이는 `5a` ④ 「하단 바 상태는 그대로」에 어긋난다.
  - 051의 짧은 본문(`2k`)은 첫 레이아웃과 내용 크기로 판정되므로 그대로 산다.
- **실기기에서 두 가지를 더 막았다**(둘 다 지면 높이가 바뀔 때 안드로이드가 되풀이하는 사건이다):
  - **위치가 그대로인 `onScroll`**은 무시한다(접힘·끝 판정 모두). 그대로 두면 방금 펼친 스트립이 되접혔다
    (`y >= previousY`가 「아래」로 읽힌다).
  - **1px 미만으로 흔들려 오는 `onContentSizeChange`**(773.9999 ↔ 774.0001)는 같은 높이로 본다. 그대로 두면
    끝 판정이 줄어든 높이로 다시 돌아 「다시 쓰기」 바가 내려갔다.
- **Risk**: 접으면서 지면이 늘어 끝에 닿아도 바는 다음 스크롤 사건까지 안 올라온다. 보드와 같은 동작이다.

## R5 — 누름 두 갈래 (050 CAL1과의 관계)

- **Decision**:
  - **접힌 상태**:
    - 날짜 줄 전체(`DATE_ROW` + ▾)를 감싼 `Pressable`(`home-date-row`)이 펼치기만 한다.
    - 안쪽의 큰 숫자·요일은 누름 처리를 받지 않는다. `DateJump`에 `onPress`를 넘기지 않아 `View`로 그려진다.
    - 접근성 라벨은 `READING_SCROLL.expandLabel`이고 역할은 버튼이다.
  - **펼친 상태**:
    - 바깥 감쌈은 누름이 없는 `View`다.
    - 050 그대로 `home-date-button`·`home-date-weekday`가 `onPressDate`(달력)를 부른다.
  - **안 쓴 날**: 늘 펼친 상태와 같다(FR-016).
- **Rationale**:
  - 두 누름이 겹치면 RN 책임자(responder) 시스템에서 안쪽이 이긴다. 그러면 접힌 상태에서 숫자를 누를 때 달력이 열린다.
  - 그래서 접힌 동안에는 안쪽 누름을 아예 없앤다.
  - 050 CAL1 계약(「큰 숫자·요일 누름 → `calendar-dialog`」)은 펼친 상태로 한정된다. 이 조각 계약 RS-TAP이 그것을 적는다.

## R6 — 접힌 스트립의 누름·제스처·접근성

- **Decision**: 접힘 감쌈에 `pointerEvents={collapsed ? "none" : "auto"}`, `importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}`, `accessibilityElementsHidden={collapsed}`를 준다.
- **Rationale**:
  - `pointerEvents="none"`이면 자식의 `GestureDetector`(049 팬)도 터치를 받지 못한다. 051에서 숨긴 바에 같은 방법을 썼다.
  - 접근성 트리에서 빠지므로 Maestro가 `day-strip`을 찾지 못한다. 흐름은 이것으로 「접혔다」를 확인한다.
  - 051에서 숨긴 바가 Maestro에 안 보인 실측이 근거다.

## R7 — 날이 바뀌면 펼친다

- **Decision**: 접힘 상태를 `{ day, collapsed }`로 들고, 고른 날과 `day`가 다르면 펼친 것으로 읽는다. 051 끝 판정 상태(`end`)와 같은 방식이다.
- **Rationale**:
  - 날이 바뀌었는지 effect로 되돌리지 않고 렌더에서 가른다. 그러면 새 날의 첫 렌더부터 펼친 상태가 목표가 된다.
  - 같은 날에서 지면만 다시 읽히는 경우(앱 복귀, 051 HOME13)는 `day`가 같으므로 접힘이 그대로다(FR-015).
