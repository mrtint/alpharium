# Contract: 알림 발송·dedup·탭 라우팅 (`src/schedule/notify.ts`, `src/schedule/notification-port.ts`, `src/app/notification-routing.ts`)

관련: FR-004, FR-005, FR-006, FR-007, FR-012, SC-004, SC-006, 헌법 원칙
II. `expo-notifications` 신규 의존.

## N1 — `decideNotify` (순수 함수)

```ts
export function decideNotify(input: {
  day: DayDate;
  generationSucceeded: boolean;
  notified: NotifiedEntry | null;   // 그 날짜의 기존 상태 (notified.json)
}): NotifyDecision;

export type NotifyDecision =
  | { send: false; reason: "generation-failed" | "already-acknowledged" }
  | { send: true; mode: "new" }
  | { send: true; mode: "replace"; dismissId: string };
```

판정 순서(고정):

1. `!generationSucceeded` → `{ send: false, reason: "generation-failed" }`.
2. `notified?.acknowledged === true` → `{ send: false, reason:
   "already-acknowledged" }`.
3. `notified && !notified.acknowledged` → `{ send: true, mode:
   "replace", dismissId: notified.notificationId }`.
4. else → `{ send: true, mode: "new" }`.

## N2 — 알림 문구 (고정 상수, `notification-port.ts`)

```ts
const NOTIFICATION_TITLE = "오늘의 일기가 준비됐어요";
const NOTIFICATION_BODY = "눌러서 방금 쓰인 일기를 읽어보세요.";
```

- **본문(일기 내용)을 요약해 넣지 않는다**(FR-012, 원칙 II) — 열어야
  확인 가능.
- **감상·단정을 넣지 않는다** — "즐거운 하루였네요" 류 금지.
- 날짜조차 문구에 안 넣는다(근사치 특성 + 단순함). `data.day`로만 전달.
- 문구는 **코드 상수**다. 사용자가 편집하거나 여러 벌을 두지 않는다.
- 캐릭터 이름·모델 정보 없음(원칙 III).

## N3 — `NotificationPort` (기기 어댑터)

```ts
export interface NotificationPort {
  /** 안드로이드 채널 보장 + 권한 상태 조회. 앱 시작 시 1회. */
  ensureChannel(): Promise<void>;
  /** POST_NOTIFICATIONS 런타임 권한 요청 (Android 13+). 자동 생성 켤 때. */
  requestPermission(): Promise<"granted" | "denied">;
  /**
   * 즉시 로컬 알림. trigger: null. data에 { day }를 싣는다.
   * 반환값은 notification identifier (notified.json에 저장).
   */
  present(day: DayDate): Promise<string>;
  /** 트레이에서 특정 알림을 걷어낸다 (replace 모드). */
  dismiss(notificationId: string): Promise<void>;
  /** 콜드 스타트: 앱을 연 마지막 알림 응답. 없으면 null. */
  lastResponse(): Promise<NotificationResponse | null>;
  /** 웜: 탭 응답 리스너. 반환값은 해제 함수. */
  onResponse(handler: (r: NotificationResponse) => void): () => void;
}
```

- `present()`: `Notifications.scheduleNotificationAsync({ content: {
  title, body, data: { day } }, trigger: null })`. `trigger: null` =
  즉시(research.md §1). **예약 알림·DAILY·TIME_INTERVAL 금지.**
- `ensureChannel()`: `setNotificationChannelAsync("diary-completed", {
  importance: HIGH, ... })`. 채널 없으면 안드로이드에서 권한 프롬프트도
  안 뜨고 알림도 안 보인다.
- 지연 import: `expo-notifications`를 메서드 안에서 `await import`.
- `setNotificationHandler`(포그라운드에서도 배너 표시)는 `App.tsx`가
  모듈 로드 시 1회 설정 — research.md §1 예시대로.

## N4 — replace 모드의 실행

`decideNotify`가 `{ send: true, mode: "replace", dismissId }`를 주면:

1. `port.dismiss(dismissId)` — 기존 트레이 알림 제거.
2. `port.present(day)` — 새 알림. 새 identifier를 받는다.
3. `notified.json` 갱신: `{ sentAt: now, acknowledged: false,
   notificationId: <새 id> }`.

결과: 같은 날짜 알림이 **쌓이지 않고 하나로 갱신**된다(FR-007 (1),
User Story 2 Scenario 5).

## N5 — 탭 라우팅 (`src/app/notification-routing.ts`, 순수)

```ts
export function routeFromNotification(
  response: NotificationResponse | null,
): { day: DayDate } | null;
```

- `response === null` → `null`.
- `response.notification.request.content.data.day`가 `/^\d{4}-\d{2}-\d{2}$/`
  → `{ day }`.
- 그 외 → `null` (형식 불명이면 조용히 정상 시작 — 원칙 V).

## N6 — 화면 진입 (FR-006, SC-004)

- **웜**: `App.tsx`가 `port.onResponse(r => setPendingRoute(
  routeFromNotification(r)))`. `pendingRoute?.day`가 있으면
  `DiaryHomeScreen`에 `initialDay` prop으로 전달.
- **콜드**: `App.tsx` 마운트 시 `port.lastResponse()`를 1회 await,
  `routeFromNotification` 통과 → 같은 `initialDay` 경로.
- `DiaryHomeScreen`: `initialDay`가 주어지면 `initialScreen()`이 목록
  대신 그 날짜의 `detail` 상태를 첫 화면으로 돌려준다(006 FR-030
  패턴 확장) — **목록을 거치지 않는다**(FR-006). 탭 1회 = SC-004.
- 상세 진입 시(`openItem` 또는 `initialDay` 경로) 그 날짜의 `notified`
  엔트리를 `acknowledged: true`로 갱신 → 이후 재시도 재생성에도 알림
  없음(FR-007 (2)).

## N7 — 실패 시 침묵 (FR-005, SC-006)

`decideNotify`의 1번 갈래가 유일한 방어가 아니다 — `task.ts`(B2-9)도
`result.ok === false`면 애초에 `decideNotify`를 부르지 않는다. 이중
방어. 판정 거부(`unfinished`/`echo`/`language`/`empty`)·중단 전부
`result.ok === false`이므로 알림이 안 뜬다.

## N8 — 알림 권한 거부·삭제된 앱 (Edge Case)

- `requestPermission()`이 `"denied"`면: 자동 생성 자체는 켤 수 있게
  두되(생성은 알림과 무관하게 완주), 설정 화면에 "알림 권한이 없어
  완료를 알릴 수 없다 — 앱을 열어 확인하세요" 안내(spec Edge Case).
- `present()`가 권한 없어 실패해도 예외를 밖으로 던지지 않는다 —
  생성은 이미 저장됐고, 알림 실패가 그걸 되돌리지 않는다.

## N9 — 위반 주입 (계약 테스트)

| 주입 | 기대 |
|---|---|
| `NOTIFICATION_BODY`에 일기 본문 일부를 넣는다 | N2 위반 (FR-012) — 소스에 본문 참조 없음 |
| `decideNotify`가 `generationSucceeded: false`인데 `send: true` | N1-1 위반 (FR-005) |
| `present()`가 `trigger`에 시각을 넣는다 | N3 위반 — 소스에 `trigger: null`만 |
| `acknowledged: true`인데 `send: true` | N1-2 위반 (FR-007 (2)) |
| `routeFromNotification`이 형식 불명 응답에 `{ day: "???" }` | N5 위반 — `/^\d{4}-\d{2}-\d{2}$/` 통과분만 |
| 알림 탭이 목록 화면을 먼저 띄운다 | N6 위반 (FR-006, SC-004) |
