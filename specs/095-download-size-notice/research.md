# Research: 095 첫 실행 다운로드 크기 공지

## R1 — 헌법 개정이 필요한가

- **Decision**: 필요 없다.
- **Rationale**: 원칙 IV는 2.0.0(2026-09-19)에서 「다운로드 상태 표시」를 금지 대상이 아니라고 명시했다. 원칙 III은 「모델 식별자, 파라미터 수, 양자화 방식 등 내부 기술 사양」을 막는다 — 받을 양은 사양이 아니라 사용자가 감수할 비용이며, 074 모바일 동의(「약 {size}」)와 058 설정 「이 휴대폰」(모듈 용량)이 이미 보인다. 045 FR-003의 「바이트·GB 금지」는 헌법 1.x 시절(원칙 IV가 진행 수치를 넓게 막던 때)의 결정이다.
- **Alternatives considered**: 원칙 III에 「받을 양은 사양이 아니다」를 덧붙이는 PATCH 개정 — 지금 문장이 이미 그렇게 읽히고, 개정은 헌법에 구현 세부를 다시 들이는 쪽이라 하지 않는다.

## R2 — 받을 양의 출처

- **Decision**: `App.tsx`의 `readConsentSizeLabel`(= `formatModuleBytes(await readEssentialRemainingBytes())`)을 그대로 쓴다. 게이트는 이미 이 통로를 주입받는다(074).
- **Rationale**: 같은 화면 흐름에서 표준·모바일 동의가 다른 값을 말하면 안 된다. 남은 바이트라 이어 받기에도 맞다. 네트워크를 쓰지 않는다(기대 크기 상수 − 이미 받은 파일 크기).
- **Alternatives considered**: 고정 문자열 「약 2GB」 — 모델이 바뀌면 거짓이 되고 이어 받기에서 틀린다(원칙 V).

## R3 — 순차 읽기 vs 동시 읽기

- **Decision**: `Promise.all`로 둘을 동시에 시작하고 각자 `withTimeout(…, READ_LIMIT_MS, 폴백)`. 둘 다 끝난 뒤 한 번에 상태를 정한다.
- **Rationale**: 순차면 표준 갈래가 최악 6초 빈 화면. 동시면 최악 3초로 지금과 같고, 모바일 갈래도 6초 → 3초로 준다. 양 읽기는 파일 크기 조회뿐이라 모바일이 아닐 때 미리 읽어도 비용이 없다.
- **Alternatives considered**: 연결이 먼저 오면 표준을 바로 띄우고 양은 나중에 채움 — 대화상자 본문 길이가 바뀌며 버튼이 움직인다(Clarifications Q1에서 배제).

## R4 — 문구 골든 처리

- **Decision**: 새 문장(양 있음)은 `ADDED_AFTER_GOLDEN`, 원래 문장은 양을 못 읽을 때 쓰이므로 골든에 그대로 남는다. `CHANGED_AFTER_GOLDEN`은 쓰지 않는다.
- **Rationale**: `koLiterals`는 카탈로그의 문자열 리터럴(템플릿의 `${…}`는 `${}`) 집합을 뽑는다. 원래 문장이 삼항의 한 갈래로 남으므로 집합에서 빠지지 않고, 새 템플릿 리터럴 하나가 더해진다 — 074 `consentGate.cellular.body`가 같은 처리를 했다.

## R5 — 045 계약 테스트의 `GB` 금지 단언

- **Decision**: `download-consent-dialog.test.tsx`의 FR-003 소스 정규식에서 `MB|GB|byte`를 빼고 식별자·자산 키(`v1|v2|a1|ESSENTIAL_ASSET_KEYS`) 금지와 `essential-assets` import 금지는 남긴다. 화면 소스에 숫자·단위 리터럴이 없음(양은 prop으로만 온다)을 새로 단언한다.
- **Rationale**: 단언을 통째로 지우면 원칙 III 방어까지 약해진다. 「양은 prop으로만」을 잠그면 화면이 양을 지어내는 길(기본값 「2.0GB」)을 막는다 — 위반 주입으로 확인한다.
