/**
 * 126 — 점 옆 이름 라벨 배치 (contracts/day-map.md DM11, research R7). 순수 함수다 — 어림한 글자 폭으로 겹치지 않는 자리를 고른다.
 */
import { LABEL_STYLE, labelPlacement, type LabelMarker } from "../../src/ui/label-placement";

const W = 320;
const H = 198;
const marker = (
  id: number,
  cx: number,
  cy: number,
  label: string | null,
  halfW = 11,
): LabelMarker => ({
  id,
  cx,
  cy,
  halfW,
  label,
});

const overlaps = (a: { left: number; top: number; width: number; height: number }, b: typeof a) =>
  !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );

describe("126 labelPlacement", () => {
  it("R7 — 오른쪽 자리를 먼저 놓는다(점이 왼쪽에 있을 때)", () => {
    const [l] = labelPlacement([marker(1, 60, 100, "서울숲")], W, H);
    expect(l!.id).toBe(1);
    expect(l!.left).toBeGreaterThan(60 + 11); // 점의 오른쪽 변 바깥
    expect(l!.top + l!.height / 2).toBeCloseTo(100, 0); // 점과 같은 높이
  });

  it("R7 — 점이 상자 오른쪽 45%에 있으면 왼쪽에 놓는다", () => {
    const [l] = labelPlacement([marker(1, 260, 100, "서울숲")], W, H);
    expect(l!.left + l!.width).toBeLessThan(260 - 11 + 1);
  });

  it("이름이 없는 자리(null)는 라벨이 없다", () => {
    expect(labelPlacement([marker(1, 60, 100, null)], W, H)).toEqual([]);
  });

  it("DM11 — 라벨끼리·점과 겹치지 않는다", () => {
    const markers = [
      marker(1, 100, 100, "서울함공원"),
      marker(2, 125, 108, "놀이터"),
      marker(3, 105, 130, "정자"),
      marker(4, 90, 85, "벤치"),
    ];
    const placed = labelPlacement(markers, W, H);
    expect(placed.length).toBeGreaterThan(0);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++)
        expect(overlaps(placed[i]!, placed[j]!)).toBe(false);
      for (const m of markers) {
        const dot = { left: m.cx - m.halfW, top: m.cy - 11, width: m.halfW * 2, height: 22 };
        expect(overlaps(placed[i]!, dot)).toBe(false);
      }
    }
  });

  it("DM11 — 놓을 자리가 없으면 그 라벨만 생략한다(앞 라벨은 남는다)", () => {
    // 이름이 아주 길고 상자가 좁으면 어디에도 안 들어간다
    const placed = labelPlacement(
      [
        marker(1, 20, 20, "짧음"),
        marker(2, 160, 99, "아주아주아주아주아주아주아주 긴 이름이라서 상자에 들어가지 않는다"),
      ],
      100,
      40,
    );
    expect(placed.map((p) => p.id)).toEqual([1]);
  });

  it("라벨은 항상 상자 안에 있다(가장자리 점도)", () => {
    for (const [cx, cy] of [
      [8, 8],
      [312, 8],
      [8, 190],
      [312, 190],
    ] as const) {
      const placed = labelPlacement([marker(1, cx, cy, "가장자리")], W, H);
      for (const p of placed) {
        expect(p.left).toBeGreaterThanOrEqual(0);
        expect(p.top).toBeGreaterThanOrEqual(0);
        expect(p.left + p.width).toBeLessThanOrEqual(W);
        expect(p.top + p.height).toBeLessThanOrEqual(H);
      }
    }
  });

  it("글자 폭은 한글 한 글자 12.5dp로 어림한다(글꼴 12, 사람이 정한 값)", () => {
    expect(LABEL_STYLE.fontSize).toBe(12);
    expect(LABEL_STYLE.charWidth).toBe(12.5);
    const [l] = labelPlacement([marker(1, 60, 100, "서울숲")], W, H);
    expect(l!.width).toBeCloseTo(3 * 12.5 + 2 * LABEL_STYLE.padH, 5);
  });

  it("같은 입력에 같은 결과(순수)", () => {
    const ms = [marker(1, 100, 100, "가"), marker(2, 120, 100, "나")];
    expect(labelPlacement(ms, W, H)).toEqual(labelPlacement(ms, W, H));
  });
});
