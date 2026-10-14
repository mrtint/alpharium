# Contract: 쓰기 실패 기록의 갈래와 「최근 실패」 묶음 (081)

060 `specs/060-diagnostics-screen/contracts/diagnostics.md`의 **WF1을 대체**한다(WF2~WF9는 그대로 — 080이 WF2에 `cancelled`를 더했다). 표는 [data-model.md](../data-model.md) §2.

## P — 파이프라인의 이유 문자열 (`src/diary/pipeline.ts`, `logic`)

- **P1** 어댑터가 `{ kind: "rejected", why }`를 돌려주면 결과는 `{ ok: false, stage: "generation", reason: "rejected: <why>" }`다 — 넷 모두.
- **P2** `reason`을 가진 실패의 문자열은 그대로다(`model-load-failed: not-found`·`vision-failed: cancelled`·`generation-failed: <문구>`). detail이 없는 실패(`timed-out`·`interrupted`·`not-implemented`)는 kind 한 낱말 그대로다.
- **P3** 결과에 새 필드가 없다 — 실패 결과의 키는 `ok`·`stage`·`reason`(+ 080 `cancelled`, 저장 실패의 `entry`)뿐이다. `PipelineStage`는 넓어지지 않는다. 결과에 `"text"`가 없다(002 FR-016).

## F — 갈래 판정 (`src/app/write-failures.ts`, `logic`)

- **F1** `WriteFailureReason`은 정확히 열하나다(data-model §1). 테스트가 그 수와 이름을 센다.
- **F2** 갈래 표(data-model §2)의 모든 줄이 성립한다. 한 실패는 한 갈래로만 옮겨진다. 던지지 않는다.
- **F3** `vision` + `cancelled` → `interrupted`. `vision` + `failed` → `photos`. `vision` + `not-ready` → `module`.
- **F4** `rejected`의 detail이 넷 밖이거나 없으면 `unwritten`이다(옛 모양 `"rejected"` 포함).
- **F5** 거부 갈래의 집합 == `REJECT_REASONS`(`src/diary/acceptance.ts`)의 집합. 테스트가 두 쪽을 직접 대조한다 — 판정 갈래가 늘거나 줄면 여기서 실패한다. **`write-failures.ts`는 `acceptance.ts`를 import하지 않는다**(테스트만 둘을 읽는다 — `src/app/` 모듈이 판정에 기대지 않게).
- **F6** `generation-failed`의 detail은 읽지 않는다 — 문구에 쌍점·`rejected`·`timed-out` 같은 낱말이 들어 있어도 `error`다.
- **F7** 판정은 단계·앞 토큰·닫힌 detail 값만 본다. `writeFailureReasonFor`의 함수 본문(주석 제외)에 한글 리터럴·`includes(`·`startsWith(`·정규식 매칭이 없다(소스 계약 — 본문 밖의 `isReason`은 갈래 이름 목록에 `includes`를 쓴다).
- **F8 (조립)** 진짜 `createPipeline()`에 실패를 돌려주는 백엔드를 물려 얻은 **결과 그대로**를 `writeFailureReasonFor()`에 넣으면: `rejected` 넷 → `empty`·`echo`·`language`·`unfinished`, `timed-out` → `timed-out`, `interrupted` → `interrupted`, `generation-failed` → `error`, `vision-failed: cancelled` → `interrupted`, `vision-failed: failed` → `photos`, `vision-failed: not-ready`·`model-load-failed` → `module`. 이유 문자열을 테스트가 손으로 쓰지 않는다.

## S — 저장 (`src/app/write-failures.ts`, `logic`)

- **S1** 직렬화된 항목의 키는 `reason`·`at` 둘뿐이다(060 WF3 그대로). 새 갈래로 기록해도 같다. 소스에 `duration`·`elapsed`·`timing`·`token`·`ms` 어휘가 없다.
- **S2** 새 갈래 여섯이 기록·재독 왕복에서 보존된다. 최근 10건·최신이 앞(WF4 그대로).
- **S3** 옛 기록(`unwritten`·`photos`·`module`·`empty`·`save`)은 그 갈래 그대로 읽힌다 — 다시 분류하지 않는다.
- **S4** 모르는 갈래의 항목은 그 항목만 버리고 나머지를 읽는다(WF5 그대로).
- **S5** `isRecordable`은 바뀌지 않는다 — 성공·`already-running`·`cancelled: true`는 기록하지 않는다(WF2·080).

## T — 문구 (`src/i18n/catalogs/ko/failures.ts`·`src/app/diagnostics-view.ts`, `logic`)

- **T1** 새 여섯 문구는 글자 단위로: 「지시문을 되뱉음」·「다른 언어로 씀」·「글을 끝맺지 못함」·「시간 초과」·「도중에 끊김」·「생성 중 오류」.
- **T2** 옛 다섯의 문구는 글자 하나 바뀌지 않는다(062 골든 G2가 `failureLines`의 출력을 잠근다 — 골든 json을 다시 쓰지 않는다).
- **T3** `failureLines()`가 열하나 갈래 모두에 빈 문자열이 아닌 `reasonText`를 준다. 열하나의 문구는 서로 다르다.
- **T4** 새 문구는 카탈로그 `failures` 영역에만 있고 `diagnostics` 영역의 키는 늘지 않는다. `ADDED_AFTER_GOLDEN`에 새 여섯이 올라 있다. 문구에 모델 이름·수치가 없다(060 DT4).
- **T5** 문구는 읽는 순간 카탈로그에서 꺼낸다 — 모듈 최상단에서 평가하지 않는다(062 C4).

- **T6** 새 문구는 「최근 실패」 묶음으로만 간다(FR-009): `src/`(주석 제외)에서 `FAILURE_TEXT`를 참조하는 파일은 `src/app/diagnostics-text.ts`(정의)와 `src/app/diagnostics-view.ts`(`reasonText`)뿐이다(카탈로그의 `failures` 영역은 `FAILURE_TEXT`로만 읽는다 — 묶음 머리 키 `diagnostics.failures`와 이름이 같아 영역 이름으로는 세지 않는다). `failure-toast.ts`·`src/schedule/notification-text.ts`·`src/ui/DiaryHomeScreen.tsx`의 소스(**주석을 걷은 뒤** — `failure-toast.ts`의 주석에 「시간 초과」가 있다)에 새 여섯 문구의 글자가 없다.

## G — 묶음 (`src/ui/FailuresGroup.tsx`, `ui`)

- **G1** 줄이 없으면 `${idPrefix}-failures-empty`에 「아직 실패가 없어요」 한 줄.
- **G2** 줄이 있으면 `${idPrefix}-failure-N`마다 까닭(label)과 시각(trailing)을 넘겨받은 순서대로 그린다. 빈 줄은 없다.
- **G3** 묶음의 testID는 `${idPrefix}-group-failures`, 머리는 「최근 실패」.
- **G4** 부품은 값만 받는다 — 소스가 `write-failures`를 import하지 않는다(타입도 `diagnostics-view`의 `FailureLine`만).

## D — 두 화면 (`ui`)

- **D1** 진단 화면: `diagnostics-group-failures`·`diagnostics-failures-empty`·`diagnostics-failure-N`이 지금과 같은 자리(「실행」 묶음 뒤, 시도 묶음 앞)에 있다. 기존 `diagnostics-screen.test.tsx`의 실패 묶음 단언이 수정 없이 통과한다.
- **D2** 개발자 화면: `developer-group-failures`가 `developer-group-attempts` **뒤**에 있다(트리 순서). `developer-group-off` → `developer-group-attempts` → `developer-group-failures`.
- **D3** 개발자 화면은 배포 환경(`showsDiagnostics: false`)에서도 「최근 실패」 묶음을 그린다.
- **D4** 개발자 화면의 소스는 `write-failures`를 import하지 않는다(`developer-screen.test.tsx`의 `auto-write-attempts` 단언과 같은 꼴).

## A — 조립 (`App.tsx`, `logic` 소스 계약)

- **A1** AppFrame이 `route === "developer"`일 때 `loadWriteFailures(`와 `loadAutoWriteAttempts(`를 함께 읽고, `failureLines(`로 옮겨 `failures={developerFailures}`로 `DeveloperScreen`에 넘긴다.
- **A2** 상태를 바꾸는 자리마다 살아 있는가(`alive`) 검사가 앞선다(078과 같은 꼴).
- **A3** 진단 겹의 읽기(`readFailures`)는 바뀌지 않는다.

## M — 실기기 흐름 (`.maestro/settings-developer-sweep.yml`)

- **M1** `developer-group-attempts` 단언 뒤에 `developer-group-failures`까지 내려 단언한다. 「진단」 행은 그 뒤 `direction: UP`으로 찾는다(078 그대로).
- **M2** `docs/e2e/feature-flow-map.md`의 표가 흐름과 어긋나지 않는다(`flow-map.test.ts`).

## X — 바뀌지 않는 것 (소스·기존 테스트)

- **X1** `src/diary/acceptance.ts`·`src/app/failure-toast.ts`·`src/app/auto-write-attempts.ts`·`src/i18n/catalogs/ko/attempts.ts`에 diff가 없다. `src/i18n/catalogs/ko/diagnostics.ts`는 **키와 값이 그대로다** — `failUnwritten` 위 주석(「다섯째 갈래 — 시간 초과·중단·판정 거부 등」)만 081에 맞게 고친다(골든 G2가 키·값을 잠근다).
- **X2** 새 파일이 `preferences/`에 생기지 않는다. `package.json`의 의존성에 diff가 없다.

## 위반 주입 (구현 뒤 한 번씩 — 치환이 적용됐는지 먼저 단언)

| 주입 | 잡아야 하는 것 |
| --- | --- |
| `pipeline.ts`의 `why` 갈래를 뺀다 | P1·F8 |
| `echo`를 `unwritten`으로 접는다 | F2·F8 |
| `vision` + `cancelled`를 `photos`로 되돌린다 | F3·F8 |
| `generation-failed`에서 detail로 분기를 더한다(예: detail에 `rejected`가 있으면 `echo`) | F6 |
| 카탈로그의 「도중에 끊김」을 다른 글자로 | T1 |
| `DeveloperScreen`에서 `FailuresGroup`을 `AttemptsGroup` 위로 올린다 / 뺀다 | D2 |
| AppFrame에서 `loadWriteFailures`를 뺀다 | A1 |
