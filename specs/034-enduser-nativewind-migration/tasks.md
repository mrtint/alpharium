# Tasks: 엔드유저 화면 전체를 NativeWind/토큰으로 이관

**Feature**: 034-enduser-nativewind-migration | **Date**: 2026-09-07

**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/enduser-screen-migration.md](./contracts/enduser-screen-migration.md) ·
[quickstart.md](./quickstart.md)

**테스트 포함**: 이 저장소는 "계약을 먼저 정하고 테스트를 먼저 쓴다"가 헌법 「개발
방식」이다(AGENTS.md). 계약 테스트를 구현보다 먼저 쓴다.

**★ 이 스펙의 1차 계약**: 기존 4개 `.tsx` 테스트(`author-picker`·`build-error`·
`overwrite-confirm`·`permissions-section`)가 **한 글자도 수정 없이** 통과한다
(spec SC-002). 표현만 바꾼다.

**★ 이 스펙의 최대 위험** (research R3 / spec Edge Cases): `PermissionsSection`에
`Card`를 넣으면 행 높이가 바뀐다. 이 화면을 직접 지나는 Maestro 흐름은 없지만
(FR-019) 육안(SC-006)으로 좌우 정렬선·카드 여백을 반드시 확인한다.

**이관 단위** (Clarify OQ-1): **일괄 이관** — 네 파일을 한꺼번에 옮기고
`npm test` 통과 후 실기기 Maestro 회귀를 한 세션으로 돌린다.

---

## Phase 1: Setup — 계약 테스트 골격 (모든 스토리의 선행)

**목표**: 이관 불변식(ES1~ES14)을 검사하는 계약 테스트 스위트를 세우고, 지금
**RED**임을 확인한다. 구현 전에 계약이 먼저 있어야 한다.

- [X] T001 `__tests__/ui/enduser-screen-migration.test.tsx`를 만들고 공통 블록(ES7 원시 hex 0 / ES8 032 경계 / ES5 원칙 III 경계 / ES9 className 병행)을 4파일 전부에 대해 먼저 쓴다 per contracts/enduser-screen-migration.md ES1·ES5·ES7·ES8·ES9 — 각 `.tsx` 소스를 `readFileSync`로 읽어 검사(007 이후 관례). 이 시점에 `AuthorPicker`·`BuildErrorScreen`·`OverwriteConfirmScreen`·`PermissionsSection`이 아직 `className`·토큰 병행이 없으므로 **RED여야 한다**.

- [X] T002 같은 파일에 화면별 고유 블록을 더한다 per contracts ES10~ES14 — ES10(`AuthorPicker`가 `SelectRow` 미사용 + `StyleSheet.create` 부재), ES11(`OverwriteConfirmScreen`이 `components/Button` 사용 + `StyleSheet.create` 부재), ES12(`BuildErrorScreen`이 `Text`·`StyleSheet` RN import 부재), ES13(`PermissionsSection`이 `components/Card` 사용 + `Section` 미사용 + `Toggle` 미사용 + 머리글이 `SectionHeader`), ES14(`PermissionsSection` `section` 스타일에 좌우 padding 부재). **RED 확인.**

- [X] T003 `npm run test:ui -- enduser-screen-migration`이 RED(예상된 실패)이고 기존 4개 스위트는 여전히 GREEN인지 확인한다 per quickstart §1 — T001·T002가 기존 테스트를 건드리지 않았음을 확인하는 게이트. `jest-projects.test.ts` 파일 수 가드가 새 `.tsx`를 ui 프로젝트에 잡는지도 확인.

**체크포인트**: 계약 스위트 RED, 기존 4개 GREEN, lint 클린. 이관이 열린다.

---

## Phase 2: User Story 1 — 설정 탭이 앱 전체와 같은 톤으로 보인다 (P1)

**목표**: 설정 탭의 "일기 작성자"(`AuthorPicker`)·"권한"(`PermissionsSection`)
섹션이 032가 이관한 화면과 동일한 아이보리·테라코타·타이포로 보인다.

**독립 테스트 기준**: 설정 탭을 열어 두 섹션의 배경·강조색·폰트가 목록 화면과
일치하고, `author-picker.test.tsx`·`permissions-section.test.tsx`가 무수정
GREEN이며, `diary-character-select.yml`이 갱신 없이 PASS.

### AuthorPicker (DayPicker 방식 — research R1·R2)

- [X] T004 [US1] `src/ui/AuthorPicker.tsx`에서 `StyleSheet`를 RN import에서 빼고, `styles.container`/`row`/`rowSelected`/`rowDisabled`/`info`를 모듈 상수 `ROW`/`ROW_SELECTED`/`INFO`(`as const`, `COLORS.*`·`RADIUS.*` 참조)로 옮긴 뒤 `StyleSheet.create`를 제거한다 per data-model.md §1 — 033 `DayPicker` 선례. `hairline` → `borderWidth: 1`.

- [X] T005 [US1] 같은 파일에서 각 요소에 `className` 문자열을 병행으로 준다 per data-model.md §1 / contracts ES9 — 컨테이너 `className="gap-2"`, 행 `className="flex-row items-center justify-between py-3 px-3 rounded-card border border-border"` + 조건부 선택/미준비, info `className="flex-1 gap-0.5"`. 인라인 `style`은 모듈 상수 + 조건부 객체. **선택 행 테두리 굵기는 현행 `rowSelected: { borderColor: COLORS.accent, borderWidth: 1 }`을 유지한다** — 033 `DayPicker`는 `border-2`로 굵혔으나 `AuthorPicker`의 현행값은 1이고, FR-009("행 높이·여백 불변")를 지키려면 굵기도 그대로 둔다. `className`도 `"border border-accent"`(2 아님). `"작성자"` 표식의 `<AppText variant="caption" style={{ color: COLORS.accent, fontWeight: "600" }}>`는 **그대로 유지**(문안·색 불변, FR-005).

- [X] T006 [US1] `AuthorPicker.tsx`가 `SelectRow`를 import하지 않는지, `testID`(`author-picker`·`author-option-${index}`)·문안(`일기 작성자`·`작성자`·`아직 준비되지 않음 — 아래에서 내려받으세요`)·`AuthorOption`/`AuthorPickerProps` 타입·`onSelect(index)` 시그니처가 불변인지 확인한다 per contracts ES3·ES4·ES10 — 소스 눈 검토 + `tsc`.

### PermissionsSection (부분 병행 + Card + 여백 이관 — research R1·R3·R4)

- [X] T007 [US1] `src/ui/PermissionsSection.tsx`에서 `import { Card } from "./components/Card"`를 추가하고, 각 권한 행을 감싸던 `<View key={req.key} style={styles.row} testID={\`permission-row-${req.key}\`}>`를 `<Card key={req.key} style={{ padding: 12, gap: 4 }} testID={\`permission-row-${req.key}\`}>`로 바꾼다 per data-model.md §4 / contracts ES13 — `Card` 기본 `padding: 16`을 12로 오버라이드(033 `DayPicker`·`AuthorPicker` 행 여백과 맞춤). 컴포넌트 자체는 무변경. 행 안 요청/설정 링크의 `testID`는 그 안 `Pressable`에 그대로.

- [X] T008 [US1] 같은 파일에서 머리글 `<AppText variant="sectionTitle">권한</AppText>`를 `<SectionHeader>권한</SectionHeader>`로 바꾸고 `import { SectionHeader } from "./components/SectionHeader"`를 추가한다 per data-model.md §4 / contracts ES13 — 동등 교체(`SectionHeader`가 그 `AppText`의 래퍼). `Section`은 import하지 않는다.

- [X] T009 [US1] 같은 파일에서 `styles.section`(`{ padding: 20, gap: 14 }`)을 **`{ gap: 14 }`만 남긴다** per research R4 / contracts ES14 — 좌우·상하 padding을 전부 제거한다. 좌우는 `App.tsx` 래퍼(`settingsSection`, T010)가 소유하고, 섹션 상하 간격은 `App.tsx` 조립부가 형제 섹션 사이에서 관리한다(`AuthorPicker`·`VisionPicker` 등 다른 섹션도 자체 상하 padding 없이 조립부가 간격을 냄). `styles.row`는 T007이 `Card`로 대체했으므로 제거, `styles.link`는 모듈 상수 `LINK`로 옮긴다. `className` 병행(`gap-3.5` 등)을 준다. `StyleSheet.create`가 비면 제거. — **육안(T027 (c))에서 상하 간격이 다른 섹션과 어긋나면 그때만 `paddingVertical`을 최소로 되살린다.**

- [X] T010 [US1] `App.tsx`의 `SettingsScreen` 조립부에서 `<PermissionsSection platform={...} requirements={...} ports={...} onRestartOnboarding={...} />`를 `<View style={styles.settingsSection}><PermissionsSection .../></View>`로 감싼다 per data-model.md §5 / research R4 — `styles.settingsSection`(`{ paddingHorizontal: 20 }`)은 이미 정의됨(App.tsx:1232). `AuthorPicker`·`VisionPicker`·`GeocodingSettingToggle` 조립부는 무변경(이미 래퍼 안). 이 1곳이 유일한 조립 계층 변경.

- [X] T011 [US1] `PermissionsSection.tsx`의 순수 함수(`readStates`·`describe`·`describePhotoAccessLimit` 호출·`showFullAccessLink` 판정)·`requestFor`·`openSettings`·`AppState` `change`→`"active"` 재조회 리스너·`PermissionsSectionProps` 타입·`rows` 정렬(`platforms.includes` + `order`)이 불변인지, `describe()`의 6개 반환 문자열과 `권한`·`권한 안내 다시 보기`·`배터리 예외 설정`·`허용`·`설정 열기`·`전체 허용`·`그날의 사진 전부를 보지 못할 수 있어요.`·`확인 중…`가 바이트 동일한지 확인한다 per contracts ES1·ES2·ES3 — 소스 눈 검토 + `tsc`.

### US1 검증

- [X] T012 [US1] `npm run test:ui -- author-picker permissions-section enduser-screen-migration card section-header`로 기존 스위트(`author-picker`·`permissions-section`·`card`·`section-header`)가 **무수정 GREEN**이고 계약 스위트의 US1 관련 블록(ES10·ES13·ES14 + 공통)이 GREEN인지 확인한다 per quickstart §1·§2 / spec SC-002·SC-011 — `card.test.tsx`·`section-header.test.tsx`도 `PermissionsSection`이 이 컴포넌트를 처음 쓰므로 회귀 확인 대상.

**체크포인트**: 설정 탭 두 섹션이 이관됨. `git diff -- __tests__/ui/author-picker.test.tsx __tests__/ui/permissions-section.test.tsx`가 비어 있음.

---

## Phase 3: User Story 2 — 확인·오류 화면이 앱 톤과 맞는다 (P2)

**목표**: 덮어쓰기 확인 화면(`OverwriteConfirmScreen`)·빌드 오류 화면
(`BuildErrorScreen`)이 앱 나머지와 같은 톤으로 보인다.

**독립 테스트 기준**: 이미 일기가 있는 하루에 "일기 쓰기" → 덮어쓰기 확인 화면의
톤 확인. `overwrite-confirm.test.tsx`·`build-error.test.tsx` 무수정 GREEN.
`generate-diary.yml`이 갱신 없이 PASS.

### OverwriteConfirmScreen (전면 교체 + Button — research R1)

- [X] T013 [P] [US2] `src/ui/OverwriteConfirmScreen.tsx`에서 RN import를 `View`만 남기고(`Pressable`·`StyleSheet`·`Text` 제거), `import { AppText } from "./components/Text"` + `import { Button } from "./components/Button"`를 추가한다 per data-model.md §3.

- [X] T014 [P] [US2] 같은 파일에서 `<Text style={styles.day}>{day}</Text>`·`<Text style={styles.notice}>...</Text>`를 `AppText`로, `Pressable` 2개를 `<Button variant="secondary" onPress={onCancel}>취소</Button>`·`<Button variant="primary" onPress={onConfirm}>확인</Button>`로 바꾼다 per data-model.md §3 / contracts ES11 — 컨테이너·`actions`에 `className` + 인라인 `style` 병행. `StyleSheet.create` 제거. `OverwriteConfirmScreenProps`(`day`·`onCancel`·`onConfirm` — **`entry` 없음**)·문안(`이 날의 일기가 이미 있다. 덮어쓸지 확인이 필요하다`·`취소`·`확인`)은 그대로.

- [X] T015 [P] [US2] `overwrite-confirm.test.tsx`의 `getByText("확인")`/`getByText("취소")` 조회와 `userEvent.press(getByText(...))` 전파가 `Button` 교체 후에도 통과하는지, X1(`entry` 없음)·X2(진행률·경과시간 없음)·X3(모델 식별자 없음)이 유지되는지 확인한다 per contracts ES3·ES6·ES11 — 033 `character-list.test.tsx`가 같은 `Button` 패턴으로 통과한 선례.

### BuildErrorScreen (전면 교체 — research R1)

- [X] T016 [P] [US2] `src/ui/BuildErrorScreen.tsx`에서 RN import를 `View`만 남기고(`Text`·`StyleSheet` 제거), `import { AppText } from "./components/Text"`를 추가한다 per data-model.md §2.

- [X] T017 [P] [US2] 같은 파일에서 `<Text style={styles.title}>`를 `<AppText variant="title" style={{ textAlign: "center" }}>`로, `<Text style={styles.body}>`를 `<AppText variant="body" style={{ textAlign: "center", opacity: 0.8 }}>`로 바꾸고 `page` 컨테이너에 `className="flex-1 items-center justify-center"` + 인라인 `style` 병행을 준다 per data-model.md §2 / contracts ES12 — `StyleSheet.create` 제거. 문안(`이 빌드는 잘못 만들어졌다` + 본문 문장)은 바이트 그대로.

- [X] T018 [P] [US2] `build-error.test.tsx`가 무수정 GREEN인지(제목·본문 조회, S10 "다시 시도" 부재, 환경 변수 이름 부재 `EXPO_PUBLIC`/`APP_ENV`/`NODE_ENV`/`.env`/`prod`/`dev`/`local`, 모델·지표 부재) 확인한다 per contracts ES1·ES6.

### US2 검증

- [X] T019 [US2] `npm run test:ui -- overwrite-confirm build-error enduser-screen-migration`으로 기존 2개 스위트가 무수정 GREEN이고 계약 스위트의 US2 관련 블록(ES11·ES12 + 공통)이 GREEN인지 확인한다 per quickstart §1·§2 / spec SC-002.

**체크포인트**: 확인·오류 화면이 이관됨. `git diff -- __tests__/ui/overwrite-confirm.test.tsx __tests__/ui/build-error.test.tsx`가 비어 있음.

---

## Phase 4: 통합 검증 — 기기 없는 전체 (US1 + US2 완료 후)

**목표**: 네 파일 일괄 이관이 저장소 전체 테스트·lint·헌법 검사를 깨지 않았음을
확인한다.

- [X] T020 `npm test` 전체(jest 두 프로젝트)가 GREEN인지 확인한다 per quickstart §3 / spec SC-004 — `jest-projects.test.ts` 파일 수 가드 포함.

- [X] T021 `npm run lint`가 클린인지 확인한다 per quickstart §3 / spec SC-004·SC-005 — eslint 0 error, `tsc` 0, `scripts/check-constitution.mts` 위반 0(`UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`·`UI_TOUCHES_PROMPT`), prettier 클린.

- [X] T022 위반 주입 5종으로 방어를 확인한다 per quickstart §4 / spec SC-005 — (1) `AuthorPicker`에 `borderColor: "#ccc"` → ES7, (2) `BuildErrorScreen`에 `useColorScheme` import → `dark-mode-no-scheme.test.ts`, (3) `OverwriteConfirmScreen`에 `className="dark:bg-black"` → `dark-mode-no-scheme.test.ts`, (4) `PermissionsSection`에 `import { roster } from "../models/roster"` → `check-constitution.mts`, (5) `PermissionsSection` `section`에 `paddingHorizontal: 20` 되살림 → ES14. 각각 잡히는 것을 확인하고 되돌린다.

- [X] T023 `git diff --stat`으로 변경 범위를 확인한다 per quickstart §7 / spec SC-009·SC-010 — `src/ui/`의 4파일 + `App.tsx` 1곳 + `__tests__/ui/enduser-screen-migration.test.tsx` 신규만. `src/diary/`·`src/models/`·`src/inference/`·`src/signals/`·`src/vision/`·`src/schedule/`·`src/onboarding/` 0줄. `scripts/run-device-tests.mjs`의 `FLOWS` 배열 길이 불변.

**체크포인트**: 기기 없는 검증 완료. 실기기로 넘어간다.

---

## Phase 5: 실기기 검증 — SM-S901N, debug (유일한 최종 확인)

**목표**: Maestro 회귀 무갱신 PASS + 육안으로 톤·정렬선·Card 여백 확인.
"건너뛴 실기기 테스트는 통과가 아니다"(헌법 원칙 V).

**전제**: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`, `npx expo
run:android`(033 세션이 debug 앱을 지웠으면 재설치 + 모델 재배치), 기기 잠금 해제,
`adb reverse tcp:8081 tcp:8081`.

- [X] T024 `diary-character-select.yml`·`writing-flow-simplified.yml` — **둘 다 PASS**(2026-09-07, SM-S901N debug, exit 0). `diary-character-select`는 033이 안 돌린 흐름인데 **갱신 없이 PASS** — stale 아님. `author-picker`·`author-option-0~2`·`일기 작성자`·`작성자` 표식·`.*상상력이 풍부.*` 전부 조회됨. `writing-flow-simplified`도 덮어쓰기 확인(SKIPPED — 그날 일기 없음) 포함 완주.

- [X] T025 `generate-diary.yml`·`past-day-diary.yml`·`writing-monologue-expansion.yml`·`skeleton.yml` — **4개 PASS**(exit 0). **★ 새 `OverwriteConfirmScreen` Button 실기기 확인**: `generate-diary`가 `Run flow when ".*덮어쓸지 확인.*" is visible` → `Tap on "확인"... COMPLETED`(primary Button), `past-day-diary`가 `Run flow when "취소" is visible` → `Tap on "취소"... COMPLETED`(secondary Button). 두 Button이 텍스트를 렌더하고 탭을 받는 것 확인. **`photo-selection-over-limit.yml`은 seed 하루(`day-${SEED_DAY}`) 미준비로 FAIL** — `npm run seed:day` 선행 필요한 데이터 의존이지 034 회귀 아님(흐름이 그 전에 이관된 `VisionPicker`/`SelectRow`의 `vision-quick`·"선택"을 통과했다).

- [X] T026 `model-acquisition.yml` **PASS**(exit 0) — `author-option-0~4` 다섯 행 전부 스크롤로 조회, 모델 식별자 미노출. **`parallel-model-download.yml`은 FAIL** — `Assert that id: pause-chinese is visible` 실패(다운로드가 이 기기에서 너무 빨리 끝나 `pause-chinese`→`action-chinese`로 되돌아감). 034가 `CharacterListScreen.tsx`를 **한 줄도 안 건드렸고**(`git diff --stat HEAD~1` 비어 있음) 이 흐름은 034 화면을 지나지 않는다 — 033이 문서화한 이 흐름의 타이밍 취약성(관성·`extendedWaitUntil` 필요)의 재발이지 034 회귀 아님. `download-conflict.yml`은 026 이후 PASS 불가라 제외.

- [X] T027 설정 탭 육안(2026-09-07, SM-S901N debug, 스크린샷 `/tmp/034_settings.png`) — (a) "일기 작성자": `SectionHeader` 헤더, 선택된 "금동이" 행이 **테라코타 테두리**(`COLORS.accent`), 우측 "작성자" 표식 테라코타 볼드, 미준비 행(루이·오드·샤오바이) 회색 테두리 + `opacity-50` + "아직 준비되지 않음 — 아래에서 내려받으세요" 캡션. 아이보리 배경. (b) "권한": `permissions-section` testID, 헤더 "권한", 5개 `permission-row-*`(photos·location·notifications·battery-exception — 031이 photo-location 제거) 전부 `Card`로 렌더, `describe()` "허용됨"×3, `permission-battery-open-settings`·`permission-restart-onboarding` 문안 그대로. (c) **좌우 정렬선 통일 확인**: "일기 작성자" 헤더·행·"배터리 설정 열기" 버튼·시각 셀렉트 칸·`VisionPicker`/`GeocodingSettingToggle`이 전부 화면 끝에서 ~20px인 한 세로선에 정렬(ES14 — `App.tsx` `settingsSection` 래퍼가 `PermissionsSection`까지 편입). (d) 캐릭터 전환·권한 링크는 Maestro 흐름(T024·T026)이 조회·탭 확인.

- [~] T028 덮어쓰기 확인 화면 — **기능은 T025 Maestro로 확인 완료**(`generate-diary`가 "확인" primary Button 탭, `past-day-diary`가 "취소" secondary Button 탭, 둘 다 `.*덮어쓸지 확인.*` 정규식이 `"...덮어쓸지 확인이 필요하다"`에 매치). **톤 육안은 이 세션에서 미수행** — 기기 제스처 내비 간섭으로 수동 진입이 반복 실패, quickstart §6이 "재현 어려우면 생략, 계약 테스트가 잠금(ES1·ES6·ES11)"으로 명시. 빌드 오류 화면 육안도 동일(재현 불가, 계약 테스트가 잠금).

**체크포인트**: 실기기 Maestro — 대상 화면 지나는 핵심 흐름 6/6 PASS(`diary-character-select`·`writing-flow-simplified`·`generate-diary`·`past-day-diary`·`writing-monologue-expansion`·`skeleton`·`model-acquisition` = 7개 PASS). FAIL 2개(`photo-selection-over-limit` seed 데이터 미준비 / `parallel-model-download` 다운로드 타이밍)는 034 회귀 아님을 확인. 설정 탭 육안 완료. 덮어쓰기 화면 톤 육안만 미수행(계약 테스트가 잠금).

---

## Phase 6: Polish & 마무리

- [X] T029 로드맵 `docs/roadmap/README.md` §22를 "🔄 034에서 구현 — 코드 완료, 실기기 검증 대기"로 갱신했다 — 범위 정정(4파일)·OQ-1~3 답·기기 없는 검증 결과·남은 실기기 항목 명시. 실기기 관측은 Phase 5 완료 후 채운다.

- [~] T030 PR — 코드·문서 커밋 완료. 실제 PR 오픈은 실기기 검증(Phase 5) 후. `main` 직접 커밋 0건(`.githooks/pre-commit`이 방어, 브랜치 `034-enduser-nativewind-migration`에서만 작업).

---

## Dependencies & 실행 순서

```
Phase 1 (T001-T003)  계약 테스트 RED
    ↓
Phase 2 (T004-T012)  US1 — AuthorPicker + PermissionsSection + App.tsx
    ↓  (US1과 US2는 서로 다른 파일 — 병렬 가능하나 일괄 이관이므로 순차)
Phase 3 (T013-T019)  US2 — OverwriteConfirmScreen + BuildErrorScreen
    ↓
Phase 4 (T020-T023)  기기 없는 전체 검증
    ↓
Phase 5 (T024-T028)  실기기 Maestro + 육안
    ↓
Phase 6 (T029-T030)  로드맵 + PR
```

**병렬 기회**:
- Phase 3의 T013·T014·T016·T017은 `OverwriteConfirmScreen`·`BuildErrorScreen` 두 다른 파일이라 `[P]`.
- Phase 2의 `AuthorPicker`(T004-T006)와 `PermissionsSection`(T007-T011)도 다른 파일이라 논리적으로 병렬 가능하나, 한 스토리 안이고 T012가 둘 다 검증하므로 순차로 둔다.
- US1(Phase 2)과 US2(Phase 3)는 파일이 완전히 분리돼 독립적이다 — 일괄 이관 방침(OQ-1)상 한 브랜치에서 순서대로 하지만, 한쪽만 완료해도 그 스토리는 독립 출하 가능.

**하지 않는 것**:
- `src/ui/components/`·`tokens.ts` 수정 (공용 컴포넌트를 이 스펙 하나 때문에 안 고침 — 033 CS10 원칙).
- 새 Maestro 흐름 (SC-010 — 문안·testID 불변이라 검증할 새 표면 없음).
- release 재확인 (새 네이티브 모듈 0 — 012, FR-021).
- 개발자 탭 화면(`DiagnosticsScreen`·`SignalProbe`·`GenerationProbe`·`PromptPreviewPanel`·`AutoDiaryTriggerButton`·`PermissionPanel`) 이관 — 범위 밖.

## MVP 범위

**US1(Phase 1-2)만으로 MVP 성립** — 설정 탭 두 섹션이 앱 톤과 맞으면 사용자가
상시 만나는 화면의 일관성이 확보된다. US2(확인·오류 화면)는 노출 빈도가 낮아
후순위지만, 일괄 이관 방침상 같은 PR에 포함한다.
