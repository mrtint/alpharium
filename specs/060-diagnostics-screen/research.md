# Research: 진단 화면 개편 (060)

분해 설계 §3.6의 대조와 clarify 결정(2026-10-06)을 코드에 옮기는 데 필요한 결정. 새 라이브러리가 없어 ctx7 조회는 필요 없다(기존 `react-native`의 `Platform`만 쓴다). 파일·화면 사실은
이 저장소의 코드를 읽어 얻었다.

## R1 — 화면은 값과 핸들러를 받는다

- **Decision**: `DiagnosticsScreen`은 `expo-*`·`createAppPipeline`·`runAutoDiaryTask`를 import하지 않는다. 059 `DeveloperScreen`처럼 조립부(`App.tsx`의 진단 겹)가 값(환경 줄 문자열·권한 줄·
  신호 칸·실패 줄·프롬프트 미리보기)과 핸들러(저장 점검·권한 요청·신호 다시 읽기·한 번 써 보기·자동 쓰기 지금 실행)를 넘긴다. 읽기 비동기는 작은 훅 안에서 한다.
- **Rationale**: 옛 화면은 모듈 최상단에서 `createAppPipeline(currentEnvironment())`을 만들고(`DiagnosticsScreen.tsx`) `GenerationProbe`가 그 파이프라인을 직접 돌렸다 — 042가 막은 「진단 경로가 제품 경로와 다르다」의
  뿌리다. 화면이 파이프라인을 모르면 FR-020이 구조로 지켜진다.
- **Alternatives**: 화면이 통로를 직접 만든다(옛 방식) — 소스 계약으로 금지하기 어렵고 테스트가 통로 대역을 쥐어야 한다.

## R2 — 실패는 소비하는 쪽이 기록한다 (파이프라인 안이 아니다)

- **Decision**: `recordWriteFailure(port, result, at)`(순수 판정 + 통로 주입)을 `src/app/write-failures.ts`에 둔다. 부르는 곳은 파이프라인 **결과를 받는** 세 곳이다 —
  홈 `generate`(그만두기 `cancelled`를 먼저 걸러 낸 뒤), `runAutoDiaryTask`(`already-running`을 `"skipped"`로 돌리기 전에), `triggerFirstRunAutoDiary`. `already-running`은 기록하지 않는다
  (다른 쪽이 쓰는 중이라 이 시도가 실패한 것이 아니다). 기록은 던지지 않고 실패는 삼킨다(FR-018).
- **Rationale**: 파이프라인 결과만으로는 「사용자가 그만뒀다」와 「OS가 앱을 끊었다」가 같은 `interrupted`다 — 홈만 `cancelled`를 안다. 파이프라인 안에 기록을 두면 그만두기가 실패로 남는다(FR-016 위반).
  소비하는 곳 셋이 한 함수를 부르므로 판정 규칙은 한 곳이다(FR-019 「같은 규칙」).
- **Alternatives**: `createAppPipeline`이 반환하는 `run`을 감싼다 — 그만두기 구분 불가. 홈이 `onResult`를 올려 App이 기록한다 — 백그라운드·첫 실행은 홈을 거치지 않아 두 번 구현된다.

## R3 — 갈래 판정: 다섯, 앞 토큰만

- **Decision**: 이유 갈래는 `module`·`photos`·`empty`·`save`·`unwritten`(다섯째, clarify Q1). 판정(`PipelineFailure` → 갈래, 054 `kindFromReason`과 같은 규칙 — 문구 전체를 비교하지 않는다):
  `stage` `storage` → `save` · `request-build`·`model-not-ready` → `module` · `signals` → `photos` · `vision` → detail이 `not-ready`면 `module`, 아니면 `photos` ·
  `generation` → kind `model-load-failed` → `module`, kind `rejected` & detail `empty` → `empty`, 그 밖(`rejected` 나머지·`timed-out`·`interrupted`·`generation-failed`·`backend-unavailable`·`not-implemented`) → `unwritten` ·
  그 밖의 단계·모르는 것 → `unwritten`. 태스크의 예상 못 한 예외(`catch`)도 `unwritten`. 화면 문구는 `diag.fail.module`·`photos`·`empty`·`save`와 보드 밖 한 줄 「일기를 쓰지 못함」.
- **Rationale**: `failure-toast.ts`가 이미 같은 앞 토큰 규칙을 쓴다(054 R5, 문구 비교 금지). `rejected: empty`는 `llama-port.ts`에서 관측된 문자열이고 `failure-text.ts`가 `"empty"`를 안다.
  `vision`/`signals` → `photos`는 「사진을 읽지 못함」의 가장 가까운 사실이고, `not-ready`는 사진 보는 모듈 준비 문제라 `module`이다.
- **Alternatives**: 054의 다섯(`retry` 등)을 그대로 — 「다시 써 볼 수 있는가」는 토스트의 관점이고 개발자가 원인을 보는 진단과 다르다.

## R4 — 지금 한 번 써 보기: 홈에 쓰기 요청을 넘긴다

- **Decision**: `AppFrame`이 `writeRequest: { id: number } | null` 상태를 든다. 「지금 한 번 써 보기」 → `route`를 홈으로, 진단·개발자·설정을 닫고(`diagnosing=false`), `writeRequest={id: ++}`, 진단 토스트를
  띄운다(`DeveloperToast`, `diag.tryOnce.toast`, 2초). `DiaryHomeScreen`은 새 옵셔널 props `writeRequest`·`onWriteRequestHandled`를 받는다. effect는 057 자동 쓰기 effect와 같은 조건
  (목록을 읽음 · `screen.kind === "list"` · `covered` 아님 · 대화상자 없음 · 판정 중 아님)에서 `resolve(today)`가 `resolved`면 `setChosenDay(today)` 후 `generate()`를 시작하고
  `onWriteRequestHandled(id)`로 요청을 비운다. **재료 확인(053)·덮어쓰기 확인(050)을 거치지 않는다.** 이미 쓰는 중이면(`running.current`) 요청을 비우기만 하고 시작하지 않는다(FR-013).
  `resolve`가 `no-ready-character`면 `write()`와 같이 막힘 화면으로 간다(054 경로).
- **Rationale**: `claimAutoWrite`는 「한 실행에 한 번」이라 개발자가 여러 번 누르는 용도에 안 맞는다. 요청 id 패턴은 058 `wipeRequest`(토큰)와 같다. 덮인 홈이 이 요청을 받으면 안 되므로 `covered`를 기다린다(닫히는 240ms 동안 참).
- **Alternatives**: 홈 `write()`를 ref로 노출 — 재료·덮어쓰기 확인이 끼어든다. `autoWriteDay`를 재사용 — claim과 「이미 쓴 날이면 안 쓴다」 조건이 맞지 않는다.

## R5 — 자동 쓰기 지금 실행: `manual` 옵션이 설정 두 값만 덮는다

- **Decision**: `AutoDiaryTaskDeps`에 `manual?: boolean`을 더한다. `manual`이면 읽은 설정을 `{ ...settings, enabled: true, targetHour: now.getHours() }`로 바꿔 `resolveAutoWrite`에 준다. `decideSchedule`·
  `resolveAutoWrite`·`selectableDays`는 **무변경**이다(정오 규칙·사흘·재료·사진 권한은 그대로 — 049 「정오는 함수 안에서 직접 본다」). 버튼은 `runAutoDiaryTask({ manual: true })`를 부르고 결과
  (`ran`·`skipped`·`failed`)를 한 줄로 보인다. 도는 동안 버튼은 눌려도 새로 시작하지 않는다.
- **Rationale**: 시도 창·토글은 `decideSchedule` 안에서만 보는 값이라 설정 입력을 바꾸면 한 곳도 안 건드린다. 새 판정 갈래를 만들지 않는다.
- **Alternatives**: `decideSchedule`에 `ignoreWindow` 인자 — 순수 판정의 시그니처를 늘리고 백그라운드 경로 옆에 우회로를 둔다.

## R6 — 저장 점검: 일기를 다시 읽어 센다

- **Decision**: `inspectDiaries(store)`(`src/app/diary-inspect.ts`)가 `listDays()`로 날짜를 얻고 날마다 `load()`한다. `load`가 던지거나 `null`이면 읽기 실패다. `{ total, unreadable }`을 주고
  `diagnostics-view`가 `unreadable === 0`이면 「{n}편 · 정상」, 아니면 「{n}편 · {k}편 읽기 실패」로 옮긴다. 고치지 않는다(읽기만). `listDays()` 자체가 던지면 값을 비운다(지어내지 않는다).
  처음 열 때는 읽지 않고(「저장 점검」 행 값은 비어 있다) 행을 누를 때만 읽는다 — 보드 「탭하면 … 갱신」.
- **Rationale**: 옛 `checkStorage`는 먼 과거 날짜의 점검용 일기를 쓰고 되읽는 왕복이라(`1970-01-02`) 사용자 일기를 점검하지 못하고 파일을 쓴다. 보드는 저장된 일기를 점검한다.
- **Alternatives**: 열 때 자동 점검 — 일기가 많으면 열 때마다 N번 읽는다(보드는 탭).

## R7 — `collectReport`를 가볍게 한다

- **Decision**: `DiagnosticReport`에서 `characterModels`·`moduleStatus`·`storage`·`failures`를 걷는다(화면이 안 읽는다 — 모듈 상태는 059 개발자 화면, 저장 점검은 R6, 수집 실패는 보드 `6h`에 없다).
  남기는 것: `environment`·`inferenceLocation`·`promptPreviews`. `checkStorage`(`storage-check.ts`)와 그 테스트는 쓸 곳이 없어 삭제한다. 삭제는 `tsc`가 짚는 만큼만 한다(037·042 방식).
- **Rationale**: `collectReport`가 화면을 열 때마다 `checkStorage`로 파일을 쓰고 `selection.backend.isAvailable()`로 모델 모듈을 두드린다 — 새 화면이 쓰지 않는 일이다. 014의 `characterModels`는 FR-004가 지운다.
- **Alternatives**: 필드를 두고 화면만 안 읽는다 — 화면을 열 때마다 의미 없는 파일 쓰기가 남는다.

## R8 — 환경 줄: 빌드·기기·추론 위치

- **Decision**: 「빌드」 값 = `buildLabelFor`의 값 그대로(예: `DEV · 1.0.0 (24)` — 059와 한 출처, 읽지 못한 버전은 「DEV」만). 「기기」 값 = `Platform.constants.Release`로
  만든 「Android {Release}」(읽지 못하면 비움). 「추론 위치」 값 = 기기 추론이면 `diag.inference.cpu`(「기기 · CPU」), 로컬 서버면 「로컬 서버」, 못 골랐으면 「선택되지 않음」.
  「기기 · CPU」의 근거는 `llama-port.ts`의 `GPU_LAYERS = 0` 고정 상수다 — 상수가 바뀌면 이 문구를 같이 바꿔야 하므로 소스 계약(`ENV_CPU_RATIONALE`)이 상수 0과 문구를 함께 잠근다.
- **Rationale**: 보드 `6h`가 「기기 · CPU」를 적었고 코드 사실과 일치한다(원칙 V — 짐작이 아니라 고정값).
- **Alternatives**: 「기기」만 — 보드 원문과 다르고 정보가 줄어든다.

## R9 — 신호 프로브와 사진 권한 값

- **Decision**: 신호는 오늘(`dayOf(new Date())`) 기준 `collectDaySignals(port, day)` 결과를 `diagnostics-view`가 다섯 칸으로 옮긴다. 사진·장소는 `known`이면 숫자(장·곳), `none`이면 「없음」,
  `unknown`이면 「모름」. 걸음·배터리·연결은 `known`/`none`이어도 `unknown`이어도 **수집하지 않는 축이라 늘 「모름」**이다(`SignalValue`가 `unknown`인 것이 정상 상태 — AGENTS). 사진 권한 묶음:
  읽기 = `photoPermission()`을 055 `permissionTagFor`의 `allowed`/`partial`/`denied` 어휘(허용됨·일부 허용·허용 안 함)로, 위치 정보 = `photoLocationProbe`(`ok`→허용됨, `denied`→허용 안 함,
  `unknown`·`no-photo`→비움), 범위 = `granted`→「전체」, `limited`→「선택한 사진만」, 그 밖→비움. 읽기 행을 누르면 허용 가능한 상태(`denied`·`undetermined`)에서만 `requestPhotoPermission()`을
  부르고 `blocked`·`granted`에서는 아무것도 안 한다(004 FR-023).
- **Rationale**: 설정이 한 행으로 묶은 것을 풀어 보는 자리라 설정의 어휘를 그대로 쓴다. `DIAGNOSTICS_HIDES_AXES`는 다섯 축을 다 그리라는 규칙이므로 다섯 칸을 모두 렌더한다.
- **Alternatives**: 수집하지 않는 축도 `unknown.reason` 문구를 보인다 — 보드가 「모름」 한 단어다.

## R10 — 헌법 검사·Maestro·삭제

- **Decision**: `scripts/constitution-rules.ts`의 `SignalProbe.tsx` 규칙(`DIAGNOSTICS_HIDES_AXES`, 187·243행)과 `UI_TOUCHES_PROMPT`의 대상 파일을 새 부품 파일 이름으로 옮기고, **옮긴 뒤에도 위반 주입이
  잡는지** 본다(규칙이 사라진 파일 이름을 가리켜 조용히 무력해지는 것이 가장 위험하다). `.maestro/prompt-preview.yml`은 캐릭터 칩 단계를 걷고(로스터 하나 + 보드에 칩이 없다) 새 id·문구로 고친다.
  옛 컴포넌트 5개와 `__tests__/ui/{generation-probe,permission-panel,prompt-preview-panel,signal-probe}.test.tsx`는 삭제하되, 그 테스트가 잠그던 계약(PP1·PP6·다섯 축·권한 요청 규칙)은 새 계약
  테스트가 이어받는지 먼저 확인한다.
- **Rationale**: 계약을 잠그던 소스 검사가 삭제된 파일을 가리키면 초록불이 아무것도 검증하지 않는다(AGENTS — 조용히 실패하는 결함의 계열).
- **Alternatives**: 파일 이름을 그대로 두고 내용만 갈아 끼운다 — 부품 다섯을 한 파일 하나씩 두는 구조가 불필요하게 큰 화면 파일을 만든다.

## R11 — 진단 토스트와 쓰는 동안의 겹 정리

- **Decision**: 「진단에서 쓰기를 시작했어요.」 토스트는 059 `DeveloperToast`(2초·쓸어 닫기 없음)를 재사용해 `AppFrame` 루트에서 그린다 — 진단 겹이 닫힌 뒤에도 남아야 하므로 진단 겹 안이 아니다.
  위치는 홈의 하단 바 위(054 `FailureToast`와 같은 바닥 기준). 새 토스트는 이전 것을 대신한다(한 번에 하나).
- **Rationale**: 059가 만든 부품이고 문구·시간이 같다. 쓰는 중 화면은 하단 바가 「그만두기」 바라 바 높이 측정이 홈 안에 있다 — 실기기에서 겹치는지 본다(quickstart).
- **Alternatives**: 홈 안에서 그린다 — 홈이 새 토스트 종류를 알게 된다(054 `AppScreen` 불변과 어긋남).

## 참조 목록 (T002, 2026-10-06)

삭제·변경 대상을 가리키는 곳 — 코드가 아닌 역사 언급(주석)은 그대로 둔다.

- 소스를 읽어 계약을 잠그는 테스트(고쳐야 함): `__tests__/vision/photo-vision-always.test.ts:109`(`src/ui/GenerationProbe.tsx`), `__tests__/scripts/check-constitution.test.ts:341~361`(`src/ui/SignalProbe.tsx` 경로), `__tests__/ui/prompt-preview-panel.test.tsx:112~124`(PP7·PP6 — 새 부품 파일로 이월)
- 옛 부품 테스트(삭제): `__tests__/ui/{generation-probe,permission-panel,prompt-preview-panel,signal-probe}.test.tsx`
- 코드: `src/ui/DiagnosticsScreen.tsx`(다시 씀), `src/diagnostics/report.ts`·`types.ts`(`characterModels`·`checkStorage`), `src/diagnostics/storage-check.ts`(삭제), `scripts/constitution-rules.ts:187·245`(`SignalProbe.tsx` 경로 규칙 — `UI_TOUCHES_PROMPT`는 `src/ui/` 전체에 걸려 있어 이름 변경 불필요)
- `__tests__/diagnostics/report.test.ts`: `characterModels` 단언
- 주석 언급만(그대로): `src/app/failure-text.ts`·`src/app/README.md`·`src/app/wiring.ts`·`src/config/day-boundary.ts`·`src/inference/on-device.ts`·`src/signals/expo-port.ts`·`src/signals/types.ts`·`src/diary/store.ts:310`(storage-check 언급은 고친다)·여러 테스트 주석
