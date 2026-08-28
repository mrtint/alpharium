# Phase 0 Research: 시간대 지정 자동 일기 작성과 완성 알림

019의 findings.md·research.md가 이미 답한 것은 다시 조사하지 않는다 —
아래는 **020이 새로 결정해야 하는 것**만 담는다.

## 1. 로컬 알림 라이브러리 — `expo-notifications`

**Decision**: `expo-notifications`(~57)를 신규 의존으로 들여, **완료
직후 즉시 로컬 알림**(`scheduleNotificationAsync({ content, trigger:
null })`)만 쓴다. 예약 알림·`DAILY` 트리거·`TIME_INTERVAL` 반복은 쓰지
않는다.

**Rationale**:

- Context7(`/websites/expo_dev_versions_unversioned`, `expo-notifications`
  문서)로 확인: `scheduleNotificationAsync`가 `trigger: null`이면 즉시
  present되며, 반환값이 문자열 **notification identifier**다. 이 식별자를
  우리가 지정할 수 있어(콘텐츠의 안정적 식별에 쓰거나, 반환값을 저장) 날짜별
  dedup에 활용 가능하다.
- `addNotificationResponseReceivedListener(response => …)`가 탭 응답을
  준다. `response.notification.request.content.data`에 우리가 넣은
  `{ day }`가 그대로 들어온다 — 이걸 읽어 상세로 라우팅(FR-006).
- **콜드 스타트**: `getLastNotificationResponseAsync()`가 앱이 죽어 있던
  중 탭으로 열린 경우의 응답을 준다(`Promise<NotificationResponse |
  null>`). 리스너는 이미 실행 중인 앱에만 오므로, 콜드 경로는 이걸로
  따로 처리한다.
- **트레이 조회·해제**: `getPresentedNotificationsAsync()`로 지금 트레이에
  떠 있는 알림 목록을, `dismissNotificationAsync(id)`로 특정 알림을 제거.
  FR-007의 "미확인 알림이 이미 있으면 새로 쌓지 않고 갱신"을 이걸로
  구현한다(기존 것을 dismiss 후 재발행, 또는 같은 채널·같은 식별자로
  덮어쓰기).
- 안드로이드는 **notification channel**이 있어야 권한 프롬프트가 뜨고
  알림이 표시된다(`setNotificationChannelAsync`). 채널 1개
  (`diary-completed`, importance HIGH)를 앱 시작 시 보장한다.
- 안드로이드 13(API 33)+는 `POST_NOTIFICATIONS` 런타임 권한 필요 —
  `requestPermissionsAsync()`. 자동 생성을 켤 때 요청한다(FR-009와 같은
  시점).

**Alternatives considered**:

- `expo-notifications`의 `DAILY` 트리거로 "매일 오전 7시" 알림 자체를
  예약: 이건 **알림만** 예약할 뿐 그 시각에 일기가 생성돼 있다는 보장이
  없다. 019가 배제한 alarm-정밀 경로에 가깝고(안드로이드에서 DAILY는
  내부적으로 AlarmManager 계열), spec Assumptions가 명시적으로 배제.
  채택하지 않는다.
- RN 코어만으로 로컬 알림: RN 코어에 알림 API 없음. 서드파티 필수.
- `notifee` 등 비-Expo 라이브러리: Expo가 관리하지 않아 `expo install
  --check` 밖이고, autolinking·config plugin을 손으로 다뤄야 한다.
  `expo-notifications`가 이 저장소의 기존 관례(표준 Expo 모듈)와 맞다.

**남는 위험**: `expo-notifications`는 새 네이티브 모듈이므로 release의
R8/ProGuard에서 처음 도는 것을 확인해야 한다(AGENTS.md, 헌법 원칙 V) —
tasks에 release 재확인을 명시한다.

## 2. 백그라운드 트리거 — 019 경로를 그대로 제품화

**Decision**: `expo-background-task` + `expo-task-manager`,
`minimumInterval: 15`. 전역 스코프에서 `TaskManager.defineTask()`.
019의 `src/spike/background-diary-task.ts`가 검증한 구조를 **제품
코드로 다시 구현**하되(베끼지 않고 contracts/background-generation.md를
따른다), 콜백 안에서 `wiring.ts`의 `createAppPipeline()`을 재사용한다.

**Rationale**:

- 019 findings.md가 이 경로로 6/6 완주(`Success`)를 실기기 확인했다.
  같은 경로를 쓰는 것이 원칙 V("건너뛴 실기기 테스트는 통과가 아니다")를
  이미 만족한 상태에서 출발하는 유일한 방법이다.
- 019 research.md §7이 확정: `minimumInterval`은 하한선이지 보장이
  아니며, 15분으로 좁히면 24시간 안 시도 횟수(이론상 최대 ~96회)가
  늘어 SC-002/SC-003의 "1회 이상 시도"를 만족할 확률이 높아진다.
- **매 콜백이 조건 판정을 한다**: 019 하네스는 무조건 `pipeline.run()`을
  불렀지만, 020은 "지금이 목표 시각 근방인가 + 대상 하루가 아직
  안 쓰였나 + 자동 생성이 켜져 있나"를 먼저 본다(순수 함수
  `src/schedule/decision.ts`, contracts/schedule-decision.md). 조건이
  아니면 아무것도 안 하고 `Success` 반환(다음 기회를 기다림).

**Alternatives considered**:

- `expo-notifications`의 백그라운드 notification task
  (`Notifications.registerTaskAsync`): 이건 **수신된 알림**을 백그라운드에서
  처리하는 것이지, 우리가 원하는 "주기적으로 깨어나 생성"이 아니다.
  우리 앱은 푸시를 받지 않는다. 무관.
- `expo-background-fetch`(구 API): 019 research.md §1이 이미 배제.
- 목표 시각에 정확히 한 번 예약(alarm): spec Assumptions·Clarifications가
  배제.

## 3. 목표 시각 변경 시 — 예약 취소·재등록 (Clarifications 확정)

**Decision**: `registerTaskAsync`는 등록 상태를 갱신하는 idempotent
호출로 취급하고, 목표 시각이 바뀌면 `unregisterTaskAsync()` →
`registerTaskAsync({ minimumInterval: 15 })`를 순서대로 부른다.
**목표 시각 자체는 태스크 등록 파라미터에 넣지 않는다** — 콜백이 매번
설정 파일에서 읽어 판정하므로, 재등록의 실질적 효과는 "주기 타이머
리셋"이다.

**Rationale**:

- `minimumInterval`에는 "몇 시"라는 개념이 없다(분 단위 간격만). 목표
  시각은 우리 판정 로직의 입력일 뿐이다. 따라서 "이전 시각 기준 예약이
  남아 도는" 상황은 실제로는 **판정 입력만 바꾸면 다음 콜백부터 새 시각을
  본다** — 재등록 없이도 논리적으로는 맞다.
- 그런데 Clarifications가 "취소하고 재등록"으로 확정했다. 이유: 사용자
  멘탈 모델("9시로 바꿨으니 9시부터")과 맞추고, 재등록이 WorkManager
  주기를 리셋해 "방금 돈 실행 직후 설정을 바꿨을 때" 다음 콜백이 새
  간격으로 잡히게 한다. 재등록 지연은 FR-002 근사치 범위 안(Clarifications
  명시).
- **구현**: `settings.ts`의 save가 성공하면 `background-port.ts`의
  `reschedule()`(내부에서 unregister→register)를 부른다. on/off 토글도
  같은 경로(끄면 unregister만, 켜면 register).

**Alternatives considered**:

- 재등록 없이 판정 입력만 갱신: 논리적으로 충분하나 Clarifications와
  어긋난다. 채택하지 않는다.
- 목표 시각을 태스크 이름에 인코딩해 시각별로 다른 태스크 등록: 태스크가
  누적되고 `defineTask`는 전역 1회만이라 복잡도만 늘어난다.

## 4. 프로세스 경계 경합 잠금 — 파일 잠금 (FR-008, User Story 3)

**Decision**: `expo-file-system`의 `Paths.document/locks/
diary-generation.lock` 파일 하나로 잠금을 구현한다. 취득 시 파일에
`{ owner, acquiredAtMs }` 1줄을 원자적으로 쓰고, 이미 있으면 취득
실패. **stale 타임아웃**(예: 5분 — 019 실측상 최장 완주 2분 27초의 2배
+ 여유)을 넘긴 잠금은 죽은 것으로 보고 덮어쓴다. `pipeline.run()`이
이 잠금을 `deps.acquireLock?`로 주입받아, 1단계(day-writable) 다음,
2단계(instance-local `running`) 자리에서 함께 본다.

**Rationale**:

- 019 research.md §5가 "경합을 막지 않고 관측만" 했고, findings.md가
  "020+ 스펙의 과제"로 남겼다. 이제 그 과제다.
- `pipeline.ts`의 `running: Set<DayDate>`는 인스턴스 로컬이다 — 화면과
  백그라운드 태스크는 각자 `createAppPipeline()`을 불러 **다른 인스턴스**를
  만든다(wiring.ts 계약). 프로세스 안에서도 두 인스턴스가 동시에 살 수
  있고, 백그라운드 태스크는 별도 JS 런타임일 수도 있다. 인스턴스 로컬
  방어로는 부족하다.
- **왜 파일 잠금인가**: 이 저장소는 `AsyncStorage`가 의존에 없다(007
  research.md §2). `expo-file-system`은 이미 의존이고 원자적 쓰기
  (`writeAtomically` 패턴)가 이미 `store.ts`·`selection-store.ts`에서
  검증됐다. 뮤텍스는 단일 런타임 안에서만 유효하다.
- **왜 stale 타임아웃이 필요한가**: 잠금을 쥔 채 프로세스가 죽으면
  (백그라운드 태스크가 OS에 killed 되는 것은 019에서 관측 안 됐지만
  이론상 가능) 잠금이 영영 안 풀린다. `pipeline.ts`의 인스턴스 로컬
  `running`이 "앱이 죽으면 사라진다"로 이 문제를 피한 것과 같은 정신 —
  파일은 안 사라지므로 타임아웃으로 대신한다.
- **취득 실패 시 동작**: 백그라운드 태스크는 조용히 `Success` 반환(다음
  기회에 재시도 — FR-013 경로와 자연스럽게 합류). 화면은
  `already-running`과 같은 사용자 안내("이미 쓰는 중")를 보이거나 그
  결과를 기다린다(User Story 3 Acceptance Scenario 2).

**Alternatives considered**:

- `pipeline.ts` 안 건드리고 호출부(task.ts·DiaryHomeScreen)에서 잠금:
  두 곳이 각자 불러야 해서 한쪽이 빠뜨리면 조용한 경합. plan.md의
  "잠금 훅 판단"에서 배제.
- OS 파일 잠금(`flock` 류): `expo-file-system`이 노출하지 않는다.
- SQLite 트랜잭션: 새 의존(`expo-sqlite`), 저장 계층을 새로 만드는 것
  (spec Assumptions 위반).

**남는 위험**: 파일 잠금은 진짜 원자적 CAS가 아니다 — "존재 확인 후
쓰기" 사이에 다른 프로세스가 끼어들 수 있는 창이 이론상 있다. `expo-
file-system`의 `create()`가 이미 존재하면 던지는지(원자적 create) tasks
단계에서 실기기로 확인하고, 아니면 `.writing` 임시 파일 + `moveSync`
패턴(store.ts가 쓰는 것)으로 좁힌다. SC-005(100회 재현 0건)가 이걸
검증한다.

## 5. 배터리 최적화 예외 요청 — `expo-intent-launcher` (FR-010)

**Decision**: `expo-intent-launcher`(~57)를 신규 의존으로 들여,
`IntentLauncher.startActivityAsync(
'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS_SETTINGS')` 또는
패키지를 지정한 `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 인텐트를
자동 생성 **최초 켤 때 1회만** 띄운다. 거부 후에는 설정 화면 상시
링크가 `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`(목록
화면)로 이동시킨다.

**Rationale**:

- Context7로 확인: `expo-intent-launcher`는 Android 전용, Expo Go
  포함 지원, 시스템 인텐트를 앱에서 띄우는 표준 경로다. 이 저장소가
  005·011에서 겪은 "손으로 짠 JNI"의 위험이 없는 표준 모듈.
- 019 findings.md "다음 스펙에서 고려할 사항"이 정확히 이걸 지목했다:
  `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`는 표준 인텐트지만 남용
  시 스토어 정책 위반 → "왜 필요한지" 설명 화면이 함께 필요.
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 권한을 `AndroidManifest`에
  선언해야 다이렉트 요청 다이얼로그(앱 나가지 않고)가 뜬다. 선언 안
  하면 설정 목록 화면으로만 보낼 수 있다. config plugin
  (`plugins/`)으로 선언 — `with-release-signing.js`가 이미 이 패턴.
- **"최초 1회"의 구현**: `settings.ts`에 `batteryExceptionPrompted:
  boolean` 플래그. 자동 생성을 처음 켤 때 `false`면 요청 인텐트를
  띄우고 `true`로 저장. 이후 절대 자동으로 안 띄운다(FR-010 MUST NOT).

**Alternatives considered**:

- `Linking.openSettings()`(RN 코어): 앱의 설정 화면만 열고 배터리 예외
  화면으로 바로 못 간다. 사용자 여정이 길어진다.
- `expo-battery`의 `isBatteryOptimizationEnabledAsync()`로 상태를 읽어
  링크 문구를 조건부로: **유용하지만 선택적**. 없어도 FR-010은
  충족된다(항상 링크를 보이면 됨). tasks 단계에서 UX 비용 대비 판단 —
  이 research는 "필수 아님"으로 결론.
- 인텐트 없이 안내 문구만: FR-010이 "예외를 요청하는 경로를 제공"을
  MUST로 요구. 문구만으로는 불충분.

**남는 위험**: 제조사(삼성 One UI 등)마다 배터리 설정 화면 구조가 달라
인텐트가 정확한 화면으로 안 갈 수 있다. 019가 삼성 S22에서 adb
`dumpsys deviceidle whitelist`로 동등 상태를 만들었을 뿐 실제 설정 UI
경로는 안 밟았다. tasks의 실기기 검증에서 실제 인텐트 도착 화면을
확인하고, 어긋나면 fallback(설정 목록 화면 + 안내 문구)을 명시한다.

## 6. 알림 상태 저장 위치 — `DiaryEntry`와 분리

**Decision**: 날짜별 "알림 발송됨 + 사용자 미확인" 상태를
`Paths.document/preferences/notified.json`(맵: `{ [day]: { sentAt:
string; acknowledged: boolean } }`)에 둔다. `DiaryEntry`에 필드를
더하지 않는다.

**Rationale**:

- spec Key Entities가 "DiaryEntry에 더할지 별도 관리할지 계획 단계에서
  정한다"로 열어뒀다.
- `DiaryEntry`(`src/diary/types.ts`)는 헌법 원칙 III·IV의 방어선이 걸린
  타입이다 — 불변식이 "모델 식별자 없음, 점수 없음, 실패는 entry가
  안 됨"이다. 알림 상태는 일기의 속성이 아니라 **이 기능의 UX
  상태**다. 섞으면 다음 기능이 그 틈으로 들어온다(003·011·012가 반복
  경고한 패턴).
- 별도 파일은 하위 호환도 공짜다 — 옛 일기 파일을 건드릴 이유가 없다.
- 판정(순수 함수 `src/schedule/notify.ts`)이 이 맵과 "지금 생성이
  성공했는가"·"그 날짜 일기를 사용자가 열어봤는가"를 입력으로 받아
  "알림을 보낼지 / 보낸다면 기존 것을 갱신할지"를 돌려준다.

**Alternatives considered**:

- `DiaryEntry.notified?: {...}`: 위 이유로 배제.
- `expo-notifications`의 트레이 조회만으로 판정(별도 저장 없이):
  "사용자가 이미 열어봤다"는 트레이에 없다(열면 dismiss될 뿐, "봤다"는
  기록이 아님). FR-007 (2)를 못 지킨다. 저장이 필요하다.
- 알림 식별자만 저장: "acknowledged"를 표현 못 한다.

**"사용자가 그 날짜 일기를 열어봤는가"의 판정**: `DiaryHomeScreen`의
`openItem()`(상세로 진입)에서 그 날짜의 `notified.json` 엔트리를
`acknowledged: true`로 갱신한다. 알림 탭으로 들어온 경우도 같은 경로를
타므로 자연히 갱신된다.

## 7. 재시도 대상 선정 — 순수 함수, 009 범위로 제한 (FR-013)

**Decision**: `src/schedule/retry.ts`의 순수 함수가 `(selectableDays,
existingDiaryDays) => DayDate | null`을 계산한다. `selectableDays`(009의
`selectableDays(now)` 결과)에서 일기가 없는 가장 최근 하루 1개를
돌려주고, 전부 있으면 `null`. 백그라운드 콜백은 이 결과를 대상 하루로
삼는다.

**Rationale**:

- Clarifications가 "가장 최근 미완성 1개, 009 범위 안에서만"으로 확정.
- 009 범위 밖(그그제보다 오래된 날)은 애초에 `selectableDays`가 주지
  않으므로, 이 함수가 그 범위만 보면 자동으로 제약이 걸린다 — 별도
  경계 코드 불필요(009의 `latestClosedDay`/`selectableDays`가 04:00과
  3일을 이미 캡슐화).
- 순수 함수라 "재시도가 오래된 날을 건드리지 않는다"를 기기 없이
  테스트할 수 있다(위반 주입: 범위 밖 날짜를 `existingDiaryDays`에서
  빼도 결과가 안 바뀌는지).

**Alternatives considered**:

- 백그라운드 콜백 안에서 직접 날짜 계산: 04:00/3일이 `day-boundary.ts`
  밖으로 샌다(FR-021a 위반).
- "전날만" 고정: FR-013이 "가장 최근 미완성"을 요구 — 전날이 이미
  써졌고 그제가 비었으면 그제를 채워야 한다.

## 8. 알림 탭 → 상세 라우팅 — 콜드/웜 경로 분리

**Decision**:

- **웜(앱 실행 중)**: `App.tsx`에서
  `addNotificationResponseReceivedListener`를 등록,
  `response.notification.request.content.data.day`를 읽어
  `DiaryHomeScreen`에 `initialDay` 류의 prop으로 전달 → 상세로 전이.
- **콜드(앱이 죽어 있다 탭으로 열림)**: `App.tsx` 마운트 시
  `getLastNotificationResponseAsync()`를 1회 await, 응답이 있으면 같은
  `day`를 같은 경로로 전달.
- 판정(응답 → 어느 화면)은 순수 함수 `src/app/notification-routing.ts`
  (`(response) => { day: DayDate } | null`)로 떼어 테스트.

**Rationale**:

- Context7 확인: 리스너는 실행 중인 앱에만 오고, 콜드 스타트는
  `getLastNotificationResponseAsync()`가 별도로 답한다. 둘 다 없으면
  "알림으로 안 열렸다"(정상 시작).
- `DiaryHomeScreen`은 이미 화면 전이를 `src/app/state.ts` 순수 함수에
  위임하는 구조다(`toDetail`, `initialScreen` 등). `initialDay`가
  주어지면 `initialScreen`이 목록 대신 그 날짜 상세를 첫 화면으로
  돌려주게 확장 — 006 FR-030 패턴.
- FR-006("목록을 거치지 않고 상세로"): `initialScreen`이 직접
  `detail` 상태를 돌려주면 목록을 거치지 않는다. SC-004(탭 1회) 충족.

**Alternatives considered**:

- `expo-router`/딥링크 URL: 이 저장소는 네비게이션 라이브러리를 안
  쓴다(DiaryHomeScreen.tsx research.md §5). `data.day` 직접 전달이
  기존 관례와 맞다.
- 알림 `data`에 전체 entry를 실어 상세를 바로 렌더: 알림 payload 크기
  제한·직렬화 위험. `day`만 싣고 화면이 `store.load(day)`(기존 경로).

## 9. `src/spike/` 제거 범위

**Decision**: 이 스펙에서 `git rm -r src/spike/`를 하고, 아래를 함께
되돌린다:

- `src/ui/DiagnosticsScreen.tsx`의 `DiagnosticsBackgroundPanel` 진입점
  (019 T010이 추가한 한 곳).
- `scripts/check-constitution.mts`의 `checkSpikeFile` import·호출.
- `scripts/constitution-rules.ts`의 `checkSpikeFile` 함수 +
  `SPIKE_TOUCHES_PRODUCT_LAYER` 상수 (또는 `src/schedule/` 경계용으로
  개명·재활용 — tasks에서 판단).
- 관련 테스트(`__tests__/spike/`).

**Rationale**:

- 019 plan.md 「검증 종료 후 하네스의 운명」이 "020+ 스펙이 바로
  이어지면 그 스펙에서 결정"으로 넘겼고, 지금이 그 스펙이다.
- 하네스를 남겨두면 제품 코드와 검증 코드가 다시 공존해 헌법 원칙 IV의
  2026-08-12 되돌리기 교훈에 어긋난다. 020이 제품 경로를 완성하므로
  하네스는 불필요.
- 하네스가 검증한 지식(전역 defineTask, wiring 재사용, 권한 재확인)은
  **contracts/로 이전**되어 코드가 아니라 계약으로 산다.

**Alternatives considered**:

- 하네스를 020의 출발점 코드로 리네임해 재사용: 베낀 코드가 되어
  "계약 먼저" 원칙(개발 방식 MUST)과 어긋나고, 검증 전용 로그
  (`verification-log`)가 제품에 딸려 온다.
- 하네스 유지 + 020을 그 옆에 신규 작성: `src/spike/`가 영구
  디렉터리가 되어 "지울 수 있는 검증 코드"라는 원래 설계가 무너진다.

## 결정 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 로컬 알림 | `expo-notifications`, 완료 직후 `trigger: null` | Context7, 019 alarm 배제 계승 |
| 백그라운드 트리거 | 019 경로 제품화(`expo-background-task`, 15분), 콜백이 조건 판정 | 019 findings 6/6 완주 |
| 시각 변경 | unregister→register(주기 리셋), 시각은 판정 입력 | Clarifications |
| 경합 잠금 | `expo-file-system` 파일 잠금 + stale 타임아웃, `pipeline.run()`에 옵셔널 주입 | 019 §5 미해결 과제, 003·017 주입 패턴 |
| 배터리 예외 | `expo-intent-launcher` 인텐트, 최초 1회 + 상시 링크 | 019 findings "다음 스펙", FR-010 |
| 알림 상태 저장 | `preferences/notified.json`, `DiaryEntry`와 분리 | 원칙 III·IV 경계 |
| 재시도 대상 | 순수 함수, `selectableDays`(009) 범위로 자동 제한 | Clarifications, FR-021a |
| 탭 라우팅 | 웜=리스너, 콜드=`getLastNotificationResponseAsync`, 판정은 순수 함수 | Context7, DiaryHomeScreen 관례 |
| `src/spike/` | 제거(git rm) + 진입점·검사 규칙 되돌리기 | 019 plan 「하네스의 운명」 |
