/**
 * 062 — 테스트 전용 가짜 언어 `xx`의 카탈로그 (contracts X1~X3, research R10). **제품 `src/`에 두지 않는다.**
 *
 * 「언어 하나 = 카탈로그 모듈 하나 + 지원 목록 한 줄」의 비용을 보이는 시연이다. 한국어 카탈로그를 펼치고 몇 항목만 `[xx]` 문구로
 * 바꾼다 — 나머지는 한국어 그대로라 번역이 아니라 **통로**를 보인다. `satisfies Catalog`가 모양을 잠근다(K2).
 */

import type { Catalog } from "../../../src/i18n/catalogs";
import { ko } from "../../../src/i18n/catalogs/ko";

export const xx = {
  ...ko,
  welcome: {
    ...ko.welcome,
    buildErrorTitle: "[xx] this build is broken",
    buildErrorBody: "[xx] tell the person who made it",
  },
  settings: { ...ko.settings, title: "[xx] Settings" },
  diagnosticsLanguage: { ...ko.diagnosticsLanguage, selfName: "xx-language" },
} satisfies Catalog;
