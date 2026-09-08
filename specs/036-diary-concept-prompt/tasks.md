---
description: "Task list for 036 — 일기 자동 생성 프롬프트 재구성 (E2SN)"
---

# Tasks: 일기 자동 생성 프롬프트 재구성 (E2SN)

**Input**: `/specs/036-diary-concept-prompt/` — spec.md, plan.md, research.md, data-model.md, contracts/prompt-e2sn.md, quickstart.md

**Tests**: 포함한다 — 헌법 「개발 방식」("계약을 먼저 정하고 테스트를 먼저 쓴다") + AGENTS.md("위반 주입으로 방어를 검증한다").

**Organization**: US1(짐작 일기)·US2(바이트 일치)·US3(사용자 지정 이름)별 phase. 세 스토리가 같은 파일(`src/diary/prompt.ts`)을 고치므로 순차적이다 — [P]는 테스트 작성·문서 등 파일이 다른 것에만 붙는다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 선행 태스크 없음
- **[Story]**: US1 / US2 / US3
- 정확한 파일 경로 포함

## Path Conventions

- 단일 저장소 mobile app: `src/diary/`, `__tests__/diary/`, `specs/036-diary-concept-prompt/`
- my-ollama 쪽: `~/Workspace/my-ollama/scripts/concept-prompt/` (alpharium 코드 아님)

---

## Phase 1: Setup (선행 확인)

**Purpose**: 문자열 출처와 검증 도구가 갖춰졌는지 확인

- [X] T001 my-ollama `concept-prompt-experiment` 브랜치(`cdabf64`)가 로컬에 fetch돼 있는지 확인한다: `cd ~/Workspace/my-ollama && git rev-parse concept-prompt-experiment`. 없으면 `git fetch origin concept-prompt-experiment:concept-prompt-experiment`.
- [X] T002 [P] `~/Workspace/my-ollama` `concept-prompt-experiment`에서 `src/fixtures/alpharium/concept-candidates.ts`·`concept-cases.ts`·`conditions.ts`, `scripts/concept-prompt/gen-baseline.ts`를 읽어 E2SN 조립 함수(`buildCandidate`, `e2HeadLines`, `sentenceSignalLines`, `wrappedCaptionLines`, `koHour`/`koCount`/`koMeters`)와 상수(`E2_RULES`·`E2_TITLE`·`E_TONE`·`S_*`·`SCENE_LIMIT`)의 정확한 문안을 `specs/036-diary-concept-prompt/research.md` R2·R7·R8과 대조 확인한다(이미 옮겨 적혀 있음 — 오타 없는지만).
- [X] T003 [P] 036 구현 전 baseline을 뽑아 회귀 기준으로 보관한다(quickstart.md §3a): `cd ~/Workspace/my-ollama && git checkout concept-prompt-experiment && ALPHARIUM_DIR=~/Workspace/alpharium npx tsx scripts/concept-prompt/gen-baseline.ts && cp results/concept-prompt/prompts/baseline.json results/concept-prompt/prompts/baseline-pre036.json`. (alpharium은 아직 `036` 브랜치, prompt.ts 미변경 상태.)

---

## Phase 2: Foundational (분기 골격 + 헬퍼)

**Purpose**: 언어 분기 구조와 한국어 숫자 헬퍼 — 모든 스토리가 이 위에 선다

**⚠️ CRITICAL**: 이 phase 완료 전에는 US1~US3 구현을 시작하지 않는다

- [X] T004 `src/diary/prompt.ts`에 한국어 숫자 헬퍼를 추가한다 — `KO_NUM`(13칸 배열), `koHour(h)`, `koCount(n, unit)`, `koMeters(m)`. research.md R2의 원본을 **문자 그대로** 복사하고, 출처 주석(`my-ollama concept-candidates.ts, roadmap 18 experiment`)을 단다. `buildPrompt()`가 결정적이어야 하므로 `koHour`는 인자만 읽는다(005 P6).
- [X] T005 `src/diary/prompt.ts`에 E2SN 상수를 추가한다 — `E2_RULES`(5줄 `readonly string[]`), `E2_TITLE`(4문장 `" "` join), `E_TONE`(`Record<Character, string>` — quiet만 실값, narrative·imaginative는 `""`, chinese·english는 안 읽힘), `S_DAY_OPEN`·`S_TRUNCATED`·`S_PLACES`·`S_VISION_PARTIAL`·`SCENE_LIMIT`. research.md R7·R8 문안 그대로. 각 상수에 출처·근거 주석(§5.6·§3.1·§4.1).
- [X] T006 `src/diary/prompt.ts`에 언어 분기 헬퍼를 추가한다 — `function usesE2SN(character: Character): boolean { return LANGUAGE[character] === "한국어"; }` (또는 동등한 인라인 판정). research.md R3 — 코드가 신호 값을 보고 정하는 게 아니라 `LANGUAGE` 상수(사람이 못 박은 표)를 읽는 것임을 주석에 명시(원칙 V).
- [X] T007 현행 상수(`SPEAKER_RULES`·`TITLE_INSTRUCTION`·`DAY_STILL_OPEN`·`TRUNCATED_WARNING`·`PLACES_LIMITATION`·`VISION_PARTIAL`·`VISION_UNREAD`·`VISION_NONE_READ`)를 **지우지 않고 유지**한다 — chinese·english가 계속 쓴다. 주석에 "한국어 캐릭터는 E2SN 상수, 외국어는 이것"을 적는다.

**Checkpoint**: 분기 판정·헬퍼·상수 준비됨 — 스토리 구현 시작 가능

---

## Phase 3: User Story 1 — 금동이 일기가 짐작으로 하루를 잇는다 (Priority: P1) 🎯 MVP

**Goal**: 한국어 캐릭터가 E2SN 머리 + 문장형 신호 + 감싼 캡션으로 일기를 쓴다. 면책·되뇜이 줄고 짐작으로 하루를 잇는다.

**Independent Test**: 실기기에서 금동이로 사진 없는 날 3편·있는 날 3편 생성 → 마지막 문단이 "못 봤다/기록이 없다"로 끝나지 않고, `unfinished`·`echo` 거부가 늘지 않으며, 짐작 어미 없는 인물형 지어내기가 0편(SC-004, SC-005).

### Tests for User Story 1 (먼저 쓰고 FAIL 확인) ⚠️

- [X] T008 [P] [US1] `__tests__/diary/prompt-e2sn.test.ts` 신규 — 계약 E1(새 머리). `promptPrefix("quiet")`가 호칭 줄 + `E2_RULES` 5줄 + `E_TONE.quiet` + `E2_TITLE` + `""` + `"한국어로 써라."` + `""`를 `"\n"` join한 것과 정확히 같다(빈 톤 줄로 인한 `\n\n` 없음 — `fixedHead`가 조건부 spread). "모른다고 쓴 일기가 지어낸 일기보다 낫다"·현행 목록형 예시 문장 **전체**(`"예를 들어 날씨, 주인이 먹은 것, 만난 사람, 집에서 한 일은"` — E2_RULES[2]의 '먹었는지'와 부분 충돌하므로 문장 전체로 검사)·`"#, *, **, - 같은"`·`'금동이의 오늘 일기'` 반례가 **없다**. 새 스위트가 `__tests__/jest-projects.test.ts`의 파일 수 가드에 잡히는지 확인(`.ts`라 `logic` 프로젝트 — `testMatch` 자동이나 카운트 갱신 필요할 수 있음). (contracts/prompt-e2sn.md E1)
- [X] T009 [P] [US1] `prompt-e2sn.test.ts` — 계약 E2(문장형 신호 + 날짜 삭제). 한국어 캐릭터 `buildPrompt()` 본문에 `"오늘 내가 본 것은 이렇다."`가 있고 `req.signals.date` 문자열이 없다. `none`≠`unknown`("없었다" vs "모른다. {reason}."). `koHour(8)`==="아침 여덟 시" 등 research.md R2 값. 걸음·배터리·연결 문장 없음. (E2)
- [X] T010 [P] [US1] `prompt-e2sn.test.ts` — 계약 E3·E4(감싼 캡션 / A-rule 기각). `visionLines(vision)`(한국어)이 `"내가 {N}시에 담은 장면: {text}"` 줄 + `SCENE_LIMIT`. `사진에 담긴 것:` 머리줄·`- {N}시:` 접두사 없음. `promptPrefix("quiet")`에 머리 인물 조항이 없다(인물 언급은 `SCENE_LIMIT` 하나). (E3, E4)
- [X] T011 [P] [US1] `prompt-e2sn.test.ts` — 계약 E5(instructionLines 되뱉기). 한국어 `instructionLines()`가 새 머리 + 조건부 `S_DAY_OPEN`·`S_TRUNCATED`·`S_PLACES`·`S_VISION_PARTIAL`·`SCENE_LIMIT`을 담고, 문장형 신호 본문(`사진은 .*장이 남았다`)은 안 담는다. 모든 줄이 `buildPrompt()`에 실제로 있다(P7 성질). (E5)
- [X] T012 [P] [US1] `prompt-e2sn.test.ts` — 계약 E8(톤 줄 캐릭터별). `fixedHead("quiet")`에 `"담담하게, 짧게 쓴다."`가 있고, `fixedHead("narrative")`·`fixedHead("imaginative")`에는 톤 줄이 없다(`E2_RULES` 마지막 줄 다음이 바로 `E2_TITLE`). (E8)
- [X] T013 [P] [US1] `prompt-e2sn.test.ts` — 위반 주입 검사. `E2_RULES`에 옛 문장 되살리기 / 날짜 머리줄 되살리기 / narrative에 톤 줄 붙이기 / `PERSON_RULE`을 머리에 넣기 — 넷이 각각 E1·E2·E8·E4를 FAIL시키는지 확인(테스트를 실제로 어겨 보고 되돌린다).

### Implementation for User Story 1

- [X] T014 [US1] `src/diary/prompt.ts` `fixedHead(character, customNames)`를 언어 분기한다. 한국어: 첫 줄 `너는 '${displayNameOf(character, customNames)}'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다.` + `...E2_RULES` + **조건부 spread** `...(E_TONE[character] ? [E_TONE[character]] : [])` (quiet만 값 있음, narrative·imaginative는 `""`라 원소가 안 들어가 `\n\n` 안 생김 — contracts E8) + `E2_TITLE` + `""` + `${LANGUAGE[character]}로 써라.` + `""`. 외국어: 현행 그대로(`...SPEAKER_RULES`, `nameLine(...)`, `TITLE_INSTRUCTION`, `""`, `${language}로 써라.`, `""`). data-model.md §2. (E1, E8)
- [X] T015 [US1] `src/diary/prompt.ts`에 `sentenceSignalLines(request, vision?)`를 추가한다(한국어 전용). data-model.md §3 순서 — `S_DAY_OPEN`(dayStillOpen) → `"오늘 내가 본 것은 이렇다."` → 사진(known ≥1: `사진은 {koCount}이 남았다. {times.map(koHour).join(", ")}에 찍혔다.` + complete=false면 `S_TRUNCATED`; known 0장/none: `"사진은 없었다."`; unknown: `사진은 모른다. ${reason}.`) → 자리(known: 거리 문장 + `S_PLACES`; none: `"다닌 자리는 남지 않았다."`; unknown: `다닌 자리는 모른다. ${reason}.`) → placeName 있으면 `다녀온 곳은 ${placeName} 근처였다.` → 감싼 캡션 + (available>considered면 `S_VISION_PARTIAL`). `none`≠`unknown` 유지(FR-008). 걸음·배터리·연결 안 만듦(FR-009). (E2)
- [X] T016 [US1] `src/diary/prompt.ts` `visionLines(vision)`를 언어 분기한다. 한국어(캡션 ≥1): `vision.captions.map(c => \`내가 ${c.takenAt.getHours()}시에 담은 장면: ${c.text}\`)` + `SCENE_LIMIT`. 캡션 0이면 `[]`. 외국어: 현행 `"사진에 담긴 것:"` + `- {N}시:` 목록. 캡션 본문 무변형(FR-015). **또한 `visionLimitLines(vision)`을 언어 분기한다** — `S_VISION_PARTIAL` 한 줄만 한국어에서 문장형 문안으로 갈라지고, `VISION_UNREAD`·`VISION_NONE_READ`는 현행 문안을 한국어도 그대로 쓴다(FR-016). `S_VISION_PARTIAL`은 한국어에서 `sentenceSignalLines()`가 캡션 뒤에 붙이므로(T015), `visionLimitLines()`의 한국어 분기는 `VISION_PARTIAL` 줄을 빼고 `VISION_UNREAD`·`VISION_NONE_READ`만 낸다. (E3)
- [X] T017 [US1] `src/diary/prompt.ts` `instructionLines(request, vision?)`를 언어 분기한다. 한국어: `...E2_RULES` + (quiet면 `E_TONE.quiet`) + `E2_TITLE` + 조건부(`S_DAY_OPEN` if dayStillOpen, `S_TRUNCATED` if 사진 잘림, `S_PLACES` if 자리 known, `S_VISION_PARTIAL` if available>considered, `SCENE_LIMIT` if 캡션≥1). 문장형 신호 본문은 안 담는다(005 P7). 외국어: 현행 그대로. `sentenceInstructionLines()`(concept-candidates.ts) 대응. (E5)
- [X] T018 [US1] `src/diary/prompt.ts` `buildPrompt(request, vision?)`를 언어 분기한다. 한국어: `[...fixedHead(character, customNames), ...sentenceSignalLines(request, vision), "", "이 기록으로 그 하루의 일기를 써라."].join("\n")` — 날짜 머리줄(`${request.signals.date}에 네가 본 것:`)·별도 `dayStillOpenPart`·`placeNamePart`·`visionPart` **삭제**(전부 `sentenceSignalLines` 안으로). 외국어: 현행 조립 그대로. `signals.date` 필드는 안 지운다(FR-007). data-model.md §5. (E2)
- [X] T019 [US1] `npm run test:logic` — T008~T013이 전부 통과할 때까지 T014~T018을 조정한다. 그다음 `npm run lint`(eslint·tsc·헌법 검사·prettier)와 `git diff src/diary/acceptance.ts`·`git diff src/inference/llama-port.ts`(둘 다 = 0줄 — E7 판정 4갈래, FR-022 네이티브 경계) 확인.

**Checkpoint**: 한국어 캐릭터가 E2SN 프롬프트를 낸다. US2·US3와 독립적으로 `npm test`로 검증됨.

---

## Phase 4: User Story 2 — 새 프롬프트가 my-ollama 실측과 바이트 일치 (Priority: P1)

**Goal**: 세 한국어 캐릭터 × 6케이스 = 18프롬프트가 `buildCandidate('E2SN', …)`와 바이트 일치. chinese·english × 6 = 12는 구현 전과 동일(회귀 없음).

**Independent Test**: my-ollama `verify-036.mjs`가 30행 전부 `✓`(quickstart.md §3).

### Tests for User Story 2 ⚠️

- [X] T020 [P] [US2] `__tests__/diary/prompt-e2sn.test.ts`에 계약 E6(외국어 현행 유지)를 추가한다. `promptPrefix("chinese")`가 현행 `SPEAKER_RULES` + `nameLine("chinese")` + `TITLE_INSTRUCTION` + `""` + `"중국어로 써라."` + `""`. `buildPrompt(chineseRequest)`에 `E2_RULES[0]` 없음, 현행 날짜 머리줄 있음, 캡션이 `"사진에 담긴 것:"` 목록. (contracts/prompt-e2sn.md E6)
- [X] T021 [P] [US2] `prompt-e2sn.test.ts`에 계약 E4(018 P8) 회귀를 확장한다 — 세 한국어 캐릭터 × 6 CONCEPT_CASES에서 `buildPrompt(req, vision).startsWith(promptPrefix(character, customNames))`. `__tests__/diary/prompt.test.ts` P8도 한국어 3캐릭터로 확장한다. (E4, quickstart §2)
- [X] T022 [P] [US2] `__tests__/diary/prompt.test.ts` 회귀 갱신 — P7(같은 상수), P2(한국어는 `S_DAY_OPEN`이 `instructionLines` 되뱉기 대상), 제목 지시문 되뱉기(한국어는 `E2_TITLE`), P12(순수 함수). 외국어 케이스는 P2·제목이 현행 문안 그대로 통과.

### Implementation for User Story 2

- [X] T023 [US2] `~/Workspace/my-ollama/scripts/concept-prompt/verify-036.mjs` 신규(my-ollama 쪽, alpharium 코드 아님). quickstart.md §3c 스크립트. **대조 방향 주의**(analyze C3·C4): `E_TONE` 톤 줄 제거는 **my-ollama `buildCandidate` 출력**(톤 줄이 들어 있음)에 적용한다 — alpharium은 narrative·imaginative에 톤 줄을 아예 안 내므로(`fixedHead` 조건부 spread, 빈 줄도 없음). 즉 `expected = buildCandidate("E2SN", c, preRow).prompt; if (ch !== "quiet") expected = expected.replace("\n" + MYOLLAMA_E_TONE[ch], "")` — `MYOLLAMA_E_TONE`은 `concept-candidates.ts`에서 import(alpharium 아님). quiet×6은 제거 없이 완전 대조. chinese·english×6은 `baseline-pre036.json`과 대조. 첫 diff 위치 출력, 실패 시 exit 1.
- [X] T024 [US2] alpharium `036` 브랜치에서 `cd ~/Workspace/my-ollama && ALPHARIUM_DIR=~/Workspace/alpharium npx tsx scripts/concept-prompt/gen-baseline.ts` → `baseline.json`(30행). `node scripts/concept-prompt/verify-036.mjs` 실행. **세 gate 전부 확인**: (a) quiet×6 완전 일치(SC-001), (b) narrative·imaginative×6 톤 줄 제외 일치(SC-001), (c) **chinese·english×6 = 12행이 `baseline-pre036.json`과 완전 일치**(SC-001a, FR-024a — 실패하면 언어 분기가 외국어를 잘못 삼킨 것). 어긋난 행이 있으면 **alpharium `src/diary/prompt.ts`를 E2SN 조립과 맞춘다**(concept-candidates.ts 안 고침, FR-024).
- [X] T025 [US2] T024가 30행 전부 `✓`가 될 때까지 T014~T018 + T023을 조정한다. 통과하면 quiet·narrative·imaginative × 6 = 18프롬프트를 `specs/036-diary-concept-prompt/logs/e2sn-prompts.txt`로 덤프한다(FR-025).

**Checkpoint**: 프롬프트가 리포트 §5.6 실측과 바이트 단위로 같다. 리포트 수치가 이 구현의 근거로 유효.

---

## Phase 5: User Story 3 — 사용자 지정 이름이 새 머리에 흐른다 (Priority: P2)

**Goal**: 새 머리의 호칭 줄이 `displayNameOf(character, customNames)`를 쓰고 접두사(`fixedHead`)에 남는다(035 FR-020, 018 P11).

**Independent Test**: `promptPrefix("quiet", { quiet: "복실이" })`의 호칭 줄이 "복실이"를 쓰고 나머지 머리 줄은 이름 미지정과 같다(SC-006).

### Tests for User Story 3 ⚠️

- [X] T026 [P] [US3] `__tests__/diary/prompt-e2sn.test.ts`에 사용자 지정 이름 검사를 추가한다. `promptPrefix("quiet", { quiet: "복실이" })`의 첫 줄이 `너는 '복실이'이라 불린다. 주인의 휴대폰이다. …`이고, 2번째 줄부터 끝까지(`E2_RULES`·톤 줄·`E2_TITLE`·언어 줄)는 `promptPrefix("quiet", {})`와 동일. `displayNameOf`가 폴백(이름 미지정 → "금동이")도 확인. (SC-006, spec US3 Acceptance)
- [X] T027 [P] [US3] `prompt-e2sn.test.ts` — 018 P11 재확인. 세 한국어 캐릭터의 `promptPrefix(character, {})`가 서로 다르다(호칭 줄 "금동이"/"루이"/"오드" + quiet만 톤 줄). 호칭 줄을 접두사에서 빼는 위반을 주입하면 narrative·imaginative 접두사가 같아지는 것을 확인(035 FR-020 근거).

### Implementation for User Story 3

- [X] T028 [US3] T014의 한국어 `fixedHead()` 첫 줄이 `displayNameOf(character, customNames)`를 쓰는지 확인한다(이미 T014에 포함 — 이 태스크는 T026·T027이 통과하는지 검증하고, `character-name.ts`·`persona.ts`를 **한 줄도 안 고쳤는지** `git diff`로 확인). `buildRequest`·`DiaryRequest`·`DiaryEntry.authorName` 무변경(035 유지).

**Checkpoint**: 사용자 지정 이름이 새 머리로 흐르고 018 프리필 경계가 유지된다.

---

## Phase 6: Polish & 실기기 검증

**Purpose**: 022 미리보기 회귀, 실기기 확인, 문서

- [X] T029 [P] 022 `prompt-preview` 계약(PP1 — 미리보기 문자열 == `buildPrompt()`)이 자동으로 따라오는지 `npm run test:logic`으로 확인한다. `src/diagnostics/prompt-preview.ts`는 `buildPrompt()`를 직접 부르므로 코드 변경 불필요 — 미리보기가 새 머리·문장형 신호를 렌더한다. `.maestro/prompt-preview.yml`에 문안 assert가 있으면 갱신한다(quickstart §4c).
- [ ] T030 [P] `.maestro/` 회귀 — `generate-diary.yml`·`diary-user-path.yml`을 `scripts/run-device-tests.mjs`로 돌려 새 프롬프트에서 흐름이 안 깨지는지 확인. 신규 Maestro 흐름은 없음.
- [ ] T031 실기기(SM-S901N, dev debug) — 금동이 사진 없는 날 3편 + 있는 날 3편 생성(quickstart §4a). `adb logcat`으로 `unfinished`·`echo` 거부율 현행 대비 확인, 마지막 문단이 면책으로 끝나지 않음(SC-004), 짐작 어미 없는 인물형 지어내기 0편(SC-005), `writingMs` 방향(SC-007). 사진 있는 날은 캡션 인물이 등장인물이 안 되는지(`SCENE_LIMIT` 효과).
- [ ] T032 실기기 — 루이·오드로 설정 탭 "일기 작성자" 변경 후 사진 없는 날 각 1편 생성(quickstart §4b, SC-004a). (a) 저장 여부(`rejected`?), (b) E2SN 머리에서 나온 일기를 **글로 기록**(채점 없음, 원칙 IV). `specs/036-diary-concept-prompt/logs/` 또는 findings에.
- [~] T033 [P] `specs/036-diary-concept-prompt/`에 실기기 관측 결과를 남긴다(quickstart 완료 체크리스트 갱신). 로드맵 `docs/roadmap/README.md` 18번 항목에 "036에서 구현" 결과를 추가한다(035 항목과 같은 형식 — 헌법 1.5.0 선행 커밋, 세 자리 변경, 실기기 관측, 루이·오드 미확정 → 14번).
- [ ] T034 PR 준비 — `036-diary-concept-prompt` 브랜치를 `main`으로 PR. 커밋 메시지 한국어(헌법 「개발 방식」). 본문에 헌법 1.5.0(`5a061b6`)·리포트 §7 결정 1~11·바이트 일치 결과·실기기 관측 요약.

---

## Dependencies & Execution Order

### Phase 순서

- **Setup (T001~T003)**: 먼저. T003(pre036 baseline)은 `prompt.ts` 변경 전에 떠야 회귀 기준이 된다.
- **Foundational (T004~T007)**: Setup 후. 모든 스토리를 막는다.
- **US1 (T008~T019)**: Foundational 후. MVP. 여기까지면 한국어 E2SN 프롬프트가 나온다.
- **US2 (T020~T025)**: US1의 T014~T018 구현이 있어야 바이트 대조가 의미 있다. T020~T022(테스트)는 US1 구현과 병행 가능하나, T024(대조 실행)는 US1 완료 후.
- **US3 (T026~T028)**: US1의 T014(fixedHead) 위에 선다. T026~T027은 US1 완료 후 바로.
- **Polish (T029~T034)**: 전부 후.

### 스토리 독립성

- **US1**은 단독으로 `npm test` 검증 가능 — MVP.
- **US2**는 US1 구현 산출물(바뀐 `prompt.ts`)을 검증한다 — US1 없이는 무의미.
- **US3**은 US1의 `fixedHead()` 변경에 기댄다 — 사실상 US1의 한 측면(호칭 줄)이나, 035 경계 확인이 독립 가치.

### 같은 파일 경합

T014~T018이 전부 `src/diary/prompt.ts`를 고친다 → **순차**. [P] 없음.
테스트 파일(`prompt-e2sn.test.ts`)은 T008~T013·T020~T022·T026~T027이 같은 파일에 쓰지만 서로 다른 `describe` 블록이라 병행 작성 가능 → [P].

---

## Parallel 예시

**Setup**: T002·T003 병행(T001 후).

**US1 테스트 작성**: T008·T009·T010·T011·T012·T013 전부 [P] — `prompt-e2sn.test.ts`의 다른 `describe`.

**US1 구현**: 순차 (T014 → T015 → T016 → T017 → T018 → T019). 같은 파일.

**Polish**: T029·T030·T033 병행 가능. T031·T032는 실기기 순차(기기 하나).

---

## Implementation Strategy

### MVP = US1 (T001~T019)

한국어 캐릭터가 E2SN 프롬프트를 내고 `npm test`·`lint`가 통과하면 MVP다. 이 시점에
프롬프트가 헌법 1.5.0을 구현한 상태이고, 바이트 일치(US2)는 "리포트 수치가 근거로
유효한가"의 확인이라 MVP 뒤에 온다.

### 증분 전달

1. **US1** → 한국어 E2SN 프롬프트 (기기 없는 검증).
2. **US2** → 바이트 일치 확인 (리포트 §5.6 수치 유효).
3. **US3** → 사용자 지정 이름 경계 확인.
4. **Polish** → 실기기(SC-004·SC-005·SC-004a) + 문서 + PR.

### 되돌리기 지점

US1 구현 중 바이트가 심하게 어긋나면(T024), `concept-candidates.ts`가 아니라
alpharium `prompt.ts`를 맞춘다(FR-024). E2SN 조립이 실측의 기준이다.

---

## 구현 세션 완료 상태 (2026-09-08, /speckit-implement)

**코드 완료 + 기기 없는 검증 통과. 실기기·PR 대기.**

- ✅ T001~T029 완료. 기기 없는 테스트 2626개 통과, lint(위반 0)·prettier 클린.
- ✅ SC-001 (18프롬프트 바이트 일치) + SC-001a (12프롬프트 회귀 없음) — my-ollama
  `verify-036.mjs` 통과, 30/30 일치.
- ✅ SC-002 (018 P8) — `prompt-e2sn.test.ts` E4/P8.
- ✅ SC-003 (test + lint + acceptance.ts diff 0) — 통과.
- ✅ SC-006 (사용자 지정 이름) — `prompt-e2sn.test.ts` US3.
- 🔶 T033 (문서) — 로드맵 18번 갱신 완료. 실기기 관측 결과는 세션 후 추가.
- ⏳ **T030** — Maestro 회귀(`generate-diary`·`diary-user-path`·`prompt-preview`).
  `prompt-preview.yml`의 `사진: 2장` → `사진은 두 장이 남았다` 갱신 완료. 기기 필요.
- ⏳ **T031** — 실기기 금동이 6편 (SC-004·SC-005·SC-007). SM-S901N 세션.
- ⏳ **T032** — 실기기 루이·오드 각 1편 관측 (SC-004a). SM-S901N 세션.
- ⏳ **T034** — `036-diary-concept-prompt` → `main` PR. 실기기 검증 후.

**my-ollama 쪽 변경** (`concept-prompt-experiment` 브랜치):
- `scripts/concept-prompt/gen-baseline.ts` — Windows `pathToFileURL` 수정.
- `scripts/concept-prompt/verify-036.mjs` — 신규 대조 스크립트.
- `results/concept-prompt/prompts/baseline{,-pre036}.json` — 036 프롬프트 스냅샷.

---

## Phase 7: Convergence

**진단**: 코드는 spec·plan·헌법의 기기 없는 요구를 전부 만족한다(FR-000~025,
SC-001·001a·002·003·006, 원칙 I~V). 바이트 일치 게이트(verify-036.mjs 30/30)도
통과해 리포트 §5.6 수치가 이 구현의 근거로 유효하다. 남은 것은 **spec이 실기기
세션으로 미룬 성공 기준**뿐이다 — 코드 갭·미구현·헌법 위반 없음.

- [X] T035 실기기(SM-S901N, dev debug)에서 금동이로 사진 없는 날 3편·있는 날 3편을 생성해 (a) 마지막 문단이 "못 봤다/기록이 없다" 진술로 끝나지 않고 (b) `unfinished`·`echo` 거부가 현행 대비 늘지 않았음을 `adb logcat`으로 확인한다 (quickstart.md §4a) — SC-004 (partial)
- [X] T036 실기기 금동이 6편에서 짐작 어미 없는 인물형 지어내기가 0편임을 눈으로 확인한다 (짐작 어미 붙은 장소 추측은 헌법 1.5.0 용인, 감점 안 함) — SC-005 (partial)
- [~] T037 실기기에서 루이(narrative)·오드(imaginative)로 설정 탭 "일기 작성자" 변경 후 사진 없는 날 각 1편을 생성해 (a) 저장 여부 (b) E2SN 머리에서 나온 일기를 `specs/036-diary-concept-prompt/logs/`에 **관측만** 글로 기록한다 (채점 없음, 원칙 IV; 리포트 §5.5는 kanana만 실측 — 이 관측이 로드맵 14번 입력) — SC-004a (partial)
- [X] T038 실기기 금동이 생성 1회의 `writingMs`가 현행(base) 대비 늘어나지 않았음을 확인한다 (E2SN 416자 < base 464자, BA 대비 빠름은 요구 안 함) — SC-007 (partial)
- [X] T039 `.maestro/` 회귀를 `scripts/run-device-tests.mjs`로 돌려 `generate-diary.yml`·`diary-user-path.yml`·`prompt-preview.yml`(assert `사진은 두 장이 남았다`로 갱신 완료)이 새 프롬프트에서 PASS함을 확인한다 — plan Phase 6 / T030 (partial)
- [ ] T040 실기기 검증(T035~T039) 결과를 `specs/036-diary-concept-prompt/`와 로드맵 `docs/roadmap/README.md` 18번 항목("실기기 검증 대기" → 완료)에 기록하고, `036-diary-concept-prompt` → `main` PR을 연다 (커밋 메시지 한국어, 본문에 헌법 1.5.0·바이트 일치·실기기 관측 요약) — T033/T034 완료
