/**
 * 대역이 `PhotoPort` 계약을 만족하는가.
 *
 * 계약: specs/004-photo-signal-collection/contracts/photo-port.md
 *       「대역 구현이 만들 수 있어야 하는 상태」 1~10번
 *
 * **이 파일이 SC-007을 증명한다** — 권한 갈래와 신호 갈래의 조합이 기기 없이 전부
 * 만들어지는지 확인한다. 만들 수 없는 조합이 있으면 그것은 실기기에서만 잡힌다는 뜻이고,
 * 그때 이 기능은 검증 불가능해진다.
 */

import { collectDaySignals } from "../../src/signals/collect";
import type {
  LocationOutcome,
  PermissionState,
  PhotoFacts,
  PhotoPort,
} from "../../src/signals/port";

const DAY = "2026-08-12";
const at = (iso: string) => new Date(iso).getTime();

/** 계약이 요구하는 여섯 함수를 모두 갖춘 대역 */
function stubPort(overrides: Partial<PhotoPort> = {}): PhotoPort {
  return {
    photoPermission: async () => "granted",
    locationPermission: async () => "granted",
    requestPhotoPermission: async () => "granted",
    requestLocationPermission: async () => "granted",
    photosBetween: async () => [],
    locationOf: async () => ({ kind: "absent" }),
    // 011이 넓힌 계약. 대역은 경로를 모른다 — 캡션을 돌리지 않는 스위트다
    filePathOf: async () => null,
    ...overrides,
  };
}

const photo = (id: string, iso: string): PhotoFacts => ({ id, takenAtMs: at(iso) });
const found = (latitude: number, longitude: number): LocationOutcome => ({
  kind: "found",
  latitude,
  longitude,
});

describe("계약이 요구하는 조합을 대역으로 만들 수 있다 (SC-007)", () => {
  it("1. 사진·좌표 모두 허용, 좌표 있는 사진 둘 → known / known", async () => {
    const signals = await collectDaySignals(
      stubPort({
        photosBetween: async () => [
          photo("a", "2026-08-12T09:00:00"),
          photo("b", "2026-08-12T15:00:00"),
        ],
        locationOf: async (id) => (id === "a" ? found(37.5665, 126.978) : found(37.58, 126.99)),
      }),
      DAY,
    );

    expect(signals.photos.kind).toBe("known");
    expect(signals.places.kind).toBe("known");
  });

  it("2. 좌표가 담긴 사진이 없다 → known / none", async () => {
    const signals = await collectDaySignals(
      stubPort({ photosBetween: async () => [photo("a", "2026-08-12T09:00:00")] }),
      DAY,
    );

    expect(signals.photos.kind).toBe("known");
    expect(signals.places.kind).toBe("none");
  });

  it("3. 좌표를 읽지 못한다 → known / unknown (FR-013a)", async () => {
    const signals = await collectDaySignals(
      stubPort({
        photosBetween: async () => [photo("a", "2026-08-12T09:00:00")],
        locationOf: async () => ({ kind: "failed", reason: "권한 없음" }),
      }),
      DAY,
    );

    // **한쪽의 실패가 다른 쪽을 오염시키지 않는다.**
    expect(signals.photos.kind).toBe("known");
    expect(signals.places.kind).toBe("unknown");
  });

  it("4. 허용됐는데 사진이 0장 → none / unknown", async () => {
    const signals = await collectDaySignals(stubPort(), DAY);

    expect(signals.photos.kind).toBe("none");
    expect(signals.places.kind).toBe("unknown");
  });

  it("5. 사진 권한 거절 → unknown / unknown", async () => {
    const signals = await collectDaySignals(
      stubPort({ photoPermission: async () => "denied" }),
      DAY,
    );

    expect(signals.photos.kind).toBe("unknown");
    expect(signals.places.kind).toBe("unknown");
  });

  it("6. 일부만 허용 → unknown (FR-008)", async () => {
    const signals = await collectDaySignals(
      stubPort({
        photoPermission: async () => "limited",
        photosBetween: async () => [
          photo("a", "2026-08-12T09:00:00"),
          photo("b", "2026-08-12T10:00:00"),
          photo("c", "2026-08-12T11:00:00"),
        ],
      }),
      DAY,
    );

    expect(signals.photos.kind).toBe("unknown");
  });

  it("7. 아직 묻지 않음 → unknown, 요청이 불리지 않는다 (FR-011)", async () => {
    let requested = 0;
    const signals = await collectDaySignals(
      stubPort({
        photoPermission: async () => "undetermined",
        requestPhotoPermission: async () => {
          requested += 1;
          return "granted";
        },
      }),
      DAY,
    );

    expect(signals.photos.kind).toBe("unknown");
    expect(requested).toBe(0);
  });

  it("8. blocked도 unknown이다 (FR-023)", async () => {
    const signals = await collectDaySignals(
      stubPort({ photoPermission: async () => "blocked" }),
      DAY,
    );

    expect(signals.photos.kind).toBe("unknown");
    if (signals.photos.kind === "unknown") {
      // denied와 다른 이유여야 진단에서 구분된다.
      expect(signals.photos.reason).toContain("다시 요청할 수 없다");
    }
  });

  it("9. 상한을 넘으면 complete가 false다 (FR-014a)", async () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      photo(`p${i}`, `2026-08-12T${String(9 + i).padStart(2, "0")}:00:00`),
    );

    const signals = await collectDaySignals(
      stubPort({ photosBetween: async (_f, _t, limit) => many.slice(0, limit) }),
      DAY,
      { limit: 5 },
    );

    expect(signals.photos.kind).toBe("known");
    if (signals.photos.kind === "known") {
      expect(signals.photos.value.complete).toBe(false);
    }
  });

  it("10. 좌표 읽기가 일부만 실패하면 나머지로 판정한다", async () => {
    const signals = await collectDaySignals(
      stubPort({
        photosBetween: async () => [
          photo("a", "2026-08-12T09:00:00"),
          photo("b", "2026-08-12T15:00:00"),
        ],
        locationOf: async (id) =>
          id === "a" ? found(37.5665, 126.978) : { kind: "failed", reason: "이것만 실패" },
      }),
      DAY,
    );

    expect(signals.places.kind).toBe("known");
    if (signals.places.kind === "known") {
      expect(signals.places.value.photosWithLocation).toBe(1);
      expect(signals.places.value.photosConsidered).toBe(2);
    }
  });
});

describe("PermissionState 다섯 갈래가 전부 대역으로 만들어진다", () => {
  const states: PermissionState[] = ["granted", "limited", "denied", "blocked", "undetermined"];

  it("다섯 갈래 모두 신호를 만들어 낸다", async () => {
    for (const state of states) {
      const signals = await collectDaySignals(
        stubPort({ photoPermission: async () => state }),
        DAY,
      );

      // 어느 갈래에서도 던지지 않고 값이 나온다(FR-012).
      expect(["known", "none", "unknown"]).toContain(signals.photos.kind);
    }
  });
});
