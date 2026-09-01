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
> - **§2 배터리 예외/무예외 소크 — 스펙 027로 이관**(SC-003·SC-004 판정을
>   027 US1·US2가 맡는다). 자연 15분+ 주기·24h 비동기 대기 필요.
> - **§2 삼성 One UI 배터리 화면 경로 + §11 release 헤드리스 확인 — 027에서
>   완료**(2026-09-01). 배터리 인텐트 = `IGNORE_BATTERY_OPTIMIZATION_SETTINGS`
>   → 삼성 "배터리 사용 관리"(4탭 경로). release APK 빌드·설치 후 헤드리스
>   강제 실행에서 `No task registered` 부재 + `Worker result SUCCESS` →
>   §9 수정이 release에서도 성립, R8 트리셰이킹 잔여 위험 닫힘. §2·§11 절
>   갱신됨.
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

> **이 절의 잔여 실측은 스펙 027로 이관됐다** — `specs/027-024-residual-verification/`.
> 아래 표·판정은 027 `findings.md`가 1차 기록이며, 여기는 진행 상태만 남긴다
> (FR-011 — 중복 금지).

**측정 방법**: quickstart.md §2(예외)·§3(무예외 24h). `dumpsys deviceidle
whitelist` +/−, `am get-standby-bucket`, `dumpsys jobscheduler`의 `Minimum
latency`, `adb logcat`의 `task-entered`.

| batteryException | targetHour | roundStartedAt | triggerEnteredAt[] | delayFromTargetMin[] | standbyBucket | minLatencyReported | screenTouchedDuringRound | notes |
|---|---|---|---|---|---|---|---|---|
| _(027 US1 대기 — 15분+ 주기 소크)_ true | | | | | | | | |
| _(027 US2 대기 — 24h 비동기 소크)_ false | | | | | | | false | 24h 소크 |

**MUST 판정**:
- [ ] SC-003 (예외): 목표 시각으로부터 첫 시도 ≤ 60분 — **027 US1 대기**
- [ ] SC-002·SC-004 (무예외): 목표 시각 후 24시간 안 ≥ 1회 시도 — **027 US2 대기**

**SHOULD**: 예외 시 3회 이상 표본의 과반 ≤ 40분 — _(027 US1, 표본 부족 시
원시값만)_

**배터리 인텐트가 실제 도착한 삼성 One UI 설정 화면 경로** (021 T030 관행):
✅ **확인됨 (2026-09-01, 027 US3, SM-S901N / Android 16 / 삼성 One UI)** —
설정 탭 "배터리 설정 열기" 버튼 → `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`
인텐트 → 삼성이 **`com.android.settings/.Settings$AppBatteryUsageActivity`
("배터리 사용 관리" 앱 목록)** 으로 라우팅. 표준 안드로이드의 "배터리
최적화" 목록이 아니다. 여기서 예외를 부여하려면 목록에서 앱 검색·탭 →
"배터리" 상세(제한 없음/최적화/제한 라디오) → **"제한 없음" 선택**까지
**총 4탭**. 딥링크로 앱별 예외 토글 화면에 바로 도달하지 않는다. "제한
없음" 선택 시 `am get-standby-bucket`이 **`10` → `5`**로 바뀌고
`dumpsys deviceidle whitelist`에 등재된다 — `adb shell dumpsys deviceidle
whitelist +`(024가 재현에 쓴 것)와 최종 결과가 동일함이 실측으로 확인됐다.
상세: 027 `findings.md` §3.

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
| **false** | **after-reboot-app-opened** (홈 화면 + 설정 탭) | **false** | T035(2026-08-30 3차 세션). `auto-diary.json`=`enabled:false`로 재부팅 → 앱 열고 설정 탭까지 진입해도 `JOB #u0a569 …/androidx.work…SystemJobService` 미등록. `TaskService: Registered task`·`didRegister` 로그도 안 나옴(WorkManager 초기화 로그 `WM-WrkMgrInitializer`만) |

**메커니즘 확정** (SC-006): 재부팅 후 자동 생성 예약이 살아나는 조건은
**`enabled:true` + 이전에 잡이 예약돼 있었을 것**이다. `enabled:true` 재부팅
후 앱을 홈 화면으로 여니 `21:21:00.108 I/TaskService: Registered task` →
`didRegister: alpharium-auto-diary` → `BackgroundTaskScheduler: Worker is
already scheduled, skipping`이 나왔다 — **잡이 이미 스케줄돼 있었고**(재부팅
전 `JOB #u0a569/78`), WorkManager가 재부팅을 넘겨 그것을 유지한 것으로
보인다(WorkManager는 재부팅 시 `RescheduleReceiver`로 예약된 잡을 자체
복원한다). `enabled:false` 대조군(T035)에서는 **재부팅 전 잡이 없었고**
(이전에 `enabled:false`였음), 앱을 열어도 `didRegister`/`Registered task`
로그가 안 나왔다 — `App.tsx:925-927`의 `backgroundPort.register()`는
`settings.enabled === true`일 때만 도므로 잡이 만들어지지 않는다.

**020 clarify 답 갱신**: spec.md Clarifications의 "020이 배선한 앱 마운트 시
`register()` 경로가 재부팅 복구를 겸한다"는 **맞다** — 그 경로(`App.tsx:925-927`,
설정 탭 마운트 시 `enabled:true`면 `register()`)가 재부팅 후 잡을 (재)등록하는
공식 트리거다. `enabled:true` 세션에서 홈 화면만으로도 잡이 살아 있던 것은
그 경로가 아니라 **WorkManager의 재부팅 자체 복원** + 지난 세션에 설정 탭을
방문해 이미 예약해 둔 잡 덕분이다. `§9 수정`의 `task.ts` 최상단 `defineTask`는
**핸들러 등록**(헤드리스 실행이 태스크를 찾을 수 있게)에 필수이나, **잡
스케줄링 자체**는 `enabled:true` + `register()` 경로가 담당한다. 두 역할을
분리해 이해해야 한다.

**⚠️ 미확인 잔여** (§3 재검증): `enabled:true`이나 **재부팅 전 잡이 없는**
상태(예: 방금 `enabled:true`로 켜고 설정 탭을 안 연 채 재부팅)에서 앱을 홈
화면으로만 열었을 때 잡이 (재)등록되는지 — 이 세션에서는 `enabled:true`
재부팅 케이스가 "잡이 이미 있던" 조건이라 이 갈래는 미분리. `App.tsx:925-927`이
설정 탭 마운트에 있으므로 **홈 화면만 열면 등록 안 될 가능성**이 있다(그러면
FR-009의 "앱을 한 번 연 시점" 재등록이 설정 탭 방문을 전제하게 됨). 다음
세션에서 `enabled:true` + `pm clear` 후 설정 탭 미방문 → 재부팅 → 홈 화면만
열기로 분리 확인 필요.

**★ 3차 세션 추가 관측 — `expo-task-manager`가 자체 `BOOT_COMPLETED` 리시버를
갖는다**: T034 준비 중 `enabled:true`로 앱을 재시작하니 logcat에:
```
21:58:57.635 I/TaskService: Handling intent with action 'android.intent.action.BOOT_COMPLETED'.
21:59:07.336 I/TaskService: Registered task with name 'alpharium-auto-diary' …
21:59:07.336 D/BackgroundTaskConsumer: didRegister: alpharium-auto-diary
21:59:07.342 D/BackgroundTaskScheduler: Enqueuing worker with identifier EXPO_BACKGROUND_WORKER and '15' minutes delay.
```
→ `expo-task-manager`는 `AndroidManifest`에 **`BOOT_COMPLETED` 리시버를
자동 등록**하고, 재부팅 후 앱 프로세스가 처음 뜰 때 이 인텐트를 처리해
`defineTask`로 등록된(= §9 수정의 모듈 최상단 부수 효과가 등록한) 태스크를
`didRegister` → `scheduleWorker()`로 **재예약**한다. `Enqueuing worker …
15 minutes delay`로 `JOB #u0a569/0`이 새로 생겼다(이전 잡 없이).

**FR-010 한계 문서의 정정**: "재부팅 후 앱을 한 번도 열지 않으면 재등록
안 됨"은 맞지만(앱 프로세스가 떠야 `BOOT_COMPLETED` 인텐트가 처리됨), **앱을
열기만 하면 홈 화면이든 설정 탭이든 상관없이** `expo-task-manager`의
`BOOT_COMPLETED` 처리로 재예약된다 — `App.tsx:925-927`의 `backgroundPort.register()`
(설정 탭 전용)에 의존하지 않는다. 이로써 위 "⚠️ 미확인 잔여"의 우려("홈
화면만 열면 등록 안 될 가능성")는 **해소**된다: `enabled:true`면 앱을 여는
것만으로 재등록된다. 단 이 경로는 `expo-task-manager`가 태스크를 이미
알고 있어야(= `defineTask` 등록) 동작하므로, §9 CRITICAL 수정(모듈 최상단
`defineTask`)이 이 재부팅 복구의 **전제**다.

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
narrative는 완주하나 느리고 여유가 좁다")에 아래 T034를 추가한다.

### ★★ T034 — `narrative` 헤드리스 생성은 이 기기에서 완주하지 않는다 (2026-08-30 3차 세션)

**목적** (FR-001·SC-001·US1/AC2): 배터리 예외 부여 상태에서 `narrative`
(exaone `a2.bin`)를 화면 꺼진 잠긴 헤드리스로 완주시키고 `writingMs` 실측.

**설정**: `enabled:true`·`targetHour:21`(현재 21:56, 창 안), 캐릭터
`narrative`, `deviceidle whitelist +`(standby bucket `5` EXEMPTED), 화면
끔·`deviceLocked=1`, `cmd jobscheduler run -f com.anonymous.alpharium 0`.
모델 4개(`a1`·`a2`·`v1`·`v2`) + `state.json` verdict를 개발 기계에서
재배치(T037, 021 D2 방식).

**관측 — 26분+ CPU 292% 점유, 산출물 없음**:
- `21:59:37` `Executing task 'alpharium-auto-diary'` → `Started headless
  task 1` → RNLlama HTP 추출 → `a2` 모델 로드(`loadModel:473`→`:530`,
  ~18초) → `loadPrompt:580 num_prompt_tokens=547, has_media=0`(`21:59:57`).
- **그 이후 RNLlama 로그가 완전 정지**. `top` 확인: 앱 프로세스(pid
  13378)가 **CPU 292%**(4 스레드 풀가동), `TIME+`가 6분 만에 `21:47`→
  `25:58`로 누적 — 추론이 멈춘 게 아니라 극도로 느리게 돌거나 루프.
- WorkManager 잡은 `jobFinished`로 이미 종료(`0 running bg jobs`)됐으나
  `runAutoDiaryTask()`의 `pipeline.run()` → `engine.run()` Promise가
  미해결, `BackgroundTaskScheduler.runTasks()`의 `awaitAll()`도 안 끝남.
- `diary-generation.lock` 파일이 남음(`{"owner":"background",
  "acquiredAtMs":1788094777344}` = 태스크 진입 시각) — `finally { release() }`에
  도달 못 함. 다음 콜백은 `STALE_LOCK_MS`(6분) 후 stale 판정으로 회복
  가능(설계상 정상).
- 화면을 `KEYCODE_WAKEUP` + `svc power stayon true`로 강제로 켜 Doze를
  풀어도(`mWakefulness=Awake`, `deviceidle mState=ACTIVE`) 추론이 완주하지
  않음 — Doze/절전만의 문제가 아니다.
- `has_media=0`: `many-camera 2026-08-29` 시드가 실제로는 08-29 날짜를
  안 심었다(미디어스토어 `datetaken`이 08-21~08-28에만 분포). `decideSchedule`이
  사진 없는 날을 골라 VLM 캡션은 아예 안 돎 — 그런데도 `narrative`
  텍스트 생성만으로 완주 불가. 사진 있는 날이면 `visionMs`까지 더해져
  더 나쁠 것.

**§1 포그라운드와의 대조**: §1에서 `narrative` `writingMs`는 콜드 54초·
사진 있는 날 89.8초로 완주했다(개발자 탭 "지금 트리거" = 포그라운드
직접 호출). **같은 `engine.run()` 코드가 헤드리스에서는 완주하지 않는다** —
스케줄링만 다르다는 §1의 가정이 `narrative`에서는 성립하지 않는다.

**FR-014에 대한 답 (갱신)**:
- `GENERATION_TIMEOUT_MS`(180초)는 `engine.run()`을 `setTimeout` 기반
  `runWithTimeout()`으로 감시하는데, 헤드리스/Doze에서는 JS 타이머가
  억제돼 이 timeout 자체가 제때 발동하지 않는다 — `result: "timeout"`이
  나오지 않고 그냥 무한 대기. 023이 세운 180초 가드가 헤드리스 경로에서는
  무력함을 뜻한다.
- `VISION_PHOTO_LIMIT`·180초 한도는 바꾸지 않는다(FR-014 MUST NOT).
- **결론**: `narrative`(exaone)는 이 기기(SM-S901N)의 헤드리스 자동
  생성에서 사실상 쓸 수 없다. `quiet`(kanana)만 헤드리스 완주가 확인됐다
  (§9, `writingMs` 52.5초). 이는 §10의 EXAONE mojibake와 무관하지 않을
  수 있다 — exaone GGUF/`llama.rn` 조합이 이 기기에서 근본적으로 문제.
  로스터에서 `narrative`를 자동 생성 대상으로 둘지, exaone GGUF를
  교체할지는 별도 스펙의 결정(§10과 함께).

**미확인으로 남음**: `narrative` 헤드리스가 "느리지만 언젠가 완주"하는지
vs "영영 안 끝나는 루프"인지 — 26분에서 관측을 중단했다. 포그라운드
`writingMs` 90초의 3배(헤드리스 배율)면 ~270초여야 하는데 26분(1560초)째
미완주이므로 정상 저속이 아닌 병리적 상태로 판단한다.

---

## §11 T036 — release 빌드 재확인 판단 (2026-08-30 3차 세션)

**배경**: §9 수정이 `src/schedule/task.ts`에 `require("expo-task-manager")`·
`require("expo-background-task")`를 **모듈 최상단 동기 호출**로 추가했다.
012 기준("새 네이티브 모듈이나 빌드 설정 — 동적 `import`, R8·ProGuard 대상,
JNI 심볼 — 을 건드릴 때만 release 재확인")에 이 변경이 해당하는지 판단.

**분석**:
- 이 `require`는 **Metro의 `require`**(번들 시점에 정적 문자열 리터럴을
  모듈 참조로 해석)이지 Node CommonJS `require`가 아니다. **동적 `import()`가
  아니라 정적 require**라 R8이 "코드 경로를 못 찾는" 동적 로딩 문제에
  해당하지 않는다.
- `expo-task-manager`·`expo-background-task`는 **표준 Expo autolinking
  모듈**(005·011처럼 손으로 짠 JNI 브릿지가 아님). 013이 `expo-image-manipulator`를
  "표준 Expo autolinking이라 debug 1회로 충분"이라고 판단한 것과 같은 계열.
  Expo autolinking이 각 모듈의 consumer ProGuard rules를 자동 반영한다.
- `android/app/proguard-rules.pro`에 `expo` 관련 커스텀 rule이 없고,
  이 변경으로 추가할 필요도 없다(autolinking이 처리).
- **새 JNI 심볼·새 네이티브 모듈·빌드 설정 변경 0** — `task.ts`의
  `defineTask` 호출 위치를 `useEffect` → 모듈 최상단으로 옮기고 `require`로
  감쌌을 뿐, `llama.rn`·동적 `import`·gradle 설정은 무변경.

**판단**: **012 기준의 "release 재확인 필요" 경계에 해당하지 않는다.**
§9의 debug 헤드리스 확인(등록 성립 + `quiet` 완주)으로 충분하다.

**남긴 잔여 위험(작음)**: R8이 `AUTO_DIARY_TASK_REGISTERED = registerAutoDiaryTask()`
모듈 최상단 실행문을 "결과를 안 쓰는 부수 효과"로 보고 제거할 이론적
가능성. 다만 (a) `ensureAutoDiaryTaskDefined()`가 `AUTO_DIARY_TASK_REGISTERED`를
읽어 export하므로 상수가 살아 있어야 하고, (b) `registerAutoDiaryTask()`
안에 `TaskManager.defineTask(...)` 부수 효과가 있어 R8의 side-effect 분석이
보수적으로 유지할 것이다. **release APK를 손에 넣는 다음 세션에서 설정 탭
진입 → 화면 끈 헤드리스 강제 실행으로 `No task registered` 부재를 한 번
확인하면 이 위험도 닫힌다** — 그때까지는 debug 확인을 근거로 진행.

### ★ 잔여 위험 닫힘 (2026-09-01, 스펙 027 US4, SM-S901N)

release APK를 실제로 빌드해 확인 완료:

- **빌드**: `prebuild --platform android --clean` → 키 복원 →
  `NODE_ENV=production ./gradlew assembleRelease`. BUILD SUCCESSFUL
  **19m 8s**, `app-release.apk` 175,579,857 bytes, `apksigner verify`
  `Signer #1 certificate DN: CN=alpharium`. **`android.enableMinifyInReleaseBuilds`
  미설정 → minify/R8 OFF** — 024 §11이 우려한 "R8 트리셰이킹"은 **현재
  빌드 구성에서는 애초에 일어나지 않는다**(로드맵 4번이 minify를 켤 때의
  잠재 위험으로 남는다).
- **설치·실행**: debug 앱 uninstall(데이터는 `adb exec-out`으로 백업) →
  release 설치 → `adb reverse --remove-all` 후 실행, `Unable to load
  script` 없음, `prod` 환경으로 뜸(탭 3개, 개발자 탭 없음).
- **헤드리스 등록·실행**: 설정 탭 `auto-diary-toggle` ON + 알림 권한 허용 →
  `D/BackgroundTaskModule: registerTaskAsync` → `I/TaskService: Registered
  task with name 'alpharium-auto-diary'` → `didRegister` → `Enqueuing
  worker ... '15' minutes delay`. `JOB #u0a570/0 .../SystemJobService`,
  `Minimum latency: +14m59s992ms`.
- **강제 실행**: `deviceidle whitelist +`(standby bucket `5`) + 화면 끔
  (`deviceLocked=1`) + `cmd jobscheduler run -f com.anonymous.alpharium 0`
  → logcat에 **`No task registered for key expo-task-manager` 및
  `Unregistering task` 둘 다 부재**, `Executing task 'alpharium-auto-diary'`
  → `Started headless task 1` → `Finished headless task 1` →
  `WM-WorkerWrapper: Worker result SUCCESS`.
- **결론**: **§9 수정(`task.ts` 모듈 최상단 `defineTask` 부수 효과)이
  release 빌드(Hermes 바이트코드, minify OFF)에서도 헤드리스 태스크
  등록을 성립시킨다.** DCE/트리셰이킹이 이 부수 효과를 제거하지 않음이
  실측으로 확인됐다(`dceTrimReproduced = false`). 코드 변경 0줄. `quiet`
  생성 완주는 §9의 debug 확인(`writingMs` 52.5초)으로 갈음 — 모델이
  uninstall로 삭제됐고 release는 `run-as` 불가라 재배치하지 않았으나,
  release도 동일 파이프라인이므로 모델만 있으면 돈다. 상세: 027
  `findings.md` §4.

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

**2차 세션(2026-08-30)에서 해소**: §9 헤드리스 수정 재확인, §3 재부팅
복구, §4 권한 회수 실기기 재현, §7 Maestro 회귀.

**3차 세션(2026-08-30, `/speckit-implement` Phase 8)에서 해소·판정**:
- **T037 검증용 모델 재배치** — 완료. `a1`·`a2`·`v1`·`v2`를 개발 기계에서
  다시 받아(크기·`a1`/`v1` md5 로스터와 일치) `run-as`로 `files/models/`에
  배치 + `state.json` verdict 4개 수동 작성.
- **T035 `enabled:false` 재부팅 대조군** — 완료. `enabled:false`로 재부팅
  → 앱 열고 설정 탭까지 진입해도 `JOB #u0a569` 미등록, `didRegister`/
  `Registered task` 로그도 안 나옴. **US4 Scenario 3 = SC-006 충족**
  (꺼진 상태를 재부팅이 되살리지 않는다). findings §3 표.
- **§3 재부팅 복구 메커니즘 정정** — `expo-task-manager`가 자체
  `BOOT_COMPLETED` 리시버를 가지며, `enabled:true`면 재부팅 후 앱을
  (홈 화면이든 설정 탭이든) 한 번 열기만 하면 그 리시버가 `defineTask`
  등록 태스크를 `scheduleWorker()`로 재예약한다. §9 수정(모듈 최상단
  `defineTask`)이 이 복구의 전제. findings §3.
- **T034 `narrative` 헤드리스 완주** — 판정 완료: **완주하지 않는다.**
  배터리 예외 부여·화면 켜기까지 해도 `a2`(exaone) 로드 후 `loadPrompt`
  단계에서 CPU 292%를 26분+ 태우며 산출물 없음. `GENERATION_TIMEOUT_MS`
  180초 가드는 헤드리스/Doze에서 JS 타이머 억제로 무력. **`narrative`는
  이 기기 헤드리스 자동 생성에서 사실상 불가** — `quiet`만 완주(§9).
  findings §9의 T034 절.
- **T036 release 빌드 재확인** — 판정 완료: **debug 1회로 충분**(012
  기준). `require("expo-task-manager")`는 Metro의 정적 require이고
  표준 Expo autolinking 모듈이라 빌드 설정 경계에 해당 안 됨. 작은
  잔여 위험(R8 side-effect 트리셰이킹)은 다음 release 세션에서 1회
  확인 시 닫힘. findings §11.

**남은 것:**

- **T012·T013·T014 / T032·T033 — §2 배터리 예외/무예외 소크** — **스펙
  027로 이관.** 예외 소크(SC-003)는 027 US1, 무예외 24h 소크(SC-004)는
  027 US2. 자연 15분+ 주기·24h 비동기 대기가 필요해 별도 실기기 세션에서
  수행한다. **SC-003·SC-004는 027이 판정한다.**
- ~~**배터리 인텐트가 도착한 삼성 One UI 설정 화면 경로** — 미기록~~ →
  ✅ **027 US3에서 확인 완료** (2026-09-01). `IGNORE_BATTERY_OPTIMIZATION_SETTINGS`
  → 삼성 "배터리 사용 관리"(`AppBatteryUsageActivity`) → alpharium 4탭 →
  "제한 없음" → standby bucket `10`→`5`. §2 절 갱신됨.
- ~~**release APK로 §9 헤드리스 1회 확인** — §11의 잔여 위험(R8 트리셰이킹)~~ →
  ✅ **027 US4에서 확인 완료** (2026-09-01). release APK(minify OFF,
  `CN=alpharium`) 빌드·설치, 헤드리스 강제 실행에서 `No task registered`
  부재 + `Worker result SUCCESS`. §9 수정이 release에서도 성립. §11 절
  갱신됨(잔여 위험 닫힘).
- **`narrative` 헤드리스가 "느린 완주"인지 "무한 루프"인지** — 26분에서
  관측 중단. 실용상 무의미(어느 쪽이든 자동 생성 불가)하나 §10 mojibake
  원인 규명에는 관계될 수 있다. **로드맵 14번.**
- **EXAONE mojibake** (§10) — 별도 스펙. T034가 "narrative 헤드리스
  완주 불가"까지 밝혔으므로 별도 스펙의 우선순위가 올라간다. **로드맵 14번.**
