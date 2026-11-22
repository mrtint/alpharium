/**
 * 126 — 점 옆 이름 라벨을 놓을 자리를 고른다(순수).
 *
 * 계약: specs/126-route-map-illustration/contracts/day-map.md DM11, research R7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 오른쪽(점이 상자 오른쪽 45%에 있으면 왼쪽)을 먼저 놓고, 점·앞 라벨과 겹치면 위·아래 대각선 후보 중 겹치지 않는 첫 자리에 놓는다.
 * 어디도 안 되면 그 라벨만 생략한다(범례에 이름이 있다). 글자 폭은 어림이라 **한글 한 글자 12.5dp(글꼴 12)** 로 센다 — 사람이 정한 값이다.
 * 글꼴 배율에는 변하지 않는다(라벨은 `allowFontScaling={false}`). 위경도를 모른다 — 점의 화면 좌표(dp)만 받는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 라벨 글자·판 치수(dp). **사람이 정한 값이다**(보드 밖 초안) — 모형에서 정했다 */
export const LABEL_STYLE = {
  fontSize: 12,
  /** 한 글자 폭 어림 */
  charWidth: 12.5,
  /** 판 좌우 여백 */
  padH: 3,
  /** 판 높이 */
  height: 16,
  /** 점과 라벨 사이 */
  gap: 4,
  /** 상자 가장자리에서 띄우는 최소 거리 */
  edge: 2,
} as const;

export type LabelMarker = {
  id: number;
  /** 점 중심(dp) */
  cx: number;
  cy: number;
  /** 점 폭의 절반(겹친 점은 넓다) */
  halfW: number;
  /** 이름. `null`이면 라벨이 없다 */
  label: string | null;
};

export type PlacedLabel = {
  id: number;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type Rect = { left: number; top: number; width: number; height: number };

const DOT_HEIGHT = 22;

function overlaps(a: Rect, b: Rect): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

export function labelPlacement(
  markers: readonly LabelMarker[],
  frameW: number,
  frameH: number,
): PlacedLabel[] {
  const { charWidth, padH, height, gap, edge } = LABEL_STYLE;
  const taken: Rect[] = markers.map((m) => ({
    left: m.cx - m.halfW,
    top: m.cy - DOT_HEIGHT / 2,
    width: m.halfW * 2,
    height: DOT_HEIGHT,
  }));
  const placed: PlacedLabel[] = [];

  for (const m of markers) {
    if (m.label === null) continue;
    const width = [...m.label].length * charWidth + padH * 2;
    const rightFirst = m.cx <= frameW * 0.55;
    const midTop = m.cy - height / 2;
    const rightLeft = m.cx + m.halfW + gap;
    const leftLeft = m.cx - m.halfW - gap - width;
    const rightSide = { left: rightLeft, top: midTop };
    const leftSide = { left: leftLeft, top: midTop };
    // 위·아래 대각선 — 점의 한 모서리에 판의 반대 모서리를 맞춘다
    const upRight = { left: m.cx - m.halfW, top: m.cy - DOT_HEIGHT / 2 - height - 2 };
    const downRight = { left: m.cx - m.halfW, top: m.cy + DOT_HEIGHT / 2 + 2 };
    const upLeft = { left: m.cx + m.halfW - width, top: upRight.top };
    const downLeft = { left: m.cx + m.halfW - width, top: downRight.top };
    const candidates = rightFirst
      ? [rightSide, leftSide, upRight, downRight, upLeft, downLeft]
      : [leftSide, rightSide, upLeft, downLeft, upRight, downRight];

    for (const c of candidates) {
      const rect: Rect = { left: c.left, top: c.top, width, height };
      const inside =
        rect.left >= edge &&
        rect.top >= edge &&
        rect.left + width <= frameW - edge &&
        rect.top + height <= frameH - edge;
      if (!inside || taken.some((t) => overlaps(rect, t))) continue;
      taken.push(rect);
      placed.push({ id: m.id, label: m.label, ...rect });
      break;
    }
  }
  return placed;
}
