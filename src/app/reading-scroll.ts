/**
 * 쓴 날을 읽는 동안 스트립을 접고 펴는 판정 (052, 보드 `5a`·`5b`).
 *
 * 계약: specs/052-reading-scroll/contracts/reading-scroll.md FOLD1~FOLD9, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정만 한다.** 그리는 것도(높이·불투명도), 스크롤 위치를 재는 것도 이 파일 밖이다 — 지면
 * (`WrittenDayPaper`)가 표본을 알리고, 화면(`DiaryListScreen`)이 결과를 그린다.
 *
 * 보드 `5b` 스크립트 `onPaperScroll`과 같은 규칙이다:
 *   - 접힘: 펼침 + `y > 8` + 위로 가는 중이 아님(`!up`, `up = y < 직전 y`)
 *   - 펼침: 접힘 + 위로 가는 중 + `y <= 2`
 *
 * **보드의 300ms 디바운스는 두지 않는다**(시안용, 확정값 아님 — 분해 설계 §3.6). 접힘 8px과 펼침
 * 2px 사이의 간격이 되튐을 막는다. 그래서 이 파일에는 시각도 타이머도 없다(FOLD9).
 *
 * **보드에 없는 규칙 하나**(FR-005): 스트립을 접으면 지면이 그만큼 늘어난다. 접은 뒤에도 더 내릴 수
 * 있는 거리(`content − viewport − stripHeight`)가 8px 이하이면 접지 않는다 — 접자마자 스크롤이 0으로
 * 눌려 곧바로 다시 펼쳐지는 깜빡임을 막는다.
 *
 * 경계 숫자는 **사람이 정한 값**이고 이 파일에만 있다(원칙 V — 코드가 분포를 보고 정하지 않는다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 이만큼(px)을 넘게 내려야 접는다 (보드 `5b` — 아래로 8px 넘게) */
export const FOLD_AFTER = 8;

/** 이 위치(px) 이하로 올라와야 펼친다 (보드 `5b` — 맨 위, `y ≤ 2`) */
export const UNFOLD_AT = 2;

/** 지면이 스크롤 사건마다 알리는 값 */
export type ScrollSample = {
  /** 새 스크롤 위치 */
  y: number;
  /** 직전 스크롤 사건의 위치 — 방향 판정에 쓴다 */
  previousY: number;
  /** 지면의 보이는 높이 */
  viewport: number;
  /** 지면 내용 전체 높이 */
  content: number;
  /** 접히는 영역(스트립·안내 캡션)의 잰 높이. 재기 전에는 0 */
  stripHeight: number;
};

/** 이 스크롤 뒤에 스트립이 접혀 있어야 하는가 */
export function foldAfterScroll(collapsed: boolean, sample: ScrollSample): boolean {
  const { y, previousY, viewport, content, stripHeight } = sample;
  const goingUp = y < previousY;

  if (collapsed) return !(goingUp && y <= UNFOLD_AT);

  if (y <= FOLD_AFTER || goingUp) return false;
  return content - viewport - stripHeight > FOLD_AFTER;
}
