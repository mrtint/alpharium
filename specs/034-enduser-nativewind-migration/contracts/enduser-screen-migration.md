# Contract: 엔드유저 화면 이관 불변식 (ES)

**Feature**: 034-enduser-nativewind-migration

032 `contracts/screen-migration.md`와 033 `contracts/character-screen-migration.md`의 **공통 원칙을 그대로 상속한다** — 문안·`testID` 문자 그대로 유지, "className + 토큰 style 병행" 패턴, 원시 hex 0, `checkSourceFile` 위반 0, 기존 `.tsx` 테스트 초록, Maestro 회귀. 아래는 그 위에 이 스펙의 4개 화면 고유로 더하는 불변식이다.

**1차 계약**: `__tests__/ui/author-picker.test.tsx`·`build-error.test.tsx`·`overwrite-confirm.test.tsx`·`permissions-section.test.tsx`가 **한 줄도 수정되지 않은 채** 전부 통과한다. 이것이 "표현만 바뀌었다"의 가장 강한 증거다 (spec SC-002).

---

## 공통 (4개 화면 전부)

### ES1 — 사용자가 읽는 문장이 문자 그대로 같다

이관 전후로 아래 문자열이 **바이트 단위로 동일**:

| 화면 | 문자열 |
| --- | --- |
| `AuthorPicker` | `일기 작성자` / `작성자` / `아직 준비되지 않음 — 아래에서 내려받으세요` |
| `BuildErrorScreen` | `이 빌드는 잘못 만들어졌다` / `앱이 어떤 환경으로 만들어졌는지 알 수 없어 일기를 쓸 수 없다. 이 앱을 만든 사람에게 알려야 고쳐진다.` |
| `OverwriteConfirmScreen` | `이 날의 일기가 이미 있다. 덮어쓸지 확인이 필요하다` / `취소` / `확인` |
| `PermissionsSection` | `권한` / `권한 안내 다시 보기` / `배터리 예외 설정` / `허용` / `설정 열기` / `전체 허용` / `그날의 사진 전부를 보지 못할 수 있어요.` / `확인 중…` / `describe()`의 6개 반환 문자열 (`허용됨` / `일부만 허용됨` / `거부됨 — 다시 요청할 수 있어요` / `거부됨 — 설정에서 직접 바꿔야 해요` / `아직 묻지 않음` / `""`) |

**검사**: 계약 테스트가 각 `.tsx` 소스를 `readFileSync`로 읽어 위 리터럴의 존재를 확인.

### ES2 — 순수 함수·컴포넌트 로직이 불변이다

- `PermissionsSection`: `readStates`·`describe`·`requestFor`·`openSettings`의 분기·반환값 불변. `AppState` `change`→`"active"` 재조회 리스너 유지 (FR-020/SC-006). `describePhotoAccessLimit` 호출부·`showFullAccessLink` 판정 불변.
- `AuthorPicker`: `options.map`으로 렌더, `onSelect(index)` 호출. 로직 없음 — 표현만.
- `OverwriteConfirmScreen`·`BuildErrorScreen`: 로직 없음.

### ES3 — props 타입이 불변이다

`AuthorOption`·`AuthorPickerProps`·`OverwriteConfirmScreenProps`·`PermissionsSectionProps`의 필드·옵셔널 여부·시그니처가 그대로. **`tsc`가 보증한다.** `App.tsx` 호출부는 `PermissionsSection`을 `settingsSection` 래퍼로 감싸는 것 외에 인자 변경 0.

- **`OverwriteConfirmScreenProps`에 `entry`가 없다**(원칙 I, X1) — 이관이 담지 않는다.

### ES4 — `testID`가 그대로다

| 화면 | testID |
| --- | --- |
| `AuthorPicker` | `author-picker` · `author-option-${index}` |
| `OverwriteConfirmScreen` | (없음 — 문안으로 조회) |
| `BuildErrorScreen` | (없음) |
| `PermissionsSection` | `permissions-section` · `permission-row-${key}` · `permission-${key}-request` · `permission-${key}-open-settings` · `permission-battery-open-settings` · `permission-restart-onboarding` |

**`PermissionsSection`에서 `permission-row-${key}`는 이관 후 `Card`에 붙는다** (033 CS4 — Maestro가 행 안 링크를 접근성 트리에서 형제로 평탄화하므로 컨테이너와 링크가 각자 testID를 가져야 한다). 요청/설정 링크의 `testID`는 그 안 `Pressable`에 그대로.

### ES5 — 원칙 III: 모델에 닿는 경로가 없다

4개 화면 파일이 `models/roster`·`models/assets`·`models/expo-port`·`models/storage`·`diary/prompt`·`diary/persona`를 import하지 않는다. `ModelAsset`·`assetFor`·`allAssets` 식별자가 소스에 없다. **`checkSourceFile`의 `UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`·`UI_TOUCHES_PROMPT`가 자동 검사** — `npm run lint`가 잡는다.

- `AuthorPicker`는 persona 이름·소개를 **props(`AuthorOption.name`/`tagline`)로만** 받는다. `personaOf`·`roster.ts`를 부르지 않는다.
- `OverwriteConfirmScreen`은 `../config/day-boundary`의 `DayDate` **타입만** import — 위반 아님.
- `PermissionsSection`은 `expo-media-library`·`expo-location`·`expo-notifications`를 직접 import하지 않고 `OnboardingPorts`를 주입받는다. `PERMISSION_REQUIREMENTS`(021 상수)는 props로 받는다.

### ES6 — 원칙 III·IV: 식별자·지표가 안 드러난다

- `BuildErrorScreen`: 환경 변수 이름(`EXPO_PUBLIC`·`APP_ENV`·`NODE_ENV`·`.env`)·환경 값(`prod`·`dev`·`local`)·모델 식별자(`gguf`)·지표(`토큰`·`초`)가 소스·렌더에 없다. "다시 시도"류 문구 없다(S10).
- `OverwriteConfirmScreen`: 진행률(`%`)·경과시간(`초`·`진행`·`elapsed`)·모델 식별자(`quiet`·`narrative`·`gguf`·`kanana`)가 없다 (X2·X3).
- `AuthorPicker`: 모델 식별자·파라미터 수·양자화(`kanana`·`exaone`·`hyperclovax`·`qwen`·`gemma`·`gguf`·`Q4_K_M`·`2.1b`)가 렌더에 없다.

### ES7 — 원시 색값이 0개다

4개 화면 소스에 `#[0-9A-Fa-f]{3,8}` 리터럴이 없다. `COLORS.*` 참조는 위반이 아니다 (032 SC-001 정의).

### ES8 — 032 경계 유지

4개 화면 소스에 `dark:` variant className이 없고, `useColorScheme`·`Appearance.`가 없다 (031 라이트 고정). `dark-mode-no-scheme.test.ts`가 `src/ui/*` 전역에서 이미 검사 — 이관이 깨면 그 테스트가 잡는다.

### ES9 — className + 토큰 style 병행

4개 화면의 스타일을 받는 요소가 (1) `className` 문자열 + (2) `tokens.ts` 값 참조 인라인 `style`을 함께 갖는다. `AppText`·`Button`·`Card`로 교체한 자리는 그 컴포넌트가 병행을 내부에서 하므로 화면 코드가 색·타이포를 안 만진다. 인라인 `style` 숫자는 레이아웃 관용값(padding·gap·hairline)만, 색은 `COLORS.*`.

---

## 화면별 고유

### ES10 — `AuthorPicker`: `SelectRow`를 쓰지 않는다 (research R2)

- `from ".../components/SelectRow"` import가 없다. `<SelectRow` 사용이 없다.
- 근거: `SelectRow`는 선택 표식을 `"선택"`으로 하드코딩하고 미준비 사유 캡션 슬롯이 없어, `author-picker.test.tsx`가 잠근 `"작성자"` 문안·`"아직 준비되지 않음"` 캡션을 낼 수 없다.
- 대신 `AppText` + `COLORS`/`RADIUS` + `className` 병행 + `StyleSheet.create` → 모듈 상수(`ROW`/`ROW_SELECTED`/`INFO`). 033 `DayPicker`와 동일 패턴.
- `StyleSheet.create`가 소스에서 사라진다.

### ES11 — `OverwriteConfirmScreen`: 「취소」/「확인」이 공용 `Button`이다

- `from ".../components/Button"` import + `<Button` 2개 (취소=secondary, 확인=primary).
- `overwrite-confirm.test.tsx`의 `getByText("확인")`·`getByText("취소")` 조회와 `userEvent.press(getByText(...))` 전파가 무수정 통과 (`Button`이 children을 `AppText`로 렌더, `Pressable`로 press 전파 — 033 `character-list.test.tsx` 선례).
- `StyleSheet.create`가 소스에서 사라진다.

### ES12 — `BuildErrorScreen`: 전면 교체 완료

- `from "react-native"`에서 `Text`·`StyleSheet`를 import하지 않는다 (`View`만).
- `AppText` 사용. `StyleSheet.create`가 소스에서 사라진다.
- 문안·S10·원칙 III 경계는 ES1·ES6이 잠근다.

### ES13 — `PermissionsSection`: `Card` + `SectionHeader` 실제 사용 (OQ-3 / research R3)

- `from ".../components/Card"` import + `<Card` 사용 — **각 권한 행을 감싼다**. `Card`에 `style={{ padding: 12, ... }}` 오버라이드로 기본 `padding: 16`을 현행 행 여백에 맞춤 (컴포넌트 자체는 무변경).
- 머리글이 `<SectionHeader>권한</SectionHeader>` — `from ".../components/SectionHeader"` import + `<SectionHeader` 사용. (`AppText variant="sectionTitle"`도 동등하나, SC-011이 `SectionHeader` 사용을 명시적으로 요구하므로 `SectionHeader`로 통일한다.)
- **`Section`(섹션 전체를 `Card`로 감싸는 것)은 쓰지 않는다** — `from ".../Card"`에서 `Section`을 가져와 `<Section`으로 섹션 전체를 감싸면 안 된다(R3 — 다른 설정 섹션과 톤 불일치). 계약 테스트가 `<Section` 부재를 확인.
- `Toggle`을 쓰지 않는다 (`PermissionsSection`에 on/off 성격 행 없음).

### ES14 — `PermissionsSection`: 좌우 여백을 `App.tsx`가 소유 (OQ-2 / research R4)

- `PermissionsSection.tsx`의 `section` 스타일(또는 모듈 상수)에 좌우 padding(`paddingHorizontal:` 또는 좌우를 포함하는 `padding:` 숫자)이 없다. **세로 `gap: 14`만 남기고 `paddingVertical`도 제거**한다 — 섹션 상하 간격은 `App.tsx` 조립부가 형제 섹션 사이에서 관리한다(`AuthorPicker`·`VisionPicker`가 자체 상하 padding 없이 조립부 간격에 의존하는 것과 동일). 육안(quickstart §6 (c))에서 상하 간격이 어긋날 때만 최소 `paddingVertical`을 되살린다.
- `App.tsx`가 `<PermissionsSection />`을 `<View style={styles.settingsSection}>`(`paddingHorizontal: 20`)로 감싼다 — `AuthorPicker`·`VisionPicker`·`GeocodingSettingToggle`과 같은 래퍼.
- **실기기 육안**(SC-006): 설정 탭에서 `PermissionsSection`의 좌우 정렬선이 `AuthorPicker`·`VisionPicker`·`GeocodingSettingToggle`과 같은 세로선(화면 끝에서 20px)에 있다.

---

## Maestro

**대상 흐름** — 전부 **갱신 없이** 통과해야 한다(spec SC-007). 깨지면 032 공통 원칙대로 흐름이 아니라 구현을 고친다. 흐름이 이미 stale(014/029 이후 방치)이면 흐름을 갱신하고 `scripts/run-device-tests.mjs`의 `FLOWS` 등록을 확인하되, SC-010("새 흐름 0개")은 유지 — 갱신은 새 파일 추가가 아니다.

| 흐름 | 이 스펙의 화면에서 조회하는 것 |
| --- | --- |
| `diary-character-select.yml` | `author-picker`, `author-option-0/1/2`, `일기 작성자` |
| `writing-flow-simplified.yml` | `일기 작성자`, `.*덮어쓴다.*` / `.*덮어쓸지 확인.*` (덮어쓰기 optional) |
| `generate-diary.yml` | `.*덮어쓸지 확인.*`, `.*덮어쓴다.*`, `취소`/`확인` |
| `past-day-diary.yml` | 덮어쓰기 확인(「취소」/「확인」) — optional 0번 단계 |
| `photo-selection-over-limit.yml` | 덮어쓰기 확인 (optional) |
| `writing-monologue-expansion.yml` | 덮어쓰기 확인 (optional) |
| `model-acquisition.yml` | `일기 작성자` (문자열) |
| `parallel-model-download.yml` | `일기 작성자` |
| `skeleton.yml` | 덮어쓰기 확인 (optional) |

**`PermissionsSection`·`BuildErrorScreen`을 직접 지나는 흐름은 없다** (spec FR-019). `unified-permission-onboarding.yml`은 `OnboardingScreen`을 지나지 `PermissionsSection`이 아니다. 이 두 화면은 **실기기 육안**으로 검증한다(SC-006).

**⚠️ 순서**: `unified-permission-onboarding.yml`은 `pm clear`로 앱 데이터를 날린다(024 §7). 실기기 세션에서 이 흐름을 돌린다면 **맨 마지막에** — 검증용 모델·일기·설정이 삭제된다. 이 스펙의 대상 흐름 중엔 `pm clear`를 쓰는 것이 없다.

**새 흐름은 만들지 않는다**(spec SC-010, FR-021 계열) — 문안·`testID`가 불변이므로 검증할 새 표면이 없다. `PermissionsSection`의 `Card` 도입은 시각 변화이나 자동화가 조회할 새 `testID`를 만들지 않는다.
