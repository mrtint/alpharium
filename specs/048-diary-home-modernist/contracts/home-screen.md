# 계약: 홈 화면(1d)·`⋯` 메뉴·화면 이동

대상: `src/ui/DiaryListScreen.tsx`, `src/ui/DayPicker.tsx`(스트립으로 재작성), `src/ui/HomeMenu.tsx`(신규),
`src/ui/SubScreenFrame.tsx`(신규), `src/ui/home-text.ts`(신규), `src/ui/DiaryHomeScreen.tsx`, `App.tsx`
테스트: `__tests__/ui/diary-list.test.tsx`(재작성), `__tests__/ui/day-picker.test.tsx`(재작성),
`__tests__/ui/home-menu.test.tsx`(신규), `__tests__/ui/home-navigation.test.tsx`(신규, App 조립 소스 검사 +
`SubScreenFrame` 렌더), `__tests__/ui/diary-home-writable.test.tsx`(신규, 타이머·미리보기),
`__tests__/ui/diary-home-write-gate.test.tsx`(신규, B6 — `DiaryListScreen` 대역), `__tests__/ui/home-text.test.ts`
는 `logic`(`.ts`)

## H — 구조와 헤더

| # | 조건 | 기대 |
| --- | --- | --- |
| H1 | 홈 렌더 | 위에서부터 `home-month`(월) · `home-kicker`「일기」 · `home-day-number` · `home-weekday` · `home-day-state` · `day-strip` · (캡션) · `signal-row` · `home-recent`「최근」+`home-count`「n편」 · 카드들. 하단 `home-bottom-bar`는 `ScrollView` 밖 |
| H2 | 고른 날 09-13(일), 일기 없음 | `home-day-number` = 「13」, `home-weekday` = 「일요일」, `home-day-state` = 「아직 쓰지 않았어요」 |
| H3 | 고른 날에 일기 있음 | `home-day-state` = 「이미 썼어요 · 다시 쓰면 덮어써요」 |
| H4 | 고른 날 08-31, 스트립이 8·9월에 걸침 | `home-month` = 「2026년 8월」 (Q2) |
| H5 | `revertedFrom` 있음 | 캡션에 「…은(는) 이제 쓸 수 없어 …(으)로 바꿨어요」 (해요체) |
| H6 | `deniedNotices` 있음 | `denied-notices` 안에 그대로 (문구는 `requirements.ts`에서 해요체) |
| H7 | 소스 검사(주석 제거) | `App.tsx`에 `styles.tabs`·`setTab(`·`tabOn`·`tabOff`가 없다 |

## S — 스트립 (`DayPicker`)

| # | 조건 | 기대 |
| --- | --- | --- |
| S1 | 7칸 | 칸마다 `testID="day-<YYYY-MM-DD>"`, 요일 머리·날짜 숫자 |
| S2 | `selectable: true` 칸 누름 | `onSelect(day)` 1회 |
| S3 | `selectable: false` 칸 누름 | `onSelect` 0회, `accessibilityState.disabled = true` |
| S4 | `hasDiary` 칸 | 점(`day-dot-<day>`)이 있다 — 흐린 칸 포함 |
| S5 | `selected` 칸 | `accessibilityState.selected = true`, 배경 `COLORS.accent` |
| S6 | 소스 검사 | `DayPicker`가 `now`/`new Date()`를 부르지 않는다 (판정은 `stripCellsFor`) |

## G — 신호 줄

| # | 조건 | 기대 |
| --- | --- | --- |
| G1 | preview `loading` | `signal-photos`·`signal-places` = 「…」 |
| G2 | known 3 / known 2 | 「3」 / 「2」 |
| G3 | none / unknown | 「없음」 / 「모름」 — 서로 다르다 |
| G4 | `writable: true` | `signal-window` = 「지금」 |
| G5 | `writable: false`, `writableAt` 12:00 | `signal-window` = 「오후 12시부터」 |
| G6 | `writable: false`, `writableAt` 04:00 | 「오전 4시부터」 |
| G7 | A 요청 후 B로 바꾸고 A 결과가 늦게 옴 | 신호 줄은 B 값 (A 버림) |
| G8 | `previewDay` 거부(던짐) | 둘 다 「모름」 |
| G9 | 소스 검사 | 홈 화면 파일(`DiaryListScreen`·`DayPicker`·`HomeMenu`·`home-text`)이 `signals/`를 import하지 않는다 |
| G10 | 소스 검사(주석 제거 후) | 같은 파일들에 `/[0-9]+\s*시/` 문구 리터럴, `정오`, `WRITABLE_FROM_HOUR`, `DAY_STARTS_AT_HOUR`가 없다 |

## B — 하단 바와 쓰기

| # | 조건 | 기대 |
| --- | --- | --- |
| B1 | `writable: true`, 고른 날 13일 | `write-button` 안에 「일기 쓰기」, 그 **형제**(같은 강조 블록, `write-button` 밖)로 `write-day-label` = 「13일」 |
| B2 | `write-button` 누름 | `onWrite()` 1회, 인자 없음 |
| B3 | `write-day-label` 누름 | `onWrite` 0회(`write-button`의 자손이 아니다), 자체 `onPress` 없음, 화살표·드롭다운 표식 문자 없음 |
| B4 | `writable: false`, 12:00 | `write-button` 없음, `write-unavailable` = 「오늘 일기는 오후 12시부터 쓸 수 있어요」, 그 `Text`는 줄바꿈이 허용된다(`numberOfLines` 없음, 부모 `flexShrink: 1`) |
| B5 | `writable: false` | 화면의 **모든** 누를 수 있는 노드를 눌러도 `onWrite` 0회 |
| B6 | `DiaryHomeScreen`, `writable: false`인 날에 `write()`가 불림(`jest.mock`으로 `DiaryListScreen`을 대역으로 바꿔 받은 `onWrite`를 직접 호출) | `pipeline.run` 0회, 화면이 `writing`·`confirm-overwrite`로 가지 않는다 |
| B7 | `home-menu-button` | 쓰기 바와 같은 높이 정사각형, 테두리 `COLORS.text` (소스·스타일 검사) |

## M — `⋯` 메뉴

| # | 조건 | 기대 |
| --- | --- | --- |
| M1 | 버튼 누름 | `home-menu-settings` 보인다 |
| M2 | items에 developer 있음 | `home-menu-developer` 보인다 |
| M3 | items에 developer 없음 | `home-menu-developer` 노드가 **존재하지 않는다** |
| M4 | 항목 누름 | 메뉴 닫힘 + 그 항목 `onPress` 1회 |
| M5 | `home-menu-backdrop` 누름 / `onRequestClose` | 메뉴 닫힘, `onPress` 0회 |
| M6 | 소스 검사 `App.tsx` | 메뉴 항목 배열에서 developer는 `showsDiagnostics` 조건 안에서만 만들어진다 |

## N — 화면 이동 (`App.tsx`, `SubScreenFrame`)

| # | 조건 | 기대 |
| --- | --- | --- |
| N1 | 소스 검사 | `useState<"home" \| "settings" \| "developer">`, `"characters"`·`"diary"` 탭 값 없음 |
| N2 | `SubScreenFrame` 렌더 | `back-to-home` 「← 일기」 누르면 `onBack` 1회 |
| N3 | `SubScreenFrame` 마운트 | `BackHandler` `hardwareBackPress`를 구독하고 `true`를 돌려 `onBack`을 부른다. 언마운트 시 해제 |
| N4 | 소스 검사 | `onGoToSettings`가 `setRoute("settings")`, 알림 웜 라우팅이 `setRoute("home")` |
| N5 | 소스 검사 | `chosenDay` 상태가 `AppFrame`에 있고 `DiarySection` → `DiaryHomeScreen`으로 흐른다 (Q4) |
| N6 | `DiaryHomeScreen`에 `chosenDay` 제어 prop을 주고 리마운트 | 고른 날이 유지된다 |

## T — 전환 타이머 (`DiaryHomeScreen`, jest 가짜 타이머 + 주입 `now`)

| # | 조건 | 기대 |
| --- | --- | --- |
| T1 | 11:59:00, 오늘 선택 | `write-unavailable` 보임 |
| T2 | 시계를 12:00:01로 옮기고 타이머를 진행 | 사용자 조작 없이 `write-button` 보임, `signal-window` 「지금」 |
| T3 | 오늘 선택 후 다른 날 선택 | 걸린 타이머가 해제된다(`jest.getTimerCount()` 감소) |
| T4 | `AppState` `change → active` 발생, 시계는 이미 12:00 이후 | 즉시 `write-button` |
| T5 | `writable: false`인 날 선택 | `prepare`·`captionDay` 0회. 쓸 수 있는 날로 바꾸면 기존대로 1회 |

## 위반 주입 (각각 잡혀야 한다)

- V-H1: `WriteBar`의 `writable` 조건 제거 → B4·B5 실패.
- V-H2: `DiaryListScreen`이 `../signals/types`를 import → G9 실패.
- V-H3: `home-text.ts`에 `"오후 12시부터"` 리터럴 → G10 실패.
- V-H4: 메뉴 항목 배열에 developer를 무조건 넣음 → M6 실패.
- V-H5: `write-day-label`을 `write-button` 안으로 옮김 → B3 실패.
