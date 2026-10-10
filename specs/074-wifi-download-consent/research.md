# Research: 074 모바일 데이터 동의

조사 문서(`docs/superpowers/specs/2026-10-11-wifi-download-research.md`)가 플랫폼·타 앱 관행을 다뤘다. 여기는 구현 결정만 적는다.

## R1 — 연결 종류 판정은 기존 `readConnection()`을 그대로 쓴다
- **Decision**: `"cellular"`만 모바일 갈래, `"wifi"`·`"other"`·`"unknown"`은 표준 동의.
- **Rationale**: 059가 같은 기준을 이미 실측 없이 코드로 정했고(이더넷·VPN은 `other`, 예외는 `unknown`) 스펙 FR-001·FR-002와 일치한다. 새 판정을 만들면 두 곳의 정의가 갈라진다.
- **Alternatives**: `NONE`을 따로 안내 — 소유자가 기각(연결 없음은 046 실패 처리).

## R2 — 읽기 3초 한도는 `Promise.race` 순수 도우미
- **Decision**: `withTimeout(promise, ms, fallback)`을 `src/app/consent-gate.ts`에 둔다. 연결 읽기는 `"unknown"`, 받을 양 읽기는 `null`로 떨어진다. 시간은 `setTimeout`을 쓰되 상수 `READ_LIMIT_MS = 3000`은 한 곳. jest는 fake timers.
- **Rationale**: FR-001a·SC-003a. `network-port.ts`는 무변경이라 한도가 059 경로에 영향을 주지 않는다.
- **Alternatives**: `readConnection` 안에서 한도 — 059(설정 확인 문구) 동작을 바꾸므로 기각.
- **주의**: 한도가 지난 뒤 늦게 오는 결과가 상태를 덮지 않게 한다(요청 번호표로 무시).

## R3 — 훅이 읽기·세션 상태를 맡고 App.tsx는 조립만
- **Decision**: `useConsentGate({ readConnection, readRemainingBytes })` → `{ view: "reading" | "standard" | "cellular" | "deferred", sizeLabel, defer(), recheck() }`. 단계에 들어갈 때(마운트)와 `AppState` `active`에서 재판정, `defer()`는 `deferred`로, `recheck()`는 `reading`을 거쳐 다시 판정한다.
- **Rationale**: App.tsx는 이미 수천 줄이고 이 분기는 `firstRunStage === "download-consent"` 렌더 가지 안이다. 단계에 들어갈 때만 마운트되는 컴포넌트에 훅을 두면 단계에 안 들어가는 사용자(모델 준비됨·이미 동의)는 연결을 읽지 않는다(FR-009). 훅은 별도 `DownloadConsentGate` 컴포넌트(App.tsx 안 또는 `src/ui` 밖)에서 부른다.
- **Alternatives**: `FirstRunStage`에 단계 추가 — 소유자 결정으로 기각(progress 테스트 불변).

## R4 — 「다시 확인하기」·전경 복귀는 같은 `recheck()`
- **Decision**: 두 경로 모두 `recheck()`. 대기 화면에서만 아니라 모바일/표준 동의 중에 `AppState active`가 와도 다시 읽지 **않는다** — 스펙 Edge Case(이미 뜬 대화상자는 바뀌지 않는다). 전경 복귀 재판정은 `deferred`일 때만 한다.
- **Rationale**: 대화상자가 사용자 눈앞에서 바뀌는 놀람을 막는다.

## R5 — 받을 양은 모바일 갈래에서만 읽는다
- **Decision**: 연결이 `cellular`로 확인된 뒤에만 `readEssentialRemainingBytes()`를 부르고 `formatModuleBytes()`로 문자열화한다(059와 같은 기준). 읽기는 별도 3초 한도.
- **Rationale**: 표준 동의에는 용량을 노출하지 않는다(045 FR-003) — 읽지도 않는다. 이미 기기에 일부 받은 조각이 있으면 `remainingBytes`가 이어받기를 반영한다(059).

## R6 — 문구는 카탈로그 새 영역
- **Decision**: 새 문구는 **기존 `download` 영역을 건드리지 않고 별도 최상위 영역 `consentGate`**(새 파일 `src/i18n/catalogs/ko/consent-gate.ts`, `index.ts`에 등록)에 둔다 — `consentGate.cellular = { title, body(sizeLabel|null), confirm, defer }`, `consentGate.deferred = { title, body, recheck }`. 062 골든 G1은 「이관 전 문구 리터럴 집합 == 카탈로그 리터럴 집합」이라 새 리터럴은 `ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 올려야 통과한다(선례: 064·066이 같은 방식으로 올렸다). 골든 파일(`*.golden.json`)은 다시 쓰지 않는다. 본문은 함수로 두어 용량 유무를 가른다.
- **문구안(확정 전, 구현 때 보드 없음 → 소유자가 화면으로 본다)**: 제목 「모바일 데이터로 연결돼 있어요」/ 본문 「일기를 쓰려면 모델을 내려받아야 해요. 지금 모바일 데이터라 약 {양}을 쓰게 돼요. Wi-Fi에서 받는 걸 권해요.」(양 없으면 「데이터를 꽤 쓰게 돼요」) / 버튼 「모바일 데이터로 받기」·「나중에 받기」 / 대기 「Wi-Fi에 연결하면 받을 수 있어요」·「다시 확인하기」. 해요체(048).

## R7 — 실측해야 할 값(구현 중 소유자 확인 뒤 기기에서)
SM-G986N: Wi-Fi, 모바일 데이터만, 둘 다 끔, (가능하면) 핫스팟·VPN 각각의 `getNetworkStateAsync()` 결과. quickstart의 표에 적는다. 지금은 모두 **미확인**.
