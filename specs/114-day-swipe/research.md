# Research

## R1. 본문의 어느 자리에 거는가
- **Decision**: `written-body` View를 `DaySwipe`로 감싸고 `flexGrow: 1`. 캐러셀 프레임은 감싸지 않는다.
- **Rationale**: 캐러셀(051)은 자기 가로 밀기를 가진다(`.failOffsetY([-10, 10])`, `indexAtProgress`). 겹치는 자리를 만들지 않는 것이 경합 처리보다 단순하다. 본문은 `contentContainerStyle={{ flexGrow: 1 }}` 스크롤 안에 있어, `flexGrow`를 주면 글이 짧아도 지면 아래까지 밀기 자리가 된다.
- **Alternatives**: 지면 전체(`ScrollView`)에 팬 — 캐러셀과 같은 제스처가 동시에 경합한다. 기각.

## R2. 세로 스크롤과의 경합
- **Decision**: `failOffsetY([-12, 12])`로 세로가 먼저면 포기, `activeOffsetX([-16, 16])`로 가로가 확실할 때만 활성.
- **Rationale**: 스트립(`DayPicker`)이 같은 패턴을 쓰고 실기기에서 잘 맞았다(049). 본문은 글을 읽다 가로로 스치는 일이 더 많아 활성 거리를 스트립의 10보다 크게(16) 잡는다. 사람이 정한 값이다(원칙 V).

## R3. 넘김 판정 수치
- **Decision**: 거리 60pt 또는 속도 600pt/s. 스트립은 40·500.
- **Rationale**: 글을 읽는 중 스치는 오작동을 줄이려 스트립보다 크게 잡는다. 사람이 정한 값이고 손에 맞지 않으면 iPhone에서 보고 고친다.

## R4. 전환 모양
- **Decision**: 새 움직임을 만들지 않는다.
- **Rationale**: `WrittenDayPaper`는 `key={write.day}`로 날마다 새로 그려지고, 큰 날짜·요일은 이미 150ms 크로스페이드(`DayHeading`, 049)다. 스트립 칸을 눌렀을 때와 똑같이 보인다. 동작 줄이기(100)는 기존 규칙 그대로다.

## R5. 오늘 다음 날
- **Decision**: `swipeDay`가 `null`을 돌려주고 홈이 무시한다. 제스처는 끌림을 보이지 않으므로 튕김도 없다.
- **Rationale**: 스트립의 `canSwipeNext`+러버밴드는 스트립 자체가 움직이는 요소여서 있는 것이다. 본문은 움직이지 않는다.

## R6. 접근성 자리
- **Decision**: 큰 날짜 `Pressable`(`home-date-button`)의 사용자 지정 동작.
- **Rationale**: 접근성에서 보이는 날짜 요소가 그것뿐이다. 지면의 문단마다 붙이면 문단을 따로 읽는 탐색이 바뀐다.
- **Alternatives**: `accessibilityRole="adjustable"` 새 요소 — 포커스 대상이 늘고 레이아웃을 건드린다.

## R7. 날짜 계산
- **Decision**: `day-boundary.ts`에 `shiftDay(day, days)`를 새로 내보낸다(`shiftWeek`는 `addDays(day, weeks * 7)`).
- **Rationale**: 하루 경계·서머타임 처리를 그 파일이 맡는다(`DB11`). `state.ts`에서 날짜를 직접 계산하지 않는다.
