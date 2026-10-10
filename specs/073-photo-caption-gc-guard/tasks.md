# Tasks: 사진 있는 날의 VLM 캡션 전량 스킵(SharedObject GC 레이스) 방어

**Input**: Design artifacts from `/specs/073-photo-caption-gc-guard/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/vlm-guard-contract.md, quickstart.md

## Phase 1: Setup

**Purpose**: Test execution setup and verification baseline

- [x] T001 Verify test runner and baseline contract tests pass via package.json

---

## Phase 2: Foundational

**Purpose**: Core contract definitions that block user stories

- [x] T002 Verify VLM guard contract and Asset scope rules in specs/073-photo-caption-gc-guard/contracts/vlm-guard-contract.md

---

## Phase 3: User Story 1 - 사진이 찍힌 날 사진 캡션과 캐러셀이 온전히 담긴 일기 생성 (Priority: P1) 🎯 MVP

**Goal**: `expo-media-library`의 `Asset` 인스턴스가 비동기 I/O 완료 시점까지 JS 참조를 유지하여 Hermes GC 조기 수거 레이스 방지

**Independent Test**: `src/signals/expo-port.ts`의 `filePathOf`, `folderNamesFor`, `locationOf`가 비동기 실행 도중 임시 객체 해제 없이 유효한 경로 및 메타데이터를 반환하는지 단위 테스트로 확인

- [x] T003 [P] [US1] Add unit tests for Asset reference preservation across async operations in __tests__/signals/expo-port.test.ts
- [x] T004 [US1] Implement Asset reference retention in filePathOf, folderNamesFor, and locationOf in src/signals/expo-port.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 시각 처리 전량 누락 시 거짓 일기 저장 차단 (Priority: P2)

**Goal**: 후보 사진이 1장 이상 주어졌으나 시각 엔진 결과가 0장인 경우 `unread` 거짓 일기를 쓰는 대신 `vision-failed`로 거부

**Independent Test**: `captionAll`이 0장 캡션을 반환할 때 `readPhotos`가 `{ kind: "failed" }`를 반환하고 `generate()`가 `{ kind: "vision-failed", reason: "failed" }`로 거부하는지 확인

- [x] T005 [P] [US2] Add unit tests verifying zero-caption fail-fast guard in __tests__/inference/on-device.test.ts
- [x] T006 [US2] Implement zero-caption fail-fast guard in readPhotos in src/inference/on-device.ts

**Checkpoint**: At this point, User Stories 1 and 2 should both work and prevent silent false diary creation

---

## Phase 5: User Story 3 - 네이티브 공유 객체 비동기 호출 패턴의 정적 방어 (Priority: P3)

**Goal**: `new lib.Asset(...).method()` 패턴의 임시 객체 비동기 체이닝이 코드베이스에 존재하지 않음을 정적 계약 테스트로 보장

**Independent Test**: 정적 소스 계약 테스트가 실행되어 검사 대상 파일 >= 1개 및 위반 0건으로 통과하는지 확인

- [x] T007 [P] [US3] Create static source contract test in __tests__/signals/expo-asset-scope.test.ts

**Checkpoint**: All user stories should now be independently testable and protected against regression

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature validation and compliance verification

- [x] T008 Execute quickstart validation scenarios defined in specs/073-photo-caption-gc-guard/quickstart.md
- [x] T009 Run full static checks and constitution verification via npm run lint

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion (can run in parallel with or after US1)
- **User Story 3 (Phase 5)**: Depends on US1 implementation completion to verify clean source state
- **Polish (Phase 6)**: Depends on US1, US2, US3 completion

### Parallel Opportunities

- T003 [US1] and T005 [US2] can be written in parallel (different test files).
- T004 [US1] touches `src/signals/expo-port.ts`, T006 [US2] touches `src/inference/on-device.ts` (independent files).
