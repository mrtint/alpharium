/**
 * 개발자 화면(059, 보드 `6d`·`6e`·`6j`)의 문구.
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md TX·DV8·BD4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **보드 「KO 문자열 — 설정 · 개발자 (6c–6l)」 표의 `dev.*` 원문이다**(C4). 키 이름은 보드 키를 따른다 —
 * `developer-text.test.ts`가 글자 단위로 잠근다. `about.developer`(「개발자」 행)는 `settings-text.ts`의 `developer`다.
 *
 * **보드 밖**: `allReady`·`redownload*`·`diagBack`은 보드 표에 없는 문구다 — 보드에는 「모바일 데이터로 {size}」 한 조각(`dev.redownload.cellular`)뿐이고
 * 확인 대화상자의 제목·본문·버튼은 이 조각이 해요체로 정했다(research R3). 「진단」 겹의 제목은 보드 `6h`의 `diag.title`이다.
 * 새 문구를 더할 때는 이 구분을 주석으로 남긴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { lazyText } from "../i18n/current";

/** 062 — 문구는 한국어 카탈로그 `src/i18n/catalogs/ko/developer.ts`로 옮겼다. 이름은 그대로 두고 읽는 순간 카탈로그에서 꺼낸다 */
export const DEVELOPER_TEXT = lazyText((c) => c.developer);
