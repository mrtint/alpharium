# Contract: 진단 화면 개편 (060)

테스트가 잠그는 약속. 이름은 테스트 `describe`에 그대로 쓴다.

## DT — 문구 원문 (`src/ui/diagnostics-text.ts`, `logic`)

- **DT1** 분해 설계 §3.6 KO 문구표의 모든 키가 글자 단위로 같다: `diag.title` 「진단」 · `diag.env` 「환경」 · `diag.build` 「빌드」 · `diag.device` 「기기」 · `diag.inference` 「추론 위치」 ·
  `diag.inference.cpu` 「기기 · CPU」 · `diag.storage` 「저장 점검」 · `diag.storage.ok` 「{n}편 · 정상」 · `diag.storage.bad` 「{n}편 · {k}편 읽기 실패」 · `diag.photoPerm` 「사진 권한」 ·
  `diag.photoRead` 「사진 읽기」 · `diag.photoLocation` 「사진 위치 정보」 · `diag.photoScope` 「범위」 · `diag.scopeAll` 「전체」 · `diag.scopeSelected` 「선택한 사진만」 ·
  `diag.probe` 「신호 프로브 · 오늘」 · `diag.probe.refresh` 「다시 읽기」 · `diag.probe.photos` 「사진」 · `.places` 「장소」 · `.steps` 「걸음」 · `.battery` 「배터리」 · `.network` 「연결」 ·
  `diag.probe.unknown` 「모름」 · `diag.prompt` 「입력 프롬프트 미리보기」 · `diag.preset1` 「프리셋 1 · 신호 없음」 · `diag.preset2` 「프리셋 2 · 사진 있음」 · `diag.gen` 「생성」 ·
  `diag.tryOnce` 「지금 한 번 써 보기」 · `diag.runAuto` 「자동 쓰기 지금 실행」 · `diag.tryOnce.toast` 「진단에서 쓰기를 시작했어요.」 · `diag.failures` 「최근 실패」 ·
  `diag.fail.module` 「모듈을 불러오지 못함」 · `.photos` 「사진을 읽지 못함」 · `.empty` 「글이 비어 있음」 · `.save` 「저장하지 못함」.
- **DT2** 표 밖 문구는 이 파일 한 곳에 모아 두고(`unwritten` 「일기를 쓰지 못함」·자동 쓰기 결과 세 줄·빈 실패 줄·저장 점검 전 값) 보드 밖임을 주석으로 밝힌다.
- **DT3** `{n}`·`{k}` 채움 함수가 「0편 · 정상」·「41편 · 2편 읽기 실패」를 만든다.
- **DT4** 문구에 모델 이름·파라미터 수·양자화 표기가 없다(정규식 계약, 원칙 III).

## WF — 쓰기 실패 기록 (`src/app/write-failures.ts`, `logic`)

- **WF1** 갈래 판정(R3): `storage`→`save`; `request-build`·`model-not-ready`→`module`; `signals`→`photos`; `vision` + `vision-failed: not-ready`→`module`, 그 밖 `vision`→`photos`;
  `generation` + `model-load-failed`→`module`, `rejected: empty`→`empty`, `rejected: echo|language|unfinished`·`timed-out`·`interrupted`·`generation-failed`·`backend-unavailable`·`not-implemented`→`unwritten`;
  `day-not-closed`·모르는 단계·모르는 reason→`unwritten`. 판정은 reason의 앞 토큰과 `vision-failed`의 detail·`rejected`의 detail만 본다(문구 전체 비교 없음 — 소스 계약).
- **WF2** `already-running`은 기록하지 않는다. 성공(`ok: true`)은 기록하지 않는다.
- **WF3** 기록 항목의 필드는 `reason`·`at` 둘뿐이다(소스 계약 — 직렬화 객체 키). 소스에 `duration`·`elapsed`·`timing`·`token`·`ms` 어휘가 없다(주석 제외, FR-021).
- **WF4** 더하면 맨 앞에 들어가고 10건을 넘으면 가장 오래된 것부터 빠진다. 같은 갈래가 연달아도 합치지 않는다(각각 한 줄).
- **WF5** `loadWriteFailures`: 파일 없음·깨진 JSON·`items`가 배열 아님·통로 예외는 빈 목록. 모르는 `reason`이나 해석 안 되는 `at`인 항목만 버린다. 던지지 않는다.
- **WF6** `recordWriteFailure`는 던지지 않는다 — 읽기·쓰기 통로가 던져도 삼킨다(FR-018). 쓰기는 임시 파일 후 이름 바꾸기다.
- **WF7** 부르는 곳(소스 계약, 주석 제외): `DiaryHomeScreen.tsx`의 `generate`는 `cancelled.current` 검사 **뒤에** 주입받은 `recordFailure(`를 부르고(홈은 `write-failures`를 import하지 않는다 — UI는 기기 통로를 모른다) `App.tsx`가 그 prop에 `recordWriteFailure`를 연결한다; `task.ts`는 `already-running` 분기 **앞에** 부르고 `catch`의 예상 못 한 예외도
  `unwritten`으로 기록한다; `wiring.ts`의 `triggerFirstRunAutoDiary`는 결과가 실패이면 부른다. 파이프라인(`pipeline.ts`)은 `write-failures`를 import하지 않는다.
- **WF8** 통로 구현은 `preferences/write-failures.json` 한 파일이다. `auto-diary.json`·`auto-write-skipped.json`·`onboarding.json`·`notified.json`을 읽거나 쓰지 않는다(소스 계약).
- **WF9** 058 `wipe-diaries.ts`는 `write-failures`를 import하지 않는다(지우기가 이 기록을 건드리지 않는다).

## DI — 저장 점검 (`src/app/diary-inspect.ts`, `logic`)

- **DI1** 일기 N편이 모두 읽히면 `{ total: N, unreadable: 0 }`; `load`가 던지거나 `null`인 날은 `unreadable`에 센다.
- **DI2** `listDays()`가 던지면 `unavailable`(값을 비운다) — 0편·정상으로 적지 않는다(원칙 V).
- **DI3** 읽기만 한다 — `store.save`·`removeAll`·파일 쓰기를 부르지 않는다(소스 계약: 통로에 쓰기 메서드가 없다).

## DV — 화면 값 조립 (`src/app/diagnostics-view.ts`, `logic`)

- **DV1** 환경 줄: 빌드 = 059 `buildLabelFor` 값; 기기 = 「Android {Release}」(읽지 못하면 `null`); 추론 위치 = 기기 → 「기기 · CPU」, 로컬 서버 → 「로컬 서버」, 고르지 못함 → 「선택되지 않음」.
- **DV2** 신호 칸은 항상 다섯, 순서는 사진·장소·걸음·배터리·연결. 걸음·배터리·연결은 입력이 무엇이든 `unknown` 모양과 「모름」이다.
- **DV3** 사진·장소: `known` → 숫자 텍스트, `none` → 「없음」, `unknown` → 「모름」(0이 아니다). 사진이 `none`이면 장소도 「없음」(053 규칙), 사진이 `unknown`이면 장소를 「없음」으로 승격하지 않는다.
- **DV4** 사진 권한 묶음: 읽기 = `granted`→허용됨·`limited`→일부 허용·`denied`/`blocked`/`undetermined`→허용 안 함; 위치 정보 = `ok`→허용됨·`denied`→허용 안 함·`unknown`/`no-photo`→`null`;
  범위 = `granted`→전체·`limited`→선택한 사진만·그 밖→`null`.
- **DV5** 읽기 요청 가능 판정: `denied`·`undetermined`만 요청한다. `granted`·`limited`·`blocked`에서는 요청하지 않는다(004 FR-023).
- **DV6** 실패 줄: 최신이 위, 갈래 → 문구(`diag.fail.*` 넷 + 「일기를 쓰지 못함」), 시각 표기는 현지 `M월 d일 HH:mm` 한 가지 형식. 항목에 다른 필드가 없다.
- **DV7** 순수 함수다 — `new Date()`·`Date.now()`를 안에서 부르지 않는다(`now`는 인자, 소스 계약).
- **DV8** 「기기 · CPU」는 `src/inference/llama-port.ts`의 `GPU_LAYERS = 0` 고정에 근거한다 — 소스 계약: 그 상수가 `0`이고 `diagnostics-view.ts`가 이 문구를 기기 추론 갈래에서만 쓴다(상수가 바뀌면 테스트가 깨져 문구를 같이 고치게 한다, R8).

## DS — 진단 화면 (`DiagnosticsScreen.tsx`, `ui`)

- **DS1** 묶음 순서: 환경 → 저장 점검 → 사진 권한 → 신호 프로브 · 오늘 → 입력 프롬프트 미리보기 → 생성 → 최근 실패. 각 묶음에 `diagnostics-group-<key>` testID(`env`·`storage`·`photo`·`probe`·`prompt`·`gen`·`failures`).
- **DS2** 저장 점검 행을 누르면 `onInspectStorage`가 불리고, 결과 값이 행에 보인다(`diagnostics-storage-value`). 점검 전 값은 비어 있다.
- **DS3** 사진 읽기 행은 요청 가능 상태에서만 `onRequestPhoto`를 호출하고 그 밖에서는 `onPress`를 넘기지 않는다(058 「누를 수 없는 행은 onPress도 안 넘긴다」).
- **DS4** 신호 프로브 다섯 칸이 `diagnostics-probe-photos|places|steps|battery|network`로 항상 렌더된다. 「모름」 칸은 회색 면 + 회색 글자 토큰(`textMuted`·`neutral-200`)이고 값 글꼴이 고정폭이 아니다.
  「다시 읽기」는 `onRefreshProbe`를 부른다. 화면 마운트 때 한 번 읽고(마운트 효과), 그 밖에는 읽지 않는다(`useEffect` 의존성에 시간·AppState 없음).
- **DS5** 프롬프트 미리보기: 프리셋 두 토글(`diagnostics-preset-empty`·`diagnostics-preset-photos`), 선택한 프리셋의 문자열이 `selectable` 텍스트로 상자 안에서 따로 스크롤된다(`nestedScrollEnabled`). 크기 라벨은
  「조립 시점 근사치, 실측 토큰 아님」 문구를 유지한다(022 PP6 — 금지 대상은 소스의 ASCII `token` 어휘와 측정값이고 이 한글 라벨 한 문장은 허용된다).
- **DS6** 생성: 「지금 한 번 써 보기」(`diagnostics-try-once`) → `onTryOnce`, 「자동 쓰기 지금 실행」(`diagnostics-run-auto`) → `onRunAuto`; 자동 쓰기가 도는 동안은 `onRunAuto`를 다시 부르지 않고 값 줄(`diagnostics-auto-result`)이 결과를 보인다.
- **DS7** 최근 실패: 항목이 없으면 빈 줄 하나(`diagnostics-failures-empty`), 있으면 줄마다 갈래 문구와 시각이 있고 `onPress`가 없다.
- **DS8** 소스 계약(주석 제외): `DiagnosticsScreen.tsx`·`DiagnosticsParts.tsx`는 `expo-`·`createAppPipeline`·`runAutoDiaryTask`·`schedule/`·`diary/pipeline`·`diary/prompt`·`signals/`·`models/`·`vision/`을 import하지 않는다.
  (타입 import만 되는 `signals/types`는 허용하지 않는다 — 값은 `diagnostics-view` 문자열로 받는다.) 모델 이름 문자열이 없다.
- **DS9** 글꼴 2.0배에서 행의 라벨·값이 자르지 않고 줄을 바꾼다(`flexWrap`, 055 규칙) — 소스 계약.
- **DS10** 소스 계약(FR-021, 주석 제외): `DiagnosticsScreen.tsx`·`DiagnosticsParts.tsx`·`diagnostics-view.ts`·`diary-inspect.ts`·`write-failures.ts`에 `duration|elapsed|timing|\btokens?\b` 어휘가 없다.
- **DS11** 저장 점검 중 화면이 언마운트되면 늦게 온 결과는 상태를 바꾸지 않는다.

## HR — 홈의 쓰기 요청 (`DiaryHomeScreen`, `ui`)

- **HR1** `writeRequest`가 오면: 목록을 읽었고 `covered`가 아니고 대화상자·판정 중이 아닐 때 `resolve(오늘)`이 `resolved`이면 `generate()`를 시작한다. 시작하면 `onWriteRequestHandled(id)`가 불린다.
- **HR2** 오늘 일기가 이미 있어도 덮어쓰기 확인 없이 시작한다(`confirm-overwrite` 화면으로 가지 않는다). 재료 확인(053)도 거치지 않는다.
- **HR3** 이미 쓰는 중(`running.current`)이면 시작하지 않고 `onWriteRequestHandled(id)`만 부른다(FR-013).
- **HR4** `covered`이면 기다린다(요청이 사라지지 않는다). 덮임이 풀리면 시작한다.
- **HR5** 같은 `id`로는 두 번 시작하지 않는다(리렌더에 안전).
- **HR6** `resolve`가 `no-ready-character`이면 `write()`와 같은 막힘 화면으로 가고 요청은 비워진다.
- **HR7** `AppScreen`의 `writing`은 넓히지 않았다 — 054 계약(`Object.keys(toWriting())`이 `["kind"]`)이 그대로 통과한다.
- **HR8** `claimAutoWrite`와 독립이다 — 이미 자동 쓰기가 한 번 claim되었어도 요청은 시작된다.
- **HR9** 홈 `generate`가 실패 결과를 받으면 주입받은 `recordFailure`를 그 결과로 한 번 부른다. 그만두기(`cancelled`)로 끝나면 부르지 않는다. 성공이면 부르지 않는다.

## TO — 진단 → 홈 (`App.tsx`, 소스 계약 + `ui`)

- **TO1** `onTryOnce`는 `diagnosing=false`·`route="home"`으로 세 겹을 닫고 `writeRequest`를 올리고 토스트 `diag.tryOnce.toast`를 띄운다.
- **TO2** 토스트는 `DeveloperToast`(2초)이고 진단 겹 안이 아니라 `AppFrame` 루트에서 그려진다.
- **TO3** 진단 겹의 `DiagnosticsScreen`은 값·핸들러를 `App.tsx`가 만든다 — 진단은 `createAppPipeline`을 만들지 않는다. `App.tsx`의 진단 부분에 `new GenerationProbe`류 직접 호출이 없다.

## AR — 자동 쓰기 지금 실행 (`src/schedule/task.ts`, `logic`)

- **AR1** `runAutoDiaryTask({ manual: true })`: 설정이 꺼져 있어도, 지금이 목표 시각 창 밖이어도 `decideSchedule`이 `act: true`를 준다(설정 입력만 덮는다). 안 쓴 날이 없으면 `"skipped"`.
- **AR2** `manual`이어도 재료 없음·사진 권한 없음은 건너뛴다(`resolveAutoWrite` 무변경); 정오 이전에는 오늘이 `selectableDays`에 없다(049 구성 규칙 무변경).
- **AR3** `decideSchedule`·`resolveAutoWrite`·`selectableDays`의 시그니처와 파일이 이 조각에서 바뀌지 않는다(`git diff` 계약: 세 파일 무변경).
- **AR4** `manual`이 아닌 호출의 동작은 기존과 같다(기존 테스트 전부 통과).
- **AR5** 실패하면 `recordWriteFailure`를 부른다(WF7).

## RP — 보고서 (`src/diagnostics/report.ts`, `logic`)

- **RP1** `DiagnosticReport`는 `environment`·`inferenceLocation`·`promptPreviews`만 갖는다. `characterModels`·`moduleStatus`·`storage`·`failures`가 없다.
- **RP2** `collectReport`는 파일을 쓰지 않는다(옛 `checkStorage` 왕복이 없다) — 소스에 `checkStorage`·`isAvailable` 호출이 없다.
- **RP3** 022 PP1(미리보기 = `buildPrompt()` 바이트 동일)·PP6(`token` 어휘 없음)이 그대로 통과한다.

## CC — 헌법 검사 (`scripts/constitution-rules.ts`, `logic`)

- **CC1** `DIAGNOSTICS_HIDES_AXES`가 새 신호 칸 조립 파일(`diagnostics-view.ts` 또는 `DiagnosticsParts.tsx`)에 적용되고, 다섯 축 중 하나를 렌더에서 빼면 위반으로 잡힌다(위반 주입).
- **CC2** `UI_TOUCHES_PROMPT`가 새 진단 화면 파일들에 적용된다 — `DiagnosticsParts.tsx`에 `diary/prompt` import 한 줄을 넣으면 잡힌다(위반 주입).
- **CC3** 삭제된 옛 파일 이름(`SignalProbe.tsx` 등)을 가리키던 규칙이 남아 있지 않다(소스 계약: 존재하지 않는 파일을 가리키는 규칙 0).
- **CC4** `src/app/write-failures.ts`가 `src/ui/`·`diary/pipeline`을 import하지 않는다(순수 + 통로).
