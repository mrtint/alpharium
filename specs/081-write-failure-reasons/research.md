# Research: 쓰기 실패 기록의 갈래 나누기 (081)

모두 이 저장소의 소스를 읽은 것이다(2026-10-14). 기기에서 본 것은 없다 — 실기기 확인은 quickstart에 있다.

## R1 — 판정 거부의 까닭은 지금 기록까지 닿지 않는다

- **읽은 것**: `src/inference/on-device.ts` 737행·`desktop-server.ts` 93행이 `{ kind: "rejected", why }`를 돌려준다. `src/diary/pipeline.ts` 380행은 `"reason" in generated`일 때만 detail을 붙인다 — `rejected`에는 `reason`이 없어 이유 문자열이 `"rejected"` 한 낱말이다. `write-failures.ts` 67행의 `rejected` + `empty` 분기는 앱에서 닿지 않는다.
- **Decision**: 파이프라인이 `why`를 `reason`과 같은 자리(detail)에 싣는다 → `"rejected: echo"`.
- **Rationale**: `why`는 닫힌 유니온이다(값). 이미 있는 `` `${kind}: ${detail}` `` 꼴을 채울 뿐이라 `PipelineResult`·`PipelineStage`·`WriteResult`의 모양이 그대로다. 테스트들이 손으로 써 온 모양과 같다.
- **Alternatives considered**: 결과에 `why` 필드를 따로 더한다 — `PipelineResult`가 넓어지고 `WriteResult`와 부르는 세 곳이 함께 바뀐다. 어댑터가 `reason`이라는 이름으로 돌려준다 — `GenerationFailure`의 「`rejected`에는 `reason`조차 두지 않는다」(005 FR-017c 주석)와 `generate.test.ts`의 키 단언(`["kind", "why"]`)을 건드린다.

## R2 — 이유 문자열을 읽는 곳은 둘뿐이다

- **읽은 것**: `.reason`을 갈래로 옮기는 파일은 `src/app/failure-toast.ts`와 `src/app/write-failures.ts`다(062 B3 `READS_REASON`이 목록을 잠근다). `failure-toast.ts`의 `kindFromReason()`은 `rejected`를 따로 가르지 않고 기본 갈래 `retry`로 보낸다.
- **Decision**: 토스트는 손대지 않는다. `"rejected"`가 `"rejected: echo"`가 되어도 토스트 갈래는 같다.
- **확인할 것(구현 때)**: `reason` 문자열이 정확히 `"rejected"`임을 단언하는 테스트는 없다(grep: `pipeline-cancel-on-save.test.ts`의 `/interrupted/`뿐).

## R3 — 기록에 남는 `interrupted`는 사용자가 그만둔 것이 아니다

- **읽은 것**: `isRecordable()`이 `cancelled: true`(080, 등록부의 칸에 그만둠이 선 쓰기)를 거른다. 홈이 스스로 시작한 쓰기의 그만두기는 홈이 시도 번호로 먼저 거른다(071) — `recordFailure`를 부르지 않는다. 앱이 앞을 벗어나 끊긴 홈의 쓰기는 기록된다(AGENTS 071 「앱을 내렸다 올리면 … `unwritten`이 기록되는 것은 알려진 동작」).
- **Decision**: `generation` + `interrupted`와 `vision` + `cancelled`를 한 갈래 `interrupted`로 옮긴다. 걸러내는 쪽은 바꾸지 않는다.
- **끊김이 나오는 자리**(`on-device.ts`): 사진 읽기 도중(`vision-failed: cancelled`), 모델 적재 직후(697행), 본문 판정에서 ending이 `interrupted`(736행), 제목을 묻는 동안(754행), 파이프라인의 생성 직전 확인(`"interrupted: 시작 전에 그만두었다"` — 앞 토큰만 본다).

## R4 — 문구는 새 카탈로그 영역에 둔다

- **읽은 것**: 062 골든 G2가 옛 영역의 키 짝을 `JSON.stringify`로 잠근다. 078은 `catalogs/ko/attempts.ts`를 새 영역으로 두고 `diagnostics-text.ts`에 `ATTEMPT_TEXT = lazyText((c) => c.attempts)`를 더했다. 새 리터럴은 `ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 올린다.
- **Decision**: `catalogs/ko/failures.ts`(영역 이름 `failures`)에 새 여섯 문구. `diagnostics-text.ts`에 `FAILURE_TEXT`. 묶음 머리·빈 줄·시각 서식·옛 다섯 문구는 `diagnostics` 영역 그대로.
- **Rationale**: 옛 영역에 키를 더하면 G2가 깨지고, 골든을 다시 쓰면 「이전」이 사라진다.

## R5 — 공용 묶음은 078 부품과 같은 꼴이다

- **읽은 것**: `src/ui/AttemptsGroup.tsx`는 줄 배열과 `idPrefix`만 받고 `SettingsScreen`의 `Group`·`Row`·`Value`로 그린다. `DiagnosticsScreen.tsx` 260~273행의 「최근 실패」 묶음도 같은 부품으로 그린다(testID `diagnostics-group-failures`·`diagnostics-failures-empty`·`diagnostics-failure-N`).
- **Decision**: `src/ui/FailuresGroup.tsx` — `failures: readonly FailureLine[]`, `idPrefix`. 진단 화면의 JSX를 그대로 옮기고 testID 머리만 매개변수로 뺀다. 기록 모듈에 닿지 않는다(헌법 검사: `src/ui/`는 타입만).

## R6 — 개발자 겹은 AppFrame이 읽는다

- **읽은 것**: `App.tsx` 약 676~689행 — `route === "developer"`가 될 때 `loadAutoWriteAttempts(attemptPort)`를 읽어 `developerAttempts`에 둔다. `failurePort`는 진단 겹(1746행)과 `DiarySection`(1961행)에만 있다.
- **Decision**: AppFrame에 `failurePort`(useMemo)와 `developerFailures` state를 더하고 같은 effect에서 둘을 함께 읽는다. `loadWriteFailures`는 던지지 않는다(WF5).
- **계약 테스트**: `__tests__/app/auto-write-attempts-wiring.test.ts`가 소스로 배선을 잠근다 — 같은 방식으로 실패 쪽을 잠근다.

## R7 — 가드 표와 실기기 흐름

- **읽은 것**: `boundaries.test.ts` B3 `READS_REASON`에 `write-failures.ts`가 이미 있다. B6 파일 목록·`scripts/layer1/baseline.ts`에 `write-failures.json`이 이미 있다. 새 파일을 만들지 않으므로 등록할 것이 없다 — 그래도 `npm test` 전체로 확인한다.
- `.maestro/settings-developer-sweep.yml` 194~207행: 「끄기」 → `developer-group-attempts`까지 내린 뒤 「진단」을 `direction: UP`으로 찾는다. 맨 아래가 한 묶음 더 내려간다 → `developer-group-failures` 단언을 더한다(「진단」은 여전히 위로 찾는다).
- 헌법 검사(`scripts/constitution-rules.ts`)에 새 예외가 필요 없다 — 새 UI 파일은 `app/diagnostics-view`의 타입과 `app/diagnostics-text`만 import한다(`AttemptsGroup`과 같다).

## R8 — 옛 기록과의 호환

- **읽은 것**: `loadWriteFailures()`의 `isReason()`이 모르는 갈래의 항목만 버린다. 저장은 `{ items: [{ reason, at }] }`.
- **Decision**: 형식 그대로. `REASONS` 배열에 여섯을 더하면 새 빌드가 옛·새를 모두 읽는다. 옛 빌드는 새 갈래 줄을 버린다(지금 동작).
