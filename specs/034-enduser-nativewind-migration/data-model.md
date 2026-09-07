# Phase 1 Data Model: 스타일 인벤토리

**Feature**: 034-enduser-nativewind-migration
**Date**: 2026-09-07

이 스펙은 데이터 엔티티·저장 계층을 건드리지 않는다. "데이터 모델" 대신 **이관 대상 4파일의 현행 `StyleSheet` 키가 어떤 토큰·`className`·공용 컴포넌트로 가는지** 매핑한다. implement 단계가 이 표를 따른다.

토큰: `COLORS`·`RADIUS`·`TYPE` (`src/ui/theme/tokens.ts`). 인라인 `style`의 숫자는 레이아웃 관용값만, 색은 반드시 `COLORS.*`.

---

## 1. `AuthorPicker.tsx` (DayPicker 방식 — R1)

**현행 import**: `Pressable, StyleSheet, View` (RN) + `AppText` + `COLORS, RADIUS`
**이관 후 import**: `Pressable, View` (RN) + `AppText` + `COLORS, RADIUS` (`StyleSheet` 제거)

| 현행 `styles.*` | 값 | → 이관 후 |
| --- | --- | --- |
| `container` | `{ gap: 8 }` | `className="gap-2" style={{ gap: 8 }}` (컨테이너 `View`) |
| `row` | `flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingVertical:12, paddingHorizontal:12, borderWidth:hairline, borderColor:COLORS.border, borderRadius:RADIUS.card` | 모듈 상수 `ROW` (as const) + `className="flex-row items-center justify-between py-3 px-3 rounded-card border border-border"`. `borderWidth: 1` (hairline → 1, 033 `DayPicker` 선례) |
| `rowSelected` | `{ borderColor: COLORS.accent, borderWidth: 1 }` | 모듈 상수 `ROW_SELECTED` + `className` 조건부 `"border-2 border-accent"` (033 `DayPicker`가 `border-2` 씀 — 선택 강조 굵게) |
| `rowDisabled` | `{ opacity: 0.5 }` | 인라인 `!opt.ready && { opacity: 0.5 }` + `className` 조건부 `"opacity-50"` |
| `info` | `{ flex: 1, gap: 2 }` | 모듈 상수 `INFO` 또는 `className="flex-1 gap-0.5" style={{ flex: 1, gap: 2 }}` |
| `<AppText variant="caption" style={{ color: COLORS.accent, fontWeight: "600" }}>` (작성자 표식) | — | **그대로 유지** (`AuthorPicker`는 `"작성자"` 문안·색 유지 — FR-005) |

**불변**: `testID="author-picker"`·`author-option-${index}`, 문안 `"일기 작성자"`·`"작성자"`·`"아직 준비되지 않음 — 아래에서 내려받으세요"`, `AuthorOption` 타입, `onSelect(index)` 시그니처, `accessibilityRole/State`. `SelectRow` 미사용(R2).

---

## 2. `BuildErrorScreen.tsx` (전면 교체 — R1)

**현행 import**: `StyleSheet, Text, View` (RN)
**이관 후 import**: `View` (RN) + `AppText`

| 현행 `styles.*` | 값 | → 이관 후 |
| --- | --- | --- |
| `page` | `{ flex:1, alignItems:"center", justifyContent:"center", padding:32, gap:12 }` | `className="flex-1 items-center justify-center" style={{ flex:1, alignItems:"center", justifyContent:"center", padding:32, gap:12 }}` |
| `title` (`fontSize:18, fontWeight:"600", textAlign:"center"`) | — | `<AppText variant="title" style={{ textAlign: "center" }}>` — `TYPE.title`은 `fontSize:20`이라 18→20 미세 증가 허용(레이아웃 관용값, 문안·의미 불변). `textAlign` 병행 유지 |
| `body` (`fontSize:15, lineHeight:23, textAlign:"center", opacity:0.8`) | — | `<AppText variant="body" style={{ textAlign:"center" }}>` — `TYPE.body`는 `fontSize:15, lineHeight:22`. `opacity:0.8`은 `caption` 색(`textMuted`)이 대체하거나 `style={{ opacity: 0.8 }}` 병행 |

**불변**: 문안 `"이 빌드는 잘못 만들어졌다"`, 본문 문장(`"앱이 어떤 환경으로..."`), "다시 시도" 부재(S10), 환경 변수 이름 부재(원칙 III). props 없음.

---

## 3. `OverwriteConfirmScreen.tsx` (전면 교체 + `Button` — R1)

**현행 import**: `Pressable, StyleSheet, Text, View` (RN) + `DayDate` 타입
**이관 후 import**: `View` (RN) + `AppText` + `Button` + `DayDate` 타입

| 현행 `styles.*` | 값 | → 이관 후 |
| --- | --- | --- |
| `container` | `{ flex:1, justifyContent:"center", padding:24, gap:16 }` | `className="flex-1 justify-center" style={{ flex:1, justifyContent:"center", padding:24, gap:16 }}` |
| `day` (`fontSize:16, opacity:0.6`) | — | `<AppText variant="caption">` (`caption`=`fontSize:13`+`textMuted`) 또는 `variant="body" style={{ opacity: 0.6 }}` — 육안으로 현행 느낌에 맞춤 |
| `notice` (`fontSize:16, lineHeight:24`) | — | `<AppText variant="body">` |
| `actions` | `{ flexDirection:"row", gap:12, marginTop:8 }` | `className="flex-row gap-3 mt-2" style={{ flexDirection:"row", gap:12, marginTop:8 }}` |
| `button` (`Pressable` ×2: `paddingVertical:10, paddingHorizontal:16, borderWidth:1, borderRadius:6`) | — | `<Button variant="secondary" onPress={onCancel}>취소</Button>` + `<Button variant="primary" onPress={onConfirm}>확인</Button>`. `Button`이 padding·border·radius·눌림 피드백을 내장 |

**버튼 높이 소폭 증가 허용**: `Button` 기본 `paddingVertical: 12` vs 현행 `10` — 버튼이 4px 높아진다. 이 화면은 중앙 정렬 통짜 뷰이고 Maestro가 「취소」/「확인」을 **문안으로만** 조회하므로(`generate-diary.yml`·`past-day-diary.yml` 등 optional 단계) 스크롤·`testID` 도달에 영향이 없다. FR-009의 "행 높이 불변"은 목록형 화면(`AuthorPicker`)의 스크롤 붕괴 방지가 목적이며 이 화면은 해당 없음 — 허용.

**불변**: 문안 `"이 날의 일기가 이미 있다. 덮어쓸지 확인이 필요하다"`·`day`·`"취소"`·`"확인"`, `OverwriteConfirmScreenProps`(`day`·`onCancel`·`onConfirm` — **`entry` 없음** X1), 진행률·경과시간 부재(X2), 모델 식별자 부재(X3), `accessibilityRole="button"`.
**주의**: `overwrite-confirm.test.tsx`가 `screen.getByText("확인")`·`getByText("취소")`로 찾는다 — `Button`이 children을 `AppText`로 렌더하므로 텍스트 조회는 유지됨. `userEvent.press(getByText("확인"))`도 `Button`의 `Pressable`로 전파됨(033 `character-list.test.tsx`가 같은 패턴으로 통과 확인).

---

## 4. `PermissionsSection.tsx` (부분 병행 + `Card`/`SectionHeader` — R1·R3·R4)

**현행 import**: `useCallback, useEffect, useRef, useState` + `AppState, Pressable, StyleSheet, View` (RN) + `AppText` + `COLORS` + `describePhotoAccessLimit` + 타입들
**이관 후 import**: 위 + `Card` (`./components/Card`) + (`SectionHeader` 또는 `AppText variant="sectionTitle"` 유지). `StyleSheet`는 모듈 상수로 옮기면 제거.

| 현행 `styles.*` | 값 | → 이관 후 |
| --- | --- | --- |
| `section` | `{ padding: 20, gap: 14 }` | **`{ gap: 14 }`만 남긴다**(R4 — 좌우는 `App.tsx` 래퍼가, 섹션 상하 간격은 조립부가 소유). `className="gap-3.5"` (14≈3.5×4). 육안에서 상하 어긋나면 최소 `paddingVertical` 복원 |
| `row` | `{ gap: 4 }` | 각 권한 행을 `<Card style={{ padding: 12, gap: 4 }} testID={\`permission-row-${req.key}\`}>` 로 감쌈 (R3 — `Card` 기본 `padding:16`을 12로 오버라이드). `key`·`testID`는 `Card`에 |
| `link` | `{ paddingVertical:8, paddingHorizontal:12, borderWidth:1, borderColor:COLORS.border, borderRadius:6 }` | 모듈 상수 `LINK` + `className="py-2 px-3 rounded-md border border-border"`. `Pressable`은 유지(공용 `Button`으로 바꾸면 `link` testID들이 `Button` 스타일에 종속 — 링크는 secondary Button보다 작아야 함. 육안 판단, 기본은 `Pressable` + 토큰 유지) |
| 머리글 `<AppText variant="sectionTitle">권한</AppText>` | — | `<SectionHeader>권한</SectionHeader>` 로 교체 (`SectionHeader` = `AppText variant="sectionTitle"` 래퍼 — 동등, OQ-3의 "머리글을 Section/SectionHeader로") |

**불변**: `testID="permissions-section"`·`permission-row-<key>`·`permission-<key>-request`·`permission-<key>-open-settings`·`permission-battery-open-settings`·`permission-restart-onboarding`, 문안 `"권한"`·`describe()` 반환 문자열 전부·`"권한 안내 다시 보기"`·`"배터리 예외 설정"`·`"허용"`·`"설정 열기"`·`"전체 허용"`·`"그날의 사진 전부를 보지 못할 수 있어요."`·`"확인 중…"`, 순수 함수 `readStates`·`describe`·`describePhotoAccessLimit` 호출, `requestFor`·`openSettings`, `AppState` `change`→`active` 재조회 (FR-020/SC-006), `PermissionsSectionProps` 타입, `rows` 정렬(`platforms.includes` + `order`).

**`Card`가 `permission-row-<key>` testID를 갖는다**: 033 CS4 실측 — Maestro는 행 안 버튼을 접근성 트리에서 형제로 평탄화한다. 현행에서 `permission-row-<key>`는 바깥 `View`에 있고 요청/설정 링크는 그 안 `Pressable`에 각자 `testID`가 있다. `Card`로 바꿔도 이 구조(컨테이너 = `permission-row`, 링크 = 각자 testID) 그대로.

---

## 5. `App.tsx` 설정 탭 조립부 (R4 — 유일한 조립 계층 변경)

| 현행 (App.tsx:1192 부근) | → 이관 후 |
| --- | --- |
| `<PermissionsSection platform={...} requirements={...} ports={...} onRestartOnboarding={...} />` | `<View style={styles.settingsSection}><PermissionsSection .../></View>` — `settingsSection` = `{ paddingHorizontal: 20 }` (이미 정의됨, App.tsx:1232) |

`AuthorPicker`(1158)·`VisionPicker`(1172)·`GeocodingSettingToggle`(1177)은 이미 `settingsSection` 래퍼 안 — 무변경. `styles.settingsSection` 정의도 무변경.

---

## 신규 아티팩트

| 파일 | 목적 |
| --- | --- |
| `__tests__/ui/enduser-screen-migration.test.tsx` | 이관 불변식 계약 (ES1~ESn — contracts 참조). 소스를 `readFileSync`로 읽어 원시 hex 0·토큰 참조·className 병행·원칙 III 경계·032 경계·화면별 고유 검사 |
