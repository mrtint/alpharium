/**
 * 129 US3 — 시딩 사진은 판정에 성공한 개발 환경에서만 하루의 사진이다(조립 테스트).
 *
 * 실제 수집(`collectDaySignals`)과 판정(`camera-only.ts`)을 묶어, 조립부가 환경을 옳게 넘기는지 본다.
 */
import { deviceSignalsFor } from "../../src/app/wiring";
import type { EnvironmentResolution } from "../../src/config/types";
import type { PhotoPort } from "../../src/signals/port";

const DAY = "2026-08-12";
const at = (iso: string) => new Date(iso).getTime();

const port = (): PhotoPort => ({
  photoPermission: async () => "granted",
  locationPermission: async () => "denied",
  requestPhotoPermission: async () => "granted",
  requestLocationPermission: async () => "denied",
  photosBetween: async () => [
    {
      id: "seed",
      takenAtMs: at("2026-08-12T09:00:00"),
      localPath: "/storage/emulated/0/Pictures/PocketlogSeed/s.jpg",
    },
    {
      id: "cam",
      takenAtMs: at("2026-08-12T10:00:00"),
      localPath: "/storage/emulated/0/DCIM/Camera/c.jpg",
    },
  ],
  locationOf: async () => ({ kind: "absent" }),
  filePathOf: async () => null,
});

async function idsFor(resolution: EnvironmentResolution): Promise<string[]> {
  const signals = await deviceSignalsFor(resolution, port)(DAY);
  return signals.photos.kind === "known" ? signals.photos.value.photos.map((p) => p.id) : [];
}

describe("시딩 사진 인정 (129 FR-009)", () => {
  it.each<[string, EnvironmentResolution, string[]]>([
    ["local", { ok: true, environment: "local" }, ["seed", "cam"]],
    ["dev", { ok: true, environment: "dev" }, ["seed", "cam"]],
    ["prod", { ok: true, environment: "prod" }, ["cam"]],
    [
      "판정 실패",
      { ok: false, reason: "missing", received: undefined } as EnvironmentResolution,
      ["cam"],
    ],
  ])("%s → %j", async (_, resolution, expected) => {
    expect(await idsFor(resolution)).toEqual(expected);
  });
});
