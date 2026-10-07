import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BatteryExceptionPort } from "../../src/schedule/battery-exception-port";

/**
 * 배터리 최적화 예외 통로의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/battery-exception.md
 *       E1·E5·E7
 *       spec.md FR-002·FR-010·원칙 IV
 *
 * 기기(`expo-intent-launcher`)에 닿는 자리이므로 소스 문자열 검사가 주된
 * 방어다.
 */

const SOURCE = readFileSync(
  join(__dirname, "../../src/schedule/battery-exception-port.ts"),
  "utf8",
);
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("E1 — 인터페이스 시그니처", () => {
  it("openSettingsList 하나만 갖는다", () => {
    const port: BatteryExceptionPort = {
      openSettingsList: async () => {},
    };
    expect(Object.keys(port)).toEqual(["openSettingsList"]);
  });
});

describe("065 — 예외를 직접 요청하지 않는다 (Google Play 정책)", () => {
  it("REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 인텐트를 쓰지 않는다", () => {
    expect(CODE).not.toMatch(/REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
    expect(CODE).not.toMatch(/requestException/);
  });

  it("config plugin이 그 권한을 매니페스트에 넣지 않는다", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const plugin = require("../../plugins/with-battery-exception") as { PERMISSIONS: string[] };
    expect(plugin.PERMISSIONS).not.toContain(
      "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    );
  });

  it("app.json이 다른 라이브러리를 거쳐 들어오는 그 권한도 걷는다(blockedPermissions)", () => {
    const app = JSON.parse(readFileSync(join(__dirname, "../../app.json"), "utf8")) as {
      expo: { android: { blockedPermissions?: string[]; permissions?: string[] } };
    };
    expect(app.expo.android.blockedPermissions).toContain(
      "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    );
    expect(app.expo.android.permissions).not.toContain(
      "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
    );
  });
});

describe("E5 / FR-002 — 정밀도를 암시하는 문구가 없다", () => {
  it("소스에 '정각' / '매일 7시' / '7:00' 문자열이 없다", () => {
    expect(SOURCE).not.toMatch(/정각|매일 (오전 )?7시|7:00|매일 7시/);
  });
});

describe("E1 — 인텐트 액션", () => {
  it("openSettingsList는 IGNORE_BATTERY_OPTIMIZATION_SETTINGS를 쓴다", () => {
    expect(CODE).toMatch(/IGNORE_BATTERY_OPTIMIZATION_SETTINGS/);
  });

  it("인텐트 실패를 밖으로 던지지 않는다 (try/catch)", () => {
    expect(CODE).toMatch(/try\s*\{/);
    expect(CODE).toMatch(/catch/);
  });
});

describe("기기 통로 — 지연 import", () => {
  it("expo-intent-launcher를 메서드 안에서 await import한다", () => {
    expect(CODE).toMatch(/await import\(["']expo-intent-launcher["']\)/);
  });

  it("모듈 최상단에서 정적 import하지 않는다", () => {
    expect(CODE).not.toMatch(/^import .* from ["']expo-intent-launcher["']/m);
  });
});
