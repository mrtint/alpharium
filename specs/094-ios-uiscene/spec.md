# Feature Specification: Xcode 27 UIScene 대응 — iOS 27 SDK로 빌드해도 앱이 뜬다

**Feature Branch**: `094-ios-uiscene`
**Created**: 2026-10-21
**Status**: Draft
**Input**: 설계 문서 `docs/superpowers/specs/2026-10-21-ios-uiscene-design.md`. 소유자 결정은 요청에서 이미 났다. 선행 092·093.

## Clarifications

### Session 2026-10-21

소유자가 「묻지 말고 끝까지」 정했으므로 아래는 권고안을 소유자 결정 범위 안에서 확정한 것이다.

- Q: 「딥링크」는 무엇을 확인하나? → A: 앱에 `scheme`이 없고 들어오는 딥링크가 없다. 확인 대상은 나가는 `Linking.openURL`(설정 앱 열기 등)과 알림 누름으로 열기뿐이다.
- Q: 안드로이드는? → A: 안드로이드 설정·동작은 바이트 그대로다(`app.json`의 iOS 항목만 건드린다).
- Q: `ios-release.yml`의 Xcode를 고정하나? → A: 고정하지 않는다. 「26 이상」 점검을 유지하고 26.6·27 모두에서 도는 것을 목표로 한다.
- Q: 알림 응답 확인 범위는? → A: 콜드 스타트(앱 종료 상태에서 누름)와 웜(떠 있음/뒤) 모두. 사람이 누를 수 있는 항목만 요청한다.
- Q: `expo` 버전은? → A: `npx expo install --check`와 공식 문서가 보증하는 SDK 57 최신 패치(`~57.0.x`, 57.0.23 이상). `expo-background-task`는 패치에 묶여 그대로 둔다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 새 SDK로 빌드한 앱이 열린다 (Priority: P1)

iPhone 사용자(와 개발자)가 Xcode 27(iOS 27 SDK)로 빌드한 포켓로그를 연다. 앱이 열자마자 죽지 않고 첫 화면이 뜬다.

**Why this priority**: 이 기능의 목적이다. 빌드 도구가 올라가는 순간 TestFlight 빌드가 열자마자 죽는다.

**Independent Test**: Xcode 27 Release 빌드를 iPhone 14에 설치해 실행하고 홈이 뜨는지, 크래시 보고서가 없는지 본다.

**Acceptance Scenarios**:

1. **Given** Xcode 27으로 빌드한 Release, **When** 앱을 연다, **Then** 죽지 않고 홈이 뜬다.
2. **Given** Xcode 26.6으로 빌드(CI), **When** 아카이브/빌드한다, **Then** 종전처럼 성공하고 앱이 열린다.

---

### User Story 2 - 생명 주기가 바뀌어도 기존 동작이 그대로다 (Priority: P1)

앱 생명 주기가 장면(scene) 방식으로 바뀐 뒤에도 앞·뒤 전환, 알림 누름, 딥링크, 백그라운드 작업, 이어 하기가 종전처럼 돈다.

**Why this priority**: 생명 주기 변경은 이들 모두의 진입 경로를 바꿀 수 있다. 하나라도 깨지면 일기가 안 쓰인다.

**Independent Test**: 실기기에서 앞·뒤를 오가고, 쓸 차례 알림을 눌러 쓰기가 시작되는지, 「쓰기」 뒤 앱을 나가도 완성 알림이 오는지 본다.

**Acceptance Scenarios**:

1. **Given** 앱이 떠 있다, **When** 홈 화면으로 나갔다 돌아온다, **Then** 앞·뒤 상태가 종전처럼 반영된다.
2. **Given** 쓸 차례 알림(085)이 와 있다, **When** 앱이 종료된 상태(콜드)나 떠 있는 상태(웜)에서 누른다, **Then** 앱이 열리고 자동 쓰기가 시작된다.
3. **Given** 사진 있는 안 쓴 날, **When** 「쓰기」를 누르고 앱을 나간다, **Then** 이어 하기(092)가 접수되고 저장·완성 알림까지 간다.
4. **Given** 설정 앱 열기 같은 나가는 링크(`Linking.openURL`)를 쓴다, **When** 누른다, **Then** 종전처럼 열린다(들어오는 딥링크는 앱에 없다).
5. **Given** 백그라운드 작업(090·091) 등록, **When** 앱이 시작한다, **Then** 처리기가 종전처럼 등록된다.

### Edge Cases

- 안드로이드는 바뀌지 않는다.
- 콜드 스타트(알림 누름으로 앱이 새로 뜸)와 웜 스타트(이미 떠 있음) 둘 다 알림 응답이 전달돼야 한다.
- 로컬 모듈·`plugins/`의 Info.plist/AppDelegate 손질이 장면 매니페스트와 충돌하지 않아야 한다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 앱은 UIScene 생명 주기를 채택해 빌드된다(`app.json`이 iOS 장면 지원을 켠다).
- **FR-002**: SDK 57을 유지한 채 `expo`는 장면 지원이 있는 패치 버전(57.0.23 이상)이고, 장면 지원을 켜는 빌드 속성 패키지가 정식 의존성이다.
- **FR-003**: `npx expo install --check`가 통과한다(버전을 추측하지 않는다). `expo-background-task`는 패치(`patches/`)와 같은 정확한 버전으로 고정한다.
- **FR-004**: 앞·뒤 전환, 알림 응답(085), 딥링크, BGTask 처리기(090·091), 이어 하기(092)가 종전과 같이 동작한다.
- **FR-005**: 기존 Info.plist 손질(`BGTaskSchedulerPermittedIdentifiers` 등)·entitlements·`expo-background-task` 패치가 prebuild 뒤에도 유지된다.
- **FR-006**: 위 설정은 계약 테스트로 잠긴다. 위반을 주입하면 테스트가 잡는다.
- **FR-007**: Xcode 26.6 CI 빌드가 통과한다.
- **FR-008**: 문서(AGENTS.md 경고, 092 quickstart 「빌드 함정」, 로드맵)에서 임시 우회 설명이 지워지고 완료 이력으로 옮겨진다.
- **FR-009**: 빌드 번호는 올리지 않는다.

### Key Entities

- 없음(설정과 생명 주기 변경이다).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Xcode 27 Release 빌드가 iPhone 14에서 콜드 실행 3회 연속으로 죽지 않고 홈이 뜬다(크래시 보고서 0건).
- **SC-002**: 앞·뒤 전환 3회, 알림 누름 1회, 이어 하기 1회가 종전과 같은 결과를 낸다(쓰기 시작·저장·완성 알림).
- **SC-003**: `npm test`·`npm run lint`·`npx tsc --noEmit`이 0 오류로 통과하고, CI iOS 빌드(Xcode 26.6)가 통과한다.
- **SC-004**: 저장소의 문서에 「Xcode 27 UIScene」 경고가 남지 않는다.

## Assumptions

- 대상 기기는 iPhone 14(iOS 27.0.1)이며 화면 조작은 사람이 한다.
- `expo-background-task`는 패치(`57.0.21`)에 묶여 있어 올리지 않는다.
- `ios-release.yml`은 Xcode 버전을 고정하지 않고 「26 이상」 점검을 유지한다. 워크플로 실행은 요청받았을 때만 한다.
- 빌드 번호·릴리스는 소유자 몫이다.
