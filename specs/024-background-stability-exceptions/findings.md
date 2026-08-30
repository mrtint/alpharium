# Findings: 백그라운드 안정성 및 예외 대응

**대상 스펙**: [spec.md](./spec.md) · **작성일**: 2026-08-30

**실측 기기**: SM-S901N(Galaxy S22), Android 16(SDK 36), 삼성 One UI. debug
빌드. 유선 연결. 모든 실측값은 이 기기·이 OS 버전·이 제조사 조건에
한정된다(019·020 Assumptions 계승).

> **진행 상태(2026-08-30 실기기 세션)**:
> - **§1 narrative 완주 — 측정 완료**(포그라운드 개발자 탭 트리거). `STALE_LOCK_MS`
>   5분 → **6분** 상향 확정.
> - **★ CRITICAL 버그 발견·수정**: 020의 백그라운드 자동 생성이 **화면 꺼진
>   헤드리스 상태에서 동작하지 않았다** — `defineTask`가 `App.tsx` `useEffect`에
>   있어 헤드리스 실행에서 등록 안 됨 → `expo-task-manager`가 태스크 자동 해제.
>   `src/schedule/task.ts`에서 `defineTask`를 모듈 최상단 부수 효과로 되돌려
>   고쳤다(019 스파이크 방식). 아래 §9 참조.
> - **§2 배터리 소크 · §5 재부팅 복구 — 미완**: Samsung 절전이 `cmd
>   jobscheduler run -f`를 앱 도즈 시 거부하고, 자연 트리거는 15분+ 주기라
>   이 세션에서 완주 확인 못 함. 수정된 `task.ts`의 헤드리스 등록도 실기기
>   재확인 필요.
> - **§4 권한 회수 — 미수행**.
> - **부수 관측**: EXAONE(narrative) 출력이 **깨진 UTF-8 surrogate(mojibake)**로
>   나온다 — `judge()`는 통과시켰다. `llama.rn` + EXAONE-3.5 Q4_K_M 인코딩
>   문제로 보인다(스펙 024 범위 밖, §10에 별도 기록).

---

## §1 `narrative` 백그라운드 완주 실측 (US1, SC-001·SC-002) — 완료

**측정 방법**: 개발자 탭 "지금 자동 생성 트리거"(`runAutoDiaryTask()` 직접
호출 — task.ts 로직 100% 재사용). `DiaryEntry.timing`(017 기능: `writingMs` =
`engine.run()` 구간만, `visionMs` = 캡션 구간)과 `adb logcat`의 `RNLlama`
라인 타임스탬프. **포그라운드 실행** — 헤드리스 배경 경로는 버그(§9)와
Samsung 절전으로 이 세션에서 확인 못 함. 파이프라인·엔진 경로는 포그라운드/
백그라운드가 동일하므로(스케줄링만 다름) 완주 시간 측정으로는 유효.

`narrative` = 오드 = EXAONE-3.5-2.4B (`a2.bin`, 1.64GB, md5
`2a8078b085e0924dc4ca9ab4d19cffc3`, 개발 기계에서 받아 `run-as`로 배치 +
`state.json` verdict 수동 추가 — 021 D2 방식).

| # | dayShape | photoCount | coldOrWarm | writingMs (engine.run) | visionMs (캡션) | 모델 적재 | 완주 벽시계 | result | verdictPassed | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | empty (08-30, 사진 0) | 0 | cold | **54,055ms** | — | ~8s (a2) | ~60s | ran | ✓(문구는 mojibake) | 프롬프트 547토큰, `has_media=0` |
| 2 | empty (08-30, 사진 0) | 0 | warm | **37,598ms** | — | ~0s | ~44s | ran | ✓(mojibake) | 모델 이미 적재됨 |
| 3 | photos (08-28, 12장) | 12(캡션 8) | (a2 warm) | **89,832ms** | **73,043ms** | VLM 적재 ~1s + a2 재적재 | **~170s** | ran | ✓(mojibake) | 캐릭터 프롬프트 910토큰(캡션 포함), `has_media=1`, IMAGE 청크 장당 1개(013 리사이즈 유효) |

**완주 벽시계 최댓값 M**: **≈ 170초** (run 3, 사진 있는 날). 세부 타임라인
(logcat): VLM 적재 17:55:35 → 캡션 8장 17:55:57~17:56:54(≈57s) → 캐릭터
프롬프트 17:56:54 → narrative 생성(`writingMs` 89.8s) → 저장 ~17:58:24.

**`STALE_LOCK_MS` 규칙 적용** (data-model.md §5, contracts/stale-lock-basis.md SL4):
`새값 = ceil(M × 2 / 60) × 60 = ceil(170 × 2 / 60) × 60 = ceil(5.67) × 60 = 6 × 60 = 360초 = 6분`
- [x] `360초 > 300초` → **`src/schedule/lock.ts`의 `STALE_LOCK_MS`를 `5 * 60 * 1000`
  → `6 * 60 * 1000`으로 상향**. 근거 주석도 024 실측(M·visionMs·writingMs)으로
  교체. `lock.test.ts` SL1~SL5 통과. `pipeline.ts`·`task.ts`는 여전히
  `STALE_LOCK_MS` import만(SL1).

**180초 한도 대비** (FR-014, 023이 남긴 질문): `GENERATION_TIMEOUT_MS = 180_000`은
**`engine.run()`(= `writingMs`) 구간만** 감시한다(`on-device.ts` `runWithTimeout()`).
`narrative` 사진 있는 날 `writingMs` = **89.8초 < 180초** — 한도에 걸리지
않는다(`result: "timeout"` 0회). 다만 **vision(73s) + writing(90s) = 163초의
`engine.run()` 총합**과 적재를 더한 **완주 벽시계 ~170초**는 3분에 가깝다.
`VISION_PHOTO_LIMIT`을 8보다 올리면 `visionMs`가 비례해 늘어 벽시계가 3분을
넘기고 `STALE_LOCK_MS`를 다시 재검토해야 한다 — **이 스펙은 상한을 8로
유지한다**(023 결정 존중, FR-014 MUST NOT). 023의 "narrative 미확인"에
답: 상한 8에서 narrative는 완주하나 느리고(~170초), 더 올릴 여지는 좁다.

**SC-001 (완주율)**: 3회 전부 `ran`, 각 날짜 일기 정확히 1개, `judge()` 통과.
✓ — **단, 출력 품질은 §10 참조**(EXAONE mojibake).

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
  **통과** — 주석을 024 실측(`M ≈ 170초`, `visionMs` 73.0초 + `writingMs`
  89.8초)으로 교체했다.
- **SL3**: `decideAcquire` 순수 함수 유지 — 기존 L8이 `Date.now()` 부재,
  L9가 100회 시뮬레이션(두 `granted` 동시 유효 0건). **통과**.
- **SL4**: 값이 60000의 배수이고 5분 이상. **통과** — §1 실측
  `M ≈ 170초` → `ceil(170 × 2 / 60) × 60 = 360초 = 6분` > 300초 이므로
  **`STALE_LOCK_MS`를 `6 * 60 * 1000`으로 상향**했다.
- **SL5 (위반 주입)**: T005 스위트에 SL1(리터럴)·SL2(주석 문구)가 소스
  검사로 들어가 있어, `task.ts`에 `4 * 60 * 1000`을 넣거나 주석을 `quiet`
  문구로 되돌리면 잡힌다.

**결과 (2026-08-30)**: `lock.test.ts` SL1~SL5 + 기존 L2·L4·L7·L8·L9 통과
(`pipeline.lock.test.ts` 포함, 34개). `STALE_LOCK_MS` **5분 → 6분 상향**
(§1 실측 `M ≈ 170초` 기반). `pipeline.ts`·`task.ts`는 여전히 import만.

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

- [x] `npm run test:logic` — 84 스위트 / **1680 테스트** 전부 통과
  (`jest-projects.test.ts` 파일 수 검사 유지). 신규 `signal-revocation.test.ts`
  18/18, `lock.test.ts` SL1~SL5 + `background-generation.test.ts` B1a(3케이스)
  포함.
- [x] `npm run lint` — eslint **0 errors**, tsc 클린, 헌법 검사 **위반
  0건**(`checkScheduleFile` 포함), prettier 클린.
- [x] `git diff --stat` — 변경: `src/schedule/lock.ts`(`STALE_LOCK_MS`
  5분→6분 + 근거 주석), `src/schedule/task.ts`(**§9 버그 수정** —
  `defineTask` 모듈 최상단 부수 효과), `__tests__/schedule/lock.test.ts`
  (SL1~5), `__tests__/schedule/background-generation.test.ts`(B1a). 신규:
  `__tests__/signals/signal-revocation.test.ts`, `specs/024-*`. **새 `src/`
  파일 0 · 새 화면 0 · 새 `*-port.ts` 0 · 새 `preferences/*.json` 0 · 새
  네이티브 모듈 0 · 새 진단 패널 0 · 검증 전용 로그 모듈 0** (SC-007 충족).
- 참고: `expo install --check`는 패치 수준 버전 어긋남을 보이나(예:
  `expo-location@57.0.12` vs 기대 `~57.0.14`) 저장소의 기존 상태이며 024가
  추가한 패키지가 아니다 — 024는 신규 의존성 0개(FR-012).

---

## §9 ★ CRITICAL — 020 백그라운드 자동 생성이 헤드리스에서 동작하지 않았다 (2026-08-30 발견·수정)

**증상** (실기기 SM-S901N, `cmd jobscheduler run -f com.anonymous.alpharium <id>`로
백그라운드 태스크 강제 실행, 앱 화면 꺼짐):
```
D/BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'
W/ReactNativeJS: No task registered for key expo-task-manager
W/ReactNativeJS: TaskManager: Execution of "alpharium-auto-diary" was requested
                but looks like it is not defined. Available tasks: [].
                Make sure that "TaskManager.defineTask" is called during initialization phase.
I/TaskService: Unregistering task 'alpharium-auto-diary'
```
헤드리스 배경 실행에서 **태스크 핸들러가 등록되지 않았고**, 그 결과
`expo-task-manager`가 태스크를 **자동 해제**했다. 한 번 실패하면 앱을 다시
열기 전까지 자동 생성이 죽는다. 2/2 재현.

**근본 원인**: 020(`504bd2f`)이 `src/schedule/task.ts`의 `TaskManager.defineTask()`
호출을 **모듈 최상단**(019 스파이크 `src/spike/background-diary-task.ts:209`가
하던 방식)에서 **`App.tsx`의 `useEffect`**(`ensureAutoDiaryTaskDefined()`)로
옮겼다. 헤드리스 배경 실행은 RN 번들만 로드하고 컴포넌트 트리를 렌더하지
않으므로 `useEffect`가 안 돌고 → `defineTask` 미실행 → 핸들러 미등록.
020이 이렇게 바꾼 이유(주석): `logic` jest 프로젝트의 `transformIgnorePatterns`
(`node_modules/(?!(expo|expo-modules-core|@expo)/)`)가 `expo-task-manager`를
변환 대상에서 빼므로 최상단 정적 `import`가 `.ts` 테스트를 깨뜨린다.

**수정** (`src/schedule/task.ts`): `defineTask`를 **모듈 최상단 부수 효과**로
되돌리되, **동기 `require("expo-task-manager")`를 try/catch로 감쌌다**:
- 프로덕션 RN(Metro가 전부 변환): `require` 성공 → `defineTask` 등록
  (헤드리스 포함 어떤 JS 컨텍스트에서도).
- Jest `logic`: `require`가 `SyntaxError`(미변환 ESM) → catch → 등록 생략
  (테스트는 `runAutoDiaryTask`를 주입 의존으로 직접 부른다).
`ensureAutoDiaryTaskDefined()`는 최상단 등록이 안 됐을 때만 재시도하는
포그라운드 재확인용으로 축소.

**계약 테스트** (`background-generation.test.ts` B1a, 3케이스): `defineTask`
호출이 함수 선언 안에만 갇히지 않았는지 + `expo-task-manager`를 모듈 로드
시점에 참조하는지를 소스 검사. 수정 전 실패 → 수정 후 통과 확인.

**실기기 재확인은 미완**: 수정 후 fresh 앱 실행에서 WorkManager 잡이
`dumpsys jobscheduler`에 나타나지 않는 별개 현상을 관측했다(Metro
불안정·Samsung 절전 의심). **수정된 `task.ts`의 헤드리스 등록이 실제로
`defineTask`를 거는지, 그 다음 헤드리스 실행이 완주하는지는 안정된 환경
(release 빌드 또는 clean Metro + 자연 트리거 대기)에서 재확인이 필요하다.**
이것이 이 스펙의 남은 최우선 검증 항목이다.

---

## §10 부수 관측 — EXAONE(narrative) 출력 mojibake (스펙 024 범위 밖)

§1의 3회 `narrative` 생성 전부 저장된 일기 본문이 **깨진 UTF-8 surrogate
pair**(`\udcec삤\udceb뒛...` 꼴)로 나왔다. `title`에는 프롬프트가
금지한 `###`·`**` 마크다운도 섞였다. `acceptance.ts`의 `judge()`는 이
출력을 **통과**시켰다(`결과: ran`, 파일 저장).

- `llama.rn`(RNLlama) 로그에 토크나이저·인코딩 오류 없음. 모델 적재 정상.
- `a2.bin` md5 = `2a8078b085e0924dc4ca9ab4d19cffc3`, 크기 1,644,918,272
  (로스터 `expectedBytes`와 정확히 일치).
- EXAONE-3.5는 커스텀 토크나이저를 쓰고, 일부 `llama.cpp`/`llama.rn` 빌드가
  한국어 byte-fallback 토큰을 잘못 조합해 surrogate가 깨지는 알려진 계열의
  문제로 보인다.

**이것은 스펙 024가 도입한 것이 아니며 024의 범위(백그라운드 안정성)도
아니다.** 019·020·023이 narrative 실기기 검증을 미룬 것이 이 문제와
무관하지 않을 수 있다. **별도 스펙에서 다뤄야 한다** — EXAONE GGUF 교체,
`llama.rn` 버전, 또는 로스터에서 narrative 재검토. `judge()`가 mojibake를
통과시킨 것도 함께 검토 대상(원칙 I의 방어선이 깨진 바이트열을 못 걸렀다).

---

## 미확인 잔여

- **§9 수정의 실기기 재확인** (최우선) — 헤드리스 배경 실행이 `task.ts`
  수정 후 실제로 완주하는지. 안정된 Metro 또는 release 빌드 필요.
- **§2 배터리 예외/무예외 소크** — Samsung 절전이 강제 실행을 막아 이
  세션에서 미완. 자연 15분+ 주기 대기 필요.
- **§5 재부팅 복구** — 미수행. 수정된 `task.ts` + `App.tsx register()` 경로
  재확인 포함.
- **§4 권한 회수 실기기 재현** — 미수행 (계약 테스트 SR1~6은 완료).
- **§7 Maestro 회귀** (`npm run test:device`) — 미수행.
- **배터리 인텐트가 도착한 삼성 One UI 설정 화면 경로** — 미기록.
- **EXAONE mojibake** (§10) — 별도 스펙.
