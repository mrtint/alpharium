# Data Model: 읽기 스크롤 (052)

저장 형식 변경 없음. 아래는 화면 안의 상태와 판정 입력뿐이다.

## 1. 스크롤 표본 — `ScrollSample` (`src/app/reading-scroll.ts`)

| 필드 | 뜻 |
| --- | --- |
| `y` | 지면의 새 스크롤 위치(px) |
| `previousY` | 직전 스크롤 사건의 위치. 방향 판정에 쓴다(`y < previousY`면 위로) |
| `viewport` | 지면의 보이는 높이 |
| `content` | 지면 내용 전체 높이 |
| `stripHeight` | 접힘 감쌈이 잰 자연 높이(스트립 + 안내 캡션). 재기 전 0 |

## 2. 접힘 판정 — `foldAfterScroll(collapsed, sample) → boolean`

| 이전 | 조건 | 다음 |
| --- | --- | --- |
| 펼침 | `y > FOLD_AFTER(8)` 그리고 `y >= previousY` 그리고 `content − viewport − stripHeight > FOLD_AFTER` | 접힘 |
| 접힘 | `y < previousY` 그리고 `y <= UNFOLD_AT(2)` | 펼침 |
| 그 밖 | — | 이전 그대로 |

순수 함수. `Date`·파일·화면을 모른다.

## 3. 접힘 상태 (`DiaryListScreen`, 화면 로컬)

`{ day: DayDate; collapsed: boolean } | undefined` — 고른 날과 `day`가 다르면 펼침으로 읽는다(FR-015). 파일에 남기지 않는다.

전이:
- 스크롤 표본 → `foldAfterScroll`
- 접힌 날짜 줄 누름 → 펼침
- 고른 날이 바뀜 → (읽을 때) 펼침

끝 판정 상태(051 `end`)와 서로 독립이다(FR-010).
