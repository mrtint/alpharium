/**
 * 102 — 기기에서 찍은 스크린샷을 스토어 규격으로 만든다(알파 제거, 선택적 확대).
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/store/prepare-screenshot.mts <in.png> <out.png> [--size 1284x2778] [--crop-height 2160]
 *
 * `--size`는 macOS `sips`로 늘리거나 줄인다(iPhone 14 캡처 1170×2532 → 6.5형 1284×2778은 가로세로 비율이 같아 구성이 변하지 않는다).
 * `--crop-height`는 위에서부터 그 높이만 남긴다 — Play는 긴 변이 짧은 변의 2배를 넘는 스크린샷을 받지 않는다(갤럭시 1080×2340은 2.17배라
 * 아래 내비게이션 막대와 그 위 36px을 자른다). 투명한 픽셀이 있으면 실패한다. 계약은 specs/102-app-icon-store-assets/contracts/store-assets.md.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { cropToHeight, toRgbPng } from "./screenshot-prep.ts";

const args = process.argv.slice(2);
const sizeAt = args.indexOf("--size");
const size = sizeAt >= 0 ? args[sizeAt + 1] : null;
const cropAt = args.indexOf("--crop-height");
const cropHeight = cropAt >= 0 ? Number(args[cropAt + 1]) : null;
const valueAt = new Set([sizeAt, cropAt].filter((i) => i >= 0).map((i) => i + 1));
const [input, output] = args.filter((a, i) => !a.startsWith("--") && !valueAt.has(i));
if (!input || !output || (size !== null && !/^\d+x\d+$/.test(size ?? "")) || (cropHeight !== null && !Number.isInteger(cropHeight)) || (cropHeight !== null && !(cropHeight > 0))) {
  console.error("사용법: prepare-screenshot.mts <in.png> <out.png> [--size WxH] [--crop-height N]");
  process.exit(2);
}

let source = resolve(input);
let tmp: string | null = null;
try {
  if (size) {
    const [w, h] = size.split("x");
    tmp = mkdtempSync(join(tmpdir(), "pocketlog-shot-"));
    const resized = join(tmp, "resized.png");
    execFileSync("sips", ["-z", h, w, source, "--out", resized], { stdio: "pipe" });
    source = resized;
  }
  const raw = readFileSync(source);
  const out = toRgbPng(cropHeight ? cropToHeight(raw, cropHeight) : raw);
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(resolve(output), out);
  console.log(`✓ ${output}${size ? ` (${size})` : ""}${cropHeight ? ` (위 ${cropHeight}줄)` : ""}`);
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
