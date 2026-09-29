# Contract: 쓸 재료 (053)

기기 없는 테스트가 잠그는 계약이다. 각 항목에 **위반 주입**을 붙였다. jest는 배선만 본다 — 색·간격·글자 크기는 인라인 style 검사와 실기기 육안으로 본다.

## MAT — 재료 상태 옮김 (`src/app/material.ts`, 순수)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| MAT1 | `fromCountHint`: `known(3)`→`some`, `known(0)`→`zero`, `none`→`zero`, `unknown`→`unseen` | `unknown`→`zero` |
| MAT2 | `fromPhotoSignal`(사진): `known`(사진 1장 이상)→`some`, `none`→`zero`, `unknown`→`unseen`. `fromPlaceSignal`(장소): `known`(`visitCount` ≥ 1)→`some`, `none`→`zero`, `unknown`→`unseen` | `none`→`unseen` |
| MAT3 | 세 옮김 어디에도 `unknown`을 0/`none`으로 채우는 기본 분기가 없다(소스 검사, 주석 걷어냄) | `default: return "zero"` |

## DEC — 쓰기 전 판정 (`decideMaterial`)

권한 × 값 조합 전부를 표로 잠근다(FR-016).

| ID | photos | places | 기대 |
| --- | --- | --- | --- |
| DEC1 | some | some | write |
| DEC2 | some | zero | write |
| DEC3 | some | unseen | write (좌표를 못 읽은 하루도 사진이 있으면 쓴다) |
| DEC4 | zero | zero | confirm(zero) |
| DEC5 | zero | unseen | confirm(zero) |
| DEC6 | unseen | unseen | confirm(unseen) |
| DEC7 | unseen | zero | confirm(zero) |
| DEC8 | zero | some | write |
| DEC9 | unseen | some | write |

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| DEC10 | 위 9개 전부, 인자 순서를 바꿔도(`photos`↔`places`) 결과가 같다 | 첫 인자만 본다 |
| DEC11 | `unseen`을 재료 없음(`zero`)으로 세는 분기가 없다 — `unseen`만 있는 조합의 `because`는 `"unseen"` | `unseen`→`"zero"` |
| DEC12 | 「0 안내 한 줄」 판정(`allZero`): `zero`·`zero`만 참. `zero`·`unseen`은 거짓(FR-014) | `unseen`을 0으로 |

## MADE — 지어낸 하루 (`madeUpDay`, `paperFor`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| MADE1 | `madeUpDay(signals)`는 `decideMaterial`과 같은 규칙이다: 사진 known + 장소 known → false, 사진 none + 장소 none → true, 사진 unknown + 장소 unknown → true, 사진 known + 장소 unknown → false | 규칙 복제(다른 조건) |
| MADE2 | `paperFor`의 `readable`에 `madeUp`이 실린다. 재료가 있는 일기 false, 재료 없는 일기 true | `madeUp: false` 고정 |
| MADE3 | `DiaryEntry`·저장 통로 소스에 `madeUp`·`fabricated`류 새 필드가 없다(FR-020 — 저장 필드 없음, 소스 검사) | 필드 추가 |
| MADE4 | `unwritten`·`loading`·`unreadable` 갈래에는 `madeUp`이 없다 | 갈래 확장 |
| MADE5 | `WrittenDayPaper`가 `madeUp`이면 본문 문단 앞(캐러셀 뒤)에 `made-up-day`를 그리고, 아니면 그리지 않는다 | 늘 그림 |

## PRM — 권한 (`toDayPreview`, `previewDay`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| PRM1 | `toDayPreview(day, signals, "denied")`는 `photoAccess: "denied"`를 싣고 `photos`·`places`는 `signals`에서 온 세 갈래 그대로다 | `photoAccess` 무시 |
| PRM2 | `previewDay`(wiring)가 `photoPermission()`을 `granted`·`limited`→`ok`, `denied`·`undetermined`→`denied`, `blocked`→`blocked`로 옮긴다. 조회가 던지면 `ok` | `undetermined`→`ok` |
| PRM5 | ★ 사진이 관측된 0장(`none`)이면 수집이 장소를 `unknown`으로 돌려줘도(사진을 못 봐서 좌표를 물을 수 없다는 뜻) 미리보기의 장소는 `none`이다 — 장소 수는 사진 좌표에서 나오므로 사진이 없으면 좌표도 없다(관측된 사실). **사진이 `unknown`이면 승격하지 않는다** | 사진이 unknown이어도 장소를 none으로 |
| PRM3 | `photoAccess === "ok"`인데 사진 known·장소 unknown이면 장소 칸은 「모름」(「권한이 없어요」 아님) | 늘 권한 없음 |
| PRM4 | 소스: 권한 여부 판정에 `reason`(한국어 문자열) 비교가 없다(`reason`·`.includes(`으로 권한을 가르지 않는다) | 문자열 비교로 |

## GRID — 두 칸 (`MaterialGrid`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| GRID1 | 사진 3·장소 2 → 「사진」 `3` `장`, 「장소」 `2` `곳`. `signal-window`(「쓸 수 있는 때」)가 없다(FR-001) | 세 칸 |
| GRID2 | 칸 사이 세로 구분선이 없다(칸 스타일에 `borderRightWidth`가 없다) — 격자 아래 1px만 있다 | `borderRightWidth` 되살림 |
| GRID3 | 관측된 0 → 숫자에만 `textMuted`, 단위 텍스트에는 없다(FR-005) | 단위에도 회색 |
| GRID4 | `photoAccess: "denied"` → 두 칸 모두 「권한이 없어요」+`›`, `COLORS.danger`, 최소 높이 44, 누르는 노드가 `accessibilityRole="button"` | accent 색·높이 41 |
| GRID5 | `photoAccess: "ok"`이고 장소 `unknown` → 「모름」, 누를 수 없음(`button` 아님) | 누르면 요청 |
| GRID6 | 「0 안내 한 줄」: 사진 0·장소 0 → `material-empty-note` 있음, 사진 3·장소 0 → 없음, 권한 없음 → 없음 | 조건 제거 |
| GRID7 | 미리보기가 아직 없으면 「…」, 통로가 없으면 「모름」(048 그대로) | 0으로 채움 |
| GRID8 | 숫자 스타일 48/800, 단위 15/700, 라벨 13/600(인라인 style) | 크기 변경 |

## REQ — 누름과 요청 (`DiaryHomeScreen`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| REQ1 | `photoAccess: "denied"`에서 「권한이 없어요 ›」 누름 → 요청 통로 1회, 결과 뒤 `previewDay`를 다시 부른다 | 다시 세기 생략 |
| REQ2 | `photoAccess: "blocked"`에서 누름 → 요청 통로 0회, 설정 안내 대화상자가 뜬다 | blocked에도 요청 |
| REQ3 | 설정 안내의 「설정 열기」 → 설정 통로 1회. 「취소」 → 닫힘, 상태 그대로. 덮개 누름으로 닫히지 않는다 | 덮개로 닫힘 |
| REQ4 | 앱이 `active`로 돌아오면 `previewDay`를 다시 부른다(고른 날 그대로) | 복귀 재조회 제거 |
| REQ5 | 요청이 허용되면 칸이 새 값으로 바뀐다 | — |
| REQ6 | 사진 칸·장소 칸 어느 쪽을 눌러도 요청 통로는 사진 권한 하나(FR-011) | 장소는 다른 통로 |

## DLG — 쓰기 전 확인 (`DiaryHomeScreen` + `MaterialDialogs`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| DLG1 | 재료가 있는 안 쓴 날 「일기 쓰기」 → `pipeline.run` 1회, 확인 대화상자 없음(FR-015) | 늘 확인 |
| DLG2 | 재료 0(zero·zero) → `pipeline.run` 0회, 확인 대화상자(제목 「😢 아무 기록도 없어요」) | 바로 씀 |
| DLG3 | 권한 없음(unseen·unseen) → 제목 「😢 기록을 볼 수 없어요」, 설명은 DLG2와 같다 | 같은 제목 |
| DLG4 | 「확인」 → `pipeline.run` 1회(권한 요청 통로 0회 — 권한 없음에서도 권한 요청을 강제하지 않는다, FR-012). 「취소」·뒤로 가기 → 0회, 화면 그대로, 덮개 누름으로 닫히지 않는다 | 취소가 씀 / 확인이 권한 요청 |
| DLG5 | 대화상자는 050 `ConfirmDialog`·`DialogActionButton`·`DialogCancelButton`으로 그린다(소스 검사) — 새 부품 없음 | 자체 모달 |
| DLG6 | 미리보기가 아직 안 왔으면 누른 순간 `previewDay(day)`를 한 번 기다려 판정한다(재료 없음으로 취급하지 않는다) | 미리보기 없으면 confirm |
| DLG7 | `previewDay`가 없으면 판정 없이 바로 쓴다 | 없으면 confirm |
| DLG8 | 이미 쓴 날의 「다시 쓰기」는 재료 판정을 거치지 않는다(050 덮어쓰기 확인만) | 다시 쓰기에도 재료 판정 |
| DLG9 | 「확인」으로 쓰는 캐릭터·날은 누른 순간 `resolve(day)`가 정한 인자 그대로다(옮김 안내 포함) | 확인 뒤 인자 재계산 |

## SRC — 소스 계약 (주석 걷어냄)

| ID | 계약 |
| --- | --- |
| SRC1 | `src/ui/MaterialGrid.tsx`·`MaterialDialogs.tsx`에 신호 원형(`DaySignals`)·`expo-` import가 없다 |
| SRC2 | `src/app/state.ts`에 `signals` import가 없다(DP8) — `photoAccess`는 문자열 리터럴 유니온이다 |
| SRC3 | 새 문구 글자는 `home-text.ts`에만 있다(화면 소스에 「권한이 없어요」·「기록 대신」이 없다, C4) |
| SRC4 | 색 리터럴이 없다(hex 없음, C5) |
| SRC5 | `Date`·`setTimeout`·`Date.now`가 `material.ts`에 없다(순수) |
