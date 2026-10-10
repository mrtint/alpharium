# Data Model: 073

개발 도구라 저장소 데이터가 아니라 실행기가 다루는 값의 모양이다.

## Layer2Flow (`scripts/layer2/flows.ts`, 사람이 못 박은 표)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `file` | string | `.maestro/layer2-*.yml` (저장소 상대) — `FLOWS`에도 있어야 한다 |
| `story` | string | 지키는 기능 한 줄(대응표 「층 2」 열과 같다) |
| `preferenceOverrides` | `{file, content}[]` | 기준 상태 위에 덮는 `preferences/*.json`. `content`는 실행 시각 값을 받는 함수(예: 목표 시각 = 지금 시) |
| `deleteFiles` | string[] | 기준 상태 뒤 추가로 지우는 `preferences/` 파일(예: `character-names.json`) |
| `absentDays` | `("today"\|"yesterday"\|"day-before")[]` | 일기 픽스처에서 뺄 날 |
| `writtenDay` | `"today"\|"yesterday"` | 흐름이 쓰는 날 — 끝나고 가져올 일기 |
| `env` | `(ctx) => Record<string,string>` | `-e`로 넘길 값(예: `YESTERDAY`) |

**규칙**: 표는 흐름 파일마다 정확히 하나. 표의 `file`이 파일시스템·`FLOWS`·`LAYER2_FLOWS`(`run-device-tests.mjs`)와 일치한다(계약 테스트).

## Layer2Result

`{ status: "passed"|"failed"|"skipped"|"aborted", reason?, perFlow: {file, status, collected?: string}[] }`

- `skipped`: adb·기기·Maestro 없음. `aborted`: 모델 없음·기준 상태 못 만듦·표본 보장 실패·기기 여럿. 둘 다 통과가 아니다.
- `perFlow[].status`는 `passed`/`failed`/`not-run`(앞에서 중단돼 못 돌림). `collected`는 가져온 일기 파일의 로컬 경로(없을 수 있음).
- 전체 `passed`는 모든 `perFlow`가 `passed`일 때만.

## Layer2Device

`Layer1Device`에 `pullFile(serial, relative, localPath): Outcome`를 더한 확장. 소스 계약: `pm clear`·`install`·`uninstall` 문자열이 없다(069 I-1과 같음).

## 층 2 목록

`LAYER2_FLOWS`(`run-device-tests.mjs`)는 `scripts/layer2/flows.ts`의 `file`과 같아야 한다. `.mjs`가 `.ts`를 정적으로 부르지 않는 069 관례 때문에 배열을 양쪽에 두고 계약 테스트가 같음을 잠근다.
