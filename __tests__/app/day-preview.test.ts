/**
 * 048 — 하루 신호를 개수 요약으로 좁힌다 (contracts/write-prompt.md DP1~DP6).
 *
 * **「없음」과 「모름」을 0으로 뭉개지 않는다**(원칙 V) — 이 파일이 그 경계다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { photoAccessOf, toDayPreview } from "../../src/app/day-preview";
import type {
  DaySignals,
  SignalValue,
  PhotoObservation,
  PhotoPlaces,
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

describe("048 toDayPreview", () => {
  it("DP1 — 알면 개수 (사진은 전체 장수, 자리는 visitCount)", () => {
    expect(toDayPreview(DAY, signals(knownPhotos(3), knownPlaces(2)), "ok")).toEqual({
      day: DAY,
      photoAccess: "ok",
      photos: { kind: "known", count: 3 },
      places: { kind: "known", count: 2 },
    });
  });

  it("★ DP2 — 없으면 없음이다 (0이 아니다)", () => {
    const p = toDayPreview(DAY, signals({ kind: "none" }, { kind: "none" }), "ok");
    expect(p.photos).toEqual({ kind: "none" });
    expect(p.places).toEqual({ kind: "none" });
  });

  it("★ DP3 — 모르면 모름이다 (없음이 아니다)", () => {
    const p = toDayPreview(
      DAY,
      signals({ kind: "unknown", reason: "권한 없음" }, { kind: "unknown", reason: "권한 없음" }),
      "ok",
    );
    expect(p.photos).toEqual({ kind: "unknown" });
    expect(p.places).toEqual({ kind: "unknown" });
  });

  it("DP4 — 두 칸은 서로 섞이지 않는다", () => {
    const p = toDayPreview(
      DAY,
      signals(knownPhotos(4), { kind: "unknown", reason: "좌표 없음" }),
      "ok",
    );
    expect(p.photos).toEqual({ kind: "known", count: 4 });
    expect(p.places).toEqual({ kind: "unknown" });
  });

  it("DP5 — 신호를 만들지 못했으면 둘 다 모름", () => {
    expect(toDayPreview(DAY, null, "ok")).toEqual({
      day: DAY,
      photoAccess: "ok",
      photos: { kind: "unknown" },
      places: { kind: "unknown" },
    });
  });

  it("★ DP6 — 신호 원형이 새지 않는다 (까닭·좌표·사진 id가 없다)", () => {
    const inputs = [
      signals(knownPhotos(2), knownPlaces(1)),
      signals({ kind: "unknown", reason: "권한 없음" }, { kind: "none" }),
      null,
    ];
    for (const input of inputs) {
      const p = toDayPreview(DAY, input, "ok");
      expect(Object.keys(p).sort()).toEqual(["day", "photoAccess", "photos", "places"]);
      expect(JSON.stringify(p)).not.toMatch(/reason|takenAt|p0|photo-exif|approximate/);
    }
  });
});

describe("053 PRM — 사진 접근 상태를 싣는다", () => {
  it("PRM1 — photoAccess를 그대로 싣고 photos·places는 신호에서 온 세 갈래 그대로다", () => {
    const p = toDayPreview(
      DAY,
      signals(
        { kind: "unknown", reason: "사진 접근 권한이 없다" },
        { kind: "unknown", reason: "-" },
      ),
      "denied",
    );
    expect(p.photoAccess).toBe("denied");
    expect(p.photos).toEqual({ kind: "unknown" });
    expect(p.places).toEqual({ kind: "unknown" });
    expect(toDayPreview(DAY, null, "blocked").photoAccess).toBe("blocked");
  });

  it("PRM2 — 권한 상태를 세 갈래로 옮긴다 (granted·limited→ok, denied·undetermined→denied, blocked→blocked)", () => {
    expect(photoAccessOf("granted")).toBe("ok");
    expect(photoAccessOf("limited")).toBe("ok");
    expect(photoAccessOf("denied")).toBe("denied");
    expect(photoAccessOf("undetermined")).toBe("denied");
    expect(photoAccessOf("blocked")).toBe("blocked");
  });

  it("PRM4 — 권한 여부를 reason 문장으로 가르지 않는다", () => {
    const code = readFileSync(join(__dirname, "../../src/app/day-preview.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.reason/);
    expect(code).not.toMatch(/\.includes\(/);
  });
});

describe("053 — 사진이 관측된 0장이면 장소도 0곳이다 (장소 수는 사진 좌표에서 나온다)", () => {
  it("사진 none + 장소 unknown(수집이 그렇게 돌려준다) → 둘 다 none", () => {
    const p = toDayPreview(
      DAY,
      signals(
        { kind: "none" },
        { kind: "unknown", reason: "사진을 보지 못해 좌표를 물을 수 없다" },
      ),
      "ok",
    );
    expect(p.photos).toEqual({ kind: "none" });
    expect(p.places).toEqual({ kind: "none" });
  });

  it("★ 사진 unknown + 장소 unknown → 둘 다 unknown (못 본 것을 0으로 승격하지 않는다)", () => {
    const p = toDayPreview(
      DAY,
      signals({ kind: "unknown", reason: "권한 없음" }, { kind: "unknown", reason: "-" }),
      "denied",
    );
    expect(p.photos).toEqual({ kind: "unknown" });
    expect(p.places).toEqual({ kind: "unknown" });
  });

  it("사진 known + 장소 unknown(좌표를 못 읽음) → 장소는 unknown 그대로", () => {
    const p = toDayPreview(DAY, signals(knownPhotos(3), { kind: "unknown", reason: "-" }), "ok");
    expect(p.places).toEqual({ kind: "unknown" });
  });
});
