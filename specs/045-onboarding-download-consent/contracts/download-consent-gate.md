# 계약: 다운로드 동의·진행 게이트 (`src/firstrun/`)

040의 `first-run-gate.md`(G1~G7)를 대체하지 않고 그 위에 얹는다. **G4·G5는
이 스펙이 순서를 뒤집으므로 아래 새 조항으로 교체된다** — 040 문서 자체는
역사적 기록으로 그대로 두고, 이 문서가 현재 유효한 계약이다.

## C1 — `resolveFirstRunStage`는 여전히 순수 함수다 (040 G1 계승)

새 입력(`downloadConsented`)이 추가돼도 `Date.now()`·`fetch`·파일 읽기를
하지 않는다. 위반 주입: 함수 내부에서 시간을 읽으면 계약 테스트가 잡는다.

## C2 — 동의는 다운로드보다 먼저다 (040 G4를 대체)

`resolveFirstRunStage({ onboardingNeeded: false, downloadConsented: false,
downloadReady: false, namingDone: false, ... })` → `"download-consent"`
(작명이 아니다). `downloadConsented: true`로 바꾸면(다운로드는 아직
`downloadReady: false`) → `"downloading"`. **작명(`"naming"`)은
`downloadReady === true`가 되기 전까지 결코 반환되지 않는다** — 040의
"작명이 다운로드를 기다리지 않는다"(G4)를 정확히 뒤집는다.

위반 주입: `!namingDone`을 `!downloadConsented`보다 먼저 검사하도록
순서를 되돌리면, `downloadConsented: false, namingDone: false` 조합에서
`"naming"`이 잘못 나오는 것을 계약 테스트가 잡는다.

## C3 — 이미 준비된 사용자는 동의·다운로드 화면을 보지 않는다

`downloadReady: true`인 입력에서는 `downloadConsented` 값과 무관하게
`"download-consent"`·`"downloading"`이 결코 반환되지 않는다(FR-009,
data-model.md 우선순위 3·4단계가 `!downloadReady`를 전제하므로 구조적으로
성립). 위반 주입: 우선순위 3단계 조건에서 `!downloadReady`를 빼면, 이미
준비된 사용자에게도 동의 화면이 뜨는 것을 계약 테스트가 잡는다.

## C4 — liveness는 여전히 작명 이후에만 (040 G5 계승, 순서만 이동)

`livenessOutcome`을 판정에 쓰는 것은 `namingDone === true`일 때뿐이다.
040과 다른 점은 그 시점에 `downloadReady`가 **이미 항상 참**이라는 것
뿐이다(C2에 의해 `"naming"`에 도달하려면 `downloadReady`가 true여야
하므로) — liveness 계약 자체(035 L12, 자동 1회·재시도는 사용자 트리거)는
무변경.

## C5 — 동의는 한 번만 필요하다

`OnboardingFlag.downloadConsented`가 한 번 `true`가 되면, 같은 설치본에서
다시 `false`로 되돌리는 코드 경로가 없다(F1·F3·F4, 021·035 관례 계승).
위반 주입: `downloadConsented`를 재설정하는 코드를 추가하면 소스 검사
(`checkOnboardingFile`류)가 없으므로 계약 테스트가 `saveOnboardingFlag`
호출 인자를 직접 검사해 잡는다.

## C6 — 슬라이드 단계는 진행률과 무관하다

`resolveSlideStage`는 `downloadReady`와 `elapsedMs`만 받는다 —
`essentialDownloadFraction()`의 결과(바이트 비율)를 인자로 받지 않는다
(원칙 IV, research.md R3). 위반 주입: 함수 시그니처에 진행률 인자를
추가하면 `checkFirstRunFile`류 소스 검사 또는 계약 테스트의 시그니처
검사가 잡는다.

## C7 — 슬라이드는 4번째에서 멈추고, 다운로드 완료 즉시 넘어간다

`resolveSlideStage({ downloadReady: false, elapsedMs: 999_000 })` →
`{ kind: "slide", index: 3 }`(무한정 커도 3을 넘지 않는다). `downloadReady:
true`이면 `elapsedMs` 값과 무관하게 `{ kind: "complete" }`. 위반 주입:
`min(3, ...)` 클램프를 제거하면 `index`가 3을 넘는 것을, `downloadReady`
우선순위를 낮추면 완료 즉시 전환되지 않는 것을 계약 테스트가 잡는다.

## C8 — `src/firstrun/`은 제품 계층에 직접 닿지 않는다 (040 G7 계승)

새로 추가되는 `consent.ts`(`resolveSlideStage` 순수 판정)도
`checkFirstRunFile`의 검사 대상이다 — `models/roster`·`ModelAsset`·
`assetFor`·`diary/prompt`·`buildPrompt`·`diary/acceptance`를 import하지
않는다. `downloadConsented` 필드는 `src/onboarding/flag.ts`(021·035가
이미 세운 파일)에 있으므로 `checkOnboardingFile` 검사가 이미 그 경계를
지킨다.

## C9 — 동의 안내·슬라이드 화면은 모델 식별자에 닿지 않는다 (원칙 III)

`DownloadConsentDialog`·`DownloadProgressScreen`은 `essential-assets.ts`의
`ESSENTIAL_ASSET_KEYS`(문자열 키)를 import하거나 화면에 노출하지
않는다 — `essentialsReady`(boolean)와 사람이 쓴 고정 문구만 받는다(007
이후 전 화면의 관례, `checkSourceFile`의 `UI_TOUCHES_MODEL`이 검사).
