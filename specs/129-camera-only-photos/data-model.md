# Data Model: 129

## PhotoFacts (기기 → 수집, `src/signals/port.ts`)

| 필드 | 형 | 비고 |
| --- | --- | --- |
| id, takenAtMs, filename?, width?, height? | 종전 | |
| localPath? | string | 안드로이드 파일 경로(`file://` 뗀 것). 모르면 키 없음 |
| mediaSubtypes? | readonly string[] | iOS 종류 목록. 안드로이드는 키 없음 |
| ~~folderName~~ | — | 제거(023) |

## Photo (`src/signals/types.ts`)

`folderName` 제거. 나머지 그대로 — 출처 사실은 수집에서 판정에만 쓰고 이월하지 않는다.

## CameraVerdict (`src/signals/camera-only.ts`)

`"camera" | "excluded"`. 판정 입력: `PhotoFacts` + `{ allowSeed: boolean }`.

## 상태 변화

`photos`: 권한 없음 → `unknown`(종전) / 조회 실패 → `unknown` / 판정 뒤 0장 → `none` / 그 밖 → `known`(카메라 사진만).
