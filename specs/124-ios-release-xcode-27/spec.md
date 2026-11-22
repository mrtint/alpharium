# Feature Specification: iOS 릴리스를 Xcode 27(iOS 27 SDK)로 빌드한다

**Feature Branch**: `124-ios-release-xcode-27`
**Created**: 2026-11-22
**Status**: Draft
**Input**: `docs/superpowers/specs/2026-11-22-ios-release-xcode-27-design.md` (로드맵 「iOS 릴리스를 iOS 27 SDK(Xcode 27)로 빌드한다 — ITMS-90725」)

## Clarifications

### Session 2026-11-22

- Q: 러너 라벨이 `xcode-27`이 아니면 어떻게 되는가? → A: 이 과제는 `xcode-27`로 간다. 라벨이 없거나 막히면 워크플로가 시작되지 않으므로 그때 로컬 Xcode 27 아카이브로 과제를 다시 정한다 (에이전트 판단 · 근거: 설계문서가 대안을 이미 적었고 라벨의 실사용 여부는 돌려 봐야만 안다)
- Q: 사전 점검의 최소 Xcode를 27로 올리는가? → A: 올린다. 러너가 Xcode 27 미만이면 실패해야 같은 경고가 조용히 되살아나지 않는다 (에이전트 판단 · 근거: 로드맵 할 일에 명시)
- Q: 실행 요약 제목의 라벨을 어떻게 적는가? → A: 새 러너 라벨 `xcode-27`을 글자 그대로 적는다 (에이전트 판단 · 근거: 지금 제목이 라벨을 그대로 적는 규약이고 계약 테스트가 `macos-latest` 잔존을 막기 쉽다)
- Q: 안드로이드 릴리스 워크플로나 AGENTS.md의 iOS 서술도 바꾸는가? → A: 워크플로는 바꾸지 않는다. 문서는 사실이 바뀐 곳만 고친다 (에이전트 판단 · 근거: 안드로이드는 이 경고와 무관하고, 문서에서 `macos-latest`·Xcode 26을 말하는 곳이 있으면 구현 때 찾아 고친다)

- Q: `native-build.yml`의 iOS 시뮬레이터 빌드(`macos-latest`)도 Xcode 27로 올리는가? → A: 올리지 않는다. 범위 밖이다 (에이전트 판단 · 근거: ITMS-90725는 스토어 업로드 경고이고 이 빌드는 업로드하지 않는다. 올리면 시뮬레이터 빌드 검증이 프리뷰 러너에 묶인다)
- Q: Xcode 27 러너에서 Swift 모듈(`#if compiler(>=6.4)`)의 비동기 제출 갈래가 처음 컴파일되는데 따로 다루는가? → A: 따로 고치지 않는다. 새 빌드에서 컴파일되는지만 못 본 것에 적는다 (에이전트 판단 · 근거: 같은 갈래를 로컬 Xcode 27.2 Release가 iPhone 14에서 이미 컴파일·실행했다, 092·094)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 릴리스가 iOS 27 SDK로 만들어진다 (Priority: P1)

저장소 소유자가 iOS 릴리스를 돌리면 빌드가 Xcode 27(iOS 27 SDK)로 만들어진다. 러너의 Xcode가 27 미만이면 비싼 아카이브 전에 이름을 밝히며 실패한다.

**Why this priority**: 2027년 4월부터 iOS 27 SDK 미만 빌드는 업로드·제출이 거절된다(ITMS-90725). 지금은 경고 메일만 온다.

**Independent Test**: 릴리스 워크플로 정의와 계약 테스트로 러너 값과 사전 점검 값을 읽어 확인한다. 실제 빌드는 새 빌드를 스토어에 올려야 확인된다.

**Acceptance Scenarios**:

1. **Given** 릴리스 워크플로, **When** 러너를 읽으면, **Then** Xcode 27 러너 라벨이다.
2. **Given** 러너의 Xcode 주 버전이 27 미만, **When** 사전 점검이 돌면, **Then** 아카이브 전에 실패하고 러너의 Xcode 이름을 밝힌다.
3. **Given** 릴리스가 끝난 뒤, **When** 실행 요약을 읽으면, **Then** 제목이 실제 러너 라벨을 말하고 Xcode 버전 줄이 있다.

---

### Edge Cases

- 러너 라벨이 프리뷰라 쓸 수 없으면 워크플로가 시작되지 않는다. 그때는 로컬 Xcode 27로 아카이브해 올리는 길로 이 과제를 다시 정한다.
- 러너 Xcode 27에서 `pod install`·아카이브가 실패하면 그 오류를 읽어 이 과제 안에서 고칠지 다시 정한다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: iOS 릴리스 워크플로의 러너는 Xcode 27 라벨(`xcode-27`)이다. `macos-latest` 글자가 워크플로에 남지 않는다.
- **FR-002**: 사전 점검은 러너의 Xcode 주 버전이 27 미만(또는 읽지 못함)이면 실패한다.
- **FR-003**: 실행 요약 제목은 러너 라벨을 따른다(`xcode-27`).
- **FR-004**: 계약 테스트가 FR-001~003의 값을 잠근다.
- **FR-005**: 앱 설정(`app.json`, 배포 목표, 장면 지원)과 `native-build.yml`은 바꾸지 않는다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 워크플로 계약 테스트가 새 값을 기대하고 통과한다.
- **SC-002**: 새 빌드를 올린 실행 요약의 Xcode가 27이고 같은 ITMS-90725 경고 메일이 오지 않는다. 스토어에 빌드를 올려야 알 수 있어 이 PR의 범위 밖 확인 항목이다.

## Assumptions

- `xcode-27`은 러너 이미지 문서에 있는 프리뷰 라벨이다. 이 저장소에서 쓸 수 있는지(비용 포함)는 돌려 봐야 안다.
- `-sdk iphoneos`는 러너 Xcode를 따르므로 SDK 버전을 따로 적지 않는다.
- 배포 목표 16.4와 `enableSceneSupport: true`는 로컬 Xcode 27.2 Release가 iPhone 14에서 이미 돈다(094).
