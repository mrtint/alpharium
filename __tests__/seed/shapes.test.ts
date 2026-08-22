/**
 * 하루 모양 — 004가 가른 갈래와 대응한다 (FR-008·008a).
 *
 * 계약: specs/010-synthetic-day-fixture/data-model.md 「하루 모양」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **에이전트가 부르므로 이름이 곧 계약이다** (명확화 Q2).
 *
 * 매번 사진마다 값을 지어내게 하면 에이전트가 검증할 때마다 다른 하루를 만들고,
 * 그러면 두 번의 검증을 비교할 수 없다. 그래서 이름 목록이 이 테스트에 박혀 있고,
 * **말없이 바뀌면 실패한다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayBounds } from "../../src/config/day-boundary";
import { SAME_PLACE_METERS, tracePlaces } from "../../src/signals/places";
import { shapeNamed, shapeNames } from "../../scripts/seed/shapes";

const DAY = "2026-08-20";

/** 004의 자리 묶기를 그대로 써서 「이 모양이 몇 곳으로 세어지는가」를 본다 */
function visitCountOf(
  photos: { takenAtMs: number; location: { latitude: number; longitude: number } | null }[],
) {
  const coords = photos
    .filter((p) => p.location !== null)
    .map((p) => ({ ...p.location!, takenAtMs: p.takenAtMs }));

  return tracePlaces(coords).visitCount;
}

describe("모양의 이름이 계약이다 (FR-008)", () => {
  /**
   * **이 목록이 바뀌면 에이전트의 호출이 깨진다.** 늘리는 것은 괜찮지만 이름을
   * 바꾸거나 지우는 것은 계약 위반이며, 여기서 걸린다.
   */
  it("정해 둔 여섯 모양이 있다", () => {
    expect(shapeNames().sort()).toEqual(
      ["empty", "one-place", "over-limit", "partial-location", "rich", "spread-day"].sort(),
    );
  });

  it("없는 이름은 null이다 — 던지지 않는다", () => {
    expect(shapeNamed("없는것")).toBeNull();
  });

  it("모든 모양이 사람이 읽을 설명을 가진다", () => {
    for (const name of shapeNames()) {
      expect(shapeNamed(name)!.description.length).toBeGreaterThan(0);
    }
  });
});

describe("모든 모양이 그 하루 안에 심는다", () => {
  const { startMs, endMs } = dayBounds(DAY);

  it.each(shapeNames())("%s의 사진이 전부 [startMs, endMs) 안이다", (name) => {
    for (const photo of shapeNamed(name)!.build(DAY)) {
      expect(photo.takenAtMs).toBeGreaterThanOrEqual(startMs);
      expect(photo.takenAtMs).toBeLessThan(endMs);
    }
  });

  /** 004가 찍힌 시각 순으로 다룬다 — 심는 것도 그 순서로 두면 읽기 쉽다 */
  it.each(shapeNames())("%s의 사진이 시각 순이다", (name) => {
    const times = shapeNamed(name)!
      .build(DAY)
      .map((p) => p.takenAtMs);

    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  /** 좌표는 (0,0)이 될 수 없다 — 004의 isUsableCoordinate가 버린다 */
  it.each(shapeNames())("%s에 (0,0) 좌표가 없다", (name) => {
    for (const photo of shapeNamed(name)!.build(DAY)) {
      if (photo.location === null) continue;
      expect(photo.location.latitude === 0 && photo.location.longitude === 0).toBe(false);
    }
  });
});

describe("rich — 사진이 있는 하루 (US1, SC-002)", () => {
  const photos = shapeNamed("rich")!.build(DAY);

  it("사진이 3장이다", () => {
    expect(photos).toHaveLength(3);
  });

  it("모두 좌표를 가진다", () => {
    expect(photos.every((p) => p.location !== null)).toBe(true);
  });

  /**
   * **004의 `tracePlaces()`로 실제로 세어 본다.**
   *
   * 「좌표가 다르다」와 「004가 2곳으로 센다」는 다르다 — `SAME_PLACE_METERS`(100m)
   * 안이면 한 곳이다. 우리가 만든 좌표가 그 판정에서 2곳이 되는지 **앱의 코드로**
   * 확인한다.
   */
  it("자리가 2곳으로 세어진다", () => {
    expect(visitCountOf(photos)).toBe(2);
  });
});

describe("empty — 사진이 0장인 하루 (US2, SC-003)", () => {
  /**
   * **빈 배열이 정상이다.** 「사진을 물어봤고 0장이었다」(`none`)를 만드는 길이며,
   * 007이 미확인으로 남기고 009가 우연히 본 갈래다.
   */
  it("사진이 하나도 없다", () => {
    expect(shapeNamed("empty")!.build(DAY)).toHaveLength(0);
  });
});

describe("partial-location — 좌표가 일부에만 (US2, SC-004)", () => {
  const photos = shapeNamed("partial-location")!.build(DAY);

  it("사진이 5장이다", () => {
    expect(photos).toHaveLength(5);
  });

  /**
   * **이 갈래가 확인하려는 것**: 004의 `PhotoPlaces`가 `photosConsidered`(5)와
   * `photosWithLocation`(2)를 함께 담아, 일기가 「5장 전부를 봤다」고 말하지 않는 것.
   */
  it("그중 2장에만 좌표가 있다", () => {
    expect(photos.filter((p) => p.location !== null)).toHaveLength(2);
  });
});

describe("one-place — 한 곳에만 머문 하루 (US2)", () => {
  const photos = shapeNamed("one-place")!.build(DAY);

  it("사진이 4장이고 모두 좌표를 가진다", () => {
    expect(photos).toHaveLength(4);
    expect(photos.every((p) => p.location !== null)).toBe(true);
  });

  /**
   * **`SAME_PLACE_METERS`(100m)가 실기기에서 도는지 확인하는 모양이다.**
   *
   * 004는 그 값을 「짐작이며 실측이 아니다」로 적어 두었다. 이 모양으로 심으면
   * 「집 사진 여럿이 한 자리로 세어지는가」를 실기기에서 볼 수 있다.
   */
  it("자리가 1곳으로 세어진다", () => {
    expect(visitCountOf(photos)).toBe(1);
  });

  it("좌표가 서로 다르지만 100m 안이다", () => {
    const unique = new Set(photos.map((p) => `${p.location!.latitude},${p.location!.longitude}`));

    // 전부 같은 좌표로 두면 「100m 판정」이 아니라 「같은 값」을 보는 것이 된다
    expect(unique.size).toBeGreaterThan(1);
    expect(SAME_PLACE_METERS).toBe(100);
  });
});

describe("over-limit — 상한을 넘는 하루 (US2, SC-005)", () => {
  const photos = shapeNamed("over-limit")!.build(DAY);

  /**
   * **004의 `DEFAULT_PHOTO_LIMIT`(200)를 이 기능이 다시 정하지 않는다.**
   *
   * 앱이 `limit + 1`을 물어 상한 초과를 안다(FR-014a). 201장이면 잘린 것으로
   * 판정되며, 그 하루의 일기는 사진 수를 단언하지 않아야 한다(FR-014d).
   */
  it("상한(200)을 넘는다", () => {
    expect(photos.length).toBeGreaterThan(200);
  });

  it("서로 다른 시각을 가진다 — 같은 밀리초로 뭉치지 않는다", () => {
    expect(new Set(photos.map((p) => p.takenAtMs)).size).toBe(photos.length);
  });
});

describe("spread-day — 5장을 넘어 하루에 흩어진 하루 (011 D5, FR-007a)", () => {
  const photos = shapeNamed("spread-day")!.build(DAY);

  /**
   * **011의 균일 선택을 실기기에서 보려면 5장을 넘어야 한다.**
   *
   * 5장 이하는 `selectForVision()`의 R1이 전부 돌려주므로 **고르는 일 자체가
   * 일어나지 않는다** — 그러면 「앞에서부터 잘랐는지」를 구분할 수 없다.
   * 기존 모양 중 가장 큰 `partial-location`이 정확히 5장이라 쓸 수 없고,
   * `over-limit`(201장)은 010 실측에서 색인이 밀려 실패했다(322초/150장).
   */
  it("사진이 12장이다 — 5장 상한을 넘는다", () => {
    expect(photos).toHaveLength(12);
  });

  /**
   * **아침과 저녁이 둘 다 있어야 D5가 성립한다.**
   *
   * 앞에서부터 다섯 장을 자르면 아침만 남는다 — 그것이 004의 `slice(0, limit)`이며
   * 011이 정반대로 가는 이유다. 전부 아침에 몰려 있으면 두 방식이 같은 답을 내어
   * **검증이 아무것도 가르지 못한다.**
   */
  it("하루의 이른 때와 늦은 때에 걸쳐 있다", () => {
    const { startMs, endMs } = dayBounds(DAY);
    const span = endMs - startMs;
    const offsets = photos.map((p) => p.takenAtMs - startMs);

    // 첫 장은 하루의 앞 1/4 안, 마지막 장은 뒤 1/4 안
    expect(offsets[0]).toBeLessThan(span / 4);
    expect(offsets[offsets.length - 1]).toBeGreaterThan((span * 3) / 4);
  });

  /**
   * **균일 선택이 고를 다섯 장이 시각으로 구분되는지 미리 본다.**
   *
   * 계약(selection.md R2)이 n=12, limit=5에서 인덱스 `0,3,6,8,11`을 고른다고
   * 못 박았다. 그 다섯이 서로 다른 시각이어야 일기에서 「아침 것과 저녁 것이
   * 둘 다 나왔는가」를 사람이 읽어 가를 수 있다.
   */
  it("계약이 고를 다섯 장이 서로 다른 시각이다", () => {
    const chosen = [0, 3, 6, 8, 11].map((i) => photos[i].takenAtMs);

    expect(new Set(chosen).size).toBe(5);
    expect([...chosen].sort((a, b) => a - b)).toEqual(chosen);
  });

  it("서로 다른 시각을 가진다 — 같은 밀리초로 뭉치지 않는다", () => {
    expect(new Set(photos.map((p) => p.takenAtMs)).size).toBe(photos.length);
  });
});
