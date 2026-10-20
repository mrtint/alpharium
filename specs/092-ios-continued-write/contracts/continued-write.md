# Contract — 092

- **CW1** 모듈 계약: Swift `Name("PocketlogContinuedWrite")`, `Events("onExpired")`, `AsyncFunction` `begin(title, subtitle) -> Bool`(제출 결과를 기다린다 — iOS 27부터 비동기 `submitTaskRequest`, 26은 `submit`), `Function` `report(subtitle, completed, total)`·`finish(success)`. `#available(iOS 26, *)` 밖이면 `begin`은 거짓. 와일드카드 `com.a810labs.pocketlog.write.*`가 Info.plist에 한 번 — **처리기는 신청마다 꼬리(UUID)를 붙인 온전한 식별자로 등록**한다(와일드카드 처리기 등록은 막혀 있다, research R1). 만료면 이벤트를 보내고 곧바로 실패로 끝낸다. JS 통로의 이름과 같다.
- **CW2** 통로: 모듈 없음·예외 → `begin` 거짓, 나머지 무동작.
- **CW3** 세션 막대: 단계 몫 안에서 오르고(몫 끝에 닿은 뒤에는 보고마다 한 칸씩만) 끝나기 전에 가득 차지 않으며 박동 없이 오르지 않는다. **보고마다 값이 한 칸 이상 오른다**(전체 1,000,000칸 — 시스템은 값이 오르지 않는 공백을 멈춤으로 본다). 박동에 따른 보고는 2초에 한 번까지, 단계 변경은 곧바로. 단계 문구는 카탈로그 셋 중 하나, 숫자 없음.
- **CW4** 홈: 시작 때 `start(title)`(iOS만 주입), `onProgress` 단계와 박동을 보고, `finally`에서 `finish(result.ok)`. 받아들여진 쓰기는 `AppState` 변화로 `stop()`하지 않는다. 거절이면 종전(FR-014b). 만료 이벤트 → `stop()` → 기록 「도중에 끊김」.
- **CW5** 앱 밖 성공 → 완성 알림 한 번. 앞이면 없음. 그만두기·실패면 없음.
- **CW6** `pacingFor("screen","ios")` = `{ pauseRatio: 0, chunkTokens: 32 }`(스레드·한도 없음 → 종전 값). 안드로이드 화면은 `undefined`. 091 배터리 값 그대로.
- **CW7** 박동: 조각 하나·프롬프트 토막 하나가 끝날 때 `chunk`, 토큰 하나가 생성될 때 `token`(토큰 데이터는 `llama-port.ts`가 버린다), 캡션 한 장이 끝날 때 `photo`. 종류 밖의 값을 싣지 않는다.
- **CW8** (FR-010) 쉼 도중 멈춤이 서면 쉼이 곧 끝난다; 마지막 조각 뒤에는 쉬지 않는다.
