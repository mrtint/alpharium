# Quickstart: 백그라운드 안정성 및 예외 대응 검증

**대상 스펙**: [spec.md](./spec.md) · [plan.md](./plan.md)

이 스펙은 검증·보강 성격이라 quickstart가 곧 핵심 산출물이다. 실기기
4라운드 + 회귀 + 기기 없는 게이트. 실측값은 전부 `findings.md`에 옮겨
적는다(data-model.md의 표 구조).

## 공통 전제 (AGENTS.md "도구 사용법")

- **Metro가 dev 환경으로**: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`
  (env는 셸에서 직접). gradle 빌드가 끝난 뒤 Metro를 띄운다.
- **기기 잠금 해제·화면 켜짐**: `adb shell dumpsys trust`의 `deviceLocked=0`.
- **`adb reverse tcp:8081 tcp:8081`**: USB·무선 관계없이 필요. 재부팅으로
  사라지므로 §5 후 다시 건다.
- **한글 검증 문구**: `-Dfile.encoding=UTF-8`(`run-device-tests.mjs`가 이미
  넣음). `adb logcat` 한글은 CP949로 뭉개지므로 UTF-8로 직접 읽는다.
- **기기 둘 붙으면 `-s <시리얼>`**. `adb pull` 목적지는 `C:/…` 꼴.
- **무선 디버깅**: `adb connect <IP>:<PORT>`. §5 재부팅 후 재연결.
- **패키지명**: `com.anonymous.alpharium`.
- **합성 하루**(010): `npm run seed:day -- <모양> <날짜>` / `seed:list` /
  `seed:clear`. "경로가 도는가"만 확인, 품질 결론 금지.

---

## §1 `narrative` 백그라운드 완주 (US1, SC-001·SC-002, contracts/stale-lock-basis.md)

**목표**: 오드(narrative)로 사진 있는 날·없는 날, cold/warm 백그라운드 완주
시간을 재고 최종 일기 1개·판정 통과를 확인한다. cold `wallClockMs` 최댓값
`M`이 `STALE_LOCK_MS` 규칙(SL4)의 입력.

### 절차

1. 개발자 탭 → 캐릭터 선택 → **오드(narrative)** 선택
   (`preferences/selection.json`에 반영 — `adb shell run-as
   com.anonymous.alpharium cat files/preferences/selection.json`로 확인).
2. 합성 하루 심기: `npm run seed:day -- rich 2026-08-27`(사진 3장)와
   빈 하루 하나(사진 없음). 시각 설정에서 사진 없는 하루도 준비.
3. 자동 생성 설정(설정 탭)에서 자동 생성 ON, 목표 시각을 현재 시로.
4. **cold 라운드**: 앱을 `adb shell am force-stop com.anonymous.alpharium`
   후 재실행 → 개발자 탭 → "지금 자동 생성 트리거" → 즉시
   `adb shell input keyevent KEYCODE_POWER`로 화면 끄고 잠금 확인.
5. `adb logcat -v time | grep -E "pipeline-stage|task-|Success|Failed"`로
   진입 시각·단계·완주(또는 failed) 시각을 읽는다. 벽시계 차이 =
   `wallClockMs`. `engine.run()` 구간 로그가 있으면 `engineRunMs`, 없으면
   `n/a`(research.md §1 폴백 — `wallClockMs`만으로 `STALE_LOCK_MS` 규칙
   적용 가능).
6. 저장된 일기 확인: `adb shell run-as com.anonymous.alpharium ls
   files/diary/` → 그 날짜 파일 1개, 열어서 판정 통과(본문 정상)·`signalsUsed`.
7. **warm 라운드**: force-stop 없이 연속 2번째 트리거. 4~6 반복.
8. 사진 있는 날 / 없는 날 각각 4~7 수행.

### 기대 결과

- 6회(가정: photos×{cold,warm} + empty×{cold,warm} + 여유 2회) 전부
  `result: "success"`, `finalDiaryCount: 1`, `verdictPassed: true`(SC-001).
- `findings.md` §1 표에 각 행 기록. cold `wallClockMs` 최댓값을 `M`으로.
- **게이트(SL4·L7)**: `M`으로 `ceil(M × 2 / 60000) × 60000`을 계산.
  - ≤ 300000(5분): `lock.ts` 값 무변경, 근거 주석만 `narrative` 실측
    참조로 교체(SL2). `lock.test.ts` 통과 확인.
  - > 300000: `lock.ts`의 `STALE_LOCK_MS`를 그 값으로 상향 + 주석 교체.
    `lock.test.ts`(SL1~SL5)·`npm run lint` 통과 확인.
- `M`이 180초(GENERATION_TIMEOUT_MS) + 적재에 근접/초과하면 그 사실과
  `result: "timeout"` 빈도를 `findings.md`에 기록(FR-014). 상한·한도는
  **바꾸지 않는다**.

---

## §2 배터리 예외 라운드 (US2, SC-003, research.md §3)

**목표**: 배터리 최적화 예외를 준 상태에서 목표 시각으로부터 자동 생성
첫 시도까지의 지연을 여러 번 모은다.

### 절차

1. `adb shell dumpsys deviceidle whitelist +com.anonymous.alpharium`.
2. 확인: `adb shell am get-standby-bucket com.anonymous.alpharium` → `5`.
   `adb shell dumpsys jobscheduler | grep -A30 alpharium` → `Minimum
   latency: +14m59s...`.
3. 자동 생성 ON, 목표 시각 = 현재+5분 이내의 시(시 단위라 근사).
4. `adb shell input keyevent KEYCODE_POWER` → `dumpsys trust`
   `deviceLocked=1` 확인. **이후 화면 조작 금지.**
5. `adb logcat -v time -b all` 버퍼를 주기적으로 `-d`로 덤프하며
   `task-entered` 시각을 모은다. 목표 시각으로부터의 분 = `delayFromTargetMin`.
6. 최소 3회 시도가 모일 때까지 반복(각 시도 후 목표 시각을 다음 시로
   옮기거나 그대로 두고 다음 콜백 대기).

### 기대 결과 (`findings.md` §2 표)

- **MUST**: 관측된 모든 라운드에서 목표 시각으로부터 첫 시도 ≤ 60분(SC-003).
- **SHOULD**: 3회 이상 모였으면 그 과반이 ≤ 40분. 3회 미만이면 "원시값만,
  best-effort"로 기록(019 표본 2회 10·32분과 대조).
- `standbyBucket: 5`, `minLatencyReported`가 `+14m59s...`인 것 확인.

---

## §3 무예외 24시간 소크 (US2, SC-002, SC-004)

**목표**: 배터리 예외 없이 24시간 안에 최소 1회 시도되는지.

### 절차

1. `adb shell dumpsys deviceidle whitelist -com.anonymous.alpharium`.
2. 확인: `am get-standby-bucket` → `10` 이상(억제됨).
3. 자동 생성 ON, 목표 시각 설정.
4. 화면 끄고 잠금 확인. **24시간 이상 화면을 조작하지 않는다**(Doze 조건 —
   화면을 켜면 깨진다, 019 research §7). 무선 디버깅 `adb`만 유지.
5. 주기적으로(2~4시간마다) `adb logcat -d -b all > dump_<ts>.txt`로 버퍼를
   보존. 로그 버퍼가 넘칠 수 있으므로 덤프를 쌓는다.
6. 24시간+ 뒤 덤프에서 `task-entered`/`pipeline-stage` 흔적을 찾는다.

### 기대 결과 (`findings.md` §2 표, `batteryException: false`)

- **MUST**: 목표 시각이 지난 뒤 24시간 안에 `task-entered` ≥ 1회(019 최악
  19시간 33분이 이 한계 안).
- `dumpsys jobscheduler`의 `Minimum latency`가 15분으로 정확히 전달됐는지
  (억제 원인이 앱이 아니라 OS).
- `screenTouchedDuringRound: false` 확인(참이면 라운드 무효).

---

## §4 권한 회수 재현 (US3, SC-005, contracts/signal-revocation.md)

**목표**: 실행 창 안에서 사진/위치 권한을 회수해도 저장된 일기 신호가
`unknown`이고 본문에 단정이 없는지.

### 절차 (§1 라운드에 겸함 — `narrative`의 넓은 실행 창 활용)

1. 사진·위치 권한을 부여한 상태로 시작(권한 온보딩 또는
   `adb shell pm grant com.anonymous.alpharium android.permission.READ_MEDIA_IMAGES` 등).
2. §1의 사진 있는 날 cold 트리거 → `adb logcat`으로 신호 수집 단계 진입을
   본 직후:
   `adb shell pm revoke com.anonymous.alpharium android.permission.READ_MEDIA_IMAGES`
   `adb shell pm revoke com.anonymous.alpharium android.permission.READ_MEDIA_VISUAL_USER_SELECTED`
3. 완주 후 저장된 일기 열기: `signalsUsed`(또는 저장 구조상 해당 필드)에서
   사진 신호가 `unknown`인지, 본문에 "사진을 안 찍었다" 류 단정이 없는지.
4. 별도로 위치만 회수하는 라운드:
   `adb shell pm revoke ... android.permission.ACCESS_FINE_LOCATION`
   `adb shell pm revoke ... android.permission.ACCESS_COARSE_LOCATION`
   → 자리 신호 `unknown`, 사진 신호는 살아 있는지(FR-007).
5. 신호가 전부 `unknown`이라 되뱉기로 거부되는 경우: 파일이 안 건드려졌는지
   (기존 일기 보존, 원칙 I).

### 기대 결과 (`findings.md` §4 표)

- `storedSignalKind: "unknown"` 100%. **`"none"`이면 위반** → `collect.ts`의
  해당 분기를 `unknown` 반환으로 유도하고 SR1~SR4에 케이스 추가.
- `bodyHasAssertion: false` 100%.
- `otherAxisSurvived: true`(사진 회수 시 위치가, 위치 회수 시 사진이).
- 거부 시 `fileUntouchedOnReject: true`.
- 회수 후 `permissionQueryResult`를 기록(`photoPermission()`이 `denied`를
  즉시 주는지 — research.md §5의 두 분기 중 어느 쪽이 실제로 도는지).

---

## §5 재부팅 복구 (US4, SC-006, research.md §4)

**목표**: 자동 생성을 켠 채 재부팅하면 앱을 한 번 연 시점에 예약이
되살아나는지.

### 절차

1. 자동 생성 ON. `adb shell dumpsys jobscheduler | grep alpharium`로
   등록 확인 → `findings.md` §3 `phase: "before-reboot", registered: true`.
2. `adb reboot`. 재부팅 완료 대기.
3. **앱 열기 전**: `adb connect` 재연결 후
   `adb shell dumpsys jobscheduler | grep alpharium` →
   `phase: "after-reboot-app-closed"`. (등록이 사라져 있어도 정상 — 한계)
4. 기기 잠금 해제(사람이 PIN) → 앱을 한 번 연다(마운트) → 몇 초 뒤
   `adb shell dumpsys jobscheduler | grep alpharium` →
   `phase: "after-reboot-app-opened", registered: true` 기대.
5. `adb reverse tcp:8081 tcp:8081` 다시 건다(재부팅으로 사라짐).
6. **꺼진 상태 대조**: 자동 생성 OFF → 재부팅 → 앱 열기 → 어느 phase에서도
   `registered: false`.
7. (선택) Direct Boot: 재부팅 직후 첫 잠금 해제 전 개발자 탭 트리거를
   시도할 수 없으므로, `run-as`가 `package not debuggable`/저장소 미복호화로
   실패하는 것만 관측(019와 같은 성격, 데이터 손실 아님).

### 기대 결과

- enabled=true: `after-reboot-app-opened`에서 `registered: true`(SC-006).
- `after-reboot-app-closed`의 값은 그대로 기록하되 **한계로 문서화**
  (`findings.md`·AGENTS.md 024 절 — "앱을 한 번도 열지 않은 구간은 재등록
  보장 안 됨", FR-010).
- enabled=false: 모든 phase `registered: false`.

---

## §6 회귀 (research.md §7)

1. `npm run test:device`로 `.maestro/scheduled-diary-notification.yml`(020),
   `unified-permission-onboarding.yml`(021),
   `photo-selection-over-limit.yml`(023) 통과 확인.
2. 실패하면 024 회귀인지 기존 stale인지 분리(020·022·023이 반복 관측한
   "개발자 탭 stale 버그" 패턴 주의).

---

## §7 기기 없는 게이트 (SC-007)

1. `npm run test:logic` — SR1~SR6, SL1~SL5 통과.
2. `npm test` — 전체. `jest-projects.test.ts` 파일 수 검사 `> 40` 유지.
3. `npm run lint` — eslint + tsc + 헌법 검사 + prettier. `checkScheduleFile`
   위반 0.
4. **구조 확인**: 새 `src/` 파일 0, 새 화면 0, 새 `*-port.ts` 0, 새
   `preferences/*.json` 0, 새 네이티브 모듈 0, 새 진단 패널 0, 검증 전용
   로그 모듈 0(SC-007). `git diff --stat`으로 변경 파일이 `lock.ts`(+주석/값)·
   `lock.test.ts`·(조건부)`collect.ts`·신규 테스트 스위트·`AGENTS.md`·
   `specs/024-*`에 한정되는지.

---

## §8 findings.md 작성 (FR-013, SC-008)

- data-model.md §1~§4 표를 채운다. 각 라운드에 기기(SM-S901N)·OS(Android
  16/SDK 36)·조건·측정 방법.
- `STALE_LOCK_MS` 결정(무변경/상향)과 `M` 값.
- `narrative` 완주 시간 vs 180초 한도의 위치, `VISION_PHOTO_LIMIT` 판단
  근거(FR-014).
- 배터리 인텐트가 실제 도착한 삼성 One UI 설정 화면 경로(021 T030 관행 —
  "배터리 인텐트가 실제 도착한 제조사 설정 화면" 기록).
- 재부팅 복구 관측과 한계.
- `AppState.currentState`를 "화면 꺼짐"의 증거로 안 쓴다는 문장(FR-011,
  019 §6a 계승).
- 미확인 잔여(있으면).
- AGENTS.md에 `### 024 — 백그라운드 안정성 및 예외 대응` 절 추가.
