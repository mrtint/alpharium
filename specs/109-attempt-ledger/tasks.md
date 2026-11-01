# Tasks: 자동 쓰기 시도의 날짜별 장부

**Input**: `specs/109-attempt-ledger/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 이 저장소는 테스트를 먼저 쓴다(AGENTS 「작업 습관」) — 테스트 태스크를 구현 앞에 둔다. `.ts`는 `--selectProjects logic`, `.tsx`는 `ui`.

**Format**: `- [ ] Txxx [P?] [US?] 설명 + 파일 경로`

## Phase 1: Setup

- [X] T001 기준선 확인: `npx jest __tests__/app/auto-write-attempts.test.ts __tests__/app/auto-write-attempts-wiring.test.ts __tests__/app/diagnostics-view.test.ts __tests__/config/backup-rules-plugin.test.ts __tests__/i18n/boundaries.test.ts --selectProjects logic`와 `__tests__/ui/developer-screen.test.tsx`·`__tests__/ui/diagnostics-screen.test.tsx`(`--selectProjects ui`)가 현재 통과함을 확인한다(수정 전 상태 기록).

## Phase 2: Foundational (US1·US2 공통)

- [X] T002 `__tests__/app/auto-write-attempts.test.ts`를 장부 기준으로 다시 쓴다: 메모리 통로 대역을 `read(day)`·`write(day, text)`·`days()` 셋으로 바꾸고, 직렬화 왕복(`{ items: [...] }`, `at`은 ISO, 필드는 `at`·`path`·`outcome`·`launch`·`wake`·`day` 여섯뿐)과 깨진 파일은 그 날만 빈 값으로 읽는 것을 단언한다(contracts/ledger-file.md L2·L4). 먼저 실패하는 것을 확인한다.
- [X] T003 `src/app/auto-write-attempts.ts`: 통로 인터페이스를 `AutoWriteAttemptPort { read(day: DayDate): Promise<string|null>; write(day: DayDate, serialized: string): Promise<void>; days(): Promise<DayDate[]> }`로 바꾸고, 날 파일 직렬화·읽기(`loadDayAttempts(port, day)`: 시간순 `AutoWriteAttempt[]`, 깨졌으면 `[]`)를 구현한다. `MAX_AUTO_WRITE_ATTEMPTS`와 20건 자르기(`slice`)를 지운다. 갈래 상수·`attemptOutcomeOf`·`attemptDayOf`·`inOrder` 대기열은 유지한다. T002가 통과해야 한다.

**Checkpoint**: 통로와 날 파일 읽기·쓰기가 서 있다.

## Phase 3: User Story 1 — 며칠 뒤 한 번 읽어도 날마다 깨움이 모두 남는다 (P1) 🎯 MVP

**Goal**: 백그라운드 깨움이 상한 없이 날 파일에 남고 짝 교체·미완·합치기 규칙이 선다.
**Independent Test**: 같은 날 백그라운드 시작·끝을 30번 기록하면 `loadDayAttempts`가 30줄을 준다.

- [X] T004 [US1] `__tests__/app/auto-write-attempts.test.ts`에 기록 규칙 테스트를 더한다(data-model.md 표): ① 15분 간격 시작·끝 30쌍 → 30줄 전부 남음(SC-001) ② 시작만 기록하면 `started`가 남음 ③ 같은 `at`·`path`의 끝은 `started`를 교체하고 `day`를 싣고 `manual`/`background`는 서로 짝이 아님 ④ 짝 없는 끝은 덧붙임 ⑤ `app-open` 끝이 마지막 줄과 경로·결과·`day`가 같으면 시각만 갱신, `background`·`manual`은 합치지 않음(FR-004) ⑥ 합치기는 날 파일을 넘지 않음 ⑦ `recordAttemptExpired`는 만료 시각의 날 파일에 따로 선 줄을 덧붙이고 시작 줄을 건드리지 않으며 연달아도 합치지 않음 ⑧ 자정 직전 시작·자정 뒤 끝(같은 `at`)이 시작 날 파일에서 닫힘(시나리오 4) ⑨ 시작·앱 열기 기록이 겹쳐도 줄을 잃지 않음(느린 통로 대역, 기존 `slowPort` 방식). ⑩ 닷새에 걸쳐 기록하면 `days()`가 닷새를 모두 주고 어느 날도 비지 않음(시나리오 2) ⑪ 시계가 되감겨 이전 날의 `at`이 와도 그 `at`의 날 파일에 들어감(Edge Case). 먼저 실패하는 것을 확인한다.
- [X] T005 [US1] `src/app/auto-write-attempts.ts`: `recordAttemptStart`·`recordAttemptEnd`·`recordAttemptExpired`를 `dayOf(at)`(`src/config/day-boundary.ts`) 날 파일에 쓰도록 바꾼다(시그니처 불변, 시간순 덧붙임, 위 규칙). 실패는 삼키고 기존 `inOrder` 대기열을 쓴다. T004가 통과해야 한다.
- [X] T006 [US1] `src/app/auto-write-attempts.ts`: `expoAutoWriteAttemptPort()`를 장부 디렉터리 `attempt-ledger/`(`Paths.document`)로 바꾼다 — `read(day)`는 `YYYY-MM-DD.json`을 `textSync()`로, `write`는 임시 `*.json.writing`을 쓰고 `moveSync`(060 방식), `days()`는 디렉터리 항목 중 `^\d{4}-\d{2}-\d{2}\.json$`만 날로 돌려준다(없는 디렉터리는 빈 목록). 비동기 `File` 호출 금지(L7). 날 파일 이름은 함수로 만들고 `const X_FILE = "….json"` 상수 꼴을 쓰지 않는다(`__tests__/i18n/boundaries.test.ts`의 설정 파일 목록 테스트가 그 꼴만 센다). 소스 계약 테스트를 T002 파일에 더한다(디렉터리 이름 `attempt-ledger`, `*Sync()`만, 비동기 호출 없음).
- [X] T007 [P] [US1] `src/schedule/task.ts`: 기본 통로 주석(`preferences/auto-write-attempts.json` 언급)을 장부로 고친다. 호출부(`recordAttemptStart/End/Expired`)는 그대로다. `__tests__/schedule/`에 기존 task 테스트가 있으면 통과를 확인한다.

**Checkpoint**: US1 단독으로 기록이 상한 없이 남는다(화면 없음).

## Phase 4: User Story 2 — 진단·개발자 화면에서 날짜별 요약을 본다 (P2)

**Goal**: 두 화면의 「최근 자동 쓰기 시도」 자리에 날짜별 요약이 선다.
**Independent Test**: 장부에 사흘치 줄을 준 채 화면을 그리면 요약 셋이 최근 날부터 보인다.

- [X] T008 [US2] `__tests__/app/auto-write-attempts.test.ts`에 요약 테스트를 더한다(contracts/day-summary.md S1~S4): `summarizeDay` — `background`만 센다, 깨움 = `expired` 아닌 줄, 미완 = `started`, `byOutcome`은 `started`·`expired` 제외, `firstAt`/`lastAt`, 앱 열기·수동 줄은 세지 않음 / `summaryDays(earliest, today, 14)` — 가장 이른 날부터 오늘까지 최대 14일, 최근 날이 위, 파일 없는 날은 빈 요약 / `loadAttemptSummaries(port, now)` — 장부가 비면 빈 배열, 14일 넘게 있어도 최근 14일만. 먼저 실패하는 것을 확인한다.
- [X] T009 [US2] `src/app/auto-write-attempts.ts`: `DaySummary` 타입, `summarizeDay(day, items)`, `summaryDays(earliest, today, max = 14)`, `loadAttemptSummaries(port, now)`를 구현한다(data-model.md). `days()`로 가장 이른 날을 찾고 범위 안의 날 파일만 읽는다. T008이 통과해야 한다.
- [X] T010 [P] [US2] `src/i18n/catalogs/ko/attempts.ts`: 묶음 이름을 「날짜별 백그라운드」로, 빈 상태 문구를 유지·조정하고, 요약 줄 문구(머리 「M월 d일 · 깨움 N번」, 값 「HH:mm~HH:mm · {결과} N · …」, 미완 「끝나지 않음 N」, 깨움 0이면 「깨움 0번」만)를 함수형으로 더한다. 쓰이지 않게 된 `pathBackground`·`pathAppOpen`·`pathManual`·`line`·`withLaunch`·`wake*`·`launch*`·`withDay`와 소스에서 안 쓰는 키를 지운다(남기는 것은 결과 15개 문구와 새 문구). `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`·`CHANGED_AFTER_GOLDEN`에 올린다(골든을 다시 쓰지 않는다, AGENTS).
- [X] T011 [US2] `__tests__/app/diagnostics-view.test.ts`의 `attemptLines` 테스트를 `ledgerLines(summaries)` 테스트로 바꾼다: 최근 날 순서 유지, 머리·값 문자열, 깨움 0, 미완, 결과별 순서(`ATTEMPT_OUTCOMES` 순서), 시각은 기기 로컬 `HH:mm`. 먼저 실패하는 것을 확인한다.
- [X] T012 [US2] `src/app/diagnostics-view.ts`: `attemptLines()`와 경로 문구·꼬리 함수를 지우고 `ledgerLines(summaries: readonly DaySummary[]): AttemptLine[]`를 같은 `AttemptLine` 모양으로 구현한다(`attemptOutcomeText` 재사용). T011이 통과해야 한다.
- [X] T013 [US2] `App.tsx`: 두 곳(개발자 겹 effect ~732행, `DiagnosticsLayer` ~1996행)의 `loadAutoWriteAttempts(attemptPort)`·`attemptLines(…)`를 `loadAttemptSummaries(attemptPort, new Date())`·`ledgerLines(…)`로 바꾼다. 상태 이름·`alive` 검사·props는 그대로다.
- [X] T014 [P] [US2] `__tests__/app/auto-write-attempts-wiring.test.ts`를 새 배선에 맞게 고친다(`loadAttemptSummaries(attemptPort`·`setAttempts(ledgerLines(`·`setDeveloperAttempts(ledgerLines(`, 나머지 단언 유지). `__tests__/ui/diagnostics-screen.test.tsx`·`developer-screen.test.tsx`의 묶음 문구·`auto-write-attempts` 소스 단언을 새 상태에 맞게 고친다(`AttemptsGroup`은 값만 받으므로 UI 코드 변경 없음). `src/ui/AttemptsGroup.tsx` 머리말 주석의 「최근 자동 쓰기 시도」·20건 설명을 장부 설명으로 고친다.

**Checkpoint**: 두 화면에 날짜별 요약이 보인다.

## Phase 5: User Story 3 — 20건 기록을 걷고 실패가 쓰기를 막지 않는다 (P3)

**Goal**: 옛 20건 기록이 소스에서 사라지고, 기록 실패는 삼켜지며, 안드로이드 백업에서 장부가 빠진다.
**Independent Test**: 소스에 `auto-write-attempts.json`이 없고, 던지는 통로로 기록해도 던지지 않는다.

- [X] T015 [US3] `__tests__/app/auto-write-attempts.test.ts`에 소스 계약·실패 테스트를 더한다: 소스(주석 제거)에 `auto-write-attempts.json`·`MAX_AUTO_WRITE_ATTEMPTS`가 없다(FR-009, L6) / 읽기·쓰기·`days()`가 던져도 `recordAttempt*`·`loadAttemptSummaries`가 던지지 않는다(FR-006) / 깨진 날 파일은 그 날만 건너뛴다 / 필드 목록이 여섯뿐이라 이유 문자열·소요 시간 필드가 직렬화에 없다(FR-005, SC-006) / 소스에 장부를 지우는 호출이 임시 파일 정리뿐이고 `wipe-diaries.ts`·개발자 끄기·온보딩 다시 코드가 `attempt-ledger`를 참조하지 않는다(L3, FR-002) / 장부 모듈과 소스에 `fetch`·네트워크 호출이 없다(FR-011). 구현은 T005~T009에서 끝났으므로 통과해야 한다 — 통과하지 않으면 구현을 고친다.
- [X] T016 [P] [US3] `__tests__/config/backup-rules-plugin.test.ts`를 먼저 바꾼다: 두 규칙 XML(full-backup-content, data-extraction-rules의 cloud-backup·device-transfer)이 `models/`와 `attempt-ledger/` 둘을 빼고 `<include>`가 없음을 단언한다(FR-012, SC-007, L8). 실패를 확인한 뒤 `plugins/with-backup-rules.js`의 `EXCLUDE`/`EXCLUDED_PATH`를 목록(`EXCLUDED_PATHS = ["models/", "attempt-ledger/"]`)으로 넓힌다. 문서 머리말 주석에 장부 제외를 한 줄 더한다. `EXCLUDED_PATH` 내보내기를 쓰는 다른 테스트(`models/`가 `src/models/expo-port.ts`의 `DIRECTORY`와 같다는 단언)를 함께 맞춘다.
- [X] T017 [P] [US3] 옛 파일 참조 정리: `__tests__/i18n/boundaries.test.ts`(설정 파일 목록 단언 129행 근처의 `auto-write-attempts.json` 항목과 49행 근처 `READS_REASON` 설명 — 소스에서 상수가 사라지므로 지운다), `scripts/layer1/baseline.ts`의 `auto-write-attempts.json` delete 항목(소스에서 `*_FILE` 상수가 사라지면 G-1 `__tests__/e2e/baseline.test.ts`가 요구하는 대로 표를 맞춘다 — 장부는 `preferences/` 밖이라 표에 넣지 않는다), `scripts/layer2-ios/app-delete.ts` 122행 주석을 고친다. 관련 테스트(`__tests__/e2e/baseline.test.ts`)가 통과해야 한다.

**Checkpoint**: 세 스토리 모두 독립으로 동작한다.

## Phase 6: Polish & Cross-Cutting

- [X] T018 [P] 문서: `AGENTS.md`의 「개발자·진단 화면 하단에 「최근 자동 쓰기 시도」…」 문장들을 장부로 고친다(옛 서술을 덧대지 않고 고친다 — 뒤의 기능이 앞의 결정을 뒤집을 때의 규칙). `docs/background-write-conditions.md` 7행의 기록 위치를 장부로, `src/app/README.md` 12행의 설명을 고친다. `docs/e2e/feature-flow-map.md`·`.maestro/settings-developer-sweep.yml`의 「최근 자동 쓰기 시도」 문구를 새 묶음 이름으로 고친다(Maestro가 문구를 보는지 확인).
- [X] T019 위반 주입으로 방어 검증: ① 소스에 `auto-write-attempts.json` 문자열을 다시 넣으면 T015 테스트가 실패한다 ② `recordAttemptEnd`의 짝 교체를 빼면 T004가 실패한다 ③ 백업 규칙에서 `attempt-ledger/`를 빼면 T016이 실패한다 ④ 직렬화에 필드(`reason` 등)를 더하면 T015가 실패한다. 각각 치환이 적용됐는지 먼저 단언하고 실패를 확인한 뒤 되돌린다(AGENTS 「위반 주입으로 방어를 검증한다」).
- [X] T020 `npm test`·`npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 실행해 통과를 확인한다. tsc 0과 같은 규칙의 복제가 다른 파일에 남지 않았는지 `grep`으로 센다(`loadAutoWriteAttempts`·`attemptLines`·`MAX_AUTO_WRITE_ATTEMPTS`·`AutoWriteAttemptPort`의 옛 `read()`/`write(serialized)` 사용처 0).
- [ ] T021 (2026-11-01 갤럭시 잠금(PIN)으로 막힘 — 새 번들을 못 붙여 미확인, 로드맵 과제 3번에 이어서 적었다) 실기기 확인(SM-S901N dev 빌드, Metro 번들만 — `pm clear`·재설치 금지): `quickstart.md`의 실기기 절차 1~3. 개발자 화면 맨 아래 「날짜별 백그라운드」, 강제 잡 한 번 뒤 구역과 `run-as … cat files/attempt-ledger/<오늘>.json`의 `background` 줄을 확인한다. 못 본 것은 그대로 적는다. 관측 기준선 시각을 메모리 `project-bg-attempts-passive-measure`에 추가한다.

- [X] T022 로드맵 갱신은 완료 처리에서 한다: 「백그라운드 자동 쓰기가 완주하지 못한다」 과제는 관측(며칠 뒤 장부 읽기, SC-002)이 끝나지 않았으므로 진행 예정에 **남기고**, 할 일 3번을 장부 도입 완료·읽기 대기로 고쳐 쓴다. 109는 완료 이력 표에 한 줄로 올린다(관측 결과는 읽은 뒤 이 과제에 반영).

## Dependencies & Execution Order

- Phase 1 → Phase 2(T002→T003) → US1(T004→T005→T006, T007 병렬) → US2(T008→T009, T010 병렬, T011→T012, T013은 T009·T012 뒤, T014는 T013 뒤) → US3(T015는 US1·US2 구현 뒤, T016·T017 병렬) → Polish(T018 병렬, T019~T021 순서대로, T022는 마지막).
- US2의 T009는 US1의 T003·T005에 기댄다(통로 인터페이스). US3의 T016·T017은 다른 스토리와 파일이 겹치지 않아 병렬이다.

## Parallel Opportunities

- T007, T010, T014(T013 뒤), T016, T017, T018는 서로 다른 파일이라 병렬이다.
- 같은 파일 `src/app/auto-write-attempts.ts`와 `__tests__/app/auto-write-attempts.test.ts`를 만지는 T002~T009·T015는 순서대로 한다.

## Implementation Strategy

- **MVP = US1**: 기록이 상한 없이 남는 것만으로 로드맵 완료 조건의 증거가 선다(읽기는 `adb run-as cat`).
- 이어서 US2(화면), US3(정리·백업), Polish(문서·검증·실기기) 순서로 증분 전달한다.
