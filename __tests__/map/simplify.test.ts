/**
 * 126 — 지도 데이터 단순화·칸 자르기 (contracts/map-file.md BM2·BM5·MP6, `scripts/map/simplify.ts`).
 * 평면 좌표 `[x, y]`를 다룬다 — 단위는 부르는 쪽이 정한다(빌드는 미터).
 */
import {
  clipLineToRect,
  clipRingToRect,
  douglasPeucker,
  mergeLines,
  orientRing,
  signedArea,
  type Pt,
} from "../../scripts/map/simplify";

describe("126 douglasPeucker (BM2)", () => {
  it("허용 오차 안의 중간 점은 버리고 끝점은 보존한다", () => {
    const line: Pt[] = [
      [0, 0],
      [5, 0.4],
      [10, 0],
    ];
    expect(douglasPeucker(line, 1)).toEqual([
      [0, 0],
      [10, 0],
    ]);
  });

  it("허용 오차를 넘는 꼭짓점은 남긴다", () => {
    const line: Pt[] = [
      [0, 0],
      [5, 3],
      [10, 0],
    ];
    expect(douglasPeucker(line, 1)).toEqual(line);
  });

  it("점이 둘 이하면 그대로다", () => {
    expect(
      douglasPeucker(
        [
          [0, 0],
          [1, 1],
        ],
        5,
      ),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(douglasPeucker([[2, 2]], 5)).toEqual([[2, 2]]);
  });

  it("닫힌 고리(처음=끝)도 처리한다 — 끝점은 같게 보존한다", () => {
    const ring: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const out = douglasPeucker(ring, 1);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([0, 0]);
    expect(out.length).toBe(5);
  });

  it("아주 긴 선(수만 점)에서도 재귀 한도에 걸리지 않는다", () => {
    const line: Pt[] = [];
    for (let i = 0; i < 60000; i++) line.push([i, Math.sin(i / 50) * 20]);
    expect(() => douglasPeucker(line, 0.5)).not.toThrow();
  });
});

describe("126 clipLineToRect (MP6)", () => {
  const rect = { xmin: 0, ymin: 0, xmax: 10, ymax: 10 };

  it("완전히 안에 있으면 그대로 한 조각이다", () => {
    expect(
      clipLineToRect(
        [
          [1, 1],
          [9, 9],
        ],
        rect,
      ),
    ).toEqual([
      [
        [1, 1],
        [9, 9],
      ],
    ]);
  });

  it("완전히 밖이면 조각이 없다", () => {
    expect(
      clipLineToRect(
        [
          [20, 20],
          [30, 30],
        ],
        rect,
      ),
    ).toEqual([]);
  });

  it("칸 경계를 가로지르면 경계 좌표에서 자른다", () => {
    expect(
      clipLineToRect(
        [
          [5, 5],
          [15, 5],
        ],
        rect,
      ),
    ).toEqual([
      [
        [5, 5],
        [10, 5],
      ],
    ]);
    expect(
      clipLineToRect(
        [
          [-5, 5],
          [5, 5],
        ],
        rect,
      ),
    ).toEqual([
      [
        [0, 5],
        [5, 5],
      ],
    ]);
  });

  it("들어갔다 나갔다 다시 들어오면 조각 둘로 나뉜다", () => {
    const out = clipLineToRect(
      [
        [2, 2],
        [2, 15],
        [8, 15],
        [8, 2],
      ],
      rect,
    );
    expect(out).toEqual([
      [
        [2, 2],
        [2, 10],
      ],
      [
        [8, 10],
        [8, 2],
      ],
    ]);
  });
});

describe("126 clipRingToRect (MP6)", () => {
  const rect = { xmin: 0, ymin: 0, xmax: 10, ymax: 10 };

  it("완전히 안의 고리는 그대로 닫힌 고리다", () => {
    const ring: Pt[] = [
      [2, 2],
      [8, 2],
      [8, 8],
      [2, 8],
      [2, 2],
    ];
    expect(clipRingToRect(ring, rect)).toEqual(ring);
  });

  it("칸을 가로지르는 고리는 칸 안 부분이 닫힌 고리로 남는다(변이 칸 경계를 따른다)", () => {
    const ring: Pt[] = [
      [5, 5],
      [15, 5],
      [15, 15],
      [5, 15],
      [5, 5],
    ];
    const out = clipRingToRect(ring, rect);
    expect(out[0]).toEqual(out[out.length - 1]);
    for (const [x, y] of out) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(10);
    }
    expect(out).toContainEqual([10, 10]);
  });

  it("칸 전체를 덮는 큰 고리는 칸 네 모서리 고리가 된다", () => {
    const ring: Pt[] = [
      [-5, -5],
      [15, -5],
      [15, 15],
      [-5, 15],
      [-5, -5],
    ];
    const out = clipRingToRect(ring, rect);
    for (const c of [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ])
      expect(out).toContainEqual(c);
  });

  it("완전히 밖이면 빈 목록이다", () => {
    expect(
      clipRingToRect(
        [
          [20, 20],
          [30, 20],
          [30, 30],
          [20, 20],
        ],
        rect,
      ),
    ).toEqual([]);
  });
});

describe("126 mergeLines (용량 — 도형 수 줄이기)", () => {
  it("끝점이 정확히 둘만 만나면 한 선으로 잇는다(방향이 달라도)", () => {
    const out = mergeLines([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [2, 0],
        [1, 0],
      ],
      [
        [2, 0],
        [3, 0],
      ],
    ]);
    expect(out).toHaveLength(1);
    const line = out[0]!;
    const xs = line.map((p) => p[0]);
    expect(xs).toEqual(xs[0] === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0]);
  });

  it("세 선이 만나는 곳(T자 교차)은 잇지 않는다", () => {
    const out = mergeLines([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [2, 0],
      ],
      [
        [1, 0],
        [1, 1],
      ],
    ]);
    expect(out).toHaveLength(3);
  });

  it("떨어진 선은 그대로 둔다", () => {
    const out = mergeLines([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [5, 5],
        [6, 5],
      ],
    ]);
    expect(out).toHaveLength(2);
  });

  it("모든 점이 보존된다(잇는 점은 한 번만 적는다)", () => {
    const out = mergeLines([
      [
        [0, 0],
        [1, 1],
      ],
      [
        [1, 1],
        [2, 0],
      ],
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(3);
  });

  it("고리를 이루는 선들도 무한 반복하지 않는다", () => {
    const out = mergeLines([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [1, 1],
      ],
      [
        [1, 1],
        [0, 0],
      ],
    ]);
    const total = out.reduce((n, l) => n + l.length, 0);
    expect(total).toBeGreaterThanOrEqual(4);
  });
});

describe("126 orientRing — 겹친 면이 구멍이 되지 않도록 방향을 맞춘다(코드 리뷰)", () => {
  const ccw: Pt[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];
  const cw: Pt[] = [...ccw].reverse();

  it("반시계는 넓이가 양수, 시계는 음수다", () => {
    expect(signedArea(ccw)).toBeGreaterThan(0);
    expect(signedArea(cw)).toBeLessThan(0);
  });

  it("바깥 고리는 반시계로, 구멍은 시계로 돌린다(이미 맞으면 그대로)", () => {
    expect(signedArea(orientRing(cw, true))).toBeGreaterThan(0);
    expect(signedArea(orientRing(ccw, false))).toBeLessThan(0);
    expect(orientRing(ccw, true)).toEqual(ccw);
    expect(orientRing(cw, false)).toEqual(cw);
  });

  it("입력을 바꾸지 않는다", () => {
    const input = ccw.map((p) => [p[0], p[1]] as Pt);
    orientRing(input, false);
    expect(input).toEqual(ccw);
  });

  it("★ 같은 방향의 겹친 두 바깥 고리는 겹친 곳의 감김 수가 2다(비영 채우기에서 채워진다)", () => {
    // 두 바깥 고리를 모두 반시계로 맞추면 감김 수가 더해진다 — 서로 반대 방향으로 두면 겹친 곳이 0이 되어 구멍이 된다
    const a = orientRing(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      true,
    );
    const b = orientRing(
      [
        [5, 5],
        [5, 15],
        [15, 15],
        [15, 5],
        [5, 5],
      ],
      true,
    ); // 시계로 적힌 고리
    expect(signedArea(a)).toBeGreaterThan(0);
    expect(signedArea(b)).toBeGreaterThan(0);
  });
});

describe("126 mergeLines — 앞쪽으로 늘리는 이음도 정확하다", () => {
  it("가운데 선에서 시작해도 앞·뒤로 모두 이어 한 선이 된다", () => {
    const out = mergeLines([
      [
        [1, 0],
        [2, 0],
      ],
      [
        [0, 0],
        [1, 0],
      ],
      [
        [2, 0],
        [3, 0],
      ],
      [
        [-1, 0],
        [0, 0],
      ],
    ]);
    expect(out).toHaveLength(1);
    const xs = out[0]!.map((p) => p[0]);
    expect(xs).toEqual(xs[0] === -1 ? [-1, 0, 1, 2, 3] : [3, 2, 1, 0, -1]);
  });
});
