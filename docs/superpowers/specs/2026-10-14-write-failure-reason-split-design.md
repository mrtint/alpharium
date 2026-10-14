# 쓰기 실패 기록의 갈래 나누기와 개발자 화면의 「최근 실패」 — 설계

날짜: 2026-10-14. 브랜치 `failure-reason-split`(스펙 번호는 speckit-specify 뒤에 붙는다). `080-live-write-registry`(`4b9d966`) 위에 쌓았다 — PR #164는 아직 `main`에 없다.

## 왜

080 실기기 확인 중 백그라운드 자동 쓰기가 본문 생성 49초 뒤 한 번 실패했다. 이튿날 26회를 다시 돌렸으나 다시 만들지 못했고(이틀 약 38회 중 1회) 까닭은 모른다. 더 반복해 돌리지 않기로 했다 — 대신 **다음에 실패가 났을 때 갈래가 남게** 한다.

지금은 두 가지가 그것을 막는다.

- 쓰기 실패 기록(060, `preferences/write-failures.json`)이 판정 거부·시간 초과·끊김·예외를 `unwritten` 하나로 뭉친다.
- 「최근 실패」 묶음이 진단 화면에만 있고, 진단 화면은 배포 빌드에 없다(060). TestFlight 테스터의 `백그라운드 · 실패`(078 시도 기록)는 까닭을 볼 자리가 없다.

## 코드에서 확인한 것 — 판정 거부의 `why`는 지금 기록까지 닿지 않는다

설계 전에 확인하기로 한 길을 읽었다. **길이 없다.**

- 어댑터는 판정 거부를 `{ kind: "rejected", why }`로 돌려준다(`src/inference/on-device.ts` 737행, `types.ts` 153행 — `why`는 `"empty" | "echo" | "language" | "unfinished"`).
- 파이프라인은 이유 문자열을 이렇게 만든다(`src/diary/pipeline.ts` 380·386행):

  ```ts
  const detail = "reason" in generated ? `: ${generated.reason}` : "";
  return stop(stage, `${generated.kind}${detail}`);
  ```

  `rejected`에는 `reason` 필드가 없으므로 문자열은 **`"rejected"` 한 낱말**이다. `why`는 여기서 버려진다.
- 그래서 `writeFailureReasonFor()`의 `kind === "rejected" && detail === "empty"`는 **앱에서 한 번도 참이 된 적이 없다.** 060의 `empty`(「글이 비어 있음」)는 죽은 갈래이고, 빈 글 거부도 `unwritten`으로 기록돼 왔다.
- 기기 없는 테스트는 이것을 못 봤다 — `__tests__/app/write-failures.test.ts`·`failure-toast.test.ts`·화면 테스트가 `"rejected: empty"`·`"rejected: echo"`를 **손으로 쓴 문자열**로 넣는다. 파이프라인 테스트(`pipeline.test.ts` 572행)는 `stage`만 단언하고 `reason`을 보지 않는다. 「두 부품이 같은 값을 나눠 쓰는 기능은 그 값을 실제로 나눠 쓰는 조립으로 한 번은 테스트한다」(080)와 같은 계열이다.

**값으로 가를 수 있는가 — 있다, 파이프라인 한 줄을 고치면.** `why`는 닫힌 유니온(문구가 아니라 값)이므로 `reason`과 같은 자리에 실으면 된다:

```ts
const detail =
  "reason" in generated ? `: ${generated.reason}`
  : "why" in generated ? `: ${generated.why}`
  : "";
```

결과는 `"rejected: echo"` — 테스트들이 이미 가정해 온 바로 그 모양이다. **이 한 줄은 승인받은 설계안에 없던 변경이다**(`src/diary/pipeline.ts`를 건드린다). 검토에서 확인을 구한다.

이 변경의 파급:

- `PipelineStage`·`GenerationFailure`·판정 갈래 넷은 그대로다. 새 필드도 없다 — 이미 있던 문자열의 꼬리가 채워질 뿐이다.
- `failure-toast.ts`는 `rejected`를 따로 가르지 않고 기본 갈래(`retry`)로 보낸다 — 토스트는 바뀌지 않는다.
- 화면은 `reason`을 그리지 않는다(062 B3 `READS_REASON`이 읽는 파일을 잠근다). 「`why`는 사용자에게 그대로 보이지 않는다」(005 FR-017e)는 홈·토스트에서 그대로 지켜진다. 개발자 화면의 「지시문을 되뱉음」은 그 조항의 예외를 새로 여는 것이므로 아래 「남은 판단」에 적었다.
- 거부된 글 자체는 여전히 어디에도 실리지 않는다(005 FR-017c).

나머지 갈래는 지금도 값으로 닿는다: `timed-out`·`interrupted`는 kind 한 낱말, `generation-failed: <오류 문구>`는 앞 토큰만 본다(문구는 읽지 않는다), `vision-failed: not-ready|failed|cancelled`는 detail이 닫힌 값이다. `"interrupted: 시작 전에 그만두었다"`(080)처럼 detail이 문구인 것도 앞 토큰만 본다.

## 조각 1 — 갈래: 다섯에서 열하나로

`src/app/write-failures.ts`의 `WriteFailureReason`과 `writeFailureReasonFor()`.

| 갈래 | 언제 (단계 · 앞 토큰 · detail) | 화면 문구 |
| --- | --- | --- |
| `module` | `request-build`·`model-not-ready` 단계, `vision` + `not-ready`, `generation` + `model-load-failed` | 모듈을 불러오지 못함 (그대로) |
| `photos` | `signals` 단계, `vision` + `failed` | 사진을 읽지 못함 (그대로) |
| `empty` | `generation` + `rejected` + `empty` | 글이 비어 있음 (그대로 — 이제 실제로 닿는다) |
| `save` | `storage` 단계 | 저장하지 못함 (그대로) |
| `echo` | `generation` + `rejected` + `echo` | 지시문을 되뱉음 |
| `language` | `generation` + `rejected` + `language` | 다른 언어로 씀 |
| `unfinished` | `generation` + `rejected` + `unfinished` | 글을 끝맺지 못함 |
| `timed-out` | `generation` + `timed-out` | 시간 초과 |
| `interrupted` | `generation` + `interrupted`, `vision` + `cancelled` | 도중에 끊김 |
| `error` | `generation` + `generation-failed` | 생성 중 오류 |
| `unwritten` | 위 어디에도 안 맞는 것(`not-implemented`·`backend-unavailable`·모르는 단계·detail 없는 `rejected`), 옛 기록 | 일기를 쓰지 못함 (그대로) |

- **갈래는 사람이 못 박은 상수다.** 판정은 단계, 이유의 앞 토큰, 그리고 `vision-failed`·`rejected`의 detail **값**만 본다. 문구를 비교하지 않는다.
- **`vision` + `cancelled`를 `photos`에서 `interrupted`로 옮긴다.** 사진을 못 읽은 것이 아니라 읽는 도중 끊긴 것이다 — 지금은 「사진을 읽지 못함」으로 남아 사진 쪽을 의심하게 만든다.
- **사용자가 그만둔 쓰기는 기록하지 않는다**(080 `isRecordable()` 그대로 — `cancelled: true`, 홈이 시작한 쓰기는 홈이 071의 시도 번호로 먼저 거른다). 그래서 기록에 남는 `interrupted`는 「사용자가 그만둔 것이 아닌데 끊긴 것」이다: 앱이 앞을 벗어남(005 FR-014b), OS 중단.
- `rejected`인데 detail이 넷 밖이면 `unwritten`이다(판정 갈래가 늘었을 때 조용히 다른 갈래로 새지 않게).
- 문구 일곱(새 여섯 + `unwritten` 유지)은 보드에 없다 — 소유자가 승인한 안이다.

**판정 갈래 넷은 늘지 않는다**(원칙 IV, 005 FR-018b). 이 표는 `acceptance.ts`가 이미 가른 것을 기록까지 옮길 뿐이고 임계값·점수·새 판정을 더하지 않는다. `REJECT_REASONS`의 넷과 이 표의 거부 갈래 넷이 같은 집합임을 테스트가 잠근다(판정 갈래가 늘면 여기서 실패해 한 줄을 더하게 한다).

## 조각 2 — 보이는 자리

- 「최근 실패」 묶음을 공용 부품 `src/ui/FailuresGroup.tsx`로 뽑는다(078 `AttemptsGroup.tsx`와 같은 방식 — 값만 받는다: `failures: readonly FailureLine[]`, `idPrefix: "diagnostics" | "developer"`).
  - 진단 화면의 testID는 그대로다(`diagnostics-group-failures`·`diagnostics-failures-empty`·`diagnostics-failure-N`). 개발자 화면은 `developer-group-failures`·`developer-failures-empty`·`developer-failure-N`.
  - 진단 화면에서의 자리·모양은 바뀌지 않는다(「실행」 묶음 아래, 시도 묶음 위).
- **개발자 화면에서는 「최근 자동 쓰기 시도」 아래 — 새 맨 아래다.** 위 행들의 자리가 바뀌지 않는다(078이 시도 묶음을 「끄기」 아래에 둔 것과 같은 까닭).
- 조립: `App.tsx` 개발자 겹이 열릴 때 `loadAutoWriteAttempts` 옆에서 `loadWriteFailures`를 함께 읽어 `failureLines()`로 옮겨 넘긴다. 겹이 열릴 때만 읽는다(078의 시도 목록과 같다 — 열어 둔 채로는 갱신되지 않는다).
- 묶음 머리 「최근 실패」·빈 줄 「아직 실패가 없어요」·시각 서식은 지금 것을 그대로 쓴다(새 문구 아님).

테스터가 읽는 법은 이렇게 된다: 시도 묶음의 `백그라운드 · 실패` 줄을, 그 아래 「최근 실패」의 같은 시각 줄과 짝지어 갈래를 읽는다. 둘은 `runAutoDiaryTask`가 같은 `now`로 쓴다.

## 조각 3 — 저장·경계

- **저장 형식은 그대로다** — `{ items: [{ reason, at }] }`, 최근 10건(`MAX_WRITE_FAILURES`). 오류 문구·글 내용·소요 시간·어느 날이었는지를 담지 않는다(060 D3, 원칙 IV). `generation-failed`의 오류 문구는 `error` 갈래 하나로 접힌다.
- **옛 기록**: 새 빌드는 옛 `unwritten`·`photos`를 그대로 읽는다(다시 분류하지 않는다 — 다시 분류할 재료가 파일에 없다). 옛 빌드는 모르는 갈래의 줄을 버린다(`isReason` — 지금 동작 그대로, 나머지 줄은 읽는다).
- **문구**: 새 여섯은 062 규칙대로 카탈로그의 **새 영역**에 둔다(`src/i18n/catalogs/ko/failures.ts` — 옛 `diagnostics` 영역의 키 짝은 골든 G2가 잠그므로 거기에 더하지 않는다). 골든 json은 다시 쓰지 않고 `ADDED_AFTER_GOLDEN`에 올린다. `diagnostics-view.ts`의 `reasonText()`가 옛 다섯은 옛 영역에서, 새 여섯은 새 영역에서 읽는다 — `Record<WriteFailureReason, string>`이라 빠진 갈래는 `tsc`가 짚는다.
- **시도 기록(078)은 손대지 않는다.** `failed` 한 갈래 그대로다 — 까닭은 실패 기록이 든다(같은 사실을 두 곳에 나눠 담지 않는다).
- 새 설정·기록 파일은 없다. 그래도 갈래가 늘어 가드 표(`boundaries.test.ts` B3·B6, `scripts/layer1/baseline.ts`)가 깨지는지는 `npm test` 전체로 본다.

## 영향 범위

| 파일 | 무엇 |
| --- | --- |
| `src/diary/pipeline.ts` | 이유 문자열에 `why`를 detail로 싣는다(한 줄) |
| `src/app/write-failures.ts` | 갈래 열하나, 판정 표, 머리 주석 |
| `src/i18n/catalogs/ko/failures.ts`(새) · `catalogs/ko/index.ts` · `src/app/diagnostics-text.ts` | 새 문구 여섯 |
| `src/app/diagnostics-view.ts` | `reasonText()` 열하나 |
| `src/ui/FailuresGroup.tsx`(새) · `DiagnosticsScreen.tsx` · `DeveloperScreen.tsx` | 공용 묶음, 개발자 화면 맨 아래 |
| `App.tsx` | 개발자 겹에서 실패 기록 읽기 |
| `.maestro/settings-developer-sweep.yml` | 개발자 화면 맨 아래가 바뀐다 — 시도 묶음 아래 `developer-group-failures`까지 내린 뒤 「진단」을 올라가며 찾는다 |
| `specs/060-diagnostics-screen/contracts/diagnostics.md` | WF 계약의 갈래 표 개정 |

## 검증

**기기 없는 테스트**

- 갈래 표 열하나(단계 × 앞 토큰 × detail), `REJECT_REASONS`와 거부 갈래의 집합 일치, 모르는 것은 `unwritten`.
- **조립 테스트**: 진짜 `createPipeline()`에 `{ kind: "rejected", why }`·`timed-out`·`interrupted`·`generation-failed`·`vision-failed: cancelled`를 돌려주는 백엔드를 물려, 그 **결과를 그대로** `writeFailureReasonFor()`에 넣는다 — 손으로 쓴 이유 문자열이 아니라 파이프라인이 만든 문자열로 갈래가 서는지 본다. 이것이 060부터 죽어 있던 `empty`를 잡았어야 할 테스트다.
- 문구 열하나, 옛 기록 읽기(옛 `unwritten`·모르는 갈래 버림), 저장 형식에 새 필드 없음(키가 `reason`·`at`뿐).
- 두 화면의 묶음(빈 줄·줄·testID), 개발자 화면에서 시도 묶음 뒤에 오는 순서, 조립 소스 계약(개발자 겹이 `loadWriteFailures`를 읽는다).
- 위반 주입: 파이프라인의 `why` 줄을 빼면 조립 테스트가 실패한다 · 갈래 하나를 `unwritten`으로 접으면 표 테스트가 실패한다 · 개발자 화면에서 묶음을 빼면 화면 테스트가 실패한다. 치환이 실제로 적용됐는지 먼저 단언한다.

**실기기(dev, SM-S901N)** — 기기의 일기·설정을 백업하고 끝나면 되돌린다.

- 쓰는 중 앱을 내려 끊김을 만든다 → 개발자 화면 맨 아래 「최근 실패」에 「도중에 끊김」이 뜬다(지금은 「일기를 쓰지 못함」).
- 개발자 화면: 「최근 자동 쓰기 시도」 아래에 묶음이 있고 위 행들의 자리가 그대로다. 진단 화면의 묶음도 같은 줄을 보인다.
- 옛 기록이 남은 기기에서 옛 줄이 그대로 읽힌다.
- 고친 `settings-developer-sweep` 흐름의 개발자·진단 구간.

**미확인으로 남는 것**: 판정 거부 넷·시간 초과·생성 중 오류는 기기에서 일부러 만들 수단이 없다 — 테스트로만 확인한다. iOS 전부(실제 iPhone 없음). 배포 빌드의 개발자 화면(release 빌드를 만들지 않는다). 그리고 **이 과제는 49초 실패의 까닭을 밝히지 않는다** — 다음에 났을 때 갈래가 남게 할 뿐이다.

## 남은 판단 (검토에서 확인을 구한다)

1. **`src/diary/pipeline.ts` 한 줄 변경.** 승인안에 없던 자리다. 하지 않으면 거부 갈래 셋(`echo`·`language`·`unfinished`)을 가를 수 없고 `empty`도 죽은 채 남는다. 대안은 결과에 `why` 필드를 따로 더하는 것인데 `PipelineResult`의 모양이 넓어지고 읽는 쪽 셋(`WriteResult`)이 함께 바뀐다 — 이미 있는 `` `${kind}: ${detail}` `` 꼴을 채우는 쪽이 작다.
2. **005 FR-017e와의 관계.** 「`why`는 사용자에게 그대로 보이지 않는다 — 되뱉었다·언어가 다르다는 캐릭터 뒤의 모델을 드러내는 말」이다. 개발자 화면은 배포 빌드에서 버전 7번 탭 뒤에 열리므로 일반 사용자의 길은 아니지만, 그 조항이 막으려던 말이 배포 빌드의 한 화면에 처음 나온다. 승인된 문구(「지시문을 되뱉음」·「다른 언어로 씀」)가 그 판단을 포함한 것으로 읽었다 — 아니면 문구를 다시 정한다.
3. **060의 `empty`가 죽어 있었다는 사실**을 AGENTS.md 060 절과 「조용히 실패하는 결함의 계열」에 한 줄로 남긴다(구현 커밋에서).

## 하지 않는 것

- 시도 기록(078)의 갈래를 늘리지 않는다. 실패 기록에 날·소요 시간·오류 문구·경로(백그라운드/홈)를 더하지 않는다.
- 판정(`acceptance.ts`)·토스트 갈래(054)·홈의 실패 표시는 바꾸지 않는다.
- 실패를 다시 만들어 보려는 반복 실행을 하지 않는다. 재는 코드를 제품에 넣지 않는다.
- 로드맵의 백그라운드 자동 쓰기 과제 2·3·6번과 4번의 나머지.
