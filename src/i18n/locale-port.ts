/**
 * 기기 선호 언어를 읽는 통로 (062). `expo-localization`을 만지는 유일한 자리다(헌법 검사 D4).
 *
 * 계약: specs/062-ui-text-i18n/contracts/i18n.md D1~D4, research R1·R2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **호출 시점에 `require`한다**(D1) — 모듈 최상단 import가 아니다. 네이티브 모듈이 없는 곳(jest `logic`의 node 환경 등)에서
 * 불러오기가 실패해도 「감지 못함」으로 떨어지게 하려는 것이다(024 `expo-task-manager`와 같은 방식). 헤드리스 태스크도 같은
 * 함수를 부른다(FR-010).
 *
 * **던지지 않고, 지어내지 않는다**(D2, 원칙 V) — 예외·배열 아님·쓸 수 있는 태그 0개는 모두 `null`이다. 빈 배열을 돌려주지 않는다
 * (「못 읽음」은 한 가지 모양이다). 태그는 `languageTag` 원문을 기기 선호 순서대로 준다(D3). `languageCode`는 `null`일 수 있어
 * 쓰지 않는다 — 언어 마디는 `resolve.ts`가 태그에서 뗀다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DetectedLocales } from "./resolve";

export function readDeviceLocales(): DetectedLocales {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const localization = require("expo-localization") as { getLocales?: () => unknown };
    const locales = localization.getLocales?.();
    if (!Array.isArray(locales)) return null;
    const tags = locales
      .map((locale: unknown) => {
        const tag = (locale as { languageTag?: unknown } | null)?.languageTag;
        return typeof tag === "string" ? tag.trim() : "";
      })
      .filter((tag) => tag !== "");
    return tags.length > 0 ? tags : null;
  } catch {
    return null;
  }
}
