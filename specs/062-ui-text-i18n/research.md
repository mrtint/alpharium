# Research: 062 화면 문구의 다국어 구조

모든 결정은 2026-10-06 저장소 실측(grep·소스 읽기)과 context7 `/expo/expo` 문서 조회에 근거한다. 실측이 아닌 것은 「짐작」으로 적는다(원칙 V).

## R1. 감지 모듈 — `expo-localization`

- **Decision**: `expo-localization`의 `getLocales()`로 기기 선호 언어 목록을 읽는다. 버전은 `npx expo install expo-localization`이 정한다(손으로 적지 않는다, AGENTS 「Expo 작업 시」).
  config plugin(`supportedLocales`·`supportsRTL`)은 **넣지 않는다**(Clarification Q2 — 앱별 언어 목록을 선언하지 않는다).
- **Rationale**: `Locale` 타입이 `languageTag: string`과 `languageCode: string | null`을 준다(context7, `Localization.types.ts`). 선호 순서 목록을 주므로
  FR-007의 「선호 순서대로 첫 일치」를 그대로 구현할 수 있다. 브레인스토밍에서 저장소 소유자가 골랐다.
- **비교 대상만 쓴다**: `languageTag`(예: `ko-KR`)를 감지값으로 기록하고, 비교는 태그의 첫 마디(하이픈·밑줄 앞)를 소문자로 한다. `languageCode`가
  `null`일 수 있으므로 비교 기준으로 삼지 않는다 — 태그 하나에서 둘 다 얻는다.
- **Alternatives**: Hermes `Intl.DateTimeFormat().resolvedOptions().locale`(네이티브 의존성 0, `device-clock.ts` 선례) — 선호 목록이 아닌 기본 로케일 하나이고,
  기기 언어 변경·앱별 언어 반영이 미실측이라 고르지 않았다(브레인스토밍).
- **실기기 확인 대상(FR-023)**: 새 네이티브 모듈이라 `npx expo prebuild --platform android --clean` 뒤 `dumpsys package`의 권한 목록 변화(짐작: 권한 추가 없음)와
  dev 빌드에서 진단 언어 줄의 실제 값을 본다.

## R2. 감지 통로가 jest·헤드리스에서 실패할 때

- **Decision**: `src/i18n/locale-port.ts`가 모듈 최상단 import가 아니라 **호출 시 `require("expo-localization")`를 try/catch로 감싼다**. 예외·빈 배열·빈 태그는
  모두 `null`(감지 못함)이다.
- **Rationale**: jest `logic` 프로젝트는 `node` 환경이라 네이티브 모듈 import가 실패할 수 있다(024 `expo-task-manager`의 `SyntaxError` 선례). 실패를
  「감지 못함 → 기본 언어」로 받으면 원칙 V(지어내지 않음)와 테스트 환경이 같은 갈래를 탄다. 헤드리스 태스크는 같은 JS 런타임에서 같은 함수를 부른다(FR-010).
- **Alternatives**: 최상단 import + jest 목 — 모든 logic 테스트에 목이 필요해지고, 목이 없는 테스트가 조용히 다른 갈래를 탈 수 있다.

## R3. 언어를 정하는 시점과 상태 — 프로세스 단위 모듈 상태

- **Decision**: `src/i18n/current.ts`가 첫 호출에서 감지·해석을 한 번 하고 결과(`LanguageResolution` + 고른 `Catalog`)를 모듈 변수에 둔다. 화면·헤드리스 모두
  `text()`(고른 카탈로그)와 `languageResolution()`(진단용)을 부른다. React 컨텍스트·구독을 두지 않는다(Clarification Q1).
- **Rationale**: 프로세스 동안 바뀌지 않으므로 리렌더 구독이 필요 없다. 헤드리스 태스크는 React 트리가 없다 — 모듈 함수가 유일하게 같은 통로를 준다.
- **055 교훈 적용**: 렌더마다 새 객체를 만들면 effect가 다시 돈다(`currentEnvironment()` 사고). `text()`는 **같은 객체를 돌려준다**(첫 결정 뒤 캐시) — 소스 계약 테스트로 잠근다.
- **모듈 최상단 평가 금지**: 화면 모듈이 `const T = text().home`을 **모듈 최상단에서** 평가하면 테스트가 가짜 레지스트리를 주입하기 전에 굳는다. 화면은 렌더 안에서
  `text()`를 부른다. (제품에서는 결과가 같지만, 테스트 시연 FR-022가 성립하려면 필요하다.)
- **Alternatives**: React Context + Provider — 헤드리스에서 못 쓰고 두 통로가 생긴다. 전경 복귀마다 재해석 — Clarification Q1에서 기각.

## R4. 카탈로그의 모양과 키 누락 방어

- **Decision**: 한국어 카탈로그(`src/i18n/catalogs/ko/`)를 영역별 파일로 나누고 `ko/index.ts`가 하나의 객체로 묶는다. `export type Catalog = typeof ko`이며,
  `ko`는 `as const`를 쓰지 않는다(문자열 리터럴 타입으로 좁아지면 다른 언어가 그 타입을 만족할 수 없다). 다른 카탈로그는 `export const xx = {...} satisfies Catalog`.
- **함수도 값이다**: 날짜(`monthText(year, month)`)·요일 표·시각(`hourText`)·이름 결합(`authorWrote(name)`처럼 조사를 품은 문장 함수)·수 표기(`photoCount(n)`)를 카탈로그
  함수로 둔다. 한국어 카탈로그 함수가 `particleFor` 등을 부른다. **화면 쪽은 조사 함수를 직접 부르지 않는다**(FR-005, 헌법 검사).
- **길이가 있는 표**: 요일 표는 `readonly [string × 7]` 튜플 타입으로, 혼잣말 후보는 기존 `AtLeast10` 타입으로 둔다 — 다른 언어가 개수를 줄이면 tsc가 잡는다.
- **Rationale**: tsc가 「키 누락·함수 시그니처 불일치·개수 부족」을 빌드 전에 잡는다(FR-003). 런타임 키 조회(`t("home.title")`)가 없으니 오타가 런타임 빈 문구가 될 수 없다.
- **Alternatives**: i18next 문자열 키 + 보간 — 브레인스토밍에서 기각.

## R5. 대상 분류 — 무엇을 옮기고 무엇을 남기는가 (실측)

주석을 걷은 한국어 리터럴 493개 / 37개 파일(`src/`) + `App.tsx` 1개를 셋으로 가른다.

| 갈래 | 파일 | 처리 |
| --- | --- | --- |
| **화면 문구** (사용자·OS 화면에 보임) | `ui/home-text.ts`·`settings-text.ts`·`developer-text.ts`, `app/diagnostics-text.ts`, 화면 파일 상수(`WelcomeScreen`·`DownloadProgressScreen`·`OnboardingScreen`·`DownloadConsentDialog`·`LogoScreen`·`DiagnosticsParts`·`DiaryListScreen`·`DiaryHomeScreen`), `diary/monologue.ts`, `onboarding/requirements.ts`(`ifDenied`·제목 등), `schedule/notification-text.ts`, `schedule/notification-port.ts`(채널 이름 「일기 완성 알림」 — OS 설정에 보인다), `app/target-hour.ts`, `app/skipped-line.ts`, `app/diagnostics-view.ts`(「n장」·「n곳」·실패 시각), `app/failure-toast.ts`, `diary/persona.ts`의 `tagline`(아래 R6) | **카탈로그로 옮긴다** |
| **모델 입력** | `diary/prompt.ts`, `signals/collect.ts`의 `unknown` 까닭, `diagnostics/prompt-preview.ts`의 프리셋 신호 까닭(실제 `buildPrompt()`에 들어간다, 022 PP1), `signals/fake.ts`, `welcome/liveness.ts`의 `LIVENESS_INPUT`(「안녕?」 — 모델에게 보내는 말), `diary/persona.ts`의 `name`, `diary/particle.ts` | **제자리** (FR-015·FR-017) |
| **내부 값** (화면에 안 보이는 평서체 이유·로그) | `diary/pipeline.ts`의 `stop(kind, detail)` detail, `inference/on-device.ts`·`desktop-server.ts`·`select.ts`의 reason, `models/readiness.ts`·`vision/readiness.ts`·`models/acquisition.ts`·`vision/acquisition.ts`의 reason, `app/wiring.ts`의 detail | **제자리** — 단 「화면에 안 보인다」를 소스 근거로 확인한다(R7) |

- **`collect.ts` 까닭의 화면 경로**: `src/app`·`src/ui`·`App.tsx`에서 `SignalValue`의 `.reason`을 그리는 자리는 없다(grep `\.reason` — `diagnostics-view.ts`는 `item.reason`을
  `REASON_TEXT[...]`로 옮기는 쓰기 실패 기록이고 신호 까닭이 아니다; 신호 칸은 `kind`만 본다). 그래서 설계의 「갈라야 할 공유 문자열」은 **지금은 없다** — 경로가
  생기면 FR-017대로 화면용 키를 따로 둔다. 이 사실을 소스 계약으로 잠근다(화면 계층이 신호 `.reason`을 읽지 않는다).
- **`app/failure-text.ts`는 죽은 코드다**: `describeFailure`·`describeGenerationReason`·`describeStage`를 import하는 곳이 `src/`·`App.tsx`·`__tests__/` 어디에도 없다
  (`failure-toast.ts`는 주석에서 이름만 부른다). 옮기지 않고 **지운다**(054가 토스트 문구를 한 줄로 합친 뒤 남은 것). 지운 뒤 `tsc` 0으로 확인한다.

## R6. 페르소나 소개(`tagline`)

- **실측**: `tagline`을 읽는 곳이 `src/ui`·`src/app`·`App.tsx`에 없다(059가 캐릭터 목록·선택기를 지웠다). 프롬프트도 읽지 않는다(014 P4).
- **Decision**: 이번 작업에서 **옮기지도 지우지도 않는다** — 화면에 안 보이는 값이라 FR-012 대상이 아니고, 지우는 것은 014 계약(P3 실측 근거)을 건드리는 별개
  결정이다. 소스 검사(FR-013) 허용 목록에 「화면이 읽지 않는 페르소나 소개 — 화면이 읽게 되면 카탈로그로 옮긴다」로 올린다.

## R7. 「화면에 보이는 한글은 카탈로그에만」 검사 — 구현 방식

- **Decision**: `scripts/constitution-rules.ts`(헌법 검사)에 규칙 하나를 더한다: `src/`·`App.tsx`의 `.ts`/`.tsx`에서 주석을 걷고 한글이 든 문자열·JSX 텍스트를 찾아,
  `src/i18n/catalogs/` 밖이면서 **허용 목록**(R5의 「모델 입력」·「내부 값」 파일, 각 항목에 이유 한 줄)에 없으면 위반이다.
- **허용 목록은 파일 단위다**(줄 단위가 아니다) — 내부 값 파일에 화면 문구가 새로 생기는 것은 이 검사로 못 잡는다. 그래서 「내부 값」 파일은 따로 **화면 계층이
  그 값을 읽지 않는다**를 계약 테스트로 잠근다(R5: 신호 `.reason`, 준비 상태 reason, pipeline detail).
- **CC3와 같은 방어**: 허용 목록의 경로가 모두 실제로 있는지 테스트한다(060 `DIAGNOSTICS_HIDES_AXES` 교훈 — 사라진 경로를 가리키면 조용히 무력해진다).
- **위반 주입**: 화면 파일에 한글 리터럴 하나를 넣어 검사가 잡는지, 치환이 실제로 적용됐는지 먼저 단언한다(AGENTS 「위반 주입」).

## R8. 문구 텍스트로 분기하는 코드

- **실측**: `DiaryHomeScreen.tsx`의 `/준비/.test(screen.message)`가 실패 안내 화면에서 「모듈 다시 받기」 버튼을 보일지 **문구로** 정한다. 다른 언어에서는 언제나 거짓이
  되는 조용한 결함이다(053 「문구 비교 금지」와 같은 계열).
- **Decision**: 정규식 문구 검사를 없애고, 버튼을 보일지는 **문구가 아닌 값**으로 정한다. 지금 `failed`를 만드는 호출부는 둘 다 「작성자 준비 필요」 한 갈래라,
  두 호출부가 넘기는 문구를 카탈로그의 같은 항목(`text().home.needsAuthor`)으로 만들고 버튼 조건은 `screen.message === text().home.needsAuthor`로 바꾸는 것이
  `AppScreen` 모양을 넓히지 않는 가장 작은 변경이다(054 교훈: `toWriting()`·`toFailed()` 모양을 잠그는 기존 계약 S1·I7·C3를 깨지 않는다). 구현 전에 `state.ts`의
  `failed`를 잠그는 기존 테스트를 읽고, 그 계약이 표식 필드를 허용하면 `redownload` 표식이 더 낫다 — 둘 중 기존 계약을 깨지 않는 쪽을 고른다.
- **다른 문구 분기를 소스에서 센다**: 한글이 든 피연산자의 `.test(`·`includes(`·`===`·`startsWith(`. 찾으면 같은 방식으로 값 비교로 바꾼다.

## R9. 한국어 출력이 바뀌지 않음을 보이는 방법 (FR-020)

- **Decision**: 두 겹이다.
  1. **리터럴 보존**: 이관 **전** 커밋에서 대상 파일(R5 「화면 문구」)의 한글 문자열 리터럴·JSX 텍스트를 주석 걷고 모아 정렬한 목록을 골든
     (`__tests__/i18n/ko-literals.golden.json`)으로 저장한다. 이관 **후** 같은 추출을 `src/i18n/catalogs/ko/`에 돌려 **다중집합이 같음**을 단언한다. 템플릿 리터럴은
     `${…}` 안을 자리표로 바꿔 비교한다(변수 이름이 바뀌어도 문구가 같으면 같다). 지운 `failure-text.ts`는 골든 대상 목록에 애초에 넣지 않고(죽은 코드) 테스트 머리 주석에 명시하며, 새 진단 언어 줄(FR-011b)만 다중집합의 허용 차이다.
  2. **함수 출력 보존**: 이관 전 함수(요일·월·일·시각·건너뜀 줄·완성 알림·혼잣말 선택·권한 꼬리표·홈 상태 줄 등)를 대표 입력으로 불러 결과를
     `__tests__/i18n/ko-outputs.golden.json`에 저장하고, 이관 후 카탈로그 함수에 같은 입력을 넣어 바이트 동일을 단언한다(입력 → 새 함수 대응표는 테스트 안에).
- **기존 보드 원문 대조 테스트**는 기대 문자열을 그대로 두고 import 경로만 바꾼다(FR-021). 원문 기대값 변경이 0건임을 `git diff`의 해당 줄로 확인한다(SC-003).
- **Alternatives**: 화면 스냅샷 전체 비교 — 렌더 트리가 바뀌지 않아도 키·스타일 노이즈가 커서 기각.

## R10. 「언어 하나 추가」 시연 (FR-022, SC-005)

- **Decision**: `__tests__/i18n/fixtures/xx.ts`(테스트 전용 가짜 카탈로그 — 한국어 카탈로그를 펼쳐 일부 문구만 `[xx]` 접두로 바꾼 것)와 `jest.mock`으로 지원 목록·
  감지 통로를 바꿔 (1) 해석이 `xx`를 고르고 (2) 홈 화면 한 곳이 가짜 문구로 그려지고 (3) 같은 신호로 만든 프롬프트가 한국어 화면일 때와 바이트 동일함을 보인다
  (US4-2). 가짜 카탈로그에서 키 하나를 빼는 것은 `// @ts-expect-error`를 둔 타입 테스트 파일로 잠근다(tsc가 `npm run lint`에서 돈다).
- 제품 `SUPPORTED_LANGUAGES`에 `xx`가 없음을 소스 계약으로 잠근다.

## R11. 날짜·시각 표기를 `Intl`로 바꾸지 않는다

- **Decision**: 한국어 카탈로그의 날짜·시각 함수는 지금의 문자열 조립을 그대로 옮긴다. `Intl.DateTimeFormat`으로 바꾸지 않는다.
- **Rationale**: Hermes `Intl`의 한국어 출력(예: 「2026년 10월」 vs 「2026. 10.」)이 지금 문구와 바이트 동일하다는 실측이 없다 — 바꾸면 「변화 0」을 실기기에서 다시 재야 한다.
  다른 언어 카탈로그는 자기 함수 안에서 `Intl`을 써도 된다(카탈로그 함수의 자유).

## R12. 헌법 검사 갱신

- 기존 규칙이 가리키는 경로가 이관으로 사라지거나 옮겨질 수 있다(예: `DIAGNOSTICS_HIDES_AXES`가 `diagnostics-view.ts`·`DiagnosticsParts.tsx`·`DiagnosticsScreen.tsx`를 본다,
  `UI_TOUCHES_PROMPT`, `USER_VISIBLE_SIGNAL_AXES`). 진단 문구가 카탈로그로 가면 카탈로그 파일도 그 상수를 참조하면 안 된다 — 새 경로를 규칙에 더한다. CC3(경로 존재)가 누락을 잡는다.
- 새 규칙: `src/i18n/`이 `diary/prompt`·`signals`·`inference`·`models`를 import하지 않는다(카탈로그는 말만 안다, 판정하지 않는다). `diary/particle`만 예외(한국어 카탈로그).

## R13. 저장된 데이터에 화면 문구가 있는가

- **확인 범위**: `files/diary/*.json`(`DiaryEntry`), `files/preferences/*.json`(`onboarding.json`·`auto-diary.json`·`notified.json`·`auto-write-skipped.json`·
  `developer-menu.json`·`write-failures.json`·이름 파일 등)의 필드 정의.
- **알려진 것(소스 읽기)**: `write-failures.json`은 이유 **갈래**와 시각만 저장한다(060 — 문구가 아니다). `auto-write-skipped.json`은 날짜 하나(057). `notified.json`은
  날짜 맵(020). `DiaryEntry`는 모델이 쓴 본문·제목과 `authorName`(사용자가 지은 이름 또는 그때의 기본 이름, 035)·신호를 담는다 — 신호 안의 `unknown` 까닭은
  모델 입력 문자열이고 화면이 그리지 않는다(B3).
- **Decision**: 저장된 화면 문구는 없다고 보고, 이것을 tasks에서 저장 타입의 필드 목록을 읽는 소스 계약으로 잠근다(새 문구 필드가 생기면 실패). 찾으면 기록하고
  저장값을 갈래로 바꾸는 것은 이 기능 밖의 결정으로 저장소 소유자에게 묻는다.
