# Implementation Plan: iPhone — 사용자가 시작한 쓰기를 앱을 나가도 끝까지

**Branch**: `092-ios-continued-write` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

iOS 26 `BGContinuedProcessingTask`로 홈이 시작한 쓰기를 앱 밖에서 이어 돌린다. 로컬 Expo 모듈이 신청·진행·닫기·만료를 맡고, 홈은 주입된 세션으로 시작 때 신청하고 단계·박동을 보고하며 끝나면 닫는다. 신청이 받아들여진 쓰기는 앞을 벗어나도 끊지 않는다. 막대가 실제 일로 움직이도록 iOS 홈 쓰기는 091 조각 생성(쉼 0)을 쓰고, 조각·사진 한 장마다 박동을 낸다.

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo 57, Hermes) + Swift(로컬 Expo 모듈, `if #available(iOS 26, *)` — 배포 대상 16.4)
**Primary Dependencies**: `BackgroundTasks`(`BGContinuedProcessingTaskRequest`·`BGContinuedProcessingTask`), 091 `completePaced`·`pacing.ts`, 057 완성 알림(`sendCompletionNotification`), 080 등록부
**Storage**: 없음(세션은 프로세스 안)
**Testing**: jest(`logic`·`ui`), 소스 계약(Swift 이름·Info.plist 와일드카드·이벤트 이름), 실기기 iPhone 14(무선, 충전 안 함)
**Constraints**: 원칙 IV·005 FR-028b(박동은 종류뿐 — 토큰 콜백은 `llama-port.ts` 경계에서 데이터를 버리고 인자 없는 박동만 낸다, 실측 뒤 개정), 062(문구는 카탈로그), 화면은 네이티브에 닿지 않는다(세션은 `App.tsx`가 주입), 안드로이드 바이트 동일

## Constitution Check

I 무변경(온디바이스) · II 프롬프트 바이트 동일(조각 생성은 같은 서식 프롬프트) · III 무관 · IV 통과(진행 표시는 원칙 IV의 UX 예외 — 단계 문구·막대, 지표는 경계 밖으로 안 나감) · V 실기기 완주가 완료 조건. Post-design 통과.

## Structure

```text
modules/pocketlog-continued-write/            # (새) expo-module.config.json·package.json·podspec
  ios/PocketlogContinuedWriteModule.swift     # begin/report/finish, Events("onExpired")
plugins/with-battery-bg-task.js               # Info.plist에 `com.a810labs.pocketlog.write.*` 더함(같은 plugin, 이름 유지)
src/app/continued-write-port.ts               # (새) 네이티브 통로 — 없으면 늘 거절
src/app/continued-write.ts                    # (새) 세션: 신청·단계·박동 → 막대 값(순수 계산 + 통로)
src/inference/heartbeat.ts                    # (새) 박동 구독(종류만) — 엔진·사진이 낸다
src/inference/assembly.ts                     # pacingFor: screen·ios → { pauseRatio 0, chunkTokens 32 }(스레드·한도 없음)
src/inference/on-device.ts                    # Pacing의 threads·timeoutMs 옵셔널 처리
src/inference/llama-port.ts                   # 조각 끝마다 beat("chunk")
src/vision/vision-port.ts                     # 캡션 한 장마다 beat("photo")
src/inference/pacing.ts                       # FR-010 — 쉼을 멈춤이 끊음
src/ui/DiaryHomeScreen.tsx                    # prop `continuedWrite?` — 시작·보고·닫기, 앞 벗어남 판단
App.tsx                                       # 세션 주입, 앱 밖 성공이면 완성 알림
src/schedule/task.ts                          # sendCompletionNotification export
src/i18n/catalogs/ko/continued.ts             # (새) 제목·단계 문구
```

## Complexity Tracking

| 추가 | 왜 | 버린 대안 |
| --- | --- | --- |
| 새 로컬 모듈 | 090 모듈은 expo 패치의 이벤트 중계 — 성격이 다르다 | 090 모듈에 덧붙이기(이름이 거짓이 된다) |
| iOS 홈 쓰기의 조각 생성 | 막대가 실제 일로 움직여야 한다(시스템이 멈춘 진행을 끝낸다) | 타이머 박동(원칙 V — 흉내), 토큰 콜백(005 FR-028b) |
