# Data Model: 074

저장되는 것은 없다(FR-012). 아래는 메모리 상태다.

## ConsentGateView (세션 로컬, 훅이 가진다)

| 값 | 의미 | 화면 |
| --- | --- | --- |
| `reading` | 연결 종류를 읽는 중 | 빈 배경(대화상자 없음) |
| `standard` | 모바일이 아님/모름 | 표준 동의 [받을게요] |
| `cellular` | 모바일 데이터로 확인됨 | 모바일 동의 (+ `sizeLabel: string \| null`) |
| `deferred` | 사용자가 「나중에 받기」를 고름 | 대기 화면 |

### 전이

```
(mount) ──▶ reading ──read=cellular──▶ cellular ──defer()──▶ deferred
               │  └─ read≠cellular / 3초 초과 ─▶ standard        │
               ▲                                                 │
               └────── recheck() / 전경 복귀(deferred일 때만) ◀───┘
cellular ──confirm──▶ (동의 저장, 이 컴포넌트 언마운트: 단계가 downloading으로 넘어감)
standard ──confirm──▶ 동일
```

- `deferred`는 앱 종료 시 사라진다 — 다음 실행은 `reading`부터.
- 늦게 도착한 읽기 결과는 요청 번호표가 달라 버린다.

## 입력/출력 값

- `Connection`(059 `network-port.ts`): `"wifi" | "cellular" | "other" | "unknown"` — 변경 없음.
- `sizeLabel`: `formatModuleBytes(remaining)` 문자열(예: 「2.0GB」) 또는 `null`(못 읽음/한도 초과).
- `READ_LIMIT_MS = 3000`: 연결·받을 양 읽기 각각의 한도(한 상수).
