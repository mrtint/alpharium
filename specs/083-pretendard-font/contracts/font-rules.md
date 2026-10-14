# Contract: 서체 규칙 (F1~F5)

테스트: `__tests__/config/font-rules.test.ts`(jest `logic` — 소스·파일을 읽는다). 소스를 읽을 때는 주석을 먼저 걷는다(AGENTS 「테스트 작성의 함정」). 대상 소스 = `App.tsx` + `src/**/*.{ts,tsx}`.

각 계약은 위반 주입으로 실패를 확인한다(spec FR-018) — 치환이 실제로 적용됐는지 먼저 단언한다.

## F1. 서체 이름은 토큰 한 곳에서만 정한다 (FR-007·FR-009)

- `fontFamily`(키 이름)는 `src/ui/theme/tokens.ts`에만 나온다. 다른 대상 소스에 `fontFamily`가 0회.
- `Menlo`·`monospace` 문자열이 대상 소스에 0회(고정폭 6곳이 사라졌다).
- 위반 주입: 다른 파일 하나에 `fontFamily: "Menlo"`를 넣으면 실패. 고정폭 문자열 하나를 되살리면 실패.

## F2. RN 글자 부품을 직접 쓰는 자리는 셋이고 셋 모두 공통 스타일을 쓴다 (FR-008)

- `react-native`에서 `Text`(별칭 포함) 또는 `TextInput`을 import하는 대상 소스 = 정확히 `src/ui/components/Text.tsx`·`src/ui/rnr/text.tsx`·`src/ui/components/NameField.tsx`. 여러 줄 import도 센다.
- 셋 모두 `TEXT_FONT`를 import하고 스타일에 쓴다(`TEXT_FONT` 식별자가 import 밖에서 한 번 이상).
- `Animated.Text`·`Animated.createAnimatedComponent(Text…)`가 대상 소스에 0회(reanimated·RN 모두 — 글자 부품을 우회하는 길).
- 위반 주입: 화면 하나에 `import { Text } from "react-native"`를 더하면 실패. `AppText`에서 `TEXT_FONT`를 빼면 실패.

## F3. 소스가 쓰는 굵기는 넣은 다섯 안에 있다 (FR-002·FR-006)

- 대상 소스와 `tailwind.config.js`에서 `fontWeight: "<값>"`·`fontWeight: '<값>'` 리터럴의 값을 모두 모으고, className의 `font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)`을 숫자로 옮긴다(normal 400 … black 900). 그 집합 ⊆ `FONT.weights`.
- `fontWeight: "bold"`·`"normal"` 같은 이름 값도 숫자로 옮겨 센다(bold 700, normal 400).
- 위반 주입: 한 곳의 `"800"`을 `"900"`으로 바꾸면 실패.

## F4. 빌드 설정의 서체 파일은 배포처 그대로다 (FR-004·FR-005·FR-016)

- `app.json`의 `expo.plugins`에 `"expo-font"` 항목이 하나 있다.
- android: `fonts`가 `fontFamily === FONT.family`인 항목 하나, 그 `fontDefinitions`의 굵기 집합 = `FONT.weights`(숫자로 비교), `style`이 없거나 `"normal"`.
- ios: `fonts`의 경로 집합 = android `fontDefinitions`의 경로 집합.
- 그 경로의 파일이 모두 있고, 각 파일의 sha256 = `assets/fonts/pretendard/source.json`의 같은 `file`의 `sha256`. 굵기도 짝이 같다.
- `source.json`의 `fonts`는 다섯이고 `license.file`(`LICENSE.txt`)이 있으며 그 sha256이 기록과 같다.
- 위반 주입: 서체 파일 한 바이트를 바꾸면(임시 사본) 실패. `app.json`에서 굵기 하나를 빼면 실패.

## F5. 라이선스 전문은 배포처 파일과 같다 (FR-013·SC-005)

- `src/ui/pretendard-license.ts`의 `PRETENDARD_LICENSE_TEXT` === `assets/fonts/pretendard/LICENSE.txt`의 내용(UTF-8, 바이트 동일 — 줄바꿈 포함).
- 전문 첫 줄에 `Kil Hyung-jin`과 `Reserved Font Name Pretendard`가 있고 `SIL OPEN FONT LICENSE Version 1.1`이 있다(엉뚱한 파일과 짝지어지는 것을 막는다).
- 위반 주입: 전문의 한 글자를 바꾸면 실패.
