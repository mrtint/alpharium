---

description: "051 쓴 날 읽기 — 태스크"
---

# Tasks: 쓴 날 읽기 — 홈이 곧 상세

**Input**: `specs/051-home-written-day/` — plan.md, spec.md, research.md, data-model.md, contracts/written-day.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 스토리의 테스트 태스크는 구현 전에 **빨간불을 확인**한다.
계약 ID(PAP·ST·HOME·CAR·BAR·TIME·GEN·NR·REACH·TXT·DEL)는 [contracts/written-day.md](contracts/written-day.md).
소스를 읽는 계약 테스트는 주석을 먼저 걷어낸다(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")` — AGENTS 실측 규칙).
python으로 파일을 쓰면 `open(..., newline="\n")`(050 교훈 — CRLF가 계약 테스트를 깬다).

**Organization**: 스토리별 단계. US1(홈에서 읽기)·US2(캐러셀)·US3(다시 쓰기·작성 시각·쓰기 뒤)·US4(알림)·US5(읽을 수 없음) + Maestro + 마무리.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (토큰·문구·목)

- [ ] T001 `git branch --show-current`가 `051-home-written-day`인지 눈으로 확인한다(main 직접 작업 금지 — AGENTS 「작업 습관」)
- [ ] T002 [P] `src/ui/theme/tokens.ts`에 `WRITTEN_DAY`를 더한다 — `paper: "#f8f4f4"`(보드 neutral-100), `rewriteBar: "#eae7e7"`(neutral-200), `indicatorIdle: "#bab6b6"`(neutral-400), 치수 `photoHeight: 210`, `paperGap: 20`(스트립 아래), `carouselPadding: { top: 16, horizontal: 20 }`, `badge: { inset: 10, fontSize: 11, letterSpacing: 0.88, paddingV: 4, paddingH: 9 }`, `indicator: { activeWidth: 18, idleWidth: 6, height: 4, gap: 6 }`, `body: { fontSize: 15, lineHeightRatio: 1.65, paragraphGap: 14, paddingTop: 16, paddingH: 20, paddingBottom: 104 }`, `title: { fontSize: 15, fontWeight: "700" }`, `rewrite: { fontSize: 17, fontWeight: "800" }`, `writtenAt: { fontSize: 11, fontWeight: "500", gap: 3 }`(data-model §7, 설계 §3.5 시각 수치). `COLORS`는 바꾸지 않는다(research R7). 주석: 「보드 `2c`·`2k`·`2g` 값 — 사람이 정한 값」
- [ ] T003 [P] `jest/setup-ui.ts`의 `react-native-reanimated-carousel` 목이 `loop`·`onSnapToItem`·`onConfigurePanGesture`·`data`·`style`을 host `View`의 props로 넘기게 한다(렌더는 지금처럼 첫 항목만). 주석: 「051 — 배선 검사용. 넘김·순환은 실기기(C9)」. `__tests__/ui/download-progress-screen.test.tsx`가 그대로 통과하는지 `npm run test:ui -- download-progress`로 확인
- [ ] T004 [P] `src/ui/home-text.ts`에 `WRITTEN_DAY_TEXT`를 더한다 — `rewrite: "다시 쓰기"`, `unreadableLines: ["이 날의 일기 파일이 손상됐어요.", "다시 쓰면 새로 남아요."]`, `photoMissing: "이 사진은 이제 없어요"`, `unsaved: "저장하지 못했어요. 앱을 나가면 이 일기는 사라져요."`, `backToHome: "← 일기"`. 머리 주석: 「051 — `rewrite`는 보드 `h2.rewrite` 원문, 나머지는 Clarifications에서 정한 사람이 쓴 문장(006·017의 해라체를 해요체로)」

---

## Phase 2: Foundational (지면 판정·상대 시각)

**⚠️ 이 단계가 끝나야 스토리를 시작한다.**

### 테스트 먼저

- [ ] T005 [P] `__tests__/app/written-day.test.ts`에 PAP1~PAP6을 쓴다 — data-model §2 판정표 다섯 줄 각각, PAP6은 `src/app/written-day.ts` 소스(주석 걷어냄)에 `new Date(`·`Date.now(`·`expo-file-system`·`store` 0건. 빨간불 확인
- [ ] T006 [P] `__tests__/ui/home-text.test.ts`에 TIME1~TIME4·TXT1·TXT2를 더한다 — 고정 `createdAt`에 `now`를 0초·59초·−5분(미래)·60초·59분59초·60분·2시간15분30초 더해 `writtenAtText` 결과를 글자 단위로(data-model §4 표), TIME4는 `home-text.ts` 소스에 `getHours`·`setHours` 0건, TXT1 `WRITTEN_DAY_TEXT.rewrite === "다시 쓰기"`, TXT2 2시간 15분 = 「2시간 15분 전에 작성」. 빨간불 확인

### 구현

- [ ] T007 `src/app/written-day.ts`(새)에 `PaperState` 타입과 `paperFor(day, items, loaded)`를 만든다 — data-model §2의 판정표 그대로(item 없음 → `unwritten` / `readable:false` → `unreadable` / `loaded` 없거나 다른 날 → `loading` / 같은 날 `entry===null` → `unreadable` / 같은 날 entry → `readable`). 머리 주석: 「쓴 날인가는 `kind !== "unwritten"` — 읽기를 기다리지 않는다(FR-001)」, 「늦게 온 결과는 셋째 줄로 버려진다(FR-016)」. T005 초록불
- [ ] T008 `src/ui/home-text.ts`에 `writtenAtText(createdAt: Date, now: Date): string`을 더한다 — 밀리초 차이만 쓴다(`getHours` 금지), 60초 미만·음수 → 「방금 작성」, 60분 미만 → `${floor(분)}분 전에 작성`, 그 이상 → `${floor(시)}시간 ${분 % 60}분 전에 작성`(내림). T006 초록불

**Checkpoint**: `npm run test:logic`·`npm run test:ui -- home-text` 초록, `npx tsc --noEmit` 0.

---

## Phase 3: User Story 1 — 쓴 날을 고르면 홈에서 바로 읽는다 (P1) 🎯 MVP

**Goal**: 목록·상세 없이 홈에서 제목·지면(본문)을 보인다. 캐러셀은 US2, 하단 바 「다시 쓰기」·작성 시각은 US3.

**Independent Test**: quickstart D1(캐러셀 제외) — 쓴 날/안 쓴 날을 번갈아 골라 제목·본문·신호 줄·목록 부재를 본다.

### 테스트 먼저

- [ ] T009 [P] [US1] `__tests__/app/state.test.ts`에서 `toDetail`·`initialScreen`의 `detail` 갈래 테스트를 지우고 ST1(소스에 `kind: "detail"`·`kind: "unreadable"`·`export function toDetail` 0건 — `written`은 US3의 ST1 확장에서)·ST6(`initialScreen(resolution, items)`이 `build-error`/`list`만)을 쓴다. 빨간불 확인
- [ ] T010 [P] [US1] `__tests__/ui/written-day-home.test.tsx`(새)에 HOME1~HOME8·HOME10·HOME11을 쓴다 — `memoryStore()`에 일기(제목·본문 두 문단·`photos` 없음)를 심고 `DiaryHomeScreen`을 `chosenDay`로 렌더(`await render`, 쿼리는 `screen.*`). HOME12(쓴 날 헤더에 「오늘」 없음)·HOME13(`AppState` 복귀 → 다시 읽기, jest-expo `AppState.addEventListener` 스파이 — `mockRestore` 하지 않음)도 쓴다. HOME7은 `store.load`를 지연시키는 대역(날마다 다른 `Promise` 해소 순서)으로 A→B 전환. HOME1은 `DiaryListScreen.tsx` 소스에 `onOpen`·`home-recent`·`diary-card` 0건도 함께. HOME11은 쓴 날 화면의 `queryByText(/이 일기가 본 것|걸렸어요|대표 장소|이렇게 일기를 작성했어요|덮어썼다/)` null. 빨간불 확인
- [ ] T011 [P] [US1] `__tests__/ui/diary-list.test.tsx`에서 목록 카드(`diary-card-*`·`home-recent`·`home-count`·`onOpen`) 갈래 테스트를 지우고, 남는 헤더·스트립·신호 줄 테스트가 새 props(`paper`)로 통과하도록 준비한다. `__tests__/ui/diary-home.test.tsx`에서 「카드를 누르면 상세」류 기대를 찾아(`grep -n "detail\|diary-card\|← 목록"`) HOME2 기대(홈에 지면)로 바꾼다

### 구현

- [ ] T012 [US1] `src/app/state.ts`: `AppScreen`에서 `detail`·`unreadable` 갈래와 `toDetail`을 지우고, `initialScreen(resolution, items)`에서 `opts`(알림 인자)와 `detail` 반환을 지운다(ST6). 머리 주석의 「화면이 셋」 설명에 051을 덧붙인다(「쓴 날은 화면 상태가 아니라 홈의 지면 상태다 — `written-day.ts`」). `tsc`가 짚는 사용처(주로 `DiaryHomeScreen.tsx`)를 이 단계에서 고친다. T009 초록불
- [ ] T013 [US1] `src/ui/WrittenDayPaper.tsx`(새): props `paper: PaperState`(unwritten 제외), `onLayoutWidth?`. 컨테이너 testID `written-paper`, 배경 `WRITTEN_DAY.paper`, `flexGrow: 1`(화면 끝까지 배경), 스트립 아래 간격 20. `readable` → 본문 `written-body`(15, 줄높이 15×1.65, 안쪽 여백 16 20 104; 문단은 `text.split(/\n\s*\n/)`으로 갈라 간격 14로 쌓는다, 전문·잘림 없음). `loading` → 빈 지면(회전 표시 없음, HOME8). `unreadable` → 이 단계에서는 빈 지면(내용은 US5). 캐러셀 자리는 본문 위에 비워 둔다(US2). 문구 리터럴 없음(TXT3). 색·치수는 `WRITTEN_DAY`·`COLORS`만
- [ ] T014 [US1] `src/ui/DiaryListScreen.tsx`: `DiaryList`·`DiaryCard`·`PhotoStack`·`photoHintText`와 `onOpen` prop을 지운다. 새 prop `paper?: PaperState`. 헤더 상태 줄: `paper`가 `readable`이고 제목이 있으면 `home-day-title`(15/700 `COLORS.text`, `numberOfLines={2}`, `ellipsizeMode="tail"`, 누름 없음 — HOME3), 그 밖에는 지금의 `home-day-state`(13 `textMuted`, `dayStateText` — 제목 없음·읽을 수 없음은 여기서 「이 날 일기를 썼어요」·「읽을 수 없어요」, HOME4). 쓴 날(`paper.kind !== "unwritten"`)이면 `SignalRow` 대신 `WrittenDayPaper`(HOME5). 하단 바는 이 단계에서 지금 그대로(`WriteBar`) — US3이 바꾼다. 머리 주석에 051 절(「목록이 사라졌다 — 옛 일기는 스트립·달력으로(§2)」)을 더한다
- [ ] T015 [US1] `src/ui/DiaryHomeScreen.tsx`: `openItem`·`backToList`의 상세 전이를 지우고, 고른 날(`listPrompt.day`)이 바뀔 때마다 목록에 그 날이 있으면 `store.load(day)`를 불러 `loaded` 상태(`{ day, entry }`, 실패 → `entry: null`)에 담는다 — 도착 시 `day`가 지금 고른 날과 다르면 버린다(`previewFor`와 같은 방식). 렌더에서 `paperFor(day, items, loaded)`로 `paper`를 만들어 `DiaryListScreen`에 넘긴다(「읽는 중」을 상태로 저장하지 않는다). 목록을 다시 읽으면(`refresh`) 그 날의 `loaded`도 다시 읽는다(쓰기 뒤 새 본문 — US3이 쓴다). 기존 `AppState` 구독의 `active` 갈래에서 홈(`list`)에 있으면 목록과 그 날의 일기를 다시 읽는다(FR-016c, HOME13) — 도착한 목록은 `setScreen(s => s.kind === "list" ? toList(items) : s)`로만 반영한다(읽는 사이 연 덮어쓰기 대화상자를 닫지 않는다, 050 OW10). `case "detail"`·`case "unreadable"`을 지운다. T010·T011 초록불

**Checkpoint**: 쓴 날 제목·본문이 홈에 보이고 목록이 없다. `npm run test:ui` 초록 — **예외**: `__tests__/ui/diary-home-notification.test.tsx`는 상세 첫 화면을 기대하므로 US4(T026)에서 다시 쓸 때까지 빨간 것이 예상된 상태다(T012가 `detail`을 지웠다). 그 밖의 빨간불은 결함이다.

---

## Phase 4: User Story 2 — 사진을 넘겨 본다 (P1)

**Goal**: 흑백 순환 캐러셀(2장 이상), 1장은 사진만, 0장은 없음.

**Independent Test**: quickstart D2~D5.

### 테스트 먼저

- [ ] T016 [P] [US2] `__tests__/ui/photo-carousel.test.tsx`(새)에 CAR1~CAR11을 쓴다 — `PhotoCarousel`을 직접 렌더(사진 0·1·3장, `photos` undefined). CAR3·CAR5는 목 host 노드(`getByTestId("photo-carousel")`)의 `props.loop`·`props.onConfigurePanGesture`·`props.data.length`를 보고, `act(() => props.onSnapToItem(2))` 뒤 배지 「3 / 3」. CAR6은 사진 면 `resizeMode === "cover"`, 높이 210, 감싼 View style의 `filter`가 `[{ grayscale: 1 }]`. CAR8은 `fireEvent(image, "error")` 뒤 `diary-photo-missing`에 「이 사진은 이제 없어요」. CAR9는 사진·슬라이드 노드에 `onPress` 없음. CAR10은 부모가 `key`로 날을 주는 배선이므로 `WrittenDayPaper` 렌더에서 날을 바꿔 배지 「1 / n」 재시작을 본다. CAR11은 `src/` 소스에 `react-native-reanimated-carousel/` 0건. 빨간불 확인

### 구현

- [ ] T017 [US2] 구현 전에 설치본 `node_modules/react-native-reanimated-carousel/src/`에서 `onConfigurePanGesture`를 부르는 자리를 읽어 콜백이 워크릿 문맥에서 불리는지 확인하고, 결과(파일:줄)를 `research.md` R1 끝에 한 줄로 적는다(plan 위험 — 짐작 금지). 워크릿이면 콜백 첫 줄에 `'worklet';`를 둔다
- [ ] T018 [US2] `src/ui/PhotoCarousel.tsx`(새): props `photos?: readonly { photoId: string; takenAt: Date; resizedPath: string }[]`, `width: number`. 0장·없음 → `null`(CAR1). 1장 → `photo-carousel-single`(사진 면 하나, 배지·인디케이터 없음, CAR2). 2장 이상 → `Carousel`(`src/index` export만 — `import { Carousel } from "react-native-reanimated-carousel"`, testID `photo-carousel`, `loop`, `data={photos}`, `onConfigurePanGesture={(g) => { g.activeOffsetX([-10, 10]); }}`(T017 결과 반영), `onSnapToItem={setIndex}`, 폭 `width`·높이 210, `renderItem` = 사진 면) + 배지 `photo-carousel-badge` `${index+1} / ${n}`(`accessibilityLabel` 같은 값 — 025 실측: 여러 텍스트 조각이면 접근성 트리에 안 뜬다, 템플릿 리터럴 하나로) + 인디케이터 `photo-carousel-indicator`(n칸, 현재 칸 18×4 `COLORS.text`, 나머지 6×4 `WRITTEN_DAY.indicatorIdle`, 간격 6). 사진 면: 감싼 `View`에 `filter: [{ grayscale: 1 }]`·`overflow: "hidden"`, 안에 `Image`(`source={{ uri: \`file://${resizedPath}\` }}` — 017 `DiaryPhoto`와 같은 URI 규칙, `resizeMode="cover"`, `onError` → 「이 사진은 이제 없어요」 `diary-photo-missing`). 배지·인디케이터는 흑백 View 밖(CAR7). 누름 없음(CAR9). 머리 주석: 「025 슬라이더·갤러리를 대체 — 순환은 025 FR-011을 뒤집은 것(Clarifications)」, 「흑백은 새 아키텍처 filter(research R2) — 실기기 D3 전까지 모습은 미확인」. T016 초록불
- [ ] T019 [US2] `src/ui/WrittenDayPaper.tsx`: `readable`이면 본문 위에 `<PhotoCarousel key={entry.date} photos={entry.photos} width={폭} />` — 폭은 지면 `onLayout`으로 잰 값에서 좌우 20씩 뺀 값(창 폭 가정 금지, plan 위험). 캐러셀 안쪽 여백 16 20 0. 사진이 없으면 본문이 지면 맨 위(여백 20)부터(FR-011). T016의 CAR10 초록불

**Checkpoint**: US1 + US2 — 사진이 있는 쓴 날에 캐러셀.

---

## Phase 5: User Story 3 — 쓴 날을 다시 쓴다 (P1)

**Goal**: 연회색 「다시 쓰기」 → `2d` → 쓰기 → 홈의 그 날. 오늘이면 상대 작성 시각. 저장 실패만 임시 결과 화면. 상세 화면 삭제.

**Independent Test**: quickstart D6~D8.

### 테스트 먼저

- [ ] T020 [P] [US3] `__tests__/app/state.test.ts`에 ST2~ST5를 더하고 ST1을 `written` 갈래까지 넓힌다 — `afterGeneration({ ok: true, overwrote: true/false })` → `{ kind: "home" }`, 저장 실패+entry → `{ kind: "unsaved", entry }`, 그 밖 → `failed`(`text` 필드 없음), ST5는 `state.ts` 소스에서 `export function toWriting()` 선언이 인자 없음. 기존 `written` 기대 테스트를 이것으로 바꾼다. 빨간불 확인
- [ ] T021 [P] [US3] `__tests__/ui/written-day-home.test.tsx`에 BAR1~BAR7·GEN1~GEN6을 더한다 — 가짜 시계(`jest.useFakeTimers()` + 주입 `now`)로 BAR5(60초 진행 → 문구 변경, 지난 날엔 `jest.getTimerCount()`에 1분 인터벌 없음), 파이프라인 대역(`run`이 ok/저장 실패/실패를 돌려줌)으로 GEN1~GEN4, GEN5는 `src/`·`App.tsx` 소스에 「← 목록」 0건, BAR7은 `DiaryListScreen.tsx`·`WrittenDayPaper.tsx`·`PhotoCarousel.tsx` 소스에 `dayOf(` 0건이고 `DiaryHomeScreen.tsx`의 `dayOf(` 수가 051 전(`git show main:src/ui/DiaryHomeScreen.tsx`에서 센 값)보다 늘지 않음. 대화상자는 `__tests__/ui/render-with-portal.tsx`로. 빨간불 확인

### 구현

- [ ] T022 [US3] `src/app/state.ts`: `written` 갈래를 지우고 `{ kind: "unsaved"; entry: DiaryEntry }`를 더한다. `afterGeneration(result): AfterGeneration`(`home` / `unsaved` / `failed`)로 바꾼다 — `overwrote`는 보지 않는다(data-model §3). `toWriting()`은 그대로 인자 없음. 주석: 「051 — 성공이면 홈의 그 날(목록 다시 읽기는 화면이 한다), 저장 실패만 결과 화면(006 FR-012a)」. T020 초록불
- [ ] T023 [US3] `src/ui/DiaryListScreen.tsx`: 쓴 날이면 `WriteBar` 대신 `RewriteBar` — `Pressable` testID `write-button`(R9 — 같은 쓰기 동작), 배경 `WRITTEN_DAY.rewriteBar`, 글자 `WRITTEN_DAY_TEXT.rewrite` 17/800 `COLORS.text`, 날짜 조각 없음, 아래에 `writtenAt?: string`이 있으면 `written-at`(11/500 `textMuted`, 간격 3). `⋯` 메뉴는 지금 자리 그대로(BAR6). 새 prop `writtenAt?: string`(문자열만 받는다 — 화면은 시각을 모른다, 048 G9)
- [ ] T024 [US3] `src/ui/DiaryHomeScreen.tsx`: (1) `writtenAt` = `paper.kind === "readable" && cellFor(day, items, day, now()).isToday ? writtenAtText(paper.entry.createdAt, now()) : undefined`(FR-019a). (2) 그 조건이 참인 동안만 `setInterval(() => setTick(t => t+1), 60_000)`(해제 포함). (3) `generate()`의 끝: `afterGeneration` 결과가 `home`이면 `setScreen(toList(await refresh()))` + 그 날 `loaded` 다시 읽기(고른 날은 건드리지 않는다 — 쓰기는 고른 날을 썼다, data-model §3), `unsaved`면 그 화면, `failed`면 그대로. (4) `case "written"`을 지우고 `case "unsaved"`: `Frame` 안에 `unsaved-screen` — `WRITTEN_DAY_TEXT.unsaved`, 제목(있으면), 본문(캐러셀 없음). (5) `Frame`의 뒤로 가기 글자를 `WRITTEN_DAY_TEXT.backToHome`으로(GEN5), 누르면 `toList(await refresh())`. `unsaved`·`failed`에서도 안드로이드 뒤로 가기가 홈으로 가게 한다(`BackHandler`, GEN4). T021 초록불
- [ ] T025 [US3] `src/ui/DiaryDetailScreen.tsx`를 지운다. `__tests__/ui/diary-detail.test.tsx`·`__tests__/ui/photo-gallery.test.tsx`·`__tests__/ui/diary-reveal.test.tsx`를 지운다(대체 계약: HOME·CAR·GEN — 삭제 전에 각 파일이 잠그던 것을 훑어, 남는 것(사본 실패 대체 017 FR-002)이 CAR8로 옮겨졌는지 확인한다. 「이 일기가 본 것」의 없음/모름 신호 줄·소요 시간·작성자 문장·갤러리·타자기는 FR-016a·FR-013a·Clarifications에 따라 **의도적으로 사라지는 것**이므로 옮기지 않는다). `__tests__/ui/character-name-flow.test.ts`의 `codeOf("DiaryDetailScreen.tsx")` 검사를 걷어내고 「051 — 작성자 이름을 보이는 화면이 사라졌다(FR-016a)」 주석을 남긴다. `__tests__/ui/press-feedback.test.tsx`의 `DiaryDetailScreen` 주석 참조를 고친다. `__tests__/scripts/check-constitution.test.ts:350-353`의 「정당한 사용」 예시에서 `src/ui/DiaryDetailScreen.tsx`를 실재 파일로 바꾼다(검사 규칙 자체는 그대로). `scripts/constitution-rules.ts`의 주석 참조(164·243행)를 고친다. `npx tsc --noEmit` 0

**Checkpoint**: 상세 화면이 없고, 다시 쓰기 → 홈의 그 날. `npm test` 초록 — US1 체크포인트와 같은 예외(`diary-home-notification.test.tsx`는 T026까지 빨강)만 허용한다.

---

## Phase 6: User Story 4 — 알림을 누르면 홈이 그 날을 고른 채 열린다 (P2)

**Goal**: 020 라우팅을 「고른 날」로, 확인 기록은 readable이 보였을 때.

**Independent Test**: quickstart D9.

### 테스트 먼저

- [ ] T026 [P] [US4] `__tests__/ui/diary-home-notification.test.tsx`를 NR1~NR4로 다시 쓴다 — 머리 주석의 「첫 화면이 상세」를 051로 고친다. NR1 쓴 날 `initialDay` → `home-day-title`·`written-body` + `onInitialDayApplied` 1회 + `onAcknowledge(day)` 1회, NR2 없는 날/`readable:false` → `onAcknowledge` 0회, NR3 `rerender`로 `initialDay` 변경 → 고른 날 변경, NR4 스트립에서 readable 날 선택 → `onAcknowledge` 1회, 같은 날 리렌더 → 추가 호출 0. 빨간불 확인
- [ ] T027 [P] [US4] `__tests__/ui/written-day-reach.test.ts`(새, `.ts` — 소스 검사)를 만들고 NR5를 쓴다 — `App.tsx` 소스(주석 걷어냄)에서 `onInitialDayApplied`가 `setPendingRoute(null)`을 부르고, `onAcknowledge`에 넘기는 콜백 안에 `setPendingRoute`·`onDayOpened`가 없다. 빨간불 확인

### 구현

- [ ] T028 [US4] `src/ui/DiaryHomeScreen.tsx`: prop `onInitialDayApplied?: () => void`를 더한다. `initialDay != null`이면(마운트·변경 시) `setChosenDay(initialDay)` 후 `onInitialDayApplied()`. 확인 기록: 고른 날의 `paper.kind`가 `readable`이 된 순간 그 날에 대해 한 번 `onAcknowledge?.(day)`(화면 로컬 `acknowledgedFor` ref로 중복 방지 — NR4). 초기 로드 effect에서 `initialDay`·`entry`로 `initialScreen`을 부르던 코드를 지운다. T026 초록불
- [ ] T029 [US4] `App.tsx`: `DiarySection`에 `onInitialDayApplied={() => setPendingRoute(null)}`을 넘기고, `onAcknowledge` 래퍼에서 `onDayOpened`(pendingRoute 비우기) 호출을 지운다(확인은 기록만). 020 머리 주석(「목록을 건너뛰고 상세를 첫 화면으로」)을 051로 고친다. T027 초록불

**Checkpoint**: 알림 → 홈의 그 날.

---

## Phase 7: User Story 5 — 읽을 수 없는 일기가 있는 날 (P3)

**Goal**: 손상된 날을 고르면 「읽을 수 없어요」 + 지면 두 줄 + 「다시 쓰기」.

**Independent Test**: quickstart D1의 변형 — 일기 파일 하나를 깨뜨리고 고른다(debug `run-as`로 파일 내용 교체).

- [ ] T030 [P] [US5] `__tests__/ui/written-day-home.test.tsx`에 HOME9를 더한다 — 목록 `readable:false`인 날, 그리고 목록은 readable인데 `store.load`가 `null`인 날(대역) 두 경우 모두 `home-day-state` 「읽을 수 없어요」, `written-unreadable`에 두 줄(`WRITTEN_DAY_TEXT.unreadableLines`), `photo-carousel*` 없음(하단 바는 BAR1이 이미 잠갔다). 빨간불 확인
- [ ] T031 [US5] `src/ui/WrittenDayPaper.tsx`: `unreadable` → `written-unreadable`에 `WRITTEN_DAY_TEXT.unreadableLines` 두 줄(15, `COLORS.text`, 안쪽 여백은 본문과 같다). T030 초록불

---

## Phase 8: Maestro (FR-035~FR-037a)

- [ ] T032 FR-037 재확인 — `grep -ln "diary-card\|← 목록\|home-recent\|photo-slider\|photo-gallery\|diary-reveal\|일기 쓰기" .maestro/*.yml`을 실행해 결과를 research R9 목록과 대조하고, 새로 나온 파일이 있으면 이 단계의 해당 태스크에 더한다(주석에만 있는 글자는 제외)
- [ ] T033 [P] `.maestro/written-day-reading.yml`(새)을 만든다 — `launchApp`(clearState 없음) → 사진이 2장 이상인 쓴 날로 이동(날은 `-e WRITTEN_DAY=YYYY-MM-DD`로 받는다. 흐름에 `env:` 기본값을 두지 않는다 — 049 교훈: 흐름 `env:`가 `-e`를 덮어쓴다. 첫 단계 `assertTrue: ${WRITTEN_DAY != undefined}`로 빠뜨림을 드러낸다. 이동은 스트립 `id: "day-${WRITTEN_DAY}"` 누름 — 이번 주 안의 날이어야 하므로 사흘 안에 `seed:day`로 심고 쓴 하루를 쓴다) → `home-day-title` 보임 → `photo-carousel-badge` 「1 / .*」 → 캐러셀 왼쪽 `swipe` → 배지 「2 / .*」 → `write-button` → `overwrite-dialog` → `overwrite-cancel` → `written-body` 그대로. 머리 주석: 「051 — 025 `diary-photo-gallery`를 대체(갤러리 없음, Clarifications). 순환은 사진 수만큼 넘겨 「1 / n」으로 돌아오는지 본다」 — 사진 수는 `-e WRITTEN_DAY_PHOTOS=n`으로 받아 n번 넘긴 뒤 배지 「1 / n」을 확인한다(순환). 같은 방식으로 `assertTrue`를 둔다. `scripts/run-device-tests.mjs` `FLOWS`에 등록하고 `diary-photo-gallery`를 뺀다
- [ ] T034 [P] `.maestro/diary-photo-gallery.yml`을 지운다(T033이 대체 — 사유는 T033 흐름 머리 주석)
- [ ] T035 [P] `.maestro/diary-body-screen.yml`을 홈 지면 검증으로 고친다 — 카드 누름·「← 목록」 블록을 스트립에서 그 날 누름 → `written-body` 보임으로, 「일기를 작성하는 데 … 걸렸어요」 단언(87행)을 지운다(FR-016a — 소요 시간 없음을 `assertNotVisible: ".*걸렸어요.*"`로 바꾼다)
- [ ] T036 [P] `.maestro/past-day-diary.yml`·`.maestro/photo-selection-over-limit.yml`·`.maestro/today-diary.yml`의 「← 목록이 보이면 누른다」 블록을 「쓰기가 끝나면 홈의 그 날에 `written-body`(또는 실패면 「← 일기」를 누른다)」로 바꾼다
- [ ] T037 [P] 「일기 쓰기」 글자를 누르거나 단언하는 명령 줄을 `id: "write-button"`으로 바꾼다 — `.maestro/dialog-foundation.yml`·`diary-character-select.yml`·`diary-user-path.yml`·`generate-diary.yml`·`past-day-diary.yml`·`photo-selection-over-limit.yml`·`writing-flow-simplified.yml`·`writing-monologue.yml`·`writing-monologue-expansion.yml`(T032 결과 반영). 확인 대화상자 버튼은 id(`overwrite-confirm`·`overwrite-cancel`)로 누르는지 함께 본다(글자 「다시 쓰기」가 바와 겹친다 — FR-037a)

---

## Phase 9: Polish & 검증

- [ ] T038 [P] `__tests__/ui/written-day-reach.test.ts`(T027이 만든 파일)에 REACH1~REACH3·DEL1~DEL4·TXT3을 더한다 — REACH1 `cellFor`에 1년 전 날·`readable:false` 항목, REACH2 `DateJumpDialog.tsx` 소스에 `minDate` 0건, REACH3 `swipeWeek(previous)` 52회 반복이 `null` 아님, DEL1 `DiaryDetailScreen.tsx` 부재, DEL2 `src/`에 `photo-gallery`·`photo-slider`·`diary-reveal-skip`·`PhotoGalleryModal` 0건, DEL3 `src/`에서 `TypewriterText`를 import하는 파일은 `DiaryHomeScreen.tsx` 하나뿐, DEL4 `package.json` `dependencies` 키 집합이 `git show main:package.json`과 같다, TXT3 `WRITTEN_DAY_TEXT`의 각 문장이 `src/ui/` 화면 소스(주석 걷어냄)에 리터럴로 없다. 끝으로 FR-034(모델 식별자 비노출): 새 화면 파일 셋(`WrittenDayPaper`·`PhotoCarousel`·`DiaryListScreen`)이 `models/roster`를 import하면 기존 헌법 검사(`UI_TOUCHES_MODEL`)가 잡는지 한 번 주입해 `npm run lint`로 확인하고 결과를 quickstart §5에 적는다
- [ ] T039 [P] `__tests__/theme-tokens.test.ts`에 `WRITTEN_DAY` 대비를 더한다(기존 대비 계산 함수 재사용) — `text`/`paper` ≥ 4.5, `text`/`rewriteBar` ≥ 4.5, `textMuted`/`rewriteBar` ≥ 4.5(research R7 — 경계에 가깝다), `accentForeground`/`accent` ≥ 3(043 R2 기준 그대로)
- [ ] T040 위반 주입 — quickstart §2 표를 하나씩 넣어 해당 테스트(또는 `tsc`)가 빨간불이 되는지 확인하고 되돌린다. 결과(잡혔다/새었다)를 `quickstart.md` §5에 적는다. 새면 테스트를 고친다
- [ ] T041 `npm test` + `npm run lint`(eslint·tsc·헌법 검사·prettier) 실제 실행, 전부 통과 확인
- [ ] T042 실기기 dev 1회(SM-S901N, **`pm clear` 없이** — quickstart §3): D1~D11을 눈으로 본다. 캐러셀 넘김·순환이 의심스러우면 `adb shell screenrecord` + 프레임 추출(049 방식). **D3에서 흑백이 안 되면 멈추고 저장소 소유자에게 묻는다**(FR-013). 결과를 quickstart §5에 적는다
- [ ] T043 실기기 Maestro — quickstart §4의 목록을 `maestro test`로 직접 돌린다(`run-device-tests.mjs`는 `pm clear`를 하므로 쓰지 않는다). 결과를 quickstart §5에 적는다
- [ ] T044 `spec.md` 끝에 「미확인 잔여」 절을 더한다 — 최소: release(C2, 새 네이티브 없음), T042·T043에서 못 본 것(예: D9 알림이 목표 시각 창 밖이라 `skipped`면 그 사실). 모양 결함이 아닌 관측도 적는다
- [ ] T045 `AGENTS.md`에 「### 051 — 쓴 날 읽기: 홈이 곧 상세」 절을 더한다 — 실측으로 얻은 것만(예: 캐러셀 `onConfigurePanGesture`의 문맥(T017 결과), 흑백 `filter`의 실제 모습, `write-button`을 쓴 날에도 쓰는 이유(R9), 알림 「적용」/「확인」 분리, 실기기에서 새로 드러난 것). 048 절의 「카드 『사진 없음』/『사진 모름』」 관측과 025·017·038 절이 **이력**임을 한 줄로 적는다

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2**(T005~T008) → 스토리.
- **US1**(T009~T015) 먼저 — US2·US3·US4·US5가 모두 그 위에 선다(지면·`paper` prop·`loaded`).
- **US2**(T016~T019)와 **US3**(T020~T025)는 US1 뒤 서로 독립이지만 둘 다 `WrittenDayPaper.tsx`·`DiaryListScreen.tsx`를 고치므로 같은 파일 태스크는 순서대로(T019 ↔ T023).
- **US4**(T026~T029)는 US1 뒤(`loaded`·`paper`로 확인 판정). US3과 `DiaryHomeScreen.tsx`를 함께 고치므로 T024 → T028 순서. T038은 T027이 만든 파일을 확장한다.
- **US5**(T030~T031)는 US1 뒤, `WrittenDayPaper.tsx`를 함께 고치므로 T019 뒤.
- **Phase 8**(Maestro)은 US1~US3 뒤(testID가 정해진 뒤). 흐름 파일끼리는 병렬.
- **Phase 9**는 전부 뒤. T042·T043은 T041 통과 뒤.

### Parallel Opportunities

- Phase 1: T002·T003·T004 동시.
- Phase 2 테스트: T005·T006 동시.
- US1 테스트 T009·T010·T011 동시. US3 테스트 T020·T021 동시. US4 테스트 T026·T027 동시.
- Phase 8: T033~T037 동시(서로 다른 파일 — T036·T037이 같은 파일을 만지면 한 사람이 순서대로).
- Phase 9: T038·T039 동시.

## Implementation Strategy

1. Phase 1·2 → 판정·문구가 초록.
2. **MVP = US1** — 홈에서 읽기. 여기서 멈추면 캐러셀·다시 쓰기 모양이 아직 없으므로 제품으로는 US3까지가 한 덩어리다(쓴 날의 하단 바가 여전히 빨간 「일기 쓰기」).
3. US2 → US3 → US4 → US5 → Maestro → 검증. 커밋은 kickoff 규칙대로 구현 구간 끝에 한 번.
