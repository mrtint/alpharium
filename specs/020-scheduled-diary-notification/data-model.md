# Phase 1 Data Model: 시간대 지정 자동 일기 작성과 완성 알림

이 스펙은 새 저장 계층을 만들지 않는다(spec Assumptions). 아래 엔티티는
전부 `expo-file-system`의 `Paths.document` 아래 작은 JSON 파일이며,
007의 `selection-store.ts`가 확립한 "통로를 주입받는 순수 load/save"
패턴을 따른다.

---

## 1. AutoDiarySettings — 자동 생성 설정

**파일**: `Paths.document/preferences/auto-diary.json`
**모듈**: `src/schedule/settings.ts`

```ts
type AutoDiarySettings = {
  /** 자동 생성 켜짐 여부 (FR-009). 기본값 false — 사용자가 명시적으로 켠다. */
  enabled: boolean;
  /**
   * 대략적인 목표 시각. 기기 현지 시간대 기준 "시" (0–23). 기본값 7 (FR-001).
   * 분은 두지 않는다 — 근사치(FR-002)이므로 분 단위 정밀도를 암시하지 않는다.
   */
  targetHour: number;
  /**
   * 배터리 최적화 예외 요청을 이미 1회 띄웠는가 (FR-010).
   * true가 되면 다시는 자동으로 요청 인텐트를 띄우지 않는다(MUST NOT).
   */
  batteryExceptionPrompted: boolean;
};
```

**기본값**(파일 없음 / 읽기 실패 시): `{ enabled: false, targetHour: 7,
batteryExceptionPrompted: false }`. 007의 `loadSelection()`이 "모르면
null"인 것과 달리, 여기는 **명시적 기본값**을 쓴다 — geocoding 설정
(`geocoding-setting-store.ts`)이 "꺼짐이 기본값"인 것과 같은 판단.

**검증 규칙**:

- `targetHour`가 0–23의 정수가 아니면 기본값(7)로 대체하고, 나머지
  필드는 살린다(부분 손상에 관대 — `store.ts`의 방식).
- `enabled`가 boolean이 아니면 `false`.

**전이**:

- `enabled: false → true`: 알림 권한 요청(FR-009 시점) →
  `batteryExceptionPrompted === false`면 배터리 예외 인텐트 1회 →
  `true`로 저장 → `background-port.reschedule()` 호출(태스크 등록).
- `enabled: true → false`: `background-port.unregister()` 호출.
- `targetHour` 변경(enabled인 동안): `reschedule()`(unregister→register,
  주기 리셋 — research.md §3).

**경계**: 이 파일에 캐릭터·모델 정보를 담지 않는다(007과 같은 자리,
같은 원칙 III 방어). 목표 시각과 on/off·prompted 플래그만.

---

## 2. NotifiedState — 날짜별 알림 상태

**파일**: `Paths.document/preferences/notified.json`
**모듈**: `src/schedule/notified-store.ts`

```ts
type NotifiedEntry = {
  /** 이 날짜로 알림을 보낸 마지막 시각. ISO 8601 (Date.toISOString()). */
  sentAt: string;
  /**
   * 사용자가 이 날짜의 일기를 열어 확인했는가.
   * true면 FR-013 재시도로 재생성돼도 다시 알리지 않는다(FR-007 (2)).
   */
  acknowledged: boolean;
  /**
   * expo-notifications가 돌려준 알림 식별자 (dismiss·갱신에 쓴다).
   * 문자열. 트레이에서 이 알림을 걷어낼 때 사용.
   */
  notificationId: string;
};

type NotifiedState = { [day: DayDate]: NotifiedEntry };
```

**기본값**(파일 없음 / 읽기 실패): `{}` (빈 맵).

**검증 규칙**:

- 맵의 값이 위 모양이 아닌 엔트리는 무시(그 날짜는 "알린 적 없음"으로
  취급) — 한 줄 손상이 전체를 막지 않는다.
- 오래된 엔트리 정리: `selectableDays` 범위를 크게 벗어난 날짜(예: 30일
  이전)는 load 시 잘라낸다. 무한히 커지지 않게. **정리 판정은 순수
  함수** — 값이 아니라 날짜 문자열 비교만.

**전이**:

- 알림 발송 성공: `state[day] = { sentAt: now, acknowledged: false,
  notificationId }`.
- 같은 날짜 재발송(미확인 상태): 기존 `notificationId`를 dismiss하고 새
  알림 발행 → `sentAt` 갱신, `notificationId` 갱신, `acknowledged`는
  `false` 유지 (FR-007 (1) — 쌓지 않고 갱신).
- 사용자가 상세를 엶(`DiaryHomeScreen.openItem` / 알림 탭 라우팅):
  `state[day].acknowledged = true`.
- `acknowledged === true`인 날짜: 이후 어떤 완료에도 알림 발송 안 함
  (FR-007 (2), FR-013).

**경계**: `DiaryEntry`(`src/diary/types.ts`)에 병합하지 않는다
(research.md §6). 이 상태는 일기의 속성이 아니라 이 기능의 UX 상태다.

---

## 3. GenerationLock — 프로세스 경계 경합 잠금

**파일**: `Paths.document/locks/diary-generation.lock`
**모듈**: `src/schedule/lock.ts`

```ts
type LockRecord = {
  /** 누가 쥐고 있는가. "screen" | "background". 진단·디버깅용. */
  owner: "screen" | "background";
  /** 취득 시각 (Date.now() 밀리초). stale 판정에 쓴다. */
  acquiredAtMs: number;
};
```

**상수**(이 파일에만):

```ts
/**
 * 이 시간을 넘긴 잠금은 죽은 것으로 본다.
 * 019 실측 최장 완주 2분 27초 → 그 2배 + 여유. narrative(콜드 242초
 * 관측)까지 감안하면 부족할 수 있으나, 백그라운드는 quiet만 검증됐고
 * (019), narrative 백그라운드 완주 자체가 미확인이다 — tasks에서
 * narrative 백그라운드를 확인하며 이 값을 재검토한다.
 */
const STALE_LOCK_MS = 5 * 60 * 1000;
```

**연산**(전부 순수 판정 + 주입된 파일 통로):

- `tryAcquire(owner, now, existing: LockRecord | null) => { granted:
  boolean; record?: LockRecord }`:
  - `existing === null` → grant, `{ owner, acquiredAtMs: now }`.
  - `existing !== null && now - existing.acquiredAtMs > STALE_LOCK_MS`
    → grant(덮어쓰기), stale로 간주.
  - 그 외 → deny.
- `release(record, currentOnDisk)`: 내가 쥔 잠금일 때만 파일 삭제
  (`currentOnDisk.acquiredAtMs === record.acquiredAtMs`). 남의 잠금·stale
  대체된 잠금은 건드리지 않는다.

**전이**:

- `pipeline.run()` 진입 → `tryAcquire`. deny면 `already-running`류로
  즉시 반환(생성 안 함). grant면 파일 쓰기 → 생성 → `finally`에서
  `release`.
- 취득 실패한 백그라운드 태스크: 조용히 `Success` 반환(다음 콜백 재시도,
  FR-013 경로와 합류).
- 취득 실패한 화면: 사용자에게 "이미 쓰는 중" 안내 또는 진행 중 결과
  대기(User Story 3 Scenario 2).

**경계**: `diary/` 디렉터리 밖(`locks/`)에 둔다 — `store.ts`의
`listDays()`가 날짜로 파싱하지 않게. 007이 `preferences/`를 `diary/`
밖에 둔 것과 같은 이유.

---

## 4. ScheduleDecision — "지금 자동 생성을 돌려야 하는가" (파생, 저장 안 함)

**모듈**: `src/schedule/decision.ts` (순수 함수, 저장 없음)

```ts
type ScheduleDecisionInput = {
  settings: AutoDiarySettings;
  now: Date;
  /** 09의 selectableDays(now) 결과 */
  selectableDays: readonly DayDate[];
  /** 저장소에 이미 있는 일기 날짜들 (store.listDays()) */
  existingDiaryDays: readonly DayDate[];
};

type ScheduleDecision =
  | { act: false; reason: "disabled" | "not-near-target" | "all-written" }
  | { act: true; day: DayDate };
```

**판정 순서**:

1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
2. **목표 시각 근방인가**: `now`의 현지 시(hour)가
   `[targetHour, targetHour + WINDOW_HOURS)` 안인가. `WINDOW_HOURS`는 이
   파일 상수(예: 3 — 근사치 특성상 넉넉히; SC-003의 "1시간 이내"는
   *시도가 최소 1회 일어나는지*의 하한이지, 이 창을 1시간으로 좁히면
   배터리 예외 없는 경우 SC-002를 못 맞춘다). 아니면 `{ act: false,
   reason: "not-near-target" }`.
   - **경계 넘김**: `targetHour + WINDOW_HOURS > 24`면 자정을 넘어
     wrap. 04:00 하루 경계와는 다른 축(이건 "쓸 시각", 저건 "어느
     하루") — `day-boundary.ts`를 건드리지 않는다.
3. **대상 하루 선정**: `retry.ts`의 순수 함수로 `selectableDays`에서
   `existingDiaryDays`에 없는 가장 최근 하루 1개. 없으면 `{ act:
   false, reason: "all-written" }`.
4. `{ act: true, day }`.

**상수**(이 파일에만):

```ts
/**
 * 목표 시각으로부터 이 시간 안에 들면 "근방"으로 본다.
 * 근사치(FR-002)이므로 넉넉히. SC-002(24시간 내 1회)와 SC-003(예외 시
 * 1시간 내 1회)은 "창"이 아니라 "시도 하한"을 재는 기준이다 — 이 창은
 * "매 15분 콜백 중 어느 구간에서 생성을 시도할 자격이 있는가"를 정한다.
 */
const WINDOW_HOURS = 3;
```

**경계**: `now`를 인자로 받는다(`day-boundary.ts`의 모든 함수와 같은
규칙 — 안에서 `new Date()`를 부르면 경계 테스트 불가). 04:00·정오·3일은
`selectableDays`(주입)를 통해서만 본다.

---

## 5. NotifyDecision — "알림을 보낼지, 어떻게" (파생, 저장 안 함)

**모듈**: `src/schedule/notify.ts` (순수 함수)

```ts
type NotifyDecisionInput = {
  day: DayDate;
  /** 방금 생성 파이프라인이 성공했는가 (PipelineResult.ok). */
  generationSucceeded: boolean;
  /** 그 날짜의 기존 알림 상태 (없으면 null). */
  notified: NotifiedEntry | null;
};

type NotifyDecision =
  | { send: false; reason: "generation-failed" | "already-acknowledged" }
  | { send: true; mode: "new" }
  | { send: true; mode: "replace"; dismissId: string };
```

**판정 순서**:

1. `generationSucceeded === false` → `{ send: false, reason:
   "generation-failed" }` (FR-005, SC-006).
2. `notified?.acknowledged === true` → `{ send: false, reason:
   "already-acknowledged" }` (FR-007 (2), FR-013).
3. `notified !== null && notified.acknowledged === false` → `{ send:
   true, mode: "replace", dismissId: notified.notificationId }`
   (FR-007 (1) — 기존 것 걷어내고 갱신).
4. 그 외 → `{ send: true, mode: "new" }`.

**경계**: 알림 **문구**는 이 함수가 만들지 않는다 —
contracts/notification.md의 고정 문구 상수를 어댑터가 쓴다. 이 함수는
"보낼지/어떻게"만.

---

## 6. NotificationRoute — 알림 응답 → 화면 (파생, 저장 안 함)

**모듈**: `src/app/notification-routing.ts` (순수 함수)

```ts
type NotificationRoute = { day: DayDate } | null;

// (response: NotificationResponse | null) => NotificationRoute
```

**판정**:

- `response === null` → `null` (알림으로 안 열림, 정상 시작).
- `response.notification.request.content.data.day`가 `YYYY-MM-DD` 꼴
  문자열 → `{ day }`.
- 그 외(형식 불명, day 없음) → `null` (조용히 정상 시작 — 헌법 원칙 V,
  모르면 지어내지 않는다).

**경계**: `NotificationResponse` 타입은 `expo-notifications`에서 온다.
이 함수는 그 안의 `content.data.day`만 읽고, 화면 전이는 하지 않는다
(`App.tsx` / `DiaryHomeScreen`이 결과를 받아 `initialScreen` 확장으로
처리).

---

## 엔티티 관계 요약

```text
AutoDiarySettings ──(enabled, targetHour)──▶ ScheduleDecision ──(day)──▶ pipeline.run()
                                                                              │
                                                        GenerationLock ◀──────┤ (acquire/release)
                                                                              │
                                                                    PipelineResult
                                                                              │
NotifiedState ──(day 상태)──▶ NotifyDecision ◀──(succeeded?)───────────────────┘
       │                            │
       │                            ▼
       │                   notification-port (expo-notifications)
       │                            │
       ▼                            ▼
  acknowledged=true ◀── 사용자가 상세 진입 ◀── NotificationRoute ◀── 알림 탭
```

## 이 데이터 모델이 의도적으로 갖지 않는 것

- **실행 이력 로그**: 019의 `verification-log.jsonl`은 검증 전용이었고
  제거된다. 제품에 "몇 시에 몇 번 돌았는지" 로그를 남기지 않는다 —
  그것이 원칙 IV가 막는 "측정 장치"로 자라는 자리다. 진단이 필요하면
  기존 진단 경로(dev/prod 게이트)만.
- **생성 시간·토큰 수·모델 지표**: `DiaryEntry.timing`(017, 헌법
  1.2.0이 허용한 사후 1회성)은 그대로지만, 이 스펙이 새로 더하는
  지표는 없다.
- **알림 문구 템플릿 저장소**: 문구는 코드 상수(contracts/notification.md).
  사용자가 편집하거나 여러 벌을 두지 않는다(원칙 II — 지어내기 방지).
- **목표 시각의 분(minute)**: 근사치이므로 시 단위만.
