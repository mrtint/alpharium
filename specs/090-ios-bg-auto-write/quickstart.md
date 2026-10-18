# 090 — 검증 절차

기기: 「Hansan의 iPhone」 iPhone 14, iOS 27.0.1, `D=4EE24F59-A58C-5C8D-A002-141CEE07AE19`. 통로·함정은 `specs/087-ios-real-device-verify/quickstart.md` 1·4절(Xcode를 끄고 lldb, 컨테이너 복사 `dc.sh`, `--remove-existing-content` 금지).

## 1. 기기 없는 확인
`npm test` · `npm run lint` — contracts의 CU·HO·AT·EX·LS·TX가 초록.

## 2. 고치기 전 재현 (FR-009a — 지금 깔린 빌드 그대로)
1. 컨테이너를 맥에 백업한다(`dc.sh from Documents ./backup`).
2. 어제에 사진이 있게 한다(없으면 `npm run ios:seed`로 사진 4장). 목표 시각은 창 밖이 되게 둔다. 어제 일기는 아직 빼지 않는다(3단계).
3. 앱을 한 번 띄워 앱 열기 판정이 끝나게 둔 뒤(목표 시각이 창 밖이면 그 판정은 어제를 넘길 수 있으니, 어제 일기를 뺀 것은 그 판정 **뒤에** 컨테이너에서 한다) 다른 앱으로 뒤로 보내고 충전·Wi-Fi로 꽂아 둔다. OS 깨움(087: 15~30분 간격)을 1시간까지 기다려 시도 기록에 `앱 열기 · 홈에 넘김`과 `백그라운드 · 다른 쓰기가 진행 중`이 같은 시각대에 남는지 본다. 깨움이 오기 전 iOS가 프로세스를 정리해야 백그라운드 재실행에서 `App.tsx`가 새로 그려지므로, 한 시간 안에 안 나면 그 사실(프로세스가 살아 있었는지 `devicectl device info processes`)을 적는다.
4. 결과를 아래 「실측」에 적는다. 재현되지 않으면 그 사실과 기록을 적는다.

## 3. 고친 빌드 설치
087 0절 「빌드 명령(개발 환경 Release)」 그대로 — `prebuild --clean`(로컬 모듈 링크 확인: `ios/Pods`에 `PocketlogBgExpiry`), `.env.production.local` 만들고 빌드 뒤 삭제, `devicectl device install app`(데이터 보존).

## 4. 하룻밤 실측 (SC-001)
1. 안 쓴 지난 날(사진 4장)을 두고 자동 쓰기 켬, 저전력 모드 끔, 화면 잠금, 충전기·Wi-Fi.
2. 다음 날 앱을 열기 전에 컨테이너에서 읽는다: `auto-write-attempts.json`(`launch`·`expired`), 그 날 `diary/*.json`의 `createdAt`·`timing`, `write-failures.json`, `notified.json`, `systemCrashLogs`의 `Pocketlog-*`·`JetsamEvent-*`·`cpu_resource`.
3. 소유자에게 `sudo log collect --device-udid $D --last 12h --output ~/Desktop/pocketlog-night.logarchive`를 부탁하고 `log show --archive … --predicate 'process == "dasd" AND eventMessage CONTAINS "backgroundtask"'`로 미룬 까닭을 읽는다.
4. 판정: 써졌다 → 완주 기록. 아니다 → 기록·dasd로 까닭 한 줄, 로드맵에 남김.

## 5. 안드로이드 회귀
SM-S901N이 붙어 있으면 앱 열기 자동 쓰기 1회(057)가 종전대로 시작하는지 본다. 없으면 「미확인」으로 적는다.

## 실측
(구현 뒤 채운다)
