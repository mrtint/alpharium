# 계약: 다운로드 진행 화면 캐러셀·프로그레스 바 (`src/ui/DownloadProgressScreen.tsx`, `src/firstrun/`)

045의 `download-consent-gate.md`(C1~C9)를 대체하지 않는다 — 그 문서는
`resolveFirstRunStage`·`resolveSlideStage`의 단계 전이 계약이고, 이 문서는
`"downloading"` 단계에 머무는 동안 화면 **내부**가 지켜야 할 계약이다.

## D1 — `progressSegments()`는 순수 함수이고 입력을 넘지 않는다

`progressSegments(fraction: number): readonly [number, number, number, number]`.
`Date.now()`·난수·파일·네트워크를 쓰지 않는다. 같은 `fraction`을 넣으면
항상 같은 결과.

위반 주입: 함수 내부에서 현재 시각을 섞으면 계약 테스트가 같은 입력에
다른 출력이 나오는 것을 잡는다.

## D2 — 4개 구간은 순서대로 채워진다

`progressSegments(0.62)`는 `[1, 1, 0.48, 0]`이어야 한다(오차 허용
`±0.001`). 일반화: `fraction`이 `[0.25*i, 0.25*(i+1))` 구간에 있을 때
`segment[0..i-1] === 1`, `segment[i] === (fraction - 0.25*i) / 0.25`,
`segment[i+1..3] === 0`.

경계값: `progressSegments(0) === [0,0,0,0]`,
`progressSegments(1) === [1,1,1,1]`,
`progressSegments(0.25) === [1,0,0,0]`(정확히 경계에 걸리면 앞 칸을 완전히
채운 것으로 본다, spec Edge Cases).

위반 주입: 나눗셈 기준을 25%가 아닌 다른 값으로 바꾸면 경계값 테스트가
잡는다.

## D3 — `progressSegments()`는 입력 범위를 벗어나도 안전하다

`fraction`이 `[0, 1]` 밖(예: 부동소수점 오차로 `1.0000001`)이어도 각
구간 값은 항상 `[0, 1]`로 clamp된다. 음수 입력도 마찬가지로 `[0,0,0,0]`.

위반 주입: clamp를 빼면 경계 밖 입력에서 구간 값이 1을 초과하거나
음수가 되는 것을 잡는다.

## D4 — 진행 구간은 카드 전환으로 리셋되지 않는다 (spec FR-007, SC-004)

`DownloadProgressScreen`이 구독하는 `progressSegments()`의 입력
(`downloadFraction` prop)은 캐러셀의 현재 카드 인덱스(`CarouselCardIndex`,
화면 로컬 state)와 **서로 다른 state를 쓴다** — 하나가 바뀌어도 다른 하나가
영향받지 않는다.

위반 주입: 캐러셀 인덱스가 바뀔 때 `downloadFraction`을 재조회하거나 0으로
되돌리는 코드가 있으면, 카드 전환 이벤트 발생 시 진행 구간이 변하는 것을
계약 테스트(화면 렌더 테스트)가 잡는다.

## D5 — 완료 화면 전환 게이트는 045 그대로 유지된다

`downloadReady === true`이고 `downloadProceedConfirmed === false`인 동안,
화면은 캐러셀이 아니라 완료 뷰("준비됐어요" + 버튼)를 보여준다(045 C 계약
계승, 이 스펙에서 변경하지 않음). 버튼(`onProceed`)을 누르기 전까지 다음
화면으로 자동 전환하지 않는다(spec FR-009).

위반 주입: `downloadReady === true`가 되자마자 `onProceed`를 자동 호출하는
코드가 있으면, 완료 화면이 최소 1프레임 이상 유지되지 않는 것을 렌더
테스트가 잡는다(045가 이미 겪은 회귀와 동일 패턴).

## D6 — 실패는 화면 레이아웃을 바꾸지 않는다 (spec FR-011, SC-008)

`failed: boolean` prop이 `true`가 돼도 캐러셀·프로그레스 바 컴포넌트
트리(`testID`로 식별 가능한 최상위 뷰들)는 그대로 렌더된다 — 045의
`download-progress-failed` 전용 뷰·조건부 early return은 존재하지 않는다.
바뀌는 것은 진행 바 하단 안내 문구 하나뿐이다.

위반 주입: `failed`를 조건으로 삼아 캐러셀 컴포넌트를 언마운트하는
early return이 있으면, 실패 상태 렌더 결과에 캐러셀의 `testID`가 없는
것을 계약 테스트가 잡는다.

## D7 — 실패 안내는 오류 원문을 담지 않는다 (원칙 III 계승)

실패 시 표시되는 문구는 사람이 쓴 고정 상수 하나뿐이고, `failed` prop
자체는 `boolean`이라 애초에 오류 객체·메시지 문자열을 운반할 수 없다.

위반 주입: `failed` prop의 타입을 `boolean | string`(오류 메시지 포함)
으로 넓히면 시그니처 검사(소스 `readFileSync` 기반 계약 테스트)가 잡는다.

## D8 — 재시도는 화면이 아니라 조립 계층(`App.tsx`)의 책임이다

`DownloadProgressScreen`은 재시도를 트리거하는 콜백 prop을 받지 않는다
(045의 `onRetry` prop 제거). 재시도 타이밍(10초 간격, spec Assumptions)은
`App.tsx`가 `failed` state를 보고 스스로 `setInterval`로 판단한다.

위반 주입: `DownloadProgressScreenProps`에 재시도 관련 콜백이 다시
추가되면 소스 검사 또는 props 타입 계약 테스트가 잡는다(045가 가졌던
`onRetry: () => void`가 되살아나는 것을 방지).

## D9 — 캐러셀 카드 인덱스는 라이브러리가 낸 값을 그대로 신뢰한다

앱 코드는 캐러셀의 "다음/이전 인덱스"를 직접 계산하지 않는다 —
`onSnapToItem(index)` 콜백이 주는 값만 로컬 state에 반영한다(research R1,
D4의 "서로 다른 state" 전제와 별개로 캐러셀 인덱스 자체의 출처를 규정).

위반 주입: 스와이프 제스처 이벤트를 앱이 직접 가로채 인덱스 산술을 하는
코드가 있으면, 코드 리뷰 관례(계약 테스트로 강제하기 어려운 항목이라
`/speckit-implement` 단계에서 소스 확인으로 갈음)로 지적한다.
