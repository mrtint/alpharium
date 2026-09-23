# Research: 작명 화면 1a 일치

## R1. 확정 버튼 색 — `Button` `primary`(accent + 검정 글자)를 쓴다

- **Decision**: [이 이름으로 할래요 →]는 기존 `Button` `primary`를 쓴다 — 배경 `COLORS.accent`
  (`#ec3013`, `1a`와 같은 값), 글자 `COLORS.accentForeground`(검정).
- **Rationale**: `1a` 원본은 accent 배경 위에 bg색(오프화이트) 글자를 쓰지만 그 대비는 약
  3.8:1로 WCAG AA 본문 4.5:1에 못 미친다. 043 research R2가 이 이유로 primary 글자를 검정으로
  확정했고, 046 완료 화면 [시작할게요]도 같은 모양이다 — 앱 안 주 버튼이 한 모양으로 남는다.
  배경색은 `1a`와 같다.
- **Alternatives**: 흰 글자 그대로(대비 미달, DT4 관례 위반) / `danger` 배경(1a보다 어두운 빨강,
  불일치 커짐) — 기각.

## R2. 빈 입력일 때 — 흐려지지 않고, 눌러도 아무 일 없음 (Clarification Q1)

- **Decision**: `Button`에 `disabled`를 넘기지 않는다(넘기면 `opacity: 0.5`로 흐려진다 — 실기기의
  "옅은 분홍"이 이것). 대신 `onPress`가 `canSubmit`일 때만 `onSubmitName`을 부른다. 스크린리더용
  `accessibilityState={{ disabled: !canSubmit }}`은 `...rest`로 넘겨 유지한다(`Button`이 `rest`를
  마지막에 펼치므로 덮어쓴다).
- **Rationale**: 모양은 `1a` 그대로, 035 FR-012("빈 이름 확정 불가")와 기존 계약 테스트
  (`accessibilityState.disabled`)는 그대로 성립한다.
- **Alternatives**: `Button`에 새 prop 추가(공용 컴포넌트 변경 — 범위 확대) — 기각.

## R3. 화살표 — 라벨 문자열 안의 "→"

- **Decision**: 라벨을 `"이 이름으로 할래요 →"`가 아니라 라벨 상수 `submit`("이 이름으로 할래요")과
  화살표 상수를 조합해 `Button` children 텍스트로 넘긴다(`{TEXT.submit}  →`).
- **Rationale**: `Button`은 children을 `AppText`로 감싼다 — SVG 아이콘을 넣으려면 공용 컴포넌트를
  고쳐야 한다. 문자 화살표로 `1a`의 시각 요소를 재현하고, 문구 상수(SC-002의 "이 이름으로 할래요")는
  원문 그대로 둔다. `react-native-svg` 신규 도입 없음.
- **Alternatives**: SVG 아이콘(새 의존성 또는 `Button` 변경) — 기각.

## R4. 세로 배치 — welcome 전용 컨테이너

- **Decision**: 바깥 `CONTAINER`(checking/failed 공용, 중앙 정렬 + padding 24)는 그대로 두고,
  `welcome`일 때만 `WELCOME_CONTAINER`(padding 좌우 20·위 20·아래 24, `justifyContent` 없음)를 쓴다.
  내부 `ScrollView`의 `contentContainerStyle`을 `flexGrow: 1` 세로 스택으로 두고
  [표지] → [가운데 묶음 `flex: 1, justifyContent: "center"`] → [버튼 줄]로 나눈다.
- **Rationale**: FR-016(checking/failed 불변). `1a`의 위 70·아래 44는 iOS 상태바·홈 인디케이터를
  포함한 값이고, 이 앱은 `App.tsx`의 `SafeAreaView`가 이미 인셋을 뺀다 — 그만큼 줄인 값을 쓴다
  (spec Assumptions). `flexGrow: 1`이라 키보드가 열려 공간이 줄면 스크롤이 생긴다(FR-015, 044 T016).
- **Alternatives**: `KeyboardAvoidingView` 추가 — 044가 ScrollView로 이미 해결, 기각.

## R5. 하단 캐릭터 이름 — welcome에서만 숨긴다

- **Decision**: 하단 `welcome-character-name`을 `phase === "failed"`일 때만 그린다(지금은
  `phase !== "checking"`). `characterName` prop은 유지(failed가 쓴다, props 계약 무변경).
- **Rationale**: FR-011·FR-016. 기존 테스트 L16·025(이름 보간·accessibilityLabel)는 `failed`
  phase로 옮겨 같은 계약을 계속 잠근다.

## R6. 카운터 — `draft.length`

- **Decision**: `${draft.length}/${NAME_INPUT_MAX_LENGTH}`. 분모와 힌트의 "12"는 같은 상수에서 나온다.
- **Rationale**: `TextInput`의 `maxLength`와 `naming.ts`의 `trimmed.length`가 모두 UTF-16 길이다 —
  같은 셈을 써야 "12/12"에서 입력이 멈추는 것과 카운터가 일치한다(SC-003). 한글 음절은 1 단위라
  spec의 "한 음절 = 1자"와 같다.

## R7. 치수·타이포 — 인라인 style, 토큰 색만

- **Decision**: 표지 11px/600/자간 1.1/`accent`/대문자, 타일 56×56 `accent` 배경 + 🤖 28px,
  제목 38px/800/lineHeight 39/자간 -1, 본문 16px/lineHeight 24/`textMuted`, 구분선 2px `border`,
  프롬프트 14px/600, 입력 28px/800 + 밑줄 2px `text`, 카운터·힌트 12px `textMuted`.
- **Rationale**: `TYPE`에 38px 같은 크기가 없고 새 토큰을 늘리지 않는다(044·FR-018은 **색**만
  토큰 강제). 마크업의 `neutral-700`/`neutral-600`은 토큰에 없어 가장 가까운 `textMuted`로 맞춘다
  (대비 5.00:1 확보).

## R8. 한국어 제목 줄바꿈 — 강제하지 않는다

- **Decision**: 제목에 별도 줄바꿈 처리를 넣지 않는다. 좁은 화면에서 줄이 늘어나면 가운데 묶음이
  커지고 `ScrollView`가 받아 준다(버튼 줄과 겹치지 않음).
- **Rationale**: 마크업의 `word-break: keep-all`에 해당하는 옵션이 RN 안드로이드 `Text`에 없다
  (`lineBreakStrategyIOS`는 iOS 전용). spec Edge Case는 "바람직하다"(SHOULD)로 적었으므로
  실기기 육안(T017)으로 확인만 한다. 이 기기 폭에서는 "깨어났어요. / 처음 뵙겠습니다."처럼
  어절 경계에서 끊길 것으로 예상하지만 확인 전에는 결론 내리지 않는다.

## R2 보충 — 구현 중 실측: `Pressable`이 `disabled={false}`로 접근성 상태를 덮어쓴다

- `Button`이 `disabled={false}`를 `Pressable`에 넘기면 RN `Pressable`
  (`Libraries/Components/Pressable/Pressable.js:235`)이
  `disabled != null ? {...accessibilityState, disabled}`로 **호출부가 준
  `accessibilityState.disabled: true`를 `false`로 덮어썼다** — 기존 FR-012 계약 테스트 두 개가
  이것으로 실패했다.
- **Decision**: `Button`이 `disabled={disabled || undefined}`를 넘기게 한 줄 고쳤다. 잠겼을 때의
  동작은 그대로이고, 잠기지 않은 버튼은 호출부가 준 접근성 상태를 유지한다. 공용 컴포넌트 변경이지만
  동작 변화는 이 한 경우뿐이며 `button.test.tsx`·`press-feedback.test.tsx`가 그대로 통과한다.

## R9. 구현 중 실측 — 세로 중앙 배치 후 키보드가 입력줄을 가렸다 (T017)

- **관측**(SM-S901N, Android 16, 3버튼 내비게이션, 삼성 키보드): 매니페스트
  `windowSoftInputMode="adjustResize"`가 있는데도 키보드가 열릴 때 레이아웃이 줄지 않았다.
  1a대로 가운데 묶음을 세로 중앙에 두자 입력줄(y≈1537)이 키보드(위 경계 y≈1314) 뒤로 숨어
  **치는 글자가 안 보였다.** 044는 입력줄이 화면 위쪽이라 드러나지 않았다.
- **1차 수정**: `KeyboardAvoidingView behavior="padding"` — 입력줄은 보이게 됐지만 끝까지
  스크롤해도 버튼 줄이 키보드 경계에 반쯤 걸렸다. `behavior="height"`도 같았다.
- **최종**: `keyboardVerticalOffset={48}`. 모자란 높이가 하단 내비게이션 바(48dp)와 맞았고,
  이 값으로 키보드를 연 채 두 버튼이 온전히 보였다. 제스처 내비게이션 기기에서는 여백이 조금
  더 생길 뿐이다(가려지지 않는 방향의 오차). 계약 A12가 이 배선을 잠근다.
- **미확인**: 제스처 내비게이션 기기, 다른 키보드 앱에서의 여백.
