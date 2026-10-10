import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { consentViewOf, READ_LIMIT_MS, withTimeout } from "../../src/app/consent-gate";

/**
 * 074 — 동의 게이트의 순수 판정과 읽기 한도.
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG1~CG4, spec FR-001·FR-001a·FR-002
 *
 * **모르는 것을 모바일 데이터로 단정하지 않는다**(원칙 V) — `cellular`로 확인될 때만 모바일 갈래다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/app/consent-gate.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("CG1 — consentViewOf: cellular만 모바일 갈래다", () => {
  it("cellular → cellular", () => {
    expect(consentViewOf("cellular")).toBe("cellular");
  });

  it("wifi · other(이더넷·VPN 등) · unknown(못 읽음) → standard", () => {
    expect(consentViewOf("wifi")).toBe("standard");
    expect(consentViewOf("other")).toBe("standard");
    expect(consentViewOf("unknown")).toBe("standard");
  });
});

describe("CG2 — withTimeout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("한도 안에 끝나면 그 값이다", async () => {
    const p = withTimeout(Promise.resolve("값"), 1000, "폴백");
    await expect(p).resolves.toBe("값");
  });

  it("한도를 넘기면 폴백이다", async () => {
    const never = new Promise<string>(() => {});
    const p = withTimeout(never, 1000, "폴백");
    jest.advanceTimersByTime(1000);
    await expect(p).resolves.toBe("폴백");
  });

  it("거부돼도 폴백이다", async () => {
    const p = withTimeout(Promise.reject(new Error("읽기 실패")), 1000, "폴백");
    await expect(p).resolves.toBe("폴백");
  });

  it("먼저 끝나면 타이머가 남지 않는다", async () => {
    await withTimeout(Promise.resolve(1), 1000, 0);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("CG3 — 한도는 한 곳이다", () => {
  it("READ_LIMIT_MS는 3000이다(스펙 FR-001a)", () => {
    expect(READ_LIMIT_MS).toBe(3000);
  });

  it("src/ 안에서 READ_LIMIT_MS를 정의하는 파일은 consent-gate.ts 하나다", () => {
    const root = join(__dirname, "../../src");
    const defs: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name)) {
          const code = readFileSync(full, "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "");
          if (/\bREAD_LIMIT_MS\s*=/.test(code)) defs.push(full.replace(root, "src"));
        }
      }
    };
    walk(root);
    expect(defs).toEqual([join("src", "app", "consent-gate.ts")]);
  });
});

describe("CG4 — 순수다", () => {
  it("기기 모듈을 import하지 않는다", () => {
    expect(SOURCE).not.toMatch(/expo-network|react-native|expo-file-system/);
  });

  it("Date를 읽지 않는다", () => {
    expect(SOURCE).not.toMatch(/new Date\(|Date\.now/);
  });
});
