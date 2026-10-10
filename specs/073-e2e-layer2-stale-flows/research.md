# Research: 073

NEEDS CLARIFICATION는 스펙 단계에서 모두 해소됐다(흐름 사이 기준 상태 = 흐름마다 `maestro test` 따로 + 기준 상태 재생성). 아래는 계획에서 정한 결정이다.

## R1 — 층 1 기준 상태 코드 재사용

- **Decision**: `scripts/layer1/runner.ts`의 L2~L6(프로브·모델 점검·앱 종료·설정 기준값·일기 폴더·사진 사본 정리)을 `prepareBaseline(device, serial, {baselineOverrides, fixtures})`로 뽑고 `runLayer1`은 그것을 부른 뒤 L7(maestro)을 한다. 층 1 동작·테스트는 그대로다.
- **Rationale**: 기준 상태 정의가 갈라지면 `baseline.test.ts`(G-1)의 보장이 층 2에 미치지 않는다.
- **Alternatives**: 층 2에 복사 → 갈라짐. `runLayer1`에 옵션만 더하기 → 층 1이 흐름 하나씩 돌지 않아 맞지 않음.

## R2 — 흐름마다 다른 전제 상태

- **Decision**: 층 2 흐름 표(`scripts/layer2/flows.ts`)가 흐름마다 (a) 설정 덮어쓰기, (b) 일기 픽스처 중 **빼는 날**, (c) 완료 한도, (d) `-e` 값을 갖는다.
  - 흐름 1·2: 어제 일기를 뺀다. 흐름 2는 `auto-diary.json`을 `{enabled:true, targetHour:<지금 시>}`로 덮는다(시도 창 3시간, `decideSchedule`). 오늘 일기는 있어야 한다 — 오늘이 선택 가능한 오후에도 `pickRetryDay`가 가장 최근 미작성일을 고르므로 오늘을 채워 두면 어제가 고른 날이 된다.
  - 흐름 3: 오늘 일기를 뺀다(진단은 홈에서 오늘을 쓴다).
  - 흐름 4: `onboarding.json`을 `{completed:false, downloadConsented:true, welcomeShown:false, batteryNoticeShown:true}`로 덮고 `character-names.json`을 지우고, 오늘 일기를 뺀다.
- **Rationale**: 057의 앱 열면 쓰기는 어제 재료(070 표본 사진)가 있어야 `write`로 판정된다. 사진이 없는 오늘이 고른 날이면 「재료 없음」으로 건너뛴다.
- **Alternatives**: 흐름이 화면에서 직접 일기를 지움 → 지우기 동작이 흐름에 섞임(스펙 Clarify에서 기각).

## R3 — 표본 사진과 어제

- **Decision**: 층 2도 `runLayer1WithSample`과 같은 앞단(표본 보장, 단일 기기)을 쓴다. 쓰기 흐름은 어제(1일 전)를 쓴다 — 표본에 사진이 있고 VLM 경로가 돈다. 어제 날짜는 실행기가 `-e YESTERDAY=YYYY-MM-DD`로 넘긴다(흐름에 날짜 리터럴 없음, 070 FL-1).
- **Rationale**: 오늘은 표본이 없다(070). 사진 있는 날로 써야 「사진 읽기 → 캡션 → 본문」이 실제로 돈다.
- **확인함(2026-10-10, `scripts/e2e-sample/manifest.ts`·`docs/e2e/sample-table.md`)**: 표본의 1일 전은 `commute`(사진 5장·장소 3곳)다. 폴백을 두지 않는다 — 표가 바뀌어 1일 전이 사진 0장이 되면 `layer2-source-contract`/흐름 표 테스트가 실패하도록 `flows.ts` 테스트에서 1일 전 사진 수 ≥ 1을 단언한다.

## R4 — 완료 대기 한도

- **Decision**: 쓰기 흐름 `extendedWaitUntil` 300000ms(기존 `generate-diary`·`in-place-writing`과 같음), 첫 실행 흐름은 모델 적재와 liveness 확인을 포함하므로 600000ms. 실행기 쪽 `maestro` 전체 시간 한도는 두지 않는다(Maestro가 흐름 한도로 끝난다).
- **Rationale**: 헤드리스가 아니라 전경이므로 AGENTS의 3~4배 지연이 없다. 콜드 최대 242초(옛 narrative)가 현재 로스터(quiet)에는 해당하지 않는다.

## R5 — 일기 가져오기

- **Decision**: 흐름이 끝날 때마다 `adb exec-out run-as <패키지> cat files/diary/<날>.json`으로 흐름이 쓴 날의 파일을 `.cache/layer2/<실행시각>/<흐름>-<날>.json`에 쓰고 경로를 출력한다. 흐름이 쓴 날은 흐름 표가 정한다(1·2: 어제, 3·4: 오늘). `.cache/`는 gitignore됨. 실패해도 통과/실패 판정에는 영향이 없다(출력일 뿐).
- **Rationale**: SC-005. 채점은 하지 않는다(원칙 IV). `run-as ... cat`은 AGENTS의 061 선례(`exec-out run-as … cat`)가 있다.

## R6 — 낡은 흐름 판정은 구현 때 기기에서

- **Decision**: 원인을 가르는 절차를 `contracts/stale-flows.md`로 고정한다: 층 1 기준 상태로 해당 흐름만 돌려 실패 단계 확인 → 화면을 `adb`/Maestro 계층에서 직접 본다 → 문구 변경 / 기준 상태 / 앱 결함 판정 → 고침 or 삭제.
- **Rationale**: 069는 원인을 확정하지 않았다(`today-diary`). 추측으로 고치면 원칙 V 위반.

## R7 — 첫 실행 흐름의 위험

- **Decision**: 흐름 4는 권한이 이미 부여된 기기를 전제로 한다(AGENTS: 권한 단계가 자동으로 지나감). 온보딩 플래그를 되돌리면 로고 → (권한 자동 통과) → 동의/진행(에셋이 있으면 건너뜀) → 작명 → liveness → 자동 첫 일기. 작명 입력은 흐름이 한다.
- **확인할 것**: `welcomeShown:false`·`completed:false`에서 에셋이 이미 있을 때 동의 Dialog가 뜨는지(`downloadConsented:true`면 안 뜸). 실기기 첫 실행 때 확인하고 안 맞으면 플래그 조합을 고친다.
