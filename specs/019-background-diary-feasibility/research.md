# Phase 0 Research: 백그라운드 자동 일기 생성 기술 검증

## 1. 백그라운드 트리거 메커니즘 — `expo-background-task`

**Decision**: `expo-background-task` + `expo-task-manager`를 쓴다.

**Rationale**:
- Context7(`/websites/expo_dev_versions_unversioned`, `expo-background-task`
  문서)로 확인한 사실: 안드로이드에서 이 패키지는 **WorkManager API**로
  구현되며, 이것이 `/speckit-clarify`에서 사용자가 확정한 "OS 표준 주기적
  작업 예약(WorkManager류)"과 정확히 일치한다.
- 최소 반복 간격은 **15분**이며 기본값은 12시간이다. 이 값은 "정확한
  시각"이 아니라 최소 간격일 뿐이고, 시스템이 배터리 절약을 위해 실제
  실행 시점을 늦출 수 있다 — spec.md 「OS 표준 주기적 작업 예약은 정확한
  시각을 보장하지 않는다」 edge case와 정확히 일치하는 공식 문서 근거다.
- `TaskManager.defineTask()`는 **전역 스코프**에서 호출해야 한다(모듈
  최상단, React 컴포넌트 밖) — 백그라운드 런타임이 JS 번들을 다시 읽어
  태스크를 찾기 때문이다. 이는 하네스를 어디에 두어야 하는지를 정하는
  제약이다(§4).
- Expo Go에서는 안드로이드 TaskManager 자체가 동작하지 않는다 —
  development build가 필수다. 이 저장소는 이미 Expo Go를 쓰지 않으므로
  (AGENTS.md, 헌법 원칙 I의 기술적 귀결) 추가 제약이 되지 않는다.

**Alternatives considered**:
- `expo-background-fetch`(구 API): Expo 문서가 `expo-background-task`로의
  전환을 권고하는 후속 관계다. 새 검증에 이미 대체된 API를 쓸 이유가 없다.
- 정확 시각 alarm 계열(`AlarmManager`/`expo-notifications`의 예약 알림
  등): `/speckit-clarify`에서 명시적으로 배제됐다 — 배터리 최적화와의
  충돌이 더 직접적이고 제조사별 차단이 더 강하다는 이유. 채택하지 않는다.

## 2. 실행 완주 여부를 판정하는 신호

**Decision**: `TaskManager.defineTask()`의 콜백이 `BackgroundTask.
BackgroundTaskResult.Success`/`Failed`를 반환하는 시점, 그리고 콜백 **진입
자체**(호출됐다는 사실)를 별도로 기록한다. 두 이벤트가 다르면 "시도는
됐으나 완주하지 못함"이 되고, 콜백 진입 자체가 없으면 "OS가 실행 기회를
주지 않음"이 된다.

**Rationale**: spec.md FR-004가 요구하는 3단계 구분(시도 없음/시도했으나
중단/완주)은 단일 성공 신호만으로는 만들 수 없다 — 콜백에 진입했다는
사실과 그 콜백이 끝까지 돌았다는 사실을 별개의 로그 줄로 남겨야, 코드가
죽어서 로그를 못 남긴 경우(entry 로그는 있으나 exit 로그가 없음)와 OS가
아예 태스크를 안 돌린 경우(entry 로그 자체가 없음)를 로그만 보고 구분할
수 있다.

**Alternatives considered**: WorkManager의 네이티브 로그(`adb logcat`의
`WM-WorkerWrapper` 등)만으로 판정 — 기기 로그는 앱을 열어야 확인 가능하고
앱이 완전 종료된 채 오래 방치되면 시스템 로그 버퍼가 순환되어 사라질 수
있다. 자체 파일 로그가 더 신뢰할 수 있는 1차 증거다. 네이티브 로그는
보조 증거로만 쓴다(quickstart.md에 `adb logcat` 확인 절차를 남긴다).

## 3. 권한 유효성 확인 — 004의 기존 감지 방식 재사용

**Decision**: `expo-media-library`의 `getLocation()` 실제 호출(004가 이미
확립한 방식 — 권한 없으면 예외를 던진다) 결과를 백그라운드 콜백 안에서도
그대로 시도해, 성공/예외를 검증 로그에 남긴다. 새 권한 감지 API를 만들지
않는다.

**Rationale**: AGENTS.md가 이미 "`expo-media-library`는 권한 조회 API를
주지 않는다 — `getLocation()`을 실제로 불러 봐야 안다"를 실측으로
확정했다. 백그라운드 컨텍스트에서 이 호출이 여전히 같은 방식으로
동작하는지(예외를 던지는지, 아니면 다른 실패 모양을 보이는지) 자체가
FR-010이 묻는 질문의 일부이므로, 기존 방식을 그대로 재사용해 그 차이를
드러낸다.

**Alternatives considered**: `expo-media-library`나 `expo-location`의
`getPermissionsAsync()`로 상태만 조회 — 004가 이미 이 API가 좌표 권한
세분화를 반영하지 않는다고 결론지었으므로(부여 상태만 보고 실제 좌표
접근 가능 여부는 못 봄), 이 검증에서도 같은 함정에 빠진다. 실제 호출
방식을 그대로 쓴다.

## 4. 하네스가 제품 파이프라인을 부르는 지점 — `wiring.ts` 재사용, 신규 어댑터 없음

**Decision**: `src/spike/background-diary-task.ts`의 `TaskManager.
defineTask()` 콜백 안에서 `src/app/wiring.ts`가 이미 노출하는 조립 함수를
그대로 호출해 파이프라인을 얻고 `pipeline.run()`을 부른다. 날짜는
`latestClosedDay(new Date())`(`day-boundary.ts`, 기존 함수 재사용)로
정해, 화면이 쓰는 것과 동일한 "마지막으로 닫힌 하루"를 대상으로 한다.

**Rationale**: plan.md의 핵심 제약(FR-005 — 헌법 경계 우회 금지)을
지키는 유일한 방법은 새 조립 로직을 만들지 않고 기존 진입점을 그대로
쓰는 것이다. `wiring.ts`의 문서화된 계약("파이프라인을 만드는 자리는
저장소에 여기 하나뿐이다")을 위반하지 않는다.

**Alternatives considered**: 하네스 전용의 간소화된 파이프라인 직접
호출(`selectBackend()`나 `createPipeline()`을 건너뛰고 어댑터를 직접
생성) — 006이 이미 "어댑터를 직접 만들어 쓰지 않는다" 위반으로 겪은
실패(파이프라인을 건너뛰어 저장이 한 번도 실행되지 않은 사고)와 같은
모양이 되므로 채택하지 않는다.

## 5. E1(한 번에 하나의 추론 엔진) 경합 — 막지 않고 관측한다

**Decision**: 이 스파이크는 화면의 생성 흐름과 백그라운드 태스크가 동시에
같은 엔진을 열려고 하는 경우를 막는 잠금 장치를 만들지 않는다. 대신 두
실행이 겹치는 상황을 인위적으로 재현(화면에서 "쓰기"를 누른 직후 태스크를
수동 트리거하는 디버그 버튼을 진단 패널에 추가)해 무슨 일이 일어나는지
관측하고 로그에 남긴다.

**Rationale**: plan.md Technical Context가 이미 명시한 대로, 이 경합이
실제로 벌어졌을 때 무엇이 깨지는지(둘 다 실패하는지, 하나가 오류 없이
이기고 다른 하나가 조용히 지는지, 크래시가 나는지)는 020+ 스펙이 잠금
설계를 하기 전에 반드시 알아야 하는 사실이다. 이번 스파이크의 범위를
넘는 잠금 구현을 미리 만들면, 그 잠금이 실제 문제를 얼마나 잘 막는지도
알 수 없는 채로 복잡도만 늘어난다.

**Alternatives considered**: 간단한 뮤텍스나 AsyncStorage 플래그로 미리
막기 — 이 검증의 질문("지금 아무 방어 없이 실행하면 무슨 일이 나는가")에
답하지 못하게 되므로 채택하지 않는다. 이것이 필요하다는 결론이 나오면
020+ 스펙의 요구사항이 된다.

## 6a. "화면 꺼짐·잠금"을 어떻게 기록하는가 — 정확한 감지 API 없음, `AppState`로 근사

**Decision**: Context7로 Expo 관리 패키지(`expo-background-task`,
`expo-task-manager`, `expo-keep-awake` 등)를 확인한 결과, 화면이
꺼져 있는지·기기가 잠겨 있는지를 조회하는 공식 API는 없다(007이
이미 안드로이드 `SafeAreaView` 같은 플랫폼 API 공백을 겪은 것과
같은 종류의 제약). 대신 RN 코어의 `AppState.currentState`(이
저장소가 이미 007에서 화면 이탈 감지에 쓰는 것과 같은 API)를
콜백 진입 시점에 읽어 `task-entered` 이벤트에 함께 남긴다.

**Rationale**: `AppState`는 "화면이 물리적으로 꺼져 있는가"를 알려
주지 않는다 — 그것은 애초에 이 검증이 완벽하게 답할 수 없는
질문이다(원칙 V가 요구하는 것은 "모르는 것을 모른다고 적는 것"이지
불가능한 정밀도를 지어내는 것이 아니다). 다만 `AppState`가
`"active"`(앱 UI가 포그라운드에 떠 있음)로 나오면, 그 실행은
FR-003이 배제하려는 "화면이 켜진 채 앱이 뒤로만 간 상태"에
해당할 가능성이 높다는 최소한의 신호는 준다. `"background"`나
`"inactive"`로 나오면 최소한 "앱 UI가 그 순간 전면에 없었다"는
사실은 확인된다 — 이것이 이 검증이 실측 가능한 한도 안에서
FR-003을 가장 정직하게 지키는 방법이다.

**Alternatives considered**: 네이티브 모듈을 직접 작성해
`PowerManager.isInteractive()`(안드로이드 API)를 호출 — 이 저장소가
005·011에서 겪은 "손으로 짠 JNI 브릿지"의 위험(R8/ProGuard 파손,
release에서만 깨짐)을 새로 만드는 것이므로, 이 스파이크의 범위에
비해 비용이 크다. `AppState`로 근사하고 그 한계를 findings.md에
명시하는 쪽을 택한다 — 정밀한 감지가 필요하다는 결론이 나오면
020+ 스펙의 과제가 된다.

## 6. 검증 하네스의 수명 — `src/spike/`로 격리, 제품 코드 미수정

**Decision**: 새 디렉터리 `src/spike/`에 하네스 전용 파일만 모으고,
제품 계층(`src/app/`, `src/diary/`, `src/inference/`)은 이 계획에서
한 줄도 수정하지 않는다. 유일한 예외는 `src/ui/DiagnosticsScreen.tsx`에
진단 위젯 진입점 하나를 추가하는 것이며, 이는 007·014가 이미 확립한
"진단 경로는 배포 빌드에서 닿지 않는 것이 보장된 자리"라는 기존 경계를
재사용하는 것뿐이다.

**Rationale**: 헌법 원칙 IV가 2026-08-12 되돌리기의 근거였던 "측정
장치와 제품이 뒤섞였다"는 실패를 반복하지 않으려면, 검증 코드가 제품
코드와 물리적으로 분리되어 있어야 한다 — 나중에 하네스를 통째로 지울 때
`git rm -r src/spike/`와 `DiagnosticsScreen.tsx`의 되돌리기 한 줄이면
충분해야 한다.

**Alternatives considered**: 기존 `src/inference/`나 `src/diary/`
안에 조건부 분기(`if (isBackgroundTrigger)`)로 얹기 — 003·011·012가
반복해서 겪은 "경계가 흐려지면 다음 기능이 그 틈으로 들어온다"는 패턴을
그대로 재현하므로 채택하지 않는다.

## 7. 등록 시 최소 반복 간격 — 15분(API 허용 최솟값)으로 고정

**Decision**: `BackgroundTask.registerTaskAsync()`의
`minimumInterval` 옵션을 WorkManager가 허용하는 최솟값인 **15분**으로
명시한다(`node_modules/expo-background-task`의 `BackgroundTaskOptions`
타입 정의로 단위가 분임을 확인, §1 기본값 12시간과는 다른 값을 골라야
하는 이유는 아래).

**Rationale**: 사용자가 구현 단계에서 "관측 주기를 짧게 해서 확인하면
안 되냐"고 질문했고, 이는 타당한 절충이다 — **다만 짧게 할 수 있는
축은 반복 간격이지 방치 시간이 아니다.** FR-008이 요구하는 "최소
24시간 이상의 실제 대기"는 Doze·앱 대기 버킷(App Standby Buckets)
같은 배터리 최적화 조건이 기기를 실제로 오래 안 건드려야 걸리기
때문이다 — 짧게 방치하고 확인차 화면을 켜는 순간 그 조건 자체가
사라진다. 반면 기본 간격(12시간)을 그대로 쓰면 24시간 방치 구간
안에서 실행 시도가 1~2회뿐이라, "이번엔 됐다/안 됐다"가 우연인지
패턴인지 구분할 표본이 부족하다. 그래서 **간격만 최솟값으로 좁혀
같은 24시간 안에서 시도 횟수(이론상 최대 약 96회)를 늘리고, 방치
시간(FR-008)은 그대로 24시간을 유지한다** — 이렇게 하면 관측
효율(시도 표본 수)과 관측 타당성(방치 조건 충족)을 모두 지킨다.

**Alternatives considered**:
- 간격도 방치 시간도 함께 줄이기(예: 1~2시간): 빠른 피드백은 얻지만
  Doze 진입에 필요한 시간을 충족 못 시킬 위험이 있다 — 짧은 방치에서
  "됐다"는 결과가 나와도 "긴 방치에서도 되는가"는 여전히 미확인으로
  남는다. FR-008을 고쳐야 하고, 그 완화가 findings.md의 결론을
  약화시킨다(이 기기·이 조건에서만 확인됐다는 제약이 하나 늘어남).
- 기본값(12시간) 그대로 두고 24시간에 1~2회만 관측: 코드 변경이
  없다는 장점은 있으나, 표본이 너무 적어 실패가 관측돼도 "일시적
  우연인지 근본적 차단인지" 가르기 어렵다.
