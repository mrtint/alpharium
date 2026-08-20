/**
 * 사용자 경로 조립 계약 테스트.
 *
 * 계약: specs/006-first-diary-app/contracts/persistence.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이것이 006이 고치려는 결함의 방어선이다.**
 *
 * 005까지 `GenerationProbe`가 어댑터를 직접 불러 파이프라인을 건너뛰었고, 그래서
 * `store.save()`가 기기에서 한 번도 실행되지 않았다. 일기가 하나도 남지 않은 원인이다.
 *
 * 여기서 검사하는 것은 **조립이 옳은 부품을 쓰는가**다:
 *  - P3: 어댑터가 `selectBackend()`에서 온다 — 직접 만들지 않는다(FR-026, SC-024)
 *  - 환경을 모르면 파이프라인을 만들지 않는다(FR-035)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createAppPipeline } from "../../src/app/wiring";
import type { EnvironmentResolution } from "../../src/config/types";

const resolved = (environment: "local" | "dev" | "prod"): EnvironmentResolution => ({
  ok: true,
  environment,
});

describe("createAppPipeline (006 contracts/persistence.md §3)", () => {
  it("dev에서 파이프라인을 만든다", () => {
    const result = createAppPipeline(resolved("dev"));

    expect(result.ok).toBe(true);
    if (result.ok) expect(typeof result.pipeline.run).toBe("function");
  });

  it("prod에서 파이프라인을 만든다", () => {
    const result = createAppPipeline(resolved("prod"));

    expect(result.ok).toBe(true);
  });

  /**
   * FR-035, R6 — **환경을 모르면 만들지 않는다.**
   *
   * `prod`로 간주하고 진행하는 것이 001이 거부한 「기본값으로 떨어지기」이며 원칙 V
   * 위반이다. 여기서 파이프라인이 나오면 그 방어가 뚫린 것이다.
   */
  it("환경 판정 실패면 파이프라인을 만들지 않고 실패를 값으로 돌려준다", () => {
    const result = createAppPipeline({ ok: false, reason: "missing", received: undefined });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("environment-unresolved");
      // 사용자에게 보일 말이 아니라 개발자용 설명이다.
      expect(result.detail.length).toBeGreaterThan(0);
    }
  });

  it("환경 판정 실패에는 pipeline 자리가 아예 없다", () => {
    const result = createAppPipeline({ ok: false, reason: "unknown", received: "prd" });

    expect(result.ok).toBe(false);
    // 타입에 자리가 없는 것이 방어다 — 있으면 언젠가 채워진다.
    expect("pipeline" in result).toBe(false);
  });

  /**
   * P3 — **어댑터가 `select.ts`에서 온다.**
   *
   * `local`의 기본 위치는 데스크톱 서버이고 dev·prod는 온디바이스다. 조립이
   * `selectBackend()`를 거친다면 그 차이가 결과에 그대로 나타난다. 직접
   * `onDeviceBackend()`를 불렀다면 셋이 모두 같아진다.
   */
  it("추론 위치가 환경에 따라 갈린다 — select.ts를 거친다는 증거 (P3)", () => {
    const dev = createAppPipeline(resolved("dev"));
    const local = createAppPipeline(resolved("local"));

    expect(dev.ok).toBe(true);
    expect(local.ok).toBe(true);
    if (dev.ok && local.ok) {
      expect(dev.location).toBe("on-device");
      // local의 기본값은 데스크톱 서버다(001 policy.ts). 직접 온디바이스를 만들었다면
      // 이 줄이 깨진다.
      expect(local.location).toBe("desktop-server");
    }
  });
});
