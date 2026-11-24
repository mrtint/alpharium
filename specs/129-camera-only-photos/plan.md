# Implementation Plan: 카메라로 찍은 사진만 재료로 쓴다

**Branch**: `129-camera-only-photos` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

## Summary

하루의 사진 수집(`collect.ts`)이 「카메라로 찍은 사진인가」 판정(`src/signals/camera-only.ts`, 순수) 하나를 통과한 사진만 담는다. 기기 계층(`expo-port.ts`)은 레거시 일괄 조회로 출처 사실(안드로이드 파일 경로, iOS `mediaSubtypes`)을 싣고 판정하지 않는다. 023 폴더 거르기·되돌림·`folderNamesFor`(사진마다 `getUri()`), 128 읽기 전 판정은 걷거나 옮긴다. 시딩 폴더는 `allowsSeedPhotos(resolution)`이 참일 때만 인정하고 헌법 검사 `checkSeedPhotoFile`(SP1~SP3)이 잠근다.

FR-006 결정: iOS는 스크린샷 종류·이름·비율로만 뺀다. 기기 정보(EXIF)는 읽지 않는다 — 읽는 호출이 11-09 멈춤 호출과 같아 2B의 「비용 감당」 조건이 깨진다(research R2). 사파리·메신저 저장 사진은 iOS에서 남는다.

## Technical Context

**Language/Version**: TypeScript 5 (Expo SDK 57, RN 0.86)
**Primary Dependencies**: `expo-media-library` 57.0.5 — `expo-media-library/legacy`의 `getAssetsAsync` (새 의존성·네이티브 모듈 없음)
**Storage**: 없음(저장 형식 변화 없음)
**Testing**: jest `logic`(판정·수집·헌법 검사), `ui`(영향 화면 회귀), 실기기 SM-S901N·iPhone 14
**Target Platform**: Android 14+, iOS 26+
**Performance Goals**: 출처를 얻으려 사진마다 경로를 푸는 호출 0회(SC-004)
**Constraints**: 원칙 V(모르면 뺀다), `process.env`는 environment.ts만, 기기 계층 판정 금지(023)
**Scale/Scope**: 하루 사진 수 상한 없음(012)

## Constitution Check

| 원칙/조항 | 판정 |
| --- | --- |
| II 프롬프트는 prompt.ts에만 | 영향 없음 — 프롬프트 변화 없음 |
| IV 측정·채점 코드 없음 | 뺀 장 수를 어디에도 남기지 않는다 |
| V 모르는 것을 채우지 않는다 | 출처 모름 → 제외. 권한 없음 → 종전대로 `unknown`(뺀 결과 0장일 때만 `none`) |
| 사진과 시각 처리 MUST | 카메라 사진이 있으면 반드시 시각 처리(변화 없음). 카메라 사진이 0이면 「볼 사진이 없다」 → 엔진을 열지 않음(조항 그대로) |
| 개발 방식 | 계약·테스트 먼저, 한국어 커밋, 브랜치 |

게이트 통과. 설계 뒤 재평가도 같다.

## Project Structure

```text
src/signals/camera-only.ts      (새) 판정·allowsSeedPhotos — 시딩 폴더 이름의 유일한 자리
src/signals/port.ts             PhotoFacts에 출처 사실(localPath·mediaSubtypes), folderName·folderNamesFor 제거
src/signals/expo-port.ts        photosBetween을 레거시 getAssetsAsync 페이지 조회로, folderNameOf·folderNamesFor 제거
src/signals/collect.ts          collectDaySignals(port, day, { allowSeed }) — 판정 뒤 known/none
src/signals/types.ts            Photo.folderName 제거
src/app/wiring.ts               loadSignals 기본값에 allowsSeedPhotos(resolution)
src/vision/select.ts            NON_CAMERA_FOLDERS·classifyPhotos·되돌림 제거
src/vision/caption.ts           looksLikeScreenCapture(읽기 전 판정) 제거
src/inference/on-device.ts      resolveFolders·attachFolderNames 제거
scripts/constitution-rules.ts   checkPhotoPortFile 어휘 갱신, checkSeedPhotoFile(SP1~SP3) 추가
scripts/check-constitution.mts  등록
scripts/seed-day.mts 등          023 잡사진 시딩 설명 갱신(동작 확인)
__tests__/…                     판정·수집·헌법 검사·기존 023/128 테스트 갱신
```

**Structure Decision**: 단일 앱 구조 그대로. 판정은 signals 층(관측 방어선) 한 파일.
