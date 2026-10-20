# Research — 092

- **R1 이어 하기 API** — Decision: `BGContinuedProcessingTaskRequest(identifier: "com.a810labs.pocketlog.write.<날짜>", title:, subtitle:)`, `strategy = .fail`, 처리기는 와일드카드로 처음 신청 직전에 한 번 등록. Rationale: [문서·포럼] 앞에서 사용자 동작에 응해 제출하고, 곧바로 못 돌면 실패하는 쪽이 「거절이면 종전대로」와 맞는다. Alternatives: `.queue`(나중에 돌면 이미 끝난 쓰기에 붙는다).
- **R2 진행 보고** — Decision: `task.progress.totalUnitCount = 1000`, `completedUnitCount`를 세션 계산값으로. 보조 줄은 `task.updateTitle(_:subtitle:)`. Rationale: [포럼] 진행이 없으면 만료. Alternatives: 단계만(긴 본문 동안 멈춤).
- **R3 막대 계산** — Decision: 단계 몫(준비 0–5%, 사진 5–45%, 글 45–95%), 단계 안 박동마다 남은 몫의 1/4(사진)·1/8(조각)만큼. 끝나기 전에 95%를 넘지 않는다. Rationale: 장 수·조각 수를 미리 모른다(박동은 종류뿐 — FR-004). 사람이 정한 값.
- **R4 박동 통로** — Decision: `src/inference/heartbeat.ts`의 모듈 구독(080 등록부와 같은 「앱에 하나」). 엔진·사진은 조립 시점이 화면 쓰기 전이라 per-write 콜백을 줄 수 없다.
- **R5 조각 생성을 iOS 홈 쓰기 전부에** — Decision: `pacingFor("screen","ios")`가 쉼 0·조각 32. 앞에 있는지 쓰기 도중 바뀌므로 조립 때 가를 수 없다. 대가: 조각마다 1토큰 재읽기(091). SC-003으로 잰다. 안드로이드는 `undefined`(바이트 동일).
- **R6 CPU 감시** — [모름] 실기기로 잰다. 걸리면 `pacingFor`의 iOS 화면 값을 091 배터리 값(스레드 1·쉼 0.5)으로 — 한 줄 변경.
- **R7 완성 알림** — Decision: `task.ts`의 `sendCompletionNotification`을 export해 재사용(확인 기록·채널·문구 같음). 앞에 있는지는 `readLaunchState()`(090 통로)로 저장 직후 읽는다.
- **R8 시간 한도** — Decision: 화면 180초 유지. 앱 밖에서 느려져 걸리면 실측으로 정한다(079와 같은 방식).
