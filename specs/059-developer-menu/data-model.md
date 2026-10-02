# Data Model: 개발자 메뉴 (059)

## 1. 켜짐 파일 `preferences/developer-menu.json`

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `enabled` | `true` | 켜짐일 때만 파일이 있다. 끄면 파일을 지운다(`false`를 쓰지 않는다). |

- 값은 켜짐 여부 하나뿐이다 — 켠 시각·탭 횟수·끈 횟수를 담지 않는다(원칙 IV, D3). `auto-diary.json`·`onboarding.json`에 필드를 더하지 않는다.
- 읽기: 없음·JSON 아님·`enabled !== true`·통로 예외는 전부 「꺼짐」. 던지지 않는다.
- 쓰기: `.writing` 임시 파일에 쓴 뒤 옮긴다(`skip-store.ts`와 같은 방식). 실패해도 그 실행의 상태는 켜짐으로 둔다(FR-009).
- **개발 환경(`showsOnScreen`)에서는 이 파일을 읽지도 쓰지도 않는다** — 환경이 이긴다(R2). 끄기는 세션 상태.
- 일기 모두 지우기(058)는 이 파일을 지우지 않는다(「설정」 쪽 사실).

## 2. 켜짐 상태 (메모리, `AppFrame`)

| 상태 | 값 | 비고 |
| --- | --- | --- |
| `persisted` | `boolean`(읽기 전 `false`) | 배포 환경의 파일 사본 |
| `sessionOff` | `boolean` | 개발 환경의 「이 실행 동안 끔」 |
| `enabled`(파생) | 개발 환경 `!sessionOff`, 배포 `persisted` | 「개발자」 행·개발자 겹이 이것을 본다 |

## 3. 연속 탭 상태 (메모리, `SettingsSection`의 ref — 저장하지 않는다)

`{ count: 0..6, lastAt: number | null }`. 설정 겹이 닫히면 비워진다. 판정 결과(`effect`): `none` / `tapsLeft(n)` / `enabled` / `already-on`.

## 4. 모듈 줄

`{ reading: string | null, writing: string | null }` — 「{상태} · {크기}」 문자열(예: `loaded · 610MB`). 상태어 ∈ {`loaded`, `partial`, `missing`, `unusable`}, 크기는 058 `formatModuleBytes`.
읽지 못한 줄은 `null`(화면이 값을 비운다). 모델 이름·키·URL을 담지 않는다.

## 5. 다시 받기 계획

`RedownloadPlan = { kind: "nothing" } | { kind: "confirm"; cellularSize: string | null }`.
`cellularSize`는 연결 종류가 `"cellular"`로 확인됐을 때만 문자열(받을 양, 1000 기준) — `wifi`·`other`·`unknown`이면 `null`(문구를 빼고 용량도 말하지 않는다).
받을 양 = 준비되지 않은 필수 모듈 키마다 `max(0, expectedBytes − bytesUsed)`의 합.

## 6. 화면 값

- 설정: `developerEnabled`, `developerHighlight`(켜진 순간 1.5초), `onPressVersion`. 「개발자」 행은 `developerEnabled`일 때만.
- 개발자: `buildLabel`(개발 환경 「DEV · 1.0.0 (24)」 / 배포 「1.0.0 (24)」, 버전을 못 읽었으면 「DEV」만·빈 값), `modules`(§4), `showsDiagnostics`(개발 환경), 핸들러.
- 토스트: `{ key, text, sub? }` 하나.
