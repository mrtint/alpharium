/**
 * 릴리스 번호 올림 진입점. 판정은 bump-version.ts(순수)가 하고 이 파일은 app.json만 읽고 쓴다.
 *
 *   npm run version:bump -- patch    # 핫픽스: 1.0.0 → 1.0.1
 *   npm run version:bump -- minor    # 기능: 1.0.1 → 1.1.0
 *   npm run version:bump -- major
 *
 * 세 값(expo.version·android.versionCode·ios.buildNumber)을 함께 올린다. 커밋은 사람이 한다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bumpAppJson, type BumpLevel } from "./bump-version.ts";

const APP_JSON = join(dirname(fileURLToPath(import.meta.url)), "../../app.json");
const LEVELS: BumpLevel[] = ["major", "minor", "patch"];

const level = process.argv[2] as BumpLevel | undefined;
if (!level || !LEVELS.includes(level)) {
  console.error("사용법: npm run version:bump -- <patch|minor|major>");
  process.exit(1);
}

try {
  const { text, before, after } = bumpAppJson(readFileSync(APP_JSON, "utf8"), level);
  writeFileSync(APP_JSON, text);
  console.log(`version     ${before.version} → ${after.version}`);
  console.log(`versionCode ${before.versionCode} → ${after.versionCode}`);
  console.log(`buildNumber ${before.buildNumber} → ${after.buildNumber}`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
