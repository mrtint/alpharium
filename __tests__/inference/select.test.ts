import { resolveEnvironment } from "../../src/config/environment";
import { selectBackend, selectLocation } from "../../src/inference/select";

/**
 * contracts/environment.md 「어댑터 선택」의 검증 표 10행.
 *
 * selectLocation은 추론 위치를 고르는 유일한 지점이다(FR-025).
 */
const resolved = (raw: string) => resolveEnvironment(raw);
const unresolved = () => resolveEnvironment("staging");

describe("selectLocation", () => {
  describe("local — 기본값은 서버, 온디바이스도 고를 수 있다", () => {
    it("요청 없으면 desktop-server", () => {
      expect(selectLocation(resolved("local"))).toEqual({
        ok: true,
        location: "desktop-server",
      });
    });

    it("on-device 요청은 허용된다", () => {
      expect(selectLocation(resolved("local"), "on-device")).toEqual({
        ok: true,
        location: "on-device",
      });
    });

    it("desktop-server 요청은 허용된다", () => {
      expect(selectLocation(resolved("local"), "desktop-server")).toEqual({
        ok: true,
        location: "desktop-server",
      });
    });
  });

  describe("dev — 온디바이스만", () => {
    it("요청 없으면 on-device", () => {
      expect(selectLocation(resolved("dev"))).toEqual({ ok: true, location: "on-device" });
    });

    it("on-device 요청은 허용된다", () => {
      expect(selectLocation(resolved("dev"), "on-device")).toEqual({
        ok: true,
        location: "on-device",
      });
    });

    it("desktop-server 요청은 차단된다(FR-012)", () => {
      expect(selectLocation(resolved("dev"), "desktop-server")).toEqual({
        ok: false,
        reason: "location-forbidden",
        requested: "desktop-server",
        environment: "dev",
      });
    });
  });

  describe("prod — 온디바이스만", () => {
    it("요청 없으면 on-device", () => {
      expect(selectLocation(resolved("prod"))).toEqual({ ok: true, location: "on-device" });
    });

    it("desktop-server 요청은 차단된다(FR-012)", () => {
      expect(selectLocation(resolved("prod"), "desktop-server")).toEqual({
        ok: false,
        reason: "location-forbidden",
        requested: "desktop-server",
        environment: "prod",
      });
    });
  });

  describe("환경 판정 실패 — 어떤 위치도 고르지 않는다(FR-009b)", () => {
    it("요청 없음", () => {
      expect(selectLocation(unresolved())).toEqual({
        ok: false,
        reason: "environment-unresolved",
      });
    });

    it("on-device를 요청해도 무시한다 — 환경을 모르면 허용 여부를 판단할 근거가 없다", () => {
      expect(selectLocation(unresolved(), "on-device")).toEqual({
        ok: false,
        reason: "environment-unresolved",
      });
    });
  });

  it("차단된 요청을 조용히 다른 값으로 바꿔치기하지 않는다(FR-009c)", () => {
    // 요청과 다른 것을 조용히 하면 호출자가 무엇이 일어났는지 모른다.
    const result = selectLocation(resolved("prod"), "desktop-server");
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("location");
  });
});

describe("selectBackend — 어댑터 수준의 불변식", () => {
  const serverUrl = "http://localhost:8080";

  it.each(["dev", "prod"] as const)(
    "%s에서 데스크톱 서버 어댑터를 반환하지 않는다(FR-012)",
    (env) => {
      const result = selectBackend(resolved(env), "desktop-server", serverUrl);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("location-forbidden");
    },
  );

  it.each(["dev", "prod"] as const)("%s의 기본 어댑터는 on-device다", (env) => {
    const result = selectBackend(resolved(env), undefined, serverUrl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backend.location).toBe("on-device");
  });

  it("local의 기본 어댑터는 desktop-server다", () => {
    const result = selectBackend(resolved("local"), undefined, serverUrl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backend.location).toBe("desktop-server");
  });

  it("local에서 on-device도 고를 수 있다(FR-011)", () => {
    const result = selectBackend(resolved("local"), "on-device", serverUrl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backend.location).toBe("on-device");
  });

  it("환경 판정 실패 시 어떤 어댑터도 반환하지 않는다(FR-009b)", () => {
    const result = selectBackend(unresolved(), undefined, serverUrl);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("backend");
  });

  it("차단 시 무엇이 왜 막혔는지 detail에 실린다(FR-009c)", () => {
    const result = selectBackend(resolved("prod"), "desktop-server", serverUrl);
    if (!result.ok) {
      expect(result.detail).toContain("prod");
      expect(result.detail).toContain("desktop-server");
    }
  });
});

/**
 * 007 contracts/selection.md §3 — 끊긴 배선 잇기.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **005 FR-014b(앱이 앞을 벗어나면 끊는다)가 실기기에서 한 번도 돈 적이 없었다.**
 *
 * `on-device.ts`가 `StoppableBackend`를 만들고 `DiaryHomeScreen`이 `stop?`을 받는데,
 * **그 사이의 `selectBackend`가 `InferenceBackend`로 좁혀 돌려주어 `stop`이 타입에서
 * 사라졌다.** 그래서 `App.tsx`가 넘길 것이 없었다.
 *
 * **`stop?`이 옵셔널이라 타입 검사가 통과했고**, 화면 테스트는 prop을 직접 주입하므로
 * 초록불이었다 — 006의 `GenerationProbe`가 파이프라인을 건너뛴 것과 같은 종류의 결함이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("selectBackend — 끊을 수 있는 어댑터를 좁히지 않는다 (007 §3)", () => {
  const serverUrl = "http://localhost:8080";

  it("온디바이스 어댑터에는 stop이 있다", () => {
    const result = selectBackend(resolved("dev"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      // **타입에서 사라지지 않아야 한다** — 여기가 배선이 끊겨 있던 자리다.
      expect(typeof result.backend.stop).toBe("function");
    }
  });

  it("local에서 on-device를 고를 때도 stop이 있다", () => {
    const result = selectBackend(resolved("local"), "on-device", serverUrl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(typeof result.backend.stop).toBe("function");
  });

  it("데스크톱 어댑터에는 stop이 없어도 된다(005 FR-025)", () => {
    // **넓히지 않는다.** 데스크톱에는 끊을 것이 없고 파이프라인이 알 필요가 없다.
    const result = selectBackend(resolved("local"), "desktop-server", serverUrl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backend.stop).toBeUndefined();
  });
});
