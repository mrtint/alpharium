# Contract: 주기 리셋 (CR)

- **CR1** 개발 환경이 아니거나 빠른 주기 기록이 없으면(`loadFastCycleRecord`가 `null`) 일기·기록을 읽거나 지우지 않고 `{ reset: false }`. 배포 환경은 기록 통로도 부르지 않는다.
- **CR1a** 호출 자리(`task.ts`·앱 열기 훅)는 `settings.enabled`일 때만 리셋을 부른다(FR-006a). `resetFastCycleIfDue` 자체는 설정을 모른다.
- **CR2** 현재 주기 id가 기록의 `resetCycle`과 같으면 `{ reset: false }`.
- **CR3** 다르면 `liveWrites.beginWipe()`를 시도한다. `null`이면 `{ reset: false }`이고 쓰기를 끊지 않는다.
- **CR4** 칸을 차지했으면 `finally`에서 반드시 `end()`한다.
- **CR5** 지우는 대상은 오늘(`dayOf(now)`)의 일기(`removeDay`), 완성 알림 확인 기록의 오늘 항목, 건너뜀 기록(오늘이면), 따라잡기 기록(오늘이면), 트레이의 그 알림이다. 다른 날의 일기와 `vision-cache`는 건드리지 않는다.
- **CR6** 일기 삭제가 성공했을 때만 `resetCycle`을 현재 주기로 쓴다. 삭제가 던지면 나머지 단계는 계속하되 `resetCycle`은 갱신하지 않고 `{ reset: false }` — 다음 판정이 다시 시도한다.
- **CR7** 어떤 경우에도 던지지 않는다.
- **CR8** 판정 자리는 `task.ts`(일기 목록을 읽기 전)와 `use-auto-write-handoff.ts`(`resolveAutoWrite` 호출 전) 둘뿐이다. `task.ts`는 `resetFastCycleIfDue`를 직접 부르고, 훅은 조립부가 `createFastCycleResetter(deps)`(같은 파일 `fast-cycle-reset.ts`)로 만든 `resetFastCycle(now)` 클로저 하나만 받아 부른다 — 훅은 저장소·포트를 모른다. `{ reset: true }`이면 훅은 `onCycleReset?.()`를 부르고, 백그라운드는 끝에서 평소처럼 알림을 맞춘다.
- **CR9** `onCycleReset`은 조립부가 `rearmAutoWrite()`에 연결한다(앱 열기 「한 번」을 다시 연다). 배포 환경에서는 불리지 않는다.
- **CR10** 켜기 흐름: 오늘 일기가 있으면 확인 → 확인하면 `removeDay(today)`와 같은 기록 정리(CR5) 후 기록을 `{ periodMinutes, resetCycle: 현재 주기 }`로 쓴다. 거절하면 아무것도 쓰지 않는다. 끄기·개발자 메뉴 끄기는 파일을 지운다.
- **CR11** 켜기·끄기·주기 변경 뒤 `reschedule()`과 알림 맞추기를 부른다(실패는 삼킨다).
- **CR12** 수동 실행(`deps.manual === true`)은 빠른 주기 timing을 읽지 않고 리셋도 하지 않는다 — `manualSettings`가 덮은 설정의 배포 timing으로 판정한다(FR-009d).
- **CR13** 홈 목록 갱신: 리셋은 등록부 칸을 차지(`beginWipe`)했다 놓으므로 `liveWrites.onChange`가 두 번 울리고, 홈은 그 신호로 목록을 낡음으로 표시하고 칸이 빈 뒤 다시 읽는다(080 H12 — 홈이 시작하지 않은 쓰기·지우기가 드나들면 낡게 한다). 그래서 앞 상태 앱에서 리셋이 일기를 지워도 홈은 오늘을 「안 쓴 날」로 읽고, `onCycleReset`→`rearmAutoWrite` 뒤 057 효과가 이어 쓴다. 이 연쇄를 홈 조립 테스트로 잠근다.
