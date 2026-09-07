# Contract: 정상 동작 확인 (liveness check)

FR-003, FR-003a, FR-003b, FR-004, FR-004a, FR-006, FR-010, FR-028의 계약이다.
헌법 원칙 IV(측정 장치 배제)와 원칙 I(실패가 텍스트를 반환하지 않는다)의
방어선이 이 파일에 모인다.

## 계약 시그니처

```ts
// src/welcome/liveness.ts (신규) — 순수 모듈, 기기에 안 닿는다
export const LIVENESS_INPUT: string;           // 사람이 쓴 고정 상수
export const LIVENESS_TIMEOUT_MS = 60_000;
export type LivenessOutcome = "ok" | "failed";
export function judgeLiveness(input: {
  loaded: boolean;
  text: string;
  ending: Ending;
}): LivenessOutcome;
```

기기에 닿는 실행은 조립부(`wiring.ts` 또는 `on-device.ts`)가 맡는다:

```ts
// 실행 순서 — 이 계약이 정하는 것이 아니라, 아래 L8이 순서를 못 박는다
load(character) → run(LIVENESS_INPUT, { timeoutMs: LIVENESS_TIMEOUT_MS }) → judgeLiveness(...)
```

## 불변식

**L1. `LivenessOutcome`은 갈래 둘뿐이다.** `"ok"`와 `"failed"`. 셋째를 만들지
않는다 — 갈래를 늘리면 "얼마나 잘 됐나"를 담는 자리가 생기고 그것이 채점이다
(원칙 IV). 005 `acceptance.ts`가 4갈래를 세어 지킨 것과 같은 방어이며, 계약
테스트가 **갈래 수를 직접 센다.**

**L2. `LivenessOutcome`은 값을 갖지 않는다.** `{ kind: "failed", reason }`도,
`{ kind: "ok", elapsedMs }`도 아니다. 문자열 리터럴 유니온이므로 **담을 자리가
구조적으로 없다** — `Ending`이 값을 갖지 않는 것(005 engine.md), `RunResult`가
둘뿐인 것과 같은 판단.

**L3. `judgeLiveness()`는 응답의 내용을 보지 않는다** (FR-003, 원칙 IV).
보는 것은 셋뿐:
- `loaded === false` → `"failed"`
- `ending.kind === "timeout"` → `"failed"`
- `text.trim() === ""` → `"failed"` (응답이 오지 않았다)
- 그 외 → `"ok"`

**길이·언어·품질·유사도·점수를 재지 않는다.** `text.length > N` 같은 임계값을
두는 순간 그것이 채점이고, 원칙 IV가 되돌리기의 이유였던 바로 그것이다.

**L4. `judgeLiveness()`는 순수 함수다.** 시각·난수·파일을 읽지 않고 `Date`를
부르지 않는다. 상한 시간은 **인자로 받은 `ending`에 이미 반영돼 있다** — 이
함수가 시간을 재지 않는다.

**L5. `judge()`(일기 판정)를 재사용하지 않는다** (005 FR-018b).
`src/welcome/`가 `diary/acceptance`를 import하지 않으며 헌법 검사가 막는다.
이유: "안녕?"의 응답은 `echo`나 `language`로 거부될 수 있는데 **그것은 모델이
죽었다는 뜻이 아니다.** 일기 판정 4갈래를 이 경로에 끌어들이면 갈래의 의미가
흐려지고, 갈래 수를 세는 005의 방어도 흔들린다.

**L6. `LIVENESS_INPUT`은 일기 프롬프트의 어떤 요소도 담지 않는다** (FR-003a).
없어야 하는 것: 화자 규칙("너는 주인의 휴대폰이다" 등), 하루의 신호("사진",
"다닌 자리"), 캐릭터 이름·호칭 줄("~라 불린다"), 출력 언어 지시("~로 써라"),
제목 지시문. 계약 테스트가 **소스를 `readFileSync`로 읽어** 이 토큰들이
`liveness.ts`에 없는지 확인한다.

**L7. `LIVENESS_INPUT`과 일기 프롬프트는 서로를 모른다** (FR-003b).
- `src/welcome/`가 `diary/prompt`를 import하지 않는다 (헌법 검사)
- `src/diary/prompt.ts`가 `welcome/liveness`를 import하지 않는다 (역방향 헌법 검사)

"프롬프트는 `prompt.ts`에만 있다"는 규칙이 지키려는 것은 **일기 프롬프트의 단일
통과 지점**이다. 확인용 입력은 일기 프롬프트가 아니라 "엔진이 응답하는가"를 묻는
진단 입력이므로 그 파일에 섞지 않는다 — 섞으면 `prompt.ts`가 일기와 무관한
문자열을 갖게 되고, 018의 `fixedHead()` 배열이 그것과 뒤섞일 위험이 생긴다.

**L8. 실행 순서는 `load()` → `run()`이며 `prewarm()`을 쓰지 않는다** (research §3).
`prewarm()`은 반환값이 없어(018 E6) 성공/실패를 알 수 없으므로 FR-006(실패 시
환영 화면 미표시)을 구현할 수 없다.

**L8a. 확인 경로를 위해 `prewarm()`의 반환값을 바꾸지 않는다.** `Promise<void>`를
그대로 유지한다 — 018 E6("반환값이 없다 — 알 수 있게 하면 얼마나 걸렸나를 담고
싶어진다")가 막는 것은 **반환값**이다.

> ⚠️ **`prewarm()`의 인자는 바뀐다** — character-name.md N18이 접두사를 인자로
> 받도록 요구한다(`prewarm(character, prefix)`). 018 E6는 인자를 막지 않으며,
> 인자화는 오히려 `llama-port.ts`가 `prompt.ts`를 모르게 만들어 경계를 깨끗하게
> 한다. **L8a가 금지하는 것은 `Promise<boolean>`·`Promise<LivenessOutcome>`처럼
> 결과를 돌려주게 만드는 변경뿐이다.**

**L9. `RunResult`의 경계를 넓히지 않는다** (FR-028, 원칙 IV).
`{ text, ending }` 둘뿐이며 확인 경로를 위해 필드를 더하지 않는다. 소요 시간을
알 방법이 없는 것이 방어 그 자체다.

**L10. 확인이 끝나면 `text`를 버린다** (FR-004a).
`judgeLiveness()`의 반환값만 상위로 올라간다. `text`를 변수에 담아 화면 state·
파일·`console.log`로 보내는 경로가 없어야 한다. 계약 테스트가 소스를 읽어
`liveness` 실행 경로에 `console.log`·`setState(text)`류가 없는지 확인한다.

**L11. 실패는 텍스트를 만들지 않는다** (FR-006, 원칙 I).
확인이 실패해도 플레이스홀더 일기·가짜 응답·`DiaryEntry`를 만들지 않는다.
`src/welcome/`가 `diary/store`를 import하지 않으며 헌법 검사가 막는다
(011 `checkVisionFile`이 같은 이유로 같은 것을 막았다).

**L12. 확인은 정확히 한 번 돈다** (FR-003).
성공하면 다시 돌지 않고, 실패 후 사용자가 "다시 시도"를 눌러야 다시 돈다.
자동 재시도 루프를 만들지 않는다 — 루프를 두면 "몇 번 만에 성공했나"가 생기고
그것이 지표다(원칙 IV).

**L13. 확인의 대상은 기본 캐릭터 하나뿐이다** (FR-002a).
`ONBOARDING_DEFAULT_CHARACTER`(029). 여러 캐릭터를 순회하며 확인하지 않는다 —
순회하면 캐릭터끼리 비교하는 자리가 생긴다(원칙 IV, "여러 모델을 비교하지
않는다").

**L14. 상한 시간은 `engine.run()` 구간만 잰다** (FR-010, 023 관례).
`engine.load()`(모델 적재)는 이 한도에 포함하지 않는다 —
`on-device.ts`의 `runWithTimeout()`이 `GENERATION_TIMEOUT_MS`를 다루는 방식과
같다. 상한 값을 화면에 표시하지 않는다.

## 화면이 받는 것

```ts
type WelcomePhase = "checking" | "welcome" | "failed";
```

**L15. 화면은 `LivenessOutcome`도 `RunResult`도 받지 않는다.** 조립부가 갈래
하나로 접어 넘긴다. 화면이 `text`에 닿을 경로가 없어야 한다(005 FR-028b의
"토큰 콜백을 아예 넘기지 않는다"와 같은 판단 — 조심해서 안 쓰는 것보다 못 쓰게
하는 쪽이 낫다).

**L16. 대기·환영·실패 문구는 사람이 쓴 고정 상수다** (FR-004·FR-005).
추론이 생성한 텍스트를 섞지 않는다. 캐릭터별로 다르지 않다.

## 테스트로 확인해야 하는 것

`__tests__/welcome/liveness.test.ts`:
- **L1: `LivenessOutcome`의 갈래가 정확히 2개** — 소스를 읽어 유니온 멤버 수를 센다
- L3: 네 갈래 판정
  - `{ loaded: false, text: "안녕하세요", ending: eos }` → `"failed"`
  - `{ loaded: true, text: "", ending: eos }` → `"failed"`
  - `{ loaded: true, text: "   ", ending: eos }` → `"failed"`
  - `{ loaded: true, text: "안녕", ending: timeout }` → `"failed"`
  - `{ loaded: true, text: "안녕", ending: eos }` → `"ok"`
- L3: **길이가 판정을 바꾸지 않는다** — `text: "가"`(1자)와 `"가".repeat(500)`이
  둘 다 `"ok"` (임계값이 없다는 것의 증명)
- L3: `ending`이 `length`·`context`·`interrupted`여도 `text`가 있으면 `"ok"`
  (일기 판정과 다르다 — 잘린 응답도 "살아 있다"의 증거다)
- L4: 같은 입력에 같은 출력 (순수성)
- **L6: 소스를 `readFileSync`로 읽어** `LIVENESS_INPUT`에 금지 토큰이 없는지:
  `"휴대폰"`, `"기록"`, `"사진"`, `"다닌 자리"`, `"불린다"`, `"써라"`, `"제목"`
- L14: `LIVENESS_TIMEOUT_MS`가 `GENERATION_TIMEOUT_MS`보다 작은지

`__tests__/welcome/welcome-boundary.test.ts` (헌법 검사·경계):
- L5/L7/L11: `checkWelcomeFile`이 `diary/prompt`·`diary/acceptance`·`diary/store`·
  `models/roster` import를 잡는지 (위반 주입)
- L7 역방향: `src/diary/prompt.ts` 소스에 `welcome/` 문자열이 없는지
- L8: `src/welcome/` 소스에 `prewarm` 문자열이 없는지
- L9: `engine-port.ts`의 `RunResult`가 여전히 필드 둘인지 (소스 읽기)
- 원칙 IV: `src/welcome/` 소스에 `Date`·`timings`·`tokens`·`elapsed` 토큰이
  없는지

`__tests__/welcome/decision.test.ts`는 [welcome-gate.md](./welcome-gate.md) 참조.

## 위반 주입 (방어 검증)

| 주입 | 잡아야 하는 것 |
|---|---|
| `LivenessOutcome`에 `"slow"` 갈래 추가 | L1 갈래 개수 테스트 FAIL |
| `judgeLiveness`에 `text.length < 5 → failed` 추가 | L3 "1자도 ok" 테스트 FAIL |
| `LIVENESS_INPUT`에 `"너는 주인의 휴대폰이다"` 추가 | L6 소스 토큰 검사 FAIL |
| `src/welcome/liveness.ts`에 `import { judge }` 추가 | `checkWelcomeFile` 위반 |
| `LivenessOutcome`을 `{ kind, elapsedMs }`로 변경 | L2 + 원칙 IV 토큰 검사 FAIL |
| `prompt.ts`에 `import { LIVENESS_INPUT }` 추가 | L7 역방향 검사 FAIL |
