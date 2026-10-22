# Data Model: 096

저장하는 데이터는 없다. 판정 입출력만 정한다.

## 안드로이드 `VersionCodeVerdict`

- 입력: `current: number`(정수), `stored: number[]`(스토어 번들 `versionCode`).
- 출력: `{ ok: true, last: number | undefined }` 또는 `{ ok: false, relation: "same" | "lower", last: number, minimum: number, message: string }`.
- 규칙: `last = max(stored)`(비면 `undefined`, 통과). `current > last` 통과. `current === last` same, `current < last` lower. `minimum = last + 1`. `current === last`이거나 `stored`에 `current`가 들어 있으면(중간 번호 중복) same, 그 밖에 `current < last`이면 lower다(same이 먼저).

## iOS `BuildNumberVerdict`

- 입력: `current: string`(정수 문자열), `version: string`, `stored: string[]`(그 버전의 스토어 빌드 번호 문자열).
- 출력: `{ ok: true, last: number | undefined, ignored: number }` 또는 `{ ok: false, relation, last, minimum, ignored, message }`.
- 규칙: 정수(`/^\d+$/`)로 읽히는 `stored`만 비교하고 나머지는 `ignored`로 센다. 나머지 규칙은 안드로이드와 같다.
