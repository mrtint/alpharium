import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 095 — iOS 층 2 소스 계약 (I-1).
 *
 * 앱 삭제·재설치·모델 폴더 변경이 iPhone 장치·실행기에 들어오는 것을 소스를 읽어 막는다. 주석을 먼저 걷는다.
 */

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const read = (...parts: string[]) => strip(readFileSync(join(process.cwd(), ...parts), "utf8"));

describe("iOS 층 2 소스 계약 (095)", () => {
  const device = read("scripts", "layer2-ios", "device.ts");
  const runner = read("scripts", "layer2-ios", "runner.ts");
  const appDelete = read("scripts", "layer2-ios", "app-delete.ts");
  const run = read("scripts", "layer2-ios", "run.ts");
  const all = [device, runner, appDelete, run];

  it("S0 — 스캔이 실제로 장치·삭제 소스를 읽는다", () => {
    expect(device).toMatch(/appDataContainer/);
    expect(appDelete).toMatch(/"unlink"/);
  });

  it("I-1 — devicectl copy to에 --remove-existing-content를 쓰지 않는다 (대상의 부모를 통째로 비운다 — 실측으로 모델이 지워졌다)", () => {
    for (const code of all) {
      expect(code).not.toMatch(/remove-existing-content/);
      expect(code).not.toMatch(/removeExistingContent/);
    }
  });

  it("I-1 — 앱 삭제·재설치가 없다", () => {
    for (const code of all) {
      expect(code).not.toMatch(/["'`](uninstall|install)["'`]/);
      expect(code).not.toMatch(/devicectl\s+device\s+(uninstall|install)/);
    }
  });

  it("I-1 — 지울 수 있는 디렉터리는 preferences·diary·vision-cache 셋이고 models가 없다", () => {
    expect(appDelete).toMatch(
      /DELETABLE_DIRECTORIES\s*=\s*\[\s*"preferences",\s*"diary",\s*"vision-cache"\s*\]/,
    );
    expect(appDelete).not.toMatch(/DELETABLE_DIRECTORIES[^\]]*models/);
  });

  it("I-1 — 파일 삭제(unlink)는 app-delete.ts 한 곳에만 있고, 그 앞에 허용 경로 검사가 있다", () => {
    expect(appDelete).toMatch(/isDeletable\(p\)/);
    for (const code of [device, runner, run]) expect(code).not.toMatch(/unlink|removeItemAtPath/);
  });

  it("I-1 — 실행기는 모델 폴더에 쓰지도 지우지도 않는다", () => {
    expect(runner).not.toMatch(/(writeFile|copyFile|removeFile)\([^)]*models/);
  });

  it("FR-012 — 실행기는 일기 본문을 점수화·비교하지 않는다 (원칙 IV)", () => {
    expect(runner).not.toMatch(/\bscore|similar|quality|compare|levenshtein/i);
  });
});
