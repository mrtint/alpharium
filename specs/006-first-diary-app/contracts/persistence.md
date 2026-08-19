# Contract: 생성 → 저장 배선

**Feature**: 006-first-diary-app | **Date**: 2026-08-18

**이 계약이 이 기능의 핵심이다.** 저장 계층은 002가 만들었고 기기 왕복까지 확인됐다.
끊긴 것은 **부르는 자리**다.

---

## §1. 지금 무엇이 끊겨 있는가 (확인된 사실)

`src/ui/GenerationProbe.tsx`:

```ts
const result = await backend.generate(request.request);  // 어댑터 직접 호출
...
setText(result.text);                                     // 화면 상태에만 담는다
```

**`createPipeline()`을 거치지 않는다.** 따라서 `src/diary/pipeline.ts` 163행의
`deps.store.save(entry)`가 **기기 경로에서 한 번도 실행된 적이 없다.**

저장소 전체에서 `fileStore`를 부르는 곳은 `src/diagnostics/storage-check.ts` 하나뿐이며,
그것은 진단용 왕복 점검이지 일기 저장이 아니다.

**005가 「파이프라인이 저장까지 갔다」고 기록한 것은 대역 추론을 쓴 테스트에서였다.**
실기기에서 돈 경로는 그 파이프라인이 아니었다.

---

## §2. 불변식

이 계약이 지키는 것. **테스트가 각각을 직접 검사한다.**

| # | 불변식 | 근거 |
| --- | --- | --- |
| P1 | **저장소 전체에서 `backend.generate()`를 직접 부르는 자리가 0개다** — 파이프라인 안을 제외하고 | FR-010, SC-008b |
| P2 | 사용자 경로와 진단 경로가 **같은 파이프라인**을 쓴다 | FR-010a |
| P3 | 사용자 경로의 어댑터가 **`selectBackend()`에서 온다** | FR-026, SC-024 |
| P4 | 저장 실패가 **드러난다** | FR-012, SC-008c |
| P5 | 저장 실패해도 **생성된 글을 읽을 수 있다** | FR-012a, SC-008e |
| P6 | 저장 왕복에서 **`unknown`이 `unknown`으로 남는다** | FR-013, SC-008d |
| P7 | 앱을 종료·재부팅해도 **일기가 남는다** | FR-009, SC-008 |
| P8 | 여러 날의 일기가 **전부** 남는다 | FR-011, SC-008a |

---

## §3. 조립 지점 — `src/app/wiring.ts`

**파이프라인을 만드는 자리는 저장소에 하나뿐이어야 한다.**

```
createAppPipeline(resolution: EnvironmentResolution) →
  | { ok: true; pipeline: Pipeline }
  | { ok: false; reason: SelectionFailure; detail: string }
```

**무엇을 조립하는가**:

| 부품 | 어디서 | 왜 여기서 |
| --- | --- | --- |
| `backend` | **`selectBackend(resolution)`** | P3. 직접 `onDeviceBackend()`를 부르지 않는다 |
| `store` | `fileStore(expoFileSystemPort('diary'))` | 제품 경로. `memoryStore`는 테스트 전용 |
| `loadSignals` | `collectDaySignals(expoPhotoPort(), day)` | 004의 실제 수집 |
| `isModelReady` | 003의 `readinessOf` 결과 | 없는 모델로 생성 시도를 막는다 |

**실패를 값으로 돌려준다.** `selectBackend()`가 실패하면(환경 판정 불가·위치 금지)
파이프라인을 만들지 않고 그 사실을 반환한다 — `App.tsx`가 그것을 받아
`build-error` 화면으로 간다(FR-035).

**⚠️ 이 함수가 원칙 I의 검증 지점이다.** 여기를 거치지 않고 컴포넌트가 스스로
어댑터·저장소를 만들면 P1·P3가 조용히 깨진다. **테스트가 「사용자 경로가 이 함수를
쓴다」를 검사한다.**

---

## §4. 저장 실패 시 글을 어떻게 돌려주는가 (설계 판단)

**문제**: FR-012a는 저장 실패 시 글을 보여주라 한다. 그런데 002 FR-012는 **실패
갈래에 `entry`도 `text`도 없다**고 못 박았다(`PipelineResult`의 불변식). 지금
`pipeline.ts` 165행은 `stop("storage", saved.reason)`으로 **만들어 둔 `entry`를
버린다.**

**결정: `PipelineResult`에 갈래를 하나 더한다.**

```
PipelineResult =
  | { ok: true;  entry: DiaryEntry; overwrote: boolean }
  | { ok: false; stage: PipelineStage; reason: string }
  | { ok: false; stage: 'storage'; reason: string; entry: DiaryEntry }   // 새 갈래
```

**왜 002의 불변식을 깨지 않는가**:

002가 금지한 것은 **「실패가 텍스트를 반환하는 것」**이며, 그 이유는 「그럴듯한 텍스트가
일기 자리에 들어가면 가짜 일기와 구분이 사라진다」였다. 여기서 돌려주는 `entry`는
**지어낸 것이 아니라 모델이 실제로 생성하고 판정을 통과한 글**이다. 가짜가 아니다.

**구분되는 지점**: 다른 실패 갈래(`generation`·`signals`·`model-not-ready`)에는
`entry`가 **없다.** `storage`에만 있고, 그 이유는 **그 단계에 도달했다는 것 자체가
생성 성공을 뜻하기 때문**이다(파이프라인 6단계는 5단계 성공 시에만 도달한다).

**대안과 기각 이유**:

| 대안 | 기각 이유 |
| --- | --- |
| 저장 실패를 성공으로 돌려준다(`ok: true, saved: false`) | 저장 실패가 성공으로 읽힌다. SC-008c 위반 |
| 화면이 파이프라인 밖에서 글을 따로 들고 있는다 | 화면이 어댑터 결과를 직접 만지게 되고 P1이 깨진다 |
| 글을 버리고 「다시 시도하라」만 | **명확화에서 기각됨.** 30초 들인 글이고 다시 생성해도 같은 글이 안 나온다 |
| 저장을 재시도한다 | 실패 원인(저장 공간 부족 등)이 그대로면 반복될 뿐. 사용자에게 알리는 것이 먼저 |

**⚠️ 이 변경은 002의 계약을 넓히는 것이지 바꾸는 것이 아니다.** 기존 테스트가 그대로
통과해야 한다 — 003이 `isModelReady`를 선택적으로 더한 것과 같은 방식이다.

---

## §5. `GenerationProbe`의 계약 변경

```
GenerationProbeProps = {
  pipeline: Pipeline        // 바뀜: backend → pipeline
  character: Character
  vision?: VisionSetting
  now: () => Date           // 하루 계산을 밖에서 (FR-018a와 같은 판단)
}
```

**유지되는 것 (005의 방어를 잃지 않는다)**:

- `busy`가 불리언 하나 — 진행률이 들어갈 자리 없음(원칙 IV)
- 토큰 콜백을 넘기지 않음 — 스트리밍 경로가 코드에 없음(FR-030)
- `describeFailure()` — 실패를 「할 수 있는 것」으로(원칙 III). **사용자 경로에서
  재사용한다**
- `AppState` 구독으로 앱이 앞을 벗어나면 중단(005 FR-014b)

**사라지는 것**: `loadSignals`·`backend` prop. 파이프라인이 안에서 다 한다.

---

## §6. 검증

### 기기 없이 (`npm test`)

| 검사 | 무엇을 확인 |
| --- | --- |
| P1 | `src/ui/`와 `src/app/`에서 `backend.generate(` 호출이 0건 (정적 검사) |
| P2 | 사용자 경로와 진단 경로가 같은 `createAppPipeline`을 쓴다 |
| P3 | `wiring.ts`가 `selectBackend`를 부른다. `onDeviceBackend` 직접 호출 0건 |
| P4 | `memoryStore({failWith})`로 저장 실패 → 화면이 「저장 못 함」을 보인다 |
| P5 | 같은 상황에서 **글이 화면에 있다** |
| P6 | `memoryStore({serialized: true})` 왕복 → `unknown`이 `unknown` |
| P8 | 여러 날 저장 → `listDays()`가 전부 준다 |

**P1은 정적 검사로 한다** — 런타임 테스트로는 「어딘가에 직접 호출이 남아 있다」를
잡지 못한다. `scripts/check-constitution.mts`에 규칙을 더하는 것이 자연스럽다(그 파일은
설정 위반을 잡는 것이지 모델 출력을 재지 않으므로 원칙 IV에 걸리지 않는다).

### 실기기 (`npm run test:device` + 손으로)

| 검사 | 절차 |
| --- | --- |
| P7 | 일기 생성 → 앱 완전 종료 → 재실행 → 일기가 있다 |
| P7 | 기기 재부팅 → 앱 실행 → 일기가 있다 |
| P8 | 서로 다른 두 날짜의 일기 → 둘 다 목록에 |

**⚠️ 새 Maestro 흐름은 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록해야 돈다.**
등록하지 않으면 초록불인데 아무것도 검증되지 않는다(AGENTS.md의 경고).
