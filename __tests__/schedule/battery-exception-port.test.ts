import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  expoBatteryExceptionPort,
  type BatteryExceptionPort,
} from "../../src/schedule/battery-exception-port";

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
  // 104 — 예외 상태를 읽는 `readStatus`가 더해졌다. 그 밖의 통로는 없다.
  it("openSettingsList와 readStatus 둘만 갖는다", () => {
    const port: BatteryExceptionPort = {
      openSettingsList: async () => {},
      readStatus: async () => "unknown",
    };
    expect(Object.keys(port)).toEqual(["openSettingsList", "readStatus"]);
    expect(Object.keys(expoBatteryExceptionPort()).sort()).toEqual([
      "openSettingsList",
      "readStatus",
    ]);
  });
});

describe("104 BE1~BE4 — 예외 상태 읽기", () => {
  const battery = (answer: unknown | (() => never)) => ({
    isBatteryOptimizationEnabledAsync: jest.fn(async () => {
      if (typeof answer === "function") return (answer as () => never)();
      return answer as boolean;
    }),
  });

  it("BE2: 안드로이드에서 최적화가 켜져 있으면 restricted, 꺼져 있으면 exempt", async () => {
    const on = battery(true);
    const off = battery(false);
    const restricted = expoBatteryExceptionPort({
      platform: () => "android",
      loadBattery: async () => on,
    });
    const exempt = expoBatteryExceptionPort({
      platform: () => "android",
      loadBattery: async () => off,
    });
    await expect(restricted.readStatus()).resolves.toBe("restricted");
    await expect(exempt.readStatus()).resolves.toBe("exempt");
    expect(on.isBatteryOptimizationEnabledAsync).toHaveBeenCalledTimes(1);
  });

  it("BE3: 호출이 던지거나 모듈을 못 불러오거나 boolean이 아니면 unknown이고 던지지 않는다", async () => {
    const throwing = battery(() => {
      throw new Error("native");
    });
    await expect(
      expoBatteryExceptionPort({
        platform: () => "android",
        loadBattery: async () => throwing,
      }).readStatus(),
    ).resolves.toBe("unknown");
    await expect(
      expoBatteryExceptionPort({
        platform: () => "android",
        loadBattery: async () => {
          throw new Error("no module");
        },
      }).readStatus(),
    ).resolves.toBe("unknown");
    await expect(
      expoBatteryExceptionPort({
        platform: () => "android",
        loadBattery: async () => battery("yes"),
      }).readStatus(),
    ).resolves.toBe("unknown");
    await expect(
      expoBatteryExceptionPort({
        platform: () => {
          throw new Error("no react-native");
        },
        loadBattery: async () => battery(true),
      }).readStatus(),
    ).resolves.toBe("unknown");
  });

  it("BE4: iOS에서는 expo-battery를 부르지 않고 unknown", async () => {
    const loadBattery = jest.fn(async () => battery(true));
    const port = expoBatteryExceptionPort({ platform: () => "ios", loadBattery });
    await expect(port.readStatus()).resolves.toBe("unknown");
    expect(loadBattery).not.toHaveBeenCalled();
  });
});

describe("104 BE5 — expo-battery는 호출 시점에만 불러오고 상태 외에는 남기지 않는다", () => {
  it("expo-battery를 메서드 안에서 await import한다 (정적 import 없음)", () => {
    expect(CODE).toMatch(/import\(["']expo-battery["']\)/);
    expect(CODE).not.toMatch(/^import .* from ["']expo-battery["']/m);
  });

  it("배터리 잔량·충전 상태 같은 다른 값을 읽지 않는다 (원칙 IV)", () => {
    expect(CODE).not.toMatch(/getBatteryLevelAsync|getBatteryStateAsync|getPowerStateAsync/);
    expect(CODE).toMatch(/isBatteryOptimizationEnabledAsync/);
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

  // 066 — `import("react-native")`는 Metro가 index의 모든 getter를 훑어(`metroImportAll`)
  // iOS에서 `PushNotificationIOS`가 던지고, 그 예외는 try/catch를 지나쳐 앱을 죽인다.
  it("react-native는 동적 import가 아니라 호출 시점 require로 읽는다", () => {
    expect(CODE).not.toMatch(/import\(\s*["']react-native["']\s*\)/);
    expect(CODE).toMatch(/require\(\s*["']react-native["']\s*\)/);
  });
});
