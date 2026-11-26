/**
 * 135 — 폴라로이드 카드를 지도 상자 안 어디에 둘까 (research R6).
 *
 * 순수 함수다. 누른 점의 오른쪽 위 → 왼쪽 위 → 오른쪽 아래 → 왼쪽 아래 순으로, 상자 안에 들고 점(정사각, 반폭 `halfW`)을
 * 가리지 않는 첫 자리를 고른다. 어디에도 맞지 않으면(작은 상자 한가운데) 오른쪽 위 자리를 상자 안으로 밀어 넣는다 — 그때만
 * 점을 가릴 수 있다. 순서는 **사람이 정한 값이다**(원칙 V).
 */

export type CardPlace = { left: number; top: number };

/** 점과 카드 사이 틈(dp) — 사람이 정한 값 */
const GAP = 4;

export function cardPlacement(
  marker: { cx: number; cy: number; halfW: number },
  card: { width: number; height: number },
  box: { width: number; height: number },
): CardPlace {
  const half = marker.halfW;
  const right = marker.cx + half + GAP;
  const left = marker.cx - half - GAP - card.width;
  const above = marker.cy - half - GAP - card.height;
  const below = marker.cy + half + GAP;
  const fits = (l: number, t: number) =>
    l >= 0 && t >= 0 && l + card.width <= box.width && t + card.height <= box.height;
  // 옆자리 — 세로는 점 중심에 맞추되 상자 안으로 당긴다. 지도 높이(최대 210)에서 카드(116)는 가운데 띠의 점 위·아래에 들지 못해
  // 이 후보가 없으면 그 점을 가렸다(코드 리뷰)
  const beside = Math.min(Math.max(marker.cy - card.height / 2, 0), box.height - card.height);
  for (const [l, t] of [
    [right, above],
    [left, above],
    [right, below],
    [left, below],
    [right, beside],
    [left, beside],
  ] as const) {
    if (fits(l, t)) return { left: l, top: t };
  }
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(0, max));
  return {
    left: clamp(right, box.width - card.width),
    top: clamp(above, box.height - card.height),
  };
}
