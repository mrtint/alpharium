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
  it("requestException / openSettingsList를 갖는다", () => {
    const port: BatteryExceptionPort = {
      requestException: async () => {},
      openSettingsList: async () => {},
    };
    expect(typeof port.requestException).toBe("function");
    expect(typeof port.openSettingsList).toBe("function");
  });
});

describe("E1 / 원칙 IV — requestException은 결과를 반환하지 않는다", () => {
  it("소스에서 requestException이 Promise<void>다 (수락/거부를 측정하지 않음)", () => {
    // 반환 타입 표기 또는 body에 return 값이 없음을 본다.
    expect(CODE).toMatch(
      /requestException\s*\(\s*\)\s*:\s*Promise<void>|requestException\s*\(\s*\)\s*\{/,
    );
    const implMatch = CODE.match(/async requestException\s*\(\s*\)\s*\{[\s\S]*?\n {4}\}/);
    const body = implMatch?.[0] ?? "";
    // `return <something>;` (return; 또는 return 없음은 허용)
    expect(body).not.toMatch(/return\s+[^;\s}]/);
  });
});

describe("E5 / FR-002 — 정밀도를 암시하는 문구가 없다", () => {
  it("소스에 '정각' / '매일 7시' / '7:00' 문자열이 없다", () => {
    expect(SOURCE).not.toMatch(/정각|매일 (오전 )?7시|7:00|매일 7시/);
  });
});

describe("E1 — 인텐트 액션", () => {
  it("REQUEST_IGNORE_BATTERY_OPTIMIZATIONS를 쓴다", () => {
    expect(CODE).toMatch(/REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
  });

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
