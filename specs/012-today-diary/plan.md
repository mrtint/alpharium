# Implementation Plan: 오늘의 일기

**Branch**: `012-today-diary` | **Date**: 2026-08-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-today-diary/spec.md`

## Summary

**네 자리를 연다 — 하루 경계, 신호 값, 프롬프트, 그리고 화면 상태 기계.**

1. **정오 이후에만 오늘이 선택지에 들어오고, 그때 그그제가 밀려난다.**
   `day-boundary.ts`의 `selectableDays()`가 지금은 "언제나 어제부터 사흘"만 계산한다 —
   여기에 "지금이 정오를 지났는가"를 더해 오늘이 조건부로 셋 중 하나를 대신하게 한다.
2. **오늘 쓴 일기는 "아직 안 끝났다"를 스스로 말한다.** `prompt.ts`에 그 하루가
   끝났는지 여부에 따라 갈리는 한 줄을 더한다 — 사진 축과 무관하게, 신호가 하나도
   없어도 붙는다(FR-004).
3. **걸음·배터리·연결을 프롬프트와 사용자 화면에서 뺀다.** `signals/types.ts`에
   "이 축을 사용자에게 보이는가"를 사람이 적은 상수로 두고, `prompt.ts`·
   `DiaryDetailScreen.tsx`가 그것을 본다. 진단 화면(`SignalProbe.tsx`)은 그대로
   전부 보여준다.
4. **덮어쓰기에 "누른 뒤 확인"을 더한다.** `AppScreen`에 새 갈래를 하나 열어
   "이미 있는 하루를 다시 쓰려 한다"는 사실을 담고, 확인해야 실제 생성이 돈다.
   **원칙 I의 방어(`toWriting()`이 저장 상태를 못 본다)는 그대로 지킨다** — 확인
   화면은 "쓸 것인가"만 묻고 "이미 있는 것을 보여줄까"로 갈리지 않는다.
5. **사진 200장 상한을 없앤다.** `collect.ts`의 `DEFAULT_PHOTO_LIMIT`과
   "limit+1을 물어 잘렸는지 판정"하는 방식을 걷어내고, `photosBetween()`이
   상한 없이 그 구간의 사진 전부를 돌려주게 한다. 조회 자체가 실패하면(타임아웃
   등) 004의 기존 규칙대로 `unknown`이 된다(FR-016) — 잘라서 일부만 주는 경로는
   만들지 않는다.

**설계의 중심**: **정오·축 제외·사진 상한의 값은 전부 사람이 적은 상수 하나씩이며,
코드가 값을 보고 판정하지 않는다**(헌법 원칙 V MUST NOT). 004의 `DEFAULT_PHOTO_LIMIT`,
009의 `SELECTABLE_DAY_COUNT`, 004의 04:00 경계가 이미 같은 패턴이었다 — 이 기능은
그 패턴을 정오와 세 개의 새 상수로 넓힐 뿐 새 판정 방식을 들이지 않는다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3

**Primary Dependencies**: Expo SDK ~57.0.13, React Native 0.86.2. **새 의존 0개** —
필요한 것(순수 함수·기존 화면 조각·`Pressable`)이 전부 이미 있다.

**Storage**: 변경 없음. 고른 하루를 기기에 남기지 않는 009의 결정을 그대로
따른다 — "오늘"도 시간이 지나면 "어제"가 되므로 저장하면 오히려 틀린 값이 된다.

**Testing**: Jest + `@testing-library/react-native` 14(기기 불필요), Maestro(실기기).
`npm test` / `npm run test:device` / `npm run lint`.

**Target Platform**: Android 13 (SM-G986N 실기기), arm64-v8a

**Performance Goals**: 사진 상한을 없앤 뒤에도 하루 수백 장 규모에서는 지금과
비슷한 시간 안에 조회가 끝나야 한다(정량 목표는 spec Assumptions가 계획 단계로
미뤘다 — Phase 0에서 실측 근거를 찾는다).

**Constraints**:
- **정오·축 제외 대상·(구)사진 상한 값은 각각 한 자리에서만 정의된다**(헌법 원칙 V
  MUST NOT — 코드가 판정하지 않는다). `day-boundary.ts`가 정오를, `signals/types.ts`가
  축 제외 대상을 사람이 적은 상수로 가진다.
- **고를 수 있는 하루는 정오 전후 언제나 정확히 셋이다**(FR-001a) — 오늘이
  넷째로 추가되지 않고 그그제를 대신한다.
- **뺀 축(걸음·배터리·연결)은 값 자체에서 사라지지 않는다**(FR-009) — `DaySignals`의
  필드는 그대로 두고, 프롬프트·사용자 화면에서만 읽지 않는다. 진단 경로는 그대로
  전부 읽는다.
- **덮어쓰기 확인은 `toWriting()`을 저장 상태에 노출시키지 않는다**(원칙 I, 007이
  세운 방어) — 확인 화면이 보여주는 것은 날짜뿐이고, 그 화면에서 "이미 있는 것을
  보여주자"로 갈릴 수 없다.
- **사진 조회 실패는 잘라서 일부만 주지 않고 `unknown`이 된다**(FR-016) — 004의
  기존 실패 처리를 그대로 따른다.
- **생성 중 화면에 아무것도 늘지 않는다**(원칙 IV, 기존 제약 유지).
- **`src/ui/`는 `roster`·`assetFor`·`ModelAsset`에 닿을 수 없다**(헌법 검사가 강제).

**Scale/Scope**: 고를 수 있는 하루는 여전히 셋(내용만 조건부로 갈린다). 순수 함수
변경 3곳(`day-boundary.ts`·`state.ts`·`collect.ts`), 프롬프트 1곳(`prompt.ts`), 화면
2곳(`DiaryDetailScreen.tsx`·`DiaryListScreen.tsx` 또는 새 확인 화면 조각), 신호 계약
1곳(`signals/types.ts`·`port.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능과의 관계 | 판정 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | **가장 큰 위험이다.** 덮어쓰기 확인 화면을 잘못 설계하면 "확인 화면이 기존 일기를 미리 보여준다"로 미끄러질 수 있다 — 확인 화면은 **날짜만** 담아야 하고 `toWriting()`은 여전히 저장 상태를 볼 수 없어야 한다(007이 세운 `toWriting.length === 0` 방어를 유지) | ⚠️ 감시 후 통과 |
| **II. 화자는 휴대폰이고 시야는 좁다** | **핵심이다.** "하루의 끝" 조항(1.1.0)을 처음 구현하는 기능이며, 오늘 쓴 일기가 아직 일어나지 않은 일을 단언하면 직접 위반이다. 문장은 `prompt.ts`에 **한 자리**로 추가되고 사진 축과 독립적이다(FR-004) | ⚠️ 감시 후 통과 |
| **III. 모델은 캐릭터다** | 이 기능은 날짜·신호·확인 상태만 다룬다. 자산·로스터에 닿을 이유가 없고 헌법 검사가 구조로 막는다 | ✅ 통과 |
| **IV. 측정 장치를 제품에 들이지 않는다** | 덮어쓰기 확인 화면에 진행률·시간을 담지 않는다(FR-013). 축을 빼는 판정도 코드가 스스로 하지 않으므로 임계값·점수가 될 여지가 없다 | ✅ 통과 |
| **V. 관측된 사실과 추측을 구분한다** | **둘째 핵심이다.** 「어느 축이 통로가 없는가」를 코드가 판정하지 않는다(FR-010, MUST NOT) — 사람이 상수로 못박는다. 사진 상한을 없앤 뒤 조회 실패는 `unknown`으로 남지 잘라서 감추지 않는다(FR-016) | ⚠️ 감시 후 통과 |
| **개발 방식** | 계약을 먼저 정하고 테스트를 먼저 쓴다. 커밋 메시지는 한국어. **다섯 관심사(정오 열기·하루 셋 재구성·축 제외·덮어쓰기 확인·사진 상한 제거)를 한 스펙에 묶었지만, 로드맵이 이미 "같은 자리(신호·화면)를 여는 것끼리 묶는다"는 근거를 댔다** — 한 축을 깊게 파는 것과 다르다 | ✅ 통과 |

**게이트 통과.** 정당화가 필요한 위반이 없으므로 Complexity Tracking은 비운다.

**★ 설계 조사 중 발견한 핵심 배선 위험**: `pipeline.ts`의 1단계 게이트
(`isDayClosed(input.day, input.now)`)가 **오늘을 언제나 거부하도록 이미 짜여
있다**(research.md §9) — 오늘은 정의상 닫히지 않았으므로 이 조건이 항상 `false`다.
화면에서 "오늘"을 아무리 잘 고를 수 있게 만들어도 **이 한 줄을 고치지 않으면
파이프라인이 조용히 `day-not-closed`로 막는다.** 006·007·008·009가 반복한 조용한
배선 끊김과 같은 종류이며, 이 기능에서 가장 먼저 테스트로 못박아야 할 지점이다.

**감시 항목 셋의 방어**:
- **원칙 I** — 덮어쓰기 확인 화면의 데이터 모델을 `WritePrompt`처럼 "날짜와 여부"만
  갖는 최소 모양으로 설계한다(Phase 1 data-model에서 확정). `toWriting()`이
  저장 데이터를 인자로 받지 않는 007의 불변식을 검사가 계속 지킨다.
- **원칙 II** — "하루의 끝" 문장은 `SPEAKER_RULES`·신호 문장과 같은 자리(`prompt.ts`)
  에서 만들어지므로 화자 규칙의 단일 통과 지점(FR-013b)이 깨지지 않는다. 005~011이
  반복해서 겪은 "단언" 위반과 같은 실패 양상이 재발하지 않도록, 이 문장도
  SPEAKER_RULES와 같은 어조("아직 끝나지 않았다"를 사실로 진술하되 그 이상을
  단언하지 않는다)로 짧게 쓴다.
- **원칙 V** — 축 제외 상수(`signals/types.ts` 또는 인접 파일)에 "왜 이 축을
  뺐는지"와 "되살릴 조건"을 주석으로 남긴다(009 FR-021a·004 `DEFAULT_PHOTO_LIMIT`의
  선례). 사진 상한 제거도 값이 아니라 구조를 바꾸는 것이므로 코드가 스스로 상한을
  판정하는 코드가 새로 생기지 않게 한다.

## Project Structure

### Documentation (this feature)

```text
specs/012-today-diary/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 정오 계산, 사진 무제한 조회 성능, (구)상한 제거의 영향 범위
├── data-model.md         # Phase 1 — 새 타입과 상태 전이
├── quickstart.md         # Phase 1 — 검증 절차
├── contracts/
│   ├── day-boundary.md        # Phase 1 — selectableDays()·isDayWritable()·파이프라인 게이트
│   ├── overwrite-confirm.md   # Phase 1 — 덮어쓰기 확인의 계약
│   └── signal-visibility.md   # Phase 1 — 축 제외, "하루의 끝" 문장, 사진 상한 제거
├── checklists/
│   └── requirements.md   # /speckit-specify + /speckit-clarify 산출
└── tasks.md               # /speckit-tasks가 만든다 (이 명령이 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── config/
│   └── day-boundary.ts       # ★ 고칠 자리 — 정오 상수, selectableDays()가 오늘을 조건부로 포함,
│                              #   isDayWritable(day, now) 신설
├── diary/
│   ├── pipeline.ts            # ★★ 고칠 자리 — 1단계 게이트가 지금 "오늘"을 전부 거부한다
│   │                          #   (research.md §9). 이 기능에서 가장 위험한 배선 지점
│   ├── request.ts             # ★ 고칠 자리 — buildRequest()가 "오늘이 열려 있는가"를
│   │                          #   DiaryRequest에 실어 전달(research.md §8)
│   ├── types.ts                # ★ 고칠 자리 — DiaryRequest에 필드 추가
│   └── prompt.ts               # ★ 고칠 자리 — "하루의 끝" 문장, 축 제외 반영
├── signals/
│   ├── types.ts               # ★ 고칠 자리 — 축 제외 상수(사람이 적는다)
│   ├── port.ts                 # ★ 고칠 자리 — photosBetween() 시그니처에서 상한 제거 검토
│   ├── expo-port.ts            # ★ 고칠 자리 — Query에 .limit() 호출 제거
│   └── collect.ts              # ★ 고칠 자리 — DEFAULT_PHOTO_LIMIT·잘림 판정 제거
├── app/
│   └── state.ts                 # ★ 고칠 자리 — AppScreen에 덮어쓰기 확인 갈래
├── ui/
│   ├── DiaryHomeScreen.tsx      # ★ 고칠 자리 — 확인 화면 배선, DayPicker에 안내 값 전달
│   ├── DiaryListScreen.tsx      # ★ 고칠 자리 또는 새 확인 화면 조각
│   ├── DayPicker.tsx            # ★★ 고칠 자리 — 정오 이전 안내(헌법 원칙 II MUST,
│   │                            #   contracts/day-boundary.md §4, /speckit-analyze C1에서 드러난 갭)
│   └── DiaryDetailScreen.tsx    # ★ 고칠 자리 — 걸음 수 줄 제거(이미 표시 중이던 것)
└── models/                       # 손대지 않는다

__tests__/
├── config/day-boundary.test.ts        # ★ 정오 경계, 셋 구성 갈래
├── diary/
│   ├── pipeline.test.ts               # ★★ 정오 이후 오늘이 day-not-closed를 지나 다음
│   │                                  #   단계로 실제로 진행하는지(research.md §9)
│   └── prompt.test.ts                 # ★ "하루의 끝" 문장, 축 제외
├── signals/collect.test.ts            # ★ 상한 없는 조회, 실패 시 unknown
├── app/state.test.ts                  # ★ 덮어쓰기 확인 갈래
└── ui/
    ├── diary-detail.test.tsx          # ★ 걸음·배터리·연결 줄 없음
    ├── diary-list.test.tsx            # ★ 확인 화면 흐름
    └── day-picker.test.tsx            # ★ 정오 이전 안내(contracts/day-boundary.md §4)

.maestro/
└── today-diary.yml                     # ★ 새 흐름 — FLOWS에 등록해야 돈다
```

**Structure Decision**: 기존 구조를 그대로 쓴다. **새 폴더를 만들지 않는다** — 이
기능이 더하는 것은 상수 몇 개, 순수 함수의 갈래 확장, 프롬프트 한 자리, 화면 상태
하나이며 전부 기존 자리에 들어간다. `src/signals/`가 004 이후 처음으로 계약이
넓어지는 지점이다(사진 상한 제거).

## Constitution Check — 설계 후 재평가

*Phase 1 산출물(data-model·contracts·quickstart)을 만든 뒤 다시 본다.*

| 원칙 | 설계가 무엇으로 막는가 | 판정 |
| --- | --- | --- |
| **I. 온디바이스** | **I7/C3**(`toWriting.length === 0`)이 확인 화면을 거쳐도 유지된다. **C1**(`confirm-overwrite`의 필드가 `kind`·`day` 둘뿐)이 선언을 직접 읽어 확인 화면이 저장된 글을 볼 수 없게 막는다 | ✅ 통과 |
| **II. 화자·시야** | **I5·I6**(data-model)과 signal-visibility 계약 §2가 "하루의 끝" 문장이 사진 권한과 무관하게 붙는 것을 표로 못박는다. `SPEAKER_RULES`를 건드리지 않고 `buildPrompt()` 상단에 독립된 문장 하나만 더한다. **I11**(data-model §6)과 day-boundary 계약 §4가 헌법의 "화면 양쪽에" 요구(정오 이전 안내)를 `DayPicker.tsx`에 명시적으로 못박는다 — `/speckit-analyze`가 이 절반이 태스크 커버리지 0이었음을 잡아냈고, 이 개정으로 해소했다 | ✅ 통과 |
| **III. 모델은 캐릭터** | 이 기능이 여는 파일 어디에도 자산·로스터 import가 없다(day-boundary·signals·prompt·state 전부 날짜·신호·문장만 다룬다). 헌법 검사가 구조로 막는다 | ✅ 통과 |
| **IV. 측정 장치 금지** | **C1**이 확인 화면에 진행률·시간이 담길 자리를 없앤다. **I8**(data-model)이 같은 것을 갈래 전체에서 센다 | ✅ 통과 |
| **V. 사실과 추측** | **S1·S2**(signal-visibility)가 축 제외 상수를 사람이 적은 값으로 못박고, **S4**가 진단 경로는 그 상수를 보지 않는다는 것을 소스 검사로 확인한다. **L1·L4**가 사진 상한 제거와 실패 시 `unknown` 처리를 검사한다 | ✅ 통과 |
| **개발 방식** | 계약(contracts/) 셋이 코드보다 먼저 있고, 검증 표가 곧 테스트가 된다 | ✅ 통과 |

**게이트 재통과.** 설계가 원칙을 약화시키지 않았고, 오히려 막는 자리를 여럿
늘렸다(I4·I7·C1·S4).

### 설계에서 새로 드러난 위험 하나 — Phase 0 조사에서 나왔다

**`pipeline.ts`의 1단계 게이트가 지금 오늘을 항상 거부하도록 짜여 있다**
(research.md §9, day-boundary 계약 §3). 이 한 줄(`isDayClosed` → `isDayWritable`
교체)을 놓치면 화면이 완벽해도 기능 전체가 조용히 무력화된다 — 006의
`GenerationProbe`, 007의 끊긴 `stop`, 008의 버려진 반환값, 009의
`latestClosedDay(at)` 한 줄과 **같은 종류**다.

**방어**: day-boundary 계약 §3의 검증 표 2번 행(정오 이후 오늘이 `day-not-closed`를
지나 다음 단계로 실제로 진행하는지)을 **가장 먼저** 테스트로 못박는다. quickstart
A1의 1번이 이것을 위반 주입으로 재확인한다.

## Complexity Tracking

> 헌법 위반이 없으므로 비어 있다.
