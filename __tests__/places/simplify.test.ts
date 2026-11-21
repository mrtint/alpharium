/**
 * 121 — 경계 단순화(Douglas–Peucker, research R3).
 */
import { simplifyRing } from "../../scripts/places/simplify";

describe("simplifyRing", () => {
  it("직선 위의 점을 걷는다", () => {
    const ring: [number, number][] = [
      [0, 0],
      [0, 0.0005],
      [0, 0.001],
      [0.001, 0.001],
      [0.001, 0],
      [0, 0],
    ];
    const out = simplifyRing(ring, 1e-4);
    expect(out).not.toContainEqual([0, 0.0005]);
    expect(out).toContainEqual([0.001, 0.001]);
  });

  it("허용 오차보다 큰 굴곡은 남긴다", () => {
    const ring: [number, number][] = [
      [0, 0],
      [0.0005, 0.0005],
      [0, 0.001],
      [0.002, 0.001],
      [0, 0],
    ];
    expect(simplifyRing(ring, 1e-4)).toContainEqual([0.0005, 0.0005]);
  });

  it("닫힌 고리는 닫힌 채로 남고 꼭짓점이 셋 이상이다", () => {
    const ring: [number, number][] = [
      [0, 0],
      [0, 1e-6],
      [1e-6, 1e-6],
      [0, 0],
    ];
    const out = simplifyRing(ring, 1e-4);
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out[0]).toEqual(out[out.length - 1]);
  });
});
