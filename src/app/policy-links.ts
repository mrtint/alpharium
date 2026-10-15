/**
 * 개인정보처리방침·지원 페이지 주소 (086).
 *
 * 계약: specs/086-privacy-policy/contracts/policy-facts.md L1·L5
 *       data-model.md §1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **두 주소가 정의되는 유일한 자리다.** 설정의 두 행(`App.tsx` 조립부), 지원 페이지의 방침 링크
 * (`site/support/index.html`), 스토어 선언 초안(`docs/store/privacy-declarations.md`)이 끝의 `/`까지
 * 같은 문자열을 쓴다 — 테스트가 문자열 그대로 대조한다. 화면(`src/ui/`)은 이 파일을 모른다.
 *
 * 경로 `privacy/`·`support/`는 `site/privacy/index.html`·`site/support/index.html`과 짝이다
 * (GitHub Pages, `.github/workflows/pages.yml`). 저장소 이름이 옛 이름이라 주소에 `alpharium`이 남는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const PRIVACY_URL = "https://mrtint.github.io/alpharium/privacy/";

export const SUPPORT_URL = "https://mrtint.github.io/alpharium/support/";
