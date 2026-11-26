/**
 * 135 — 지도 점을 눌렀을 때 폴라로이드 카드에 실을 것 (data-model RouteCard, contracts/written-route.md WR8).
 *
 * 순수 함수다. **자리↔사진 연결은 저장된 `placeIndex`로만 한다** — 시각 창으로 짐작하지 않는다(원칙 V). 일기 사진이 1장 이상인데
 * 모두 `placeIndex` 키가 없으면 135 이전에 쓴 일기라 연결을 모른다(`unlinked`). `null`은 「좌표가 없어 어느 자리에도 들지 않음」이라는
 * 관측이다 — 연결이 있는 일기다. 사진이 0장이면 옛·새 일기 모두 「남은 사진이 없다」가 사실이라 `empty`다.
 */

/** 카드가 다루는 일기 사진 — `DiaryEntry.photos[]`의 항목과 같은 모양(필요한 칸만) */
export type RoutePhoto = {
  photoId: string;
  takenAt: Date;
  resizedPath: string;
  placeIndex?: number | null;
};

export type RouteCard<P extends RoutePhoto = RoutePhoto> =
  { kind: "photos"; photos: P[] } | { kind: "empty" } | { kind: "unlinked" };

/**
 * @param photos 일기 사진(`entry.photos`)
 * @param numbers 누른 점의 자리 번호들(1부터 — 합친 점이면 여럿)
 */
export function routeCardFor<P extends RoutePhoto>(
  photos: readonly P[] | undefined,
  numbers: readonly number[],
): RouteCard<P> {
  if (photos === undefined || photos.length === 0) return { kind: "empty" };
  if (photos.every((p) => !("placeIndex" in p) || p.placeIndex === undefined)) {
    return { kind: "unlinked" };
  }
  const wanted = new Set(numbers.map((n) => n - 1));
  const hits = photos
    .filter((p) => typeof p.placeIndex === "number" && wanted.has(p.placeIndex))
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  return hits.length === 0 ? { kind: "empty" } : { kind: "photos", photos: hits };
}
