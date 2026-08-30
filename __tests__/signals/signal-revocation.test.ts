/**
 * 백그라운드 자동 생성 중 권한이 회수될 때 신호 계층의 방어.
 *
 * 계약: specs/024-background-stability-exceptions/contracts/signal-revocation.md
 *       SR1·SR2·SR3·SR4·SR6
 *       spec.md FR-006·FR-007·FR-008·US3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`src/signals/collect.ts`는 대개 이미 이 계약을 담고 있다**(004 FR-007·
 * FR-012·FR-016). 이 스위트의 목적은 그 방어를 **백그라운드·실행 중 회수
 * 타이밍에서도 성립함을 명시적으로 잠그는 것**이다.
 *
 * `collect.test.ts`가 이미 C1에서 "granted 아닌 넷 → unknown"을 검사한다.
 * 여기서는 그것과 겹치지 않는 각도를 본다:
 *  - SR1: "never none" 단정을 명시적으로(권한 상태별로).
 *  - SR2: 조회는 granted인데 photosBetween이 던지는 경우(조회~접근 사이 회수).
 *  - SR3: 사진이 known인데 locationOf가 전부 던지는 경우(위치만 실행 중 회수).
 *  - SR4: 포트가 계약을 어겨도 collectDaySignals가 던지지 않는다.
 *  - SR6: 경계 — collect.ts가 schedule/·prompt·store를 import하지 않고
 *         새 SignalValue 갈래를 만들지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { collectDaySignals } from "../../src/signals/collect";
import type { PermissionState, PhotoFacts, PhotoPort } from "../../src/signals/port";

const DAY = "2026-08-27";
const at = (iso: string) => new Date(iso).getTime();

type PortOverrides = {
  photoPermission?: PermissionState;
  photos?: PhotoFacts[];
  photosBetween?: PhotoPort["photosBetween"];
  locationOf?: PhotoPort["locationOf"];
};

function fakePort(overrides: PortOverrides = {}): PhotoPort {
  const photoPermission = overrides.photoPermission ?? "granted";
  return {
    photoPermission: async () => photoPermission,
    locationPermission: async () => "denied",
    requestPhotoPermission: async () => photoPermission,
    requestLocationPermission: async () => "denied",
    photosBetween:
      overrides.photosBetween ??
      (async (fromMs, toMs) =>
        (overrides.photos ?? []).filter(
          (p) => p.takenAtMs === null || (p.takenAtMs >= fromMs && p.takenAtMs < toMs),
        )),
    locationOf: overrides.locationOf ?? (async () => ({ kind: "absent" as const })),
    filePathOf: async () => null,
    folderNamesFor: async () => new Map(),
  };
}

const threePhotos: PhotoFacts[] = [
  { id: "a", takenAtMs: at("2026-08-27T09:00:00") },
  { id: "b", takenAtMs: at("2026-08-27T13:00:00") },
  { id: "c", takenAtMs: at("2026-08-27T18:00:00") },
];

describe("SR1 — granted가 아닌 모든 권한 상태 → unknown, never none", () => {
  const states: PermissionState[] = ["limited", "denied", "blocked", "undetermined"];

  it.each(states)("%s → photos.kind === 'unknown' (none 아님)", async (state) => {
    const signals = await collectDaySignals(fakePort({ photoPermission: state }), DAY);
    expect(signals.photos.kind).toBe("unknown");
    expect(signals.photos.kind).not.toBe("none");
  });

  it.each(states)("%s → unknown 이유 문자열이 비어 있지 않다", async (state) => {
    const signals = await collectDaySignals(fakePort({ photoPermission: state }), DAY);
    if (signals.photos.kind !== "unknown") throw new Error("expected unknown");
    expect(signals.photos.reason.trim().length).toBeGreaterThan(0);
  });

  it("사진이 3장 보여도 limited면 none이 아니라 unknown이다", async () => {
    const signals = await collectDaySignals(
      fakePort({ photoPermission: "limited", photos: threePhotos }),
      DAY,
    );
    expect(signals.photos.kind).toBe("unknown");
  });
});

describe("SR2 — 조회는 granted, 접근이 던짐 (실행 중 회수)", () => {
  it("photosBetween이 던지면 photos.kind === 'unknown' (none 아님)", async () => {
    const port = fakePort({
      photoPermission: "granted",
      photosBetween: async () => {
        throw new Error("SecurityException: permission revoked mid-run");
      },
    });
    const signals = await collectDaySignals(port, DAY);
    expect(signals.photos.kind).toBe("unknown");
    expect(signals.photos.kind).not.toBe("none");
  });

  it("photosBetween이 던진 이유가 unknown reason에 담긴다", async () => {
    const port = fakePort({
      photoPermission: "granted",
      photosBetween: async () => {
        throw new Error("permission revoked mid-run");
      },
    });
    const signals = await collectDaySignals(port, DAY);
    if (signals.photos.kind !== "unknown") throw new Error("expected unknown");
    expect(signals.photos.reason).toMatch(/조회하지 못했다|permission revoked mid-run/);
  });
});

describe("SR3 — 위치 실패가 사진을 무너뜨리지 않는다", () => {
  it("photos가 unknown이면 places도 unknown이고, 이유가 '사진을 보지 못해...' 계열이다", async () => {
    const signals = await collectDaySignals(fakePort({ photoPermission: "denied" }), DAY);
    expect(signals.places.kind).toBe("unknown");
    if (signals.places.kind !== "unknown") throw new Error("expected unknown");
    expect(signals.places.reason).toMatch(/사진을 (보지|보지 못해|못 봐)/);
  });

  it("사진은 known인데 locationOf가 전부 던지면 places만 unknown, 사진 신호는 살아 있다", async () => {
    const port = fakePort({
      photoPermission: "granted",
      photos: threePhotos,
      locationOf: async () => {
        throw new Error("location permission revoked mid-run");
      },
    });
    const signals = await collectDaySignals(port, DAY);

    // 사진은 조회에 성공했으므로 known으로 살아 있다.
    expect(signals.photos.kind).toBe("known");
    // 좌표만 무너졌다.
    expect(signals.places.kind).toBe("unknown");
    expect(signals.places.kind).not.toBe("none");
  });
});

describe("SR4 — 어떤 경우에도 던지지 않는다", () => {
  it("photoPermission이 던져도 collectDaySignals는 DaySignals를 반환한다", async () => {
    const port = fakePort();
    port.photoPermission = async () => {
      throw new Error("port contract violated");
    };
    const signals = await collectDaySignals(port, DAY);
    expect(signals.date).toBe(DAY);
    expect(signals.photos.kind).toBe("unknown");
  });

  it("photosBetween과 locationOf가 둘 다 던져도 던지지 않는다", async () => {
    const port = fakePort({
      photoPermission: "granted",
      photosBetween: async () => {
        throw new Error("boom");
      },
      locationOf: async () => {
        throw new Error("boom");
      },
    });
    await expect(collectDaySignals(port, DAY)).resolves.toBeDefined();
  });
});

describe("SR6 — 경계 유지 (소스 검사)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/signals/collect.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("collect.ts는 src/schedule/를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*schedule\//);
  });

  it("collect.ts는 diary/prompt·diary/store·diary/acceptance를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\/(prompt|store|acceptance)["']/);
  });

  it("collect.ts가 반환하는 SignalValue 갈래는 known/none/unknown뿐이다", () => {
    // `return { kind: "..." }` 형태(SignalValue 반환)만 본다. `outcome.kind`
    // 비교(LocationOutcome의 found/absent/failed)는 포트 타입이라 대상 아님.
    const returned = [...CODE.matchAll(/return\s*\{\s*kind:\s*["']([a-z-]+)["']/g)].map(
      (m) => m[1],
    );
    expect(returned.length).toBeGreaterThan(0);
    for (const k of returned) {
      expect(["known", "none", "unknown"]).toContain(k);
    }
  });
});
