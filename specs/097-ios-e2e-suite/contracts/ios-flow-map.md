# Contract: 대응표의 iOS 열 (`docs/e2e/feature-flow-map.md`)

069 `flow-map.md`(M-1~M-10)를 확장한다. `__tests__/e2e/flow-map.test.ts`가 잠근다.

- **M-iOS-1**: 기능 표에 「iOS 층 1」·「iOS 층 2」 열을 더한다. 값은 흐름 파일 경로(층 1) 또는 층 2 흐름 id(`scripts/layer2-ios/flows.ts`)이거나 `—`(사유는 흐름 인벤토리에).
- **M-iOS-2**: 흐름 인벤토리에 「iOS」 열(○/—)과 iOS가 아닌 이유(안드로이드 전용 동작 등)를 더한다. iOS 층 1 목록(`IOS_LAYER1_FLOWS`)의 모든 파일은 인벤토리 ○와 같아야 하고, 인벤토리 ○인 층 1 파일은 `IOS_LAYER1_FLOWS`에 있어야 한다.
- **M-iOS-3**: `.maestro/ios/`의 파일은 각각 (a) `IOS_LAYER1_FLOWS`/`FLOWS`에 등록되거나 (b) 보조 흐름(`_` 접두)이다. 등록도 보조도 아닌 흐름 파일이 있으면 실패한다(FR-006).
- **M-iOS-4**: 층 2 iOS 흐름 id 넷이 대응표 「iOS 층 2」 열에 전부 나온다.
- **M-iOS-5**: 「계약 테스트가 지킴」으로 표시된 동작의 iOS e2e 흐름이 새로 만들어지지 않았다(FR-016) — 사람이 대응표를 갱신할 때 확인한다(자동 검사는 M-iOS-1~4).
