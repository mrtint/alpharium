# 078 — 자동 쓰기: 놓친 날 다시 쓰기와 시도 기록 (실측 기록)

스펙킷을 거치지 않은 조각이다(버그 조사에서 시작했다) — 이 폴더는 번호 자리와 실측 기록만 둔다.

- 설계: `docs/superpowers/specs/2026-10-13-auto-write-missed-day-and-attempt-log-design.md`
- 구현 계획: `docs/superpowers/plans/2026-10-13-auto-write-missed-day-and-attempt-log.md`
- 결론·읽는 법·남은 위험: `AGENTS.md` 「078」
- 판정 계약: `specs/020-scheduled-diary-notification/contracts/schedule-decision.md` D1·D2·D2a
- 남은 과제: `docs/roadmap/README.md` 「백그라운드 자동 쓰기가 완주하지 못한다」

## 실측 — 2026-10-13, SM-S901N (Android 16), dev

**준비**: 기기에 10월 7일에 깔린 debug APK(다른 기계에서 빌드)를 그대로 두고, 개발 맥에서 `adb reverse tcp:8081 tcp:8081` + `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`로 이 브랜치 번들을 올렸다(그 사이 네이티브 의존성 변경 없음).
번들 확인: `curl localhost:8081/index.bundle?platform=android…`에 `auto-write-attempts.json`·`catch-up-spent`와 `.env.development.local` 모듈이 있다. 일기·설정은 `adb exec-out run-as … tar`로 백업했고 끝에 되돌렸다(일기 md5 동일).
자동 쓰기는 `preferences/auto-diary.json`에 `{"enabled":true,"targetHour":22}`를 써서 켰다 — 실제 시각 09시대라 시도 창 밖이다.

| 시각 | 한 일 | 본 것 |
| --- | --- | --- |
| 09:08 | 자동 쓰기 꺼진 채 앱 열기 | `앱 열기 · 자동 쓰기 꺼짐`. 다시 앞으로 오면 줄이 늘지 않고 시각만 바뀜 |
| 09:10 | 개발자 화면 맨 아래 | 「최근 자동 쓰기 시도」 묶음이 「개발자 메뉴 끄기」 아래에 있다 |
| 09:10 | 진단 「자동 쓰기 지금 실행」(어제 사진 0장) | 화면 「건너뜀」, `지금 실행 · 재료 없음`. 따라잡기 기록 없음 |
| 09:11 | 어제에 1×1 사진 4장(표본 없는 `seed:day`)을 심고 콜드 스타트 | 홈이 어제를 고르고 쓰기 시작 → 약 15초 뒤 토스트 「일기를 쓰지 못했어요.」, 실패 기록 `photos`. 사진 모델이 설명을 못 냄(제품·이 조각과 무관 — 표본 문제) |
| 09:14 | 기기의 옛 표본 4장(4032×3024)으로 다시 심고 콜드 스타트 | 09:15:04 `앱 열기 · 홈에 넘김`, 09:16:03 `2026-10-12.json` 저장(약 1분). **창 밖에서 어제를 썼다** |
| 09:16 | 그 일기를 빼고, 배터리 예외를 주고, 홈 버튼 뒤 `cmd jobscheduler run -f com.a810labs.pocketlog 0` | 09:16:42 `백그라운드 · 시작한 뒤 끝나지 않음`, `auto-write-catch-up.json` `{"on":"2026-10-13"}`, 잠금 파일 있음 |
| 09:16~09:22 | (헤드리스) 사진 4장 읽기 | 장당 약 45초, 사진 모델 닫고 쓰는 모델 올리기까지 약 5분 46초. 프로세스 cpuset `/background` = CPU 0–2, 추론 스레드 4 |
| 09:22~09:46 | (헤드리스) 본문 생성 | 끝나지 않음. CPU 약 300% |
| 09:46:42 | JobScheduler `Client timed out while executing (no jobFinished received). Sending onStop` | WorkManager가 0.2초 뒤 워커를 다시 실행 → `백그라운드 · 오늘 창 밖에서 이미 한 번 시도함` |
| 09:47:33 | 앱을 앞으로 올림 | cpuset `/top-app`. 첫 실행이 `백그라운드 · 실패`로 끝남(시각은 09:16:42 그대로), 실패 기록 `unwritten`. `앱 열기 · 홈에 넘김`이 남았지만 홈은 쓰지 않음(같은 실행에서 이미 한 번 썼다) |
| 09:53 | `maestro test .maestro/settings-developer-sweep.yml` | 「끄기」 뒤 「진단」 행을 기본 방향으로 찾다 실패 → `direction: UP`으로 고친 뒤 개발자·진단 구간 통과(84단계 중 81). 마지막 `written-paper` 단언은 층 1 기준 상태가 없어 실패 |

## 미확인

- iOS 전부.
- 안드로이드: OS가 스스로 깨운 잡(강제 실행이 아닌 것), 배터리 예외 없는 상태, 오전 목표에서 어제가 기다리는 것, `npm run test:layer1` 전체, release 빌드.
