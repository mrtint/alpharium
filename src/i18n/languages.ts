/**
 * 화면 문구의 지원 언어 (062).
 *
 * 계약: specs/062-ui-text-i18n/contracts/i18n.md B4, data-model.md 「Language」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **지원 목록과 기본 언어는 이 파일 한 곳에만 있다**(FR-002). 언어 하나를 더하는 일은 `Language` 유니온과 목록에 한 줄,
 * `catalogs/`에 카탈로그 모듈 하나다 — `catalogs/index.ts`의 `Record<Language, Catalog>`가 빠진 카탈로그를 tsc로 짚는다(K3).
 *
 * 이 목록은 **화면 문구**의 언어다. 일기를 쓰는 모델의 출력 언어는 캐릭터의 언어 표에서 오며 이것과 무관하다(FR-016, 원칙 III).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** BCP-47 언어 마디(소문자) */
export type Language = "ko";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["ko"];

/** 감지하지 못했거나 맞는 것이 없을 때 */
export const DEFAULT_LANGUAGE: Language = "ko";
