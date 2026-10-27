# Contract: 합류 쓰기 실패 뒤 이어 쓰기 (JR)

- **JR1** 홈이 남의 쓰기에 합류했다가 `end.ok === false && end.cancelled === false`로 끝나면 `onJoinedWriteFailed?.()`를 한 번 부른다. 합류를 시작하지 않았거나 화면이 사라졌으면(`mounted` 아님·`joined`가 다름) 부르지 않는다.
- **JR2** `end.cancelled`면 부르지 않는다(H4·H7 — 사용자가 그만둔 쓰기는 실패가 아니다).
- **JR3** `end.ok`면 부르지 않는다.
- **JR4** `App.tsx`는 `onJoinedWriteFailed`를 `rearmAutoWrite`에 연결한다. 세대가 한 번 오르므로 057 효과가 claim을 한 번 얻어 이어 쓴다. 그 이어 쓰기가 실패해도 claim이 세대를 소모해 더 이어 쓰지 않는다.
- **JR5** `claimAutoWrite`의 소모 시점·`spendAutoWrite`·040/064 규칙은 바꾸지 않는다.
- **JR6** 조립 테스트: 「한 번」을 소모한 실행에서 남의 쓰기가 실패 → 홈이 합류 → 실패 → 이어 쓰기 시작 1회 → 그 쓰기 실패 → 시작 없음.
