/**
 * 135 — 폴라로이드 카드 자리 (research R6).
 */
import { cardPlacement } from "../../src/ui/card-placement";

const BOX = { width: 320, height: 198 };
const CARD = { width: 132, height: 116 };
const overlaps = (
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

describe("135 cardPlacement", () => {
  it("들어가면 점의 오른쪽 위", () => {
    const at = cardPlacement({ cx: 60, cy: 150, halfW: 11 }, CARD, BOX);
    expect(at.left).toBeGreaterThanOrEqual(60 + 11);
    expect(at.top + CARD.height).toBeLessThanOrEqual(150 - 11);
  });

  it("오른쪽이 모자라면 왼쪽 위", () => {
    const at = cardPlacement({ cx: 290, cy: 150, halfW: 11 }, CARD, BOX);
    expect(at.left + CARD.width).toBeLessThanOrEqual(290 - 11);
  });

  it("위가 모자라면 아래로", () => {
    const at = cardPlacement({ cx: 60, cy: 30, halfW: 11 }, CARD, BOX);
    expect(at.top).toBeGreaterThanOrEqual(30 + 11);
  });

  it("지도 높이 가운데 띠의 점은 옆에 둔다 — 점을 가리지 않는다(코드 리뷰)", () => {
    for (const cx of [60, 160, 290]) {
      const at = cardPlacement({ cx, cy: 99, halfW: 11 }, CARD, BOX);
      expect(
        overlaps({ ...at, ...CARD }, { left: cx - 11, top: 99 - 11, width: 22, height: 22 }),
      ).toBe(false);
    }
  });

  it("어디에 두어도 상자 안이고 가능하면 점을 가리지 않는다", () => {
    for (const [cx, cy] of [
      [10, 10],
      [310, 10],
      [10, 190],
      [310, 190],
      [160, 99],
    ] as const) {
      const at = cardPlacement({ cx, cy, halfW: 11 }, CARD, BOX);
      expect(at.left).toBeGreaterThanOrEqual(0);
      expect(at.top).toBeGreaterThanOrEqual(0);
      expect(at.left + CARD.width).toBeLessThanOrEqual(BOX.width);
      expect(at.top + CARD.height).toBeLessThanOrEqual(BOX.height);
      expect(
        overlaps({ ...at, ...CARD }, { left: cx - 11, top: cy - 11, width: 22, height: 22 }),
      ).toBe(false);
    }
  });
});
