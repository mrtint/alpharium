import { readFileSync } from "node:fs";
import { join } from "node:path";

import { selectForVision } from "../../src/vision/select";
import type { Photo } from "../../src/signals/types";

/**
 * 고르기의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/contracts/selection.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **004와 정반대로 자른다.**
 *
 * `src/signals/collect.ts`가 `usable.slice(0, limit)`으로 **이른 시각부터** 자르는데,
 * 여기서 그러면 **아침 사진 다섯 장만 읽고 하루를 쓴다.**
 *
 * **004는 「그날 사진이 몇 장인가」를 세고 이 기능은 「하루가 어떠했는가」를 그린다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 시각만 다른 사진을 만든다. `2026-08-20T{hour}:00` */
const at = (hour: number): Photo => ({
  id: `p${hour}`,
  takenAt: new Date(2026, 7, 20, hour, 0, 0),
});

/**
 * 시각이 흩어진 사진 n장. **id가 서로 다르다.**
 *
 * ⚠️ `at(i % 24)`로 만들면 24장을 넘길 때 **id가 겹친다** — 하루에 24장 넘게 찍는 것은
 * 흔하며, 그때 「다섯이 서로 다른가」를 id로 보면 구현이 옳아도 실패한다.
 * 실제로 이 함정을 밟았고, 걸린 것은 구현이 아니라 **시험용 자료**였다.
 */
const spread = (n: number): Photo[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    // 하루(0~23시) 안에 고르게 편다.
    takenAt: new Date(2026, 7, 20, Math.floor((i * 23) / Math.max(1, n - 1)), i % 60, 0),
  }));

const hoursOf = (photos: Photo[]): number[] => photos.map((p) => p.takenAt.getHours());

describe("R1. 5장 이하면 전부 고른다", () => {
  it.each([
    [[]],
    [[9]],
    [[9, 13, 19]],
    [[8, 10, 12, 14, 16]],
  ])("%j → 전부", (hours) => {
    const photos = hours.map(at);
    expect(selectForVision(photos)).toEqual(photos);
  });
});

describe("R2·R3. 5장을 넘으면 균등 분위로 고르고 양 끝을 포함한다", () => {
  it("6장 → 인덱스 0,1,3,4,5 (contracts/selection.md 예시)", () => {
    const photos = [8, 9, 10, 11, 12, 13].map(at);
    expect(hoursOf(selectForVision(photos))).toEqual([8, 9, 11, 12, 13]);
  });

  it("12장 → 인덱스 0,3,6,8,11", () => {
    const photos = [7,8,9,10,11,12,13,14,15,16,17,18].map(at);
    expect(hoursOf(selectForVision(photos))).toEqual([7, 10, 13, 15, 18]);
  });

  // ★ 이것이 「하루를 그린다」의 핵심이다.
  it.each([[6], [7], [10], [12], [30], [200]])(
    "%i장이어도 가장 이른 것과 가장 늦은 것이 들어 있다",
    (n) => {
      const photos = spread(n);
      const selected = selectForVision(photos);

      expect(selected[0]).toBe(photos[0]);
      expect(selected[selected.length - 1]).toBe(photos[n - 1]);
    },
  );

  // ⚠️ 004의 `slice(0, limit)`을 그대로 쓰면 이 검사가 실패한다.
  it("앞에서부터 자르지 않는다 — 004와 다르다 (FR-007a)", () => {
    const photos = spread(20);
    const selected = selectForVision(photos);

    expect(hoursOf(selected)).not.toEqual(hoursOf(photos.slice(0, 5)));
  });
});

describe("R4. 중복을 만들지 않는다", () => {
  it.each([[6], [7], [8], [9], [10], [13], [17], [50], [201]])("%i장에서 다섯이 서로 다르다", (n) => {
    const photos = spread(n);
    const selected = selectForVision(photos);

    expect(selected).toHaveLength(5);
    expect(new Set(selected.map((p) => p.id)).size).toBe(5);
  });
});

describe("R5. 입력 순서(시각 순)를 유지한다", () => {
  it("고른 것이 시각 순이다 — 프롬프트가 「아침에 …, 저녁에 …」로 읽힌다", () => {
    const photos = spread(15);
    const selected = selectForVision(photos);

    const times = selected.map((p) => p.takenAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("R6. 결정적이다", () => {
  it("같은 입력에 같은 답 — 열 번 불러도 같다", () => {
    const photos = spread(17);
    const first = selectForVision(photos).map((p) => p.id);

    for (let i = 0; i < 10; i += 1) {
      expect(selectForVision(photos).map((p) => p.id)).toEqual(first);
    }
  });

  /**
   * **`Date.now()`나 `Math.random()`을 읽으면 같은 하루를 두 번 쓸 때 다른 사진을
   * 본다** — 「신호가 같은데 출력이 다르다」가 되며 006 FR-037a가 경계한 상태다.
   */
  it("시각·난수를 읽지 않는다", () => {
    const source = readFileSync(join(__dirname, "../../src/vision/select.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(code).not.toMatch(/Date\.now|Math\.random|new Date\(\)/);
  });
});

/**
 * ★ S1 — 상한을 밖에서 정하지 못한다.
 *
 * **009가 실측으로 배운 것이다**: `selectableDays(now, count = 3)`으로 고쳐도
 * `Function.length`는 여전히 1이라 검사가 그대로 통과했다. 그러면 부르는 쪽이 범위를
 * 마음대로 늘릴 수 있고 값이 두 곳에 생긴다.
 *
 * **그래서 선언을 직접 읽는다.**
 */
describe("S1. 상한이 한 자리에만 있다", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/vision/select.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("인자가 하나뿐이다", () => {
    expect(selectForVision.length).toBe(1);
  });

  it("선언에 둘째 인자가 없다 — 기본값 인자로 우회하지 못한다", () => {
    const declaration = CODE.match(/export function selectForVision\(([^)]*)\)/);
    expect(declaration).not.toBeNull();

    const params = declaration?.[1] ?? "";
    expect(params).not.toContain(",");
    expect(params).not.toContain("=");
  });

  it("상한을 export 하지 않는다 — 테스트가 상수와 비교하게 되면 검사가 무의미해진다", () => {
    expect(CODE).not.toMatch(/export\s+(?:const|let)\s+\w*(?:LIMIT|MAX|COUNT)/);
  });

  it("상한이 5다 — 값을 직접 적는다", () => {
    const photos = spread(100);
    expect(selectForVision(photos)).toHaveLength(5);
  });
});
