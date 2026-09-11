# Contract: `DiaryDetailScreen` reveal 흐름 + `DiaryHomeScreen` 배선

**Feature**: 038-typewriter-diary-reveal | **Date**: 2026-09-11

테스트를 먼저 쓴다. `[Cn]`은 계약 테스트 식별자(`__tests__/ui/diary-reveal.test.tsx`,
jest-expo). RNTL 14 — `render`·`fireEvent` 모두 `await`, 쿼리는 `screen.*`.

---

## A. `DiaryDetailScreen` — `reveal` prop 확장

### Props (변경)

```ts
type DiaryDetailScreenProps = {
  entry: DiaryEntry;
  currentAuthorName?: string;   // 035, 무변경
  saved?: boolean;              // 006, 무변경
  overwrote?: boolean;          // 006, 무변경
  reveal?: boolean;             // ★ 신규. 생성 직후 첫 표시에서만 true
};
```

- `reveal`은 **옵셔널**이다. 주지 않거나 `false`면 기존 호출자(목록에서 연
  `detail`, 알림 라우팅)의 동작이 **100% 동일**해야 한다.

### 내부 상태

- `revealDone: boolean` (로컬 `useState`). 초기값 = `reveal === true ? false : true`.
- 제목 단계: 제목이 있으면 `titleDone: boolean` (초기 `false`), 없으면 항상 `true`.

### 렌더 규칙 — `reveal !== true` (기존 경로)

- **C1** — 제목(있으면)·본문·"이 일기가 본 것" 절·사진 슬라이더·갤러리가 지금과
  동일하게 **한 번에** 렌더된다. `TypewriterText`를 쓰지 않는다. 025·017의 기존
  계약 테스트와 Maestro 흐름이 **무수정** 통과한다(SC-004).
- **C2** — `saved:false` 안내("저장하지 못했다...")·`overwrote:true` 안내
  ("이전 일기를 덮어썼다")가 지금 위치·지금 조건으로 렌더된다.

### 렌더 규칙 — `reveal === true` (첫 표시)

- **C3** — 제목이 있으면: `<TypewriterText variant="title" text={entry.title}
  charMs={REVEAL.charMs} skipToEnd={revealDone} onDone={()=>setTitleDone(true)} />`.
  `titleDone === false` 동안 본문 `TypewriterText`는 렌더하지 않는다(제목 먼저).
  `variant="title"`이 현재 제목 렌더(`DiaryDetailScreen.tsx:443`)와 동일하다(I1).
- **C4** — 제목이 없으면(`entry.title === undefined`) 제목 줄 없이 `titleDone`을
  처음부터 `true`로 두고 본문 타자기부터 시작한다(FR-002).
- **C5** — 본문: `titleDone === true`이면 `<TypewriterText variant="body"
  style={{ fontSize: 16, lineHeight: 26 }} text={entry.text}
  charMs={REVEAL.charMs} skipToEnd={revealDone}
  onDone={()=>setRevealDone(true)} />`. **`style` 오버라이드가 현재 본문 렌더
  (`DiaryDetailScreen.tsx:452`)와 같아야** 목록 재진입 경로와 글자 크기가
  일치한다(I1, SC-004).
- **C6** — `revealDone === false` 동안 다음을 **렌더하지 않는다**(존재 자체가
  없다 — `hidden`/`opacity:0` 아님, FR-003·SC-002):
  - "이 일기가 본 것" `<View style={styles.signals}>` 블록 전체 (017)
  - `PhotoSlider` (025)
  - `PhotoGalleryModal` (025)
- **C7** — 본문 `onDone` 또는 skip으로 `revealDone === true`가 되면 위 세
  블록이 나타난다. 이후 화면은 `reveal !== true` 경로와 **구조가 동일**하다
  (같은 컴포넌트 트리, FR-004·US1-5).
- **C8** — `reveal === true`이고 `revealDone === false`인 동안, `ScrollView`의
  `contentContainer` 최상단에 **화면을 덮는 투명 `Pressable` 오버레이**
  (`StyleSheet.absoluteFill` 상당, `testID="diary-reveal-skip"`)를 얹는다.
  루트 `ScrollView` 자체를 `Pressable`로 감싸지 않는다(스크롤 제스처 충돌, U2).
  오버레이 `onPress`는 **skip 핸들러**를 호출한다:
  ```
  onSkip = () => { setTitleDone(true); setRevealDone(true); }
  ```
  둘을 함께 설정하므로(U1), 제목 미완 시점에 탭해도 다음 렌더에서 본문
  `TypewriterText`가 `skipToEnd={true}`로 첫 마운트 → `TypewriterText` C7로
  즉시 전체. `revealDone === true`가 되면 이 오버레이를 **렌더하지 않는다** →
  슬라이더·갤러리 탭이 정상 도달(FR-006, C16).
- **C9** — `saved:false` / `overwrote:true` 안내는 `revealDone` 값과 **무관하게**
  즉시 렌더된다(FR-012). `reveal === true`이고 `revealDone === false`여도 보인다.
- **C10** — 날짜 캡션(`entry.date`)은 타자기 대상이 아니다 — `reveal` 여부와
  무관하게 즉시 렌더.

### 계약 테스트 시나리오

- **C11** — `reveal` 없이 렌더 → `screen.getByText(entry.text)` 즉시 존재,
  "이 일기가 본 것" 절 즉시 존재. (기존 경로 회귀)
- **C12** — `reveal` 주고 렌더(fake timers) → 초기에 본문 전문이 화면에 **없다**
  (`screen.queryByText(entry.text)`가 null). "이 일기가 본 것" 절도 `queryБy...`
  null.
- **C13** — `reveal` 주고 `advanceTimersByTime`으로 제목→본문 완료까지 진행 →
  본문 전문 존재, "이 일기가 본 것" 절 존재, 슬라이더(사진 있으면) 존재.
- **C14** — `reveal` 주고 타이핑 도중 `await fireEvent.press(screen.getByTestId(
  "diary-reveal-skip"))` → 본문 전문 즉시 존재 + "이 일기가 본 것" 절 즉시
  존재(FR-005, Clarification).
- **C15** — `reveal` 주고 제목→본문 사이(제목 `onDone` 직후, 본문 `TypewriterText`
  아직 미마운트) 시점에 오버레이 탭 → `setTitleDone`+`setRevealDone` 동시 →
  본문이 즉시 전체로 첫 마운트(U1). 즉시 전체(FR-005 경계 구간, Clarification).
- **C16** — `reveal` 주고 완료(`revealDone === true`) 후: `diary-reveal-skip`
  오버레이가 **트리에 없다**(`queryByTestId` null). 슬라이더 사진 탭은 갤러리를
  연다(FR-006, 025 회귀).
- **C17** — 제목 없는 `entry`(`title: undefined`)에 `reveal` 주고 렌더 →
  제목 줄 없음, 본문 타자기부터. (FR-002)
- **C18** — `reveal` 주고 `saved: false` → "저장하지 못했다..." 안내가 타이핑
  완료 전에 존재(C9).
- **C19** — `reveal` 주고 언마운트(`unmount()`) 후 `advanceTimersByTime` →
  act 경고 없음, 콘솔 에러 없음(FR-014, C6-of-typewriter 연계).

### 위반 주입 (방어 확인)

- `revealDone` 게이트를 "이 일기가 본 것" 절에서 빼면(항상 렌더) **C12·C13이
  경계에서 FAIL** — 타이핑 중에도 절이 보인다.
- 오버레이를 `revealDone === true`에서도 렌더하면 **C16이 FAIL** — 완료 후 탭이
  슬라이더 탭을 삼킨다.
- skip 핸들러에서 `setTitleDone(true)`를 빼면(`setRevealDone`만) **C15가 FAIL** —
  제목 미완 시점 탭 후 본문이 한 렌더 늦게 채워진다.
- 본문 `TypewriterText`에 `style` 오버라이드를 안 주면(`variant="body"`만) 렌더된
  본문 노드에 `fontSize: 16`이 없어 **C13(또는 별도 타이포 assert)이 FAIL** —
  첫 표시 본문이 목록 재진입 본문과 크기가 다르다(I1).
- `reveal` 초기값을 `detail` 경로에도 `false`가 아닌 값으로 새면 **C11이 FAIL**.

---

## B. `DiaryHomeScreen` — `reveal` 전달

- **C20** — `case "written"`: `<DiaryDetailScreen ... reveal />`로 렌더한다
  (`saved`·`overwrote`는 지금처럼 `screen.saved`·`screen.overwrote`에서).
- **C21** — `case "detail"`: **무변경** — `reveal`을 넘기지 않는다.
- **C22** — `case "writing"`: **무변경** — `DiaryHomeScreen`의 별도 `View`
  (회전 표시 + "그만두기"). `DiaryDetailScreen`을 경유하지 않으므로 `TypewriterText`
  가 구조적으로 도달 불가(FR-011, SC-005).

### 계약 테스트 시나리오

- **C23** — `case "written"` 상태로 `DiaryHomeScreen` 렌더(fake timers) →
  초기에 본문 전문이 화면에 없다(C12 연계). `advanceTimersByTime`으로 진행하면
  나타난다.
- **C24** — `case "detail"` 상태로 렌더 → 본문 전문 즉시 존재(회귀, C11 연계).
- **C25** — `case "writing"` 상태로 렌더 → `screen.getByLabelText("쓰고 있다")`
  (회전 표시) 존재, "그만두기" 존재. 진행률 숫자·경과 시간·본문 글자 없음
  (기존 SM3 계열 금지어 검사 재사용, SC-005).

---

## C. Maestro 흐름 조정 (신규 흐름 없음)

- **C26** — "생성 후 상세를 보는" 기존 흐름(`diary-photo-gallery.yml`,
  `generate-diary.yml` 등)에서, 생성 완료 직후 상세를 assert 하기 **전에**
  "화면 탭" 스텝을 하나 넣는다(타자기를 건너뛰어 전문이 즉시 뜨게). 025가 겪은
  `scrollUntilVisible` 함정과 같은 계열의 사전 방어.
- **C27** — `run-device-tests.mjs`의 `FLOWS` 목록은 **변경 없음**(신규 흐름
  없음). 조정한 기존 흐름이 여전히 등록돼 있는지만 확인.
