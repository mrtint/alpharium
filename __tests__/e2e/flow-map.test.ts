import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  checkFlowMap,
  parseTables,
  pathsIn,
  stringArray,
  type FlowMapInput,
} from "../../scripts/layer1/flow-map";

/**
 * 069 — 기능→흐름 대응표 정합성 (contracts/flow-map.md M-1~M-10).
 *
 * 표가 실제 흐름 파일·`FLOWS`·`LAYER1_FLOWS`와 맞는지 본다. 위반 주입(V1~V6)은 진짜 문서를 일부러 깨뜨려 검사가 잡는지 본다 —
 * 「치환이 실제로 적용됐는가」를 먼저 단언한다(AGENTS 「위반 주입」).
 */

const ROOT = process.cwd();
const DOC = readFileSync(join(ROOT, "docs", "e2e", "feature-flow-map.md"), "utf8");
const RUNNER = readFileSync(join(ROOT, "scripts", "run-device-tests.mjs"), "utf8");

function flowFiles(dir: string, base = ".maestro"): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${base}/${name}`;
    if (statSync(join(ROOT, dir, name)).isDirectory()) return flowFiles(join(dir, name), rel);
    return name.endsWith(".yml") ? [rel] : [];
  });
}

const NEW_FLOWS = [
  ".maestro/restart-persistence.yml",
  ".maestro/single-photo-swipe.yml",
  ".maestro/settings-developer-sweep.yml",
];

const strip = (source: string) =>
  source
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");

/** 픽스처 틀의 사람이 쓴 글(제목·본문 문장)을 조각으로 */
function fixtureTexts(): string[] {
  const dir = join(ROOT, "scripts", "e2e-fixtures", "diary");
  return readdirSync(dir).flatMap((name) => {
    const entry = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      text: string;
      title?: string;
    };
    return [entry.title ?? "", ...entry.text.split(/[.!?]\s*/)].filter((s) => s.length >= 6);
  });
}

function realInput(doc = DOC): FlowMapInput {
  return {
    doc,
    flowFiles: flowFiles(".maestro"),
    exists: (path) => existsSync(join(ROOT, path)),
    flows: stringArray(RUNNER, "FLOWS"),
    layer1: stringArray(RUNNER, "LAYER1_FLOWS"),
    newFlows: NEW_FLOWS,
    newFlowSources: Object.fromEntries(
      NEW_FLOWS.map((f) => [f, strip(readFileSync(join(ROOT, f), "utf8"))]),
    ),
    fixtureTexts: fixtureTexts(),
  };
}

describe("기능→흐름 대응표 (069)", () => {
  it("M0 — 스캔이 실제로 흐름 파일과 두 배열을 읽었다", () => {
    const input = realInput();
    expect(input.flowFiles.length).toBeGreaterThan(20);
    expect(input.flows.length).toBeGreaterThan(20);
    expect(input.layer1.length).toBeGreaterThanOrEqual(3);
    expect(input.fixtureTexts.length).toBeGreaterThan(3);
  });

  it("M-1~M-10 — 진짜 문서는 위반이 없다", () => {
    expect(checkFlowMap(realInput())).toEqual([]);
  });

  it("M-4 — LAYER1_FLOWS는 FLOWS의 부분집합이다", () => {
    const input = realInput();
    for (const file of input.layer1) expect(input.flows).toContain(file);
  });

  it("M-8 — 새 흐름 셋은 FLOWS와 LAYER1_FLOWS 양쪽에 있다", () => {
    const input = realInput();
    for (const file of NEW_FLOWS) {
      expect(input.flows).toContain(file);
      expect(input.layer1).toContain(file);
    }
  });

  it("M-9 — 실행기 주석은 대응표 경로를 가리키고 표 내용을 복제하지 않는다", () => {
    expect(RUNNER).toContain("docs/e2e/feature-flow-map.md");
    expect(RUNNER).not.toContain("| 흐름 파일 |");
    expect(RUNNER).not.toContain("| 기능 |");
  });

  it("T1 — 표 파서가 두 표를 읽는다", () => {
    const tables = parseTables(DOC);
    expect(Object.keys(tables)).toEqual(expect.arrayContaining(["기능", "흐름 파일"]));
    expect(pathsIn("`.maestro/a.yml`, `__tests__/b.test.ts`, `src/x.ts`")).toEqual([
      ".maestro/a.yml",
      "__tests__/b.test.ts",
    ]);
  });

  describe("위반 주입 — 검사가 잡는가", () => {
    const mutate = (from: string, to: string) => {
      expect(DOC).toContain(from); // 치환이 실제로 적용될 자리가 있다
      const mutated = DOC.replace(from, to);
      expect(mutated).not.toBe(DOC);
      return checkFlowMap(realInput(mutated));
    };

    it("V1 — 인벤토리에서 흐름 한 줄을 지우면 M-1", () => {
      const line = DOC.split("\n").find((l) => l.startsWith("| `.maestro/week-strip-swipe.yml`"));
      expect(line).toBeDefined();
      const problems = mutate(`${line}\n`, "");
      expect(problems.some((p) => p.startsWith("M-1"))).toBe(true);
    });

    it("V2 — 없는 파일을 표에 적으면 M-2·M-7", () => {
      const problems = mutate(
        "`__tests__/ui/photo-viewer.test.tsx`",
        "`__tests__/ui/does-not-exist.test.tsx`",
      );
      expect(problems.some((p) => p.startsWith("M-7"))).toBe(true);
    });

    it("V3 — 층 1 ○를 —로 바꾸면 M-3", () => {
      const line =
        DOC.split("\n").find((l) => l.startsWith("| `.maestro/week-strip-swipe.yml`")) ?? "";
      const problems = mutate(line, line.replace("| ○ | ○ |", "| ○ | — |"));
      expect(problems.some((p) => p.startsWith("M-3"))).toBe(true);
    });

    it("V4 — 층 1이 아닌 이유를 비우면 M-5", () => {
      const line =
        DOC.split("\n").find((l) => l.startsWith("| `.maestro/generate-diary.yml`")) ?? "";
      const problems = mutate(line, line.replace("일기를 생성한다(모델 추론)", ""));
      expect(problems.some((p) => p.startsWith("M-5"))).toBe(true);
    });

    it("V5 — 기능 행의 모든 칸을 비우면 M-6", () => {
      const line = DOC.split("\n").find((l) => l.startsWith("| 쓴 날 읽기(홈이 곧 상세)")) ?? "";
      const problems = mutate(line, "| 쓴 날 읽기(홈이 곧 상세) | — | — | 범위 밖(069) | — |");
      expect(problems.some((p) => p.startsWith("M-6"))).toBe(true);
    });

    it("V6 — 새 흐름이 픽스처 본문을 단언하면 M-10", () => {
      const input = realInput();
      const fragment = input.fixtureTexts[0];
      const problems = checkFlowMap({
        ...input,
        newFlowSources: {
          ...input.newFlowSources,
          ".maestro/restart-persistence.yml": `- assertVisible: "${fragment}"`,
        },
      });
      expect(problems.some((p) => p.startsWith("M-10"))).toBe(true);
    });
  });
});
