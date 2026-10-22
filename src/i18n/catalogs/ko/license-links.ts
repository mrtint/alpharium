/**
 * 한국어 카탈로그 — 설정 「정보」의 「오픈소스 라이선스」 행 (101). 보드에 없는 행이라 brainstorming에서 소유자가 고른
 * 자리다(고지는 앱 밖 페이지 `site/licenses/`, 앱은 이 행 하나, 2026-10-22).
 *
 * 062 규칙: 옛 `settings` 영역에 키를 더하지 않고 새 영역으로 둔다(골든 G2가 옛 영역의 키 짝을 잠근다 — 083 `fontLicense`·
 * 086 `policyLinks`와 같다). 주소는 여기 두지 않는다 — `src/app/policy-links.ts`가 유일한 자리다.
 *
 * **헌법 원칙 III: 이 영역의 문구에는 모델 이름·파라미터 수·양자화 표기가 없다.** 모델 고지는 앱 밖 페이지에만 있다
 * (`__tests__/i18n/license-links.test.ts` LK2가 막는다). 열지 못했을 때의 한 줄은 `policyLinks.openFailed`를 쓴다.
 */

export const licenseLinks = {
  /** 「정보」 묶음의 행 — 누르면 기기 브라우저로 라이선스 고지 페이지를 연다 */
  row: "오픈소스 라이선스",
};
