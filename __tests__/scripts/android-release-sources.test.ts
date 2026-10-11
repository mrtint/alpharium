/**
 * 076 — `scripts/android-release/` 소스 계약.
 *
 * 이 스크립트들은 배포 권한을 가진 서비스 계정 JSON을 다룬다. 동작 테스트(play-upload.test.ts)가 못 보는 것 — 비밀을 출력하는
 * 줄, 외부 패키지 import, 순수 모듈의 부수 효과 — 을 소스를 읽어 잠근다(contracts/scripts-contract.md §3). 읽기 전에 주석을 걷는다:
 * 이 저장소의 주석은 무엇을 왜 금지하는지 적으므로 금지어가 설명 안에 정당하게 나온다.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(__dirname, "../../scripts/android-release");

function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function source(name: string): string {
  return strip(readFileSync(join(DIR, name), "utf8"));
}

const FILES = readdirSync(DIR).filter((f) => /\.(ts|mts)$/.test(f));
const PURE = FILES.filter((f) => f.endsWith(".ts"));

/** 출력 호출 하나(여러 줄 인자 포함)의 텍스트를 모두 돌려준다 */
function outputCalls(text: string): string[] {
  return [
    ...text.matchAll(
      /(console\.(?:log|error|warn|info|debug)|process\.(?:stdout|stderr)\.write)\(([\s\S]*?)\);/g,
    ),
  ].map((m) => m[2]);
}

describe("076 android-release 스크립트 소스 계약", () => {
  it("스크립트가 존재한다 (이 테스트가 빈 디렉터리를 통과시키지 않는다)", () => {
    expect(FILES.sort()).toEqual([
      "play-upload.mts",
      "play-upload.ts",
      "verify-signature.mts",
      "verify-signature.ts",
    ]);
  });

  it("출력 호출의 인자에 서비스 계정 JSON·개인 키·토큰·assertion이 들어가지 않는다", () => {
    const secrets =
      /serviceAccountJson|private_?key|privateKey|accessToken|access_token|assertion|PLAY_SERVICE_ACCOUNT_JSON/;
    for (const file of FILES) {
      for (const args of outputCalls(source(file))) {
        expect(`${file}: ${args}`).not.toMatch(secrets);
      }
    }
  });

  it("순수 모듈(.ts)은 process.env·파일·프로세스를 만지지 않는다", () => {
    for (const file of PURE) {
      const text = source(file);
      expect(text).not.toMatch(/process\.env/);
      expect(text).not.toMatch(/node:fs|node:child_process|from "fs"|from "child_process"/);
      expect(text).not.toMatch(/process\.(exit|argv)/);
    }
  });

  it("외부 패키지를 import하지 않는다 (node: 내장과 상대 경로만)", () => {
    for (const file of FILES) {
      const specifiers = [
        ...source(file).matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
      ].map((m) => m[1]);
      for (const spec of specifiers) {
        expect(`${file}: ${spec}`).toMatch(/^[^:]+: (node:[a-z_/]+|\.{1,2}\/.+)$/);
      }
    }
  });

  it("PLAY_SERVICE_ACCOUNT_JSON 외 비밀 이름을 process.env로 읽지 않는다", () => {
    for (const file of FILES) {
      const names = [...source(file).matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
      for (const name of names) expect(name).toBe("PLAY_SERVICE_ACCOUNT_JSON");
    }
  });

  it("서비스 계정 JSON은 환경변수로만 받는다 (인자·파일로 받지 않는다)", () => {
    const entry = source("play-upload.mts");
    expect(entry).toMatch(/process\.env\.PLAY_SERVICE_ACCOUNT_JSON/);
    expect(entry).not.toMatch(/option\("(?:service|account|sa|key|json)/);
    // 읽는 파일은 AAB 하나뿐이다
    expect(entry.match(/readFileSync\(/g)).toHaveLength(1);
    expect(entry).toMatch(/readFileSync\(aabPath\)/);
  });
});
