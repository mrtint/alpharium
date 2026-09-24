/**
 * 048 — 하루 신호를 개수 요약으로 좁힌다 (contracts/write-prompt.md DP1~DP6).
 *
 * **「없음」과 「모름」을 0으로 뭉개지 않는다**(원칙 V) — 이 파일이 그 경계다.
 */

import { toDayPreview } from "../../src/app/day-preview";
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
    expect(toDayPreview(DAY, signals(knownPhotos(3), knownPlaces(2)))).toEqual({
      day: DAY,
      photos: { kind: "known", count: 3 },
      places: { kind: "known", count: 2 },
    });
  });

  it("★ DP2 — 없으면 없음이다 (0이 아니다)", () => {
    const p = toDayPreview(DAY, signals({ kind: "none" }, { kind: "none" }));
    expect(p.photos).toEqual({ kind: "none" });
    expect(p.places).toEqual({ kind: "none" });
  });

  it("★ DP3 — 모르면 모름이다 (없음이 아니다)", () => {
    const p = toDayPreview(
      DAY,
      signals({ kind: "unknown", reason: "권한 없음" }, { kind: "unknown", reason: "권한 없음" }),
    );
    expect(p.photos).toEqual({ kind: "unknown" });
    expect(p.places).toEqual({ kind: "unknown" });
  });

  it("DP4 — 두 칸은 서로 섞이지 않는다", () => {
    const p = toDayPreview(DAY, signals(knownPhotos(4), { kind: "unknown", reason: "좌표 없음" }));
    expect(p.photos).toEqual({ kind: "known", count: 4 });
    expect(p.places).toEqual({ kind: "unknown" });
  });

  it("DP5 — 신호를 만들지 못했으면 둘 다 모름", () => {
    expect(toDayPreview(DAY, null)).toEqual({
      day: DAY,
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
      const p = toDayPreview(DAY, input);
      expect(Object.keys(p).sort()).toEqual(["day", "photos", "places"]);
      expect(JSON.stringify(p)).not.toMatch(/reason|takenAt|p0|photo-exif|approximate/);
    }
  });
});
