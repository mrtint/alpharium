# Quickstart: 069 검증 시나리오

전제: 모델이 받아져 있는 **전용 테스트 기기**(debug 빌드 설치, 화면 잠금 해제, USB 연결), `adb reverse tcp:8081 tcp:8081`, Metro가 dev 환경으로 떠 있음(`EXPO_PUBLIC_APP_ENV=dev`, AGENTS 「도구 사용법」). 이 기기의 일기는 지워진다.

## Q0. 기기 없는 확인 (항상)

```
npm run test:logic          # __tests__/e2e/* 포함
npm run lint
```

통과 기준: 드리프트 가드·픽스처 왕복·대응표 불변식 M-1~M-10가 초록. 이것만으로는 완료가 아니다(원칙 V).

## Q1. 층 1 한 번 완주 (SC-003·SC-004)

```
npm run test:layer1
```

기대: L0 안내 → 기준 상태 적용 → 흐름 전부 통과 → `passed`. 시작 전후 `adb shell run-as com.a810labs.pocketlog ls -l files/models`의 파일 크기가 같다.

## Q2. 건너뜀·중단이 통과로 보이지 않는다 (SC-008)

- 기기 없이 실행 → `skipped`(종료 코드 0), 「통과」 문구 없음.
- 모델 파일을 옮겨 둔 기기에서 실행 → 중단 + 「모델이 없다」, 종료 코드 1.
- (가능하면) release 빌드가 깔린 기기 → 중단 + `run-as` 불가 이유.

## Q3. 위반 주입 (SC-005·SC-006)

1. `restart-persistence`: `src/diary/store.ts`의 `file.textSync()` → `file.text()`(await 없음, 원래 결함의 꼴)로 치환(치환이 적용됐는지 먼저 grep) → `CI=1` Metro는 파일 감시가 없으므로 Metro를 다시 띄우고 번들에서 치환된 줄을 grep으로 확인(네이티브 재빌드 불필요)하고 `node scripts/run-device-tests.mjs --layer1 .maestro/restart-persistence.yml` → 실패 기대. 되돌려 통과 확인, `git diff`가 비었는지 확인.
2. `single-photo-swipe`: `src/app/photo-viewer.ts`의 `isTap`을 항상 `true`로 → 흐름이 쓸기 뒤 확대 화면이 열려 실패 → 되돌림.

실패가 한 번에 안 나면 횟수를 늘려 다시 한다. 그래도 안 나면 주입이 안 먹었거나 확률 문제 — 결과를 그대로 기록한다.

## Q4. 손으로 보는 것 (대응표 「사람이 봄」)

핀치 확대, 부작용 행(한 번 써 보기·자동 쓰기 지금 실행·모듈 다시 받기·온보딩부터 다시·끄기)의 실제 동작은 층 1이 보지 않는다.

## 실측 기록

구현 구간에서 기기를 돌린 뒤 여기에 적는다(날짜·기기·흐름·결과). 기기가 없어 못 돈 항목은 「미검증」으로 적는다 — 건너뛴 것은 통과가 아니다(원칙 V).

| 날짜 | 기기 | 항목 | 결과 |
| --- | --- | --- | --- |
| 2026-10-10 | SM-G986N(dev, Metro CI=1) | `npm run test:layer1` 새 흐름 셋 | 3/3 통과 (restart-persistence 2m30s, single-photo-swipe 21s, settings-developer-sweep 1m51s) |
| 2026-10-10 | 같음 | 기존 흐름 후보 8개를 층 1 기준 상태로 | 통과 5: dialog-foundation·diary-home-1d·week-strip-swipe·diary-body-screen·state-simulation / 실패 3(수정 없이): skeleton(`"모듈 상태"`)·prompt-preview(`".*주인의 휴대폰이다.*"`)·today-diary(`"일기"`) |
| 2026-10-10 | 같음 | 위반 주입 1 — `file.textSync()` → `await file.text()` | 재현되지 않음(restart 10회·30회 통과). 주입이 번들에 들어갔음을 확인함 |
| 2026-10-10 | 같음 | 위반 주입 1' — 원래 결함의 꼴 `file.text()`(await 없음) | `restart-persistence` **실패** → 되돌려 **통과**(`git diff -- src` 빔) |
| 2026-10-10 | 같음 | 위반 주입 2 — `isTap`이 항상 `true` | `single-photo-swipe` **실패** → 되돌림(`git diff -- src` 빔) |
| 2026-10-10 | 같음 | 층 1 전체 처음부터 (8개 흐름) | 8/8 통과, 7m37s, 시작 전후 `files/models` 크기 동일(a1 1522796768·v1 379219104·v2 102815168) |
| 2026-10-10 | 같음 | Q2 — 기기 없음 | **실측**: `ADB_SERVER_SOCKET`으로 adb 서버를 막고 실행 → `SKIPPED`(종료 코드 0), 「통과」 문구 없음 |
| 2026-10-10 | 같음 | Q2 — 모델 없음 | **실측**: `v2.bin`을 같은 폴더에서 `v2.bin.hold`로 바꾸고 실행 → `ABORTED`(「모델이 없다: v2.bin」, 종료 코드 1), 일기·설정을 건드리지 않음. 되돌려 크기 동일 확인 |
| 2026-10-10 | 같음 | Q2 — `run-as` 불가 | **부분 실측**: 디버그가 아닌 패키지에 `run-as`를 부르면 `adb`가 종료 코드 1과 `run-as: package not an application`을 준다 — `probe()`가 보는 신호와 같다. **미검증(실제 상황)**: release 빌드 설치(19분 빌드·debug 삭제 시 모델 소실이라 소유자 요청 때만)와 재부팅 직후 잠금 해제 전 |
| 2026-10-10 | 같음 | 권한 행 왕복 | **실측**: 위치(3회 연속)·알림·배터리 행을 눌러 OS 설정에서 `back` → 설정 화면 복귀. 사진 행과 함께 `settings-developer-sweep`에 넣어 통과(2m10s) |
