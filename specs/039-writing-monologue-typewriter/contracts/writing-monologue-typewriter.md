# Contract: 생성 중 화면의 독백 문구 타자기 렌더

**Feature**: 039-writing-monologue-typewriter

대상: `src/ui/DiaryHomeScreen.tsx`의 `case "writing"` 블록.

## A — 렌더 계약

- **C1**: `case "writing"`은 `screen.line`(또는 그것이 `undefined`일 때
  폴백 `"쓰고 있다"`)을 `TypewriterText`로 렌더한다 — 이전처럼 `AppText`로
  즉시 렌더하지 않는다.
- **C2**: `TypewriterText`에 넘기는 `charMs`는 `REVEAL.charMs`(038,
  `src/ui/theme/tokens.ts`)와 **같은 값**이어야 한다 — 별도 상수를
  새로 만들지 않는다(FR-007).
- **C3**: `skipToEnd`는 항상 `false`다 — 이 화면에 탭 건너뛰기 상호작용이
  없다(FR-004, US2). 리터럴 `false`를 직접 넘긴다(상태로 관리하지 않음).
- **C4**: `key`는 렌더되는 문구 문자열 자체(`screen.line ?? "쓰고
  있다"`)여야 한다 — 문구가 바뀔 때마다 컴포넌트가 리마운트되어 처음부터
  다시 타이핑한다(FR-002, data-model.md 상태 다이어그램).
- **C5**: `onDone`은 호출되어도 아무 상태도 바꾸지 않는 빈 함수여야
  한다 — 이 화면에 `TypewriterText`의 완료를 관찰해 분기하는 로직이
  없다(연구 결정 3).
- **C6**: `variant="body"`로 렌더한다(제목이 아니므로).
- **C7**: 회전 표시(`ActivityIndicator`)와 "그만두기" `Pressable`은
  **무변경**이어야 한다 — 이 계약이 건드리는 것은 문구 렌더 한 줄뿐이다
  (US3, FR-005).

## B — 회귀 방지 계약

- **C8**: `case "detail"`·`case "written"`·`case "failed"`·
  `case "confirm-overwrite"`·`case "list"`·`case "build-error"`·
  `case "unreadable"` 블록은 이 기능으로 **한 글자도 바뀌지 않는다** —
  변경 범위는 `case "writing"` 블록 내부로 한정된다.
- **C9**: `src/diary/`·`src/inference/`·`src/vision/`·`src/app/state.ts`는
  이 기능으로 **0줄** 변경된다(`git diff --stat`로 확인, 038의 SC-006과
  동일한 검증 방식).
- **C10**: 기존 `writing-monologue.yml`·`writing-monologue-expansion.yml`
  Maestro 흐름(015·016)이 이 기능 적용 후에도 여전히 PASS해야 한다 —
  이 흐름들은 "쓰고 있다"가 사라지는 것과 실패 문자열 부재만 확인하므로,
  문구가 타이핑되는 도중에도 최종적으로 "쓰고 있다"가 사라지는 시점(생성
  완료)까지는 화면 전환에 영향이 없어야 한다.

## C — 테스트 전략

- **jest(`ui` 프로젝트)**: `DiaryHomeScreen`을 `screen.kind === "writing"`
  상태로 렌더해, 위 C1~C7을 RNTL로 검증한다. 038의
  `typewriter-text.test.tsx`가 이미 `TypewriterText` 자체의 정확성(글자
  단위 진행, `skipToEnd`, 언마운트 정리 등)을 잠갔으므로, 이 계약
  테스트는 **`DiaryHomeScreen`이 그 컴포넌트를 올바른 props로 부르는가**만
  본다 — `TypewriterText` 내부 로직을 다시 테스트하지 않는다(중복
  방지).
- **Maestro**: 새 흐름을 만들지 않는다(C10) — 기존 015·016 흐름의 회귀
  확인으로 충분하다. 038처럼 "타이핑이 진행 중이라 assertVisible이
  본문을 못 볼 수 있다"는 위험이 실제로 존재하는지 조사한다(038의
  T031과 동일한 방법론 — 실제로 이 저장소의 흐름이 생성 중 화면의
  문구를 assert하는지 먼저 확인 후 필요할 때만 스텝 추가).
