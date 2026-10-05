# Quickstart: 진단 화면 개편 (060)

## 기기 없이

```bash
npm run test:logic   # DT·WF·DI·DV·AR·RP·CC 소스 계약
npm run test:ui      # DS·HR·TO (렌더)
npm test && npm run lint
```

위반 주입(최소, 치환이 실제로 적용됐는지 먼저 단언하고 주입 뒤 원래 문자열이 돌아왔는지 다시 grep한다 — AGENTS):
(1) `diag.tryOnce.toast` 문구 한 글자를 바꾸면 DT1이 잡는가 (2) `classify`의 `rejected: empty`를 `unwritten`으로 바꾸면 WF1이 잡는가 (3) 기록 항목에 `durationMs` 필드를 더하면 WF3이 잡는가
(4) 홈 `generate`에서 `cancelled` 검사 앞으로 `recordWriteFailure`를 옮기면 WF7이 잡는가 (5) 신호 칸에서 `network`를 빼면 DS4·CC1이 잡는가 (6) `DiagnosticsParts.tsx`에 `diary/prompt` import를 넣으면
CC2·DS8이 잡는가 (7) `DiagnosticsScreen.tsx`에 `createAppPipeline` import를 넣으면 DS8이 잡는가 (8) `manual`이 `decideSchedule`을 우회하도록 바꾸면 AR3이 잡는가
(9) 걸음 칸에 `known` 입력을 줘도 「모름」이 아니게 바꾸면 DV2가 잡는가 (10) `unknown` 사진을 0장으로 옮기면 DV3이 잡는가.

## dev 실기기 (SM-S901N)

전제: AGENTS 「도구 사용법」 — **새 네이티브 모듈이 없어 빌드는 필요 없다.** 이미 설치된 dev 빌드로 Metro만 새 번들을 서빙한다: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`,
`adb reverse tcp:8081 tcp:8081`, 잠금 해제(`dumpsys trust`의 `deviceLocked=0`). `pm clear`·`am force-stop`·`am start -S`를 쓰지 않는다 — 앱을 벗어날 때는 홈 버튼, 다시 열 때는 `am start`.
Git Bash에서 `adb` 기기 경로 인자 앞에 `MSYS_NO_PATHCONV=1`. 좌표를 누르기 전에 스크린샷으로 현재 화면을 확인한다.

### 0. 백업 (반드시 먼저)

```bash
P=com.anonymous.alpharium
MSYS_NO_PATHCONV=1 adb shell "run-as $P sh -c 'cd files && tar cf - diary vision-cache preferences'" > C:/Users/mrtin/AppData/Local/Temp/alpharium-060-backup.tar
tar tf C:/Users/mrtin/AppData/Local/Temp/alpharium-060-backup.tar | head
MSYS_NO_PATHCONV=1 adb shell "run-as $P ls -l files/models" | tr -d '\r'   # 모델 3파일의 크기·시각 — 끝난 뒤 그대로여야 한다
MSYS_NO_PATHCONV=1 adb shell "run-as $P sh -c 'cd files && md5sum preferences/*.json'" > C:/Users/mrtin/AppData/Local/Temp/alpharium-060-before.md5
```

백업을 눈으로 확인하기 전에는 1 이후를 하지 않는다. 057 시드 사진(10월 1일·9월 30일 각 4장)은 지우지 않는다. 이 조각이 지우는 파일은 없다(진단은 읽기와 `write-failures.json` 쓰기뿐이다).

### 1. 일곱 묶음 (SC-001)

홈 → 점 셋 → 설정 → 개발자 → 「진단」. 위에서부터 환경(빌드 `DEV · …`·기기 `Android 16`·추론 위치 「기기 · CPU」) / 저장 점검 / 사진 권한 / 신호 프로브 · 오늘 / 입력 프롬프트 미리보기 / 생성 / 최근 실패가
보드 순서로 모두 보이는지 스크린샷으로 본다. 모델 이름이 어디에도 없는지 본다. 글꼴 2.0배(`settings put system font_scale 2.0` — 끝나면 원래 값으로 복원)에서 잘림이 없는지 본다.

### 2. 저장 점검 (US1)

「저장 점검」 행을 누르면 값이 「{n}편 · 정상」으로 바뀐다 — n이 `files/diary/`의 `YYYY-MM-DD.json` 개수와 같다. **깨진 파일 유도는 `diary/`의 복사본 하나에서만 한다**(백업이 있는 상태에서):
`run-as`로 한 날의 JSON 끝을 잘라 점검하면 「{n}편 · 1편 읽기 실패」가 되고, 원래 파일을 되돌린 뒤 md5로 확인한다.

### 3. 사진 권한과 신호 프로브 (US2)

사진 권한 묶음의 읽기·위치 정보·범위가 설정의 사진 행과 같은 사실을 말한다(현재 기기 상태 — 부분 허용이면 범위 「선택한 사진만」). 신호 프로브: 사진·장소는 숫자 또는 「없음」, 걸음·배터리·연결은 회색 「모름」.
「다시 읽기」를 누를 때만 갱신되는지(다른 앱을 다녀와도 값이 그대로) 본다. 권한을 끄는 실험은 하지 않는다(프로세스가 죽는다 — 057).

### 4. 프롬프트 미리보기 (US5)

프리셋 1 ↔ 2 전환으로 본문이 바뀌고(2에 「사진은 두 장이 남았다.」), 본문 상자가 안에서 스크롤되며 길게 눌러 글자를 선택할 수 있다. `maestro test .maestro/prompt-preview.yml`로 자동 확인(FLOWS 등록 확인).

### 5. 지금 한 번 써 보기 (US3, SC-003)

오늘 일기가 없는 상태(필요하면 `diary/`의 오늘 파일을 이름만 바꿔 빼 둔다 — 백업 있음)에서 「지금 한 번 써 보기」 → 진단·개발자·설정이 닫히고 홈이 오늘 쓰는 중으로 시작하며 토스트
「진단에서 쓰기를 시작했어요.」가 2초 뜬다. 쓰는 중 하단 바(그만두기)와 토스트가 겹치지 않는지 스크린샷으로 본다(R11). 끝나면 오늘의 쓴 날이다.
오늘 일기가 있을 때 다시 눌러 덮어쓰기 확인 없이 쓰는 중으로 가고, 끝나면 새 글로 바뀌는지 본다. 쓰는 중에 설정을 다시 열어 진단에서 또 눌러도 두 번째 쓰기가 시작되지 않는지 본다.

### 6. 최근 실패 (US6, SC-004)

저장 실패 유도(054 방법): 일기 폴더를 `run-as chmod 500 files/diary`로 막고 홈에서 쓰기 → 토스트 「일기를 쓰지 못했어요.」 → 진단의 「최근 실패」에 「저장하지 못함」 한 줄과 시각.
권한을 되돌린다(`chmod 700`) → `ls -ld`로 확인. 그만두기는 기록이 안 늘어나는지(쓰는 중에 「그만두기」) 본다. `preferences/write-failures.json`의 키가 `reason`·`at`뿐인지 `cat`으로 본다.

### 7. 자동 쓰기 지금 실행 (US4)

설정의 「자동으로 쓰기」 현재 값과 시각을 **먼저 적어 둔다**(끝나면 복원). 시각이 지금과 먼 값이어도 「자동 쓰기 지금 실행」이 동작하는지(결과 줄이 「썼음」 또는 「건너뜀」) 본다 — 안 쓴 날이 없으면 「건너뜀」이 맞다.
시드 사진이 있는 안 쓴 날이 있으면 쓰고 완성 알림이 온다(057 문구). **미확인으로 남길 수 있는 것**: 헤드리스에서의 실패 기록(AR5는 계약 테스트로 갈음).

### 8. 끝낸 뒤

설정 값(자동 쓰기·시각·글꼴 배율)을 원래대로 되돌리고 `md5sum preferences/*.json`이 before와 같은지(write-failures.json 제외) 본다. Metro를 끈다 — 셸만이 아니라 8081을 쥔 node 프로세스까지:
`netstat -ano | findstr :8081` → 해당 PID `taskkill`. 실기기 결과는 이 문서 끝에 날짜와 함께 적는다.
