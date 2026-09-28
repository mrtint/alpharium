# Research: 쓴 날 읽기 — 홈이 곧 상세

**Feature**: [spec.md](spec.md) · **Date**: 2026-09-28

설계 §1 C1(라이브러리는 plan에서 문서·설치본으로 확인)을 따른다. 짐작과 확인을 가른다(원칙 V) — 각 절 끝에 **확인 방법**을 적는다.

---

## R1. 캐러셀 — `react-native-reanimated-carousel`을 쓴다 (새 의존성 아님)

**Decision**: 사진이 2장 이상일 때만 `react-native-reanimated-carousel`의 `Carousel`을 `loop`로 쓴다. 1장이면 캐러셀 없이 사진 하나를 그린다.

**Rationale**:
- **이미 설치돼 있다** — `package.json`의 `"react-native-reanimated-carousel": "^5.1.1"`, 설치본 `node_modules/react-native-reanimated-carousel/package.json` `"version": "5.1.1"`. 046 `DownloadProgressScreen`이 `loop`·`autoplay`로 쓰고 있다. 사용자 지시의 「새 의존성 후보」는 새로 들일 것이 없다.
- **네이티브 모듈이 딸려 오지 않는다** — 설치본에 `android/`·`ios/`·`*.podspec`·`build.gradle`·`*.java`·`*.kt`·`*.mm`이 없다(`find`로 0건). `peerDependencies`는 `react-native-gesture-handler >=2.9.0 <4.0.0`(설치 2.32)·`react-native-reanimated >=4.1.0`(설치 4.5.1)·`react-native-worklets >=0.5.0` — 모두 이미 설치된 것이다. 따라서 C2대로 dev 1회로 끝난다.
- **순환(`loop`)이 이유다** — 025의 `ScrollView pagingEnabled`로는 3 → 1 순환을 만들 수 없다(끝에서 멈춘다, 025 FR-011이 그것을 계약으로 삼았다). 순환을 손으로 만들려면 앞뒤 복제 슬라이드와 점프 보정이 필요하고, 그것이 이 라이브러리가 하는 일이다.
- **세로 스크롤 안의 가로 캐러셀**: 문서 FAQ 「Used in ScrollView/FlatList」가 `onConfigurePanGesture={(g) => { g.activeOffsetX([-10, 10]); }}`를 권한다(FR-014a). 설계 §1 C1 표의 `'worklet'` 지시어는 문서 예시에 없다 — 설치본 타입(`CarouselPanGesture`)을 plan 단계에서 그대로 따른다(짐작 금지: 구현 때 설치본 `src/components` 호출부를 읽어 콜백이 워크릿 문맥인지 확인한다).
- **v5는 `src/index.tsx` export만** 쓴다(라이브러리 규칙, 딥 import 금지). `Carousel`은 이름 있는 export다(046과 같다).
- **`defaultIndex`는 마운트 때만** 본다(문서 「Default Index Handling」). 날이 바뀌면 캐러셀을 `key={day}`로 새로 마운트해 1장부터 시작한다 — ref로 되돌리지 않는다.
- **1장은 캐러셀을 쓰지 않는다** — `scrollEnabled={false}`로도 되지만, 배지·인디케이터·제스처가 모두 없어야 하므로(FR-011) 사진 하나만 그리는 편이 계약을 단순하게 한다.

**Alternatives considered**:
- 025 `ScrollView pagingEnabled` 유지 — 순환 불가. Clarifications가 순환을 골랐다.
- 직접 만든 순환(복제 슬라이드 + `scrollTo` 보정) — 설치된 라이브러리가 같은 일을 한다. 코드만 늘어난다.

**확인 방법**: `npx ctx7@latest docs /dohooo/react-native-reanimated-carousel "loop enabled onConfigurePanGesture activeOffsetX inside vertical ScrollView onSnapToItem defaultIndex props"`(FAQ·programmatic-control·migration-v4 절), 설치본 `src/public-types.ts`의 `CarouselProps`(`loop`·`onSnapToItem`·`onConfigurePanGesture`·`scrollEnabled`·`defaultIndex`), `package.json` `peerDependencies`, 네이티브 파일 `find` 0건.

---

## R2. 흑백 — RN `filter: [{ grayscale: 1 }]` (새 아키텍처, 안드로이드)

**Decision**: 사진을 감싼 `View`에 `filter: [{ grayscale: 1 }]`을 준다.

**Rationale**:
- RN 0.76 릴리스 노트(`react-native-website` blog `2024-10-23-release-0.76-new-architecture`)의 제약 목록은 「iOS `filter`는 brightness·opacity만」, 「Android `blur`·`drop-shadow`는 Android 12+」다. **안드로이드의 grayscale에는 제약이 없다.**
- 이 앱은 새 아키텍처다 — `android/gradle.properties`의 `newArchEnabled=true`. `filter`는 새 아키텍처 전용 스타일이다.
- 설치본 타입 `node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts:328`에 `{grayscale: number | string}`이 `FilterFunction`으로 있다.
- `filter`는 `overflow: hidden`을 함의한다 — 슬라이드 모서리 밖으로 그릴 것이 없으므로 문제없다.
- **`Image`에 직접 줄지 감싼 `View`에 줄지**: 문서가 둘을 가르지 않는다. 감싼 `View`에 주면 「사진 없음」 대체 글자도 같은 흑백 면 안에 있게 되어 슬라이드 하나가 한 덩어리가 된다. 실기기(D3)에서 실제로 흑백인지 눈으로 본다 — jest는 스타일 값만 본다(C9).

**Alternatives considered**: 이미지를 미리 흑백으로 변환해 저장 — 저장 형식을 바꾸고 017 사본을 다시 만들어야 한다. 범위 밖. `tintColor` — 단색으로 칠해 사진이 사라진다.

**확인 방법**: `npx ctx7@latest docs /react/react-native-website "filter style prop grayscale Android support"`, `StyleSheetTypes.d.ts:328`, `gradle.properties:38`. **실기기 미확인** — D3에서 본다. 흑백이 안 되면 FR-013대로 구현을 멈추고 저장소 소유자에게 묻는다.

---

## R3. 화면 상태 — `detail`·`unreadable`·`written`을 없애고 `unsaved` 하나를 둔다

**Decision**: `AppScreen`에서 `detail`·`unreadable`·`written`을 지우고 `{ kind: "unsaved"; entry }`(FR-024a)를 더한다. 쓴 날/안 쓴 날은 **화면 상태가 아니라** 홈(`list`)이 고른 날로 그리는 지면 상태다(data-model §2).

**Rationale**:
- 「홈이 곧 상세」 — 일기를 여는 전이가 없어진다. `toDetail`·`initialScreen`의 `detail` 갈래는 도달 불가가 되므로 남기면 042의 교훈(도달 못 하는 상태를 타입에 남기면 거짓말)을 되풀이한다.
- `afterGeneration`은 순수로 남는다: 성공 → `{ kind: "home" }`(화면이 목록을 다시 읽어 `list`로), 저장 실패 → `unsaved`, 그 밖 → `failed`. 목록 다시 읽기는 기기 통로이므로 순수 함수 밖(`DiaryHomeScreen`)에 둔다 — 지금 `backToList`가 하는 일과 같다.
- `unsaved`는 `DiaryEntry`를 싣는다 — 저장되지 않은 글을 읽게 하는 것이 그 상태의 존재 이유다(006 FR-012a). `confirm-overwrite`가 본문을 싣지 않는 012 X1과 충돌하지 않는다(그것은 쓰기 **전** 확인이고 이것은 쓴 **뒤** 결과다).

**Alternatives considered**: `written`을 남기고 성공 시에도 결과 화면 → Clarifications가 「성공이면 홈의 그 날」을 골랐다.

---

## R4. 지면 상태 판정 — 순수 함수 `paperFor()`를 `src/app/written-day.ts`에

**Decision**: `paperFor(item, loaded, day)` → `unwritten | loading | readable | unreadable`. 입력은 목록 요약(`DiaryListItem | undefined`), 마지막으로 도착한 읽기 결과(`{ day, entry: DiaryEntry | null } | undefined`), 고른 날.

**Rationale**:
- 쓴 날/안 쓴 날은 **목록 요약이 먼저** 정한다(FR-001) — 파일 읽기를 기다리지 않고 하단 바(「일기 쓰기」/「다시 쓰기」)를 정할 수 있다. 읽기 결과는 본문만 채운다.
- 늦게 온 결과 버리기(FR-016)는 `loaded.day !== day`면 `loading`으로 보는 것으로 성립한다 — 048 신호 줄의 `shownPreview`와 같은 방식(「읽는 중」을 상태로 저장하지 않는다, `react-hooks/set-state-in-effect`).
- 목록에서 `readable: false` → `unreadable`. 목록은 읽을 수 있었는데 `store.load()`가 `null` → `unreadable`(006 `toDetail`의 「목록을 만든 뒤 파일이 깨졌을 수 있다」를 잇는다).
- `src/app/`에 두는 이유: 049가 `weekCellsFor`·`swipeWeek`, 050이 `calendar.ts`를 둔 자리다. 화면은 판정하지 않는다(048 G9).

---

## R5. 상대 작성 시각 — `writtenAtText(createdAt, now)`를 `home-text.ts`에

**Decision**: 문구 조립과 분·시 계산을 `home-text.ts`의 순수 함수 하나에 둔다. 표시 여부(`그 날이 오늘이고 readable`)는 `cellFor(day, items, day, now).isToday`로 판정한다(FR-019a — 오늘 판정 복제 금지).

**Rationale**:
- 048 FR-037·C4: 문구는 `home-text.ts` 한 곳. 경계는 가짜 시계로 잠근다(SC-005: 59초·60초·59분·60분·2시간 15분).
- 음수(작성 시각이 미래, 기기 시각을 되돌림)는 「방금」으로 떨어진다(Edge Case).
- 내림(floor)이다 — 「2시간 15분 59초」는 「2시간 15분」. 017 `formatDuration`과 같은 방향(더 정밀하게 보이지 않는다).
- **이 계산은 하루 경계가 아니다** — 경과 분을 셀 뿐이므로 DB11(`getHours() ±`를 경계 파일 밖에서 금지)에 걸리지 않는다. 밀리초 차이만 쓴다.

**갱신**: 오늘의 읽을 수 있는 일기를 보는 동안 60초 `setInterval`로 `tick`을 올린다(FR-019). `AppState` `active`는 이미 `tick`을 올린다(049). 다른 날이면 타이머를 걸지 않는다.

---

## R6. 알림 라우팅 — 「고른 날」로 적용하고 확인은 「보였을 때」

**Decision**: `DiaryHomeScreen`이 `initialDay`를 받으면 그 날을 `setChosenDay`로 고르고 `onInitialDayApplied`를 부른다(App은 이때 `pendingRoute`를 비운다). 확인 기록(`onAcknowledge`)은 **고른 날의 읽을 수 있는 일기가 실제로 읽혀 도착했을 때** 부른다 — 알림이든 사용자가 고른 것이든(FR-028·FR-029).

**Rationale**:
- 지금은 `onAcknowledge`가 불릴 때 App이 `pendingRoute`를 비운다. 일기가 없거나 읽을 수 없으면 확인이 안 불려 `pendingRoute`가 남고, 그러면 설정 왕복(재마운트)마다 알림의 날로 다시 뛴다. 「적용했다」와 「확인했다」를 다른 콜백으로 가른다.
- `acknowledgeNotified`는 이미 멱등이다 — 알림 기록이 없거나 이미 확인된 날이면 아무것도 쓰지 않는다(`notified-store.ts:96-105`). 날을 고를 때마다 불려도 해가 없다. 지금 `openItem`이 목록에서 열 때마다 부르던 것과 같다.
- 콜드(`lastResponse`)·웜(`onResponse`) 둘 다 `pendingRoute` → `initialDay` 한 통로라(020) 이 변경 하나로 둘 다 바뀐다.

---

## R7. 색 토큰 — `WRITTEN_DAY` 묶음을 더한다 (`COLORS`는 그대로)

**Decision**: `tokens.ts`에 `WRITTEN_DAY = { paper: "#f8f4f4", rewriteBar: "#eae7e7", indicatorIdle: "#bab6b6", ...치수 }`를 더한다. `COLORS`의 아홉 역할에 넣지 않는다.

**Rationale**:
- `__tests__/theme-tokens.test.ts:44`가 `COLORS`의 키 집합을 못 박는다(032 아홉 역할). 보드 램프 색(설계 §4.2)은 「역할」이 아니라 이 조각의 면 색이다 — 050의 `OVERLAY`·`CALENDAR` 묶음과 같은 방식.
- 대비(AA, 043 R2 방식으로 계산해 테스트로 잠근다):
  - 본문 `text #201e1d` / 지면 `#f8f4f4` — 약 15:1.
  - 「다시 쓰기」 `text` / `#eae7e7` — 약 13:1.
  - 상대 시각 `textMuted #6b6767` / `#eae7e7`(11px, 작은 글자 → 4.5:1 필요) — 약 4.6:1(경계에 가깝다 — 테스트가 4.5 이상을 잠근다).
  - 배지 `accentForeground #000000` / `accent #ec3013` — 043 R2와 같은 조합(보드의 `bg` 글자는 AA 미달, C5).
  - 인디케이터 나머지 칸 `#bab6b6` / 지면 — 장식(현재 장 표시는 `text` 막대와 배지가 전달) — 대비 요구 대상 아님.

---

## R8. 없어지는 코드의 범위

**Decision**: `DiaryDetailScreen.tsx`(슬라이더·갤러리·「이 일기가 본 것」·타자기 reveal 포함)를 지운다. 그 안의 `DiaryPhoto`(사본 실패 대체)는 새 캐러셀 파일로 옮긴다. `DiaryListScreen`의 `DiaryList`·`DiaryCard`·`PhotoStack`을 지운다.

**영향받는 기존 테스트(수정·삭제)**: `__tests__/ui/diary-detail.test.tsx`(삭제 — 지면 계약으로 대체), `photo-gallery.test.tsx`(삭제), `diary-reveal.test.tsx`(삭제), `diary-list.test.tsx`(목록 카드 갈래 삭제), `diary-home.test.tsx`·`diary-home-notification.test.tsx`(상세 전이 → 홈 지면), `app/state.test.ts`(`toDetail`·`initialScreen` detail·`afterGeneration` written), `ui/character-name-flow.test.ts`(035 T049의 `DiaryDetailScreen` 검사 — 작성자 이름을 보이는 화면이 사라짐을 적고 걷어낸다), `press-feedback.test.tsx`(주석의 참조), `scripts/check-constitution.test.ts:350-353`(`DiaryDetailScreen`을 「정당한 사용」 예로 든 테스트 — 파일이 없어지므로 다른 실재 파일로 바꾼다).

**남기는 것**: `TypewriterText`·`REVEAL`(039 쓰는 중 독백이 쓴다), `DiaryEntry`의 `signalsUsed`·`timing`·`authorName`·`placeName`(저장 형식 무변경), 지오코딩 설정과 프롬프트의 장소 줄.

---

## R9. Maestro — 「일기 쓰기」 글자를 누르는 흐름이 쓴 날에서 깨진다

**Decision**: 쓴 날의 하단 바 버튼도 testID `write-button`을 쓴다(「쓰기를 시작하는 바」 — 같은 `onWrite`). 「일기 쓰기」 **글자**를 누르거나 보이는지 확인하는 흐름은 `id: "write-button"`으로 바꾼다.

**Rationale**:
- 기본 선택은 오늘이다(049). 기기에 오늘 일기가 이미 있으면 051 이후 하단 바는 「다시 쓰기」라서 `tapOn: "일기 쓰기"`·`assertVisible: "일기 쓰기"`가 실패한다. 이것은 설계 §3.5의 영향 목록(목록 카드·「← 목록」)에 없던 영향이다 — 스펙 FR-037에 더했다.
- 확인 대화상자의 버튼 글자도 「다시 쓰기」다(050 `OVERWRITE_CONFIRM.confirm`). 글자로 누르면 바와 대화상자 버튼이 겹친다 — 흐름은 `write-button`·`overwrite-confirm`·`overwrite-cancel` id로 누른다.
- 해당 흐름(`grep -l '일기 쓰기' .maestro/*.yml`, 2026-09-28): `dialog-foundation`·`diary-character-select`·`diary-user-path`·`generate-diary`·`past-day-diary`·`photo-selection-over-limit`·`writing-flow-simplified`·`writing-monologue`·`writing-monologue-expansion`. 이미 `id: "write-button"`을 쓰는 자리(`dialog-foundation`·`diary-home-1d`·`today-diary`)는 그대로 통한다. 글자가 주석에만 있는 파일도 있으므로 tasks에서 파일마다 실제 명령 줄인지 확인한다.

---

## R10. 스크롤 구조

**Decision**: 지금처럼 헤더(월·날짜·상태/제목·스트립·안내)와 그 아래 내용이 하나의 세로 `ScrollView`로 흐르고 하단 바만 고정이다(048 FR-023). 안 쓴 날에는 신호 줄이, 쓴 날에는 지면이 헤더 아래에 온다. 지면은 `ScrollView`의 남은 높이를 채워 배경색이 화면 끝까지 닿는다(`flexGrow`).

**Rationale**: 스트립 접힘은 「읽기 스크롤」 몫(C7). 지금 구조를 바꾸지 않고 내용만 바꾸면 그 조각이 접힘을 더할 자리가 그대로 남는다. 본문 끝 여백 104가 고정 하단 바(최소 64 + safe area) 뒤에 마지막 문단이 숨지 않게 한다(FR-014·FR-020).
