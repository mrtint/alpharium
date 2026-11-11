/**
 * 이어받기 소스 계약 (113). 주석을 먼저 걷어내고 소스를 읽는다.
 *
 * 기기 없이 잠그는 것: 구간 임시 파일 정리가 구간 수를 덮는지, `state.json`을 쓰는 자리가
 * 전부 `mutateState`를 지나는지(그래야 동시에 끝난 구간이 서로를 덮어쓰지 않는다).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { SEGMENT_CONCURRENCY, SEGMENT_COUNT } from "../../src/models/segmented/plan";

const ROOT = join(__dirname, "../..");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const code = (rel: string) => strip(readFileSync(join(ROOT, rel), "utf8"));

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("구간 임시 파일 정리 (FR-010)", () => {
  const expoPort = code("src/models/expo-port.ts");

  it("MAX_TRACKED_SEGMENTS가 SEGMENT_COUNT 이상이다 — 구간 파일이 지워지지 않고 남는 일이 없다", () => {
    const max = Number(/const MAX_TRACKED_SEGMENTS\s*=\s*(\d+)/.exec(expoPort)?.[1]);
    expect(Number.isInteger(max)).toBe(true);
    expect(max).toBeGreaterThanOrEqual(SEGMENT_COUNT);
  });

  it("leftoverNamesFor가 최종 파일·부분 파일·구간 임시 파일을 모두 돌려준다", () => {
    expect(expoPort).toMatch(
      /leftoverNamesFor[\s\S]*?fileNameFor\(key\)[\s\S]*?partialNameFor\(key\)/,
    );
    expect(expoPort).toMatch(
      /for \(let i = 0; i < MAX_TRACKED_SEGMENTS; i\+\+\) names\.push\(segmentNameFor\(key, i\)\)/,
    );
  });

  it("동시 구간 수는 구간 수를 넘지 않는다", () => {
    expect(SEGMENT_CONCURRENCY).toBeLessThanOrEqual(SEGMENT_COUNT);
  });
});

describe("state.json 쓰기는 한 줄로 선다 (FR-005)", () => {
  it("storage.ts 밖에서는 writeState를 부르지 않는다 — mutateState만 쓴다", () => {
    const offenders = sourceFiles("src")
      .filter((rel) => rel !== "src/models/storage.ts")
      .filter((rel) => /\bwriteState\s*\(/.test(code(rel)));
    expect(offenders).toEqual([]);
  });

  it("받는 두 길(캐릭터·사진 모델)이 체크포인트를 start·resume 모두에 넘긴다", () => {
    for (const rel of ["src/models/acquisition.ts", "src/vision/acquisition.ts"]) {
      const source = code(rel);
      expect(source).toMatch(/const checkpoint = segmentCheckpoint\(ports\.metadata\)/);
      expect(source).toMatch(/checkpoint,?\s*\)/);
      expect(source).toMatch(/settleResumeRecord\(ports/);
    }
  });

  it("체크포인트는 mutateState로 쓴다 (한 줄로 선다)", () => {
    expect(code("src/models/verification.ts")).toMatch(
      /segmentCheckpoint[\s\S]*?mutateState\(metadata[\s\S]*?withSegmentedResume/,
    );
  });

  it("expoMetadataPort는 프로세스에 하나다 — 통로가 둘이면 쓰기 줄이 둘이 된다", () => {
    const expoPort = code("src/models/expo-port.ts");
    expect(expoPort).toMatch(/let sharedMetadataPort:\s*MetadataPort \| null = null/);
    expect(expoPort).toMatch(/sharedMetadataPort \?\?= createExpoMetadataPort\(\)/);
  });

  it("expo-port.ts가 체크포인트를 runSegmented의 onCheckpoint로 전달한다", () => {
    expect(code("src/models/expo-port.ts")).toMatch(/onCheckpoint:\s*checkpoint/);
  });
});
