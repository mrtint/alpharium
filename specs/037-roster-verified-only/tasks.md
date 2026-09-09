---
description: "Task list — 로스터를 검증된 하나로 축소"
---

# Tasks: 로스터를 검증된 하나로 축소

**Input**: `/specs/037-roster-verified-only/` — [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/roster-entry.md](./contracts/roster-entry.md) · [quickstart.md](./quickstart.md)

**Branch**: `037-narrative-model-measurement` (스펙 디렉터리 이름과 다르다)

**Tests**: 이 저장소는 계약 우선이다(헌법 「개발 방식」 — 계약을 먼저 정하고
테스트를 먼저 쓴다 MUST). 테스트 작업은 선택이 아니라 필수다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 미완 작업에 의존 안 함)
- **[Story]**: US1/US2/US3 — Setup·Foundational·Polish에는 안 붙는다

---

## Phase 1: Setup — 헌법을 먼저 고친다

**Purpose**: 코드보다 헌법이 먼저다(Governance MUST). 이 단계가 끝나기
전에는 `src/`를 건드리지 않는다.

- [ ] T001 `.specify/memory/constitution.md`의 「로스터」 절에서 exaone·hyperclovax·qwen3·gemma3 조항과 "qwen과 gemma를 한국어에서 제외하는 근거" 문단을 걷어내고 kanana 조항만 남긴다 (FR-001)
- [ ] T002 `.specify/memory/constitution.md`의 「로스터」 절에서 "「상상을 섞는다」는 hyperclovax만의 성질이 아니다" 문단을 **남기되** 빠진 캐릭터 이름을 걷어낸 문장으로 다듬는다 — 방어선이 프롬프트이고 판정 갈래를 늘리지 않는다는 결론은 그대로다 (FR-003)
- [ ] T003 `.specify/memory/constitution.md`의 원칙 III에 로스터 진입 기준 조항을 더한다: 이 저장소의 프롬프트로 저장 가능한 일기를 안정적으로 내는 것이 실기기에서 관측되어야 한다(MUST) + 로스터는 검증을 감당할 수 있는 크기로 유지한다(SHOULD) (FR-002)
- [ ] T004 `.specify/memory/constitution.md`의 버전을 1.6.0으로 올리고 Last Amended를 2026-09-09로 바꾼다. 개정 기록에 캐릭터별 삭제 근거를 출처와 함께 남긴다 — narrative(024 T034·§10), imaginative(037 실기기 3/3), chinese·english(028), 리포트 222런 (FR-001·SC-005)
- [ ] T005 헌법 개정만 담은 커밋을 만든다 — `src/` 변경이 섞이면 안 된다 (FR-004)

**Checkpoint**: `grep -n "Version.*1.6.0" .specify/memory/constitution.md`이 맞고, 커밋이 코드보다 먼저 있다.

---

## Phase 2: Foundational — 타입을 좁혀 변경 대상을 드러낸다

**Purpose**: `Character`를 좁히면 `tsc`가 나머지 변경 자리를 전부 짚는다
(plan D1). **모든 유저 스토리가 이 단계에 의존한다.**

⚠️ 이 단계가 끝나기 전에는 `npm run lint`가 빨간불이다 — 정상이다. `tsc`
오류 목록이 곧 T007~T012의 작업 지시다.

- [ ] T006 `src/diary/types.ts`의 `Character` 유니온을 `"quiet"`로, `CHARACTERS` 배열을 `["quiet"]`로 좁힌다 (FR-005, E1)
- [ ] T007 `npm run lint`를 돌려 `tsc` 오류 목록을 받아 적는다 — 이것이 T008~T012의 대상 목록이다(plan D1). 오류가 예상 자리(persona·roster·prompt·acceptance·DiagnosticsScreen) 밖으로 나오면 plan에 없던 소비 지점이므로 기록한다
- [ ] T008 [P] `src/diary/persona.ts`의 `PERSONAS`에서 루이·오드·샤오바이·모카를 걷어내고 금동이만 남긴다 (FR-006, E2)
- [ ] T009 [P] `src/models/roster.ts`의 `ASSETS`·`DISPLAY_NAMES`에서 a2~a5를 걷어낸다 (FR-006, E2)
- [ ] T010 [P] `src/diary/prompt.ts`의 `LANGUAGE` 레코드와 캐릭터별 톤 줄에서 빠진 캐릭터를 걷어낸다. **E2SN 문안·`usesE2SN()` 구조는 건드리지 않는다** (FR-006·FR-015, C6)
- [ ] T011 [P] `src/diary/acceptance.ts`의 `isWrongLanguage` switch에서 도달 불가 case를 걷어낸다. **판정 갈래는 넷 그대로다** — 줄어드는 것은 한 갈래 안의 캐릭터 분기다 (FR-015, C6)
- [ ] T012 `src/ui/DiagnosticsScreen.tsx:61`의 `PROBE_CHARACTER`를 로스터에 있는 캐릭터로 바꾼다 (FR-006)
- [ ] T013 `npm run lint`의 `tsc` 오류가 0인지 확인한다 — **이것이 FR-005·006의 완료 조건이다**(plan D1)

**Checkpoint**: `tsc` 0 오류. 테스트는 아직 빨간불일 수 있다(Phase 3~5에서 고친다).

---

## Phase 3: User Story 1 — 고른 캐릭터가 쓸 수 있는 글을 낸다 (P1) 🎯 MVP

**Goal**: 사용자가 고를 수 있는 캐릭터가 전부 관측 근거가 있는 것이다.

**Independent Test**: 설정 탭에서 캐릭터 목록을 보고, 일기를 써서 저장되는지 본다.

### 계약 테스트 (먼저 쓴다)

- [ ] T014 [P] [US1] `__tests__/models/roster.test.ts`에 계약 C1을 더한다 — `PERSONAS`·`ASSETS`·`DISPLAY_NAMES`·`LANGUAGE` 네 레코드의 키 집합이 서로 같다(소스를 `readFileSync`로 읽어 검사, 007 관례)
- [ ] T015 [P] [US1] `__tests__/models/roster.test.ts`에 계약 C2를 더한다 — 로스터의 각 캐릭터에 관측 근거 주석이 있다. **근거를 코드가 판정하지 않는다**(원칙 IV) — 주석의 존재만 확인한다
- [ ] T016 [P] [US1] `__tests__/models/roster.test.ts`에 계약 C7을 더한다 — 소스에 로스터 밖 자산을 지우는 코드가 없다 (FR-011)

### 기존 테스트 갱신

- [ ] T017 [P] [US1] `__tests__/diary/prompt.test.ts`·`__tests__/diary/prompt-e2sn.test.ts`의 캐릭터 목록을 갱신한다. **검사하는 성질(E2SN 문안 바이트 일치, 접두사 유일성)은 바꾸지 않는다** (C5·C6)
- [ ] T018 [P] [US1] `__tests__/diary/acceptance.test.ts`를 갱신한다 — **판정 갈래 수를 세는 검사는 그대로 넷이어야 한다** (C6)
- [ ] T019 [P] [US1] `__tests__/models/download-view.test.ts`(21곳)·`__tests__/models/acquisition.test.ts`의 캐릭터 참조를 갱신한다
- [ ] T020 [P] [US1] `__tests__/inference/engine.test.ts`·`llama-port.test.ts`·`on-device.test.ts`의 캐릭터 참조를 갱신한다
- [ ] T021 [P] [US1] `__tests__/diary/request.test.ts`·`__tests__/schedule/lock.test.ts`·`__tests__/vision/roster.test.ts`의 캐릭터 참조를 갱신한다
- [ ] T022 [P] [US1] `__tests__/ui/character-list.test.tsx`(17곳)·`character-picker.test.tsx`·`prompt-preview-panel.test.tsx`의 캐릭터 참조를 갱신한다
- [ ] T023 [P] [US1] `__tests__/app/state.test.ts`·`resolve-generation.test.ts`·`vision-setting-store.test.ts`·`__tests__/welcome/names-store.test.ts`의 캐릭터 참조를 갱신한다

### 근거가 사라진 주석

- [ ] T024 [P] [US1] `src/schedule/lock.ts`의 `STALE_LOCK_MS` 근거 주석을 갱신한다 — **값 6분은 유지**하고, narrative 기준으로 정했으며 그 캐릭터가 1.6.0에서 로스터를 나갔음을 적는다. 줄이려면 재측정이 필요하다(원칙 V) (plan D4)
- [ ] T025 [P] [US1] `src/vision/select.ts`의 `VISION_PHOTO_LIMIT` 상향 조건 주석을 갱신한다 — 조건이 narrative 완주였다 (plan D4)
- [ ] T026 [P] [US1] `src/onboarding/essential-assets.ts`·`src/ui/CharacterPicker.tsx`의 캐릭터 비교 주석을 갱신한다 (plan D4)

**Checkpoint**: `npm test`·`npm run lint` 클린. 설정 탭에 캐릭터 하나만 보인다.

---

## Phase 4: User Story 2 — 예전에 쓴 일기를 계속 읽을 수 있다 (P1)

**Goal**: 로스터에서 빠진 캐릭터가 쓴 일기가 목록·상세에서 정상 동작한다.

**Independent Test**: `character: "imaginative"`인 일기를 `authorName` 있는 것과 없는 것 둘로 만들어 렌더한다.

⚠️ **현재 코드가 깨지는 자리다** — `DiaryDetailScreen.tsx:167`이 `personaOf(로스터 밖)`을 되짚어 `undefined.name`이 된다(E3).

- [ ] T027 [P] [US2] `__tests__/ui/diary-detail.test.tsx`에 계약 C4를 더한다 — `character`가 로스터 밖이고 `authorName`이 **있는** 일기의 상세가 그 이름으로 렌더된다
- [ ] T028 [US2] `__tests__/ui/diary-detail.test.tsx`에 계약 C4를 더한다 — `character`가 로스터 밖이고 `authorName`이 **없는** 일기의 상세가 **멈추지 않는다**. 내부 식별자(`"imaginative"`)가 화면에 나오지 않는다. **이 테스트는 T029 전에 실패해야 한다**
- [ ] T029 [US2] `src/ui/DiaryDetailScreen.tsx`의 이름 되짚기를 고쳐 로스터 밖 캐릭터를 방어한다. **`personaOf()`는 고치지 않는다** — 로스터 밖에 페르소나를 돌려주면 원칙 III가 흐려진다(plan D2·R3). 방어는 읽는 쪽에 둔다 (FR-008)
- [ ] T030 [P] [US2] `__tests__/ui/diary-list.test.tsx`에 로스터 밖 캐릭터가 쓴 일기가 목록에 나타나는 검사를 더한다 (FR-008)
- [ ] T031 [P] [US2] `__tests__/app/selection-store.test.ts`에 계약 C3을 더한다 — `selected-character.json`에 로스터 밖 이름이 들었을 때 `loadSelection()`이 `null`을 돌려준다. **코드 변경 없이 통과해야 한다**(R2) — 통과하지 않으면 R2의 판단이 틀린 것이므로 기록한다 (FR-009)
- [ ] T032 [P] [US2] `__tests__/diary/character-name.test.ts`에 계약 C3을 더한다 — `personaOf()`가 로스터 밖 캐릭터에 페르소나를 만들어 주지 않는다

**Checkpoint**: 두 갈래(`authorName` 있음/없음) 모두 렌더된다. `npm test` 클린.

---

## Phase 5: User Story 3 — 설정에서 작성자를 확인하고 이름을 바꾼다 (P2)

**Goal**: 캐릭터가 하나여도 작성자를 알고 이름을 바꿀 수 있다.

**Independent Test**: 설정 탭에서 이름을 바꾸고 일기를 써서 그 이름이 쓰이는지 본다.

📌 **`AuthorPicker` 컴포넌트는 안 고쳐도 된다**(E5) — `options` 배열을
index로 고르므로 길이 5→1에 무관하다. 조립부가 만드는 배열이 자동으로 준다.

- [ ] T033 [P] [US3] `__tests__/ui/author-picker.test.tsx`를 갱신한다 — 한 줄짜리 `options`로 렌더되고 [이름 바꾸기]가 나타난다. **035의 W18·W19(이름 바꾸기 배선)와 리스트 `key`가 위치라는 검사는 그대로 둔다** (FR-012·013, E5)
- [ ] T034 [US3] `App.tsx`의 작성자 자리 조립이 `CHARACTERS` 하나로 배열을 만드는지 확인하고, 필요하면 고친다 (FR-012)
- [ ] T035 [P] [US3] `__tests__/app/selection.test.ts`(10곳)를 갱신한다 — **007의 "고른 적 없으면 자동으로 안 고른다"가 캐릭터 하나에서도 성립하는지** 검사한다. 이것이 C5의 되돌릴 길이다 (FR-014)
- [ ] T036 [US3] 캐릭터가 하나일 때 준비를 잃으면 옮길 곳이 없다 — 말없이 실패하지 않고 준비되지 않았음을 알리는지 확인하고, 안 되면 고친다 (FR-010, data-model 상태 전이)

**Checkpoint**: 이름 바꾸기가 살아 있다. `npm test` 클린.

---

## Phase 6: 위반 주입 — 방어가 실제로 잡는가

**Purpose**: 새 규칙을 세울 때마다 어겨 보고 잡히는지 확인한다(007~014 관례).
각각 고친 뒤 **되돌린다**.

- [ ] T037 V1 — `CHARACTERS`에 검증 안 된 캐릭터를 되살린다 → `tsc` + C1이 잡는지 확인 후 되돌린다
- [ ] T038 V2 — `personaOf()`가 모르는 캐릭터에 기본값을 돌려주게 한다 → C3이 잡는지 확인 후 되돌린다
- [ ] T039 V3 — `DiaryDetailScreen`의 로스터 밖 방어를 뺀다 → C4(`authorName` 없는 케이스)가 잡는지 확인 후 되돌린다
- [ ] T040 V4 — `resolveSelection`이 캐릭터 하나면 자동으로 고르게 한다 → 007 계약 테스트 / C5가 잡는지 확인 후 되돌린다

**Checkpoint**: 넷 다 잡힌다. **하나라도 안 잡히면 그 방어는 없는 것이다.**

---

## Phase 7: Polish — 흐름·문서

- [ ] T041 [P] `.maestro/diary-character-select.yml`을 갱신한다 — 다섯 캐릭터 전제를 하나로. 023이 페르소나 이름으로 바꿔 둔 것을 잇는다
- [ ] T042 [P] `.maestro/`의 나머지 흐름(`prompt-preview.yml`·`photo-vision.yml`·`parallel-model-download.yml`·`writing-monologue*.yml`)에서 빠진 캐릭터 문자열을 확인하고 갱신한다. ⚠️ `download-conflict.yml`은 026 이후 구조적으로 PASS 불가 — 손대지 않는다
- [ ] T043 `npm run lint`·`npm test` 전체 클린 확인. 테스트 스위트 수가 줄지 않았는지 본다(`jest-projects.test.ts`)
- [ ] T044 [P] `docs/roadmap/README.md` 14번을 완료로 갱신한다 — 구현 결과와 037 실측을 적고, 교체 후보 실측이 다음 과제로 남는다는 것을 명시한다
- [ ] T045 [P] `AGENTS.md`에 037 절을 더한다 — 이 저장소의 관례대로 "지금도 유효한 결론"과 "아직 남은 위험"만. 모델 파일을 앱으로 못 지우는 빈자리(FR-011)를 적는다

---

## Phase 8: 실기기 검증 (dev debug 1회)

**Purpose**: 건너뛴 실기기 테스트는 통과가 아니다(원칙 V). 절차는
[quickstart.md](./quickstart.md) §4를 따른다.

⚠️ **release 빌드를 만들지 않는다**(2026-09-09 저장소 소유자 지시).

- [ ] T046 Metro 기동(`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`) + `adb reverse tcp:8081 tcp:8081` + 기기 잠금 해제 확인
- [ ] T047 D1 — 설정 탭에 캐릭터가 금동이 하나만 보인다. 다운로드 관리 섹션도 한 줄 (SC-001)
- [ ] T048 D2 — 사진 없는 날 3회 연속 생성·저장. `writingMs`가 036 범위(19~22초)에서 크게 벗어나지 않는다 (SC-003·SC-007)
- [ ] T049 D3 ★ — 037 측정이 남긴 오드 일기(`2026-09-08.json`)가 목록·상세에서 정상 표시된다. `authorName`을 지운 사본으로 **없는 갈래도** 확인한다 (SC-002)
- [ ] T050 D4 — 이름 바꾸기 후 생성 시 새 이름이 화면과 저장된 일기에 나타난다. ⚠️ Maestro가 이 자리 좌표를 잘못 볼 수 있다(035) — raw `adb input tap`으로 갈음 (SC-004)
- [ ] T051 D5 — `selected-character.json`에 로스터 밖 값이 있어도 앱이 정상 실행되고 금동이가 쓴다 (FR-009)
- [ ] T052 Maestro 회귀 — `node scripts/run-device-tests.mjs`. ⚠️ `unified-permission-onboarding.yml`은 `pm clear`로 모델·일기를 전부 날리므로 **맨 마지막에** 돌린다(T049의 재료가 사라진다)
- [ ] T053 실기기 관측을 `specs/037-roster-verified-only/`에 기록한다 — 세션 로그 또는 findings

---

## Dependencies & Execution Order

```
Phase 1 (헌법)  ← 코드보다 먼저, 별도 커밋
    ↓
Phase 2 (타입 좁히기)  ← 모든 스토리의 전제. tsc 0이 되어야 넘어간다
    ↓
    ├─ Phase 3 (US1, P1) ─┐
    ├─ Phase 4 (US2, P1) ─┤  셋은 서로 독립이나
    └─ Phase 5 (US3, P2) ─┘  US1 → US2 → US3 순이 안전하다
    ↓
Phase 6 (위반 주입)  ← 방어가 다 들어선 뒤
    ↓
Phase 7 (흐름·문서)
    ↓
Phase 8 (실기기)  ← 마지막. T052가 데이터를 날린다
```

**스토리 독립성**: US1·US2는 둘 다 P1이며 서로 독립이다. US2만 구현해도
"옛 일기가 읽힌다"가 성립하고, US1만 구현해도 "캐릭터가 하나만 보인다"가
성립한다. 다만 **Phase 2 없이는 둘 다 불가능**하다.

## Parallel Opportunities

- **Phase 2**: T008·T009·T010·T011이 서로 다른 파일 — 병렬
- **Phase 3**: T014~T016(새 계약) / T017~T023(기존 테스트 갱신) /
  T024~T026(주석) 세 묶음이 서로 독립 — 묶음 안에서도 파일이 달라 병렬
- **Phase 4**: T027·T030·T031·T032 병렬. **T028 → T029는 순서가 있다**
  (실패하는 테스트를 먼저 쓴다)
- **Phase 7**: T041·T042·T044·T045 병렬

## MVP 범위

**Phase 1 + Phase 2 + Phase 3(US1)** 이면 이 기능의 핵심이 선다 — 헌법이
고쳐지고, 로스터가 하나가 되고, 사용자가 보는 캐릭터가 전부 검증된 것이다.

다만 **Phase 4(US2)를 빼고 배포하면 안 된다** — 037 측정이 만든 오드
일기가 이미 기기에 있고, `authorName` 없는 옛 일기에서 상세가 멈춘다.
US2도 P1인 이유다.

## 완료 판정

[quickstart.md §6](./quickstart.md)의 체크리스트를 따른다.
