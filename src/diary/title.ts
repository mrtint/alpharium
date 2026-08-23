/**
 * 일기 제목 분리.
 *
 * 계약: specs/014-character-persona/contracts/title.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정(`acceptance.ts`) 이후에만 호출되는, 판정과 완전히 분리된 자리다.**
 *
 * 005의 `acceptance.md`가 "판정 갈래는 넷뿐이고 다섯 번째를 넣으려면 계약을 먼저
 * 고친다"고 못 박았다. 이 함수는 그 넷 중 어디에도 관여하지 않는다 — `judge()`가
 * 이미 `{ ok: true }`를 반환한 텍스트에 대해서만 `pipeline.ts`가 이것을 부른다.
 *
 * **`Ending`도 `Character`도 인자로 받지 않는다**(계약 P1). 판정 로직이 이 함수
 * 안으로 스며들 경로 자체가 타입에 없다.
 *
 * **예외를 던지지 않는다**(계약 P2). 어떤 문자열에도 값을 반환한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 제목으로 채택할 첫 줄의 최대 길이. 짐작이며 실측 근거는 research.md R2 참조 */
const MAX_TITLE_LENGTH = 40;

export type TitleExtraction = {
  title?: string;
  body: string;
};

/**
 * 판정을 통과한 전체 텍스트에서 제목을 사후 분리한다.
 *
 * **판정 순서**(contracts/title.md):
 * 1. 첫 번째 빈 줄에서 앞/뒤로 나눈다
 * 2. 앞부분이 정확히 한 줄이고 40자 이하이면 → title/body로 나눈다
 * 3. 그렇지 않으면 → title 없이 전체가 body다
 */
export function extractTitle(text: string): TitleExtraction {
  const match = text.match(/\r?\n\s*\r?\n/);
  if (match === null || match.index === undefined) {
    return { body: text };
  }

  const head = text.slice(0, match.index);
  const rest = text.slice(match.index + match[0].length);

  // 앞부분이 여러 줄이면 제목이 아니라 본문의 일부일 가능성이 크다.
  if (/\r?\n/.test(head)) {
    return { body: text };
  }

  const title = head.trim();
  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    return { body: text };
  }

  return { title, body: rest.trim() };
}
