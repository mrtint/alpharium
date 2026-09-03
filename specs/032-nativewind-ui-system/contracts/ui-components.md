# Contract: 재사용 컴포넌트 (UC)

**Feature**: 032-nativewind-ui-system
**Files under contract**: `src/ui/components/*.tsx`
계약 테스트: `__tests__/ui/{button,card,list-row,section-header,text-styles,toggle,select-row}.test.tsx`
(jest `ui`). `@testing-library/react-native`의 `render`(⚠️ Promise 반환 — `await`)
+ `userEvent`.

---

## 공통 (모든 컴포넌트)

### UC-C1 — 토큰만 참조, 원시 값 금지

- 컴포넌트 소스에 `#`로 시작하는 hex 리터럴이 **0건**.
- 매직 px 숫자를 `style={{}}`에 직접 쓰지 않는다 — `className` 토큰 유래 클래스
  (`p-4`, `rounded-card`, `bg-surface`, `text-text` 등) 또는 `tokens.ts` import.
- `hairlineWidth`·`0`·`1`(반경 아닌 flex 등) 같은 관용값은 허용.
- **위반 주입**: `Button`에 `style={{ backgroundColor: "#B5623C" }}` → UC-C1 FAIL.

### UC-C2 — `testID` 통과

- 모든 컴포넌트가 `testID?: string` prop을 받아 루트 요소에 전달한다.
- `SelectRow`는 옵션마다 `${testID}-option-${index}`.
- **근거**: Maestro·기존 화면 테스트가 `testID`로 찾는다(FR-018, research R11).

### UC-C3 — 색 스킴 미감지

- 컴포넌트 소스에 `useColorScheme`·`Appearance` **0건** (BC6와 짝, 031 확장).

### UC-C4 — 도메인 무관

- `diary/*`·`models/*`·`inference/*`·`signals/*`·`vision/*` import **0건**.
- 순수 표현 컴포넌트.

---

## UC1 — `Button`

- Props: `variant: "primary" | "secondary" | "danger"`, `onPress: () => void`,
  `disabled?: boolean`, `children: ReactNode`, `testID?`.
- `Pressable` 기반. `accessibilityRole="button"`,
  `accessibilityState={{ disabled }}`.
- 변형별로 다른 배경/글자/테두리 토큰을 쓴다 (`primary`=`accent`/`accentForeground`,
  `secondary`=`surface`/`text`+`border`, `danger`=`danger`/`dangerForeground`).
- `disabled`면 `onPress`가 호출되지 않는다.
- **테스트**: 3 변형 각각 렌더, `disabled` 시 press 무효, `children` 텍스트 표시,
  `testID` 조회.

## UC2 — `Card` / `Section`

- `Card`: `children`, `testID?`, 선택적 `style`. `View` + surface 배경 +
  `rounded-card` + `border` 또는 `elevation.raised`.
- `Section`: `Card` + `title?: string`(있으면 상단에 `SectionHeader` 렌더) +
  `children`.
- **테스트**: `children` 렌더, `title` 유무에 따른 헤더 표시, `testID`.

## UC3 — `ListRow`

- Props: `label: string`, `value?: string`, `right?: ReactNode`(value와
  택일), `onPress?: () => void`, `chevron?: boolean`, `testID` (필수 권장),
  `disabled?`.
- `onPress`가 있으면 `Pressable`(+`accessibilityRole="button"`), 없으면 `View`.
- 좌: `label` (body). 우: `value`(caption/body) 또는 `right` 또는 chevron(`›`).
- 하단 hairline `border`.
- **테스트**: `label`/`value` 표시, `onPress` 콜백, `right` 노드 렌더,
  `disabled` 시 press 무효, `testID`.

## UC4 — `SectionHeader`

- Props: `children`, `testID?`.
- `Text` (sectionTitle 타이포, `text` 색).
- **테스트**: 텍스트 표시, `testID`.

## UC5 — `Text` 스타일 세트

- 단일 `AppText` 컴포넌트 + `variant: "title" | "body" | "bodyStrong" |
  "caption"` (또는 `Title`/`Body`/`Caption` 별칭 export — 구현 선택).
- `variant`별로 `TYPE`의 해당 상수 + 색(`title`/`body`=`text`, `caption`=
  `textMuted`).
- RN `Text`의 나머지 prop(`numberOfLines`, `selectable`, `accessibilityLabel`
  등) 통과 — 025 `selectable`·`accessibilityLabel` 유지 필요.
- **테스트**: 4 변형 렌더, `numberOfLines`·`selectable` 통과, `testID`.

## UC6 — `Toggle`

- Props: `value: boolean`, `onValueChange: (v: boolean) => void`,
  `disabled?`, `testID?`.
- RN 코어 `Switch` 래퍼. `trackColor`/`thumbColor`를 `accent`/`surface` 토큰으로.
- **테스트**: `value` 반영, 토글 시 콜백에 반대값, `disabled` 시 무효, `testID`.
- **근거**: `GeocodingSettingToggle`·자동 생성 토글이 이걸 재사용(2e).

## UC7 — `SelectRow`

- Props: `label: string`, `options: readonly { label: string; hint?: string }[]`,
  `selectedIndex: number`, `onSelect: (index: number) => void`,
  `disabledIndices?: readonly number[]`, `testID?`,
  `optionTestID?: (index, option) => string | undefined` (032 이관에서 추가).
- 각 옵션이 `Pressable` (`optionTestID?.(i, opt)` ?? `${testID}-option-${i}`),
  `accessibilityState={{ selected, disabled }}`.
- **`optionTestID`**: 기존 화면(`vision-<x>`·`geocoding-<x>` …)이 고유 옵션 키를
  이미 쓰므로, `SelectRow`로 이관해도 그 Maestro·테스트 키가 유지되도록 옵션별
  `testID`를 직접 지정한다(SM 공통 원칙 — `testID` 불변). 미지정 시 기본
  `${testID}-option-${i}`.
- 선택된 옵션에 시각 표식(테두리 강조 또는 체크). **표식 텍스트가 여러 조각이면
  `accessibilityLabel` 병행**(025 교훈).
- `disabledIndices`의 옵션은 press 무효.
- **테스트**: 옵션 렌더, 선택 표식, `onSelect` 콜백 index, `disabledIndices`
  무효, 옵션별 `testID`.
- **근거**: `AuthorPicker`(작성자 선택)·자동 생성 시각 선택·`VisionPicker`·
  `DayPicker` 패턴이 이걸로 수렴 가능(2e·2b). 단 이관 시 각 화면의 기존
  `testID`(`author-option-<i>` 등)를 `SelectRow`의 `testID` prop으로 전달해
  유지한다.

---

## UC8 — jest 편입 (BC8과 짝)

- 7개 컴포넌트 테스트가 전부 `.tsx`, `__tests__/ui/` 아래, `ui` 프로젝트에
  정확히 한 번 잡힌다.
- `jest-projects.test.ts` 파일 수 가드 통과.
- **위반 주입**: 컴포넌트 테스트를 `.ts`로 만들면 → `render()` 부재로 FAIL
  (원인을 가리키는 실패).
