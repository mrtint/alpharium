/**
 * 115 — 하단 바의 높이·아래 여백이 아래 안전 영역(인셋)을 더한다 (계약 B1).
 *
 * 글은 위 64 안에 그대로 두고 늘어난 자리는 면만 채운다. 인셋 0이면 종전(64·10)과 같다.
 */
import { barMetrics } from "../../src/ui/bar-metrics";

describe("115 B1 — barMetrics", () => {
  it("인셋 0이면 종전 값(최소 높이 64, 아래 여백 10)이다", () => {
    expect(barMetrics(0)).toEqual({ minHeight: 64, paddingBottom: 10 });
  });

  it("인셋 34(홈 표시줄)면 둘 다 34가 더해진다", () => {
    expect(barMetrics(34)).toEqual({ minHeight: 98, paddingBottom: 44 });
  });

  it("음수·NaN·무한대는 0으로 본다 — 바가 줄거나 깨지지 않는다", () => {
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(barMetrics(bad)).toEqual({ minHeight: 64, paddingBottom: 10 });
    }
  });
});
