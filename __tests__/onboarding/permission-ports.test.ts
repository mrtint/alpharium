import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LocationPermissionPort } from "../../src/onboarding/location-permission-port";
import type { OsSettingsPort } from "../../src/onboarding/os-settings-port";

/**
 * 권한 통로의 계약 테스트 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/permission-ports.md P5
 *
 * 기기(`expo-location`, `react-native` Linking)에 닿는 자리이므로 소스 문자열
 * 검사가 주된 방어다. 응답 매핑은 순수하게 뽑아 검사한다.
 */

const LOC_SRC = readFileSync(
  join(__dirname, "../../src/onboarding/location-permission-port.ts"),
  "utf8",
);
const LOC_CODE = LOC_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const OS_SRC = readFileSync(join(__dirname, "../../src/onboarding/os-settings-port.ts"), "utf8");
const OS_CODE = OS_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("P2 — LocationPermissionPort 인터페이스", () => {
  it("status / request를 갖는다", () => {
    const port: LocationPermissionPort = {
      status: async () => "undetermined",
      request: async () => "granted",
    };
    expect(typeof port.status).toBe("function");
    expect(typeof port.request).toBe("function");
  });

  it("expo-location의 foreground API를 지연 import한다", () => {
    expect(LOC_CODE).toMatch(/await import\(\s*["']expo-location["']\s*\)/);
    expect(LOC_CODE).toContain("getForegroundPermissionsAsync");
    expect(LOC_CODE).toContain("requestForegroundPermissionsAsync");
  });

  it("status는 요청 함수를 부르지 않는다 (004 FR-011 계승)", () => {
    const statusFn = LOC_CODE.match(/async status\s*\(\s*\)\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? "";
    expect(statusFn).not.toContain("requestForegroundPermissionsAsync");
  });

  it("순수 판정 계층(decision·requirements)을 import하지 않는다", () => {
    expect(LOC_CODE).not.toMatch(/from\s+["']\.\/decision["']/);
    expect(LOC_CODE).not.toMatch(/from\s+["']\.\/requirements["']/);
  });
});

describe("P2 — 응답 매핑 (canAskAgain:false → blocked)", () => {
  // 소스에서 매핑 함수를 뽑아 동작을 확인한다(런타임 import 없이).
  it("granted / undetermined / denied / blocked 4갈래를 다룬다", () => {
    expect(LOC_CODE).toMatch(/status === ["']granted["'][\s\S]*return ["']granted["']/);
    expect(LOC_CODE).toMatch(/status === ["']undetermined["'][\s\S]*return ["']undetermined["']/);
    expect(LOC_CODE).toMatch(/canAskAgain === false[\s\S]*["']blocked["']/);
    expect(LOC_CODE).toMatch(/["']denied["']/);
  });
});

describe("P3 — OsSettingsPort", () => {
  it("openAppSettings를 갖는다", () => {
    const port: OsSettingsPort = { openAppSettings: async () => {} };
    expect(typeof port.openAppSettings).toBe("function");
  });

  it("Linking.openSettings를 지연 import로 부른다", () => {
    expect(OS_CODE).toMatch(/await import\(\s*["']react-native["']\s*\)/);
    expect(OS_CODE).toContain("openSettings");
  });

  it("try/catch로 감싸 예외를 밖으로 던지지 않는다", () => {
    const fn = OS_CODE.match(/async openAppSettings\s*\(\s*\)\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? "";
    expect(fn).toContain("try");
    expect(fn).toContain("catch");
  });

  it("순수 판정 계층을 import하지 않는다", () => {
    expect(OS_CODE).not.toMatch(/from\s+["']\.\/decision["']/);
    expect(OS_CODE).not.toMatch(/from\s+["']\.\/requirements["']/);
  });
});
