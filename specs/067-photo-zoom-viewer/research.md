# Research: 쓴 날 사진 확대 화면 (067)

설치본 소스(`node_modules/`)와 기존 저장소 관례를 읽어 정했다. 모르는 것은 「짐작」으로 적고 실기기(quickstart)에서 확인한다(원칙 V).

## R1 — 확대 화면 안의 넘김: `react-native-reanimated-carousel` 5.1.1 재사용

- **Decision**: 지면 캐러셀과 같은 `Carousel`을 확대 화면에서도 쓴다 — `loop`(2장 이상), `defaultIndex`(누른 사진), `scrollEnabled`(확대되면 `false`), `onProgressChange`(순번 — 051 `indexAtProgress` 재사용).
- **Rationale**: 설치본 `lib/typescript/module/public-types.d.ts`에 `defaultIndex?`·`scrollEnabled?`·`CarouselRef.scrollTo({ index, animated })`가 있다. 순환·스냅·스프링을 다시 짜지 않는다(설계 Z3). 051이 이미 「렌더마다 새 참조를 넘기면 내부 상태가 되돌려진다」(046)를 겪었으므로 `data`·`renderItem`은 `memo`·`useCallback`으로 고정한다.
- **Alternatives**: 직접 가로 팬 + `translateX` — 순환·스냅을 다시 짜야 한다. `ScrollView pagingEnabled` — 순환 불가(051).

## R2 — 닫은 뒤 지면 캐러셀 위치: `CarouselRef.scrollTo({ index, animated: false })`

- **Decision**: `PhotoCarousel`이 지면 캐러셀의 ref를 들고, 확대 화면이 닫히며 알린 순번으로 `scrollTo({ index, animated: false })`를 부르고 배지·인디케이터 순번(`index` 상태)도 그 값으로 둔다.
- **Rationale**: 공개 API다(R1의 타입 파일). `animated: false`면 `onProgressChange`가 한 번에 그 위치를 알릴 것으로 짐작하지만 그것에 기대지 않고 순번을 직접 둔다. 1장일 때는 캐러셀이 없으므로 할 일이 없다.
- **Alternatives**: 지면 캐러셀을 `key`로 다시 마운트 + `defaultIndex` — 051 CAR10의 「날이 바뀌면 새로 마운트」와 같은 수단이라 의미가 섞이고 깜빡일 수 있다.

## R3 — 확대·이동·끌어 닫기: gesture-handler 2.32 `Gesture.Pinch`·`Pan`·`Tap` + reanimated 공유값

- **Decision**: 사진 한 장(`ZoomablePhoto`)마다 `GestureDetector` 하나에 `Gesture.Simultaneous(pinch, pan, doubleTap)`. 049 `DayPicker`와 같이 **`runOnJS(true)`**로 콜백을 JS에서 돌리고 공유값(`scale`·`offsetX`·`offsetY`·`dragY`)에 쓴다 — jest에서 `fireGestureHandler`로 같은 콜백을 쏠 수 있다(049 선례). 판정(문턱·한계)은 모두 `src/app/photo-viewer.ts`의 순수 함수가 한다.
- **팬의 두 얼굴**: 배율 1이면 팬은 **세로가 먼저 10을 넘을 때만** 서고(`activeOffsetY([-10, 10])`) 가로가 먼저면 실패한다(`failOffsetX([-10, 10])`) — 캐러셀의 가로 팬과 겨루지 않는다(051 `configurePan`의 거울). 확대되면 팬은 어느 방향이든 서고(`minDistance`) 캐러셀은 `scrollEnabled={false}`다. 배율이 「1인가」는 JS 상태(`zoomed`)로 들고 팬 설정을 렌더마다 다시 만든다.
- **Rationale**: 새 의존성 0(Z3). 049가 같은 구조(JS 스레드 팬)로 실기기에서 손에 맞았다. **짐작**: 핀치를 JS 스레드에서 돌리면 끊겨 보일 수 있다 — 실기기 녹화에서 끊기면 그 제스처만 worklet으로 옮긴다(049 주석과 같은 대비).
- **Alternatives**: `react-native-awesome-gallery`(peer reanimated ^3, 2024-09 이후 갱신 없음 — 설계 Z3에서 기각). 네이티브 확대 뷰(새 네이티브 의존성).

## R4 — 안드로이드 `Modal` 안의 제스처: `GestureHandlerRootView`로 감싼다

- **Decision**: 확대 화면은 RN 코어 `Modal`(`transparent`, `animationType="fade"`, `statusBarTranslucent`, `navigationBarTranslucent`)이고 내용 전체를 `GestureHandlerRootView`(`flex: 1`)로 감싼다.
- **Rationale**: 안드로이드 `Modal`은 별도 창이라 앱 루트의 `GestureHandlerRootView` 밖이다 — gesture-handler 문서의 알려진 요구다. 050의 대화상자(`@rn-primitives` 포털)는 같은 창에 그려 이 문제가 없었지만, 확대 화면은 상태 표시줄·내비게이션 바까지 덮어야 하고 홈의 겹(055)보다 위여야 하므로 `Modal`이 맞다. **짐작**: `navigationBarTranslucent`가 edge-to-edge(Android 16)에서 내비게이션 바 뒤까지 그리는지는 실기기에서 본다.
- **Alternatives**: 포털(`PortalHost`) — 상태 표시줄 위를 덮지 못하고 지면 `SafeAreaView` 인셋 안에 갇힌다.

## R5 — 뒤로 가기: `Modal`의 `onRequestClose`

- **Decision**: 뒤로 가기는 `Modal onRequestClose`가 받아 닫는다. 홈의 `BackHandler`는 건드리지 않는다.
- **Rationale**: 안드로이드 `Modal`은 별도 대화상자 창이라 열린 동안 하드웨어·제스처 뒤로 가기가 그 창으로 간다(액티비티의 `onBackPressed`·RN `BackHandler`에 닿지 않는다). 055의 「등록 순서에 기대지 않는다」를 지킨다 — 홈은 아무것도 등록하지 않아도 된다. **짐작**: 실기기에서 확대 화면이 열린 채 뒤로 가기 → 확대만 닫히고 홈이 그대로인지 본다(SC-003).

## R6 — 사진의 맞춤 크기: `Image` `onLoad`의 원본 크기

- **Decision**: 확대 화면의 사진은 화면 크기 상자에 `resizeMode="contain"`이고, 이동 한계 계산에 쓸 맞춤 크기는 `onLoad`의 `nativeEvent.source.{width,height}`(사본 크기, 1024px 축)로 순수 함수 `fittedSize()`가 구한다. 불러오기 전에는 이동 한계를 0으로 둔다(확대해도 움직이지 않는다 — 곧 불러온다).
- **Rationale**: `Image.getSize`를 따로 부르면 파일을 두 번 읽는다. 사본은 이미 지면에서 불러온 것이라 빠르다.

## R7 — 문구: 새 카탈로그 영역 `photoViewer`

- **Decision**: `src/i18n/catalogs/ko/photo-viewer.ts`에 `close`(닫기 버튼 접근성 이름 「닫기」)·`open`(지면 사진의 접근성 이름 「사진 크게 보기」)을 두고 `ko` 인덱스에 등록, 골든 테스트의 `ADDED_AFTER_GOLDEN`에 더한다(064 선례). 화면은 `lazyText((c) => c.photoViewer)`로 읽는다(C4 — 모듈 최상단 평가 금지).
- **Rationale**: 062 B1 — 화면 한글은 카탈로그에만. 닫기 버튼에 보이는 글자는 기호 「✕」이고 그것은 문구가 아니다(언어 무관).

## R8 — 수치는 사람이 정한다

- **Decision**: `src/app/photo-viewer.ts` 한 자리에 `ZOOM_MAX 4`·`ZOOM_DOUBLE_TAP 2`·`ZOOM_MIN_LIVE 0.6`(핀치 중 1 아래로 내려가는 하한, 놓으면 1)·`DISMISS_DISTANCE 120`·`DISMISS_VELOCITY 800`·`DISMISS_FADE_DISTANCE 300`(이만큼 끌면 배경이 최소)·`BACKDROP_MIN_OPACITY 0.2`. 앞 넷은 설계 Z1·Z5, 뒤 셋은 이 계획에서 사람이 정한 값이다(코드가 분포를 보고 정하지 않는다 — 023 관례). 실기기에서 손에 맞지 않으면 이 자리만 고친다(FR-015).
