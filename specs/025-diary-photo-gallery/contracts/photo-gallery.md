# Contract: 사진 슬라이더 & 풀스크린 갤러리 (화면 UI)

**Feature**: 025-diary-photo-gallery | **Date**: 2026-08-31

이 문서는 세 부분의 계약을 못 박는다 — `PhotoSlider`, `PhotoGalleryModal`,
그리고 이 둘을 얹는 `DiaryDetailScreen`의 변경. 테스트를 먼저 쓴다(헌법 「개발
방식」). 각 규칙 끝의 `[Cn]`은 계약 테스트 식별자다.

---

## A. `PhotoSlider` — 본문 가로 슬라이더

### Props

```ts
type PhotoSliderProps = {
  photos: { photoId: string; takenAt: Date; resizedPath: string }[];  // 길이 >= 1
  onOpen: (index: number) => void;   // 사진 i를 탭하면 onOpen(i)
};
```

### 렌더 규칙

- **C1** — `photos.length >= 1`이면 가로 페이저를 렌더한다. 한 번에 한 장이
  컨테이너 폭에 맞춰 보인다. 여러 장이 동시에(격자로) 보이지 않는다(FR-001).
- **C2** — 각 사진은 `<Image>`로 `file://${resizedPath}`를 그린다(FR-004).
  `testID="diary-photo"`를 유지한다(017 회귀 — 기존 테스트가 이 id를 센다).
  `resizeMode="contain"`으로 그려 세로/가로로 긴 사진도 잘리지 않는다
  (spec Edge Cases "매우 세로로 긴/가로로 긴 사진" 충족). 셀 배경은 기존
  `styles.photo`의 회색(`#eee`)을 유지해 여백이 어색하지 않게 한다.
- **C3** — 위치 표시: `"{current + 1} / {photos.length}"` 텍스트를 렌더한다
  (예: `"2 / 3"`). `testID="photo-slider-position"`. 스와이프가 끝나면
  (`onMomentumScrollEnd`) `contentOffset.x / layoutWidth`를 반올림해 `current`를
  갱신하고 표시도 갱신한다(FR-002).
- **C4** — 각 사진 셀은 `Pressable`이며 탭하면 `onOpen(해당 index)`를 부른다
  (FR-008). `accessibilityRole="imagebutton"` 또는 `"button"`.
- **C5** — `resizedPath`의 이미지가 `onError`를 내면 그 셀만
  `"이 사진은 이제 없다"`로 대체하고, 나머지 셀의 페이징·`onOpen`은 정상
  동작한다(FR-005). 배열에서 제거하지 않으므로 `"N / M"`의 M은 그대로다.
  **문구는 017 `DiaryPhoto`의 것을 그대로 쓴다**(기존 `findByText(/이 사진은
  이제 없다/)` 테스트가 계속 통과). 이 대체 뷰에 `testID="diary-photo-missing"`을
  **새로 추가**한다 — 017 코드에는 없던 id이며, 추가일 뿐 기존 `testID`·문구를
  바꾸는 것이 아니다(T004 "바꾸지 않는다"는 `diary-photo`와 실패 문구에 대한 것).
- **C6** — `photos.length === 1`이면 셀 하나만 렌더되고 페이저는 스크롤이 멈춰
  있다(넘길 것이 없음). `"1 / 1"` 표시. 오류·빈 화면이 아니다(FR-015).
- **C7** — 페이저는 `pagingEnabled` + `disableIntervalMomentum`(안드로이드에서
  한 번에 한 페이지만). 각 셀 래퍼에 `width: layoutWidth` 명시(컨테이너
  `onLayout` 또는 `useWindowDimensions`).

### 이 컴포넌트가 하지 않는 것

- **C8** — 캡션 텍스트를 렌더하지 않는다(FR-019). `takenAt`을 표시하지 않는다.
- **C9** — 모델 식별자·생성 속도·토큰 수를 어디에도 렌더하지 않는다(FR-018).
  위치 표시의 **정식 표기는 `{current + 1} / {total}`**(예: `2 / 3`) — 캔니컬
  용어는 "위치 표시"이고, 단위("장" 등)·비교·평균 표현을 붙이지 않는다.

---

## B. `PhotoGalleryModal` — 풀스크린 갤러리

### Props

```ts
type PhotoGalleryModalProps = {
  photos: { photoId: string; takenAt: Date; resizedPath: string }[];  // A와 같은 배열
  visible: boolean;
  initialIndex: number;        // 슬라이더에서 탭한 index
  onClose: () => void;
};
```

### 동작 규칙

- **C10** — `visible`이 `true`가 되면 화면 전체를 덮는 `Modal`이 뜬다(FR-008).
  `testID="photo-gallery"`.
- **C11** — 갤러리가 처음 뜰 때 페이저의 스크롤 위치가 `initialIndex`번째
  사진이다 — 항상 0번이 아니다(FR-009).
  **타이밍 함정**: `Modal` 안 `ScrollView`의 `layoutWidth`는 첫 `onLayout`
  전에는 알 수 없다(비동기). `initialIndex * layoutWidth`를 그 전에 계산하면
  0으로 스크롤된다. 따라서 **`layoutWidth`가 정해진 뒤**(첫 `onLayout` 이후,
  또는 `visible`이 `true`로 바뀐 뒤 `layoutWidth`가 양수일 때)
  `scrollTo({ x: initialIndex * layoutWidth, animated: false })`를 부른다 —
  `useEffect([visible, layoutWidth])` 안에서. `layoutWidth`가 아직 0이면
  아무것도 안 하고, 값이 들어오는 다음 렌더에서 스크롤한다. `contentOffset`
  prop 초기값은 `layoutWidth`를 모르는 첫 렌더에서 쓸 수 없으므로 이 방식이
  안전하다.
- **C12** — 좌우 스와이프로 이전/다음 사진으로 넘어간다. 대상은 `photos`
  배열과 정확히 일치한다(FR-010, SC-003).
- **C13** — 첫 사진에서 더 이전으로, 마지막 사진에서 더 다음으로 넘어가지
  않는다. 끝에서 멈추고 오류 없이 그 사진에 머문다 — 처음으로 순환하지
  않는다(FR-011). (`ScrollView`는 기본적으로 컨텐츠 끝에서 멈추므로 추가 코드
  없이 성립; 명시적 인덱스 클램프도 둔다.)
- **C14** — 위치 표시 `"{current + 1} / {photos.length}"`
  (`testID="photo-gallery-position"`)가 있고, 넘길 때
  (`onMomentumScrollEnd`) 갱신된다(FR-012).
- **C15** — 닫기: (a) 화면 안 닫기 버튼(`testID="photo-gallery-close"`,
  `accessibilityRole="button"`), (b) 안드로이드 하드웨어 뒤로 가기
  (`Modal`의 `onRequestClose`). 둘 다 `onClose()`를 부른다(FR-013).
- **C16** — 아래로 쓸어 닫기·배경 탭 닫기는 **구현하지 않는다**(FR-013 MUST
  NOT). 배경 영역 탭에 `onClose`를 걸지 않는다.
- **C17** — `resizedPath` 이미지가 `onError`를 내면 그 페이지가 풀스크린
  `"이 사진은 이제 없다"`(`testID="photo-gallery-missing"` 새로 추가, 문구는
  017 것 유지)로 표시되고, 좌우로 넘기면 정상 사진으로 넘어간다(FR-014).
  갤러리 페이지 이미지도 `resizeMode="contain"`(C2와 동일 — 잘림 방지).
- **C18** — `photos.length === 1`이면 1장짜리로 열리고 좌우로 넘길 것이 없다.
  닫기는 정상(FR-015).
- **C18a** — 갤러리가 `visible: true`로 열린 뒤 부모(`DiaryDetailScreen`)가
  리렌더돼도(회전·`AppState` 변화 등) `current` state와 `Modal` 마운트가
  유지된다(FR-015a). `PhotoGalleryModal`에 `key`를 photos 배열이나 index로
  주지 않는다 — 주면 리렌더 때 언마운트돼 상태가 날아간다. `current`는
  `useState`로만 관리하고 prop에서 파생하지 않는다(파생하면 `initialIndex`가
  안 바뀌어도 리렌더 때 되돌아갈 수 있음).

---

## C. `DiaryDetailScreen` 변경 계약

### 교체

- **C19** — 기존 사진 격자 블록(`DiaryDetailScreen.tsx`의 `entry.photos.map`
  렌더 + `styles.photos`의 `flexWrap` 격자 — 현재 217-223행 부근이나 행 번호는
  변할 수 있으므로 이 앵커 문구로 찾는다)을 `<PhotoSlider>` 렌더로 교체한다.
  렌더 조건은 **017 그대로 유지**: `entry.photos !== undefined &&
  entry.photos.length > 0` (FR-006·FR-007 회귀 방지).
- **C20** — `entry.photos`가 없으면(옛 일기) `PhotoSlider`·`PhotoGalleryModal`을
  렌더하지 않는다. `signalLines()`의 `"사진: 없었다"/"사진: 모른다"` 텍스트는
  017 로직 그대로 — 이 기능이 건드리지 않는다(FR-006·FR-007).

### 갤러리 상태

- **C21** — `DiaryDetailScreen`에 `useState<GalleryState>`를 둔다(data-model.md
  §2). 초기값 `{ open: false }`. 파일·스토리지에 저장하지 않는다(SC-006).
- **C22** — `<PhotoSlider onOpen={(i) => setGallery({ open: true, index: i })} />`,
  `<PhotoGalleryModal visible={gallery.open} initialIndex={gallery.open ?
  gallery.index : 0} onClose={() => setGallery({ open: false })} />`.
  **`onOpen` 배선은 US1(T014)에서 완성한다** — `PhotoGalleryModal`은 US2에서
  추가되므로, US1 시점에는 `gallery` state만 두고 모달을 렌더하지 않거나
  `visible={false}`로 자리만 잡는다. US2가 `PhotoGalleryModal` 컴포넌트만
  얹으면 배선이 완결된다.
- **C23** — 갤러리가 열려 있어도 `DiaryDetailScreen`의 `ScrollView`(본문·신호
  절)는 언마운트되지 않는다 — `Modal`은 형제로 겹친다. 따라서 갤러리를 닫으면
  상세 화면 스크롤 위치가 그대로다(FR-013). 스크롤 위치를 수동으로 저장·복원하는
  코드를 두지 않는다.

### 경계 (원칙 I·III·IV)

- **C24** — `DiaryDetailScreen`은 `screen.kind === "detail" | "written"`에서만
  렌더된다(`DiaryHomeScreen.tsx`의 `detail`·`written` 케이스). `"writing"`
  상태는 `DiaryHomeScreen.tsx`의 별도 `View`(현재 538-559행 부근 — `<View
  style={styles.center}>` + `ActivityIndicator`)이며 `DiaryDetailScreen`을
  거치지 않는다. 따라서 `PhotoSlider`·`PhotoGalleryModal`·위치 표시가 생성 중
  화면 경로에 **구조적으로 도달 불가**하다(FR-017, SC-005).
  **검증 방식**: `DiaryDetailScreen` 단독으로는 `writing` 경로가 없으므로
  전용 계약 테스트를 만들지 않는다. 대신 (a) `PhotoSlider`/`PhotoGalleryModal`이
  `DiaryDetailScreen`에서만 import·렌더된다는 것을 코드로 확인하고(다른 화면이
  안 씀), (b) `DiaryHomeScreen`의 `writing` 케이스가 `DiaryDetailScreen`을
  렌더하지 않는다는 것을 주석으로 문서화한다. `DiaryHomeScreen` 렌더 테스트가
  이미 있다면 거기에 "writing 상태에서 `photo-slider-position` 미조회" 한 줄을
  얹어도 좋으나 필수는 아니다.
- **C25** — `src/ui/` 밖을 import하지 않는다. `diary/prompt`·`models/*`·
  `vision/*` import 없음 — `checkSourceFile`의 `UI_TOUCHES_PROMPT`·
  `UI_TOUCHES_MODEL`에 걸리지 않는다(무관하지만 명시).

---

## D. 회귀 불변식 (017 — 이 기능이 깨지 않는다)

- **C26** — `entry.photos`가 2장이고 둘 다 정상이면 `testID="diary-photo"`가
  최소 1개 조회된다(페이저는 오프스크린 셀도 마운트하므로 실제로는 photos.length
  개). 기존 017 테스트 "entry.photos가 있으면 이미지로 렌더된다"가 통과 상태를
  유지한다.
- **C27** — `entry.photos`가 없으면 `queryAllByTestId("diary-photo")`가 0개이고
  `getByText(/^사진: /)`가 존재한다(017 회귀 테스트 유지).
- **C28** — 첫 사진에 `onError`를 발생시키면 `"이 사진은 이제 없다"`가 뜨고
  나머지 사진은 여전히 이미지로 남는다(017 P6 테스트를 슬라이더 문맥에서 유지).
- **C29** — `timing`·`placeName`·`title`·`saved`·`overwrote` 관련 017 렌더는
  전부 그대로다 — 이 기능은 사진 블록만 교체한다.

---

## E. Maestro 실기기 흐름 (`.maestro/diary-photo-gallery.yml`)

`scripts/run-device-tests.mjs`의 `FLOWS`에 등록해야 실행된다(AGENTS.md 「테스트」).

최소 시나리오:
1. 사진 2장 이상 있는 일기 상세를 연다 → `photo-slider-position`("1 / N") 보임.
2. 사진 영역을 왼쪽으로 스와이프 → 표시가 "2 / N"으로 갱신.
3. 사진을 탭 → `photo-gallery` 보임, `photo-gallery-position`이 탭한 순번과
   일치(2번째를 탭했으면 "2 / N").
4. 갤러리에서 스와이프 → `photo-gallery-position` 갱신.
5. `photo-gallery-close` 탭 → 갤러리 사라지고 상세 화면 복귀.
6. (있으면) 안드로이드 뒤로 가기로도 닫히는지 별도 스텝.

문자열 부분 매칭은 정규식(`.*2 / .*`)으로 준다(AGENTS.md — Maestro 기본
매칭은 노드 전체와 맞춤).
