/**
 * 135 — 지도 면 첫 진입 애니메이션의 시간표 (소유자 결정 2026-11-26).
 */
import { INTRO, introTimeline } from "../../src/ui/route-intro";

describe("135 introTimeline", () => {
  it("장소마다 점이 먼저 나오고 사진이 한 장씩 쌓인 뒤 다음 장소로 간다", () => {
    const { frames } = introTimeline([2, 0, 1]);
    expect(frames.map((f) => [f.step, f.shown])).toEqual([
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [3, 0],
      [3, 1],
    ]);
    // 시각은 늘어나기만 한다
    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i]!.at).toBeGreaterThan(frames[i - 1]!.at);
    }
    expect(frames[0]!.at).toBe(0);
  });

  it("한 장소의 사진은 최대 3장까지만 센다", () => {
    const { frames } = introTimeline([7]);
    expect(frames.map((f) => f.shown)).toEqual([0, 1, 2, 3]);
  });

  it("전체 길이는 상한을 넘지 않는다(장소가 많으면 줄인다)", () => {
    const many = introTimeline(Array.from({ length: 12 }, () => 3));
    expect(many.fadeAt + INTRO.fadeMs).toBeLessThanOrEqual(INTRO.maxMs);
    const few = introTimeline([1]);
    expect(few.fadeAt).toBeLessThan(many.fadeAt);
  });

  it("마지막 장면 뒤 잠깐 머물고 사진 더미가 사라진다", () => {
    const t = introTimeline([1, 1]);
    expect(t.fadeAt).toBeGreaterThan(t.frames[t.frames.length - 1]!.at);
    expect(t.doneAt).toBe(t.fadeAt + INTRO.fadeMs);
  });
});
