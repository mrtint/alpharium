/**
 * 121 — 경계 고리를 형태를 지키며 줄인다(Douglas–Peucker, research R3).
 *
 * 스파이크의 등간격 추림은 긴 공원(망원한강공원·여의도)을 틀리게 해서 이 방식으로 바꿨다.
 * 좌표는 `[위도, 경도]`(도). 허용 오차도 도 단위다(1e-4도 ≈ 10m — 사람이 정한 값).
 */

export type LatLon = [number, number];

function perpendicular(p: LatLon, a: LatLon, b: LatLon): number {
  const dy = b[0] - a[0];
  const dx = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * (p[1] - a[1]) - dx * (p[0] - a[0])) / len;
}

function dp(points: LatLon[], tolerance: number): LatLon[] {
  if (points.length <= 2) return points;
  let maxD = -1;
  let at = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > maxD) {
      maxD = d;
      at = i;
    }
  }
  if (maxD <= tolerance) return [points[0], points[points.length - 1]];
  const left = dp(points.slice(0, at + 1), tolerance);
  const right = dp(points.slice(at), tolerance);
  return [...left.slice(0, -1), ...right];
}

/**
 * 닫힌 고리(첫 점 = 끝 점)를 줄인다. 결과도 닫혀 있고 꼭짓점이 셋 이상이다(닫는 점 포함 넷 이상).
 *
 * 닫힌 고리는 첫 점과 끝 점이 같아 기준선이 0이 되므로, 첫 점에서 가장 먼 점으로 두 반쪽을 나눠 따로 줄인다.
 */
export function simplifyRing(ring: LatLon[], tolerance: number): LatLon[] {
  const open = ring.length > 1 && sameAs(ring[0], ring[ring.length - 1]) ? ring.slice(0, -1) : ring;
  if (open.length <= 3) return [...open, open[0]];
  let far = 1;
  let farD = -1;
  for (let i = 1; i < open.length; i += 1) {
    const d = Math.hypot(open[i][0] - open[0][0], open[i][1] - open[0][1]);
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const a = dp(open.slice(0, far + 1), tolerance);
  const b = dp([...open.slice(far), open[0]], tolerance);
  const out = [...a.slice(0, -1), ...b];
  if (out.length < 4) {
    // 너무 작아 선 하나로 줄었다 — 원래 꼭짓점 셋을 남긴다.
    return [open[0], open[Math.floor(open.length / 3)], open[far], open[0]];
  }
  return out;
}

function sameAs(a: LatLon, b: LatLon): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
