# Contract: 방침이 기대는 코드의 사실·링크 대조

테스트: `__tests__/privacy/policy-facts.test.ts`(사실), `__tests__/privacy/policy-links.test.ts`(링크). 표는 `__tests__/privacy/outbound.ts`.

**범위**: 이 테스트는 **소스에서 보이는 것만** 잠근다. 네이티브 라이브러리가 스스로 하는 통신, OS 백업, OS 지오코더 뒤의 서버는 보지 못한다 — 테스트 파일 머리 주석과 `describe` 이름에 적는다.
모든 실패 메시지는 「방침(site/privacy)과 선언 초안(docs/store)을 함께 고쳐라」를 담는다.

## 사실 (F)

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| F1 | `package.json` `dependencies`의 어느 이름도 금지 SDK 목록에 걸리지 않는다(정확한 이름 또는 접두사) | FR-022, D2 |
| F2 | `src/`·`App.tsx`에 `getExpoPushTokenAsync`·`getDevicePushTokenAsync`가 없다(주석 제외) | FR-022 |
| F3 | `src/`·`App.tsx`의 `http(s)://` 주소(주석 제외, 빼는 파일 제외)의 호스트는 모두 허용 목록에 있다 | FR-022 |
| F4 | `reverseGeocodeAsync` 호출은 `src/signals/geocoding-port.ts` 한 곳, 한 번뿐이다(주석 제외) | FR-022 |
| F5 | 허용 목록의 모든 호스트가 실제로 소스에 한 번 이상 나온다(낡은 허용 0) | FR-022 |
| F6 | 외부 전송 목록의 `evidence`가 코드 경로이면 그 파일이 있다 | FR-022a |

## 링크 (L)

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| L1 | `PRIVACY_URL`·`SUPPORT_URL`은 `https://mrtint.github.io/alpharium/`로 시작하고 `/`로 끝난다 | FR-013 |
| L2 | 두 URL의 경로(`privacy/`·`support/`)마다 `site/<경로>index.html`이 있다 | FR-021 |
| L3 | 지원 페이지의 방침 링크 `href` = `PRIVACY_URL` | FR-021 |
| L4 | `docs/store/privacy-declarations.md`에 `PRIVACY_URL`·`SUPPORT_URL`이 그대로 있다 | FR-021, SC-005 |
| L5 | `src/`에서 두 URL 문자열이 나오는 파일은 `src/app/policy-links.ts` 하나뿐이다 | FR-013 |

## 위반 주입 (FR-024)

| 주입 | 깨지는 규칙 |
| --- | --- |
| `package.json` dependencies에 `"@sentry/react-native": "*"` | F1 |
| `src/` 아무 파일에 `fetch("https://example.com")` | F3 |
| `src/` 아무 파일에 `Location.reverseGeocodeAsync(x)` 한 줄 | F4 |
| 허용 목록에 `example.org` 추가 | F5 |
| 방침에서 `data-outbound="place-name"` 절 삭제 | S5 |
| 방침에 `data-outbound="analytics"` 절 추가 | S5 |
| `PRIVACY_URL` 끝 `/` 삭제 | L1·L3·L4 |
| 지원 페이지 방침 링크를 다른 주소로 | L3 |
