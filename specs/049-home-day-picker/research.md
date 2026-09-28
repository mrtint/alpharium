# Research: 049 날 고르기

**입력**: [spec.md](spec.md)(Clarifications 2026-09-27 포함), 설계 문서 §3.2, 코드 대조(`main` @ `df54090`)

각 항목은 **Decision / Rationale / Alternatives**로 적는다. 「실측」과 「짐작」을 가른다(원칙 V).

---

## R1. 하루 경계를 자정으로 — 어디를 바꾸는가

**Decision**: `src/config/day-boundary.ts`의 `DAY_STARTS_AT_HOUR`를 **없애고**(0을 상수로 남기지 않는다) 하루를 기기
로컬 달력 날짜로 정의한다. 공개 함수의 이름·시그니처는 가능한 한 유지해 소비처가 바뀌지 않게 한다.

| 함수 | 지금(04:00) | 049 |
| --- | --- | --- |
| `dayOf(instant)` | 4시간 뺀 뒤 달력 날짜 | 달력 날짜 그대로 |
| `dayBounds(day)` | `[day 04:00, day+1 04:00)` | `[day 00:00, day+1 00:00)` |
| `isDayClosed(day, now)` | `dayOf(now) > day` | 그대로(뜻은 「자정이 지났다」) |
| `latestClosedDay(now)` | 4시간 뺀 뒤 −1일 | `dayOf(now)` −1일 |
| `selectableDays(now)` | 사흘, 정오 이후 오늘 포함 | **그대로**(경계만 자정) — R4 |
| `isDayWritable(day, now)` | 닫힘 ∨ (오늘 ∧ 정오 이후) | **미래가 아니다**(`day <= dayOf(now)`) — R2 |
| `writableAt(day, now)` | 쓸 수 있게 되는 시각 | **삭제** — R2 |
| `stripDays(now)`·`STRIP_DAY_COUNT` | 오늘로 끝나는 7일 | **삭제**, `weekOf`로 대체 — R3 |
| (신규) `weekOf(day)` | — | 그 날이 든 일~토 7일 |
| (신규) `shiftWeek(day, weeks)` | — | 같은 요일 ±7n일 |
| (신규) `nextDayStartAt(now)` | — | 다음 자정의 `Date` — 전환 타이머용(R6) |

**Rationale**:
- 경계는 이 파일 한 곳에만 있어야 한다(002 FR-021a). 값만 바뀌고 「한 곳」 원칙은 그대로다.
- `dayBounds`가 신호 수집 구간을 정하고(`signals/collect.ts`), `dayOf`가 저장 날짜·파이프라인 날짜를 정한다. 이 둘만
  바꾸면 소비처(파이프라인·신호·저장·백그라운드·알림)가 자동으로 따라온다 — 소비처에 경계 계산이 없다는 것이 004·009가
  지켜 온 구조의 대가다.
- 헌법 2.0.0에는 04:00이 없다(`constitution.md` 전문 확인). 개정 불필요.

**★ 따라오는 것(코드 대조로 확인)**:
- **★ `src/vision/select.ts:183`에 04:00이 복제돼 있다** — `bucketIndexOf()`가 `takenAt.getHours() - 4`로 「하루의 04:00을
  0으로 놓은」 시간 칸을 직접 계산한다(023이 「`day-boundary.ts`를 import하지 않는다 — 순수 유지」라며 둔 것). 경계만 자정으로
  바꾸고 이것을 놓치면 **사진 선별의 시간 칸이 네 시간 어긋난 채 오류 없이 돈다**(00:00~04:00 사진이 마지막 칸으로 간다).
  자정 기준 분(`getHours() * 60 + getMinutes()`)으로 바꾸고 023의 time-distribution 테스트 기대값을 고친다. DB11이 이 자리의
  재발을 막는다.
- `src/` 안의 04:00 설명 주석(`state.ts`·`pipeline.ts`·`decision.ts`·`retry.ts`·`collect.ts`·`signals/types.ts`·
  `DiaryListScreen.tsx`·`home-text.ts`)과 `scripts/run-device-tests.mjs`·`scripts/seed/plan.ts` 주석을 자정으로 고친다.
  주석이 옛 경계를 말하면 다음 사람이 그것을 사실로 읽는다.
- `scripts/seed/shapes.ts` — 사진 시각을 `dayBounds(day).startMs + hours`로 만든다. 시작이 00:00으로 당겨지면 같은
  `hours`가 네 시간 이른 시각이 된다. 모양별 시각 표와 「자정 전에 들도록」 주석(204~211행)을 새 경계로 다시 맞춘다.
  **앱 코드 변경 0줄**이라는 010의 성질은 유지된다(도구만 고친다).
- `__tests__/config/day-boundary.test.ts`·`seed/day-range.test.ts`·`signals/collect.test.ts`·`vision/select.test.ts`
  등 04:00·정오 경계값을 박은 기존 테스트 15개 파일이 기대값을 바꾼다(목록: plan.md 「영향받는 파일」).
- 저장된 일기는 옮기지 않는다(FR-018a). 파일명이 곧 날짜이므로 읽기에 영향이 없다.

**Alternatives**:
- `DAY_STARTS_AT_HOUR = 0`만 바꾸기 — 가장 작은 변경이지만 「0시간 빼기」라는 죽은 계산과 「새벽은 전날」 주석이 남아
  다음 사람이 경계가 04:00처럼 조정 가능한 값이라고 읽는다. 기각.

---

## R2. 정오 제한을 없앤 뒤의 쓰기 게이트

**Decision**: `isDayWritable(day, now) = day <= dayOf(now)`. `writableAt()`과 그것을 쓰는 048의 갈래 전부 삭제:
`WritePrompt.writableAt`, `WriteBar`의 `write-unavailable` 갈래, `SignalRow`의 「…부터」 값, `DiaryHomeScreen`의 전환
타이머(`opensAtMs`·`WRITABLE_TIMER_SLACK_MS`), `home-text.ts`의 `hourText`·`HALF_DAY_HOURS`.
~~`WritePrompt.writable`은 남긴다~~ → **구현 중 뒤집었다**: `writePromptFor`가 미래 `chosenDay`를 오늘로 떨어뜨리므로
`writable`은 언제나 참이었다(도달 불가). 필드와 화면·`write()`의 게이트를 걷어내고, 미래 날의 방어는 파이프라인의
`isDayWritable` 게이트 하나로 남겼다.

**Rationale**: 사용자 결정(Clarifications Q1). 도달할 수 없는 갈래를 남기면 그것은 계약이 아니라 거짓말이다(042 `skipped`
교훈). `writable`도 같은 이유로 걷어냈다(위).

**따라오는 것**:
- `prompt.ts`의 `DAY_STILL_OPEN`은 그대로. `request.ts:56`이 `!isDayClosed(day, now)`로 계산하므로 오늘이면 언제나
  참 — 아침에 쓴 오늘 일기도 「아직 끝나지 않았다」를 싣는다(사실이다).
- **040 첫 실행 자동 생성**(`App.tsx:813`)이 `isDayWritable(today)`를 본다 → 이제 언제나 참. 첫 실행을 오전에 마쳐도
  오늘 일기를 자동으로 쓴다. 사용자 결정의 직접 귀결이며 이 조각에서 따로 막지 않는다(spec Assumptions에 기록).
- **백그라운드**는 `isDayWritable`이 아니라 `selectableDays` + 목표 시각 창(`decision.ts`)으로 고르므로 행동이 바뀌지
  않는다(R4).

**Alternatives**: `isDayWritable`을 없애고 호출부에서 `day <= dayOf(now)` 직접 비교 — 판정이 세 곳에 복제된다(012가 막은
것). 기각.

---

## R3. 주 계산과 스와이프의 순수 판정

**Decision**: 주·스와이프 판정은 전부 순수 함수로 둔다.

- `day-boundary.ts`: `weekOf(day)`(일요일 시작 7일), `shiftWeek(day, n)`. 달력 산술은 `new Date(y, m-1, d + k)`로 하고
  **원본에서 매번 더한다**(기존 `selectableDays`의 서머타임 주석과 같은 이유).
- `app/state.ts`:
  - `weekCellsFor(items, prompt, now): StripCell[]` — `weekOf(prompt.day)` 7칸에 `hasDiary`·`isToday`·`selectable`
    (`isDayWritable`)·`selected`를 얹는다. `stripCellsFor`를 대체한다.
  - `swipeWeek(selected, direction, now): DayDate | null` — `"previous"`면 `shiftWeek(selected, -1)`. `"next"`면
    오늘이 든 주 안에서는 `null`(튕김), 아니면 `shiftWeek(selected, +1)`을 오늘로 clamp(FR-006).
  - `canSwipeNext(selected, now): boolean` — 화면이 끌림 저항(러버밴드)을 걸지 정한다. `swipeWeek(...,"next") !== null`.

**Rationale**: 화면(`DayPicker`)은 판정하지 않는다(048 S-계약). 04:00 경계 테스트가 가능했던 것처럼 주 계산·연말·clamp를
기기 없이 전부 검증한다.

**Alternatives**: 스트립 컴포넌트 안에서 `Date` 계산 — 경계가 화면으로 샌다. 기각.

---

## R4. 「사흘」 범위의 소비처 — 그대로 두고 분리

**Decision**: `selectableDays(now)`는 개수(3)·구성(정오 이후에만 오늘 포함)을 **그대로 둔다**. 정오 상수
(`WRITABLE_FROM_HOUR`)는 이 함수의 구성 규칙에서만 쓰이는 값으로 남고, 주석을 「백그라운드·알림·미리 준비의 범위 규칙」으로
고친다. 화면은 이 함수를 더 이상 부르지 않는다(`writePromptFor`에서 제거).

소비처 셋(코드 대조로 확인):

| 소비처 | 위치 | 049 이후 |
| --- | --- | --- |
| 백그라운드 재시도 | `schedule/task.ts:110` → `decision.ts` → `retry.ts` | 뜻 불변(경계만 자정) |
| 알림 기록 정리 | `notified-store.ts:115` 주석 → `task.ts`의 `keepFrom` | 뜻 불변 |
| 029/018 사진 있는 날 탐색 | `App.tsx:1233` `photoDays` | 뜻 불변 — 단 R5 |

`isDayWritable`의 뜻이 바뀌어도 `selectableDays`의 구성은 `isDayWritable`에 기대지 않도록 **정오 비교를 함수 안에 직접**
둔다(지금은 `isDayWritable(today) && !isDayClosed(today)`로 정오를 간접 판정한다 — 이것이 바뀌면 백그라운드가 조용히
아침에 오늘을 쓰게 된다. **바로 이 자리가 이 스펙에서 가장 조용히 깨질 수 있는 곳이다**).

**Rationale**: 사용자 결정(Clarifications Q4 — 자동 생성 변경은 제외). 계약 테스트가 「정오 전 `selectableDays`에 오늘이
없다」를 잠근다(FR-021).

**Alternatives**: 백그라운드용 별도 함수로 복사 — 같은 규칙이 두 곳. 기각.

---

## R5. ★ 사흘 밖의 날에서 미리 준비(018)가 기기를 죽일 수 있다

**발견(코드 대조, 실측 아님)**: `App.tsx:1225~1250`의 `photoDays`는 `selectableDays`(사흘)만 훑는다. 사흘 밖의 날은
`photoSignalPresent: false` → `hasPhotos: false` → `DiaryHomeScreen`의 1단계 미리 준비가 **캐릭터 모델을 연다**
(`prepare()`). 그 날에 실제로 사진이 있으면 「쓰기」 때 `generate()`가 사진 읽기(VLM)를 시작하는데,
`on-device.ts:363~366`의 주석대로 **`prepare()` 뒤에 VLM이 오면 두 모델이 동시에 열려 기기가 죽는다(E1·E15)**. 049 이전에는
사흘 밖의 날을 고를 수 없어 도달 불가였다. **049가 이 길을 연다.**

**Decision**: 미리 준비는 **사진 유무를 확인한 날에서만** 한다. `DiaryHomeScreen`에 `canPrepare?: (day) => boolean`을 더하고
App이 「`photoDays`가 훑은 날인가」(= `selectableDays(now)`에 있는가)를 넘긴다. 거짓이면:
1. 1·2단계 미리 준비를 둘 다 건너뛴다(`prepare`·`captionDay`를 부르지 않는다),
2. 이미 준비된 컨텍스트가 있으면 `release()`로 놓아준다.

그러면 사흘 밖의 날은 018 이전과 같은 경로(`generate()`가 VLM → 닫기 → 캐릭터 모델 순서를 스스로 지킨다)로 쓴다. 느려질
뿐 틀리지 않는다(018 E10과 같은 대가).

**Rationale**: FR-020(미리 준비의 범위는 그대로)과 원칙 I(기기가 죽으면 일기가 없다)을 함께 지키는 가장 작은 변경.
`photoDays`를 모든 날로 넓히면 날을 고를 때마다 미디어 조회가 돌고, 조회가 끝나기 전의 경쟁 구간이 생긴다.

**검증**: 계약 테스트(사흘 밖의 날을 고르면 `prepare`·`captionDay`가 불리지 않고 `release`가 불린다) + 실기기에서
사흘 밖의 사진 있는 날을 1회 써 본다(quickstart D9).

**Alternatives**: 날을 고를 때 그 날만 훑기 — 비동기 경쟁(결과 전에 1단계가 돈다). 기각. `generate()`가 시작 때 언제나
`release()` — `prepare()`의 KV 캐시 이득(018)을 전부 버린다. 기각.

---

## R6. 자정 전환 — 켜 둔 채 날이 바뀔 때

**Decision**:
- 고른 날은 `AppFrame`이 들고 있다(048 Q4). 초기값을 `null`에서 **마운트 시점의 `dayOf(new Date())`**로 바꾼다(FR-010a —
  「새로 열면 오늘」). `null`을 기본값으로 두면 자정 뒤 기본값이 새 오늘로 따라가 「보던 날 유지」(FR-019)가 깨진다.
- `DiaryHomeScreen`은 048의 전환 타이머 자리에 **다음 자정 타이머**를 둔다: `nextDayStartAt(now) + 1초`에 `tick`을 올려
  다시 그린다. `AppState` `active`의 `tick`도 유지(잠든 동안 타이머가 밀린다 — 048 R4 실측과 같은 이유).
- `writePromptFor(items, now, chosenDay)`: `chosenDay`가 미래가 아니면 그대로, 없거나 미래면 `dayOf(now)`. 되돌림
  (`revertedFrom`)은 삭제(FR-022a) — 미래로 밀려나는 경로가 없다.

**Rationale**: 판정은 매 렌더(`now()`)이고 저장하지 않는다(009·048과 같은 방식).

---

## R7. 스와이프 제스처 — gesture-handler 2.32 + reanimated 4.5

**출처(C1)**:
- `npx ctx7@latest docs /software-mansion/react-native-gesture-handler/v2.29.1 "Gesture.Pan activeOffsetX failOffsetY
  onUpdate onEnd translationX velocityX runOnJS"` — `Gesture.Pan().activeOffsetX([-10,10]).failOffsetY([-5,5])`,
  `onUpdate(e => e.translationX)`, `onEnd(e => e.velocityX)`, `withSpring`으로 복귀하는 예제. 문서 판은 v2.29.1이고
  설치본은 `~2.32.0`이다 — **API 존재는 설치본의 타입으로 확인했다**:
  `node_modules/react-native-gesture-handler/lib/typescript/handlers/gestures/panGesture.d.ts`(`activeOffsetX`·
  `failOffsetY`), `gesture.d.ts:162`(`runOnJS(runOnJS: boolean): this`).
- 같은 라이브러리의 v3 문서(`usePanGesture`)가 기본 ID로 나온다 — **v3 API다. 이 저장소는 v2이므로 쓰지 않는다.**
- `npx ctx7@latest docs /software-mansion/react-native-reanimated/4.1.5 "scheduleOnRN ... withSpring ... withTiming"` —
  Reanimated 4에서 UI 스레드에서 JS를 부르는 것은 `react-native-worklets`의 `scheduleOnRN`(설치됨, 0.10.1). 문서 판
  4.1.5, 설치본 4.5.1.
- jest: `react-native-gesture-handler/jestSetup.js`와 `jestUtils`의 `fireGestureHandler`·`getByGestureTestId`
  (설치본 `lib/typescript/jestUtils/jestUtils.d.ts`에서 확인).

**Decision**:
- `Gesture.Pan().runOnJS(true).activeOffsetX([-10, 10]).failOffsetY([-10, 10]).withTestId("day-strip-pan")`.
  - `runOnJS(true)` — 콜백이 JS 스레드에서 돈다. `scheduleOnRN`·worklet이 필요 없어 jest에서 `fireGestureHandler`로
    그대로 쏠 수 있다. 끌림 표시는 공유 값(`translateX`)에 대입하므로 JS에서 돌아도 된다(짐작: 7칸 한 줄을 옮기는 정도의
    부하에서 JS 스레드 지연은 눈에 띄지 않는다 — **실기기 D4에서 확인**).
  - `failOffsetY` — 세로 스크롤(`ScrollView`)과 겨루지 않게 한다. 「읽기 스크롤」 조각이 나중에 스트립을 세로 스크롤
    안에 넣어도 같은 규칙이 통한다.
- `onUpdate`: `translateX = canNext || tx > 0 ? tx : tx * RUBBER_BAND`(다음 주가 없으면 끌림을 줄인다).
- `onEnd`: `|translationX| >= SWIPE_DISTANCE || |velocityX| >= SWIPE_VELOCITY`면 방향을 정해 `onSwipe("previous"|"next")`,
  아니면 아무 것도 안 한다. 언제나 `translateX = withSpring(0)`.
  - 오른쪽으로 끌면(`tx > 0`) 이전 주, 왼쪽이면 다음 주.
  - `swipeWeek`가 `null`을 주면(다음 주 없음) 날을 바꾸지 않고 스프링만 돈다 = 「살짝 끌리다 제자리로 튕김」.
- 수치 `SWIPE_DISTANCE = 40`, `SWIPE_VELOCITY = 500`, `RUBBER_BAND = 0.25`는 **사람이 정한 값**이다(보드에 수치 없음).
  실기기 D4에서 느낌을 보고 필요하면 조정한다.
- 7칸 **교체는 즉시**다(칸이 옆으로 흘러 들어오는 페이지 넘김 애니메이션을 만들지 않는다). 보드 원문은 「7칸이 통째로
  이전/다음 주로 교체」이고 이어 스크롤을 금지한다.
- 칸 탭(`Pressable`)과 팬은 `activeOffsetX` 10pt 문턱으로 갈린다 — 문턱 전에 손을 떼면 탭이다.

**Alternatives**: RN `PanResponder` + `Animated` — Clarifications Q6에서 기각. `react-native-reanimated-carousel`로 주를
페이지로 — 이어 스크롤·가운데 정렬 금지(보드)와 어긋나고 무한 과거 페이지를 만들어야 한다. 기각.

---

## R8. 150ms 크로스페이드

**Decision**: 헤더의 숫자·요일 묶음을 두 겹으로 그린다 — 이전 날(`absolute`, 불투명도 1→0)과 새 날(1←0). 두 공유 값에
`withTiming(…, { duration: 150 })`. 이전 날은 `useRef`로 기억하고 전환이 끝나면(다음 전환 때 덮어씀) 버린다.

**Rationale**: 레이아웃 애니메이션(`entering`/`exiting`)은 나가는 뷰가 흐름 안에 남아 순간적으로 높이가 두 배가 될 수
있다(짐작 — 확인하지 않았다). 두 겹 절대 배치는 높이가 새 날 하나로 고정된다. jest 목(`useSharedValue`·`withTiming`)이
이미 있어 새 목이 필요 없다.

**검증**: jest는 「날이 바뀌면 이전 날 노드가 함께 렌더되고 새 날이 보인다」까지만(C9). 움직임은 실기기 D3.

---

## R9. 상태 줄 문구

**Decision**(`home-text.ts`의 `dayStateText(write, item)` 하나에서 조립):

| 상황 | 문구 | 출처 |
| --- | --- | --- |
| 일기 없음, 오늘 | 오늘 일기를 쓸 수 있어요 | 보드 `t.dayState` |
| 일기 없음, 지난 날 | 이 날 일기를 쓸 수 있어요 | 보드 `m.dayStatePast` |
| 일기 있음, 제목 있음 | (제목) | 보드 |
| 일기 있음, 제목 없음 | 이 날 일기를 썼어요 | **사람이 정한 값**(보드에 없음, 014 `title: undefined`) |
| 일기 있음, 읽을 수 없음 | 읽을 수 없어요 | 목록 카드와 같은 말(006 FR-017a) |

「오늘 일기를 썼어요」로 나누지 않는다 — 헤더에 「오늘」 글자가 없다는 규칙(FR-015)과 부딪힌다. 오늘 문구
「오늘 일기를 쓸 수 있어요」는 보드 원문이 스스로 「오늘」을 담으므로 예외로 둔다 — **FR-015의 「오늘」 금지는 날짜
표시(라벨) 자리의 이야기**이고 상태 줄 문장은 보드가 정한 것이다. spec FR-015를 이 뜻으로 고쳐 적는다.

---

## R10. 되돌림 캡션 삭제

**Decision**: `WritePrompt.revertedFrom`, `revertedText`, `Notices`의 되돌림 줄, 관련 테스트를 지운다. 캐릭터 옮김·거부
권한 캡션은 그대로(FR-022a).

---

## R11. Maestro 영향

| 흐름 | 영향 | 조치 |
| --- | --- | --- |
| `today-diary.yml` | 「이미 썼어요 · 다시 쓰면 덮어써요」 문구를 기다린다(60~63행) | 제목 또는 「이 날 일기를 썼어요」로 |
| `diary-home-1d.yml` | 스트립 7칸 가정, 날짜 칸 탭 | 주 스트립 가정으로 다시 확인 |
| `past-day-diary.yml` | 「셋으로 늘었는가」를 본다 | 이전 주로 스와이프해 사흘 밖의 날을 고르는 단계로 확장 |
| `photo-selection-over-limit.yml` | `day-${SEED_DAY}`가 스트립에 보여야 한다 | 심은 날이 지난 주면 `swipe`로 넘어간다 |
| `writing-flow-simplified.yml` | `write-day-label` | 영향 없음(확인만) |
| 신규 `week-strip-swipe.yml` | — | 스와이프 이전 주·튕김·요일 유지. `FLOWS` 등록 |

`run-device-tests.mjs`의 009 주석(「고를 수 있는 하루가 셋으로 늘었는가」)도 고친다.
