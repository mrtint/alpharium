/**
 * 089 — `design/tokens.json`에서 앱·웹 토큰 생성물을 다시 쓴다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-tokens.mts          # 쓴다
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-tokens.mts --check   # 쓰지 않고 어긋나면 종료 코드 1
 *
 * 쓰는 것: (1) `src/ui/theme/tokens.ts`의 생성 영역(표식 두 줄 사이), (2) `site/assets/tokens.css`.
 * 정본이 규칙을 어기면 아무것도 쓰지 않고 실패한다. 두 파일을 차례로 쓴다(둘째가 실패하면 첫째만 남지만 `--check`가 어긋남으로 잡는다). 줄 끝은 LF다(저장소 `.gitattributes`가 eol=lf). 값을 만들지 않는다(원칙 V) — 코어는 `tokens-build.ts`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildOutputs, replaceRegion, type TokensJson } from "./tokens-build.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tokensJson = join(root, "design", "tokens.json");
const tokensTs = join(root, "src", "ui", "theme", "tokens.ts");
const tokensCss = join(root, "site", "assets", "tokens.css");

const check = process.argv.includes("--check");

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "";
}

const tokens = JSON.parse(read(tokensJson)) as TokensJson;
let out;
try {
  out = buildOutputs(tokens);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const nextTs = replaceRegion(read(tokensTs), out.appRegion);
const targets: { path: string; next: string }[] = [
  { path: tokensTs, next: nextTs },
  { path: tokensCss, next: out.css },
];

const stale = targets.filter((t) => read(t.path) !== t.next);

if (check) {
  if (stale.length > 0) {
    for (const t of stale) console.error(`어긋남: ${t.path}`);
    console.error("design/tokens.json과 생성물이 다르다 — build-tokens.mts를 돌려 다시 만든다.");
    process.exit(1);
  }
  console.log("tokens: 정본과 생성물이 같다");
} else {
  for (const t of stale) {
    mkdirSync(dirname(t.path), { recursive: true });
    writeFileSync(t.path, t.next);
    console.log(`쓴 파일: ${t.path}`);
  }
  if (stale.length === 0) console.log("tokens: 바뀐 것이 없다");
}
