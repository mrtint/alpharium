/**
 * `scripts/release-notes/`·`scripts/ios-release/` 소스 계약 — android-release-sources.test.ts와 같은 틀.
 * 이 스크립트들은 App Store Connect API 개인 키를 다룬다. 동작 테스트가 못 보는 것(비밀 출력, 외부 패키지, 키를 파일·인자로 받는 길)을
 * 소스를 읽어 잠근다. 주석을 먼저 걷는다.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const NOTES_DIR = join(__dirname, "../../scripts/release-notes");
const IOS_DIR = join(__dirname, "../../scripts/ios-release");
const read = (dir: string, name: string) => strip(readFileSync(join(dir, name), "utf8"));

const FILES = [
  ...readdirSync(NOTES_DIR).map((f) => [NOTES_DIR, f] as const),
  ...readdirSync(IOS_DIR)
    .filter((f) => /\.(ts|mts)$/.test(f))
    .map((f) => [IOS_DIR, f] as const),
];

/** 출력 호출 하나(여러 줄 인자 포함)의 텍스트를 모두 돌려준다 */
function outputCalls(text: string): string[] {
  return [
    ...text.matchAll(
      /(console\.(?:log|error|warn|info|debug)|process\.(?:stdout|stderr)\.write)\(([\s\S]*?)\);/g,
    ),
  ].map((m) => m[2]);
}

describe("릴리스 노트·TestFlight 스크립트 소스 계약", () => {
  it("스크립트가 존재한다", () => {
    expect(FILES.map(([, f]) => f).sort()).toEqual([
      "build-number-check.mts",
      "build-number-check.ts",
      "check.mts",
      "notes.ts",
      "testflight-notes.mts",
      "testflight-notes.ts",
    ]);
  });

  it("외부 패키지를 import하지 않는다 (node: 내장과 상대 경로만)", () => {
    for (const [dir, file] of FILES) {
      const specifiers = [
        ...read(dir, file).matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
      ].map((m) => m[1]);
      for (const spec of specifiers) {
        expect(`${file}: ${spec}`).toMatch(/^[^:]+: (node:[a-z_/]+|\.{1,2}\/.+)$/);
      }
    }
  });

  it("API 키·토큰 변수는 출력 호출 인자에 들어가지 않는다", () => {
    for (const [dir, file] of FILES) {
      for (const call of outputCalls(read(dir, file))) {
        expect(`${file}: ${call}`).not.toMatch(/keyP8|ASC_API_KEY_P8|token|Authorization|Bearer/);
      }
    }
  });

  it("API 키는 환경변수로만 받는다 (인자·파일로 받지 않는다)", () => {
    const entry = read(IOS_DIR, "testflight-notes.mts");
    expect(entry).toMatch(/process\.env\.ASC_API_KEY_P8/);
    expect(entry).toMatch(/process\.env\.ASC_KEY_ID/);
    expect(entry).toMatch(/process\.env\.ASC_ISSUER_ID/);
    expect(entry).not.toMatch(/option\("(?:key|p8|secret|token|issuer)/);
    // 읽는 파일은 릴리스 노트 하나뿐이다
    expect(entry.match(/readFileSync\(/g)).toHaveLength(1);
    expect(entry).toMatch(/readFileSync\(notesPath, "utf8"\)/);
  });

  it("process.env로 읽는 이름은 ASC 셋뿐이다", () => {
    for (const [dir, file] of FILES) {
      const names = [...read(dir, file).matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
      for (const name of names)
        expect(["ASC_API_KEY_P8", "ASC_KEY_ID", "ASC_ISSUER_ID"]).toContain(name);
    }
  });

  it("notes.ts·testflight-notes.ts·build-number-check.ts는 순수 모듈이다 — process.env·파일·최상단 부수 효과가 없다", () => {
    for (const file of ["notes.ts", "testflight-notes.ts", "build-number-check.ts"]) {
      const dir = file === "notes.ts" ? NOTES_DIR : IOS_DIR;
      const text = read(dir, file);
      expect(text).not.toMatch(/process\./);
      expect(text).not.toMatch(/readFileSync|writeFileSync|node:fs/);
    }
  });

  it("096 번호 점검 진입점은 API 키를 환경변수로만 받고 app.json 하나만 읽는다", () => {
    const entry = read(IOS_DIR, "build-number-check.mts");
    for (const name of ["ASC_API_KEY_P8", "ASC_KEY_ID", "ASC_ISSUER_ID"]) {
      expect(entry).toMatch(new RegExp(`process\\.env\\.${name}`));
    }
    expect(entry).not.toMatch(/option\("(?:key|p8|secret|token|issuer)/);
    expect(entry.match(/readFileSync\(/g)).toHaveLength(1);
    expect(entry).toMatch(/readFileSync\(appJsonPath, "utf8"\)/);
  });

  it("096 번호 조회(listBuildNumbers)는 GET만 부르고 API 호스트 밖으로 나가지 않는다", () => {
    const text = read(IOS_DIR, "testflight-notes.ts");
    const start = text.indexOf("export async function listBuildNumbers");
    expect(start).toBeGreaterThan(-1);
    const body = text.slice(start);
    expect(body).not.toMatch(/"(POST|PATCH|PUT|DELETE)"/);
    expect(body).toMatch(/startsWith\(API_ORIGIN\)/);
  });
});
