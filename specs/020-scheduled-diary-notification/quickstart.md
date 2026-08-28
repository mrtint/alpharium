# Quickstart: 시간대 지정 자동 일기 작성과 완성 알림

이 기능이 끝에서 끝까지 도는지 확인하는 실행 가이드다. 구현 코드는
`tasks.md`와 구현 단계에 있고, 여기는 **검증 시나리오**만 담는다.

관련 계약: [schedule-decision](./contracts/schedule-decision.md),
[background-generation](./contracts/background-generation.md),
[notification](./contracts/notification.md),
[generation-lock](./contracts/generation-lock.md),
[auto-diary-settings](./contracts/auto-diary-settings.md),
[battery-exception](./contracts/battery-exception.md).

---

## 0. 전제

- 019 스파이크 코드(`src/spike/`)는 이 스펙에서 제거된다 — 검증은
  제품 경로로만 한다.
- 신규 네이티브 모듈(`expo-notifications`, `expo-intent-launcher`)이
  들어가므로 **debug 실기기 1회 + release 재확인 1회** 둘 다 필요하다
  (AGENTS.md 「테스트」 — 새 네이티브 모듈은 재확인 대상).
- 실기기: 019와 같은 조건(SM-S901N/Galaxy S22 또는 동급 안드로이드).
  실측값은 그 기기·OS 기준이라는 019의 한계를 계승한다.

---

## 1. 기기 없는 검증 (`npm test`) — 항상 돈다

```bash
npm run test:logic   # 순수 판정 (개발 중 기본, ~7초)
npm run test:ui      # 설정 화면 + 알림 라우팅 상태 전이
npm test             # 전부 (커밋 전)
npm run lint         # eslint + tsc + 헌법 검사 + prettier
```

**통과 기준**:

- `decideSchedule` — 목표 시각 근방/밖, 자정 wrap, `enabled: false`,
  `all-written` 각 갈래. `now`가 인자임을 소스에서 확인(계약 테스트).
- `pickRetryDay` — 결과가 항상 `selectableDays`의 원소이거나 `null`.
  009 범위 밖 날짜가 후보에 못 든다(위반 주입).
- `decideNotify` — `generation-failed` / `already-acknowledged` /
  `replace` / `new` 4갈래. `send: false`면 어떤 경우에도 알림 없음.
- `decideAcquire` / `isMine` — fresh 잠금 deny, stale 덮어쓰기,
  `isMine` false면 `release`가 남의 잠금을 안 지운다.
- `lock.test.ts` 100회 시뮬레이션 — 두 `granted`가 동시에 유효한
  시점 0건 (**SC-005**).
- `routeFromNotification` — `null` / 형식 불명 → `null`, `YYYY-MM-DD`
  → `{ day }`.
- `loadAutoDiarySettings` — 파일 없음/손상 시 기본값, `targetHour`
  범위 밖이면 그 필드만 7로.
- 소스 검사 — 알림 문구에 본문 참조 없음, "정각"/"매일 7시" 문자열
  없음(FR-002·FR-012), `backend.generate()` 직접 호출 없음(FR-011),
  `src/spike/` 부재.

---

## 2. debug 실기기 — 자동 생성 경로 (User Story 1)

### 2a. 준비

```bash
# Metro (dev 환경)
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client

# 빌드 끝난 뒤 Metro 띄운다 (AGENTS.md — gradle 중 Metro는 exit 7)
npx expo run:android
adb reverse tcp:8081 tcp:8081     # 재부팅으로 사라지면 다시
```

- 앱에서 캐릭터 1개 준비(quiet 권장 — 019처럼 2분 내 완주),
  사진 설정 "보지 않음" 또는 합성 하루(010 `npm run seed:day`)로
  사진 있는 경로도 확인.

### 2b. 설정에서 목표 시각을 고른다

1. 자동 생성 설정 화면 → "자동 생성" 켬.
   - **알림 권한 다이얼로그**가 뜬다 → 허용.
   - **배터리 예외 설명 화면** → 시스템 예외 요청 다이얼로그 → (검증
     목적상) 허용.
   - 근사치 안내 문구(E5)가 보인다 → **SC-001**: "정각이 아니라 무렵"이
     문구만으로 이해되는가.
2. 목표 시각을 **현재 시각 + 몇 분** 뒤로 맞춘다(빨리 관측하려면).
   - `decideSchedule`의 `WINDOW_HOURS`(3) 안에 들어야 한다.

### 2c. 백그라운드 실행을 관측한다

```bash
# 등록 확인
adb shell dumpsys jobscheduler | grep -A5 alpharium
#   Minimum latency: +14m59s***ms  ← 15분 요청이 정확히 전달됐는가

# 배터리 예외 상태 확인 (019 방식)
adb shell am get-standby-bucket com.anonymous.alpharium
#   예외 적용 시 5 (EXEMPTED)

# 화면 끄고 잠근다
adb shell input keyevent KEYCODE_POWER
adb shell dumpsys trust | grep deviceLocked   # =1 확인
```

- 목표 시각 근방까지 방치. **SC-003**: 배터리 예외 적용 상태에서 목표
  시각으로부터 1시간 이내에 최소 1회 생성이 시도되는가. 019 실측
  (10~32분)과 비교해 기록.
- **SC-002**: (별도 라운드) 배터리 예외 없이 24시간 방치 —
  `adb shell dumpsys deviceidle whitelist -com.anonymous.alpharium`로
  예외 해제 후. 24시간 내 최소 1회 시도되는가(019는 최악 19시간 33분).

### 2d. 결과 확인

- 앱을 열지 않은 채로 전날 일기가 저장돼 있다(목록에 새 줄).
- 그 일기가 판정 4갈래를 정상 통과했고 페르소나 규칙(014)이 반영됐다 —
  **포그라운드 생성과 구분되지 않는다**(FR-011).
- 사진 있는 하루면 캡션이 내용을 반영했다.

---

## 3. debug 실기기 — 완료 알림 (User Story 2)

### 3a. 알림 발생과 탭

1. 2c의 자동 생성이 성공하면 **기기에 알림**이 뜬다(제목 "오늘의
   일기가 준비됐어요").
   - 알림 문구에 일기 내용 요약이 **없다**(FR-012).
2. 알림을 누른다 → 앱이 열리며 **그 날짜 일기 상세**가 곧바로 보인다.
   - 목록 화면을 거치지 않는다(**FR-006**).
   - 탭 1회로 도달(**SC-004**).
3. **콜드 스타트 확인**: 앱을 완전 종료(`adb shell am force-stop
   com.anonymous.alpharium`) → 다음 자동 생성 대기 → 알림 탭 → 앱이
   새로 뜨면서 바로 그 상세로.

### 3b. dedup (FR-007)

1. 알림을 **누르지 않은 채** 같은 날짜에 대해 생성을 한 번 더
   트리거(2c 반복 또는 3c의 수동 트리거) → 트레이에 알림이 **쌓이지
   않고 하나로 갱신**된다(User Story 2 Scenario 5).
2. 알림을 눌러 상세를 본 뒤(→ `acknowledged: true`), 같은 날짜에 대해
   FR-013 재시도가 일어나도 **새 알림이 안 뜬다**(Scenario 4).

### 3c. 실패 시 침묵 (FR-005, SC-006)

- 캐릭터 미준비 상태로 자동 생성이 돌게 만든다(설정에서 캐릭터 선택을
  지우거나 모델을 삭제) → 생성이 `model-not-ready` 등으로 실패 →
  **알림이 뜨지 않는다**.

### 3d. 알림 권한 거부 (Edge Case)

- 알림 권한을 거부한 채 자동 생성을 켠다 → 생성 자체는 완주하지만
  알림이 없다. 설정 화면에 "앱을 열어 확인하세요" 안내가 보인다.

---

## 4. debug 실기기 — 경합 방지 (User Story 3, SC-005)

19 quickstart 3단계의 "수동 트리거" 개념을 제품 경로로:

1. 개발자 탭(dev 전용)에 **"지금 자동 생성 트리거"** 디버그 버튼을
   둔다 — `runAutoDiaryTask()`를 직접 부른다(019 하네스의 "지금 즉시
   트리거"와 같은 목적, `task.ts` 로직 100% 재사용).
2. 화면에서 "일기 쓰기"를 누른 **직후** 그 버튼을 누른다(같은 날짜).
3. 확인:
   - 최종적으로 그 날짜의 일기가 **정확히 하나**(**SC-005** 재현 1회).
   - 파일이 손상되지 않았다(`store.load(day)`가 정상 파싱).
   - 어느 쪽 결과인지 알 수 있다(둘 다 성공해 값이 섞이지 않았다).
   - 늦게 시작한 쪽은 `already-running`으로 즉시 반환됐다(잠금 취득
     실패). 화면이면 "이미 쓰는 중" 안내 또는 진행 중 결과 대기.
4. `lock.jsonl`이 아니라 — 로그를 남기지 않는다(원칙 IV). 관측은
   `adb logcat`으로 두 실행의 시작/종료 순서를 본다(019 방식).
5. **narrative 백그라운드 완주 확인**(019 미확인 항목): 캐릭터를
   narrative로 바꾸고 4-1의 디버그 버튼으로 백그라운드 완주 시간을
   잰다. 4분(`STALE_LOCK_MS`의 근거)을 넘으면 `lock.ts`의 상수를
   재검토(generation-lock.md L7).

---

## 5. debug 실기기 — 목표 시각 변경 (FR-003a)

1. 목표 시각을 7시 → 9시로 바꾼다.
2. `adb shell dumpsys jobscheduler | grep alpharium` — 태스크가
   재등록됐는가(`unregister` → `register` 흔적, `Minimum latency`
   타이머 리셋).
3. 이후 자동 생성이 **9시 근방**을 목표로 시도된다(7시 근방 실행이
   1회 더 남지 않는다 — spec Edge Case).
4. 자동 생성을 끈다 → `dumpsys jobscheduler`에서 태스크가 사라진다.

---

## 6. release 재확인

```bash
npx expo prebuild --platform android --clean
cp ~/.alpharium-signing/alpharium.jks android/app/    # prebuild가 지운다
cd android && NODE_ENV=production ./gradlew assembleRelease
```

- 매니페스트 권한 확인:
  `adb shell dumpsys package com.anonymous.alpharium | grep -A20
  "requested permissions"` — `POST_NOTIFICATIONS`,
  `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`가 있는가(config plugin이
  선언, E2).
- Metro 끄고 USB 뽑고 앱 실행 → `Unable to load script` 없음.
- 자동 생성 1회(2c 축약), 알림 탭(3a) — **`expo-notifications`·
  `expo-intent-launcher`의 JNI 심볼이 R8/ProGuard에서 살아남는가**.
- 「이 빌드는 잘못 만들어졌다」가 아니다.

---

## 7. Maestro 흐름 등록

`.maestro/scheduled-diary-notification.yml`(신규)을
`scripts/run-device-tests.mjs`의 `FLOWS`에 추가한다 — **등록 안 하면
파일이 있어도 안 돌고 초록불인데 아무것도 검증 안 된 상태**가 된다
(AGENTS.md).

흐름이 덮는 것(시각을 못 바꾸는 실기기 제약 안에서):

- 자동 생성 설정 화면이 뜨고 토글·시각 선택 UI가 있다.
- 근사치 안내 문구(E5)와 배터리 상시 링크(E4)가 화면에 있다
  (`.*무렵.*`, `.*배터리 설정.*` 정규식 — Maestro 부분 매칭은
  정규식으로, AGENTS.md).
- 알림 라우팅: `data.day`를 심은 가짜 알림 응답으로 상세가 바로 뜨는지
  (테스트 훅 또는 `xcrun`/`adb`로 알림 발행 후 탭 시뮬레이션).

---

## 통과 요약 (이 기능이 "됐다"고 말할 조건)

| 기준 | 확인 방법 | 절 |
|---|---|---|
| SC-001 | 근사치 문구만 보고 이해 (사람 판단) | 2b |
| SC-002 | 예외 없이 24시간 내 1회 시도 | 2c |
| SC-003 | 예외 적용 시 1시간 내 1회 시도 | 2c |
| SC-004 | 알림 탭 1회로 상세 도달 | 3a |
| SC-005 | 경합 100회 시뮬레이션 0건 + 실기기 1회 | 1, 4 |
| SC-006 | 실패 시 알림 0건 | 3c |
| FR-011 | 자동 일기가 포그라운드와 구분 안 됨 | 2d |
| release | 새 네이티브 모듈이 R8 통과 | 6 |
