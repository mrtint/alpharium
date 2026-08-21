# Implementation Plan: 지난 하루를 골라 쓴다

**Branch**: `009-past-day-diary` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-past-day-diary/spec.md`

## Summary

**제약이 화면 한 곳에만 있다.** 파이프라인·신호 수집·저장은 이미 하루를 인자로 받으며,
[DiaryHomeScreen.tsx:179](../../src/ui/DiaryHomeScreen.tsx#L179)가 `latestClosedDay(at)`를
박아 넣는 것이 전부다. **아래를 고칠 일이 없다.**

무엇을 하는가:

1. **고를 수 있는 하루를 계산한다.** `latestClosedDay()` 하나가 주던 값을 **셋의
   목록**으로 넓힌다. 04:00과 마찬가지로 **범위의 크기가 한 자리에만 있어야 하므로**
   `day-boundary.ts`에 둔다(FR-003·004).
2. **「무엇을 쓰게 되는가」를 순수 함수 하나로 모은다.** 지금의 `writePromptFor()`가
   고른 하루·되돌림·덮어쓰기 예고까지 답하도록 넓힌다 — **매번 다시 묻는 구조**가
   FR-009a의 요구이며, 그것이 곧 007의 `resolveSelection()`·008의
   `resolveDownloadView()`와 같은 형태다.
3. **화면에 고르는 자리를 낸다.** 「2026-08-20를 쓴다」 한 줄이던 곳에 세 하루가
   보이고 하나가 골라져 있다. 캐릭터를 고르는 자리 바로 옆이다.
4. **고른 하루를 생성으로 잇는다.** `write()`가 `latestClosedDay(at)` 대신 **판정
   함수가 돌려준 하루**를 넘긴다.

**설계의 중심**: 판정을 화면에 두지 않는다. 「어느 하루를 쓰게 되는가·되돌려졌는가·
덮어쓰는가」를 **순수 함수 하나**가 정하고 화면은 그린다. 이 저장소가 세 번 겪은
결함(006 `GenerationProbe`, 007 끊긴 `stop` 배선, 008 버려진 반환값)은 전부 **판정과
배선이 화면에 흩어져 조용히 끊긴 것**이었다.

**★ 지금의 `writePromptFor()`는 이미 렌더 안에서 `now()`와 함께 불린다**
([DiaryHomeScreen.tsx:249](../../src/ui/DiaryHomeScreen.tsx#L249)). FR-009a의 「매번 다시
판정한다」는 **새 기계장치가 아니라 이미 있는 자리를 넓히는 것**이다 — `useEffect`도
타이머도 들이지 않는다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3

**Primary Dependencies**: Expo SDK ~57.0.13, React Native 0.86.2. **새 의존 0개** —
필요한 것(순수 함수·기존 화면·`Pressable`)이 전부 이미 있다. 달력 선택기를 들이지
않는다(spec Out of Scope).

**Storage**: **없다.** 고른 하루를 기기에 남기지 않는다(FR-010) — 하루는 시간이
지나면 범위를 벗어나므로 **저장된 값이 오히려 틀린 값이 된다.** 007의 캐릭터 선택이
`files/preferences/`에 남는 것과 **의도적으로 다르다.**

**Testing**: Jest + `@testing-library/react-native` 14(기기 불필요), Maestro(실기기).
`npm test` / `npm run test:device` / `npm run lint`.

**Target Platform**: Android 13 (SM-G986N 실기기), arm64-v8a

**Performance Goals**: 고르는 자리를 만드는 데 **추가 파일 읽기가 0이다**(FR-011b) —
「그 하루에 일기가 있는가」는 이미 읽은 목록에서 나온다. 007이 사진 갈래를 추가 읽기
없이 낸 것과 같다.

**Constraints**:
- **범위의 크기(셋)가 한 자리에만 있어야 한다**(FR-003) — 04:00이 그런 것처럼
- **고르는 자리에 사진 갈래를 싣지 않는다**(FR-011a) — 아직 쓰지 않은 하루의 값은
  알 수 없고, 보이려면 범위 밖의 기록 계층을 열어야 한다
- **생성 중 화면에 아무것도 늘지 않는다**(FR-018, 원칙 IV)
- **쓰기를 시작하는 함수는 저장 상태를 볼 수 없다**(FR-013) — 007이 세운 방어
- **`src/ui/`는 `roster`·`assetFor`·`ModelAsset`에 닿을 수 없다**(헌법 검사가 강제)

**Scale/Scope**: 고를 수 있는 하루는 **셋으로 고정**이다. 화면 1개(`DiaryListScreen`의
쓰기 자리), 순수 함수 2곳(`day-boundary.ts`·`state.ts`), 배선 1곳(`DiaryHomeScreen`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 이 기능과의 관계 | 판정 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | **가장 큰 위험이다.** 고를 수 있는 하루가 셋이 되면 「이미 있으면 그것을 보여주자」의 유혹도 셋이 된다. FR-013·019가 막고, **`toWriting()`이 인자를 받지 않는 것**이 구조적 방어다(007이 세웠고 테스트가 `toWriting.length`를 직접 센다) | ⚠️ 감시 후 통과 |
| **II. 화자는 휴대폰이고 시야는 좁다** | **프롬프트를 건드리지 않는다.** 007이 남긴 원칙 II 위반(`quiet`·`narrative`가 기록에 없는 것을 단언)은 프롬프트의 자리이며 spec이 Out of Scope에 명시했다 | ✅ 해당 없음 |
| **III. 모델은 캐릭터다** | 고르는 자리가 늘어도 모델 정보가 실리지 않는다(FR-020). **날짜만 다룬다** — 자산·로스터에 닿을 이유가 없고 헌법 검사가 그것을 구조로 막는다 | ✅ 통과 |
| **IV. 측정 장치를 제품에 들이지 않는다** | 「사흘 중 어느 하루가 좋은가」를 점수로 매기지 않는다. 고르는 것은 사용자다. **생성 중 화면에 아무것도 늘지 않는다**(FR-018) — `ActivityIndicator`에 진행률 파라미터가 없는 것이 007에서 확인된 구조적 방어다 | ✅ 통과 |
| **V. 관측된 사실과 추측을 구분한다** | **둘째 위험이다.** ① `none`/`unknown` 구분이 하루를 거슬러도 유지돼야 한다(FR-016) ② **「사흘 전 사진이 어제처럼 조회된다」는 짐작이며** SC-014가 관측 대상으로 못 박았다 — 못 봤으면 미확인으로 남긴다 | ⚠️ 감시 후 통과 |
| **개발 방식** | 계약을 먼저 정하고 테스트를 먼저 쓴다. 커밋 메시지는 한국어. **한 축을 깊게 파지 않는다** — 프롬프트·기록 계층·달력 선택기가 전부 범위 밖이다 | ✅ 통과 |

**게이트 통과.** 정당화가 필요한 위반이 없으므로 Complexity Tracking은 비운다.

**감시 항목 둘의 방어**:
- **원칙 I** — `toWriting()`이 인자를 받지 않는 것이 방어이며 **이 기능이 그것을
  약화시키지 않는다.** 고른 하루는 `WritePrompt`(아는 것)에 실리고 `toWriting()`은
  여전히 볼 수 없다. **007이 세운 「안다는 것과 그것으로 갈리는 것은 다르다」가
  그대로 유지된다.**
- **원칙 V** — SC-014가 「관측된 대로 기록한다」로 되어 있어 **못 본 것을 본 것처럼
  적을 자리가 없다.** 007이 `none`을 미확인으로 남긴 선례를 따른다.

## Project Structure

### Documentation (this feature)

```text
specs/009-past-day-diary/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 미해결이던 결정 넷
├── data-model.md        # Phase 1 — 타입과 전이
├── quickstart.md        # Phase 1 — 검증 절차
├── contracts/
│   └── write-prompt.md  # Phase 1 — 순수 판정의 계약
├── checklists/
│   └── requirements.md  # /speckit-specify + /speckit-clarify 산출
└── tasks.md             # /speckit-tasks가 만든다 (이 명령이 만들지 않는다)
```

### Source Code (repository root)

```text
src/
├── config/
│   └── day-boundary.ts       # ★ 고칠 자리 — selectableDays() 추가
├── app/
│   └── state.ts              # ★ 고칠 자리 — writePromptFor() 확장
├── ui/
│   ├── DiaryHomeScreen.tsx   # ★ 고칠 자리 — 고른 하루를 들고 생성에 넘긴다
│   ├── DiaryListScreen.tsx   # ★ 고칠 자리 — 고르는 자리
│   └── DayPicker.tsx         # ★ 새 파일 (또는 DiaryListScreen 안)
├── diary/                    # 손대지 않는다 — 이미 day를 받는다
└── signals/                  # 손대지 않는다 — 이미 day를 받는다

__tests__/
├── config/day-boundary.test.ts   # ★ selectableDays 갈래
├── app/state.test.ts             # ★ writePromptFor 확장 갈래
└── ui/diary-list.test.tsx        # ★ 고르는 자리

.maestro/
└── past-day-diary.yml            # ★ 새 흐름 — FLOWS에 등록해야 돈다
```

**Structure Decision**: 기존 구조를 그대로 쓴다. **새 폴더를 만들지 않는다** — 이
기능이 더하는 것은 순수 함수 하나와 화면 조각 하나이며, 둘 다 이미 그런 것들이 사는
자리가 있다.

**`selectableDays()`가 `day-boundary.ts`에 있어야 하는 이유**: `latestClosedDay()`가
거기 있는 것과 같다 — **부르는 쪽에서 「하루씩 빼기」를 하면 04:00이 그 파일 밖으로
새어 나간다.** 004가 `dayBounds()`를 거기 둔 것과 같은 판단이며, 새는 순간 신호 수집과
일기 생성이 서로 다른 하루를 보게 된다.

## Constitution Check — 설계 후 재평가

*Phase 1 산출물(data-model·contracts·quickstart)을 만든 뒤 다시 본다.*

| 원칙 | 설계가 무엇으로 막는가 | 판정 |
| --- | --- | --- |
| **I. 온디바이스** | **I7**(`toWriting.length === 0`)과 **W-T4**(이미 있는 하루를 골라도 `run()`이 불린다)가 센다. 007의 방어가 셋으로 넓어져도 유지된다 | ✅ 통과 |
| **II. 화자·시야** | 프롬프트 계층을 열지 않는다. data-model §7이 `prompt.ts`를 「그대로」로 못 박았다 | ✅ 해당 없음 |
| **III. 모델은 캐릭터** | **X2**가 화면에서 막고, `src/ui/`의 import 금지를 헌법 검사가 강제한다. 이 기능은 **날짜만 다루므로** 자산에 닿을 이유가 없다 | ✅ 통과 |
| **IV. 측정 장치 금지** | **I6**(필드가 정확히 넷)을 **선언을 직접 읽어** 센다. `SelectableDay`도 필드가 둘뿐이다 — **자리가 없으면 담을 수 없다** | ✅ 통과 |
| **V. 사실과 추측** | **X1**이 「알 수 없는 것을 그리지 않게」 막고, quickstart **C5**가 확인 못 한 것을 미확인으로 적게 한다 | ✅ 통과 |
| **개발 방식** | 계약(contracts/)이 코드보다 먼저 있고 검증 표가 테스트가 된다 | ✅ 통과 |

**게이트 재통과.** 설계가 원칙을 약화시키지 않았고, 오히려 **막는 자리를 셋 늘렸다**
(I1·I4·W2).

### 설계에서 새로 드러난 위험 하나

**W2 — `write()`의 `latestClosedDay(at)` 한 줄이 이 기능 전체를 조용히 무력화한다.**

그 줄을 고치지 않으면 화면에서 하루를 골라도 **언제나 어제가 쓰이고 오류는 나지
않는다.** 006의 `GenerationProbe`, 007의 끊긴 `stop`, 008의 버려진 반환값과 **같은
종류**다 — 전부 「아무 일도 일어나지 않을 뿐」이었다.

**방어**: W-T1·W-T3이 대역 파이프라인으로 **받은 하루를 직접 본다.** quickstart
A1의 2번이 그것을 일부러 주입해 그물을 확인한다.

## Complexity Tracking

> 헌법 위반이 없으므로 비어 있다.
