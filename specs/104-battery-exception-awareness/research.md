# Research: 안드로이드 배터리 예외 인지

## R1. 예외 상태를 어떻게 읽는가
- **결정**: `expo-battery`의 `isBatteryOptimizationEnabledAsync()`(안드로이드 전용, 반환 `true` = 최적화 켜짐 = 예외 없음).
- **근거**: 설계문서 §3.1·로드맵의 소유자 결정(2026-10-15). 버전은 `npm view expo-battery dist-tags`에서 `sdk-57: 57.0.3`(2026-10-24 확인). 설치는 `npx expo install expo-battery`로 해 호환을 검증한다(AGENTS: 패키지 버전을 추측하지 않는다).
- **대안**: 자체 네이티브 모듈(비용·위험이 큼), `expo-intent-launcher`로 결과 수집(예외 상태를 돌려주지 않는다).
- **번역**: `true`→`restricted`, `false`→`exempt`, 던짐·iOS→`unknown`.

## R2. 권한이 늘지 않는가
- 57.0.3 패키지의 `android/src/main/AndroidManifest.xml`에 `uses-permission`이 없다(`npm pack` 풀어 확인). 네이티브는 `PowerManager.isIgnoringBatteryOptimizations(packageName)`만 부르며 이 호출은 권한이 필요 없다.
- **확인 방법(구현 중)**: `expo prebuild --platform android --clean` 뒤 `dumpsys package com.a810labs.pocketlog`에 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`가 없고 `blockedPermissions`(065)가 유지되는지.

## R3. 헤드리스(백그라운드 잡)에서 읽히는가 — 가정
- 네이티브가 `appContext.reactContext`의 `applicationContext`로 `PowerManager`를 얻는다(소스 읽기) — Activity가 필요 없다. 헤드리스 JS도 React context가 있어 읽힐 것으로 본다. **실기기로 확인하지 않았다**(quickstart Q3).
- 읽기가 던지면 `unknown`으로 삼켜 지연 0 — 해롭지 않다. 이 경우 완성 알림만 오게 하는 효과가 그 실행에서 일어나지 않는다.

## R4. 네이티브 쪽 `null` 함정
- 네이티브는 `powerManager?.isIgnoringBatteryOptimizations(packageName) == false`를 「최적화 켜짐」으로 돌려준다. `PowerManager`가 `null`이면 `null == false`가 거짓이라 `false`(= 최적화 안 켜짐)가 돌아오고 우리는 `exempt`로 번역한다 — 즉 시스템 서비스를 못 얻은 기기는 「예외 있음」으로 잘못 읽힌다.
- `PowerManager`가 `null`인 안드로이드 기기는 사실상 없어 받아들이되 **관측되지 않은 위험으로 기록**한다(원칙 V). 잘못 `exempt`면 쓸 차례 알림이 30분 늦을 뿐이고 안전장치(저장된 뒤에만 거둠)는 그대로라 하루가 비지 않는다.

## R5. 지연 30분의 근거
- 백그라운드 잡 최소 간격 15분(`background-port.ts` `MINIMUM_INTERVAL_MINUTES = 15`), 쓰기 한도 600초(`assembly.ts`)의 합 약 25분 + 여유. 사람이 정한 값이다(측정이 아니다). 상수 `REMINDER_DELAY_MINUTES = 30`에 그렇게 적는다.
- 지연을 겁 때 겨냥하는 날(`day`)은 정각 기준으로 계산한다 — 하루 경계 규칙(DB11)은 건드리지 않는다. 지연은 0 이상 60 미만 정수여야 한다(정각의 시를 넘기면 `includesTodayAtHour`의 「그날/어제」 계산이 어긋난다).

## R6. 거두는 규칙은 바꾸지 않는다
- 예약은 `reconcileOnce`가 `writtenDays`(일기 파일 목록)로만 지운다. 계획 함수는 `written.has(day)`인 날을 빼고, 맞추기가 계획에 없는 걸린 예약을 취소한다. 지연은 `at`만 바꾸고 `day`·`id`를 바꾸지 않으므로 이 경로는 그대로다.
- RC8(지난 시각이지만 아직 전달 전일 수 있는 예약을 둔다)은 `s.at` 기준이다. 지연이 적용된 새 예약이 같은 `id`로 걸리면 expo가 `identifier`가 같은 예약을 바꿔 끼운다(기존 R16 `same()` 설명).
- **알려진 경계(받아들임)**: 정각에 이미 전달된(`presented`) 예약이 있는 날에, 상태가 `restricted`→`exempt`로 바뀌어 정각+30분이 아직 오지 않았을 때 맞추면 같은 날 알림이 한 번 더 걸린다. 상태가 정각 직후 30분 안에 바뀌는 드문 경우뿐이고 알림 하나가 중복될 뿐 일기를 잃지 않는다.

## R7. 맞추기 호출 시점과 예외 변경 반영
- 맞추기는 이미 앱 훅(마운트·설정·이름 변경·전경 복귀·쓰기 칸 비움)과 태스크 끝에서 돈다. 설정 목록에서 돌아오면 `AppState → active`로 `useReminderSync` 효과 B가 맞추기를 다시 부른다 — 새 호출 시점이 필요 없다. 맞추기가 상태를 매번 읽으므로 저장·캐시가 없다.

## R8. 설정 꼬리표
- `usePermissionTags`가 이미 전경 복귀에 다시 읽는다. `PermissionFacts`에 `battery`를 더하고 `permissionTagFor`에 `battery` 갈래를 넣는다(`exempt`→`allowed`, `restricted`→`denied`, `unknown`→`unread`). `PermissionTrailing`은 `unread`면 꼬리표 없이 화살표만 그리므로 iOS·모름은 지금 모습 그대로다. 문구는 기존 `permAllowed`·`permDenied`.
- 055의 「배터리는 상태를 읽을 수 없어 꼬리표가 없다(FR-025)」 서술은 이 변경으로 틀리므로 `permission-tags.ts` 머리 주석과 055 계약의 해당 줄을 고친다.

## R9. 홈 안내의 신호원
- 앱 열기 자동 쓰기는 `DiaryHomeScreen`의 057 effect에서 `generate(..., { auto: true })`로만 시작한다(`rearmAutoWrite`로 연 알림 누름 쓰기도 같은 effect). 「쓰기」 버튼은 `auto`를 주지 않는다. 그래서 `generate`의 성공 분기(`result.ok && options.auto === true`)에 `onAutoWriteSaved?.(params.day)` 한 줄을 더하면 spec FR-011의 대상이 정확히 잡힌다.
- 실패·그만두기·`already-running` 막힘에서는 부르지 않는다(spec 시나리오 6).
- 합류한 남의 쓰기(백그라운드가 쓰던 쓰기)는 `generate`를 거치지 않으므로 대상이 아니다 — 맞다(백그라운드가 완주한 경우다).

## R10. 안내를 어디에 그리는가
- `DiaryListScreen`의 `stripBlock`이 「스트립 + `Notices`」를 그린다. 쓰는 중 갈래에는 안내를 두지 않고(spec: 쓰는 동안 안 보임), 비-쓰기 갈래의 `Notices` 아래에 `BatteryNotice` 한 줄을 둔다. 화면 컴포넌트는 `expo-*`에 닿지 않는다 — 문구·콜백을 props로 받는다.
- 시각 디자인은 `design/DESIGN.md`·토큰을 따른다(구현 시 먼저 읽는다). 보드 밖 문구이므로 승인 기록은 spec Clarifications에 있다.

## R11. 닫은 시각 기록
- `skip-store.ts`와 같은 층·모양: `preferences/battery-notice-dismissed.json`, `{ "at": <epoch ms> }`. 읽기는 던지지 않고 깨짐·없음→`null`. **읽지 못함(통로 예외)과 없음을 가른다**: 통로 예외는 「모름」이므로 안내를 띄우지 않는다(spec 엣지: 기록을 읽지 못하면 띄우지 않는다). 없음·깨짐은 「닫은 적 없음」이다 — 깨진 파일은 닫은 적 없는 것으로 보되 쓰기에서 덮는다.
- 7일은 `Date.now()` 밀리초 차이(7 × 24 × 60 × 60 × 1000)다. 하루 경계(자정)를 쓰지 않는다 — 일기의 하루가 아니라 안내를 숨기는 기간이다. `now`를 인자로 받아 테스트한다.
- 069 G-1 드리프트 가드: `scripts/layer1/baseline.ts`의 설정 파일 표에 한 줄(`delete`)을 더한다.

## R12. 해제 조건 — 설정에서 돌아오면
- 안내가 떠 있는 동안 `AppState → active`마다 상태를 다시 읽고 `restricted`가 아니면 숨긴다. 따로 토스트를 띄우지 않는다(spec FR-013). 닫기와 별개다(닫기는 시각을 남긴다, 예외를 주어 사라진 것은 남기지 않는다).

## R13. 문서·기록 정합
- 085 spec FR-019·research의 「예외 읽는 통로를 들이지 않는다」, 055 FR-025를 고친다(spec FR-018). AGENTS의 「자동 쓰기·알림·기록」 줄에 한 줄. 로드맵 4번은 완료 처리 때 갱신(kickoff 8단계).

## R14. 테스트 배치
- logic(`.ts`): `battery-exception-port`(상태 번역·플랫폼), `reminder-plan`(지연), `reminders`(전달·재예약), `reminder-deps`(조립), `permission-tags`(battery), `battery-notice`(판정), `battery-notice-store`, 소스 계약(주석 제거 후 읽기: `expo-battery` 호출은 통로 한 곳, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 부재, 문구는 카탈로그).
- ui(`.tsx`): `use-battery-notice`(훅), `SettingsScreen` 꼬리표, `DiaryListScreen` 안내, `DiaryHomeScreen` 저장 신호.
- 조립(상태·이유 문자열을 공유하는 두 부품): 예외 있음 + 쓰기 저장 → 실제 `reconcileReminders`가 지연된 예약을 알림 전에 거두는 것(`reminders.test.ts` 안).
- 위반 주입: 지연 판정을 `restricted`에도 걸어 보고 잡히는지, 취소 조건을 「쓰는 중」으로 바꿔 보고 잡히는지.
