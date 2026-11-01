/**
 * 087 — `scripts/ios-seed/` 순수 부분: 계획 만들기·인자 읽기·lldb 스크립트.
 * 기기·lldb·네트워크는 부르지 않는다(그것들은 `ios-seed.mts`가 이 모듈 밖에서 다룬다).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildLldbScript,
  buildPlan,
  buildRangePlan,
  daysAround,
  parseArgs,
} from "../../scripts/ios-seed/plan";

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("buildPlan", () => {
  const photos = ["/p/a.jpg", "/p/b.jpg", "/p/c.jpg", "/p/d.jpg"];

  it("사진 수만큼 자산을 만들고 컨테이너 상대 경로를 쓴다", () => {
    const plan = buildPlan({
      runId: "r1",
      day: "2026-10-17",
      count: 3,
      photos,
      tz: "+09:00",
      gps: true,
    });
    expect(plan.plan.assets).toHaveLength(3);
    expect(plan.plan.statusPath).toBe("Documents/seed-ios/r1/status.json");
    for (const a of plan.plan.assets)
      expect(a.path.startsWith("Documents/seed-ios/r1/photos/")).toBe(true);
    expect(plan.uploads).toHaveLength(3);
    expect(plan.uploads[0]).toEqual({ from: "/p/a.jpg", to: plan.plan.assets[0].path });
  });

  it("시각은 그 날 08:00~21:00에 오름차순으로 퍼지고 시간대를 단다", () => {
    const { plan } = buildPlan({
      runId: "r1",
      day: "2026-10-17",
      count: 5,
      photos,
      tz: "+09:00",
      gps: false,
    });
    const times = plan.assets.map((a) => a.takenAt);
    expect(times[0]).toBe("2026-10-17T08:00:00+09:00");
    expect(times[4]).toBe("2026-10-17T21:00:00+09:00");
    expect([...times].sort()).toEqual(times);
    expect(new Set(times).size).toBe(5);
  });

  it("한 장이면 08:00 하나", () => {
    const { plan } = buildPlan({
      runId: "r1",
      day: "2026-10-17",
      count: 1,
      photos,
      tz: "+09:00",
      gps: false,
    });
    expect(plan.assets.map((a) => a.takenAt)).toEqual(["2026-10-17T08:00:00+09:00"]);
  });

  it("gps가 꺼지면 좌표를 싣지 않고 켜지면 둘 다 싣는다", () => {
    const off = buildPlan({
      runId: "r1",
      day: "2026-10-17",
      count: 2,
      photos,
      tz: "+09:00",
      gps: false,
    }).plan;
    for (const a of off.assets) expect(Object.keys(a)).not.toContain("lat");
    const on = buildPlan({
      runId: "r1",
      day: "2026-10-17",
      count: 2,
      photos,
      tz: "+09:00",
      gps: true,
    }).plan;
    for (const a of on.assets) {
      expect(typeof a.lat).toBe("number");
      expect(typeof a.lon).toBe("number");
    }
  });

  it("사진이 모자라면 돌려 쓰되 올리는 이름은 겹치지 않는다", () => {
    const r = buildPlan({
      runId: "r1",
      day: "2026-10-17",
      count: 6,
      photos: ["/p/a.jpg", "/p/b.jpg"],
      tz: "+09:00",
      gps: false,
    });
    expect(r.plan.assets).toHaveLength(6);
    expect(new Set(r.plan.assets.map((a) => a.path)).size).toBe(6);
    expect(r.uploads.map((u) => u.from)).toEqual([
      "/p/a.jpg",
      "/p/b.jpg",
      "/p/a.jpg",
      "/p/b.jpg",
      "/p/a.jpg",
      "/p/b.jpg",
    ]);
  });

  it("폴더 이름으로 못 쓰는 runId를 거부한다", () => {
    expect(() =>
      buildPlan({ runId: "../x", day: "2026-10-17", count: 1, photos, tz: "+09:00", gps: false }),
    ).toThrow(/runId/);
  });

  it("날짜 모양·장수·사진 없음을 거부한다", () => {
    expect(() =>
      buildPlan({ runId: "r1", day: "10-17", count: 1, photos, tz: "+09:00", gps: false }),
    ).toThrow(/day/);
    expect(() =>
      buildPlan({ runId: "r1", day: "2026-10-17", count: 0, photos, tz: "+09:00", gps: false }),
    ).toThrow(/count/);
    expect(() =>
      buildPlan({ runId: "r1", day: "2026-10-17", count: 1, photos: [], tz: "+09:00", gps: false }),
    ).toThrow(/photos/);
  });
});

describe("daysAround — 요청 당일 앞뒤 N일", () => {
  it("기준일 포함 2N+1일을 오래된 날부터 준다", () => {
    const days = daysAround(new Date(2026, 10, 2, 15, 0), 15);
    expect(days).toHaveLength(31);
    expect(days[0]).toBe("2026-10-18");
    expect(days[15]).toBe("2026-11-02");
    expect(days[30]).toBe("2026-11-17");
  });

  it("달·해 경계를 넘어도 기기 로컬 날짜로 센다", () => {
    expect(daysAround(new Date(2026, 11, 31, 23, 59), 1)).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
    ]);
  });

  it("N이 0이면 오늘 하루, 음수·소수는 거부한다", () => {
    expect(daysAround(new Date(2026, 10, 2), 0)).toEqual(["2026-11-02"]);
    expect(() => daysAround(new Date(2026, 10, 2), -1)).toThrow(/range/);
    expect(() => daysAround(new Date(2026, 10, 2), 1.5)).toThrow(/range/);
  });
});

describe("buildRangePlan", () => {
  const photos = ["/p/a.jpg", "/p/b.jpg", "/p/c.jpg"];
  const days = ["2026-11-01", "2026-11-02", "2026-11-03"];

  it("날마다 count장을 한 계획에 담고 올리는 이름이 하나도 겹치지 않는다", () => {
    const { plan, uploads } = buildRangePlan({
      runId: "r1",
      days,
      count: 2,
      photos,
      tz: "+09:00",
      gps: true,
    });
    expect(plan.assets).toHaveLength(6);
    expect(new Set(plan.assets.map((a) => a.path)).size).toBe(6);
    expect(plan.assets.map((a) => a.takenAt.slice(0, 10))).toEqual([
      "2026-11-01",
      "2026-11-01",
      "2026-11-02",
      "2026-11-02",
      "2026-11-03",
      "2026-11-03",
    ]);
    expect(uploads.map((u) => u.to)).toEqual(plan.assets.map((a) => a.path));
  });

  it("원본 사진은 날을 넘어 이어서 돌려 써 날마다 다른 사진이 나온다", () => {
    const { uploads } = buildRangePlan({
      runId: "r1",
      days,
      count: 2,
      photos,
      tz: "+09:00",
      gps: false,
    });
    expect(uploads.map((u) => u.from)).toEqual([
      "/p/a.jpg",
      "/p/b.jpg",
      "/p/c.jpg",
      "/p/a.jpg",
      "/p/b.jpg",
      "/p/c.jpg",
    ]);
  });

  it("날 하나짜리는 buildPlan과 같은 자산을 만든다", () => {
    const one = buildPlan({
      runId: "r1",
      day: "2026-11-02",
      count: 3,
      photos,
      tz: "+09:00",
      gps: true,
    });
    const range = buildRangePlan({
      runId: "r1",
      days: ["2026-11-02"],
      count: 3,
      photos,
      tz: "+09:00",
      gps: true,
    });
    expect(range.plan.assets.map(({ takenAt, lat, lon }) => ({ takenAt, lat, lon }))).toEqual(
      one.plan.assets.map(({ takenAt, lat, lon }) => ({ takenAt, lat, lon })),
    );
  });

  it("날이 없거나 모양이 틀리면 거부한다", () => {
    const base = { runId: "r1", count: 1, photos, tz: "+09:00", gps: false };
    expect(() => buildRangePlan({ ...base, days: [] })).toThrow(/days/);
    expect(() => buildRangePlan({ ...base, days: ["11/02"] })).toThrow(/YYYY-MM-DD/);
  });
});

describe("parseArgs", () => {
  it("--range N은 --day 없이 쓰고 둘을 함께 주면 거부한다", () => {
    const a = parseArgs(["--range", "15", "--count", "4", "--photos", "/x"]);
    expect(a.range).toBe(15);
    expect(a.day).toBeUndefined();
    expect(() => parseArgs(["--range", "15", "--day", "2026-11-02", "--count", "4"])).toThrow(
      /함께/,
    );
    expect(() => parseArgs(["--range", "x", "--count", "4"])).toThrow(/range/);
  });

  it("값 옵션과 불리언 옵션을 읽는다", () => {
    expect(
      parseArgs(["--day", "2026-10-17", "--count", "5", "--photos", "/x", "--no-gps"]),
    ).toEqual({
      day: "2026-10-17",
      count: 5,
      photos: "/x",
      device: undefined,
      gps: false,
    });
  });

  it("기본값은 gps 켬이고 모르는 옵션은 던진다", () => {
    expect(parseArgs(["--day", "2026-10-17", "--count", "1"]).gps).toBe(true);
    expect(() => parseArgs(["--day", "2026-10-17", "--count", "1", "--bogus"])).toThrow(/--bogus/);
    expect(() => parseArgs(["--count", "1"])).toThrow(/--day/);
  });
});

describe("buildLldbScript", () => {
  const script = buildLldbScript({
    device: "DEV-1",
    pid: 123,
    planPath: "Documents/seed-ios/plan.json",
    dylibPath: "Documents/seed-ios/PocketSeed.dylib",
    attachWaitSec: 280,
  });

  it("붙은 뒤 멈출 때까지 기다리고, 오류가 나도 이어 가며, 마지막에 프로세스를 다시 돌린다", () => {
    expect(script).toContain("device select DEV-1");
    expect(script).toContain("device process attach --pid 123");
    expect(script).toContain("range(280)");
    expect(script).toContain("settings set interpreter.stop-command-source-on-error false");
    const lines = script.trim().split("\n");
    expect(lines[lines.length - 1]).toContain("Continue()");
    expect(script.indexOf("dlopen")).toBeLessThan(script.indexOf("PocketSeedStart"));
  });

  it("컨테이너 상대 경로를 NSHomeDirectory로 풀어 dlopen한다", () => {
    expect(script).toContain(
      'NSHomeDirectory() stringByAppendingPathComponent:@"Documents/seed-ios/PocketSeed.dylib"',
    );
  });

  it("배치 모드에서 돌아오지 않는 동기 `process continue`를 쓰지 않는다", () => {
    expect(script).not.toMatch(/^process continue/m);
    expect(script).toContain("SetAsync(True)");
  });
});

describe("소스 계약", () => {
  const dir = join(__dirname, "../../scripts/ios-seed");
  const native = strip(readFileSync(join(dir, "PocketSeed.m"), "utf8"));

  it("권한 창을 띄우지 않는다 — 요청 API를 부르지 않는다", () => {
    expect(native).not.toMatch(/requestAuthorization/);
  });

  it("일기·앱 저장소를 만지지 않는다", () => {
    for (const f of ["PocketSeed.m", "plan.ts", "ios-seed.mts"]) {
      const text = strip(readFileSync(join(dir, f), "utf8"));
      expect(text).not.toMatch(/diary\/store|initLlama|generate\(/);
    }
  });
});
