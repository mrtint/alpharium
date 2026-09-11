# 계약: 첫 실행 게이트 (`src/firstrun/`)

021(`onboarding-screen.md`)·035(`welcome-gate.md`)의 계약 문서 형식을
따른다. 이 문서는 이 둘의 계약을 대체하지 않고 그 위에 얹는 조율 계층만
정의한다.

## G1 — `resolveFirstRunStage`는 순수 함수다

인자로 받은 값 외의 어떤 것도 읽지 않는다(`Date.now()`·`fetch`·파일 읽기
없음). 같은 입력에는 항상 같은 출력. 위반 주입: 함수 안에 `Date.now()`를
넣으면 계약 테스트가 타입 검사(함수 시그니처에 `now` 인자가 없는데 내부에서
시간을 읽는 것)와 소스 문자열 검사 양쪽으로 잡는다.

## G2 — `FirstRunStage`는 되돌아가지 않는다

`"done"`에 도달하면 이후 어떤 입력 조합으로도 `"logo"`·`"onboarding"`으로
돌아가지 않는다 — `onboardingNeeded`가 `shouldShowOnboarding()`(021)의
`completed` 플래그에 묶여 있고 그 플래그는 한 번 true가 되면 되돌리는
코드가 없기 때문에 구조적으로 성립한다. 계약 테스트가 `onboardingNeeded:
false` 고정 후 나머지 입력을 임의로 바꿔도 `"logo"`/`"onboarding"`이 나오지
않음을 확인한다.

## G3 — 로고는 온보딩이 필요할 때만, 세션당 최대 1회

`shouldShowLogo`는 `onboardingNeeded === false`면 항상 `false`를 반환한다
(이미 온보딩을 마친 기존 사용자, FR-010/SC-005). `onboardingStarted`는
저장되지 않는 세션 로컬 값이며 `src/firstrun/`이 아니라 `App.tsx`가
소유한다(research.md #6).

## G4 — 작명은 다운로드 완료를 기다리지 않는다

`resolveFirstRunStage({ onboardingNeeded: false, namingDone: false,
downloadReady: false, ... })` → `"naming"`. `downloadReady: true`로 바꿔도
`namingDone: false`인 동안은 여전히 `"naming"`(FR-005/FR-007 — 다운로드가
먼저 끝나도 작명을 재촉/스킵하지 않는다). 위반 주입: `downloadReady`를
우선순위 2번(로고 다음)으로 옮기면 이 케이스에서 `"waiting-for-download"`가
잘못 나오는 것을 테스트가 잡는다.

## G5 — liveness는 작명과 다운로드가 모두 끝난 뒤에만

`livenessOutcome`을 판정에 쓰는 것은 `namingDone && downloadReady`일
때뿐이다 — 035의 기존 liveness 계약(L12, 자동 1회·재시도는 사용자 트리거)을
그대로 물려받으며 040은 "언제 그 확인을 시작하는가"의 조건만 넓힌다(기존:
`essentialAssetsReady`만 보고 시작 / 040: 그 위에 `namingDone`도 추가).

## G6 — 자동 첫 일기 생성은 liveness 통과 후 최대 1회

`shouldAutoGenerate`가 `true`를 반환해도 실제 `pipeline.run()` 호출은
`app/wiring.ts`가 세션 스코프 플래그로 중복 실행을 막는다 — 같은 세션에서
`resolveFirstRunStage`가 `"done"`을 여러 번 재계산해도(리렌더 등) 생성은
1회만 시도된다. 위반 주입: 세션 스코프 플래그를 지우면 리렌더마다
`pipeline.run()`이 중복 호출되는 것을 계약 테스트(mock pipeline 호출
횟수 검사)가 잡는다.

## G7 — `src/firstrun/`은 제품 계층에 직접 닿지 않는다

`src/firstrun/**`은 `models/roster`·`ModelAsset`·`assetFor`·`diary/prompt`·
`buildPrompt`·`diary/acceptance`를 import하지 않는다(`checkFirstRunFile`,
021/035와 같은 패턴). `diary/pipeline`의 타입 참조는 허용하되 실제
`pipeline.run()` 호출부는 `app/wiring.ts`에만 있어야 한다 — `firstrun/`
안의 함수는 "자동 생성을 시도해야 하는가"라는 불리언만 답하고, 실행은
조립 계층의 몫이다.

## G8 — 화면 문구에 모델·진행 지표를 노출하지 않는다

021(`WELCOME_TOUCHES_PRODUCT_LAYER`·`WELCOME_MEASURES_TIME`류)과 같은 패턴을
`checkFirstRunFile`도 검사한다 — `elapsed*`·`durationMs`·`timings`·
`tokens_*`·`Date.now`·`performance.now` 토큰을 `src/firstrun/` 소스에서
차단한다(FR-012).
