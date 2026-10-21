# Tasks: 첫 실행 다운로드 크기 공지 — App Store 4.2.3(ii)

**Input**: Design documents from `/specs/095-download-size-notice/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/consent-size.md, quickstart.md

**Tests**: 헌법 「개발 방식」(계약을 먼저 정하고 테스트를 먼저 쓴다)에 따라 테스트 태스크를 구현보다 먼저 둔다.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

없음 — 새 의존성·파일 없음(plan Structure Decision).

## Phase 2: Foundational (카탈로그 — 모든 이야기가 쓴다)

- [X] T001 [P] 카탈로그 계약 테스트 DS1을 `__tests__/i18n/download-consent-body.test.ts`(logic)에 쓴다 — `download.consent.body(null)`이 원래 문장과 바이트 동일, `body("2.0GB")`·`body("350MB")`가 「…모델을 약 {size} 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.」, 어떤 입력에도 「null」·「undefined」가 들어가지 않음. 실패를 확인한다
- [X] T002 `src/i18n/catalogs/ko/download.ts`의 `consent.body`를 `(size: string | null): string => …` 함수로 바꾸고 머리 주석에 095를 적는다(T001 통과)
- [X] T003 `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 새 문장 「일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 약 ${} 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.」를 095 주석과 함께 올린다(DS2) — 원래 문장은 골든 그대로

## Phase 3: User Story 1 — Wi-Fi 첫 실행에서 받을 양을 보고 동의 (P1) 🎯 MVP

**Goal**: 표준 동의 본문에 받을 양이 보인다.
**Independent Test**: 표준 갈래(연결 `wifi`·`unknown`)에서 게이트가 「약 2.0GB」가 든 표준 동의를 그린다.

- [X] T004 [P] [US1] `__tests__/ui/download-consent-dialog.test.tsx`를 고친다 — DS8: `sizeLabel="2.0GB"`면 새 문장, `null`이면 원래 문장, 버튼 하나·testID·콜백 `onConfirm` 하나 불변. DS9: FR-003 소스 단언을 식별자·자산 키(`v1|v2|a1|ESSENTIAL_ASSET_KEYS`) 금지 + `essential-assets`·`network-port` import 금지 + 숫자·단위(`\d`·`GB`·`MB`) 리터럴 금지로 바꾸고 describe 이름을 095로. 기존 렌더 호출에 `sizeLabel={null}`을 넘긴다
- [X] T005 [P] [US1] `__tests__/app/use-consent-gate.test.tsx`의 CG6(표준에서 양을 읽지 않음) 단언을 DS3·DS4로 교체한다 — 연결 `wifi`/`unknown`에서 `readSizeLabel` 1회 호출·`view: "standard"`·`sizeLabel: "2.0GB"`; 연결 읽기가 끝나기 전 이미 `readSizeLabel`이 불렸음(동시 시작)
- [X] T006 [P] [US1] `__tests__/ui/download-consent-gate.test.tsx`의 「표준에서는 양을 읽지 않는다」를 DS10으로 바꾼다 — Wi-Fi에서 표준 동의 본문에 「약 2.0GB」, 모바일 동의 testID 없음
- [X] T007 [US1] `src/app/use-consent-gate.ts`를 고친다 — `Promise.all([withTimeout(readConnection, READ_LIMIT_MS, "unknown"), withTimeout(readSizeLabel, READ_LIMIT_MS, null)])`로 동시에 읽고 둘 다 끝난 뒤 `{ view: consentViewOf(connection), sizeLabel }`. 머리 주석의 「표준에서는 받을 양을 읽지 않는다(045 FR-003)」를 095 서술로 바꾼다(DS3·DS4·DS11)
- [X] T008 [US1] `src/ui/DownloadConsentDialog.tsx`에 `sizeLabel: string | null` prop을 더하고 `description={TEXT.body(sizeLabel)}`. 머리 주석의 FR-003 서술을 「식별자·자산 키는 보이지 않고 받을 양은 prop으로만 받는다(095)」로 바꾼다(DS8·DS9·DS11)
- [X] T009 [US1] `src/ui/DownloadConsentGate.tsx`가 표준 동의에 `sizeLabel={gate.sizeLabel}`을 넘기고 머리 주석을 095에 맞춘다(DS10·DS11). 양의 출처는 바꾸지 않는다 — `__tests__/ui/AppFrame.firstrun.test.tsx`의 `readSizeLabel={readConsentSizeLabel}` 배선 단언이 고치지 않고 통과해야 한다(FR-003)

## Phase 4: User Story 2 — 못 읽으면 지어내지 않는다 (P1)

**Goal**: 양 읽기 실패·지연에 숫자 없는 원래 문장.
**Independent Test**: 양 읽기가 거부·무응답일 때 표준 동의 본문이 원래 문장이다.

- [X] T010 [P] [US2] `__tests__/app/use-consent-gate.test.tsx`에 DS5를 더한다 — 연결 `wifi` + 양 읽기 거부 → `standard{null}`; 연결 `wifi` + 양 무응답 → 3초 뒤 `standard{null}`
- [X] T011 [P] [US2] `__tests__/ui/download-consent-gate.test.tsx`에 양 읽기 거부 시 표준 동의 본문이 원래 문장(숫자 없음)인 것을 더한다

## Phase 5: User Story 3 — 안내가 늦게 뜨지 않는다 (P2)

**Goal**: 최악 3초.
**Independent Test**: 둘 다 무응답이면 3초 시점에 표준 동의.

- [X] T012 [US3] `__tests__/app/use-consent-gate.test.tsx`에 DS6·DS7을 더한다 — fake timers로 둘 다 무응답: 2999ms에 `reading`, 3000ms에 `standard{null}`; 연결만 먼저 끝나고 양이 남은 동안 `reading`. 기존 「모바일인데 양 무응답」 테스트의 기대 시간이 6초였다면 3초로 고친다

## Phase 6: Polish & Cross-Cutting

- [X] T013 `src/`·`__tests__/`에서 「045 FR-003」·「용량을 노출하지 않」 인용을 찾아 095 근거로 고친다(DS11) — `grep -rn "FR-003" src __tests__ | grep -i "045\|용량\|consent"`
- [X] T014 위반 주입 네 가지(contracts/consent-size.md)를 하나씩 넣어 해당 테스트가 실패하는지 확인하고 되돌린다 — 치환이 적용됐는지 먼저 단언
- [X] T015 모바일 동의 불변 확인(FR-007·SC-004) — `git diff --stat`에 `src/ui/CellularConsentDialog.tsx`·`__tests__/ui/cellular-consent-dialog.test.tsx`·`src/app/consent-gate.ts`가 없고 그 테스트가 통과한다
- [X] T016 `npm test`·`npm run lint` 전체 통과 확인, quickstart.md 「결과 기록」 표를 채운다

- [ ] T017 (소유자) dev 빌드 실기기에서 quickstart 「실기기」 절차로 Wi-Fi 첫 실행 동의에 받을 양이 보이는지 확인하고 결과를 quickstart에 적는다(SC-001, 원칙 V)

## Dependencies & Execution Order

- T001 → T002 → T003 (카탈로그가 먼저)
- US1: T004·T005·T006 [P] (테스트 먼저, 실패 확인) → T007 → T008 → T009
- US2·US3: T007 뒤(같은 훅). T010·T011 [P], T012
- Polish: 전부 뒤

## Parallel Example: User Story 1

```text
T004 download-consent-dialog.test.tsx
T005 use-consent-gate.test.tsx
T006 download-consent-gate.test.tsx
```

## Implementation Strategy

US1(T001~T009)이 MVP이자 App Store 요건 전부다. US2·US3는 같은 훅 변경이 이미 만족시키는 성질을 테스트로 잠그는 일이다. 실기기 확인(quickstart)은 소유자 몫으로 남는다.

## Phase 7: Convergence

- [X] T018 `__tests__/app/module-size.test.ts`(logic)에 DS12 테스트를 쓴다 — `remainingSizeLabel(0)`·`(-1)`·`(499_999)`는 `null`, `(500_000)`은 「1MB」, `(350_000_000)`은 「350MB」, `(2_000_000_000)`은 「2.0GB」(= `formatModuleBytes`와 같음). 실패를 확인한다 per FR-003a (missing)
- [X] T019 `src/app/module-size.ts`에 `remainingSizeLabel(bytes: number): string | null`을 더하고 `App.tsx`의 `readConsentSizeLabel`이 `remainingSizeLabel(await readEssentialRemainingBytes())`를 쓰게 한다 per FR-003a, plan: Structure Decision (missing)
- [X] T020 위반 주입 5(`remainingSizeLabel`이 0에도 「0MB」)로 DS12가 실패하는지 확인하고 되돌린 뒤 `npm test`·`npm run lint`를 다시 돌린다 per FR-003a (missing)
