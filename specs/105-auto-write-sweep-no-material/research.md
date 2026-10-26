# Research: 자동 쓰기 후보 훑기 (105)

## R1. 훑기는 어디에 두는가
- **결정**: `resolveAutoWrite` 안.
- **근거**: 백그라운드·앱 열기·알림이 모두 이것을 부른다(`task.ts`, `use-auto-write-handoff`, `DiaryHomeScreen`은 조립부 경유). `decideAutoWrite`(순수, 한 날 판정)는 그대로 두고 루프만 얹으면 판정 규칙(053 재료·사진 권한)이 복제되지 않는다.
- **대안**: `decideSchedule` 안에서 훑기 — 순수 함수가 기기 통로(미리보기)를 알게 되어 경계가 흐려진다. 기각.

## R2. 백그라운드 하루 1회 몫(090)
- 몫(`saveCatchUpDay`)은 `resolveAutoWrite` 반환 뒤 파이프라인 직전에만 쓴다. 판정 안 훑기는 몫을 닳게 하지 않는다. 몫 확인(`loadCatchUpDay`)은 판정 앞이다. 변경 불필요.

## R3. 사진 권한
- `previewDay(day).photoAccess`는 전역 권한을 반영한다. 첫 후보에서 거부면 `saveSkippedDay(첫 후보)` 후 즉시 종료(종전). 이후 후보에서 거부가 나오는 일은 권한이 훑는 중 바뀐 경우뿐 — 그때도 같은 처리(그 날 기억·종료).

## R4. 모름·예외
- `decideMaterial`이 셀 수 없음을 「쓰지 않음」으로 이미 돌려준다 → no-material 갈래. 예외는 후보마다 잡아 기록하고 다음 후보로. 읽힌 후보가 하나도 없이 끝나면 첫 예외를 던진다(종전: 호출 쪽이 `.catch`로 삼켜 아무것도 반영하지 않음).

## R5. 시도 기록의 날
- 백그라운드는 판정 뒤 `ran/failed/cancelled/already-running/no-character`로 끝나므로 `write` 갈래는 앱 열기에만 나온다(`attemptOutcomeOf`). 「쓰기로 정해진 시도의 줄」에 `day`를 실으려면 `BodyOutcome`이 날을 운반해야 한다. `recordAttemptEnd`의 합치기(바로 앞 줄과 경로·결과가 같으면 시각만 갱신)는 날이 다르면 합치지 않는다 — 다른 날을 같은 줄로 덮어 날을 잃지 않게.
- 진단 문구: 결과 뒤 꼬리 「· 10월 24일」 한 조각(`withDay`). 골든은 `ADDED_AFTER_GOLDEN`.

## R6. 후보 집합 불변
- `dueOutsideWindow`·`near` 분기는 그대로. `pickRetryDays`는 필터+정렬뿐.
