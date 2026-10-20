# Contract — 092

- **CW1** 모듈 계약: Swift `Name("PocketlogContinuedWrite")`, `Events("onExpired")`, `Function` `begin(title, subtitle) -> Bool`·`report(subtitle, completed, total)`·`finish(success)`. `#available(iOS 26, *)` 밖이면 `begin`은 거짓. 와일드카드 `com.a810labs.pocketlog.write.*`가 Info.plist에 한 번. JS 통로의 이름과 같다.
- **CW2** 통로: 모듈 없음·예외 → `begin` 거짓, 나머지 무동작.
- **CW3** 세션 막대: 단계 몫 안에서만 오르고 0.95를 넘지 않으며 박동 없이 오르지 않는다. 단계 문구는 카탈로그 셋 중 하나, 숫자 없음.
- **CW4** 홈: 시작 때 `start(title)`(iOS만 주입), `onProgress` 단계와 박동을 보고, `finally`에서 `finish(result.ok)`. 받아들여진 쓰기는 `AppState` 변화로 `stop()`하지 않는다. 거절이면 종전(FR-014b). 만료 이벤트 → `stop()` → 기록 「도중에 끊김」.
- **CW5** 앱 밖 성공 → 완성 알림 한 번. 앞이면 없음. 그만두기·실패면 없음.
- **CW6** `pacingFor("screen","ios")` = `{ pauseRatio: 0, chunkTokens: 32 }`(스레드·한도 없음 → 종전 값). 안드로이드 화면은 `undefined`. 091 배터리 값 그대로.
- **CW7** 박동: 조각 하나가 끝날 때 `chunk`, 캡션 한 장이 끝날 때 `photo`. 종류 밖의 값을 싣지 않는다.
- **CW8** (FR-010) 쉼 도중 멈춤이 서면 쉼이 곧 끝난다; 마지막 조각 뒤에는 쉬지 않는다.
