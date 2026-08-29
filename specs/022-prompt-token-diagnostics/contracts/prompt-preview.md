# Contract: 프롬프트 미리보기 (진단 계층 ↔ 화면)

계약 테스트는 이 저장소 관례대로 **소스 선언을 `readFileSync`로 직접 읽어** 검사한다(jest가
타입을 지우므로 구조 위반은 `tsc` + 소스 검사로 잡는다).

## PP1 — 미리보기 문자열은 `buildPrompt()`의 출력과 바이트 동일

`collectPromptPreviews()`가 만든 `{ ok: true }` 항목의 `text`는, 같은 캐릭터·같은 프리셋의
`signals`로 `buildRequest()` → `buildPrompt()`를 직접 부른 결과와 **문자 단위로 같아야 한다**.

- 검증: 런타임 테스트(`.ts`). `SIGNAL_PRESETS`를 import해 각 (character, preset)에 대해
  `buildPrompt(buildRequest(...).request)`를 직접 계산하고 `collectPromptPreviews()` 결과와
  `toBe`(엄격 동일) 비교.
- 위반 주입: `prompt-preview.ts`가 자체 문자열 조립을 하거나 `promptPrefix()`만 반환하도록
  고치면 이 테스트가 깨진다.

## PP2 — `buildPrompt`/`buildRequest` 외의 프롬프트 조립 로직이 없다

`src/diagnostics/prompt-preview.ts`는 `SPEAKER_RULES`·`TITLE_INSTRUCTION`·`nameLine`·
`signalLines` 같은 `prompt.ts` 내부 심볼을 import하거나 재정의하지 않는다.

- 검증: 소스 검사. `prompt-preview.ts`의 import 목록에 `diary/prompt`에서 오는 것은
  `buildPrompt`(+선택적으로 `promptPrefix`)뿐, `diary/request`에서 오는 것은 `buildRequest`뿐.
- 위반 주입: `import { SPEAKER_RULES } from "../diary/prompt"` 추가 시 실패.

## PP3 — `SIGNAL_PRESETS`는 사람이 정한 상수

- `prompt-preview.ts` 소스에 `SIGNAL_PRESETS`가 `readonly` 배열 리터럴로 선언되어 있다.
- 항목이 최소 2개이고 `id`에 `"empty"`와 `"photos"`가 있다.
- 각 프리셋의 `signals`가 리터럴로 쓰여 있다 — `fake.ts`·`collect.ts`에서 import해 만들지
  않는다(경계 혼동 방지, research.md R2).
- 배열을 만드는 코드에 `.filter(`·`.map(` 같은 신호 값 기반 변형이 없다(원칙 V — 코드가
  조합을 판정하지 않는다).
- 검증: 소스 검사 + 런타임(`SIGNAL_PRESETS.length >= 2`, id 집합 확인).
- 위반 주입: `SIGNAL_PRESETS`를 `let`으로 바꾸거나 프리셋을 `Object.keys(signals).filter(...)`로
  생성하면 실패.

## PP4 — `DiagnosticReport.promptPreviews`는 모든 캐릭터를 덮는다

- `collectReport()` 결과의 `promptPreviews`는 `CHARACTERS`의 5개 키를 모두 가진다.
- 각 캐릭터 값은 `SIGNAL_PRESETS`의 모든 `id`를 키로 가진다.
- 검증: 런타임 테스트. `collectReport()` 호출 후 키 집합 비교.

## PP5 — 네이티브 추론을 부르지 않는다

- `prompt-preview.ts` 소스에 `initLlama`·`llama.rn`·`completion(`·`.generate(`·`engine`·
  `backend`가 없다.
- 검증: 소스 검사(010의 `SEED_GENERATES` 패턴 재사용 가능).
- 위반 주입: `import { llamaEngine } from "../inference/llama-port"` 추가 시 실패.

## PP6 — `approxChars`는 `text.length`이고 토큰이라 부르지 않는다

- `{ ok: true }` 항목에서 `approxChars === text.length`.
- `prompt-preview.ts`·`types.ts`·`DiagnosticsScreen.tsx` 소스에 식별자/문자열로
  `token`·`tokens_evaluated`·`tokens_predicted`·`tokensEvaluated`가 없다(대소문자 무시).
- 검증: 런타임(`approxChars` 값) + 소스 검사(토큰 어휘 부재).
- 위반 주입: 필드명을 `approxTokens`로 바꾸면 소스 검사가 잡는다.

## PP7 — 화면은 프롬프트 조립·신호 타입에 직접 닿지 않는다

- `src/ui/DiagnosticsScreen.tsx`(및 다른 `src/ui/*`)에 `from ".../diary/prompt"` 및
  `from ".../signals/types"`·`from ".../signals/collect"`·`from ".../signals/fake"` import가
  없다.
- 화면은 `report.promptPreviews[character][presetId]`의 `text`·`approxChars`·`reason`만 읽는다.
- 검증: `scripts/constitution-rules.ts`의 새 규칙(`UI_TOUCHES_PROMPT`/`UI_TOUCHES_SIGNALS`) +
  `constitution-rules.test.ts`의 위반 주입.
- **예외**: `signals/expo-port`는 허용(기존 `PermissionPanel` 배선).

## PP8 — 조립 실패는 값으로 표시되고 빈 문자열이 아니다

- `buildRequest()`가 `{ ok: false, reason: "no-character" }`를 반환하는 입력에 대해
  `buildPreview()`는 `{ ok: false, reason: <비어있지 않은 문자열> }`을 반환한다.
- `{ ok: false }` 갈래에 `text` 필드가 없다(빈 문자열도 없다) — 원칙 I("실패가 텍스트를
  반환하지 않는다")의 이 기능 판.
- 검증: 런타임 테스트. `character`에 `undefined`를 강제로 넘겨 확인.

## PP9 — 판정 갈래·파이프라인·`RunResult`를 건드리지 않는다

- `src/diary/acceptance.ts`, `src/diary/pipeline.ts`, `src/inference/engine-port.ts`,
  `src/inference/llama-port.ts`의 diff가 이 기능 브랜치에서 **없다**.
- 검증: 리뷰/CI diff 확인 + 기존 계약 테스트(`acceptance.test.ts`의 갈래 수 카운트,
  `llama-port`의 `timings` 폐기 테스트)가 무수정 통과.

## PP10 — prod 노출 차단

- 진단 화면 노출은 기존 `showsOnScreen()`/`sinksFor()` 게이트를 그대로 쓴다 — 이 기능이
  새 노출 조건을 추가하지 않는다.
- 검증: 기존 진단 화면 노출 테스트(001 SC-013 계열)가 무수정 통과. `DiagnosticsScreen.tsx`
  diff에 환경 게이트 관련 변경이 없다.
