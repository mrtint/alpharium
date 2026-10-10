import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 069 — 층 1 소스 계약 (I-1, I-4, I-5).
 *
 * 기기 없는 테스트가 못 보는 위반 — 「앱 데이터 전체 삭제·재설치·모델 파일 쓰기」가 층 1 코드에 들어오는 것 — 을 소스를 읽어 막는다.
 * 소스를 읽을 때는 주석을 먼저 걷는다(이 저장소의 주석은 무엇을 금지하는가를 적는다).
 */

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const read = (...parts: string[]) => strip(readFileSync(join(process.cwd(), ...parts), "utf8"));

const layer1Files = readdirSync(join(process.cwd(), "scripts", "layer1")).filter((n) =>
  /\.ts$/.test(n),
);

describe("층 1 소스 계약 (069)", () => {
  it("S0 — 스캔이 실제로 층 1 파일을 읽는다", () => {
    expect(layer1Files).toEqual(
      expect.arrayContaining(["baseline.ts", "device.ts", "fixtures.ts", "runner.ts"]),
    );
  });

  it.each(layer1Files)("I-1 — %s에는 pm clear·install·uninstall이 없다", (name) => {
    const code = read("scripts", "layer1", name);
    expect(code).not.toMatch(/["'`]pm["'`]/);
    expect(code).not.toMatch(/\bpm\s+clear\b/);
    expect(code).not.toMatch(/["'`](install|uninstall)["'`]/);
  });

  it.each(layer1Files)("I-1 — %s는 모델 폴더에 쓰지도 지우지도 않는다", (name) => {
    const code = read("scripts", "layer1", name);
    expect(code).not.toMatch(/(writeFile|copyFile|removeFile)\([^)]*models/);
    expect(code).not.toMatch(/["'`]rm["'`],\s*["'`]-r/);
  });

  it("I-4 — run-device-tests.mjs는 --layer1 분기 밖에서 기존 초기화 루틴(pm clear)을 그대로 둔다", () => {
    const code = read("scripts", "run-device-tests.mjs");
    expect(code).toMatch(/--layer1/);
    expect(code).toMatch(/"pm",\s*"clear"/);
    // 070: 층 1 실행은 표본 보장을 앞에 끼우는 래퍼(with-sample.ts)를 거쳐 runner.ts를 부른다
    expect(code).toMatch(/layer1\/(runner|with-sample)\.ts/);
  });

  it("I-5 — 층 1 목록 배열 LAYER1_FLOWS가 있다", () => {
    expect(read("scripts", "run-device-tests.mjs")).toMatch(/const LAYER1_FLOWS\s*=\s*\[/);
  });
});
