# Implementation Plan: Xcode 27 UIScene 대응

**Branch**: `094-ios-uiscene` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

## Summary

`expo`를 57.0.30으로, `expo-build-properties`를 정식 의존성으로 올리고 `app.json`에 `ios.enableSceneSupport: true`를 넣어 UIScene 생명 주기를 채택한다. 설정을 계약 테스트로 잠그고, prebuild·실기기로 알림·AppState·이어 하기가 그대로 도는지 확인하며, 문서의 우회 설명을 걷는다.

## Technical Context

**Language/Version**: TypeScript(RN 0.86, Expo SDK 57), Swift(생성물)
**Primary Dependencies**: expo ~57.0.30, expo-build-properties ~57.0.22
**Storage**: N/A
**Testing**: jest(logic) 계약 테스트, prebuild 점검, 실기기 수동
**Target Platform**: iOS 26+ (iPhone 14, iOS 27.0.1), Xcode 26.6(CI)·27
**Project Type**: mobile-app
**Constraints**: 빌드 번호 불변, 안드로이드 불변, `expo-background-task` 57.0.14 고정

## Constitution Check

- 원칙 I~IV: 추론·프롬프트·판정 무관 — 영향 없음. 원칙 V(건너뛴 실기기는 통과 아님): 실기기 확인을 완료 조건으로 둔다. 위반 없음.

## Project Structure

```text
package.json, package-lock.json     expo·expo-build-properties
app.json                            plugins 항목
__tests__/config/ios-scene-support.test.ts   계약(contracts/config-contract.md)
AGENTS.md, docs/roadmap/README.md, specs/092-…/quickstart.md   문서
```

## Phases

- Phase 0: [research.md](research.md) — 미지수 둘은 실기기로 닫는다.
- Phase 1: [data-model.md](data-model.md), [contracts/](contracts/config-contract.md), [quickstart.md](quickstart.md).

## 위험

알림 응답/BGTask 처리기 등록이 scene 도입으로 바뀔 수 있다 — 실기기 `--console` 로그로 본다.
