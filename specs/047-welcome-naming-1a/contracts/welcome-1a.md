# Contract: 작명 화면 1a (`WelcomeScreen` welcome 단계)

035 W11~W16·L15·L16, 044 계약은 전부 유지한다. 아래는 047이 더하는 계약이다.
검증 자리는 `__tests__/ui/welcome-screen.test.tsx`.

| ID | 계약 | 검증 |
| --- | --- | --- |
| A1 | welcome 단계에 표지 `ALPHARIUM`(testID `welcome-kicker`)이 렌더된다 | 렌더 |
| A2 | welcome 단계에 얼굴 타일 하나(testID `welcome-face`)가 있고 내용은 `🤖`이다 | 렌더 |
| A3 | 제목·본문·프롬프트·힌트·두 버튼 라벨이 data-model 표의 값과 글자 단위로 같다 | 렌더 |
| A4 | 카운터(testID `welcome-name-counter`)가 입력 길이를 `n/12`로 보인다 — 0, 2, 12자에서 확인 | 렌더 + `changeText` |
| A5 | 카운터 분모·힌트 숫자·`maxLength`가 모두 `NAME_MAX_LENGTH`와 같다 | 렌더 + import |
| A6 | 빈 입력·공백뿐일 때 확정 버튼을 눌러도 `onSubmitName`이 불리지 않는다. 버튼은 흐려지지 않는다(`disabled` prop을 `Button`에 넘기지 않음), `accessibilityState.disabled`는 참 | `press` + 소스 검사 |
| A7 | welcome 단계에 `welcome-character-name`이 없다. failed 단계에는 있다 | 렌더 |
| A8 | 확정 버튼 라벨에 화살표 `→`가 붙는다 | 렌더 |
| A9 | welcome 단계는 `ScrollView` 안에 있고 가운데 묶음이 세로 중앙(`justifyContent: "center"`)이다 | 소스 검사 |
| A10 | checking·failed 단계의 스타일 상수(`CONTAINER`·`CENTERED`)는 047에서 바뀌지 않는다 | 기존 044 테스트 통과 |
| A11 | 새 하드코딩 색이 없다 — `#rrggbb` 리터럴이 소스에 없다 | 소스 검사 |
| A12 | welcome 단계는 `KeyboardAvoidingView`(`keyboardVerticalOffset={KEYBOARD_OFFSET}`, 0보다 큼) 안에 있다 — 실기기 T017에서 추가 | 소스 검사 |
