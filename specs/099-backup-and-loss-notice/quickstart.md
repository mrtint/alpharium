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

(구현 구간에서 채운다)
