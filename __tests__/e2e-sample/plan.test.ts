import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { CatalogPhoto } from "../../scripts/e2e-sample/catalog";
import { DAYS, PHOTO_TAGS, SITUATIONS, situationOf } from "../../scripts/e2e-sample/manifest";
import { fingerprint, planSample, probeEnv } from "../../scripts/e2e-sample/plan";

/**
 * 070 — 계획(순수) (contracts/sample-seeding.md P-1~P-6).
 *
 * 카탈로그는 가짜 목록이다. 진짜 photos.json 없이도 계획 규칙을 본다.
 */

function fakeCatalog(shaSeed = "a"): CatalogPhoto[] {
  const list: CatalogPhoto[] = [];
  PHOTO_TAGS.forEach((tag) => {
    for (let i = 0; i < 5; i += 1) {
      list.push({
        file: `commons-${tag}-${i}.jpg`,
        url: `https://upload.wikimedia.org/x/${tag}${i}.jpg`,
        sha256: shaSeed.repeat(64),
        license: "CC0",
        sourcePage: `https://commons.wikimedia.org/wiki/File:${tag}${i}.jpg`,
        checkedOn: "2026-10-10",
        tags: [tag],
        widthPx: 960,
      });
    }
  });
  return list;
}

const NOW = new Date(2026, 9, 10, 14, 0, 0); // 로컬 2026-10-10 14:00

describe("planSample (P-1~P-3)", () => {
  const items = planSample(fakeCatalog(), NOW);

  it("P-1: 슬롯 수만큼 항목이 나오고 같은 입력이면 같은 출력이다", () => {
    const expected = DAYS.reduce((sum, d) => sum + situationOf(d.situation).slots.length, 0);
    expect(items).toHaveLength(expected);
    expect(JSON.stringify(planSample(fakeCatalog(), NOW))).toBe(JSON.stringify(items));
  });

  it("P-1: 날짜는 now 기준 오프셋 일 전이고 시각은 슬롯 시각이다", () => {
    const first = items.find((i) => i.offset === 1)!;
    expect(first.day).toBe("2026-10-09");
    const commute = situationOf("commute").slots[0];
    expect(first.takenAt.getHours()).toBe(Number(commute.time.slice(0, 2)));
    expect(first.takenAt.getMinutes()).toBe(Number(commute.time.slice(3)));
    expect(first.takenAt.getDate()).toBe(9);

    const far = items.find((i) => i.offset === 26)!;
    expect(far.day).toBe("2026-09-14");
  });

  it("P-1: 오늘(오프셋 0)에는 항목이 없다", () => {
    expect(items.some((i) => i.offset === 0)).toBe(false);
    expect(items.every((i) => i.offset >= 1 && i.offset <= 30)).toBe(true);
  });

  it("P-1: 기기 파일 이름은 s30-<오프셋>-<번호>.jpg이고 겹치지 않는다", () => {
    const names = items.map((i) => i.deviceName);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^s30-\d{2}-\d{2}\.jpg$/);
  });

  it("P-2: 슬롯 태그에 맞는 사진 파일을 고른다 (결정적, 태그 안에서 돌린다)", () => {
    const catalog = fakeCatalog();
    for (const item of items) {
      const photo = catalog.find((p) => p.file === item.catalogFile)!;
      expect(photo.tags).toContain(item.tag);
    }
    const foodFiles = new Set(items.filter((i) => i.tag === "food").map((i) => i.catalogFile));
    expect(foodFiles.size).toBeGreaterThan(1);
  });

  it("P-3: 방문 안 좌표 흔들림은 40m 이내이고 좌표 없는 슬롯은 null이다", () => {
    const metersBetween = (
      a: { latitude: number; longitude: number },
      b: { latitude: number; longitude: number },
    ) => {
      const dLat = (a.latitude - b.latitude) * 111_320;
      const dLon = (a.longitude - b.longitude) * 111_320 * Math.cos((a.latitude * Math.PI) / 180);
      return Math.hypot(dLat, dLon);
    };
    // 같은 날 같은 군집의 연속 슬롯끼리 서로 80m(=40+40)를 넘지 않는다
    for (const d of DAYS) {
      if (d.situation === "walking") continue;
      const day = items.filter((i) => i.offset === d.offset && i.coordinate !== null);
      for (let a = 0; a < day.length; a += 1) {
        for (let b = a + 1; b < day.length; b += 1) {
          if (day[a].place === day[b].place) {
            expect(metersBetween(day[a].coordinate!, day[b].coordinate!)).toBeLessThanOrEqual(80);
          }
        }
      }
    }
    const noGps = items.filter((i) => i.offset === 7);
    expect(noGps.length).toBe(4);
    expect(noGps.every((i) => i.coordinate === null)).toBe(true);
  });

  it("P-3: 걸어 다닌 날은 연이은 사진이 150m씩 떨어진다", () => {
    const walk = items.filter((i) => i.offset === 12);
    expect(walk).toHaveLength(5);
    for (let i = 1; i < walk.length; i += 1) {
      const dLat = (walk[i].coordinate!.latitude - walk[i - 1].coordinate!.latitude) * 111_320;
      expect(Math.abs(dLat - 150)).toBeLessThan(1);
    }
  });

  it("카탈로그에 필요한 태그가 없으면 던진다 (조용히 다른 사진을 쓰지 않는다)", () => {
    const withoutFood = fakeCatalog().filter((p) => !p.tags.includes("food"));
    expect(() => planSample(withoutFood, NOW)).toThrow(/food/);
  });
});

describe("fingerprint (P-4)", () => {
  const base = planSample(fakeCatalog(), NOW);

  it("16 hex이고 같은 입력이면 같다", () => {
    const fp = fingerprint(base, fakeCatalog());
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprint(planSample(fakeCatalog(), NOW), fakeCatalog())).toBe(fp);
  });

  it("오늘 날짜에는 의존하지 않는다", () => {
    const later = new Date(2026, 9, 11, 9, 0, 0);
    expect(fingerprint(planSample(fakeCatalog(), later), fakeCatalog())).toBe(
      fingerprint(base, fakeCatalog()),
    );
  });

  it("사진 sha가 바뀌면 달라진다", () => {
    expect(fingerprint(planSample(fakeCatalog("b"), NOW), fakeCatalog("b"))).not.toBe(
      fingerprint(base, fakeCatalog()),
    );
  });

  it("항목이 하나 달라지면 달라진다", () => {
    const changed = base.map((item, i) =>
      i === 3 ? { ...item, folder: "Download" as const } : item,
    );
    expect(fingerprint(changed, fakeCatalog())).not.toBe(fingerprint(base, fakeCatalog()));
  });
});

describe("probeEnv (P-5)", () => {
  it("대표 날 여덟 곳의 P0~P7 키를 만든다 (DATE·BACK·PHOTOS·PLACES)", () => {
    const env = probeEnv(NOW);
    const keys = Object.keys(env).sort();
    const expected = Array.from({ length: 8 }, (_, n) =>
      ["DATE", "BACK", "PHOTOS", "PLACES"].map((k) => `P${n}_${k}`),
    )
      .flat()
      .sort();
    expect(keys).toEqual(expected);
  });

  it("값은 표에서 온다 — 사진 수·장소 수는 문자열 숫자", () => {
    const env = probeEnv(NOW);
    const probes = DAYS.filter((d) => d.probe === true).sort((a, b) => a.offset - b.offset);
    probes.forEach((d, n) => {
      const sit = situationOf(d.situation);
      expect(env[`P${n}_PHOTOS`]).toBe(String(sit.slots.length));
      expect(env[`P${n}_PLACES`]).toBe(String(sit.expectPlaces));
    });
  });

  it("값에 공백·따옴표가 없다 (maestro -e 인자 안전)", () => {
    for (const value of Object.values(probeEnv(NOW))) expect(value).toMatch(/^[0-9-]+$/);
  });

  it("BACK은 오늘의 달과 그 날의 달 차이고 1년 내내 0 또는 1이다", () => {
    const env = probeEnv(NOW);
    const probes = DAYS.filter((d) => d.probe === true).sort((a, b) => a.offset - b.offset);
    // 10/10 기준: 오프셋 26은 9/14 → 1, 오프셋 3은 10/7 → 0
    expect(env[`P${probes.findIndex((d) => d.offset === 26)}_BACK`]).toBe("1");
    expect(env[`P${probes.findIndex((d) => d.offset === 3)}_BACK`]).toBe("0");

    // 대표 날의 가장 큰 오프셋이 27 이하이면 어느 날 실행해도 BACK은 0 또는 1이다(가장 짧은 달 28일 > 오프셋 − 1). 1년 내내 센다.
    for (let day = 0; day < 366; day += 1) {
      const now = new Date(2026, 0, 1 + day, 10, 0, 0);
      for (const value of Object.entries(probeEnv(now)).filter(([k]) => k.endsWith("_BACK"))) {
        expect(["0", "1"]).toContain(value[1]);
      }
    }
  });
});

describe("P-6: plan.ts는 파일·기기에 닿지 않는다", () => {
  it("fs·child_process·adb를 import하지 않는다", () => {
    const source = readFileSync(join(process.cwd(), "scripts", "e2e-sample", "plan.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/from\s+["']node:(fs|child_process|os)["']/);
    expect(source).not.toMatch(/\badb\b/);
    expect(source).not.toMatch(/selectableDays/);
  });

  it("하루 문자열은 day-boundary의 dayOf로 만든다 (자체 하루 계산 금지)", () => {
    const source = readFileSync(join(process.cwd(), "scripts", "e2e-sample", "plan.ts"), "utf8");
    expect(source).toContain("dayOf");
    expect(source).not.toMatch(/getHours\(\)\s*[-+]/);
  });
});

it("상황 열둘이 표에 있다", () => {
  expect(SITUATIONS).toHaveLength(12);
});
