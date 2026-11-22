/**
 * 126 — 지도 데이터 단순화·칸 자르기(데이터 만들기 전용, 순수).
 *
 * 계약: specs/126-route-map-illustration/contracts/map-file.md BM2·MP6
 * 평면 좌표 `[x, y]`를 다룬다 — 단위는 부르는 쪽이 정한다(빌드는 미터 환산 좌표로 단순화하고 1e-5도 좌표로 자른다).
 */

export type Pt = [number, number];
export type Rect = { xmin: number; ymin: number; xmax: number; ymax: number };

/**
 * Douglas-Peucker. 허용 오차 `tol` 안의 중간 점을 버리고 끝점은 보존한다. **재귀를 쓰지 않는다** — 해안선은 수만 점의 한 선이라
 * 재귀 깊이가 한도를 넘는다. 닫힌 고리(처음=끝)는 끝점 거리가 0이라 점 사이 거리로 갈린다.
 */
export function douglasPeucker(points: readonly Pt[], tol: number): Pt[] {
  const n = points.length;
  if (n <= 2) return points.map((p) => [p[0], p[1]] as Pt);
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    if (b <= a + 1) continue;
    const [x1, y1] = points[a]!;
    const [x2, y2] = points[b]!;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    let maxD = -1;
    let maxI = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]!;
      const d =
        len > 0
          ? Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len
          : Math.hypot(px - x1, py - y1);
      if (d > maxD) {
        maxD = d;
        maxI = i;
      }
    }
    if (maxD > tol) {
      keep[maxI] = 1;
      stack.push([a, maxI], [maxI, b]);
    }
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) if (keep[i] === 1) out.push([points[i]![0], points[i]![1]]);
  return out;
}

/** Liang-Barsky — 선분을 사각형에 자른다. 닿지 않으면 `null`, 아니면 사각형 안의 끝점 둘 */
function clipSegment(p: Pt, q: Pt, r: Rect): [Pt, Pt] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const edges: [number, number][] = [
    [-dx, p[0] - r.xmin],
    [dx, r.xmax - p[0]],
    [-dy, p[1] - r.ymin],
    [dy, r.ymax - p[1]],
  ];
  for (const [pp, qq] of edges) {
    if (pp === 0) {
      if (qq < 0) return null;
    } else {
      const t = qq / pp;
      if (pp < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return [
    [p[0] + t0 * dx, p[1] + t0 * dy],
    [p[0] + t1 * dx, p[1] + t1 * dy],
  ];
}

/** 선을 사각형에 맞춰 조각으로 나눈다. 칸 경계에서 이웃 칸의 조각과 같은 좌표에서 만난다(MP6) */
export function clipLineToRect(points: readonly Pt[], rect: Rect): Pt[][] {
  const pieces: Pt[][] = [];
  let current: Pt[] | null = null;
  for (let i = 1; i < points.length; i++) {
    const seg = clipSegment(points[i - 1]!, points[i]!, rect);
    if (seg === null) {
      current = null;
      continue;
    }
    const [a, b] = seg;
    const continues =
      current !== null &&
      current[current.length - 1]![0] === a[0] &&
      current[current.length - 1]![1] === a[1];
    if (continues) {
      current!.push(b);
    } else {
      current = [a, b];
      pieces.push(current);
    }
  }
  return pieces;
}

type Edge = (p: Pt) => boolean;

/** Sutherland-Hodgman — 닫힌 고리(처음=끝)를 사각형에 자른다. 칸 밖이면 빈 목록 */
export function clipRingToRect(ring: readonly Pt[], rect: Rect): Pt[] {
  let poly: Pt[] = ring.slice(0, ring.length - 1).map((p) => [p[0], p[1]] as Pt);
  const planes: { inside: Edge; cut: (a: Pt, b: Pt) => Pt }[] = [
    {
      inside: (p) => p[0] >= rect.xmin,
      cut: (a, b) => [rect.xmin, a[1] + ((b[1] - a[1]) * (rect.xmin - a[0])) / (b[0] - a[0])],
    },
    {
      inside: (p) => p[0] <= rect.xmax,
      cut: (a, b) => [rect.xmax, a[1] + ((b[1] - a[1]) * (rect.xmax - a[0])) / (b[0] - a[0])],
    },
    {
      inside: (p) => p[1] >= rect.ymin,
      cut: (a, b) => [a[0] + ((b[0] - a[0]) * (rect.ymin - a[1])) / (b[1] - a[1]), rect.ymin],
    },
    {
      inside: (p) => p[1] <= rect.ymax,
      cut: (a, b) => [a[0] + ((b[0] - a[0]) * (rect.ymax - a[1])) / (b[1] - a[1]), rect.ymax],
    },
  ];
  for (const plane of planes) {
    if (poly.length === 0) return [];
    const next: Pt[] = [];
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i]!;
      const prev = poly[(i + poly.length - 1) % poly.length]!;
      const curIn = plane.inside(cur);
      const prevIn = plane.inside(prev);
      if (curIn) {
        if (!prevIn) next.push(plane.cut(prev, cur));
        next.push(cur);
      } else if (prevIn) {
        next.push(plane.cut(prev, cur));
      }
    }
    poly = next;
  }
  if (poly.length < 3) return [];
  return [...poly, [poly[0]![0], poly[0]![1]]];
}

/**
 * 끝점이 **정확히 둘**만 만나는 곳에서 선들을 한 선으로 잇는다(OSM은 길을 교차로마다 여러 way로 쪼갠다 — 도형 수와 가변 정수 머리가
 * 용량의 큰 몫이라 잇는다). 세 선 이상이 만나는 끝점(T자 교차 등)은 잇지 않는다. 입력 선은 바꾸지 않는다.
 */
export function mergeLines(lines: readonly Pt[][]): Pt[][] {
  const key = (p: Pt) => `${p[0]},${p[1]}`;
  const ends = new Map<string, { line: number; end: 0 | 1 }[]>();
  lines.forEach((l, i) => {
    if (l.length < 2) return;
    for (const [end, p] of [
      [0, l[0]!],
      [1, l[l.length - 1]!],
    ] as const) {
      const k = key(p);
      const list = ends.get(k);
      if (list) list.push({ line: i, end });
      else ends.set(k, [{ line: i, end }]);
    }
  });
  const used = new Uint8Array(lines.length);
  const out: Pt[][] = [];

  /** `line`의 `end`쪽 끝점에 이어 붙일 짝(정확히 둘이 만나고 아직 안 쓴 다른 선)을 찾는다 */
  const partner = (line: number, end: 0 | 1): { line: number; end: 0 | 1 } | null => {
    const l = lines[line]!;
    const list = ends.get(key(end === 0 ? l[0]! : l[l.length - 1]!));
    if (!list || list.length !== 2) return null;
    const other = list.find((e) => e.line !== line);
    if (!other || used[other.line] === 1) return null;
    return other;
  };

  for (let i = 0; i < lines.length; i++) {
    if (used[i] === 1 || lines[i]!.length < 2) continue;
    used[i] = 1;
    let chain: Pt[] = lines[i]!.map((p) => [p[0], p[1]] as Pt);
    // 뒤쪽으로 늘린다
    let tail: { line: number; end: 0 | 1 } | null = partner(i, 1);
    let cur = i;
    while (tail !== null) {
      const next = lines[tail.line]!;
      used[tail.line] = 1;
      const seg = tail.end === 0 ? next : [...next].reverse();
      chain.push(...seg.slice(1).map((p) => [p[0], p[1]] as Pt));
      cur = tail.line;
      tail = partner(cur, tail.end === 0 ? 1 : 0);
    }
    // 앞쪽으로 늘린다 — 조각을 모아 두었다가 한 번에 붙인다(매번 체인 전체를 복사하지 않는다, 코드 리뷰)
    const front: Pt[][] = [];
    let head: { line: number; end: 0 | 1 } | null = partner(i, 0);
    while (head !== null) {
      const prev = lines[head.line]!;
      used[head.line] = 1;
      const seg = head.end === 1 ? prev : [...prev].reverse();
      front.push(seg.slice(0, -1).map((p) => [p[0], p[1]] as Pt));
      cur = head.line;
      head = partner(cur, head.end === 1 ? 0 : 1);
    }
    if (front.length > 0) chain = [...front.reverse().flat(), ...chain];
    out.push(chain);
  }
  return out;
}

/** 닫힌 고리의 부호 있는 넓이(신발끈 공식, y가 위로 갈수록 커지는 평면에서 반시계가 양수) */
export function signedArea(ring: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i]![0] * ring[i + 1]![1] - ring[i + 1]![0] * ring[i]![1];
  }
  return a / 2;
}

/**
 * 고리를 원하는 방향으로 돌린다(`ccw`가 참이면 반시계). 바깥 고리는 반시계, 구멍은 시계로 맞추면 화면이 비영(nonzero) 채우기로 그려도
 * 겹친 바깥 고리(공원 안의 숲, 겹친 저수지)가 구멍으로 비지 않는다 — 짝홀(evenodd)은 겹침을 구멍으로 본다(코드 리뷰). 넓이가 0이면 그대로다.
 */
export function orientRing(ring: readonly Pt[], ccw: boolean): Pt[] {
  const area = signedArea(ring);
  const copy = ring.map((p) => [p[0], p[1]] as Pt);
  return area !== 0 && area > 0 !== ccw ? copy.reverse() : copy;
}
