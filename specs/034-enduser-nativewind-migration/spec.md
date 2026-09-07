# Feature Specification: 엔드유저 화면 전체를 NativeWind/토큰으로 이관

**Feature Branch**: `034-enduser-nativewind-migration`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "034번: 엔드유저 화면 전체를 NativeWind/토큰으로 이관. 로드맵 22번 참조 (docs/roadmap/README.md §22)."

## Clarifications

### Session 2026-09-07

- Q: 이관을 화면 하나씩 처리하며 그때마다 Maestro 흐름을 돌릴까, 네 파일 일괄 이관 후 마지막에 전체 회귀만 돌릴까? → A: 일괄 이관 (Option B) — 네 파일을 한꺼번에 이관하고 `npm test` 통과 후 실기기에서 전체 Maestro 회귀를 한 번 돌린다. tasks.md는 "이관"·"검증" 두 단계로 나뉜다. 여백을 안 바꾸기로 했으므로(FR-009) 화면별로 끊을 필요가 없다는 판단.
- Q: 이관 후 설정 탭 좌우 여백을 `App.tsx` 조립부가 소유할까, 각 섹션이 자체 `padding`을 가질까? → A: `App.tsx` 조립부가 소유 (Option A) — `PermissionsSection`의 자체 `padding: 20`(좌우분)을 걷어내고 `App.tsx`에서 `settingsSection`(`paddingHorizontal: 20`) 래퍼로 감싼다. 033이 확립한 방식에 `PermissionsSection`을 편입해 설정 탭 전체 세로 정렬선을 완성한다. `SelectRow`·`VisionPicker`·`GeocodingSettingToggle`은 무변경. 세로 여백(`gap`·행 간격)은 `PermissionsSection`이 계속 자체 소유.
- Q: `Card`·`Toggle`·`Section`을 이번 이관에서 실제로 쓸 자리를 찾을까, 이번에도 미적용으로 둘까? → A: 실제 적용 (Option A) — `PermissionsSection`의 각 권한 행을 `Card`로 감싸고 머리글을 `SectionHeader`로 교체해 032가 만들고 안 쓰던 컴포넌트를 실제로 쓴다. **plan research R3 확정**: `Card`에 `style={{ padding: 12 }}`로 기본 `padding: 16`을 현행 여백에 맞춘다(㉰). `Section`(섹션 전체를 `Card`로 감싸는 것)은 다른 설정 섹션과 톤이 어긋나므로 안 쓴다(㉯). `Toggle`은 on/off 성격 행이 없어 미적용. `PermissionsSection`을 직접 지나는 Maestro 흐름이 없어(FR-019) `Card` 도입 레이아웃 변화는 육안 검증(SC-006).

## 배경 및 문제 정의

032가 디자인 토큰(`src/ui/theme/tokens.ts`)과 재사용 컴포넌트 7종(`Text`/`Button`/`Card`/`SectionHeader`/`ListRow`/`Toggle`/`SelectRow`)을 세우고 핵심 화면 5개를 이관했다. 033이 `CharacterListScreen`·`DayPicker`를 마저 이관해 **살아 있는 엔드유저 화면 중 원시 hex(`#rrggbb`) 리터럴이 남은 파일은 0개**가 됐다.

그러나 `src/ui/`의 여러 파일이 여전히 자체 `StyleSheet.create`만 쓰고 `className`(NativeWind 병행)이 아예 없다. 032·033이 확립한 톤(따뜻한 아이보리·테라코타, 라이트 고정)과 이관 패턴("className + 토큰 style 병행")이 이 파일들에는 적용되지 않아, 앱의 시각적 일관성이 절반만 완성된 상태다.

이 스펙은 **엔드유저가 실제로 보는** 미이관 화면을 032 패턴으로 옮긴다. 원시 색값 제거가 목표가 아니라(이미 0개), 이관 패턴·톤·공용 컴포넌트 사용의 일관성이 목표다.

## 범위: 무엇이 대상이고 무엇이 아닌가

### 대상 (엔드유저가 보는 미이관 화면)

| 파일 | 렌더 위치 | 크기 | 기존 테스트 |
| --- | --- | --- | --- |
| `AuthorPicker.tsx` | 설정 탭 "일기 작성자" 섹션 (`App.tsx`) | 87줄 | `__tests__/ui/author-picker.test.tsx` |
| `BuildErrorScreen.tsx` | `DiaryHomeScreen` — 환경 판정 실패 시 (`App.tsx` 진입 게이트) | 37줄 | `__tests__/ui/build-error.test.tsx` |
| `OverwriteConfirmScreen.tsx` | `DiaryHomeScreen` — `confirm-overwrite` 상태 | 55줄 | `__tests__/ui/overwrite-confirm.test.tsx` |
| `PermissionsSection.tsx` | 설정 탭 "권한" 섹션 (`App.tsx`) | 240줄 | `__tests__/ui/permissions-section.test.tsx` |

### 범위 밖 (개발자 탭 전용 — 원칙 III, 배포 빌드에서 닿을 수 없다)

- `DiagnosticsScreen.tsx`, `SignalProbe.tsx`, `GenerationProbe.tsx`, `PromptPreviewPanel.tsx` — `dev` 게이트 뒤에만 있어 엔드유저가 볼 수 없다.
- **`AutoDiaryTriggerButton.tsx`** — 사용자 입력에서 대상으로 언급됐으나 **`DiagnosticsScreen` 안에서만 렌더된다**(`src/ui/DiagnosticsScreen.tsx:130`). 엔드유저가 볼 수 없으므로 범위 밖.
- **`PermissionPanel.tsx`** — 사용자 입력에서 대상으로 언급됐으나 **`DiagnosticsScreen` 안에서만 렌더된다**(`src/ui/DiagnosticsScreen.tsx:113`). 파일 주석도 "사용자용 화면이 아니라 진단 경로다"라고 못 박고 있다. 범위 밖.

### 이 스펙이 하지 않는 것

- 새 컴포넌트를 만들지 않는다 (032의 7종 그대로). `Card`·`Section`을 `PermissionsSection`에 처음으로 적용하되(OQ-3) 컴포넌트 자체는 만들거나 고치지 않는다 — plan에서 `Card` padding 조정이 필요하면 사용처에서 `style` prop으로 오버라이드한다.
- 새 네이티브 모듈을 도입하지 않는다 (033이 활성화한 reanimated 외 추가 없음).
- 화면 문안·`testID`·순수 함수 로직을 바꾸지 않는다.
- 행 높이·세로 여백을 의도치 않게 바꾸지 않는다. `AuthorPicker`·`OverwriteConfirmScreen`·`BuildErrorScreen`은 현행 여백 유지. `PermissionsSection`은 OQ-2(좌우 padding을 `App.tsx` 래퍼로)·OQ-3(`Card` 도입)로 레이아웃이 의도적으로 바뀌며, 그 변화는 plan에서 확정하고 Maestro 회귀로 검증한다.
- 개발자 탭 화면을 이관하지 않는다.
- 애니메이션·인터랙션을 추가하지 않는다 (033의 눌림 피드백은 이미 `Button`·`ListRow` 안에 있고, 이 스펙이 그 컴포넌트를 쓰면 자동으로 따라온다 — 별도 애니메이션 코드는 없다). `Card`는 눌림 피드백이 없는 정적 컨테이너다.
- 헌법을 개정하지 않는다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 설정 탭이 앱 전체와 같은 톤으로 보인다 (Priority: P1)

사용자가 설정 탭을 열면 "일기 작성자"·"권한" 섹션이 목록·상세·온보딩 화면과 동일한 아이보리 배경·테라코타 강조·타이포그래피로 보인다. 지금은 이 두 섹션만 시스템 기본 스타일(회색 테두리, 기본 폰트)로 떠 있어 시각적으로 튄다.

**Why this priority**: 설정 탭은 엔드유저가 캐릭터를 바꾸고 권한을 관리하는 상시 진입점이다. 032가 이관한 화면 바로 옆에 있어 톤 불일치가 가장 눈에 띈다.

**Independent Test**: 설정 탭을 열어 "일기 작성자"·"권한" 섹션의 배경색·강조색·폰트가 목록 화면과 일치하는지 육안으로 확인. `author-picker.test.tsx`·`permissions-section.test.tsx`가 무수정 통과.

**Acceptance Scenarios**:

1. **Given** 설정 탭이 열려 있고, **When** "일기 작성자" 섹션을 본다, **Then** 캐릭터 행의 테두리·선택 표식이 032 토큰 색(테라코타)으로 그려지고, persona 이름·소개·`author-option-N` testID·"작성자" 표식 문안이 전부 그대로다.
2. **Given** 설정 탭이 열려 있고, **When** "권한" 섹션을 본다, **Then** 5개 권한 행이 각각 `Card`(surface 배경 + border, `padding: 12`)로 감싸여 그려지고 머리글이 `SectionHeader`로 렌더되며, `permission-row-*`·`permission-*-request`·`permission-restart-onboarding` testID와 모든 한국어 문안이 그대로다.
3. **Given** 이관 후, **When** 설정 탭에서 캐릭터를 바꾸거나 권한 요청 버튼을 누른다, **Then** 이관 전과 동일하게 동작한다 (순수 함수·포트 호출·`AppState` 복귀 재조회 로직 무변경).

---

### User Story 2 - 확인·오류 화면이 앱 톤과 맞는다 (Priority: P2)

사용자가 이미 일기가 있는 하루에 "일기 쓰기"를 누르면 덮어쓰기 확인 화면이 뜬다. 잘못 빌드된 앱을 열면 빌드 오류 화면이 뜬다. 두 화면 모두 지금은 시스템 기본 스타일이라 앱의 나머지와 톤이 다르다.

**Why this priority**: 덮어쓰기 확인은 생성 흐름에서 자주 만나는 화면이고, 빌드 오류 화면은 드물지만 사용자가 처음 앱을 켜자마자 만날 수 있다. P1보다 노출 빈도·표면적이 작다.

**Independent Test**: 이미 일기가 있는 하루에 "일기 쓰기" → 덮어쓰기 확인 화면의 톤 확인. `overwrite-confirm.test.tsx`·`build-error.test.tsx` 무수정 통과.

**Acceptance Scenarios**:

1. **Given** 이미 일기가 있는 하루가 선택돼 있고, **When** "일기 쓰기"를 누른다, **Then** 덮어쓰기 확인 화면이 032 토큰으로 그려지고, 날짜·`"덮어쓸지 확인이 필요하다"` 문구·「취소」/「확인」 버튼이 그대로다.
2. **Given** 환경 판정이 실패한 빌드이고, **When** 앱을 연다, **Then** 빌드 오류 화면이 032 토큰으로 그려지고, `"이 빌드는 잘못 만들어졌다"` 문구·설명 문장이 그대로이며 환경 변수 이름·"다시 시도" 문구가 여전히 없다.

---

### Edge Cases

- **행 높이가 미세하게 바뀌어 Maestro `scrollUntilVisible`이 깨진다** — `AuthorPicker`가 지나는 흐름(`diary-character-select.yml` 등)이 `author-option-N`을 개별 스크롤로 찾는다(025 실측). 세로 여백을 현행 값(`AuthorPicker` `paddingVertical: 12`)으로 명시적으로 유지해야 한다.
- **jest가 `className`을 무시해 스타일이 안 보인다** — NativeWind 변환은 Metro 시점이라 jest에 없다. 인라인 `style`(토큰 참조)을 반드시 함께 줘야 계약 테스트·초기 렌더가 정확하다.
- **`PermissionsSection`이 이미 `AppText`·`COLORS`를 일부 쓴다** — 완전한 미이관이 아니라 `className` 병행이 없는 상태. `StyleSheet.create`의 `section`·`link` 스타일을 병행으로 옮긴다. OQ-2 결정에 따라 `section`의 좌우 padding은 걷어내고 `App.tsx` 래퍼가 소유하되, 세로 `gap`(14)은 유지한다.
- **`OverwriteConfirmScreen` 문안과 Maestro 정규식의 어긋남** — 소스는 `"덮어쓸지 확인이 필요하다"`인데 `generate-diary.yml`은 `.*덮어쓴다.*`도 optional로 본다. 문안은 불변이므로 이관이 이 어긋남을 건드리지 않는다 (기존 상태 유지).
- **`PermissionsSection`에 `Card`를 넣으면 행 높이가 바뀐다** — `Card`는 `padding: 16` + border를 더한다. 5개 권한 행이 각각 16px씩 커지면 누적 세로 증가가 크고, `unified-permission-onboarding.yml`이 `PermissionsSection`을 직접 지나지 않아도 향후 흐름 추가 시 `scrollUntilVisible` 붕괴 위험이 있다. plan에서 `Card` padding 조정 또는 행만 감싸기로 완충한다.
- **`Section`이 섹션 전체에 배경 박스를 만든다** — research R3에서 `Section` 미사용으로 확정. 머리글만 `SectionHeader`(평면 유지) + 행만 개별 `Card`. 다른 설정 섹션과 톤 유지.
- **`App.tsx` 설정 탭 조립부를 건드린다** — OQ-2 결정에 따라 `PermissionsSection`을 `settingsSection`(`paddingHorizontal: 20`) 래퍼로 감싸는 1곳을 수정한다. `VisionPicker`·`GeocodingSettingToggle`은 이미 그 래퍼 안이라 무변경. `SelectRow` 컴포넌트는 건드리지 않는다(모든 사용처에 영향).

## Requirements *(mandatory)*

### 이관 대상별 요구사항

- **FR-001**: 시스템은 `AuthorPicker.tsx`·`BuildErrorScreen.tsx`·`OverwriteConfirmScreen.tsx`·`PermissionsSection.tsx` 네 파일을 032의 "className + 토큰 style 병행" 패턴으로 이관해야 한다 (033의 `DayPicker` 이관이 선례).
- **FR-002**: 각 이관 파일은 요소마다 (1) 토큰 유래 `className` 문자열 + (2) `tokens.ts`의 `COLORS.*`·`RADIUS.*`를 참조하는 인라인 `style`을 **둘 다** 가져야 한다. 인라인 `style`의 숫자는 레이아웃 관용값(padding·gap·hairline)만 허용하고 색은 반드시 `COLORS.*`여야 한다 (원시 hex 리터럴 0).
- **FR-003**: 이관 파일이 색·타이포를 직접 다루는 자리는 재사용 컴포넌트(`AppText`·`Button` 등)로 교체해야 한다. 그 컴포넌트가 병행을 내부에서 하므로 화면 코드가 색·폰트 크기를 만지지 않는다.
- **FR-003a**: `PermissionsSection`은 각 권한 행을 `Card`(with `style={{ padding: 12 }}` 오버라이드)로 감싸고 섹션 머리글을 `SectionHeader`로 교체해야 한다 (OQ-3 / research R3 — 032가 만들고 안 쓰던 컴포넌트를 실제로 쓴다). `Section`(섹션 전체 `Card` 래핑)과 `Toggle`은 쓰지 않는다. `Card` 도입으로 인한 행 시각 변화는 육안 검증(SC-006).
- **FR-004**: 각 이관 파일의 기존 `__tests__/ui/*.test.tsx`가 **수정 없이 통과**해야 한다 (033이 확립한 "1차 계약은 기존 테스트가 무수정 통과").

### 불변 (표현만 바꾼다)

- **FR-005**: 화면 문안(사용자가 읽는 한국어)을 문자 그대로 유지해야 한다. `"일기 작성자"`, `"작성자"`, `"아직 준비되지 않음 — 아래에서 내려받으세요"`, `"권한"`, `"권한 안내 다시 보기"`, `"이 빌드는 잘못 만들어졌다"`, `"덮어쓸지 확인이 필요하다"`, 「취소」/「확인」 등 전부.
- **FR-006**: `testID`를 문자 그대로 유지해야 한다. `author-picker`, `author-option-N`, `permissions-section`, `permission-row-<key>`, `permission-<key>-request`, `permission-<key>-open-settings`, `permission-battery-open-settings`, `permission-restart-onboarding` 등 전부.
- **FR-007**: `accessibilityRole`·`accessibilityState`·`accessibilityLabel`을 유지해야 한다.
- **FR-008**: 순수 함수·컴포넌트 로직을 변경하지 않아야 한다. `AuthorPicker`의 `onSelect(index)` 시그니처, `PermissionsSection`의 `readStates`·`describe`·`requestFor`·`openSettings`·`AppState` 복귀 재조회, `OverwriteConfirmScreen`의 props(`entry` 없음, 진행률 없음), `BuildErrorScreen`의 "다시 시도" 문구·환경 변수 미노출 전부 불변.
- **FR-009**: 행 높이·세로 여백을 바꾸지 않아야 한다. `AuthorPicker`의 행 `paddingVertical: 12`·`paddingHorizontal: 12`, `PermissionsSection`의 세로 `gap: 14`(좌우 padding은 OQ-2에 따라 `App.tsx` 래퍼로 이관), `OverwriteConfirmScreen`의 `container` `padding: 24`·`gap: 16`, `BuildErrorScreen`의 `page` `padding: 32`·`gap: 12`를 현행 값으로 유지.
- **FR-009a**: OQ-2 결정에 따라 `PermissionsSection`의 좌우 padding(현행 `section` `padding: 20`의 좌우분)을 걷어내고 `App.tsx` 설정 탭 조립부가 `settingsSection`(`paddingHorizontal: 20`) 래퍼로 감싸야 한다. 이관 전후로 `PermissionsSection`의 좌우 정렬선이 `AuthorPicker`·`VisionPicker`·`GeocodingSettingToggle`과 같은 세로선(화면 끝에서 20)에 있어야 한다.

### 헌법 경계 (032·033이 세운 것)

- **FR-010**: 이관 파일은 `models/roster`·`ModelAsset`·`assetFor`·`allAssets`·`diary/prompt`에 닿지 않아야 한다 (`checkSourceFile`의 `UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`·`UI_TOUCHES_PROMPT`). 대상 네 파일은 지금도 닿지 않는다 — 이관이 이를 유지한다.
- **FR-011**: 이관 파일은 `useColorScheme`·`Appearance`를 쓰지 않아야 한다 (031 라이트 고정).
- **FR-012**: 이관 파일은 `dark:` variant className을 쓰지 않아야 한다 (032 BC6).
- **FR-013**: 색·모서리·간격 값은 `src/ui/theme/tokens.ts` 단일 출처에서만 와야 한다.
- **FR-014**: jest 두 프로젝트 분리(`.ts`=logic / `.tsx`=ui)를 유지하고 `__tests__/jest-projects.test.ts` 파일 수 가드를 통과해야 한다.

### 검증

- **FR-015**: 기기 없는 테스트 전체(`npm test`)가 통과해야 한다 — lint(eslint 0 error·`tsc`·헌법 검사 위반 0·prettier)를 포함.
- **FR-016**: 네 파일을 일괄 이관하고 `npm test` 통과 후, 대상 화면을 지나는 Maestro 흐름을 실기기(SM-S901N, debug)에서 **한 번의 회귀 세션으로** 돌려야 한다. 흐름이 깨지면 `testID` 유지 원칙에 따라 흐름이 아니라 구현을 고친다. 흐름 자체가 stale(방치)이면 흐름을 갱신하고 `FLOWS` 등록을 확인한다.
- **FR-017**: `AuthorPicker`가 지나는 Maestro 흐름은 `diary-character-select.yml`이다. `writing-flow-simplified.yml`·`parallel-model-download.yml`·`model-acquisition.yml`도 "일기 작성자" 문자열을 지나므로 회귀 확인 대상이다.
- **FR-018**: `OverwriteConfirmScreen`이 지나는 Maestro 흐름은 `generate-diary.yml`·`past-day-diary.yml`·`writing-flow-simplified.yml`·`photo-selection-over-limit.yml`·`writing-monologue-expansion.yml`·`skeleton.yml`이다 (덮어쓰기 확인이 optional 단계로 들어 있다).
- **FR-019**: `PermissionsSection`·`BuildErrorScreen`은 현재 어느 Maestro 흐름도 직접 지나지 않는다 (`unified-permission-onboarding.yml`은 `OnboardingScreen`을 지나지 `PermissionsSection`이 아니다). 실기기 검증은 육안으로 한다. 새 Maestro 흐름을 만들지는 [열린 항목 4] 참조.
- **FR-020**: `unified-permission-onboarding.yml`은 `pm clear`로 앱 데이터를 날린다 (024 §7 교훈). 실기기 세션에서 이 흐름을 돌린다면 검증용 모델·일기·설정이 삭제되므로 **맨 마지막에** 돌린다.
- **FR-021**: 새 네이티브 모듈이 0개이므로 release 재확인은 불필요하다 (012 기준). debug 실기기 1회로 충분.
- **FR-022**: `main`에서 직접 작업하지 않는다. `034-enduser-nativewind-migration` 브랜치에서 작업하고 PR로 머지한다.

### 이 스펙에서 확정할 열린 항목

- **OQ-1 (이관 순서·단위)** — **확정됨 (Clarifications 2026-09-07)**: 네 파일을 **일괄 이관**하고 `npm test` 통과 후 실기기에서 전체 Maestro 회귀를 한 번 돌린다. tasks.md는 "이관"·"검증" 두 단계. 여백을 안 바꾸기로 했으므로(FR-009) 화면별로 끊을 필요가 없다. 이관 중 예상치 못한 레이아웃 변화가 드러나면 그 화면만 되돌려 재작업한다.
- **OQ-2 (설정 탭 여백 소유권)** — **확정됨 (Clarifications 2026-09-07)**: `App.tsx` 조립부가 좌우 여백을 소유한다. `PermissionsSection`의 자체 `section` 스타일에서 좌우 padding(`padding: 20`의 좌우분)을 걷어내고, `App.tsx` 설정 탭 조립부에서 `settingsSection`(`paddingHorizontal: 20`) 래퍼로 `PermissionsSection`을 감싼다 — 033이 `AuthorPicker`·`VisionPicker`·`GeocodingSettingToggle`에 쓴 방식과 동일. 세로 여백(`gap: 14`, 행 간 `gap`)은 `PermissionsSection`이 계속 자체 소유한다. `SelectRow`·`VisionPicker`·`GeocodingSettingToggle`은 이미 그 방식이라 무변경. 이 결정으로 `App.tsx` 설정 탭 조립부 1곳이 변경 대상에 포함된다(SC-009 예외).
- **OQ-3 (`Card`·`Toggle`·`Section` 활용)** — **확정됨 (Clarifications 2026-09-07 + plan research R3)**: `PermissionsSection`에 `Card` + `SectionHeader`를 적용한다.
  - **각 권한 행을 `Card`로 감싼다** — `Card`에 `style={{ padding: 12 }}`를 넘겨 기본 `padding: 16`을 현행 행 여백(`AuthorPicker`·`DayPicker`의 `paddingVertical: 12`)에 맞춘다. 컴포넌트 자체는 무변경.
  - **머리글을 `SectionHeader`로** — `SectionHeader`는 `AppText variant="sectionTitle"` 래퍼라 현행과 동등.
  - **`Section`(섹션 전체를 `Card`로 감싸는 것)은 쓰지 않는다** — 다른 설정 섹션(`AuthorPicker`·`VisionPicker` — 배경 박스 없음)과 톤이 어긋나므로. (research R3의 ㉯ + ㉰ 조합)
  - `PermissionsSection`을 직접 지나는 Maestro 흐름이 없어(FR-019) `Card` 도입 레이아웃 변화는 육안 검증(SC-006)으로 확인. 향후 그 흐름을 추가하는 스펙이 스크롤 타겟을 정한다.
  - `Toggle`은 `PermissionsSection`에 on/off 성격 행이 없으므로 미적용 — 032 T062·033 판단 유지.
- **OQ-4 (`PermissionsSection` 범위·검증)** — **확정됨 (스펙 작성 시)**: 240줄로 대상 중 가장 크고, 021이 만든 5갈래 권한 행·OS 링크·복귀 재조회 로직이 있다. 현재 이 화면을 지나는 Maestro 흐름이 없다. → **이 스펙은 `PermissionsSection`을 네 대상에 포함한다. `Card`/`Section` 적용 여부(OQ-3)와 별개로, 이관 자체는 다른 세 화면과 같은 방식이다. 새 Maestro 흐름을 만들지는 사용자 판단에 맡긴다 — 만들지 않고 육안 검증만 해도 012 기준상 완료 조건을 만족한다. 필요하면 별도 스펙에서 흐름을 추가할 수 있다.**

## Key Entities

없음 — 이 스펙은 데이터 모델·저장 계층을 건드리지 않는다. 화면의 표현(스타일)만 바꾼다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 대상 네 파일의 소스에 `#rrggbb` 리터럴이 0개다 (이미 0개인 상태 유지).
- **SC-002**: 대상 네 파일의 기존 `__tests__/ui/*.test.tsx`(`author-picker`·`build-error`·`overwrite-confirm`·`permissions-section`)가 **한 글자도 수정하지 않고** 통과한다.
- **SC-003**: 대상 네 파일이 각각 `className` 문자열과 `tokens.ts` 참조 인라인 `style`을 함께 쓴다 (계약 테스트가 소스를 읽어 검사).
- **SC-004**: `npm test` 전체 통과 + `npm run lint` 클린 (eslint 0 error, `tsc` 0, 헌법 검사 위반 0, prettier).
- **SC-005**: 헌법 검사(`scripts/check-constitution.mts`)가 위반 0을 보고한다. 위반 주입 테스트로 방어를 확인한다 — 대상 파일에 `models/roster` import / `useColorScheme` / `dark:` / 원시 hex를 넣으면 잡힌다.
- **SC-006**: 실기기(SM-S901N, debug)에서 설정 탭 "일기 작성자"·"권한" 섹션, 덮어쓰기 확인 화면이 목록·상세 화면과 동일한 아이보리 배경·테라코타 강조·타이포로 렌더되는 것을 육안으로 확인한다.
- **SC-007**: 실기기에서 `diary-character-select.yml`(+ FR-017의 회귀 대상)·`generate-diary.yml`·`past-day-diary.yml`·`writing-flow-simplified.yml`이 통과한다 (필요 시 stale 흐름 갱신 후).
- **SC-008**: 실기기에서 설정 탭의 캐릭터 전환·권한 요청 버튼·OS 설정 링크·"권한 안내 다시 보기"·포그라운드 복귀 재조회가 이관 전과 동일하게 동작하는 것을 확인한다.
- **SC-009**: `git diff`에서 `src/diary/`·`src/models/`·`src/inference/`·`src/signals/`·`src/vision/`·`src/schedule/`·`src/onboarding/` 변경이 0줄이다 (표현만 바꾼다 — 도메인 계층 무변경). `App.tsx`는 설정 탭 조립부에서 `PermissionsSection`을 `settingsSection` 래퍼로 감싸는 1곳만 변경된다 (OQ-2·FR-009a). 그 외 `App.tsx` 변경 0줄.
- **SC-010**: 새 Maestro 흐름 수는 0이다 (OQ-4에서 만들기로 하지 않는 한). `FLOWS` 배열 길이 불변.
- **SC-011**: `PermissionsSection`이 `Card`와 `SectionHeader`를 실제로 import·사용한다 (OQ-3 — 계약 테스트가 소스를 읽어 `from ".../components/Card"` + `<Card` + `from ".../components/SectionHeader"` + `<SectionHeader` 사용을 확인). `Section`(섹션 전체 `Card` 래핑)은 import·사용하지 않는다 (research R3). `card.test.tsx`·`section-header.test.tsx` 등 기존 컴포넌트 테스트는 무수정 통과.
- **SC-012**: `PermissionsSection`에 `Card`/`SectionHeader`를 적용한 뒤에도 5개 권한 행의 `describe()` 상태 문구·요청/설정 링크 분기·`AppState` 복귀 재조회가 이관 전과 동일하게 동작한다 (`permissions-section.test.tsx` 무수정 통과 — SC-002에 포함되나 `Card` 도입으로 특히 강조).

## Assumptions

- **`AutoDiaryTriggerButton`·`PermissionPanel`은 범위 밖이다** — 사용자 입력이 대상으로 언급했으나 실제 렌더 위치가 `DiagnosticsScreen`(dev 게이트) 안뿐이고, 두 파일 모두 배포 빌드에서 엔드유저가 볼 수 없다. 원칙 III상 개발자 탭 화면은 이 스펙의 목표(엔드유저 톤 일관성)와 무관하다. 필요하면 별도 스펙에서 개발자 탭 4종(`DiagnosticsScreen`·`SignalProbe`·`GenerationProbe`·`PromptPreviewPanel`)과 함께 다룬다.
- **033의 `DayPicker` 이관이 정확한 선례다** — `import { AppText } from "./components/Text"` + `import { COLORS, RADIUS } from "./theme/tokens"`, `<Text style={styles.x}>` → `<AppText variant="...">`, `style={[styles.row, ...]}` → `className="..." style={[ROW, ...]}` (모듈 상수 `ROW`/`ROW_SELECTED`가 `COLORS.*` 참조). 이 패턴을 그대로 재사용한다.
- **`AuthorPicker`는 `AppText`·`COLORS`·`RADIUS`를 이미 일부 쓴다** — 완전 미이관이 아니라 `className` 병행이 없고 `StyleSheet.create`가 남은 상태. `styles.container`/`row`/`rowSelected`/`rowDisabled`/`info`를 `className` + 모듈 상수 병행으로 옮긴다.
- **`PermissionsSection`도 `AppText`·`COLORS`를 이미 일부 쓴다** — `styles.section`(`padding: 20`)·`styles.row`(`gap: 4`)·`styles.link`를 병행으로 옮긴다.
- **`BuildErrorScreen`·`OverwriteConfirmScreen`은 완전 미이관이다** — `Text`·`StyleSheet`를 `react-native`에서 직접 import하고 토큰을 안 쓴다. `AppText` + 토큰 + 병행으로 전면 교체한다.
- **`OverwriteConfirmScreen`은 `../config/day-boundary`의 `DayDate` 타입만 import한다** — 타입 전용 import이고 원칙 III·`checkSourceFile` 위반이 아니다. 유지한다.
- **계약 테스트는 소스를 `readFileSync`로 읽어 검사하는 패턴을 쓴다** (007·009·012·033 선례). 새 계약 테스트가 필요하면 `character-list-migration.test.tsx`의 CS9(원시 색값 0)·"032 경계 유지"(dark:·useColorScheme·diary/prompt) 스타일을 따른다.
- **실기기 세션은 SM-S901N(Galaxy S22) 하나로 충분하다** — 새 네이티브 모듈 0개, debug 1회(012 기준). SM-S928N(One UI 8.5) 육안·release 재확인은 032가 21번으로 이월한 별도 부채이고 이 스펙의 완료 조건이 아니다.
- **`writing-flow-simplified.yml`은 `pm clear` 없이 돈다** (`Launch app` with clear state가 아님) — 반면 `unified-permission-onboarding.yml`은 `pm clear`를 쓴다. 실기기 세션에서 후자를 돌린다면 맨 마지막.
- **033이 활성화한 reanimated worklets 플러그인은 이미 `babel.config.js`에 있다** — 이 스펙은 `Button`·`ListRow`를 쓰면 눌림 피드백이 자동으로 따라오지만, 별도 애니메이션 코드를 추가하지 않는다.
