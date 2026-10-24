# Quickstart: 104 검증

## 기기 없이 (항상 돈다)

```bash
git branch --show-current                # 104-battery-exception-awareness
npx jest __tests__/schedule/battery-exception-port.test.ts __tests__/schedule/reminder-plan.test.ts \
  __tests__/schedule/reminders.test.ts __tests__/schedule/reminder-deps.test.ts --selectProjects logic
npx jest __tests__/app/permission-tags.test.ts __tests__/app/battery-notice.test.ts \
  __tests__/app/battery-notice-store.test.ts --selectProjects logic
npx jest __tests__/ui --selectProjects ui -t "battery"
npm test && npm run lint
```

위반 주입(되돌린다): ① 지연을 `restricted`에도 걸기 → RD1·RC10이 실패 ② 맞추기 취소 조건을 「쓰는 중」으로 → RC12 실패 ③ 안내 판정에서 `unreadable`을 참으로 → BN2 실패.

## 권한 (SC-006)

```bash
npx expo install expo-battery
npx expo prebuild --platform android --clean
~/Library/Android/sdk/platform-tools/adb shell dumpsys package com.a810labs.pocketlog | grep -i "REQUEST_IGNORE_BATTERY"   # 비어야 한다
```

## 실기기 SM-S901N dev (건너뛴 실기기 테스트는 통과가 아니다)

설치는 debug APK를 지우지 않는다(`pm clear`·재설치는 모델 ~2GB를 지운다). 네이티브가 바뀌었으므로(expo-battery) 빌드는 필요하지만 앱 데이터는 보존한다.

- **Q1 (SC-004)** 예외를 끈 채 설정을 연다 → 배터리 행 꼬리표 「허용 안 함」. [배터리 행] → 설정에서 「제한 없음」 → 돌아오면 「허용됨」(토스트 없음).
- **Q2 (SC-005)** 예외를 끈 채 앱 열기 자동 쓰기가 저장되면 홈에 안내. 닫으면 사라지고 다음 자동 쓰기 뒤에도 7일 안에는 안 뜬다(시각은 `run-as`로 `battery-notice-dismissed.json`의 `at`을 과거로 옮겨 7일 뒤를 흉내). [설정 열기] → 예외 → 돌아오면 사라진다. 쓰는 동안에는 안 보인다.
- **Q3 (가정 확인 — 헤드리스 읽기)** 예외를 준 채 화면을 끄고 강제 잡(`cmd jobscheduler run -f …`)을 목표 시각 직후에 돌린다. 쓰기 저장 뒤 걸린 쓸 차례 예약이 정각+30분인지(개발자 화면 「쓸 차례 알림 · N개 예약 · 다음 …」 또는 `dumpsys alarm`), 완성 알림만 오고 쓸 차례 알림이 뜨지 않는지(SC-001).
- **Q4 (SC-002)** 예외를 준 채 잡을 돌리지 않고 정각+30분이 지나면 쓸 차례 알림이 뜬다.
- **Q5 (SC-003/007)** 예외를 끈 채 쓸 차례 알림이 정각에 걸린다(삼성은 얼림으로 미뤄질 수 있음 — 알려진 한계).
- **Q6 (코드 리뷰 지적 — 레이아웃)** 쓴 날 화면에서 홈 안내가 보일 때 첫 화면 본문 노출을 잰다 — 글꼴 1.0배·≈2.0배, 가능하면 작은 화면(SE급, 667pt)에서 안내가 없을 때와 비교해 본문이 몇 줄 줄었는지, 안내가 스트립과 함께 접히는지(스크롤), [닫기]·[설정 열기]를 누를 수 있는지. AGENTS 「작은 화면의 쓴 날(100)」의 기준(1.0배에서 2줄 이상)을 넘는지 적는다. 이 측정은 아직 없다.
- **소크(완료 조건 아님)** 예외를 준 채 하룻밤 두고 시도 기록의 `백그라운드 · 썼음`과 시각을 읽는다.

기록: 본 것·못 본 것을 이 파일 아래에 적는다(완료 처리 때).
