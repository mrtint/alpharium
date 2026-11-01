# Contract: 장부 파일

- L1 위치·이름: `Paths.document/attempt-ledger/YYYY-MM-DD.json` (정규식 `^\d{4}-\d{2}-\d{2}\.json$` 밖은 무시).
- L2 내용: `{ items: [{ at, path, outcome, launch?, wake?, day? }] }` 필드 목록은 이 여섯뿐 — 계약 테스트가 소스의 직렬화 필드를 잠근다(FR-005).
- L3 상한·삭제: 줄 수·날 수 상한 없음. 소스에 장부를 지우는 호출(`delete`)은 임시 파일·교체 대상 정리뿐이다 — `wipe-diaries`·개발자 끄기·온보딩 다시는 장부를 건드리지 않는다.
- L4 실패: 읽기·쓰기·목록 실패는 삼켜 빈 값/무시. 깨진 날 파일은 그 날만 빈 줄로 읽는다.
- L5 순서: 같은 프로세스 안 기록은 기존 `inOrder` 대기열 하나로 직렬화한다.
- L6 옛 파일: `preferences/auto-write-attempts.json` 문자열이 소스에 나오지 않는다(주석 제외).
- L7 비동기 `File` 호출(`text()`·`move()` 등) 금지 — `*Sync()`만(AGENTS, `expo-file-sync` 계약).
- L8 안드로이드 백업 제외: 두 규칙 XML 모두 `<exclude domain="file" path="attempt-ledger/"/>`이 `models/` 곁에 있고 `<include>`는 없다.
