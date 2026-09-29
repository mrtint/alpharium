/**
 * 053 — 쓸 재료: 「셀 수 있는 재료가 있는가」 판정 (contracts/material.md MAT·DEC·MADE·SRC5).
 *
 * **`unseen`(셀 수 없음)을 `zero`(관측된 0)로 바꾸지 않는다**(원칙 V) — 이 파일이 그 경계다.
 * 같은 규칙이 쓰기 전(미리보기)과 읽을 때(저장된 신호) 양쪽에 쓰인다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  allZero,
  decideMaterial,
  fromCountHint,
  fromPhotoSignal,
  fromPlaceSignal,
  madeUpDay,
  type MaterialState,
} from "../../src/app/material";
import type { CountHint } from "../../src/app/state";
import type {
  DaySignals,
  PhotoObservation,
  PhotoPlaces,
  SignalValue,
} from "../../src/signals/types";

const DAY = "2026-09-23";

function signals(
  photos: SignalValue<PhotoObservation>,
  places: SignalValue<PhotoPlaces>,
): DaySignals {
  return {
    date: DAY,
    photos,
    places,
    steps: { kind: "unknown", reason: "-" },
    battery: { kind: "unknown", reason: "-" },
    connectivity: { kind: "unknown", reason: "-" },
  };
}

const knownPhotos = (n: number): SignalValue<PhotoObservation> => ({
  kind: "known",
  value: {
    photos: Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      takenAt: new Date(`2026-09-23T1${i}:00:00`),
    })),
    complete: true,
  },
});

const knownPlaces = (visits: number): SignalValue<PhotoPlaces> => ({
  kind: "known",
  value: {
    trace: { visitCount: visits, approximateDistanceMeters: 1200 },
    source: "photo-exif",
    photosWithLocation: 2,
    photosConsidered: 3,
  },
});

const UNKNOWN: SignalValue<never> = { kind: "unknown", reason: "권한이 없다" };
const NONE: SignalValue<never> = { kind: "none" };

describe("053 MAT — 재료 상태 옮김", () => {
  it("MAT1 — CountHint: known(3)→some, known(0)→zero, none→zero, unknown→unseen", () => {
    const cases: [CountHint, MaterialState][] = [
      [{ kind: "known", count: 3 }, "some"],
      [{ kind: "known", count: 0 }, "zero"],
      [{ kind: "none" }, "zero"],
      [{ kind: "unknown" }, "unseen"],
    ];
    for (const [hint, expected] of cases) {
      expect(fromCountHint(hint)).toBe(expected);
    }
  });

  it("MAT2 — 저장된 신호: 사진 known(n≥1)→some, none→zero, unknown→unseen", () => {
    expect(fromPhotoSignal(knownPhotos(3))).toBe("some");
    expect(fromPhotoSignal(knownPhotos(0))).toBe("zero");
    expect(fromPhotoSignal(NONE)).toBe("zero");
    expect(fromPhotoSignal(UNKNOWN)).toBe("unseen");
  });

  it("MAT2 — 저장된 신호: 장소 known(visitCount≥1)→some, 0→zero, none→zero, unknown→unseen", () => {
    expect(fromPlaceSignal(knownPlaces(2))).toBe("some");
    expect(fromPlaceSignal(knownPlaces(0))).toBe("zero");
    expect(fromPlaceSignal(NONE)).toBe("zero");
    expect(fromPlaceSignal(UNKNOWN)).toBe("unseen");
  });

  it("MAT3 — 소스에 unknown을 0/none으로 채우는 기본 분기가 없다", () => {
    const code = readFileSync(join(__dirname, "../../src/app/material.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bdefault\s*:/);
    expect(code).not.toMatch(/valueOr/);
  });
});

describe("053 DEC — 쓰기 전 판정 (권한 × 값 조합 전부)", () => {
  const table: [MaterialState, MaterialState, ReturnType<typeof decideMaterial>][] = [
    ["some", "some", { kind: "write" }],
    ["some", "zero", { kind: "write" }],
    ["some", "unseen", { kind: "write" }], // DEC3 — 좌표를 못 읽었어도 사진이 있으면 쓴다
    ["zero", "zero", { kind: "confirm", because: "zero" }],
    ["zero", "unseen", { kind: "confirm", because: "zero" }],
    ["unseen", "unseen", { kind: "confirm", because: "unseen" }],
    ["unseen", "zero", { kind: "confirm", because: "zero" }],
    ["zero", "some", { kind: "write" }],
    ["unseen", "some", { kind: "write" }],
  ];

  it.each(table)("DEC1~9 — %s·%s", (photos, places, expected) => {
    expect(decideMaterial(photos, places)).toEqual(expected);
  });

  it("DEC10 — 인자 순서를 바꿔도 결과가 같다", () => {
    for (const [a, b, expected] of table) {
      expect(decideMaterial(b, a)).toEqual(expected);
    }
  });

  it("DEC11 — unseen만 있는 조합은 zero로 취급하지 않는다", () => {
    expect(decideMaterial("unseen", "unseen")).toEqual({ kind: "confirm", because: "unseen" });
  });

  it("DEC12 — allZero: zero·zero만 참, zero·unseen과 some이 섞이면 거짓", () => {
    expect(allZero("zero", "zero")).toBe(true);
    expect(allZero("zero", "unseen")).toBe(false);
    expect(allZero("unseen", "unseen")).toBe(false);
    expect(allZero("some", "zero")).toBe(false);
    expect(allZero("zero", "some")).toBe(false);
  });
});

describe("053 MADE — 지어낸 하루는 같은 규칙을 저장된 신호에 적용한다", () => {
  it("MADE1 — 사진·장소 known → false", () => {
    expect(madeUpDay(signals(knownPhotos(3), knownPlaces(2)))).toBe(false);
  });

  it("MADE1 — 사진 none + 장소 none → true", () => {
    expect(madeUpDay(signals(NONE, NONE))).toBe(true);
  });

  it("MADE1 — 사진 unknown + 장소 unknown → true", () => {
    expect(madeUpDay(signals(UNKNOWN, UNKNOWN))).toBe(true);
  });

  it("MADE1 — 사진 known + 장소 unknown → false (사진이 재료다)", () => {
    expect(madeUpDay(signals(knownPhotos(3), UNKNOWN))).toBe(false);
  });

  it("MADE1 — madeUpDay는 decideMaterial과 같은 결과를 낸다", () => {
    const photosCases: SignalValue<PhotoObservation>[] = [
      knownPhotos(2),
      knownPhotos(0),
      NONE,
      UNKNOWN,
    ];
    const placesCases: SignalValue<PhotoPlaces>[] = [knownPlaces(1), knownPlaces(0), NONE, UNKNOWN];
    for (const photos of photosCases) {
      for (const places of placesCases) {
        const decision = decideMaterial(fromPhotoSignal(photos), fromPlaceSignal(places));
        expect(madeUpDay(signals(photos, places))).toBe(decision.kind === "confirm");
      }
    }
  });
});

describe("053 SRC5 — 순수하다", () => {
  it("material.ts에 Date·setTimeout·Date.now가 없다", () => {
    const code = readFileSync(join(__dirname, "../../src/app/material.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bnew Date\b|\bDate\.now\b|\bsetTimeout\b/);
  });
});
