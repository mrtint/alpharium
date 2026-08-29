---
description: "Task list for 022 개발자 탭 내 입력 프롬프트 모니터링"
---

# Tasks: 개발자 탭 내 입력 프롬프트 모니터링

**Input**: Design documents from `/specs/022-prompt-token-diagnostics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/prompt-preview.md, quickstart.md

**Tests**: 포함한다. 이 저장소는 "계약을 먼저 정하고 테스트를 먼저 쓴다"(AGENTS.md 「개발 방식」),
계약 테스트는 소스 선언을 `readFileSync`로 직접 읽는 관례를 따른다(007·009·012).

**Organization**: User Story별 phase. US1(프롬프트 원본)이 MVP, US2(길이 감)는 US1 위에 얇게 얹힌다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일 · 미완료 선행 없음 → 병렬 가능
- **[Story]**: US1 / US2. Setup·Foundational·Polish에는 라벨 없음

## Path Conventions

Mobile app 단일 저장소: `src/`, `__tests__/`, `scripts/`, `.maestro/` (레포 루트).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 이 기능이 쓸 파일 골격 확인. 새 의존성·빌드 설정 없음.

- [x] T001 브랜치 `022-prompt-token-diagnostics` 체크아웃 확인, `npm test`가 현재 그린인지 확인(기준선 확보)
- [x] T002 [P] `specs/022-prompt-token-diagnostics/contracts/prompt-preview.md`의 PP1~PP10을 읽고 각 계약이 어느 테스트 파일에 매핑되는지 주석 메모(작업 중 참조용, 커밋 대상 아님)

**Checkpoint**: 기준선 그린 확인됨, 계약 숙지 완료

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 두 User Story가 공통으로 의존하는 타입·상수·리포트 배선. 이 phase가 끝나야 US1·US2 착수 가능.

**⚠️ CRITICAL**: 여기 완료 전에는 어떤 User Story도 시작 못 함

### 타입 (data-model.md §2·§3·§4)

- [x] T003 `src/diagnostics/types.ts`에 `PromptPreview`(`{ ok: true; text; approxChars } | { ok: false; reason }`)와 `PromptPreviewSet`(`Readonly<Record<string, PromptPreview>>`) 타입 추가. 파일 상단 원칙 III·IV 주석에 "프롬프트 미리보기는 진단 경로 전용, 화면은 문자열만 받음, 토큰 지표 아님" 한 줄 보강
- [x] T004 `src/diagnostics/types.ts`의 `DiagnosticReport`에 `promptPreviews: Readonly<Record<Character, PromptPreviewSet>>` 필드 추가(`characterModels` 바로 아래)

### 신호 프리셋 + 조립 (data-model.md §1·§5, research.md R1·R2)

- [x] T005 [P] `src/diagnostics/prompt-preview.ts` 신규 생성 — `SignalPreset` 타입, `PREVIEW_DATE`/`PREVIEW_NOW` 상수, `SIGNAL_PRESETS: readonly SignalPreset[]` 배열 리터럴(`empty`·`photos` 최소 2개, `signals`를 `DaySignals` 리터럴로 직접 작성, `fake.ts`/`collect.ts` import 금지). data-model.md §1 표를 그대로 채운다
- [x] T006 `src/diagnostics/prompt-preview.ts`에 `buildPreview(character, preset): PromptPreview` 추가 — `buildRequest(preset.signals, character, "none", preset.signals.date, PREVIEW_NOW)` → `ok:false`면 `{ ok:false, reason }`, `ok:true`면 `buildPrompt(request)` → `{ ok:true, text, approxChars: text.length }`. `diary/prompt`에서 `buildPrompt`만, `diary/request`에서 `buildRequest`만 import. `initLlama`/`completion`/`engine`/`backend` 미사용
- [x] T007 `src/diagnostics/prompt-preview.ts`에 `collectPromptPreviews(): Readonly<Record<Character, PromptPreviewSet>>` 추가 — `CHARACTERS` × `SIGNAL_PRESETS` 순회, `Object.fromEntries`로 조립

### 리포트 배선 (data-model.md §6)

- [x] T008 `src/diagnostics/report.ts`의 `collectReport()` 두 return 자리(early return + 정상 return)에 `promptPreviews: collectPromptPreviews()` 추가. `collectCharacterModels` import 옆에 `collectPromptPreviews` import. 다른 로직 불변

### 헌법 검사 (data-model.md §7, research.md R4)

- [x] T009 `scripts/constitution-rules.ts`에 `UI_TOUCHES_PROMPT = /\bfrom\s+["'][^"']*diary\/prompt["']/` 와 `UI_TOUCHES_SIGNALS = /\bfrom\s+["'][^"']*signals\/(?:types|collect|fake)["']/` 추가. `checkSourceFile()`에서 `normalized.startsWith("src/ui/")`일 때 두 정규식에 걸리면 위반 push (rule: `"화면이 프롬프트 조립/신호 타입에 닿는다 — 진단 리포트의 문자열만 받아야 한다 (022 FR-008, 원칙 II·III)"`). `signals/expo-port`는 정규식에서 제외

**Checkpoint**: 타입·프리셋·조립·리포트·검사 준비됨. `npm run lint`(tsc)가 `DiagnosticReport` 생성 자리 누락을 잡는 상태. US1·US2 착수 가능

---

## Phase 3: User Story 1 - 캐릭터별 최종 프롬프트 원본 보기 (Priority: P1) 🎯 MVP

**Goal**: 개발자 탭에서 캐릭터를 골라 그 캐릭터의 최종 프롬프트 원본을 프리셋(신호 없음/사진 있음)별로 잘림 없이 본다.

**Independent Test**: dev 빌드 개발자 탭에서 캐릭터를 넘기며 프롬프트가 캐릭터별로 다르게 렌더되고, 프리셋 전환 시 사진 문장이 나타났다 사라지는지 확인(quickstart D1·D2).

### Tests for User Story 1 ⚠️ (먼저 작성, 실패 확인 후 구현)

- [x] T010 [P] [US1] `__tests__/prompt-preview.test.ts` 신규 — PP1(문자열 동일: 각 character×preset에 대해 `buildPrompt(buildRequest(...).request)`를 직접 계산해 `collectPromptPreviews()` 결과와 `toBe`), PP3(소스 검사: `SIGNAL_PRESETS`가 `readonly` 배열 리터럴, 길이 ≥2, id에 `empty`/`photos` 포함, 배열 생성에 `.filter`/`.map` 없음), PP8(`character` 미정 시 `{ ok:false, reason: 비어있지 않음 }`, `text` 필드 부재)
- [x] T011 [P] [US1] `__tests__/prompt-preview.test.ts`에 PP2(소스 검사: `prompt-preview.ts` import에서 `diary/prompt`는 `buildPrompt`(+선택 `promptPrefix`)만, `diary/request`는 `buildRequest`만, `SPEAKER_RULES`/`TITLE_INSTRUCTION`/`signalLines` 미등장) + PP5(소스 검사: `initLlama`/`llama.rn`/`completion(`/`.generate(`/`engine`/`backend` 부재) 추가
- [x] T012 [P] [US1] `__tests__/diagnostics-report.test.ts` 신규/수정 — PP4(`collectReport()` 결과의 `promptPreviews`가 `CHARACTERS` 5키 전부, 각 값이 `SIGNAL_PRESETS`의 모든 id 키), PP9 회귀(이 테스트 실행이 `acceptance.ts`/`pipeline.ts`/`llama-port.ts`를 import·실행하지 않음 — 순수 조립만)
- [x] T013 [P] [US1] `__tests__/constitution-rules.test.ts` 수정 — PP7 위반 주입: `src/ui/Fake.tsx` 가짜 소스에 `import { buildPrompt } from "../diary/prompt"` → `checkSourceFile`이 위반 반환. `import { emptyDay } from "../signals/fake"` → 위반. `import { expoPhotoPort } from "../signals/expo-port"` → **위반 아님**(통과 확인)
- [x] T014 [P] [US1] `__tests__/diagnostics-screen.test.tsx` 신규/수정 — 화면이 `report.promptPreviews` mock을 받아 프리셋별 프롬프트 `text`를 렌더, 캐릭터 전환 시 다른 텍스트 표시, `{ ok:false }` 프리뷰에 `reason` 표시. 화면 소스에 `diary/prompt`·`signals/types` import 부재(PP7 재확인)

### Implementation for User Story 1

- [x] T015 [US1] T010~T014를 실행해 **전부 실패**하는 것을 확인(구현 전 레드)
- [x] T016 [US1] `src/ui/DiagnosticsScreen.tsx`에 프롬프트 미리보기 섹션 추가 — `report.promptPreviews`를 읽어 캐릭터 선택(가로 버튼 열 또는 순차) + 선택 캐릭터의 프리셋별 블록(라벨 + 스크롤 가능한 `<Text selectable>` 프롬프트 원본). `{ ok:false }`면 "조립할 수 없음: {reason}" 표시. `testID`를 `prompt-preview-{character}-{presetId}` 형태로 부여(Maestro·jest용). `diary/prompt`·`signals/types` import 금지 — `report` 문자열만 사용
- [x] T017 [US1] `npm run test:logic` + `npm run test:ui` 실행해 T010~T014 **그린** 확인
- [x] T018 [US1] `npm run lint` 실행 — eslint·tsc·헌법 검사·prettier 클린 확인(특히 새 헌법 규칙이 기존 `src/ui/*` 무고하게 통과, `DiagnosticsScreen.tsx`의 기존 `signals/expo-port` import 통과)

**Checkpoint**: US1 독립 동작. 개발자 탭에서 프롬프트 원본을 캐릭터·프리셋별로 볼 수 있다. 기기 없는 테스트 전부 그린

---

## Phase 4: User Story 2 - 프롬프트 길이 감(感) 표시 (Priority: P2)

**Goal**: 각 프리셋 프롬프트 옆에 조립 시점 근사 크기(문자 수)를 "실측 토큰 아님" 라벨과 함께 표시.

**Independent Test**: 프리셋 전환 시 크기 값이 텍스트 길이에 맞춰 바뀌고, "사진 있음"이 "신호 없음"보다 큰지 확인(quickstart D3).

### Tests for User Story 2 ⚠️

- [x] T019 [P] [US2] `__tests__/prompt-preview.test.ts`에 PP6 추가 — `{ ok:true }` 항목에서 `approxChars === text.length`. `prompt-preview.ts`·`types.ts`·`DiagnosticsScreen.tsx` 소스에 `token`/`tokens_evaluated`/`tokens_predicted`/`tokensEvaluated` 부재(대소문자 무시)
- [x] T020 [P] [US2] `__tests__/diagnostics-screen.test.tsx`에 케이스 추가 — 화면이 `approxChars`를 렌더하고, 그 옆 라벨에 "근사" 또는 "토큰 아님" 취지 문구가 있다. `photos` 프리셋의 표시 크기 > `empty` 프리셋

### Implementation for User Story 2

- [x] T021 [US2] T019~T020 실행해 실패 확인
- [x] T022 [US2] `src/ui/DiagnosticsScreen.tsx` 프롬프트 미리보기 블록에 `approxChars` 표시 추가 — `{approxChars}자 (조립 시점 근사치, 실측 토큰 아님)` 형태. `testID` `prompt-preview-size-{character}-{presetId}`
- [x] T023 [US2] `npm run test:ui` + `npm run lint` 그린 확인

**Checkpoint**: US1·US2 모두 독립 동작. 크기 값이 프리셋별로 다르게 보인다

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 회귀 확인, 실기기 검증, Maestro 등록.

- [x] T024 [P] 기존 계약 테스트 무수정 통과 재확인 — `acceptance.test.ts`(갈래 수 4), `llama-port` `timings` 폐기 테스트, 진단 화면 노출 게이트(001 SC-013 계열). PP9·PP10 만족
- [x] T025 [P] 위반 주입 6종(quickstart.md 「위반 주입 체크리스트」 1~6) 실제 수행 후 되돌리기 — 각 방어가 잡는지 확인
- [x] T026 `.maestro/`의 개발자 탭 흐름에 프롬프트 섹션 확인 스텝 추가(`prompt-preview-*` testID + 프리셋 라벨 정규식). `scripts/run-device-tests.mjs`의 `FLOWS`에 해당 흐름이 등록돼 있는지 확인(미등록이면 등록)
- [x] T027 실기기 검증 완료(2026-08-29, SM-S901N/Galaxy S22, Android 16, dev, 무선). D1~D5 + 캐릭터 전환 확인, `.maestro/prompt-preview.yml` PASS, `skeleton.yml` stale 버그 발견·수정. 관측값을 AGENTS.md 022 절에 기록. **D6(prod 게이트 실측)만 미확인** — 새 네이티브 없어 release 재확인 생략(012 기준)이나 prod 탭 부재 자체는 안 봤다
- [x] T028 `docs/roadmap/README.md`의 "개발자 탭 내 프롬프트 및 토큰 모니터링" 항목을 `[x]`로 체크하고, 상세 절에 "토큰 지표는 범위에서 제외(AI 이관 왜곡 정정), 프롬프트 원본 노출만 구현" 한 줄 추가
- [x] T029 커밋 — 한국어 메시지("022: 개발자 탭에 입력 프롬프트 원본 미리보기 추가"). `npm test` + `npm run lint` 최종 그린 확인 후

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 선행 없음
- **Foundational (Phase 2)**: Setup 후. US1·US2 전부를 BLOCK. T003→T004 순서, T005→T006→T007 순서, T008은 T007 후, T009는 독립
- **US1 (Phase 3)**: Foundational 후. MVP
- **US2 (Phase 4)**: Foundational 후. T022는 T016(US1 화면 블록)이 있어야 얹을 수 있음 → **US1 구현(T016) 선행**
- **Polish (Phase 5)**: US1(+US2) 후

### User Story Dependencies

- **US1 (P1)**: Foundational만 의존. 독립 테스트 가능
- **US2 (P2)**: Foundational + US1의 화면 블록(T016)에 표시 한 줄 추가. 로직상 독립이나 같은 파일(`DiagnosticsScreen.tsx`)을 수정하므로 T016 이후 진행

### Within Each Story

- 테스트 먼저 작성 → 실패 확인 → 구현 → 그린 확인
- 타입·상수 → 조립 함수 → 리포트 배선 → 화면

### Parallel Opportunities

- **Phase 2**: T005는 T003/T004와 병렬 가능(다른 파일). T009는 T003~T008과 완전 병렬
- **Phase 3 테스트**: T010·T011·T012·T013·T014 전부 [P] — 서로 다른 테스트 파일(단 T010·T011·T019는 같은 `prompt-preview.test.ts`라 실제로는 순차 편집; 논리적으로 독립)
- **Phase 5**: T024·T025 병렬

---

## Parallel Example: Phase 3 테스트 작성

```
# 서로 다른 테스트 파일 — 병렬 작성 가능:
Task: "__tests__/diagnostics-report.test.ts — PP4/PP9 (T012)"
Task: "__tests__/constitution-rules.test.ts — PP7 위반 주입 (T013)"
Task: "__tests__/diagnostics-screen.test.tsx — 화면 렌더 (T014)"
```

---

## Implementation Strategy

### MVP First (US1만)

1. Phase 1 Setup
2. Phase 2 Foundational (T003~T009) — **모든 후속을 BLOCK**
3. Phase 3 US1 (T010~T018)
4. **STOP & VALIDATE**: 개발자 탭에서 프롬프트 원본이 캐릭터·프리셋별로 보인다(quickstart D1·D2). 여기서 데모 가능
5. Polish 일부(T024·T025)로 회귀 확인

### Incremental Delivery

1. Setup + Foundational → 기반 준비
2. US1 → 프롬프트 원본 표시 (MVP, 데모)
3. US2 → 근사 크기 표시 (얇은 증분)
4. Polish → 실기기 검증(T027) + Maestro(T026) + 로드맵 체크(T028) + 커밋(T029)

---

## Notes

- `[P]` = 다른 파일, 미완료 선행 없음
- 이 기능은 파이프라인·`RunResult`·`llama-port.ts`·`acceptance.ts`를 **건드리지 않는다**(PP9). 그 파일들의 diff가 생기면 잘못된 것
- `signals/expo-port` import는 `src/ui/`에서 허용(기존 `PermissionPanel` 배선) — 새 헌법 규칙이 이걸 잡으면 정규식이 과도한 것
- 새 네이티브 모듈 없음 → release 재확인 생략, debug 실기기 1회(012 기준)
- 커밋은 논리 단위마다. 각 Checkpoint에서 멈춰 독립 검증
