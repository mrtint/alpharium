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

## 실기기 기록 (2026-10-25, SM-S901N, dev 빌드)

설치: `npx expo run:android --no-bundler`(앱 데이터·모델 보존). 병합 매니페스트·기기 `dumpsys`에 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 없음(SC-006 ✓). 기기 조작은 `adb shell input tap`·`screencap`, 예외는 `adb shell cmd deviceidle whitelist ±com.a810labs.pocketlog`로 바꿨다(앱 개요: 이 목록이 `isIgnoringBatteryOptimizations`와 같다 — 설정 화면 꼬리표가 실제로 따라 바뀌어 확인됨).

**본 것**
- **Q1 ✓ (SC-004 일부)**: 예외 있음 → 설정 배터리 행 「허용됨」, `whitelist -`로 예외를 빼고 앱을 앞으로 다시 열면 「허용 안 함」(토스트 없음). 반대 방향은 아래 Q2의 [설정 열기] 뒤 확인.
- **Q2 ✓ (SC-005 일부)**: 예외 없음 + 앱 열기 자동 쓰기가 **저장된 뒤** 홈에 안내(「배터리 사용 제한을 풀어 두면 화면이 꺼진 채로도 일기를 써드릴 수 있어요」 + [설정 열기] [닫기])가 뜬다(10-25, 10-24 두 번). 쓰는 중에는 없다. 날을 옮겨도(10-23 안 쓴 날) 안내가 남는다(FR-011).
- **FR-013 ✓**: [설정 열기] → 삼성 「배터리 사용 관리」 목록이 열린다 → `whitelist +`로 예외를 준 뒤 뒤로 돌아오면 안내가 사라진다(토스트 없음).
- **Q6 일부**: 글꼴 1.0배 SM-S901N — 안내가 있을 때 첫 화면에서 본문이 약 5~6줄 보인다(캐러셀 아래 y≈1520에서 시작해 화면 하단까지), 안내가 없을 때(y≈1335에서 시작)는 약 7줄. 기준(2줄 이상)을 넘는다. **≈2.0배(font_scale 2.0)에서 안내가 떠 있는 첫 화면은 아직 못 쟀다**(그 설정에서는 자동 쓰기가 `photos` 실패로 안내가 서지 않았다).
- **관찰 — 꼬리표 줄바꿈**: 「허용 안 함」이 보조 줄 아래 줄로 내려간다(「허용됨」은 오른쪽). 기존 `flexWrap` 행 동작, 기능은 맞다. 소유자가 보고 정한다.

**관찰 — 이 변경 밖의 문제 둘**
1. **쓰기가 `photos` 단계에서 곧 실패하는 일이 반복됐다**(`write-failures.json`, 21:56·22:03·22:04·22:20·22:24·22:33·22:38 KST). 성공도 있었다(10-25 22:22, 10-24 22:23 — 둘 다 앱을 `force-stop` 뒤 다시 연 첫 쓰기). 실패 뒤에는 같은 프로세스에서 다시 시작하지 않는다(「한 번」). 실패 시각이 앱 시작 약 5~25초 뒤라 사진 목록·모델 준비 경쟁이거나 시드 사진(`PocketlogSeed/` 폴더, 같은 사진 반복)과 관련일 수 있으나 **원인은 미확인**이다. 이 변경이 건드린 코드가 아니다(`photos`는 사진 읽기·캡션 단계). 원인 후보: 앞 쓰기 뒤 다시 쓸 때 llama.rn의 「Exact media prompt reuse」 상태 복원(`Restored multimodal state checkpoint`)이 시드 사진 반복에서 쓰이는 것. 다음 확인: 한 프로세스에서 같은 날을 다시 쓰는 경로가 아니라 새 프로세스의 첫 쓰기가 실패하는 조건(앞 성공 뒤 `files/vision-cache`가 남은 날인가)을 가른다.
2. **로드맵 「자동 쓰기가 재료 없는 최근 날에 막혀 오래된 날을 못 쓰는가」를 재현했다**: 22:00 지난 뒤 오늘(10-25)에 재료가 없고 어제(10-24)에 사진 3장이 있을 때 앱 열기 자동 쓰기 결과가 `no-material`이었다(`auto-write-attempts.json` 22:20 KST, 어제를 시도하지 않음). 오늘에 사진을 심자(`seed:day rich 2026-10-25`) 그 날이 먼저 써졌다. → 그 과제는 「미검증」이 아니라 재현됐다 — 로드맵 반영은 따로 한다.

**2026-10-26 추가로 본 것**
- **Q2 ✓ (닫기)**: 1장짜리 10-24를 자동 쓰기로 저장하자 안내가 뜨고(예외 없음), [닫기]를 누르면 안내가 사라지고 `preferences/battery-notice-dismissed.json`에 `{"at":1792966738622}`(닫은 시각 epoch ms)가 쓰였다.
- **Q3 일부 ✓ / Q5 ✓ (SC-001·SC-003 알림 시각)**: `dumpsys alarm`으로 앱의 쓸 차례 예약을 읽었다. 예외 있음(`whitelist +`)이면 앱을 다시 열 때 7개가 **22:30**(정각+30분, 정확 알람)으로, 예외를 빼고 앱을 다시 열면 **22:00**(정각, 1시간 창 inexact)으로 바뀐다 — 앞으로 돌아올 때의 재맞추기(FR-007)도 기기에서 확인됐다.
- **쓰기 `photos` 실패의 원인 단서**: 실패는 `vision` 단계의 `vision-failed: failed`(`console.warn`을 잠깐 넣어 읽음, 되돌림). 시드 사진이 1×1 검은 픽셀 템플릿(`seed-template.jpg`)이고 llama.rn이 `Exact media prompt reuse … Restored multimodal state checkpoint`를 쓴 직후 실패한다. 성공은 드물게만 있었다(1장 날 1회). 시드 이미지의 한계일 가능성이 크고 실사진(예: e2e 표본)에서는 7일 전까지 잘 쓰였다 — 이 변경과 무관해 보이나 **원인은 미확인**이다.

**못 본 것 (남음)**
- Q2: 7일 안에는 다음 자동 쓰기 저장 뒤에도 안내가 안 뜨는지(기기), 닫은 시각을 8일 전으로 고치면 다시 뜨는지(기기). 단위 테스트(`battery-notice.test.ts`·훅 테스트)에는 있다.
- Q3 핵심: **헤드리스 백그라운드 실행에서 `readStatus`가 값을 주는지**와 완성 알림만 오는지. 강제 잡(`cmd jobscheduler run -f com.a810labs.pocketlog <id>`, id는 앱을 열 때마다 바뀐다 — `dumpsys jobscheduler`로 읽는다)을 돌렸더니 프로세스는 떴지만 2분 안에 시도 기록이 남지 않았다(dev 빌드의 헤드리스는 Metro가 필요해 보인다 — 확인 못 함). 시드 사진의 `vision` 실패 때문에 실제 쓰기 저장 뒤의 「완성 알림만」도 못 봤다.
- Q4: 쓰기가 안 되는 날 +30분에 쓸 차례 알림이 뜨는지(예약은 22:30으로 걸린 것만 봤다 — 실제 발화는 22:30까지 기다려야 한다).
- Q6: ≈2.0배 첫 화면 본문 줄 수(작은 화면 포함).

**기기 상태 (2026-10-26 07:50 정리)**: 앱 꺼 둠. 배터리 예외 **있음**, 자동으로 쓰기 **꺼짐**, `font_scale` 1.0, 닫은 시각 기록은 지움(테스트 전 상태). 10-24 일기는 없고 10-24에 시드 사진 1장이 남아 있다.

**내일 이어서 하는 순서**
1. 기기 연결, `adb devices`로 확인, Metro 시작.
2. Q2 마저(닫기·7일), 그다음 Q3·Q4(예외 있음/없음 번갈아), Q6 2.0배.
3. `photos` 실패가 계속되면 원인부터 가른다(104와 별개 — 로드맵에 과제로 올릴지 정한다).
4. 끝나면 `tasks.md`의 T038을 닫고, 로드맵 갱신 커밋(3번)과 PR.
