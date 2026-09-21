# Phase 0 Research: 다운로드 진행 화면(캐러셀 + 프로그레스 바) 완성

Technical Context에 NEEDS CLARIFICATION은 없었다(브레인스토밍에서 이미 확정).
이 문서는 채택한 라이브러리·통합 방식의 근거를 기록한다.

## R1. 캐러셀 라이브러리 선택

**Decision**: `react-native-reanimated-carousel`(v5)을 신규 도입한다.

**Rationale**:
- `loop` prop으로 무한 순환을, `autoPlay`+`autoPlayInterval`로 자동 전환을
  라이브러리가 직접 제공한다 — 끝에서 처음으로 되돌리는 재정렬 트릭을 직접
  구현할 필요가 없다.
- Autoplay는 "사용자 상호작용·전환 중에는 자동 일시정지, 이후 재개(re-armed)"
  되는 컨트롤드 스케줄러로 동작한다(공식 아키텍처 문서) — 스와이프와 자동
  타이머가 충돌 없이 공존한다는 FR-002~004 요구를 별도 조율 로직 없이
  만족시킨다.
- `onSnapToItem(index)` 콜백으로 "지금 보고 있는 카드"를 앱 쪽에서 관측할 수
  있다.
- Context7(`/dohooo/react-native-reanimated-carousel`, Source Reputation:
  High, Benchmark 86.45)로 확인, 커뮤니티 표준 라이브러리.

**Alternatives considered**:
- RN 코어 `ScrollView`(`horizontal`+`pagingEnabled`) 직접 구현 — 025(사진
  갤러리)가 쓴 패턴과 같아 새 의존성이 필요 없다. 그러나 "무한 순환"은
  라이브러리가 기본 제공하지 않아, 마지막 카드에서 첫 카드로 되돌아가는
  동작을 직접 구현해야 한다(스크롤 위치 재계산 트릭, 깜빡임 위험). 사용자가
  "라이브러리가 제공하는 방식이 있으면 직접 구현보다 사용하는 편이 낫다"고
  명시적으로 판단해 이 대안은 채택하지 않았다.
- `react-native-snap-carousel` — 유지보수 활성도가 낮고(Benchmark 25) v5
  아키텍처와의 정합성이 낮아 배제.

## R2. 신규 네이티브 의존성 범위

**Decision**: `react-native-gesture-handler`를 신규 추가한다.
`react-native-worklets`(0.10.1)는 이미 033에서 도입돼 있고,
`babel.config.js`의 `plugins: ["react-native-worklets/plugin"]`도 이미
존재해 추가 설정이 필요 없다.

**Rationale**: 공식 설치 가이드(`npx expo install react-native-reanimated-
carousel react-native-reanimated react-native-worklets react-native-gesture-
handler`) 기준, 이 프로젝트에 정말로 새로 필요한 것은
`react-native-gesture-handler` 하나뿐이다 — `react-native-reanimated`(4.5.1)
· `react-native-worklets`(0.10.1) · babel 플러그인은 032·033이 이미 갖춰
뒀다.

**Alternatives considered**: 없음 — gesture-handler는 v5 라이브러리의
필수 peer dependency이고 우회 경로가 없다(FAQ: "React Native Gesture
Handler version 2 or higher를 쓸 때는 GestureHandlerRootView로 감싸는 것이
필수").

**구현 중 실측 정정**: Context7 문서 예제 코드는 `autoPlay`/
`autoPlayInterval`(camelCase)로 표기하나, 실제 설치된 패키지(v5.1.1)의
타입 선언(`public-types.d.ts`)은 **`autoplay`/`autoplayInterval`/
`autoplayDirection`(전부 소문자 lowercase)**이다 — `tsc`가 이 불일치를
즉시 잡아냈다(007·014 관례— 타입 축소/변경은 `tsc`가 정확히 짚어준다).

## R3. `GestureHandlerRootView` 배선 위치

**Decision**: `App.tsx`의 최외곽(`SafeAreaProvider` 바깥 또는 그 부모)에
`GestureHandlerRootView`(`style={{ flex: 1 }}`)를 한 번 추가한다.

**Rationale**: 공식 사용 가이드가 앱 루트를 이 컴포넌트로 감싸는 것을
표준 패턴으로 제시한다. 온보딩·홈 등 다른 화면 트리는 그 안에 자연히
포함되므로 이 화면 전용으로 별도 래핑을 반복할 필요가 없다.

**Alternatives considered**: 캐러셀을 쓰는 화면(`DownloadProgressScreen`)
내부에서만 `GestureHandlerRootView`로 감싸는 방법도 가능하나, gesture-handler
공식 권장은 앱 루트 1회 래핑이며 이후 다른 화면에서 제스처 기반 컴포넌트를
쓸 때(예: 향후 049 갤러리 재작업) 다시 고민할 필요가 없어 더 단순하다.

## R4. 4분할 프로그레스 바 매핑

**Decision**: 기존 `essentialDownloadFraction()`(029, 무변경)이 내는
0~1 연속값을 입력으로 받아, 4개 구간 각각의 채움 비율(0~1)을 계산하는
순수 함수를 `src/firstrun/consent.ts`(또는 인접한 신규 모듈)에 추가한다.
계산은 `segment[i] = clamp((fraction - i*0.25) / 0.25, 0, 1)`.

**Rationale**: 사용자가 "연속 진행률을 4개 칸에 25%씩 나눠 채움"을 명시적
으로 확정했다. 이 매핑은 입력 하나(fraction)에만 의존하는 순수 함수라
기기 없는 테스트로 전체 구간(0%, 25%, 48%, 62%, 100% 등 경계값 포함)을
검증할 수 있다.

**Alternatives considered**: 사용자가 배제한 "자산 개수/크기 덩어리 기준
분할"은 자산 3개를 4칸에 억지로 매핑해야 해 어색해지므로 채택하지 않음
(이미 대화에서 결정됨).

## R5. 진행 중인 구간의 애니메이션

**Decision**: `react-native-reanimated`의 `useAnimatedStyle`+`withTiming`으로
각 구간 바의 `width`(또는 `flex`/`scaleX`)를 애니메이션한다 — 033이 이미
같은 패턴(`scale 0.97` 눌림 피드백)을 이 저장소에 도입해 검증했다.

**Rationale**: 캐러셀과 마찬가지로 reanimated 기반이라 별도 애니메이션
라이브러리를 추가하지 않는다. `withTiming`은 fraction 값이 바뀔 때마다
매끄럽게 폭을 보간해 "지금도 받고 있다"는 인상을 준다(FR-006).

**Alternatives considered**: RN 코어 `Animated` API — 이미 reanimated가
있는 프로젝트에서 두 애니메이션 시스템을 병행할 이유가 없어 배제.

## R6. 실패 → 자동 재시도 배선 위치

**Decision**: 자동 재시도 타이머는 `App.tsx`(다운로드를 트리거하는 기존
`useEffect`가 있는 조립 계층)에 둔다. 화면(`DownloadProgressScreen`)은
`failed: boolean` 입력만 받아 안내 문구만 바꾸고, 재시도 로직 자체는 모른다.

**Rationale**: 기존 045 구조가 이미 "다운로드 시작·실패 판정은 `App.tsx`,
화면은 상태만 받아 표시"로 나뉘어 있었다(`essentialDownloadStarted` ref,
`downloadFailed` state가 `App.tsx`에 있음). 이번 변경은 사용자 트리거
(`onRetry` prop)를 제거하고 그 자리를 `App.tsx`의 `setInterval` 기반 자동
재시도로 바꾸는 것뿐이라 기존 경계를 유지한다.

**Alternatives considered**: 화면 내부에 재시도 타이머를 두는 방법도
가능하나, 이미 `App.tsx`가 다운로드 시작·완료·실패의 전체 생명주기를 쥐고
있어(참조: `essential-assets-port.ts` 호출) 재시도도 같은 자리에 두는 것이
계층 경계상 자연스럽다.

## R7. 기존 실패 전용 화면 제거 범위

**Decision**: `DownloadProgressScreen`의 `download-progress-failed`
testID 뷰와 `onRetry` prop을 제거한다. `FAILED_TEXT.retry`("다시 시도")
상수도 더 이상 버튼에 쓰이지 않으므로 제거하고, 대신 진행 바 하단
안내 문구 자리에 실패 시 표시할 고정 텍스트("받다가 멈췄어요" 계열,
오류 원문 미포함)만 남긴다.

**Rationale**: FR-011·FR-013(원칙 III 실패 원문 미노출)을 그대로 지키되,
화면 레이아웃 전환 없이 안내만 바꾸는 요구를 반영한다.
