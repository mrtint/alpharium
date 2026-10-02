# Quickstart: 이 휴대폰 (058)

## 기기 없이

```bash
npm run test:logic   # ST·WP·MS·HS 소스 계약·AF·TX
npm run test:ui      # UI·HS(렌더)
npm test && npm run lint
```

위반 주입(최소): (1) `wipeDiaries`에서 잠금 확인을 빼면 WP1이 잡는가 (2) 홈이 `pipeline.run`을 기다리지 않고 `onWipeReady`를 부르면 HS1이 잡는가
(3) `removeAll`이 `.json`이 아닌 이름도 지우면 ST2가 잡는가 (4) `DialogActionButton` 기본 tone을 `danger`로 바꾸면 UI6이 잡는가.

## dev 실기기 (SM-S901N)

전제: AGENTS 「도구 사용법」 — Metro(`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`), `adb reverse tcp:8081 tcp:8081`, 잠금 해제.
**`pm clear`를 하지 않는다**(모델 ~2GB). Git Bash에서는 `adb` 경로 인자 앞에 `MSYS_NO_PATHCONV=1`.

### 0. 백업 (반드시 먼저)

```bash
P=com.anonymous.alpharium
MSYS_NO_PATHCONV=1 adb shell "run-as $P sh -c 'cd files && tar cf - diary vision-cache preferences'" > C:/Users/mrtin/AppData/Local/Temp/alpharium-058-backup.tar
tar tf C:/Users/mrtin/AppData/Local/Temp/alpharium-058-backup.tar | head   # 들어 있는지 눈으로 확인
MSYS_NO_PATHCONV=1 adb shell "run-as $P ls files/diary" | tr -d '\r' | grep -cE '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$'   # 지우기 전 편수(일기 파일만)
MSYS_NO_PATHCONV=1 adb shell "run-as $P sh -c 'cd files && md5sum preferences/*.json'" > C:/Users/mrtin/AppData/Local/Temp/alpharium-058-before.md5   # SC-002 대조용
```

(`run-as`로 tar가 안 되면 `cat`으로 파일마다 빼낸다. 백업을 확인하기 전에는 1 이후를 하지 않는다.)

### 1. 용량·편수 (SC-004·SC-005)

설정 → 「이 휴대폰」. 「쓰는 모듈」 값이 `files/` 아래 모델 파일 크기 합(`run-as … ls -l`)을 1000 기준으로 옮긴 값인지 본다(필수 셋을 모두 받았으면 「2.0GB」).
「일기 모두 지우기」 → 제목의 편수가 0의 파일 수와 같은지, 「취소」·뒤로 가기로 닫히고 아무것도 안 지워지는지 본다.

### 2. 쓰는 중에 지우기 (SC-003)

홈에서 사진 있는 날 「일기 쓰기」 → 쓰는 중에 점 셋 → 설정 → 「일기 모두 지우기」 → 「지우기」. 설정이 닫히고 홈이 오늘의 안 쓴 날인지, 토스트가 없는지 본다.
180초 넘게 기다린 뒤 `files/diary`에 파일이 0개인지 본다.

### 3. 남는 것 (SC-001·SC-002)

`files/diary` 0개, `files/vision-cache` 0개, `preferences/notified.json`이 `{}`. 설정의 이름·자동 쓰기·시각·장소 값과 「쓰는 모듈」 값이 그대로.
`auto-write-skipped.json`이 있었다면 그대로. `md5sum preferences/*.json`을 다시 떠 0의 `alpharium-058-before.md5`와 비교해 `notified.json` 밖의 줄이 모두 같은지 본다(SC-002 — 바이트 단위). 홈에서 「일기 쓰기」가 모듈을 다시 받지 않고 쓴다(쓴 뒤 그 일기는 시험용이므로 4에서 덮인다).
다시 설정을 열면 「일기 모두 지우기」가 흐리고 눌리지 않는다.

### 4. 복원 (반드시)

```bash
MSYS_NO_PATHCONV=1 adb push C:/Users/mrtin/AppData/Local/Temp/alpharium-058-backup.tar /data/local/tmp/b.tar
MSYS_NO_PATHCONV=1 adb shell "run-as $P sh -c 'cd files && rm -rf diary vision-cache && tar xf /data/local/tmp/b.tar'"
MSYS_NO_PATHCONV=1 adb shell rm /data/local/tmp/b.tar
```

앱을 다시 열어 일기 편수(0과 같은 방법으로 센 일기 파일 수)가 0의 수와 같은지 본다.

### (선택) 잠금에 막힘 (FR-016a)

백그라운드 잠금을 흉내 내려면 잠금 파일 `files/locks/diary-generation.lock`에 `{"owner":"background","acquiredAtMs":<지금 ms>}`를 넣고 지우기를 눌러 행 아래 「지금 자동으로 쓰는 중이라 지우지 못했어요.」와
파일이 그대로인지 본다. 끝나면 잠금 파일을 지운다(6분 뒤에는 stale로 저절로 풀린다).
