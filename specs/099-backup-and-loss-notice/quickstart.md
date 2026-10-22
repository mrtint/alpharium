# Quickstart: 099 실측과 검증

기기 안전: `pm clear`·재설치 금지(모델 ~2GB), `devicectl --remove-existing-content` 금지, 파일 삭제는 앱 안 lldb로만. 안드로이드는 `adb shell svc power stayon true`. iPhone은 prod 환경 빌드, lldb·`ios:seed`는 Xcode를 끈다.

## A. 기기 불필요

1. `npm test` · `npm run lint` 통과.
2. 위반 주입 3종(플러그인 `vision-cache` 제외 추가 / `preferences` 제외 추가 / `models` 제외 삭제)·호출 지점 삭제 → 각각 테스트가 실패하는 것을 보고 되돌린다.
3. `npx expo prebuild --platform android --clean` 뒤 생성 매니페스트와 `res/xml/pocketlog_*.xml` 확인, `adb shell dumpsys package com.a810labs.pocketlog`로 속성 확인.

## B. 안드로이드 실측 (SM-S901N, M5)

1. 규칙 없는 상태(현 main 빌드)에서 일기·모델이 있는 상태로 `adb shell bmgr backupnow com.a810labs.pocketlog` + logcat/`dumpsys backup`로 무엇이 얼마나 실리는지 기록(S-A0).
2. 일기 데이터를 25MB 위로 만든 상태로 같은 것을 한 번 더(S-A1) — 초과 시 일기 쪽이 어떻게 되는지.
3. 규칙을 넣은 빌드를 같은 서명 덮어쓰기로 올리고(`files/models` 유지 확인) 같은 실행(S-A2): `models/` 부재, `preferences/`·`vision-cache/`·일기 존재.
4. 백업 전송이 안 보이면 대체 경로(`bu backup`)와 그 한계를 기록한다.

## C. iOS 실측 (iPhone 14)

1. 모델이 이미 있는 설치 위에 새 빌드를 덮어 설치 → 앱을 연 뒤 `models` 파일이 그대로(재다운로드 0바이트), 속성이 참(S-I1).
2. 앱 안에서 `NSURLIsExcludedFromBackupKey`(lldb `dlsym` 식)로 `models`는 참, `preferences`·`vision-cache`·일기 디렉터리는 거짓(S-I2). 모듈의 `isExcludedFromBackup` 값과 교차 확인.
3. 모델 받는 도중 파일(`.part`/`.seg*`)에 속성이 상속되는지(R1 미확인) 시험하고, 안 되면 폴백(T-FALLBACK).

## D. 문구

1. 실측 결과로 방침 `retention`·지원 `uninstall` 문장을 같은 말로 고치고 S10 테스트를 맞춘다.
2. 설정 화면에서 안내 줄 확인, 글꼴 2.0배에서 잘리지 않음(SM-S901N).

## 결과 기록

`quickstart.md` 아래 「실측 기록」 절에 S-A0~S-I2 값을 그대로 적는다(짐작은 [미확인]으로 표시).

## 실측 기록

### 안드로이드 (SM-S901N, Android 16 계열, dev 빌드, 2026-10-22)

방법: 전송을 임시로 `com.android.localtransport/.LocalTransport`로 바꾸고(끝나면 `com.google.android.gms/.backup.BackupTransportService`로 되돌림) `adb shell bmgr backupnow com.a810labs.pocketlog` + `adb logcat`. **구글 서버로 보내지 않는다.** Google 전송의 한도·동작은 이 실측 밖이다 — [미확인].

**S-A0 — 규칙 없는 빌드 (현 main 계열, `allowBackup=true`·규칙 없음)** — [실측]
- 앱 데이터: `files/models` 1,959,788KB(a1.bin 1.52GB·v1.bin 379MB·v2.bin 103MB), `files/diary` 20KB, `files/vision-cache` 284KB, `files/preferences` 20KB, `app_rnllama-htp` 2.7MB, 개발 빌드의 `BridgelessReactNativeDevBundle.js` 약 10MB(배포 빌드에는 없다).
- 결과: `Package com.a810labs.pocketlog with result: Size quota exceeded`, logcat `PFTBT: Error -1005 backing up com.a810labs.pocketlog` · `Transport quota exceeded for package`. 모델 파일이 측정에 잡혔고(`FullBackup_native: measured [.../files/models/a1.bin] at 1522797568`) 한도를 넘어 **패키지 전체의 백업이 거부됐다 — 일기·설정도 함께 실리지 않는다.**
- 의미: 규칙이 없는 지금, 일기 데이터가 아무리 작아도 안드로이드 백업에는 일기가 없다(모델이 있는 한).

**S-A2 — 규칙 있는 빌드(같은 서명 `adb install -r`, `files/models` 4개 파일 그대로 보존 확인)** — [실측]
- 생성 매니페스트: `android:fullBackupContent="@xml/pocketlog_backup_rules"`·`android:dataExtractionRules="@xml/pocketlog_data_extraction_rules"`, `allowBackup="true"` 불변. `res/xml/pocketlog_*.xml`은 `models/` 제외 하나씩(데이터 추출 규칙은 클라우드·기기 간 이전 둘 다).
- 결과: `result: Success`, 전송 13,157,888바이트(진행 `13158400/13155840`). logcat `FullBackup_native: measured`에 `files/models/*`가 **없다**. `files/diary/*.json`·`files/preferences/*.json`·`files/vision-cache/*.jpg`는 모두 잡혔다. 13.2MB 중 약 10MB는 개발 빌드 전용 `BridgelessReactNativeDevBundle.js`다(배포 빌드에는 없다).
- 의미: 규칙 뒤에는 일기·설정·사진 사본이 실리고(로컬 전송 기준) 모델은 실리지 않는다. S-A0은 패키지 전체가 거부됐으므로 이 규칙은 일기 백업을 **살린다**.

**S-A1 — 규칙 있는 빌드에 앱 전용 20MB 임시 파일(`files/zz-s-a1-filler.bin`)을 더해 합계 약 33MB** — [실측]
- 결과: `result: Size quota exceeded`, `PFTBT: Error -1005`·`Transport quota exceeded for package`. 임시 파일은 확인 후 지웠다(`ls`로 `files/`에 없음 확인).
- 의미: 모델을 뺀 일기 데이터가 25MB를 넘으면 **일기·설정까지 포함한 패키지 전체의 백업이 거부된다.** 이것은 이 과제가 만든 상태가 아니라 OS 한도다 — D4(안내 문구만)에 따라 막지 않고, 방침·앱 안 안내가 「일기는 백업으로 되살아난다고 보장하지 않는다」를 사실대로 말한다.

**남은 안드로이드 [미확인]**: Google 백업 전송(`com.google.android.gms`)의 한도·동작(로컬 전송의 한도로 갈음했다 — 구글로 올리지 않았다), 기기 간 이전(Smart Switch·D2D)에서 규칙이 어떻게 쓰이는지, Android 11 이하(`fullBackupContent` 경로)는 기기가 없어 규칙 파일 존재만 확인했다.

**T013a — 모델 없이 일기만 돌아온 기기** — [소스·기존 테스트로 확인, 실기기 미확인]: 설정·온보딩 플래그가 복원돼 `namingDone: true`여도 모델이 없으면 `downloadReady: false`이고, `resolveFirstRunStage`는 「받기」 단계에서 멈춘다(`__tests__/firstrun/progress.test.ts` 4번 「동의는 했지만 다운로드 미완료 → downloading」·「namingDone: true여도 downloadReady: false인 동안은 naming으로 가지 않는다」, `__tests__/models/readiness.test.ts` 「파일도 흔적도 없으면 '받지 않음'」). 새 판정 코드는 없다.

### iOS (iPhone 14, iOS 27.0.1, prod 환경 Release 개발 서명 빌드, 2026-10-22)

방법: `EXPO_PUBLIC_APP_ENV=prod`·수동 서명(「Pocketlog Development」)으로 빌드해 기존 설치(build 13, 개발 서명) 위에 `devicectl device install app`로 덮어 설치, 앱을 실행한 뒤 Xcode를 끄고 lldb로 붙어 읽기만 했다(쓰기·삭제 없음). `--remove-existing-content`는 쓰지 않았다.

**S-I1 — 기존 설치 위에 덮어 설치** — [실측]
- 설치 전후 `Documents/models`의 `a1.bin`(1.42GB)·`v1.bin`(361.7MB)·`v2.bin`(98.1MB)·`state.json`이 크기와 수정 시각 그대로다. 모델 경로 불변, 재다운로드 0바이트(SC-003). 앱 실행 뒤에도 `Documents/diary`·`preferences`는 그대로.

**S-I2 — 앱 안에서 `NSURLIsExcludedFromBackupKey` 읽기** — [실측]

| 경로 | `NSURLIsExcludedFromBackupKey` | xattr `com.apple.metadata:com_apple_backup_excludeItem` |
| --- | --- | --- |
| `Documents/models` | **1** | 있음(22바이트) |
| `Documents/preferences` | 0 | 없음(-1) |
| `Documents/vision-cache` | 0 | 없음(-1) |
| `Documents/diary` | 0 | 없음(-1) |
| `Documents/models/a1.bin`·`state.json` (파일) | 0 | — |

- 의미: 제외는 **디렉터리 하나**에 걸려 있고 일기·설정·사진 사본에는 걸려 있지 않다. 파일 자체의 값이 0인 것은 정상이다 — Apple 문서상 디렉터리의 제외는 그 아래 전체에 적용되지만 `NSURLIsExcludedFromBackupKey`는 그 항목 자신의 표시만 읽는다.
- **[미확인]** 실제 iCloud/기기 백업에 `models` 파일이 빠지는지는 관측하지 못했다(`idevicebackup2`가 없어 로컬 백업 내용을 열어 보지 못했고, iCloud 백업 용량 화면은 쓰지 않았다). 근거는 Apple 문서(디렉터리에 건 제외가 하위에 적용)와 위 표다. 새로 생기는 `.part`·`.seg*` 파일도 같은 디렉터리 안이므로 같은 규칙을 따른다 — T013(파일 단위 폴백)은 만들지 않는다.
- 설치 직전(옛 빌드)의 `models` 표시는 읽지 않았다 — 옛 코드에 제외 호출이 없다는 것(소스)과 설치 뒤 값이 1이라는 것으로 갈음한다.

### 요약 (방침·앱 안 안내의 근거)

| 플랫폼 | 모델 | 일기 | 설정 | 일기의 사진 사본 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 안드로이드 (규칙 뒤) | 백업에 실리지 않음 [실측] | OS 기본 — 실림 [실측: 로컬 전송] | 실림 [실측] | 실림 [실측] | S-A2 |
| 안드로이드 (규칙 앞) | 한도 초과로 패키지 전체 거부 [실측] | 실리지 않음 [실측] | 실리지 않음 [실측] | 실리지 않음 [실측] | S-A0 |
| 안드로이드 (모델 뺀 합계가 25MB 초과) | — | **실리지 않음(전체 거부)** [실측] | 실리지 않음 [실측] | 실리지 않음 [실측] | S-A1 |
| iOS | 제외 표시 확인 [실측], 백업 내용 관측 [미확인] | 건드리지 않음(OS 기본) [실측: 표시 없음] | 건드리지 않음 [실측] | 건드리지 않음 [실측] | S-I2 |
| Google 백업 전송·기기 간 이전·Android 11 이하·iCloud 실제 백업 내용 | [미확인] | [미확인] | [미확인] | [미확인] | — |

### 설정 화면 (SM-S901N, dev 빌드 + 이 브랜치 JS, 2026-10-22) — [실측]
- 「이 휴대폰」 묶음에서 「쓰는 모듈 2.0GB」 → 「일기 모두 지우기」(빨강) → 보조 줄 「앱을 지우거나 휴대폰을 바꾸면 일기가 사라질 수 있어요.」 순서로 보인다. 기존 행·문구는 그대로다.
- 글꼴 2.0배(`settings put system font_scale 2.0`, 끝난 뒤 1.0으로 되돌림): 안내가 두 줄로 줄바꿈되어 전부 보이고 잘리지 않는다.
- iPhone 화면은 보지 않았다(설치한 빌드는 안내 문구를 넣기 전 JS) — [미확인].

### 코드 리뷰 반영 메모
- 25MB는 OS 문서의 수치이고 이 실측은 로컬 전송의 두 점(약 13MB 성공, 약 33MB 거부)뿐이다 — 방침·지원은 숫자 없이 「OS가 정한 한도」로 쓴다.
- 일기 사진 사본이 하루 최대 8장씩 쌓이므로 오래 쓰면 안드로이드 백업 한도를 넘을 수 있다 — D4(안내 문구만)에 따라 막지 않고 안내가 보장하지 않음을 말한다.
- iOS 제외가 실패해도 화면·진단에 드러나지 않는다(원칙 IV — 측정 코드 없음). 알려면 사람이 lldb로 `NSURLIsExcludedFromBackupKey`를 읽는다.
