# Data Model: 진단 화면 개편 (060)

## 1. 쓰기 실패 기록 (`preferences/write-failures.json`)

```json
{ "items": [ { "reason": "save", "at": "2026-10-06T09:12:03.000Z" } ] }
```

- `reason`: `"module" | "photos" | "empty" | "save" | "unwritten"` (R3). 이 다섯 외의 값은 읽을 때 그 항목만 버린다(나머지는 살린다).
- `at`: ISO 8601 시각 문자열. `Date`로 해석되지 않으면 그 항목을 버린다.
- 순서: **최신이 앞**. 더할 때 맨 앞에 넣고 10건을 넘으면 뒤에서 자른다(FR-016). 길이 상한 외에 시간 기준 만료는 없다.
- **필드는 이 둘뿐이다**(D3·원칙 IV) — 소요 시간·토큰·모델·어느 하루였는가·오류 문구를 담지 않는다. 다른 설정 파일(`auto-diary.json`·`auto-write-skipped.json`·`onboarding.json`)에 필드를 더하지 않는다.
- 파일이 없음·깨짐·`items`가 배열이 아님 → 빈 목록. 읽기는 던지지 않는다. 쓰기는 임시 파일 → 이름 바꾸기(057 `skip-store`와 같은 방식)이고 실패는 삼킨다.
- 058 「일기 모두 지우기」는 이 파일을 지우지 않는다(통로조차 받지 않는다). 별도 지우기 동작은 없다(범위 밖).

## 2. 진단 화면 값 (저장하지 않음)

| 값 | 출처 | 모양 |
| --- | --- | --- |
| 환경 줄 | `buildLabelFor`·`Platform`·`selectLocation` | `{ build: string, device: string \| null, inference: string }` |
| 저장 점검 | `inspectDiaries` | `{ kind: "idle" } \| { kind: "done"; total: number; unreadable: number } \| { kind: "unavailable" }` |
| 사진 권한 | `photoPermission`·`photoLocationProbe` | `{ read: Tag \| null, location: Tag \| null, scope: "all" \| "selected" \| null }` (`Tag` = allowed·partial·denied) |
| 신호 칸 | `collectDaySignals` | 다섯 `{ axis, kind: "number" \| "none" \| "unknown", text }` |
| 프롬프트 미리보기 | `DiagnosticReport.promptPreviews` | 기존 (프리셋 id → 문자열) |
| 자동 쓰기 결과 | `runAutoDiaryTask({ manual: true })` | `"ran" \| "skipped" \| "failed" \| null` |

## 3. 쓰기 요청 (App 상태, 저장하지 않음)

`writeRequest: { id: number } | null` — `AppFrame`이 든다. 홈이 시작하거나 거절하면 비운다. 앱을 껐다 켜면 사라진다.
