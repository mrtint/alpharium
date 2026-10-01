/**
 * 055 — 사진 위치 정보 판정 재료 (research R6).
 */
import { photoLocationProbe } from "../../src/app/photo-location-probe";
import type { PhotoPort } from "../../src/signals/port";

type Port = Pick<PhotoPort, "photoPermission" | "photosBetween" | "locationOf">;

function port(over: Partial<Port>): Port {
  return {
    photoPermission: async () => "granted",
    photosBetween: async () => [
      { id: "a", takenAtMs: 1 },
      { id: "b", takenAtMs: 2 },
    ],
    locationOf: async () => ({ kind: "found", latitude: 37.5, longitude: 127 }),
    ...over,
  } as Port;
}

const NOW = Date.UTC(2026, 9, 1);

describe("055 photoLocationProbe", () => {
  it("좌표를 찾았으면 ok", async () => {
    expect(await photoLocationProbe(port({}), NOW)).toBe("ok");
  });

  it("좌표가 없는 사진이어도 권한은 있다 — ok", async () => {
    expect(
      await photoLocationProbe(port({ locationOf: async () => ({ kind: "absent" }) }), NOW),
    ).toBe("ok");
  });

  it("좌표 읽기가 실패하면(권한 없음은 예외) denied, 가장 최근 사진을 본다", async () => {
    const locationOf = jest.fn(async () => ({ kind: "failed" as const, reason: "x" }));
    expect(await photoLocationProbe(port({ locationOf }), NOW)).toBe("denied");
    expect(locationOf).toHaveBeenCalledWith("b");
  });

  it("최근 사진이 없으면 no-photo", async () => {
    expect(await photoLocationProbe(port({ photosBetween: async () => [] }), NOW)).toBe("no-photo");
  });

  it("사진 권한이 granted가 아니면 읽어 보지 않는다 — unknown", async () => {
    const photosBetween = jest.fn(async () => []);
    expect(
      await photoLocationProbe(
        port({ photoPermission: async () => "limited", photosBetween }),
        NOW,
      ),
    ).toBe("unknown");
    expect(photosBetween).not.toHaveBeenCalled();
  });

  it("통로가 던지면 unknown(모르는 것을 거부로 채우지 않는다)", async () => {
    expect(
      await photoLocationProbe(
        port({
          photosBetween: async () => {
            throw new Error("no module");
          },
        }),
        NOW,
      ),
    ).toBe("unknown");
  });
});
