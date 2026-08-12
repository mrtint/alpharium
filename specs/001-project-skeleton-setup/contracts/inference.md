# 계약: 추론 어댑터

**대상**: `src/inference/types.ts`, `on-device.ts`, `desktop-server.ts`
**관련 요구사항**: FR-005~FR-008, FR-013, FR-016, FR-025

---

## 인터페이스

```ts
type ModuleStatus =
  | { kind: 'loaded' }
  | { kind: 'unavailable'; reason: string }   // 시뮬레이터 등 — 예상된 상태
  | { kind: 'failed'; reason: string }        // 있어야 하는데 실패 — 문제

interface InferenceBackend {
  readonly location: InferenceLocation
  isAvailable(): Promise<ModuleStatus>
}
```

**일기 생성 코드가 보는 것은 이 인터페이스뿐이다**(FR-025). 구현체가 온디바이스인지 서버인지
호출자는 모른다.

**이 기능의 범위**: 인터페이스와 `isAvailable()`까지. 실제 추론 호출(텍스트 생성)은 다음
기능에서 이 인터페이스에 추가한다. 지금 만들면 일기 생성 축으로 파고드는 것이다.

---

## 온디바이스 어댑터

**판정 방법**: 모델 파일 없이 네이티브 계층에 닿는 호출의 성공 여부로 판정한다.
`llama.rn`의 `getBackendDevicesInfo()`를 쓴다 — 모델 인자를 받지 않으므로 FR-008을 지킨다.

### 검증 표

| 상황 | 기대 |
| --- | --- |
| 실기기, 네이티브 모듈 적재됨 | `{ kind: 'loaded' }` |
| 시뮬레이터, 모듈 없음 | `{ kind: 'unavailable', reason: ... }` |
| 실기기, 호출이 예외를 던짐 | `{ kind: 'failed', reason: <원인> }` |

**`unavailable`과 `failed`를 뭉뚱그리지 않는다**: 시뮬레이터에서 모듈이 없는 것은 정상이고
(User Story 2 시나리오 3), 실기기에서 없는 것은 문제다(FR-007). 같은 값이면 둘을 구분할 수
없다.

**모델을 적재하지 않는다**(FR-008). `initLlama()`나 `loadLlamaModelInfo()`를 부르지 않는다 —
둘 다 모델 경로를 요구하며, 모델 파일은 이 기능의 범위 밖이다.

**예외를 삼키지 않는다**(FR-007). 실패는 `failed`와 원인으로 표현되어 진단에 실린다.

---

## 데스크톱 서버 어댑터

**용도**: local 환경에서 시뮬레이터가 추론을 부를 때. 헌법 원칙 I이 개발·튜닝 단계에 MAY로
허용한 경로다.

### 검증 표

| 상황 | 기대 |
| --- | --- |
| 서버 응답함 | `{ kind: 'loaded' }` |
| 서버 꺼져 있음 / 닿지 못함 | `{ kind: 'failed', reason: <원인> }` |

**서버에 닿지 못했을 때 대체 응답을 반환하지 않는다** — 헌법 원칙 I이 명시적으로 금지하며,
명세 Edge Case가 이를 다룬다. 닿지 못했다는 **사실**이 결과다. 이것이 이 어댑터에서 가장
중요한 규칙이다.

**동일성 제약** (FR-013): 이 어댑터는 온디바이스와 동일한 GGUF·동일한 프롬프트·동일한 샘플링
파라미터를 쓴다. 이 기능은 추론을 수행하지 않으므로 강제할 대상이 아직 없다. **제약을 문서로
남기는 것**이 이 기능의 몫이며, 어댑터 소스 주석과 이 계약에 적는다. 실제 강제는 일기 생성
기능에서 프롬프트와 샘플링이 생길 때 이뤄진다.

**서버 자체는 만들지 않는다**(명세 「가정」). 부를 수 있는 통로까지가 이 기능이다.

---

## 선택 (`src/inference/select.ts`)

```ts
function selectBackend(
  resolution: EnvironmentResolution,
  requested?: InferenceLocation,
): { ok: true; backend: InferenceBackend } | { ok: false; reason: string }
```

`policy.selectLocation()`의 결과에 따라 구현체를 반환한다. 규칙 판단은
[environment.md](environment.md)에 있고, 여기서 다시 판단하지 않는다.

### 불변식

1. `dev`·`prod`에서 이 함수가 데스크톱 서버 어댑터를 반환하는 경우는 **없다**(FR-012).
2. 환경 판정 실패 시 어떤 어댑터도 반환하지 않는다(FR-009b).
3. 이 함수를 거치지 않고 어댑터를 직접 만들어 쓰는 코드가 없어야 한다(FR-025).

**1번은 테스트로 강제한다.** 이 기능에서 가장 중요한 테스트이며, 실패하면 헌법 원칙 I이
깨진다.

---

## 금지 사항 (헌법)

| 금지 | 근거 |
| --- | --- |
| 미리 만들어 둔 응답·대체 응답을 반환하는 경로 | 원칙 I, FR-016 |
| 원격 API(외부 모델 API) 어댑터 | 원칙 I, FR-015 |
| 출력을 점수화하거나 어댑터끼리 비교하는 코드 | 원칙 IV, FR-018 |
| 데스크톱이라는 이유로 더 큰 모델을 쓰는 설정 | 원칙 I |
