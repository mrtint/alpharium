# Research: 일기 본문 사진 슬라이드 및 갤러리 뷰

**Feature**: 025-diary-photo-gallery | **Date**: 2026-08-31

Phase 0 조사. 스펙의 유일한 열린 기술 결정("스와이프·풀스크린을 구현하는 구체적
방식 — 라이브러리 추가 여부 포함")을 해소한다.

---

## 결정 1 — 가로 페이징을 무엇으로 구현하나

**Decision**: React Native 코어 `ScrollView`의 `horizontal` + `pagingEnabled`
+ `onMomentumScrollEnd`로 구현한다. **새 의존성을 추가하지 않는다.**

**Rationale**:

- 이 저장소는 의존성을 최소로 유지해 왔다(현재 `react-native` 코어 +
  `expo-*` 모듈만, 제스처 전용 라이브러리 없음 — `package.json` 실측).
- 요구되는 상호작용은 "한 장씩 스냅되는 가로 페이징"과 "현재 인덱스 추적"
  뿐이다. `pagingEnabled`가 스냅을, `onMomentumScrollEnd`의 `contentOffset.x /
  layoutWidth`가 인덱스를 준다 — `FlatList`의 `pagingEnabled`·`viewability`
  API도 같은 일을 하지만 8장 상한(023)에서 가상화 이득이 없고 API가 더 넓다.
- 핀치 줌·아래로 쓸어 닫기·배경 탭 닫기는 **스펙에서 명시적으로 범위 밖**
  (Clarifications Q6, FR-013)이므로 제스처 충돌 처리가 필요 없다 —
  `react-native-gesture-handler`/`reanimated`를 들일 이유가 사라진다.
- **새 네이티브 모듈이 없으므로 release 재확인이 불필요하다**(012 기준,
  AGENTS.md "테스트"). debug 실기기 1회로 충분하다. `react-native-pager-view`나
  제스처 라이브러리는 네이티브 링크를 동반해 이 기준을 깬다.

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| `react-native-pager-view` | 네이티브 모듈 추가 → release 재확인 필요. 얻는 것(부드러운 페이징)이 코어 `pagingEnabled` 대비 이 화면 규모(≤8장)에서 미미 |
| `react-native-gesture-handler` + `reanimated` | 위와 동일 + 제스처 충돌 처리 복잡도. 범위 밖 제스처(줌·쓸어 닫기)가 없으니 필요 자체가 없음 |
| `FlatList` `pagingEnabled` | 동작은 되나 API가 넓고 `getItemLayout`·`onViewableItemsChanged` 설정이 `ScrollView`보다 장황. ≤8장이라 가상화 이득 0 |
| `@shopify/flash-list` | 대용량 리스트용. 이 규모에 과함 + 의존성 추가 |

**주의 — 코어 `pagingEnabled`의 알려진 한계**:

- 안드로이드에서 `pagingEnabled` 스냅이 아주 빠른 플링에서 한 페이지를 건너뛸
  수 있다. 이 화면은 ≤8장이고 인덱스를 `onMomentumScrollEnd`에서 다시 계산해
  위치 표시에 반영하므로, 건너뛰어도 표시는 정확하다(잘못된 "3/8"이 뜨지
  않는다). `disableIntervalMomentum`을 켜서 한 번에 한 페이지만 넘어가도록
  한다.
- `ScrollView`는 자식 폭을 컨테이너 폭에 자동으로 맞추지 않는다 — 각 사진
  래퍼에 `width: layoutWidth`를 명시해야 한다. `layoutWidth`는
  `onLayout`으로 잰 슬라이더 컨테이너 폭(또는 `Dimensions`/`useWindowDimensions`).

---

## 결정 2 — 풀스크린 갤러리를 무엇으로 띄우나

**Decision**: React Native 코어 `Modal`(`animationType="fade"`,
`presentationStyle` 기본, `onRequestClose`로 안드로이드 뒤로 가기 처리) 위에
결정 1과 같은 `ScrollView` 페이저를 얹는다. 앱은 라우터가 없으므로 별도 화면
스택이 아니라 상세 화면 위에 겹치는 오버레이다(006 "화면이 둘뿐이므로 상태
하나로 가른다"의 연장).

**Rationale**:

- `Modal`은 RN 코어(`react-native/Libraries/Modal/Modal` — 타입 정의 확인).
  네이티브 추가 없음.
- `Modal`의 `onRequestClose`가 **안드로이드 하드웨어 뒤로 가기**를 그대로
  받는다 — `DiaryHomeScreen.tsx`가 생성 중 화면에서 `BackHandler`를 직접
  구독하는 것과 달리, `Modal` 안에서는 `onRequestClose` 하나로 뒤로 가기와
  닫기 버튼을 통일할 수 있다(FR-013).
- 상세 화면(`DiaryDetailScreen`)의 `ScrollView`는 `Modal`이 열려 있어도
  **언마운트되지 않는다** — `Modal`은 형제로 겹쳐 뜨는 것이므로 상세 화면의
  스크롤 위치가 자연히 보존된다(FR-013 "스크롤 위치 유지"). 별도 저장 불필요.
- 갤러리 표시 상태(열림 여부 + 현재 인덱스)는 `DiaryDetailScreen`의
  `useState`로 둔다. **같은 Activity 안의 회전·백그라운드 전환에서 React
  state는 유지되므로** Clarifications Q5(회전/백그라운드 시 갤러리 유지)가
  추가 코드 없이 성립한다. 콜드 스타트 시 state가 없는 것은 정상(스펙 명시).

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| 절대 위치 `View` 오버레이(`position: absolute`, `StyleSheet.absoluteFill`) | 안드로이드 하드웨어 뒤로 가기를 직접 `BackHandler`로 구독해야 함(코드 증가). `Modal`의 `onRequestClose`가 이걸 공짜로 줌 |
| 새 화면 상태 종류를 `DiaryHomeScreen`의 `screen` 유니온에 추가 | 상세 화면을 언마운트했다가 다시 마운트 → 스크롤 위치 유실. 갤러리를 닫을 때 상세를 재생성하는 비용도 발생 |
| `expo-router` 도입해 갤러리를 라우트로 | 앱 전체에 라우터를 들이는 큰 변경. 스펙 Assumptions가 "별도 라우팅 대상 아님"으로 이미 배제 |

---

## 결정 3 — 슬라이더/갤러리의 위치 표시 형식

**Decision**: `"{현재} / {전체}"` 텍스트(예: `"2 / 3"`). 점 인디케이터가 아니다.

**Rationale**:

- 텍스트는 접근성 트리에 그대로 읽히고 Maestro가 문자열로 검증할 수 있다
  (`.*2 / 3.*` 정규식) — 이 저장소가 `childOf` 대신 문자열/`testID`로 검증해
  온 관례(AGENTS.md "도구 사용법")와 맞는다.
- 점 인디케이터는 8장에서 8개 점이 되어 좁고, "지금 어디쯤"을 텍스트만큼
  명확히 주지 못한다.
- FR-018 방어: `"2 / 3"`은 **사진 순번**이지 성능 지표가 아니다 —
  스펙이 이미 명시. 진단 정보와 혼동될 여지가 없도록 "장" 같은 단위 없이
  순번/총계만 둔다.

**Alternatives considered**: 점 인디케이터(위 이유로 기각), 표시 없음(FR-002·
FR-012 위반).

---

## 결정 4 — 사진 참조 데이터: 소비만, 변경 없음

**Decision**: `DiaryEntry.photos?: { photoId, takenAt, resizedPath }[]`(017,
`src/diary/types.ts:114`)를 **읽기 전용으로 소비**한다. 새 필드·새 저장 계층·
새 신호 없음(FR-016).

**Rationale**:

- 017이 이미 이 배열을 저장하고, `DiaryDetailScreen`이 이미
  `entry.photos.map(...)`으로 `<Image source={{ uri: 'file://' + resizedPath }}>`
  를 그린다(`DiaryDetailScreen.tsx:217-223`). 이 기능은 그 `map`의 **렌더 방식**
  (격자 → 페이저)만 바꾼다.
- `takenAt`은 화면에 표시하지 않는다(순서는 배열 순서 = 023 `select.ts`가 정한
  시간순). `photoId`는 페이저·갤러리의 React `key`이자 Maestro `testID` 접미사로
  쓴다.
- 갤러리 표시 상태(`{ open: boolean; index: number }`)는 **화면 로컬**이며
  파일에 남기지 않는다 — 009의 "고른 하루를 파일에 남기지 않는다"와 같은 성격
  (시간이 지나면 무의미해지는 UI 상태).

**Alternatives considered**: `takenAt`을 캡션 위에 오버레이(스펙 FR-019가 캡션
표시를 금하고, 촬영 시각 표시는 요구되지 않음 — 기각).

---

## 결정 5 — 헌법 경계 확인

**Decision**: 이 기능은 `src/ui/` 안에서 완결된다. `src/diary/`·`src/vision/`·
`src/signals/`·`src/models/`·`src/inference/` 어느 것도 건드리지 않는다.

- **원칙 III·IV**(모델 식별자·속도·토큰 미노출): 이 화면에 새로 들어오는 것은
  사진 이미지와 `"N / M"` 순번뿐. 017이 이미 지키는 S4·S5 경계를 그대로 잇는다.
- **원칙 I**(생성 중 미노출): 슬라이더·갤러리는 `DiaryDetailScreen`에만 있고,
  이 화면은 `screen.kind === "detail" | "written"`에서만 렌더된다
  (`DiaryHomeScreen.tsx:505·561`). `"writing"` 상태는 별도 `View`라 이 기능의
  어떤 요소도 닿지 않는다(FR-017).
- **`checkSourceFile` 영향 없음**: `UI_TOUCHES_PROMPT`(`src/ui/` → `diary/prompt`
  차단)·`UI_TOUCHES_MODEL`은 이 기능이 그 import를 하지 않으므로 무관.
  `signals/types`는 원래도 `DiaryDetailScreen`이 정당하게 쓴다(규칙이 안 막음).
  **새 헌법 검사 규칙이 필요하지 않다** — 이 기능은 새 경계를 만들지 않는다.

**Alternatives considered**: 없음.

---

## 미해결 사항

없음. 스펙의 모든 [NEEDS CLARIFICATION]이 spec/clarify 단계에서 해소됐고,
Phase 0의 유일한 열린 결정(라이브러리 추가 여부)이 결정 1·2에서 "추가 안 함"
으로 확정됐다.
