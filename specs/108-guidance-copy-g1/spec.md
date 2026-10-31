# Feature Specification: 안내 문구 G1 — 앱 소개·휴대폰 밖으로 나가는 것·iPhone 저절로 써 두기

**Feature Branch**: `claude/epic-franklin-vi373b` (세션 지정 — `108-…`로 바꾸지 않는다)

**Created**: 2026-10-31

**Status**: Draft

**Input**: `docs/user-guidance-rules.md` 0-4 G1(D2-b·D3·D6). 설계: `docs/superpowers/specs/2026-10-31-guidance-copy-g1-design.md`. 트랙: 경량.

## Clarifications

### Session 2026-10-31

질문 0개 — 문구 둘은 brainstorming에서 소유자가 골랐다(슬라이드 4 초안 A, FAQ 초안 A). 아래는 묻지 않고 정한 것이다.

- Q: 캡션 == 슬라이드 1 제목 잠금은 어디에 두나? → A: `__tests__/i18n/download-slides.test.ts`에 한 `it` (에이전트 판단 · 근거: 슬라이드 계약을 이미 잠그는 파일이고 카탈로그 값을 직접 읽는다 — 렌더 없이 싸다)
- Q: 스플래시 렌더 테스트(`logo-screen.test.tsx`)의 옛 문구 단언은? → A: 새 문구로 바꾼다 (에이전트 판단 · 근거: 화면에 보이는지를 보는 테스트라 값만 따라간다)
- Q: FAQ의 HTML 근거 주석에 있는 세 조건(iOS 정책, 실측 아님)은? → A: 주석에서도 걷고 실측(090·091 충전 중·시각은 iPhone)만 남긴다 (에이전트 판단 · 근거: 원칙 V — 「[실측]」 꼬리표 아래 실측 아닌 것을 두지 않는다)
- Q: 골든 예외의 스펙 꼬리표는? → A: `"108"` (에이전트 판단 · 근거: `CHANGED_AFTER_GOLDEN` 선례가 스펙 번호를 쓴다)
- Q: FAQ의 기존 잠금(S9 항목 순서)에 새 단언을 더하나? → A: 더하지 않는다 (에이전트 판단 · 근거: 사용자가 잠금은 하나로 정했고, 나머지 잠금은 G6 몫이다)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 첫 실행의 두 자리가 앱을 같은 말로 소개한다 (Priority: P1)

처음 앱을 연 사람은 스플래시 아래 캡션과 다운로드 중 첫 슬라이드에서 「AI가 쓰는 일기」라는 같은 말을 본다. 첫 슬라이드 본문은 AI가 실수할 수 있다는 것을 말한다.

**Why this priority**: 앱이 무엇인지 처음 듣는 자리가 서로 다른 말을 하고 있었다(규칙 문서 4-5 ③).

**Independent Test**: 카탈로그 값과 계약 테스트로 확인한다(캡션 == 슬라이드 1 제목).

**Acceptance Scenarios**:

1. **Given** 첫 실행, **When** 스플래시가 보이면, **Then** 캡션은 「AI가 쓰는 일기」다.
2. **Given** 다운로드 진행 화면, **When** 슬라이드 1이 보이면, **Then** 제목은 「AI가 쓰는 일기」, 본문은 「주인님의 하루를 글로 남겨요. 실수할 때도 있지만요」다.
3. **Given** 누가 둘 중 하나만 고치면, **When** 테스트를 돌리면, **Then** 실패한다.

---

### User Story 2 - 슬라이드 4가 방침보다 센 말을 하지 않는다 (Priority: P1)

슬라이드 4는 「사진과 일기는 서버로 보내지 않아요」 / 「일기를 쓰는 AI는 이 휴대폰 안에서 돌아요.」라고 말한다. 백업(099)·장소 이름 조회의 좌표 전송(086)과 부딪치지 않는다.

**Why this priority**: 「휴대폰 밖으로 나가지 않아요」는 개인정보처리방침과 반대로 읽힌다(4-5 ②).

**Independent Test**: 카탈로그 값 확인.

**Acceptance Scenarios**:

1. **Given** 다운로드 진행 화면, **When** 슬라이드 4가 보이면, **Then** 위 두 문장이다.

---

### User Story 3 - 지원 FAQ가 잰 적 없는 조건을 늘어놓지 않는다 (Priority: P2)

지원 페이지의 iPhone 「저절로 써 두기」 줄은 「iPhone은 충전 중일 때 저절로 써 둘 수 있고, 언제 쓸지는 iPhone이 정합니다. 써 두지 않았으면 「쓸 차례」 알림을 눌러 시작하세요.」다.

**Why this priority**: 세 조건(앱 전환기에서 밀어 끄기·저전력 모드·백그라운드 앱 새로 고침)은 조건표 `[미확인]`이다(4-6 ①, D3).

**Independent Test**: 지원 페이지 HTML을 읽어 확인한다.

**Acceptance Scenarios**:

1. **Given** 지원 페이지 FAQ 「정한 시각에 일기가 써지지 않아요」, **When** 본문(주석 제외)을 읽으면, **Then** 「저전력」·「앱 전환기」·「새로 고침」이 없고 위 문장이 있다.

### Edge Cases

- 슬라이드 문구에 숫자·퍼센트·용량·시간 단위가 들어가면 기존 045 FR-006 잠금이 실패한다 — 새 문구는 이를 지킨다.
- 같은 문자열이 두 키에 있어 골든 리터럴 집합에는 하나로 합쳐진다(집합 비교라 문구 변화로 보지 않는다).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `welcome.logoCaption`과 `download.slides[0].title`은 「AI가 쓰는 일기」이고 서로 같아야 한다(MUST). 둘이 같음을 계약 테스트가 잠근다.
- **FR-002**: `download.slides[0].body`는 「주인님의 하루를 글로 남겨요. 실수할 때도 있지만요」다(MUST, 소유자 문구 그대로 — R0).
- **FR-003**: `download.slides[3]`은 제목 「사진과 일기는 서버로 보내지 않아요」, 본문 「일기를 쓰는 AI는 이 휴대폰 안에서 돌아요.」다(MUST, 소유자 확정 2026-10-31).
- **FR-004**: 지원 FAQ iPhone 저절로 써 두기 줄은 「iPhone은 충전 중일 때 저절로 써 둘 수 있고, 언제 쓸지는 iPhone이 정합니다. 써 두지 않았으면 「쓸 차례」 알림을 눌러 시작하세요.」이고, 근거 주석도 실측한 사실만 적는다(MUST).
- **FR-005**: 문구 골든 파일은 다시 쓰지 않는다. 바뀐 값은 `CHANGED_AFTER_GOLDEN`에 옛 값과 함께 올린다(MUST).
- **FR-006**: `src/ui/LogoScreen.tsx` 머리 주석의 캡션 서술이 실제 값과 맞는다(MUST).
- **FR-007**: 끝나면 `docs/user-guidance-rules.md` 0-4 표의 G1 행과 4장의 해당 행(`welcome.logoCaption`·`download.slides[0]`·`download.slides[3]`·FAQ iPhone 저절로 써 두기 줄)을 지운다(MUST).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 첫 실행에서 앱을 소개하는 두 자리의 문구가 100% 같다(계약 테스트 통과).
- **SC-002**: 슬라이드 4와 FAQ 줄에 방침·조건표보다 센 문장이 0개다(규칙 문서 4장 해당 행 ⛔·⚔ 0).
- **SC-003**: 기기 불필요 테스트 전부와 린트가 통과한다.

## Assumptions

- 실기기 확인(글꼴 1.0배·2.0배에서 잘리지 않는지, 배포된 지원 페이지)은 클라우드 세션이라 하지 못한다 — PR에 「실기기 확인 대기」로 남긴다(원칙 V: 이것 없이 완료가 아니다).
- 슬라이드 1 본문 끝에 마침표가 없는 것은 소유자 문구 그대로다(R0).
- `app.json` `photosPermission`의 「사진은 휴대폰 밖으로 나가지 않습니다」는 사진 파일에 대해 참이라(방침 같음) 범위 밖이다.
