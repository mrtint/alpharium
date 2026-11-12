/**
 * 118 — 이어 하기 완성 알림 관찰(개발 빌드 전용 진단). 판정을 바꾸지 않는다.
 */

import { createContinuedProbe, probeAllowed } from "../../src/app/continued-probe";
import type { AutoWriteAttemptPort } from "../../src/app/auto-write-attempts";

function memoryPort() {
  const files = new Map<string, string>();
  const port: AutoWriteAttemptPort = {
    read: async (day) => files.get(day) ?? null,
    write: async (day, s) => void files.set(day, s),
    days: async () => [...files.keys()],
  };
  return { files, port };
}

describe("118 probeAllowed — 판정에 성공한 개발 환경만", () => {
  it.each([
    [{ ok: true, environment: "local" }, true],
    [{ ok: true, environment: "dev" }, true],
    [{ ok: true, environment: "prod" }, false],
    [{ ok: false }, false],
  ] as const)("%j → %s", (resolution, expected) => {
    expect(probeAllowed(resolution as never)).toBe(expected);
  });
});

describe("118 createContinuedProbe", () => {
  it("허용되지 않으면 통로를 부르지 않는다", async () => {
    const { files, port } = memoryPort();
    const probe = createContinuedProbe({
      allowed: false,
      port,
      now: () => new Date(2026, 10, 12, 10),
      readAppState: () => "background",
    });
    probe("expired");
    await new Promise((r) => setTimeout(r, 0));
    expect(files.size).toBe(0);
  });

  it("허용되면 그 순간의 시각과 앱 상태 원값으로 한 줄 남긴다", async () => {
    const { files, port } = memoryPort();
    const probe = createContinuedProbe({
      allowed: true,
      port,
      now: () => new Date(2026, 10, 12, 10),
      readAppState: () => "inactive",
    });
    probe("saved-not-background");
    await new Promise((r) => setTimeout(r, 0));
    const stored = JSON.parse([...files.values()][0] ?? "") as { items: Record<string, unknown>[] };
    expect(stored.items[0]).toMatchObject({
      path: "continued",
      probe: "saved-not-background",
      device: { appState: "inactive" },
    });
  });

  it("앱 상태 읽기가 던져도 던지지 않고 상태 없이 남긴다", async () => {
    const { files, port } = memoryPort();
    const probe = createContinuedProbe({
      allowed: true,
      port,
      now: () => new Date(2026, 10, 12, 10),
      readAppState: () => {
        throw new Error("x");
      },
    });
    expect(() => probe("expired")).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(files.size).toBe(1);
  });
});
