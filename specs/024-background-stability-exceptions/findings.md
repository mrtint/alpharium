# Findings: 백그라운드 안정성 및 예외 대응

**대상 스펙**: [spec.md](./spec.md) · **작성일**: 2026-08-30

**실측 기기**: SM-S901N(Galaxy S22), Android 16(SDK 36), 삼성 One UI. debug
빌드. 무선 디버깅. 모든 실측값은 이 기기·이 OS 버전·이 제조사 조건에
한정된다(019·020 Assumptions 계승).

> **진행 상태**: 코드측 태스크(계약 테스트·소스 확인·문서 뼈대) 완료.
> **실기기 검증 5라운드(§1 narrative 완주 · §2 배터리 예외 · §3 무예외 24h
> 소크 · §4 권한 회수 · §5 재부팅 복구)는 미수행 — 사람이 SM-S901N에서
> quickstart.md 절차대로 수행한 뒤 아래 표를 채운다.**

---

## §1 `narrative` 백그라운드 완주 실측 (US1, SC-001·SC-002)

**측정 방법**: quickstart.md §1. `adb logcat -v time`의 `pipeline-stage`·
`task-`·`Success`/`Failed` 라인에서 진입~완주 벽시계.

| # | character | dayShape | photoCount | coldOrWarm | wallClockMs | engineRunMs | visionMs | result | triggeredAt | finalDiaryCount | verdictPassed | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| _(미측정)_ | narrative | | | | | | | | | | | |

**cold `wallClockMs` 최댓값 M**: _(미측정)_

**`STALE_LOCK_MS` 규칙 적용** (data-model.md §5):
`새값 = ceil(M × 2 / 60000) × 60000` = _(미계산)_
- [ ] `새값 <= 300000` → `lock.ts` 값 무변경, 근거 주석만 교체
- [ ] `새값 > 300000` → `lock.ts` 값 상향 + 주석 교체

**180초 한도 대비** (FR-014): M이 `GENERATION_TIMEOUT_MS`(180초) + 적재에
근접/초과하는가 — _(미측정)_. `result: "timeout"` 빈도: _(미측정)_.
※ 이 스펙은 180초 한도·`VISION_PHOTO_LIMIT`을 바꾸지 않는다. 기록만.

---

## §2 배터리 라운드 관측 (US2, SC-003·SC-004)

**측정 방법**: quickstart.md §2(예외)·§3(무예외 24h). `dumpsys deviceidle
whitelist` +/−, `am get-standby-bucket`, `dumpsys jobscheduler`의 `Minimum
latency`, `adb logcat`의 `task-entered`.

| batteryException | targetHour | roundStartedAt | triggerEnteredAt[] | delayFromTargetMin[] | standbyBucket | minLatencyReported | screenTouchedDuringRound | notes |
|---|---|---|---|---|---|---|---|---|
| _(미측정)_ true | | | | | | | | |
| _(미측정)_ false | | | | | | | false | 24h 소크 |

**MUST 판정**:
- [ ] SC-003 (예외): 목표 시각으로부터 첫 시도 ≤ 60분 — _(미판정)_
- [ ] SC-002·SC-004 (무예외): 목표 시각 후 24시간 안 ≥ 1회 시도 — _(미판정)_

**SHOULD**: 예외 시 3회 이상 표본의 과반 ≤ 40분 — _(미측정, 표본 부족 시
원시값만)_

**배터리 인텐트가 실제 도착한 삼성 One UI 설정 화면 경로** (021 T030 관행):
_(미기록)_

---

## §3 재부팅 복구 관측 (US4, SC-006)

**측정 방법**: quickstart.md §5. `dumpsys jobscheduler | grep alpharium`.

| autoDiaryEnabled | phase | jobSchedulerRegistered | directBootObserved | notes |
|---|---|---|---|---|
| _(미측정)_ true | before-reboot | | | |
| _(미측정)_ true | after-reboot-app-closed | | | 한계 — 보장 안 됨 |
| _(미측정)_ true | after-reboot-app-opened | | | 기대: true |
| _(미측정)_ false | after-reboot-app-opened | | | 기대: false |

**한계 문서화** (FR-010, US4 Scenario 2): 재부팅 후 앱을 한 번도 열지 않은
구간에는 자동 생성 예약이 되살아나지 않는다. `BOOT_COMPLETED` 브로드캐스트
수신 같은 새 네이티브 경로는 만들지 않는다(범위 밖 — FR-012). 이 앱의 사용
패턴상 하루 한 번은 앱을 여는 것을 전제로 한다.

---

## §4 권한 회수 재현 관측 (US3, SC-005)

**측정 방법**: quickstart.md §4. §1 `narrative` 라운드의 넓은 실행 창 안에서
`adb shell pm revoke`. 저장된 일기는 `run-as com.anonymous.alpharium cat
files/diary/<날짜>.json`의 `signalsUsed.photos.kind`·`signalsUsed.places.kind`.

| axis | revokedDuringRun | permissionQueryResult | storedSignalKind | otherAxisSurvived | bodyHasAssertion | verdictOrRejected | fileUntouchedOnReject | notes |
|---|---|---|---|---|---|---|---|---|
| _(미측정)_ photos | | | | | | | | |
| _(미측정)_ location | | | | | | | | |

**기대** (SC-005): `storedSignalKind: "unknown"` 100%, `bodyHasAssertion:
false` 100%, `otherAxisSurvived: true`.

**`collect.ts` 보강 여부** (T020): _(미판정 — 대개 무변경, 004 설계상 모든
갈래를 `unknown`으로 감쌈. 실기기에서 `unknown`이 아닌 갈래가 나오면 그
한 분기만 보강하고 SR1~SR4에 케이스 추가)_

---

## §5 계약 테스트 결과 (기기 없음 — 완료)

### SL1~SL5 (`__tests__/schedule/lock.test.ts` 확장, contracts/stale-lock-basis.md)

- **SL1**: `lock.ts` 단일 정의 + `task.ts`·`pipeline.ts` 잠금 만료 리터럴
  부재. **통과** (기존 `pipeline.lock.test.ts:118`·`lock.test.ts` L8 재사용
  + `task.ts` 검사 신규).
- **SL2**: `lock.ts` `STALE_LOCK_MS` 근거 주석이 `narrative` 실측 참조.
  **통과** — 주석을 교체했다(`quiet 2분 27초` → `narrative 완주 실측
  최댓값 M × 2, 분 단위 올림; M과 확정 근거는 findings.md §1`). **값은
  아직 5분 그대로** — 실기기 §1의 M 측정 후 규칙(SL4)으로 확정한다.
  주석이 findings.md §1을 가리키므로 M이 채워지면 그 자리만 갱신된다.
- **SL3**: `decideAcquire` 순수 함수 유지 — 기존 L8이 `Date.now()` 부재,
  L9가 100회 시뮬레이션(두 `granted` 동시 유효 0건). **통과**.
- **SL4**: 값이 60000의 배수이고 5분 이상. **통과** (현재 5분). §1 실측
  후 `새값 = ceil(M × 2 / 60000) × 60000`이 5분 초과면 값 상향, 이하면
  무변경.
- **SL5 (위반 주입)**: T005 스위트에 SL1(리터럴)·SL2(주석 문구)가 소스
  검사로 들어가 있어, `task.ts`에 `4 * 60 * 1000`을 넣거나 주석을 `quiet`
  문구로 되돌리면 잡힌다.

**결과 (2026-08-30, 기기 없음)**: `lock.test.ts` 34/34 통과
(`pipeline.lock.test.ts` 포함). `STALE_LOCK_MS` **값 미변경(5분)** — 실기기
§1의 `narrative` 완주 실측(M)이 아직 없다. 주석은 교체 완료.

### SR1~SR6 (`__tests__/signals/signal-revocation.test.ts` 신규, contracts/signal-revocation.md)

- **SR1**: `granted` 아닌 4개 권한 상태 → `photos.kind === "unknown"`,
  never `none`. **통과** (18/18).
- **SR2**: 조회 `granted` 후 `photosBetween` 던짐 → `unknown`, never `none`.
  **통과**.
- **SR3**: `photos.kind !== "known"` → `places.kind === "unknown"`; 사진
  `known`인데 `locationOf` 전부 던짐 → `places` `unknown`, 사진 생존.
  **통과**.
- **SR4**: 포트가 던져도 `collectDaySignals`는 던지지 않는다. **통과**.
- **SR6**: `collect.ts`가 `src/schedule/`·`diary/prompt`·`diary/store`를
  import 안 함, 반환 `SignalValue` 갈래가 `known`/`none`/`unknown`뿐.
  **통과**.

**결과 (2026-08-30, 기기 없음)**: `collect.ts`가 **004 설계상 SR1~SR4를
이미 담고 있어 신규 스위트가 첫 실행에서 초록불**이었다(예상대로). 코드
보강 없음 — 이 스펙의 계약 테스트는 그 방어를 백그라운드·실행 중 회수
타이밍에서 명시적으로 잠근 것이다.

**SR5 (위반 주입)**: 4건 전부 잡힘 — (a) `denied` 분기가 `{ kind: "none" }`
반환 → SR1 실패, (b) `photosBetween` catch가 `none` → SR2 실패,
(c) `places` `failures === considered.length`에서 `none` → SR3 실패,
(d) `photoPermission` catch가 `throw error` → SR4 실패. 전부 되돌림.

---

## §6 `AppState.currentState` 한계 (FR-011, 019 §6a 계승)

- `src/schedule/`·`src/signals/` 소스에 `AppState` 참조 없음 — **확인됨**
  (2026-08-30, `grep -rn "AppState\|currentState" src/schedule/ src/signals/`
  → 0건). 이 스펙은 이 값에 새 의존을 만들지 않았다.
- **`AppState.currentState`는 "앱 UI가 전경에 없음"의 근사치이지 "이 순간
  화면이 물리적으로 꺼져 있음"의 증거가 아니다.** 019 §6a에서 반복된
  `adb shell dumpsys`가 화면을 깨운 것으로 보이는 순간이 관측됐다. 이
  스펙은 이 값을 어떤 판정에도 쓰지 않으며, 검증 로그가 이 값을 기록하더라도
  위 의미로만 해석한다.

---

## §7 회귀 (quickstart.md §6)

- [ ] `npm run test:device` — `.maestro/scheduled-diary-notification.yml`(020),
  `unified-permission-onboarding.yml`(021), `photo-selection-over-limit.yml`
  (023) 통과 — _(미수행)_

---

## §8 기기 없는 게이트 (SC-007) — 완료 (2026-08-30)

- [x] `npm test` — 105 스위트 / 1984 테스트 전부 통과 (`jest-projects.test.ts`
  파일 수 검사 `> 40` 유지 — logic 84 + ui). 신규 `signal-revocation.test.ts`
  18/18, `lock.test.ts` 확장 포함 34/34.
- [x] `npm run lint` — eslint **0 errors**(2 warnings는 전부 이 스펙과
  무관한 기존 파일 — `release-signing.test.ts`, `safe-area.test.tsx`, T002
  베이스라인과 동일), tsc 클린, 헌법 검사 **위반 0건**(`checkScheduleFile`
  포함), prettier 클린.
- [x] `git diff --stat` — 변경: `src/schedule/lock.ts`(주석 12줄, **값
  무변경**), `__tests__/schedule/lock.test.ts`(SL 케이스 66줄 추가),
  `.specify/feature.json`(스펙킷 추적). 신규: `__tests__/signals/signal-revocation.test.ts`,
  `specs/024-*`. **새 `src/` 파일 0 · 새 화면 0 · 새 `*-port.ts` 0 · 새
  `preferences/*.json` 0 · 새 네이티브 모듈 0 · 새 진단 패널 0 · 검증 전용
  로그 모듈 0** (SC-007 충족).
- 참고: `expo install --check`는 패치 수준 버전 어긋남을 보이나(예:
  `expo-location@57.0.12` vs 기대 `~57.0.14`) 이는 저장소의 기존 상태이며
  024가 추가한 패키지가 아니다 — 024는 신규 의존성 0개(FR-012).

---

## 미확인 잔여

- §1~§5 실기기 5라운드 전부 (사람 수행 필요, SM-S901N).
- `STALE_LOCK_MS` 최종값 (M 실측에 의존).
- `narrative`가 180초 한도에 대해 어디 있는지 (FR-014).
- 배터리 인텐트가 도착한 삼성 One UI 설정 화면 경로.
- `collect.ts` 보강 필요 여부 (실기기 §4 결과에 의존).
