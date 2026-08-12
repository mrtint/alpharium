# 계약: 환경 판정

**대상**: `src/config/environment.ts`, `src/config/policy.ts`
**관련 요구사항**: FR-009, FR-009a, FR-009b, FR-009c, FR-010~FR-012, FR-014

이 계약은 **순수 함수**다. 기기·네트워크·파일 없이 테스트할 수 있어야 한다(FR-021c).
테스트를 먼저 쓴다(헌법 「개발 방식」).

---

## 환경 판정

```ts
type Environment = 'local' | 'dev' | 'prod'

type EnvironmentResolution =
  | { ok: true; environment: Environment }
  | { ok: false; reason: 'missing' | 'unknown'; received: string | undefined }

function resolveEnvironment(raw: string | undefined): EnvironmentResolution
```

**입력은 인자로 받는다.** 함수 안에서 `process.env`를 직접 읽지 않는다 — 그래야 테스트가
전역 상태를 건드리지 않는다. `process.env`를 읽는 것은 이 모듈의 진입점 한 곳뿐이다.

### 검증 표

| 입력 | 기대 결과 |
| --- | --- |
| `'local'` | `{ ok: true, environment: 'local' }` |
| `'dev'` | `{ ok: true, environment: 'dev' }` |
| `'prod'` | `{ ok: true, environment: 'prod' }` |
| `undefined` | `{ ok: false, reason: 'missing', received: undefined }` |
| `''` | `{ ok: false, reason: 'missing', received: '' }` |
| `'staging'` | `{ ok: false, reason: 'unknown', received: 'staging' }` |
| `'PROD'` | `{ ok: false, reason: 'unknown', received: 'PROD' }` |
| `' dev '` | `{ ok: false, reason: 'unknown', received: ' dev ' }` |

**대소문자와 공백을 관대하게 처리하지 않는다.** 관대하면 설정 오타가 조용히 통과하고,
FR-009b가 막으려는 "모르는 채로 진행"이 발생한다.

**기본값이 없다.** 판정 실패 시 `prod`로도 `local`로도 떨어지지 않는다. 어느 쪽이든 모르는
상태에서 진행하는 것이기 때문이다.

---

## 추론 위치 규칙

```ts
type InferenceLocation = 'on-device' | 'desktop-server'

function defaultLocationFor(env: Environment): InferenceLocation
function isLocationAllowed(env: Environment, loc: InferenceLocation): boolean
```

### `defaultLocationFor` 검증 표 (FR-010)

| 환경 | 기대 |
| --- | --- |
| `local` | `'desktop-server'` |
| `dev` | `'on-device'` |
| `prod` | `'on-device'` |

### `isLocationAllowed` 검증 표 (FR-011, FR-012)

| 환경 | `on-device` | `desktop-server` |
| --- | --- | --- |
| `local` | `true` | `true` |
| `dev` | `true` | **`false`** |
| `prod` | `true` | **`false`** |

**이 표의 굵은 두 칸이 헌법 원칙 I의 방어선이다.** 이 두 경우를 검증하는 테스트가 이 기능에서
가장 중요한 테스트다. 실패하면 엔드유저의 일기가 기기 밖에서 생성될 수 있다.

---

## 어댑터 선택

```ts
type BackendSelection =
  | { ok: true; location: InferenceLocation }
  | { ok: false; reason: 'environment-unresolved' | 'location-forbidden'
      requested?: InferenceLocation; environment?: Environment }

function selectLocation(
  resolution: EnvironmentResolution,
  requested?: InferenceLocation,
): BackendSelection
```

**이것이 추론 위치를 고르는 유일한 지점이다**(FR-025). 다른 어떤 모듈도 자기 판단으로 추론
위치를 정하지 않는다.

### 검증 표

| 환경 | 요청 | 기대 결과 |
| --- | --- | --- |
| `local` | 없음 | `{ ok: true, location: 'desktop-server' }` |
| `local` | `'on-device'` | `{ ok: true, location: 'on-device' }` |
| `local` | `'desktop-server'` | `{ ok: true, location: 'desktop-server' }` |
| `dev` | 없음 | `{ ok: true, location: 'on-device' }` |
| `dev` | `'on-device'` | `{ ok: true, location: 'on-device' }` |
| `dev` | `'desktop-server'` | **`{ ok: false, reason: 'location-forbidden' }`** |
| `prod` | 없음 | `{ ok: true, location: 'on-device' }` |
| `prod` | `'desktop-server'` | **`{ ok: false, reason: 'location-forbidden' }`** |
| 판정 실패 | 없음 | `{ ok: false, reason: 'environment-unresolved' }` |
| 판정 실패 | `'on-device'` | `{ ok: false, reason: 'environment-unresolved' }` |

**FR-009c의 구현 지점**: 환경을 실행 중에 읽는 이상 dev·prod에서 `desktop-server` 요청이
코드상 도달 가능하다. 그 요청은 여기서 차단되고, 차단됐다는 사실이 진단 정보에 실린다.
조용히 온디바이스로 바꿔치기하지 않는다 — 요청과 다른 것을 조용히 하면 호출자가 무엇이
일어났는지 모른다.

**판정 실패 시 요청을 무시한다.** 환경을 모르면 그 요청이 허용되는지 판단할 근거가 없다.

---

## 데스크톱 서버 주소

**규칙** (FR-014): 서버 주소 설정 키는 **local 환경에만 존재한다**. dev·prod 설정에는 키
자체가 없다.

**값을 비우는 것으로 대신하지 않는다.** `EXPO_PUBLIC_` 값은 배포본에 문자열로 박히고
엔드유저가 읽을 수 있다(research.md §3, Expo 공식 문서). 키가 존재하면 언젠가 값이 채워진다.

이 규칙은 자동 검사가 강제한다 → [constitution-check.md](constitution-check.md)
