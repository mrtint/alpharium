import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { OsSettingsPort } from "../../src/onboarding/os-settings-port";

/**
 * 권한 통로의 계약 테스트 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/permission-ports.md P5
 *
 * 기기(`react-native` Linking)에 닿는 자리이므로 소스 문자열
 * 검사가 주된 방어다. 응답 매핑은 순수하게 뽑아 검사한다.
 *
 * 121 — 위치 권한 통로(`location-permission-port.ts`, P2)를 걷었다. 앱이 위치 권한을 요청하지 않는다.
 */

const OS_SRC = readFileSync(join(__dirname, "../../src/onboarding/os-settings-port.ts"), "utf8");
const OS_CODE = OS_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("P3 — OsSettingsPort", () => {
  it("openAppSettings를 갖는다", () => {
    const port: OsSettingsPort = { openAppSettings: async () => {} };
    expect(typeof port.openAppSettings).toBe("function");
  });

  it("Linking.openSettings를 호출 시점 require로 부른다", () => {
    expect(OS_CODE).toMatch(/require\(\s*["']react-native["']\s*\)/);
    expect(OS_CODE).toContain("openSettings");
  });

  // 066 — `import("react-native")`는 Metro가 index의 모든 getter를 훑어(`metroImportAll`)
  // iOS에서 `PushNotificationIOS`가 던지고, 그 예외는 try/catch를 지나쳐 앱을 죽인다.
  it("react-native를 동적 import하지 않는다", () => {
    expect(OS_CODE).not.toMatch(/import\(\s*["']react-native["']\s*\)/);
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
