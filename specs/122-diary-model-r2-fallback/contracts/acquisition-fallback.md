# Contract — acquisition 예비 경로 (122)

- AF1: 주 경로 결과가 `failed`이고 `fallbackUrl`이 있으면 같은 `prepare`에서 예비 경로로 정확히 한 번 받는다.
- AF2: 전환 시 파일과 맞는 구간 기록이 있으면 `resume(key, fallbackUrl, record, …)`, 없으면 `start(key, fallbackUrl, …)`.
- AF3: 예비 경로가 있는 자산의 단일 스트림 `paused` 기록(옛 주소를 품음)은 받기 시작에서 부분 파일과 함께 지우고 주 경로로 처음부터 받는다(코드 리뷰 반영).
- AF4b: 주 경로 실패 뒤 예비 경로 준비(기록 정리) 중에 멈추기가 오면 예비 경로를 시작하지 않는다(코드 리뷰 반영).
- AF4: `paused` 결과·검증 실패·공간 부족·`busy`는 전환하지 않는다.
- AF5: 예비도 `failed`면 `{ kind: "network", reason }`(예비의 까닭).
- AF6: 예비 결과가 `paused`면 지금과 같이 기록을 남기고 `network "받다가 멈췄다"`.
- AF7: 전환 중에도 `pause()`가 지금 도는 받기를 멈춘다(슬롯 핸들 교체).
- AF8: `fallbackUrl`이 없으면 동작은 122 이전과 같다.
