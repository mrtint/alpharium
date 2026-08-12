import { createOnDeviceBackend } from "../../src/inference/on-device";

/**
 * contracts/inference.md 「온디바이스 어댑터 검증 표」.
 *
 * 모델 파일 없이 네이티브 계층에 닿는 호출의 성공 여부로 판정한다(FR-008).
 * unavailable(시뮬레이터의 예상된 상태)과 failed(실기기의 문제)를 뭉뚱그리지 않는 것이
 * 핵심이다.
 */
describe("onDeviceBackend.isAvailable", () => {
  it("location은 on-device다", () => {
    const backend = createOnDeviceBackend(async () => []);
    expect(backend.location).toBe("on-device");
  });

  it("네이티브 호출이 성공하면 loaded (실기기)", async () => {
    const backend = createOnDeviceBackend(async () => [{ name: "CPU" }]);
    await expect(backend.isAvailable()).resolves.toEqual({ kind: "loaded" });
  });

  it("네이티브 모듈이 없으면 unavailable — 시뮬레이터에서는 예상된 상태다", async () => {
    const backend = createOnDeviceBackend(async () => {
      throw new Error("RNLlama native module is not available");
    });

    const status = await backend.isAvailable();
    expect(status.kind).toBe("unavailable");
  });

  it("그 밖의 실패는 failed이고 원인이 실린다(FR-007)", async () => {
    const backend = createOnDeviceBackend(async () => {
      throw new Error("backend init crashed");
    });

    const status = await backend.isAvailable();
    expect(status).toEqual({ kind: "failed", reason: expect.stringContaining("crashed") });
  });

  it("예외를 삼키지 않는다 — 조용히 loaded로 만들지 않는다", async () => {
    const backend = createOnDeviceBackend(async () => {
      throw new Error("boom");
    });

    const status = await backend.isAvailable();
    expect(status.kind).not.toBe("loaded");
  });
});
