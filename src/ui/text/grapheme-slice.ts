/**
 * 038 — 글자 경계 안전 분할 (순수 유틸).
 *
 * 계약: specs/038-typewriter-diary-reveal/contracts/typewriter-text.md A (G1~G7)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `TypewriterText`가 글자 단위로 문자열을 자를 때 이 유틸만 쓴다. RN 런타임
 * 의존이 없는 순수 함수라 `test:logic`(node 환경)에서 기기 없이 검증된다.
 *
 * **`string.slice(0, n)`은 UTF-16 코드 유닛 단위라 서로게이트 쌍(대부분의
 * 이모지)을 쪼갤 수 있다.** `Array.from()`은 코드포인트 단위로 순회하므로
 * 안전하다. 한글 완성형(NFC)은 코드포인트 하나라 이걸로 충분하다.
 *
 * ZWJ 이모지 시퀀스(👨‍👩‍👧)나 결합 문자(NFD 자모 분리)까지 완벽히 하나로
 * 묶으려면 `Intl.Segmenter`가 필요하나, 일기 본문은 kanana가 생성한 한국어
 * NFC 텍스트이고 이모지를 쓰지 않으므로(프롬프트·모델 특성) 코드포인트 단위가
 * 실무상 충분하다 — 새 의존성을 들이지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 문자열을 코드포인트 단위 배열로. 서로게이트 쌍을 쪼개지 않는다. */
export function graphemeUnits(text: string): string[] {
  return Array.from(text);
}

/**
 * 앞에서부터 `count`개의 코드포인트만 남긴 문자열.
 *
 * `count`가 음수면 0으로, 전체 길이를 넘으면 전체로 clamp한다(G3·G4).
 */
export function graphemeSlice(text: string, count: number): string {
  const n = Math.max(0, count);
  return graphemeUnits(text).slice(0, n).join("");
}

/** 코드포인트 단위 길이. `string.length`(UTF-16 코드 유닛)와 다를 수 있다(G5). */
export function graphemeLength(text: string): number {
  return graphemeUnits(text).length;
}
