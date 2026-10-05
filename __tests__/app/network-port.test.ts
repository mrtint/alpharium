/**
 * 059 — 연결 종류 읽기 (계약 RD5·RD7, research R5).
 *
 * `expo-network`를 목으로 갈아끼운다 — 실제 연결 판정은 실기기에서 본다(quickstart 3). 「모바일」은 `CELLULAR`가 확인될 때만이다 —
 * VPN·이더넷은 Wi-Fi 위일 수 있어 `other`다(원칙 V).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { readConnection } from "../../src/app/network-port";

const TYPES = {
  NONE: "NONE",
  UNKNOWN: "UNKNOWN",
  CELLULAR: "CELLULAR",
  WIFI: "WIFI",
  BLUETOOTH: "BLUETOOTH",
  ETHERNET: "ETHERNET",
  WIMAX: "WIMAX",
  VPN: "VPN",
  OTHER: "OTHER",
};

/** 가짜 모듈 — `getNetworkStateAsync`가 주어진 결과(또는 오류)를 준다 */
function fake(result: { type: string } | Error) {
  return async () =>
    ({
      NetworkStateType: TYPES,
      getNetworkStateAsync: async () => {
        if (result instanceof Error) throw result;
        return { ...result, isConnected: true };
      },
    }) as never;
}

describe("RD5 — readConnection", () => {
  it.each([
    ["WIFI", "wifi"],
    ["CELLULAR", "cellular"],
    ["ETHERNET", "other"],
    ["VPN", "other"],
    ["BLUETOOTH", "other"],
    ["OTHER", "other"],
    ["NONE", "other"],
    ["UNKNOWN", "other"],
  ])("%s → %s", async (type, expected) => {
    expect(await readConnection(fake({ type }))).toBe(expected);
  });

  it("던지면 unknown", async () => {
    expect(await readConnection(fake(new Error("native module missing")))).toBe("unknown");
  });

  it("모듈을 여는 것 자체가 실패해도 unknown", async () => {
    expect(
      await readConnection(async () => {
        throw new Error("no module");
      }),
    ).toBe("unknown");
  });
});

describe("RD7 — expo-network 는 이 파일 하나만 import 한다", () => {
  it("src 전체에서 network-port.ts 만 import 하고 지연 import 다", () => {
    const root = join(__dirname, "../../src");
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name)) {
          const code = readFileSync(full, "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "");
          if (/["']expo-network["']/.test(code)) users.push(name);
        }
      }
    };
    walk(root);
    expect(users).toEqual(["network-port.ts"]);
    const code = readFileSync(join(root, "app/network-port.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).toMatch(/\bimport\(["']expo-network["']\)/);
    expect(code).not.toMatch(/^import .* from ["']expo-network["']/m);
  });

  it("package.json 의 직접 의존성에 있다", () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["expo-network"]).toBeDefined();
  });
});
