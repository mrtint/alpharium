/**
 * 121 — 저장된 자리 목록 (spec US4, FR-011, data-model SavedPlace).
 *
 * 저장 일기는 자리 목록(`places`, 좌표 없음)을 함께 담는다. 신호 기록의 자리 목록(좌표)은 파이프라인이 저장 전에 걷는다(R9).
 * 옛 형식(대표 장소 이름 하나, `placeName`) 일기는 그대로 읽힌다.
 */
import { deserializeEntry, serializeEntry } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";

const DAY = "2026-11-21";
const T = (h: number) => new Date(`${DAY}T${String(h).padStart(2, "0")}:00:00`);

function entry(over: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    date: DAY as DiaryEntry["date"],
    text: "오늘 하루.",
    character: "quiet",
    signalsUsed: {
      date: DAY,
      photos: { kind: "none" },
      places: {
        kind: "known",
        value: {
          trace: {
            visitCount: 2,
            approximateDistanceMeters: 1200,
            representativeCoordinate: { latitude: 37.5, longitude: 127 },
            visits: [
              {
                coordinate: { latitude: 37.5, longitude: 127 },
                firstSeenAt: T(8),
                lastSeenAt: T(9),
                photoCount: 2,
                source: "photo-exif",
              },
              {
                coordinate: { latitude: 37.51, longitude: 127.01 },
                firstSeenAt: T(13),
                lastSeenAt: T(13),
                photoCount: 1,
                source: "photo-exif",
              },
            ],
          },
          source: "photo-exif",
          photosWithLocation: 3,
          photosConsidered: 3,
        },
      },
      steps: { kind: "unknown", reason: "-" },
      battery: { kind: "unknown", reason: "-" },
      connectivity: { kind: "unknown", reason: "-" },
    },
    createdAt: T(22),
    ...over,
  } as DiaryEntry;
}

describe("121 US4 — 자리 목록 저장 왕복", () => {
  it("places가 그대로 돌아온다", () => {
    const places = [
      {
        label: "판교역",
        category: "station" as const,
        firstSeenAt: T(8).toISOString(),
        lastSeenAt: T(9).toISOString(),
        photoCount: 2,
      },
      {
        label: null,
        category: null,
        firstSeenAt: T(13).toISOString(),
        lastSeenAt: T(13).toISOString(),
        photoCount: 1,
      },
    ];
    expect(deserializeEntry(serializeEntry(entry({ places }))).places).toEqual(places);
  });

  it("126 DM21 — 좌표(latE5·lonE5)가 저장·읽기 왕복에서 그대로 돌아온다", () => {
    const places = [
      {
        label: "서울숲",
        category: "park" as const,
        firstSeenAt: T(8).toISOString(),
        lastSeenAt: T(9).toISOString(),
        photoCount: 2,
        latE5: 3_754_440,
        lonE5: 12_703_740,
      },
      {
        label: null,
        category: null,
        firstSeenAt: T(13).toISOString(),
        lastSeenAt: T(13).toISOString(),
        photoCount: 1,
        latE5: -3_386_880,
        lonE5: -7_066_930,
      },
    ];
    expect(deserializeEntry(serializeEntry(entry({ places }))).places).toEqual(places);
  });

  it("126 DM21 — 좌표 없는 옛 일기(121~125)는 그대로 읽히고 좌표가 채워지지 않는다", () => {
    const places = [
      {
        label: "판교역",
        category: "station" as const,
        firstSeenAt: T(8).toISOString(),
        lastSeenAt: T(9).toISOString(),
        photoCount: 2,
      },
    ];
    const back = deserializeEntry(serializeEntry(entry({ places }))).places!;
    expect(back[0]!.latE5).toBeUndefined();
    expect(back[0]!.lonE5).toBeUndefined();
    expect("latE5" in back[0]!).toBe(false);
  });

  it("옛 형식(placeName, visits 없음) 일기도 오류 없이 읽힌다", () => {
    const old = JSON.parse(serializeEntry(entry())) as Record<string, unknown>;
    const signals = old.signalsUsed as { places: { value: { trace: Record<string, unknown> } } };
    delete signals.places.value.trace.visits;
    old.placeName = { kind: "known", value: "강남구" };
    const back = deserializeEntry(JSON.stringify(old));
    expect(back.text).toBe("오늘 하루.");
    expect(back.placeName).toEqual({ kind: "known", value: "강남구" });
    expect(back.places).toBeUndefined();
  });
});

describe("135 — 사진의 자리 순번 저장 왕복 (data-model DM1·DM3)", () => {
  const photo = (photoId: string, placeIndex?: number | null) => ({
    photoId,
    takenAt: T(9),
    resizedPath: `/r/${photoId}.jpg`,
    ownsResizedPath: true,
    ...(placeIndex !== undefined ? { placeIndex } : {}),
  });

  it("숫자와 null이 그대로 돌아온다", () => {
    const back = deserializeEntry(
      serializeEntry(entry({ photos: [photo("a", 0), photo("b", null)] })),
    );
    expect(back.photos?.map((p) => p.placeIndex)).toEqual([0, null]);
  });

  it("옛 일기(키 없음)는 키 없이 돌아온다", () => {
    const back = deserializeEntry(serializeEntry(entry({ photos: [photo("a")] })));
    expect(back.photos?.[0] !== undefined && "placeIndex" in back.photos[0]).toBe(false);
  });
});
