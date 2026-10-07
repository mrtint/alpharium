/**
 * 064 — 상태 흉내의 순수 판정 (contracts/simulation.md SM1~SM6).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OFF,
  effectiveSimulation,
  parseSimulation,
  serializeSimulation,
  simulatedNow,
  simulatedPreviewDay,
  simulationBlocksWriting,
  type SimulationState,
} from "../../src/app/simulation";
import { dayOf } from "../../src/config/day-boundary";

const SOURCE = readFileSync(join(__dirname, "../../src/app/simulation.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

const ON: SimulationState = {
  date: "2026-09-13",
  failToast: true,
  noMaterial: true,
  noPhoto: true,
};

describe("SM1 — parseSimulation", () => {
  it.each([null, "", "{", "[]", "3", '"x"', "null"])("%s → OFF", (raw) => {
    expect(parseSimulation(raw)).toEqual(OFF);
  });

  it("토글은 === true만 켬", () => {
    expect(
      parseSimulation(JSON.stringify({ failToast: "true", noMaterial: 1, noPhoto: true })),
    ).toEqual({ ...OFF, noPhoto: true });
  });

  it("date는 YYYY-MM-DD 형식이고 실제 달력 날일 때만", () => {
    expect(parseSimulation(JSON.stringify({ date: "2026-09-13" })).date).toBe("2026-09-13");
    for (const bad of ["2026-9-13", "2026-02-30", "2026-13-01", "20260913", 20260913, null]) {
      expect(parseSimulation(JSON.stringify({ date: bad, noPhoto: true }))).toEqual({
        ...OFF,
        noPhoto: true,
      });
    }
  });
});

describe("SM2 — effectiveSimulation", () => {
  it("배포 환경이면 OFF", () => {
    expect(effectiveSimulation(ON, false)).toEqual(OFF);
  });
  it("개발 환경이면 그대로", () => {
    expect(effectiveSimulation(ON, true)).toEqual(ON);
  });
});

describe("SM3 — simulationBlocksWriting", () => {
  it("OFF만 거짓", () => {
    expect(simulationBlocksWriting(OFF)).toBe(false);
  });
  it.each([
    { ...OFF, date: "2026-09-13" },
    { ...OFF, failToast: true },
    { ...OFF, noMaterial: true },
    { ...OFF, noPhoto: true },
  ])("하나만 켜도 참 %#", (state) => {
    expect(simulationBlocksWriting(state)).toBe(true);
  });
});

describe("SM4 — simulatedNow", () => {
  const real = new Date(2026, 9, 7, 14, 23, 45, 678);

  it("날짜 흉내가 없으면 실제 시각", () => {
    expect(simulatedNow(null, real).getTime()).toBe(real.getTime());
  });

  it.each(["2026-09-13", "2027-01-01", "2024-02-29"])(
    "%s — 그 날이고 시·분·초·밀리초는 실제 시각",
    (day) => {
      const at = simulatedNow(day, real);
      expect(dayOf(at)).toBe(day);
      expect([at.getHours(), at.getMinutes(), at.getSeconds(), at.getMilliseconds()]).toEqual([
        14, 23, 45, 678,
      ]);
    },
  );

  it("하루 기준을 getHours() ±로 옮기지 않는다(DB11)", () => {
    expect(SOURCE).not.toMatch(/getHours\(\)\s*[-+]/);
  });
});

describe("SM5 — simulatedPreviewDay", () => {
  it("OFF → undefined", () => {
    expect(simulatedPreviewDay(OFF)).toBeUndefined();
    expect(simulatedPreviewDay({ ...OFF, date: "2026-09-13", failToast: true })).toBeUndefined();
  });

  it("noPhoto → 사진 권한 없음", async () => {
    const preview = await simulatedPreviewDay({ ...OFF, noPhoto: true })!("2026-10-01");
    expect(preview).toEqual({
      day: "2026-10-01",
      photos: { kind: "unknown" },
      places: { kind: "unknown" },
      photoAccess: "denied",
    });
  });

  it("noMaterial만 → 관측된 0", async () => {
    const preview = await simulatedPreviewDay({ ...OFF, noMaterial: true })!("2026-10-02");
    expect(preview).toEqual({
      day: "2026-10-02",
      photos: { kind: "none" },
      places: { kind: "none" },
      photoAccess: "ok",
    });
  });

  it("둘 다 → 권한 없음이 이긴다(B7)", async () => {
    const preview = await simulatedPreviewDay({ ...OFF, noMaterial: true, noPhoto: true })!(
      "2026-10-03",
    );
    expect(preview.photoAccess).toBe("denied");
    expect(preview.photos.kind).toBe("unknown");
  });
});

describe("SM6 — serializeSimulation", () => {
  it("OFF → null(지움)", () => {
    expect(serializeSimulation(OFF)).toBeNull();
  });

  it("켠 것만 담고 parse로 왕복한다", () => {
    const state: SimulationState = { ...OFF, date: "2026-09-13", noMaterial: true };
    const raw = serializeSimulation(state)!;
    expect(JSON.parse(raw)).toEqual({ date: "2026-09-13", noMaterial: true });
    expect(parseSimulation(raw)).toEqual(state);
    expect(parseSimulation(serializeSimulation(ON))).toEqual(ON);
  });

  it("시각·횟수 필드가 없다(D3)", () => {
    expect(Object.keys(JSON.parse(serializeSimulation(ON)!)).sort()).toEqual(
      ["date", "failToast", "noMaterial", "noPhoto"].sort(),
    );
  });
});

describe("경계 — 생성 경로에 닿지 않는다(LK1)", () => {
  it("diary/pipeline·schedule/·signals/를 import하지 않는다", () => {
    expect(SOURCE).not.toMatch(/from\s+["'][^"']*(?:diary\/pipeline|\/schedule\/|\/signals\/)/);
  });
});
