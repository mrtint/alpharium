/**
 * 감지한 기기 언어 → 화면 언어 (062).
 *
 * 계약: specs/062-ui-text-i18n/contracts/i18n.md L1~L5, spec FR-007·FR-008·FR-009, Clarification Q3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수하다** — 입력(감지 결과·지원 목록·기본 언어)만으로 결과가 정해진다. 기기를 읽지 않는다.
 *
 * 규칙: 선호 순서대로 각 태그의 첫 마디(`-`·`_` 앞)를 소문자로 바꿔 지원 목록에서 찾고 첫 일치를 고른다. 없거나 감지하지 못했으면
 * 기본 언어. 문자 체계·지역을 가르는 규칙(`zh-Hans`·`pt-BR`)은 그런 언어가 들어올 때 정한다(Clarification Q3).
 *
 * **「감지한 것」과 「고른 것」을 따로 담는다**(원칙 V) — 기본 언어로 떨어졌다고 감지값을 기본 언어로 고쳐 적지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 감지 결과 — 기기 선호 순서의 언어 태그 원문, 또는 감지 못함(`null`) */
export type DetectedLocales = readonly string[] | null;

export type LanguageResolution<L extends string = string> = {
  /** 감지한 것. 해석이 바꾸지 않는다 */
  detected: DetectedLocales;
  /** 고른 것 */
  chosen: L;
  /** 감지한 것 중 지원 목록과 맞은 것이 있었는가. `false`면 기본 언어로 떨어진 것 */
  matched: boolean;
};

function languagePartOf(tag: string): string {
  return tag.split(/[-_]/)[0].trim().toLowerCase();
}

export function resolveLanguage<L extends string>(
  detected: DetectedLocales,
  supported: readonly L[],
  fallback: L,
): LanguageResolution<L> {
  if (detected !== null) {
    for (const tag of detected) {
      const part = languagePartOf(tag);
      if (part === "") continue;
      const hit = supported.find((language) => language === part);
      if (hit !== undefined) return { detected, chosen: hit, matched: true };
    }
  }
  return { detected, chosen: fallback, matched: false };
}
