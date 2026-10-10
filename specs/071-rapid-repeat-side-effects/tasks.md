# Tasks: 작명·온보딩·쓰기·그만두기 빠른 반복 부작용 확인

**Input**: `specs/071-rapid-repeat-side-effects/` — spec.md, plan.md, research.md, data-model.md, contracts/side-effect-list.md, quickstart.md

**Tests**: 이 저장소는 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」). 결함 수정 태스크(US2)는 테스트 → 수정 → 위반 주입 순서다. 순수 로직 테스트는 `.ts`(`logic`), 화면 테스트는 `.tsx`(`ui`).

**형식**: `- [ ] T### [P?] [US?] 설명 (파일 경로)` — `[P]` = 다른 파일·미완료 태스크에 의존 없음.

**순서 주의**: 이 과제는 **관측이 먼저**다. US1(관측·목록)이 끝나야 US2(수정)의 대상이 정해진다. US2 태스크는 `research.md` R2의 가설 H1~H4마다 하나씩 **조건부**로 놓였다 — US1에서 해당 증상이 관측되지 않으면 그 태스크는 지우지 않고 「N/A — 관측 없음(근거: SE 없음, 표 줄)」로 표시한다(원칙 V: 관측 없는 가설을 고치지 않는다). 가설과 다른 증상이 관측되면 T024로 태스크를 더한다.

**기기**: SM-G986N(`R3CN60JVNCE`), dev 빌드, 소유자가 `pm clear` 동의(2026-10-10). 계측·조작 스크립트는 저장소 밖(scratchpad)에 두고 커밋하지 않는다(FR-010, 원칙 IV).

## Phase 1: Setup

- [x] T001 현재 브랜치가 `071-rapid-repeat-side-effects`인지 `git branch --show-current`로 확인하고, `.specify/feature.json`의 `feature_directory`가 `specs/071-rapid-repeat-side-effects`인지 본다. 기기가 연결되어 잠금이 풀려 있는지(`adb devices`, `adb shell dumpsys trust`의 `deviceLocked=0`)와 `adb reverse tcp:8081 tcp:8081`을 확인한다.
- [x] T002 dev 빌드를 기기에 설치하고(`npx expo run:android`, 빌드가 끝난 뒤 Metro를 `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`로 띄운다) 번들이 dev 환경인지 `curl -s "localhost:8081/index.bundle?platform=android&dev=true" | grep -B1 '"EXPO_PUBLIC_APP_ENV"'`로 확인한다. 아니면 `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`를 둔다(gitignore) — AGENTS 「도구 사용법」 1. **release 빌드는 만들지 않는다**(FR-012, AGENTS 「테스트」).

## Phase 2: Foundational (관측 도구 — 모든 이야기의 전제)

**⚠️ 이 단계가 끝나야 반복 관측이 시작된다.** 아래 스크립트는 저장소 밖에 둔다.

- [x] T003 scratchpad(`C:\Users\mrtin\AppData\Local\Temp\claude\c--Users-mrtin-projects-alpharium\d8b51131-0176-496b-8825-c7c0cfd235cf\scratchpad\repeat\`)에 점검 스크립트 `check.sh`를 만든다: `run-as com.a810labs.pocketlog`로 `files/locks/diary-generation.lock`, `files/diary/` 목록(`.json.writing` 포함), `files/preferences/write-failures.json`을 읽고, `adb logcat -d`의 llama 적재·해제 줄 수와 `uiautomator dump`/`screencap`을 한 번에 저장해 `contracts/side-effect-list.md` C1 표의 한 줄 재료를 출력한다. `MSYS_NO_PATHCONV=1`을 앞에 붙인다(AGENTS). `dumpsys meminfo com.a810labs.pocketlog`의 PSS 합계를 전후로 찍는 옵션을 넣는다.
- [x] T004 scratchpad에 되돌리기 스크립트 `reset.sh`를 만든다: 잠금 파일·`write-failures.json`·반복 대상 날의 `.json`/`.json.writing`을 `run-as`로 지운다(research R3). `onboarding.json` 플래그를 되돌리는 옵션은 `adb push /data/local/tmp/` + `cat | run-as sh -c 'cat > …'` 방식으로 만든다(AGENTS: `adb shell "echo {...}"`는 셸이 따옴표를 먹는다).
- [x] T005 scratchpad에 조작 스크립트 `tap.sh`를 만든다: `uiautomator dump`로 「일기 쓰기」·「그만두기」(`stop-button` testID) 좌표를 읽는 함수와, 시나리오 `S-A`~`S-E`(research R1; S-E는 작명 확정 버튼 연타·온보딩 단계 연타·`onboarding.json` 플래그를 `reset.sh`로 되돌린 뒤 재진입)를 간격 인자(`0`·`300`·`1400`·`1600`·`3000`·`10000` ms)로 돌리는 함수를 둔다. 하단 바 잠금(`WRITING.barLockMs` 1.5초) 안·직후의 탭을 구분할 수 있게 `sleep`을 밀리초 단위로 쓴다. 좌표 확인 스크린샷을 `screencap`으로 한 번 남긴다.

**Checkpoint**: 기기에서 `check.sh`가 빈 기준 상태(잠금 없음·새 파일 없음)를 읽고 `tap.sh`가 홈의 버튼을 정확히 누른다.

## Phase 3: User Story 1 — 빠른 반복의 부작용이 증거와 함께 목록으로 남는다 (Priority: P1) 🎯 MVP

**Goal**: 여섯 간격 × 다섯 시나리오(S-A~S-E)를 실기기에서 재현하고, 점검 결과를 C1 표로, 어긋남을 C2 부작용 목록으로 `quickstart.md` 「관측 결과」에 쌓는다 (FR-001~005, SC-001·002).

**Independent Test**: 목록의 한 줄을 골라 그 재현 간격으로 다시 조작하면 같은 증상이 같은 점검 항목에 나타난다.

- [x] T006 [US1] **첫 완주(cold)**: `adb shell pm clear com.a810labs.pocketlog` → 앱을 열어 로고 → 권한 → 다운로드 동의·진행 → 작명 → liveness → 자동 첫 일기까지 따라간다. 이 구간의 `adb logcat -v time`을 scratchpad에 저장하고, 첫 모델 적재·내려받기·첫 쓰기 구간의 점검 결과(C1 한 줄 + 메모리)를 `quickstart.md` 「관측 결과」에 적는다(warmth = `cold`). **S-E(FR-013)**: 같은 구간에서 작명 확정 버튼 연타(0·300ms), 온보딩 단계 도중 앱을 내렸다 올림, 그리고 첫 일기 저장 뒤 `onboarding.json` 완료 플래그를 `reset.sh`로 되돌려 작명·온보딩에 다시 진입하고 이탈하는 것을 여섯 간격으로 반복해 같은 점검 항목(C1)으로 읽는다. 모델은 그대로 둔다.
- [x] T007 [US1] **정상 완주(R6)**: 모델이 적재된 상태에서 간격 10초 시나리오로 쓰기를 중단하지 않고 끝까지 둔다. 저장된 일기·완성 알림·완료 홈과 `check.sh` 결과를 기록한다(`warm`).
- [x] T008 [US1] **S-A 쓰기 → 그만두기 → 쓰기**를 여섯 간격으로, 간격마다 `reset.sh` → 반복 → `check.sh`. `warm` 기준 간격마다 3회씩 돌린다. 모델이 막 내려간 직후(`cold` 재적재)도 한 번 구분해 적는다. C1 표에 간격마다 한 줄.
- [x] T009 [US1] **S-B 하단 바 잠금 연타**: 「일기 쓰기」 직후 0·300·1400ms에 「그만두기」를 연타하고, 1.6초에 한 번 눌러 잠금이 연타를 막는지·직후 첫 탭이 정상인지 본다. 「그만두기」 직후 「일기 쓰기」 연타도 같은 간격으로 본다. C1 표에 적는다.
- [x] T010 [US1] **S-C 앱 내림·설정 왕복**: 쓰기 시작 직후·중간에 홈 버튼(`input keyevent 3`)으로 내렸다 올림, 설정을 열었다 닫음(`home-settings`)을 각각 해 본다. 생성 중 앱을 홈으로 보냈다 돌아오면 중단 실패가 약 20초 뒤 토스트로 올라오는 기존 알려진 동작(054)과 구분해 적는다.
- [x] T011 [US1] **S-D 같은 날 두 번 쓰기**: 이미 쓴 날에서 「다시 쓰기」 → 덮어쓰기 확인 → 그만두기 → 다시, 확인 대화상자를 연타하는 경우를 포함해 여섯 간격으로. 기존 일기 파일이 보존되는지(002 FR-023b·덮어쓰기는 저장이 성공할 때만) `diaryDir`로 확인한다.
- [x] T012 [US1] **그만두기가 이긴다 점검(Clarifications, 경계는 spec Edge Cases)**: 생성이 끝나는 순간 근처(로그에서 제목 질문이 끝나는 줄을 보고 타이밍을 맞춰)에 그만두기를 눌러, 저장 **시작 전**에 온 그만두기에서도 일기 파일이 만들어지거나 바뀌는지 `diaryDir`로 확인한다. 처음 쓰는 날과 다시 쓰기(옛 파일 내용 해시 전후 비교)를 모두 본다. 한 번에 맞추기 어렵다 — 여러 번 시도하고 시도 횟수와 결과를 적는다. 파일이 생기거나 바뀌면 `SE-n`(research H2)으로 올린다. 저장 I/O가 시작된 **뒤**에 온 경우는 spec이 `owner-decision`으로 남기기로 했으므로 관측되면 그 판정으로 적는다.
- [x] T013 [US1] 반복이 모두 끝난 뒤 불변 조건(C4)을 읽는다: 잠금 파일 없음, `.json.writing` 없음, 같은 날 일기 파일이 둘이 아님, `dumpsys meminfo` 전후 PSS 증가 폭(SC-005). `quickstart.md` 「관측 결과」에 C1 전체 표와 C2 부작용 목록이 완성되어 있는지, 빈 칸이 없는지(SC-002) 읽어 확인한다. **여기서 수정 대상이 확정된다 — US2 범위(`code-defect` 줄)를 목록 위에 적어 두고 멈추지 않고 US2로 간다.** 소유자에게는 최종 보고에 목록을 올린다(구현 구간 중간에는 승인을 기다리지 않는다).

**Checkpoint**: 여섯 간격 모두 「증상 있음(SE-n)」 또는 「관측 없음」이 적혀 있다(SC-001).

---

## Phase 4: User Story 2 — 관측된 코드 결함이 고쳐지고 다시 재현되지 않는다 (Priority: P1)

**Goal**: T013 목록의 `code-defect` 판정 증상을 TDD로 고치고, 위반 주입으로 방어를 확인하며, 같은 (시나리오, 간격)으로 5회 반복해 재현되지 않음을 확인한다 (FR-006~008, SC-003·004).

**Independent Test**: 고친 결함마다 (a) 같은 간격 5회 반복에서 재현되지 않는다 (b) 수정을 되돌리면 테스트가 실패한다.

**조건부 태스크**: 아래 T014~T021은 research.md R2의 가설별이다. 해당 SE가 T013 목록에 없으면 「N/A — 관측 없음」으로 표시하고 넘어간다. 있으면 테스트 먼저 → 수정 → 위반 주입 순서로 진행한다. 수정 전에 해당 파일 주변의 기존 계약 테스트(예: 054의 `toWriting()` 키 계약, 058의 `inFlight` 대기)를 먼저 읽고 어기지 않는다.

- [x] T014 [P] [US2] (H1 — SE 있을 때) 옛 쓰기가 새 쓰기의 `cancelled`/`running`/`inFlight`를 덮는 결함의 실패 테스트를 `__tests__/ui/home-rapid-cancel.test.tsx`에 쓴다: 쓰기 시작 → `stop()` 호출 후 `pipeline.run`이 resolve되기 **전에** 두 번째 쓰기 시작 → 첫 쓰기가 뒤늦게 돌아와도 실패 기록·토스트·`refresh`를 하지 않고 둘째의 `running`/`inFlight`를 건드리지 않음을 단언한다(대역 파이프라인의 resolve 시점을 테스트가 쥔다; fake timers 쓰면 `await act(async …)`). 처음엔 실패해야 한다.
- [x] T015 [US2] (H1) `src/ui/DiaryHomeScreen.tsx`의 `generate`/`cancel`에서 쓰기 시도마다 고유 번호(ref 카운터)를 두어, 늦게 돌아온 옛 시도가 자기 번호가 현재가 아니면 아무 것도 하지 않게 고친다. `cancelled`/`running`/`inFlight`는 현재 시도에 대해서만 쓴다. 058 지우기 대기(`await inFlight.current`)·054의 `Object.keys(toWriting())` 계약을 어기지 않는다. T014 통과.
- [x] T016 [P] [US2] (H2 — SE 있을 때) **저장을 시작하기 전에** 그만두기가 오면 저장하지 않는다(Clarifications, spec Edge Cases의 경계 — 소유자 확정 대기 추천안)는 실패 테스트를 `__tests__/diary/pipeline-cancel-on-save.test.ts`에 쓴다: `PipelineDeps`의 대역 `backend.generate`가 resolve한 뒤 `store.save` 호출 **전에** 중단이 걸린 경우 `store.save`가 호출되지 않고(`PipelineResult`는 실패 값, 기존 일기 불변), 사진 사본은 정리됨(`ownsResizedPath` 참인 것만)을 단언한다. 처음엔 실패해야 한다. **저장 I/O가 시작된 뒤의 취소는 일기를 남긴다** — 하루 단위 삭제는 만들지 않는다(`DiaryStore`에는 `removeAll`뿐이고, 다시 쓰기에서 지우면 옛 일기까지 잃어 FR-023b에 걸린다). 설계는 `PipelineDeps`에 옵셔널 `isCancelled?: () => boolean` 통로를 더하는 쪽으로 하되, `pipeline.ts`는 `expo-file-system`을 import하지 않는다(020 규칙) — 통로는 주입.
- [x] T017 [US2] (H2) `src/diary/pipeline.ts`의 `runStages`에서 `store.save` 직전에 `deps.isCancelled?.()`를 보고 참이면 **새 `PipelineStage`를 만들지 않고** 기존 `"generation"` 단계로 `interrupted: 그만두기`를 이유로 실패 값을 돌려준다(화면은 `cancelled`면 결과를 버리므로 실패 기록·토스트가 안 생긴다; 단계를 더하면 failure-toast·write-failures 갈래에 파급된다, 060). 사진 사본 정리는 기존 저장 실패 경로와 같은 규칙(`ownsResizedPath` 거짓인 원본은 절대 지우지 않는다)을 따른다. `src/app/wiring.ts`가 화면에서 받은 취소 판정 통로를 `deps.isCancelled`에 연결하고 `DiaryHomeScreen.tsx`는 `cancelled.current`를 그 통로로 넘긴다. T016 통과, `npm run test:logic`·`npm run test:ui` 통과.
- [x] T018 [P] [US2] (H3 — SE 있을 때) 잠금이 남는 증상이 관측되면 원인에 맞는 실패 테스트를 `__tests__/schedule/`(순수)에 쓴다: `release()`가 거부돼도 다음 `run()`이 stale 전에 회복하는지, 같은 인스턴스의 거의 동시 두 `run()`이 둘 다 `running` 검사를 통과하지 못하는지. 처음엔 실패해야 한다. **N/A — 관측 없음(H3): 잠금 해제 실패·같은 인스턴스 거의 동시 두 `run()`로 인한 증상 없음. 잠금이 그만두기 뒤 5~12초 남는 것은 H4의 환경 한계(016 FR-013)이고 SE-1 수정으로 화면 쪽 증상이 사라졌다.**
- [x] T019 [US2] (H3) `src/diary/pipeline.ts`/`src/schedule/lock.ts`에서 관측된 원인만 고친다(예: `running.add()`를 `await acquireLock()` 앞으로 옮겨 틈을 닫음). 잠금 해제 실패를 삼키는 `.catch(() => {})`는 stale 회복이 책임이므로 의도를 주석으로 남기되 동작은 관측 근거 없이 바꾸지 않는다. T018 통과. **N/A — 관측 없음(H3), T018과 같다.**
- [x] T020 [P] [US2] (H4 — SE 있을 때) 중단이 모델 적재 중이면 `unload`와 겹쳐 모델이 열린 채 남거나 이중 적재되는 증상이 관측되면, `__tests__/inference/`에 `engine-port` 대역으로 「적재 중 `stop()` → `unload()`가 정확히 한 번, 적재가 끝난 뒤에도 열린 채 남지 않음」을 단언하는 실패 테스트를 쓴다. 대역으로 재현할 수 없으면(실제 llama 타이밍) 소스 계약 테스트로 구조를 잠그거나 e2e 반복 시나리오에 넣을지 소유자에게 묻는다(FR-008, research R5) — **묻되 답을 기다리지 않고 기본(소스 계약 테스트)으로 진행하며**, 질문은 최종 보고에 남긴다(구현 구간 규칙). **N/A — 관측 없음(H4): 적재 중 중단 뒤 모델 중복 적재·열린 채 남음 증상 없음(메모리 누적 없음, 사진 읽기 중 PSS 최대 4.1GB 뒤 1.26GB로 복귀). 적재를 못 끊는 것은 환경 한계(016 FR-013).**
- [x] T021 [US2] (H4) `src/inference/on-device.ts`(`stop()` 403~408행, 적재 구간 671~684행)에서 관측된 원인만 고친다. T020 통과. **N/A — 관측 없음(H4), T020과 같다.**
- [x] T022 [US2] **위반 주입**: T015·T017·T019·T021에서 실제로 고친 것마다 수정을 일부러 되돌려(치환이 적용됐는지 먼저 단언 — prettier가 줄을 합쳐 치환이 조용히 안 먹을 수 있다) 해당 테스트가 실패하는지 확인하고, 되돌린 뒤 원래 문자열이 돌아왔는지 `git diff`로 확인한다(SC-004). 결과를 `quickstart.md` 「관측 결과」의 각 SE 줄에 C3 형식으로 적는다.
- [x] T023 [US2] **실기기 재검증**: 고친 모든 (시나리오, 간격)을 새 dev 번들로 각 5회 반복해 `check.sh`로 재현되지 않음을 확인한다(SC-003). 재현되면 해당 SE를 `open`으로 되돌린다.
- [x] T024 [US2] (H5 `.json.writing` 찌꺼기 또는 가설과 다른 증상이 관측된 경우) 해당 증상마다 위 T014~T023과 같은 형식으로 태스크를 더한다(테스트 먼저 → 수정 → 위반 주입 → 5회 반복; H5는 `src/diary/store.ts`의 `writeAtomically` 쪽). 이 태스크는 T013 목록에 H1~H4가 아닌 `code-defect`가 있을 때만 쓴다 — 없으면 「N/A」로 표시. **N/A — 관측 없음: H5(`.json.writing` 찌꺼기) 0건, 가설과 다른 `code-defect` 없음.**

**Checkpoint**: `code-defect`로 판정된 모든 SE가 `fixed`이거나 `not-fixed(이유)`다.

---

## Phase 5: User Story 3 — 못 고치는 것과 어긋남 없음이 근거와 함께 남는다 (Priority: P2)

**Goal**: 고치지 않는 증상과 관측 없는 간격이 이유·근거와 함께 문서에 남는다 (FR-005·009, SC-001).

**Independent Test**: 문서만 읽고 어떤 조작을 어떤 간격으로 했고 무엇을 읽었는지, 어떤 증상이 왜 남았는지 안다.

- [x] T025 [US3] `quickstart.md` 「관측 결과」를 점검한다: 모든 `env-limit`·`out-of-scope`·`owner-decision` 판정 SE에 `not-fixed` 이유가 있는지(FR-009), 「관측 없음」 간격에 본 점검 항목이 적혀 있는지(FR-005). 빠진 것은 채운다.
- [x] T026 [US3] 반복이 드러낸 **앞으로의 방어**를 정한다: jest가 못 잡는 타이밍 결함의 방어를 기본값(소스 계약 테스트)으로 정했다면, e2e 반복 시나리오로 옮길지는 소유자에게 묻는 질문으로 최종 보고에 남긴다. 소유자가 보고 전에 이미 e2e로 옮기기로 정했다면 `docs/roadmap/README.md`의 e2e 과제 「남은 것」에 한 줄을 더한다(새 과제를 열지 않는다). 아니면 이 태스크는 「N/A」.

---

## Phase 6: Polish & Cross-Cutting

- [x] T027 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 실행해 통과를 확인한다(SC-006). 실패하면 원인을 고친다 — 헌법 검사의 `SCREEN_TEXT_ALLOWLIST`·`checkI18nFile` 등이 새 코드에 걸리는지 본다.
- [x] T028 dev 실기기에서 고친 경로(T023과 별개로 한 번) 최종 확인을 하고 결과를 `quickstart.md`에 적는다. 수정이 없었다면(모든 가설이 「관측 없음」) 기기에서 본 간격·점검 항목 전체를 「관측 없음」으로 남긴 것이 이 확인이다.
- [x] T029 `AGENTS.md`의 「기능별 핵심 결론」에 071 절을 더한다 — **지금도 유효한 결론만**: 고친 결함과 그 원인, 관측되지 않은 간격, 남은 위험, 재현 절차 한 줄(「스크립트는 저장소 밖」). 기능별 상세 로그는 `specs/071-*/quickstart.md`에 둔다. 뒤의 결정이 앞을 뒤집은 것이 있으면 앞 서술을 고친다(주석으로 덧대지 않는다).
- [x] T030 `specs/071-rapid-repeat-side-effects/checklists/requirements.md`를 다시 훑고, 최종 보고에 쓸 목록(converge 이후 남은 지적, clarify 결정, 남은 리스크)을 정리한다.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → US1(Phase 3) → US2(Phase 4) → US3(Phase 5) → Polish(Phase 6)** 순서다. US2는 US1의 목록(T013)이 확정돼야 대상이 정해지므로 **병렬이 아니다.**
- US1 안: T006(첫 완주, cold)이 먼저고 나머지(T007~T012)는 순서 무관하나 한 기기를 쓰므로 **직렬**이다. T013이 마지막.
- US2 안: 가설별 쌍(T014→T015, T016→T017, T018→T019, T020→T021)은 쌍 안에서 순서 고정(테스트 먼저), 쌍끼리는 파일이 달라 `[P]` 가능(T014·T016·T018·T020). 단 H1과 H2는 둘 다 `DiaryHomeScreen.tsx`를 만지므로 구현 태스크(T015·T017)는 직렬.
- T022·T023은 모든 수정이 끝난 뒤.

## Parallel Examples

- US2 테스트 작성: T014, T016, T018, T020을 서로 다른 테스트 파일에서 동시에 쓸 수 있다.
- Phase 2 도구: T003·T004·T005는 서로 다른 스크립트라 동시에 만들 수 있다.

## Implementation Strategy

- **MVP = US1**: 관측과 목록만으로도 이 과제의 질문(「빠른 반복에서 무슨 일이 생기는가」)에 답이 난다. 수정(US2)은 그 답이 가리킨 만큼만 한다.
- 관측 전에 가설을 고치지 않는다 — 코드를 읽어 의심이 가는 H1·H2도 T008~T012에서 관측되기 전에는 손대지 않는다(원칙 V, 추측으로 고치지 않는다).
- 한 축(예: 잠금)을 깊게 파고들지 않는다 — 가설 넷을 같은 무게로 관측하고, 관측이 가리킨 곳만 판다.
- 커밋은 kickoff 규칙대로 세 번(설계 구간 → 구현 구간 → 로드맵 갱신)이며 각각 사용자 확인 뒤에 한다.

---

## Phase 7: Convergence

- [x] T031 S-A를 10초 간격으로(쓰기 → 10초 → 그만두기 → 10초 → 쓰기 → 3초 뒤 그만두기) 3회 돌리고, S-C(쓰는 중 홈 버튼·설정 왕복)를 0.3초·1.6초·10초 이탈로 각 1회 돌려 `quickstart.md` C1 표에 줄을 더한다 per FR-001, SC-001 (partial)
- [x] T032 S-E 나머지 — 온보딩 단계 도중(권한·동의 화면)에 앱을 내렸다 올림, 그리고 첫 일기 저장 뒤 `onboarding.json` 완료 플래그를 되돌려(모델 그대로) 작명·온보딩에 다시 들어갔다 나오기를 한 번씩 해 C1 표에 적는다 per FR-013 (partial)
- [x] T033 `adb logcat`에서 llama 적재·해제를 나타내는 줄(예: `llama`·`RNLlama`·`unload`)의 패턴을 찾아, 반복 전후 횟수를 C1 `log` 칸에 적는다. 읽을 줄이 없으면 「읽을 줄이 없음(근거)」으로 적고 `log` 칸을 정상으로 채우지 않는다 per FR-003 (partial)
- [x] T034 부족한 반복을 보충한다 — T=3000·1600은 3회까지, 덮어쓰기 확인 대화상자(`overwrite-confirm`)를 연타(0·300ms)해 쓰기가 한 번만 시작되는지 `check.sh`로 읽어 C1 표에 적는다 per T008·T011 (partial)
