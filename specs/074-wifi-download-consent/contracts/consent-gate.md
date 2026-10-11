# Contract: 동의 게이트 (074)

스펙 FR-001~FR-013에 대응한다. 테스트는 이 ID로 이름을 단다.

## 순수 (`src/app/consent-gate.ts`)

- **CG1** `consentViewOf(connection)`: `"cellular"` → `"cellular"`, 그 밖 모든 값(`"wifi"`·`"other"`·`"unknown"`) → `"standard"`. (FR-001·FR-002)
- **CG2** `withTimeout(p, ms, fallback)`: `p`가 먼저 끝나면 그 값, `ms`가 먼저 지나면 `fallback`, `p`가 거부돼도 `fallback`. 시계는 타이머뿐이며 `Date`를 읽지 않는다. (FR-001a)
- **CG3** `READ_LIMIT_MS`는 이 파일에 한 곳(3000). 다른 파일에 3000 리터럴을 두지 않는다.
- **CG4** 모듈은 `expo-network`·`react-native`·`expo-file-system`을 import하지 않는다.

## 훅 (`src/app/use-consent-gate.ts`)

- **CG5** 마운트 시 `readConnection`을 정확히 한 번 부르고, 읽는 동안 `view === "reading"`이다.
- **CG6** `cellular`면 그 뒤에만 `readSizeLabel`(받을 양 문자열 통로)을 부른다. 표준이면 부르지 않는다(FR-004).
- **CG7** 연결 읽기가 `READ_LIMIT_MS` 안에 안 끝나면 `standard`다(SC-003a). 받을 양이 안 끝나면 `cellular`이고 `sizeLabel`은 `null`이다.
- **CG8** `defer()` → `view === "deferred"`, 저장·다운로드 시작 콜백을 부르지 않는다(FR-006).
- **CG9** `deferred`에서 `recheck()`/`AppState active` → 다시 `reading`을 거쳐 CG5~CG7. `cellular`·`standard` 중의 `AppState active`는 다시 읽지 않는다.
- **CG10** 오래된 읽기 결과는 버린다(번호표). 언마운트 뒤 상태 갱신 없음.

## 화면

- **CG11** `DownloadConsentDialog`(표준 동의)는 이 기능으로 바뀌지 않는다 — 변경 전과 같은 렌더(문구·버튼 하나·testID `download-consent-confirm`·`download-consent-dialog`). 기존 테스트가 수정 없이 통과한다.
- **CG12** `CellularConsentDialog`(모바일 동의): 버튼 둘(testID `download-consent-cellular-confirm`·`download-consent-defer`), 본문에 `sizeLabel`이 있으면 포함, 없으면 양 없는 문구. 덮개를 눌러도·뒤로 가기에도 닫히지 않는다.
- **CG13** `DownloadDeferredScreen`: 안내 문구 + 「다시 확인하기」(testID `download-deferred-recheck`), 화면 testID `download-deferred`. 모델 식별자·바이트·진행률 문구 없음. 뒤로 가기에 아무것도 바뀌지 않는다(앱을 닫지 않고 화면 유지, FR-008).
- **CG13a** 모바일 동의(또는 대기 화면)가 떠 있는 동안 내려받기 시작 통로·동의 저장 통로 호출은 0이다 — 모델을 한 바이트도 받기 전에 두 선택지를 본다(SC-001).
- **CG14** 두 화면 모두 카탈로그(`consentGate.cellular`·`consentGate.deferred`)에서 문구를 읽는다. `src/ui/`가 `readConnection`·`network-port`·`essential-assets`를 import하지 않는다.

## 조립 (`App.tsx`, `AppFrame.firstrun`)

- **CG15** `firstRunStage === "download-consent"`에서만 훅이 마운트된다 → 모델 준비됨·이미 동의한 사용자는 연결을 읽지 않는다(FR-009).
- **CG16** 모바일 갈래 「모바일 데이터로 받기」 = `onConfirmDownloadConsent`와 동일 호출(동의 저장).
- **CG17** 「나중에 받기」는 `saveOnboardingFlag`를 부르지 않고 `essentialDownloadStarted`를 세우지 않는다.
- **CG18** `resolveFirstRunStage`·`flag.ts`·`network-port.ts`·`redownload-plan.ts` 소스는 이 기능으로 바뀌지 않는다(소스 계약: 기존 테스트 통과 + diff 없음).

## 위반 주입(구현 때 한다)

1. 「나중에 받기」가 동의를 저장하게 바꿈 → CG17 실패.
2. `consentViewOf`가 `"other"`도 cellular로 보게 바꿈 → CG1 실패.
3. 표준 갈래에서도 `readSizeLabel`을 부르게 바꿈 → CG6 실패.
4. `withTimeout`의 폴백을 제거 → CG7 실패.
