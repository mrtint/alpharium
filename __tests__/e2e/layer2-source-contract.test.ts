import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 073 — 층 2 소스 계약 (contracts/layer2-runner.md 「금지」).
 *
 * 기기 없는 테스트가 못 보는 위반 — 앱 데이터 전체 삭제·재설치·모델 파일 쓰기, 그리고 일기 본문을 읽어 채점하는 코드가 층 2에 들어오는 것 —
 * 을 소스를 읽어 막는다(헌법 원칙 I·IV). 소스를 읽을 때는 주석을 먼저 걷는다(이 저장소의 주석은 무엇을 금지하는가를 적는다).
 */

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const read = (...parts: string[]) => strip(readFileSync(join(process.cwd(), ...parts), "utf8"));

const files = readdirSync(join(process.cwd(), "scripts", "layer2")).filter((n) => /\.ts$/.test(n));

describe("층 2 소스 계약 (073)", () => {
  it("S0 — 스캔이 실제로 층 2 파일을 읽는다", () => {
    expect(files).toEqual(expect.arrayContaining(["flows.ts", "runner.ts", "with-sample.ts"]));
  });

  it.each(files)("S1 — %s에는 pm clear·install·uninstall이 없다", (name) => {
    const code = read("scripts", "layer2", name);
    expect(code).not.toMatch(/["'`]pm["'`]/);
    expect(code).not.toMatch(/\bpm\s+clear\b/);
    expect(code).not.toMatch(/["'`](install|uninstall)["'`]/);
  });

  it.each(files)("S2 — %s는 모델 폴더에 쓰지도 지우지도 않는다", (name) => {
    const code = read("scripts", "layer2", name);
    expect(code).not.toMatch(/(writeFile|copyFile|removeFile)\([^)]*models/);
  });

  it.each(files)("S3 — %s에는 채점·비교 어휘가 없다 (원칙 IV)", (name) => {
    const code = read("scripts", "layer2", name);
    expect(code).not.toMatch(/\b(judge|score|similar\w*|grade|rating|benchmark)\b/i);
  });

  it.each(files)("S4 — %s는 일기 본문을 읽지 않는다 (JSON 파싱·text 필드 없음)", (name) => {
    const code = read("scripts", "layer2", name);
    expect(code).not.toMatch(/JSON\.parse/);
    expect(code).not.toMatch(/\.text\b/);
  });

  it("S5 — 층 2 흐름 파일은 일기 본문 글자를 단언하지 않는다 (글자 단언은 화면 고정 문구만)", () => {
    const dir = join(process.cwd(), ".maestro");
    const flows = readdirSync(dir).filter((n) => /^layer2-.*\.yml$/.test(n));
    const allowed = /^(쓰는 중|다시 쓰기|일기 쓰기|개발자|진단|한 번 써 보기|.*다 썼어요)$/;
    for (const name of flows) {
      const lines = readFileSync(join(dir, name), "utf8")
        .split(/\r?\n/)
        .filter((l) => !l.trim().startsWith("#"));
      for (const line of lines) {
        const m = /assertVisible:\s*"([^"]+)"/.exec(line);
        if (m !== null) expect(m[1]).toMatch(allowed);
      }
    }
  });

  it("S6 — run-device-tests.mjs는 --layer2 분기(runLayer2Mode)를 갖는다", () => {
    const code = read("scripts", "run-device-tests.mjs");
    expect(code).toMatch(/async function runLayer2Mode/);
    expect(code).toMatch(/process\.argv\.includes\("--layer2"\)/);
    // 분기는 main()(pm clear 루틴)을 부르기 전에 갈린다
    expect(code.indexOf('argv.includes("--layer2")')).toBeLessThan(code.lastIndexOf("main();"));
  });
});
