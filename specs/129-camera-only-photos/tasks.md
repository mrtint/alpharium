# Tasks: 129 카메라로 찍은 사진만 재료로 쓴다

**Input**: spec.md · plan.md · research.md · data-model.md · contracts/camera-only.md

## Phase 1: 판정 (US1·US2·US3 공통 기반)

- [X] T001 [P] `__tests__/signals/camera-only.test.ts` — CO1~CO6 실패하는 테스트 먼저(안드로이드 경로 표: DCIM/Camera·DCIM/OpenCamera·SD 카드 DCIM·DCIM/Screenshots·DCIM/Screen recordings·Download·Download/Quick Share·Pictures/KakaoTalk·Pictures/PocketlogSeed(allowSeed 참/거짓); iOS 종류 표; 이름·비율; 모름)
- [X] T002 `src/signals/camera-only.ts` — `isCameraPhoto`·`allowsSeedPhotos` 구현(T001 통과)

## Phase 2: 기기 계층 (US1, FR-011)

- [X] T003 `src/signals/port.ts` — `PhotoFacts`에 `localPath?`·`mediaSubtypes?`, `folderName`·`folderNamesFor` 제거
- [X] T004 `src/signals/expo-port.ts` — `photosBetween`을 `expo-media-library/legacy` `getAssetsAsync` 페이지 조회로(안드로이드 `uri`→`localPath`, iOS `mediaSubtypes`), `folderNameOf`·`folderNamesFor` 제거; `__tests__/signals/expo-port.test.ts` 갱신(경로 변환 순수 헬퍼 테스트) + 소스 계약: `expo-port.ts`의 `photosBetween`이 `getUri`·`getAssetInfoAsync`를 부르지 않는다(SC-004)

## Phase 3: 수집 (US1·US2, FR-002·003·008·012)

- [X] T005 [P] `__tests__/signals/collect*.test.ts` — 섞인 날 → 카메라만, 스크린샷뿐 → `none`, 권한 없음 → `unknown`, 장소는 카메라 사진만, `allowSeed` 기본 거짓
- [X] T006 `src/signals/collect.ts`·`src/signals/types.ts` — 판정 적용, `folderName` 이월 제거

## Phase 4: 걷어내기 (FR-004·007)

- [X] T007 `src/vision/select.ts` — `NON_CAMERA_FOLDERS`·`classifyPhotos`·되돌림 제거, 시간 분포 선별만; 테스트 갱신
- [X] T008 `src/inference/on-device.ts` — `resolveFolders`·`attachFolderNames` 제거; 관련 테스트 갱신
- [X] T009 `src/vision/caption.ts` — `looksLikeScreenCapture` 제거(읽은 뒤 판정만), 128 테스트에서 읽기 전 판정 케이스를 camera-only 테스트로 옮김

## Phase 5: 시딩 잠금 (US3, FR-009·010)

- [X] T010 `src/app/wiring.ts` — `loadSignals` 기본값이 `allowsSeedPhotos(resolution)`을 넘긴다; 조립 테스트(prod·판정 실패 → 시딩 제외, dev → 포함)
- [X] T011 `scripts/constitution-rules.ts`·`scripts/check-constitution.mts` — `checkSeedPhotoFile` SP1~SP3, `checkPhotoPortFile` 어휘 갱신; `__tests__/constitution` 테스트 + 위반 주입 확인

## Phase 6: 마무리

- [X] T012 시딩 스크립트·문서 주석의 023 설명 갱신(`scripts/seed-day.mts`·`scripts/seed/device.ts`), 층 1 흐름 기대값 확인(SC-005)
- [X] T013 AGENTS.md 해당 서술 갱신(023 폴더 거르기·128 읽기 전 판정·`getUri()` 폴더)
- [X] T014 `npm test`·`npm run lint`
- [X] T015 실기기: SM-S901N·iPhone 14 quickstart 수행, 「기록」 채움(SC-001·002)

## Dependencies

T001→T002→(T003→T004)·(T005→T006)→T007·T008·T009→T010→T011→T012·T013→T014→T015

## Phase 7: Convergence

- [X] T016 contracts/camera-only.md에 시딩 트리 하위 폴더 규칙(바로 아래·Camera만)과 SP4(allowSeed: true 금지)를 적는다 per plan: contracts (partial)
