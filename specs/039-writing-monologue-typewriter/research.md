# Research: 생성 중 독백 문구 타자기 연출

**Feature**: 039-writing-monologue-typewriter | **Date**: 2026-09-11

## 결정 1 — 문구 갱신 시점은 "단계 전환"뿐이다, 자동 주기 교체는 없다

**Decision**: `screen.line`(독백 문구)이 바뀌는 유일한 시점은
`pipeline.run()`의 `onProgress(stage, branch)` 콜백이 새 `(stage, branch)`로
불릴 때다(`DiaryHomeScreen.tsx`의 `generate()` 안, `pickMonologue(stage,
branch, s.line, characterName)` 호출). `stage`가 안 바뀌어도 `branch`만
바뀌면(예: vision 단계의 "보통"→"많음") 새 문구를 고른다(`app/state.ts`
주석 확인). **타이머로 몇 초마다 자동으로 문구를 바꾸는 로직은 이
저장소에 없다.**

**Rationale**: `src/app/state.ts`의 `AppScreen` 타입 주석("stage가 바뀌지
않아도 branch만 갱신될 수 있다")과 `src/diary/pipeline.ts`의 `onProgress`
호출 지점을 확인한 결과다. 이는 스펙 작성 시점의 가정("같은 단계 안에서
몇 초마다 새 문구로 바뀌는지")보다 단순한 실제 — 문구 교체는 파이프라인의
실제 단계 전환에 결부돼 있지 인위적 타이머가 아니다.

**Alternatives considered**: 스펙 문구를 "일정 시간 경과로 교체"라고 썼던
것은 이 사실 확인 전의 보수적 표현이다. 코드에 맞춰 정정하되, FR-001·FR-002는
"문구가 새로 정해질 때마다"라는 상위 표현으로 이미 이 사실과 호환되므로
spec.md를 다시 고치지 않는다(구현 세부는 plan/research가 다루는 것이 맞다).

## 결정 2 — 038의 `TypewriterText`를 그대로 재사용한다, 새 컴포넌트 없음

**Decision**: `src/ui/components/TypewriterText.tsx`(038)를 무수정으로
`DiaryHomeScreen`의 `case "writing"` 블록에서 `screen.line`에 대해 사용한다.
`skipToEnd`는 항상 `false`로 고정(US2 — 탭 건너뛰기 없음). `variant="body"`
(독백 문구는 본문 톤).

**Rationale**: `TypewriterText`는 이미 `key={text}` 리마운트 패턴으로
텍스트가 바뀔 때마다 자동으로 처음부터 다시 타이핑하도록 설계돼 있다
(038 구현) — `screen.line`이 바뀔 때마다 리마운트되는 것이 정확히 이
기능이 원하는 동작(FR-002)과 일치한다. 완료 후 정지 상태 유지(FR-002a,
결정 3)도 `TypewriterText` 자체의 기존 동작(`onDone` 후 `doneRef.current`로
멈춤)과 일치해 추가 로직이 필요 없다.

**Alternatives considered**: 새 경량 컴포넌트를 만드는 안은 기각 —
038에서 이미 grapheme-safe 슬라이싱, 타이머 정리, 완료 감지를 검증했으므로
재사용이 유일하게 합리적인 선택이다(FR-006이 이미 이 방향을 못박음).

## 결정 3 — `onDone`은 무시한다(부모 상태에 반영하지 않는다)

**Decision**: `TypewriterText`의 `onDone` 콜백은 빈 함수(`() => {}`)로
넘긴다. 038처럼 `onDone`이 부모의 `titleDone`/`revealDone` 같은 상태를
바꿔 하위 UI(사진 슬라이더 등)를 게이팅하는 용도가 이 기능에는 없다 —
독백 문구는 완료 후에도 그냥 그 자리에 머무르면 된다(Clarifications,
FR-002a). 새 로컬 state를 만들지 않는다.

**Rationale**: US3(기존 화면 규칙 무변경)가 요구하는 최소 변경 원칙과
맞다 — `onDone`을 받아 처리하는 코드를 추가하면 그 자체가 새로운 상태
관리 로직이 되어 검토 표면을 넓힌다. `TypewriterText`는 `onDone` 호출
여부와 무관하게 이미 완료 후 `graphemeSlice(text, total)`(=전체 텍스트)를
계속 렌더하므로, 상위에서 아무것도 안 해도 FR-002a가 자연히 성립한다.

**Alternatives considered**: 없음 — 이것이 유일하게 상태를 안 늘리는
방법이다.

## 결정 4 — key는 `screen.line`(문구 문자열)이다, `stage`/`branch`가 아니다

**Decision**: `<TypewriterText key={screen.line ?? ""} text={screen.line ??
""} .../>`처럼 `line` 값 자체를 key로 쓴다.

**Rationale**: 038의 `key={props.text}` 패턴을 그대로 따른다 —
`pickMonologue()`가 "이전과 다른 문구"를 보장하므로(같은 `previous`를
필터링) `line`이 바뀌었다는 것 자체가 곧 "새로 타이핑을 시작해야 한다"는
신호와 정확히 일치한다. `stage`/`branch`를 key로 쓰면 같은 stage 안에서
`branch`만 바뀌지 않고 문구만 바뀌는 경우(이론상 없지만 방어적으로) 리마운트가
안 될 위험이 있다 — `line` 직접 사용이 더 안전하고 단순하다.

**Alternatives considered**: `${stage}-${branch}`를 key로 쓰는 안은 기각 —
간접적이고, `line`이 곧 표시되는 값이므로 그것을 직접 key로 쓰는 것이
038의 원칙(표시값과 리셋 조건의 일치)에 더 가깝다.

## 결정 5 — `line`이 `undefined`인 초기 순간은 빈 문자열로 렌더한다

**Decision**: `screen.line`이 아직 `undefined`인 첫 렌더(파이프라인의 첫
`onProgress` 호출 전, `app/state.ts` 주석 FR-011 참조)에는 `TypewriterText`
자체를 렌더하지 않거나 빈 문자열로 렌더해 기존 폴백("쓰고 있다" 고정
문구 — `DiaryHomeScreen.tsx`의 `screen.line ?? "쓰고 있다"`)을 유지한다.

**Rationale**: 기존 코드(`{screen.line ?? "쓰고 있다"}`)가 이미 이
폴백을 갖고 있다 — `TypewriterText`로 교체해도 이 폴백 자체는 유지해야
회귀가 없다(US3). "쓰고 있다"라는 고정 문구도 `pickMonologue()`가 고르는
것과 동일하게 취급해 똑같이 타이핑 연출을 적용한다 — 폴백이라고 예외를
두지 않는다(FR-001이 "독백 문구"라고만 하지 "pickMonologue가 고른
문구"로 한정하지 않았다는 점과 일치).

**Alternatives considered**: 폴백 문구는 타이핑 없이 즉시 렌더하는 안 —
기각. 사용자 입장에서 "쓰고 있다"와 "글을 쓰는 중…"을 구분할 이유가
없고, 오히려 예외를 두면 US1의 일관성("독백 문구가 나타날 때마다")이
깨진다.

## 결정 6 — 새 헌법 규칙 불필요

**Decision**: `scripts/constitution-rules.ts`에 이 기능을 위한 새 검사를
추가하지 않는다.

**Rationale**: 038이 도입한 `checkSourceFile`류 규칙(UI가 진단·프롬프트
계층에 닿지 못하게 막는 것 등)이 이미 이 기능이 건드리는 파일
(`DiaryHomeScreen.tsx`)에 적용되고 있고, 이 기능은 새 import·새 경계를
만들지 않는다 — 기존 `TypewriterText` import를 재사용할 뿐이다.

**Alternatives considered**: 없음.
