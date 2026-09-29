# Contract: 쓰는 중 상태의 화면 (W1~W16)

`DiaryListScreen`의 `writing` 모드와 `DiaryHomeScreen`의 상태 전이. 보드 `2b`. 계약 테스트(`__tests__/ui/writing-in-place.test.tsx`·`__tests__/app/*`)가 각 항목을 잠근다.
**문구는 보드 KO 원문과 글자 단위로 같아야 한다**(W2가 원문을 테스트에 박는다 — 047 A3 방식).

## 화면

- **W1**: `toWriting()`은 여전히 인자를 받지 않고 `Object.keys(toWriting())`가 `["kind"]`뿐이다(007 S1·009 I7·012 C3 — 원칙 I 방어를 그대로 둔다). `AppScreen`의 `writing` 선언에 `items`·`entry`·`text`·`body`가 없음을 소스 검사로 잠근다. 쓰는 중 헤더에 쓰는 목록 요약은 화면 로컬 state다.
- **W2 (KO 원문)**: 헤더 상태 줄 `쓰는 중` / 머리말 `쓰는 중` / 안내 줄 `{이름}{이/가} 쓰고 있어요. 진행률은 세지 않아요.` / 하단 바 `그만두기`.
  조사는 035 `particleFor(name)`(받침 있으면 「이」, 없으면 「가」). 이름은 화면이 정하는 작성자 이름(`nameOf`).
- **W3 (헤더)**: `writing` 모드에서 헤더 상태 줄은 13/600 `COLORS.accent`의 「쓰는 중」이다. 제목·`dayStateText`는 보이지 않는다. 월 라벨·큰 숫자·요일은 그대로(고른 날).
- **W4 (스트립 잠금)**: 스트립 컨테이너 불투명도 `.35`(`WRITING.stripLockedOpacity`), `pointerEvents="none"`, 접근성 숨김(`accessibilityElementsHidden`·`importantForAccessibility="no-hide-descendants"`).
  `onSelectDay`·`onSwipe`를 넘겨도 호출되지 않는다(테스트가 칸을 눌러 본다).
- **W5 (헤더 날짜 잠금)**: `writing` 모드에서 `home-date-button`·`home-date-weekday`(050)는 누를 수 없다(Pressable이 아니거나 `onPress` 없음). 달력이 열리지 않는다. 쓰기 전 상태에서는 050 그대로.
- **W6 (지면)**: `WritingPaper` 안쪽 여백 32/20/120, 간격 14. 순서: 머리말 → 혼잣말(24/700, 줄높이 32.4, 자간 −.24) → 안내 줄(13, `COLORS.textMuted`). 배경은 `COLORS.bg`(연회색 지면 아님).
- **W7 (진행률 없음)**: `writing` 모드 화면 트리에 숫자·`%`·`ActivityIndicator`·`Typewriter`가 없다. 소스에 `ActivityIndicator`·`TypewriterText` import가 없다(소스 검사).
- **W8 (하단 바)**: `StopBar` — 배경 `COLORS.text`, 글자 `COLORS.bg` 17/800, 최소 높이 64, 화면 폭 전체, `testID="stop-button"`, 문구 「그만두기」. `write-button`(일기 쓰기·다시 쓰기)은 트리에 없다.
- **W9 (혼잣말 교체)**: 문안은 `pickMonologue` 풀에서 온다. 간격 `WRITING.rotateMs`마다 교체하되 직전 줄은 뽑지 않는다. 단계·갈래가 바뀌면 즉시 새 줄을 고르고 간격을 다시 센다. 첫 진행 신호 전에는 「쓰고 있다」를 두고 교체하지 않는다.
  **jest는 줄이 바뀌는 배선(타이머·`pickMonologue` 호출·`key` 변경)만 본다.** 페이드가 실제로 겹치는지는 실기기(quickstart §2 D3).
- **W10 (겹 마운트)**: 페이드는 `FadeLayer`(겹마다 `key`, 시작 투명도를 마운트 값으로). 이전 줄은 절대 배치 1→0, 새 줄 0→1. `useEffect`로 시작값을 되돌리지 않는다(소스 검사 — 049 교훈).
- **W11 (52 상태 초기화)**: `writing` 모드에 들어가는 렌더에서 접힘(`foldState`)·끝 판정(`end`)을 비운다. 그만두고 쓴 날로 돌아오면 스트립은 펼쳐지고 「다시 쓰기」 바는 내려가 있다(스크롤 0).

## 전이

- **W12 (그만두기)**: `stop-button` → `cancelled=true` → `stop()` → `list`(refresh). 토스트 없음. 처음 쓰던 날은 안 쓴 날(쓸 재료 두 칸·`write-button` 「일기 쓰기」), 다시 쓰던 날은 기존 일기·「다시 쓰기」 바가 있다.
  저장된 일기는 바뀌지 않는다(처음 쓰던 날은 파일이 생기지 않는다 — 대역 저장소로 확인).
- **W13 (뒤로 가기)**: 안드로이드 뒤로 가기(`hardwareBackPress`)는 W12와 같다. `writing`이 아니면 이 핸들러가 붙지 않는다.
- **W14 (성공)**: `result.ok` → 연출 없이 `list`(refresh) — 고른 날은 그대로, 그 날의 새 일기가 쓴 날 지면으로 보인다. `unsaved-screen`·「덮어썼다」 안내가 트리에 없다.
- **W15 (실패)**: 실패 → `list`(refresh) + `toast`. **결과 화면 전환이 없다** — 실패 문구를 담은 전체 화면 갈래(`unsaved`)가 소스에서 사라졌다(소스 검사). `failed`는 쓰기 시작 전 `no-ready-character`에서만 만들어진다.
- **W16 (사용자 취소 우선)**: 그만두기를 누른 뒤 생성이 뒤늦게 실패·성공으로 끝나도 토스트·화면 전환이 일어나지 않는다(`cancelled` 검사, 지금 규칙 유지).

## 무변경으로 잠그는 것

- 053의 쓰기 전 판정·확인 대화상자, 050의 덮어쓰기 확인, `pipeline.ts`·`prompt.ts`의 호출 계약. 쓰기가 시작되는 시점(확인 통과 뒤)과 `generate()`에 넘기는 인자는 그대로다.
- 쓰기 시작 전 `no-ready-character` → `failed` 화면 + 「설정에서 작성자 준비하기」(FR-024).
