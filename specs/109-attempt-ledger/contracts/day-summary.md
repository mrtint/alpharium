# Contract: 날짜별 요약과 화면

- S1 깨움 = `path==="background"` && `outcome!=="expired"`. 미완 = `path==="background"` && `outcome==="started"`(미완도 깨움에 든다). 앱 열기·수동 줄은 세지 않는다.
- S2 `firstAt`/`lastAt`은 깨움 줄의 최소/최대 `at`. 표기는 기기 로컬 `HH:mm`.
- S3 범위: 장부의 가장 이른 날 ~ 오늘, 최대 14일, 최근 날이 위. 파일 없는 날은 깨움 0.
- S4 장부가 비면(날 파일 0개) 화면은 빈 상태 한 줄(`attempts.empty`).
- S5 화면 값은 `{ headText, outcomeText }` 문자열뿐 — `AttemptsGroup`은 기록 모듈에 닿지 않는다. 같은 구역이 `DiagnosticsScreen`(`diagnostics-group-attempts`)과 `DeveloperScreen`(`developer-group-attempts`)에 있다.
- S6 「최근 자동 쓰기 시도」 문구·20건 변환은 소스에 없다.
