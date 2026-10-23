/**
 * 102 — `design/icon.json`(정본)에서 아이콘 PNG·스토어 에셋·SVG 미리보기를 다시 쓴다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-icons.mts          # 쓴다
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-icons.mts --check   # 쓰지 않고 어긋나면 종료 코드 1
 *
 * 쓰는 것은 icon-build.ts의 `buildOutputs` 목록이다. 정본이 규칙을 어기면(없는 토큰 이름 등) 아무것도 쓰지 않고 실패한다.
 * `--check`는 PNG를 픽셀로 비교한다(zlib 버전에 따라 인코딩 바이트가 달라질 수 있다). 값을 만들지 않는다(원칙 V) — 코어는 `icon-build.ts`.
 * 아이콘 PNG를 바꾼 뒤에는 네이티브 prebuild를 다시 돌려야 런처에 반영된다(specs/102 research R3).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

import { buildOutputs, encodePng, type IconSource, type TokensColors } from "./icon-build.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const check = process.argv.includes("--check");

const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(join(root, rel), "utf8")) as T;

let outputs;
try {
  outputs = buildOutputs(readJson<IconSource>("design/icon.json"), readJson<TokensColors>("design/tokens.json"));
} catch (e) {
  console.error(`✗ 아이콘 정본이 규칙을 어긴다 — 아무것도 쓰지 않았다: ${(e as Error).message}`);
  process.exit(1);
}

const stale: string[] = [];
for (const out of outputs) {
  const target = join(root, out.path);
  if (out.kind === "text") {
    const current = existsSync(target) ? readFileSync(target, "utf8").replace(/\r\n/g, "\n") : null;
    if (current === out.text) continue;
    stale.push(out.path);
    if (!check) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, out.text);
    }
    continue;
  }
  const current = existsSync(target) ? PNG.sync.read(readFileSync(target)) : null;
  const same =
    current !== null &&
    current.width === out.width &&
    current.height === out.height &&
    Buffer.compare(current.data, Buffer.from(out.rgba)) === 0 &&
    readFileSync(target)[25] === out.colorType;
  if (same) continue;
  stale.push(out.path);
  if (!check) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, encodePng(out));
  }
}

if (check) {
  if (stale.length > 0) {
    console.error(`✗ 정본과 어긋난 생성물 ${stale.length}개:\n  ${stale.join("\n  ")}\n  → build-icons.mts를 --check 없이 돌린다.`);
    process.exit(1);
  }
  console.log(`✓ 생성물 ${outputs.length}개가 정본과 같다`);
} else {
  console.log(stale.length > 0 ? `쓴 파일 ${stale.length}개:\n  ${stale.join("\n  ")}` : "바뀐 것이 없다");
}
