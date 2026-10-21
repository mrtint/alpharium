# Research — 092

- **R1 이어 하기 API** — Decision: `BGContinuedProcessingTaskRequest(identifier: "com.a810labs.pocketlog.write.<UUID>", title:, subtitle:)`, `strategy = .fail`. Info.plist에는 와일드카드(`….write.*`) 하나, **처리기는 신청 직전에 그 온전한 식별자로 등록**한다. Rationale: [SDK 헤더 `BGTaskRequest.h`] 기본값은 `.queue`, `.fail`은 곧바로 못 돌면 제출 실패(`ImmediateRunIneligible`) — 「거절이면 종전대로」와 맞는다. [SDK 헤더 `BGTaskScheduler.h`] 이 작업만 앱 시작 뒤 등록이 허용되고 같은 식별자를 두 번 등록하면 오류다. [Apple DTS, developer.apple.com/forums/thread/799126] 와일드카드로 처리기를 등록하는 것은 막혀 있다(제출 때 「No launch handler registered」로 앱이 죽는다) — 설계 문서의 「와일드카드 처리기 1회 등록」은 틀렸다. 그래서 신청마다 새 꼬리다. [SDK 헤더] 동기 `submit`은 iOS 27에서 deprecated(모든 오류를 받으려면 비동기) — 27부터는 비동기 제출. Alternatives: `.queue`(나중에 돌면 이미 끝난 쓰기에 붙는다).
- **R2 진행 보고** — Decision: `task.progress.totalUnitCount = 1_000_000`, `completedUnitCount`를 세션 계산값으로 — **보고마다 한 칸 이상 올린다**(실측: 시스템은 값이 오르지 않는 공백을 멈춤으로 본다, quickstart 「실측」 I·J). 보조 줄은 `task.updateTitle(_:subtitle:)`. Rationale: [포럼] 진행이 없으면 만료. Alternatives: 단계만(긴 본문 동안 멈춤).
- **R3 막대 계산** — Decision: 단계 몫(준비 0–5%, 사진 5–45%, 글 45–95%), 단계 안 박동마다 남은 몫의 1/4(사진)·1/8(조각)만큼. 끝나기 전에 95%를 넘지 않는다. Rationale: 장 수·조각 수를 미리 모른다(박동은 종류뿐 — FR-004). 사람이 정한 값.
- **R4 박동 통로** — Decision: `src/inference/heartbeat.ts`의 모듈 구독(080 등록부와 같은 「앱에 하나」). 엔진·사진은 조립 시점이 화면 쓰기 전이라 per-write 콜백을 줄 수 없다.
- **R5 조각 생성을 iOS 홈 쓰기 전부에** — Decision: `pacingFor("screen","ios")`가 쉼 0·조각 32. 앞에 있는지 쓰기 도중 바뀌므로 조립 때 가를 수 없다. 대가: 조각마다 1토큰 재읽기(091). SC-003으로 잰다. 안드로이드는 `undefined`(바이트 동일).
- **R6 CPU 감시** — [실측] 앱 밖·충전 없음 약 23분 쓰기에서 CPU 감시는 보고서(유형 202)만 남기고 죽이지 않았다 — 쉼은 넣지 않았다. 대신 앱 밖에서 iOS가 CPU를 크게 줄여 스레드 2·모델 메모리 상주(`use_mmap: false`)·토큰 박동·프롬프트 토막 읽기를 실었다(quickstart 「실측」).
- **R7 완성 알림** — Decision: `task.ts`의 `sendCompletionNotification`을 export해 재사용(확인 기록·채널·문구 같음). 앞에 있는지는 `readLaunchState()`(090 통로)로 저장 직후 읽는다.
- **R8 시간 한도** — [실측] 앱 밖 본문이 475~582초였다 — iOS 화면 쓰기의 한도는 30분(091 느린 쓰기와 같은 값). 안드로이드 화면은 180초 그대로.
