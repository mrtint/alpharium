# Phase 0: 조사

**기능**: 프로젝트 뼈대와 의존성 기반 세우기 | **날짜**: 2026-08-12

명세가 남긴 미확정 항목과, 구현 방식을 고르기 전에 실제로 확인해야 했던 것을 정리한다.
**추측한 것과 확인한 것을 구분해 적는다**(헌법 원칙 V).

---

## 1. 모델 파일 없이 네이티브 추론 모듈의 적재를 확인하는 방법

**Decision**: `llama.rn`의 `getBackendDevicesInfo()`를 호출해 성공 여부로 판정한다.

**Rationale**: FR-006은 모듈 적재 확인을 요구하지만 FR-008은 모델 파일을 범위 밖에 둔다.
이 둘을 동시에 만족하려면 **모델 없이 네이티브 계층에 닿는 호출**이 필요하다.
`getBackendDevicesInfo()`는 사용 가능한 백엔드 장치 정보를 반환하며 모델 인자를 받지 않는다.
호출이 성공하면 네이티브 모듈이 적재되어 JS에서 호출 가능하다는 뜻이고, 이것이 FR-006이
요구하는 전부다.

**확인 방법 (실측)**: `node_modules/llama.rn/lib/typescript/index.d.ts`에서 공개 API를 직접
확인했다. 2026-08-12, 설치본 `llama.rn 0.12.9` 기준.

```
export declare function getBackendDevicesInfo(): Promise<Array<NativeBackendDeviceInfo>>;
export declare function loadLlamaModelInfo(model: string): Promise<Object>;
export declare function initLlama(...): Promise<LlamaContext>;
```

**Alternatives considered**:
- `initLlama()` 호출 — 모델 경로가 필수라 FR-008 위반. 기각.
- `loadLlamaModelInfo(model)` — 모델 경로 인자가 필요. 기각.
- 모듈 import 성공 여부만 확인 — JS 모듈이 로드돼도 네이티브가 붙었는지는 알 수 없다.
  "조용히 죽지 않는다"(FR-007)를 만족 못 함. 기각.

**실기기 관측 (2026-08-12, Galaxy S20+ / SM-G986N, Android 13, arm64-v8a)**:

```json
[{"backend":"CPU","type":"cpu","deviceName":"CPU","maxMemorySize":11116609536}]
```

빈 배열이 아니라 CPU 백엔드 하나를 반환했다. 가용 메모리는 약 11.1 GB로 보고됐다.
GPU 백엔드는 나타나지 않았다 — 이 기기에서는 CPU 추론만 가능하다는 뜻으로 읽히며,
필요하면 일기 생성 기능에서 다시 확인한다.

**"호출 성공 = 모듈 적재됨"이라는 가정이 실기기에서 성립했다.** 진단 판정 기준을 바꿀
필요가 없다. 같은 호출이 시뮬레이터에서는 네이티브 모듈 부재로 실패하므로
`unavailable`과 구분된다.

---

## 2. 시뮬레이터에서 네이티브 모듈이 없는 상태를 다루는 방법

**Decision**: `llama.rn`이 제공하는 `jest/mock.js`를 테스트에서 쓰고, 런타임에서는
`getBackendDevicesInfo()` 실패를 **오류가 아닌 예상된 상태**로 처리한다(User Story 2 시나리오 3).

**Rationale**: 시뮬레이터에는 네이티브 추론 모듈이 없다. 이것은 결함이 아니라 local 환경의
전제이므로, 실패를 오류로 다루면 SC-006(시뮬레이터만으로 화면·흐름 작업)이 깨진다.

**확인 방법 (실측)**: `node_modules/llama.rn/jest/mock.js`가 패키지에 포함되어 있음을 확인했다.

**Alternatives considered**:
- 직접 mock 작성 — 패키지가 제공하는 것이 있으므로 불필요.
- 시뮬레이터에서 온디바이스 어댑터 자체를 로드하지 않기 — 환경 판정이 실행 시점이므로
  (FR-009a) 정적 배제가 불가능. 런타임 처리가 맞다.

---

## 3. 환경을 실행 시점에 판정하는 수단

**Decision**: `process.env.EXPO_PUBLIC_APP_ENV`를 `src/config/environment.ts` 한 곳에서만
읽는다.

**Rationale**: FR-009a가 실행 시점 판정, 단일 빌드를 요구한다. Expo에서 클라이언트 코드가
런타임에 읽을 수 있는 값은 `EXPO_PUBLIC_` 접두사가 붙은 것뿐이다.

**확인 방법**: context7 `/expo/expo` 공식 문서로 확인 (AGENTS.md가 요구하는 절차).
문서가 명시한 중요한 사실: **`EXPO_PUBLIC_` 값은 엔드유저가 읽을 수 있다** — "Do not store
secrets in these variables as they are readable by end users."

**이 사실의 귀결**: 데스크톱 서버 주소를 `EXPO_PUBLIC_`으로 두면 배포본에 문자열로 박힌다.
FR-014(서버 주소는 local에만 존재)는 그래서 "값을 비워 둔다"가 아니라 **prod 설정에 키 자체를
두지 않는다**로 구현해야 하며, 자동 검사가 이를 확인해야 한다(FR-027).

**Alternatives considered**:
- `app.config.js`의 `extra` 필드 — 빌드 시점에 굳으므로 FR-009a와 어긋난다. 기각.
- 빌드 프로파일별 별도 빌드 — 사용자가 실행 시점 판정을 선택했다(명확화 Q1). 기각.

---

## 4. 실기기 자동 테스트 도구

**Decision**: Maestro를 실기기 갈래에 쓴다. 기기가 없으면 건너뛴다(FR-021d).

**Rationale**: Expo 공식 문서가 E2E 예제로 Maestro를 쓴다. YAML 흐름 파일이라 진입 비용이
낮고, 이 기능이 검증할 것(앱이 뜨는가, 진단 화면에 모듈 상태가 보이는가)이 단순해서 충분하다.

**확인 방법**: context7 `/expo/expo`에서 Maestro 사용 예를 확인. `.maestro/*.yml` +
`maestro test` 형태.

**미확인 / 위험**: Maestro는 현재 이 기계에 **설치되어 있지 않다**(`which maestro` → 없음).
별도 설치가 필요한 외부 도구이므로, 없을 때 건너뛰는 처리가 FR-021d 구현의 일부다.

**Alternatives considered**:
- Detox — 설정 비용이 크고 이 기능의 검증 대상에 비해 과하다. 기각.
- `adb`로 직접 조작 — 도구를 직접 만드는 셈이라 유지 비용이 크다. 기각.
- 실기기 테스트 없이 손으로만 — 사용자가 명확화에서 명시적으로 기각(Q4, C 선택).

---

## 5. 헌법 위반 자동 검사의 형태

**Decision**: `scripts/check-constitution.mjs` — Node 스크립트로 저장소 파일을 훑어 금지된
설정을 찾고, 발견 시 0이 아닌 종료 코드로 실패한다. CI와 `npm run lint`에서 돌린다.

**Rationale**: FR-026이 커밋 또는 빌드 시점 실행을 요구한다. 외부 의존성 없이 Node만으로
가능하고, 검사 대상이 "특정 문자열/키가 특정 파일에 있는가"라 단순하다.

**검사 항목** (FR-027):
- dev·prod 환경 설정에 데스크톱 서버 주소 키가 존재하는가
- 원격 API 추론을 가리키는 설정이 존재하는가
- 대체 응답(mock fallback) 스위치가 존재하는가

**원칙 IV와의 관계**: 이 검사는 **설정 위반**을 잡는다. 모델 출력을 재거나 점수를 매기지
않는다(FR-028). 헌법 원칙 IV가 금지한 "측정 장치"에 해당하지 않는다는 판단이며, 이 근거를
스크립트 주석에도 남긴다.

**Alternatives considered**:
- ESLint 커스텀 규칙 — 검사 대상이 소스 코드가 아니라 설정 파일이라 맞지 않는다. 기각.
- git pre-commit 훅만 — 훅은 우회 가능하고 CI에서 안 돌면 의미가 약하다. CI 포함이 맞다.

---

## 6. 기존 CI가 이 기능과 어긋나는 부분

**발견 (실측)**: `.github/workflows/ci.yml`이 되돌리기 이전 상태로 남아 있으며, 지금 저장소와
맞지 않는다. 2026-08-12 확인.

| 문제 | 현재 CI | 왜 문제인가 |
| --- | --- | --- |
| 없는 경로 참조 | `npx prettier --check "src/**/*.{ts,tsx}" "App.tsx"` | `src/`도 `App.tsx`도 존재하지 않는다 |
| 웹 빌드 | `npx expo export --platform web` | 이 제품은 안드로이드 앱이다. 웹은 범위 밖이며 온디바이스 추론이 불가능한 플랫폼이다 |
| 테스트 실패 | `npm test` | 테스트가 하나도 없어 "No tests found"로 실패한다 (FR-019가 고칠 대상) |
| 헌법 검사 없음 | — | FR-026이 요구하는 자동 검사가 CI에 없다 |

**Decision**: 이 기능에서 CI를 함께 고친다. 없는 경로 참조와 웹 빌드를 제거하고, 헌법 검사와
기기 불필요 테스트를 넣는다. 실기기 테스트는 CI에서 건너뛰어지며 그 사실이 보고된다(FR-021e).

**Rationale**: 뼈대 기능이 "다음 기능이 올라설 바닥"인데 CI가 깨진 채로 남으면 바닥이 아니다.
FR-021~022가 검사의 동작을 요구하므로 CI 수정은 범위 안이다.

**주의**: 웹 빌드 제거는 배포 관련 변경이지만, 「범위 밖」의 "배포와 스토어 등록"은 **새 배포
경로를 만드는 것**을 가리킨다. 존재하지 않는 플랫폼을 향한 깨진 빌드를 제거하는 것은 정리에
해당한다.

---

## 7. 미해결로 남기는 것

| 항목 | 왜 지금 정하지 않는가 |
| --- | --- |
| 데스크톱 추론 서버의 구체적 프로토콜 | 서버 자체가 이 기능의 범위 밖(명세 「가정」). 어댑터 인터페이스만 정하고 구현은 최소한으로 둔다 |
| GGUF·프롬프트·샘플링의 실제 값 | 일기 생성 기능의 몫. FR-013은 "제약이 문서에 명시될 것"만 요구한다 |
| 진단 화면의 디자인 | 명세 「가정」이 화면 디자인을 범위 밖으로 둔다. 상태가 읽히면 충분하다 |
| `getBackendDevicesInfo()`의 실기기 반환값 | 실기기 테스트에서 관측할 항목. 지금 추측해 적지 않는다 (원칙 V) |
