---

description: "Task list for 084 표본 사진의 정체를 원본으로"
---

# Tasks: 표본 사진의 정체를 원본으로 — 썸네일 변형에 층 1이 멈추지 않게

**Input**: `specs/084-sample-photo-identity/` — plan.md, spec.md, research.md, data-model.md, contracts/photo-identity.md, quickstart.md

**Tests**: 헌법 「개발 방식」(계약을 먼저 정하고 테스트를 먼저 쓴다)에 따라 테스트를 먼저 쓴다. 테스트는 jest `logic` 프로젝트(`.ts`)이고 네트워크는 주입 대역이다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 앞 태스크에 기대지 않음
- **[Story]**: US1~US5 (spec.md)

---

## Phase 1: Setup

- [X] T001 브랜치가 `084-sample-photo-identity`인지 `git branch --show-current`로 확인하고, 070 계약 `specs/070-e2e-sample-seed/contracts/sample-manifest.md`(C-1)·`sample-seeding.md`(F-1~F-5·P-4)와 `__tests__/e2e-sample/source-contract.test.ts`(K-1~K-5)를 읽어 이 기능이 바꿀 조항과 바꾸지 않을 조항(K-1: `src/`는 표본을 모른다)을 확인한다

---

## Phase 2: Foundational (목록 모양 — 모든 이야기가 기댄다)

**Purpose**: `CatalogPhoto`의 `sha256`을 `string[]`로, `originalSha1`을 더한다(data-model.md). 이 모양이 바뀌어야 내려받기·지문을 고칠 수 있다.

- [X] T002 `__tests__/e2e-sample/catalog.test.ts`를 먼저 고친다(계약 I-1·I-2): 픽스처를 `sha256: [SHA]`·`originalSha1: "a".repeat(40)`로 바꾸고, 「`sha256`은 배열이고 원소는 소문자 hex 64자, 중복이 없고, 1개 이상 — 빈 배열은 기록 모드에서만」「`sha256`이 문자열이면 실패」「배열 안 중복이면 실패」「`originalSha1`은 소문자 hex 40자 — `""`는 기록 모드에서만」 단언을 더한다. 실패를 확인한다
- [X] T003 `scripts/e2e-sample/catalog.ts`를 고친다: `CatalogPhoto.sha256: string[]`, `originalSha1: string` 필드, `validateCatalog`의 검사(I-1·I-2, 비배열·중복·형식, `allowEmptyHashes`일 때만 `[]`·`""` 허용). T002가 통과한다
- [X] T004 `scripts/e2e-sample/photos.json` 210개 항목을 이전한다: `sha256: "<hex>"` → `sha256: ["<hex>"]`, `originalSha1: ""`를 `sha256` 바로 뒤에 넣는다(필드 순서 `file`·`url`·`sha256`·`originalSha1`·`license`·`sourcePage`·`checkedOn`·`tags`·`widthPx`, 2칸 들여쓰기 + 끝 줄바꿈 — `JSON.stringify(x, null, 2) + "\n"`). 다른 필드는 바이트 그대로인지 `git diff`로 확인한다(이 시점의 목록은 기록 모드에서만 검사를 통과한다 — `catalog.test.ts`의 「진짜 photos.json」 묶음(I-3)은 T018이 채울 때까지 **빨간 것이 예정된 상태**다. 그 밖의 테스트는 초록이어야 한다)
- [X] T005 `__tests__/e2e-sample/ensure.test.ts`·`__tests__/e2e-sample/plan.test.ts`의 `CatalogPhoto` 픽스처를 새 모양(`sha256: [..]`·`originalSha1`)으로 고치고 `npx tsc --noEmit`이 0 오류인지 본다(유니온을 좁히면 tsc가 바꿀 자리를 짚는다 — AGENTS)

**Checkpoint**: 목록 모양이 새 계약대로다.

---

## Phase 3: User Story 1 - 어느 기계에서든 표본을 받는다 (Priority: P1) 🎯 MVP

**Goal**: 처음 보는 썸네일 바이트를 원본 확인 뒤 받아들이고 목록에 덧붙인다.

**Independent Test**: 가짜 네트워크로 「목록에 없는 바이트 + 같은 원본 + 썸네일 모양」을 주고 성공·덧붙임·`accepted`·`changed`를 본다.

### Tests for User Story 1

- [X] T006 [P] [US1] `__tests__/e2e-sample/commons.test.ts`(새 파일)를 쓴다(계약 O-1~O-5): `titleOf("https://commons.wikimedia.org/wiki/File:Living_room_(Unsplash).jpg")` = `"File:Living_room_(Unsplash).jpg"`, 퍼센트 인코딩 디코드, `File:`이 아니면 `null` / `originalApiUrl`에 `action=query`·`format=json`·`prop=imageinfo`·`iiprop=sha1|size|timestamp`(인코딩된 꼴)·`titles` / `parseOriginal`: 정상 응답 → `{ ok, sha1, width, height, timestamp }`, `missing` 페이지·`imageinfo` 없음·sha1 40 hex 아님·크기 이상 → `{ ok: false }`, 던지지 않음 / `jpegSize`: SOI + APP0 + SOF0을 손으로 만든 바이트에서 폭·높이, JPEG 아님·SOF 없음 → `null` / `looksLikeThumbnail`: 폭 일치 + 높이 ±1 → 참, 폭 다름·높이 2px 차·JPEG 아님 → 거짓(실측 예: 원본 4288×2848, 960폭 → 기대 637.6 → 638 참, 636 거짓)
- [X] T007 [P] [US1] `__tests__/e2e-sample/fetch.test.ts`를 고친다(계약 V-1~V-3·V-6·V-7): 하네스에 `lookupJson` 대역(호출 기록)을 더하고 테스트 이미지 바이트를 `jpegSize`가 읽는 작은 JPEG(SOI+SOF0+EOI, 960×540 등)로 바꾼다. 단언: 목록에 있는 해시 → 원본 조회 0회(V-1) / 처음 보는 해시 + 원본 sha1 같음 + 모양 맞음 → `ok`, 캐시에 그 바이트, 결과 `photos`의 `sha256`에 그 해시가 덧붙음(앞 원소 유지), `accepted`에 파일명, `changed: true` / 같은 해시를 두 번 덧붙이지 않는다 / 덧붙인 뒤의 목록으로 다시 돌리면 조회 0회·네트워크 0회(캐시) / 원본 조회 앞에도 요청 간격(≥ 1000ms)이 들어간다(V-6) / 변화가 없으면 `changed: false`·`accepted: []`

### Implementation for User Story 1

- [X] T008 [US1] `scripts/e2e-sample/commons.ts`(새 파일)를 쓴다: `titleOf`·`originalApiUrl`·`parseOriginal`·`jpegSize`·`looksLikeThumbnail`(순수, 던지지 않음 — O-1~O-5)과 실제 통로 `realLookupJson`(전역 `fetch`, `fetch.ts`의 `USER_AGENT`를 싣고 `{ status, json }`을 돌려준다 — O-6, 파싱 실패는 `json: null`). 이 파일은 `node:fs`·`adb`를 import하지 않는다. T006이 통과한다
- [X] T009 [US1] `scripts/e2e-sample/fetch.ts`를 고친다: `FetchOptions.lookupJson` 주입, 캐시·응답 대조를 `sha256.includes(got)`로(V-1·V-2), 처음 보는 해시 → 간격 → 원본 조회(429 백오프 공유) → `parseOriginal` → `sha1 === originalSha1` && `looksLikeThumbnail(bytes, widthPx, original)`이면 캐시에 쓰고 덧붙이고 `accepted`에 넣는다(V-3), `FetchResult`에 `accepted: string[]`·`changed: boolean`(V-7). 파일 머리 주석의 「조용히 다른 사진을 쓰지 않는다」를 원본 sha1 기준으로 고쳐 쓴다. T007이 통과한다
- [X] T010 [US1] `scripts/sample-fetch.mts`를 고친다(W-1·W-2): `lookupJson: realLookupJson`을 넘기고, `accepted`마다 「새 썸네일 변형을 받아들였다: <파일>」을 출력하고, `result.ok && result.changed`일 때만 `photos.json`을 쓴다(기록 모드와 무관). 머리 주석에 Commons API(원본 조회)도 부른다고 적는다

**Checkpoint**: 처음 보는 변형을 받아들이는 길이 테스트로 선다.

---

## Phase 4: User Story 2 - 다른 사진은 여전히 받지 않는다 (Priority: P1)

**Goal**: 원본이 다르거나·확인할 수 없거나·모양이 다르면 파일·목록을 남기지 않고 실패한다.

**Independent Test**: 가짜 네트워크로 각 실패 갈래를 주고 실패·파일 없음·`photos.json` 무변경을 본다.

- [X] T011 [US2] `__tests__/e2e-sample/fetch.test.ts`에 실패 갈래를 더한다(계약 V-4): 원본 sha1이 다름 → `ok: false`, 이유에 파일명과 두 sha1 앞 12자, 캐시에 파일 없음 / 조회 HTTP 500·`json: null`·`missing` 페이지·조회 함수가 던짐 → 실패·파일 없음 / 원본 같음인데 폭이 다르거나 높이가 2px 넘게 다르거나 JPEG가 아님 → 실패·파일 없음 / 조회 429가 4번 → 이유에 429 / 앞 사진이 새 변형으로 받아들여진 뒤 뒤 사진이 실패 → `ok: false`(부분 성공 없음). 070의 「F-2: 해시가 다르면 … 실패」 테스트는 「원본 조회가 실패하면」 꼴로 옮긴다(그 뜻을 잃지 않는다)
- [X] T012 [US2] `scripts/e2e-sample/fetch.ts`의 실패 갈래가 T011을 통과하게 고친다(이미 통과하면 고칠 것 없음 — 위반 주입으로 확인: `sha1 === originalSha1` 비교를 지우면 T011의 「원본 sha1이 다름」이 실패하는지, `looksLikeThumbnail` 호출을 지우면 모양 갈래가 실패하는지 보고 되돌린다; 치환이 실제로 적용됐는지 먼저 grep으로 단언)
- [X] T013 [US2] `__tests__/e2e-sample/sample-fetch-entry.test.ts`(새 파일, 소스 계약 — 주석을 걷어낸 뒤 읽는다): `scripts/sample-fetch.mts`가 `photos.json`을 쓰는 호출(`writeFileSync(CATALOG_PATH()`)이 `result.changed`를 보는 조건 안에만 있고 그 조건이 실패 반환(`return 1`) 뒤에 있음을 잠근다(W-1 — 진입점은 jest가 실행하지 않으므로 소스로 막는다)

**Checkpoint**: 받아들이는 길을 넓혀도 다른 사진은 들어오지 않는다.

---

## Phase 5: User Story 3 - 기계를 바꿔도 기기 표본을 다시 심지 않는다 (Priority: P2)

**Goal**: 지문이 원본 sha1을 따른다(P-4').

**Independent Test**: `sha256[]`만 다른 두 목록 → 같은 지문, `originalSha1`이 다르면 다른 지문.

- [X] T014 [P] [US3] `__tests__/e2e-sample/plan.test.ts`에 지문 단언을 더한다(P-4'): 같은 표·같은 `originalSha1`에 `sha256`만 다른 두 목록 → `fingerprint` 같음, 한 사진의 `originalSha1`만 다르면 다름(070의 「사진 sha가 바뀌면 바뀐다」 단언은 「원본 sha1이 바뀌면」으로 옮긴다)
- [X] T015 [US3] `scripts/e2e-sample/plan.ts`의 `fingerprint`가 `p.originalSha1`을 쓰게 고치고 함수 주석을 고친다. T014가 통과한다

---

## Phase 6: User Story 4 - 처음 한 번 원본 sha1을 채운다 (Priority: P2)

**Goal**: 기록 모드가 빈 `originalSha1`을 Commons에서 채운다(V-5).

**Independent Test**: 가짜 네트워크로 빈 `originalSha1` 목록을 기록 모드로 돌려 채워지는지, 기존 값은 그대로인지 본다.

- [X] T016 [US4] `__tests__/e2e-sample/fetch.test.ts`에 기록 모드 단언을 더한다(V-5): 빈 `originalSha1` + 기록 모드 → 조회해 채움, `changed: true` / 원본의 `timestamp` 날짜가 `checkedOn`보다 뒤면 채우지 않고 실패(이유에 파일명) / 같은 날짜면 채움 / 채운 사진이 처음 보는 해시여도 원본 조회는 그 사진에 한 번뿐(조회 대역 호출 수로 센다) / 이미 채워진 `originalSha1`은 조회 결과가 달라도 덮어쓰지 않고 그 사진은 V-4대로 실패 / 빈 `sha256: []` + 기록 모드 → 원본 확인을 거친 받은 해시로 채움 / 채우기 조회 실패 → 실패. 070의 F-5 테스트 둘(빈 해시 기록 모드 아님 → 실패, 기록 모드는 빈 것만)을 새 모양으로 옮긴다
- [X] T017 [US4] `scripts/e2e-sample/fetch.ts`의 기록 모드를 V-5대로 고친다(빈 `originalSha1`이면 그 사진을 받기 전에 조회해 `timestamp` 날짜 ≤ `checkedOn`일 때만 채우고, 그 조회도 간격·백오프를 타며, 그 결과를 V-3에서 다시 쓴다). `scripts/sample-fetch.mts`의 기록 모드 출력 문구를 「빈 정체 필드(원본 sha1·썸네일 해시)를 채웠다」로 고친다. T016이 통과한다

**Checkpoint**: 기기 없는 테스트가 「진짜 photos.json」 묶음(I-3, T018이 채운 뒤 초록)을 빼고 모두 초록 — `npx jest __tests__/e2e-sample --selectProjects logic`.

---

## Phase 7: User Story 5 - 맥에서 층 1이 끝까지 돈다 (Priority: P1)

**Goal**: 실제 목록을 채우고 맥 + SM-S901N에서 층 1 전체가 통과한다(SC-001·002·005). 외부 서비스 호출은 2026-10-15 소유자 승인 범위(같은 Wikimedia).

- [X] T018 [US5] 맥에서 `NODE_EXTRA_CA_CERTS=/Users/mrtint/system-cas.pem npm run sample:fetch -- --record-hashes`를 돌린다: 210개 `originalSha1`이 채워지고, 「새 썸네일 변형을 받아들였다」가 어긋났던 15장(indoor-13·18·26·28, street-06·12·29, people-12·14·18·19·26, night-01·08·22)에 대해 나오고, 종료 코드 0. `git diff scripts/e2e-sample/photos.json`에서 바뀐 것이 `originalSha1` 210개와 15장의 둘째 해시뿐인지 본다(15장의 첫 해시가 목록 작성 때의 codfw 값 그대로 — SC-005). 그 뒤 `loadCatalog()`(기록 모드 아님)가 통과하는지 본다
- [X] T019 [US5] 같은 명령을 기록 모드 없이 다시 돌려 「새로 받음 0, 캐시 210」·원본 조회 0회·`photos.json` 무변경을 확인한다(SC-001)
- [X] T020 [US5] SM-S901N 백업: `adb exec-out run-as com.a810labs.pocketlog tar cf - files/diary files/preferences files/vision-cache > <scratchpad>/device-backup-084.tar`, 크기·`tar tf` 목록을 확인한다(없는 경로가 있으면 있는 것만)
- [X] T021 [US5] Metro(dev, `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev` 확인)와 `adb reverse tcp:8081 tcp:8081`을 세우고 `npm run test:layer1` 전체를 돌린다 — 표본 보장(지문이 바뀌어 다시 심는다)을 지나 `sample-days`를 포함한 모든 흐름이 통과하는지 본다(SC-002). 실패하면 `systematic-debugging`으로 원인을 가른다(이 기능 탓인지 기존 흐름 탓인지)
- [X] T022 [US5] SM-S901N 복원: `files/diary`·`files/preferences`·`files/vision-cache`를 지우고 T020의 tar를 되돌린 뒤 앱을 다시 띄워 홈이 원래 일기를 보이는지 확인한다

---

## Phase 8: Polish & Cross-Cutting

- [X] T023 [P] `specs/070-e2e-sample-seed/contracts/sample-manifest.md` C-1, `sample-seeding.md` F-2·F-5·P-4, `specs/070-e2e-sample-seed/data-model.md`(목록 항목 필드·지문 정의)에 「084가 대체: `specs/084-sample-photo-identity/contracts/photo-identity.md`」를 적고 새 규칙(배열 해시·원본 sha1·원본 확인 뒤 받아들임·지문은 원본 sha1)으로 고친다
- [X] T024 [P] `AGENTS.md`를 고친다: 070 절에 「같은 썸네일 URL이 데이터센터마다 다른 바이트를 준다(codfw = 목록 작성 때 값, eqiad = 다름 — 2026-10-15 실측) — 사진의 정체는 Commons 원본 sha1이고, 처음 보는 썸네일은 원본 확인 뒤 목록에 덧붙는다(084)」 한 줄. 083 절의 「표본 사진 내려받기(070)가 깨져 있다」 줄은 084가 고쳤다는 결론으로 바꾼다(이력을 주석으로 덧대지 않는다 — AGENTS 머리말)
- [X] T025 `specs/084-sample-photo-identity/quickstart.md`의 「실측」에 T018~T022 결과(받아들인 변형 수·소요 시간·층 1 흐름 수와 시간·복원 확인)를 적는다
- [X] T026 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 돌려 통과를 확인한다(`photos.json`의 prettier 대상 여부 포함). `git diff --name-only main`에 `scripts/e2e-sample/ensure.ts`·`scripts/layer1/`·`docs/e2e/sample-table.md`·`src/`가 없는지 본다(FR-013)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2(T002 → T003 → T004 → T005) → US1(T006·T007 [P] → T008 → T009 → T010) → US2(T011 → T012 → T013) → US3(T014 → T015, US1과 독립 — Phase 2 뒤 언제든) → US4(T016 → T017, T009 뒤) → US5(T018 → T019 → T020 → T021 → T022, 모든 코드 뒤) → Polish(T023·T024 [P], T025는 US5 뒤, T026 마지막)
- US3는 `plan.ts`만 건드려 US1·US2와 병렬 가능.

## Parallel Example

```text
T006 commons.test.ts  ∥  T007 fetch.test.ts  ∥  T014 plan.test.ts
T023 070 문서         ∥  T024 AGENTS.md
```

## Implementation Strategy

- MVP = Phase 2 + US1 + US2(받아들이되 다른 사진은 막는다) — 이것만으로 맥의 15장이 받아진다(원본 sha1이 채워진 목록이 전제라 US4와 함께 간다).
- 그다음 US3(지문) → US4(채우기) → US5(실측) → Polish.

## Phase 9: Convergence

- [X] T027 `scripts/e2e-sample/catalog.ts`의 빈 `originalSha1` 검사 문구가 기록 모드를 가리키게 고치고(「originalSha1이 비었다 — 처음 한 번 --record-hashes로 채운다」, 빈 값이 아닌 형식 오류는 지금 문구 그대로) `__tests__/e2e-sample/catalog.test.ts`에서 그 문구를 단언한다 per US4/AC1 (partial)
