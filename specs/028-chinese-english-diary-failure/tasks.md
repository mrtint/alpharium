---
description: "Task list — 샤오바이·모카 일기 생성 실패 조사"
---

# Tasks: 샤오바이·모카 일기 생성 실패 조사

**Input**: Design documents from `/specs/028-chinese-english-diary-failure/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 조건부. 교정이 US2(`acceptance.ts`) 또는 US3(`prompt.ts`)일
때만 계약 테스트를 **구현 전에** 추가한다(헌법 「개발 방식」). mojibake·
환경 요인이면 테스트 없음(코드 0줄).

**성격**: 진단 스펙(019·027 계열). 대부분의 "작업"은 실기기에서 사람이
두 캐릭터로 3회씩 생성하고 `adb logcat`을 채록·육안 판정하는 것이다.
새 Maestro 흐름·새 화면·새 `src/` 파일은 만들지 않는다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 선행 태스크 없음)
- **[Story]**: US1(갈래 특정) / US2(판정 교정) / US3(프롬프트 교정) /
  US4(mojibake 결론). US2·US3·US4는 **상호 배타** — US1 결과가 정확히
  하나를 발동한다.

---

## Phase 1: Setup (실기기·모델·Metro 준비)

**Purpose**: 조사를 시작할 수 있는 환경을 갖춘다. 하나라도 없으면 화면에
값이 멀쩡해도 재현이 빗나간다(AGENTS.md).

- [x] T001 브랜치 확인 — `git branch --show-current`가 `028-chinese-english-diary-failure`인지 눈으로 확인한다(스펙킷 `BRANCH:` 필드 아님, AGENTS.md 경고). 아니면 `git checkout 028-chinese-english-diary-failure`.
- [x] T002 실기기 dev 빌드 재설치 완료 (2026-09-01) — release APK가 서명 불일치로 덮어 설치 거부(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) → uninstall 후 `npx expo run:android` debug 설치(gradle 7m 22s). `dumpsys package` `flags=[ DEBUGGABLE ... ]` 확인.
- [x] T003 모델 재배치 완료 — a4·a5를 HF에서 재다운로드 → `adb push /data/local/tmp` → `run-as cp files/models/{a4,a5}`. on-device md5가 로드맵 17번 "1차 실측" verdict 지문과 정확히 일치. `state.json` 수동 작성(a4·a5 `passed:true`).
- [x] T004 Metro 클린 기동 완료 — `EXPO_PUBLIC_APP_ENV=dev NODE_ENV=development npx expo start --dev-client --clear`, `adb reverse tcp:8081 tcp:8081`. 번들 8028ms 로드, `ReactNativeJS: Running "main" with {... "fabric":true}`.
- [x] T005 잠금 해제 확인 — 초기 `deviceLocked=0` 확인. ⚠️ 앱 실행 후 자동 잠금됨(`deviceLocked=1`, Bouncer 화면) — **Phase 3 시작 시 사람이 PIN/패턴 해제 필요**. 화면 자동 꺼짐 10분으로 연장해 둠.
- [x] T006 로그 디렉터리·gitignore 확인 — `specs/028-chinese-english-diary-failure/logs/`가 있는지(Phase 3 채록 대상). `.gitignore`에 `specs/028-chinese-english-diary-failure/logs/*.log`를 추가해 원시 덤프가 커밋되지 않게 한다(`.gitkeep`은 유지). `adb logcat`은 태그 필터(`-s ReactNativeJS:* llama:*`)로 받아 파일로 저장하고 UTF-8로 읽는다(CP949 뭉갬 방지, 기기 노이즈 축소).

**Checkpoint**: 5개 전제(dev 빌드·모델·클린 Metro·잠금 해제·로그 위치)가 갖춰짐.

---

## Phase 2: Foundational (임시 조사 로그 삽입)

**Purpose**: 거부된 본문 전문을 `adb logcat`으로 채록할 수 있게 한다.
US1·US2·US3·US4 **모두**의 선행 조건이다. spec FR-003a, research §3.

**⚠️ 이 로그는 조사 후 반드시 제거된다(Phase 6). 최종 `src/` diff에
남으면 안 된다.**

- [x] T007 `src/inference/on-device.ts` — 판정 거부 분기(`if (!verdict.ok)` 블록, `return { kind: "rejected", why: verdict.why }` 직전)에 `console.log("[028-investigation] rejected", verdict.why, JSON.stringify(run.run.text));` 한 줄 추가. `Verdict`·`RunResult` 타입은 건드리지 않는다.
- [x] T008 `src/inference/on-device.ts` — 타임아웃 분기(`if (run.timedOut)` 안)에 `console.log("[028-investigation] timed-out");` 추가.
- [x] T009 `src/inference/on-device.ts` — 예외 분기(`catch` 안, `return { kind: "generation-failed", reason }` 직전)에 `console.log("[028-investigation] generation-failed", JSON.stringify(reason));` 추가.
- [x] T010 (해당 없음) `no-console` 규칙이 `eslint-config-expo`에 없음 — `eslint-disable` 주석 불필요(넣으면 "unused directive" 경고). `[028-investigation]` 주석만 동반.
- [x] T011 기기 없는 게이트 — `npm run test:logic` 통과(로그는 로직을 안 바꿈), `npm run lint` 통과. `git grep "028-investigation"`가 정확히 3건(+주석)임을 확인.

**Checkpoint**: 거부/타임아웃/예외 세 경로에서 텍스트·이유가 logcat으로 나온다.

---

## Phase 3: User Story 1 — 실패 갈래 특정 (Priority: P1) 🎯 MVP

**Goal**: 샤오바이·모카 각각의 실패 갈래를 실기기 로그로 확정하고
거부된 본문을 육안 판정한다. spec US1, contracts/investigation-record.md.

**Independent Test**: 두 캐릭터로 "사진 안 봄" 3회씩 생성 → 로그에서
갈래·거부 본문 채록 → `findings.md`에 분포와 육안 판정 기록. 이것만으로
SC-001·SC-002 충족.

- [x] T012 [US1] `findings.md` 뼈대 생성 — `specs/028-chinese-english-diary-failure/findings.md`를 data-model.md의 구조로 만든다(환경 헤더·캐릭터별 빈 표·결론 자리·미확인 잔여·로드맵 갱신).
- [x] T013 [US1] 환경 메타 채록 — 기기(SM-S901N)·Android SDK·빌드 종류·Metro clean 여부·`llama.rn` 0.12.8(`package.json` 확인)·모델 파일·조사 날짜를 `findings.md` 헤더에 적는다(C-IR-5).
- [x] T014 [US1] 샤오바이 3회 재현 — "사진을 보지 않음" + 과거 하루(009 범위 안, 신호 빈약) 고정. 각 회 `adb logcat -c` → 생성 → `adb logcat -d -s ReactNativeJS:* llama:* > logs/chinese-run{1,2,3}.log`.
- [x] T015 [US1] 샤오바이 채록 — 각 로그에서 `{ kind }`(+`why`)·`[028-investigation]` 본문·`ending`·`writingMs` 추출 → `findings.md` 샤오바이 표 3행(C-IR-1·C-IR-2).
- [x] T016 [US1] 모카 3회 재현 — 같은 조건. `adb logcat -d -s ReactNativeJS:* llama:* > logs/english-run{1,2,3}.log`.
- [x] T017 [US1] 모카 채록 — `findings.md` 모카 표 3행.
- [x] T018 [US1] 육안 판정 — 각 거부 본문을 사람이 읽어 `eyeballVerdict`(`empty`/`echo`/`wrong-language`/`mojibake`/`normal-target-language`) 결정, `findings.md`에 근거와 함께(C-IR-4, research §4). 자동 채점 스크립트 금지(원칙 IV).
- [x] T019 [US1] 갈래 분포 확정 — 캐릭터별 `branchDistribution`·`dominantBranch` 계산. 3회 갈리면 "3회 중 M회 `<갈래>`"로, `residual`은 "미확인 잔여" 자리에(C-IR-3, data-model.md CharacterFinding).
- [x] T020 [US1] 금동이 대조 — a1 미배치라 직접 재생성 대신 research §6 분석으로 갈음(`findings.md` "금동이 대조" 절): `quiet`/`chinese`/`english`가 같은 파이프라인·`judge()`·프롬프트·`SAMPLING`을 쓰는데 `quiet`(kanana)만 통과 → 원인이 **모델 자체**(kanana는 `<think>` 없음, 한국어 지시 안정)임이 확정. 사용자 보고("금동이 정상") 신뢰.
- [x] T021 [US1] `chosenPath` 결정 — 캐릭터별로 `US2-acceptance` / `US3-prompt` / `US4-mojibake` / `env-factor` 중 하나(research §종합 갈림길). 두 캐릭터가 달라도 됨. **재현 실패**(3회 다 정상)면 T004를 **1회** 다시(클린 Metro) 후 재시도 → 그래도 3회 정상이면 `env-factor`로 확정(research §5 — 클린 재기동은 1회만).

**Checkpoint**: SC-001·SC-002·SC-003 충족. 다음 Phase는 `chosenPath`가 정한다.

---

## Phase 4: User Story 2 — 언어 판정 교정 (Priority: P2) — 조건부

**발동 조건**: T021에서 어느 캐릭터든 `chosenPath === "US2-acceptance"`
(거부 본문이 `normal-target-language`인데 문자 클래스 범위 버그로 샜다).
**희박** — 헌법 로스터가 한글 금지를 MUST NOT으로 못 박아 판정 완화는
대부분 불가(research §2). 발동 안 하면 이 Phase 전체를 건너뛴다.

**Goal**: 정상 중국어/영어 본문이 `judge()`를 통과하도록 `acceptance.ts`의
문자 클래스만 최소 수정. contracts/language-judgment.md A절.

**Independent Test**: 계약 테스트에 채록한 정상 본문 통과 케이스 추가 →
녹색 + 실기기 재생성 저장.

- [ ] T022 [US2] 계약 테스트 먼저 — `__tests__/diary/acceptance.test.ts`에 T018에서 채록한 정상 중국어 본문·정상 영어 본문을 `judge(body, {kind:"eos"}, character, INSTRUCTIONS)`에 넣어 현재 코드가 `language`로 거부하는 것을 재현하는 케이스 추가(지금은 RED).
- [ ] T023 [US2] 원인 특정 — 어느 조건이 참이 되는지 소스에서 짚는다(`!hanja`가 참? 정상 간체가 `HANJA = /[一-鿿]/` 밖? `!latin`이 참?). `findings.md`에 CorrectionRecord `changeSummary`로.
- [ ] T024 [US2] 최소 수정 — `src/diary/acceptance.ts`의 문자 클래스 상수(`HANJA`/`LATIN`)만 넓힌다(예: `HANJA`에 U+3400–U+4DBF 추가). `REJECT_REASONS`·`judge()` 순서·`MIN_ECHO_LENGTH`·한국어 캐릭터 비대칭·`chinese`/`english`의 한글 금지 **무변경**(C-LJ-A1~A5).
- [ ] T025 [US2] 테스트 통과 — T022 케이스가 GREEN. 기존 A-6·A-7·"한국어 캐릭터는 영어 낱말이 섞여도 통과"·"chinese가 한글 섞으면 거부"가 계속 녹색. `npm run test:logic`.
- [ ] T026 [US2] 위반 주입 — 문자 클래스 변경을 되돌리면 T022 케이스 FAIL. 한글 금지를 실수로 풀면 "chinese가 한글 섞으면 거부" FAIL. 둘 다 확인하고 `findings.md`에.
- [ ] T027 [US2] `npm run lint` — eslint·tsc·헌법 검사·prettier 전부 통과. `REJECT_REASONS` 4개(SC-006).
- [ ] T027a [US2] 실기기 재확인 (FR-014·SC-004·SC-005, C-LJ-A7) — 두 캐릭터로 재생성해 일기가 저장되고 목록에 반영되는 것을 확인. 금동이(`quiet`) 생성이 회귀 없이 정상. debug 1회로 충분(순수 로직, 012 기준). `findings.md` CorrectionRecord `deviceReverify`에.

**Checkpoint**: 정상 본문 통과, 갈래 수 4 유지, 회귀 없음, 실기기 저장·목록 반영 확인.

---

## Phase 5: User Story 3 — 프롬프트 출력 언어 지시 강화 (Priority: P3) — 조건부

**발동 조건**: T021에서 어느 캐릭터든 `chosenPath === "US3-prompt"`
(모델이 엉뚱한 언어를 냄 — `eyeballVerdict === "wrong-language"`, 예:
qwen3 한글 혼입). 발동 안 하면 건너뛴다.

**Goal**: `prompt.ts`의 출력 언어 지시 한 줄만 강화. contracts/language-judgment.md B절.

**Independent Test**: 강화된 줄이 `fixedHead()`/`buildPrompt()`/
`instructionLines()` 세 곳에 바이트 동일하게 들어감(계약 테스트) +
실기기 대조 생성에서 두 캐릭터가 캐릭터 언어로 쓰고 다른 캐릭터 회귀
없음.

- [ ] T028 [US3] 계약 테스트 먼저 — `__tests__/diary/prompt.test.ts`에 강화 문장이 `fixedHead(character)`·`buildPrompt(request)`·`instructionLines(request)` 세 곳에 바이트 동일하게 나타나고 캐릭터별로 올바른 언어명(`중국어`/`영어`/`한국어`)이 들어가는 케이스 추가(지금 RED).
- [ ] T029 [US3] 최소 수정 — `src/diary/prompt.ts`의 `fixedHead()` 안 `` `${language}로 써라.` `` 한 줄만 강화(예: `` `반드시 ${language}로만 써라. 다른 언어를 섞지 마라.` ``). `LANGUAGE` 맵·`SPEAKER_RULES`·`TITLE_INSTRUCTION` 무변경(C-LJ-B1·B5·B6).
- [ ] T030 [US3] `promptPrefix()` 일치 확인 — `promptPrefix()`가 `fixedHead().join("\n")`와 같은 배열에서 나오므로 강화 문장이 접두사에도 자동 포함. P8("buildPrompt()는 언제나 promptPrefix()로 시작")·P10("접두사에 날마다 바뀌는 것 없음")·P11("캐릭터마다 접두사 다름") 녹색(C-LJ-B2·B3).
- [ ] T031 [US3] `instructionLines()` 포함 확인 — "instructionLines의 모든 줄이 프롬프트에 실제로 들어 있다(P-7)" 녹색. 되뱉기 판정이 강화 문장과 비교하게 됨(C-LJ-B4).
- [ ] T032 [US3] 테스트 통과 + 위반 주입 — `npm run test:logic`. 강화 문장을 `buildPrompt()`에만 넣고 `fixedHead()`에서 빼면 P8 FAIL, `instructionLines()`에서 빼면 P7 FAIL — 둘 다 확인하고 `findings.md`에.
- [ ] T033 [US3] `npm run lint` — 전부 통과.
- [ ] T034 [US3] 실기기 대조 생성 — 샤오바이·모카 → 출력이 각각 중국어·영어, 일기 저장됨. 금동이·오드·루이 → 여전히 한국어, 되뱉기·지어내기 위반 없음(005~017의 지시 줄 추가 근거 역검증). debug 1회(C-LJ-B8, 012 기준). `findings.md`에 결과.

**Checkpoint**: 두 캐릭터가 캐릭터 언어로 저장, 다른 세 캐릭터 회귀 없음.

---

## Phase 6: User Story 4 — mojibake 결론 / 임시 로그 제거 / 문서 (Priority: P3)

**Goal**: `chosenPath`가 `US4-mojibake` 또는 `env-factor`면 코드 0줄로
결론을 남긴다. **어느 경로든** 임시 조사 로그를 제거하고 문서를 마친다.
spec US4, contracts/language-judgment.md C절.

- [x] T035 임시 조사 로그 제거 — T007·T008·T009·T010의 `console.log` 3줄(+eslint-disable 주석) 삭제. `git grep "028-investigation"` → **0건**. `git diff src/`에서 이 3줄이 안 보임(FR-015·SC-007·C-IR-6).
- [x] T036 [US4] (mojibake일 때만) 결론 기록 — `findings.md`에 깨짐 양상(U+FFFD·surrogate·금지 기호), 재현 모델 조합(qwen3만/gemma3만/둘 다), `llama.rn` 0.12.8, 024 §10(EXAONE mojibake)과의 연관. `judge()`를 느슨하게 안 하는 이유(원칙 I) 한 줄.
- [x] T037 [US4] (mojibake일 때만) 로드맵 갱신 — `docs/roadmap/README.md` 17번 → "mojibake 확인, 14번과 병합", 14번 항목에 qwen3·gemma3 추가(FR-011).
- [x] T038 (해당 없음) `chosenPath`가 두 캐릭터 모두 `US4`(모델 부적합), `env-factor` 아님 — 3회씩 모두 재현됨(재현 실패 없음). 클린 Metro 재기동 불필요.
- [x] T039 `findings.md` 완성 — 캐릭터별 결론(`chosenPath`), CorrectionRecord(교정 있으면 diff 요약) 또는 "코드 변경 0줄" + `git diff src/` 0줄 확인, "미확인 잔여"(소수 갈래 → 후속 스펙), 로드맵 갱신 내역, **합성 하루·재배치 모델을 "경로가 도는가"에만 썼고 품질 결론에 쓰지 않았음 확인**(FR-013·010 원칙).
- [x] T040 (교정 없을 때만) 로드맵 17번 갱신 — 교정이 US2/US3였으면 T037 대신 여기서 17번을 "해소 — 028에서 `<경로>`로 교정" 또는 mojibake면 T037. `chosenPath`에 맞게.

**Checkpoint**: 임시 로그 0건, `findings.md` 완성, 로드맵 갱신.

---

## Phase 7: Polish & 최종 게이트

- [x] T041 최종 기기 없는 게이트 — `npm test`(기기 불필요 전부, ~13초)·`npm run lint` 통과. 교정이 있었으면 신규 계약 테스트 포함.
- [x] T042 `git diff` 검토 — 교정 없으면 `src/` 0줄(문서·findings만). 교정 있으면 `acceptance.ts` 또는 `prompt.ts` 한 곳 + `__tests__/diary/*.test.ts` 신규 케이스만. `on-device.ts`에 임시 로그 흔적 없음.
- [ ] T043 커밋 — 한국어 메시지. `028-chinese-english-diary-failure` 브랜치(`git branch --show-current` 재확인, AGENTS.md). `.githooks/pre-commit`이 `main` 직접 커밋을 막음.
- [ ] T044 (선택) PR 생성 — `main`으로. 로드맵 17번·(조건부)14번 갱신 포함.

---

## Dependencies & Execution Order

```
Phase 1 (T001–T006, Setup)
   ↓
Phase 2 (T007–T011, 임시 로그)  ← US1·US2·US3·US4 모두의 선행
   ↓
Phase 3 (T012–T021, US1 갈래 특정)  ← MVP. chosenPath를 정한다
   ↓
   ├── chosenPath = US2-acceptance → Phase 4 (T022–T027a)
   ├── chosenPath = US3-prompt     → Phase 5 (T028–T034)
   ├── chosenPath = US4-mojibake   → Phase 6 (T036–T037)
   └── chosenPath = env-factor     → Phase 6 (T038)
   ↓
Phase 6 (T035, T039–T040 항상; T036–T038 조건부)  ← 임시 로그 제거·문서
   ↓
Phase 7 (T041–T044, 게이트·커밋)
```

**상호 배타**: Phase 4·5는 `chosenPath`에 따라 **하나만** 발동. 두
캐릭터가 서로 다른 경로면 둘 다 발동할 수 있으나, "한 축을 깊게 파지
않는다"(헌법)에 따라 각 캐릭터의 **최빈 갈래만** 교정하고 나머지는
"미확인 잔여".

**병렬 기회**: 거의 없음 — 진단은 순차다. T014·T016(두 캐릭터 재현)은
같은 기기를 쓰므로 순차. T007–T009는 같은 파일(`on-device.ts`)이라 [P]
아님.

---

## Implementation Strategy

**MVP = Phase 1 + 2 + 3** (T001–T021). 여기서 SC-001·SC-002·SC-003이
충족되고, "샤오바이·모카가 왜 실패하는가"에 로그 근거가 있는 답이 나온다.
교정은 그 답이 정한다.

**증분 인도**:
1. MVP(갈래 특정) → `findings.md`에 실패 갈래 분포·거부 본문·육안 판정.
   여기서 멈춰도 로드맵 17번의 "다음 세션 할 일"이 완료된다.
2. `chosenPath`에 따라 Phase 4 **또는** 5 **또는** 6의 결론 태스크.
3. Phase 6(로그 제거·문서) + Phase 7(게이트·커밋)은 항상.

**중단 지점**: T021 이후 실측 데이터가 없으면(기기 미접속 등) 진행
불가 — 이 스펙은 실기기 실측이 본체다(헌법 원칙 V).
