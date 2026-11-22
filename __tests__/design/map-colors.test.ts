/**
 * 126 — 동선 지도 색의 대비 (research R8). 지도 위 라벨은 `text` 글자에 `mapLand` 후광이라 그 쌍이 본문 기준을 넘어야 한다.
 * 정본의 9색 대비 표(`contrast`)는 아홉 역할만 다루므로 지도 색은 여기서 따로 본다.
 */
import { loadTokens } from "./helpers";

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("126 지도 색 대비", () => {
  const t = loadTokens();
  it("라벨 글자(text)는 지도 바탕(mapLand) 위에서 라이트·다크 모두 4.5:1 이상이다", () => {
    expect(ratio(t.color.items.text.light, t.mapColor.items.mapLand.light)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(ratio(t.color.items.text.dark, t.mapColor.items.mapLand.dark)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
