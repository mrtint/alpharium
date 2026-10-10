# Research: 069 층 1

## R1. 기준 상태가 되돌려야 하는 설정 파일 — 앱이 읽는 목록

`src/`에서 `preferences/` 아래로 읽고 쓰는 파일(2026-10-10 소스 확인):

| 파일 | 담는 것 | 기준 상태 |
| --- | --- | --- |
| `onboarding.json` | 온보딩 `completed`·`batteryNoticeShown`·`welcomeShown`·`downloadConsented` | 넷 모두 `true` — 첫 실행 게이트(`resolveFirstRunStage`)가 `done`이 되게 |
| `auto-diary.json` | `enabled`·`targetHour` | `{"enabled":false,"targetHour":22}` — 앱 기본값과 같다(`DEFAULT_AUTO_DIARY_SETTINGS`). 지워도 같은 상태지만 값을 못 박는다 |
| `developer-menu.json` | 배포 환경의 켜짐 | 삭제(개발 환경은 환경이 이긴다) |
| `simulation.json` | 상태 흉내 | 삭제 |
| `auto-write-skipped.json` | 057 건너뜀 날짜 | 삭제 |
| `notified.json` | 완성 알림 확인 기록 | 삭제 |
| `write-failures.json` | 060 쓰기 실패 기록 | 삭제(진단 「최근 쓰기 실패」가 비어 시작) |
| `character-names.json` | 사용자가 지은 이름 | 삭제(기본 이름) — 이름 바꾸기 훑기가 만든 값이 다음 실행으로 새지 않게 |
| `geocoding-setting.json` | 장소 이름으로 보기 | 삭제(기본값) |
| `selected-character.json` | 고른 캐릭터 | 건드리지 않음(로스터 하나) |

`state.json`은 모델 상태(`models/` 쪽)라 건드리지 않는다.
**목록이 낡는 것을 막는다**: 소스에서 `*.json` 상수 이름을 긁어 위 표(기준값 표 + 「건드리지 않음」)에 없는 파일이 생기면 `baseline.test.ts`가 실패한다.

## R2. 일기 파일 형식과 픽스처

- 위치 `files/diary/YYYY-MM-DD.json`. `serializeEntry`는 `JSON.stringify(entry)`이고 읽기는 `deserializeEntry`(날짜 복원 `reviveDates`)다. 읽기 실패는 `null`이고 지면에 「이 날의 일기 파일이 손상됐어요.」가 뜬다.
- 필수: `date`, `text`, `character`(`quiet`), `signalsUsed`(`DaySignals`: `photos`·`places`·`steps`·`battery`·`connectivity`가 각각 `SignalValue`), `createdAt`. 옵션: `title`, `authorName`, `photos[]{photoId,takenAt,resizedPath}`, `timing`, `placeName`.
- `resizedPath`가 `…/vision-cache/<파일명>`이면 `load()`의 `rehomeResizedPath`가 지금 문서 디렉터리로 다시 짠다. 픽스처는 `/data/user/0/com.a810labs.pocketlog/files/vision-cache/<파일명>` 형식으로 적는다.
- `signalsUsed.photos`는 `{kind:"known", value:{photos:[…], complete:true}}`이고 사진 수(1·3·1)가 `entry.photos` 길이와 같아야 한다 — 053 「지어낸 하루」 표식이 `signalsUsed`로 계산되므로 사진이 있는 날로 둔다.
- 날짜는 틀의 자리표시자(`{{TODAY}}`·`{{YESTERDAY}}`·`{{DAY_BEFORE}}`)를 실행 시점의 `dayOf`(기기 로컬 자정, `src/config/day-boundary.ts`)로 치환한다. `createdAt`·`takenAt`도 그 날 안의 시각으로 같이 치환한다.
- **결정**: 정합성은 jest가 실제 `deserializeEntry`로 왕복해 본다(`fixtures.test.ts`). 형식이 바뀌면 이 테스트가 먼저 깨진다.

## R3. 기기 통로 — debug 앱 데이터에 쓰는 법

- `run-as com.a810labs.pocketlog`는 debug에서만 된다(release는 `package not debuggable`). 재부팅 뒤 첫 잠금 해제 전에도 실패한다(Direct Boot). → 실행기는 사전 점검으로 `run-as … ls files`를 불러 실패하면 이유와 함께 중단한다(FR-012).
- 쓰기: 로컬 임시 파일 → `adb push`(`/data/local/tmp/layer1/…`) → `adb shell run-as <pkg> cp`(AGENTS: JSON을 `adb shell "echo {…}"`로 쓰면 셸이 중괄호·따옴표를 먹는다). `adb`는 Windows 실행 파일이라 Git Bash `/tmp`를 모른다 — 임시 파일은 `os.tmpdir()`, 기기 쪽은 `/data/local/tmp`.
- 앱 종료: `am force-stop`. 층 1은 백그라운드 잡이 필요 없다.
- 모델 점검: `run-as … ls files/models`로 필수 모델 파일이 있는지만 본다(없으면 중단). 크기 검증은 하지 않는다(필수 에셋 판정은 앱 몫).
- 일기 폴더: `files/diary/`의 `YYYY-MM-DD.json(.writing)` 파일만 지우고(`removeAll`과 같은 패턴) 픽스처를 심는다. 디렉터리 통째 삭제는 하지 않는다. `files/vision-cache/`도 픽스처 사진 사본으로 채운다(이전 사본은 지운다).

## R4. Maestro 흐름 설계 사실

- `launchApp`은 기본으로 앱을 종료한 뒤 다시 띄운다 → 강제 종료 반복은 `repeat: times: 10` 안의 `launchApp`.
- 쓴 날 지면: `testID` `written-paper`(051). 손상 문구는 카탈로그 `writtenDay.unreadableLines[0]`. 단언은 본문이 아니라 `written-paper` 보임 + 손상 문구 `notVisible`(`assertNotVisible`은 `timeout` 불가).
- 사진: 단일 사진 `photo-carousel-single`, 열기 `photo-open-<photoId>`, 확대 화면 `photo-viewer`, 닫기 `photo-viewer-close`. 픽스처 `photoId`를 고정 값으로 둔다(`e2e-today-1` 등).
- 설정 행: `settings-name`, `settings-target-hour`·`settings-place-names`(자동 쓰기가 켜졌을 때만 보임), `settings-perm-*`, `settings-wipe`. 개발자 `developer-*`, 진단 `diagnostics-*`. 부작용 행은 `assertVisible`만(FR-021a): `diagnostics-try-once`·`diagnostics-run-auto`·`developer-redownload`·`developer-replay-onboarding`·`developer-off`.
- 권한 행은 OS 앱 설정으로 나간다 → 다녀올 때 안드로이드 `back`을 쓴다. 이 한 동작만 기기 의존이라 구현 때 실측으로 정하고, 불안정하면 흐름에서 빼 대응표에 「사람이 봄」으로 내린다.
- 흐름이 값을 `-e`로 받으면 실행기로 안 돈다(AGENTS) → 새 흐름은 변수 없이 고정 `testID`만 쓴다.

## R5. 기존 흐름의 층 1 적합 판정 (FR-022a)

기준 상태(자동 쓰기 꺼짐·사흘 쓴 날·모델 있음)와 **수정 없이** 맞는가는 흐름 본문을 읽고 대응표에서 확정하고, 실기기에서 한 번 돌려 확인한다. 이번 소스 조사의 1차 추정:

- **후보(생성 없음)**: `dialog-foundation`, `diary-home-1d`, `week-strip-swipe`, `skeleton`, `prompt-preview`, `state-simulation`.
- **넣지 않는 쪽 후보**: `settings-time-place`(토글을 켠 채 끝나 기준 상태를 바꾼다), `written-day-reading`·`reading-scroll`(`WRITTEN_DAY`를 `-e`로 받는다).
- **제외(생성한다 또는 `pm clear`·온보딩 재현 전제)**: `generate-diary`, `past-day-diary`, `today-diary`, `writing-*`, `in-place-writing`, `photo-selection-over-limit`, `diary-body-screen`, `scheduled-diary-notification`, `first-run-flow`, `download-consent-flow`, `unified-permission-onboarding`.

맞지 않는 흐름은 고치지 않는다.

## R6. 위반 주입 설계 (FR-025, SC-005·006)

- 재시작: `src/diary/store.ts` `expoFileSystemPort().read`의 `file.textSync()`를 `await file.text()`로 되돌린 상태에서 `restart-persistence`를 돌려 실패가 나는지 본다. 확률적이라 한 번에 안 날 수 있다(12회 중 5회) — 실패가 안 나면 원인(주입 미적용/확률)을 기록하고 횟수를 늘려 다시 한다. 주입 전 치환이 실제로 적용됐는지 단언한다.
- 쓸기: 확대 화면을 여는 누름 판정 `isTap`(`src/app/photo-viewer.ts`)을 항상 참으로 바꿔 쓸기 뒤에도 확대 화면이 열리는지 본다.
- 둘 다 되돌려 `git diff`가 비는 것을 확인하고 커밋하지 않는다.

## R7. 대안과 기각

| 대안 | 기각 이유 |
| --- | --- |
| 흐름 안 `runScript`로 기준 상태 만들기 | Maestro JS는 `adb run-as`를 못 부른다. 실행기가 맞다. |
| `pm clear` 후 모델 복원 | 2GB 복사 비용. 설계 결정이 이미 기각. |
| 픽스처를 개발자 메뉴 버튼으로 심기 | `src/` 변경, 제품 코드에 테스트 장치를 들이는 일. |
| 대응표를 실행기 주석에 두기 | 표가 두 곳이 된다. |
