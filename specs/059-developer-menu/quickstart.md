# Quickstart: 개발자 메뉴 (059)

## 기기 없이

```bash
npm run test:logic   # TP·DS·MD·RD·OB·BD·CL 소스 계약
npm run test:ui      # HK·DV·OF·DG (렌더)
npm test && npm run lint
```

위반 주입(최소): (1) `registerTap`의 간격 비교를 `<`로 바꾸면 TP2가 잡는가 (2) `saveDeveloperMenu`가 시각 필드를 더하면 DS1이 잡는가 (3) `readModuleLines`가 모델 키를 문자열에 섞으면 MD3이 잡는가
(4) `planRedownload`가 연결을 `"other"`에도 모바일 문구를 내면 RD3이 잡는가 (5) `permissionStepsDecided`를 옛 식으로 되돌리면 OB1이 잡는가 (6) `DeveloperScreen.tsx`에 `ESSENTIAL_ASSET_KEYS` import 한 줄을
넣으면 헌법 검사가 잡는가. 치환이 실제로 적용됐는지 먼저 단언하고, 주입 뒤 원래 문자열이 돌아왔는지 다시 grep한다(AGENTS).

## dev 실기기 (SM-S901N)

전제: AGENTS 「도구 사용법」 — **새 네이티브 모듈(`expo-network`)이라 prebuild·재설치가 먼저다.**
`npx expo install expo-network` → `npx expo prebuild --platform android --clean`(**서명 키 사본은 dev에 필요 없다**) → `cd android && ./gradlew assembleDebug`(Metro는 빌드 끝난 뒤에 띄운다) →
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`(**서명이 같은 debug라 덮어 설치된다 — 데이터·모델이 남는다.** `INSTALL_FAILED_UPDATE_INCOMPATIBLE`이면 중단하고 저장소 소유자에게 묻는다. `uninstall`·`pm clear` 금지) →
`dumpsys package <패키지>`의 `requested permissions`에 `ACCESS_NETWORK_STATE`가 있는지 본다 → Metro(`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`), `adb reverse tcp:8081 tcp:8081`, 잠금 해제.
`am force-stop`을 쓰지 않는다 — 홈 버튼 → `am start`. Git Bash에서는 `adb` 경로 인자 앞에 `MSYS_NO_PATHCONV=1`.

### 0. 백업 (반드시 먼저)

```bash
P=com.anonymous.alpharium
MSYS_NO_PATHCONV=1 adb shell "run-as $P sh -c 'cd files && tar cf - diary vision-cache preferences'" > C:/Users/mrtin/AppData/Local/Temp/alpharium-059-backup.tar
tar tf C:/Users/mrtin/AppData/Local/Temp/alpharium-059-backup.tar | head
MSYS_NO_PATHCONV=1 adb shell "run-as $P ls -l files/models" | tr -d '\r'   # 모델 3파일의 크기·시각 — 끝난 뒤 그대로여야 한다
MSYS_NO_PATHCONV=1 adb shell "run-as $P sh -c 'cd files && md5sum preferences/*.json'" > C:/Users/mrtin/AppData/Local/Temp/alpharium-059-before.md5
```

백업을 눈으로 확인하기 전에는 1 이후를 하지 않는다. **「모듈 다시 받기」·「온보딩부터 다시」를 누르기 전에 코드로 확인한다: 이 경로는 모듈 파일을 지우지 않는다(RD6 소스 계약).**

### 1. 개발 환경은 처음부터 켜짐 (SC-008 일부)

홈 → 점 셋 → 설정 → 「정보」 맨 아래에 「개발자」 행(강조 없음). 누르면 개발자 화면: 머리글 오른쪽 「DEV · 1.0.0 (N)」, 「모듈」에 읽는·쓰는 두 줄(`loaded · …MB` 꼴 — 파일 크기와 대조),
「진단」 그룹(개발 빌드만), 「다시 보기」, 「개발자 메뉴 끄기」. 모델 이름이 어디에도 없는지 눈으로 본다. 「진단」 → 기존 진단 화면 → 뒤로 → 개발자 화면 → 뒤로 → 설정 → 뒤로 → 홈.
쓰는 중에 이 왕복을 해도 쓰기가 완주한다(사진 있는 날 쓰기를 시작해 둔다).
개발자 화면에서 뒤로 가면 설정이 **다시 밀려 들어오지 않고** 이미 아래에 있던 그대로 보인다(FR-012 — 설정 겹이 개발자 뒤에서 닫히지 않는다). 개발자가 열린 동안 시스템 뒤로 가기는 개발자 → 설정 → 홈 순서로 한 겹씩 닫고, 쓰는 중이던 홈은 멈추지 않는다.

### 2. 끄기·다시 켜기 (개발 환경 — FR-024)

「개발자 메뉴 끄기」 → 설정으로 돌아가고 「개발자」 행이 없다. `files/preferences/`에 `developer-menu.json`이 **없다**(개발 환경은 파일을 건드리지 않는다). 버전 행을 1초 간격으로 7번 → 「개발자 메뉴가 켜졌어요」 토스트(이 기기에서만),
행이 강조됐다가 1.5초 뒤 사라짐. 앱을 홈 버튼 → `am start`로 다시 열면(프로세스가 죽었으면 다시 켜져 있어야 한다 — 개발 환경) 행이 있다.

### 3. 모듈 다시 받기 (SC-005·SC-006)

필수 모듈이 모두 있는 상태에서 「모듈 다시 받기」 → 대화상자가 아니라 「이미 모두 준비돼 있어요」 토스트. 일기 편수·모델 파일 크기·시각이 0과 같다.
**실제 받기(확인 대화상자 → 진행 화면)는 모듈 하나를 일부러 잘라야 볼 수 있다** — 저장소 소유자 승인 뒤에만: 작은 쪽(`v2.bin`, 약 100MB)을 `run-as`로 백업한 뒤 끝을 잘라(`truncate`) 앱을 다시 열어 두고 「모듈 다시 받기」 →
확인 대화상자(Wi-Fi면 모바일 문구 없음, 모바일 데이터면 「모바일 데이터로 …」), 「받기」 → 진행 화면 → 완료 확인 → 홈. 끝나면 `v2.bin` 크기가 0의 값과 같고 일기 편수·`preferences` md5가 같다.
승인이 없으면 이 칸은 「미확인」으로 적는다(원칙 V — 건너뛴 것은 통과가 아니다).

### 4. 온보딩부터 다시 (OB — 가장 위험했던 죽은 경로)

「온보딩부터 다시」 → 로고가 다시 나오고 권한 단계가 이어진다(이미 부여된 권한은 자동으로 지나간다). 모두 끝나면 홈으로 돌아오고 **다운로드 동의·작명이 다시 뜨지 않는다**. 일기 편수·이름·`preferences` md5가 0과 같다
(`onboarding.json`의 `completed`는 그대로).
**쓰는 중에 누르면** 쓰기가 먼저 멈추고(저장되지 않는다) 로고가 나온다 — 사진 있는 날 쓰기를 시작해 둔 뒤 확인한다. 180초 넘게 기다려도 일기가 새로 생기지 않는다.

### 5. 배포 환경 (S7 — 7번 탭)

배포 환경으로 확인하려면 release 빌드가 필요하다(이 조각은 만들지 않는다 — AGENTS). 대신 dev 빌드를 `EXPO_PUBLIC_APP_ENV=prod`로 띄워 본다(Metro를 그 값으로 다시 띄운다):
설정에 「개발자」 행이 없다 → 버전 행 4번째 탭부터 「개발자 메뉴까지 3번 남았어요」… → 7번째에 켜짐 토스트 → 행이 나타나 강조 → 개발자 화면에 **「진단」 그룹이 없고** 머리글에 「DEV」가 없다 →
앱을 다시 열어도 행이 남아 있다(`preferences/developer-menu.json`) → 「개발자 메뉴 끄기」 → 행이 사라지고 파일이 없다. 끝나면 Metro를 dev 값으로 되돌린다. **release 빌드로는 확인하지 않았다** — 스펙의 「미확인 잔여」.

### 6. 복원 (반드시)

`preferences/developer-menu.json`을 지우고(2·5에서 생겼다면) 3에서 `v2.bin`을 건드렸다면 백업으로 되돌린다. `preferences/*.json` md5를 0과 비교해 `developer-menu.json`만 다르거나 없는지 본다.
Metro는 셸만이 아니라 8081을 쥔 node 프로세스까지 끈다.

### 7. 되살린 Maestro 흐름 (FL2)

`npm run test:device -- .maestro/skeleton.yml` 등 되살린 흐름을 한 번 돌려 통과를 본다(Metro dev 환경 전제, 한글 검증 문구는 `run-device-tests.mjs`가 인코딩을 넣는다). 폐기한 흐름은 돌리지 않는다.

## 실기기 결과

(구현 뒤 채운다.)
