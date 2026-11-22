# Feature Specification: 동작 줄이기 마저

**Feature Branch**: `127-reduce-motion-remainder`

**Created**: 2026-11-23

**Status**: Draft

**Input**: `docs/superpowers/specs/2026-11-23-reduce-motion-remainder-design.md` (로드맵 「동작 줄이기 마저」, 100의 UX-11 나머지)

## Clarifications

### Session 2026-11-23

- 소유자 결정: (1) iOS 사진 확대 뷰어와 (3) 안드로이드 토글 확인은 한다, (2) 켜진 채 바뀐 OS 값 따르기는 하지 않는다.
- Q: 사진 확대 전환을 어떻게 없앨까? → A: Modal의 전환 종류를 동작 줄이기에 따라 고른다. reanimated 진입·퇴장으로 바꾸지 않는다. (에이전트 판단 · 근거: 파일 하나·변경 최소이고 안드로이드의 창 애니메이션 효과와 같다. 뷰어 안 reanimated 움직임은 범위 밖.)
- Q: OS 값을 모를 때(`undefined`)는? → A: 종전 페이드. (에이전트 판단 · 근거: 헌법 원칙 V, 모르는 것을 기본값으로 채우지 않는다. 내려받기 슬라이드도 같은 규칙이다.)
- Q: 뷰어가 열린 채 OS 값이 바뀌면? → A: 이미 뜬 뷰어는 그대로, 다음에 열 때 현재 값. (에이전트 판단 · 근거: 소유자가 (2)를 하지 않기로 했고 이 경우는 같은 성격이다.)
- Q: 측정 방법은? → A: 100과 같다(녹화 프레임 사이 밝기 차이). iOS는 시뮬레이터에서 켜고 앱을 다시 연 뒤 본다. (에이전트 판단 · 근거: 100의 수치(약 465ms)와 비교하려면 같은 방법이어야 한다.)
- Q: iOS 실패 토스트가 끝내 안 잡히면? → A: 못 잰 이유를 기록하고 닫는다. 제품 코드는 바꾸지 않는다. (에이전트 판단 · 근거: 토스트는 reanimated `withTiming`이라 100이 안드로이드·reanimated 장면에서 재시작 뒤 따름을 이미 확인했고, 재지 못해도 결정이 바뀌지 않는다.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - iPhone에서 사진 확대가 움직임 없이 열리고 닫힌다 (Priority: P1)

OS 「동작 줄이기」를 켠 사용자가 쓴 날의 사진을 눌러 확대할 때, 페이드가 아니라 한 번에 바뀌어야 한다. 지금은 iOS에서 켜도 약 465ms 페이드가 그대로다(안드로이드는 창 애니메이션 배율을 따라 이미 줄어든다).

**Why this priority**: 이 과제에서 코드가 바뀌는 유일한 항목이다.

**Independent Test**: iOS 시뮬레이터에서 동작 줄이기를 켜고 앱을 다시 연 뒤 사진 확대를 열고 닫는 장면을 녹화해 100과 같은 방법(프레임 사이 밝기 차이)으로 전환 길이를 잰다.

**Acceptance Scenarios**:

1. **Given** 동작 줄이기가 켜져 있다, **When** 사진 확대를 열고 닫는다, **Then** 전환이 한 프레임에 일어난다.
2. **Given** 동작 줄이기가 꺼져 있다, **When** 같은 장면을 본다, **Then** 종전의 페이드(약 465ms)다.
3. **Given** 앱이 OS 값을 아직 모른다, **When** 뷰어를 연다, **Then** 종전의 페이드다(모르는 값을 줄임으로 채우지 않는다).
4. **Given** 안드로이드에서 동작 줄이기를 켰다, **When** 사진 확대를 연다, **Then** 종전처럼 한 프레임에 바뀐다(회귀 없음).

---

### User Story 2 - 안드로이드 「애니메이션 제거」 토글의 실제 효과를 안다 (Priority: P2)

SM-S901N에서 토글을 눌렀을 때 세 배율(`transition_animation_scale`·`window_animation_scale`·`animator_duration_scale`)이 어떻게 바뀌는지 기록으로 안다. 100은 배율을 손으로 0.0으로 두고 쟀다.

**Independent Test**: 토글을 켜고 `adb shell settings get global <배율>` 세 값을 읽는다. 그 상태에서 사진 확대 장면도 본다.

**Acceptance Scenarios**:

1. **Given** 토글을 켰다, **When** 세 배율을 읽는다, **Then** 값이 기록에 있고 `window_animation_scale`이 0인지 아닌지가 적혀 있다.

---

### User Story 3 - iOS 실패 토스트를 잴 수 있는 길이 있는지 안다 (Priority: P3)

시뮬레이터에서 개발자 「실패 토스트 보기」 토글이 실제로 눌리고 토스트가 화면에 올라오는지 접근성 트리로 확인한다. 되면 녹화로 켠·끈 상태를 재고, 안 되면 이유를 기록하고 닫는다.

**Acceptance Scenarios**:

1. **Given** 시뮬레이터 개발 빌드, **When** 토글 경로를 시도한다, **Then** 측정값 또는 못 잰 이유가 기록에 있다.

### Edge Cases

- 뷰어가 열린 채 OS 값이 바뀌면: 이미 뜬 뷰어는 그대로, 다음에 열 때 현재 값을 쓴다(훅이 값을 따라간다).
- 뷰어 안의 줌·백드롭 움직임은 이 과제 범위 밖이다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 사진 확대 뷰어는 OS 동작 줄이기가 켜진 것으로 **알려진** 때에만 전환 애니메이션 없이 열리고 닫혀야 한다.
- **FR-002**: 꺼져 있거나 값을 모르면 종전 페이드를 유지해야 한다.
- **FR-003**: 앱이 켜진 채 바뀐 OS 값을 reanimated 장면이 따르게 하는 일은 하지 않는다(소유자 결정 2026-11-23, 범위 밖).
- **FR-004**: 안드로이드 토글 결과와 iOS 실패 토스트 측정 결과(또는 못 잰 이유)를 `quickstart.md`에 남긴다.
- **FR-005**: 소유자 결정을 AGENTS 「동작 줄이기(100, 실측)」에 한 줄로 남기고, 100이 적은 「iOS 사진 확대는 따르지 않는다」 서술은 고친다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: iOS에서 동작 줄이기를 켠 채 사진 확대 열기·닫기가 한 프레임(0ms 수준)이고, 끈 상태는 종전 페이드와 같다(녹화 측정).
- **SC-002**: 안드로이드 SM-S901N에서 같은 장면이 켠 상태 한 프레임, 끈 상태 페이드다.
- **SC-003**: 토글의 세 배율 값과 iOS 실패 토스트 결과가 기록에 있다.

## Assumptions

- 접근성 사용자 관측은 0건이며, 소유자는 (1)·(3)만 하기로 했다.
- `useReduceMotion()`(`src/ui/reduce-motion.ts`)이 이미 OS 값과 변경 알림을 준다.
- 개발 빌드로만 확인하고 릴리스 빌드는 올리지 않는다.
