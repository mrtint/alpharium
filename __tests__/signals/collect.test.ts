/**
 * 신호 수집의 판정 규칙.
 *
 * 계약: specs/004-photo-signal-collection/contracts/collection.md 「검증 표」 C1~C16
 *
 * **이 파일이 헌법 원칙 V의 방어선이다.** 「모른다」가 「없다」로 뭉개지는 순간 일기가
 * 거짓을 쓰게 되고, C3이 정확히 그것을 잰다.
 *
 * 전부 기기 없이 돈다 — `PhotoPort`를 대역으로 갈아끼우기 때문이다(SC-007).
 */

import { collectDaySignals } from "../../src/signals/collect";
import type {
  LocationOutcome,
  PermissionState,
  PhotoFacts,
  PhotoPort,
} from "../../src/signals/port";

/** 하루의 시작은 04:00이다. 이 날의 사진은 08-12 04:00 ~ 08-13 04:00에 속한다 */
const DAY = "2026-08-12";

/** 그날 안에 드는 시각 */
const at = (iso: string) => new Date(iso).getTime();

type PortOverrides = {
  photoPermission?: PermissionState;
  locationPermission?: PermissionState;
  photos?: PhotoFacts[];
  /** 사진 id → 좌표 결과 */
  locations?: Record<string, LocationOutcome>;
  photosBetween?: PhotoPort["photosBetween"];
  locationOf?: PhotoPort["locationOf"];
};

/** 호출 횟수를 세는 대역. FR-011 검증에 쓴다 */
type Counters = { requestPhoto: number; requestLocation: number };

function fakePort(overrides: PortOverrides = {}): { port: PhotoPort; counters: Counters } {
  const counters: Counters = { requestPhoto: 0, requestLocation: 0 };
  const photoPermission = overrides.photoPermission ?? "granted";
  const locationPermission = overrides.locationPermission ?? "denied";

  const port: PhotoPort = {
    photoPermission: async () => photoPermission,
    locationPermission: async () => locationPermission,
    requestPhotoPermission: async () => {
      counters.requestPhoto += 1;
      return photoPermission;
    },
    requestLocationPermission: async () => {
      counters.requestLocation += 1;
      return locationPermission;
    },
    photosBetween:
      overrides.photosBetween ??
      (async (fromMs, toMs, limit) =>
        (overrides.photos ?? [])
          .filter((p) => p.takenAtMs === null || (p.takenAtMs >= fromMs && p.takenAtMs < toMs))
          .slice(0, limit)),
    locationOf:
      overrides.locationOf ??
      (async (id) => overrides.locations?.[id] ?? { kind: "absent" as const }),
    // 011이 넓힌 계약. **004의 신호 수집은 이것을 부르지 않는다** — 부르면 사진을
    // 세기만 하는 경로가 파일 경로를 들고 다니게 된다.
    filePathOf: async () => null,
  };

  return { port, counters };
}

describe("C1 — 권한 다섯 갈래가 각각 다른 unknown 이유를 만든다 (FR-010)", () => {
  const states: PermissionState[] = ["limited", "denied", "blocked", "undetermined"];

  it("granted가 아닌 넷은 모두 unknown이다", async () => {
    for (const state of states) {
      const { port } = fakePort({ photoPermission: state });
      const signals = await collectDaySignals(port, DAY);

      expect(signals.photos.kind).toBe("unknown");
    }
  });

  it("네 갈래의 이유가 서로 다르다", async () => {
    const reasons = new Set<string>();

    for (const state of states) {
      const { port } = fakePort({ photoPermission: state });
      const signals = await collectDaySignals(port, DAY);

      if (signals.photos.kind === "unknown") reasons.add(signals.photos.reason);
    }

    // 넷이 뭉개지면 진단에서 무엇이 문제인지 알 수 없다.
    expect(reasons.size).toBe(states.length);
  });

  it("limited는 사진이 보여도 unknown이다 (FR-008)", async () => {
    // 「일부만 허용」에서 얻은 목록은 그날의 전부가 아니다. 3장이 보여도 known이 아니다.
    const { port } = fakePort({
      photoPermission: "limited",
      photos: [
        { id: "a", takenAtMs: at("2026-08-12T09:00:00") },
        { id: "b", takenAtMs: at("2026-08-12T10:00:00") },
        { id: "c", takenAtMs: at("2026-08-12T11:00:00") },
      ],
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("unknown");
  });
});

describe("C3 — 권한이 없으면 절대 none이 되지 않는다 (FR-007, SC-002)", () => {
  /**
   * **이 기능에서 가장 중요한 테스트다.**
   *
   * 여기서 `none`이 나오면 일기가 "오늘은 사진을 한 장도 찍지 않았다"고 쓰게 된다.
   * 그것은 관측이 아니라 거짓이며, 헌법 원칙 V가 금지한 바로 그것이다.
   */
  const notGranted: PermissionState[] = ["limited", "denied", "blocked", "undetermined"];

  it("granted가 아닌 어떤 상태에서도 none이 나오지 않는다", async () => {
    for (const state of notGranted) {
      const { port } = fakePort({ photoPermission: state, photos: [] });
      const signals = await collectDaySignals(port, DAY);

      expect(signals.photos.kind).not.toBe("none");
      expect(signals.photos.kind).toBe("unknown");
    }
  });

  it("사진이 0장이어도 권한이 없으면 unknown이다", async () => {
    // 사진 0장 + 권한 없음은 「없다」로 보이기 쉽지만, 우리는 보지 못한 것이다.
    const { port } = fakePort({ photoPermission: "denied", photos: [] });
    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("unknown");
  });
});

describe("C2 — 권한이 있고 0장이면 none이다 (FR-009)", () => {
  it("찾아봤더니 없었던 것은 관측된 사실이다", async () => {
    const { port } = fakePort({ photoPermission: "granted", photos: [] });
    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("none");
  });
});

describe("C5 — 04:00 경계 양쪽이 다른 하루로 갈린다 (FR-002, SC-003)", () => {
  it("03:59는 전날에 속한다", async () => {
    // 08-13 03:59는 08-12의 하루다. 새벽 활동은 전날 일기에 붙는다.
    const { port } = fakePort({
      photos: [{ id: "dawn", takenAtMs: at("2026-08-13T03:59:00") }],
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("known");
    if (signals.photos.kind === "known") {
      expect(signals.photos.value.photos.map((p) => p.id)).toEqual(["dawn"]);
    }
  });

  it("04:01은 당일에 속하므로 전날에서는 보이지 않는다", async () => {
    const { port } = fakePort({
      photos: [{ id: "morning", takenAtMs: at("2026-08-13T04:01:00") }],
    });

    const signals = await collectDaySignals(port, DAY);

    // 08-13 04:01은 08-13의 하루다. 08-12를 물으면 없다.
    expect(signals.photos.kind).toBe("none");
  });

  it("하루의 시작 04:00은 당일이다", async () => {
    const { port } = fakePort({
      photos: [{ id: "start", takenAtMs: at("2026-08-12T04:00:00") }],
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("known");
  });
});

describe("C6·C7 — 하루에 넣을 수 없는 사진은 버린다", () => {
  it("찍힌 시각이 없으면 버린다 (FR-003)", async () => {
    // 임의의 날에 배정하면 거짓이 된다.
    const { port } = fakePort({
      photos: [
        { id: "no-time", takenAtMs: null },
        { id: "ok", takenAtMs: at("2026-08-12T10:00:00") },
      ],
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("known");
    if (signals.photos.kind === "known") {
      expect(signals.photos.value.photos.map((p) => p.id)).toEqual(["ok"]);
    }
  });

  it("전부 시각이 없으면 none이다", async () => {
    // 파일은 있었지만 **하루에 넣을 수 있는 사진**은 없었다.
    const { port } = fakePort({ photos: [{ id: "no-time", takenAtMs: null }] });
    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("none");
  });

  it("미래 시각의 사진은 버린다 (Edge Cases)", async () => {
    // 기기 시계가 어긋났던 흔적. 어느 하루를 물어도 그 하루에 속하지 않는다.
    const { port } = fakePort({
      photosBetween: async () => [
        { id: "future", takenAtMs: at("2027-01-01T10:00:00") },
        { id: "ok", takenAtMs: at("2026-08-12T10:00:00") },
      ],
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("known");
    if (signals.photos.kind === "known") {
      expect(signals.photos.value.photos.map((p) => p.id)).toEqual(["ok"]);
    }
  });
});

describe("C8·C9 — 상한을 넘으면 잘렸다고 말한다 (FR-014a·b)", () => {
  /** 상한 + 1장을 만든다. 시각은 이른 것부터 */
  const manyPhotos = (count: number): PhotoFacts[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `photo-${String(i).padStart(3, "0")}`,
      takenAtMs: at("2026-08-12T05:00:00") + i * 60_000,
    }));

  it("상한 안이면 complete는 true다", async () => {
    const { port } = fakePort({ photos: manyPhotos(3) });
    const signals = await collectDaySignals(port, DAY, { limit: 5 });

    expect(signals.photos.kind).toBe("known");
    if (signals.photos.kind === "known") {
      expect(signals.photos.value.complete).toBe(true);
      expect(signals.photos.value.photos).toHaveLength(3);
    }
  });

  it("상한을 넘으면 상한만큼 담고 complete가 false다", async () => {
    const { port } = fakePort({ photos: manyPhotos(6) });
    const signals = await collectDaySignals(port, DAY, { limit: 5 });

    expect(signals.photos.kind).toBe("known");
    if (signals.photos.kind === "known") {
      // known이지 unknown이 아니다 — 실제로 본 사진을 버리지 않는다.
      expect(signals.photos.value.photos).toHaveLength(5);
      expect(signals.photos.value.complete).toBe(false);
    }
  });

  it("잘릴 때 이른 시각부터 남는다 (FR-014b)", async () => {
    const { port } = fakePort({ photos: manyPhotos(6) });
    const signals = await collectDaySignals(port, DAY, { limit: 5 });

    if (signals.photos.kind === "known") {
      // 어느 쪽을 버렸는지 정해져 있어야 되짚을 수 있다.
      expect(signals.photos.value.photos.map((p) => p.id)).toEqual([
        "photo-000",
        "photo-001",
        "photo-002",
        "photo-003",
        "photo-004",
      ]);
    }
  });

  it("정확히 상한과 같으면 complete는 true다", async () => {
    // 경계값 — 5장에 상한 5면 자르지 않았다.
    const { port } = fakePort({ photos: manyPhotos(5) });
    const signals = await collectDaySignals(port, DAY, { limit: 5 });

    if (signals.photos.kind === "known") {
      expect(signals.photos.value.complete).toBe(true);
      expect(signals.photos.value.photos).toHaveLength(5);
    }
  });
});

describe("C4 — 사진 목록이 찍힌 시각 순이다 (FR-004)", () => {
  it("뒤섞여 와도 시각 순으로 돌아온다", async () => {
    // 순서가 하루의 흐름이 된다.
    const { port } = fakePort({
      photos: [
        { id: "evening", takenAtMs: at("2026-08-12T19:00:00") },
        { id: "morning", takenAtMs: at("2026-08-12T08:00:00") },
        { id: "noon", takenAtMs: at("2026-08-12T12:00:00") },
      ],
    });

    const signals = await collectDaySignals(port, DAY);

    if (signals.photos.kind === "known") {
      expect(signals.photos.value.photos.map((p) => p.id)).toEqual(["morning", "noon", "evening"]);
    }
  });
});

describe("C13 — 조회가 실패해도 던지지 않는다 (FR-012)", () => {
  it("photosBetween이 던지면 unknown이 된다", async () => {
    const { port } = fakePort({
      photosBetween: async () => {
        throw new Error("미디어 라이브러리가 응답하지 않는다");
      },
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("unknown");
    if (signals.photos.kind === "unknown") {
      expect(signals.photos.reason).toContain("미디어 라이브러리가 응답하지 않는다");
    }
  });

  it("권한 조회가 던져도 unknown이 된다", async () => {
    const port: PhotoPort = {
      ...fakePort().port,
      photoPermission: async () => {
        throw new Error("권한 모듈이 없다");
      },
    };

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("unknown");
  });
});

describe("C15 — 신호를 물어도 권한을 요청하지 않는다 (FR-011)", () => {
  it("undetermined여도 요청이 불리지 않는다", async () => {
    const { port, counters } = fakePort({
      photoPermission: "undetermined",
      locationPermission: "undetermined",
    });

    await collectDaySignals(port, DAY);

    // 신호 수집은 배경에서 돌 수 있다. 맥락 없는 권한 창은 거절당하고 blocked가 된다.
    expect(counters.requestPhoto).toBe(0);
    expect(counters.requestLocation).toBe(0);
  });

  it("granted일 때도 요청이 불리지 않는다", async () => {
    const { port, counters } = fakePort({
      photoPermission: "granted",
      locationPermission: "granted",
    });

    await collectDaySignals(port, DAY);

    expect(counters.requestPhoto).toBe(0);
    expect(counters.requestLocation).toBe(0);
  });
});

describe("C4 — 좌표 실패가 사진을 오염시키지 않는다 (FR-013a, SC-004)", () => {
  /** 이 스토리의 핵심이다. 한쪽 권한의 실패가 다른 쪽을 무너뜨리면 안 된다 */
  const twoPhotos: PhotoFacts[] = [
    { id: "a", takenAtMs: at("2026-08-12T09:00:00") },
    { id: "b", takenAtMs: at("2026-08-12T15:00:00") },
  ];

  it("좌표를 하나도 못 읽어도 photos는 known이다", async () => {
    const { port } = fakePort({
      photos: twoPhotos,
      locations: {
        a: { kind: "failed", reason: "ACCESS_MEDIA_LOCATION 없음" },
        b: { kind: "failed", reason: "ACCESS_MEDIA_LOCATION 없음" },
      },
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("known");
    // 좌표는 모르지만 사진은 봤다. 둘은 다른 사실이다.
    expect(signals.places.kind).toBe("unknown");
  });

  it("locationOf가 던져도 photos가 산다 (FR-012)", async () => {
    const { port } = fakePort({
      photos: twoPhotos,
      locationOf: async () => {
        throw new Error("좌표 모듈이 무너졌다");
      },
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.photos.kind).toBe("known");
    if (signals.photos.kind === "known") {
      expect(signals.photos.value.photos).toHaveLength(2);
    }
    expect(signals.places.kind).toBe("unknown");
  });
});

describe("places 판정 (FR-013b·c)", () => {
  const twoPhotos: PhotoFacts[] = [
    { id: "a", takenAtMs: at("2026-08-12T09:00:00") },
    { id: "b", takenAtMs: at("2026-08-12T15:00:00") },
  ];

  it("좌표를 읽었지만 담긴 사진이 없으면 none이다 (FR-013c)", async () => {
    // 읽을 수 있는 상태에서 찾아봤더니 없었다 — 관측된 사실이다.
    const { port } = fakePort({
      photos: twoPhotos,
      locations: { a: { kind: "absent" }, b: { kind: "absent" } },
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.places.kind).toBe("none");
  });

  it("좌표가 있으면 known이고 센 수가 담긴다", async () => {
    const { port } = fakePort({
      photos: twoPhotos,
      locations: {
        a: { kind: "found", latitude: 37.5665, longitude: 126.978 },
        b: { kind: "absent" },
      },
    });

    const signals = await collectDaySignals(port, DAY);

    expect(signals.places.kind).toBe("known");
    if (signals.places.kind === "known") {
      expect(signals.places.value.source).toBe("photo-exif");
      // 열 장 중 한 장에만 좌표가 있었다는 사실이 값에 남아야 한다(헌법 원칙 II).
      expect(signals.places.value.photosWithLocation).toBe(1);
      expect(signals.places.value.photosConsidered).toBe(2);
      expect(signals.places.value.trace.visitCount).toBe(1);
    }
  });

  it("사진이 unknown이면 places도 unknown이고 이유가 사진 쪽이다", async () => {
    const { port } = fakePort({ photoPermission: "denied" });
    const signals = await collectDaySignals(port, DAY);

    expect(signals.places.kind).toBe("unknown");
    if (signals.places.kind === "unknown") {
      // 진짜 이유는 사진을 못 본 것이지 좌표 권한이 아니다.
      expect(signals.places.reason).toContain("사진을 보지 못해");
    }
  });

  it("유효하지 않은 좌표는 자리로 세지 않는다 (FR-013d)", async () => {
    const { port } = fakePort({
      photos: twoPhotos,
      locations: {
        a: { kind: "found", latitude: 0, longitude: 0 },
        b: { kind: "absent" },
      },
    });

    const signals = await collectDaySignals(port, DAY);

    // (0,0)만 있었으므로 좌표를 얻은 사진이 없는 것과 같다.
    expect(signals.places.kind).toBe("none");
  });

  it("일부만 실패하면 나머지로 판정한다", async () => {
    const { port } = fakePort({
      photos: twoPhotos,
      locations: {
        a: { kind: "found", latitude: 37.5665, longitude: 126.978 },
        b: { kind: "failed", reason: "이 사진만 못 읽었다" },
      },
    });

    const signals = await collectDaySignals(port, DAY);

    // 전부 실패한 것이 아니므로 읽을 수는 있는 상태다.
    expect(signals.places.kind).toBe("known");
  });
});

describe("C14 — 채우지 않는 셋의 이유가 서로 다르다 (FR-015a)", () => {
  it("셋 다 unknown이다", async () => {
    const { port } = fakePort();
    const signals = await collectDaySignals(port, DAY);

    expect(signals.steps.kind).toBe("unknown");
    expect(signals.battery.kind).toBe("unknown");
    expect(signals.connectivity.kind).toBe("unknown");
  });

  it("steps의 이유가 나머지 둘과 다르다", async () => {
    // 「못 하는 것」과 「안 한 것」은 다른 사실이다. 안드로이드는 기간 걸음 수를 주지 않는다.
    const { port } = fakePort();
    const signals = await collectDaySignals(port, DAY);

    if (
      signals.steps.kind === "unknown" &&
      signals.battery.kind === "unknown" &&
      signals.connectivity.kind === "unknown"
    ) {
      expect(signals.steps.reason).not.toBe(signals.battery.reason);
      expect(signals.steps.reason).not.toBe(signals.connectivity.reason);
    }
  });
});

describe("C16 — SignalValue의 갈래 수가 002와 같다 (SC-006b)", () => {
  it("돌아온 신호의 kind가 셋 중 하나다", async () => {
    const { port } = fakePort({
      photos: [{ id: "a", takenAtMs: at("2026-08-12T09:00:00") }],
    });
    const signals = await collectDaySignals(port, DAY);

    const kinds = [
      signals.photos.kind,
      signals.places.kind,
      signals.steps.kind,
      signals.battery.kind,
      signals.connectivity.kind,
    ];

    // 네 번째 갈래(partial 등)가 생기면 002·003의 모든 판정이 영향받는다.
    for (const kind of kinds) {
      expect(["known", "none", "unknown"]).toContain(kind);
    }
  });

  it("DaySignals의 자리 수가 다섯 그대로다", async () => {
    const { port } = fakePort();
    const signals = await collectDaySignals(port, DAY);

    expect(Object.keys(signals).sort()).toEqual(
      ["battery", "connectivity", "date", "photos", "places", "steps"].sort(),
    );
  });
});
