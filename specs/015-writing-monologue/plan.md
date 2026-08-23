# Implementation Plan: 쓰는 중 독백

**Branch**: `015-writing-monologue` | **Date**: 2026-08-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-writing-monologue/spec.md`

## Summary

**네 자리를 연다 — 진행 신호를 만드는 자리, 사진 장별 전환 신호를 만드는 자리,
그것을 밖으로 흘려보내는 자리, 화면이 받아 다양한 문구를 순환시키며 그리는 자리.**

1. **`InferenceBackend.generate()`가 진행 신호를 보낼 수 있게 계약을 넓힌다.**
   지금 `on-device.ts`의 `generate()`는 사진 읽기(`readPhotos`)와 글쓰기
   (`engine.run`)를 순서대로 부르지만 그 전환을 아무도 모른다 — 이 경계를 실제로
   아는 유일한 자리이므로, 여기에 옵셔널 콜백 인자를 하나 더한다. **다만
   `generate()` 자신이 직접 보내는 신호는 "지금 쓴다"(`"generation"`) 하나뿐이다**
   — "지금 사진을 본다"(`"vision"`)는 아래 2번이 보낸다(둘 다 같은 자리에서
   보내면 이중 발화가 난다, 2026-08-23 `/speckit-analyze` C1).
2. **`captionAll()`(사진 한 장씩 읽는 루프)이 `"vision"` 신호의 유일한
   발생원이다.** `src/vision/caption.ts`의 `for (const photo of photos)`
   루프가 사진 장수를 실제로 아는 유일한 자리다 — 매 반복 시작(캡션을
   시도하기 직전)마다 옵셔널 콜백을 불러 "지금 이 장을 본다"는 사실만
   전달한다. 순번은 넘기지 않는다. **사진이 1장뿐이면 이 호출 1회가 "진입"과
   "전환"을 겸한다** — 별도의 "사진 보기 시작" 신호는 없다.
3. **`pipeline.ts`가 신호 확인 시작과 백엔드의 신호를 이어 붙여 밖으로 낸다.**
   `run()`이 옵셔널 `onProgress` 콜백을 받고, 3단계(신호 가져오기) 직전에
   `"signals"`를 스스로 보낸 뒤, 5단계(생성)에서는 백엔드가 보내는 신호를 그대로
   전달한다. 파이프라인은 vision/글쓰기의 내부 경계도, 사진 장 전환도 모르므로
   **만들어 내지 않고 중계만 한다.**
4. **화면이 신호를 받아 여러 후보 문구 중 하나를 순환시켜 그린다.**
   `DiaryHomeScreen.tsx`의 `generate()`가 `onProgress`를 넘기고, `"writing"`
   화면 상태에 지금 단계를 더해 `ActivityIndicator` 옆에 문구를 그린다. 문구
   후보 목록은 새 파일 `src/diary/monologue.ts`에 단계별로 여러 개씩 상수로
   둔다 — persona.ts가 이름·소개의 유일한 통과 지점이듯, 이 파일이 단계→문구
   후보의 유일한 통과 지점이다. 신호를 받을 때마다(단계 전환이든 사진
   전환이든) 직전과 서술어가 겹치지 않는 후보를 하나 골라 보여준다.

**설계의 중심**: **신호는 "무엇이 바뀌었다"는 사실(단계 이름 또는 사진 전환
계기)만 나른다.** 숫자·시간·순번을 실을 자리를 타입 자체에 만들지 않는다 —
`ActivityIndicator`가 진행률 파라미터 자체가 없어서 원칙 IV를 지켰던 것과 같은
방어를, `ProgressStage`/사진 전환 신호 타입으로 그대로 옮긴다. **문구 선택
로직(순환·무작위·서술어 중복 회피)은 화면 쪽에만 있다** — 파이프라인·어댑터는
"바뀌었다"는 신호만 보내고, 무엇을 보여줄지는 화면이 정한다(원칙 IV가 생성·
측정 로직을 제품 코어에 두지 말라고 한 것과 같은 정신으로, "표현을 고르는
로직"도 되도록 얇게 화면 레이어 하나에만 둔다). 콜백이 없어도 기존
002/003/005/011/012 계약 테스트가 그대로 통과해야 한다(003의 `isModelReady?`,
012의 `day?`/`now?`와 같은 "넓히기" 패턴).

## Technical Context

**Language/Version**: TypeScript ~6.0.3

**Primary Dependencies**: Expo SDK ~57.0.13, React Native 0.86.2. **새 의존
0개** — 옵셔널 콜백과 상수 문자열 하나로 끝나는 범위다.

**Storage**: 변경 없음. 진행 단계는 어디에도 저장되지 않는다(원칙 IV와 같은
이유로 — 남기면 그것이 측정 기록이 된다).

**Testing**: Jest(기기 불필요), Maestro(실기기 — 루이/narrative로 검증해야
단계가 스쳐 지나가지 않는다, 로드맵 「이 기능은 실기기 검증이 까다롭다」).
`npm test` / `npm run test:device` / `npm run lint`.

**Target Platform**: Android 13 (SM-G986N 실기기), arm64-v8a

**Performance Goals**: 해당 없음 — 이 기능은 생성 속도에 영향을 주지 않는다.
콜백 호출 자체가 관측 가능한 지연을 더해서는 안 된다(동기 상태 갱신만 한다).

**Constraints**:
- **진행 신호는 문자열 리터럴 유니온(`ProgressStage`)만 나른다.** 숫자·Date·
  객체를 담지 않는다(원칙 IV) — 콜백 시그니처 자체가 `(stage: ProgressStage) =>
  void`로 좁혀야, 나중에 다른 개발자가 시간을 실어 보내는 것을 타입이 막는다.
- **파이프라인은 vision/글쓰기 경계를 스스로 만들지 않는다.** 그 경계를 아는
  것은 `on-device.ts`의 `generate()` 내부뿐이므로, 파이프라인은 백엔드가 보낸
  신호를 그대로 화면까지 중계한다 — 002 FR-017(추론 어댑터를 파이프라인이
  직접 고르지 않는다)과 같은 정신으로, 파이프라인이 vision 유무를 스스로
  판단해 신호를 지어내지 않는다.
- **콜백은 옵셔널이며, 없어도 기존 흐름이 그대로 동작한다**(003 `isModelReady?`
  선례). `desktop-server.ts`처럼 콜백을 모르는 백엔드는 신호 없이도 정상
  동작해야 한다 — vision 신호가 하나도 안 와도 파이프라인은 실패하지 않는다.
- **문구 목록은 사람이 미리 쓴 상수다.** `src/diary/monologue.ts` 하나가
  단계→문구의 유일한 통과 지점이며, 모델이 문구를 생성하지 않는다(원칙 IV).
- **생성 중인 텍스트 자체는 여전히 콜백에 실리지 않는다**(005 FR-028b 유지).
  `engine.run()`에 토큰 콜백을 넘기는 경로를 새로 열지 않는다 — 진행 신호는
  "무엇을 하는가"의 단계 전환일 뿐 생성 중인 글자와 무관하다.
- **`PipelineStage`(실패 갈래)와 `ProgressStage`(진행 중 단계)를 같은 타입으로
  섞지 않는다.** 하나는 "어디서 멈췄는가", 하나는 "지금 뭘 하는가"로 성격이
  다르다 — 섞으면 실패 판정 테스트(002 FR-019, 「그 수를 직접 센다」)가 오염된다.
- **사진 전환 신호는 순번을 담지 않는다.** `captionAll()`의 루프가 몇 번째
  반복인지는 알지만, 콜백에는 인자 없이 "전환이 일어났다"는 사실만 전달한다
  (`() => void` 시그니처) — 인자에 `number`를 실으면 화면이 그 숫자를 문구에
  쓰고 싶은 유혹을 받게 되므로, 아예 실을 수 없게 만든다.
- **문구 후보는 단계마다 최소 2~3개, 서로 다른 서술어로 준비한다.** 후보가
  하나뿐이면 "순환"이 성립하지 않고 User Story 1의 "매번 새로운 말로
  알려준다"는 요구(spec Clarifications 3·4차)를 만족할 수 없다.
- **문구 선택(순환/무작위, 직전과 서술어 겹침 방지)은 화면 레이어
  (`ui/DiaryHomeScreen.tsx` 또는 `monologue.ts`가 제공하는 순수 선택 함수)
  안에만 있다.** 파이프라인·어댑터는 "무슨 문구를 보여줄지" 결정하지 않는다
  — 결정 로직이 여러 계층에 흩어지면 "서술어 중복 방지"를 한 곳에서
  테스트할 수 없다.

**Scale/Scope**: 진행 단계 최소 셋(`signals`·`vision`·`generation`, spec
Clarifications). 사진 보기 단계 안에 장 전환 신호가 추가로 얹힌다. 순수
함수/타입 변경 3곳(`inference/types.ts`·`diary/pipeline.ts`· 새
`diary/monologue.ts`), 어댑터 2곳(`inference/on-device.ts`·`vision/caption.ts`),
화면 2곳(`app/state.ts`·`ui/DiaryHomeScreen.tsx`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능과의 관계 | 판정 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | 관계 없음 — 추론 위치나 응답 내용을 건드리지 않는다 | ✅ 통과 |
| **II. 화자는 휴대폰이고 시야는 좁다** | 독백 문구는 "휴대폰이 지금 하는 일"을 화자의 말투로 옮긴 것이며, 일기 본문이 아니다. FR-012가 "실제로 하지 않는 일을 말하지 않는다"를 명시해 화자 정직성 원칙을 화면에도 그대로 옮긴다 | ✅ 통과 |
| **III. 모델은 캐릭터다** | **감시 대상.** spec Assumptions가 캐릭터별 어조 분화를 이번 범위에서 뺐으므로, 문구가 캐릭터를 참조하거나 `roster.ts`/`persona.ts`에 닿을 이유가 없다 — 닿으면 범위가 조용히 넓어진 것이다 | ⚠️ 감시 후 통과 |
| **IV. 측정 장치를 제품에 들이지 않는다** | **가장 큰 위험이다.** 진행 콜백이라는 새 통로 자체가 "측정값을 실어 나르는 길"로 오용되기 쉽다 — 시간을 재서 보내거나, 몇 번째 사진인지 카운트를 실으면 그 순간 원칙 IV 위반이다. 타입 레벨 방어(`ProgressStage` 유니온만 허용)로 막는다 | ⚠️ 감시 후 통과 |
| **V. 관측된 사실과 추측을 구분한다** | 관계 없음 — 신호값을 다루지 않는다 | ✅ 통과 |
| **개발 방식** | 계약을 먼저 정하고(콜백 시그니처, 문구 상수 목록) 테스트를 먼저 쓴다. 한 축(콜백 배선)에 머물지 않고 화면 문구까지 끝까지 배선한다 | ✅ 통과 |

**게이트 통과.** 정당화가 필요한 위반이 없으므로 Complexity Tracking은 비운다.

**★ 설계 조사 중 발견한 핵심 배선 위험 (셋)**:

1. 파이프라인은 `on-device.ts` `generate()` 내부의 vision→글쓰기 전환을
   **볼 수 없다** — 그 전환은 어댑터 내부에서만 일어난다. 콜백을 파이프라인
   레벨(`run()`의 5단계 앞뒤)에만 두면 "생성 시작"/"생성 끝" 두 신호만
   나오고, spec이 요구하는 "사진 보기"와 "글쓰기" 구분이 사라진다. **콜백은
   반드시 `on-device.ts`의 `generate()` 안까지 내려가야 한다.**
2. **사진 장 전환은 그보다 한 겹 더 안쪽, `captionAll()`의 `for` 루프
   안에서만 관측 가능하다**(`src/vision/caption.ts` 72행). `on-device.ts`가
   `readPhotos()`를 부르는 시점에는 이미 사진이 몇 장인지 결정돼 있지만,
   장이 바뀌는 매 순간은 `captionAll()` 내부에서만 안다. **`on-device.ts`
   레벨의 신호만으로는 "사진을 보는 중"이라는 문구 하나가 처음부터 끝까지
   고정되어, 이번에 추가한 "장 전환마다 문구가 바뀐다"는 요구가 조용히
   무시될 위험이 크다.**
3. **(1)과 (2)를 동시에 해결하려다 신호가 이중으로 발화하는 함정이 있다**
   (2026-08-23 `/speckit-analyze` C1로 실제 발견됨). `generate()`가
   `readPhotos()` 호출 직전에 독자적으로 `"vision"`을 한 번 보내고, 그
   안에서 `captionAll()`도 `onPhotoStart`로 `"vision"`을 또 보내면 사진
   1장에서 신호가 2번, 3장에서 4번 나가는 계산 오류가 생긴다. **`"vision"`
   신호는 `captionAll()`의 `onPhotoStart` 한 곳에서만 나가야 한다** —
   `generate()`/`readPhotos()`는 콜백을 그대로 전달만 하고 절대 자기 몫으로
   호출하지 않는다.

006의 `GenerationProbe`, 011의 `filePathOf()` 배선처럼, "화면은 완벽한데
신호를 보낼 자리를 놓쳐 조용히 더 낮은 해상도로만 보인다"가 이 기능에서
가장 그럴듯한 실패 양상이다 — 이번에는 그 자리가 두 겹이고, 두 겹을 잇는
과정에서 중복 발화까지 겹칠 수 있다는 점이 실제로 확인됐다.

**감시 항목 둘의 방어**:
- **원칙 III** — `monologue.ts`는 `Character`/`roster.ts`/`persona.ts`를 import
  하지 않는다(계약에 명시, 헌법 검사 후보). 문구는 `ProgressStage` 하나만 인자로
  받는다.
- **원칙 IV** — `ProgressStage`를 문자열 리터럴 유니온으로 좁히고, 콜백
  시그니처 어디에도 `Date`·`number`(시간·카운트)를 두지 않는다. 계약 테스트가
  콜백 타입 선언을 직접 읽어 이것을 검사한다(007 이후 관례 — jest는 타입을
  지우므로 `tsc`만 잡는 위반을 소스 읽기로 대신 잡는다).

## Project Structure

### Documentation (this feature)

```text
specs/015-writing-monologue/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 콜백을 어느 계층에 둘지, 옵셔널 확장이 003/012와
│                         #   같은 패턴인지 확인
├── data-model.md         # Phase 1 — ProgressStage, 콜백 시그니처, 화면 상태 확장
├── quickstart.md         # Phase 1 — 검증 절차 (루이로 3단계 관측)
├── contracts/
│   ├── progress-signal.md   # Phase 1 — onProgress 콜백의 계약 (누가 언제 부르는가)
│   ├── photo-advance.md     # Phase 1 — 사진 장 전환 신호의 계약 (captionAll 내부)
│   └── monologue.md         # Phase 1 — 단계→문구 후보 매핑, 순환 선택, 원칙 III/IV 방어
├── checklists/
│   └── requirements.md   # /speckit-specify + /speckit-clarify 산출
└── tasks.md               # /speckit-tasks가 만든다 (이 명령이 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── inference/
│   ├── types.ts                # ★ 고칠 자리 — ProgressStage 타입, InferenceBackend.generate()
│   │                            #   시그니처에 옵셔널 onStage 콜백 추가
│   └── on-device.ts             # ★★ 고칠 자리 — engine.run() 호출 직전 "generation" 신호를
│                                 #   보낸다. "vision"은 여기서 직접 안 보내고 onStage를
│                                 #   readPhotos()→captionAll()까지 그대로 전달만 한다
│                                 #   (핵심 배선 위험 1, C1 정정)
├── vision/
│   └── caption.ts                # ★★ 고칠 자리 — captionAll()의 for 루프에 옵셔널
│                                  #   onPhotoStart?: () => void를 추가해 매 반복 시작마다
│                                  #   부른다. 사진 장 전환을 아는 유일한 자리(핵심 배선 위험 2)
├── diary/
│   ├── pipeline.ts               # ★★ 고칠 자리 — run()이 onProgress를 받아 3단계 앞에서
│   │                              #   "signals"를 스스로 보내고, 5단계에서는 백엔드 신호를 중계
│   └── monologue.ts               # ★ 새 파일 — ProgressStage(+사진 전환 신호) → 문구 후보
│                                  #   상수 여러 개, 순환/무작위 선택 순수 함수. persona.ts와
│                                  #   같은 구조(캐릭터/roster를 import하지 않는다)
├── app/
│   └── state.ts                   # ★ 고칠 자리 — "writing" 화면 상태에 현재 단계·현재 문구
│                                  #   필드 추가
└── ui/
    └── DiaryHomeScreen.tsx        # ★ 고칠 자리 — generate()가 onProgress를 pipeline.run()에
                                    #   넘기고, "writing" 렌더가 monologue.ts에서 고른 문구를
                                    #   그린다

__tests__/
├── inference/
│   ├── types.test.ts              # ★ ProgressStage가 문자열 유니온뿐인지 소스 선언 검사
│   └── on-device.test.ts          # ★★ "generation" 신호가 오는지(vision은 여기서 직접 안
│                                  #   보낸다, C1 정정), onStage를 readPhotos()에 그대로
│                                  #   전달하는지 — vision 자체의 발화 검증은 caption.test.ts가
│                                  #   더 정확히 한다
├── vision/
│   └── caption.test.ts            # ★★ 사진 N장에 대해 onPhotoStart가 N번 불리는지 —
│                                  #   1장이면 1번(진입과 전환을 겸함), 0장이면 0번(captionAll
│                                  #   자체가 안 불림), 인자 없이 호출되는지(순번 미포함)
├── diary/
│   ├── pipeline.test.ts           # ★ onProgress 없이도 기존 테스트가 통과하는지(옵셔널 확장)
│   └── monologue.test.ts          # ★★ 모든 ProgressStage에 후보가 2개 이상 있는지, 숫자·Date를
│                                  #   안 쓰는지, 연속 선택에서 서술어가 안 겹치는지(선택 함수
│                                  #   자체를 여러 번 호출해 검증)
└── app/
    └── state.test.ts              # ★ writing 상태의 단계·문구 필드 전이

.maestro/
└── writing-monologue.yml           # ★ 새 흐름 — 루이(narrative)+사진 여러 장으로 3단계·장
                                    #   전환 관측(FLOWS에 등록 필수, 빠른 캐릭터에서는 SKIPPED로
                                    #   지나갈 수 있음을 로드맵이 경고)
```

**Structure Decision**: 기존 구조를 그대로 쓴다. 새 폴더 없이 `src/diary/`에
`monologue.ts` 하나만 더한다 — `persona.ts`(014)가 캐릭터→이름의 유일한 통과
지점이듯, 이 파일이 단계(+사진 전환)→문구 후보의 유일한 통과 지점이 되는 같은
패턴이다. 콜백은 새 계층을 만들지 않고 기존 `InferenceBackend`/`Pipeline`/
`captionAll()` 계약을 003·012·013 선례를 따라 옵셔널로 넓힌다.

## Constitution Check — 설계 후 재평가

*Phase 1 산출물(data-model·contracts·quickstart)을 만든 뒤 다시 본다.*

| 원칙 | 설계가 무엇으로 막는가 | 판정 |
| --- | --- | --- |
| **III. 모델은 캐릭터** | `contracts/monologue.md` 불변식 1이 `monologue.ts`의 import 제한(roster·persona·Character 없음)을 명시하고, quickstart A1의 위반 주입 절차가 헌법 검사로 그것을 실제로 확인한다 | ✅ 통과 |
| **IV. 측정 장치 금지** | `data-model.md`의 `ProgressStage`가 문자열 리터럴 유니온 하나뿐이고, `contracts/progress-signal.md` 불변식 3이 콜백을 동기·무반환으로 좁힌다. `contracts/monologue.md` 불변식 2가 문구에 숫자가 없는지 정규식으로 검사하는 계약 테스트를 요구한다 | ✅ 통과 |

**게이트 재통과.** 설계가 원칙을 약화시키지 않았다 — 오히려 `ProgressStage`
타입 자체를 좁혀 원칙 IV 위반이 타입 레벨에서 불가능하도록 만들었다.

### 설계에서 새로 드러난 위험 셋 — Phase 0 조사 및 /speckit-analyze에서 나왔다

1. **콜백을 파이프라인 레벨에만 두면 "생성 시작"/"생성 끝" 두 신호만 나오고
   spec이 요구하는 "사진 보기"/"글쓰기" 구분이 사라진다**(research.md §1).
   vision→글쓰기 전환을 실제로 아는 것은 `on-device.ts`의 `generate()`
   내부뿐이다.
2. **사진 장 전환은 그보다 더 안쪽인 `captionAll()`의 루프 안에서만
   관측된다**(research.md §6). `on-device.ts` 레벨의 신호만으로 멈추면
   "사진을 보는 중" 문구가 여러 장을 처리하는 내내 한 번도 안 바뀌어, spec
   Clarifications 3차가 요구한 "장 전환마다 문구가 바뀐다"가 조용히
   무시된다 — `contracts/photo-advance.md`가 이 신호가 `captionAll()`의 for
   루프 안, 매 반복 시작 시점에서 나야 함을 못박는다.
3. **(1)·(2)를 각자 따로 처리하면 `"vision"`이 이중으로 발화한다**
   (2026-08-23 `/speckit-analyze` C1). `contracts/progress-signal.md`와
   `contracts/photo-advance.md`가 지금은 **`"vision"`의 발생원이
   `captionAll()`의 `onPhotoStart` 단 하나임**을 명시적으로 못박아 이
   위험을 해소했다 — `on-device.ts`의 `generate()`/`readPhotos()`는 콜백을
   전달만 하고 자기 몫으로 호출하지 않는다.

세 위험 모두 이 지점을 놓치면 화면·타입이 전부 완벽해 보여도 신호가 영영
한 단계 낮은 해상도로만 오거나(1·2) 두 배로 튀는(3) 조용한 실패가 난다 —
006의 `GenerationProbe`, 011의 `filePathOf()`와 같은 종류다.

**방어**: `contracts/progress-signal.md`의 검증 표(vision="quick"이고 사진
1장 → `"vision"`이 정확히 1번, 3장 → 정확히 3번, 0장 → 0번)와
`contracts/photo-advance.md`의 검증 표(사진 N장 → onPhotoStart가 N번 불림)를
가장 먼저 테스트로 못박는다.
quickstart A1·A5가 실기기에서 같은 것을 위반 주입 없이 재확인한다.

## Complexity Tracking

> 헌법 위반이 없으므로 비어 있다.
