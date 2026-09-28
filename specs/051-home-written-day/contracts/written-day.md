# Contract: 쓴 날 읽기 (051)

기기 없는 테스트가 잠그는 계약이다. 각 항목에 **위반 주입**(실제로 어겨 보고 잡히는지 확인할 변경)을 붙였다.
jest는 배선만 본다 — 캐러셀의 실제 넘김·순환·흑백·세로/가로 제스처 분리는 실기기에서 본다(C9). 캐러셀은
`jest/setup-ui.ts`의 목이 첫 슬라이드만 그리므로, 목이 받은 props(`loop`·`onSnapToItem`·`onConfigurePanGesture`)를
host 노드에 넘기도록 확장해 **배선**을 검사한다.

## PAP — 지면 판정 (`src/app/written-day.ts`, 순수)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| PAP1 | 목록에 그 날이 없으면 `unwritten` — `loaded`가 무엇이든 | `loaded.entry`가 있으면 `readable` |
| PAP2 | 목록이 `readable: false`면 `unreadable` — `loaded`가 무엇이든 | `loaded` 먼저 보기 |
| PAP3 | 목록 readable + `loaded` 없음 또는 다른 날 → `loading`(늦게 온 결과 버림) | `loaded.day` 비교 제거 |
| PAP4 | 목록 readable + 같은 날 `entry === null` → `unreadable`(빈 일기를 지어내지 않는다) | `null`을 `unwritten`으로 |
| PAP5 | 목록 readable + 같은 날 entry → `readable`(그 entry 그대로) | — |
| PAP6 | 소스에 `new Date(`·`Date.now(`·`expo-file-system`·`store`가 없다(주석 걷어냄) | 함수 안에서 `new Date()` |

## ST — 화면 상태 (`src/app/state.ts`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| ST1 | `AppScreen`에 `detail`·`unreadable`·`written` 갈래가 없고 `toDetail`이 export되지 않는다(소스 검사) | `detail` 되살리기 |
| ST2 | `afterGeneration(ok)` → `{ kind: "home" }` — `overwrote` 값과 무관 | `overwrote`면 다른 갈래 |
| ST3 | `afterGeneration(저장 실패 + entry)` → `{ kind: "unsaved", entry }` | `failed`로 |
| ST4 | `afterGeneration(그 밖 실패)` → `{ kind: "failed", message: describeStage(...) }`, `text` 필드 없음(006 FR-030) | message에 본문 |
| ST5 | `toWriting()`은 인자가 없다(`Function.length`가 아니라 소스 선언 검사 — 009 교훈) | 인자 추가 |
| ST6 | `initialScreen`은 `build-error` 또는 `list`만 돌려준다 — 알림 인자를 받지 않는다 | `detail` 반환 |

## HOME — 홈 화면 (`DiaryHomeScreen` + `DiaryListScreen`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| HOME1 | `home-recent`·`home-count`·`diary-card-*`가 어떤 상태에서도 렌더되지 않는다. `DiaryListScreen`에 `onOpen` prop이 없다(소스) | 목록 되살리기 |
| HOME2 | 쓴 날(readable)을 고르면 `home-day-title`에 제목, `written-paper`에 본문 전문(`written-body`)이 보이고, 화면 전환이 없다(홈의 `home-day-number`가 남아 있다) | 상세 화면으로 전이 |
| HOME3 | 제목 노드: `numberOfLines={2}`, `ellipsizeMode="tail"`, 15/700 `COLORS.text`, 누름 핸들러 없음(`onPress` 없음, `accessibilityRole` 버튼 아님) | `numberOfLines` 1 / `Pressable`로 감싸기 |
| HOME4 | 제목 없는 readable → 상태 줄 「이 날 일기를 썼어요」, unreadable → 「읽을 수 없어요」 — 둘 다 13 `textMuted`(제목 스타일 아님) | 제목 스타일 적용 |
| HOME5 | 쓴 날에는 `signal-row`가 없고 안 쓴 날에는 있다 | 쓴 날에도 신호 줄 |
| HOME6 | 안 쓴 날은 048·049·050 그대로 — 상태 줄 「오늘/이 날 일기를 쓸 수 있어요」, `write-button` 글자 「일기 쓰기」, `write-day-label` 있음 | — (기존 테스트 유지) |
| HOME7 | 날을 A(쓴 날) → B(쓴 날)로 바꿨는데 A의 `load`가 B보다 늦게 끝나도 지면은 B의 본문이다 | `loaded.day` 비교 제거(PAP3와 함께) |
| HOME8 | 읽는 중(`loading`)에는 `written-paper`가 있고 비어 있다(본문 없음), `signal-row`가 없다, 회전 표시(`ActivityIndicator`)가 없다 — 하단 바 모양은 BAR1 | 로딩 중 신호 줄 |
| HOME9 | unreadable → `written-unreadable`에 「이 날의 일기 파일이 손상됐어요.」·「다시 쓰면 새로 남아요.」, 캐러셀 없음 — 하단 바 모양은 BAR1 | 빈 본문 렌더 |
| HOME10 | 지면 배경 = `WRITTEN_DAY.paper`, 본문 15 / 줄높이 15×1.65 / 안쪽 여백 16 20 104 / 문단 간격 14(문단은 빈 줄로 가른다) — 인라인 style 검사 | 여백 아래 24 |
| HOME12 | 쓴 날 헤더에 「오늘」 글자가 없다(FR-007a) — 오늘의 쓴 날에서 `queryByText(/오늘/)`이 헤더 영역에 없다 | 헤더에 「오늘」 |
| HOME13 | 앱이 `background` → `active`로 돌아오면 목록과 고른 날의 일기를 다시 읽는다 — 그 사이 저장소에 새로 쓴 본문이 보인다(FR-016c). 덮어쓰기 대화상자가 떠 있는 채 복귀하면 대화상자가 그대로다(050 OW10) | 복귀 시 `tick`만 / 복귀 결과로 `setScreen(toList)` 무조건 |
| HOME11 | 쓴 날 화면에 「이 일기가 본 것」·「걸렸어요」·「대표 장소」·「이렇게 일기를 작성했어요」·「덮어썼다」가 없다 | 절 되살리기 |

## CAR — 캐러셀 (`src/ui/PhotoCarousel.tsx`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| CAR1 | 사진 0장·`photos` 없음 → `photo-carousel`·`photo-carousel-badge`·`photo-carousel-indicator` 모두 없음, 본문이 지면 첫 자식 | 빈 상자 렌더 |
| CAR2 | 사진 1장 → `photo-carousel-single`(사진 하나) 있음, 배지·인디케이터·`Carousel` 없음 | 1장에도 `Carousel` |
| CAR3 | 사진 3장 → `Carousel`에 `loop={true}`, `onConfigurePanGesture` 함수, `data.length === 3`(목 host props 검사) | `loop` 제거 / 핸들러 제거 |
| CAR4 | 사진 3장 → 배지 「1 / 3」, 인디케이터 3칸, 첫 칸만 18×4 `COLORS.text`, 나머지 6×4 `WRITTEN_DAY.indicatorIdle` | 칸 폭 같게 |
| CAR5 | `onSnapToItem(2)`를 쏘면 배지 「3 / 3」, 셋째 칸이 긴 막대 | 배지를 `index`로(0부터) |
| CAR6 | 사진 면: 높이 210, `resizeMode="cover"`, 감싼 View에 `filter: [{ grayscale: 1 }]` | `contain` / filter 제거 |
| CAR7 | 배지: accent 배경 + `COLORS.accentForeground` 글자, 11/700, 위·오른쪽 10(인라인 style) | 글자 `COLORS.bg` |
| CAR8 | 이미지 `onError` → 그 슬라이드에 「이 사진은 이제 없어요」(`diary-photo-missing`), 배지 전체 수는 그대로 | 슬라이드 빼기 |
| CAR9 | 사진 노드·슬라이드에 누름 핸들러가 없다(갤러리 없음) | `Pressable` + 갤러리 |
| CAR10 | 날이 바뀌면 캐러셀이 새로 마운트되어 배지가 「1 / n」에서 시작한다(`key` = 날) | `key` 제거 |
| CAR11 | 소스에 `react-native-reanimated-carousel/` 딥 import가 없다(v5 규칙) | `.../src/...` import |

## BAR — 하단 바 (`2c`·`2g`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| BAR1 | 쓴 날(readable·unreadable·loading 모두) 하단 바의 버튼 = testID `write-button`, 글자 「다시 쓰기」, 배경 `WRITTEN_DAY.rewriteBar`, 글자 17/800 `COLORS.text`, `write-day-label` 없음 | 빨강 배경 / 날짜 조각 |
| BAR2 | 「다시 쓰기」 → `overwrite-dialog`(050). 취소 → 지면 그대로, 생성 0회 | 곧바로 생성 |
| BAR3 | 오늘 + readable → `written-at`에 `writtenAtText(createdAt, now)`, 11/500 `textMuted` | — |
| BAR4 | 지난 날 readable, 오늘 unreadable, 오늘 loading → `written-at` 없음 | 조건에서 `isToday` 제거 |
| BAR5 | 오늘 readable을 보는 동안 가짜 시계로 60초 진행 → 문구가 바뀐다(「방금 작성」 → 「1분 전에 작성」). 지난 날에는 타이머가 없다(`jest.getTimerCount`) | 인터벌 제거 |
| BAR6 | `⋯` 메뉴(`home-menu-button`)는 쓴 날에도 있다 | 쓴 날에 메뉴 없음 |
| BAR7 | 오늘 판정은 `cellFor`에서 온다 — 홈 화면 소스에 `dayOf(`가 새로 늘지 않는다(049 G9·050 CAL5 계승, 소스 검사) | `dayOf(now()) === day` |

## TIME — 상대 작성 시각 (`home-text.ts` `writtenAtText`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| TIME1 | 0초·59초 → 「방금 작성」, 미래(−5분) → 「방금 작성」 | 음수 그대로 |
| TIME2 | 60초 → 「1분 전에 작성」, 59분 59초 → 「59분 전에 작성」 | 반올림 |
| TIME3 | 60분 → 「1시간 0분 전에 작성」, 2시간 15분 30초 → 「2시간 15분 전에 작성」 | 「1시간 전에 작성」 |
| TIME4 | 소스에 `getHours`·`setHours`가 없다(하루 경계가 아니다, 049 DB11) | `getHours()` 사용 |

## GEN — 쓰기 뒤 (`DiaryHomeScreen`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| GEN1 | 쓴 날 「다시 쓰기」 → 확인 → 성공 → 홈(`home-day-number`), 고른 날 그대로, 지면에 **새** 본문, 타자기 노드(`diary-reveal-skip`) 없음 | 결과 화면으로 |
| GEN2 | 안 쓴 날 「일기 쓰기」 → 성공 → 홈, 그 날이 이제 쓴 날(제목·지면) | 목록 다시 읽기 누락 |
| GEN3 | 저장 실패(글 있음) → `unsaved-screen`: 「저장하지 못했어요. 앱을 나가면 이 일기는 사라져요.」 + 제목 + 본문, 캐러셀 없음, 「← 일기」 | 홈으로 |
| GEN4 | `unsaved`·`failed`에서 「← 일기」·뒤로 가기 → 홈, 고른 날 그대로, 그 날은 쓰기 전 상태(이전 일기 또는 안 쓴 날) | 저장 안 된 글을 지면에 |
| GEN5 | 실패 화면의 뒤로 가기 글자 = 「← 일기」, 앱 어디에도 「← 목록」이 없다(소스 검사) | 「← 목록」 |
| GEN6 | 그만두기 → 홈, 고른 날 그대로, 이전 일기 그대로 | — (기존) |

## NR — 알림 라우팅 (020)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| NR1 | `initialDay`(쓴 날)로 마운트 → 홈의 고른 날 = `initialDay`, 지면에 그 일기, `onInitialDayApplied` 1회, `onAcknowledge(initialDay)` 1회 | 상세로 |
| NR2 | `initialDay`의 일기가 없거나 unreadable → 고른 날 = `initialDay`, `onInitialDayApplied` 1회, `onAcknowledge` 0회 | 없어도 확인 |
| NR3 | 마운트 뒤 `initialDay`가 바뀌면(웜 알림) 고른 날이 새 날로 바뀐다 | 마운트 때만 적용 |
| NR4 | 사용자가 스트립에서 readable 날을 고르면 `onAcknowledge(그 날)` 1회. 같은 날을 다시 그려도 다시 불리지 않는다 | 렌더마다 호출 |
| NR5 | App: `onInitialDayApplied`가 `pendingRoute`를 비운다 — 설정 왕복(재마운트) 뒤 알림의 날로 되돌아가지 않는다(소스 검사) | 확인 때만 비움 |

## REACH — §2 성립 조건 (원칙 I)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| REACH1 | 과거 임의의 날(예: 1년 전) 일기에 대해 `cellFor`가 `hasDiary: true`·고를 수 있음(미래 아님)이다 — 읽을 수 없는 일기 포함 | `hasDiary`가 `readable`만 |
| REACH2 | 달력(050)의 가장 이른 날 한계가 없다 — `DateJumpDialog`에 `minDate`가 없다(소스 검사, 050 계약 재확인) | `minDate` 추가 |
| REACH3 | `swipeWeek(previous)`는 과거로 한계 없이 한 주씩 간다(049 계약 재확인 — 1년 전 주까지 반복 적용해도 `null`이 아니다) | 과거 하한 |

## TXT — 문구 (`home-text.ts`, C4)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| TXT1 | `WRITTEN_DAY_TEXT.rewrite === "다시 쓰기"`(보드 `h2.rewrite`) | 「다시쓰기」 |
| TXT2 | `writtenAtText` 틀이 보드 `m.writtenAt13` 「2시간 15분 전에 작성」과 글자 단위로 같다(2h15m 입력) | 「2시간 15분 전 작성」 |
| TXT3 | 읽을 수 없음 두 줄·사진 없음·저장 실패·「← 일기」가 `home-text.ts`에만 있고 화면 소스에 리터럴이 없다(주석 걷어냄) | 화면에 리터럴 |

## DEL — 없어지는 것 (소스 검사)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| DEL1 | `src/ui/DiaryDetailScreen.tsx`가 없다 | 파일 되살리기 |
| DEL2 | `src/`에 `photo-gallery`·`photo-slider`·`diary-reveal-skip`·`PhotoGalleryModal` 문자열이 없다 | 갤러리 되살리기 |
| DEL3 | `TypewriterText`는 쓰는 중 독백(039)에만 쓰인다 — `DiaryHomeScreen`의 `writing` 갈래 밖에서 import·렌더되지 않는다 | 지면에 타자기 |
| DEL4 | 새 의존성 0 — `package.json` `dependencies` 키 집합이 051 전과 같다 | 패키지 추가 |
