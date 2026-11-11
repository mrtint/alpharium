# Research: 하단 바 색 채우기 (115)

## R1. 어디서 인셋을 비우는가
- 사실(소스 읽기, `App.tsx`): 첫 실행 화면들은 각자 `SafeAreaView` 넷을 가지고, 홈의 마지막 `return`만 안쪽 `View`(`stack`)에 DiarySection과 모든 겹을 담는다. 겹은 절대 배치라 부모 패딩을 받지 않는다.
- Decision: 홈 `SafeAreaView`의 `edges`에서 `bottom`만 걷고, 인셋을 쓰는 자리가 각자 `useBottomInset()`을 읽는다.
- Alternatives: (a) 바 아래에 `bg` 대신 바 색 `View`를 인셋 높이로 따로 그린다 → 바마다 색·상태(`simulated`·잠김 흐림)를 두 번 관리하고 다시 쓰기 바의 내려가기에 따로 붙여야 한다. (b) 루트를 그대로 두고 음수 여백 → 겹이 어긋난다.

## R2. 인셋을 어떻게 읽는가
- Decision: `SafeAreaInsetsContext`를 `useContext`로 읽고 없으면 0. `PhotoViewer`가 이미 쓰는 방식이다.
- Alternative: `useSafeAreaInsets()` — 제공자 없는 렌더에서 던진다(기존 UI 테스트 다수가 제공자 없이 렌더).

## R3. 바 치수
- 사실: 바는 `minHeight: 64`, `paddingVertical: 10`, `justifyContent: center`.
- Decision: `minHeight: 64 + inset`, `paddingTop: 10`, `paddingBottom: 10 + inset`. 내용 상자 최소 높이가 종전(44)과 같아 글이 같은 자리에 선다. 큰 글꼴로 바가 더 커져도 인셋은 면만 늘린다.

## R4. 바에 기대는 것
- `barHeight`(토스트·제약 띠 바닥)는 바 래퍼의 `onLayout` 높이라 인셋이 들어가 자동으로 따라온다.
- `RewriteBar`의 `height` 공유값도 같은 `onLayout`에서 와 내려가는 거리가 바 전체(인셋 포함)가 된다.
- 고정값: 지면 아래 120(안 쓴 날) 은 바 64 + 56 여유였다 → 인셋만큼 더한다. `body.paddingBottom`(쓴 날 본문)은 다시 쓰기 바가 내려가 있어 가리지 않지만 올라온 바가 마지막 문단을 가리는지는 기존 설계(108 `bottomInset`)가 맡는다 — 쓴 날은 `bottomInset`에 인셋을 더한다. 토스트 88(홈)·24(설정 쪽)는 바닥에서 재던 값이라 인셋을 더한다.

## R5. 지면과 맨 아래 띠의 색 (선호 결정)
- 루트 인셋을 걷으면 홈이 맨 아래까지 가므로 바가 내려간 쓴 날의 맨 아래는 지면 색이 된다. 따로 `bg` 띠를 그리지 않는다. 소유자 확인 대상(결정 표 1번).

## R6. 못 보는 것
- 안드로이드 3버튼 아이콘 색·scrim·제스처 겹침, iPhone 홈 표시줄과 바 끝 터치 겹침은 시뮬레이터로 모양만 볼 수 있고 손맛은 iPhone 14 사람 확인이다.
