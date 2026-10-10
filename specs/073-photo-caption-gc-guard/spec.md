# Feature Specification: 사진 있는 날의 VLM 캡션 전량 스킵(SharedObject GC 레이스) 방어

**Feature Branch**: `073-photo-caption-gc-guard`

**Created**: 2026-10-10

**Status**: Ready for Implementation

**Input**: User description: "사진 있는 날의 VLM 캡션 전량 스킵(SharedObject GC 레이스) 방어"

## Clarifications

### Session 2026-10-10

- Q: 시각 엔진에서 캡션 0장으로 실패했을 때, 실패 기록(write-failures.json)의 분류를 어떻게 남길까요? (FR-002) → A: 기존 'vision-failed' 실패 갈래로 기록 (추가 갈래 없이 write-failures.json 및 진단 화면의 기존 체계 유지)


## User Scenarios & Testing *(mandatory)*

### User Story 1 - 사진이 찍힌 날 사진 캡션과 캐러셀이 온전히 담긴 일기 생성 (Priority: P1)

사용자가 스마트폰으로 사진을 찍은 날, 백그라운드 자동 일기 생성이나 수동 일기 쓰기를 실행하면 기기의 VLM이 사진을 정상적으로 해석하여 일기 본문에 사진 내용이 묘사되고 홈 화면 상세에 사진 캐러셀이 정상 표시된다.

**Why this priority**: 이 앱의 핵심 가치는 "휴대폰이 주인의 하루를 관측하여 일기로 쓰는 것"이다. 사진이 있는데도 "사진 속을 보지 못했다"라며 사진이 누락된 일기가 저장되는 것은 핵심 가치를 훼손하는 치명적 결함이다.

**Independent Test**: 사진이 있는 날 생성 실행 시 `signalsUsed.photos`가 `known`이고 `photos` 배열(`usedPhotos`)에 캡션된 사진 정보가 존재하며, 홈 화면에서 사진 캐러셀이 렌더링되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 하루에 1장 이상의 사진이 찍혀 있고 모델이 준비된 상태에서, **When** 일기 생성이 수행되면, **Then** VLM이 사진들을 정상적으로 읽어내어 본문에 사진 내용이 반영되고 사진 캐러셀 메타데이터가 일기 파일에 포함되어 저장된다.
2. **Given** 대형 모델 적재로 인해 네이티브 메모리 압박이 높은 환경에서, **When** 사진 파일 경로 및 메타데이터를 비동기로 조회하면, **Then** Hermes GC에 의해 네이티브 공유 객체가 조기 수거되지 않고 모든 사진 경로가 정상적으로 제공된다.

---

### User Story 2 - 시각 처리 전량 누락 시 거짓 일기 저장 차단 (Priority: P2)

하드웨어 일시 오류나 예기치 않은 시스템 사정으로 관측된 사진의 캡션이 0장으로 끝난 경우, "사진은 쌓였지만 못 봤다"는 거짓 일기를 정상 일기로 영구 저장하지 않고 쓰기 실패(`vision-failed`)로 처리하여 다음 기회에 온전한 일기가 작성될 수 있도록 한다.

**Why this priority**: 헌법 원칙 II("기록에 없는 사실을 단언하지 않는다") 및 원칙 V("관측된 사실과 추측을 구분")를 지키기 위해, 비정상적 침묵 실패로 인한 잘못된 일기 영구 저장을 방어해야 한다.

**Independent Test**: 사진이 1장 이상 주어졌으나 시각 엔진 결과가 0장인 상황을 주입했을 때, 시스템이 일기를 확정 저장하지 않고 쓰기 실패를 반환하며 `write-failures.json`에 원인이 기록되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 후보 사진이 1장 이상 존재하는데, **When** 캡션 결과가 0장으로 반환되면, **Then** 시스템은 `unread` 갈래의 거짓 일기를 생성하지 않고 즉시 시각 처리 실패(`vision-failed`)로 거절한다.
2. **Given** 시각 처리가 실패로 처리된 상태에서, **When** 이후 사용자가 홈에서 「다시 쓰기」를 누르거나 백그라운드 주기가 다시 도래하면, **Then** 새로운 일기 생성을 재시도할 수 있는 상태가 유지된다.

---

### User Story 3 - 네이티브 공유 객체 비동기 호출 패턴의 정적 방어 (Priority: P3)

개발자가 향후 코드를 수정하거나 추가할 때 `expo-media-library`의 네이티브 공유 객체(`Asset`)를 임시 객체로 생성하여 즉시 비동기 메서드를 호출하는 위험한 패턴을 정적 테스트로 사전에 차단한다.

**Why this priority**: JSI/C++ 공유 객체와 Hermes GC 간의 레이스 컨디션은 기기 없는 Jest 단위 테스트에서 드러나지 않으므로, 소스 코드 수준에서 위험 패턴을 정적으로 잠그는 방어벽이 필수적이다.

**Independent Test**: 정적 소스 계약 테스트를 실행하여 `new ...Asset(` 생성 직후 `.getUri()`, `.getLocation()`, `.getExif()`를 체이닝하는 코드가 0건임을 검증한다.

**Acceptance Scenarios**:

1. **Given** 프로젝트의 모든 TypeScript 소스 코드에서, **When** 정적 계약 테스트를 실행하면, **Then** `expo-media-library`의 `Asset` 비동기 메서드가 임시 객체 체이닝으로 호출되지 않음을 확인하고 통과한다.

---

### Edge Cases

- 사용자가 그날 찍은 사진이 0장인 날(`no-photos`): 시각 엔진을 열지 않고 사진 없는 날의 정상 일기(`zero` 갈래)로 안전하게 작성되어야 한다.
- 사진 접근 권한이 없는 날(`unseen`): 시각 엔진을 열지 않고 권한 없는 날의 정상 일기로 작성되어야 한다.
- 사용자가 생성 도중 취소한 경우(`cancelled`): 임시 생성물을 정리하고 안전하게 중단되어야 한다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 사진 파일 실제 경로(`filePathOf`), 폴더명(`folderNamesFor`), 좌표(`locationOf`) 조회 시 네이티브 공유 객체(`Asset`)가 비동기 호출 완료 시점까지 JS 참조를 유지하여 GC에 의해 조기 수거되지 않도록 보장해야 한다.
- **FR-002**: 시스템은 시각 처리 대상 후보 사진이 1장 이상 존재할 때, 캡션 결과가 0장이면 이를 정상 시각 완료로 다루지 않고 실패(`failed` / `vision-failed`)로 처리하며, 실패 기록(`write-failures.json`)에는 기존 `vision-failed` 갈래로 유지 기록해야 한다.
- **FR-003**: 시스템은 시각 처리 대상 사진이 존재하는 날에 대해 "사진 속을 보지 못했다"는 거짓 일기(`unread` 갈래 프롬프트)가 데이터베이스에 영구 저장되는 것을 원천 차단해야 한다.
- **FR-004**: 시스템은 소스 계약 테스트(`__tests__/signals/expo-asset-scope.test.ts`)를 통해 `expo-media-library`의 `Asset` 인스턴스에 대한 임시 객체 비동기 호출 패턴이 없음을 정적으로 검증해야 한다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사진이 1장 이상 존재하는 날에 대해 일기 생성이 완료되었을 때 일기 본문 및 메타데이터에 사진 캡션과 캐러셀 정보가 100% 정상 포함된다.
- **SC-002**: 시각 처리 중 사진 캡션이 0장으로 누락되는 비정상 상황에서 거짓 일기가 저장되는 비율이 0%여야 한다 (즉시 쓰기 실패 처리).
- **SC-003**: 정적 계약 테스트 및 헌법 검사(`npm run lint`)가 위반 0건으로 통과한다.

## Assumptions

- `expo-media-library`의 `Asset.getUri()` 및 `Asset.getLocation()`은 네이티브 I/O 비동기 메서드이므로 JS 스코프 내 참조가 유지되어야 안전하다.
- 후보 사진이 1장 이상 있는데 캡션이 0장인 경우는 하드웨어/메모리/파이프라인 결함이므로 조용히 폴백 일기를 쓰는 것보다 실패로 기록하고 재시도 기회를 제공하는 것이 제품 무결성에 부합한다.
