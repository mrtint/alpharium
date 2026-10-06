/**
 * 언어 → 카탈로그 (062).
 *
 * 계약: specs/062-ui-text-i18n/contracts/i18n.md K2·K3, data-model 「CatalogRegistry」
 *
 * - **`Catalog`는 한국어 카탈로그의 모양이다**(K1·FR-003). 다른 언어는 `satisfies Catalog`로 쓰고, 항목을 빠뜨리거나 함수 모양이 다르면
 *   tsc가 실패한다(K2).
 * - **`CATALOGS`는 `Record<Language, Catalog>`다**(K3) — `languages.ts`에 언어를 더하고 여기 카탈로그를 안 넣으면 tsc가 짚는다.
 */

import type { Language } from "../languages";
import { ko } from "./ko";

export type Catalog = typeof ko;

export const CATALOGS: Readonly<Record<Language, Catalog>> = { ko };
