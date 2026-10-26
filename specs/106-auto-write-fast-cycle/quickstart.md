# Quickstart: 106 확인 절차

## 기기 없이

```bash
npm run test:logic -- --testPathPattern 'timing|fast-cycle|llama-port-load|store-remove-day|reminder'   # 개발 중
npm test            # logic + ui 전부
npm run lint        # eslint + tsc + 헌법 검사(FAST_CYCLE_LEAKS) + prettier
```

위반 주입(되돌린다): (1) `timing-source.ts`의 `devEnvironment` 가드를 지움 → prod 테스트와 헌법 검사가 실패, (2) 세 번째 `resetFastCycleIfDue` 호출을 아무 파일에 추가 → FL3 실패, (3) `llama-port.ts` 직렬화를 지움 → 경합 테스트가 실패.

## 실기기 (SM-S901N, dev 빌드)

사전: `adb reverse tcp:8081 tcp:8081`, `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`, `npm run sample:seed`로 오늘 표본 사진 시딩, 자동 쓰기를 켠다. **모델이 든 debug APK를 지우지 않는다**(Metro 번들만 올림).

1. 개발자 메뉴(설정 → 정보 → 버전 7번 탭) → 「빠른 주기」 → 30분 선택 → 오늘 일기가 있으면 확인창 → 켬. 진단 머리에 「빠른 주기 켜짐 · 주기 30분」.
2. 앱을 나가고 화면을 끈 채 세 주기(약 1시간 반) 둔다. 다음에 읽는다: 개발자 화면 「최근 자동 쓰기 시도」(주기마다 `백그라운드 · 썼음` 또는 줄 없음), 예약 알림 줄, 알림 트레이(쓸 차례 → 완성).
3. 10분 주기: 앱을 앞으로 가져오는 것(앱 열기)과 `adb shell cmd jobscheduler run -f com.a810labs.pocketlog <잡id>`로 한 바퀴. 잡 id는 `dumpsys jobscheduler`에서 찾는다.
4. ① 경합: 홈에서 일기를 쓰는 도중 진단 「지금 실행」을 눌러 모델이 둘 열리지 않는지(logcat `RNLlama`·메모리) 본다.
5. 끄기: 개발자 메뉴에서 모드를 끄거나 메뉴를 끈 뒤 평소 규칙으로 돌아오는지(`run-as`로 `preferences/dev-fast-cycle.json` 없음) 확인한다.

기록: 본 것·못 본 것을 `specs/106-auto-write-fast-cycle/device-check.md`에 쓴다(22:30 실제 발화처럼 못 본 것은 못 봤다고 적는다).
