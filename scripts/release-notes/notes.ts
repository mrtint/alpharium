/**
 * 릴리스 노트 읽기·검증 — Play 「출시 노하우」와 TestFlight 「테스트할 내용」이 같은 글(`release-notes/ko.txt`)을 쓴다.
 *
 * 노트는 사람이 릴리스 전에 쓰고 빌드 번호를 올리는 커밋과 함께 커밋한다. 비어 있거나 한도를 넘으면 14분짜리 빌드를 돌리기
 * 전에(설정 점검 단계) 실패시킨다 — 스토어가 잘라 올리거나 낡은 노트가 그대로 나가는 것을 막는다.
 */

/** Play 릴리스 노트(언어당) 한도 — 글자 수 */
export const PLAY_NOTES_MAX = 500;
/** TestFlight 「테스트할 내용」 한도 — 글자 수 */
export const TESTFLIGHT_NOTES_MAX = 4000;

/** 앞뒤 공백을 걷고 줄바꿈을 `\n`으로 맞춘 노트. 비었거나 한도를 넘으면 던진다 */
export function normalizeNotes(raw: string, maxChars: number): string {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (text === "") throw new Error("릴리스 노트가 비어 있다 (release-notes/ko.txt)");
  // 코드 포인트로 센다 — 스토어는 글자 단위로 세므로 이모지 하나가 둘로 계산되지 않게
  const length = [...text].length;
  if (length > maxChars) {
    throw new Error(`릴리스 노트가 ${length}자다 (한도 ${maxChars}자, release-notes/ko.txt)`);
  }
  return text;
}
