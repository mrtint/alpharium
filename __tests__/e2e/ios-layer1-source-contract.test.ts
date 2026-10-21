import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 095 — iOS 층 1 소스 계약 (I-1).
 *
 * 앱 삭제·재설치·시뮬레이터 초기화·모델 파일 쓰기가 iOS 시뮬레이터 장치에 들어오는 것을 소스를 읽어 막는다.
 * 소스를 읽을 때는 주석을 먼저 걷는다. 사진 보관함 초기화(`removeSampleFiles`)는 `scripts/e2e-sample/ios-device.ts`의 일이며
 * 거기서도 앱 데이터는 건드리지 않는다(ios-sample-device.test.ts).
 */

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const read = (...parts: string[]) => strip(readFileSync(join(process.cwd(), ...parts), "utf8"));

describe("iOS 층 1 소스 계약 (095)", () => {
  const code = read("scripts", "layer1", "ios-simulator-device.ts");

  it("S0 — 스캔이 실제로 장치 소스를 읽는다", () => {
    expect(code).toMatch(/get_app_container/);
    expect(code).toMatch(/terminate/);
  });

  it("I-1 — 앱 삭제·재설치·시뮬레이터 초기화가 없다", () => {
    expect(code).not.toMatch(/["'`](erase|uninstall|install|delete|shutdown)["'`]/);
    expect(code).not.toMatch(/\bsimctl\s+(erase|uninstall|install|delete)\b/);
  });

  it("I-1 — 모델 폴더에 쓰지도 지우지도 않고 폴더를 재귀로 지우지 않는다", () => {
    expect(code).not.toMatch(/(writeFile|copyFile|removeFile)\([^)]*models/);
    expect(code).not.toMatch(/recursive:\s*true[^}]*\n?[^}]*rmSync|rmSync\([^)]*recursive:\s*true/);
    expect(code).not.toMatch(/["'`]rm["'`],\s*["'`]-r/);
  });
});
