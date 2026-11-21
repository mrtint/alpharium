# Research — 122

## R1. 예비 경로 전환 자리
- Decision: `acquisition.prepare` 안, 주 경로 `task.wait()`가 `failed`일 때.
- Rationale: 포트 계약(`DownloadPort.start/resume(key,url,…)`)이 이미 주소를 인자로 받는다. 코어·기기 통로 무변경.
- Alternatives: 구간마다 서버 교체(코어 복잡), `expo-port`에서 전환(주소 둘을 포트가 알게 됨).

## R2. 전환 시 이어받기
- Decision: 전환 직전 `settleResumeRecord`를 다시 불러 체크포인트로 남은 구간 기록이 있으면 `resume`, 없으면 `start`. 단일 스트림 `paused` 기록은 지운다.
- Rationale: 두 파일이 바이트까지 같다(크기·md5). 체크포인트는 구간이 끝날 때마다 `state.json`에 남는다(113).

## R3. 옛 a1 정리
- Decision: 새 코드 없음. `settleExistingFile`이 기준보다 큰 파일 삭제 + 검증 기록 삭제, `isResumeConsistent`가 전체 크기 불일치 기록 정리. 테스트로 잠근다.
- 실측: 옛 파일 1,522,796,768 B > 새 1,241,435,520 B.

## R4. 받을 양
- Decision: `used > expected`면 `expected`로 센다(큰 파일은 지워지고 전부 다시 받으므로).

## R5. R2 응답
- 2026-11-21 `curl -I`: 200, `Content-Length: 1241435520`, ETag 멀티파트(md5 아님). `Range: bytes=0-99` → 206.
