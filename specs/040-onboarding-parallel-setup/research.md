# Phase 0 연구: 초기 권한 획득과 첫 실행 흐름 재설계

## 1. 021 `OnboardingScreen`의 스텝 전환을 자동(타이머)으로 바꾸는 방법

**Decision**: 각 권한 스텝에 진입하면 목적 설명을 렌더한 직후
`setTimeout`(고정 지연, 예: 1.5~2초)으로 시스템 권한 요청 함수를 자동
호출한다. 스텝 컴포넌트 언마운트 시 타이머를 정리한다(clean-up). 지연값은
`src/onboarding/`이 아니라 `src/ui/OnboardingScreen.tsx`(화면 계층)에 상수로
둔다 — 021의 `PERMISSION_REQUIREMENTS`(순수 판정)는 "무엇을 보여줄지"만
정하고 "얼마나 보여줄지"는 화면 관심사이기 때문이다.

**Rationale**: FR-001이 "사용자 조작 없이 자동으로 이어서 띄워야 한다"고
명시했고, clarify에서 "자동(타이머) — 짧게 보여주고 바로 시스템 팝업"이
확정됐다. `planOnboardingSteps`·`nextStep`(021 `decision.ts`)은 이미 "다음
스텝이 무엇인가"를 순수 함수로 답하므로, 화면은 그 답을 받아 타이머로
`nextStep`을 트리거하기만 하면 된다 — 판정 로직 변경이 불필요하다.

**Alternatives considered**:
- 애니메이션 완료 콜백으로 전환 트리거 — 애니메이션이 없는 최소 구현에는
  과함, 타이머로 충분히 FR-001을 만족한다.
- `decision.ts`에 지연값 상수를 두는 안 — 기각. 021의 경계 검사
  (`checkOnboardingFile`)가 순수 판정 파일에 시간 관련 로직이 느는 것을
  경계해왔고(`FLAG_GROWS_HISTORY`류 패턴), 화면 타이머는 화면 파일에
  두는 것이 기존 계층 분리와 일치한다.

## 2. 배터리 예외 스텝을 팝업 시퀀스 "안"에 넣는 방법

**Decision**: 021의 `PERMISSION_REQUIREMENTS`(순서 4번, `battery-exception`)
스텝 컴포넌트가 렌더될 때 시스템 팝업 대신 021의 기존 전용 안내 화면(설명 +
[배터리 설정 열기] + [건너뛰기])을 그대로 쓰되, **자동 전환 타이머를 이
스텝에는 적용하지 않는다** — 이 항목은 조회 API가 없어(021 실측 기록,
`getPermission()` 부재) 사용자가 돌아왔는지 자동으로 알 수 없으므로, 이
스텝만 사용자가 직접 [설정 열기]/[건너뛰기]를 눌러 다음으로 넘어간다.

**Rationale**: FR-002가 "팝업 대신 전용 안내와 설정 이동 경로를 그 차례에
제공"이라고 명시했다 — 시퀀스 "안"에 포함하되 팝업이 아니므로 자동 타이머
전환(시스템 팝업 트리거용)이 이 스텝에는 적용 대상이 아니다. 021이 이미 이
안내 UI를 가지고 있으므로 재사용한다.

**Alternatives considered**:
- 배터리 스텝도 고정 지연 후 자동으로 다음으로 넘어가게 — 기각. 사용자가
  실제로 설정 화면에 다녀올 시간을 보장하지 못하고, FR-003("건너뛸 수
  있는 경로")과 상충하지 않으나 사용자가 설정을 보기도 전에 다음 스텝으로
  밀려나는 나쁜 경험이 된다. clarify 답변("021의 기존 배터리 예외 안내를
  그 자리에 그대로 넣는다")은 안내 UI 재사용을 확정했을 뿐 자동 스킵까지
  요구하지 않는다.

## 3. 작명(035)과 다운로드(029)를 병렬로 보여주는 게이트 조건

**Decision**: 035 `decision.ts`의 `shouldShowWelcome({onboardingNeeded,
essentialAssetsReady, welcomeShown})`을 **`essentialAssetsReady` 인자 없이도
true를 낼 수 있도록 조건을 완화**한다 — 정확히는 `onboardingNeeded === false
&& welcomeShown === false`면 다운로드 완료 여부와 무관하게 웰컴(작명) 화면을
보여주고, 새 `src/firstrun/progress.ts`의 `resolveFirstRunStage(...)` 순수
함수가 "작명 완료" + "다운로드 완료" 두 불리언을 받아 다음에 무엇을 보여줄지
(`naming | waiting-for-download | liveness | done`)를 판정한다.

```
resolveFirstRunStage({ namingDone, downloadReady }):
  !namingDone                       → "naming"           (다운로드 상태 무관, FR-005)
  namingDone && !downloadReady      → "waiting-for-download" (FR-006)
  namingDone && downloadReady       → "liveness"          (FR-007, FR-008)
```

**Rationale**: FR-005~007이 요구하는 것은 "작명 화면이 다운로드 완료를
기다리지 않고 뜬다"와 "작명 완료 후에만 대기 화면으로 넘어간다(다운로드가
먼저 끝나도 작명을 재촉하지 않는다)"이다. 이것은 035의 `WelcomeScreen`
내부에 조건을 추가하는 대신, 035 밖의 새 조율 계층(`firstrun/progress.ts`)이
두 완료 신호를 합쳐 판정하게 하는 것이 021/035의 기존 "화면은 판정 결과만
받는다" 패턴과 일치한다 — `WelcomeScreen`은 여전히 자신이 다운로드 상태를
알 필요가 없다(035의 W6/W7 경계 유지: liveness는 여전히 다운로드 완료
**이후**에만 실행되므로 035의 liveness 계약 자체는 무변경).

**Alternatives considered**:
- `WelcomeScreen`이 직접 다운로드 진행률을 구독해 자체적으로 대기 화면으로
  전환 — 기각. 035의 헌법 경계(`checkWelcomeFile`)가 `WelcomeScreen`을
  `essential-assets-port`나 진행률 개념과 결합시키지 않도록 설계되어 있고,
  결합하면 035 재검증 범위가 040까지 번진다.
- 다운로드 완료를 `onboarding.json`에 영구 기록 — 기각. `essentialsReady`는
  이미 실시간 재조회 값이며(021/029 결정), 영구 기록하면 모델 파일이
  지워졌을 때 게이트가 갱신되지 않는 회귀(028이 겪은 문제)가 재발한다.

## 4. liveness 통과 후 "그날 첫 일기" 자동 생성 트리거

**Decision**: `src/firstrun/auto-diary.ts`에 순수 함수
`shouldAutoGenerate({ livenessOutcome, dayWritable })`(liveness `"ok"` &&
`isDayWritable(now)`이면 true)와, 트리거 실행 함수는 `src/app/wiring.ts`에
둔다 — `createAppPipeline(environment).pipeline.run({ day: today, now,
character: ONBOARDING_DEFAULT_CHARACTER, vision })`을 **한 번** 호출한다.
`schedule/task.ts`의 `runAutoDiaryTask`(020, 시간대 판정·알림 발송 결합)는
재사용하지 않는다 — 040의 트리거는 "설정 막 끝남" 1회성 이벤트이지 반복
스케줄 판정이 아니다.

**Rationale**: FR-008이 "liveness 통과 시에만, 정오 경계를 지키며 자동
시작"을, FR-008a가 "liveness 실패 시 035의 실패 안내로 처리하고 시도 안 함"을
명시했다. `pipeline.run()`은 이미 012(정오 게이트)·009(하루 선택) 로직을
내장하고 있으므로 새로 만들 필요가 없다 — `day`를 오늘로 고정하고 그 안에서
"아직 못 쓴다"는 판정이 나오면(FR-008 단서) 그대로 홈 화면이 기존 정오 게이트
안내를 보여주면 된다(자동 생성이 조용히 스킵될 뿐, 별도 "왜 못 썼는지" UI를
새로 만들지 않는다).

**Alternatives considered**:
- `runAutoDiaryTask`를 호출 — 기각. 그 함수는 `settings.enabled`(사용자가
  설정 탭에서 켠 자동 생성 여부)와 목표 시각 근접 창을 검사한다. 040의
  트리거는 그 설정과 무관하게(사용자가 아직 설정을 만져본 적도 없는 최초
  실행이므로) 항상 시도해야 하므로 의미가 다르다. 재사용하면 "설정이 꺼져
  있으면 첫 일기도 안 생긴다"는 FR-008 위반 갈래가 생긴다.
- 배경 태스크(WorkManager)로 트리거 — 기각. 이 시점은 앱이 포그라운드에
  이미 떠 있는 순간(막 작명을 마친 직후)이므로 019/020이 다루는
  "화면 꺼진 백그라운드" 문제와 무관하고, 포그라운드 직접 호출로 충분하다.

## 5. 실패 감춤 방지(FR-009, SC-004)

**Decision**: 자동 생성 결과(성공/거부 판정/타임아웃)를 별도 저장하지
않는다 — `pipeline.run()`이 이미 하는 대로 성공 시 일기를 저장하고 실패
시(거부 4갈래) 아무것도 저장하지 않는다. 홈 화면은 새로 생긴 개념이 없다:
일기가 있으면 보이고, 없으면 기존 "일기 쓰기" 버튼이 평소처럼 보인다.

**Rationale**: SC-004("막다른 화면이 없다")는 새 UI를 요구하지 않는다 —
기존 경로(수동 "일기 쓰기")가 항상 존재하는 것으로 충분하다. 새 실패
안내 문구나 배너를 추가하면 012·009가 이미 지켜온 "실패가 텍스트를
반환하지 않는다"(원칙 I)와 "새 판정 갈래를 늘리지 않는다"(원칙 IV) 근처에서
불필요한 표면을 늘리게 된다.

**Alternatives considered**:
- 자동 생성 실패를 홈 화면에 배너로 알림 — 기각(과함). spec 어디에도
  "실패를 사용자에게 적극적으로 알린다"는 요구가 없고, "감추지 않는다"는
  "조용히 삼키지 않는다(=평소 재시도 경로가 살아있다)"로 이미 충족된다.

## 6. 로고 화면(FR-001) 노출 조건

**Decision**: `src/firstrun/logo.ts`의 `shouldShowLogo(onboardingNeeded)`가
`onboardingNeeded === true`일 때만 true. 로고는 별도 지속 상태를 갖지 않고
온보딩이 필요한 매 순간(=최초 실행, 또는 앱을 종료했다가 재개해 온보딩
스텝 도중으로 돌아온 경우) 다시 보일 수 있다 — 단, FR-011("이어가기")과
합쳐 로고는 **온보딩 스텝이 하나도 시작되지 않았을 때만** 보이도록
`App.tsx`가 세션 로컬 상태(앱 프로세스가 살아있는 동안만 유지, 영구 저장
안 함)로 "이번 세션에 로고를 이미 보여줬는지"를 추적한다.

**Rationale**: FR-011은 "이미 결정된 권한은 다시 묻지 않고 아직 끝나지 않은
단계부터 이어간다"이지 "로고까지 다시 본다"가 아니다. 그러나 로고 노출
여부를 영구 저장하면(021의 `OnboardingFlag`에 필드 추가) `FLAG_GROWS_HISTORY`
검사가 막는 패턴(불리언이 아닌 세션성 상태를 영구 파일에 쌓는 것)에
가까워진다 — 세션 로컬 `useState`/모듈 변수로 충분하고 앱을 껐다 켜면 다시
로고부터 보여도 스펙과 상충하지 않는다(Edge Case에 명시된 것은 "권한
재질문 방지"이지 "로고 1회성 보장"이 아니다).

**Alternatives considered**:
- `onboarding.json`에 `logoShown` 불리언 추가 — 기각. 검증해야 할 이유가
  약하고(로고는 부작용 없는 화면), 021의 플래그 파일을 건드리면 021 회귀
  테스트 범위가 040까지 번진다.

## 7. 새 헌법 검사(`checkFirstRunFile`)

**Decision**: `scripts/constitution-rules.ts`에 021의 `checkOnboardingFile`,
035의 `checkWelcomeFile`과 같은 패턴으로 `checkFirstRunFile`을 추가한다 —
`src/firstrun/**`이 `models/roster`·`diary/prompt`·`diary/acceptance`를 직접
import하는 것과, `backend.generate()`류 직접 호출을 차단한다. `diary/pipeline`
호출은 **허용**한다(`app/wiring.ts`를 통한 배선이 아니라 firstrun의 순수
판정 자체가 파이프라인을 부르지 않고, 오직 판정 결과 문자열만 반환하기
때문 — 실제 `pipeline.run()` 호출은 `app/wiring.ts`에 둔다는 위 결정 3/4과
일치).

**Rationale**: 021·035 각각 "판정은 순수 모듈에, 제품 계층 접근은 app/ui
계층에"라는 경계를 헌법 검사로 강제해왔다. `src/firstrun/`도 같은 종류의
조율 로직이므로 같은 방어가 필요하다 — 없으면 "화면 조립을 돕는 유틸"이라는
명분으로 점점 파이프라인을 직접 부르는 코드가 스며들 위험이 있다(021/035
문서가 반복 경고하는 패턴).

**Alternatives considered**:
- 별도 검사 없이 코드 리뷰로만 방지 — 기각. 이 저장소의 기존 관례(계약
  테스트가 소스를 직접 읽어 위반을 잡는다)와 다르고, 위반 주입 검증도
  못 한다.
