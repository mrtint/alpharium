# Tasks: 제자리 쓰기 — 쓰는 동안 홈을 떠나지 않는다

**Input**: `specs/054-in-place-writing/` — [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [contracts/writing-in-place.md](contracts/writing-in-place.md)(W1~W16), [contracts/failure-toast.md](contracts/failure-toast.md)(T1~T14), [research.md](research.md)(R1~R9), [quickstart.md](quickstart.md)

**Tests**: 이 저장소는 「계약 → 테스트 먼저」다(헌법 「개발 방식」). 각 스토리의 계약 테스트를 구현보다 먼저 쓰고 **실패하는 것을 확인한 뒤** 구현한다. jest는 움직임(페이드·슬라이드·쓸어 닫기)을 못 잡으므로 실기기 검증 태스크를 따로 둔다(원칙 V).

**Format**: `- [ ] T### [P?] [US?] 설명 (파일 경로)` — `[P]`는 다른 파일이고 미완료 태스크에 의존하지 않는다.

**RNTL 14**: `render`·`fireEvent`·`rerender`는 모두 `await`. `.ts`는 logic, `.tsx`는 ui 프로젝트(확장자가 프로젝트를 가른다). Python으로 파일을 쓸 땐 `newline=""`(CRLF 함정).

## Phase 1: Setup

- [ ] T001 [P] `src/ui/home-text.ts`에 `WRITING_TEXT`를 더한다: `kicker: "쓰는 중"`, `stop: "그만두기"`, `byline(name)`(`{이름}{이/가} 쓰고 있어요. 진행률은 세지 않아요.` — 조사는 `src/diary/particle.ts`의 `particleFor`), `fallback: "쓰고 있다"`(첫 진행 신호 전, 지금 값 유지). 보드 KO 원문 글자 그대로(spec FR-002·005·006·008)
- [ ] T002 [P] `src/ui/theme/tokens.ts`에 `WRITING`과 `TOAST`를 더한다(data-model §5 값 그대로): `WRITING = { stripLockedOpacity: 0.35, paperPadding: { top: 32, horizontal: 20, bottom: 120 }, gap: 14, kicker: { fontSize: 11, fontWeight: "600", letterSpacing: 1.1 }, monologue: { fontSize: 24, fontWeight: "700", lineHeight: 32.4, letterSpacing: -0.24 }, byline: { fontSize: 13, lineHeight: 19.5 }, rotateMs: 4000, fadeMs: 250 }`, `TOAST = { inset: 12, gapAboveBar: 12, minHeight: 48, padding: { vertical: 12, horizontal: 16 }, fontSize: 14, fontWeight: "600", lineHeight: 19.6, marker: 6, markerGap: 10, shadow: { offsetY: 8, blur: 24, opacity: 0.18 }, showMs: 3000, fadeOutMs: 200, enterMs: 240 }`. **쓸어 닫기 문턱은 여기 두지 않는다**(정본은 T005의 `failure-toast.ts` 한 곳 — `src/app`이 `src/ui`를 import하지 않게). 색은 넣지 않는다(`COLORS`만 — C5)
- [ ] T003 `src/ui/components/FadeLayer.tsx`를 만든다 — `src/ui/DiaryListScreen.tsx`의 `FadeLayer`(마운트할 때의 투명도 `from`에서 `to`로 `CROSSFADE_MS` 동안, 다시 쓰려면 `key`를 바꾼다, `pointerEvents="none"`)를 **그대로 옮겨** export하고 `DiaryListScreen.tsx`가 그것을 import하게 한다(동작 무변경, `CROSSFADE_MS`는 duration 인자로 받는다). `__tests__/ui/press-feedback.test.tsx`의 「`src/ui/components/` 파일 수」 기대와 `__tests__/jest-projects.test.ts`의 파일 수 세기를 함께 갱신한다(T027에서 `TypewriterText` 삭제 시 다시 맞춘다)

## Phase 2: Foundational (모든 스토리가 기대는 판정과 상태 모양)

**⚠️ 이 단계가 끝나야 스토리 작업을 시작한다.**

- [ ] T004 [P] `__tests__/app/failure-toast.test.ts`(logic)를 쓴다 — 계약 T1~T7. (a) 파이프라인 단계(`day-not-closed`·`already-running`·`signals`·`request-build`·`model-not-ready`·`vision`·`generation`·`storage`)와 `generation`·`vision`의 이유 종류(`not-implemented`·`backend-unavailable`·`model-load-failed`·`rejected`·`timed-out`·`interrupted`·`generation-failed`·`vision-failed: not-ready|cancelled|failed`)를 **표로 나열해 하나씩** `toastKindFor` 결과를 확인(단계 수·종류 수를 직접 센다), (b) 모르는 kind·단계는 `retry`이고 던지지 않는다, (c) `TOAST_TEXT` 다섯 문구를 KO 원문으로 잠근다(`retry` = 보드 `m.failToast` 「일기를 쓰지 못했어요. 다시 써 볼 수 있어요.」), (d) `retry` 외 갈래 문구에 「다시 써 볼 수 있어요」가 없고 어떤 문구에도 `:`·숫자·모델 이름이 없다, (e) 소스를 `readFileSync`해 주석을 걷어낸 뒤 한국어 문구로 `reason`을 비교하는 `includes("…")`가 없음을 확인, (f) `shouldDismissToast` 경계값 23·24·499·500과 위·제자리
- [ ] T005 `src/app/failure-toast.ts`를 만든다(순수 — `Date`·`setTimeout` 없음). `ToastKind = "retry" | "prepare-character" | "prepare-vision" | "plain" | "save"`, `toastKindFor(result: PipelineFailure): ToastKind`(research R5 표; `generation`·`vision`의 `reason`은 `:` 앞 토큰과 `vision-failed`의 detail만 본다), `TOAST_TEXT: Readonly<Record<ToastKind, string>>`(contracts/failure-toast.md T4 문구 그대로), `shouldDismissToast(translationY, velocityY)`(문턱은 이 파일이 자기 안에 export하는 `TOAST_SWIPE = { distance: 24, velocity: 500 }` — 정본 한 곳, `tokens.ts`·화면은 값을 복제하지 않고 이 함수만 부른다). 그 뒤 T004가 초록
- [ ] T006 [P] `__tests__/app/state.test.ts`(logic)를 고친다 — 계약 W1·W14·W15: (a) `toWriting(items)`가 `{ kind: "writing", items }`를 만든다, (b) `startWriting(prompt, items)`가 덮어쓰기가 아니면 `writing`(items 포함), 덮어쓰기면 `confirm-overwrite`, `confirmOverwrite(items)`가 `writing`, (c) `afterGeneration`이 성공이면 `{ kind: "home" }`, 실패면 `{ kind: "toast", toast }`(갈래는 `toastKindFor` 결과), **저장 실패(`entry` 있음)도 `toast: "save"`이고 `unsaved`가 어디에도 없다**, (d) 소스를 `readFileSync`해 주석을 걷어낸 뒤 `unsaved`·`entry`·`text`·`body` 필드가 `AppScreen`·`writing` 선언에 없음을 확인(S1 정신 — `items`는 목록 요약뿐). 기존 `unsaved`를 기대하는 케이스를 지운다
- [ ] T007 `src/app/state.ts`를 고친다(data-model §1): `AppScreen`의 `writing`에 `items: DiaryListItem[]`를 더하고, `unsaved` 갈래와 그 주석을 지우고, `toWriting(items)`·`startWriting`·`confirmOverwrite(items)`가 `items`를 넘기게 하고, `AfterGeneration`을 `{ kind: "home" } | { kind: "toast"; toast: ToastKind }`로 바꿔 `afterGeneration`이 `toastKindFor`를 쓰게 한다. `failed`·`toFailed`는 **유지**(쓰기 시작 전 `no-ready-character` 전용, FR-024 — 주석에 그 사실을 적는다). `describeStage` 호출은 `afterGeneration`에서 빠지므로 `src/app/failure-text.ts`의 쓰이지 않게 된 export가 있으면 grep으로 사용처를 확인해 정리한다(`GenerationProbe.tsx`가 쓰면 남긴다). 그 뒤 T006이 초록, `tsc`가 짚는 나머지(`DiaryHomeScreen`의 `unsaved` 처리·`WRITTEN_DAY_TEXT.unsaved` 사용처)는 T008·T017에서 처리
- [ ] T008 [P] `src/ui/home-text.ts`에서 `WRITTEN_DAY_TEXT.unsaved`(임시 결과 화면 문구)를 지운다 — `__tests__/ui/home-text.test.ts`의 그 문구 기대와 `__tests__/ui/written-day-home.test.tsx`·`__tests__/ui/written-day-reach.test.ts`의 `unsaved` 갈래 케이스를 함께 지운다(사용처는 grep `unsaved`로 확인, 이 스펙이 정한 대로 임시 결과 화면은 없다)

**Checkpoint**: `npm run test:logic -- failure-toast state home-text`가 초록이고, `tsc`가 `DiaryHomeScreen.tsx`의 `unsaved` 잔재만 남긴다(다음 단계에서 해소).

## Phase 3: User Story 1 — 쓰는 동안 홈을 떠나지 않는다 (P1) 🎯 MVP

**Goal**: 「일기 쓰기」를 누르면 화면 전환 없이 헤더 「쓰는 중」(빨강)·잠긴 스트립·혼잣말 영역·검정 「그만두기」 바가 보이고, 진행률·시간이 없다.

**Independent Test**: 안 쓴 날에서 쓰기를 시작해 W2~W8을 본다(quickstart D1·D2). 그만두기·토스트가 없어도 이 스토리만으로 「홈 안에서 쓴다」가 성립한다.

### 테스트 먼저

- [ ] T009 [P] [US1] `__tests__/ui/writing-in-place.test.tsx`(ui)를 쓴다 — 계약 W2~W8. `DiaryListScreen`에 `writing={{ line, name }}`를 준 렌더에서: (W2) KO 원문 — 헤더 상태 줄 `쓰는 중`·머리말 `쓰는 중`·안내 줄 `금동이가 쓰고 있어요. 진행률은 세지 않아요.`(받침 없는 이름 「루이」는 「루이가」, 받침 있는 이름은 「이」)·바 `그만두기`, (W3) 상태 줄 색이 `COLORS.accent`이고 `dayStateText`·제목이 없다, (W4) 스트립 컨테이너 `opacity 0.35`·`pointerEvents="none"`·접근성 숨김이고 칸을 눌러도 `onSelectDay`가, `onSwipe`가 불리지 않는다, (W5) `home-date-button`·`home-date-weekday`를 눌러도 `onPressDate`가 불리지 않는다(없거나 `onPress`가 없다) — `writing`이 없을 땐 050대로 눌린다, (W6) 안쪽 여백 32/20/120·간격 14·머리말→혼잣말→안내 줄 순서, (W7) 트리에 숫자·`%`·`ActivityIndicator`가 없고 `DiaryHomeScreen.tsx`·`WritingPaper.tsx`·`DiaryListScreen.tsx` 소스(주석 걷어낸 뒤)에 `ActivityIndicator`·`TypewriterText` import가 없다, (W8) `stop-button`이 있고 `write-button`이 없다·배경 `COLORS.text`·글자 `COLORS.bg`·최소 높이 64. 이 시점엔 실패해야 한다
- [ ] T010 [P] [US1] `__tests__/ui/diary-home.test.tsx`를 고친다 — 쓰는 중 관련 기존 케이스(`쓰고 있다` 회전 표시·`그만두기` 링크·타자기)를 새 계약(W2·W7)으로 바꾸고, 옛 임시 결과 화면 케이스(`unsaved-screen`·「← 일기」로 돌아가기)를 지우고(새 계약은 T019), **`writing` 동안 목록이 안 사라진다**(헤더·스트립이 그대로 그려진다)·쓰는 중에도 고른 날이 불변임을 더한다. 쓰기 진입은 `write-button`으로 누른다(글자 아님, 051)

### 구현

- [ ] T011 [P] [US1] `src/ui/WritingPaper.tsx`를 만든다 — props `{ line: string | undefined; name: string | undefined }`. 순서: 머리말(`WRITING_TEXT.kicker`, `WRITING.kicker`, `COLORS.accent`) → 혼잣말(`line ?? WRITING_TEXT.fallback`, `WRITING.monologue`, `COLORS.text`) → 안내 줄(`name`이 있으면 `WRITING_TEXT.byline(name)`, `WRITING.byline`, `COLORS.textMuted`; 이름이 없으면 줄을 그리지 않는다). 안쪽 여백 `WRITING.paperPadding`, 간격 `WRITING.gap`, 배경 `COLORS.bg`. 혼잣말 자리의 페이드 교체는 T025에서 더한다(지금은 정적). `testID`: `writing-paper`·`writing-monologue`·`writing-byline`
- [ ] T012 [US1] `src/ui/DiaryListScreen.tsx`에 `writing` 모드를 더한다(T009 초록이 목표) — props에 `writing?: { line?: string; name?: string }`, `onStop?: () => void`를 더한다. `writing`이 있으면 쓴 날 분기·안 쓴 날 분기보다 **먼저** 다음을 그린다: `ROOT` 안에 `FIXED_HEADER`(헤더) + `WritingPaper` + `StopBar`(같은 파일 안 작은 컴포넌트 — `BAR` 스타일을 재사용, 배경 `COLORS.text`, 글자 `COLORS.bg`, `BAR_TEXT`, 문구 `WRITING_TEXT.stop`, `testID="stop-button"`, `accessibilityRole="button"`, 누르면 `onStop`) — 바는 `REWRITE_SLOT`처럼 바닥에 절대 배치. `Header`에 `writing` 여부를 넘겨 상태 줄 자리에 `WRITING_TEXT.kicker`(13/600 `COLORS.accent`, `testID="home-day-state"` 유지)를 그리고 제목은 그리지 않는다. 스트립은 `stripBlock`을 `View`(`opacity: WRITING.stripLockedOpacity`, `pointerEvents="none"`, 접근성 숨김)로 감싸고 `onSelectDay`·`onSwipe`를 넘기지 않는다. `onPressDate`는 `writing`이면 무시한다(`DateJump`가 누를 수 없는 갈래로). **`Notices`(옮김·거부 안내)는 스트립 아래에 그대로 둔다**(정직한 정보라 흐리게 하지 않는다 — 보드 `2b`에 없는 요소이며 이 결정은 research R2에 기록돼 있다). `writing`이 켜지는 렌더에서 052의 `foldState`·`end`를 비운다(research R2 — 렌더 중 상태 갱신 방식, effect 안 동기 `setState` 금지)
- [ ] T013 [US1] `src/ui/DiaryHomeScreen.tsx`를 고쳐 `writing`을 홈 안에서 그린다: (a) `listItems`·`onList`가 `writing`도 포함하게(`screen.kind === "writing"`이면 `screen.items`) — 헤더·스트립·`previewTarget`이 그대로 유지되도록, (b) `case "writing"`의 전체 화면(`ActivityIndicator`·`TypewriterText`·링크형 「그만두기」)을 지우고 `list`·`confirm-overwrite`·`writing`이 같은 `DiaryListScreen`을 그리게 한다 — `writing`일 때 `writing={{ line: screen.line, name: nameOf(resolved character, characterNames) }}`·`onStop={() => void cancel()}`를 넘기고 대화상자들(`DateJumpDialog`·`SettingsPromptDialog`·`MaterialConfirmDialog`·`OverwriteConfirmDialog`)은 `screen.kind === "list"`/`"confirm-overwrite"`에서만 그린다(지금 조건 유지), (c) `generate()`가 `setScreen`으로 `writing`에 들어갈 때 현재 화면의 `items`를 든다(`s.kind === "list" || s.kind === "confirm-overwrite"` 갈래에서 꺼낸다), (d) `write()`의 `startWriting(prompt, items)`·`confirmOverwrite(items)` 호출을 T007 시그니처에 맞춘다, (e) 안내 줄에 쓸 이름은 `generate()`가 잡는 `params.character`의 `nameOf`다 — 화면 로컬 **state**(`writingName`, `generate()` 시작 시 `setWritingName`)에 든다(ref는 렌더를 일으키지 않아 안내 줄이 안 갱신될 수 있다). `AppScreen`에 이름 필드를 더하지 않는다(진행률·시간 방어를 넓히지 않는다). 그 뒤 T009·T010 초록. **`__tests__/ui/writing-monologue-typewriter.test.tsx`(쓰는 중 화면의 타자기 검증)는 이 태스크에서 지운다** — 이 화면에서 타자기가 사라지므로 그 테스트는 더 이상 유효한 계약이 아니다(새 혼잣말 계약은 T024). 그러지 않으면 T013~T024 사이에 전체 `test:ui`가 빨갛다
- [ ] T014 [US1] `__tests__/ui/diary-home.test.tsx`(또는 T009와 같은 파일)에 **조립 수준** 케이스를 더한다: 「일기 쓰기」 → 화면이 `DiaryListScreen` 그대로(전체 화면 전환 없음, SC-001 — 헤더·스트립·`stop-button`이 같은 트리에 있다), 쓰는 중 스트립·헤더 날짜를 눌러도 고른 날·달력이 불변(SC-002), 쓰는 중 `previewTarget`·목록이 다시 읽히지 않는다(생성 중 `refresh()` 호출 0), 쓰는 중·토스트 상태가 파일에 남지 않는다(대역 저장소·`preferences` 통로에 새 쓰기 0 — FR-012). 그 뒤 초록

**Checkpoint**: `npm run test:ui -- writing-in-place diary-home`가 초록이다. 이 시점에 그만두기는 아직 `toList` 전환만 하고(기존 `cancel`) 토스트·혼잣말 교체는 없다.

## Phase 4: User Story 2 — 그만두면 바로 멈추고 쓰기 전 상태로 돌아간다 (P1)

**Goal**: 「그만두기」·뒤로 가기로 바로 멈추고 처음 쓰던 날은 안 쓴 날, 다시 쓰던 날은 기존 일기로 돌아온다. 새 글은 남지 않고 토스트도 없다.

**Independent Test**: 안 쓴 날·쓴 날 각각에서 쓰다 그만둔다(quickstart D4~D6).

### 테스트 먼저

- [ ] T015 [P] [US2] `__tests__/ui/writing-in-place-stop.test.tsx`(ui)에 계약 W11~W13·W16을 쓴다: (W12) 안 쓴 날에서 쓰기 → `stop-button` 누름 → `stop()` 호출·`stop-button`이 사라지고 `write-button`(「일기 쓰기」)·쓸 재료 두 칸이 돌아온다·**저장소에 그 날 파일이 생기지 않는다**(대역 저장소), 쓴 날에서 다시 쓰기 → 그만둠 → 기존 일기·「다시 쓰기」 바가 그대로이고 내용이 바뀌지 않는다, 토스트가 없다, (W13) `BackHandler`의 `hardwareBackPress` 콜백이 그만두기와 같은 결과(`writing`이 아닐 땐 등록되지 않는다), (W11) 다시 쓰다 그만둔 뒤 스트립이 펼쳐져 있고 「다시 쓰기」 바가 내려가 있다(`rewrite-bar`의 `pointerEvents="none"`), (W16) 그만둔 뒤 뒤늦게 `pipeline.run`이 성공/실패로 끝나도 토스트·전환이 일어나지 않는다. 이 시점엔 W11·W16 중 일부가 실패해야 한다
- [ ] T016 [P] [US2] `__tests__/ui/diary-home.test.tsx`의 기존 그만두기 케이스(`toList` 전환 기대)를 위 계약에 맞게 고친다 — 그만둔 뒤 화면이 「목록」이 아니라 **홈의 그 날**이다(고른 날 불변)

### 구현

- [ ] T017 [US2] `src/ui/DiaryHomeScreen.tsx`의 `cancel()`·뒤로 가기 처리·`generate()` 결과 처리를 고친다: (a) `cancel()`은 그대로 `cancelled=true` → `stop()` → `setScreen(toList(await refresh()))`(research R3 — 목록 요약을 다시 읽는다), 토스트는 건드리지 않는다, (b) `hardwareBackPress` 핸들러는 `screen.kind === "writing"`일 때만 붙어 `cancel()`과 같게(지금 유지), (c) `generate()`의 결과 분기를 `afterGeneration`의 새 갈래에 맞춘다 — `home`이면 `toList(await refresh())`, `toast`면 `toList(await refresh())` 뒤 토스트 상태를 올린다(T023에서 토스트 상태를 구현하므로 지금은 갈래 분기와 `refresh`까지만; `unsaved`·`failed` 화면 갈래 처리와 「unsaved/failed 뒤로 가기 → goHome」 effect에서 `unsaved` 부분을 지운다. `failed`(쓰기 시작 전 `no-ready-character`)는 그대로), (d) 그만둔 뒤 `if (cancelled.current) return;`가 결과 처리 앞에 남아 W16을 지킨다. 그 뒤 T015·T016 초록

**Checkpoint**: `npm run test:ui -- writing-in-place diary-home`가 초록이다. US1+US2로 「홈 안에서 쓰고, 그만두면 돌아온다」가 성립한다.

## Phase 5: User Story 3 — 실패하면 토스트 한 줄로 알리고 쓰기 전 상태로 돌아간다 (P1)

**Goal**: 실패 시 하단 바 위 12에서 토스트가 올라와 3초 보이고, 쓸어 닫을 수 있다. 갈래별 문구가 나가고 이유·모델·코드는 안 보인다.

**Independent Test**: 실패를 유도해 토스트의 위치·문구·3초·쓸어 닫기·이유 미노출을 본다(quickstart D7~D9). 저장 실패·plain은 계약 테스트로 갈음하고 미확인으로 적는다.

### 테스트 먼저

- [ ] T018 [P] [US3] `__tests__/ui/failure-toast.test.tsx`(ui)를 쓴다 — 계약 T8~T14: (T9) 토스트가 `TOAST_TEXT`의 한 문장만 그리고 버튼이 없다·최소 높이 48·색이 `COLORS`에서만 나온다(소스에 `#` hex 없음), (T10) 가짜 시계로 `TOAST.showMs` 전에는 `onDismiss`가 안 불리고 그 뒤 한 번 불린다, 쓸어 닫으면 3초를 기다리지 않고 불리고 그 뒤 타이머가 다시 불리지 않는다, (T11) 래퍼가 `pointerEvents="box-none"`이고 토스트가 떠 있어도 하단 바가 눌린다, (T14) `accessibilityRole="alert"`·`accessibilityLiveRegion="polite"`, (T8) `DiaryListScreen`에 바 높이가 다른 상황(「다시 쓰기」 바 + 작성 시각)을 주었을 때 토스트 바닥이 `바의 잰 높이 + 12`이고 바를 가리지 않는다(바의 `onLayout`을 `fireEvent(node, "layout", ...)`로 쏜다). **제스처 배선은 한 렌더에서만 쏜다**(049 — 앞 테스트의 핸들러가 불린다). 이 시점엔 실패해야 한다
- [ ] T019 [P] [US3] `__tests__/ui/writing-in-place-toast.test.tsx`(ui)에 조립 계약을 쓴다 — 계약 W15·T12·T13: 대역 `pipeline.run`이 실패를 돌려줄 때 갈래마다(표 전부) 쓰기 전 상태의 홈으로 돌아오고 해당 문구의 토스트가 뜬다, **결과 전체 화면이 없다**(`unsaved-screen` testID·「← 일기」가 없다), 저장 실패(`entry` 있음)도 `save` 토스트이고 글이 화면 어디에도 없다, 토스트가 뜬 채 새 쓰기를 시작하면 사라진다(T12), 날을 바꾸면 사라진다(T12), 같은 갈래가 연달아 나도 두 번째 토스트가 다시 뜬다(`id`), 그만두기 뒤에는 토스트가 없다(T13), `retry` 외 갈래에서 화면 어디에도 「다시 써 볼 수 있어요」가 없다(SC-006), 화면 트리 전체에서 `reason` 문자열(예 「kanana」·「OOM」)이 보이지 않는다(SC-005)

### 구현

- [ ] T020 [US3] `src/ui/FailureToast.tsx`를 만든다 — props `{ text: string; bottom: number; onDismiss: () => void }`. 좌우 `TOAST.inset`, 최소 높이·안쪽 여백·글자 `TOAST`, 배경 `COLORS.text`·글자 `COLORS.bg`, 왼쪽 accent `TOAST.marker`×`marker` 사각형(간격 `markerGap`, `COLORS.accent`), 그림자. 래퍼 `pointerEvents="box-none"`, `accessibilityRole="alert"`·`accessibilityLiveRegion="polite"`. 마운트 때 아래→제자리로 `TOAST.enterMs` 슬라이드(시작값을 마운트 값으로 준다 — 049 교훈, effect로 되돌리지 않는다), `TOAST.showMs − fadeOutMs`에 페이드 아웃 시작, `showMs`에 `onDismiss`(언마운트 시 타이머 정리, 이중 호출 방지). 쓸어 닫기: 049 `DayPicker`와 같은 `Gesture.Pan().runOnJS(true)` + `.activeOffsetY([10, 1000])`(아래로만)·`.failOffsetX([-10, 10])`, 끌기 동안 `translateY`가 손가락을 따르고(위로는 0에 고정), 손을 떼면 `shouldDismissToast(translationY, velocityY)`(T005)가 참이면 `onDismiss`, 아니면 제자리로 스프링. `.withTestId("failure-toast-pan")`. 그 뒤 T018 초록
- [ ] T021 [US3] `src/ui/DiaryListScreen.tsx`에 토스트 자리를 더한다: props `toast?: { id: number; text: string }`·`onDismissToast?: () => void`. 하단 바(`WriteBar`·`RewriteBar`·`StopBar`)의 `onLayout` 높이를 최댓값 상태 `barHeight`로 들고(`RewriteBar`는 이미 `onLayout`을 쓰므로 콜백만 위로 올린다; 내려가 있어도 `onLayout` 높이는 그대로다), `toast`가 있으면 `ROOT` 안에 `<FailureToast key={toast.id} bottom={barHeight + TOAST.gapAboveBar} …>`를 절대 배치로 그린다(바 슬롯 밖 — 바가 내려가도 함께 내려가 사라지지 않게, research R6). `toast`는 문자열만 받는다(화면은 갈래·실패 종류를 모른다). 그 뒤 T018의 T8 케이스 초록
- [ ] T022 [US3] `src/ui/DiaryHomeScreen.tsx`에 토스트 상태를 더한다: `toast: { id: number; kind: ToastKind } | null`(화면 로컬, 파일에 남기지 않는다). `generate()`가 실패 결과를 처리할 때 `toList(await refresh())` **뒤** `setToast({ id: ++toastId.current, kind })`(사용자가 그만둔 경우 `cancelled` 검사가 앞에 있으므로 뜨지 않는다 — T13). `generate()` 시작 시·`setChosenDay` 래퍼(날 바꿈)에서·`write()` 시작 시 `setToast(null)`(FR-018). `DiaryListScreen`에는 `toast={toast === null ? undefined : { id: toast.id, text: TOAST_TEXT[toast.kind] }}`와 `onDismissToast={() => setToast(null)}`를 넘긴다(문구는 `failure-toast.ts` 정본에서만). 그 뒤 T019 초록
- [ ] T023 [US3] 쓰기 시작 **전** `no-ready-character`가 여전히 `failed` 화면(「설정에서 작성자 준비하기」 버튼 포함)으로 가는지 회귀 케이스를 `__tests__/ui/diary-home.test.tsx`에 잠근다(FR-024 — 기존 `설정에서 작성자 준비하기` 케이스가 그대로 통과해야 한다). 이 화면과 토스트가 섞이지 않는다(그 경우 `writing`에 들어가지 않는다·토스트 없음)

**Checkpoint**: `npm run test:ui -- failure-toast writing-in-place diary-home`가 초록이다. US1~US3으로 실패 안내까지 성립한다.

## Phase 6: User Story 4 — 쓰는 동안 캐릭터의 혼잣말이 바뀐다 (P2)

**Goal**: 혼잣말이 몇 초마다 페이드로 바뀌고 단계가 바뀌면 즉시 새 문안이 나온다. 타자기는 없다.

**Independent Test**: 쓰는 동안 혼잣말이 바뀌는 것을 녹화로 본다(quickstart D3).

### 테스트 먼저

- [ ] T024 [P] [US4] `__tests__/ui/writing-monologue-rotation.test.tsx`(ui)를 쓴다 — 계약 W9·W10(T013에서 지운 `writing-monologue-typewriter.test.tsx`를 대체): 가짜 시계로 (a) 진행 신호 전에는 「쓰고 있다」가 있고 `WRITING.rotateMs`가 지나도 바뀌지 않는다, (b) 진행 콜백이 `stage: "signals"`를 주면 그 풀의 문안이 나오고 `rotateMs`마다 다음 문안(직전 줄 제외 — `pickMonologue`에 `random`이 주입되지 않으니 `jest.spyOn(Math, "random")`으로 결정)으로 바뀐다, (c) 단계·갈래가 바뀌면 즉시 새 단계의 문안으로 바뀌고 타이머가 다시 센다(직전 교체로부터 `rotateMs`가 지나기 전에 또 바뀌지 않는다), (d) 각 줄이 자기 `key`로 마운트된다(`writing-monologue`의 자식이 줄 문자열로 갈린다), (e) 소스(주석 걷어낸 뒤)에 `TypewriterText`·`REVEAL`·`skipToEnd`가 없고, `WritingPaper.tsx`·`DiaryHomeScreen.tsx`의 페이드 시작값이 effect가 아니라 마운트 값으로 준다(`opacity.value = ` 되돌리는 effect 없음 — W10 소스 검사), (f) 화면 어디에도 숫자·`%`가 없다(FR-007). 이 시점엔 실패해야 한다

### 구현

- [ ] T025 [US4] `src/ui/WritingPaper.tsx`의 혼잣말을 페이드 교체로 만든다: `line`이 바뀔 때 이전 줄은 절대 배치 1→0, 새 줄은 0→1(`FadeLayer` — T003, 겹마다 `key`가 줄 문자열, 시작 투명도를 마운트 값으로, 지속 `WRITING.fadeMs`). 높이는 새 줄 하나가 잡는다(`DayHeading`과 같은 「렌더 중 이전 값 기억」 방식 — effect 안 동기 `setState` 금지). 첫 렌더(이전 줄 없음)는 나타나는 효과 없이 바로 보인다
- [ ] T026 [US4] `src/ui/DiaryHomeScreen.tsx`에 간격 타이머를 더한다: `screen.kind === "writing"`이고 `screen.stage !== undefined`인 동안 `setInterval`/`setTimeout`으로 `WRITING.rotateMs`마다 `setScreen(s => s.kind === "writing" && s.stage !== undefined ? { ...s, line: pickMonologue(s.stage, s.branch, s.line, name) } : s)`. 진행 콜백이 `stage`·`branch`를 바꾸면 지금처럼 즉시 새 줄을 고르고 **타이머를 다시 센다**(`stage`·`branch`가 effect 의존성이라 재설정된다). `writing`을 벗어나면 타이머를 지운다. `pickMonologue`·`monologue.ts`는 무변경. 그 뒤 T024 초록

**Checkpoint**: `npm run test:ui -- writing-monologue-rotation writing-in-place`가 초록이다.

## Phase 7: Polish & Cross-Cutting

- [ ] T027 `TypewriterText`의 사용처를 grep으로 센다(`src`·`__tests__`). **0이면** `src/ui/components/TypewriterText.tsx`·`src/ui/text/grapheme-slice.ts`(다른 사용처 없음을 확인)·`REVEAL`(`tokens.ts`)·`__tests__/ui/typewriter-text.test.tsx`·`__tests__/ui/text/grapheme-slice.test.ts`를 지우고(`writing-monologue-typewriter.test.tsx`는 T013에서 이미 지웠다) `__tests__/ui/press-feedback.test.tsx`의 `src/ui/components/` 파일 수 기대와 `__tests__/jest-projects.test.ts` 파일 수를 맞춘다(FadeLayer 추가·TypewriterText 삭제). **하나라도 남아 있으면** 삭제하지 않고 이유를 `research.md`에 한 줄 적는다(쓰지 않는 코드를 두지 않는다 — 044 교훈)
- [ ] T028 [P] `.maestro/`의 일곱 흐름을 quickstart §4 표대로 고친다: `diary-user-path.yml`·`generate-diary.yml`·`writing-flow-simplified.yml`(쓰는 중 표식을 「쓰는 중」·`id: stop-button`으로, 끝은 `stop-button` 사라짐 — `notVisible: "쓰고 있다"`는 폴백 문구가 남을 수 있어 신뢰하지 않는다), `past-day-diary.yml`(그만둔 뒤 목록이 아니라 **홈의 그 날**), `photo-selection-over-limit.yml`(`notVisible: "그만두기"` → `id: stop-button`), `writing-monologue.yml`·`writing-monologue-expansion.yml`(타자기 주석·전제 제거, 진입은 `stop-button`, 그만둔 뒤 독백이 사라짐). 흐름 상단 주석의 옛 서술(타자기·회전 표시)을 지금 사실로 고친다
- [ ] T029 [P] `.maestro/in-place-writing.yml`을 만들고 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(등록 안 하면 초록불인데 안 돈다): 쓰기 시작 → 「쓰는 중」·`stop-button` 보임 → 스트립 칸 탭이 무반응(헤더 날짜 그대로) → `stop-button`으로 그만둠 → `write-button` 복귀. 토스트는 Maestro로 유도하기 어려우니 D7로 본다(흐름 주석에 적는다). `env:` 값이 `-e`를 덮으므로 기본값은 `${X || "…"}`로 준다(049)
- [ ] T030 `npm test`·`npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 돌려 전부 통과를 확인한다. `git grep -n "unsaved-screen\|WRITTEN_DAY_TEXT.unsaved\|kind: \"unsaved\""`·`git grep -n "TypewriterText"`가 남긴 잔재(주석 포함)를 정리한다(`GenerationProbe.tsx`의 `unsaved` 로컬 상태는 개발자 화면의 다른 것이라 무관). `git diff --stat main -- src/diary/pipeline.ts src/diary/prompt.ts src/diary/monologue.ts src/inference`가 비어 있음을 확인한다(FR-022·023 무변경). `scripts/constitution-rules.ts`에 걸리는 위반이 없는지 확인한다
- [ ] T031 위반 주입 V1~V10(quickstart §3)을 하나씩 실제로 어겨 테스트가 잡는지 확인하고 되돌린다. **주입이 적용됐는지를 먼저 단언한다**(053 교훈 — 치환 실패로 초록불이 나오는 경우). Python으로 쓸 땐 `newline=""`. 잡히지 않는 주입이 있으면 그 계약 테스트를 보강한다
- [ ] T032 **실기기 검증 D1~D11**(quickstart §2, SM-S901N, dev 빌드 1회, `pm clear` 없음). Metro가 어제 것으로 남아 있으면 종료하고 `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`, `adb reverse tcp:8081 tcp:8081`. **움직임(D3 페이드 교체·D7 슬라이드·D8 쓸어 닫기)은 스크린샷이 아니라 `adb shell screenrecord` + 프레임 추출로 본다**(049). 실패 유도는 quickstart 방법 (a) 생성 중 앱을 홈으로 보냈다 복귀, (b) `run-as`로 모델 파일 이름 변경 후 복구. **못 한 것(저장 실패·`plain` 토스트 등)은 못 했다고 「미확인 잔여」에 적고 통과로 세지 않는다**(원칙 V). 관측한 값·발견한 결함을 `specs/054-in-place-writing/quickstart.md` §6(신규)에 기록한다
- [ ] T033 Maestro를 `maestro test`로 직접 돌려 quickstart §4의 여덟 흐름(`in-place-writing`·`diary-user-path`·`generate-diary`·`past-day-diary`·`photo-selection-over-limit`·`writing-flow-simplified`·`writing-monologue`·`writing-monologue-expansion`)을 PASS시킨다. 끊은 Maestro 뒤에 곧바로 돌리면 `DeviceServerDiedException` — 한 번 더. 실패하면 흐름의 옛 가정(타자기·`쓰고 있다`)인지 실제 회귀인지 갈라 고친다
- [ ] T034 `AGENTS.md`에 「054 — 제자리 쓰기」 절을 더한다(053 절 형식): 무엇을 바꿨나, 토스트 갈래 표, **설정 진입 정정(FR-024 — 「홈에 이미 있는 설정 안내」는 사실이 아니었고 유일한 길은 쓰기 전 `no-ready-character` 화면 버튼)**, 임시 결과 화면 제거로 저장 실패 글이 버려지는 결정, 4초 간격+단계 전환 즉시 교체, 실기기에서 잡은 결함, 미확인 잔여. 048~053 절의 「쓰는 중」·「임시 결과 화면(`unsaved`)」 서술에는 이력 표기를 단다

## Dependencies & Execution Order

```
Phase 1 Setup ─▶ Phase 2 Foundational (state·failure-toast) ─▶ US1 ─▶ US2 ─▶ US3 ─▶ US4 ─▶ Polish
```

- **Phase 1** 세 태스크는 서로 독립이다(T001·T002 병렬, T003은 `DiaryListScreen.tsx`를 건드리므로 T012보다 먼저).
- **Phase 2**: T004→T005(순수 판정), T006→T007(상태) 두 갈래가 병렬. T008은 T007 뒤(`unsaved` 삭제).
- **US1**은 T009·T010(테스트)→T011(부품)→T012(화면)→T013(조립)→T014. **US2**는 US1의 `stop-button`·`writing` 조립에 기댄다. **US3**은 T005(판정)·T012(`barHeight` 위치)에 기댄다. **US4**는 T011·T013·T003에 기댄다.
- 같은 파일을 만지는 태스크(`DiaryListScreen.tsx`: T003·T012·T021, `DiaryHomeScreen.tsx`: T013·T017·T022·T026)는 **순서대로** 한다(병렬 금지).
- **Polish**: T027(삭제)은 US4 뒤. T028·T029는 화면이 확정된 뒤. T031→T032→T033→T034 순서(주입으로 방어 확인 → 실기기 → Maestro → 기록).

### Parallel Examples

- Phase 1: T001 ∥ T002
- Phase 2: (T004→T005) ∥ (T006→T007) — 단 T005가 끝난 뒤 T007이 `toastKindFor`를 import한다
- US1: T009 ∥ T010, 그 뒤 T011
- US3: T018 ∥ T019
- Polish: T028 ∥ T029

## Implementation Strategy

- **MVP = US1+US2**: 쓰기가 홈 안에서 보이고 그만두면 돌아온다. 이 지점에서 토스트가 없어 실패 시 화면은 그냥 `list`로 돌아온다(알림 없음)는 결함이 있으므로 **US3까지 마쳐야 배포 가능**하다. 세 P1(US1~US3)이 한 묶음이다.
- US4(혼잣말 교체)는 P2다. US3까지 끝난 뒤 얹는다 — 그 전까지 혼잣말은 지금 방식의 정적 한 줄이다.
- 각 체크포인트마다 `npm run test:logic`(약 7초)로 회귀를 본다. 화면을 만졌으면 `npm run test:ui`, 커밋 전에는 `npm test`.
- **실기기 검증은 dev 빌드 1회, `pm clear` 없이**(모델 보존). release 빌드는 만들지 않는다(AGENTS.md).
