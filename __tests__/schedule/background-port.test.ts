import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BackgroundSchedulePort } from "../../src/schedule/background-port";

/**
 * 백그라운드 태스크 등록 통로의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/background-generation.md
 *       B4
 *       spec.md FR-003·FR-003a
 *
 * 기기(`expo-background-task`)에 닿는 자리이므로 소스 문자열 검사가 주된
 * 방어다 — 007·009·012 관례.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/schedule/background-port.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("B4 — 인터페이스 시그니처", () => {
  it("BackgroundSchedulePort가 register/unregister/reschedule를 갖는다", () => {
    // 타입만 확인 — 컴파일이 통과하면 시그니처가 맞다.
    const port: BackgroundSchedulePort = {
      register: async () => {},
      unregister: async () => {},
      reschedule: async () => {},
    };
    expect(typeof port.register).toBe("function");
    expect(typeof port.unregister).toBe("function");
    expect(typeof port.reschedule).toBe("function");
  });
});

describe("B4 — MINIMUM_INTERVAL_MINUTES는 이 파일 상수 (15)", () => {
  it("소스에 minimumInterval: 15 (또는 MINIMUM_INTERVAL_MINUTES = 15)이 있다", () => {
    expect(CODE).toMatch(/MINIMUM_INTERVAL_MINUTES\s*=\s*15/);
  });

  it("register가 minimumInterval을 넘긴다", () => {
    expect(CODE).toMatch(/minimumInterval/);
  });

  it("MINIMUM_INTERVAL_MINUTES를 export하지 않는다 — 값이 이 파일에만", () => {
    expect(CODE).not.toMatch(/export\s+(const|let)\s+MINIMUM_INTERVAL_MINUTES/);
  });
});

describe("B4 — register는 목표 시각을 파라미터로 받지 않는다", () => {
  it("register 시그니처에 hour/targetHour 인자가 없다 (콜백이 설정에서 읽는다)", () => {
    const fnMatch = CODE.match(/register\s*\([^)]*\)/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch?.[0] ?? "").not.toMatch(/hour|target/i);
  });
});

describe("B4 — reschedule = unregister → register 순서", () => {
  it("reschedule 본문이 unregister를 먼저, register를 나중에 부른다", () => {
    // 구현부(`async reschedule()` 또는 `reschedule() {`)를 찾는다 —
    // 인터페이스 선언(`reschedule(): Promise<void>;`)이 아니라.
    const implMatch = CODE.match(/reschedule\s*\(\s*\)\s*\{[\s\S]*?\n {4}\}/);
    expect(implMatch).not.toBeNull();
    const body = implMatch?.[0] ?? "";
    const unregIdx = body.indexOf("unregister");
    const regIdx = body.search(/register\(\)/);
    expect(unregIdx).toBeGreaterThanOrEqual(0);
    expect(regIdx).toBeGreaterThan(unregIdx);
  });
});

describe("기기 통로 — 지연 import", () => {
  it("expo-background-task를 메서드 안에서 await import한다", () => {
    expect(CODE).toMatch(/await import\(["']expo-background-task["']\)/);
  });

  it("모듈 최상단에서 expo-background-task를 정적 import하지 않는다", () => {
    expect(CODE).not.toMatch(/^import .* from ["']expo-background-task["']/m);
  });
});
