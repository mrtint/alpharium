# Phase 0 Research: 엔드유저 화면 NativeWind 이관

**Feature**: 034-enduser-nativewind-migration
**Date**: 2026-09-07

033이 `DayPicker`·`CharacterListScreen`을 이관하며 남긴 선례가 이 스펙의 거의 모든 방식을 이미 정했다. 아래는 그 위에서 이 스펙 고유로 확정해야 하는 5가지 결정이다.

---

## R1 — 각 화면의 이관 방식

**Decision**: 화면별로 나눈다.

| 화면 | 방식 | 근거 |
| --- | --- | --- |
| `AuthorPicker` | **DayPicker 방식** — `import { AppText } from "./components/Text"` + `import { COLORS, RADIUS } from "./theme/tokens"`, `<Text style={styles.x}>` → `<AppText variant="...">`, `style={[styles.row, ...]}` → `className="..." style={[ROW, ...]}` (모듈 상수 `ROW`/`ROW_SELECTED` — `COLORS.*` 참조). `StyleSheet.create` 제거. | 033 `DayPicker`와 구조가 거의 동일(제목 + 행 목록 + 선택 표식). 이미 `AppText`·`COLORS`·`RADIUS`를 일부 씀 — `className` 병행 + 모듈 상수화만 남음. |
| `BuildErrorScreen` | **전면 교체** — `Text`·`StyleSheet` 직접 import 제거, `AppText` + `COLORS` + className. `page`(중앙 정렬 컨테이너)는 `className="flex-1 items-center justify-center"` + `style` 병행. | 37줄, 토큰 미사용, 완전 미이관. 제목·본문 두 `Text`만 있어 `AppText variant="title"`·`variant="body"`로 직결. |
| `OverwriteConfirmScreen` | **전면 교체** — `Text`·`StyleSheet` → `AppText` + `Button`(취소=secondary, 확인=primary) + 토큰 + className. `Pressable` 두 개를 공용 `Button`으로. | 55줄, 완전 미이관. 「취소」/「확인」이 `Button`의 자연스러운 사용처. `Button`은 눌림 피드백을 내장하므로 확인 흐름에 가벼운 마감이 붙는다(033 FR-013 범위 내, 새 애니메이션 코드 없음). |
| `PermissionsSection` | **부분 병행 + `Card`/`Section` 도입** — 이미 `AppText`·`COLORS` 일부 사용. `StyleSheet.create`의 `section`·`row`·`link`를 className 병행 + 모듈 상수로. 추가로 각 권한 행을 `Card`로 감싸고 머리글을 `Section`/`SectionHeader`로(R3 참조). 좌우 padding은 `App.tsx` 래퍼로 이관(R4). | 240줄로 가장 크지만 로직(`readStates`·`describe`·`requestFor`·`openSettings`·`AppState` 재조회)은 무변경 — 표현 래핑만. |

**Alternatives considered**:
- *네 화면 전부 `SelectRow`/`Card` 같은 공용 컴포넌트로 통일* — `AuthorPicker`는 문안·testID 제약으로 불가(R2). `BuildErrorScreen`·`OverwriteConfirmScreen`은 목록 행이 아니라 통짜 화면이라 `SelectRow`가 안 맞는다.

---

## R2 — `AuthorPicker`를 `SelectRow`로 바꿀 수 있는가

**Decision**: 바꿀 수 없다. DayPicker 방식으로 간다.

`SelectRow`(`src/ui/components/SelectRow.tsx`)의 docstring은 "`AuthorPicker`(일기 작성자)... 패턴이 이걸로 수렴한다"고 적었지만, 실제로 `AuthorPicker`를 `SelectRow`로 바꾸면 **기존 계약 테스트가 깨진다**:

| `author-picker.test.tsx`가 잠근 것 | `SelectRow`가 내는 것 | 충돌 |
| --- | --- | --- |
| 선택 표식 문안 `"작성자"` | `"선택"` (하드코딩) | FR-005 위반 |
| `testID="author-option-2"` | `${testID}-option-2` 또는 `optionTestID` 콜백 | `optionTestID`로 맞출 수 있으나… |
| 미준비 옵션에 `"아직 준비되지 않음 — 아래에서 내려받으세요"` 별도 캡션 | `hint` 하나만 (준비 상태와 무관) | `SelectRow`에 "미준비 사유 캡션" 슬롯 없음 |
| `disabledIndices` = 미준비 index | `SelectRow`가 지원 (`disabledIndices`) | OK |

`"작성자"`≠`"선택"`과 미준비 캡션 슬롯 부재가 결정적이다. `SelectRow`를 확장하면 그 컴포넌트를 쓰는 다른 자리(`VisionPicker` 등)에 영향이 가고, 이 스펙의 "새 컴포넌트 안 만들고 공용 컴포넌트 안 고친다" 제약과 부딪힌다.

**따라서** `AuthorPicker`는 033 `DayPicker`가 한 그대로 — `AppText` + `COLORS`/`RADIUS` + `className` 병행 + `StyleSheet.create` → 모듈 상수(`ROW`/`ROW_SELECTED`/`INFO`). `SelectRow` 미사용.

**Alternatives considered**:
- *`SelectRow`에 `markLabel`·`disabledHint` prop 추가* — 공용 컴포넌트 확장 = 모든 사용처 영향. 이 스펙 범위 밖(별도 과제).

---

## R3 — `PermissionsSection`의 `Card`/`Section` 적용 형태 (spec OQ-3)

**Decision**: **㉯ — 머리글만 `SectionHeader`, 각 권한 행만 `Card`로 감싼다. `Section`(섹션 전체를 `Card`로 감싸는 것)은 쓰지 않는다.**

`Card`(`src/ui/components/Card.tsx`) 실측:
- `Card` = `View` + `bg-surface` + `rounded-card` + `border` + `padding: 16`.
- `Section` = `Card` + (선택적) 상단 `SectionHeader`. 즉 **`Section`은 children 전체를 `Card` 박스로 감싼다.**

`Section`을 쓰면 "권한" 섹션 전체가 흰 배경 + border 박스가 되는데, 이는 지금의 평면 레이아웃에서 큰 시각 변화이고 032가 이관한 다른 설정 섹션(`AuthorPicker`·`VisionPicker` — 배경 박스 없음)과 톤이 어긋난다. 반면 **각 권한 행을 개별 `Card`로 감싸면** 5개 권한이 카드 목록으로 읽혀 "상태 + 동작을 함께 갖는 행"(`PermissionPanel.tsx` 주석의 성격 규정)이 시각적으로 분리된다 — 이게 032 `Card`의 원래 의도("내용을 감싼다")에 맞다.

**레이아웃 변화 처리**:
- `Card` 기본 `padding: 16`은 현행 행 `gap: 4`보다 크다. 행이 각 ~16px씩 커지면 5개 누적이 상당하다. → **`Card`에 `style={{ padding: 12 }}` 오버라이드**로 완충(032 `Card`가 `style` prop을 받아 병합 — 컴포넌트 자체는 무변경). 값 `12`는 `AuthorPicker`·`DayPicker` 행의 `paddingVertical: 12`와 맞춘다.
- 세로 여백: 섹션 `gap: 14`(현행) 유지 — `PermissionsSection`이 계속 자체 소유(spec FR-009a).
- 좌우 여백: R4로 `App.tsx` 래퍼가 소유.

**Maestro 영향**: `PermissionsSection`을 직접 지나는 흐름은 **없다**(`unified-permission-onboarding.yml`은 `OnboardingScreen`을 지남 — spec FR-019). 따라서 `Card` 도입으로 인한 행 높이 변화가 현재 어느 자동화도 깨지 않는다. 육안 검증(SC-006)으로 충분. 향후 `PermissionsSection` 흐름을 추가하면 그 스펙이 스크롤 타겟을 정한다.

**Alternatives considered**:
- *㉮ `Section`으로 섹션 전체 박스* — 시각 변화가 크고 다른 설정 섹션과 톤 불일치. 사용자가 OQ-3에서 "Card로 행 감싸기 + Section으로 머리글"을 골랐으므로 머리글은 살리되 박스는 행 단위로.
- *㉰ `Card` 기본 `padding: 16` 그대로* — 행이 눈에 띄게 커진다. `style` 오버라이드가 비용 0이고 현행 톤을 지킨다.
- *`Toggle` 적용* — `PermissionsSection`에 on/off 스위치 성격 행이 없다(전부 상태 표시 + 링크 버튼). 미적용 확정.

---

## R4 — 설정 탭 좌우 여백 이관 방식 (spec OQ-2)

**Decision**: `PermissionsSection`의 `section` 스타일에서 `padding: 20` → `paddingVertical: 20` (또는 `gap`만 남기고 세로 padding 제거)로 좌우분을 걷어내고, `App.tsx` `SettingsScreen` 조립부에서 `<View style={styles.settingsSection}>`(`paddingHorizontal: 20`)으로 `<PermissionsSection />`을 감싼다.

`App.tsx` 현행(실측):
```
// App.tsx:1158  <View style={styles.settingsSection}>  <AuthorPicker .../>  </View>
// App.tsx:1172  <View style={styles.settingsSection}>  <VisionPicker .../>  </View>
// App.tsx:1177  <View style={styles.settingsSection}>  <GeocodingSettingToggle .../>  </View>
// App.tsx:1192  <PermissionsSection .../>   ← 래퍼 없음, 자체 padding:20
// App.tsx:1232  settingsSection: { paddingHorizontal: 20 }
```

`PermissionsSection`만 `settingsSection` 래퍼 밖에 있고 자체 좌우 padding으로 정렬선을 맞췄다. 033이 나머지 셋을 `settingsSection`으로 통일했으므로, `PermissionsSection`을 같은 래퍼 안에 넣으면 설정 탭 전체가 화면 끝에서 20px인 한 세로선에 선다.

**변경 범위**: `App.tsx` 1곳(`<PermissionsSection />` → `<View style={styles.settingsSection}><PermissionsSection /></View>`) + `PermissionsSection.tsx`의 `section` 스타일에서 좌우 padding 제거. `VisionPicker`·`GeocodingSettingToggle`·`SelectRow`·`AuthorPicker` 무변경.

**주의**: `PermissionsSection`의 세로 여백(`gap: 14`)은 유지. 세로 padding도 유지하거나(현행 `padding: 20`의 상하분) `App.tsx` 래퍼 아래 다른 섹션과의 간격은 조립부가 관리하므로 `paddingVertical`을 남길지 뺄지는 육안으로 맞춘다 — spec FR-009a는 "좌우 정렬선이 같아야 한다"만 요구.

**Alternatives considered**:
- *`PermissionsSection` 자체 padding 유지 + `AuthorPicker`도 자체 padding으로* — `VisionPicker`·`GeocodingSettingToggle`까지 바꿔야 정합. 033이 방금 반대 방향으로 통일했는데 되돌리는 것.
- *현행 불일치 유지* — 사용자가 OQ-2에서 명시적으로 통일을 골랐다.

---

## R5 — 새 계약 테스트의 범위

**Decision**: `__tests__/ui/enduser-screen-migration.test.tsx` 한 스위트를 만들어 033 `character-list-migration.test.tsx` 구조를 상속한다. 화면별 `describe` 블록 4개 + 공통 "032 경계 유지" 블록.

각 화면별로 소스를 `readFileSync`로 읽어 검사(007 이후 관례 — jest는 타입을 지우고 렌더 테스트는 조건 분기를 다 못 밟는다):

- **원시 hex 0**: `#[0-9A-Fa-f]{3,8}` 리터럴 없음 (4파일 전부).
- **토큰 참조**: `from "./theme/tokens"` (또는 상대 경로) 존재.
- **`className` 병행 존재**: `className=` + 인라인 `style` 둘 다 존재.
- **`StyleSheet.create` 부재**: `AuthorPicker`·`BuildErrorScreen`·`OverwriteConfirmScreen`은 완전 제거. `PermissionsSection`은 모듈 상수로 옮겼으면 제거, 아니면 남을 수 있음 — 소스 검사로 확인 후 정한다.
- **원칙 III 경계**: `models/roster`·`ModelAsset`·`diary/prompt`·`diary/persona` import 없음 (4파일).
- **032 경계**: `dark:` variant 없음, `useColorScheme`·`Appearance` 없음 (4파일).
- **`PermissionsSection` 고유**: `from ".../components/Card"` + `<Card` 사용, `<Section` 부재, 머리글이 `from ".../components/SectionHeader"` + `<SectionHeader`, `section` 스타일에 좌우·상하 padding이 없고(`gap`만) `App.tsx`가 `settingsSection` 래퍼로 감쌈.
- **`AuthorPicker` 고유**: `SelectRow` 미사용 확인 (R2 — `from ".../SelectRow"` 없음), `"작성자"` 문자열 존재.
- **`OverwriteConfirmScreen` 고유**: `from ".../components/Button"` + `<Button` 사용, `"확인"`·`"취소"` 문자열, `entry` prop 없음 (props 타입에 `entry` 토큰 부재).
- **`BuildErrorScreen` 고유**: `"이 빌드는 잘못 만들어졌다"` 문자열, `EXPO_PUBLIC`·`APP_ENV`·`NODE_ENV` 토큰 부재.

**위반 주입으로 방어 검증**(implement 단계): 4파일 중 하나에 원시 hex / `models/roster` import / `useColorScheme` / `dark:`를 넣으면 이 스위트 또는 `dark-mode-no-scheme.test.ts` / `check-constitution.mts`가 잡는지 확인.

**`App.tsx` 변경 검증**: 별도 계약 테스트는 만들지 않는다 — `App.tsx`는 조립부라 `.tsx` 렌더 테스트가 무겁고, `settings-screen` 관련 기존 테스트(있으면)가 무수정 통과하는 것으로 갈음. `PermissionsSection` 좌우 정렬은 실기기 육안(SC-006).

**Alternatives considered**:
- *화면마다 별도 `*-migration.test.tsx` 파일 4개* — jest 스위트 수만 늘고 검사 내용은 거의 동일. 한 파일에 `describe` 4개가 `jest-projects.test.ts` 파일 수 가드에도 덜 민감.
- *기존 4개 테스트에 이관 검사 추가* — SC-002("한 글자도 수정 없이 통과")를 깬다. 절대 안 됨.
