# Research — 090

## R1. iOS는 언제 깨우는가
- **Decision**: OS 정책으로 받아들인다 — 깨운 기회를 버리지 않는 쪽만 고친다.
- **Rationale**: `expo-background-task` iOS는 `BGProcessingTaskRequest`(`earliestBeginDate +15분`, `requiresNetworkConnectivity = true`, `requiresExternalPower = false`) 하나를 낸다
  (`node_modules/expo-background-task/ios/BackgroundTaskScheduler.swift:92-95`). 087: 충전·Wi-Fi일 때만 15~30분 간격, 충전 없는 27시간 0회.
- **Alternatives**: 자체 스케줄러·`BGContinuedProcessingTask`(범위 밖, 소유자 방향 A), 네트워크 조건 패치(dasd 로그가 원인으로 가리킬 때만).

## R2. 따라잡기 몫을 언제 쓰는가
- **Decision**: `decision.kind === "write"`일 때만(파이프라인을 부르기 직전).
- **Rationale**: 078 상한은 「계속 실패하는 날을 하루 종일 다시 돌리지 않기」 — 그 비용은 파이프라인(모델)이다. 건너뜀은 미리보기 읽기뿐. 087 10-16의 15:38 `재료 없음` 뒤 `이미 한 번 시도함` 둘이 실례.
- **Alternatives**: 건너뜀도 N회까지 허용(숫자를 새로 정해야 함 — YAGNI).

## R3. 보이지 않는 홈
- **Decision**: iOS이고 마운트 때 `AppState.currentState === "background"`면 첫 판정 보류, `change → active`에서 판정.
- **Rationale**: iOS 백그라운드 재실행은 앱 프로세스를 평소대로 띄워 `App.tsx`가 그려진다(080). `"background"`만 본다 — 사용자 실행의 `inactive`/`unknown`은 곧 `active` 변화가 오지만,
  보수적으로 확실한 갈래만 막는다. 안드로이드는 헤드리스가 `App.tsx`를 그리지 않아 적용하지 않는다(078 경고).
- **Alternatives**: 태스크가 홈 쓰기의 끝을 기다리기(로드맵 안 — 백그라운드로 뜬 홈의 쓰기는 태스크가 끝나면 iOS가 멈추므로 기다림이 길어져 예산을 쓴다; 홈이 시작하지 않는 쪽이 단순).

## R4. 예산 만료를 JS로
- **Decision**: 로컬 Expo 모듈 `modules/pocketlog-bg-expiry`(iOS)가 `NotificationCenter`의 `Notification.Name("onTasksExpired")`를 관찰해 이벤트 `onExpired`를 보낸다.
  JS 통로(`bg-expiry-port.ts`)는 `requireOptionalNativeModule`로 읽고 없으면(안드로이드·jest) no-op.
- **Rationale**: expo는 만료 때 그 이름으로 게시하지만(`BackgroundTaskAppDelegate.swift`) 자기 관찰자가 `userInfo["url"]` 가드로 버린다(`BackgroundTaskModule.swift:75`).
  Expo 자동 링크는 저장소 `modules/`의 로컬 모듈을 기본으로 찾는다. 새 npm 의존성 0.
- **만료 줄 모양**: 만료된 시각의 새 줄(`path: background`, `outcome: expired`) — 시작 줄은 그대로 두어 뒤에 이어 끝나면 끝남 갈래로 바뀐다(둘 다 보인다, spec Edge Cases).
- **구독 범위**: `runAutoDiaryTask` 한 번의 실행 동안만(시작에 구독, 끝에 해제) — 돌지 않을 때의 만료는 줄이 없다.

## R5. 깨운 순간의 앱 상태
- **Decision**: 시작 줄에 옵셔널 `launch: "active" | "background"`. 통로 `launch-state-port.ts`가 호출 시점 `require("react-native").AppState.currentState`를 읽는다(066: 동적 import 금지). 그 밖의 값·실패는 기록하지 않는다.
- **Rationale**: lldb 강제 깨우기(앞)와 OS 깨움(뒤)을 기록으로 가른다. `src/schedule/`은 `AppState`를 직접 참조하지 않는다(024 규칙 — 판정 입력이 아니라 기록 값이다).

## R7. iOS CPU 감시 (구현 중 실기기)
- **관측**: 고친 빌드의 OS 깨움(11:23:57, `launch: background`)이 51초 만에 `Pocketlog.cpu_resource_fatal-2026-10-18-112448.ips` — 「48 seconds cpu time over 51 seconds (95%), exceeding limit of 80% cpu over 60 seconds」, `Action taken: Process killed`. 고치기 전 빌드의 11:04 실행도 11:07 같은 보고서. 087 lldb 강제 실행(앞)은 이 감시가 걸리지 않아 완주했다.
- **Decision**: `patch-package`로 `BackgroundTaskScheduler.swift`의 요청을 `requiresExternalPower = true`·`requiresNetworkConnectivity = false`로(소유자 2026-10-18 — 추천안 A).
- **Rationale**: 외부 전원을 요구하는 처리 작업은 CPU 감시가 꺼진다(WWDC19, Apple 포럼 690666·675166 — 충전 중에도 죽었다는 보고가 있어 실기기로 확인). 087에서 깨움은 이미 충전 중에만 왔다 — 잃는 것이 없다.
- **Alternatives**: 로컬 모듈에서 `BGTaskScheduler.submit` swizzle(새 의존성 없음, 덜 투명·조용히 무력해질 수 있음), 스레드·쉼으로 80% 아래(본문이 몇 배 느려져 예산을 넘긴다).

## R6. 문구
- **Decision**: `permBatteryHintIos` → 「충전 중이고 저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」(clarify), 062 `CHANGED_AFTER_GOLDEN`. 새 문구 `expired: "시간 예산이 끝남"`, 상태 꼬리 「· 앞」/「· 뒤」 — `attempts` 영역(078 뒤에 생긴 영역이라 골든 밖인지 확인 후 처리).
