# Contract: 쓴 날 사진 확대 화면 (067)

계약 ID는 테스트 이름에 그대로 쓴다. 「위반 주입」 칸은 그 계약이 잡아야 하는 고장이다 — 구현 뒤 실제로 주입해 테스트가 빨개지는지 본다(AGENTS 「작업 습관」).

## 판정 (순수 함수, `src/app/photo-viewer.ts`) — `__tests__/app/photo-viewer.test.ts`

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| ZV1 | 수치 상수: `ZOOM_MAX 4`·`ZOOM_DOUBLE_TAP 2`·`ZOOM_MIN_LIVE 0.6`·`DISMISS_DISTANCE 120`·`DISMISS_VELOCITY 800`·`DISMISS_FADE_DISTANCE 300`·`BACKDROP_MIN_OPACITY 0.2` | 값 하나 바꾸기 |
| ZV2 | `pinchScale`: 0.3 → 0.6, 2.5 → 2.5, 9 → 4 | 하한 제거 |
| ZV3 | `settleScale`: 0.7 → 1, 1 → 1, 1.005 → 1, 3 → 3, 5 → 4 | 1 미만 그대로 |
| ZV4 | `doubleTapScale`: 1 → 2, 1.005 → 2, 1.5 → 1, 4 → 1 | 2배를 3배로 |
| ZV5 | `isZoomed`: 1 → false, 1.005 → false, 1.02 → true | `> 1` 정확 비교 |
| ZV6 | `shouldDismiss`: (120, 0) → true, (119, 0) → false, (30, 800) → true, (30, 799) → false, (-50, 900) → false, (0, 900) → false | 위로 끈 것도 닫기 |
| ZV7 | `backdropOpacity`: -20 → 1, 0 → 1, 150 → 0.6, 300 → 0.2, 600 → 0.2 | 선형 → 계단 |
| ZV8 | `fittedSize`: 사진 1024×768을 상자 360×800에 → 360×270, 768×1024를 360×400에 → 300×400, 가로나 세로가 0 이하 → `undefined` | `cover`로 계산 |
| ZV9 | `panLimit`: 맞춤 360×270·상자 360×800·배율 2 → x 180, y 0 / 배율 1 → 0, 0 / `fitted` 없음 → 0, 0 | 음수 한계 허용 |
| ZV10 | `clampOffset`: (250, 180) → 180, (-250, 180) → -180, (50, 180) → 50, (10, 0) → 0 | 한쪽만 자름 |
| ZV12 | `isTap`: `TAP_SLOP 10` — (100,100)→(106,108) 누름, (100,100)→(111,100)·(800,1300)→(300,1300)·(100,100)→(100,89) 누름 아님, 누른 자리 없음·좌표 NaN → 누름(막지 않는다). **실기기에서 드러나 더했다**(한 장인 사진을 가로로 쓸면 열림) | 한계를 축 합으로 / 없음을 막음 |
| ZV11 | `src/app/photo-viewer.ts`는 `src/ui/`·`react-native`를 import하지 않는다(소스, 주석 걷은 뒤) | `import … from "../ui/…"` |

## 지면 캐러셀 (`PhotoCarousel`) — `__tests__/ui/photo-carousel.test.tsx` (051 CAR9를 대체)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| ZC1 | **051 CAR9를 뒤집는다**: 사진 3장 — 각 슬라이드의 사진은 누를 수 있다(`photo-open-<photoId>`, `accessibilityRole="imagebutton"`, 접근성 이름 = 카탈로그 `photoViewer.open`) | `Pressable` 제거 |
| ZC2 | 사진 1장 — 같은 누름(`photo-open-<photoId>`)이 있다 | 1장에서 누름 빼기 |
| ZC3 | 누르면 확대 화면(`photo-viewer`)이 열리고, 누른 장부터(확대 화면 배지 「1 / 3」, 캐러셀 목의 첫 슬라이드) — 목이 첫 항목만 그리므로 시작 장은 `defaultIndex` host prop으로 본다 | `defaultIndex` 빼기 |
| ZC4 | 사본을 못 불러온 칸(`onError` 뒤 `diary-photo-missing`)에는 누름이 없다(`photo-open-*`이 사라진다) | 실패 칸도 누름 |
| ZC5 | 확대 화면이 닫히며 순번 2를 알리면 지면 배지가 「3 / 3」, 셋째 인디케이터가 긴 막대 | 닫힐 때 순번 무시 |
| ZC6 | 소스: 닫힐 때 지면 캐러셀 ref에 `scrollTo({ index, animated: false })`를 부른다(목에는 ref가 없어 소스 계약) | `scrollTo` 삭제 |
| ZC8 | 한 장: `pressIn`(300,500) → `press`(60,505)면 열리지 않고, `press`(303,502)면 열린다 (실기기에서 드러나 더했다) | `isTap` 거르기 삭제 |
| ZC7 | 지면 캐러셀의 팬 설정은 그대로다(051 CAR3 `activeOffsetX([-10,10])`·`failOffsetY([-10,10])`) — 누름이 넘김을 빼앗지 않는다 | `activeOffsetX` 제거 |

## 확대 화면 (`PhotoViewer`·`ZoomablePhoto`) — `__tests__/ui/photo-viewer.test.tsx`

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| ZP1 | `visible`이면 `Modal`이 `transparent`·`statusBarTranslucent`·`navigationBarTranslucent`, 내용이 `GestureHandlerRootView`로 감싸져 있다(소스 + 렌더) | `GestureHandlerRootView` 제거 |
| ZP2 | 사진 2장 이상 → 배지 `photo-viewer-badge` 「n / N」(시작 장 기준), 1장 → 배지 없음 | 1장에도 배지 |
| ZP3 | 닫기 버튼 `photo-viewer-close`: `accessibilityRole="button"`, 접근성 이름 = 카탈로그 `photoViewer.close`, 누르면 `onClose(지금 순번)` | 라벨 하드코딩 |
| ZP4 | `Modal`의 `onRequestClose`(뒤로 가기)도 `onClose(지금 순번)` | `onRequestClose` 빼기 |
| ZP5 | 2장 이상 → 캐러셀 `photo-viewer-carousel`: `loop`, `defaultIndex = 시작 장`, `scrollEnabled = true`(배율 1). 1장 → 캐러셀 없이 사진 하나 | `loop` 빼기 |
| ZP6 | 사진은 `resizeMode="contain"`, 원본 색(필터 없음), 사본 경로 `file://…` | `cover` |
| ZP7 | 배율 1에서 아래로 끌기 팬을 `fireGestureHandler`로 쏴 `translationY 130`에서 놓으면 `onClose` 1회, `translationY 60`·속도 0이면 0회 (팬 배선 — 문턱 판정 자체는 ZV6) | `shouldDismiss` 대신 상수 비교 |
| ZP8 | 소스: 끌어 닫기 팬은 배율 1일 때 `activeOffsetY([-10, 10])`·`failOffsetX([-10, 10])`, 확대됐을 때 캐러셀 `scrollEnabled={false}`. 확대 화면 캐러셀의 `onConfigurePanGesture`는 `activeOffsetX([-10, 10])`·`failOffsetY([-10, 10])`(세로 끌기와 겨루지 않는다 — 렌더: host prop이 함수) | `failOffsetX` 제거 / 캐러셀 `failOffsetY` 제거 |
| ZP9 | 사본을 못 불러오면 그 장에 「이 사진은 이제 없어요」(`photo-viewer-missing`) | 빈 칸 |
| ZP10 | 소스: 확대 화면·사진에 `Animated`/`GestureDetector`가 있고 핀치(`Gesture.Pinch`)·두 번 탭(`numberOfTaps(2)`)이 판정 함수(`pinchScale`·`settleScale`·`doubleTapScale`)를 부른다 — 손맛은 실기기 | `doubleTapScale` 대신 상수 |

## 경계

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| ZB1 | 화면 문구 「닫기」·「사진 크게 보기」는 `src/i18n/catalogs/ko/photo-viewer.ts`에만 있고 `ko-golden`의 `ADDED_AFTER_GOLDEN`에 있다(062 B1·G1) | `PhotoViewer.tsx`에 한글 리터럴 |
| ZB2 | 새 의존성 없음 — `package.json` `dependencies` 키 집합이 그대로다(설계 Z3) | 패키지 추가 |
| ZB3 | `npm run lint`(tsc·헌법 검사·prettier) 0 | — |
