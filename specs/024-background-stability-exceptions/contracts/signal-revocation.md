# Contract: 권한 회수 시 신호 계층 방어 (US3)

**대상 스펙**: [spec.md](../spec.md) FR-006·FR-007·FR-008 · [plan.md](../plan.md)

**대상 코드**: `src/signals/collect.ts` (004가 만든 헌법 원칙 V의 방어선)

**성격**: **순수 판정 계약.** `collect.ts`는 대개 이미 이 계약을 담고 있다
(004 FR-007·FR-012·FR-016). 이 계약의 목적은 그 방어를 **백그라운드·실행 중
회수 타이밍에서도 성립함을 테스트로 명시적으로 잠그는 것**이며, 실기기
재현에서 성립하지 않는 갈래가 발견되면 **그 한 지점만** 기존 `unknown` 반환
쪽으로 보강한다(새 판정 갈래 금지).

계약 테스트는 소스 선언을 읽고 fake 포트로 판정을 돌린다(007·009·012 관례).
대상 스위트: `__tests__/signals/collect.test.ts` 또는 신규
`__tests__/signals/signal-revocation.test.ts`.

---

## SR1 — `granted`가 아닌 모든 권한 상태 → `unknown`, never `none`

`collectDaySignals(port, day)`에서 `port.photoPermission()`이 다음 네 값 중
무엇을 돌려주든:

- `"limited"`, `"denied"`, `"blocked"`, `"undetermined"`

`result.photos.kind === "unknown"`이어야 하며 **`"none"`이 아니어야 한다**.
`result.photos`가 `unknown`일 때 `reason` 문자열이 비어 있지 않아야 한다
(네 상태가 서로 다른 이유 문구 — 004 `permissionReason`).

**왜**: 권한이 없어 못 본 것과 권한이 있는데 안 찍은 것은 다르다. 후자로
기록하면 일기가 "사진을 한 장도 안 찍었다"고 거짓을 쓴다(FR-006, 헌법 원칙 V).

---

## SR2 — 조회는 `granted`, 접근이 던짐 (실행 중 회수)

`port.photoPermission()`이 `"granted"`를 돌려준 뒤 `port.photosBetween(...)`가
예외를 던지면(권한 조회와 실제 접근 사이에 회수된 상황), `result.photos.kind
=== "unknown"`이어야 하며 `"none"`이 아니어야 한다. `reason`에 조회 실패
맥락이 담겨야 한다("사진을 조회하지 못했다: ...").

**왜**: 백그라운드 자동 생성은 실행 창이 길고(특히 `narrative`), 그 사이
권한이 회수될 수 있다. `collect.ts`의 `catch`가 이미 `unknown`으로 감싸지만
(004 FR-012·FR-016), 이 계약이 그것을 잠근다.

---

## SR3 — 위치 실패가 사진을 무너뜨리지 않는다

- `photos.kind !== "known"`(위 SR1·SR2로 `unknown`이 된 경우 포함)이면
  `places.kind === "unknown"`이고 `reason`이 "사진을 보지 못해 좌표를 물을
  수 없다" 계열이다 — 좌표 권한이 아니라 사진을 못 본 것이 이유로 나가야
  한다(순서가 계약).
- `photos.kind === "known"`인데 `port.locationOf()`가 모든 사진에 대해
  던지면(위치 권한만 실행 중 회수) `places.kind === "unknown"`이고,
  **`photos` 신호는 그대로 `known`으로 살아 있다**(FR-007 — 좌표 단계가
  통째로 실패해도 사진은 이미 손에 있다).

**왜**: FR-007. 004 FR-013a가 이미 이 순서를 구현했고, 이 계약이 백그라운드
회수 타이밍에서 재확인한다.

---

## SR4 — 어떤 경우에도 던지지 않는다

`collectDaySignals`는 포트가 계약을 어겨(예외를 던져)도 던지지 않고
`DaySignals`를 반환한다. 무너진 축은 `unknown`으로 나간다(004 FR-012 재확인).

---

## SR5 — 위반 주입

| 주입 | 잡는 계약 |
|---|---|
| `collectPhotos`가 `permission === "denied"`에서 `{ kind: "none" }`을 반환하도록 임시 수정 | SR1 실패 |
| `collectPhotos`의 `photosBetween` catch가 `{ kind: "none" }`을 반환하도록 수정 | SR2 실패 |
| `collectPlaces`가 `failures === considered.length`에서 `{ kind: "none" }`을 반환하도록 수정 | SR3 실패 |
| `collectDaySignals`에서 `try/catch`를 제거해 포트 예외가 밖으로 나가게 함 | SR4 실패 |

각 주입 후 되돌린다(007~023 관례).

---

## SR6 — 경계 유지

- `src/signals/collect.ts`는 `src/schedule/`·`src/diary/prompt`·
  `src/diary/store`를 import하지 않는다(004 경계). 이 스펙이 새 import를
  추가하지 않는다.
- 권한 회수 대응을 위해 **새 `SignalValue` 갈래를 만들지 않는다** — `known`/
  `none`/`unknown` 셋 그대로(헌법 원칙 V, `valueOr` 같은 편의 함수 금지).
- 자동 생성 태스크(`src/schedule/task.ts`)에 권한 재확인 단계를 추가하지
  않는다 — `collect.ts`가 매 수집에서 권한을 조회하며, 태스크는 신호를
  모른다(009부터 이어진 경계, `checkScheduleFile`).

---

## 실기기 재현과의 관계 (quickstart.md §4)

- `narrative` 완주 라운드(§1)의 넓은 실행 창 안에서 `adb shell pm revoke`로
  사진/위치 권한을 회수한다.
- 저장된 일기의 `signalsUsed`에서 해당 신호가 `unknown`인지(data-model.md §4
  `storedSignalKind`), 본문에 단정이 없는지(`bodyHasAssertion === false`)
  확인한다.
- `unknown`이 아닌 값(특히 `none`)이 나오는 갈래가 있으면 **그 한 분기만**
  `collect.ts`에서 기존 `unknown` 반환으로 유도하고, SR1~SR4에 케이스를
  더해 회귀를 잠근다.
