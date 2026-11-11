# Contract: 하단 바와 아래 안전 영역 (115)

- **B1** `barMetrics(inset)`: `minHeight = 64 + inset`, `paddingBottom = 10 + inset`, 인셋이 0이면 종전(64·10)과 같다. 음수·NaN 인셋은 0으로 본다.
- **B2** 바 세 가지(`write-button` 안 쓴 날·`stop-button`·다시 쓰기의 `write-button`)와 상태 흉내 회색 모두 `barMetrics`를 적용한 Pressable이다. 위쪽 반경 6 유지.
- **B3** 토스트 바닥 = 잰 바 높이 + 12, 제약 띠 바닥 = 잰 바 높이. 인셋 값은 이 식에 직접 들어가지 않는다(잰 높이에 포함).
- **B4** 지면 아래 여백: 안 쓴 날 `120 + 띠 높이 + 인셋`, 쓴 날 `띠 높이 + 인셋`(+ 본문 기존 여백).
- **S1** 홈 `SafeAreaView`의 `edges`에는 `bottom`이 없고 `top`·`left`·`right`가 있다. 첫 실행 `SafeAreaView`들은 `bottom`을 가진다.
- **S2** `StackLayer`는 아래 인셋만큼 `paddingBottom`을 둔다.
- **S3** `App.tsx`의 `toastBottom`은 인셋을 더한다.
- **S4** `SafeAreaInsetsContext`로만 인셋을 읽는다(`useSafeAreaInsets` 금지 — 제공자 없는 렌더에서 던진다).
