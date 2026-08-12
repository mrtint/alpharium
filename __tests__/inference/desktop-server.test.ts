import { createDesktopServerBackend } from "../../src/inference/desktop-server";

/**
 * contracts/inference.md 「데스크톱 서버 어댑터」.
 *
 * 이 파일에서 가장 중요한 것은 마지막 테스트다 — 서버에 닿지 못했을 때 대체 응답을
 * 반환하지 않는다는 것. 헌법 원칙 I이 명시적으로 금지한다(FR-016).
 */
describe("desktopServerBackend.isAvailable", () => {
  it("location은 desktop-server다", () => {
    const backend = createDesktopServerBackend("http://localhost:8080", async () => true);
    expect(backend.location).toBe("desktop-server");
  });

  it("서버가 응답하면 loaded", async () => {
    const backend = createDesktopServerBackend("http://localhost:8080", async () => true);
    await expect(backend.isAvailable()).resolves.toEqual({ kind: "loaded" });
  });

  it("서버가 꺼져 있으면 failed이고 원인이 실린다", async () => {
    const backend = createDesktopServerBackend("http://localhost:8080", async () => {
      throw new Error("ECONNREFUSED");
    });

    const status = await backend.isAvailable();
    expect(status).toEqual({
      kind: "failed",
      reason: expect.stringContaining("ECONNREFUSED"),
    });
  });

  it("서버가 오류 응답을 주면 failed", async () => {
    const backend = createDesktopServerBackend("http://localhost:8080", async () => false);
    const status = await backend.isAvailable();
    expect(status.kind).toBe("failed");
  });

  describe("헌법 원칙 I — 대체 응답 금지", () => {
    it("닿지 못했을 때 loaded로 위장하지 않는다(FR-016)", async () => {
      const backend = createDesktopServerBackend("http://localhost:8080", async () => {
        throw new Error("ECONNREFUSED");
      });

      const status = await backend.isAvailable();
      // 닿지 못했다는 사실이 결과다. 대신 만든 답이 결과가 아니다.
      expect(status.kind).toBe("failed");
      expect(status.kind).not.toBe("loaded");
    });

    it("주소가 없으면 failed — 조용히 어딘가로 접속하지 않는다", async () => {
      const backend = createDesktopServerBackend(undefined, async () => true);
      const status = await backend.isAvailable();
      expect(status.kind).toBe("failed");
    });
  });
});
