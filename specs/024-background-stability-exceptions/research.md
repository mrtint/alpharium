# Research: 백그라운드 안정성 및 예외 대응

**대상 스펙**: [spec.md](./spec.md) · **작성일**: 2026-08-29

이 스펙은 새 기술을 도입하지 않는다. 조사 대상은 **측정 방법론**과 **기존
경로가 위험 조건에서 성립하는지 확인하는 방법**이다. 각 항목은
Decision / Rationale / Alternatives 형식.

---

## §1 `narrative`(exaone) 백그라운드 완주 시간 측정 방법론

### Decision

- 자동 생성 캐릭터를 `narrative`로 세팅하는 방법: **개발자 탭의 캐릭터 선택
  UI**로 오드(narrative)를 고른다(007 `saveSelection` → `preferences/
  selection.json`). `adb`로 파일을 직접 주입하는 방법도 있으나(019·023 관행),
  화면 경로가 007의 실제 저장 경로를 함께 검증하므로 우선한다.
- 사진 있는 날/없는 날: **010 도구(`npm run seed:day`)로 합성 하루를 심는다**.
  "경로가 도는가"만 확인하고 품질 결론에 쓰지 않는다(010 원칙). 사진 있는
  날은 캡션 단계(vision)가 포함돼 실행 창이 가장 넓다.
- 측정: **`adb logcat`**. 020의 `task.ts` → `pipeline.run()` → `runStages()`가
  찍는 `pipeline-stage` 계열 로그에서 진입 시각과 완주(`task-completed`/
  `Success`) 시각의 벽시계 차이를 읽는다. 019 findings.md의 실측 표 형식
  (`# / 진입 시각(UTC) / 날짜 대상 / appState / 완주까지 / ...`)을 재사용한다.
- 콜드/웜 구분: `narrative`는 콜드 스타트에서 `engine.load()`가 크게 든다
  (AGENTS.md — exaone 콜드 242초 관측). 첫 트리거(앱 재시작 직후)를 콜드,
  연속 2번째를 웜으로 잡아 둘 다 잰다. **`GENERATION_TIMEOUT_MS`는
  `engine.run()` 구간만 재고 적재 시간을 제외한다**(`on-device.ts`
  `runWithTimeout()`) — 그러므로 "완주까지 벽시계"와 "생성 시간 한도 대비"는
  다른 값이며, 둘을 나눠 기록한다.
- **`engineRunMs`(engine.run() 구간)를 로그에서 못 얻는 경우의 폴백**:
  `on-device.ts:531` 주석이 언급하는 별도 시간 측정이 `adb logcat`으로
  노출되지 않으면(실측 중 확인), `wallClockMs`만 기록하고 `engineRunMs`는
  `n/a`로 둔다. `STALE_LOCK_MS` 규칙(§2)은 `wallClockMs` 최댓값만 입력으로
  쓰므로 `engineRunMs` 부재가 규칙 적용을 막지 않는다 — `engineRunMs`는
  "완주가 180초 한도의 어디에 있는가"(FR-014 판단)의 보조 자료일 뿐이다.

### Rationale

- 019가 이미 이 방식으로 `quiet`를 6회 쟀고 findings.md 표가 검증됐다. 같은
  방식을 `narrative`에 적용하면 019 표와 직접 대조된다.
- 새 로그 모듈을 만들지 않는다(FR-013 MUST NOT). `adb logcat`은 020이 이미
  찍는 것을 읽는 것이므로 제품 코드 0줄.
- 콜드/웜을 나누는 이유: `STALE_LOCK_MS` 갱신 규칙(§2)이 "완주 실측 최댓값"에
  종속되는데, 콜드가 최댓값을 만든다. 웜만 재면 상수가 과소 설정된다.

### Alternatives considered

- **검증 전용 로그 파일 되살리기**(019 `verification-log.ts`) — 기각. 020이
  원칙 IV로 제거했고 FR-013이 MUST NOT으로 못 박음.
- **개발자 탭에 "마지막 소요 시간" 패널**(원칙 IV 1.2.0 사후 1회성 조항) —
  기각. 조항이 허용은 하나 이 스펙은 화면 노출을 새로 만들지 않는다(SC-007).
- **`adb`로 `selection.json` 직접 주입** — 보조 수단으로만. 화면 경로가 007을
  함께 검증한다.

---

## §2 `STALE_LOCK_MS` 갱신 규칙

### Decision

- **규칙(한 문장)**: `STALE_LOCK_MS` = `narrative` 백그라운드 완주 실측
  최댓값 M초 × 2, **분 단위 올림**. 현재 값 5분(300초)이 `M × 2` 이상이면
  **무변경**(주석만 갱신), 미만이면 상향.
- "완주 실측 최댓값 M"은 §1의 콜드 스타트 측정에서 온다(적재 시간 포함
  벽시계). `narrative`가 `GENERATION_TIMEOUT_MS`(180초)에서 끊기면 `engine.run()`
  은 ~180초에 상한이 걸리지만 **적재 시간이 그 위에 얹히므로** M은 180초보다
  클 수 있다 — 이 경우 M은 "끊긴 실행의 벽시계 완주(= failed로 끝난 시각)"로
  잡는다(잠금은 성공·실패 무관하게 그 시간 동안 잡혀 있으므로).
- 값은 `src/schedule/lock.ts`의 `STALE_LOCK_MS` 한 곳에만. `pipeline.ts`·
  `task.ts`는 import만 한다(020 L8). `lock.test.ts`가 소스에서 리터럴 부재를
  검사한다.
- `lock.ts`의 근거 주석을 교체한다: 현재 "019 실측 최장 완주 2분 27초의 2배 +
  여유(L7). narrative(exaone) 백그라운드 완주가 4분을 넘으면 이 상수를
  재검토한다" → "024 실측: `narrative` 백그라운드 완주 최댓값 M초(콜드,
  기기·조건) × 2, 분 단위 올림 = N분".

### Rationale

- 019가 5분을 도출한 계산이 정확히 "`quiet` 최장 2분 27초(147초) × 2 =
  294초 → 5분(300초)". 같은 규칙을 `narrative` M에 적용하는 것이 일관된다.
- "분 단위 올림"이 019의 암묵적 여유(294→300)를 명시적 규칙으로 만든다 —
  별도 "여유 상수"를 새로 만들지 않는다.
- 값이 커질 때의 비용: 진짜 죽은 잠금이 그만큼 오래 살아 다음 실행을 막는다
  (`lock.ts` 주석에 이미 있음). `narrative`가 자동 생성 캐릭터일 때만 이
  창이 넓어지고, `quiet` 사용자는 여전히 2~3초에 끝나 stale 판정까지 갈
  일이 거의 없다. 트레이드오프는 "가장 느린 캐릭터가 안전하게 완주" 쪽이
  맞다(FR-001 — 어느 캐릭터든 완주).

### Alternatives considered

- **잠금 하트비트**(실행 중 `acquiredAtMs`를 주기적으로 갱신해 stale
  판정을 미룸) — 기각. Clarifications에서 "상수를 올리는 것 외의 구조 변경은
  범위 밖". 별도 스펙.
- **`STALE_LOCK_MS`를 `GENERATION_TIMEOUT_MS` + 적재 여유로 고정** — 기각.
  적재 시간이 기기·캐릭터마다 달라 상수로 못 박기 어렵고, `narrative`가
  아닌 캐릭터에는 과대. 실측 종속이 원칙 V("사람이 실측을 보고 상수로")에
  맞다.
- **캐릭터별 `STALE_LOCK_MS`** — 기각. `lock.ts`가 캐릭터를 몰라야 한다
  (`checkScheduleFile`이 `models/roster` import 차단). 한 값이 가장 느린
  캐릭터를 덮으면 나머지는 자동으로 안전.

---

## §3 배터리 최적화 예외 소크 방법론

### Decision

- 패키지명: **`com.anonymous.alpharium`**(app.json `android.package` 확인).
  019 findings는 같은 값, 020 tasks.md도 같은 값.
- 예외 부여: `adb shell dumpsys deviceidle whitelist +com.anonymous.alpharium`
  = 설정 앱 "앱 → 배터리 → 제한 없음"과 동등한 시스템 상태(019 §8).
  해제: `... whitelist -com.anonymous.alpharium`.
- 예외가 실제로 걸렸는지 확인 신호:
  - `adb shell am get-standby-bucket com.anonymous.alpharium` → `5`(EXEMPTED).
  - `adb shell dumpsys jobscheduler | grep -A30 alpharium`의 해당 Job이
    요청한 `Minimum latency`가 `+14m59s***ms`(15분 요청이 OS에 정확히 전달됨
    — 억제 원인이 앱이 아니라 OS의 절전 정책임을 뒷받침).
- **§2 배터리 예외 라운드**(SC-003): 목표 시각을 현재+몇 분으로 설정,
  화면을 끄고(`adb shell input keyevent KEYCODE_POWER`) 잠금 확인
  (`dumpsys trust`의 `deviceLocked=1`), 목표 시각으로부터 자동 생성이 처음
  `task-entered`되기까지의 지연을 여러 번 모은다. MUST 1시간 이내, SHOULD
  과반 40분 이내(표본 3회 미만이면 "원시값만, best-effort").
- **§3 무예외 24시간 소크**(SC-002): 예외 해제, **화면을 24시간+ 조작하지
  않는다**(019 research §7 — 화면을 켜면 Doze 조건이 깨진다). 무선 디버깅으로
  `adb`만 연결해 두고, 24시간 뒤 `adb logcat`의 버퍼(또는 그 사이 주기적
  `adb logcat -d` 덤프)와 `dumpsys jobscheduler`로 `task-entered` 흔적을
  읽는다. MUST 24시간 안 1회.

### Rationale

- 019가 `deviceidle whitelist` = 설정 앱 토글의 동등성을 이미 확인했고
  (findings.md §8), standby bucket이 즉시 `5`로 바뀌는 것도 관측했다.
- 24시간 소크는 019가 무예외에서 이미 했으나(19시간 33분 관측), 020
  SC-002가 "제품 경로로" 재확인을 요구하며 T053b로 비어 있다. 024가 이
  자리를 채운다.
- 배터리 예외 24시간 풀 라운드는 019가 명시적으로 "안 했다"(약 32분 단기
  대조만) — SC-003이 이 공백을 겨냥한다.

### Alternatives considered

- **`adb shell cmd jobscheduler run -f <pkg> <jobid>`로 강제 실행** —
  보조 수단(재현 속도). 하지만 "OS가 스스로 언제 도는가"를 재는 것이
  SC-002·SC-003의 본질이므로 강제 실행은 지연 측정에 못 씀. 개발자 탭
  트리거 버튼도 같은 이유로 "경로가 도는가"만 확인.
- **화면 켜 둔 채 관측** — 기각. Doze가 안 걸려 무예외 억제가 재현 안 됨.

---

## §4 기기 재부팅 후 WorkManager 재등록 경로

### Decision

- 020 T024(`App.tsx` 배선)가 이미 담당: 앱 마운트 시 자동 생성 설정을 읽어
  `enabled === true`면 `backgroundPort.register()`를 idempotent 호출한다(020
  contracts/background-generation.md B5 — "재부팅 후 재등록"). **이 스펙은
  새 코드를 만들지 않고 이 경로가 재부팅 복구를 실제로 성립시키는지
  검증한다.**
- 소스 확인: `App.tsx`에서 `enabled`일 때 마운트 시 `register()`를 부르는
  자리가 실제로 있는지, `WiringDeps`/설정 로드가 재부팅 후 첫 실행에서
  정상 도는지(Direct Boot 저장소 미복호화가 설정 파일 읽기를 막지 않는지 —
  `preferences/`는 CE 저장소라 첫 잠금 해제 후 읽힌다).
- 조회: `adb shell dumpsys jobscheduler | grep alpharium`로 (a) 재부팅 전
  등록, (b) 재부팅 후 앱 열기 전 — **여기서 등록이 사라져 있는 것이 정상**
  (WorkManager는 재부팅 시 자체 재스케줄을 하나 `registerTaskAsync`가 다시
  불려야 확실), (c) 앱 한 번 연 후 재등록 확인.
- **한계 문서화**(FR-010, US4 Scenario 2): 재부팅 후 앱을 한 번도 열지 않은
  구간에는 재등록이 보장되지 않는다. `BOOT_COMPLETED` 브로드캐스트 수신
  같은 새 네이티브 경로를 만들지 않는다(범위 밖) — 이유: 새 네이티브 모듈
  금지(FR-012), 그리고 이 앱의 사용 패턴상 하루 한 번은 앱을 연다는 전제.
- Direct Boot: 재부팅 직후 첫 잠금 해제 전 자동 생성이 트리거되면 저장소
  미복호화로 조용히 실패(`failed`) → 다음 기회에 FR-013 재시도. 019가 관측한
  `run-as` 실패와 같은 성격(데이터 손실 아님).

### Rationale

- WorkManager는 `androidx.work`가 `BOOT_COMPLETED`를 자체 수신해 지속
  작업을 재스케줄하지만, `expo-background-task`가 이 지속성을 어떻게
  선언하는지는 버전 의존적이라 실측이 필요하다. "앱 한 번 열면 확실히
  재등록"은 020이 이미 배선한 안전망이다.
- 새 네이티브 경로를 안 만드는 것이 FR-012·SC-007과 정합.

### Alternatives considered

- **`BOOT_COMPLETED` 리시버 추가** — 기각. 새 네이티브 모듈/매니페스트 권한
  (`RECEIVE_BOOT_COMPLETED`), release R8 재확인 필요. FR-010이 범위 밖으로
  명시.
- **재부팅 감지 후 설정에서 강제 재등록 배너** — 과설계. 앱 마운트 시
  idempotent 재등록이 이미 이 일을 한다.

---

## §5 실행 중 권한 회수 재현 방법

### Decision

- 재현: 사진 권한을 부여한 상태로 자동 생성을 트리거하고, **`narrative`의
  넓은 실행 창**(신호 수집 → 캡션 → 적재 → 생성) 안에서
  `adb shell pm revoke com.anonymous.alpharium android.permission.READ_MEDIA_IMAGES`
  (및 `android.permission.READ_MEDIA_VISUAL_USER_SELECTED`)를 실행한다. 저장된
  일기의 `signalsUsed`에서 사진 신호가 `unknown`인지, 본문에 사진 단정이
  없는지 확인한다.
- 위치도 동일: `pm revoke ... android.permission.ACCESS_FINE_LOCATION` +
  `ACCESS_COARSE_LOCATION`. 자리(place) 신호가 `unknown`, 사진 신호는 그와
  무관하게 살아 있는지(FR-007).
- **§1과 겸한다** — `narrative` 완주 시간 측정 라운드에서 실행 창 중간에
  회수를 끼워 넣으면 별도 라운드가 필요 없다.

### 어느 분기가 이 경우를 받는가 (`src/signals/collect.ts`)

`collectPhotos()`의 두 방어 지점:

1. **권한 조회가 회수를 즉시 반영하는 경우**: `port.photoPermission()`이
   `"denied"`(또는 `"undetermined"`)를 돌려준다 → `permission !== "granted"`
   분기 → `{ kind: "unknown", reason: permissionReason(...) }`. **이미
   `none`이 아님. SR1이 이것을 잠근다.**
2. **권한 조회는 `granted`인데 `photosBetween()`이 던지는 경우**(조회와 실제
   접근 사이에 회수됨): `catch` → `{ kind: "unknown", reason: "사진을
   조회하지 못했다: ..." }`. **이미 `none`이 아님. SR2가 이것을 잠근다.**
3. `collectPlaces()`: `photos.kind !== "known"`이면 즉시
   `{ kind: "unknown", reason: "사진을 보지 못해 좌표를 물을 수 없다" }`.
   사진이 `known`인데 `locationOf()`가 전부 던지면 `failures ===
   considered.length` → `{ kind: "unknown", ... }`. **SR3이 잠근다.**

### Decision — 보강 필요 여부

**대개 무변경.** `collect.ts`는 004 FR-007·FR-012·FR-016 설계상 이미 모든
갈래를 `unknown`으로 감싼다. 이 스펙의 코드 작업은 **계약 테스트(SR1~SR6)로
이 방어를 명시적으로 잠그는 것**이다. 실기기 재현(§4 quickstart)에서
`unknown`이 아닌 값(특히 `none`)이 나오는 갈래가 발견되면 **그 한 지점만**
보강한다 — 새 판정 갈래를 만들지 않고 기존 `unknown` 반환으로 유도한다.

### Rationale

- 헌법 원칙 V의 방어선이 `collect.ts` 한 곳(004가 그렇게 설계). 019는 권한
  회수가 자연 발생 안 해 이 갈래가 실기기로 미검증. 024가 인위적으로
  재현해 확인한다.
- `narrative`를 쓰는 이유: 실행 창이 넓어 회수 타이밍을 맞추기 쉽다. §1과
  겸해 라운드 수를 줄인다.

### Alternatives considered

- **자동 생성 태스크에 권한 재확인 단계 추가** — 기각. `collect.ts`가 이미
  매 수집에서 권한을 조회한다. 태스크 계층에 중복 방어를 두면 경계가 흐려짐
  (`checkScheduleFile` — `src/schedule/`는 신호를 모른다, 009부터 이어진 경계).
- **회수 시 알림에 "권한이 없어 일부만 봤다" 문구 추가** — 기각. 020 FR-012가
  알림 문구에 신호 상태 노출을 금한다. 일기 본문이 `unknown`을 정직하게
  담는 것으로 충분(원칙 II).

---

## §6 `AppState.currentState` 한계 대응

### Decision

- 이 스펙은 `AppState.currentState`를 **어떤 판정에도 쓰지 않는다.** 자동
  생성의 트리거·완주는 화면 물리 상태와 무관하다(FR-011). `task.ts`·
  `decision.ts`·`lock.ts` 어디에도 `AppState` 참조가 없어야 하며(020도 없음),
  이 스펙이 추가하지 않는다.
- 검증 로그(`findings.md`)가 019처럼 `appState: "background"`를 기록하더라도
  **"앱 UI가 전경에 없음"의 근사치**로만 해석한다는 문장을 `findings.md`와
  AGENTS.md 024 절에 남긴다(019 §6a 계승).
- 실측 중 반복된 `adb shell dumpsys`가 화면을 깨울 수 있다(019 §6a 관측) —
  §1·§4 라운드에서 조회 명령을 최소화하고, 화면 조작 후에는 다시 끄고
  잠금을 재확인하는 절차를 quickstart에 넣는다.

### Rationale

- 019가 이 한계를 이미 문서화. 024는 "이 값에 새 의존을 만들지 않는다"를
  확인하고 문장으로 못 박는 것이 전부.

### Alternatives considered

- **네이티브로 화면 상태를 정확히 조회** — 기각. 새 네이티브 모듈(FR-012),
  그리고 자동 생성이 화면 상태에 의존할 이유가 없음.

---

## §7 회귀 대상 목록

### Decision

`scripts/run-device-tests.mjs`의 `FLOWS`에 등록된 흐름 중 이 스펙이 건드리는
계층과 겹치는 것:

- `.maestro/scheduled-diary-notification.yml`(020) — 자동 생성 설정 화면,
  알림 라우팅. 이 스펙이 `src/schedule/lock.ts` 주석·(조건부)상수만
  건드리므로 **무변경 예상**, `npm run test:device`로 통과 확인.
- `.maestro/unified-permission-onboarding.yml`(021) — 권한 온보딩. US3가
  권한 회수를 다루므로 회귀 확인.
- `.maestro/photo-selection-over-limit.yml`(023) — 사진 상한. `narrative`
  실측이 `VISION_PHOTO_LIMIT` 판단 근거가 되지만 이 스펙은 상한을 안 바꾸므로
  무변경.
- 기기 없는 게이트: `npm test`(전체), `npm run lint`(eslint + tsc + 헌법
  검사 + prettier), `jest-projects.test.ts`의 파일 수 검사(스위트 추가 시
  `> 40` 유지).

### Rationale

- 020·021·023이 확립한 "새 Maestro 흐름은 `FLOWS`에 등록"·"stale 흐름을
  회귀에서 발견"(020·022·023이 반복) 관례. 이 스펙은 새 흐름을 거의 안
  만들지만(권한 회수·재부팅은 실기기 수동 절차라 quickstart로 대체), 기존
  흐름이 깨지지 않았는지는 확인한다.

### Alternatives considered

- **권한 회수·재부팅을 Maestro 흐름으로** — 부분 기각. `pm revoke`·재부팅은
  Maestro 밖의 `adb` 조작이고 타이밍이 실행 창에 의존해 흐름으로 안정화하기
  어렵다. quickstart의 수동 절차로 둔다(019·020의 quickstart 관행).
