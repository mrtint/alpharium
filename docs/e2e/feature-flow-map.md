# 기능 → e2e 흐름 대응표

주요 기능마다 **어느 흐름이 무엇을 지키는지**를 한곳에 둔다. 정본은 이 문서 하나다 — `scripts/run-device-tests.mjs`는 이 경로만 가리키고 표를 복제하지 않는다.
표가 흐름 파일·`FLOWS`·`LAYER1_FLOWS`와 어긋나면 `__tests__/e2e/flow-map.test.ts`가 실패한다(스펙 069 `contracts/flow-map.md` M-1~M-10).

**층 1**은 일기를 쓰지 않고 기준 상태(모델 있음·온보딩 완료·자동 쓰기 꺼짐·오늘부터 사흘 쓴 날 픽스처)에서 끝나는 화면 흐름이다. `npm run test:layer1` — 전용 테스트 기기에서만 돈다(이 기기의 일기를 지운다).
**층 2**(실제 모델로 쓰는 스모크)와 **iOS 갈래**는 이번 조각(069)의 범위 밖이다 — 표시만 한다.

「계약 테스트가 지킴」은 파일을 열어 **무엇을 단언하는지** 확인한 것만 적었다. jest는 타입을 지우고 네이티브·레이아웃·타이밍이 없으므로(AGENTS 「조용히 실패하는 결함의 계열」) 계약 테스트가 지키는 것은 e2e로 다시 만들지 않는다.

## 기능 표

| 기능 | 층 1 흐름 | 계약 테스트가 지킴 | 층 2 | 사람이 봄(이유) |
| --- | --- | --- | --- | --- |
| 첫 실행(로고·권한·동의·진행·작명·정상 동작 확인) | — | `__tests__/firstrun/progress.test.ts`(단계 판정 우선순위), `__tests__/ui/AppFrame.firstrun.test.tsx`(단계별 화면 배선), `__tests__/welcome/naming.test.ts`(작명 검증) | 범위 밖(069) | 모델 내려받기 실제 동작·OS 권한 창 — `pm clear`·새 설치가 전제라 층 1이 만들 수 없다. 기존 흐름 `first-run-flow`·`download-consent-flow`·`unified-permission-onboarding`이 일반 실행(FLOWS)에서 본다 |
| 일기 쓰기·그만두기(제자리 쓰기) | — | `__tests__/ui/writing-in-place.test.tsx`(쓰는 중 홈 배선), `__tests__/ui/writing-in-place-stop.test.tsx`(그만두면 쓰기 전 상태) | 범위 밖(069) | 실제 생성은 모델·50~240초라 층 1이 아니다. 일반 실행 `in-place-writing`·`generate-diary`가 일부 본다. 빠른 반복 시 부작용은 로드맵의 별도 과제 |
| 쓴 날 읽기(홈이 곧 상세) | `.maestro/restart-persistence.yml`, `.maestro/diary-body-screen.yml` | `__tests__/ui/written-day-home.test.tsx`, `__tests__/app/written-day.test.ts`, `__tests__/diary/store.test.ts`(직렬화 왕복) | 범위 밖(069) | — |
| 강제 종료 후 재시작해도 읽힘 | `.maestro/restart-persistence.yml` | `__tests__/diary/expo-file-sync.test.ts`(비동기 `text()` 호출이 소스에 없음 — 소스만 센다) | 범위 밖(069) | — (GC가 끼는 확률 결함은 jest에 런타임이 없어 이 흐름이 유일한 방어) |
| 읽기 스크롤(스트립 접힘) | — | `__tests__/ui/reading-scroll.test.tsx`, `__tests__/app/reading-scroll.test.ts`(접힘 판정) | 범위 밖(069) | 접힘 움직임·손맛 — 기존 `reading-scroll`이 `-e` 변수를 받아 실행기로 못 돈다. 사람이 `maestro test`로 직접 돌린다 |
| 날 고르기(주간 스트립) | `.maestro/week-strip-swipe.yml`, `.maestro/diary-home-1d.yml`, `.maestro/sample-days.yml`(30일치 표본 위 대표 날 여덟 곳으로 이동) | `__tests__/ui/day-picker.test.tsx`, `__tests__/ui/diary-home-week.test.tsx` | 범위 밖(069) | 스트립 끌림의 손맛 |
| 날짜로 이동(달력) | `.maestro/dialog-foundation.yml`, `.maestro/sample-days.yml`(이전 달을 넘겨 먼 날로 이동) | `__tests__/ui/date-jump-dialog.test.tsx`, `__tests__/app/calendar.test.ts` | 범위 밖(069) | 월·연 목록, 미래 칸 — `dialog-foundation` 머리말에 「사람이 눈으로 본다」로 적혀 있다 |
| 덮어쓰기 확인 | `.maestro/dialog-foundation.yml`(열고 취소) | `__tests__/ui/overwrite-confirm.test.tsx` | 범위 밖(069) | 다시 쓰기를 끝까지 하는 것은 생성이라 층 2 |
| 사진 확대 화면 | `.maestro/single-photo-swipe.yml`(쓸기에 안 열림·탭에 열림·뒤로 가기에 닫힘) | `__tests__/ui/photo-viewer.test.tsx`(배선), `__tests__/app/photo-viewer.test.ts`(문턱 판정) | 범위 밖(069) | 핀치·두 번 탭·이동 — `adb`로 두 손가락 입력을 만들 수 없다 |
| 쓸 재료(사진·장소 두 칸) | `.maestro/sample-days.yml`(표본 위에서 0장·1장·상한 초과·GPS 없음·잡사진·밤만 등 날마다 칸 숫자가 표의 기대와 같다 — 권한 없음 칸은 아님) | `__tests__/ui/material-grid.test.tsx`, `__tests__/app/material.test.ts`(없음/모름/있음 구분) | 범위 밖(069) | 사진 권한이 없는 기기 상태를 전제한다 — 기존 `writing-material` |
| 설정 — 이름 바꾸기 | `.maestro/settings-developer-sweep.yml` | `__tests__/ui/rename-screen.test.tsx`, `__tests__/ui/settings-screen.test.tsx` | 범위 밖(069) | — |
| 설정 — 자동으로 쓰기·매일 쓰는 시각·장소 이름 | `.maestro/settings-developer-sweep.yml`(켜서 대화상자를 열고 취소, 다시 끔) | `__tests__/ui/target-hour-dialog.test.tsx`, `__tests__/ui/place-name-dialog.test.tsx`, `__tests__/app/target-hour.test.ts` | 범위 밖(069) | 시각 적용 뒤 값이 바뀌는 흐름은 기존 `settings-time-place`가 본다(토글을 켠 채 끝나 층 1 아님) |
| 설정 — 권한 행 | `.maestro/settings-developer-sweep.yml`(사진·위치·알림·배터리 행을 눌러 OS 설정에서 뒤로 가기 — 실기기에서 왕복 확인) | `__tests__/app/permission-tags.test.ts`(꼬리표 판정), `__tests__/onboarding/no-react-native-dynamic-import.test.ts`(066 튕김 원인 재발 방지) | 범위 밖(069) | 권한 창에서 실제로 허용·거부했을 때의 화면 변화, 큰 글꼴 |
| 설정 — 이 휴대폰(모듈 용량·일기 모두 지우기) | `.maestro/settings-developer-sweep.yml`(행 보임, 지우기는 확인 대화상자 취소) | `__tests__/ui/settings-this-phone.test.tsx`, `__tests__/app/wipe-diaries.test.ts`(지우는 순서·잠금), `__tests__/ui/home-wipe.test.tsx` | 범위 밖(069) | 실제로 지우는 동작 — 층 1은 확인 대화상자에서 취소로 끝나 일기가 남는다(058 quickstart를 사람이 본다) |
| 설정 — 버전 | `.maestro/settings-developer-sweep.yml`(행 보임) | `__tests__/ui/settings-screen.test.tsx`, `__tests__/app/version.test.ts` | 범위 밖(069) | 개발자 메뉴를 여는 7번 탭은 배포 환경 전용 — 개발 환경 흐름에 없다 |
| 개발자 메뉴 | `.maestro/settings-developer-sweep.yml`(열기·행 보임) | `__tests__/ui/developer-screen.test.tsx`, `__tests__/app/app-developer-source.test.ts` | 범위 밖(069) | 「모듈 다시 받기」·「온보딩부터 다시」·「끄기」를 눌렀을 때의 동작 — 층 1이 생성·상태 변경을 하지 않으려고 누르지 않는다(스펙 069 FR-021a). 기존 `skeleton`은 낡았다 |
| 진단 | `.maestro/settings-developer-sweep.yml`(일곱 묶음 보임) | `__tests__/ui/diagnostics-screen.test.tsx`, `__tests__/app/diagnostics-view.test.ts` | 범위 밖(069) | 「한 번 써 보기」·「자동 쓰기 지금 실행」 — 생성하므로 누르지 않는다. 기존 `prompt-preview`는 낡았다 |
| 상태 흉내(개발 환경) | `.maestro/state-simulation.yml` | `__tests__/ui/home-simulation.test.tsx`, `__tests__/app/simulation.test.ts` | 범위 밖(069) | 날짜 흉내·헤드리스·재시작 뒤 유지 — 흐름 머리말에 사람이 보는 것으로 적혀 있다 |
| 자동 쓰기(앱을 열면·백그라운드) | — | `__tests__/schedule/auto-write.test.ts`(판정), `__tests__/ui/home-auto-write.test.tsx`(앱 열기 시작) | 범위 밖(069) | OS가 깨우는 백그라운드 잡 — 기기가 스스로 깨워야 하고 생성을 한다. 기존 `scheduled-diary-notification`이 일부 본다(토글을 켠 채 끝나 층 1 아님) |
| 완성 알림 | — | `__tests__/schedule/notification-text.test.ts`(문구) | 범위 밖(069) | 알림이 실제로 뜨는지 |
| 쓰기 하단 바 잠금(1.5초) | — | `__tests__/ui/bar-lock.test.tsx` | 범위 밖(069) | 손으로 연달아 누르는 느낌 |
| iOS 시뮬레이터 훑기 | — | — | 범위 밖(069) | iOS 갈래는 맥이 필요한 별도 조각 — `.maestro/ios/`는 훑기 도구로 `FLOWS`에 없다 |

## 흐름 인벤토리

`FLOWS`는 `scripts/run-device-tests.mjs`의 등록, 층 1은 `LAYER1_FLOWS`다. 「근거」의 **실측**은 2026-10-10 전용 테스트 기기(SM-G986N, dev)에서 층 1 기준 상태로 돌린 결과, **소스**는 흐름을 읽어 판단하고 돌리지 않은 것이다.

| 흐름 파일 | FLOWS | 층 1 | 지키는 기능 | 층 1이 아닌 이유 |
| --- | --- | --- | --- | --- |
| `.maestro/restart-persistence.yml` | ○ | ○ | 강제 종료 후 재시작해도 읽힘, 쓴 날 읽기 | — |
| `.maestro/single-photo-swipe.yml` | ○ | ○ | 사진 확대 화면 | — |
| `.maestro/settings-developer-sweep.yml` | ○ | ○ | 설정 각 행, 개발자 메뉴, 진단 | — |
| `.maestro/dialog-foundation.yml` | ○ | ○ | 날짜로 이동(달력), 덮어쓰기 확인 | — (실측 통과) |
| `.maestro/diary-home-1d.yml` | ○ | ○ | 날 고르기, 설정 진입 | — (실측 통과) |
| `.maestro/week-strip-swipe.yml` | ○ | ○ | 날 고르기 | — (실측 통과) |
| `.maestro/diary-body-screen.yml` | ○ | ○ | 쓴 날 읽기 | — (실측 통과) |
| `.maestro/state-simulation.yml` | ○ | ○ | 상태 흉내 | — (실측 통과, 마지막에 둔다) |
| `.maestro/sample-days.yml` | ○ | ○ | 쓸 재료, 날 고르기, 날짜로 이동 | — (표본 30일치 위에서만 돈다 — `--layer1`의 「표본 보장」이 심고 대표 날 값을 `-e`로 넘긴다. 일반 실행에서는 제외) |
| `.maestro/_sample-probe.yml` | — | — | (보조) `sample-days`가 대표 날 하나로 이동해 사진·장소 칸을 단언 | 보조 흐름이다 — 단독으로 검증하는 기능이 없다(`DATE`·`BACK`·`PHOTOS`·`PLACES` env가 필요) |
| `.maestro/skeleton.yml` | ○ | — | 앱이 뜬다·추론 위치(뼈대) | 실측 실패: `"모듈 상태" is visible` — 그 문구가 지금 카탈로그에 없다(낡았다). 이번 조각은 흐름을 고치지 않는다 |
| `.maestro/prompt-preview.yml` | ○ | — | 진단의 프롬프트 미리보기 | 실측 실패: `".*주인의 휴대폰이다.*" is visible` — 프롬프트 문안이 바뀐 것으로 보이나 원인은 확인하지 않았다 |
| `.maestro/today-diary.yml` | ○ | — | 오늘 쓰기, 덮어쓰기 확인 | 실측 실패: `"일기" is visible` — 원인은 확인하지 않았다(기준 상태 탓인지 낡은 문구인지 가르지 않았다) |
| `.maestro/settings-time-place.yml` | ○ | — | 설정 — 시각·장소 | 소스: 「자동으로 쓰기」를 켠 채 끝나 기준 상태를 바꾼다 |
| `.maestro/scheduled-diary-notification.yml` | ○ | — | 자동 쓰기·알림 | 소스: 토글을 켠 채 끝나고 마지막에 「지금 자동 생성」을 실행한다 |
| `.maestro/reading-scroll.yml` | ○ | — | 읽기 스크롤 | 소스: `-e` 변수(`WRITTEN_DAY` 등)를 받는다 — 실행기가 값을 넘기지 않는다 |
| `.maestro/written-day-reading.yml` | ○ | — | 쓴 날 읽기(여러 장) | 소스: `-e` 변수(`WRITTEN_DAY`·`WRITTEN_DAY_PHOTOS`)를 받는다 |
| `.maestro/writing-material.yml` | ○ | — | 쓸 재료 | 소스: 사진 권한이 없는 기기 상태를 전제하고 「일기 쓰기」를 누른다 |
| `.maestro/generate-diary.yml` | ○ | — | 일기 생성 | 일기를 생성한다(모델 추론) |
| `.maestro/in-place-writing.yml` | ○ | — | 제자리 쓰기 | 쓰기를 시작해 생성 중 상태를 본다(생성) |
| `.maestro/past-day-diary.yml` | ○ | — | 지난 하루 쓰기 | 일기를 생성한다 |
| `.maestro/photo-selection-over-limit.yml` | ○ | — | 사진 선별(상한 초과) | 일기를 생성한다, `-e` 변수를 받는다 |
| `.maestro/writing-flow-simplified.yml` | ○ | — | 쓰기 한 번 탭 | 일기를 생성한다, `clearState`를 쓴다 |
| `.maestro/writing-monologue.yml` | ○ | — | 쓰는 중 독백 | 일기를 생성한다 |
| `.maestro/writing-monologue-expansion.yml` | ○ | — | 쓰는 중 독백(모델 적재 구간) | 일기를 생성한다 |
| `.maestro/first-run-flow.yml` | ○ | — | 첫 실행 | `clearState`를 쓴다 — 새 설치 상태가 전제다 |
| `.maestro/download-consent-flow.yml` | ○ | — | 다운로드 동의·진행 | 앱 데이터가 비어 있어야 한다(모델 내려받기 전) |
| `.maestro/unified-permission-onboarding.yml` | ○ | — | 권한 온보딩 | `clearState`를 여러 번 쓴다 — 온보딩부터 시작한다 |
| `.maestro/ios/settings-sweep.yml` | — | — | iOS 설정 훑기 | iOS 시뮬레이터 갈래는 범위 밖(069) — 훑기 도구라 `FLOWS`에 없다 |
| `.maestro/ios/developer-diagnostics-sweep.yml` | — | — | iOS 개발자·진단 훑기 | iOS 시뮬레이터 갈래는 범위 밖(069) |
| `.maestro/ios/first-run-to-home.yml` | — | — | iOS 첫 실행에서 홈까지 | iOS 시뮬레이터 갈래는 범위 밖(069) |
| `.maestro/ios/_dismiss-open-prompt.yml` | — | — | (보조) iOS 개발 클라이언트 재진입 확인 창 닫기 | 다른 iOS 흐름이 부르는 보조 흐름이다 — 단독으로 검증하는 기능이 없다 |

## 대응표가 드러낸 것

- **낡은 흐름 셋**: `skeleton`·`prompt-preview`·`today-diary`는 `FLOWS`에 등록돼 있지만 현재 화면과 맞지 않아 수정 없이는 통과하지 못한다(실측). 이번 조각은 고치지 않는다(스펙 069 FR-022a) — 일반 실행(`npm run test:device`)에서도 같은 이유로 실패할 것이다. 따로 정리할 일이다.
- **빈 칸**: 쓸 재료·읽기 스크롤·자동 쓰기·완성 알림은 층 1 흐름이 없다. 앞의 둘은 `-e` 변수나 권한 상태가 전제라 층 1 기준 상태와 맞지 않고, 뒤의 둘은 생성·OS가 깨우는 일이다.
- **스펙 069 FR-022 판단**: 달력·스트립·권한 행·대화상자는 기존 흐름(`dialog-foundation`·`week-strip-swipe`·`diary-home-1d`)과 새 훑기가 이미 본다 — 새 흐름을 더하지 않았다. 남은 빈 칸(쓸 재료·읽기 스크롤·자동 쓰기·완성 알림)은 층 1 기준 상태와 맞지 않아 「사람이 봄」/층 2로 두었다.
- **중복**: 설정 시각·장소는 `settings-developer-sweep`(열고 취소)과 `settings-time-place`(값이 바뀜)가 겹친다 — 뒤의 것이 토글을 켠 채 끝나 층 1에 못 들어온다.
- **`FLOWS` 밖**: `.maestro/ios/` 넷. 등록하지 않은 흐름은 초록불인데 아무것도 검증하지 않으므로 iOS 갈래가 생길 때 정한다.
- **실행기 버그 하나를 고쳤다**: JUnit 보고서에서 실패한 흐름을 가리는 정규식이 통과한 흐름을 실패로 보고했다(`dialog-foundation`이 통과했는데 실패 목록에 올랐다). 자기 닫힘 `<testcase/>`를 건너뛰도록 고쳤다(`scripts/layer1/junit.ts`, 같은 규칙을 `run-device-tests.mjs`에도 넣었다).
