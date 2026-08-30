# Findings: 백그라운드 안정성 및 예외 대응

**대상 스펙**: [spec.md](./spec.md) · **작성일**: 2026-08-30

**실측 기기**: SM-S901N(Galaxy S22), Android 16(SDK 36), 삼성 One UI. debug
빌드. 유선 연결. 모든 실측값은 이 기기·이 OS 버전·이 제조사 조건에
한정된다(019·020 Assumptions 계승).

> **진행 상태(2026-08-30 실기기 세션 2회)**:
> - **§1 narrative 완주 — 측정 완료**(1차 세션, 포그라운드 개발자 탭 트리거).
>   `STALE_LOCK_MS` 5분 → **6분** 상향 확정.
> - **★ CRITICAL 버그 발견·수정**: 020의 백그라운드 자동 생성이 **화면 꺼진
>   헤드리스 상태에서 동작하지 않았다** — `defineTask`가 `App.tsx` `useEffect`에
>   있어 헤드리스 실행에서 등록 안 됨 → `expo-task-manager`가 태스크 자동 해제.
>   `src/schedule/task.ts`에서 `defineTask`를 모듈 최상단 부수 효과로 되돌려
>   고쳤다(019 스파이크 방식). 아래 §9 참조.
> - **§9 헤드리스 수정 재확인 — 2차 세션에서 완료**. 화면 꺼진 잠긴 상태에서
>   `cmd jobscheduler run -f`로 강제 실행 시 (1) `No task registered` 에러
>   소멸, `Unregistering` 없음, `TaskService: Registered task` 확인, (2)
>   **배터리 예외를 부여하면 헤드리스 생성이 실제로 완주**(`2026-08-30.json`
>   저장, `writingMs` 52.5초, 판정 통과, 완료 알림, `Worker result SUCCESS`).
>   **배터리 예외 없이는 토큰 생성 단계에서 멈춘다**(5분+ 정지, 미완주) —
>   삼성 절전이 백그라운드 네이티브 CPU를 억제(019 §2 "예외 없이는 억제"
>   재확인).
> - **§4 권한 회수 — 2차 세션에서 완료**. `adb pm revoke`가 앱 프로세스를
>   즉시 kill(`ActivityManager: Killing … permissions revoked`)하므로 실행
>   중 회수는 태스크를 중단시킨다(잠금 파일 안 남김, 원칙 I 정상). 권한
>   회수 상태로 헤드리스 생성 → `2026-08-28.json` 저장, `signalsUsed.photos.kind
>   === "unknown"`(never `none`), 본문에 사진 단정 없음, 판정 통과.
> - **§3 재부팅 복구 — 2차 세션에서 완료**. `adb reboot` 후 앱 열기 전에는
>   `JOB #u0a569` 미등록(문서화된 한계, FR-010). 앱을 홈 화면으로 한 번만
>   열어도 `task.ts` 최상단 `defineTask` → `BackgroundTaskConsumer.didRegister()`
>   → WorkManager 잡 복원/유지(설정 탭 `register()` 불필요) → SC-006 충족.
> - **§7 Maestro 회귀 — 2차 세션에서 완료**. 020·021·023 흐름 3개 전부 PASS.
> - **§2 배터리 예외/무예외 소크 — 미수행**(사용자 결정으로 건너뜀). 자연
>   15분+ 주기 대기가 필요하고 시간이 오래 걸린다.
> - **부수 관측**: EXAONE(narrative) 출력이 **깨진 UTF-8 surrogate(mojibake)**로
>   나온다 — `judge()`는 통과시켰다. `llama.rn` + EXAONE-3.5 Q4_K_M 인코딩
>   문제로 보인다(스펙 024 범위 밖, §10에 별도 기록).
> - **부수 관측 2**: 헤드리스 배경 실행에서 `quiet` 콜드 생성이 **158.5초**로
>   느려진다(§1 포그라운드 콜드 54초의 ~3배). `GENERATION_TIMEOUT_MS` 180초에
>   근접 — narrative 사진 있는 날은 이보다 훨씬 느려 헤드리스 완주 위험이
>   실재한다. §4 참조.

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

## §3 재부팅 복구 관측 (US4, SC-006) — 완료 (2026-08-30 2차 세션)

**측정 방법**: quickstart.md §5. `adb reboot` → `dumpsys jobscheduler`의
`JOB #u0a569/<id> com.anonymous.alpharium/androidx.work.impl.background.systemjob.SystemJobService`
존재 여부 + `START`/`STOP` 이벤트 히스토리.

| autoDiaryEnabled | phase | jobSchedulerRegistered | notes |
|---|---|---|---|
| true | before-reboot | **true** (`JOB #u0a569/78`) | `enabled:true`, 설정 탭 방문으로 등록됨 |
| true | after-reboot-app-closed | **false** | 한계 확인 — `BOOT_COMPLETED` 리시버 없음(FR-010). 앱 프로세스 미기동, `deviceidle whitelist`는 재부팅 후에도 유지 |
| true | after-reboot-app-opened (**홈 화면만**) | **true** (`JOB #u0a569/78`) | `21:21:00.108 I/TaskService: Registered task` → `didRegister: alpharium-auto-diary` → `BackgroundTaskScheduler: Worker is already scheduled, skipping`. **설정 탭 진입 불필요** |
| false | after-reboot-app-opened | _(미측정 — 세션 종료, 아래 분석 참조)_ | 기대: `didRegister`는 `enabled` 무관하게 잡을 등록하나 `decideSchedule`이 `disabled` 반환 |

**메커니즘 확정** (SC-006): 재부팅 후 앱 첫 실행 시 **`src/schedule/task.ts`의
모듈 최상단 `registerAutoDiaryTask()` 부수 효과**(§9 수정으로 되살아난 것)가
`TaskManager.defineTask()`를 호출 → `expo-task-manager`가
`BackgroundTaskConsumer.didRegister()` 콜백 → `BackgroundTaskScheduler.registerTask()`
→ `scheduleWorker()`. 즉 **§9 CRITICAL 수정이 재부팅 복구도 함께 성립시킨다** —
020이 `App.tsx`의 `AutoDiarySettingsScreen` `useEffect`에 둔 `backgroundPort.register()`
(설정 탭을 열어야 도는 경로, `App.tsx:925-927`)에 의존하지 않는다.

실측 로그: 앱을 홈 화면으로 여니 `21:21:00`에 잡이 **즉시 한 번 실행**되고
`-17s390ms STOP: #u0a569/78 … app called jobFinished`(약 57ms 만에 종료 —
`decideSchedule`이 `all-written`으로 skip, 정상). 이후 15분 주기로 재예약.

**020 clarify 답 갱신**: spec.md Clarifications의 "020이 배선한 앱 마운트 시
`register()` 경로가 재부팅 복구를 겸한다"는 **부분적으로만 맞다** — 그 경로는
설정 탭 마운트 시에만 도므로, 홈 화면만 여는 사용자에게는 §9 수정의 최상단
`defineTask` → `didRegister` 경로가 실질적 복구 트리거다.

**한계 문서화** (FR-010, US4 Scenario 2): 재부팅 후 앱을 한 번도 열지 않은
구간에는 자동 생성 예약이 되살아나지 않는다(위 표 `after-reboot-app-closed`
= false로 확인). `BOOT_COMPLETED` 브로드캐스트 수신 같은 새 네이티브 경로는
만들지 않는다(범위 밖 — FR-012). 이 앱의 사용 패턴상 하루 한 번은 앱을 여는
것을 전제로 한다.

**미확인 잔여**: `enabled:false` 대조군(US4 Scenario 3). 2차 세션이 Maestro
`unified-permission-onboarding.yml`의 `clearState`로 앱 데이터를 전부 날려
(모델 4개·일기·설정 삭제) 이 대조를 수행하지 못했다 — §7 참조.

---

## §4 권한 회수 재현 관측 (US3, SC-005) — 완료 (2026-08-30 2차 세션)

**측정 방법**: quickstart.md §4. `adb shell pm revoke` 후 헤드리스 강제
실행(`cmd jobscheduler run -f`). 저장된 일기는 `run-as com.anonymous.alpharium
cat files/diary/<날짜>.json`의 `signalsUsed`.

**먼저 관측된 것 — `pm revoke`는 앱을 죽인다**: 실행 창 안에서 사진 권한
3개(`READ_MEDIA_IMAGES`·`READ_MEDIA_VISUAL_USER_SELECTED`·`ACCESS_MEDIA_LOCATION`)를
`pm revoke`하니 `08-30 21:03:19.152 I/ActivityManager: Killing
8333:com.anonymous.alpharium/u0a569 (adj 0): permissions revoked` — **Android
프레임워크가 대상 앱 프로세스를 즉시 강제 종료**했다(권한 캐시 무효화의
의도된 동작). 진행 중이던 헤드리스 태스크는 `loadPrompt` 직후 중단됐고,
`files/locks/`에 잠금 파일이 남지 않았다(취득 전 종료, 원칙 I 방어 정상).

→ **`adb pm revoke`로는 "실행 정확히 그 순간의 회수"를 재현할 수 없다.**
대신 **권한이 회수된 상태 그대로 헤드리스 태스크를 강제 실행**해, `collectDaySignals`가
권한 없이 신호를 수집하는 경로를 관측했다(이것이 US3의 실질 — 신호 계층이
권한 부재를 `unknown`으로 감싸는가).

| axis | 방법 | 저장된 signalsUsed | 본문 단정 | 판정 | 파일 | 완주 |
|---|---|---|---|---|---|---|
| photos | 사진 권한 3개 회수 후 헤드리스 실행(08-28, 시드 8장) | `photos.kind === "unknown"`, `reason: "사진 접근 권한이 없다"` — **`none` 아님** | 없음 ("아마 주인은 바깥을 산책했을 것이다", "'모른다'로 가득하다") | 4갈래 통과 | `2026-08-28.json` 저장(1747 bytes) | `writingMs` 158.5초, `Task successfully finished` |
| places | 위 실행에서 함께 관측(사진 못 봐서 좌표 못 물음) | `places.kind === "unknown"`, `reason: "사진을 보지 못해 좌표를 물을 수 없다"` | 지명 없음 | — | — | — |
| location(단독) | _(미측정 — 021 T030에서 위치만 회수 시 `placeName={"kind":"unknown"}`·사진 신호 생존 이미 확인)_ | | | | | |

**로그 확인**: `loadPrompt:580 … num_prompt_tokens=572, has_media=0` — 사진
권한이 없어 VLM 캡션이 **아예 안 돌았고**(`has_media=0`), quiet가 사진 없는
프롬프트로 일기를 썼다. 저장 `signalsUsed`의 5축이 전부 `known`이 아니라
`unknown`/`none` 중 하나이나 **사진은 `unknown`**(권한 없음)이지 `none`(사진
0장)이 아니다 — SR1의 핵심 구분이 실기기에서 성립.

**기대 대비** (SC-005): `storedSignalKind: "unknown"` ✓, `bodyHasAssertion:
false` ✓, `fileUntouched`(거부 경로) — 이번엔 판정을 통과해 저장됐으므로
거부 경로는 미관측(§1의 quiet도 통과, narrative만 mojibake로 §10).

**`collect.ts` 보강 여부** (T020): **무변경 확정** — 004 설계상 사진 권한이
`granted`가 아닌 상태에서 `photos.kind === "unknown"`이 실기기에서 나왔다.
계약 테스트 SR1~SR6이 이 방어를 이미 잠갔고(§5), 실기기가 그 결론을 확인했다.

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

## §7 회귀 (quickstart.md §6) — 완료 (2026-08-30 2차 세션)

`JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8" MSYS_NO_PATHCONV=1 maestro --device
R3CTB084WDP test <flow>`로 개별 실행(dev Metro, SM-S901N).

- [x] **`.maestro/scheduled-diary-notification.yml`(020) — PASS** (EXIT 0).
  설정 탭 "자동으로 일기 쓰기" 섹션, "무렵"·"배터리 설정" 문구, 정밀도
  암시 문구("정각"·"매일 7시") 부재, 모델 내부명("kanana"·"exaone"·"gguf")
  부재 전부 통과. 마지막 "지금 자동 생성" 블록은 SKIPPED(조건부, 020은
  설정 탭 검증이 핵심이라 정상).
- [x] **`.maestro/unified-permission-onboarding.yml`(021) — PASS** (EXIT 0).
  `onboarding-screen`·`onboarding-step-.*` 표시, 모델 어휘 부재,
  skip-all 루프 → `onboarding-start` → 온보딩 종료 → 재실행 시 온보딩
  미재노출. **⚠️ 이 흐름은 `Launch app … with clear state`(=`pm clear`)로
  앱 데이터를 전부 날린다** — 021 AGENTS 절에 기록된 대로. 2차 세션의
  검증용 상태(모델 `a1`·`a2`·`v1`·`v2`, 일기 4개, `preferences/*`)가 이때
  삭제됐다. §7을 §3·§4보다 **먼저** 돌렸어야 했다(교훈).
- [x] **`.maestro/photo-selection-over-limit.yml`(023) — PASS** (EXIT 0).
  캐릭터 선택(금동이) → `vision-quick` → 과거 하루(`day-${SEED_DAY}`) →
  "일기 쓰기" → 진단 어휘("%"·"토큰"·"초 남"·"단계"·"쓰고 있다") 부재,
  판정 갈래명("되뱉"·"echo"·"unfinished"·"rejected") 부재 통과.
  ※ `clearState` 후라 seed 하루가 없어 생성 자체는 안 돌았으나 흐름의
  assertion(진단 어휘 미노출)은 검증됨.

**결론**: 020·021·023 회귀 없음. 3흐름 전부 PASS. 020·022·023이 반복
관측한 "개발자 탭 stale 버그"류 신규 실패 없음.

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

### ★ 실기기 재확인 — 완료 (2026-08-30 2차 세션, SM-S901N, debug, clean Metro)

지난 세션의 "잡이 `dumpsys jobscheduler`에 안 나타난다"는 별개 현상의
**원인 규명**: `backgroundPort.register()`는 `App.tsx`의 `AutoDiarySettingsScreen`
컴포넌트 마운트 시에만 호출된다(`App.tsx:925-927`). **설정 탭을 열지 않으면
WorkManager 잡이 예약되지 않는다.** 1차 세션에서 `#reg=0`이었던 이유가 이것.
설정 탭 진입 즉시 `JOB #u0a569/<id> com.anonymous.alpharium/androidx.work.impl.background.systemjob.SystemJobService`가
등록되고 `Minimum latency: +14m59s987ms`(15분 최소 간격)가 정확히 전달됐다.

**2단계 재확인:**

1. **헤드리스 등록이 성립한다** — 화면 꺼진 잠긴 상태(`deviceLocked=1`)에서
   `cmd jobscheduler run -f com.anonymous.alpharium <id>`:
   ```
   D/BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'
   I/TaskService: Started headless task N to keep JS timers alive for 'com.anonymous.alpharium'
   I/TaskService: Registered task with name 'alpharium-auto-diary' …
   D/BackgroundTaskConsumer: didRegister: alpharium-auto-diary
   ```
   **`No task registered for key expo-task-manager` 에러 소멸**, `Unregistering
   task` 없음. 지난 세션 CRITICAL 버그 증상이 사라졌다. `runAutoDiaryTask()`
   본체가 실제 실행됨(RNLlama HTP 라이브러리 추출 → 모델 로드 →
   `loadPrompt:580` 프롬프트 처리까지 진입).

2. **헤드리스 생성이 완주한다 — 단, 배터리 예외가 필요하다.**
   - **배터리 예외 없음**(standby bucket 기본): `loadPrompt:580` 직후 토큰
     생성 단계에서 **정지**. 5분+ 경과 후에도 RNLlama 로그 없음, `Task
     successfully finished` 미출력, 일기 파일 미생성. 앱 프로세스는 살아
     있으나(모델 로드된 채) 추론이 진행 안 됨. `W/adbd: timeout expired
     while flushing socket` 이후 pid 로그 완전 정지 → **삼성 절전이
     백그라운드 프로세스의 네이티브 CPU 사용(llama 추론)을 억제**. 019
     findings §2의 "예외 없이는 억제"를 **백그라운드 생성 경로에서
     재확인**.
   - **배터리 예외 부여**(`dumpsys deviceidle whitelist +com.anonymous.alpharium`
     → standby bucket `5` EXEMPTED): 같은 헤드리스 강제 실행이 **완주**.
     `2026-08-30.json` 저장(quiet, `writingMs` 52521ms = 52.5초, 판정 4갈래
     통과, `DAY_STILL_OPEN` 문구 정상, `signalsUsed.photos.kind = "none"`),
     완료 알림 발송(`NotificationManager: notify(0, …)`), `TaskService:
     Finished task 'alpharium-auto-diary'` → `Task successfully finished` →
     `WM-WorkerWrapper: Worker result SUCCESS`. 화면 꺼짐 + 잠김 상태 유지.

**결론**: §9 CRITICAL 수정(`task.ts` 모듈 최상단 `defineTask` 부수 효과)이
**헤드리스 태스크 등록을 실제로 성립시킨다** — 지난 세션의 미검증 항목 해소.
다만 **삼성 One UI에서 헤드리스 llama 추론이 완주하려면 배터리 최적화
예외가 사실상 필수**다(019의 조건부 결론 "YES, 조건부"가 생성 경로에서도
그대로). 예외 없이는 태스크가 진입은 하나 토큰 생성에서 억제돼 미완주 →
`STALE_LOCK_MS` 만료 후 다음 콜백이 재시도(FR-013 자가 치유 경로)에
의존하게 된다.

**부수 관측 — 헤드리스 생성이 포그라운드보다 느리다**: §4의 권한 회수
라운드에서 `quiet` 콜드 헤드리스 생성 `writingMs` = **158504ms(158.5초)**.
§1의 포그라운드 `quiet` 콜드 54초의 **약 3배**. 배터리 예외가 있어도
헤드리스 CPU 스케줄링 우선순위가 낮아 느려지는 것으로 보인다. `narrative`
사진 있는 날은 §1 포그라운드에서 이미 `writingMs` 89.8초 + `visionMs`
73초였으므로, 헤드리스에서는 `GENERATION_TIMEOUT_MS`(180초, `writingMs`
구간만 감시)에 걸릴 위험이 실재한다 — **`narrative` 헤드리스 완주는 이
세션에서도 미확인**(quiet만 완주 확인). §1의 FR-014 결론("상한 8에서
narrative는 완주하나 느리고 여유가 좁다")에 "헤드리스에서는 더 좁다"를
추가한다.

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

**2차 세션(2026-08-30)에서 해소된 것**: §9 헤드리스 수정 재확인(완료),
§3 재부팅 복구(완료), §4 권한 회수 실기기 재현(완료), §7 Maestro 회귀(완료).

**남은 것:**

- **§2 배터리 예외/무예외 소크** — 사용자 결정으로 건너뜀. 자연 15분+
  주기 대기(예외: 목표 시각 후 1시간 안 1회 / 무예외: 24시간 안 1회)가
  필요하고 시간이 오래 걸린다. `cmd jobscheduler run -f`는 삼성 절전이
  앱 도즈 시 거부하므로 자연 주기 대기만 유효.
- **`narrative` 헤드리스 완주** — 2차 세션도 `quiet`만 헤드리스 완주
  확인. `narrative` 사진 있는 날(포그라운드 `writingMs` 89.8초 +
  `visionMs` 73초)이 헤드리스에서 `GENERATION_TIMEOUT_MS` 180초 안에
  완주하는지 미확인. 헤드리스가 포그라운드의 ~3배로 느려지는 관측(§9
  부수)을 고려하면 위험이 실재.
- **`enabled:false` 재부팅 대조군**(US4 Scenario 3) — 2차 세션이
  `unified-permission-onboarding.yml`의 `clearState`로 앱 데이터를 날려
  수행 못 함. `didRegister`가 `enabled` 무관하게 잡을 등록하나
  `decideSchedule`이 `disabled` 반환하는 것으로 코드상 예상되나 미실측.
- **배터리 인텐트가 도착한 삼성 One UI 설정 화면 경로** — 미기록(설정
  탭 "배터리 설정 열기" 버튼의 실제 도착지).
- **release 빌드 재확인** — 024는 새 네이티브 모듈이 없으나 `task.ts`가
  `require("expo-task-manager")`를 모듈 최상단 동기 호출로 바꿨다.
  debug에서 헤드리스 등록·완주를 확인했으나 R8·ProGuard가 `require`
  경로를 어떻게 다루는지는 미확인(012 기준으로는 "빌드 설정 경계"에
  해당할 수 있음 — 판단 필요).
- **검증용 모델 재배치** — 2차 세션 `clearState`로 `files/models/`의
  `a1`·`a2`·`v1`·`v2`·`state.json`이 삭제됐다. 다음 실기기 세션 전
  개발 기계에서 재다운로드 + `run-as` 배치 필요(021 D2 방식).
- **EXAONE mojibake** (§10) — 별도 스펙.
