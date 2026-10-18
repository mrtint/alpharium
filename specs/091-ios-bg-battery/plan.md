# Implementation Plan: iPhone 충전 없이 백그라운드에서 쓰기

**Branch**: `091-ios-bg-battery` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

## Summary

iOS 백그라운드 처리 요청을 둘(충전·배터리)로 내고, 깨운 요청을 기록하며, 배터리로 깼을 때만 CPU 한도 밑의 「느린 쓰기」(스레드 1·호출 사이 쉼·조각 생성)로 쓴다. 먼저 요청·기록을 설치해 배터리 하루 깨움을 재고, 느린 쓰기로 충전 없는 완주를 본다.

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo 57, Hermes) + Swift(expo 패치, 로컬 모듈)
**Primary Dependencies**: `expo-background-task` 57.0.14(패치 확장), `llama.rn`(`getFormattedChat`·`completion({prompt})`), 090 로컬 모듈 `modules/pocketlog-bg-expiry`
**Storage**: 시도 기록 옵셔널 필드 `wake`; 네이티브 → JS는 `UserDefaults` 키 하나(`pocketlog.bgWakeIdentifier`)
**Testing**: jest(`logic`·`ui`), 소스 계약(패치·Info.plist·Swift 이름), 실기기 iPhone 14(무선 연결)
**Constraints**: 원칙 IV(생성 지표 경계 — 조각 생성도 `{text, ending}`만), 005 FR-028b(토큰 콜백 금지 — 조각은 콜백 없이 호출 단위), 079 「조립 주체가 값을 정한다」, `src/schedule/`에 `AppState` 없음

## Constitution Check

I 무변경(온디바이스) · II 프롬프트 바이트 동일(조각 생성은 같은 서식 프롬프트에 생성분을 이어 붙일 뿐) · III 무관 · IV 통과(지표 버림 유지, 기록은 갈래·시각·상태) · V 실기기 하루 측정·완주가 완료 조건. Post-design 통과.

## Structure

```text
patches/expo-background-task+57.0.14.patch   # 요청 둘·식별자 둘 등록·깬 식별자를 UserDefaults에
plugins/with-battery-bg-task.js               # Info.plist BGTaskSchedulerPermittedIdentifiers에 배터리 식별자
modules/pocketlog-bg-expiry/ios/…Module.swift # Function("wakeKind") — UserDefaults를 읽어 "power"|"battery"|null
src/app/bg-expiry-port.ts                     # readWakeKind()
src/app/auto-write-attempts.ts                # wake 필드
src/app/diagnostics-view.ts, catalogs/ko/attempts.ts  # 「· 충전」/「· 배터리」
src/schedule/task.ts                          # wake 읽기 → 기록·makePipeline({wake})
src/app/wiring.ts                             # wake를 백엔드 조립에
src/inference/assembly.ts                     # pacingFor(owner, platform, wake)
src/inference/on-device.ts                    # pacing을 엔진·사진 엔진에
src/inference/llama-port.ts                   # 조각 생성(completePaced) + 쉼
src/inference/pacing.ts                       # (새) 쉼 계산·잠자기 — 순수 + 주입
src/vision/vision-port.ts                     # 장 사이 쉼
src/i18n/catalogs/ko/settings-platform.ts     # FR-008(조건부)
```

## Complexity Tracking

| 추가 | 왜 | 버린 대안 |
| --- | --- | --- |
| 조각 생성 | 한 번의 생성 호출이 CPU 48초를 넘는다 | 토큰 콜백으로 쉼(FR-028b 위반·네이티브를 못 멈춤) |
| 요청 둘 | 충전 중 속도 유지 | 늘 느린 쓰기(접근 B — 소유자 A 선택) |
