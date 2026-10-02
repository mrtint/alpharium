# Tasks: 개발자 메뉴 — 버전 7번 탭, 모듈 상태·다시 받기·온보딩 다시·끄기

**Input**: Design documents from `/specs/059-developer-menu/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/developer-menu.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 이야기의 테스트 태스크를 구현보다 먼저 하고 **실패를 확인한 뒤** 구현한다.
계약 번호(TP·DS·HK·DV·MD·RD·OB·OF·DG·BD·CL·FL·TX)는 [contracts/developer-menu.md](contracts/developer-menu.md)의 것이다.

**Organization**: 이야기별로 묶었다. US1(켜기)·US2(개발자 화면·모듈 줄)는 P1, US3(모듈 다시 받기)·US4(온보딩 다시)·US5(끄기)는 P2, US6(진단 진입)·US7(정리)은 P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 앞 태스크에 의존하지 않음

---

## Phase 1: Setup

- [ ] T001 브랜치가 `059-developer-menu`인지 `git branch --show-current`로 확인하고, `npm run test:logic`이 지금 초록인지 기준선을 본다(저장소 루트)
- [ ] T002 `npx expo install expo-network`로 SDK 57이 고른 버전을 `package.json`·`package-lock.json`에 올린다(버전을 추측하지 않는다 — AGENTS). `npx expo install --check`가 통과하는지 본다. **prebuild·재설치는 quickstart 단계**(Phase 10)이고 여기서는 하지 않는다. `node_modules/expo-network`가 있고 `package.json`의 직접 의존성에 있는지 확인(RD7의 절반)

---

## Phase 2: Foundational (모든 이야기의 전제 — 문구·토큰·틀·토스트)

- [ ] T003 TX 계약 테스트를 `__tests__/ui/developer-text.test.ts`에 쓴다(`.ts` — 순수 문자열) — `src/ui/developer-text.ts`의 `DEVELOPER_TEXT`가 보드 KO 원문과 글자 단위로 같다: `title` 「개발자」, `groupModules` 「모듈」, `readModule` 「읽는 모듈」, `writeModule` 「쓰는 모듈」, `redownload` 「모듈 다시 받기」, `groupDiag` 「진단」, `diag` 「진단」, `devOnly` 「개발 빌드만」, `groupReplay` 「다시 보기」, `replayOnboarding` 「온보딩부터 다시」, `off` 「개발자 메뉴 끄기」, `enabled` 「개발자 메뉴가 켜졌어요」, `enabledSub` 「이 기기에서만」, `already` 「이미 켜져 있어요」, `tapsLeft(3)` = 「개발자 메뉴까지 3번 남았어요」. 그리고 `SETTINGS_TEXT.developer` = 「개발자」(`about.developer`). 보드 밖 문구(`allReady` 「이미 모두 준비돼 있어요」, `redownloadTitle` 「모듈을 다시 받을까요?」, `redownloadCellular(size)` 「모바일 데이터로 {size}를 받아요.」, `redownloadBody` 「빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.」, `redownloadConfirm` 「받기」, `redownloadCancel` 「취소」, `diagBack` 「개발자」)도 글자 단위로 잠그되 `// 보드 밖`이 소스 주석에 있는지 소스 계약으로 본다(BD4) — 실패 확인
- [ ] T004 `src/ui/developer-text.ts`를 새로 만들고(보드 키 이름을 따른 `DEVELOPER_TEXT` 객체 + `tapsLeft(n: number): string` — `toLocaleString` 금지, 머리 주석에 059·보드 `6c`·`6d`·`6e`·`6j`·`about.developer`·`dev.*`와 「보드 밖」 구분을 단다), `src/ui/settings-text.ts`에 `developer: "개발자"`를 더한다. T003 초록
- [ ] T005 [P] `src/ui/theme/tokens.ts`의 `SETTINGS`에 `rowHighlight: "#fff2ef"`(보드 `accent-100`, 「개발자」 행 켜짐 강조 바탕, 주석에 출처)를 더하고 `__tests__/theme-tokens.test.ts`에 DT1(`#rrggbb` 형식·`COLORS` 별칭 아님 허용 목록)에 맞게 단언을 더한다(`rowHighlight`가 `#fff2ef`이고 `COLORS.text`와의 대비가 AA 본문 이상 — 글자는 기존 `text`색)
- [ ] T006 [P] DV10 테스트를 `__tests__/ui/developer-toast.test.tsx`에 쓴다 — `DeveloperToast`가 `text`와 선택 `sub`를 그리고 `accessibilityRole="alert"`·`accessibilityLiveRegion="polite"`이며, 가짜 타이머로 2000ms 뒤 `onDismiss`가 한 번 불리고, `key`를 바꿔 다시 마운트하면 새 문구로 대신된다(한 번에 하나) — 실패 확인(파일 없음)
- [ ] T007 `src/ui/DeveloperToast.tsx`를 만든다(R11) — `FailureToast`의 구조를 참고하되 쓸어 닫기·하단 바 높이 의존 없이 `TOAST` 토큰(색·여백·글자)만 공유, 제목 + 선택 보조 줄(12, `textMuted`), `bottom`은 부르는 쪽이 준다, 시작값을 마운트 값으로 준 reanimated 페이드·슬라이드(`useSharedValue(from)` — `useEffect`로 되돌리지 않는다, 049 교훈), `TOAST_SHOW_MS = 2000`(사람이 정한 값), `onDismiss`는 한 번. T006 초록
- [ ] T008 [P] `src/ui/SettingsFrame.tsx`에 선택 prop `titleAside?: string`을 더한다 — 제목 줄 오른쪽(제목과 같은 줄, 오른쪽 정렬, 12 고정폭, `textMuted`, `testID="settings-title-aside"`)에 그린다. `__tests__/ui/settings-frame.test.tsx`에 단언을 더한다(주면 글자가 보이고 안 주면 노드 자체가 없다 — 055의 기존 단언이 그대로 초록)

**Checkpoint**: 문구·색·토스트·틀이 있다. 이야기들이 그것을 쓴다.

---

## Phase 3: User Story 1 — 버전 7번 탭으로 개발자 메뉴를 켠다 (Priority: P1) 🎯 MVP

**Goal**: 설정 「정보」의 버전을 1초 이내 간격으로 7번 누르면 켜지고(4번째부터 남은 횟수 토스트) 「개발자」 행이 1.5초 강조되며 기기에 저장된다. 개발 환경은 처음부터 켜짐.

**Independent Test**: `registerTap`·저장 통로·훅을 대역으로 돌려 경계·저장·환경 우선을 보고, 화면 테스트로 행·강조·토스트를 본다(spec US1).

### Tests (먼저 쓰고 실패를 확인한다)

- [ ] T009 [P] [US1] TP1~TP7 테스트를 `__tests__/app/developer-taps.test.ts`에 쓴다 — 첫 탭 `count 1`·`none`; 1000ms 이하는 이어 세고 1001ms면 처음부터; 4·5·6번째 `tapsLeft 3/2/1`; 7번째 `enabled`(`alreadyOn=false`)·`already-on`(`true`)이고 횟수 0으로; `alreadyOn=true`일 때 4~6번째는 `none`; 소스에 `new Date(`·`Date.now(`가 없다(주석 제거 뒤); `lastAt === null`은 간격 판정 없이 1번째. 실패 확인(파일 없음)
- [ ] T010 [P] [US1] DS1~DS4 테스트를 `__tests__/app/developer-menu-store.test.ts`에 쓴다 — 메모리 `DeveloperMenuStorePort` 대역으로: `saveDeveloperMenu`가 `{"enabled":true}` 하나만 쓴다(`JSON.parse` 결과의 키가 `["enabled"]`뿐); `clearDeveloperMenu`는 `remove`를 부르고 파일이 없어도 던지지 않는다; `loadDeveloperMenu`는 없음·`"not json"`·`{"enabled":false}`·`{"enabled":"yes"}`·`{}`·통로 예외를 전부 `false`로 준다; 소스 계약: `preferences`·`developer-menu.json` 문자열이 있고 `auto-diary.json`·`onboarding.json`·`auto-write-skipped.json`이 없다. 실패 확인
- [ ] T011 [P] [US1] HK1~HK5 테스트를 `__tests__/ui/use-developer-menu.test.tsx`에 쓴다(RNTL 14 — `await render`, 훅은 얇은 테스트 컴포넌트로) — 개발 환경에서 파일이 꺼짐이어도 `enabled` 참이고 `read`가 불리지 않음(HK1); `disable()` 뒤 거짓·`write`/`remove` 안 불림·`enable()` 뒤 참(HK2); 배포: 읽기 전·읽기 실패 거짓, 켜짐 파일이면 참(HK3); 배포 `enable()` 쓰기 던져도 참, `disable()` 지우기 던져도 거짓(HK4); 환경은 마운트 때 한 번 받은 값(소스에 `currentEnvironment(`이 없고 인자로 받는다, HK5). 실패 확인
- [ ] T012 [P] [US1] DV12 테스트를 `__tests__/ui/use-developer-taps.test.tsx`에 쓴다(가짜 타이머, RNTL 14 — 얇은 테스트 컴포넌트) — `useDeveloperTaps({ alreadyOn, onEnable })`가 `{ onPressVersion, toast, highlight }`를 준다: 4번째 탭에 `toast.text` 「개발자 메뉴까지 3번 남았어요」, 7번째에 `onEnable` 한 번·`toast`(`enabled`+`enabledSub`)·`highlight` 참이고 1.5초(`advanceTimersByTime(1500)`) 뒤 `highlight` 거짓, `alreadyOn`이면 7번째에 `already`, 새 토스트가 이전을 대신(`key` 증가)하고 2000ms 뒤 `toast === null`, 언마운트 때 타이머가 정리된다(경고 없음), `Date.now()`는 핸들러 안에서만(렌더 중 호출 금지 — 소스 계약). 실패 확인
- [ ] T013 [P] [US1] DV1~DV3 테스트를 `__tests__/ui/settings-screen.test.tsx`에 더한다 — `settings-version`이 누를 수 있다(`fireEvent.press` → `onPressVersion`); `developerEnabled=false`면 `settings-developer`가 없고 `true`면 「정보」 묶음 맨 아래(마지막 자식)에 있다; `developerHighlight`가 참이면 행 바탕 스타일이 `SETTINGS.rowHighlight`, 아니면 바탕이 없다; 행을 누르면 `onOpenDeveloper`(DV3); 기존 055·058 단언이 새 prop 기본값으로 그대로 초록. 실패 확인

### Implementation

- [ ] T014 [P] [US1] `src/app/developer-taps.ts`를 만든다(R12) — `TAP_WINDOW_MS = 1000`·`TAPS_TO_ENABLE = 7`·`TAPS_LEFT_FROM = 4`(사람이 정한 값, 주석에 보드 `6c` ⑤), `type TapState = { count: number; lastAt: number | null }`, `INITIAL_TAP_STATE`, `registerTap(state, nowMs, alreadyOn)`가 `{ state, effect }`(`effect`: `{ kind: "none" } | { kind: "tapsLeft"; n } | { kind: "enabled" } | { kind: "already-on" }`)를 준다. `now`는 인자뿐. T009 초록
- [ ] T015 [P] [US1] `src/app/developer-menu-store.ts`를 만든다(R1, `src/schedule/skip-store.ts`와 같은 모양) — `DeveloperMenuStorePort { read; write; remove }`, `loadDeveloperMenu`(던지지 않음, `enabled === true`일 때만 참)·`saveDeveloperMenu`(`JSON.stringify({ enabled: true })`)·`clearDeveloperMenu`, `expoDeveloperMenuStorePort()`(지연 import `expo-file-system`, `preferences/developer-menu.json`, `.writing` 임시 파일 → 옮기기, `remove`는 없어도 던지지 않음). **값은 켜짐 하나** — 주석에 D3·원칙 IV. T010 초록
- [ ] T016 [US1] `src/ui/use-developer-menu.ts`를 만든다(R2) — `useDeveloperMenu({ devEnvironment: boolean, port })`가 `{ enabled, enable, disable }`을 준다: 개발 환경은 `enabled = !sessionOff`(파일을 읽지도 쓰지도 않는다), 배포는 마운트 때 한 번 `loadDeveloperMenu`로 `persisted`를 얻고(`alive` 가드, 읽기 전 `false`) `enable()`은 `persisted = true` + `saveDeveloperMenu`(`.catch(() => {})` — 실패해도 켜짐 유지), `disable()`은 `persisted = false` + `clearDeveloperMenu`(`.catch(() => {})`). 환경 값·통로는 인자로 받는다(`currentEnvironment`·`process.env` 금지 — BD2). `react-hooks` 규칙(effect 안 `setState` 직접 호출 금지 — `.then` 안에서). T011 초록
- [ ] T017 [US1] `src/ui/SettingsScreen.tsx`에 prop을 더한다 — `onPressVersion?: () => void`, `developerEnabled?: boolean`(기본 `false`), `developerHighlight?: boolean`(기본 `false`), `onOpenDeveloper?: () => void`. 「버전」 행에 `onPress={onPressVersion}`(없으면 누를 수 없는 모양 그대로 — `Row`의 `onPress` 조건부 전달 관례), 「정보」 묶음 맨 아래에 `developerEnabled`일 때만 「개발자」 행(`SETTINGS_TEXT.developer`, `testID="settings-developer"`, trailing `<Chevron />`, `onPress={onOpenDeveloper}`, `highlight` → `Row`에 `highlight?: boolean` prop을 더해 바탕 `SETTINGS.rowHighlight`·`marginHorizontal: -20`·`paddingHorizontal: 20`(보드 `6d` 마크업)). 시작값은 마운트 값(effect로 되돌리지 않는다 — 부모가 prop으로 준다). T013 초록
- [ ] T018 [US1] `src/ui/use-developer-taps.ts`를 만든다(R12) — `useDeveloperTaps({ alreadyOn, onEnable })`가 `{ onPressVersion, toast: { key, text, sub? } | null, highlight: boolean }`를 준다. 탭 상태 `useRef<TapState>(INITIAL_TAP_STATE)`(훅을 든 컴포넌트가 열려 있는 동안만 산다 — 설정 겹이 닫히면 언마운트), `onPressVersion`이 `registerTap(ref.current, Date.now(), alreadyOn)` 결과에 따라 `tapsLeft`→토스트 `DEVELOPER_TEXT.tapsLeft(n)`, `enabled`→`onEnable()`+토스트 `enabled`/`enabledSub`+`highlight` 참(1.5초 `setTimeout`, `useEffect` cleanup으로 정리), `already-on`→토스트 `already`. 토스트는 `setTimeout` 2000ms 뒤 `null`(새 토스트가 이전 타이머를 지운다). `setState`는 이벤트 핸들러·타이머 콜백 안에서만. T012 초록
- [ ] T019 [US1] `App.tsx`의 `AppFrame`에서 `useDeveloperMenu({ devEnvironment: showsDiagnostics, port: useMemo(expoDeveloperMenuStorePort) })`를 한 번 든다(056 설정 값 보관과 같은 이유 — 주석), `SettingsSection`에 `developerEnabled`·`onEnableDeveloper`·`onOpenDeveloper`(`setRoute("developer")`)를 내려 준다. `SettingsSection`(`App.tsx` `function SettingsSection`)에서 `useDeveloperTaps({ alreadyOn: developerEnabled, onEnable: onEnableDeveloper })`(T018)를 부르고 `onPressVersion`·`highlight`(→ `developerHighlight`)를 `SettingsScreen`에 잇는다. **토스트는 `AppFrame`이 한 자리(`toast` 상태)에서 그린다** — 설정·개발자 겹이 같은 `<DeveloperToast>`를 쓰므로(US3의 「이미 모두 준비돼 있어요」도 같은 자리) 훅이 준 `toast`를 `AppFrame`의 `showToast`로 올려 `key`가 새로 마운트되게 한다(`bottom`은 안전 영역 + 12, 안쪽 `View` 맨 아래, 겹 위). 개발자 겹 조립은 US2에서 한다 — 여기서는 `route === "developer"`로 가는 길만 만든다. `npm run test:ui`·`npm run lint` 초록

**Checkpoint**: 배포 환경에서 7번 탭으로 켜지고 행이 나타난다. 개발자 화면은 아직 진단 그대로(US2에서 대체).

---

## Phase 4: User Story 2 — 개발자 화면에서 모듈 상태를 본다 (Priority: P1)

**Goal**: 「개발자」 행 → 개발자 화면(보드 `6e`/`6j`): 머리글 버전, 「모듈」(읽는·쓰는 줄), 「다시 보기」, 「개발자 메뉴 끄기」(행만 — 동작은 US3~US5). 모델 이름 없음. 배포에는 「진단」 그룹이 없다.

**Independent Test**: `readModuleLines`를 대역으로 돌려 상태어·크기·`null`을 보고, 화면 테스트로 그룹 구성과 환경별 차이를 본다(spec US2).

### Tests

- [ ] T020 [P] [US2] MD1~MD5 테스트를 `__tests__/app/module-lines.test.ts`에 쓴다 — 대역 `ModelFilePort`·준비 상태 읽기로: 「쓰는」 키 = `assetFor(ONBOARDING_DEFAULT_CHARACTER).key`, 「읽는」 = `ESSENTIAL_ASSET_KEYS`에서 그것을 뺀 나머지이고 크기는 그 `bytesUsed` 합(MD1); `ready`→`loaded`·`partial`→`partial`·`not-downloaded`→`missing`·`unusable`→`unusable`, 줄 = `` `${상태} · ${formatModuleBytes(n)}` ``(MD2); 반환 문자열이 `/\.(gguf|bin)|kanana|exaone|qwen|https?:|\bv1\b|\ba1\b/i`에 안 걸린다(MD3 — 정규식은 파일을 쓴 뒤 다시 읽어 이스케이프 확인); 한 줄에서 던지면 그 줄만 `null`(MD4); 소스 계약: `src/ui/` 어느 파일도 `module-lines`를 import하지 않는다(MD5). 실패 확인
- [ ] T021 [P] [US2] DV4~DV9 테스트를 `__tests__/ui/developer-screen.test.tsx`에 쓴다 — `DeveloperScreen` props(`buildLabel`·`modules {reading,writing}`·`showsDiagnostics`·핸들러)로: `developer-screen` 아래 「모듈」 그룹의 두 줄(`developer-module-reading`·`developer-module-writing`, 라벨 「읽는 모듈」/「쓰는 모듈」)·`developer-redownload`·「다시 보기」 그룹의 `developer-replay-onboarding`·`developer-off`가 있다(DV4); 줄이 `null`이면 값이 빈다; `showsDiagnostics=false`면 「진단」 그룹·`developer-diagnostics`가 없고(DV5) `true`면 「모듈」과 「다시 보기」 사이에 있고 「개발 빌드만」 표지가 보인다; 핸들러 연결(DV7); 값 `Text`의 스타일 `fontFamily`가 monospace 갈래(`Platform.select`/`monospace`)(DV9); 소스 계약: `DeveloperScreen.tsx`가 `DiagnosticsScreen`·`ESSENTIAL_ASSET_KEYS`·`models/roster`·`process.env`·`__DEV__`를 import·참조하지 않는다(DG2·BD1·BD2); 문구가 `DEVELOPER_TEXT`에서 온다(소스에 한글 문자열 리터럴이 없다 — 주석 제거 뒤). 실패 확인
- [ ] T022 [P] [US2] DV6 테스트를 `__tests__/ui/settings-frame.test.tsx`(T008에서 더한 곳)와 `__tests__/app/developer-build-label.test.ts`에 쓴다 — `src/app/developer-build-label.ts`의 `buildLabelFor({ devEnvironment, versionText })`가 개발 환경 `"DEV · 1.0.0 (24)"`, 배포 `"1.0.0 (24)"`, 개발 환경에서 버전을 못 읽으면(`null`) `"DEV"`, 배포에서 `null`이면 `""`(지어내지 않는다 — 원칙 V)를 준다. 실패 확인

### Implementation

- [ ] T023 [US2] `src/app/module-size.ts`에 `readModuleSizes(files, { writingKey })`를 더한다 — `ESSENTIAL_ASSET_KEYS`를 「쓰는 키」(인자)와 나머지로 나눠 각 합을 준다(058의 `readModuleBytes`·`formatModuleBytes`는 그대로, `module-size.test.ts` 기존 단언 초록)
- [ ] T024 [US2] `src/app/module-lines.ts`를 만든다(R4) — `readModuleLines({ files, readiness })`가 `{ reading: string | null; writing: string | null }`를 준다. 준비 상태는 `essential-assets-port.ts`의 `readFacts`가 쓰는 `readinessOf` 입력과 같은 사실에서 얻는다 — `essential-assets-port.ts`에 `readStatuses(): Promise<{ reading: ModelReadiness["kind"]; writing: ModelReadiness["kind"] }>`를 더해(기존 `readFacts`를 그 위로 다시 쓰되 반환 모양·테스트 `essential-assets-port.test.ts` 불변) 거기서 받는다. 키 판정·로스터 접근은 이 파일과 그 통로에서만(`UI_TOUCHES_ASSET`). 주석에 「`loaded`는 파일 준비 상태이지 메모리 적재가 아니다」(R4)와 원칙 III. T020 초록
- [ ] T025 [P] [US2] `src/app/developer-build-label.ts`를 만든다(순수) — T022의 `buildLabelFor`(계약 BL1). T022 초록
- [ ] T026 [US2] `src/ui/DeveloperScreen.tsx`를 만든다(보드 `6e`/`6j`, 내용만 — 틀은 `SettingsFrame`이 준다) — 그룹 머리·행 모양은 `SettingsScreen.tsx`의 `Group`·`Row`·`Chevron`·`Value`를 쓰되 공용화가 필요하면 그 파일에서 `export`로 연다(C7: 새 파일로 복제하지 않는다). 그룹: 「모듈」(`modules.reading`/`writing` 줄 — 값 고정폭, `null`이면 빈 값; 「모듈 다시 받기」 행 ›), `showsDiagnostics`일 때만 「진단」(행 하나: 라벨 `DEVELOPER_TEXT.diag`, 값 영역에 「개발 빌드만」 표지, ›), 「다시 보기」(「온보딩부터 다시」 ›), 맨 아래 「개발자 메뉴 끄기」(빨강이 아닌 기본 라벨 — 보드에 빨강 지정이 없다). `testID`는 T021의 것. 핸들러 prop: `onRedownload`·`onReplayOnboarding`·`onDisable`·`onOpenDiagnostics`. T021 초록
- [ ] T027 [P] [US2] DV11 소스 계약을 `__tests__/app/app-developer-source.test.ts`에 쓴다 — 주석 제거한 `App.tsx`에서 설정 `StackLayer`의 `open`이 `route === "developer"`를 포함하고 `active`가 `route !== "developer"`를 포함한다; 개발자 `StackLayer`의 `onClose`가 `setRoute("settings")`(홈이 아니다); 개발자 겹의 JSX가 설정 겹보다 뒤에 있다. 실패 확인
- [ ] T028 [US2] `App.tsx` 개발자 겹을 조립한다 — 055의 `<StackLayer … open={showsDiagnostics && route === "developer"}>` + `DiagnosticsScreen`을 **`open={developerEnabled && route === "developer"}`** + `SettingsFrame`(`backLabel={SETTINGS_TEXT.backToSettings}`, `onBack` = 설정으로(`setRoute("settings")`), `title={DEVELOPER_TEXT.title}`, `titleAside={buildLabelFor(...)}`) + `DeveloperScreen`으로 바꾼다. 모듈 줄은 개발자 겹이 열릴 때 한 번 읽는 `useEffect`(+ 다시 받기에서 돌아올 때 다시)로 `readModuleLines`를 불러 `AppFrame` 상태 `moduleLines`에 담는다(읽기 전 `{reading:null,writing:null}`; `alive` 가드; `setState`는 `.then` 안). `showsDiagnostics`는 `DeveloperScreen`에 `showsDiagnostics` prop으로만 넘긴다(BD3). 「진단」·다시 받기·온보딩·끄기 핸들러는 US3~US6에서 잇는다 — 그 전까지는 `undefined`를 넘기고 `DeveloperScreen`은 핸들러가 `undefined`인 행을 누를 수 없는 모양으로 그린다(058 「누를 수 없는 행은 `onPress`도 안 넘긴다」). **설정 겹은 개발자가 열린 동안에도 열려 있다**(R8, DV11) — 설정 `StackLayer`를 `open={route === "settings" || route === "developer"}`·`active={!renaming && route !== "developer"}`로 바꾸고 개발자 `StackLayer`는 그 위에 쌓는다(JSX 순서상 뒤). `homeCovered`·`layersMounted.developer`는 그대로. `showsDiagnostics`의 다른 사용(055 주석)을 정리한다. `npm run test:ui`·`npm run lint` 초록 + `__tests__/ui/settings-covered-home.test.tsx`·`settings-stack.test.tsx`가 새 개발자 진입 조건에 맞게 고쳐졌는지 확인(055의 「진입점 없음」 단언이 있으면 이 조각이 뒤집은 것이므로 단언을 새 사실로 고친다)

**Checkpoint**: 설정 → 개발자 화면이 열리고 모듈 줄이 보인다. 배포에서도 열리고 진단은 없다.

---

## Phase 5: User Story 3 — 모듈을 다시 받는다 (Priority: P2)

**Goal**: 「모듈 다시 받기」 → 받을 것이 없으면 토스트, 있으면 확인(모바일일 때만 용량 문구) → 쓰는 중인 홈을 멈추고 → 다운로드 진행 화면. 파일을 지우지 않는다.

**Independent Test**: `planRedownload`·`readConnection`을 대역으로 돌려 갈래·`cellularSize`·받을 양을 보고, 화면 테스트로 대화상자·토스트를 본다(spec US3).

### Tests

- [ ] T029 [P] [US3] RD5·RD7 테스트를 `__tests__/app/network-port.test.ts`에 쓴다 — `expo-network`를 `jest.mock`으로 갈아끼워 `readConnection()`이 `WIFI`→`"wifi"`, `CELLULAR`→`"cellular"`, `ETHERNET`·`VPN`·`BLUETOOTH`·`OTHER`·`NONE`·`UNKNOWN`→`"other"`, `getNetworkStateAsync`가 던지면 `"unknown"`; 소스 계약: `src/` 전체에서 `expo-network`를 import하는 파일은 `network-port.ts` 하나이고 지연 `import()`다(jest `logic`에서 네이티브 모듈이 안 열리게), `package.json`에 `expo-network`가 있다. 실패 확인
- [ ] T030 [P] [US3] RD1~RD4·RD6 테스트를 `__tests__/app/redownload-plan.test.ts`에 쓴다 — 대역 `facts`·`expectedBytes`·`bytesUsed`·`readConnection`으로: 전부 준비면 `{kind:"nothing"}`이고 `readConnection`이 안 불림(RD1); 하나라도 빠졌고 연결이 `cellular`면 `{kind:"confirm", cellularSize: formatModuleBytes(합)}`(RD2); `wifi`·`other`·`unknown`·읽다 던짐이면 `confirm`이고 `cellularSize === null`(RD3); 받을 양 = 준비 안 된 키마다 `max(0, expected − used)`의 합, `bytesUsed`가 던지는 키는 `expected` 전체(RD4); 소스 계약: `redownload-plan.ts`·`network-port.ts`에 `remove(`·`.delete(`·`removeAll`·`unlink` 어휘가 없다(주석 제거 뒤, RD6·037). 실패 확인
- [ ] T031 [P] [US3] 다시 받기 화면 테스트를 `__tests__/ui/developer-redownload.test.tsx`에 쓴다 — `DeveloperScreen`에 `redownloadDialog`(대화상자 상태 `null | { cellularSize: string | null }`)·`onConfirmRedownload`·`onCancelRedownload` props를 더한 계약: `developer-redownload`를 누르면 `onRedownload`가 불리고(대화상자는 부모 상태가 연다), 상태가 `{cellularSize:"1.2GB"}`면 050 `ConfirmDialog`가 제목 「모듈을 다시 받을까요?」·본문 「모바일 데이터로 1.2GB를 받아요.」·「받기」·「취소」, `null`이면 본문 「빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.」; 「취소」·뒤로 가기는 `onCancelRedownload`만, 덮개 탭은 닫지 않는다(050); 「받기」는 `onConfirmRedownload`. 포털은 `__tests__/ui/render-with-portal.tsx`. 실패 확인
- [ ] T032 [P] [US3] `stopHome` 추출이 058 동작을 안 바꾸는지의 소스 계약을 `__tests__/app/app-wipe-source.test.ts`에 더한다 — `App.tsx`에 `stopHome`이 정의돼 있고 `requestWipe`와 다시 받기 확정 핸들러가 둘 다 `stopHome`을 부르며, `requestWipe`의 순서(`stopHome` → `wipeDiaries`)가 058 계약대로다(기존 단언 그대로 초록 + 새 단언). 실패 확인

### Implementation

- [ ] T033 [P] [US3] `src/app/network-port.ts`를 만든다(R5) — `type Connection = "wifi" | "cellular" | "other" | "unknown"`, `readConnection(): Promise<Connection>`(`await import("expo-network")` → `getNetworkStateAsync()`; 타입 매핑은 위 계약; 던지면 `"unknown"`). T029 초록
- [ ] T034 [US3] `src/app/essential-assets-port.ts`에 `readRemainingBytes(): Promise<number | "unknown">`(또는 `{ remaining: number } | null`)를 더한다 — 준비 안 된 키마다 `max(0, expectedBytes − bytesUsed)`의 합을 구하되 `bytesUsed`가 던지는 키는 그 키의 `expectedBytes` 전체로 센다. `expectedBytes`는 이 파일 안에서만 로스터(`assetFor`·`visionAssets`)에서 얻는다(BR4 — 화면으로 안 나간다). `essential-assets-port.test.ts` 기존 단언 초록 + 새 단언
- [ ] T035 [US3] `src/app/redownload-plan.ts`를 만든다(R3·R5) — `planRedownload({ readFacts, readRemainingBytes, readConnection })`가 `RedownloadPlan`을 준다. `essentialAssetsReady(facts)`면 `nothing`(연결을 읽지 않는다), 아니면 연결을 읽고(`"cellular"`일 때만) `formatModuleBytes(remaining)`를 `cellularSize`에 담는다. T030 초록
- [ ] T036 [US3] `App.tsx`에서 `requestWipe`의 「토큰을 올리고 홈이 멈출 때까지 기다림」(058, `wipeWaiter`·`wipeTokenRef`·`setWipeRequest`) 부분을 `stopHome(): Promise<void>`로 뽑고 `requestWipe`가 그것을 부르게 한다(동작 불변 — `home-wipe.test.tsx`·`app-wipe-source.test.ts` 058 단언 초록). T032 초록
- [ ] T037 [US3] `App.tsx`에서 다시 받기를 잇는다 — `AppFrame` 상태 `redownloadDialog: null | { cellularSize: string | null }`와 토스트 상태(US1의 `DeveloperToast` 하나를 개발자 겹에도 그린다 — 토스트 상태를 `AppFrame`으로 올려 설정·개발자 겹이 같은 것을 쓴다). `onRequestRedownload`: `planRedownload`(통로: `onboardingPorts.essentialAssets`·`readConnection`) → `nothing`이면 토스트 `allReady`, `confirm`이면 `setRedownloadDialog({ cellularSize })`; `planRedownload` 자체가 던지면(사실을 못 읽음) 「다 있다」로 세지 않고 `confirm`(`cellularSize: null`)으로 다룬다(원칙 V). `onConfirmRedownload`: 대화상자를 닫고 `await stopHome()` → `await onRedownload()`(055 기존 함수 — ref·완료 확인을 되돌린 뒤 필수 모듈을 다시 읽는다) → `goHome()`. `DeveloperScreen`에 `redownloadDialog`·`onRedownload={onRequestRedownload}`·`onConfirmRedownload`·`onCancelRedownload`를 내려 준다(T031). 이 경로에 모듈 파일을 지우는 호출이 없다(RD6 — 코드로 확인하고 PR 설명에 적는다). T031 초록·`npm run test:ui`·`npm run lint` 초록

**Checkpoint**: 모듈 다시 받기가 확인 → 진행 화면으로 이어지고 받을 것이 없으면 토스트.

---

## Phase 6: User Story 4 — 온보딩부터 다시 본다 (Priority: P2)

**Goal**: 「온보딩부터 다시」 → 로고 → 권한 안내가 다시 나오고 끝나면 홈. 일기·이름·설정·모듈은 그대로. **죽어 있는 `forceOnboarding` 경로를 고친다(R7).**

**Independent Test**: 게이트 판정을 순수 함수로 떼어 갈래를 잠그고, 소스 계약으로 핸들러가 세 상태를 모두 건드리는지 본다.

### Tests

- [ ] T038 [P] [US4] OB1·OB2 테스트를 `__tests__/app/onboarding-gate.test.ts`에 쓴다 — `onboardingGateNeeded({ completed, force, decidedThisSession })`: `completed=true`·`force=true`·`decidedThisSession=false` → `true`(고친 갈래); `completed=true`·`force=false` → `false`; `completed=false`·`decidedThisSession=false` → `true`; `decidedThisSession=true` → 항상 `false`; `completed=null`(아직 못 읽음)은 호출 전에 걸러지므로 타입으로 막는다(`boolean`만). 그리고 `permissionStepsDecided(...)` 파생도 같은 파일에서: `completed=true`·`force=true`·`decidedThisSession=false` → `false`, `completed=true`·`force=false` → `true`. 실패 확인(파일 없음)
- [ ] T039 [P] [US4] OB3·OB4 소스 계약을 `__tests__/app/app-onboarding-replay-source.test.ts`에 쓴다 — 주석 제거한 `App.tsx`에서: 「온보딩부터 다시」 핸들러(`onReplayOnboarding`) 본문이 `stopHome(`을 부른 **뒤에** `setForceOnboarding(true)`·`setPermissionStepsDecidedThisSession(false)`·`setOnboardingStarted(false)`를 모두 부르고 `goHome(`도 부른다; `onAllPermissionStepsDecided`가 `setForceOnboarding(false)`를 부른다; `onReplayOnboarding` 본문에 `removeAll`·`saveCustomNames`·`saveAutoDiarySettings`·`.remove(`·`.delete(`가 없다. 실패 확인

### Implementation

- [ ] T040 [US4] `src/app/onboarding-gate.ts`를 만든다 — `permissionStepsDecided({ decidedThisSession, completed, force })`(= `decidedThisSession || (completed === true && !force)`)와 `onboardingGateNeeded({ completed, force, decidedThisSession })`(= `(completed !== true || force) && !decidedThisSession`) 순수 함수. 주석에 R7: 옛 식(`|| completed === true`)이 `force`를 죽였다. T038 초록
- [ ] T041 [US4] `App.tsx`의 `permissionStepsDecided`·`onboardingGateNeeded` 계산을 `onboarding-gate.ts` 호출로 바꾸고(`onboardingFlag === null` 이전 반환은 그대로), `onAllPermissionStepsDecided`에 `setForceOnboarding(false)`를 더하며, `onReplayOnboarding` 핸들러(`useCallback`, `async` — `await stopHome()`(T036) 뒤 `setForceOnboarding(true)`·`setPermissionStepsDecidedThisSession(false)`·`setOnboardingStarted(false)`·`goHome()`)를 만들어 `DeveloperScreen`의 `onReplayOnboarding`에 잇는다. 주석의 「설정 "권한" 섹션의 [온보딩 다시 하기]가 켠다」를 「개발자 화면의 「온보딩부터 다시」가 켠다」로 고친다. T039 초록·`npm run test:logic`·`npm run lint` 초록

**Checkpoint**: 「온보딩부터 다시」가 로고부터 권한 단계를 다시 보인다(실기기는 Phase 10).

---

## Phase 7: User Story 5 — 개발자 메뉴를 끈다 (Priority: P2)

**Goal**: 「개발자 메뉴 끄기」 → 설정으로 돌아가고 행이 사라진다. 배포는 파일을 지우고 개발 환경은 그 실행 동안만.

### Tests

- [ ] T042 [P] [US5] OF1~OF3 테스트를 `__tests__/ui/developer-off.test.tsx`에 쓴다 — 작은 조립 하니스(`useDeveloperMenu` + `SettingsScreen` + `DeveloperScreen`을 부모 상태로 묶은 테스트 컴포넌트; `App.tsx` 전체가 아니다)로: 「개발자 메뉴 끄기」를 누르면 `onDisable`이 불리고 `developerEnabled`가 거짓이 되어 `settings-developer`가 사라진다(OF1); 배포 환경 끄기는 통로 `remove`가 불리고 개발 환경 끄기는 `read`·`write`·`remove`가 모두 안 불린다(OF2); 끈 뒤 같은 하니스에서 버전을 7번(탭 사이 1초 이내, 가짜 타이머) 누르면 다시 켜진다(OF3). 소스 계약: `App.tsx`의 끄기 핸들러가 `disable()` 호출 뒤 `setRoute("settings")`를 부른다(끄고 난 뒤 개발자 겹이 남지 않는다 — Edge Case). 실패 확인

### Implementation

- [ ] T043 [US5] `App.tsx`에 끄기를 잇는다 — `onDisableDeveloper`(`useCallback`): `disable()`(T016의 훅) 뒤 `setDiagnosing(false)`(US6 이전이면 이 줄은 US6 태스크에서 더한다)·`setRoute("settings")`. `DeveloperScreen`의 `onDisable`에 잇는다. 개발자 겹의 `open`이 `developerEnabled`를 보므로 끈 순간 겹이 닫히는 움직임을 탄다(`onSettled`로 `layersMounted.developer`가 풀리는 동안 홈은 `covered`로 남는다 — 055 규칙). T042 초록

**Checkpoint**: 켜기 → 끄기 → 다시 켜기 한 바퀴가 돈다.

---

## Phase 8: User Story 6 — 개발 환경에서 진단에 들어간다 (Priority: P3)

**Goal**: 개발 환경의 「진단」 행 → 기존 `DiagnosticsScreen` 한 겹 더 → 뒤로 가면 개발자 화면.

### Tests

- [ ] T044 [P] [US6] DG1·DG2·BD3 테스트를 `__tests__/ui/developer-diagnostics.test.tsx`와 `__tests__/app/app-developer-source.test.ts`에 쓴다 — 소스 계약(주석 제거한 `App.tsx`): `DiagnosticsScreen` import·JSX가 한 자리뿐이고 그 `StackLayer`의 `open`이 `showsDiagnostics`를 포함하며 렌더 조건도 `showsDiagnostics`다; `showsOnScreen(`을 부르는 곳이 `App.tsx`에 한 곳; `DeveloperScreen.tsx`가 `DiagnosticsScreen`을 import하지 않는다(T021와 중복되지 않게 여기서는 `App.tsx`만). 화면: 개발 환경 하니스에서 `developer-diagnostics`를 누르면 `diagnosing`이 켜지고 뒤로 가기가 그것을 끈다(`DeveloperScreen`의 `onOpenDiagnostics` 연결). 실패 확인

### Implementation

- [ ] T045 [US6] `App.tsx`에 진단 겹을 더한다(R8) — `AppFrame` 상태 `diagnosing: boolean`, 개발자 겹 `active={!diagnosing}`, 그 아래(JSX 순서상 개발자 겹 뒤)에 `<StackLayer onClose={() => setDiagnosing(false)} open={showsDiagnostics && diagnosing}>` + `SettingsFrame`(`backLabel={DEVELOPER_TEXT.diagBack}`, `onBack`, `title={DEVELOPER_TEXT.diag}`, `backTestID="back-to-developer"`) + `<DiagnosticsScreen characterNames={customNames} />`(035 호칭 주석 그대로 옮긴다). 개발자 겹이 닫히거나 메뉴가 꺼지면 `diagnosing=false`(T043의 끄기 핸들러에 `setDiagnosing(false)` 추가). `DeveloperScreen`의 `onOpenDiagnostics={() => setDiagnosing(true)}`(배포에서는 행이 없으므로 `showsDiagnostics`일 때만 넘긴다). T044 초록·`npm run test:ui`·`npm run lint` 초록

---

## Phase 9: User Story 7 — 걷은 옛 화면과 막힌 실기기 흐름 정리 (Priority: P3)

**Goal**: 쓰는 곳 없는 옛 화면·테스트를 지우고 Maestro 열한 흐름을 하나씩 되살리거나 폐기한다.

- [ ] T046 [US7] **지우기 전에 읽는다**(R9) — `grep -rn "CharacterListScreen\|PermissionsSection\|AuthorPicker\|CharacterPicker\|ListRow\|SelectRow" src __tests__ scripts App.tsx`로 import·참조를 전부 뽑고, 각 테스트 파일(`__tests__/ui/character-list*.test.tsx`·`author-picker.test.tsx`·`permissions-section.test.tsx`·`character-picker.test.tsx`·`list-row.test.tsx`·`select-row.test.tsx`·`enduser-screen-migration.test.tsx`·`press-feedback.test.tsx`·`settings-stack.test.tsx`·`character-name-flow.test.ts`·`__tests__/diary/character-name.test.ts`·`__tests__/models/boundaries.test.ts`·`__tests__/scripts/check-constitution.test.ts`)이 **이 화면들 말고 살아 있는 부품·규칙의 단언도 함께 담는지** 표로 정리해 `specs/059-developer-menu/research.md` 끝에 「R9 결과」 절로 남긴다(파일별: 통째로 삭제 / 일부 단언만 삭제 / 단언을 살아 있는 화면으로 옮김). 삭제 대상 확정 전 아무것도 지우지 않는다
- [ ] T047 [US7] T046의 표대로 지운다 — `src/ui/CharacterListScreen.tsx`·`PermissionsSection.tsx`·`AuthorPicker.tsx`·(쓰는 곳이 사라졌다면) `CharacterPicker.tsx`·`components/ListRow.tsx`·`components/SelectRow.tsx`와 해당 테스트(통째로 삭제하는 것만), 일부 단언만 담은 파일은 그 단언만 지우거나 살아 있는 화면의 테스트로 옮긴다. `scripts/constitution-rules.ts`·`src/diary/persona.ts`·`src/ui/OnboardingScreen.tsx`·`src/ui/theme/tokens.ts`의 옛 화면 이름 주석은 사실대로 고친다(규칙 자체는 `src/ui/` 경계라 불변). **`tsc`가 변경 대상을 전부 짚는다**(`npx tsc --noEmit` 0 오류). CL1 소스 계약(`__tests__/app/app-developer-source.test.ts` 끝에): 삭제한 이름의 import가 `src/`·`__tests__/`·`scripts/`에 없다(주석 제외)
- [ ] T048 [US7] 위반 주입으로 헌법 검사가 같은 위반을 여전히 잡는지 본다(CL2) — `src/ui/DeveloperScreen.tsx` 맨 위에 `import { ESSENTIAL_ASSET_KEYS } from "../onboarding/essential-assets";`를 넣고(치환이 적용됐는지 먼저 단언) `npm run lint`(또는 `npx tsx scripts/check-constitution.mts`)가 `UI_TOUCHES_ASSET`로 실패하는지 확인, 되돌리고 원래 문자열이 돌아왔는지 `grep`으로 다시 확인. 같은 방식으로 `use-developer-menu.ts`에 `process.env` 한 줄(BD2 — 테스트가 잡는가). 결과를 `specs/059-developer-menu/quickstart.md`의 「실기기 결과」 위에 한 줄로 적는다
- [ ] T049 [US7] Maestro 열한 흐름을 하나씩 읽고 확정한다(R10 기준, 계약 FL1) — `.maestro/skeleton.yml`·`prompt-preview.yml`·`diary-body-screen.yml`·`scheduled-diary-notification.yml`은 새 진입(`home-settings` → `settings-developer` [→ `developer-diagnostics`], 개발 환경은 7번 탭 불필요)으로 `id:`를 써서 고친다(`home-menu-button`·`home-menu-developer` 단계를 걷고, 진단 화면에서 `scrollUntilVisible`로 올린다; 머리 주석의 「FLOWS 밖」 문장을 지운다); `model-acquisition`·`diary-character-select`·`diary-user-path`·`download-conflict`·`parallel-model-download`·`photo-vision`·`welcome-naming`은 검증 대상이 제품에서 사라졌는지 확인하고 파일을 지운다(확인 결과를 한 줄씩 `scripts/run-device-tests.mjs` 맨 위 FLOWS 주석에 사유로 남긴다 — 「폐기: <흐름> — <검증 대상이 사라진 이유>」). 읽어 보니 되살릴 수 있다고 판단되면 R10의 잠정 판정을 뒤집고 이유를 적는다. `scripts/run-device-tests.mjs`의 `FLOWS`에 되살린 흐름을 등록하고 「051이 `⋯` 메뉴를 없앤 뒤…」 주석을 새 사실로 고친다(**등록하지 않으면 파일이 있어도 아무것도 검증되지 않는 초록불이다**)
- [ ] T050 [US7] 되살린 흐름을 실기기에서 한 번씩 돌린다(FL2) — **Phase 10의 빌드·설치 뒤에 한다.** `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client` Metro → `npm run test:device -- .maestro/skeleton.yml` 등. 통과/실패·실패면 원인을 quickstart 「실기기 결과」에 적는다. 실패하는 흐름은 고치거나, 고칠 수 없으면 FLOWS에서 빼고 사유를 적는다(건너뛴 것은 통과가 아니다)

---

## Phase 10: Polish & 실기기

- [ ] T051 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 돌려 통과를 확인한다. prettier가 포맷을 바꾸면 `npx prettier --write`로 맞추고 다시 돌린다. 실패를 숨기지 않는다
- [ ] T052 dev 빌드를 새로 만든다(**새 네이티브 모듈 `expo-network`**) — quickstart의 순서: `npx expo prebuild --platform android --clean` → `cd android && ./gradlew assembleDebug`(Metro는 빌드가 끝난 뒤에 띄운다) → `adb install -r`(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`이면 **중단**하고 저장소 소유자에게 묻는다 — `uninstall`·`pm clear` 금지) → `dumpsys package`의 `requested permissions`에 `ACCESS_NETWORK_STATE`가 있는지 확인(빌드 성공이 매니페스트가 맞다는 뜻이 아니다). `android/`는 gitignore된 생성물이다
- [ ] T053 quickstart의 dev 실기기 0~7을 순서대로 한다 — **백업(0)을 눈으로 확인하기 전에는 1 이후를 하지 않는다.** 모듈 파일을 지우는 경로인지 먼저 코드로 확인했다는 사실을 3 앞에 한 줄로 적는다. 모듈을 일부러 자르는 칸은 저장소 소유자 승인 뒤에만(승인이 없으면 「미확인」으로 적는다). 휴대폰이 잠기면 저장소 소유자에게 잠금 해제를 부탁한다. 설정 값을 바꾸기 전에는 원래 값을 읽어 둔다. 끝나면 복원(6)·Metro와 8081 node 프로세스 정리. 결과를 `quickstart.md`의 「실기기 결과」에 날짜·기기·관측으로 적는다(미확인은 미확인으로)
- [ ] T054 `AGENTS.md`를 사실대로 고친다 — 「저장소의 현재 상태」의 설정·개발자 화면 개편 문단(개발자 메뉴 조각 완료·진단·상태 흉내는 아직)과 「055」의 「캐릭터 목록·작성자 고르기·`PermissionsSection`을 설정 조립에서 걷었다(파일·자기 테스트는 남겼다 — 정리는 개발자 메뉴 조각)」를 「059가 지웠다」로, 「Maestro」의 「FLOWS 밖」 문단을 새 사실로, 「059 — 개발자 메뉴」 절을 058 다음에 더한다(**지금도 유효한 결론만**: 켜짐은 별도 파일·개발 환경은 환경이 이김·`forceOnboarding`이 죽어 있던 원인과 `onboarding-gate.ts`·다시 받기가 파일을 지우지 않는 이유·`expo-network`는 `"cellular"`만 모바일로 보는 이유·`loaded`는 파일 준비 상태·실기기 관측과 미확인 잔여·`stopHome` 추출). 이력 나열이 아니라 결론으로. 앞 절이 뒤집힌 곳은 덧대지 않고 고친다
- [ ] T055 스펙 「미확인 잔여」를 `specs/059-developer-menu/spec.md` 끝 `## 미확인 잔여` 절에 한 줄씩 적는다 — release 빌드에서 개발자 메뉴·`expo-network`(R8 minify OFF라 가능성 낮음, 확인 안 함), 24시간 형식·큰 글꼴 2.0배의 개발자 화면, 모듈을 일부러 자른 다시 받기 실기기(승인 없으면), `loaded` 어휘와 메모리 적재의 어긋남, 058 「지우기」 버튼 색(저장소 소유자 확인 대기)

---

## Dependencies & Execution Order

- **Phase 1 → 2 → 이야기들**. Phase 2(T003~T008)는 모든 이야기의 전제.
- **US1(P1)** 먼저(MVP). **US2**는 US1의 `route === "developer"`로 가는 길(T019) 위에 선다(T028가 T019 뒤). **US3**은 US2의 `DeveloperScreen`(T026)과 App 조립(T028) 뒤. **US4·US5·US6**은 `DeveloperScreen`과 App 조립(T028) 뒤에서 서로 독립이다(T043의 `setDiagnosing`은 US6 뒤에 완성).
- **US7(정리)** 는 코드 이야기들이 끝난 뒤(T046이 `settings-stack.test.tsx` 등 T028가 고친 테스트를 읽는다). T050은 T052 뒤.
- **US4는 US3의 `stopHome` 추출(T036)에 기댄다**(`onReplayOnboarding`이 먼저 홈을 멈춘다). US5·US6은 US3·US4와 독립이다.
- 같은 파일을 만지는 태스크는 순서대로: `App.tsx`(T019 → T028 → T036 → T037 → T041 → T043 → T045), `SettingsScreen.tsx`(T017 → T026의 export 변경), `__tests__/ui/settings-screen.test.tsx`(T013).

### Parallel Opportunities

- Phase 2: T005·T006·T008 서로 [P](T003→T004는 순서).
- US1 테스트 T009~T013 전부 [P], 구현 T014·T015 [P].
- US2 테스트 T020~T022 [P], T025 [P].
- US3 테스트 T029~T032 [P], 구현 T033 [P].
- US4 테스트 T038·T039 [P].

## Implementation Strategy

1. **MVP**: Phase 1·2 + US1(T009~T019) — 배포 환경에서 켜는 길까지. 이 시점에 `npm test`·`npm run lint`가 초록이어야 한다.
2. **US2** 로 개발자 화면을 연다(진입이 생겼다). 이후 US3~US6은 독립 증분 — P2(US3·US4·US5) → P3(US6).
3. **US7** 정리는 마지막(다른 이야기의 테스트 수정과 겹치지 않게).
4. **Phase 10**: `npm test`·`lint` → 새 네이티브 모듈 빌드 → quickstart 실기기(백업 먼저) → AGENTS·스펙 문서 갱신. 실기기 결과 없이 「완료」라고 말하지 않는다(원칙 V).
