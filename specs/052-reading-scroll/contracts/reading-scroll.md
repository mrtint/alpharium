# Contract: 읽기 스크롤 (052)

기기 없는 테스트가 잠그는 계약이다. 각 항목에 **위반 주입**을 붙였다. 위반 주입은 실제로 어겨 보고 잡히는지 확인할 변경이다.

jest는 배선만 본다. reanimated 목의 `useAnimatedStyle`은 `{}`를 돌려주므로 높이·불투명도 값은 검사할 수 없다. 접힘의 증거는 `pointerEvents`, 접근성 숨김, ▾의 접근성 노출, 누름 갈래다. 움직임(240/180ms, 되튐 없음)은 실기기 녹화로 본다(C9, quickstart).

## FOLD — 판정 (`src/app/reading-scroll.ts`, 순수)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| FOLD1 | 펼침 + 아래로(`y ≥ previousY`) + `y = 9` → 접힘. `y = 8` → 펼침 그대로 | `> 8`을 `>= 8`로 |
| FOLD2 | 펼침 + 위로(`y < previousY`) + `y = 50` → 펼침 그대로 | 방향 조건 제거 |
| FOLD3 | 펼침 + `y === previousY`(= 9) → 접힘. 보드 `!up`이 근거다 | `>=`를 `>`로 |
| FOLD4 | 접힘 + 위로 + `y = 2` → 펼침. `y = 3` → 접힘 그대로 | `<= 2`를 `< 2`로 |
| FOLD5 | 접힘 + 아래로 + `y = 0` → 접힘 그대로(위로 가는 중이 아니면 펼치지 않는다) | 방향 조건 제거 |
| FOLD6 | 접힘 + 위로 + `y = 100` → 접힘 그대로(위로 스크롤만으로 펼치지 않는다, FR-007) | `y` 조건 제거 |
| FOLD7 | 펼침 + 아래로 + `y = 20`, `content − viewport − stripHeight = 8` → 펼침 그대로. `= 9` → 접힘(FR-005) | 남는 거리 조건 제거 |
| FOLD8 | 상수 `FOLD_AFTER = 8`, `UNFOLD_AT = 2`가 export되고, 홈 화면 소스(`DiaryListScreen.tsx`·`WrittenDayPaper.tsx`)에는 스크롤 비교 숫자 리터럴(`> 8`·`<= 2`)이 없다(소스 검사, 주석 걷어냄) | 화면에서 `y > 8` |
| FOLD9 | 소스에 `new Date(`·`Date.now(`·`setTimeout`이 없다(디바운스 없음, FR-006) | 300ms 디바운스 추가 |

## PAPER — 지면 알림 (`WrittenDayPaper`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| PAPER1 | 스크롤 사건마다 `onScrollSample({ y, previousY, viewport, content })`를 부른다. `previousY`는 직전 사건의 `y`이고, 첫 사건에서는 0이다 | `previousY`를 늘 0으로 |
| PAPER2 | 끝에 닿아 바가 올라온 뒤 지면의 보이는 높이만 줄어들면(레이아웃 사건), 바는 올라온 채다(`rewrite-bar` 접근성 노출 유지, FR-010) | `onLayout`에서 늘 `report()` |
| PAPER3 | 짧은 본문(첫 레이아웃 800, 내용 500)이면 처음부터 바가 보인다(051 `2k` 회귀) | 첫 레이아웃 판정 제거 |

## RS — 접힘 배선 (`DiaryListScreen`, 쓴 날)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| RS1 | 긴 본문(레이아웃 800, 내용 2000)에서 `y = 20`으로 스크롤하면 `home-strip-fold`가 `pointerEvents="none"`, 접근성에서 숨고(`day-strip`이 기본 쿼리로 안 보임), `home-fold-caret`이 접근성에 드러난다 | 스크롤 표본을 무시 |
| RS2 | 펼친 상태에서는 `home-fold-caret`이 접근성에서 숨고 `day-strip`이 보인다 | ▾ 늘 노출 |
| RS3 | 접힌 뒤 `y = 1`로 위로 스크롤하면 펼쳐진다(RS2 상태) | — (FOLD4) |
| RS4 | 안내 캡션 전체 — 거부 권한(`denied-notices`)과 캐릭터 옮김(`movedNotice` 문구) — 가 `home-strip-fold` 안에 있어 접히면 함께 숨는다(FR-017) | 캡션을 감쌈 밖으로 |
| RS5 | 접힌 채 고른 날이 다른 쓴 날로 바뀌면 펼친 상태다(FR-015). 같은 날로 `rerender`하면 접힌 채다 | 접힘 상태에서 `day` 비교 제거 |
| RS6 | 안 쓴 날에는 `home-strip-fold`·`home-fold-caret`·`home-date-row` 누름이 없다(FR-016). 048~051 테스트는 그대로 통과한다 | 안 쓴 날에도 감쌈 |
| RS7 | 접혀도 `home-day-number`·`home-weekday`·`home-day-title`이 그대로 렌더되고 스타일(62·16·15/700)이 바뀌지 않는다(FR-003, 인라인 style 검사) | 접히면 숫자 작게 |

## TAP — 헤더 날짜 누름 (§2, 050 CAL1)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| TAP1 | 접힌 상태에서 `home-date-row`를 누르면 펼치고, `onPressDate`는 0회 불린다 | 펼치면서 달력도 |
| TAP2 | 접힌 상태에서는 `home-date-button`·`home-date-weekday`가 렌더되지 않는다(안쪽 누름이 바깥을 가로채 달력을 열지 않게, research R5) | 안쪽 `DateJump`에 `onPress` 유지 |
| TAP3 | 펼친 상태(쓴 날·안 쓴 날)에서 `home-date-button`을 누르면 `onPressDate` 1회, `home-date-row` 누름 처리 없음 — 050 CAL1이 펼친 상태로 한정되어 그대로 산다 | 펼친 상태에도 바깥 누름 |
| TAP4 | `home-date-row`는 접근성 역할 버튼, 라벨 `READING_SCROLL.expandLabel`. 펼친 상태의 `home-date-button` 라벨은 050 그대로 `DATE_JUMP.title`(FR-013) | 라벨 없음 |
| TAP5 | 펼친 뒤 바 상태가 그대로다 — 끝에 닿아 바가 보이는 채 접힘 → `home-date-row` 누름 → `rewrite-bar`가 여전히 접근성에 드러난다 | 펼칠 때 `end` 초기화 |

## SRC — 문구·토큰

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| SRC1 | ▾ 글자·접근성 라벨은 `home-text.ts`의 `READING_SCROLL`에만 있다(홈 화면 소스에 `"▾"` 리터럴 없음) | 화면에 `"▾"` |
| SRC2 | 시간·치수는 `tokens.ts`의 `READING_SCROLL`에 있다 — `foldMs 240`, `fadeMs 180`, `caretMs 240`, `caret.width 28`, `caret.fontSize 14`, `caret.fontWeight "700"` | 값 변경 |
