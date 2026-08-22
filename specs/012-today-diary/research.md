# Research: 오늘의 일기

Phase 0. 기술적 미확정 사항을 정리한다.

## §1. 정오를 어디서 계산하는가

**Decision**: `src/config/day-boundary.ts`에 `WRITABLE_FROM_HOUR = 12` 상수를 두고,
`DAY_STARTS_AT_HOUR`(04:00)와 나란히 둔다. 오늘이 쓸 수 있는지는 `isDayWritable(day, now)`
같은 새 함수 하나로 답한다.

**Rationale**: `dayOf()`·`dayBounds()`·`latestClosedDay()`·`selectableDays()`가 전부
"04:00은 여기 하나에만 있다"는 원칙(FR-021a, 002)을 지키고 있다. 정오도 같은 성격의
상수다 — 부르는 쪽이 `now.getHours() >= 12`를 직접 계산하면 하루 경계와 마찬가지로
새 곳에서 다시 계산하는 순간 신호 수집·화면·프롬프트가 서로 다른 판단을 할 수 있다.

**Alternatives considered**:
- **`selectableDays()` 안에서만 판단하고 별도 함수를 안 둔다** — 거부. `write()`가
  "지금 오늘을 쓸 수 있는가"를 이미 고른 하루와 무관하게 물어야 하는 지점(FR-002
  안내 문구)이 있어, 판정 자체를 재사용 가능한 함수로 분리하는 것이 낫다.
- **자정 이후 몇 시간 뒤(예: 06:00)를 기준으로 한다** — 거부. spec Clarifications가
  이미 정오로 확정했다(사용자 결정 근거: 하루가 절반은 지나야 짐작할 근거가 쌓인다).

**정오와 04:00의 관계**: 서로 다른 축의 경계다. 04:00은 "어느 하루에 속하는가"(하루의
시작), 정오는 "그 하루를 지금 쓸 수 있는가"(쓰기 가능 시점)다. 04:00에 딸린 계산이
아니라 독립된 상수로 둔다.

## §2. `selectableDays()`를 어떻게 넓히는가

**Decision**: 기존 `selectableDays(now)`의 시그니처를 유지하되, 내부에서 정오
여부를 판단해 반환하는 세 하루의 구성을 바꾼다.

```
정오 이전: [어제, 그제, 그그제]   (지금과 동일 — latestClosedDay(now)부터 셋)
정오 이후: [오늘, 어제, 그제]     (그그제가 빠지고 오늘이 맨 앞에 온다)
```

**Rationale**: spec Clarifications가 "개수는 언제나 정확히 셋", "오늘이 그그제를
밀어낸다"로 확정했다(사용자 결정, FR-001a). `SELECTABLE_DAY_COUNT = 3`이라는 상수
이름과 의미(009 FR-003 "고를 수 있는 하루의 개수")는 그대로 유지되지만, **그 셋을
구성하는 알고리즘이 "언제나 지난 사흘"에서 "정오를 조건으로 갈리는 최근 사흘"로
바뀐다** — 값이 아니라 구성 규칙의 변경이다.

**오늘이 닫히지 않은 것을 어떻게 표현하는가**: `SelectableDay`(`app/state.ts`)가
지금은 `{ day, hasDiary }`뿐이다. "이 하루가 아직 끝나지 않았다"를 화면이 알아야
하는지(정오 이후 안내 문구를 위해)는 Phase 1 data-model에서 결정한다 — 후보는
① `SelectableDay`에 `stillOpen?: boolean` 같은 필드를 추가하거나, ② 화면이
`day === todayOf(now)`로 직접 비교하는 것. ①은 007·009가 "판정은 순수 함수가
하고 화면은 보지 않는다"는 패턴을 지키므로 우선 후보다.

**Alternatives considered**:
- **오늘을 넷째로 추가하고 `SELECTABLE_DAY_COUNT`를 4로 올린다** — 거부(사용자
  결정). "애초에 쓸 수 없는 그그제를 계속 보여줄 이유가 없다"는 것이 근거였다.

## §3. 사진 200장 상한을 어떻게 없애는가

**Decision**: `collect.ts`의 `DEFAULT_PHOTO_LIMIT`과 "`limit + 1`을 물어 잘렸는지
판정"하는 로직을 제거한다. `PhotoPort.photosBetween(fromMs, toMs)`에서 `limit`
파라미터를 없애고, `expo-port.ts`의 `Query`에서 `.limit()` 호출을 제거한다.
`PhotoObservation.complete`는 **타입에서 제거하지 않는다** — FR-016(조회 실패는
`unknown`)이 있는 한 "이것이 그날의 전부인가"라는 질문 자체는 여전히 유효하고,
값은 언제나 `true`가 되거나(성공하면 전부를 봤으므로) 애초에 `SignalValue`가
`unknown`이 되어 `PhotoObservation`까지 도달하지 않는다.

**Rationale**: spec FR-014·015가 이미 상한 제거를 요구사항으로 확정했다(사용자
결정, 2026-08-22 clarify). `TRUNCATED_WARNING`을 촉발하는 조건(`!complete`)이
사라지므로 그 상수와 `instructionLines()`/`signalLines()`의 관련 분기도 함께
정리 대상이다 — 다만 **완전히 지울지, "값이 always true가 되어 자연히 안 뜨는
채로 남길지"는 아래 §5(영향 범위)에서 결정한다.**

**Alternatives considered**:
- **상한을 유지하되 아주 크게(예: 5000) 늘린다** — 거부. spec이 "상한을 아예
  없앤다"로 명시적으로 확정했다. 큰 수를 남기면 "왜 5000인가"라는 새로운 짐작값이
  헌법 원칙 V를 다시 건드린다.
- **004의 `균일 선택`(011의 `selectForVision`) 방식으로 바꾼다** — 거부. 011의
  선택은 VLM 캡션 5장을 고르는 별개 계층이고, 004/012의 관심사는 "그날 사진이
  전부 수집 대상에 들어가는가"이지 "몇 장을 보여줄까"가 아니다. 섞으면 004와
  011의 경계(로드맵이 세운 "캐릭터와 무관한 사진 보는 모델")가 흐려진다.

## §4. 사진 무제한 조회 시 `expo-media-library`가 실제로 어떻게 동작하는가

**미확정 — 실기기 확인이 필요하다(원칙 V).**

`Query.limit()`의 타입 선언(`node_modules/expo-media-library/build/types/Query.d.ts`)은
"결과 개수의 상한을 정한다"고만 적혀 있고, **`.limit()`을 아예 호출하지 않았을 때의
기본 동작(무제한인지, 네이티브 쪽에 숨은 기본 상한이 있는지)은 타입 주석에 없다.**

**Decision (잠정)**: `.limit()` 호출을 아예 생략한다. 코드 구현 후 실기기에서
사진이 많은 날짜 구간(합성 데이터, 010의 seed 도구로 가능)을 대상으로 실제 반환
개수와 소요 시간을 재서 확정한다.

**남은 질문(quickstart D 항목으로 넘긴다)**:
- `.limit()` 없이 수백 장 조회 시 시간이 어느 정도인가(Performance Goals의 실측 근거)
- 네이티브 쿼리 계층에 안드로이드 자체의 숨은 페이지 상한이 있는가

## §5. 사진 상한 제거가 다른 파일에 미치는 영향 범위

기존 `DEFAULT_PHOTO_LIMIT`을 참조하거나 "같은 성격의 값"으로 언급하는 자리가 셋
있다(코드베이스 조사, 2026-08-22):

| 파일 | 참조 방식 | 이 기능에서 할 일 |
| --- | --- | --- |
| `src/signals/collect.ts` | 상수 정의, `limit + 1` 조회, 잘림 판정 | 상수·잘림 판정 제거 |
| `src/vision/select.ts` | 주석에서 "같은 성격의 값"으로만 언급 | **손대지 않는다** — 011의 캡션 5장 선택은 별개 상수(`VISION_PHOTO_LIMIT`류)이며 004의 상한과 무관하다 |
| `src/inference/llama-port.ts`, `src/inference/sampling.ts` | 주석에서 "같은 성격의 값"으로만 언급 | **손대지 않는다** — 추론 파라미터 짐작값에 대한 비유일 뿐 실제 의존이 아니다 |

**Decision**: `collect.ts`만 고친다. 다른 두 파일의 주석은 "값의 성격이 같다"는
비유이지 `DEFAULT_PHOTO_LIMIT`을 import하거나 참조하는 것이 아니므로(grep으로
확인, import 없음) 코드 변경이 전파되지 않는다. 다만 주석이 이제 존재하지 않는
상수를 언급하게 되므로, 해당 주석의 문구를 "004가 한때 두었던 상한과 같은
성격"처럼 과거형으로 다듬는 것을 Phase 2(tasks)에서 검토한다 — 필수는 아니다
(코드 동작에 영향 없음).

## §6. 덮어쓰기 확인을 상태 기계에 어떻게 넣는가

**Decision**: `AppScreen`에 새 갈래(가칭 `confirm-overwrite`)를 추가한다. 이
갈래가 담는 것은 **쓰려는 날짜 하나뿐**이다 — 007이 `toWriting()`을 무인자로
설계한 이유(원칙 I, "안다는 것과 그것으로 갈리는 것은 다르다")가 여기서도
그대로 적용된다.

```
list --[일기 쓰기 누름 + 이미 있음]--> confirm-overwrite --[확인]--> writing --...
                                              |
                                              +--[취소]--> list
list --[일기 쓰기 누름 + 없음]--------------------------> writing --...
```

`confirm-overwrite`에서 `writing`으로 가는 전이가 이번에 새로 필요한 유일한 화면
전이다. **`toWriting()`은 여전히 인자를 받지 않는다** — `confirm-overwrite` 갈래가
들고 있던 날짜를 그대로 파이프라인에 넘길 뿐, "이미 있는 일기를 보여주는" 지름길이
생기지 않는다.

**Rationale**: 007이 명시적으로 "확인 화면을 따로 두지 않는다"(FR-002b, "누르기
전 예고"로 충분하다고 판단)고 결정했던 것을 이 기능이 뒤집는다 — spec US3이
사용자 결정으로 "누른 뒤 확인"을 요구했다(오늘 쓰기가 열리면 하루에 여러 번 누를
상황이 흔해진다는 근거). **007의 결정을 무효화하는 것이 아니라, 007 이후에 늘어난
사용 빈도라는 새 정보에 대한 갱신이다** — spec의 "왜 이 기능인가"에 이미 근거가
있다.

**Alternatives considered**:
- **`Alert.alert()`(React Native 코어 대화상자)로 처리하고 `AppScreen`에 갈래를
  안 늘린다** — 검토 대상으로 남긴다. 새 의존이 없고 코드가 단순해지지만, 이
  저장소는 지금까지 `AppScreen`의 판정을 전부 순수 함수(`state.ts`)에 두고
  네이티브 다이얼로그를 쓴 전례가 없다 — 테스트가 `Alert.alert`를 모킹해야
  하는 새로운 패턴이 생긴다. Phase 1에서 두 방식의 테스트 용이성을 비교해
  최종 결정한다.

## §7. 축 제외 상수를 어디에 두는가

**Decision**: `src/signals/types.ts`에 `DaySignals`의 각 필드와 나란히, 사용자
화면·프롬프트에 노출할지를 사람이 적은 상수를 둔다(가칭
`USER_VISIBLE_SIGNAL_AXES` 또는 개별 boolean 상수 — Phase 1 data-model에서
이름과 모양을 확정한다).

**Rationale**: 헌법 원칙 V "관측 통로가 없는 축"(1.1.0)이 "축마다 관측 가능 여부를
사람이 정해 상수로 못박고, 통로가 생기면 그 상수를 고친다(MUST)"고 명시했다.
`signals/types.ts`가 이미 `DaySignals`·`SignalValue`의 유일한 정의처이므로,
"이 축을 사용자에게 보이는가"도 같은 자리에 있어야 값과 노출 여부가 따로 놀지
않는다.

**`prompt.ts`와 `DiaryDetailScreen.tsx`가 같은 상수를 본다**: 004의 `collect.ts`가
원칙 V의 값 방어선이고 005의 `prompt.ts`가 언어 방어선이었던 것처럼, 이 상수가
"어느 축을 보여주는가"의 유일한 방어선이 된다. 두 파일이 각자 판단하면 화면과
프롬프트가 어긋날 수 있다.

**Alternatives considered**:
- **`prompt.ts`와 `DiaryDetailScreen.tsx`에 각자 하드코딩한다** — 거부. 006~011이
  반복해서 겪은 "조용한 배선 끊김"과 같은 위험(한쪽만 고치고 한쪽을 잊는다)을
  만든다.

## §9. ★ `pipeline.ts`의 1단계 게이트가 지금 "오늘"을 전부 거부한다

**코드 조사로 드러난 것 — 이 기능의 가장 큰 배선 위험이다.**

`createPipeline()`의 `runStages()` 1단계가 이렇다(`src/diary/pipeline.ts:127-130`):

```ts
if (!isDayClosed(input.day, input.now)) {
  return stop("day-not-closed", `${input.day}는 아직 닫히지 않았다`);
}
```

**`isDayClosed(day, now)`는 `dayOf(now) > day`다** — 오늘은 정의상 `dayOf(now) === day`이므로
**언제나 `false`를 반환하고, 파이프라인은 언제나 `day-not-closed`로 멈춘다.** 이것이
006에서 "오늘은 정의상 닫히지 않아 언제나 `day-not-closed`로 멈춘다"고 AGENTS.md가
이미 적어 둔 바로 그 게이트다 — 006 당시엔 "그러니 어제를 쓴다"가 해법이었지만,
012는 정확히 이 게이트를 열어야 하는 기능이다.

**Decision**: 이 조건을 **"닫혔거나(지난 하루), 또는 오늘이면서 정오를 지났다"**로
넓힌다:

```ts
const closed = isDayClosed(input.day, input.now);
const writable = closed || (input.day === dayOf(input.now) && isPastNoon(input.now));
if (!writable) {
  return stop("day-not-closed", `${input.day}는 아직 닫히지 않았다`);
}
```

(정확한 헬퍼 이름·형태는 §1의 `isDayWritable(day, now)`와 합쳐 Phase 1
contracts에서 확정한다 — `day-boundary.ts`에 "이 하루를 지금 쓸 수 있는가"를
한 번에 답하는 함수를 두고 파이프라인이 그것 하나만 부르는 것이 유력하다.)

**왜 이것이 핵심 위험인가**: 006의 `GenerationProbe`, 007의 끊긴 `stop` 배선, 008의
버려진 반환값, 009의 `latestClosedDay(at)` 한 줄과 **완전히 같은 성격의 실패다** —
화면(`DayPicker`)에서 오늘을 고르는 UI를 아무리 잘 만들어도, **이 한 줄을 고치지
않으면 "일기 쓰기"를 누르는 순간 오류 없이 `day-not-closed`로 조용히 막힌다.**
사용자는 "오늘을 골랐는데 왜 안 써지지"라는 것만 보고 원인을 알 수 없다.

**방어**: tasks 단계에서 파이프라인이 실제로 받은 `day`와 `now`로 이 게이트를
직접 통과시키는 테스트를 **먼저** 쓴다(009의 W-T1이 "대역 파이프라인이 받은
프롬프트를 직접 읽는다"로 같은 종류의 실패를 잡은 선례를 따른다) — "일기가
생성됐다"만으로 통과시키지 않고, **정오 이후 오늘을 넘겼을 때 `day-not-closed`가
아닌 다음 단계로 실제로 진행하는지**를 검사한다.

## §8. "하루의 끝" 문장을 프롬프트의 어디에 넣는가

**Decision**: `buildPrompt()`의 신호 목록(`signalLines()`) 앞뒤가 아니라, 신호와
독립된 자리 — `SPEAKER_RULES`처럼 하루 전체에 대한 진술로 넣는다. 구체적 위치는
`${request.signals.date}에 네가 본 것:` 줄 앞이나 뒤, Phase 1 contracts에서
정확한 순서를 확정한다.

**Rationale**: spec Clarifications가 "사진 축에 얹지 않고 하루에 대한 별도 문장으로
둔다"로 이미 결정했다(로드맵 결정 (c) 계승) — 사진 권한이 없는 사용자에게도
전달되어야 하므로 `TRUNCATED_WARNING`(사진 조건부 삽입)과 다른 자리에 있어야
한다. `instructionLines()`의 되뱉기 판정 비교 대상에도 이 줄이 들어가야
한다(005 FR-016b-1 패턴) — 신호 값을 담지 않는 고정 문구이므로 오탐 위험이 없다.

**"오늘 신호가 아직 다 안 모였다"를 프롬프트가 어떻게 아는가**: `pipeline.ts`가
이미 `isDayClosed(day, now)`를 갖고 있다(`day-not-closed` 단계 판정에 쓰는 바로
그 함수) — `!isDayClosed(day, now)`가 "이 하루가 아직 열려 있다"와 정확히 같은
뜻이다. **새 계산을 만들지 않는다.** `buildRequest()`(`src/diary/request.ts`)가
파이프라인으로부터 `now`를 받는 자리이므로, 여기서 `isDayClosed()`를 호출해
얻은 boolean을 `DiaryRequest`에 새 필드(가칭 `dayStillOpen: boolean`)로 실어
`buildPrompt()`에 넘긴다. **`buildPrompt()`는 여전히 `now`를 읽지 않고 결정적으로
남는다**(P6 유지) — 오늘인지 여부는 이미 계산된 값으로 전달받을 뿐이다.

이 흐름은 004가 `dayBounds()`를 한 곳에 두고 `collect.ts`가 그것을 호출하는 것과
같은 모양이다: **판정 함수(`isDayClosed`)는 하나이고, 여러 호출자(파이프라인의
단계 판정, 이제 `buildRequest`)가 각자의 목적으로 같은 함수를 재사용한다.**

### FR-005("아직 일어나지 않은 일을 단언하지 않는다")는 새 판정을 만들지 않는다

**`/speckit-analyze`에서 나온 질문**: FR-005는 요구사항으로 있는데 이걸 검증하는
전용 태스크가 없다 — 이유는 **새로 만들 것이 없기 때문이다.**

`SPEAKER_RULES`(`src/diary/prompt.ts`)가 이미 "기록에 있는 것만 쓰고, 기록에
없는 사물이나 사건을 있었던 것처럼 단언하지 마라"를 모든 요청에 무조건 포함한다
(005부터 있던 규칙, 006~011 실측에서 반복 검증됨). `DAY_STILL_OPEN` 문장은 이
일반 규칙 위에 **사실 하나**("하루가 아직 안 끝났다")를 더할 뿐이고, "그 뒤 일을
단언하지 말라"는 지시는 이미 `SPEAKER_RULES`가 모든 캐릭터·모든 하루에 대해
하고 있다.

**그래서 FR-005는 새 지시문이나 새 판정 갈래가 필요 없다** — `DAY_STILL_OPEN`을
추가하는 것 자체(T015~T017)가 FR-003·FR-004를 만족시키는 동시에, 기존
`SPEAKER_RULES`가 FR-005를 이미 만족시킨다. **다만 이것은 프롬프트 설계로
"충분히 커버된다"는 논리적 근거이지 실측이 아니다** — AGENTS.md가 005~011에서
반복 기록했듯 `SPEAKER_RULES`만으로도 캐릭터에 따라 단언 위반이 실기기에서
나온 적이 있다(005·006·007·011 전부). **오늘 쓰기 특유의 새로운 위반 양상
(예: "저녁에 뭘 했을지"를 단언하는 것)이 나올 수 있으므로, quickstart D2·D3
(T041·T042)에서 실기기로 이 문장이 실제로 어떤 반응을 끌어내는지 관찰하고
AGENTS.md에 남긴다(T049)** — 새 판정 갈래를 만들지 않되(원칙 IV), 관찰은
정직하게 기록한다(원칙 V).
