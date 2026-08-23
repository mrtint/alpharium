# Implementation Plan: 쓰는 중 독백 확장 — 콜드/핫 스타트·데일리 로그·문구 폭

**Branch**: `016-writing-monologue-expansion` | **Date**: 2026-08-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-writing-monologue-expansion/spec.md`

## Summary

**세 자리를 연다 — 모델 로드 지점에서 콜드/핫을 판정하는 자리, `branch`를
추가로 나르는 자리, 문구 풀을 10개 이상으로 채우고 조사를 붙이는 자리.**

1. **`GenerationEngine.load()`가 콜드/핫 스타트를 함께 돌려준다.** 지금
   `LoadResult`는 `{ ok: true } | { ok: false; reason }`뿐이라 로드가 실제로
   무엇을 했는지(재사용/새로 올림) 아무도 모른다 — `llama-port.ts`가 "이미
   같은 캐릭터가 열려 있었는가"를 판정할 수 있는 유일한 자리이므로(E1 불변식이
   이미 그 판정 근거를 갖고 있다), 여기에서 `{ ok: true; warm: boolean }`으로
   좁혀 넓힌다.
2. **`on-device.ts`의 `generate()`가 `engine.load()` 직전·직후에 로드 신호를
   보낸다.** 실측 결과(clarify) 모델 로드는 `readPhotos()` 완료 뒤,
   `engine.run()` 전이다 — 콜드/핫을 미리 알 방법이 없으므로(로드가 끝나야
   `warm` 값이 나온다) **로드 시작 시점에는 아직 콜드/핫을 모른 채 "로드
   중"이라는 사실만 보내고, 로드가 끝난 뒤 콜드/핫이 확정되면 그에 맞는
   `branch`를 실은 두 번째 신호를 보낸다** — 013의 "리사이즈 여부를 실행
   후에만 안다"와 같은 성격의 순서 문제이며, 화면은 첫 신호로 "로드 중"
   문구(콜드·핫 구분 없는 중립 표현)를 잠깐 보이다가 두 번째 신호로 콜드/핫
   확정 문구로 갱신된다 — 다만 로드가 매우 빠르면(핫 스타트 대부분) 첫 신호와
   두 번째 신호가 사실상 동시에 도착해 사용자에게는 한 번의 갱신처럼 보인다
   (015 User Story 2의 "스쳐 지나감" 예외와 같은 종류).
3. **화면(`monologue.ts`)이 `stage`뿐 아니라 `branch`도 받아 문구를 고른다.**
   `pickMonologue(stage, branch, previous)`로 시그니처를 넓힌다(clarify
   결정) — 콜드/핫·많음/보통은 `stage`의 새 값이 아니라 `branch` 인자로
   전달된다. 문구 풀은 단계별 10개 이상(FR-009)으로 늘고, 모델 로드 단계
   문구는 캐릭터 이름 + 조사(이/가)를 템플릿에 끼워 넣는다(FR-003a).
4. **사진 보기 갈래(많음/보통) 판정은 `selectForVision()`이 고른 장수로
   정해진다.** `on-device.ts`의 `readPhotos()`가 이미 `selectForVision(photos)`
   를 호출해 그 길이를 안다(`VISION_PHOTO_LIMIT=5`) — 그 값이 5에 닿았는지를
   `"vision"` 신호와 함께 `branch`로 실어 보낸다. 이 판정은 하루 시작 시점에
   한 번 정해지고 그 하루 안에서 바뀌지 않는다(FR-006).

**설계의 중심**: **로드 신호는 두 단계로 나뉜다 — "로드가 시작됐다"(중립,
콜드/핫 모름)와 "로드가 이렇게 끝났다"(콜드/핫 확정)**. 015가 `ProgressStage`
하나로 충분했던 것과 달리, 016은 판정 자체가 비동기 작업의 완료를 기다려야
나오는 값이라 이 두 겹이 필요하다 — 지어내지 않고(원칙 II) 실제로 안 시점에만
말한다는 원칙이 신호 설계에도 그대로 적용된다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3

**Primary Dependencies**: Expo SDK ~57.0.13, React Native 0.86.2. **새 의존
0개** — 기존 콜백·타입을 넓히는 범위다.

**Storage**: 변경 없음. 콜드/핫 판정도 어디에도 저장되지 않는다(015와 같은
이유 — 남기면 측정 기록이 된다, 원칙 IV).

**Testing**: Jest(기기 불필요), Maestro(실기기 — 루이/narrative로 콜드
스타트를, 이어서 같은 캐릭터로 재생성해 핫 스타트를 관측해야 한다. 015가
이미 "루이가 검증에 유리하다"를 확립했다).
`npm test` / `npm run test:device` / `npm run lint`.

**Target Platform**: Android 13 (SM-G986N 실기기), arm64-v8a

**Performance Goals**: 해당 없음 — 이 기능은 생성 속도에 영향을 주지 않는다.
콜드/핫 판정 자체는 `engine.load()`가 이미 하는 일(같은 캐릭터인지 비교)에
값 하나를 더 얹는 것뿐이며 추가 지연이 없어야 한다.

**Constraints**:
- **`LoadResult`의 확장은 `{ ok: true }` 갈래에만 필드를 더한다.** `{ ok: false
  }` 갈래는 015 이전과 동일하게 유지된다 — 실패에는 콜드/핫이 의미가 없다.
- **`warm` 판정은 어댑터(`llama-port.ts`) 안에서만 이루어진다.** E1 불변식
  ("같은 캐릭터면 재사용해도 된다")이 이미 이 판정의 근거이며, 그 판정
  로직을 옮기지 않고 결과값만 밖으로 내보낸다 — 화면·파이프라인이 스스로
  "이번이 콜드인지"를 추측하지 않는다(002 FR-017과 같은 정신 — 판정을
  아는 유일한 자리가 판정한다).
- **로드 시작 신호와 로드 완료(콜드/핫 확정) 신호는 서로 다른 두 번의
  `onStage()` 호출로 표현된다.** 하나의 호출에 "로드 중"과 "콜드/핫"을 함께
  담지 않는다 — 로드 시작 시점에는 아직 콜드/핫을 모르기 때문이며, 모르는
  것을 안다고 말하지 않는다(원칙 II·V의 신호판).
- **`branch`는 `stage`와 별개 매개변수다**(clarify 결정). `ProgressStage`
  유니온 자체는 신설 로드 단계를 위한 값 하나만 추가되고, 콜드/핫·많음/보통은
  그 타입을 확장하지 않는다 — `pickMonologue(stage, branch, previous)`.
- **`branch`도 문자열 리터럴 유니온이거나 `undefined`다**(원칙 IV). 숫자·
  객체를 담지 않는다 — `"cold" | "hot" | "normal" | "many" | undefined`.
- **문구는 여전히 사람이 미리 쓴 상수다.** 모델 로드 단계 문구만 캐릭터 이름
  자리를 템플릿으로 비워 두고, 조사 선택 함수가 그 자리를 채운다 — 문구
  자체를 모델이 생성하지 않는다는 원칙(원칙 IV)은 그대로다.
- **`monologue.ts`는 여전히 `roster.ts`·`persona.ts`·`Character` 타입을
  import하지 않는다.** 캐릭터 이름은 `string` 매개변수로만 받는다 — 015의
  헌법 검사 정규식(`MONOLOGUE_TOUCHES_ROSTER`)이 `\bCharacter\b`(타입)를
  잡지만 `string` 타입의 이름 매개변수는 애초에 이 패턴에 걸리지 않는다
  (research.md에서 검증).
- **문구 후보는 갈래마다 최소 10개, 서로 다른 서술어로 준비한다**(FR-009,
  015의 "2~3개"에서 확장). 타입 자체가 10개 미만을 허용하지 않아야
  컴파일 타임에 누락을 잡는다(015의 `readonly [string, string, ...string[]]`
  최소-길이 튜플 패턴을 갈래 구조에 맞게 확장).
- **사진 보기 갈래(많음/보통) 판정은 `selectForVision()`이 고른 길이로만
  정해진다.** 캡션이 실제로 성공했는지와는 무관하다 — "많다"는 "보기로 고른
  장수가 많다"는 뜻이지 "캡션이 많이 성공했다"는 뜻이 아니다(그렇지 않으면
  판정이 캡션 성공률이라는 새 축을 재는 것이 되어 원칙 IV에 닿는다).

**Scale/Scope**: 진행 단계 값 하나 추가(`"load"`), 문구 갈래(branch) 값 넷
(`"cold"`/`"hot"`/`"normal"`/`"many"`) 신설. 순수 함수/타입 변경 4곳
(`inference/engine-port.ts`·`inference/types.ts`·`diary/monologue.ts`·새
`diary/particle.ts`), 어댑터 2곳(`inference/llama-port.ts`·
`inference/on-device.ts`), 화면 1곳(`ui/DiaryHomeScreen.tsx`, `app/state.ts`
확장 포함), 헌법 검사 확인 1곳(`scripts/constitution-rules.ts` — 변경이 아니라
현재 규칙이 이미 허용하는지 검증).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능과의 관계 | 판정 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | 관계 없음 — 추론 위치나 응답 내용을 건드리지 않는다 | ✅ 통과 |
| **II. 화자는 휴대폰이고 시야는 좁다** | **감시 대상.** 사진 보기 문구가 캡션 엔진이 실제로 하지 않는 일(인물 식별, 촬영 시각·장소 판별)을 말하면 위반이다 — FR-005·spec Clarifications가 이미 그 경계를 정했다. 로드 시작 시점에 콜드/핫을 모른 채 확정 문구를 보내지 않는 설계(위 Constraints)도 같은 원칙의 적용이다 | ⚠️ 감시 후 통과 |
| **III. 모델은 캐릭터다** | **감시 대상.** 016은 015와 달리 캐릭터 이름을 화면 진행 문구에 **의도적으로** 노출한다(clarify 결정). `monologue.ts`가 이름을 `string`으로만 받고 `Character`/`roster.ts`/`persona.ts`를 import하지 않는 것이 방어선이다 — 화면(호출자)이 `persona.ts`의 `displayName`을 읽어 문자열만 넘긴다 | ⚠️ 감시 후 통과 |
| **IV. 측정 장치를 제품에 들이지 않는다** | **가장 큰 위험.** 콜드/핫 판정 자체가 "무언가를 쟀다"처럼 보일 수 있다 — 그러나 이것은 시간을 재는 것이 아니라 **불리언 하나**(같은 캐릭터가 이미 열려 있었는가)이며, E1 불변식이 이미 알던 사실을 밖으로 낼 뿐 새로 측정하지 않는다. `branch`가 문자열 리터럴 유니온으로 좁혀지는 것이 타입 레벨 방어다 | ⚠️ 감시 후 통과 |
| **V. 관측된 사실과 추측을 구분한다** | 로드 시작 시점에 콜드/핫을 아직 모르는 상태를 "모른다"로 두고(중립 로드-시작 신호), 확정된 뒤에만 갈래를 말한다 — 모르는 것을 안다고 말하지 않는 이 원칙이 신호 설계 자체(2단계 신호)의 근거다 | ✅ 통과 |
| **개발 방식** | 계약을 먼저 정하고(LoadResult 확장, branch 타입, 조사 선택 함수) 테스트를 먼저 쓴다 | ✅ 통과 |

**게이트 통과.** 정당화가 필요한 위반이 없으므로 Complexity Tracking은 비운다.

**★ 설계 조사 중 확인해야 할 위험 셋**:

1. **콜드/핫 판정이 `engine.load()` 완료 후에만 나온다** — 로드가 시작되는
   순간에는 아직 모른다. 화면에 "무엇이 다른지 모르는 로드 중" 상태가 잠깐
   있어야 하는가, 아니면 로드가 끝날 때까지 이전 단계(vision)의 마지막
   문구를 유지해야 하는가는 research에서 015의 "스쳐 지나감" 처리와 맞춰
   결정한다.
2. **`llama-port.ts`가 "같은 캐릭터가 이미 열려 있었는가"를 판정할 상태를
   어디에 두는가.** `engine-port.ts`의 E1 주석이 "같은 캐릭터면 재사용해도
   된다"고 이미 적었지만, 지금 구현이 실제로 재사용을 하는지(진짜 스킵)
   아니면 매번 언로드 후 재로드하면서 시간만 짧게 걸리는지(가짜 핫 스타트)
   확인이 필요하다 — 후자라면 "콜드/핫"이 실제로는 "빠른 콜드/느린 콜드"에
   불과해 FR-002가 요구하는 구분이 거짓이 된다.
3. **사진 보기 갈래(많음/보통) 신호를 언제 보내는가.** `selectForVision()`의
   길이는 `readPhotos()` 진입 즉시 알 수 있지만, 015의 `"vision"` 신호는
   `captionAll()`의 `onPhotoStart`에서만 나간다(이중 발화 방지, 015 C1) —
   `branch` 값을 첫 `onPhotoStart` 호출과 함께 실어 보내되, 이후 호출에도
   같은 `branch`를 반복해서 실어야 하는지(화면이 매 갱신마다 branch를
   기억해야 하는가) 아니면 첫 호출에만 실으면 되는지 계약을 명시해야 한다.

## Project Structure

### Documentation (this feature)

```text
specs/016-writing-monologue-expansion/
├── plan.md                    # 이 파일
├── research.md                # Phase 0 — 콜드/핫 판정이 진짜 재사용인지 실측,
│                               #   로드 시작 신호 처리 방식 결정, branch 반복 여부
├── data-model.md               # Phase 1 — LoadResult 확장, ProgressStage 신설 값,
│                               #   Branch 타입, 조사 선택 함수 시그니처
├── quickstart.md               # Phase 1 — 검증 절차 (루이 콜드 → 같은 캐릭터 핫)
├── contracts/
│   ├── load-signal.md          # Phase 1 — 로드 시작/완료 신호의 계약 (누가 언제,
│   │                            #   두 번 부르는 순서)
│   ├── monologue-branch.md     # Phase 1 — pickMonologue(stage, branch, previous),
│   │                            #   문구 10개 이상 타입 강제, 원칙 III/IV 방어
│   └── particle.md             # Phase 1 — 캐릭터 이름 → 조사(이/가) 선택 계약
├── checklists/
│   └── requirements.md         # /speckit-specify + /speckit-clarify 산출
└── tasks.md                    # /speckit-tasks가 만든다 (이 명령이 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── inference/
│   ├── engine-port.ts           # ★★ 고칠 자리 — LoadResult를
│   │                             #   `{ ok: true; warm: boolean } | { ok: false; reason }`
│   │                             #   로 넓힌다. `warm`이 콜드/핫의 유일한 근거값이다
│   ├── llama-port.ts             # ★★ 고칠 자리 — load()가 "이미 같은 캐릭터가 열려
│   │                             #   있었는가"를 판정해 warm을 채운다. E1 재사용 로직이
│   │                             #   이미 아는 사실을 밖으로 낼 뿐 새로 재지 않는다
│   ├── types.ts                  # ★ 고칠 자리 — ProgressStage에 "load" 추가.
│   │                             #   MonologueBranch 타입(문자열 유니온) 신설
│   └── on-device.ts               # ★★★ 고칠 자리 — engine.load() 앞뒤로 로드 신호
│                                  #   두 번(시작·완료+콜드/핫), readPhotos()가 이미
│                                  #   아는 selectForVision() 길이를 사진 보기 branch로
│                                  #   실어 onStage에 전달
├── diary/
│   ├── monologue.ts               # ★★ 고칠 자리 — pickMonologue(stage, branch,
│   │                              #   previous)로 확장. 갈래별 10개 이상 문구,
│   │                              #   로드 단계는 이름 자리를 비운 템플릿 + 조사 선택
│   │                              #   함수 호출로 완성
│   └── particle.ts                 # ★ 새 파일 — 이름 → 조사(이/가) 순수 함수.
│                                   #   monologue.ts가 import해 쓴다(둘 다 diary/ 안,
│                                   #   원칙 III 경계 밖 — Character를 모른다)
└── ui/
    └── DiaryHomeScreen.tsx        # ★ 고칠 자리 — onProgress가 stage+branch를 받아
                                    #   pickMonologue에 넘긴다. 캐릭터 이름은 이미 읽고
                                    #   있는 persona.ts의 displayName을 그대로 문자열로
                                    #   전달(원칙 III 경계는 화면 쪽에서 지킨다)

app/
└── state.ts                       # ★ 고칠 자리 — "writing" 상태에 branch 필드 추가
                                    #   (stage·line은 015가 이미 둠)

__tests__/
├── inference/
│   ├── engine-port.test.ts        # ★ LoadResult 소스 선언이 warm을 포함하는지
│   ├── llama-port.test.ts         # ★★ 같은 캐릭터 연속 load()에서 두 번째가
│   │                              #   warm:true인지, 다른 캐릭터면 warm:false인지
│   ├── types.test.ts               # ★ ProgressStage·MonologueBranch가 문자열
│   │                              #   유니온뿐인지 소스 선언 검사
│   └── on-device.test.ts           # ★★★ 로드 시작 신호와 완료 신호가 순서대로
│                                   #   오는지, vision branch(많음/보통)가 캡션 상한
│                                   #   도달 여부와 일치하는지
├── diary/
│   ├── monologue.test.ts           # ★★ 모든 (stage, branch) 조합에 문구 10개 이상,
│   │                              #   숫자 없음, 연속 반복 없음, roster/persona/
│   │                              #   Character import 없음(헌법 검사 재확인)
│   └── particle.test.ts             # ★ 로스터 5인 이름 전부에서 올바른 조사
└── app/
    └── state.test.ts               # ★ writing 상태의 branch 필드 전이

.maestro/
└── writing-monologue-expansion.yml  # ★ 새 흐름 또는 015 흐름 확장 — 루이로 콜드
                                     #   스타트 문구, 같은 캐릭터 재생성으로 핫 스타트
                                     #   문구 관측 (FLOWS 등록 필수)
```

**Structure Decision**: 기존 구조를 그대로 쓴다. 015가 세운
`src/diary/monologue.ts`를 확장하고, 조사 선택만 새 파일
`src/diary/particle.ts`로 분리한다 — `monologue.ts`가 이미 문구 조립을
전담하는 자리이므로 조사 로직까지 같은 파일에 욱여넣기보다, 020자 이하의
순수 함수 하나를 독립 파일로 두어 계약 테스트를 분리한다(007이
`readiness.ts`를 `roster.ts`에서 분리한 것과 같은 판단 — 하나의 파일이
여러 책임을 지지 않게 한다). 새 계층·새 폴더는 만들지 않는다.

## Constitution Check — 설계 후 재평가

*Phase 1 산출물(data-model·contracts·quickstart)을 만든 뒤 다시 본다.*

| 원칙 | 설계가 무엇으로 막는가 | 판정 |
| --- | --- | --- |
| **II. 화자는 휴대폰이고 시야는 좁다** | `contracts/monologue-branch.md`가 사진 보기 문구의 정직성 경계(011의 `CAPTION_PROMPT` 실측 범위)를 명시하고, quickstart B4가 코드 검사로 금지 낱말 0건을 확인한다. 로드 시작 시점에 콜드/핫을 "모른다"로 두는 2단계 신호 설계(research.md §2, `contracts/load-signal.md`)가 원칙 V와 함께 이 원칙도 지킨다 — 모르는 것을 안다고 말하지 않는다 | ✅ 통과 |
| **III. 모델은 캐릭터** | `contracts/monologue-branch.md` 불변식 1이 `monologue.ts`·`particle.ts` 둘 다의 import 제한(roster·persona·Character 없음)을 명시하고, research.md §4가 현재 헌법 검사 규칙이 `string` 이름 매개변수를 이미 허용함을 실증했다(규칙 변경 불필요). quickstart의 위반 주입 절차가 실제로 재확인한다 | ✅ 통과 |
| **IV. 측정 장치 금지** | `LoadResult`의 `warm: boolean`은 새로 재는 값이 아니라 `llama-port.ts`가 E1을 위해 이미 하던 판정(`context !== null && openFor === character`)을 반환값에 실을 뿐이다(research.md §1). `MonologueBranch`가 문자열 리터럴 유니온 넷뿐이라 시간·횟수를 담을 자리가 없다. `contracts/monologue-branch.md`가 문구 최소 10개를 컴파일 타임 튜플로 강제해 「부족」이 조용히 통과하지 못하게 한다 | ✅ 통과 |
| **V. 관측된 사실과 추측을 구분한다** | `contracts/load-signal.md`의 2단계 신호(로드 시작 → 콜드/핫 확정)가 이 원칙의 직접 적용이다 — 로드가 끝나기 전에는 콜드/핫을 말하지 않는다 | ✅ 통과 |

**게이트 재통과.** 설계가 원칙을 약화시키지 않았다 — `warm` 값이 기존
E1 재사용 로직의 부산물임을 research.md §1이 실측으로 확인해, 원칙 IV
위반의 소지(새로 재는 값처럼 보일 수 있었던 것)를 근거에서부터 차단했다.

### 설계에서 새로 드러난 위험 셋 — Phase 0 조사에서 확인·해소

1. **콜드/핫 판정이 "빠른 콜드"가 아니라 진짜 재사용인지** 확인이 필요했다
   — research.md §1이 `llama-port.ts:118-121`을 실측해 `loader()`(비용이
   드는 호출) 자체를 생략하는 진짜 재사용임을 확인했다. 시간 임계값으로
   가르는 방법은 채택하지 않았다(원칙 IV 위반 소지).
2. **로드 시작과 콜드/핫 확정 사이의 간극을 화면이 어떻게 다루는가** —
   research.md §2가 "이전 단계 문구를 유지하다가 확정 신호에서만 갱신"으로
   결정했다. 별도 "확인 중" 문구 풀은 관리 비용 대비 체감 가치가 낮아
   기각했다.
3. **사진 보기 갈래(많음/보통)를 015의 `PhotoAdvanceSignal`(인자 없음)
   계약을 깨지 않고 어떻게 실어 보내는가** — research.md §3이 "최초
   `onStage("vision", branch)` 1회 전송 + 화면이 그 값을 기억"으로
   해결했다. 015의 사진 전환 신호 계약(`contracts/photo-advance.md`)은
   변경하지 않는다.

세 위험 모두 "실제로 아는 시점에만 말한다"(원칙 II·V)와 "재지 않고 이미
아는 사실만 낸다"(원칙 IV)라는 같은 두 원칙의 반복 적용으로 풀렸다 —
016이 015보다 신호 설계가 한 겹 더 복잡한 이유(비동기 완료를 기다려야
하는 값이 처음 등장)가 여기 있다.

## Complexity Tracking

> 헌법 위반이 없으므로 비어 있다.
