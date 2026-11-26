/**
 * 135 — 지도 점 → 폴라로이드 카드 내용 (data-model RouteCard, contracts/written-route.md WR8).
 */
import { routeCardFor, type RoutePhoto } from "../../src/app/route-photos";

const photo = (photoId: string, hour: number, placeIndex?: number | null): RoutePhoto => ({
  photoId,
  takenAt: new Date(2026, 10, 26, hour),
  resizedPath: `/r/${photoId}.jpg`,
  ...(placeIndex !== undefined ? { placeIndex } : {}),
});

describe("135 routeCardFor", () => {
  it("그 자리 사진을 시각순으로 낸다(번호는 1부터, 순번은 0부터)", () => {
    const card = routeCardFor([photo("b", 11, 0), photo("a", 9, 0), photo("c", 13, 1)], [1]);
    expect(card).toEqual({ kind: "photos", photos: [photo("a", 9, 0), photo("b", 11, 0)] });
  });

  it("합친 점은 여러 자리 사진을 시각순으로 함께 낸다", () => {
    const card = routeCardFor([photo("x", 18, 3), photo("a", 9, 0), photo("c", 13, 1)], [1, 4]);
    expect(card.kind === "photos" && card.photos.map((p) => p.photoId)).toEqual(["a", "x"]);
  });

  it("연결은 있으나 그 자리에 사진이 없으면 empty", () => {
    expect(routeCardFor([photo("a", 9, 0), photo("n", 10, null)], [2])).toEqual({ kind: "empty" });
  });

  it("사진이 모두 좌표 없음(null)이어도 옛 일기가 아니다 — empty", () => {
    expect(routeCardFor([photo("n", 10, null)], [1])).toEqual({ kind: "empty" });
  });

  it("사진이 1장 이상이고 모두 키가 없으면 unlinked(옛 일기) — 시각으로 짐작하지 않는다", () => {
    expect(routeCardFor([photo("a", 9), photo("b", 13)], [1])).toEqual({ kind: "unlinked" });
  });

  it("사진이 0장이면 언제나 empty", () => {
    expect(routeCardFor([], [1])).toEqual({ kind: "empty" });
    expect(routeCardFor(undefined, [1])).toEqual({ kind: "empty" });
  });
});
