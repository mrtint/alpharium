---
description: "Task list for 025-diary-photo-gallery implementation"
---

# Tasks: 일기 본문 사진 슬라이드 및 갤러리 뷰

**Input**: Design documents from `specs/025-diary-photo-gallery/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/photo-gallery.md, quickstart.md

**Tests**: 포함한다 — 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저
쓴다"를 MUST로 규정한다. 계약 테스트를 구현보다 먼저 쓰고, FAIL을 확인한 뒤
구현한다.

**Organization**: User Story 1(슬라이더, P1) → User Story 2(갤러리, P2). 두
스토리는 독립적으로 테스트 가능하다 — US1만 구현해도 격자보다 나은 슬라이더가
동작하고(MVP), US2는 그 위에 얹는다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 선행 태스크 없음 → 병렬 가능
- **[Story]**: US1(슬라이더) / US2(갤러리). Setup·Foundational·Polish는 라벨 없음

## Path Conventions

단일 Expo 프로젝트. 화면은 `src/ui/`, 화면 테스트는 `__tests__/ui/`(`.tsx`,
`jest-expo`), 실기기 흐름은 `.maestro/`. `test:logic`은 이 기능에 해당 없음.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 이 기능은 새 의존성·새 디렉터리·새 빌드 설정이 없다(research.md
결정 1·2, plan.md). Setup 단계에서 할 것은 착수 확인뿐이다.

- [x] T001 브랜치가 `025-diary-photo-gallery`인지 `git branch --show-current`로 확인한다 (AGENTS.md 「작업 습관」 — `main` 직접 작업 금지). 아니면 중단하고 브랜치를 만든다.
- [x] T002 [P] `src/ui/DiaryDetailScreen.tsx`의 사진 격자 블록(`entry.photos.map` 렌더 + `styles.photos`의 `flexWrap` — 현재 217-223행 부근이나 앵커 문구로 찾는다)과 `__tests__/ui/diary-detail.test.tsx`의 "017 — 사진 표시" describe를 읽어 교체 대상과 유지해야 할 회귀 테스트를 파악한다.
- [x] T003 [P] `scripts/run-device-tests.mjs`의 `FLOWS` 배열 위치를 확인한다 (신규 Maestro 흐름 등록 지점, AGENTS.md 「테스트」).

**Checkpoint**: 교체 지점과 회귀 경계 파악 완료.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 두 스토리가 공유하는 페이저 렌더 조각. 017의 `DiaryPhoto`(사본
실패 → "이 사진은 이제 없다")를 슬라이더·갤러리 양쪽이 재사용할 수 있게 정리한다.

**⚠️ CRITICAL**: US1·US2 착수 전에 완료해야 한다.

- [x] T004 `src/ui/DiaryDetailScreen.tsx`의 기존 `DiaryPhoto` 컴포넌트(`resizedPath` → `<Image>`, `onError` → "이 사진은 이제 없다" — 현재 168-187행 부근)를 두 곳이 재사용할 수 있도록 그대로 두거나 인접 파일로 분리한다. `testID="diary-photo"`와 실패 문구 `"이 사진은 이제 없다"`를 **바꾸지 않는다**(017 회귀 — 계약 C2·C5·C28). 단, `<Image>`에 `resizeMode="contain"`을 추가하고(잘림 방지, spec Edge Cases), 실패 대체 뷰에 `testID="diary-photo-missing"`을 **새로 추가**한다(기존 id·문구는 유지 — 계약 C5).
- [x] T005 페이저 인덱스 계산 헬퍼를 정한다 — `onMomentumScrollEnd`의 `nativeEvent.contentOffset.x`와 컨테이너 폭(`layoutWidth`)으로 `Math.round(x / layoutWidth)`를 내는 순수 함수. `src/ui/DiaryDetailScreen.tsx` 내부(또는 인접 파일). 이 함수는 `test:logic`이 아니라 화면 테스트에서 간접 검증한다(순수 함수지만 `.tsx` 문맥).

**Checkpoint**: 재사용 조각 준비 완료 — 슬라이더·갤러리 구현 착수 가능.

---

## Phase 3: User Story 1 - 본문에서 사진을 옆으로 넘겨 본다 (Priority: P1) 🎯 MVP

**Goal**: 정적 96px 격자를 화면 폭 가로 페이징 슬라이더로 교체한다. 위치
표시(`"N / M"`), 사본 실패 대체, 0장·옛 일기 회귀 유지.

**Independent Test**: 사진 2장 이상 저장된 일기 상세를 열어 사진 영역을 좌우로
스와이프하면 한 장씩 스냅되고 `"2 / N"` 표시가 갱신된다. 갤러리 없이도 완결.

### Tests for User Story 1 ⚠️ (먼저 쓰고 FAIL 확인)

- [x] T006 [P] [US1] `__tests__/ui/photo-gallery.test.tsx` 신규 — `PhotoSlider` 계약 테스트를 작성한다: C1(1장 폭 페이저 렌더, 격자 아님), C3(`"N / M"` 표시 존재 + `onMomentumScrollEnd` fire 시 갱신), C4(사진 셀 탭 → `onOpen(index)` 호출), C6(`photos.length === 1` → `"1 / 1"`, 오류 없음), C7(각 셀 `width: layoutWidth`). `testID`: `photo-slider-position`. `@testing-library/react-native`의 `fireEvent(scrollView, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x }, layoutMeasurement: { width } } })` 패턴 사용.
- [x] T007 [P] [US1] 같은 파일에 `PhotoSlider` 사본 실패 계약 테스트 — C5: 첫 셀에 `fireEvent(image, 'onError')` → `"이 사진은 이제 없다"`(`testID="diary-photo-missing"`) 뜨고 나머지 셀·`onOpen`·`"/ M"`의 M 불변.
- [x] T008 [P] [US1] 같은 파일에 `PhotoSlider` 경계 계약 테스트 — C8(캡션 텍스트 미렌더 — `entry.photos`에 없는 필드지만, 만약 캡션 prop을 받도록 잘못 구현하면 잡히게), C9(모델 식별자·`"장"` 단위 등 미노출 — `"N / M"`에 숫자·슬래시·공백만).
- [x] T009 [P] [US1] `__tests__/ui/diary-detail.test.tsx`의 "017 — 사진 표시" describe를 슬라이더 문맥으로 갱신한다: C26(2장 정상 → `diary-photo` testID 조회됨), C27(옛 일기 → `diary-photo` 0개 + `/^사진: /` 텍스트), C28(첫 사진 `onError` → "이제 없다" + 나머지 정상). **기존 케이스 의도를 바꾸지 않는다** — 격자→슬라이더 렌더 변화에 맞춰 쿼리만 조정.
- [x] T010 [US1] 위 T006~T009를 `npm run test:ui`로 돌려 **전부 FAIL**하는지 확인한다(구현 전). FAIL 사유가 "컴포넌트 없음/미교체"인지 확인(엉뚱한 이유로 실패하면 테스트를 고친다).

### Implementation for User Story 1

- [x] T011 [US1] `src/ui/DiaryDetailScreen.tsx`(또는 신규 `src/ui/PhotoSlider.tsx`)에 `PhotoSlider` 컴포넌트를 구현한다 — props `{ photos, onOpen }`. 가로 `ScrollView` + `pagingEnabled` + `disableIntervalMomentum`, 컨테이너 `onLayout`으로 `layoutWidth` 취득, 각 셀 래퍼 `width: layoutWidth`, 셀은 T004의 `DiaryPhoto`(`resizeMode="contain"`) + `Pressable`(탭 → `onOpen(i)`). `onMomentumScrollEnd` → T005 헬퍼로 `current` state 갱신. `layoutWidth`가 0인 첫 렌더에서는 셀 폭을 0으로 두지 말고 렌더를 보류하거나 `useWindowDimensions` 폴백. 계약 C1·C2·C4·C5·C6·C7.
- [x] T012 [US1] `PhotoSlider`에 위치 표시를 추가한다 — `<Text testID="photo-slider-position">{current + 1} / {photos.length}</Text>`. 단위 없음, 숫자/슬래시/공백만(C3·C9).
- [x] T013 [US1] `src/ui/DiaryDetailScreen.tsx`의 사진 격자 블록(현 217-223행)을 `{entry.photos !== undefined && entry.photos.length > 0 && (<PhotoSlider photos={entry.photos} onOpen={...} />)}`로 교체한다. **렌더 조건은 017 그대로**(C19·C20). `styles.photos`(`flexWrap`)는 제거, `styles.photo`(96×96)는 슬라이더 셀 스타일로 대체하거나 새 스타일 추가.
- [x] T014 [US1] `src/ui/DiaryDetailScreen.tsx`에 `useState<GalleryState>`(초기 `{ open: false }`, data-model.md §2)를 두고 `<PhotoSlider onOpen={(i) => setGallery({ open: true, index: i })} />`로 연결한다. **`PhotoGalleryModal`은 US2에서 추가**하므로, 이 단계에서는 모달을 렌더하지 않는다(state만 배선 — `gallery.open`이 `true`가 돼도 화면 변화 없음이 정상). `tsc`가 `GalleryState` 유니온을 잡도록 타입을 명시한다. (계약 C21·C22 — 결정 확정: 미루지 않고 US1에서 state 배선.)
- [x] T015 [US1] `npm run test:ui`로 T006~T009가 **전부 PASS**하는지 확인한다. `npm run lint`(eslint + tsc + 헌법 검사 + prettier) 클린 확인 — `tsc`가 `GalleryState` 유니온 처리 누락을 잡는다.
- [x] T016 [US1] 위반 주입 검증(quickstart.md §1): (1) 슬라이더가 캡션을 렌더하도록 임시 수정 → C8 FAIL 확인 후 되돌림. (2) `"N / M"`을 `"N장 / M장"`으로 → C9 FAIL 확인 후 되돌림.

**Checkpoint**: 슬라이더 단독으로 격자보다 나은 사진 열람이 동작한다. 커밋 가능(MVP).

---

## Phase 4: User Story 2 - 사진을 눌러 풀스크린으로 크게 본다 (Priority: P2)

**Goal**: 슬라이더의 사진을 탭하면 코어 `Modal` 풀스크린 갤러리가 탭한 사진에서
열리고, 좌우 스와이프·닫기 버튼·안드로이드 뒤로 가기·끝에서 멈춤·회전 유지가
동작한다.

**Independent Test**: 슬라이더의 두 번째 사진을 탭 → 갤러리가 두 번째 사진에서
열림 → 좌우 스와이프로 다른 사진 → 닫기 → 상세 화면의 이전 스크롤 위치 복원.

### Tests for User Story 2 ⚠️ (먼저 쓰고 FAIL 확인)

- [x] T017 [P] [US2] `__tests__/ui/photo-gallery.test.tsx`에 `PhotoGalleryModal` 계약 테스트 추가 — C10(`visible` → `testID="photo-gallery"` 렌더), C11(`initialIndex` prop + `onLayout`으로 `layoutWidth` 세팅 후 `scrollTo`가 `initialIndex * layoutWidth`로 호출됨; `layoutWidth`가 0인 동안은 `scrollTo` 미호출), C14(`"N / M"` `testID="photo-gallery-position"` 존재 + `momentumScrollEnd` 시 갱신), C18(`photos.length === 1` 정상), **C18a**(`visible: true`인 채 부모 리렌더 모사 후 `photo-gallery`가 언마운트 안 되고 `photo-gallery-position`이 같은 값 유지 — FR-015a).
- [x] T018 [P] [US2] 같은 파일에 닫기·경계 계약 테스트 — C15(`testID="photo-gallery-close"` 탭 → `onClose` 호출; `Modal`의 `onRequestClose` fire → `onClose` 호출), C16(배경 영역에 `onClose` 핸들러 없음 — 배경 `Pressable`이 있으면 FAIL), C13(마지막 인덱스에서 다음 스크롤 시 인덱스가 `photos.length - 1`에 클램프, 0으로 안 감).
- [x] T019 [P] [US2] 같은 파일에 사본 실패 계약 테스트 — C17: 갤러리 페이지 이미지 `onError` → 풀스크린 `"이 사진은 이제 없다"`(`testID="photo-gallery-missing"`), 좌우 스와이프 시 정상 페이지로.
- [x] T020 [P] [US2] `__tests__/ui/diary-detail.test.tsx`에 배선 계약 테스트 추가 — C22(슬라이더 셀 탭 → `photo-gallery` 나타남, `photo-gallery-position`이 탭한 순번), C23(갤러리 열려도 상세 본문 `Text`가 여전히 트리에 있음 — 언마운트 안 됨). **C24는 전용 테스트를 만들지 않는다**(계약 C24 갱신 반영) — `DiaryDetailScreen` 단독으로는 `writing` 경로가 없어 구조적으로 도달 불가. 대신 (a) `PhotoSlider`/`PhotoGalleryModal`이 `DiaryDetailScreen`에서만 import된다는 것을 `grep`으로 확인해 주석에 남기고, (b) `DiaryHomeScreen.tsx`의 `writing` 케이스가 별도 `View`라 `DiaryDetailScreen`을 안 거친다는 것을 T025 코드 주석에 명시.
- [x] T021 [US2] T017~T020을 `npm run test:ui`로 돌려 **전부 FAIL** 확인(모달 미구현).

### Implementation for User Story 2

- [x] T022 [US2] `src/ui/PhotoGalleryModal.tsx` 신규 — props `{ photos, visible, initialIndex, onClose }`. 코어 `Modal`(`visible`, `animationType="fade"`, `onRequestClose={onClose}`, `testID="photo-gallery"`). 내부에 US1과 같은 가로 `ScrollView` 페이저(T004 `DiaryPhoto` 재사용, `resizeMode="contain"`, 풀스크린 스타일). **`current`는 `useState`로만 관리**(prop 파생 금지 — C18a). `useEffect([visible, layoutWidth])`에서 `layoutWidth > 0`일 때만 `scrollTo({ x: initialIndex * layoutWidth, animated: false })`(C11 타이밍 함정 — `layoutWidth`는 첫 `onLayout` 전엔 0). `PhotoGalleryModal`에 `key`를 photos/index로 주지 않는다(C18a). `onMomentumScrollEnd` → T005 헬퍼 + `Math.max(0, Math.min(photos.length - 1, i))` 클램프(C12·C13).
- [x] T023 [US2] `PhotoGalleryModal`에 위치 표시 `<Text testID="photo-gallery-position">{current + 1} / {photos.length}</Text>`(C14) 및 닫기 버튼 `<Pressable testID="photo-gallery-close" accessibilityRole="button" onPress={onClose}>`(C15). 배경 영역에 `onClose`를 걸지 않는다(C16).
- [x] T024 [US2] `PhotoGalleryModal` 페이지 셀에서 이미지 `onError` → 풀스크린 `"이 사진은 이제 없다"`(`testID="photo-gallery-missing"`)로 대체, 좌우 스와이프는 정상 유지(C17).
- [x] T025 [US2] `src/ui/DiaryDetailScreen.tsx`에 `<PhotoGalleryModal>`을 얹어 배선 완성 — `<PhotoGalleryModal photos={entry.photos} visible={gallery.open} initialIndex={gallery.open ? gallery.index : 0} onClose={() => setGallery({ open: false })} />`(C21·C22, `gallery` state는 T014에서 이미 배선됨). `entry.photos`가 없으면 모달도 렌더하지 않는다. 사진 격자 교체 지점 주석에 "`writing` 상태는 `DiaryHomeScreen`의 별도 `View`라 이 화면(따라서 슬라이더/갤러리)을 안 거친다 — FR-017"를 남긴다(C24 문서화).
- [x] T026 [US2] `npm run test:ui`로 T017~T020 + US1 테스트 **전부 PASS** 확인. `npm run lint` 클린 — `tsc`가 `GalleryState` 유니온 분기(`gallery.open ? gallery.index : 0`) 처리를 강제한다.
- [x] T027 [US2] 위반 주입 검증(quickstart.md §1): (2) `initialIndex` 무시하고 항상 0 시작 → C11 FAIL. (3) 인덱스 클램프 제거해 순환 → C13 FAIL. (5) 갤러리 상태를 파일/`AsyncStorage`에 저장 → 저장 형식 불변 계약 FAIL. (6) `PhotoGalleryModal`에 `key={gallery.index}` 추가 → C18a(부모 리렌더 후 상태 유지) FAIL. 각각 되돌림.

**Checkpoint**: 슬라이더 + 풀스크린 갤러리 모두 독립적으로 동작. US1 회귀 없음.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 실기기 검증, 문서, 회귀 스윕.

- [x] T028 [P] `.maestro/diary-photo-gallery.yml` 신규 — contracts/photo-gallery.md §E의 6단계 시나리오. 문자열 부분 매칭은 정규식(`.*2 / .*`). 사진 2장 이상 있는 일기가 필요하므로 흐름 주석에 seed 방법(`npm run seed:day -- many-camera <날짜>` + 「빠르게 봄」 생성) 명시.
- [x] T029 `scripts/run-device-tests.mjs`의 `FLOWS` 배열에 `diary-photo-gallery`를 등록한다 (AGENTS.md — 등록 안 하면 초록불인데 아무것도 검증 안 됨).
- [x] T030 실기기 debug 검증(quickstart.md §2) — SM-S901N, `EXPO_PUBLIC_APP_ENV=dev`. 관찰 표 전부 통과: 슬라이더 렌더/스와이프, 탭→풀스크린(탭한 사진에서 시작), 갤러리 스와이프, 집합 일치(SC-003), 닫기+위치 복원, **회전/백그라운드 시 갤러리 유지(FR-015a)**, 옛 일기·0장 회귀, 생성 중 미노출(SC-005). release 재확인은 생략(새 네이티브 모듈 없음, 012).
- [x] T031 `.maestro/`의 기존 흐름 중 일기 상세 화면을 여는 것(있으면 `generate-diary.yml` 등)을 함께 돌려 격자→슬라이더 교체가 회귀를 내지 않는지 확인한다. stale 흐름 발견 시 함께 고친다(023·022 선례).
- [x] T032 `docs/roadmap/README.md`의 9번 항목을 `[x]`로 바꾸고 "구현 결과 (025, 2026-08-31)" 요약을 추가한다 (021·023 선례 형식).
- [x] T033 `AGENTS.md`에 "### 025 — 일기 본문 사진 슬라이드 및 갤러리 뷰" 절을 추가한다 — 핵심 결론(코어 `ScrollView`/`Modal`만, 새 의존성 0, 갤러리 상태 화면 로컬, `src/ui/` 안에서 완결)과 실기기 실측(T030 결과)과 미확인 잔여(핀치 줌·iOS·release는 범위 밖).
- [x] T034 `npm test`(전체) + `npm run lint` 최종 클린 확인. 커밋(한국어 메시지, 헌법 「개발 방식」).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작. T002·T003는 [P].
- **Foundational (Phase 2)**: Setup 이후. T004 → T005(T005는 T004와 무관하나 같은 파일이라 순차).
- **US1 (Phase 3)**: Foundational 이후. 이 기능의 MVP.
- **US2 (Phase 4)**: Foundational 이후. US1과 독립적으로 테스트 가능하나, T025가 US1의 `PhotoSlider`에 `onOpen`을 연결하므로 **실무상 US1 완료 후 착수 권장**(T014에서 `useState`를 미리 배선했다면 US2는 모달만 추가).
- **Polish (Phase 5)**: US1 + US2 완료 후.

### User Story Dependencies

- **US1 (P1)**: Foundational만 선행. 다른 스토리 의존 없음.
- **US2 (P2)**: Foundational 선행. `PhotoSlider`(US1 산출물)에 `onOpen` 배선을 얹지만, `PhotoGalleryModal` 자체는 독립 테스트 가능(props로 `photos`·`initialIndex` 직접 주입).

### Within Each User Story

- 계약 테스트(T006~T009 / T017~T020)를 **먼저 쓰고 FAIL 확인**(T010 / T021) 후 구현.
- `PhotoSlider`/`PhotoGalleryModal` 구현 → `DiaryDetailScreen` 배선 → lint → 위반 주입.

### Parallel Opportunities

- T002, T003 (Setup).
- T006, T007, T008, T009 (US1 계약 테스트 — 같은 신규 파일이면 순차 작성하되 논리적으로 병렬 설계 가능; `diary-detail.test.tsx` 수정인 T009는 확실히 [P]).
- T017, T018, T019, T020 (US2 계약 테스트, 위와 동일).
- T028 (Maestro 작성)은 T030(실기기) 전이면 언제든.

---

## Parallel Example: User Story 1 계약 테스트

```text
# 신규 photo-gallery.test.tsx에 아래를 함께 설계(파일 하나라 커밋은 묶임):
Task T006: PhotoSlider 페이징·위치표시·onOpen 계약
Task T007: PhotoSlider 사본 실패(C5) 계약
Task T008: PhotoSlider 경계(C8·C9) 계약
# 별도 파일 수정이라 진짜 병렬:
Task T009: diary-detail.test.tsx의 017 describe 슬라이더 문맥 갱신
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1.
2. **STOP & VALIDATE**: 사진 2장 일기에서 슬라이더 스와이프 + `"N / M"` 갱신, 옛 일기·0장 회귀.
3. 이 시점에 커밋 가능 — 격자보다 나은 슬라이더가 단독으로 가치.

### Incremental Delivery

1. Setup + Foundational → 재사용 조각 준비.
2. US1 → 슬라이더 (MVP) → 커밋.
3. US2 → 풀스크린 갤러리 → 커밋.
4. Polish → Maestro 등록 + 실기기 + 문서 → 최종 커밋 → PR.

---

## Notes

- `[P]` = 다른 파일·선행 없음. 같은 신규 파일(`photo-gallery.test.tsx`)에 여러 테스트를 쓰는 태스크는 논리적 병렬이나 커밋은 묶인다.
- 이 기능은 `src/ui/` 밖을 건드리지 않는다 — `diary/`·`vision/`·`signals/`·`models/`·`inference/` 수정 태스크가 없다.
- `test:logic`은 해당 없음(새 순수 함수 모듈 없음). 인덱스 헬퍼(T005)는 화면 테스트에서 검증.
- 새 헌법 검사 규칙 없음(research.md 결정 5) — `check:constitution` 태스크가 없다.
- 새 네이티브 모듈 없음 → release 재확인 생략(012). 실기기 debug 1회(T030).
- 각 태스크 또는 논리 그룹 후 커밋(한국어 메시지).
- `main` 직접 커밋 금지 — `.githooks/pre-commit`이 막는다. 브랜치 `025-diary-photo-gallery`에서 작업 후 PR.

## `/speckit-analyze` 반영 (2026-08-31)

analyze가 지적한 MEDIUM 2 + LOW 6을 계획 산출물(contracts, tasks)에 반영했다
(spec은 무수정 — 요구사항 변화 아님):
- **C1**: FR-015a(회전/백그라운드 시 갤러리 유지)에 기기 없는 계약 테스트가
  없던 것 → T017에 C18a 추가, contracts에 C18a 신설, T027에 위반 주입 (6) 추가.
- **C2**: `Modal` 안 `ScrollView`의 `layoutWidth` 비동기 타이밍 함정 →
  contracts C11에 "`layoutWidth > 0`일 때만 `scrollTo`" 명시, T022에 반영.
- **A2**: T014 미결("택1") → "US1에서 state 배선, 모달은 US2"로 확정. T025는
  모달만 얹는 것으로 축소.
- **U1**: 세로/가로 긴 사진 잘림 → `resizeMode="contain"`을 T004·T011·T022·
  contracts C2에 명시.
- **A1**: `*-missing` testID가 추가인지 제약인지 모호 → "새로 추가, 문구는
  017 것 유지"로 contracts C5·C17·T004에 명시.
- **U2**: C24를 `DiaryDetailScreen` 단독으로 증명 불가 → 전용 테스트 제거,
  구조적 도달 불가 + 주석 문서화로 contracts C24·T020·T025 갱신.
- **I1**: T002·T004의 행 번호 → 앵커 문구로 교체("부근" 표기 유지).
- **I2**: 위치 표시 표기 혼용 → contracts C9에 "정식 표기 `{current+1} / {total}`,
  캔니컬 용어 '위치 표시'" 고정.
