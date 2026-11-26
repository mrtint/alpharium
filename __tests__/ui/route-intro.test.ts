/**
 * 135 — 지도 면 첫 진입 애니메이션의 시간표 (소유자 결정 2026-11-26).
 *
 * 장소마다: 도착(점) → 그 자리 카드의 사진이 1·2·3장으로 쌓임 → 빨간 점이 경로를 따라 다음 장소로 이동 → 도착 …
 */
import { cameraFor, INTRO, introTimeline } from "../../src/ui/route-intro";

describe("135 introTimeline", () => {
  it("도착 → 사진 쌓기 → 다음 장소로 이동 → 도착 순이다", () => {
    const { frames } = introTimeline([2, 0, 1]);
    expect(frames.map((f) => [f.phase, f.step, f.shown])).toEqual([
      ["stay", 1, 0],
      ["stay", 1, 1],
      ["stay", 1, 2],
      ["move", 1, 0],
      ["stay", 2, 0],
      ["move", 2, 0],
      ["stay", 3, 0],
      ["stay", 3, 1],
    ]);
    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i]!.at).toBeGreaterThan(frames[i - 1]!.at);
    }
    expect(frames[0]!.at).toBe(0);
  });

  it("이동 장면 다음 도착까지가 이동 시간이다(줄이지 않을 때)", () => {
    const { frames } = introTimeline([0, 0]);
    expect(frames[2]!.at - frames[1]!.at).toBe(INTRO.moveMs);
    expect(introTimeline([0, 0]).moveMs).toBe(INTRO.moveMs);
  });

  it("한 장소의 사진은 최대 3장까지만 쌓는다", () => {
    const { frames } = introTimeline([7]);
    expect(frames.map((f) => f.shown)).toEqual([0, 1, 2, 3]);
  });

  it("전체 길이는 상한을 넘지 않는다(장소가 많으면 모든 간격을 줄인다)", () => {
    const many = introTimeline(Array.from({ length: 12 }, () => 3));
    expect(many.doneAt).toBeLessThanOrEqual(INTRO.maxMs);
    expect(many.moveMs).toBeLessThan(INTRO.moveMs);
    expect(introTimeline([1]).fadeAt).toBeLessThan(many.fadeAt);
  });

  it("마지막 장면 뒤 잠깐 머물고 카드가 사라진 뒤에 지도가 원래 크기로 돌아간다(코드 리뷰 — 카드가 장소에서 떨어지지 않게)", () => {
    const t = introTimeline([1, 1]);
    expect(t.fadeAt).toBeGreaterThan(t.frames[t.frames.length - 1]!.at);
    expect(t.returnAt).toBe(t.fadeAt + INTRO.fadeMs);
    expect(t.doneAt).toBe(t.returnAt + INTRO.fadeMs);
  });

  it("cameraFor — 상자 중심 기준으로 확대한 뒤 p가 면 가운데에 오는 이동량", () => {
    const box = { width: 300, height: 186 };
    expect(cameraFor({ x: 150, y: 93 }, box, 1.6)).toEqual({ x: 0, y: 0 });
    const c = cameraFor({ x: 50, y: 40 }, box, 1.6);
    // 화면 = 중심 + t + s·(p − 중심) 이 중심이 된다
    expect(150 + c.x + 1.6 * (50 - 150)).toBeCloseTo(150);
    expect(93 + c.y + 1.6 * (40 - 93)).toBeCloseTo(93);
  });
});
